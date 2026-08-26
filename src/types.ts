export interface User {
  user_id: number;
  full_name: string;
  email: string;
  role: 'patient' | 'caregiver' | 'doctor' | 'admin';
  created_at?: string;
  photo_url?: string;
}

export interface AdminOverviewStats {
  totalUsers: number;
  totalPatients: number;
  totalDoctors: number;
  totalCaregivers: number;
  totalPrescriptions: number;
  totalMedicines: number;
  totalDoseLogs: number;
  systemAdherenceRate: number;
  pendingRefillsCount: number;
  highRiskPatientsCount: number;
}

export interface SystemAuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  actorRole: string;
  target: string;
  details: string;
  level: 'info' | 'warning' | 'critical' | 'success';
}

export interface DoctorInfo {
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  specialty?: string;
  department?: string;
  status?: string;
  created_at?: string;
  photo_url?: string;
}

export interface Patient {
  patient_id: number;
  primary_user_id: number;
  name: string;
  relationship: string;
  age: number;
  gender: string;
  blood_group: string;
  photo_url?: string;
}

export interface ScheduleItem {
  time: string;
  frequency: string;
  label?: string; // e.g. 'Morning / सकाळ', 'Afternoon / दुपार', 'Night / रात्र'
}

export interface Medicine {
  medicine_id: number;
  patient_id: number;
  name: string;
  dosage: string;
  form: string;
  instructions: string;
  start_date: string;
  end_date?: string;
  total_quantity: number;
  remaining_quantity: number;
  refill_threshold: number;
  snooze_interval_minutes?: number;
  qr_code_data: string;
  schedules: ScheduleItem[];
  days_remaining?: number;
  needs_refill?: boolean;
  refill_requested?: boolean;
  last_refill_requested_at?: string;
  refill_status?: 'NORMAL' | 'LOW' | 'REFILL_REQUESTED' | 'ORDERED';
  // Doctor Prescription & Instruction Integration
  doctor_name?: string;
  doctor_specialty?: string;
  meal_timing?: 'AFTER_MEAL' | 'BEFORE_MEAL' | 'WITH_MEAL' | 'EMPTY_STOMACH' | 'BEDTIME' | 'ANYTIME';
  doctor_notes?: string;
  precautions?: string;
  is_doctor_prescribed?: boolean;
  prescribed_at?: string;
}

export interface RefillNotification {
  notification_id: number;
  medicine_id: number;
  medicine_name: string;
  patient_id: number;
  patient_name: string;
  caregiver_id?: number;
  caregiver_name?: string;
  caregiver_phone?: string;
  caregiver_email?: string;
  requested_quantity: number;
  remaining_stock: number;
  timestamp: string;
  message: string;
  channel: 'SMS_AND_EMAIL' | 'SMS' | 'EMAIL';
}

export interface DoseRecord {
  dose_id: number;
  medicine_id: number;
  patient_id: number;
  medicine_name: string;
  dosage: string;
  scheduled_datetime: string;
  actual_datetime?: string;
  status: 'TAKEN' | 'MISSED' | 'SKIPPED' | 'TAKEN_LATE' | 'PENDING';
  snooze_count: number;
  snooze_minutes: number;
  missed_reason?: string;
  logged_at: string;
}

export interface Caregiver {
  caregiver_id: number;
  patient_id: number;
  name: string;
  relation: string;
  phone: string;
  email: string;
  notify_on_missed: boolean;
  notify_threshold: number;
}

export interface Prescription {
  prescription_id: number;
  patient_id: number;
  doctor_name: string;
  prescription_date: string;
  notes: string;
  medicines_extracted: { name: string; dosage: string; frequency: string }[];
  created_at: string;
}

export interface DailyAdherencePoint {
  date: string; // 'YYYY-MM-DD'
  display_date: string; // 'Aug 1' or '08/01'
  adherence_score: number; // 0 - 100
  scheduled_doses: number;
  taken_doses: number;
  missed_doses: number;
  skipped_doses: number;
  day_of_week?: string;
}

export interface WeeklyAdherenceAggregate {
  week_id: string;
  week_label: string;
  short_label: string;
  start_date: string;
  end_date: string;
  adherence_score: number;
  scheduled_doses: number;
  taken_doses: number;
  missed_doses: number;
  skipped_doses: number;
  days_count: number;
}

export interface AdherenceStats {
  patient_id: number;
  scheduled_doses: number;
  taken_doses: number;
  missed_doses: number;
  skipped_doses: number;
  adherence_score: number;
  status_label: string;
  color_badge: string;
}

export interface PatientRosterItem extends Patient {
  active_medicines_count: number;
  adherence_score: number;
  adherence_status: string;
  has_low_stock: boolean;
  has_pending_refill: boolean;
  missed_doses_count: number;
  caregiver_name?: string;
  recent_prediction?: MLRiskPrediction;
}

export interface MLRiskPrediction {
  risk_score: number;
  risk_level: 'Low Risk' | 'Moderate Risk' | 'High Risk';
  status_color: 'emerald' | 'amber' | 'rose';
  recommendations: string[];
  engine?: string;
}

export interface PythonFile {
  path: string;
  content: string;
}

