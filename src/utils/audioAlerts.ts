import { AlertSoundId, AlertSoundOption } from '../types';

export const ALERT_SOUNDS: AlertSoundOption[] = [
  {
    id: 'soft-bell',
    name: 'Soft Bell',
    category: 'gentle',
    description: 'Resonant, soothing acoustic chime with lingering harmonic decay. Gentle on the ears.',
    toneDescription: 'E5 Harmonic Ring (659 Hz + 1.3 kHz)',
    iconName: 'Bell',
    recommendedFor: 'Seniors & Quiet Environments',
    previewFrequencies: '659 Hz → 1318 Hz'
  },
  {
    id: 'pulse',
    name: 'Pulse',
    category: 'modern',
    description: 'Crisp dual-tone syncopated pulse. Highly audible and distinct for prompt action.',
    toneDescription: 'Dual High-Pitch Staccato (880 Hz & 1046 Hz)',
    iconName: 'Activity',
    recommendedFor: 'Busy & Active Routines',
    previewFrequencies: '880 Hz / 1046 Hz'
  },
  {
    id: 'chime',
    name: 'Chime',
    category: 'classic',
    description: 'Classic dual-tone ascending melody. The signature MediCare+ dose notification.',
    toneDescription: 'Ascending Dual-Tone (587 Hz → 880 Hz)',
    iconName: 'Volume2',
    recommendedFor: 'Standard Everyday Reminders',
    previewFrequencies: '587 Hz → 880 Hz'
  },
  {
    id: 'gentle-melody',
    name: 'Gentle Melody',
    category: 'gentle',
    description: 'Calming 3-note ascending arpeggio with soft envelope.',
    toneDescription: 'C Major Triad (523 Hz → 659 Hz → 784 Hz)',
    iconName: 'Music',
    recommendedFor: 'Stress-Free Pleasant Alerts',
    previewFrequencies: '523 Hz → 659 Hz → 784 Hz'
  },
  {
    id: 'zen-gong',
    name: 'Zen Gong',
    category: 'ambient',
    description: 'Deep resonant 432 Hz healing vibration with long peaceful sustain.',
    toneDescription: 'Harmonic 432 Hz Natural Frequency',
    iconName: 'Sparkles',
    recommendedFor: 'Bedtime & Morning Calms',
    previewFrequencies: '432 Hz + 216 Hz'
  },
  {
    id: 'marimba',
    name: 'Echo Marimba',
    category: 'modern',
    description: 'Bright wooden acoustic double-strike with quick echo decay.',
    toneDescription: 'Percussive Wooden Timbre',
    iconName: 'Radio',
    recommendedFor: 'High Clarity & Distinguishability',
    previewFrequencies: '740 Hz → 988 Hz'
  }
];

const STORAGE_KEY_SOUND = 'medicare_alert_sound';
const STORAGE_KEY_VOLUME = 'medicare_alert_volume';

/**
 * Returns currently saved alert sound preference or default 'soft-bell' / 'chime'
 */
export function getSavedAlertSound(): AlertSoundId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SOUND) as AlertSoundId | null;
    if (saved && ALERT_SOUNDS.some(s => s.id === saved)) {
      return saved;
    }
  } catch (e) {
    console.error('Error reading saved alert sound:', e);
  }
  return 'chime';
}

/**
 * Saves chosen alert sound preference to localStorage
 */
export function saveAlertSound(soundId: AlertSoundId): void {
  try {
    localStorage.setItem(STORAGE_KEY_SOUND, soundId);
  } catch (e) {
    console.error('Error saving alert sound:', e);
  }
}

/**
 * Returns saved volume preference (0.1 to 1.0, default 0.8)
 */
export function getSavedAlertVolume(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_VOLUME);
    if (saved !== null) {
      const parsed = parseFloat(saved);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        return parsed;
      }
    }
  } catch (e) {}
  return 0.8;
}

/**
 * Saves volume preference to localStorage
 */
export function saveAlertVolume(volume: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_VOLUME, String(Math.max(0, Math.min(1, volume))));
  } catch (e) {}
}

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Synthesizes and plays the designated alert sound tone using Web Audio API
 */
