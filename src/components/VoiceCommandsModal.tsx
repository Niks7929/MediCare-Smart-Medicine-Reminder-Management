import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Mic,
  X,
  Sparkles,
  CheckCircle2,
  Play,
  Square,
  HelpCircle,
  Pill,
  Clock,
  ShieldCheck,
  Package,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { speakMessage, stopSpeech, isSpeechSynthesisSupported } from '../utils/speech';

interface VoiceCommandsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePatientName?: string;
}

interface CommandItem {
  phrase: string;
  description: string;
  category: 'announcements' | 'dosing' | 'instructions' | 'refills' | 'controls';
  sampleResponse?: string;
}

export const VoiceCommandsModal: React.FC<VoiceCommandsModalProps> = ({
  isOpen,
  onClose,
  activePatientName = 'Patient'
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isPlayingSample, setIsPlayingSample] = useState(false);
  const [copiedPhrase, setCopiedPhrase] = useState<string | null>(null);

  if (!isOpen) return null;

  const isSpeechAvailable = isSpeechSynthesisSupported();

  const commands: CommandItem[] = [
    {
      phrase: "Announce today's meds",
      description: "Audibly speaks all active medication schedules, dosage amounts, and designated times for the selected patient.",
      category: 'announcements',
      sampleResponse: `Medication schedule for ${activePatientName}. You have 3 scheduled medications today: Metformin at 8:00 AM, Atorvastatin at 2:00 PM, and Lisinopril at 8:00 PM.`
    },
    {
      phrase: "What are my medications today?",
      description: "Provides an overview of today's pending, taken, and upcoming doses.",
      category: 'announcements',
      sampleResponse: `Today for ${activePatientName}: 1 dose taken on time, 2 doses remaining for afternoon and evening.`
    },
    {
      phrase: "Mark dose as taken",
      description: "Logs the currently scheduled medication as taken and updates adherence analytics.",
      category: 'dosing',
      sampleResponse: "Dose recorded as taken on time. Adherence rate maintained at 100 percent."
    },
    {
      phrase: "Take [Medicine Name]",
      description: "Confirms and records a specific medication dose (e.g. 'Take Metformin').",
      category: 'dosing',
      sampleResponse: "Metformin 500mg recorded as taken. Stock updated."
    },
    {
      phrase: "Read instructions for [Medicine]",
      description: "Speaks meal timing (e.g., after food, empty stomach), cautions, and doctor directions.",
      category: 'instructions',
      sampleResponse: "Metformin: Take 500mg tablet 15 minutes after food. Swallow with a full glass of water. Prescribed by Dr. Sarah Bennett."
    },
    {
      phrase: "How should I take my morning pills?",
      description: "Announces specific dietary and meal instructions for morning regimens.",
      category: 'instructions',
      sampleResponse: "Morning medication: Take on an empty stomach with warm water, 30 minutes before breakfast."
    },
    {
      phrase: "Check refill status",
      description: "Audibly announces remaining pill inventory and flags any medicines near the refill threshold.",
      category: 'refills',
      sampleResponse: "Pharmacy stock status: Lisinopril has 4 pills remaining. Refill threshold reached. 1-click refill order recommended."
    },
    {
      phrase: "What is my adherence streak?",
      description: "Audibly reads your current consecutive days of 100% adherence and next unlocked milestone achievement.",
      category: 'announcements',
      sampleResponse: `Great consistency! You have an active streak of 7 consecutive days with 100% medication adherence. Your next milestone is the 14-Day Iron Will trophy.`
    },
    {
      phrase: "Show achievements & trophies",
      description: "Opens the consistency trophy room showcasing your badges and clinical impact milestones.",
      category: 'controls',
      sampleResponse: "Trophy room active. You have unlocked 3 medication consistency badges."
    },
    {
      phrase: "Low stock alert",
      description: "Lists all medications that need replenishment or caregiver re-orders.",
      category: 'refills',
      sampleResponse: "Stock alert: Lisinopril is low on stock. Automated reorder available."
    },
    {
      phrase: "Repeat last reminder",
      description: "Replays the previous medication schedule announcement.",
      category: 'controls',
      sampleResponse: "Repeating last reminder: It is time to take Atorvastatin 20mg with lunch."
    },
    {
      phrase: "Change alert chime sound",
      description: "Select between different alert chimes (Soft Bell, Pulse, Chime, Gentle Melody, Zen Gong, Echo Marimba).",
      category: 'controls',
      sampleResponse: "Custom alert sound picker active. Select your preferred chime."
    },
    {
      phrase: "Stop audio / Cancel voice",
      description: "Immediately halts active speech synthesis playback.",
      category: 'controls',
      sampleResponse: "Voice audio halted."
    }
  ];

  const filteredCommands = activeCategory === 'all'
    ? commands
    : commands.filter(c => c.category === activeCategory);

  const handleTestSpeech = (sampleText: string) => {
    if (isPlayingSample) {
      stopSpeech();
      setIsPlayingSample(false);
      return;
    }

    setIsPlayingSample(true);
    speakMessage(sampleText, () => {
      setIsPlayingSample(false);
    });
  };

  const handleCopyPhrase = (phrase: string) => {
    navigator.clipboard.writeText(phrase);
    setCopiedPhrase(phrase);
    setTimeout(() => setCopiedPhrase(null), 2000);
  };

  return (
    <div 
      id="voice-commands-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        id="voice-commands-modal"
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 flex-shrink-0 shadow-inner">
              <Volume2 className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-400 bg-teal-950 px-2 py-0.5 rounded-full border border-teal-500/30">
                  Voice & Audio Guide
                </span>
                {isSpeechAvailable ? (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                    Speech Engine Ready
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-950 px-2 py-0.5 rounded-full border border-amber-500/30">
                    Speech Synthesis Not Detected
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black text-white mt-1">
                Available Voice Commands & Audio Controls
              </h3>
            </div>
          </div>

          <button
            id="voice-modal-close-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filters */}
        <div className="px-5 py-3 bg-slate-900 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {[
            { id: 'all', label: 'All Commands' },
            { id: 'announcements', label: "Announcements", icon: Volume2 },
            { id: 'dosing', label: 'Dose Logging', icon: CheckCircle2 },
            { id: 'instructions', label: 'Instructions', icon: Pill },
            { id: 'refills', label: 'Refill Alerts', icon: Package },
            { id: 'controls', label: 'Audio Controls', icon: Mic }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                activeCategory === cat.id
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat.icon && <cat.icon className="w-3.5 h-3.5" />}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Content Body / Command Cards */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {filteredCommands.map((cmd, idx) => (
            <div 
              key={idx}
              className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-2xl hover:border-slate-700 transition space-y-2.5 group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-bold text-teal-300 bg-teal-950/60 px-2.5 py-1 rounded-xl border border-teal-500/30 flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-teal-400" />
                    "{cmd.phrase}"
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleCopyPhrase(cmd.phrase)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs transition flex items-center gap-1"
                    title="Copy voice phrase"
                  >
                    {copiedPhrase === cmd.phrase ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] text-emerald-400 font-bold">Copied</span>
                      </>
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {cmd.sampleResponse && (
                    <button
                      onClick={() => handleTestSpeech(cmd.sampleResponse!)}
                      className="px-2.5 py-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 hover:text-teal-200 border border-teal-500/30 text-xs font-bold transition flex items-center gap-1.5"
                      title="Play sample speech announcement"
                    >
                      {isPlayingSample ? (
                        <>
                          <Square className="w-3 h-3 text-rose-400" />
                          <span className="text-[11px]">Stop</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 text-teal-400" />
                          <span className="text-[11px]">Listen Sample</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {cmd.description}
              </p>

              {cmd.sampleResponse && (
                <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 flex items-start gap-2">
                  <Volume2 className="w-3.5 h-3.5 text-teal-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-400 font-semibold block text-[10px] uppercase">Audio Output Format:</strong>
                    <span className="italic text-slate-300">"{cmd.sampleResponse}"</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer info banner */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400 flex-shrink-0" />
            <span>Voice announcements automatically utilize natural clinical cadence with high-contrast accessibility mode support.</span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
