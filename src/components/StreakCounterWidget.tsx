import React, { useState } from 'react';
import {
  Flame,
  Trophy,
  Zap,
  Shield,
  Sparkles,
  Crown,
  Medal,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Award,
  Sparkle,
  Target,
  PartyPopper
} from 'lucide-react';
import { AdherenceStreakData, StreakDayInfo, AdherenceAchievement } from '../types';
import { AchievementsModal } from './AchievementsModal';

interface StreakCounterWidgetProps {
  streakData: AdherenceStreakData;
  patientName: string;
  onOpenAchievements?: () => void;
}

export const StreakCounterWidget: React.FC<StreakCounterWidgetProps> = ({
  streakData,
  patientName,
  onOpenAchievements
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<StreakDayInfo | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const {
    currentStreak,
    longestStreak,
    totalPerfectDays,
    last7Days,
    achievements,
    nextAchievement,
    unlockedCount,
    motivationalMessage,
    todayStatus,
    todayDosesTaken,
    todayDosesScheduled
  } = streakData;

  const handleOpenTrophyRoom = () => {
    if (onOpenAchievements) {
      onOpenAchievements();
    } else {
      setIsModalOpen(true);
    }
  };

  const triggerCelebration = () => {
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Zap': return Zap;
      case 'Flame': return Flame;
      case 'Shield': return Shield;
      case 'Trophy': return Trophy;
      case 'Sparkles': return Sparkles;
      case 'Crown': return Crown;
      default: return Medal;
    }
  };

  return (
    <>
      <div 
        id="streak-counter-widget"
        className="bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/40 rounded-3xl border-2 border-amber-500/30 p-5 sm:p-6 shadow-xl relative overflow-hidden text-white transition-all hover:border-amber-500/50"
      >
        {/* Subtle decorative glow & sparkler */}
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Celebration Particles Overlay */}
        {showCelebration && (
          <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center bg-amber-950/20 backdrop-blur-[1px] animate-fade-in">
            <div className="flex flex-col items-center animate-bounce">
              <span className="text-4xl">🎉 🏆 🔥 🌟</span>
              <span className="text-sm font-black text-amber-300 bg-slate-950 px-3 py-1 rounded-full border border-amber-400 mt-2 shadow-lg">
                Awesome! {currentStreak} Days of 100% Adherence!
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          {/* Left Column: Streak Flame & Big Metric */}
          <div className="flex items-start sm:items-center gap-4.5">
            {/* Animated Flame Badge */}
            <div 
              onClick={triggerCelebration}
              className="relative cursor-pointer group flex-shrink-0"
              title="Click to celebrate your streak!"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-500 to-yellow-400 p-0.5 shadow-lg shadow-orange-500/25 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-t from-orange-500/20 to-transparent" />
                  <Flame className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 fill-amber-500/40 animate-pulse group-hover:rotate-6 transition-transform" />
                  {currentStreak > 0 && (
                    <span className="absolute bottom-1 right-1 text-[10px] font-black bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-md leading-tight shadow-xs">
                      {currentStreak}d
                    </span>
                  )}
                </div>
              </div>
              <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border border-slate-900" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
                  <Flame className="w-3 h-3 text-amber-400 fill-amber-400" /> 100% Adherence Streak
                </span>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700">
                  👑 Best: <strong className="text-white font-extrabold">{longestStreak} Days</strong>
                </span>
              </div>

              <div className="flex items-baseline gap-2 mt-1">
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
                </h3>
                <span className="text-xs text-amber-300/90 font-bold uppercase tracking-wider">
                  Consecutive Perfect Intake
                </span>
              </div>

              <p className="text-xs text-slate-300 mt-1 max-w-md line-clamp-1 leading-relaxed">
                {motivationalMessage}
              </p>
            </div>
          </div>

          {/* Right Column: Next Milestone Progress & Trophy Button */}
          <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {nextAchievement ? (
              <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-2xl flex-1 lg:min-w-[260px]">
                <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-bold text-white text-[11px] truncate">
                      Next: {nextAchievement.title}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-300 font-mono">
                    {nextAchievement.progressDays}/{nextAchievement.daysRequired}d ({nextAchievement.progressPercent}%)
                  </span>
                </div>

                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-700"
                    style={{ width: `${nextAchievement.progressPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 text-right">
                  {nextAchievement.daysRequired - nextAchievement.progressDays} more perfect days to unlock
                </p>
              </div>
            ) : (
              <div className="bg-slate-950/80 border border-amber-500/30 p-3.5 rounded-2xl flex items-center gap-2 text-xs text-amber-300">
                <Crown className="w-4 h-4 text-yellow-400" />
                <span className="font-bold">All Major Milestone Badges Mastered!</span>
              </div>
            )}

            {/* View Trophy Room Button */}
            <button
              id="view-achievements-trophy-btn"
              onClick={handleOpenTrophyRoom}
              className="px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-2xl text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 group cursor-pointer whitespace-nowrap"
            >
              <Trophy className="w-4 h-4 text-slate-950 group-hover:scale-110 transition-transform" />
              <span>Achievements ({unlockedCount}/{achievements.length})</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* 7-Day Day-by-Day Visual Strip / Day Nodes */}
        <div className="mt-5 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkle className="w-3 h-3 text-amber-400" /> Past 7 Days Adherence Consistency
            </span>
            <span className="text-[10px] text-slate-400">
              Today: <strong className={todayStatus === 'PERFECT' ? 'text-emerald-400' : 'text-amber-300'}>
                {todayDosesTaken} / {todayDosesScheduled || 1} Doses Confirmed
              </strong>
            </span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {last7Days.map((day) => {
              const isSelected = selectedDay?.dateStr === day.dateStr;
              let bg = 'bg-slate-950/60 border-slate-800 text-slate-400';
              let badge = <Clock className="w-3 h-3 text-slate-500" />;
              let label = 'No Doses';

              if (day.status === 'PERFECT') {
                bg = 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 shadow-sm';
                badge = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />;
                label = '100% Taken';
              } else if (day.status === 'IN_PROGRESS') {
                bg = 'bg-amber-950/50 border-amber-500/50 text-amber-200 ring-1 ring-amber-400/30';
                badge = <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />;
                label = 'In Progress';
              } else if (day.status === 'MISSED' || day.status === 'PARTIAL') {
                bg = 'bg-rose-950/40 border-rose-500/40 text-rose-300';
                badge = <XCircle className="w-3.5 h-3.5 text-rose-400" />;
                label = `${day.score}% Missed`;
              }

              return (
                <div
                  key={day.dateStr}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`p-2 sm:p-2.5 rounded-xl border transition-all flex flex-col items-center justify-between text-center cursor-pointer relative group ${bg} ${
                    day.isToday ? 'ring-2 ring-amber-400/40 font-bold' : ''
                  } ${isSelected ? 'scale-105 ring-2 ring-teal-400' : 'hover:scale-[1.02]'}`}
                  title={`${day.shortDate} (${day.dayName}): ${day.taken}/${day.scheduled} Doses - ${label}`}
                >
                  <div className="flex items-center justify-between w-full text-[9px] font-bold text-slate-400">
                    <span>{day.dayName}</span>
                    {day.isToday && (
                      <span className="text-[8px] uppercase bg-amber-400 text-slate-950 px-1 rounded font-black">
                        Today
                      </span>
                    )}
                  </div>

                  <div className="my-1.5 flex items-center justify-center">
                    {badge}
                  </div>

                  <span className="text-[9px] font-mono text-slate-300 truncate w-full">
                    {day.shortDate.split(' ')[1]}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Selected Day Info Pill popup if clicked */}
          {selectedDay && (
            <div className="mt-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs text-slate-300 animate-fade-in">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{selectedDay.shortDate} ({selectedDay.dayName}):</span>
                <span className="text-slate-400">{selectedDay.taken} of {selectedDay.scheduled} doses taken ({selectedDay.score}% compliance)</span>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-[10px] text-slate-500 hover:text-white px-2 py-0.5 rounded bg-slate-900"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Unlocked Badges Shelf preview strip */}
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-400" /> Milestone Badges:
            </span>
            <div className="flex items-center gap-1.5">
              {achievements.map((ach) => {
                const IconComp = getBadgeIcon(ach.badgeIcon);
                return (
                  <div
                    key={ach.id}
                    onClick={handleOpenTrophyRoom}
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-transform hover:scale-110 cursor-pointer ${
                      ach.unlocked
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm'
                        : 'bg-slate-950 border-slate-800 text-slate-600 opacity-60'
                    }`}
                    title={`${ach.title}: ${ach.unlocked ? 'Unlocked! ✓' : `Requires ${ach.daysRequired} days (${ach.daysRequired - ach.progressDays}d left)`}`}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleOpenTrophyRoom}
            className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition flex items-center gap-1 whitespace-nowrap"
          >
            <span>View All {achievements.length} Achievements</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Full Trophy Room Modal */}
      <AchievementsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        achievements={achievements}
        currentStreak={currentStreak}
        longestStreak={longestStreak}
        patientName={patientName}
      />
    </>
  );
};
