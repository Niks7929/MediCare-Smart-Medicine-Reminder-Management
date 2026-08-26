import React, { useState, useMemo } from 'react';
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  ShieldAlert,
  Brain,
  Info,
  QrCode,
  PackageCheck,
  Volume2,
  Square,
  Send,
  RefreshCw,
  Pill,
  Mail,
  Phone,
  ShieldCheck,
  Check,
  Search,
  X,
  Printer,
  Download,
  ShoppingCart,
  Truck,
  Star,
  Package,
  ArrowRight,
  Flame,
  CreditCard,
  Stethoscope,
  Utensils,
  FileText,
  HeartPulse,
  Activity,
  CalendarRange,
  Calendar,
  ChevronDown,
  Layers
} from 'lucide-react';
import { Patient, Medicine, DoseRecord, AdherenceStats, MLRiskPrediction, Caregiver, AlertSoundId } from '../types';
import { AdherenceLineChart } from './AdherenceLineChart';
import { MLRiskForecastChart } from './MLRiskForecastChart';
import { MissedDoseReasonPieChart } from './MissedDoseReasonPieChart';
import { MissedDoseHoursBarChart } from './MissedDoseHoursBarChart';
import { PrintableComplianceAudit } from './PrintableComplianceAudit';
import { CsvExportModal } from './CsvExportModal';
import { MedicineDoseLogModal } from './MedicineDoseLogModal';
import { StreakCounterWidget } from './StreakCounterWidget';
import { calculateAdherenceStreak } from '../utils/streakCalculator';
import { ALERT_SOUNDS } from '../utils/audioAlerts';