export function playAlertSound(soundId?: AlertSoundId, customVolume?: number): Promise<void> {
  return new Promise((resolve) => {
    try {
      const activeSound = soundId || getSavedAlertSound();
      const volumeLevel = customVolume !== undefined ? customVolume : getSavedAlertVolume();
      
      if (volumeLevel <= 0.01) {
        resolve();
        return;
      }

      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(volumeLevel, now);
      masterGain.connect(ctx.destination);

      switch (activeSound) {
        case 'soft-bell': {
          // Resonant Bell: E5 (659.25Hz) + Overtones (1318.5Hz, 1977Hz)
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const osc3 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          const gain2 = ctx.createGain();
          const gain3 = ctx.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(659.25, now); // E5

          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1318.5, now); // E6 overtone

          osc3.type = 'triangle';
          osc3.frequency.setValueAtTime(1977.75, now); // Gentle chime sparkle

          gain1.gain.setValueAtTime(0.001, now);
          gain1.gain.linearRampToValueAtTime(0.28, now + 0.02);
          gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

          gain2.gain.setValueAtTime(0.001, now);
          gain2.gain.linearRampToValueAtTime(0.12, now + 0.015);
          gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

          gain3.gain.setValueAtTime(0.001, now);
          gain3.gain.linearRampToValueAtTime(0.04, now + 0.01);
          gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

          osc1.connect(gain1);
          osc2.connect(gain2);
          osc3.connect(gain3);

          gain1.connect(masterGain);
          gain2.connect(masterGain);
          gain3.connect(masterGain);

          osc1.start(now);
          osc2.start(now);
          osc3.start(now);

          osc1.stop(now + 1.25);
          osc2.stop(now + 1.25);
          osc3.stop(now + 1.25);

          setTimeout(resolve, 1250);
          break;
        }

        case 'pulse': {
          // Double syncopated high-clarity pulse: 880Hz then 1046Hz
          // Pulse 1
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(880, now); // A5
          gain1.gain.setValueAtTime(0.001, now);
          gain1.gain.linearRampToValueAtTime(0.22, now + 0.01);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc1.connect(gain1);
          gain1.connect(masterGain);
          osc1.start(now);
          osc1.stop(now + 0.13);

          // Pulse 2
          const t2 = now + 0.14;
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1046.5, t2); // C6
          gain2.gain.setValueAtTime(0.001, t2);
          gain2.gain.linearRampToValueAtTime(0.26, t2 + 0.01);
          gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.25);
          osc2.connect(gain2);
          gain2.connect(masterGain);
          osc2.start(t2);
          osc2.stop(t2 + 0.26);

          setTimeout(resolve, 450);
          break;
        }

        case 'gentle-melody': {
          // C Major Triad (C5 -> E5 -> G5)
          const notes = [
            { freq: 523.25, time: 0, dur: 0.28, gain: 0.18 },
            { freq: 659.25, time: 0.14, dur: 0.28, gain: 0.20 },
            { freq: 783.99, time: 0.28, dur: 0.55, gain: 0.24 }
          ];

          notes.forEach(({ freq, time, dur, gain: noteGain }) => {
            const t = now + time;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);

            g.gain.setValueAtTime(0.001, t);
            g.gain.linearRampToValueAtTime(noteGain, t + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

            osc.connect(g);
            g.connect(masterGain);
            osc.start(t);
            osc.stop(t + dur);
          });

          setTimeout(resolve, 900);
          break;
        }

        case 'zen-gong': {
          // Warm 432Hz Gong with rich warm resonance
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          const gain2 = ctx.createGain();

          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(432, now);

          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(216, now); // Sub-octave

          gain1.gain.setValueAtTime(0.001, now);
          gain1.gain.linearRampToValueAtTime(0.3, now + 0.04);
          gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);

          gain2.gain.setValueAtTime(0.001, now);
          gain2.gain.linearRampToValueAtTime(0.1, now + 0.03);
          gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

          osc1.connect(gain1);
          osc2.connect(gain2);
          gain1.connect(masterGain);
          gain2.connect(masterGain);

          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 1.55);
          osc2.stop(now + 1.55);

          setTimeout(resolve, 1550);
          break;
        }

        case 'marimba': {
          // Percussive Marimba strike (740Hz + 988Hz)
          const strikes = [
            { freq: 740, time: 0, dur: 0.18, gain: 0.25 },
            { freq: 987.77, time: 0.11, dur: 0.35, gain: 0.28 }
          ];

          strikes.forEach(({ freq, time, dur, gain: sGain }) => {
            const t = now + time;
            const osc = ctx.createOscillator();
            const g = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);

            g.gain.setValueAtTime(0.001, t);
            g.gain.linearRampToValueAtTime(sGain, t + 0.008);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

            osc.connect(g);
            g.connect(masterGain);
            osc.start(t);
            osc.stop(t + dur);
          });

          setTimeout(resolve, 550);
          break;
        }

        case 'chime':
        default: {
          // Classic MediCare+ Dual Chime D5 (587.33Hz) -> A5 (880Hz)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(587.33, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.28);

          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.22, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now);
          osc.stop(now + 0.7);

          setTimeout(resolve, 700);
          break;
        }
      }
    } catch (e) {
      console.warn('Audio playback error:', e);
      resolve();
    }
  });
}
