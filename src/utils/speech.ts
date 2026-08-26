// Speech Synthesis Utility for MediCare+ Medication Announcements

export const isSpeechSynthesisSupported = (): boolean => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
};

export const speakMessage = (text: string, onEnd?: () => void): boolean => {
  if (!isSpeechSynthesisSupported()) {
    console.warn('Speech Synthesis API is not supported in this browser.');
    return false;
  }

  try {
    // Cancel any current utterance before starting new speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Clear and accessible cadence for medical instructions
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    const voices = window.speechSynthesis.getVoices();
    // Prefer clear natural English voices
    const preferredVoice =
      voices.find((v) => (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Victoria')) && v.lang.startsWith('en')) ||
      voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    if (onEnd) {
      utterance.onend = () => onEnd();
      utterance.onerror = () => onEnd();
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch (error) {
    console.error('Speech synthesis execution error:', error);
    return false;
  }
};

export const stopSpeech = (): void => {
  if (isSpeechSynthesisSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('Could not stop speech synthesis:', e);
    }
  }
};

export const formatMedicationSpeechAnnouncement = (
  patientName: string,
  medicineName: string,
  dosage: string,
  time?: string,
  instructions?: string,
  mealTiming?: string,
  precautions?: string,
  doctorName?: string
): string => {
  let speech = `Medication Reminder for ${patientName}. It is time to take ${medicineName}, dosage ${dosage}.`;
  if (time) {
    speech += ` Scheduled for ${time}.`;
  }
  if (mealTiming) {
    if (mealTiming === 'AFTER_MEAL') speech += ` Take after your meal.`;
    else if (mealTiming === 'BEFORE_MEAL') speech += ` Take 30 minutes before food.`;
    else if (mealTiming === 'EMPTY_STOMACH') speech += ` Take on an empty stomach with warm water.`;
    else if (mealTiming === 'BEDTIME') speech += ` Take before bedtime.`;
  }
  if (instructions && instructions.trim() !== '') {
    speech += ` Doctor's instruction: ${instructions}.`;
  }
  if (precautions && precautions.trim() !== '') {
    speech += ` Precaution: ${precautions}.`;
  }
  if (doctorName) {
    speech += ` Prescribed by ${doctorName}.`;
  }
  speech += ` Please confirm your dose in the MediCare portal once taken.`;
  return speech;
};
