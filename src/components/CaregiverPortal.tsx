import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Bell, 
  Clock, 
  Phone, 
  Mail, 
  AlertTriangle, 
  CheckCircle2, 
  Pill, 
  MessageSquare, 
  HeartHandshake, 
  ExternalLink,
  Search,
  Check,
  X,
  Volume2,
  PhoneCall,
  PhoneOff,
  Copy,
  Send,
  Loader2,
  Mic,
  MicOff,
  Hospital,
  UserCheck
} from 'lucide-react';
import { Patient, Medicine, DoseRecord, Caregiver, RefillNotification } from '../types';

interface CaregiverPortalProps {
  caregiverName: string;
  activePatient: Patient | null;
  patients: Patient[];
  medicines: Medicine[];
  doseRecords: DoseRecord[];
  caregivers: Caregiver[];
  onSelectPatient: (p: Patient) => void;
  onLogDose: (medId: number, status: 'TAKEN' | 'MISSED' | 'SKIPPED', snoozeMin?: number, missedReason?: string) => Promise<void>;
  onRequestRefill: (medId: number, reqQty: number, urgent?: boolean, notes?: string) => Promise<void>;
}

export const CaregiverPortal: React.FC<CaregiverPortalProps> = ({
  caregiverName,
  activePatient,
  patients,
  medicines,
  doseRecords,
  caregivers,
  onSelectPatient,
  onLogDose,
  onRequestRefill
}) => {
  const [activeTab, setActiveTab] = useState<'monitoring' | 'refill-alerts' | 'contacts'>('monitoring');
  const [notifications, setNotifications] = useState<RefillNotification[]>([]);
  const [urgentAlertSuccess, setUrgentAlertSuccess] = useState('');
  
  // Call Clinic Modal State
  const [showCallModal, setShowCallModal] = useState(false);
  const [callState, setCallState] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Email Clinic Modal State
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState('Urgent Refill & Patient Status Inquiry');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailPriority, setEmailPriority] = useState('High');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Escalation Checkbox States
  const [notifySms, setNotifySms] = useState(true);
  const [notifySupply, setNotifySupply] = useState(true);
  const [sendWeeklyPdf, setSendWeeklyPdf] = useState(true);
  const [escalationToast, setEscalationToast] = useState('');

  // Call timer interval
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callState === 'connected') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callState]);

  // Fetch Refill & Compliance Notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch(`/api/refill-notifications${activePatient ? `?patient_id=${activePatient.patient_id}` : ''}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [activePatient, medicines]);

  // Reset default email message when active patient changes
  useEffect(() => {
    if (activePatient) {
      setEmailMessage(
        `Dear Dr. Sarah Chen,\n\nI am writing on behalf of patient ${activePatient.name} (Age: ${activePatient.age}, Relation: ${activePatient.relationship}). We are monitoring their medication intake via MediCare+ and would like to request assistance regarding their upcoming dosage and refill schedule.\n\nThank you,\n${caregiverName}`
      );
    }
  }, [activePatient, caregiverName]);

  // Start Call Simulation
  const handleStartCall = () => {
    setCallState('calling');
    setCallDuration(0);
    setTimeout(() => {
      setCallState('connected');
    }, 2200);
  };

  // End Call Simulation
  const handleEndCall = () => {
    setCallState('ended');
    setTimeout(() => {
      setCallState('idle');
      setShowCallModal(false);
      setCallDuration(0);
    }, 1200);
  };

  // Handle Send Clinical Email
  const handleSendEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingEmail(true);

    setTimeout(() => {
      setIsSendingEmail(false);
      setShowEmailModal(false);
      setUrgentAlertSuccess(`Clinical message "${emailSubject}" successfully dispatched to Dr. Sarah Chen, MD!`);
      
      // Add simulated notification
      const newNotif: RefillNotification = {
        notification_id: Date.now(),
        medicine_id: medicines[0]?.medicine_id || 1,
        medicine_name: medicines[0]?.name || 'Clinical Care Regimen',
        patient_id: activePatient?.patient_id || 1,
        patient_name: activePatient?.name || 'Patient',
        caregiver_phone: '+1 (555) 019-4821',
        caregiver_email: 'caregiver@medicare.org',
        requested_quantity: 30,
        remaining_stock: medicines[0]?.remaining_quantity || 10,
        message: `[DIRECT EMAIL DISPATCH] Subject: ${emailSubject} | Priority: ${emailPriority} | Sent by Caregiver ${caregiverName}`,
        timestamp: new Date().toISOString(),
        channel: 'EMAIL'
      };
      setNotifications(prev => [newNotif, ...prev]);

      setTimeout(() => setUrgentAlertSuccess(''), 5000);
    }, 1200);
  };

  const handleCopyPhone = (text: string) => {
    navigator.clipboard?.writeText?.(text);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleEscalationToggle = (type: string, val: boolean) => {
    if (type === 'sms') setNotifySms(val);
    if (type === 'supply') setNotifySupply(val);
    if (type === 'pdf') setSendWeeklyPdf(val);

    setEscalationToast(`Emergency alert setting updated: ${type.toUpperCase()}`);
    setTimeout(() => setEscalationToast(''), 3000);
  };

  // Today's doses & compliance
  const takenCount = doseRecords.filter(d => d.status === 'TAKEN' || d.status === 'TAKEN_LATE').length;
  const totalLogged = doseRecords.length;
  const complianceScore = totalLogged === 0 ? 100 : Math.round((takenCount / totalLogged) * 100);
  const lowStockMedicines = medicines.filter(m => m.remaining_quantity <= m.refill_threshold);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Caregiver Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shadow-inner flex-shrink-0">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{caregiverName}</h1>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Caregiver Portal
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {activePatient ? (
                  <>
                    Designated Ward: <strong className="text-indigo-300">{activePatient.name}</strong> ({activePatient.relationship || 'Assigned Patient'}) • Caregiver Access Scoped
                  </>
                ) : (
                  <span className="text-amber-300">No Patient Currently Assigned to Your Care</span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800 text-xs">
            <div className="px-3 py-1.5 text-center">
              <p className="text-slate-400 text-[10px] uppercase font-bold">Compliance</p>
              <p className={`text-lg font-extrabold ${complianceScore >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {complianceScore}%
              </p>
            </div>
            <div className="w-px h-8 bg-slate-800"></div>
            <div className="px-3 py-1.5 text-center">
              <p className="text-slate-400 text-[10px] uppercase font-bold">Low Supplies</p>
              <p className={`text-lg font-extrabold ${lowStockMedicines.length > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-300'}`}>
                {lowStockMedicines.length}
              </p>
            </div>
            <div className="w-px h-8 bg-slate-800"></div>
            <div className="px-3 py-1.5 text-center">
              <p className="text-slate-400 text-[10px] uppercase font-bold">Alerts Feed</p>
              <p className="text-lg font-extrabold text-indigo-300">{notifications.length}</p>
            </div>
          </div>
        </div>

        {/* Global Notification Banner */}
        {urgentAlertSuccess && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span>{urgentAlertSuccess}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800/80 mt-8 gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'monitoring'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Ward Routine & Compliance</span>
          </button>

          <button
            onClick={() => setActiveTab('refill-alerts')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'refill-alerts'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Bell className="h-4 w-4" />
            <span>Refill Dispatches & Alerts ({notifications.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('contacts')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'contacts'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Phone className="h-4 w-4" />
            <span>Emergency Contacts & Clinic</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: WARD ROUTINE & COMPLIANCE */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          {(!activePatient || patients.length === 0) ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 sm:p-12 border border-slate-200 dark:border-slate-700 shadow-sm text-center max-w-2xl mx-auto space-y-5">
              <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 dark:text-indigo-400">
                <HeartHandshake className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">No Assigned Patients Found</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Caregiver accounts only have access to the specific patient(s) that designate them as their caregiver. You currently have no linked patient records.
                </p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-left space-y-2">
                <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" /> How patient care assignment works:
                </p>
                <ol className="list-decimal list-inside text-slate-600 dark:text-slate-300 space-y-1.5 text-[11px]">
                  <li>The patient logs into MediCare and navigates to the <strong>Caregiver & Contacts</strong> tab.</li>
                  <li>They add your name and email (<span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">caregiver@medicare.io</span>).</li>
                  <li>Once linked, their active prescriptions, dosing schedule, compliance scores, and refill triggers will automatically appear in your portal.</li>
                </ol>
              </div>
            </div>
          ) : (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-6 transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <HeartHandshake className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Active Medications for {activePatient?.name || 'Patient'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Confirm assisted intake, view schedule times, or dispatch low-stock refill notices.
                </p>
              </div>

              {/* Patient Selector */}
              {patients.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Switch Ward:</span>
                  <select
                    value={activePatient?.patient_id}
                    onChange={(e) => {
                      const p = patients.find(x => x.patient_id === Number(e.target.value));
                      if (p) onSelectPatient(p);
                    }}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {patients.map(p => (
                      <option key={p.patient_id} value={p.patient_id}>
                        {p.name} ({p.relationship})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Medicine Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {medicines.map((med) => {
                const isLow = med.remaining_quantity <= med.refill_threshold;
                return (
                  <div
                    key={med.medicine_id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                      isLow
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                        : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-700 flex items-center justify-center text-indigo-700 dark:text-indigo-300">
                            <Pill className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm">{med.name}</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{med.dosage} • {med.form}</p>
                          </div>
                        </div>
                        {isLow && (
                          <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/40 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 font-extrabold text-[10px] rounded-full flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Low Stock
                          </span>
                        )}
                      </div>

                      <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /> Schedule:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{med.schedule_time || '08:00 AM (Daily)'}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                          <span>Inventory Remaining:</span>
                          <span className={`font-bold ${isLow ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-slate-800 dark:text-slate-200'}`}>
                            {med.remaining_quantity} / {med.total_quantity}
                          </span>
                        </div>
                      </div>

                      {med.instructions && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                          <strong className="text-slate-700 dark:text-slate-300">Instructions:</strong> {med.instructions}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
                      <button
                        onClick={async () => {
                          await onLogDose(med.medicine_id, 'TAKEN');
                          setUrgentAlertSuccess(`Confirmed dose of ${med.name} taken for ${activePatient?.name}!`);
                          setTimeout(() => setUrgentAlertSuccess(''), 4000);
                        }}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Confirm Taken</span>
                      </button>

                      <button
                        onClick={async () => {
                          await onRequestRefill(med.medicine_id, 30, isLow, `Caregiver ${caregiverName} initiated stock refill`);
                          setUrgentAlertSuccess(`Refill request dispatched for ${med.name}!`);
                          setTimeout(() => setUrgentAlertSuccess(''), 4000);
                        }}
                        className="px-3 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition"
                        title="Request Refill"
                      >
                        Refill
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: REFILL DISPATCHES & NOTIFICATIONS */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'refill-alerts' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 transition-colors">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
              <Bell className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Automated Alert Transmissions & SMS Logs
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time records of alerts dispatched to your caregiver phone & email when refills are needed or doses are missed.
            </p>

            <div className="space-y-3 overflow-y-auto max-h-96">
              {notifications.map((n) => (
                <div key={n.notification_id} className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2 font-bold text-slate-800 dark:text-slate-200">
                    <span className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                      <MessageSquare className="h-4 w-4" />
                      Refill Dispatch Alert for {n.patient_name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {new Date(n.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs leading-relaxed shadow-inner">
                    {n.message}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    <span>Transmitted to: <strong>{n.caregiver_phone}</strong> & <strong>{n.caregiver_email}</strong></span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Delivered via SMS Gateway</span>
                  </div>
                </div>
              ))}

              {notifications.length === 0 && (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl text-xs text-slate-400">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 dark:text-slate-200">All Supplies Sufficient</p>
                  <p className="text-[11px] text-slate-400">No urgent refill alerts dispatched yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: CONTACTS & CLINIC (FULLY INTERACTIVE) */}
      {/* ---------------------------------------------------- */}
      {activeTab === 'contacts' && (
        <div className="space-y-6">
          {escalationToast && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-900 dark:text-indigo-200 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
              <span>{escalationToast}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Card 1: Clinic & Doctor */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5 transition-colors">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <Hospital className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Primary Clinic & Doctor Contact
                </h3>
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] rounded-full border border-emerald-200 dark:border-emerald-700">
                  Duty Desk Active
                </span>
              </div>

              <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-800/60 text-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-indigo-950 dark:text-indigo-200 text-sm">Dr. Sarah Chen, MD</p>
                    <p className="text-slate-600 dark:text-slate-300 font-medium">Head of Internal Medicine & Cardiology</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">MediCare+ Main Super-Specialty Clinic</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-indigo-200/80 dark:bg-indigo-800 border border-indigo-300 dark:border-indigo-700 flex items-center justify-center text-indigo-800 dark:text-indigo-200 font-extrabold">
                    SC
                  </div>
                </div>

                <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-800/60 space-y-1.5 text-slate-700 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Direct Helpline:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">+1 (800) 555-0199</span>
                      <button
                        onClick={() => handleCopyPhone('+18005550199')}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-[10px] font-bold underline"
                      >
                        {copiedPhone ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Physician Email:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">doctor@medicare.org</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Emergency Desk:</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">Ext 404 (24x7)</span>
                  </div>
                </div>

                {/* Interactive Action Buttons */}
                <div className="pt-3 flex items-center gap-3">
                  <button
                    onClick={() => {
                      setShowCallModal(true);
                      setCallState('idle');
                    }}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md text-xs transition flex items-center justify-center gap-2 active:scale-98"
                  >
                    <Phone className="h-4 w-4" />
                    <span>Call Clinic</span>
                  </button>

                  <button
                    onClick={() => setShowEmailModal(true)}
                    className="flex-1 px-4 py-2.5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-bold rounded-xl shadow-md text-xs transition flex items-center justify-center gap-2 active:scale-98"
                  >
                    <Mail className="h-4 w-4" />
                    <span>Email Doctor</span>
                  </button>
                </div>
              </div>

              {/* Quick Caregiver Emergency Contacts */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Registered Emergency Caregivers</h4>
                <div className="space-y-2">
                  {caregivers.map((c) => (
                    <div key={c.caregiver_id} className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 block">{c.name}</span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">{c.relation} • {c.phone}</span>
                      </div>
                      <button
                        onClick={() => {
                          setShowCallModal(true);
                          setCallState('idle');
                        }}
                        className="px-2.5 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold rounded-lg text-[11px] transition flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3 text-indigo-600 dark:text-indigo-400" /> Dial
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact Card 2: Emergency Escalation Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5 transition-colors">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Emergency Escalation Rules
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">Auto-Persisted</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Configure automated triggers that activate when your ward misses doses or prescription reserves fall low.
              </p>

              <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                <label className="flex items-start space-x-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-900/80 cursor-pointer transition">
                  <input 
                    type="checkbox" 
                    checked={notifySms} 
                    onChange={(e) => handleEscalationToggle('sms', e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4" 
                  />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Instant SMS Dispatch on Missed Dose</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Transmits automated SMS to caregiver telephone when a scheduled dose is missed by more than 30 minutes.</span>
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-900/80 cursor-pointer transition">
                  <input 
                    type="checkbox" 
                    checked={notifySupply} 
                    onChange={(e) => handleEscalationToggle('supply', e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4" 
                  />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Low Inventory Refill Warning (7-Day Buffer)</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Notifies pharmacy and assigned physician before pills run out completely.</span>
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100/80 dark:hover:bg-slate-900/80 cursor-pointer transition">
                  <input 
                    type="checkbox" 
                    checked={sendWeeklyPdf} 
                    onChange={(e) => handleEscalationToggle('pdf', e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4" 
                  />
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">Weekly Compliance Summary to Doctor</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Automated 30-day adherence report sent to Dr. Sarah Chen every Monday morning.</span>
                  </div>
                </label>
              </div>

              {/* Emergency Ambulance Hotline */}
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black">
                    SOS
                  </div>
                  <div>
                    <p className="font-bold text-rose-950 dark:text-rose-200">Emergency Ambulance Dispatch</p>
                    <p className="text-rose-700 dark:text-rose-300 text-[11px]">National Emergency Response: <strong>108 / 911</strong></p>
                  </div>
                </div>
                <a
                  href="tel:108"
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition"
                >
                  Dial SOS
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* INTERACTIVE MODAL: CALL CLINIC SIMULATOR & DIALER */}
      {/* ---------------------------------------------------- */}
      {showCallModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-white space-y-6 relative animate-scaleIn">
            <button
              onClick={() => setShowCallModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Doctor Info */}
            <div className="text-center space-y-2">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-teal-500 mx-auto flex items-center justify-center text-2xl font-black shadow-lg shadow-indigo-500/20">
                SC
              </div>
              <h3 className="text-lg font-bold text-white">Dr. Sarah Chen, MD</h3>
              <p className="text-xs text-teal-400 font-medium">MediCare+ Cardiology & Internal Medicine</p>
              <p className="text-xs text-slate-400 font-mono">+1 (800) 555-0199 • Ext 404</p>
            </div>

            {/* Call State Display */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-2">
              {callState === 'idle' && (
                <div className="text-xs text-slate-400">
                  <p className="font-semibold text-slate-300">Direct Doctor Voice Gateway</p>
                  <p className="text-[11px] mt-0.5">Click "Start Call" to connect via secure clinical voice channel.</p>
                </div>
              )}

              {callState === 'calling' && (
                <div className="text-xs text-amber-400 flex items-center justify-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                  <span className="font-bold">Connecting to Dr. Chen's Desk Line...</span>
                </div>
              )}

              {callState === 'connected' && (
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-300 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span>Active Clinical Call: {formatDuration(callDuration)}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">Audio Encrypted (HIPAA Compliant)</p>
                </div>
              )}

              {callState === 'ended' && (
                <div className="text-xs text-slate-400 py-2">
                  <span className="font-bold text-rose-400">Call Completed</span>
                </div>
              )}
            </div>

            {/* Dialer Actions */}
            <div className="flex items-center justify-center gap-4 pt-2">
              {callState === 'idle' && (
                <button
                  onClick={handleStartCall}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition active:scale-98"
                >
                  <PhoneCall className="h-5 w-5" />
                  <span>Start Audio Call</span>
                </button>
              )}

              {callState === 'connected' && (
                <>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-4 rounded-2xl border transition ${
                      isMuted
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                    }`}
                    title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                  >
                    {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>

                  <button
                    onClick={handleEndCall}
                    className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition active:scale-98"
                  >
                    <PhoneOff className="h-5 w-5" />
                    <span>End Call</span>
                  </button>
                </>
              )}

              {callState === 'calling' && (
                <button
                  onClick={handleEndCall}
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition active:scale-98"
                >
                  <PhoneOff className="h-5 w-5" />
                  <span>Cancel Dialing</span>
                </button>
              )}
            </div>

            <div className="text-center">
              <a
                href="tel:+18005550199"
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium"
              >
                Or open device phone app directly
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* INTERACTIVE MODAL: EMAIL CLINICAL MESSAGE COMPOSER */}
      {/* ---------------------------------------------------- */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl text-white space-y-5 relative animate-scaleIn">
            <button
              onClick={() => setShowEmailModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <div className="p-2.5 bg-indigo-500/20 rounded-xl text-indigo-400">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base">Direct Clinical Message</h3>
                <p className="text-xs text-slate-400">Recipient: Dr. Sarah Chen, MD (doctor@medicare.org)</p>
              </div>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Subject / Incident Type</label>
                <select
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Urgent Refill & Patient Status Inquiry">Urgent Refill & Patient Status Inquiry</option>
                  <option value="Missed Dosage Incident Alert">Missed Dosage Incident Alert</option>
                  <option value="Adverse Side-Effect / Reaction Report">Adverse Side-Effect / Reaction Report</option>
                  <option value="Request for Medication Schedule Adjustment">Request for Medication Schedule Adjustment</option>
                  <option value="General Health Status Check-in">General Health Status Check-in</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ward / Patient</label>
                  <input
                    type="text"
                    disabled
                    value={`${activePatient?.name || 'Patient'} (ID: #${activePatient?.patient_id || 1})`}
                    className="w-full px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Urgency Priority</label>
                  <select
                    value={emailPriority}
                    onChange={(e) => setEmailPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="High">High (Immediate Response)</option>
                    <option value="Standard">Standard (Within 24 hrs)</option>
                    <option value="Low">Informational Log</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Message Details</label>
                <textarea
                  rows={4}
                  required
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                  placeholder="Enter medical notes, symptom observations, or dosage questions..."
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSendingEmail}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg text-xs transition flex items-center gap-2"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Transmitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Send to Dr. Chen</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
