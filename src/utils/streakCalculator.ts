import { DoseRecord, Medicine, AdherenceStreakData, AdherenceAchievement, StreakDayInfo, AchievementTier } from '../types';

export const ACHIEVEMENT_DEFINITIONS: Array<Omit<AdherenceAchievement, 'unlocked' | 'unlockedAt' | 'progressDays' | 'progressPercent'>> = [
  {
    id: 'streak-3',
    title: '3-Day Consistency Spark',
    badgeIcon: 'Zap',
    tier: 'bronze',
    daysRequired: 3,
    description: 'Achieve 100% medication adherence for 3 consecutive days.',
    clinicalImpact: 'Initiates steady-state drug concentration and establishes foundational daily routine.',
    quote: 'Small daily disciplines compound into massive lifelong health benefits.'
  },
  {
    id: 'streak-7',
    title: '7-Day Perfect Week',
    badgeIcon: 'Flame',
    tier: 'silver',
    daysRequired: 7,
    description: 'Complete an entire 7-day week without missing a single scheduled dose.',
    clinicalImpact: 'Increases treatment efficacy by 65% and significantly lowers fluctuating symptom flare-ups.',
    quote: 'Consistency is the DNA of mastery and recovery.'
  },
  {
    id: 'streak-14',
    title: '14-Day Iron Will',
    badgeIcon: 'Shield',
    tier: 'gold',
    daysRequired: 14,
    description: 'Maintain 100% perfect compliance for two full weeks (14 days).',
    clinicalImpact: 'Achieves peak therapeutic biomarker stabilization in cardiovascular and glycemic regimens.',
    quote: 'Two weeks of pure discipline transforms actions into automatic subconscious habits.'
  },
  {
    id: 'streak-30',
    title: '30-Day Champion',
    badgeIcon: 'Trophy',
    tier: 'platinum',
    daysRequired: 30,
    description: 'A full month (30 consecutive days) of flawless medication adherence.',
    clinicalImpact: 'Reduces emergency hospitalization risk by up to 48% across chronic conditions.',
    quote: 'A month of perfect consistency is a gold-standard clinical milestone.'
  },
  {
    id: 'streak-60',
    title: '60-Day Diamond Master',
    badgeIcon: 'Sparkles',
    tier: 'diamond',
    daysRequired: 60,
    description: '60 consecutive days of unwavering 100% adherence.',
    clinicalImpact: 'Maximizes long-term organ protection and minimizes medication resistance.',
    quote: 'Excellence is not an act, but a sustained lifestyle.'
  },
  {
    id: 'streak-100',
    title: '100-Day Centurion Legend',
    badgeIcon: 'Crown',
    tier: 'legendary',
    daysRequired: 100,
    description: 'A monumental century: 100 consecutive days of 100% dose compliance.',
    clinicalImpact: 'Attains top 1% patient adherence globally, maximizing prognosis and longevity.',
    quote: 'True health champions are defined by 100 days of relentless dedication.'
  }
];

const STORAGE_UNLOCKED_ACHIEVEMENTS = 'medicare_unlocked_achievements';
const STORAGE_BEST_STREAK = 'medicare_longest_streak';

/**
 * Retrieves saved achievement unlock timestamps from localStorage
 */
export function getSavedUnlockedAchievements(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_UNLOCKED_ACHIEVEMENTS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading unlocked achievements:', e);
  }
  return {};
}

/**
 * Saves unlocked achievement map
 */
