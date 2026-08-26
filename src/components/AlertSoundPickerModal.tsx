import React, { useState } from 'react';
import {
  Bell,
  Volume2,
  VolumeX,
  Play,
  Square,
  Check,
  X,
  Sparkles,
  Sliders,
  Radio,
  Activity,
  Music,
  CheckCircle2
} from 'lucide-react';
import { AlertSoundId, AlertSoundOption } from '../types';
import {
  ALERT_SOUNDS,
  playAlertSound,
  saveAlertSound,
  saveAlertVolume,
  getSavedAlertVolume
} from '../utils/audioAlerts';
import { speakMessage, stopSpeech, isSpeechSynthesisSupported } from '../utils/speech';

interface AlertSoundPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSound: AlertSoundId;
  onSelectSound: (soundId: AlertSoundId) => void;
  activePatientName?: string;
}

export const AlertSoundPickerModal: React.FC<AlertSoundPickerModalProps> = ({
  isOpen,
  onClose,
  currentSound,
  onSelectSound,
  activePatientName = 'Patient'
}) => {
  const [playingSoundId, setPlayingSoundId] = useState<AlertSoundId | null>(null);
  const [volume, setVolume] = useState<number>(() => getSavedAlertVolume());
  const [isPlayingTestReminder, setIsPlayingTestReminder] = useState<boolean>(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');

  if (!isOpen) return null;

  const handlePreview = async (sound: AlertSoundOption) => {
    if (playingSoundId === sound.id) {
      setPlayingSoundId(null);
      return;
    }
    setPlayingSoundId(sound.id);
    await playAlertSound(sound.id, volume);
    setPlayingSoundId(null);
  };

  const handleSelect = (soundId: AlertSoundId) => {
    onSelectSound(soundId);
    saveAlertSound(soundId);
    // Play preview on selection
    playAlertSound(soundId, volume);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    saveAlertVolume(newVolume);
  };

  const handleTestFullReminder = async (soundId: AlertSoundId) => {
    if (isPlayingTestReminder) {
      stopSpeech();
      setIsPlayingTestReminder(false);
      return;
    }

    setIsPlayingTestReminder(true);
    // 1. Play chime tone
    await playAlertSound(soundId, volume);

    // 2. Speak reminder message
    if (isSpeechSynthesisSupported()) {
      const sampleText = `Medication Reminder for ${activePatientName}. It is time to take your scheduled dose: Metformin 500mg tablet with breakfast. Please take with a glass of water.`;
      speakMessage(sampleText, () => {
        setIsPlayingTestReminder(false);
      });
    } else {
      setTimeout(() => {
        setIsPlayingTestReminder(false);
      }, 1000);
    }
  };

  const filteredSounds = activeCategoryFilter === 'all'
    ? ALERT_SOUNDS
    : ALERT_SOUNDS.filter(s => s.category === activeCategoryFilter);

  const getSoundIcon = (name: string) => {
    switch (name) {
      case 'Bell': return Bell;
      case 'Activity': return Activity;
      case 'Music': return Music;
      case 'Sparkles': return Sparkles;
      case 'Radio': return Radio;
      default: return Volume2;
    }
  };

  return (
    <div 
      id="alert-sound-picker-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        id="alert-sound-picker-modal"
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 flex-shrink-0 shadow-inner">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-400 bg-teal-950 px-2.5 py-0.5 rounded-full border border-teal-500/30">
                  Audio Tone Settings
                </span>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                  Saved in Local Storage
                </span>
              </div>
              <h3 className="text-lg font-black text-white mt-1">
                Medication Reminder Alert Sound
              </h3>
            </div>
          </div>

          <button
            id="close-sound-picker-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Volume & Filter Bar */}
        <div className="px-5 py-3.5 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none">
            {[
              { id: 'all', label: 'All Chimes' },
              { id: 'gentle', label: 'Gentle & Soft' },
              { id: 'modern', label: 'Modern Pulse' },
              { id: 'classic', label: 'Classic' },
              { id: 'ambient', label: 'Ambient' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategoryFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeCategoryFilter === tab.id
                    ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Volume Slider Control */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={() => handleVolumeChange(volume > 0 ? 0 : 0.8)}
              className="text-slate-400 hover:text-teal-400 transition p-1"
              title={volume === 0 ? 'Unmute' : 'Mute'}
            >
              {volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-teal-400" />}
            </button>
            <div className="flex items-center gap-2">
              <input
                id="alert-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-24 sm:w-28 accent-teal-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                title={`Volume: ${Math.round(volume * 100)}%`}
              />
              <span className="text-[11px] font-mono text-slate-400 w-8 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Sound List Grid */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-3 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredSounds.map((sound) => {
              const isSelected = currentSound === sound.id;
              const isPlaying = playingSoundId === sound.id;
              const IconComp = getSoundIcon(sound.iconName);

              return (
                <div
                  key={sound.id}
                  id={`sound-option-${sound.id}`}
                  onClick={() => handleSelect(sound.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                    isSelected
                      ? 'bg-gradient-to-br from-teal-950/80 to-slate-900 border-teal-500 shadow-lg shadow-teal-500/10 ring-2 ring-teal-500/30'
                      : 'bg-slate-950/60 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Top Row: Icon, Title, Selection Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl border ${
                        isSelected
                          ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md'
                          : 'bg-slate-800 text-teal-400 border-slate-700 group-hover:border-teal-500/40'
                      }`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-extrabold text-white">
                            {sound.name}
                          </h4>
                          {isSelected && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-teal-400 text-slate-950 shadow-xs">
                              <Check className="w-2.5 h-2.5 stroke-[3]" /> Active
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-teal-300/80">
                          {sound.toneDescription}
                        </span>
                      </div>
                    </div>

                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(sound);
                      }}
                      className={`p-2 rounded-xl transition flex items-center justify-center ${
                        isPlaying
                          ? 'bg-teal-500 text-slate-950 animate-pulse'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'
                      }`}
                      title={isPlaying ? 'Playing...' : `Listen to ${sound.name}`}
                    >
                      {isPlaying ? (
                        <Square className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                    </button>
                  </div>

                  {/* Sound Wave Visualizer (shows during preview or if active) */}
                  <div className="my-2.5 h-6 flex items-center gap-1 bg-slate-900/80 px-2.5 rounded-xl border border-slate-800/80">
                    <div className="flex items-center gap-1 flex-1">
                      {[40, 75, 55, 90, 65, 80, 45, 95, 60, 85, 50, 70, 90, 60].map((h, i) => (
                        <span
                          key={i}
                          className={`w-1 rounded-full transition-all duration-300 ${
                            isPlaying
                              ? 'bg-teal-400 animate-pulse'
                              : isSelected
                              ? 'bg-teal-600/70'
                              : 'bg-slate-700'
                          }`}
                          style={{
                            height: isPlaying ? `${Math.min(100, h * (1 + (i % 3) * 0.2))}%` : isSelected ? `${h * 0.45}%` : '20%'
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">
                      {sound.previewFrequencies}
                    </span>
                  </div>

                  {/* Description & Recommended Tag */}
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {sound.description}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-medium">
                      Best for: <strong className="text-slate-300">{sound.recommendedFor}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(sound.id);
                      }}
                      className={`font-bold transition ${
                        isSelected ? 'text-teal-400 hover:text-teal-300' : 'text-slate-400 hover:text-teal-300'
                      }`}
                    >
                      {isSelected ? '✓ Selected' : 'Choose This'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Test Dose Reminder Section */}
          <div className="mt-4 p-4 bg-slate-950 border border-teal-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white">
                  Test Complete Dose Announcement
                </h5>
                <p className="text-[11px] text-slate-400">
                  Plays the selected chime ({ALERT_SOUNDS.find(s => s.id === currentSound)?.name}) + spoken patient dose directive.
                </p>
              </div>
            </div>

            <button
              id="test-full-reminder-btn"
              type="button"
              onClick={() => handleTestFullReminder(currentSound)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap shadow-lg ${
                isPlayingTestReminder
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                  : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-teal-500/20'
              }`}
            >
              {isPlayingTestReminder ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Simulation</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play Reminder Test</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <span>
              Active Chime: <strong className="text-teal-300 font-bold">{ALERT_SOUNDS.find(s => s.id === currentSound)?.name}</strong>. Plays on scheduled doses & intake logs.
            </span>
          </div>

          <button
            id="done-sound-picker-btn"
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
