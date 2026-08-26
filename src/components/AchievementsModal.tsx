import React, { useState } from 'react';
import {
  X,
  Flame,
  Zap,
  Shield,
  Trophy,
  Sparkles,
  Crown,
  Medal,
  CheckCircle2,
  Lock,
  Share2,
  HeartPulse,
  Target,
  Award,
  Calendar,
  Sparkle
} from 'lucide-react';
import { AdherenceAchievement, AchievementTier } from '../types';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: AdherenceAchievement[];
  currentStreak: number;
  longestStreak: number;
  patientName: string;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  achievements,
  currentStreak,
  longestStreak,
  patientName
}) => {
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedAchievement, setSelectedAchievement] = useState<AdherenceAchievement | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;
  const overallProgress = Math.round((unlockedCount / totalCount) * 100);

  const filteredAchievements = selectedTier === 'all'
    ? achievements
    : selectedTier === 'unlocked'
    ? achievements.filter(a => a.unlocked)
    : selectedTier === 'locked'
    ? achievements.filter(a => !a.unlocked)
    : achievements.filter(a => a.tier === selectedTier);

  const getTierColors = (tier: AchievementTier, unlocked: boolean) => {
    if (!unlocked) {
      return {
        badgeBg: 'bg-slate-800/80 text-slate-500 border-slate-700',
        cardBg: 'bg-slate-900/60 border-slate-800 text-slate-400',
        tagBg: 'bg-slate-800 text-slate-400 border-slate-700',
        glow: 'border-slate-800'
      };
    }
    switch (tier) {
      case 'bronze':
        return {
          badgeBg: 'bg-amber-900/40 text-amber-400 border-amber-600/40 shadow-amber-900/20',
          cardBg: 'bg-gradient-to-br from-amber-950/30 to-slate-900 border-amber-700/40 text-amber-100',
          tagBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          glow: 'border-amber-500/40 shadow-lg shadow-amber-500/10'
        };
      case 'silver':
        return {
          badgeBg: 'bg-slate-700/60 text-slate-200 border-slate-400/40 shadow-slate-700/30',
          cardBg: 'bg-gradient-to-br from-slate-850 to-slate-900 border-slate-400/40 text-slate-100',
          tagBg: 'bg-slate-400/20 text-slate-200 border-slate-400/30',
          glow: 'border-slate-400/40 shadow-lg shadow-slate-400/10'
        };
      case 'gold':
        return {
          badgeBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40 shadow-yellow-500/20',
          cardBg: 'bg-gradient-to-br from-yellow-950/30 to-slate-900 border-yellow-500/40 text-yellow-100',
          tagBg: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30',
          glow: 'border-yellow-400/40 shadow-lg shadow-yellow-500/10'
        };
      case 'platinum':
        return {
          badgeBg: 'bg-teal-500/20 text-teal-300 border-teal-400/40 shadow-teal-500/20',
          cardBg: 'bg-gradient-to-br from-teal-950/40 to-slate-900 border-teal-500/40 text-teal-100',
          tagBg: 'bg-teal-500/20 text-teal-300 border-teal-400/30',
          glow: 'border-teal-400/40 shadow-lg shadow-teal-500/10'
        };
      case 'diamond':
        return {
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 shadow-cyan-500/20',
          cardBg: 'bg-gradient-to-br from-cyan-950/40 to-slate-900 border-cyan-500/40 text-cyan-100',
          tagBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
          glow: 'border-cyan-400/40 shadow-lg shadow-cyan-500/10'
        };
      case 'legendary':
      default:
        return {
          badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-400/40 shadow-purple-500/20',
          cardBg: 'bg-gradient-to-br from-purple-950/40 to-slate-900 border-purple-500/40 text-purple-100',
          tagBg: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
          glow: 'border-purple-400/40 shadow-lg shadow-purple-500/10'
        };
    }
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

  const handleShare = () => {
    navigator.clipboard?.writeText(
      `🏆 MediCare+ Consistency Streak: ${currentStreak} Consecutive Days of 100% Medication Adherence! ${unlockedCount} Achievements Unlocked.`
    );
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div
      id="achievements-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        id="achievements-modal"
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Hero Banner */}
        <div className="p-6 bg-gradient-to-r from-slate-950 via-teal-950 to-slate-950 border-b border-slate-800 relative overflow-hidden flex-shrink-0">
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-teal-500/10 to-transparent pointer-events-none" />

          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 flex-shrink-0 border-2 border-amber-300">
                <Trophy className="w-7 h-7 animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" /> Medication Consistency Trophy Room
                  </span>
                  <span className="text-[10px] font-bold text-teal-300 bg-teal-950 px-2.5 py-0.5 rounded-full border border-teal-500/30">
                    Patient: {patientName}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-1 tracking-tight">
                  Adherence Streak & Achievements
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Rewarding daily discipline and consecutive 100% medication compliance.
                </p>
              </div>
            </div>

            <button
              id="close-achievements-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Streak Stats Cards Row */}
          <div className="grid grid-cols-3 gap-3 mt-5 relative z-10">
            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Current Streak</p>
                <p className="text-lg font-black text-white">{currentStreak} <span className="text-xs font-normal text-slate-400">Days</span></p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Best Streak</p>
                <p className="text-lg font-black text-white">{longestStreak} <span className="text-xs font-normal text-slate-400">Days</span></p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-2xl flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Unlocked</p>
                <p className="text-lg font-black text-white">{unlockedCount} / {totalCount} <span className="text-xs font-normal text-slate-400">({overallProgress}%)</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Navigation Bar */}
        <div className="px-6 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none flex-shrink-0">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: 'All Badges' },
              { id: 'unlocked', label: `Unlocked (${unlockedCount})` },
              { id: 'locked', label: `In Progress (${totalCount - unlockedCount})` },
              { id: 'bronze', label: 'Bronze' },
              { id: 'silver', label: 'Silver' },
              { id: 'gold', label: 'Gold' },
              { id: 'platinum', label: 'Platinum' },
              { id: 'diamond', label: 'Diamond' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTier(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedTier === tab.id
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleShare}
            className="text-xs font-bold text-slate-400 hover:text-amber-400 flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-800 transition whitespace-nowrap"
            title="Copy achievement summary to clipboard"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copiedLink ? 'Copied!' : 'Share'}</span>
          </button>
        </div>

        {/* Achievements Grid Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAchievements.map((item) => {
              const colors = getTierColors(item.tier, item.unlocked);
              const IconComp = getBadgeIcon(item.badgeIcon);
              const isSelected = selectedAchievement?.id === item.id;

              return (
                <div
                  key={item.id}
                  id={`achievement-card-${item.id}`}
                  onClick={() => setSelectedAchievement(isSelected ? null : item)}
                  className={`p-4.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group ${colors.cardBg} ${colors.glow} ${
                    isSelected ? 'ring-2 ring-amber-400/50 scale-[1.01]' : 'hover:scale-[1.005]'
                  }`}
                >
                  <div>
                    {/* Top Row: Icon, Title, Tier Tag */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center flex-shrink-0 transition-transform group-hover:rotate-6 ${colors.badgeBg}`}>
                          <IconComp className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-sm font-extrabold text-white">
                              {item.title}
                            </h4>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${colors.tagBg}`}>
                              {item.tier}
                            </span>
                          </div>
                          <p className="text-xs text-amber-300/90 font-medium mt-0.5">
                            {item.daysRequired} Consecutive Days @ 100%
                          </p>
                        </div>
                      </div>

                      {item.unlocked ? (
                        <div className="flex items-center gap-1 text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2 py-1 rounded-full text-[10px] font-black flex-shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>UNLOCKED</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-500 bg-slate-800 border border-slate-700 px-2 py-1 rounded-full text-[10px] font-bold flex-shrink-0">
                          <Lock className="w-3 h-3" />
                          <span>{item.daysRequired - item.progressDays}d left</span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Clinical Impact Box */}
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] flex items-start gap-2">
                      <HeartPulse className="w-3.5 h-3.5 text-rose-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <strong className="text-slate-300 font-semibold">Clinical Benefit: </strong>
                        <span className="text-slate-400">{item.clinicalImpact}</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar for Locked or Completion Status */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px] mb-1.5 font-medium">
                      <span className="text-slate-400">Consistency Progress</span>
                      <span className={item.unlocked ? 'text-emerald-400 font-bold' : 'text-amber-300 font-bold'}>
                        {item.unlocked ? `${item.daysRequired} / ${item.daysRequired} Days (100%)` : `${item.progressDays} / ${item.daysRequired} Days (${item.progressPercent}%)`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          item.unlocked
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-xs'
                            : 'bg-gradient-to-r from-amber-500 to-orange-400'
                        }`}
                        style={{ width: `${item.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer with Motivational Quote */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 text-xs flex-shrink-0">
          <div className="flex items-center gap-2 text-slate-400">
            <Sparkle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-slate-300 italic">
              "100% adherence today secures healthy vitality tomorrow."
            </span>
          </div>

          <button
            id="done-achievements-btn"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            Close Trophy Room
          </button>
        </div>
      </div>
    </div>
  );
};
