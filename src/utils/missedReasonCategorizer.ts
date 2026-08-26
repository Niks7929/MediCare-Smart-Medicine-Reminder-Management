import { DoseRecord, MissedReasonDistribution, MissedReasonSlice } from '../types';

export interface CategoryDefinition {
  id: string;
  category: string;
  keywords: string[];
  color: string;
  badge_color: string;
  icon: string;
  clinical_impact: string;
  suggested_action: string;
}

export const REASON_DEFINITIONS: CategoryDefinition[] = [
  {
    id: 'forgot',
    category: 'Forgot / Distracted',
    keywords: ['forgot', 'forget', 'distracted', 'rush', 'busy', 'memory', 'slip', 'missed reminder'],
    color: '#f59e0b', // Amber-500
    badge_color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: 'Brain',
    clinical_impact: 'Inconsistent drug concentration; peak and trough fluctuations.',
    suggested_action: 'Enable multi-stage voice and SMS audible alarms paired with morning/night routine anchors.'
  },
  {
    id: 'nausea',
    category: 'Side Effects / Nausea',
    keywords: ['nausea', 'nauseous', 'vomit', 'stomach', 'dizzy', 'dizziness', 'headache', 'side effect', 'discomfort', 'ill'],
    color: '#ec4899', // Pink-500
    badge_color: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    icon: 'Activity',
    clinical_impact: 'Indicates adverse drug tolerance or need for mealtime timing readjustment.',
    suggested_action: 'Take dose with a meal or ask physician for gastro-resistant / anti-emetic alternatives.'
  },
  {
    id: 'empty_supply',
    category: 'Empty Supply / Refill Delay',
    keywords: ['empty', 'supply', 'refill', 'ran out', 'stock', 'pharmacy', 'no pills', 'out of medication'],
    color: '#ef4444', // Red-500
    badge_color: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    icon: 'PackageX',
    clinical_impact: 'Risk of abrupt therapy cessation and rebound hypertensive/glycemic spikes.',
    suggested_action: 'Activate automatic 1-click pharmacy refill requests 5 days before threshold depletion.'
  },
  {
    id: 'travel_out',
    category: 'Out of Home / Travel',
    keywords: ['travel', 'out of home', 'left at home', 'vacation', 'trip', 'commute', 'office', 'no pills with me'],
    color: '#3b82f6', // Blue-500
    badge_color: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    icon: 'MapPin',
    clinical_impact: 'Temporary coverage gap during schedule transition and time-zone shifts.',
    suggested_action: 'Use portable pocket pill containers and set timezone-aware travel reminders.'
  },
  {
    id: 'felt_unwell',
    category: 'Felt Unwell / Slept Through',
    keywords: ['slept', 'asleep', 'sleeping', 'tired', 'exhausted', 'fever', 'unwell', 'weak'],
    color: '#8b5cf6', // Violet-500
    badge_color: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    icon: 'Moon',
    clinical_impact: 'Delayed biological uptake; dose stacking risk if taken too close to next cycle.',
    suggested_action: 'Adjust alarm volume and assign caregiver secondary escalation for sleeping periods.'
  },
  {
    id: 'other',
    category: 'Other / Unspecified',
    keywords: [],
    color: '#64748b', // Slate-500
    badge_color: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
    icon: 'HelpCircle',
    clinical_impact: 'Uncategorized non-adherence event requiring patient self-reflection.',
    suggested_action: 'Log specific rationale during dose skipping to help the medical team optimize regimen.'
  }
];

export function categorizeMissedReason(reasonText?: string): CategoryDefinition {
  if (!reasonText || reasonText.trim() === '') {
    return REASON_DEFINITIONS.find((d) => d.id === 'other')!;
  }

  const lower = reasonText.toLowerCase();

  for (const def of REASON_DEFINITIONS) {
    if (def.id === 'other') continue;
    for (const kw of def.keywords) {
      if (lower.includes(kw)) {
        return def;
      }
    }
  }

  return REASON_DEFINITIONS.find((d) => d.id === 'other')!;
}

export function computeMissedReasonDistribution(
  doseRecords: DoseRecord[],
  patientId?: number
): MissedReasonDistribution {
  const patientRecords = patientId
    ? doseRecords.filter((d) => d.patient_id === patientId)
    : doseRecords;

  const missedOrSkipped = patientRecords.filter(
    (d) => d.status === 'MISSED' || d.status === 'SKIPPED'
  );

  const total_missed = missedOrSkipped.length;

  if (total_missed === 0) {
    return {
      total_missed: 0,
      total_with_reason: 0,
      top_category: null,
      slices: []
    };
  }

  // Bucket records into categories
  const bucketMap = new Map<string, DoseRecord[]>();
  REASON_DEFINITIONS.forEach((def) => {
    bucketMap.set(def.id, []);
  });

  let total_with_reason = 0;

  missedOrSkipped.forEach((record) => {
    if (record.missed_reason && record.missed_reason.trim().length > 0) {
      total_with_reason++;
    }
    const cat = categorizeMissedReason(record.missed_reason);
    bucketMap.get(cat.id)?.push(record);
  });

  // Construct slices for non-empty categories
  const slices: MissedReasonSlice[] = [];

  REASON_DEFINITIONS.forEach((def) => {
    const list = bucketMap.get(def.id) || [];
    if (list.length > 0) {
      const percentage = Number(((list.length / total_missed) * 100).toFixed(1));
      slices.push({
        id: def.id,
        category: def.category,
        count: list.length,
        percentage,
        color: def.color,
        badge_color: def.badge_color,
        icon: def.icon,
        clinical_impact: def.clinical_impact,
        suggested_action: def.suggested_action,
        records: list
      });
    }
  });

  // Sort descending by count
  slices.sort((a, b) => b.count - a.count);

  const top_category = slices.length > 0 ? slices[0] : null;

  return {
    total_missed,
    total_with_reason,
    top_category,
    slices
  };
}
