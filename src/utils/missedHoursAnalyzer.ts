import { DoseRecord, MissedHourSlot, TimeOfDayGroup, MissedHoursAnalysis } from '../types';

export function formatHour12(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

export function formatHourRange(hour: number): string {
  const startStr = hour < 10 ? `0${hour}:00` : `${hour}:00`;
  const nextHour = (hour + 1) % 24;
  const endStr = nextHour < 10 ? `0${nextHour}:00` : `${nextHour}:00`;
  const period = hour < 12 ? 'AM' : 'PM';
  return `${startStr} - ${endStr} (${formatHour12(hour)})`;
}

export function getTimeOfDayCategory(hour: number): {
  id: 'EARLY_MORNING' | 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
  label: string;
} {
  if (hour >= 5 && hour <= 7) {
    return { id: 'EARLY_MORNING', label: 'Early Morning / पहाट' };
  }
  if (hour >= 8 && hour <= 11) {
    return { id: 'MORNING', label: 'Morning / सकाळ' };
  }
  if (hour >= 12 && hour <= 16) {
    return { id: 'AFTERNOON', label: 'Afternoon / दुपार' };
  }
  if (hour >= 17 && hour <= 20) {
    return { id: 'EVENING', label: 'Evening / संध्याकाळ' };
  }
  return { id: 'NIGHT', label: 'Night / रात्र' };
}

export function analyzeMissedDoseHours(
  doseRecords: DoseRecord[],
  patientId: number,
  days: number | null = null
): MissedHoursAnalysis {
  let records = doseRecords.filter((d) => d.patient_id === patientId);

  // Apply optional date cutoff (7, 14, 30 days)
  if (days !== null && days > 0) {
    const cutoffMs = Date.now() - days * 86400000;
    records = records.filter((d) => {
      const t = new Date(d.scheduled_datetime || (d as any).logged_at).getTime();
      return t >= cutoffMs;
    });
  }

  // Pre-populate 24 hour slots
  const slots: MissedHourSlot[] = [];
  for (let h = 0; h < 24; h++) {
    const tod = getTimeOfDayCategory(h);
    slots.push({
      hour: h,
      hour_label: formatHour12(h),
      hour_display: formatHourRange(h),
      time_of_day: tod.id,
      time_of_day_label: tod.label,
      total_scheduled: 0,
      total_taken: 0,
      total_missed: 0,
      missed_rate: 0,
      adherence_rate: 100,
      top_missed_meds: [],
      top_reasons: [],
      records: [],
      is_peak_vulnerable: false,
      severity: 'low'
    });
  }

  // Distribute records into hour slots
  for (const record of records) {
    let hour = 8; // fallback default
    if (record.scheduled_datetime) {
      const dt = new Date(record.scheduled_datetime);
      if (!isNaN(dt.getTime())) {
        hour = dt.getHours();
      }
    } else if ((record as any).logged_at) {
      const dt = new Date((record as any).logged_at);
      if (!isNaN(dt.getTime())) {
        hour = dt.getHours();
      }
    }

    if (hour >= 0 && hour < 24) {
      const slot = slots[hour];
      slot.records.push(record);
      slot.total_scheduled++;

      if (record.status === 'TAKEN' || record.status === 'TAKEN_LATE') {
        slot.total_taken++;
      } else if (record.status === 'MISSED' || record.status === 'SKIPPED') {
        slot.total_missed++;

        // Collect missed reasons
        if ((record as any).missed_reason) {
          const reason = String((record as any).missed_reason).trim();
          if (reason && !slot.top_reasons.includes(reason)) {
            slot.top_reasons.push(reason);
          }
        }
      }
    }
  }

  let totalScheduledAll = 0;
  let totalTakenAll = 0;
  let totalMissedAll = 0;
  let maxMissedCount = 0;
  let maxMissedRate = 0;
  let peakHourSlot: MissedHourSlot | null = null;
  let bestHourSlot: MissedHourSlot | null = null;
  let minMissedRate = 101;

  for (const slot of slots) {
    totalScheduledAll += slot.total_scheduled;
    totalTakenAll += slot.total_taken;
    totalMissedAll += slot.total_missed;

    if (slot.total_scheduled > 0) {
      slot.missed_rate = Math.round((slot.total_missed / slot.total_scheduled) * 100);
      slot.adherence_rate = Math.max(0, 100 - slot.missed_rate);
    } else {
      slot.missed_rate = 0;
      slot.adherence_rate = 100;
    }

    // Determine top missed medications at this hour
    const medMap: { [name: string]: number } = {};
    for (const r of slot.records) {
      if (r.status === 'MISSED' || r.status === 'SKIPPED') {
        medMap[r.medicine_name] = (medMap[r.medicine_name] || 0) + 1;
      }
    }
    slot.top_missed_meds = Object.entries(medMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Compute severity
    if (slot.missed_rate >= 50 || slot.total_missed >= 4) {
      slot.severity = 'critical';
    } else if (slot.missed_rate >= 30 || slot.total_missed >= 2) {
      slot.severity = 'high';
    } else if (slot.missed_rate > 0 || slot.total_missed > 0) {
      slot.severity = 'medium';
    } else {
      slot.severity = 'low';
    }

    // Find peak hour
    if (slot.total_missed > maxMissedCount || (slot.total_missed === maxMissedCount && slot.missed_rate > maxMissedRate && slot.total_missed > 0)) {
      maxMissedCount = slot.total_missed;
      maxMissedRate = slot.missed_rate;
      peakHourSlot = slot;
    }

    // Find best hour (with at least 1 scheduled dose)
    if (slot.total_scheduled > 0 && slot.missed_rate < minMissedRate) {
      minMissedRate = slot.missed_rate;
      bestHourSlot = slot;
    }
  }

  if (peakHourSlot && peakHourSlot.total_missed > 0) {
    peakHourSlot.is_peak_vulnerable = true;
  }

  // Time-of-day groups aggregation
  const todConfig: {
    id: 'EARLY_MORNING' | 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
    label: string;
    time_span: string;
    icon: string;
    color: string;
    hours: number[];
  }[] = [
    {
      id: 'EARLY_MORNING',
      label: 'Early Morning',
      time_span: '5:00 AM - 7:59 AM',
      icon: 'Sunrise',
      color: '#0ea5e9',
      hours: [5, 6, 7]
    },
    {
      id: 'MORNING',
      label: 'Morning',
      time_span: '8:00 AM - 11:59 AM',
      icon: 'Sun',
      color: '#f59e0b',
      hours: [8, 9, 10, 11]
    },
    {
      id: 'AFTERNOON',
      label: 'Afternoon / Midday',
      time_span: '12:00 PM - 4:59 PM',
      icon: 'Clock',
      color: '#f97316',
      hours: [12, 13, 14, 15, 16]
    },
    {
      id: 'EVENING',
      label: 'Evening',
      time_span: '5:00 PM - 8:59 PM',
      icon: 'Sunset',
      color: '#8b5cf6',
      hours: [17, 18, 19, 20]
    },
    {
      id: 'NIGHT',
      label: 'Night / Bedtime',
      time_span: '9:00 PM - 4:59 AM',
      icon: 'Moon',
      color: '#6366f1',
      hours: [21, 22, 23, 0, 1, 2, 3, 4]
    }
  ];

  const time_of_day_groups: TimeOfDayGroup[] = todConfig.map((grp) => {
    let grpScheduled = 0;
    let grpTaken = 0;
    let grpMissed = 0;

    for (const h of grp.hours) {
      const slot = slots[h];
      grpScheduled += slot.total_scheduled;
      grpTaken += slot.total_taken;
      grpMissed += slot.total_missed;
    }

    const missedRate = grpScheduled > 0 ? Math.round((grpMissed / grpScheduled) * 100) : 0;
    const adhRate = Math.max(0, 100 - missedRate);

    return {
      id: grp.id,
      label: grp.label,
      time_span: grp.time_span,
      icon: grp.icon,
      total_scheduled: grpScheduled,
      total_taken: grpTaken,
      total_missed: grpMissed,
      missed_rate: missedRate,
      adherence_rate: adhRate,
      color: grp.color,
      hours: grp.hours
    };
  });

  const overallMissedRate = totalScheduledAll > 0 ? Math.round((totalMissedAll / totalScheduledAll) * 100) : 0;
  const overallAdherenceRate = Math.max(0, 100 - overallMissedRate);

  // Generate tailored clinical tip & recommendation
  let recTitle = "Balanced Hourly Adherence";
  let recDesc = "No distinct hour shows alarming failure rates. Maintain current routine and alarm cues.";
  let recTarget = "All Scheduled Hours";
  let recTip = "Keep medicines visible near your morning toothbrush or bedside table.";

  if (peakHourSlot && peakHourSlot.total_missed > 0) {
    const h = peakHourSlot.hour;
    const label = peakHourSlot.hour_label;
    recTarget = `${label} (${peakHourSlot.time_of_day_label})`;

    if (h >= 5 && h <= 8) {
      recTitle = "Morning Rush Vulnerability";
      recDesc = `You miss the highest proportion of doses at ${label}. Morning commute and rushed routines often interrupt morning medication intake.`;
      recTip = "Pair your morning pill directly with breakfast coffee or set an alarm 10 minutes prior to leaving the house.";
    } else if (h >= 12 && h <= 15) {
      recTitle = "Midday & Lunchtime Drop-Off";
      recDesc = `Peak missed dose occurrence is concentrated at ${label} (${peakHourSlot.missed_rate}% non-compliance). Work meetings and eating out frequently delay intake.`;
      recTip = "Carry a compact pocket pill organizer and set a secondary chime on your mobile calendar before lunch.";
    } else if (h >= 18 && h <= 20) {
      recTitle = "Evening Routine Interference";
      recDesc = `Doses scheduled at ${label} show elevated missed counts. Social plans or fatigue after work frequently disrupt the evening schedule.`;
      recTip = "Anchor evening doses to your dinner table or set an audible smart speaker announcement at 7 PM.";
    } else if (h >= 21 || h <= 4) {
      recTitle = "Bedtime Fatigue & Sleep Slippage";
      recDesc = `Night doses at ${label} are frequently skipped due to falling asleep before taking medication.`;
      recTip = "Shift bedtime doses 30 minutes earlier to align with your pre-sleep wind-down routine.";
    }
  }

  return {
    patient_id: patientId,
    date_range_days: days,
    total_scheduled: totalScheduledAll,
    total_taken: totalTakenAll,
    total_missed: totalMissedAll,
    overall_missed_rate: overallMissedRate,
    overall_adherence_rate: overallAdherenceRate,
    peak_hour: peakHourSlot,
    best_hour: bestHourSlot,
    hourly_slots: slots,
    time_of_day_groups: time_of_day_groups,
    has_data: totalScheduledAll > 0,
    actionable_recommendation: {
      title: recTitle,
      description: recDesc,
      target_hour_label: recTarget,
      clinical_tip: recTip
    }
  };
}