export interface InAppPushAlert {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'dose' | 'refill' | 'system' | 'doctor';
  medicine_id?: number;
  dosage?: string;
  patient_name?: string;
}

export type AlertSoundId = 'soft-bell' | 'pulse' | 'chime' | 'gentle-melody' | 'zen-gong' | 'marimba';

export interface AlertSoundOption {
  id: AlertSoundId;
  name: string;
  category: 'gentle' | 'modern' | 'classic' | 'ambient';
  description: string;
  toneDescription: string;
  iconName: string;
  recommendedFor?: string;
  previewFrequencies: string;
}

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'legendary';

export interface AdherenceAchievement {
  id: string;
  title: string;
  badgeIcon: string;
  tier: AchievementTier;
  daysRequired: number;
  description: string;
  clinicalImpact: string;
  quote: string;
  unlocked: boolean;
  unlockedAt?: string;
  progressDays: number;
  progressPercent: number;
}

export interface StreakDayInfo {
  dateStr: string; // 'YYYY-MM-DD'
  dayName: string; // 'Mon', 'Tue'
  shortDate: string; // 'Aug 23'
  isToday: boolean;
  isFuture: boolean;
  score: number; // 0 - 100
  scheduled: number;
  taken: number;
  missed: number;
  skipped: number;
  status: 'PERFECT' | 'MISSED' | 'PARTIAL' | 'NO_DOSES' | 'IN_PROGRESS';
}

export interface AdherenceStreakData {
  currentStreak: number;
  longestStreak: number;
  totalPerfectDays: number;
  todayScore: number | null;
  todayStatus: 'PERFECT' | 'IN_PROGRESS' | 'MISSED' | 'NO_DOSES';
  todayDosesTaken: number;
  todayDosesScheduled: number;
  last7Days: StreakDayInfo[];
  achievements: AdherenceAchievement[];
  nextAchievement: AdherenceAchievement | null;
  unlockedCount: number;
  motivationalMessage: string;
}

export interface MLForecastDay {
  day_offset: number; // 1 to 7
  date: string; // 'YYYY-MM-DD'
  display_date: string; // 'Aug 24'
  day_of_week: string; // 'Mon'
  is_weekend: boolean;
  risk_probability: number; // 0 - 100%
  lower_bound: number; // 0 - 100%
  upper_bound: number; // 0 - 100%
  risk_level: 'Low Risk' | 'Moderate Risk' | 'High Risk';
  status_color: 'emerald' | 'amber' | 'rose';
  scheduled_doses: number;
  top_risk_factors: string[];
  preventative_tip: string;
}

export interface MLForecastData {
  patient_id: number;
  generated_at: string;
  baseline_adherence: number;
  average_predicted_risk: number;
  peak_risk_day: MLForecastDay;
  lowest_risk_day: MLForecastDay;
  trend_direction: 'IMPROVING' | 'STABLE' | 'RISING';
  model_confidence: number;
  days: MLForecastDay[];
  engine: string;
}

export interface MissedReasonSlice {
  id: string;
  category: string; // e.g. 'Forgot', 'Nausea / Side Effects', 'Empty Supply / Refill'
  count: number;
  percentage: number;
  color: string;
  badge_color: string;
  icon: string;
  clinical_impact: string;
  suggested_action: string;
  records: DoseRecord[];
}

export interface MissedReasonDistribution {
  total_missed: number;
  total_with_reason: number;
  top_category: MissedReasonSlice | null;
  slices: MissedReasonSlice[];
}

export interface MissedHourSlot {
  hour: number; // 0 to 23
  hour_label: string; // e.g. '8 AM', '1 PM', '9 PM'
  hour_display: string; // e.g. '08:00 AM - 08:59 AM'
  time_of_day: 'EARLY_MORNING' | 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
  time_of_day_label: string; // e.g. 'Morning / सकाळ'
  total_scheduled: number;
  total_taken: number;
  total_missed: number;
  missed_rate: number; // 0 to 100%
  adherence_rate: number; // 0 to 100%
  top_missed_meds: { name: string; count: number }[];
  top_reasons: string[];
  records: DoseRecord[];
  is_peak_vulnerable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface TimeOfDayGroup {
  id: 'EARLY_MORNING' | 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
  label: string;
  time_span: string; // e.g. '8:00 AM - 11:59 AM'
  icon: string;
  total_scheduled: number;
  total_taken: number;
  total_missed: number;
  missed_rate: number;
  adherence_rate: number;
  color: string;
  hours: number[];
}

export interface MissedHoursAnalysis {
  patient_id: number;
  date_range_days: number | null; // 7, 14, 30 or null for ALL
  total_scheduled: number;
  total_taken: number;
  total_missed: number;
  overall_missed_rate: number;
  overall_adherence_rate: number;
  peak_hour: MissedHourSlot | null;
  best_hour: MissedHourSlot | null;
  hourly_slots: MissedHourSlot[];
  time_of_day_groups: TimeOfDayGroup[];
  has_data: boolean;
  actionable_recommendation: {
    title: string;
    description: string;
    target_hour_label: string;
    clinical_tip: string;
  };
}