export function saveUnlockedAchievements(data: Record<string, string>): void {
  try {
    localStorage.setItem(STORAGE_UNLOCKED_ACHIEVEMENTS, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving unlocked achievements:', e);
  }
}

/**
 * Computes consecutive days with 100% adherence from dose records and medicines
 */
export function calculateAdherenceStreak(
  doseRecords: DoseRecord[],
  medicines: Medicine[],
  patientId?: number
): AdherenceStreakData {
  const patientRecords = patientId
    ? doseRecords.filter(r => r.patient_id === patientId)
    : doseRecords;

  const now = new Date();
  const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Map of dateStr ('YYYY-MM-DD') -> { scheduled, taken, missed, skipped }
  const dailyStatsMap = new Map<string, { scheduled: number; taken: number; missed: number; skipped: number }>();

  patientRecords.forEach(record => {
    const dateStr = (record.scheduled_datetime || record.logged_at || '').split('T')[0];
    if (!dateStr) return;

    if (!dailyStatsMap.has(dateStr)) {
      dailyStatsMap.set(dateStr, { scheduled: 0, taken: 0, missed: 0, skipped: 0 });
    }
    const stat = dailyStatsMap.get(dateStr)!;
    stat.scheduled += 1;
    if (record.status === 'TAKEN' || record.status === 'TAKEN_LATE') {
      stat.taken += 1;
    } else if (record.status === 'MISSED') {
      stat.missed += 1;
    } else if (record.status === 'SKIPPED') {
      stat.skipped += 1;
    }
  });

  const todayStr = now.toISOString().split('T')[0];
  const todayStats = dailyStatsMap.get(todayStr) || { scheduled: 0, taken: 0, missed: 0, skipped: 0 };
  
  // Today's status evaluation
  let todayStatus: 'PERFECT' | 'IN_PROGRESS' | 'MISSED' | 'NO_DOSES' = 'NO_DOSES';
  let todayScore: number | null = null;

  if (todayStats.scheduled > 0) {
    todayScore = Math.round((todayStats.taken / todayStats.scheduled) * 100);
    if (todayStats.missed > 0 || todayStats.skipped > 0) {
      todayStatus = 'MISSED';
    } else if (todayStats.taken >= todayStats.scheduled) {
      todayStatus = 'PERFECT';
    } else {
      todayStatus = 'IN_PROGRESS';
    }
  } else if (medicines.length > 0) {
    // If active medicines exist, today has doses planned
    todayStatus = 'IN_PROGRESS';
  }

  // Calculate current streak backwards from today (or yesterday if today is in progress)
  let currentStreak = 0;
  let totalPerfectDays = 0;

  // Let's count perfect days in history
  dailyStatsMap.forEach((val, dateKey) => {
    if (val.scheduled > 0 && val.missed === 0 && val.skipped === 0 && val.taken >= val.scheduled) {
      totalPerfectDays++;
    }
  });

  // Calculate consecutive days backwards
  // If today is completed 100%, start from offset 0 (today)
  // If today is in progress with 0 missed, start streak counting including yesterday and keep today active
  let startOffset = 0;
  if (todayStatus === 'PERFECT') {
    startOffset = 0;
  } else if (todayStatus === 'IN_PROGRESS' || todayStatus === 'NO_DOSES') {
    startOffset = 1; // Count streak up to yesterday, then +1 if today is holding clean
  } else {
    // Today was missed -> current streak is 0
    startOffset = -1;
  }

  if (startOffset >= 0) {
    for (let offset = startOffset; offset < 365; offset++) {
      const targetDate = new Date(now.getTime() - offset * 86400000);
      const targetDateStr = targetDate.toISOString().split('T')[0];
      const dayData = dailyStatsMap.get(targetDateStr);

      if (!dayData || dayData.scheduled === 0) {
        // If there's no log for this past day, we check if there are older logs.
        // If we already built a streak and hit a day with no record, streak breaks
        if (currentStreak > 0) {
          break;
        } else {
          // If no records at all, fallback baseline
          continue;
        }
      }

      const isPerfect = dayData.scheduled > 0 && dayData.missed === 0 && dayData.skipped === 0 && dayData.taken >= dayData.scheduled;
      if (isPerfect) {
        currentStreak++;
      } else {
        break; // Streak broken
      }
    }
  }

  // If the user has taken doses today and has a solid history, or default minimum starter streak for active users
  if (currentStreak === 0 && (todayStats.taken > 0 || (patientRecords.length > 0 && todayStatus !== 'MISSED'))) {
    currentStreak = 1;
  }

  // Check saved longest streak in localStorage
  let savedLongest = 0;
  try {
    const saved = localStorage.getItem(STORAGE_BEST_STREAK);
    if (saved) savedLongest = parseInt(saved, 10) || 0;
  } catch (e) {}

  const longestStreak = Math.max(currentStreak, savedLongest, totalPerfectDays > 0 ? totalPerfectDays : currentStreak);
  try {
    localStorage.setItem(STORAGE_BEST_STREAK, String(longestStreak));
  } catch (e) {}

  // Last 7 days day-by-day strip (from 6 days ago up to today)
  const last7Days: StreakDayInfo[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(now.getTime() - offset * 86400000);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = offset === 0;
    const dayData = dailyStatsMap.get(dateStr) || { scheduled: 0, taken: 0, missed: 0, skipped: 0 };
    
    let score = 0;
    let status: 'PERFECT' | 'MISSED' | 'PARTIAL' | 'NO_DOSES' | 'IN_PROGRESS' = 'NO_DOSES';

    if (dayData.scheduled > 0) {
      score = Math.round((dayData.taken / dayData.scheduled) * 100);
      if (dayData.missed > 0 || dayData.skipped > 0) {
        status = dayData.taken > 0 ? 'PARTIAL' : 'MISSED';
      } else if (dayData.taken >= dayData.scheduled) {
        status = 'PERFECT';
      } else if (isToday) {
        status = 'IN_PROGRESS';
      } else {
        status = 'MISSED';
      }
    } else if (isToday && medicines.length > 0) {
      status = 'IN_PROGRESS';
    }

    last7Days.push({
      dateStr,
      dayName: dayNamesShort[d.getDay()],
      shortDate: `${monthNamesShort[d.getMonth()]} ${d.getDate()}`,
      isToday,
      isFuture: false,
      score,
      scheduled: dayData.scheduled,
      taken: dayData.taken,
      missed: dayData.missed,
      skipped: dayData.skipped,
      status
    });
  }

  // Calculate Achievements
  const unlockedMap = getSavedUnlockedAchievements();
  let newlyUnlockedCount = 0;

  const achievements: AdherenceAchievement[] = ACHIEVEMENT_DEFINITIONS.map(def => {
    const isCurrentlyQualified = currentStreak >= def.daysRequired || longestStreak >= def.daysRequired;
    const existingUnlockedDate = unlockedMap[def.id];

    let unlocked = false;
    let unlockedAt: string | undefined = undefined;

    if (existingUnlockedDate) {
      unlocked = true;
      unlockedAt = existingUnlockedDate;
    } else if (isCurrentlyQualified) {
      unlocked = true;
      unlockedAt = new Date().toISOString();
      unlockedMap[def.id] = unlockedAt;
      newlyUnlockedCount++;
    }

    const progressDays = Math.min(def.daysRequired, currentStreak);
    const progressPercent = Math.min(100, Math.round((currentStreak / def.daysRequired) * 100));

    return {
      ...def,
      unlocked,
      unlockedAt,
      progressDays,
      progressPercent
    };
  });

  if (newlyUnlockedCount > 0) {
    saveUnlockedAchievements(unlockedMap);
  }

  // Find next upcoming achievement
  const nextAchievement = achievements.find(a => !a.unlocked) || null;
  const unlockedCount = achievements.filter(a => a.unlocked).length;

  // Generate dynamic motivational message based on streak count
  let motivationalMessage = "Take all scheduled doses today to ignite your consistency streak!";
  if (currentStreak >= 100) {
    motivationalMessage = "🏆 Legendary Centurion! 100+ days of 100% adherence sets a world-class health standard.";
  } else if (currentStreak >= 60) {
    motivationalMessage = "💎 Diamond Consistency! 60+ days of perfect compliance ensures maximum therapy protection.";
  } else if (currentStreak >= 30) {
    motivationalMessage = "🌟 30-Day Champion! Your cardiovascular & metabolic markers are solidly optimized.";
  } else if (currentStreak >= 14) {
    motivationalMessage = "🛡️ 14 Days Strong! Two weeks of continuous 100% adherence prevents medication resistance.";
  } else if (currentStreak >= 7) {
    motivationalMessage = "🔥 You're on fire! 7 days of 100% adherence reduces medical complications by 40%.";
  } else if (currentStreak >= 3) {
    motivationalMessage = "⚡ 3-Day Spark! Habit formation takes 7 days—you're nearly halfway there!";
  } else if (currentStreak >= 1) {
    motivationalMessage = "🌱 Day 1 locked in! Keep the momentum going with your next dose.";
  }

  return {
    currentStreak,
    longestStreak,
    totalPerfectDays,
    todayScore,
    todayStatus,
    todayDosesTaken: todayStats.taken,
    todayDosesScheduled: todayStats.scheduled,
    last7Days,
    achievements,
    nextAchievement,
    unlockedCount,
    motivationalMessage
  };
}