const getMealTimingDisplay = (timing?: string) => {
  switch (timing) {
    case 'AFTER_MEAL':
      return { label: 'After Meal', color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700', icon: '🍽️', desc: 'Take 15-20 mins after food' };
    case 'BEFORE_MEAL':
      return { label: 'Before Meal', color: 'bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700', icon: '🥣', desc: 'Take 30 mins before food' };
    case 'EMPTY_STOMACH':
      return { label: 'Empty Stomach', color: 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-700', icon: '💧', desc: 'Take in morning with warm water' };
    case 'WITH_MEAL':
      return { label: 'With Meal', color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700', icon: '🥗', desc: 'Take along with food' };
    case 'BEDTIME':
      return { label: 'Bedtime', color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700', icon: '🌙', desc: 'Take right before sleep' };
    default:
      return { label: 'As Directed', color: 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-700', icon: '⏰', desc: 'Take with water' };
  }
};

interface DashboardProps {
  activePatient: Patient;
  medicines: Medicine[];
  doseRecords: DoseRecord[];
  adherenceStats: AdherenceStats;
  mlPrediction: MLRiskPrediction | null;
  onLogDose: (medicineId: number, status: 'TAKEN' | 'MISSED' | 'SKIPPED' | 'TAKEN_LATE', snoozeMinutes?: number, reason?: string) => void;
  onShowQR: (medicine: Medicine) => void;
  onNavigateToStock: () => void;
  onRequestRefill?: (medicine: Medicine, options?: { requested_quantity?: number; urgent?: boolean; notes?: string }) => void;
  speechEnabled?: boolean;
  onSpeakReminder?: (medicine: Medicine) => void;
  isSpeaking?: boolean;
  onStopSpeech?: () => void;
  caregivers?: Caregiver[];
  pushEnabled?: boolean;
  onTogglePush?: () => void;
  onTestPush?: () => void;
  alertSound?: AlertSoundId;
  onOpenSoundPicker?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  activePatient,
  medicines,
  doseRecords,
  adherenceStats,
  mlPrediction,
  onLogDose,
  onShowQR,
  onNavigateToStock,
  onRequestRefill,
  speechEnabled = true,
  onSpeakReminder,
  isSpeaking = false,
  onStopSpeech,
  caregivers = [],
  pushEnabled = false,
  onTogglePush,
  onTestPush,
  alertSound = 'chime',
  onOpenSoundPicker
}) => {
  const [snoozeOpen, setSnoozeOpen] = useState<number | null>(null);
  const [skipReasonModal, setSkipReasonModal] = useState<number | null>(null);
  const [customSkipReasonText, setCustomSkipReasonText] = useState('');

  // Refill Modal state
  const [refillModalMed, setRefillModalMed] = useState<Medicine | null>(null);
  const [refillQuantity, setRefillQuantity] = useState('30');
  const [refillUrgent, setRefillUrgent] = useState(false);
  const [refillNotes, setRefillNotes] = useState('');
  const [isSubmittingRefill, setIsSubmittingRefill] = useState(false);

  // Search state for medications table
  const [searchTerm, setSearchTerm] = useState('');

  // Filtered medicines by name
  const filteredMedicines = medicines.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  // Search, Status, Date Range, Hour, and Compliance Impact filter state for 'Dose Taken vs Dose Missed' history logs
  const [doseLogSearch, setDoseLogSearch] = useState('');
  const [doseLogFilter, setDoseLogFilter] = useState<'ALL' | 'TAKEN' | 'MISSED'>('ALL');
  const [doseLogRange, setDoseLogRange] = useState<'ALL' | '30' | '14' | '7'>('ALL');
  const [doseLogHourFilter, setDoseLogHourFilter] = useState<number | null>(null);
  const [complianceImpactFilter, setComplianceImpactFilter] = useState<'ALL' | 'POSITIVE' | 'HIGH_IMPACT' | 'DELAYED'>('ALL');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [selectedMedicineForDoseLog, setSelectedMedicineForDoseLog] = useState<Medicine | null>(null);

  // Dynamic record count presets for quick range buttons
  const rangeCounts = useMemo(() => {
    const now = Date.now();
    const getCount = (days?: number) => {
      let list = doseRecords.filter(r => {
        const matchesQuery = !doseLogSearch.trim() || r.medicine_name.toLowerCase().includes(doseLogSearch.toLowerCase().trim());
        if (!matchesQuery) return false;
        if (doseLogFilter === 'TAKEN' && !(r.status === 'TAKEN' || r.status === 'TAKEN_LATE')) return false;
        if (doseLogFilter === 'MISSED' && !(r.status === 'MISSED' || r.status === 'SKIPPED')) return false;
        if (complianceImpactFilter === 'POSITIVE' && r.status !== 'TAKEN') return false;
        if (complianceImpactFilter === 'HIGH_IMPACT' && !(r.status === 'MISSED' || r.status === 'SKIPPED')) return false;
        if (complianceImpactFilter === 'DELAYED' && r.status !== 'TAKEN_LATE') return false;
        if (doseLogHourFilter !== null) {
          const recHour = new Date(r.scheduled_datetime || (r as any).logged_at).getHours();
          if (recHour !== doseLogHourFilter) return false;
        }
        if (days) {
          const recordTime = new Date(r.scheduled_datetime || (r as any).logged_at).getTime();
          return recordTime >= (now - days * 86400000);
        }
        return true;
      });
      return list.length;
    };

    return {
      seven: getCount(7),
      fourteen: getCount(14),
      thirty: getCount(30),
      all: getCount()
    };
  }, [doseRecords, doseLogSearch, doseLogFilter, complianceImpactFilter, doseLogHourFilter]);

  const filteredDoseRecords = doseRecords.filter((r) => {
    const matchesQuery = !doseLogSearch.trim() || r.medicine_name.toLowerCase().includes(doseLogSearch.toLowerCase().trim());
    if (!matchesQuery) return false;
    
    // Status filter
    if (doseLogFilter === 'TAKEN' && !(r.status === 'TAKEN' || r.status === 'TAKEN_LATE')) return false;
    if (doseLogFilter === 'MISSED' && !(r.status === 'MISSED' || r.status === 'SKIPPED')) return false;

    // Compliance Impact filter
    if (complianceImpactFilter === 'POSITIVE' && r.status !== 'TAKEN') return false;
    if (complianceImpactFilter === 'HIGH_IMPACT' && !(r.status === 'MISSED' || r.status === 'SKIPPED')) return false;
    if (complianceImpactFilter === 'DELAYED' && r.status !== 'TAKEN_LATE') return false;

    // Specific Hour filter (from Common Missed-Dose Hours chart drill-down)
    if (doseLogHourFilter !== null) {
      const recHour = new Date(r.scheduled_datetime || (r as any).logged_at).getHours();
      if (recHour !== doseLogHourFilter) return false;
    }

    // Date Range filter (7, 14, 30 days or ALL)
    if (doseLogRange !== 'ALL') {
      const cutoffTime = Date.now() - Number(doseLogRange) * 86400000;
      const recordTime = new Date(r.scheduled_datetime || (r as any).logged_at).getTime();
      if (recordTime < cutoffTime) return false;
    }

    return true;
  });

  // Find next upcoming dose
  const nextMedicine = medicines.length > 0 ? medicines[0] : null;
  const lowStockCount = medicines.filter(m => m.needs_refill).length;
  const assignedCaregiver = caregivers.find(c => c.patient_id === activePatient.patient_id) || caregivers[0];

  const handleOpenRefillModal = (med: Medicine) => {
    setRefillModalMed(med);
    setRefillQuantity(String(med.total_quantity || 30));
    setRefillUrgent(!!med.needs_refill);
    setRefillNotes(med.needs_refill ? 'Stock running low. Please refill before supply runs out.' : '');
  };

  const handleConfirmRefill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refillModalMed || !onRequestRefill) return;

    setIsSubmittingRefill(true);
    try {
      await onRequestRefill(refillModalMed, {
        requested_quantity: Number(refillQuantity) || 30,
        urgent: refillUrgent,
        notes: refillNotes
      });
      setRefillModalMed(null);
    } finally {
      setIsSubmittingRefill(false);
    }
  };

  // Dynamically compute Weekly Adherence Breakdown from doseRecords
  const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  const weeklyDays = dayOrder.map(dayName => {
    const dayRecords = doseRecords.filter(r => {
      const recordDate = new Date(r.scheduled_datetime || r.logged_at);
      return dayNamesShort[recordDate.getDay()] === dayName;
    });
    const scheduled = dayRecords.length;
    const taken = dayRecords.filter(r => r.status === 'TAKEN' || r.status === 'TAKEN_LATE').length;
    const score = scheduled > 0 ? Math.round((taken / scheduled) * 100) : 0;
    return { day: dayName, score, taken, scheduled };
  });

  const totalWeeklyDoses = weeklyDays.reduce((acc, d) => acc + d.scheduled, 0);

  // Compute live 100% Adherence Consecutive Days Streak & Achievements
  const streakData = useMemo(() => {
    return calculateAdherenceStreak(doseRecords, medicines, activePatient.patient_id);
  }, [doseRecords, medicines, activePatient.patient_id]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Patient Greeting & Status Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border border-teal-800/40 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center space-x-4">
            {activePatient.photo_url ? (
              <img
                src={activePatient.photo_url}
                alt={activePatient.name}
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-teal-400 shadow-md ring-2 ring-teal-500/20 flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center font-black text-xl text-slate-950 border-2 border-teal-400 shadow-md flex-shrink-0">
                {activePatient.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Active Profile: {activePatient.relationship}
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Age: {activePatient.age} | Gender: {activePatient.gender} | Blood: {activePatient.blood_group || 'O+'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 tracking-tight">
                Welcome back, {activePatient.name}
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                Your medication adherence is currently <span className="text-teal-400 font-bold">{adherenceStats.adherence_score}% ({adherenceStats.status_label})</span>. Keep up the great consistency!
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 backdrop-blur-sm">
            <div className="text-right">
              <p className="text-xs text-slate-400">Refill Alert</p>
              <p className="text-sm font-bold text-white">
                {lowStockCount > 0 ? (
                  <span className="text-amber-400 flex items-center justify-end gap-1">
                    <AlertTriangle className="h-4 w-4" /> {lowStockCount} Low Stock
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center justify-end gap-1">
                    <PackageCheck className="h-4 w-4" /> Stock Healthy
                  </span>
                )}
              </p>
            </div>
            {lowStockCount > 0 && (
              <button
                onClick={onNavigateToStock}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3 py-2 rounded-lg transition shadow-md"
              >
                Refill Now
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Visual Streak Counter & Consistency Achievements Element */}
      <StreakCounterWidget
        streakData={streakData}
        patientName={activePatient.name}
      />

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Adherence Score */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Adherence Score</p>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{adherenceStats.adherence_score}%</p>
            <span className={`inline-block text-xs font-bold mt-1 px-2 py-0.5 rounded-full ${
              adherenceStats.adherence_score >= 90
                ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
            }`}>
              {adherenceStats.status_label}
            </span>
          </div>
          <div className="bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 p-3 rounded-2xl">
            <TrendingUp className="h-7 w-7" />
          </div>
        </div>

        {/* Total Scheduled */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Scheduled Doses</p>
            <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">{adherenceStats.scheduled_doses}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Total tracked history</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 p-3 rounded-2xl">
            <Clock className="h-7 w-7" />
          </div>
        </div>

        {/* Confirmed Taken */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Confirmed Taken</p>
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{adherenceStats.taken_doses}</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">Inventory reduced</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 p-3 rounded-2xl">
            <CheckCircle2 className="h-7 w-7" />
          </div>
        </div>

        {/* Missed / Skipped */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between transition-colors">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Missed / Skipped</p>
            <p className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">{adherenceStats.missed_doses}</p>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">Logged with reason</p>
          </div>
          <div className="bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 p-3 rounded-2xl">
            <XCircle className="h-7 w-7" />
          </div>
        </div>
      </div>

      {/* Browser Background Push Notifications Service Worker Banner */}
      <div className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
        pushEnabled 
          ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-100' 
          : 'bg-slate-900 border-slate-700/80 text-slate-200'
      }`}>
        <div className="flex items-center space-x-3.5">
          <div className={`p-2.5 rounded-xl flex items-center justify-center ${
            pushEnabled ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'bg-slate-800 text-slate-400'
          }`}>
            <Bell className={`h-5 w-5 ${pushEnabled ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Browser Push & Service Worker Notifications</h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                pushEnabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-400'
              }`}>
                {pushEnabled ? 'ACTIVE IN BACKGROUND' : 'DISABLED'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {pushEnabled 
                ? 'System notifications will alert you on schedule even when this browser tab is closed, minimized, or in another app.'
                : 'Enable browser notifications so you never miss a dose when working in other tabs or apps.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onTogglePush && (
            <button
              onClick={onTogglePush}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm ${
                pushEnabled 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>{pushEnabled ? 'Disable Push' : 'Enable Background Push'}</span>
            </button>
          )}

          {pushEnabled && onTestPush && (
            <button
              onClick={onTestPush}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-200 hover:text-white border border-indigo-500/40 transition flex items-center gap-1.5"
              title="Trigger immediate test notification"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Test Push</span>
            </button>
          )}
        </div>
      </div>

      {/* 👨‍⚕️ DOCTOR'S PRESCRIPTIONS & CLINICAL DIRECTIVES (डॉक्टरांचे मार्गदर्शन, औषधे व वेळापत्रक) */}
      {medicines.some(m => m.is_doctor_prescribed || m.doctor_name || m.doctor_notes || m.precautions) && (
        <div className="bg-gradient-to-br from-teal-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 border-2 border-teal-500/40 shadow-xl space-y-5 relative overflow-hidden">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-teal-500/20 pb-4 relative z-10">
            <div className="flex items-center space-x-3.5">
              <div className="p-3 bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded-2xl shadow-inner">
                <Stethoscope className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                    Doctor's Active Clinical Directives & Timings
                  </h2>
                  <span className="text-[11px] font-bold bg-teal-500/30 text-teal-200 border border-teal-400/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-teal-300" /> Live Sync with Doctor
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Doctor-prescribed medications, scheduled times, food intake rules, and precautions.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="text-[11px] bg-slate-800/80 text-teal-300 border border-teal-500/30 px-3 py-1.5 rounded-xl font-bold">
                Patient: <strong className="text-white">{activePatient.name}</strong>
              </span>
            </div>
          </div>

          {/* Grid of Doctor Prescribed Medicines */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
            {medicines
              .filter(m => m.is_doctor_prescribed || m.doctor_name || m.doctor_notes || m.precautions)
              .map((med) => {
                const mealInfo = getMealTimingDisplay(med.meal_timing);
                return (
                  <div
                    key={med.medicine_id}
                    className="bg-slate-850/90 hover:bg-slate-800/90 rounded-2xl p-5 border border-teal-500/30 space-y-3.5 transition-all shadow-md"
                  >
                    {/* Top Row: Name, Dosage, Doctor badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-extrabold text-white">{med.name}</h4>
                          <span className="text-[10px] uppercase font-bold bg-teal-900/60 text-teal-300 border border-teal-700/60 px-2 py-0.5 rounded-md">
                            {med.form}
                          </span>
                        </div>
                        <p className="text-xs text-teal-300 font-semibold mt-0.5">
                          Dosage: <strong className="text-white font-bold">{med.dosage}</strong>
                        </p>
                      </div>

                      {med.doctor_name && (
                        <div className="text-right flex-shrink-0">
                          <span className="text-[10px] text-slate-400 block font-medium">Prescribed by</span>
                          <span className="text-xs font-bold text-teal-300 flex items-center gap-1 justify-end">
                            <Stethoscope className="h-3 w-3" />
                            {med.doctor_name}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Meal / Food Directive Pill */}
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/80 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="text-base flex-shrink-0">{mealInfo.icon}</span>
                        <div className="truncate">
                          <span className="font-bold text-white block text-[11px] leading-tight">{mealInfo.label}</span>
                          <span className="text-[10px] text-slate-400 block leading-tight truncate">{mealInfo.desc}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-teal-400 bg-teal-950/80 px-2 py-0.5 rounded-md border border-teal-800/80 flex-shrink-0">
                        Food Rule
                      </span>
                    </div>

                    {/* Schedule Timing Slots */}
                    <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-teal-400" />
                          <span>Dose Schedule:</span>
                        </span>
                        <span className="text-teal-300">{med.schedules.length} dose{med.schedules.length > 1 ? 's' : ''}/day</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {med.schedules.map((sch, sIdx) => (
                          <div
                            key={sIdx}
                            className="bg-slate-800 text-slate-200 border border-teal-500/30 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5"
                          >
                            <span className="text-teal-400">⏰ {sch.time}</span>
                            {sch.label && <span className="text-slate-400 font-normal">({sch.label})</span>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Doctor's Specific Instructions */}
                    <div className="bg-teal-950/40 p-3 rounded-xl border border-teal-500/20 text-xs space-y-1">
                      <p className="font-bold text-teal-300 flex items-center gap-1.5 text-[11px]">
                        <FileText className="h-3.5 w-3.5 text-teal-400" />
                        <span>Doctor's Instructions:</span>
                      </p>
                      <p className="text-slate-200 font-medium italic text-[11px] leading-relaxed">
                        "{med.instructions || med.doctor_notes || 'Take on exact scheduled time with warm water.'}"
                      </p>
                    </div>

                    {/* Precautions & Warnings */}
                    {med.precautions && (
                      <div className="bg-amber-950/40 p-2.5 rounded-xl border border-amber-500/30 text-xs space-y-0.5">
                        <p className="font-bold text-amber-300 flex items-center gap-1 text-[11px]">
                          <AlertTriangle className="h-3 w-3 text-amber-400" />
                          <span>Important Precautions & Diet:</span>
                        </p>
                        <p className="text-amber-200/90 text-[11px] leading-tight">
                          {med.precautions}
                        </p>
                      </div>
                    )}

                    {/* Quick Interactive Actions */}
                    <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSelectedMedicineForDoseLog(med)}
                        className="px-3 py-1.5 bg-teal-950/80 hover:bg-teal-900 text-teal-300 text-[11px] font-bold rounded-xl border border-teal-500/40 transition flex items-center gap-1.5 shadow-sm"
                        title="View 7-day granular log of specific doses for this medicine"
                      >
                        <Calendar className="h-3.5 w-3.5 text-teal-400" />
                        <span>7-Day Dose Log</span>
                      </button>

                      <div className="flex items-center gap-2 ml-auto">
                        {onSpeakReminder && (
                          <button
                            type="button"
                            onClick={() => {
                              if (isSpeaking && onStopSpeech) {
                                onStopSpeech();
                              } else {
                                onSpeakReminder(med);
                              }
                            }}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-teal-300 text-[11px] font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                          >
                            <Volume2 className="h-3.5 w-3.5" />
                            <span>Speak</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onLogDose(med.medicine_id, 'TAKEN')}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-xl shadow transition flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Confirm Taken</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Main Section: Alarm Card & ML Prediction */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Medication Reminder Card (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border-2 border-teal-600/30 dark:border-teal-500/30 p-6 shadow-md relative overflow-hidden transition-colors">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4 mb-4 gap-2 flex-wrap">
            <div className="flex items-center space-x-2">
              <div className="bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 p-2 rounded-xl animate-bounce">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Next Scheduled Medication</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Live dose confirmation & intelligent snooze</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onOpenSoundPicker && (
                <button
                  id="dashboard-chime-picker-btn"
                  type="button"
                  onClick={onOpenSoundPicker}
                  className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-700 rounded-full text-teal-800 dark:text-teal-300 text-xs font-bold flex items-center gap-1.5 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition shadow-xs cursor-pointer"
                  title="Customize medication reminder alert chime sound"
                >
                  <Bell className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                  <span>Chime: {ALERT_SOUNDS.find(s => s.id === alertSound)?.name || 'Chime'}</span>
                </button>
              )}
              <span className="text-xs font-mono font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 px-3 py-1 rounded-full border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Due Now
              </span>
            </div>
          </div>

          {nextMedicine ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{nextMedicine.name}</h3>
                    <span className="text-xs bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 font-bold px-2.5 py-0.5 rounded-full">
                      {nextMedicine.form}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-600 text-white shadow-xs">
                      <Bell className="h-3 w-3" />
                      {(nextMedicine.schedules && nextMedicine.schedules.length > 0 ? nextMedicine.schedules.length : 1)} {(nextMedicine.schedules && nextMedicine.schedules.length > 0 ? nextMedicine.schedules.length : 1) === 1 ? 'Dose' : 'Doses'} Due Today
                    </span>
                    {nextMedicine.doctor_name && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        <Stethoscope className="h-3 w-3" /> Prescribed by {nextMedicine.doctor_name}
                      </span>
                    )}
                  </div>

                  {/* Meal Timing Badge */}
                  {nextMedicine.meal_timing && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                      <span>{getMealTimingDisplay(nextMedicine.meal_timing).icon}</span>
                      <span>{getMealTimingDisplay(nextMedicine.meal_timing).label}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                        ({getMealTimingDisplay(nextMedicine.meal_timing).desc})
                      </span>
                    </div>
                  )}

                  <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                    Dose: <span className="font-bold text-slate-900 dark:text-white">{nextMedicine.dosage}</span> | Time: <span className="font-bold text-teal-700 dark:text-teal-400">{nextMedicine.schedules[0]?.time || '08:00 AM'}</span>
                  </p>

                  <p className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 italic">
                    <strong>Doctor's Advice:</strong> "{nextMedicine.instructions}"
                  </p>

                  {nextMedicine.precautions && (
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800">
                      ⚠️ <strong>Precaution:</strong> {nextMedicine.precautions}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
                  {onSpeakReminder && (
                    <button
                      onClick={() => {
                        if (isSpeaking && onStopSpeech) {
                          onStopSpeech();
                        } else {
                          onSpeakReminder(nextMedicine);
                        }
                      }}
                      className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-2 rounded-lg transition border shadow-sm ${
                        isSpeaking
                          ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 animate-pulse hover:bg-rose-100 dark:hover:bg-rose-900/60'
                          : 'bg-teal-50 dark:bg-teal-950/60 border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60'
                      }`}
                      title={isSpeaking ? 'Stop speaking announcement' : 'Read medication reminder aloud using Speech Synthesis'}
                    >
                      {isSpeaking ? (
                        <>
                          <Square className="h-4 w-4 fill-rose-600 text-rose-600 dark:fill-rose-400 dark:text-rose-400" />
                          <span>Stop Voice</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-4 w-4 text-teal-700 dark:text-teal-400" />
                          <span>Announce Dose</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedMedicineForDoseLog(nextMedicine)}
                    className="flex items-center space-x-1.5 text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 hover:bg-teal-100 dark:hover:bg-teal-900/60 px-3 py-2 rounded-lg transition shadow-xs"
                    title="Open 7-day granular log of specific doses for this medicine"
                  >
                    <Calendar className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                    <span>7-Day Log</span>
                  </button>

                  <button
                    onClick={() => onShowQR(nextMedicine)}
                    className="flex items-center space-x-1 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 px-3 py-2 rounded-lg transition"
                  >
                    <QrCode className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    <span>Show QR</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons: Taken, Skip, Snooze, Taken Late */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <button
                  onClick={() => onLogDose(nextMedicine.medicine_id, 'TAKEN')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition flex flex-col items-center justify-center space-y-1 transform active:scale-95"
                >
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-xs">TAKEN</span>
                </button>

                <button
                  onClick={() => setSkipReasonModal(nextMedicine.medicine_id)}
                  className="bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 font-bold py-3 px-4 rounded-xl transition flex flex-col items-center justify-center space-y-1 transform active:scale-95"
                >
                  <XCircle className="h-5 w-5" />
                  <span className="text-xs">SKIP DOSE</span>
                </button>

                {/* Snooze Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setSnoozeOpen(snoozeOpen === nextMedicine.medicine_id ? null : nextMedicine.medicine_id)}
                    className="w-full h-full bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-700/60 font-bold py-3 px-4 rounded-xl transition flex flex-col items-center justify-center space-y-1"
                  >
                    <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs">SNOOZE ▾</span>
                  </button>

                  {snoozeOpen === nextMedicine.medicine_id && (
                    <div className="absolute left-0 right-0 bottom-full mb-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-2 z-20 space-y-1">
                      {[5, 10, 15, 30].map(mins => (
                        <button
                          key={mins}
                          onClick={() => {
                            setSnoozeOpen(null);
                            alert(`Snoozed for ${mins} minutes. System will remind you again.`);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:text-amber-900 dark:hover:text-amber-200 rounded-lg transition"
                        >
                          Snooze {mins} minutes
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onLogDose(nextMedicine.medicine_id, 'TAKEN_LATE')}
                  className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold py-3 px-4 rounded-xl transition flex flex-col items-center justify-center space-y-1"
                >
                  <Clock className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                  <span className="text-xs">TAKEN LATE</span>
                </button>
              </div>

              {/* Stock status indicator */}
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                <span>Remaining Inventory: <strong className="text-slate-900 dark:text-white">{nextMedicine.remaining_quantity} tablets</strong></span>
                <span>Refill Threshold: <strong className="text-slate-800 dark:text-slate-200">{nextMedicine.refill_threshold} tablets</strong></span>
              </div>
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-sm py-8 text-center">No active medicines added yet. Add a medicine to start tracking reminders.</p>
          )}

          {/* Skip Reason Modal */}
          {skipReasonModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        Log Missed / Skip Reason
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Select a reason or enter custom notes for adherence distribution analytics
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSkipReasonModal(null);
                      setCustomSkipReasonText('');
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { text: 'Forgot dose / Distracted', icon: '🧠', category: 'Forgot' },
                    { text: 'Nausea / Stomach discomfort', icon: '🤢', category: 'Nausea' },
                    { text: 'Empty supply / Awaiting refill', icon: '📦', category: 'Empty Supply' },
                    { text: 'Out of home / Left pills behind', icon: '📍', category: 'Travel' },
                    { text: 'Feeling unwell / Slept through', icon: '🌙', category: 'Slept' },
                    { text: 'Busy / In meeting / Conflict', icon: '💼', category: 'Schedule' }
                  ].map((r) => (
                    <button
                      key={r.text}
                      onClick={() => {
                        onLogDose(skipReasonModal, 'SKIPPED', undefined, r.text);
                        setSkipReasonModal(null);
                        setCustomSkipReasonText('');
                      }}
                      className="text-left p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold text-slate-800 dark:text-slate-200 transition group flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <span>{r.icon}</span>
                        <span>{r.text}</span>
                      </span>
                    </button>
                  ))}
                </div>

                {/* Custom Reason Input */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Or Enter Other Specific Explanation:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customSkipReasonText}
                      onChange={(e) => setCustomSkipReasonText(e.target.value)}
                      placeholder="e.g. Doctor paused intake for blood test..."
                      className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-rose-500"
                    />
                    <button
                      type="button"
                      disabled={!customSkipReasonText.trim()}
                      onClick={() => {
                        if (customSkipReasonText.trim()) {
                          onLogDose(skipReasonModal, 'SKIPPED', undefined, customSkipReasonText.trim());
                          setSkipReasonModal(null);
                          setCustomSkipReasonText('');
                        }
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
                    >
                      Submit
                    </button>
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => {
                      setSkipReasonModal(null);
                      setCustomSkipReasonText('');
                    }}
                    className="px-4 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ML Missed-Dose Risk Prediction Card (1 Col) */}
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Brain className="h-5 w-5 text-teal-400" />
                <h3 className="text-base font-bold">ML Missed-Dose Risk</h3>
              </div>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-teal-900/60 text-teal-300 border border-teal-700">
                Active Analytics
              </span>
            </div>

            {mlPrediction ? (
              <div className="space-y-3">
                <div className="bg-slate-800/80 p-4 rounded-xl border border-slate-700/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Predicted Miss Probability:</span>
                    <span className={`text-xl font-extrabold ${
                      mlPrediction.risk_score >= 65 ? 'text-rose-400' : mlPrediction.risk_score >= 35 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {mlPrediction.risk_score}% ({mlPrediction.risk_level})
                    </span>
                  </div>

                  {/* Meter bar */}
                  <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full transition-all duration-500 ${
                        mlPrediction.risk_score >= 65 ? 'bg-rose-500' : mlPrediction.risk_score >= 35 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${mlPrediction.risk_score}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-300">Preventative System Recommendations:</p>
                  {mlPrediction.recommendations.map((rec, i) => (
                    <div key={i} className="text-xs text-slate-300 bg-slate-800/50 p-2 rounded-lg border border-slate-700/50 flex items-start gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-teal-400 flex-shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Calculating risk model based on historical adherence logs...</p>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
            Real-time compliance analytics based on patient dose history.
          </div>
        </div>
      </div>

      {/* Medications & Prescription Refill Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Pill className="h-5 w-5 text-teal-600 dark:text-teal-400" /> Active Medications & Refill Management
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live stock levels, daily intake schedules, and instant caregiver refill requests for <strong className="text-slate-800 dark:text-slate-200">{activePatient.name}</strong>.
            </p>
          </div>

          <button
            onClick={onNavigateToStock}
            className="text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-700 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 self-start sm:self-center"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Manage All Stock</span>
          </button>
        </div>

        {/* Search Input Field Above Medicine Table */}
        {medicines.length > 0 && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search medications by name (e.g. Metformin, Lisinopril, Atorvastatin)..."
                className="w-full bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 pl-9 pr-9 py-2 rounded-lg border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition shadow-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  title="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 px-1">
              {searchTerm ? (
                <span className="inline-flex items-center gap-1 bg-teal-50 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-700 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
                  <span>Found {filteredMedicines.length} of {medicines.length}</span>
                </span>
              ) : (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Total: <strong className="text-slate-800 dark:text-slate-200">{medicines.length}</strong> medication{medicines.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>
        )}

        {medicines.length > 0 ? (
          filteredMedicines.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold bg-slate-50/70 dark:bg-slate-900/40">
                    <th className="py-3 px-4 rounded-l-lg">Medication</th>
                    <th className="py-3 px-4">Dosage & Schedule</th>
                    <th className="py-3 px-4">Remaining Supply</th>
                    <th className="py-3 px-4">Stock Status</th>
                    <th className="py-3 px-4 text-right rounded-r-lg">Refill Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {filteredMedicines.map((med) => {
                    const percentage = Math.min(100, Math.round((med.remaining_quantity / med.total_quantity) * 100));
                    const isLow = med.needs_refill || med.remaining_quantity <= med.refill_threshold;
                    const isRefillRequested = med.refill_requested || med.refill_status === 'REFILL_REQUESTED';

                    return (
                      <tr
                        key={med.medicine_id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition-colors ${
                          isLow ? 'bg-amber-50/30 dark:bg-amber-950/20' : ''
                        }`}
                      >
                        {/* Name & Form */}
                        <td 
                          className="py-3.5 px-4 cursor-pointer group"
                          onClick={() => setSelectedMedicineForDoseLog(med)}
                          title="Click to view 7-day granular dose log for this medication"
                        >
                          <div className="flex items-start space-x-2.5">
                            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 mt-0.5 group-hover:bg-teal-100 dark:group-hover:bg-teal-800 transition">
                              <Pill className="h-4 w-4" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-teal-700 dark:group-hover:text-teal-300 transition flex items-center gap-1">
                                  <span>{med.name}</span>
                                  <span className="text-[10px] text-teal-700 dark:text-teal-400 opacity-0 group-hover:opacity-100 transition font-bold bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.2 rounded border border-teal-300 dark:border-teal-700">
                                    📊 View 7-Day Log ↗
                                  </span>
                                </p>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="inline-block text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                  {med.form}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700">
                                  <Bell className="h-2.5 w-2.5 text-teal-600 dark:text-teal-400" />
                                  {(med.schedules && med.schedules.length > 0 ? med.schedules.length : 1)} {(med.schedules && med.schedules.length > 0 ? med.schedules.length : 1) === 1 ? 'Dose' : 'Doses'} Today
                                </span>
                                {med.meal_timing && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                                    <span>{getMealTimingDisplay(med.meal_timing).icon}</span>
                                    <span>{getMealTimingDisplay(med.meal_timing).label}</span>
                                  </span>
                                )}
                              </div>
                              {med.doctor_name && (
                                <p className="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold flex items-center gap-1">
                                  <Stethoscope className="h-3 w-3" /> Prescribed by {med.doctor_name}
                                </p>
                              )}
                              {med.instructions && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-1">
                                  "{med.instructions}"
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Dosage & Schedule */}
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                          <p className="font-semibold text-slate-900 dark:text-white">{med.dosage}</p>
                          <div className="space-y-0.5 mt-0.5">
                            {med.schedules && med.schedules.length > 0 ? (
                              med.schedules.map((s, idx) => (
                                <span key={idx} className="inline-block mr-1 text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-teal-700 dark:text-teal-300">
                                  {s.time} {s.label ? `(${s.label})` : ''}
                                </span>
                              ))
                            ) : (
                              <p className="text-slate-500 dark:text-slate-400 text-[11px] flex items-center gap-1">
                                <Clock className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                                08:00 AM (Daily)
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Stock & Progress */}
                        <td className="py-3.5 px-4">
                          <div className="w-36 space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className={isLow ? 'text-amber-700 dark:text-amber-400 font-extrabold' : 'text-slate-800 dark:text-slate-200'}>
                                {med.remaining_quantity} / {med.total_quantity}
                              </span>
                              <span className="text-slate-500 dark:text-slate-400 text-[10px]">{percentage}%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isLow ? 'bg-amber-500' : 'bg-teal-600'
                                }`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400">
                              ~{med.days_remaining || Math.round(med.remaining_quantity / (med.schedules.length || 1))} days remaining
                            </p>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {isRefillRequested ? (
                            <span className="inline-flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700 px-2.5 py-1 rounded-full text-[11px] font-bold animate-pulse shadow-sm">
                              <Send className="h-3 w-3 text-blue-600 dark:text-blue-400" /> Refill Dispatched
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 px-2.5 py-1 rounded-full text-[11px] font-extrabold shadow-sm">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" /> Low Stock ({med.remaining_quantity})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 px-2.5 py-1 rounded-full text-[11px] font-bold">
                              <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Healthy Stock
                            </span>
                          )}
                        </td>

                        {/* Actions: Request Refill Button */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedMedicineForDoseLog(med)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/60 shadow-xs"
                              title="View 7-day granular log of specific doses for this medicine"
                            >
                              <Calendar className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                              <span>7-Day Log</span>
                            </button>

                            <button
                              onClick={() => handleOpenRefillModal(med)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow-sm ${
                                isRefillRequested
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : isLow
                                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md transform active:scale-95'
                                  : 'bg-slate-900 dark:bg-slate-700 hover:bg-teal-700 dark:hover:bg-teal-600 text-white hover:shadow'
                              }`}
                              title="Request prescription refill & notify caregiver"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>{isRefillRequested ? 'Re-send Refill' : 'Request Refill'}</span>
                            </button>

                            <button
                              onClick={() => onShowQR(med)}
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 transition"
                              title="View QR Code"
                            >
                              <QrCode className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400 space-y-3 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
              <Search className="h-7 w-7 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">No medications match "{searchTerm}"</p>
              <p className="text-slate-400 max-w-sm mx-auto">
                Check the medication name spelling or clear your search query to see all prescribed medicines.
              </p>
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 font-bold px-3 py-1.5 rounded-lg transition text-xs shadow-sm"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear Search Filter</span>
              </button>
            </div>
          )
        ) : (
          <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
            <Pill className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-700 dark:text-slate-200">No active medications prescribed yet</p>
            <p className="text-slate-400 max-w-sm mx-auto">
              Add your first prescription or medication schedule to track remaining stock levels and trigger automated caregiver refill notices.
            </p>
            <button
              onClick={onNavigateToStock}
              className="mt-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow"
            >
              Add Medication Now
            </button>
          </div>
        )}
      </div>

      {/* Refill Request Modal */}
      {refillModalMed && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 rounded-xl">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Request Medication Refill</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Updates stock tracking & dispatches caregiver alert</p>
                </div>
              </div>
              <button
                onClick={() => setRefillModalMed(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg text-xs"
              >
                ✕
              </button>
            </div>

            {/* Target Med Info Box */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-white text-sm">{refillModalMed.name}</span>
                <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 font-semibold text-[10px]">
                  {refillModalMed.form}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300">
                Dosage: <strong className="text-slate-800 dark:text-slate-200">{refillModalMed.dosage}</strong> | Current Remaining Stock: <strong className={refillModalMed.needs_refill ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-900 dark:text-white'}>{refillModalMed.remaining_quantity} units</strong>
              </p>
            </div>

            <form onSubmit={handleConfirmRefill} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Quantity to Request (Units)</label>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {[30, 60, 90].map((qty) => (
                    <button
                      type="button"
                      key={qty}
                      onClick={() => setRefillQuantity(String(qty))}
                      className={`py-2 text-center rounded-lg border font-bold transition ${
                        refillQuantity === String(qty)
                          ? 'bg-teal-600 text-white border-teal-600 shadow'
                          : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                      }`}
                    >
                      {qty} Units
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={refillQuantity}
                  onChange={(e) => setRefillQuantity(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-teal-500 focus:outline-none"
                  placeholder="Custom quantity"
                  required
                />
              </div>

              <div className="flex items-center space-x-2 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-800/60">
                <input
                  type="checkbox"
                  id="urgentRefill"
                  checked={refillUrgent}
                  onChange={(e) => setRefillUrgent(e.target.checked)}
                  className="h-4 w-4 text-amber-600 rounded border-slate-300 dark:border-slate-600 focus:ring-amber-500"
                />
                <label htmlFor="urgentRefill" className="font-bold text-amber-900 dark:text-amber-300 text-xs cursor-pointer">
                  Mark as Urgent Refill (Supply Critically Low)
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Notes for Caregiver / Pharmacy (Optional)</label>
                <input
                  type="text"
                  value={refillNotes}
                  onChange={(e) => setRefillNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 text-xs text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-teal-500 focus:outline-none"
                  placeholder="e.g. Please pick up at CVS before Friday"
                />
              </div>

              {/* Caregiver Escalation Target Preview */}
              <div className="bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl p-3 text-[11px] text-teal-900 dark:text-teal-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-teal-950 dark:text-teal-100">
                  <ShieldCheck className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span>Simulated Notification Dispatch Target:</span>
                </div>
                <p className="text-teal-800 dark:text-teal-300 pl-5">
                  • <strong>Caregiver:</strong> {assignedCaregiver?.name || 'Primary Caregiver'} ({assignedCaregiver?.relation || 'Emergency Contact'})
                </p>
                <p className="text-teal-800 dark:text-teal-300 pl-5 flex items-center gap-2">
                  <span>• <strong>SMS:</strong> {assignedCaregiver?.phone || '+1 (555) 019-4821'}</span>
                  <span>• <strong>Email:</strong> {assignedCaregiver?.email || 'caregiver@medicare.org'}</span>
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setRefillModalMed(null)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRefill}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSubmittingRefill ? (
                    <span>Dispatching...</span>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Send Refill Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Medical Safety Disclaimer Banner */}
      <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl p-4 flex items-start space-x-3 text-blue-900 dark:text-blue-200 shadow-sm transition-colors">
        <ShieldAlert className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <strong className="font-bold">Medical Safety & Responsibility Notice:</strong> MediCare+ is designed strictly as a medication management, schedule tracking, and reminder application. It does not provide medical advice, diagnosis, or treatment instructions. For missed-dose guidance or dosage adjustments, always consult your prescribing physician, pharmacist, or official prescription documentation.
        </div>
      </div>

      {/* 30-Day Daily Adherence Line Chart (D3.js) */}
      <AdherenceLineChart
        patientId={activePatient.patient_id}
        patientName={activePatient.name}
        doseRecords={doseRecords}
      />

      {/* 7-Day ML Risk Forecast: Risk Probability Curve (D3.js) */}
      <MLRiskForecastChart
        patientId={activePatient.patient_id}
        patientName={activePatient.name}
        doseRecords={doseRecords}
        medicines={medicines}
      />

      {/* Missed Dose Reasons Distribution Pie Chart (D3.js) */}
      <MissedDoseReasonPieChart
        doseRecords={doseRecords}
        patientId={activePatient.patient_id}
        patientName={activePatient.name}
        onFilterByReason={() => {
          setDoseLogFilter('MISSED');
          const element = document.getElementById('recent-dose-compliance-logs');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      />

      {/* Common Missed-Dose Hours Bar Chart (D3.js) */}
      <MissedDoseHoursBarChart
        doseRecords={doseRecords}
        patientId={activePatient.patient_id}
        patientName={activePatient.name}
        onFilterByHour={(hour) => {
          setDoseLogHourFilter(hour);
          setDoseLogFilter('MISSED');
          const element = document.getElementById('recent-dose-compliance-logs');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      />

      {/* Weekly Adherence Chart & Log History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Adherence Visualizer */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-teal-600 dark:text-teal-400" /> Weekly Adherence Breakdown
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Current Week</span>
          </div>

          {totalWeeklyDoses > 0 ? (
            <div className="space-y-3">
              {weeklyDays.map((d) => (
                <div key={d.day} className="flex items-center space-x-3 text-xs">
                  <span className="w-8 font-bold text-slate-700 dark:text-slate-300">{d.day}</span>
                  <div className="flex-1 bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        d.scheduled === 0 ? 'bg-slate-200 dark:bg-slate-600' :
                        d.score >= 90 ? 'bg-emerald-500' : d.score >= 75 ? 'bg-teal-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${d.scheduled === 0 ? 0 : d.score}%` }}
                    ></div>
                  </div>
                  <span className="w-12 text-right font-bold text-slate-900 dark:text-white">
                    {d.scheduled === 0 ? '-' : `${d.score}%`}
                  </span>
                  <span className="w-20 text-right text-slate-500 dark:text-slate-400">
                    {d.taken}/{d.scheduled} taken
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <TrendingUp className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-700 dark:text-slate-200">No dose adherence data this week yet</p>
              <p className="text-slate-400 max-w-xs mx-auto">
                Mark your doses as TAKEN or SKIPPED as you take them, and your live compliance charts will populate here automatically.
              </p>
            </div>
          )}
        </div>

        {/* Dose Record Log Timeline */}
        <div id="recent-dose-compliance-logs" className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 transition-colors">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-teal-600 dark:text-teal-400" /> Recent 'Dose Taken' vs 'Dose Missed' Compliance Logs
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Audit trail of verified doses, skipped intakes, and recorded non-compliance reasons
              </p>
            </div>

            {/* Search Input Bar & Filter Controls */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 flex-wrap">
              {/* Enhanced CSV Export Controls Group */}
              <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 p-1 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs">
                {/* 1-Click Direct Download for Currently Selected Visible Range */}
                <a
                  id="direct-csv-export-btn"
                  href={`/export-dose-history-csv/${activePatient.patient_id}?days=${doseLogRange === 'ALL' ? 'all' : doseLogRange}&status=${doseLogFilter}&impact=${complianceImpactFilter}${doseLogSearch ? `&q=${encodeURIComponent(doseLogSearch)}` : ''}`}
                  download
                  className="inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg transition shadow-xs hover:shadow active:scale-95 whitespace-nowrap"
                  title={`Download CSV export of ${doseLogRange === 'ALL' ? 'all historical' : `last ${doseLogRange} days`} dose records`}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>
                    Export CSV{' '}
                    <span className="opacity-85 font-mono text-[11px]">
                      ({doseLogRange === 'ALL' ? 'All' : `${doseLogRange}d`})
                    </span>
                  </span>
                </a>

                {/* Open Full Date Range CSV Export Options Modal */}
                <button
                  type="button"
                  id="open-csv-options-modal-btn"
                  onClick={() => setIsCsvModalOpen(true)}
                  className="p-1.5 rounded-lg text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition"
                  title="Configure export range (7, 14, 30 days or All Time) and filter options"
                >
                  <CalendarRange className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Print Hard Copy Audit Trail Button */}
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 bg-slate-900 dark:bg-slate-700 hover:bg-teal-700 dark:hover:bg-teal-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition shadow-sm hover:shadow active:scale-95 whitespace-nowrap"
                title="Open print-friendly view mode and generate official hard-copy audit trail"
              >
                <Printer className="h-3.5 w-3.5 text-teal-300" />
                <span>Print Audit Trail</span>
              </button>

              {/* Text Input Search Bar */}
              <div className="relative min-w-[160px] flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={doseLogSearch}
                  onChange={(e) => setDoseLogSearch(e.target.value)}
                  placeholder="Search medication..."
                  className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-7 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-teal-500 focus:bg-white dark:focus:bg-slate-900 transition"
                />
                {doseLogSearch && (
                  <button
                    onClick={() => setDoseLogSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 text-xs"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Date Range Filter Chips */}
              <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl text-xs font-semibold">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold px-1.5 hidden sm:inline flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" /> Range:
                </span>
                <button
                  id="filter-range-all"
                  onClick={() => setDoseLogRange('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                    doseLogRange === 'ALL'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="View complete all-time history"
                >
                  All ({rangeCounts.all})
                </button>
                <button
                  id="filter-range-30d"
                  onClick={() => setDoseLogRange('30')}
                  className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                    doseLogRange === '30'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Filter to past 30 days only"
                >
                  30d ({rangeCounts.thirty})
                </button>
                <button
                  id="filter-range-14d"
                  onClick={() => setDoseLogRange('14')}
                  className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                    doseLogRange === '14'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Filter to past 14 days only"
                >
                  14d ({rangeCounts.fourteen})
                </button>
                <button
                  id="filter-range-7d"
                  onClick={() => setDoseLogRange('7')}
                  className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                    doseLogRange === '7'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Filter to past 7 days only"
                >
                  7d ({rangeCounts.seven})
                </button>
              </div>

              {/* Status Filter Chips */}
              <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl text-xs font-semibold">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold px-1.5 hidden md:inline">Status:</span>
                <button
                  onClick={() => setDoseLogFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                    doseLogFilter === 'ALL'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All ({doseRecords.length})
                </button>
                <button
                  onClick={() => setDoseLogFilter('TAKEN')}
                  className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                    doseLogFilter === 'TAKEN'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Taken ({doseRecords.filter(r => r.status === 'TAKEN' || r.status === 'TAKEN_LATE').length})
                </button>
                <button
                  onClick={() => setDoseLogFilter('MISSED')}
                  className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                    doseLogFilter === 'MISSED'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Missed ({doseRecords.filter(r => r.status === 'MISSED' || r.status === 'SKIPPED').length})
                </button>
              </div>

              {/* Compliance Impact Filter Chips */}
              <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl text-xs font-semibold">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold px-1.5 hidden md:inline">Impact:</span>
                <button
                  onClick={() => setComplianceImpactFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                    complianceImpactFilter === 'ALL'
                      ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setComplianceImpactFilter('POSITIVE')}
                  className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                    complianceImpactFilter === 'POSITIVE'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Doses verified on schedule with positive compliance impact"
                >
                  + Adherent
                </button>
                <button
                  onClick={() => setComplianceImpactFilter('HIGH_IMPACT')}
                  className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                    complianceImpactFilter === 'HIGH_IMPACT'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Missed or omitted doses causing non-adherence risk"
                >
                  - Missed
                </button>
                <button
                  onClick={() => setComplianceImpactFilter('DELAYED')}
                  className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                    complianceImpactFilter === 'DELAYED'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Late doses recorded with delayed compliance impact"
                >
                  ~ Late
                </button>
              </div>

              {/* Active Hour Filter Chip if set */}
              {doseLogHourFilter !== null && (
                <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 px-2.5 py-1 rounded-xl text-xs font-bold">
                  <Clock className="w-3 h-3" />
                  <span>Hour: {doseLogHourFilter === 0 ? '12 AM' : doseLogHourFilter < 12 ? `${doseLogHourFilter} AM` : doseLogHourFilter === 12 ? '12 PM' : `${doseLogHourFilter - 12} PM`}</span>
                  <button
                    onClick={() => setDoseLogHourFilter(null)}
                    className="ml-1 hover:text-rose-900 dark:hover:text-white"
                    title="Clear hour filter"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          {filteredDoseRecords.length > 0 ? (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {filteredDoseRecords.map((r, idx) => (
                <div
                  key={`${doseLogFilter}-${complianceImpactFilter}-${r.dose_id || idx}`}
                  className="animate-row-fade table-row-transition p-3 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100/80 dark:hover:bg-slate-900/80 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs transition-all duration-300"
                >
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{r.medicine_name}</span>
                      <span className="font-normal text-slate-500 dark:text-slate-400 text-[11px] bg-slate-200/60 dark:bg-slate-700 px-1.5 py-0.5 rounded">{r.dosage}</span>
                    </p>
                    <p className="text-slate-500 dark:text-slate-400">
                      Scheduled: <span className="font-semibold text-slate-700 dark:text-slate-200">{new Date(r.scheduled_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {r.actual_datetime && (
                        <span className="text-emerald-700 dark:text-emerald-400 ml-2">
                          • Taken at: {new Date(r.actual_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {r.missed_reason && (
                        <span className="text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 border border-rose-200/60 dark:border-rose-800/60 px-1.5 py-0.5 rounded text-[11px] ml-2 font-medium inline-block">
                          Reason: "{r.missed_reason}"
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] border ${
                      r.status === 'TAKEN' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' :
                      r.status === 'TAKEN_LATE' ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' :
                      r.status === 'SKIPPED' ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600' : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    }`}>
                      {r.status === 'TAKEN' ? '✓ TAKEN' :
                       r.status === 'TAKEN_LATE' ? '⏰ TAKEN LATE' :
                       r.status === 'SKIPPED' ? '⊖ SKIPPED' : '✕ MISSED'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : doseRecords.length > 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2 animate-row-fade">
              <Search className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="font-bold text-slate-800 dark:text-slate-200">No medication logs match current filter criteria</p>
              <p className="text-slate-400 max-w-xs mx-auto">
                Try searching for a different medication name or reset filter tabs to view all logs.
              </p>
              <button
                onClick={() => {
                  setDoseLogSearch('');
                  setDoseLogFilter('ALL');
                  setComplianceImpactFilter('ALL');
                }}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-teal-700 dark:text-teal-300 font-bold rounded-lg text-xs transition inline-flex items-center gap-1.5"
              >
                Reset Search & Filters
              </button>
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2 animate-row-fade">
              <Clock className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="font-semibold text-slate-700 dark:text-slate-200">No medication logs recorded yet</p>
              <p className="text-slate-400 max-w-xs mx-auto">
                Once you record dose confirmations from the reminder panel above, your medication audit history will be tracked here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* E-Commerce Smart Pharmacy & Refill Shop Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950/80 border border-teal-800/40 rounded-2xl p-6 text-white shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-teal-500/20 text-teal-400 rounded-xl">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-white">Smart Pharmacy & Refill Store</h3>
                <span className="bg-teal-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase">
                  Connected Care
                </span>
              </div>
              <p className="text-xs text-slate-400">Order connected smart dispensers or auto-replenish low stock medications</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToStock}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black rounded-xl text-xs transition shadow-md"
            >
              <Package className="h-4 w-4" />
              <span>Manage Refills & Stock</span>
            </button>
          </div>
        </div>

        {/* E-Commerce Products Quick Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-teal-500/40 transition group space-y-3">
            <div className="aspect-16/9 rounded-lg overflow-hidden relative">
              <img 
                src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=400&q=80" 
                alt="Voice Dispenser" 
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <span className="absolute top-2 left-2 bg-teal-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                4.9 ★ (1.4k)
              </span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-teal-300 transition">Smart Voice Dispenser Pro</h4>
              <p className="text-xs text-slate-400 mt-0.5">Cellular sync with spoken dose reminders</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-black text-teal-400">₹2,499</span>
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <Truck className="h-3 w-3" /> Free Express Delivery
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-teal-500/40 transition group space-y-3">
            <div className="aspect-16/9 rounded-lg overflow-hidden relative">
              <img 
                src="https://images.unsplash.com/photo-1471864190281-a93a3070b6de?auto=format&fit=crop&w=400&q=80" 
                alt="7-Day Organizer" 
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <span className="absolute top-2 left-2 bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                4.8 ★ (980)
              </span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-teal-300 transition">7-Day LED RFID Pillbox</h4>
              <p className="text-xs text-slate-400 mt-0.5">Glowing slot alerts & auto-audit logging</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-black text-teal-400">₹899</span>
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <Truck className="h-3 w-3" /> In Stock
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-teal-500/40 transition group space-y-3">
            <div className="aspect-16/9 rounded-lg overflow-hidden relative">
              <img 
                src="https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=400&q=80" 
                alt="Auto Refill Pack" 
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
              />
              <span className="absolute top-2 left-2 bg-cyan-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                Save 35%
              </span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-teal-300 transition">Monthly Auto-Refill Subscription</h4>
              <p className="text-xs text-slate-400 mt-0.5">Automated doorstep delivery with zero gaps</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-black text-teal-400">₹499/mo</span>
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <Truck className="h-3 w-3" /> Free Delivery
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print-Friendly Hard-Copy Compliance Audit Modal */}
      <PrintableComplianceAudit
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        patient={activePatient}
        medicines={medicines}
        doseRecords={doseRecords}
        adherenceStats={adherenceStats}
        mlPrediction={mlPrediction}
        caregivers={caregivers}
      />

      {/* Date-Range Enhanced CSV Export Modal */}
      <CsvExportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        patientId={activePatient.patient_id}
        patientName={activePatient.name}
        currentRange={doseLogRange}
        currentFilter={doseLogFilter}
        currentSearch={doseLogSearch}
        visibleRecordCount={filteredDoseRecords.length}
        totalRecordCount={doseRecords.length}
        doseRecords={doseRecords}
        onSelectRange={(r) => setDoseLogRange(r)}
      />

      {/* 7-Day Granular Medicine Dose Log Modal */}
      <MedicineDoseLogModal
        isOpen={!!selectedMedicineForDoseLog}
        onClose={() => setSelectedMedicineForDoseLog(null)}
        medicine={selectedMedicineForDoseLog}
        activePatient={activePatient}
        doseRecords={doseRecords}
        onLogDose={(medId, status, snooze, reason, customDate) => {
          onLogDose(medId, status, snooze, reason, customDate);
        }}
      />
    </div>
  );
};
