import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { MedicationManager } from './components/MedicationManager';
import { CaregiverManager } from './components/CaregiverManager';
import { PrescriptionVault } from './components/PrescriptionVault';
import { DoctorPortal } from './components/DoctorPortal';
import { CaregiverPortal } from './components/CaregiverPortal';
import { AdminPanel } from './components/AdminPanel';
import { QRCodeModal } from './components/QRCodeModal';
import { AuthView } from './components/AuthView';
import { LandingPage } from './components/LandingPage';
import { PythonStudio } from './components/PythonStudio';
import { Patient, Medicine, DoseRecord, Caregiver, Prescription, AdherenceStats, MLRiskPrediction, User as UserType, RefillNotification, AlertSoundId } from './types';
import { PlusCircle, X, UserPlus, ShieldCheck, ShieldAlert, Send, CheckCircle2, MessageSquare, Phone, Mail } from 'lucide-react';
import { speakMessage, stopSpeech, formatMedicationSpeechAnnouncement, isSpeechSynthesisSupported } from './utils/speech';
import { 
  registerServiceWorker, 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendTestNotification,
  triggerMedicationNotification,
  setupServiceWorkerListener 
} from './utils/serviceWorker';
import { getSavedAlertSound, saveAlertSound, playAlertSound } from './utils/audioAlerts';
import { AlertSoundPickerModal } from './components/AlertSoundPickerModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(() => {
    const saved = localStorage.getItem('medicare_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [showLanding, setShowLanding] = useState<boolean>(() => {
    const saved = localStorage.getItem('medicare_user');
    return !saved;
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    const saved = localStorage.getItem('medicare_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u.role === 'admin') return 'admin-panel';
        if (u.role === 'doctor') return 'doctor-portal';
        if (u.role === 'caregiver') return 'caregiver-portal';
      } catch (e) {}
    }
    return 'dashboard';
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [alertSound, setAlertSound] = useState<AlertSoundId>(() => getSavedAlertSound());
  const [isSoundPickerModalOpen, setIsSoundPickerModalOpen] = useState<boolean>(false);
  const [speechEnabled, setSpeechEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('medicare_speech_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [pushEnabled, setPushEnabled] = useState<boolean>(() => {
    return getNotificationPermission() === 'granted';
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('medicare_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [accessibilityMode, setAccessibilityMode] = useState<boolean>(() => {
    return localStorage.getItem('medicare_a11y_mode') === 'true';
  });
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const lastAnnouncedDoseRef = useRef<string>('');

  // Profiles & Data States
  const [patients, setPatients] = useState<Patient[]>([]);
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [doseRecords, setDoseRecords] = useState<DoseRecord[]>([]);
  const [adherenceStats, setAdherenceStats] = useState<AdherenceStats>({
    patient_id: 1,
    scheduled_doses: 0,
    taken_doses: 0,
    missed_doses: 0,
    skipped_doses: 0,
    adherence_score: 100,
    status_label: 'No Doses Logged Yet',
    color_badge: 'slate'
  });
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [mlPrediction, setMlPrediction] = useState<MLRiskPrediction | null>(null);

  // Modals & Notifications
  const [qrMedicine, setQrMedicine] = useState<Medicine | null>(null);
  const [refillNotificationModal, setRefillNotificationModal] = useState<RefillNotification | null>(null);
  const [addPatientOpen, setAddPatientOpen] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientRel, setNewPatientRel] = useState('Self');
  const [newPatientAge, setNewPatientAge] = useState<number>(35);
  const [newPatientGender, setNewPatientGender] = useState('Other');
  const [newPatientBlood, setNewPatientBlood] = useState('O+');

  const [authIntent, setAuthIntent] = useState<{
    role: 'patient' | 'doctor' | 'caregiver' | 'admin';
    mode: 'login' | 'register';
  }>({ role: 'patient', mode: 'login' });

  const [securityNotice, setSecurityNotice] = useState<string>('');
  const [autoLogoutPolicy, setAutoLogoutPolicy] = useState<{
    blurLockEnabled: boolean;
    idleTimeoutMinutes: number;
  }>(() => {
    const saved = localStorage.getItem('medicare_security_policy');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          blurLockEnabled: parsed.blurLockEnabled !== undefined ? parsed.blurLockEnabled : true,
          idleTimeoutMinutes: parsed.idleTimeoutMinutes || 15
        };
      } catch (e) {}
    }
    return { blurLockEnabled: true, idleTimeoutMinutes: 15 };
  });

  const handleUpdateAutoLogoutPolicy = (policy: { blurLockEnabled: boolean; idleTimeoutMinutes: number }) => {
    setAutoLogoutPolicy(policy);
    localStorage.setItem('medicare_security_policy', JSON.stringify(policy));
  };

  // Sync theme with HTML root class and localStorage
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    localStorage.setItem('medicare_theme', theme);
  }, [theme]);

  // Sync Accessibility Mode (High-Contrast for visual impairments)
  useEffect(() => {
    if (accessibilityMode) {
      document.documentElement.classList.add('high-contrast');
      document.body.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
      document.body.classList.remove('high-contrast');
    }
    localStorage.setItem('medicare_a11y_mode', String(accessibilityMode));
  }, [accessibilityMode]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleToggleAccessibilityMode = () => {
    setAccessibilityMode((prev) => {
      const next = !prev;
      if (speechEnabled) {
        speakMessage(next ? 'Accessibility high contrast mode enabled.' : 'Accessibility mode disabled.');
      }
      return next;
    });
  };

  // Switch persona (used in Admin Panel & quick testing)
  const handleSwitchPersona = (role: 'patient' | 'doctor' | 'caregiver' | 'admin') => {
    const personaMap: Record<string, UserType> = {
      patient: { user_id: 1, full_name: 'Rahul Sharma', email: 'rahul.patient@medicare.io', role: 'patient' },
      doctor: { user_id: 2, full_name: 'Dr. Ananya Iyer, MD', email: 'doctor@medicare.io', role: 'doctor' },
      caregiver: { user_id: 3, full_name: 'Priya Sharma (Caregiver)', email: 'caregiver@medicare.io', role: 'caregiver' },
      admin: { user_id: 4, full_name: 'System Super Admin', email: 'admin@medicare.io', role: 'admin' },
    };
    const newUser = personaMap[role] || personaMap.patient;
    setCurrentUser(newUser);
    localStorage.setItem('medicare_user', JSON.stringify(newUser));
    if (role === 'admin') setActiveTab('admin-panel');
    else if (role === 'doctor') setActiveTab('doctor-portal');
    else if (role === 'caregiver') setActiveTab('caregiver-portal');
    else setActiveTab('dashboard');

    loadPatients(newUser.user_id, newUser);
    if (speechEnabled) {
      speakMessage(`Switched session to ${newUser.full_name} (${role} persona).`);
    }
  };

  // Persist speech preference
  const handleToggleSpeech = (enabled: boolean) => {
    setSpeechEnabled(enabled);
    localStorage.setItem('medicare_speech_enabled', String(enabled));
    if (enabled) {
      setIsSpeaking(true);
      speakMessage('Voice reminders enabled. MediCare will announce your medications when due.', () => {
        setIsSpeaking(false);
      });
    } else {
      stopSpeech();
      setIsSpeaking(false);
    }
  };

  // Push Notification Handler
  const handleTogglePush = async () => {
    if (pushEnabled) {
      setPushEnabled(false);
      if (speechEnabled) speakMessage('Push notifications turned off.');
      return;
    }

    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        setPushEnabled(true);
        registerServiceWorker();
        sendTestNotification();
        if (speechEnabled) speakMessage('Push notifications enabled. Background reminders are active.');
      } else {
        alert('Notification permission was denied. Please allow notifications in your browser address bar settings.');
      }
    } catch (err) {
      console.error('Push notification request error:', err);
    }
  };

  const handleTestPush = async () => {
    const success = await sendTestNotification();
    if (!success) {
      alert('Could not trigger notification. Please ensure browser permissions are allowed.');
    }
  };

  // Register service worker on initial mount
  useEffect(() => {
    registerServiceWorker();
    const cleanup = setupServiceWorkerListener((medId, status) => {
      handleLogDose(medId, status);
    });
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Announce specific medication dose out loud via Speech Synthesis
  const handleSpeakMedication = useCallback((med: Medicine) => {
    if (!activePatient) return;
    const announcementText = formatMedicationSpeechAnnouncement(
      activePatient.name,
      med.name,
      med.dosage,
      med.schedules[0]?.time,
      med.instructions,
      med.meal_timing,
      med.precautions,
      med.doctor_name
    );
    setIsSpeaking(true);
    speakMessage(announcementText, () => {
      setIsSpeaking(false);
    });
  }, [activePatient]);

  const handleStopSpeech = useCallback(() => {
    stopSpeech();
    setIsSpeaking(false);
  }, []);

  // Audio Chime Player with Custom Sound Synthesizer
  const playChime = useCallback((overrideSound?: AlertSoundId) => {
    if (!soundEnabled) return;
    playAlertSound(overrideSound || alertSound);
  }, [soundEnabled, alertSound]);

  const handleSelectAlertSound = useCallback((soundId: AlertSoundId) => {
    setAlertSound(soundId);
    saveAlertSound(soundId);
  }, []);

  // Live Clock Ticker & Periodic Dose Time Checker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setCurrentTime(timeStr);

      // Check for scheduled medication times matching current hour & minute
      if (speechEnabled && medicines.length > 0 && activePatient) {
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        const currentHM = `${currentHours}:${currentMinutes}`;

        medicines.forEach((med) => {
          med.schedules.forEach((sch) => {
            const scheduleHM = sch.time.slice(0, 5);
            const announcementKey = `${med.medicine_id}-${currentHM}`;
            if (scheduleHM === currentHM && lastAnnouncedDoseRef.current !== announcementKey) {
              lastAnnouncedDoseRef.current = announcementKey;
              playChime();
              handleSpeakMedication(med);
            }
          });
        });
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [speechEnabled, medicines, activePatient, handleSpeakMedication, playChime]);

  const loadPatients = useCallback((userId?: number, userOverride?: UserType) => {
    const user = userOverride || currentUser;
    if (!user) return;
    const isDoctor = user.role === 'doctor';
    const isCaregiver = user.role === 'caregiver';
    const isAdmin = user.role === 'admin' || user.email === 'admin@medicare.io';
    const targetUserId = userId || user.user_id;

    let url = '/api/patients';
    if (isAdmin || isDoctor) {
      url = '/api/patients?role=doctor';
    } else if (isCaregiver) {
      url = `/api/patients?role=caregiver&user_id=${targetUserId}&email=${encodeURIComponent(user.email)}`;
    } else {
      url = `/api/patients?role=patient&user_id=${targetUserId}&email=${encodeURIComponent(user.email)}`;
    }

    fetch(url)
      .then(res => res.json())
      .then((data: Patient[]) => {
        if (data.length > 0) {
          setPatients(data);
          setActivePatient(prev => {
            if (prev && data.some(p => p.patient_id === prev.patient_id)) {
              return prev;
            }
            return data[0];
          });
        } else if (isCaregiver) {
          // Caregiver has no assigned patient yet
          setPatients([]);
          setActivePatient(null);
        } else if (user.role === 'patient') {
          const selfProfile: Patient = {
            patient_id: Date.now(),
            primary_user_id: user.user_id,
            name: user.full_name,
            relationship: 'Self',
            age: 28,
            gender: 'Not specified',
            blood_group: 'O+'
          };
          setPatients([selfProfile]);
          setActivePatient(selfProfile);
        } else {
          setPatients([]);
          setActivePatient(null);
        }
      })
      .catch(err => console.error('Failed to load patients:', err));
  }, [currentUser]);

  // Fetch Patients initially
  useEffect(() => {
    if (currentUser) {
      loadPatients(currentUser.user_id);
    }
  }, [currentUser, loadPatients]);

  // Refresh active patient data
  const refreshPatientData = useCallback((patientId: number) => {
    // 1. Medicines
    fetch(`/api/medicines?patient_id=${patientId}`)
      .then(res => res.json())
      .then(data => setMedicines(data))
      .catch(err => console.error('Failed medicines fetch:', err));

    // 2. Dose Records
    fetch(`/api/dose-records?patient_id=${patientId}`)
      .then(res => res.json())
      .then(data => setDoseRecords(data))
      .catch(err => console.error('Failed dose records fetch:', err));

    // 3. Adherence Stats
    fetch(`/api/adherence/${patientId}`)
      .then(res => res.json())
      .then(data => setAdherenceStats(data))
      .catch(err => console.error('Failed adherence fetch:', err));

    // 4. Caregivers
    fetch(`/api/caregivers?patient_id=${patientId}`)
      .then(res => res.json())
      .then(data => setCaregivers(data))
      .catch(err => console.error('Failed caregivers fetch:', err));

    // 5. Prescriptions
    fetch(`/api/prescriptions?patient_id=${patientId}`)
      .then(res => res.json())
      .then(data => setPrescriptions(data))
      .catch(err => console.error('Failed prescriptions fetch:', err));

    // 6. ML Risk Prediction Call
    fetch('/api/predict-risk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scheduled_hour: 20,
        day_of_week: new Date().getDay(),
        historical_adherence: 0.95,
        snooze_count: 0,
        past_missed_doses: 0
      })
    })
      .then(res => res.json())
      .then(data => setMlPrediction(data))
      .catch(err => console.error('Failed ML prediction fetch:', err));
  }, []);

  useEffect(() => {
    if (activePatient) {
      refreshPatientData(activePatient.patient_id);
    } else {
      setMedicines([]);
      setDoseRecords([]);
      setCaregivers([]);
      setPrescriptions([]);
      setMlPrediction(null);
    }
  }, [activePatient, refreshPatientData]);

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('medicare_user');
    localStorage.removeItem('medicare_token');
    setCurrentUser(null);
    setActivePatient(null);
    setPatients([]);
    setMedicines([]);
    setDoseRecords([]);
    setCaregivers([]);
    setPrescriptions([]);
    setActiveTab('dashboard');
    setShowLanding(true);
    setSecurityNotice('');
  };

  // Automated Secure Logout on Window Blur / Tab Switching / Inactivity
  useEffect(() => {
    if (!currentUser) return;

    let idleTimer: any = null;

    const performAutoLogout = (reason: string) => {
      localStorage.removeItem('medicare_user');
      localStorage.removeItem('medicare_token');
      setCurrentUser(null);
      setActivePatient(null);
      setPatients([]);
      setMedicines([]);
      setDoseRecords([]);
      setCaregivers([]);
      setPrescriptions([]);
      setActiveTab('dashboard');
      setShowLanding(true);
      setSecurityNotice(reason);
      if (speechEnabled) {
        speakMessage('Session locked for patient privacy and security.');
      }
    };

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      const timeoutMs = (autoLogoutPolicy.idleTimeoutMinutes || 5) * 60 * 1000;
      idleTimer = setTimeout(() => {
        performAutoLogout(`Session expired after ${autoLogoutPolicy.idleTimeoutMinutes} minutes of inactivity to protect confidential medical records.`);
      }, timeoutMs);
    };

    const handleVisibilityChange = () => {
      if (autoLogoutPolicy.blurLockEnabled && document.visibilityState === 'hidden') {
        performAutoLogout('You navigated away or switched outside the application. Your session was safely locked to protect confidential patient records.');
      }
    };

    const handleWindowBlur = () => {
      if (autoLogoutPolicy.blurLockEnabled) {
        performAutoLogout('You moved outside the application window. For HIPAA medical confidentiality, your session was automatically locked.');
      }
    };

    // Activity event listeners
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((ev) => window.addEventListener(ev, resetIdleTimer));
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    resetIdleTimer();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetIdleTimer));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [currentUser, autoLogoutPolicy, speechEnabled]);

  // Dose Logger Handler
  const handleLogDose = async (
    medicineId: number,
    status: 'TAKEN' | 'MISSED' | 'SKIPPED' | 'TAKEN_LATE',
    snoozeMinutes?: number,
    reason?: string,
    customDate?: string
  ) => {
    if (!activePatient) return;
    playChime();

    const targetMed = medicines.find(m => m.medicine_id === medicineId);

    if (speechEnabled) {
      if (status === 'TAKEN' || status === 'TAKEN_LATE') {
        speakMessage(`Dose confirmed. ${targetMed ? targetMed.name : 'Medication'} marked as taken. Great job!`);
      } else if (status === 'SKIPPED') {
        speakMessage(`Dose marked as skipped.`);
      }
    }

    try {
      const res = await fetch('/api/dose-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_id: medicineId,
          patient_id: activePatient.patient_id,
          status,
          snooze_minutes: snoozeMinutes,
          missed_reason: reason,
          scheduled_datetime: customDate
        })
      });

      if (res.ok) {
        refreshPatientData(activePatient.patient_id);
      }
    } catch (err) {
      console.error('Failed logging dose:', err);
    }
  };

  // Add Medicine Handler
  const handleAddMedicine = async (medData: any) => {
    try {
      const res = await fetch('/api/medicines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(medData)
      });
      if (res.ok && activePatient) {
        refreshPatientData(activePatient.patient_id);
      }
    } catch (err) {
      console.error('Add medicine error:', err);
    }
  };

  // Add Stock Handler
  const handleAddStock = async (medId: number, quantity: number) => {
    try {
      const res = await fetch(`/api/medicines/${medId}/add-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      });
      if (res.ok && activePatient) {
        refreshPatientData(activePatient.patient_id);
      }
    } catch (err) {
      console.error('Add stock error:', err);
    }
  };

  // Request Refill Handler (Updates stock status in backend and sends simulated caregiver alert)
  const handleRequestRefill = async (
    medicine: Medicine,
    options?: { requested_quantity?: number; urgent?: boolean; notes?: string }
  ) => {
    if (!activePatient) return;
    try {
      const res = await fetch(`/api/medicines/${medicine.medicine_id}/request-refill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requested_quantity: options?.requested_quantity || 30,
          urgent: options?.urgent || false,
          notes: options?.notes || ''
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.notification) {
          setRefillNotificationModal(data.notification);
          if (speechEnabled) {
            speakMessage(
              `Refill request dispatched for ${medicine.name}. Notification sent to ${data.notification.caregiver_name || 'your caregiver'}.`
            );
          }
        }
        refreshPatientData(activePatient.patient_id);
      }
    } catch (err) {
      console.error('Request refill error:', err);
    }
  };

  // Delete Medicine Handler
  const handleDeleteMedicine = async (medId: number) => {
    try {
      const res = await fetch(`/api/medicines/${medId}`, { method: 'DELETE' });
      if (res.ok && activePatient) {
        refreshPatientData(activePatient.patient_id);
      }
    } catch (err) {
      console.error('Delete medicine error:', err);
    }
  };

  // Update Snooze Interval Handler
  const handleUpdateSnooze = async (medId: number, minutes: number) => {
    try {
      const res = await fetch(`/api/medicines/${medId}/snooze-interval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snooze_interval_minutes: minutes })
      });
      if (res.ok && activePatient) {
        refreshPatientData(activePatient.patient_id);
      }
    } catch (err) {
      console.error('Update snooze interval error:', err);
    }
  };

  // Delete Patient Handler
  const handleDeletePatient = async (patientId: number) => {
    try {
      const res = await fetch(`/api/patients/${patientId}`, { method: 'DELETE' });
      if (res.ok) {
        setPatients(prev => {
          const updated = prev.filter(p => p.patient_id !== patientId);
          if (activePatient?.patient_id === patientId) {
            setActivePatient(updated.length > 0 ? updated[0] : null);
          }
          return updated;
        });
      }
    } catch (err) {
      console.error('Delete patient error:', err);
    }
  };

  // Delete Prescription Handler
  const handleDeletePrescription = async (prescriptionId: number) => {
    try {
      const res = await fetch(`/api/prescriptions/${prescriptionId}`, { method: 'DELETE' });
      if (res.ok && activePatient) {
        refreshPatientData(activePatient.patient_id);
      }
    } catch (err) {
      console.error('Delete prescription error:', err);
    }
  };

  // Add Caregiver Handler
  const handleAddCaregiver = async (caregiverData: any) => {
    try {
      const res = await fetch('/api/caregivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(caregiverData)
      });
      if (res.ok && activePatient) {
        refreshPatientData(activePatient.patient_id);
      }
    } catch (err) {
      console.error('Add caregiver error:', err);
    }
  };

  // Parse Prescription Handler
  const handleParsePrescription = async (notes: string, doctorName: string) => {
    if (!activePatient) return;
    try {
      const res = await fetch('/api/prescriptions/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes,
          doctor_name: doctorName,
          patient_id: activePatient.patient_id
        })
      });
      if (res.ok) {
        refreshPatientData(activePatient.patient_id);
      }
    } catch (err) {
      console.error('Prescription parse error:', err);
    }
  };

  // Add New Patient Profile Handler
  const handleAddPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName) return;

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPatientName,
          relationship: newPatientRel,
          age: Number(newPatientAge) || 40,
          gender: newPatientGender,
          blood_group: newPatientBlood
        })
      });

      if (res.ok) {
        const created: Patient = await res.json();
        setPatients(prev => [...prev, created]);
        setActivePatient(created);
        setAddPatientOpen(false);
        setNewPatientName('');
      }
    } catch (err) {
      console.error('Add patient error:', err);
    }
  };

  const handleUpdateUserName = async (newName: string) => {
    if (!currentUser || !newName.trim()) return;
    const updatedUser = { ...currentUser, full_name: newName.trim() };
    setCurrentUser(updatedUser);
    localStorage.setItem('medicare_user', JSON.stringify(updatedUser));

    // Update patient if active/self
    setPatients(prev =>
      prev.map(p =>
        p.primary_user_id === currentUser.user_id && p.relationship === 'Self'
          ? { ...p, name: newName.trim() }
          : p
      )
    );
    setActivePatient(prev =>
      prev && prev.primary_user_id === currentUser.user_id && prev.relationship === 'Self'
        ? { ...prev, name: newName.trim() }
        : prev
    );

    try {
      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.user_id,
          full_name: newName.trim()
        })
      });
    } catch (e) {
      console.error('Update profile error:', e);
    }
  };

  // Update Patient Profile Photo (Upload or Camera Capture)
  const handleUpdatePatientPhoto = async (patientId: number, photoUrl: string) => {
    // 1. Optimistically update patient profile in React state
    setPatients(prev =>
      prev.map(p => (p.patient_id === patientId ? { ...p, photo_url: photoUrl } : p))
    );
    setActivePatient(prev =>
      prev && prev.patient_id === patientId ? { ...prev, photo_url: photoUrl } : prev
    );

    // If active patient is the primary user self-profile, update currentUser avatar as well
    if (currentUser && activePatient?.relationship === 'Self') {
      const updatedUser = { ...currentUser, photo_url: photoUrl };
      setCurrentUser(updatedUser);
      localStorage.setItem('medicare_user', JSON.stringify(updatedUser));
    }

    // 2. Persist to backend server API
    try {
      await fetch(`/api/patients/${patientId}/photo`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_url: photoUrl })
      });
    } catch (e) {
      console.error('Error saving patient photo to backend:', e);
    }
  };

  // When starting the project or clicking "Back to Home", show Landing Page
  if (showLanding && !currentUser) {
    return (
      <LandingPage
        onGoToAuth={(role = 'patient', mode = 'login') => {
          setAuthIntent({ role, mode });
          setShowLanding(false);
        }}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        accessibilityMode={accessibilityMode}
        onToggleAccessibilityMode={handleToggleAccessibilityMode}
      />
    );
  }

  // If not logged in, render authentication view (Sign In / Register)
  if (!currentUser) {
    return (
      <AuthView
        onGoToDashboard={() => {
          setAuthIntent({ role: 'patient', mode: 'login' });
          setSecurityNotice('');
          setShowLanding(true);
        }}
        initialRole={authIntent.role}
        initialMode={authIntent.mode}
        securityNotice={securityNotice}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        accessibilityMode={accessibilityMode}
        onToggleAccessibilityMode={handleToggleAccessibilityMode}
        onLoginSuccess={(user, initialPatient) => {
          setSecurityNotice('');
          setShowLanding(false);
          setCurrentUser(user);
          if (user.role === 'admin') {
            setActiveTab('admin-panel');
          } else if (user.role === 'doctor') {
            setActiveTab('doctor-portal');
          } else if (user.role === 'caregiver') {
            setActiveTab('caregiver-portal');
          } else {
            setActiveTab('dashboard');
          }

          if (initialPatient) {
            setPatients([initialPatient]);
            setActivePatient(initialPatient);
            refreshPatientData(initialPatient.patient_id);
          } else {
            loadPatients(user.user_id, user);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans flex flex-col antialiased transition-colors duration-200">
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onShowLanding={handleLogout}
        onUpdateUserName={handleUpdateUserName}
        patients={patients}
        activePatient={activePatient}
        onSelectPatient={(p) => setActivePatient(p)}
        onAddPatient={() => setAddPatientOpen(true)}
        onUpdatePatientPhoto={handleUpdatePatientPhoto}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        speechEnabled={speechEnabled}
        setSpeechEnabled={handleToggleSpeech}
        alertSound={alertSound}
        onSelectAlertSound={handleSelectAlertSound}
        pushEnabled={pushEnabled}
        onTogglePush={handleTogglePush}
        onTestPush={handleTestPush}
        currentTime={currentTime}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        accessibilityMode={accessibilityMode}
        onToggleAccessibilityMode={handleToggleAccessibilityMode}
        onSwitchPersona={handleSwitchPersona}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ADMIN GOVERNANCE PANEL */}
        {activeTab === 'admin-panel' ? (
          (currentUser.role === 'admin' || currentUser.email === 'admin@medicare.io') ? (
            <AdminPanel
              currentUser={currentUser}
              onSwitchUserPersona={handleSwitchPersona}
              autoLogoutPolicy={autoLogoutPolicy}
              onUpdateAutoLogoutPolicy={handleUpdateAutoLogoutPolicy}
              onRefreshAllData={() => {
                loadPatients();
                if (activePatient) refreshPatientData(activePatient.patient_id);
              }}
            />
          ) : (
            <div className="max-w-md mx-auto py-16 text-center space-y-4">
              <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto text-rose-500">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Admin Access Restricted</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Only the single authorized Master Administrator (<span className="font-mono text-teal-600 dark:text-teal-400 font-bold">admin@medicare.io</span>) has control over the system.
              </p>
              <button
                onClick={() => setActiveTab(currentUser.role === 'doctor' ? 'doctor-portal' : currentUser.role === 'caregiver' ? 'caregiver-portal' : 'dashboard')}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow transition"
              >
                Return to My Workspace
              </button>
            </div>
          )
        ) : activeTab === 'python-hub' ? (
          <PythonStudio />
        ) : activeTab === 'doctor-portal' ? (
          <DoctorPortal
            doctorName={currentUser.full_name}
            patients={patients}
            activePatient={activePatient}
            onSelectPatient={(p) => setActivePatient(p)}
            medicines={medicines}
            prescriptions={prescriptions}
            doseRecords={doseRecords}
            onAddMedicine={handleAddMedicine}
            onParsePrescription={handleParsePrescription}
            onRefreshData={(patientId) => refreshPatientData(patientId)}
            onDeletePatient={handleDeletePatient}
            onDeletePrescription={handleDeletePrescription}
            adherenceStats={adherenceStats}
            mlPrediction={mlPrediction}
            caregivers={caregivers}
          />
        ) : activeTab === 'caregiver-portal' ? (
          <CaregiverPortal
            caregiverName={currentUser.full_name}
            activePatient={activePatient}
            patients={patients}
            medicines={medicines}
            doseRecords={doseRecords}
            caregivers={caregivers}
            onSelectPatient={(p) => setActivePatient(p)}
            onLogDose={handleLogDose}
            onRequestRefill={handleRequestRefill}
          />
        ) : activePatient ? (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                activePatient={activePatient}
                medicines={medicines}
                doseRecords={doseRecords}
                adherenceStats={adherenceStats}
                mlPrediction={mlPrediction}
                onLogDose={handleLogDose}
                onShowQR={(med) => setQrMedicine(med)}
                onNavigateToStock={() => setActiveTab('medications')}
                onRequestRefill={handleRequestRefill}
                speechEnabled={speechEnabled}
                onSpeakReminder={handleSpeakMedication}
                isSpeaking={isSpeaking}
                onStopSpeech={handleStopSpeech}
                caregivers={caregivers}
                alertSound={alertSound}
                onOpenSoundPicker={() => setIsSoundPickerModalOpen(true)}
              />
            )}

            {activeTab === 'medications' && (
              <MedicationManager
                activePatient={activePatient}
                medicines={medicines}
                onAddMedicine={handleAddMedicine}
                onAddStock={handleAddStock}
                onDeleteMedicine={handleDeleteMedicine}
                onUpdateSnooze={handleUpdateSnooze}
                onShowQR={(med) => setQrMedicine(med)}
                onRequestRefill={handleRequestRefill}
              />
            )}

            {activeTab === 'caregiver' && (
              <CaregiverManager
                activePatient={activePatient}
                caregivers={caregivers}
                onAddCaregiver={handleAddCaregiver}
              />
            )}

            {activeTab === 'prescriptions' && (
              <PrescriptionVault
                activePatient={activePatient}
                prescriptions={prescriptions}
                onParsePrescription={handleParsePrescription}
                onAddExtractedMedicine={handleAddMedicine}
                onDeletePrescription={handleDeletePrescription}
              />
            )}
          </>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 border border-slate-200 dark:border-slate-800 shadow-sm max-w-xl mx-auto my-12 text-center space-y-5">
            <div className="w-16 h-16 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <UserPlus className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Welcome, {currentUser.full_name}!</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md mx-auto">
                Your MediCare+ system is ready with a clean slate. Create your primary patient profile or a family member profile to begin adding medicines and tracking reminders.
              </p>
            </div>
            <button
              onClick={() => {
                setNewPatientName(currentUser.full_name);
                setNewPatientRel(currentUser.role === 'doctor' ? 'Clinical Patient' : 'Self');
                setAddPatientOpen(true);
              }}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-teal-600/20 text-sm transition transform hover:scale-[1.02]"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Patient Profile</span>
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-400 dark:text-slate-500 border-t border-slate-800 dark:border-slate-900 text-xs py-6 px-4 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <p className="font-bold text-slate-200 dark:text-slate-300">MediCare+ Smart Medication Management System</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Secure patient compliance, prescription management & stock tracker.
            </p>
          </div>
          <div className="text-[11px] text-slate-400 dark:text-slate-500 text-center sm:text-right">
            <span>Reminder Engine Active • Real-time Monitoring</span>
          </div>
        </div>
      </footer>

      {/* QR Code Modal */}
      <QRCodeModal medicine={qrMedicine} onClose={() => setQrMedicine(null)} />

      {/* Add Patient Profile Modal */}
      {addPatientOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-teal-600 dark:text-teal-400" /> Add Patient Profile
              </h3>
              <button onClick={() => setAddPatientOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddPatientSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Patient Full Name"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Relationship</label>
                  <select
                    value={newPatientRel}
                    onChange={(e) => setNewPatientRel(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                  >
                    <option value="Self">Self</option>
                    <option value="Parent">Parent</option>
                    <option value="Child">Child</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Age</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={newPatientAge}
                    onChange={(e) => setNewPatientAge(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Gender</label>
                  <select
                    value={newPatientGender}
                    onChange={(e) => setNewPatientGender(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Blood Group</label>
                  <select
                    value={newPatientBlood}
                    onChange={(e) => setNewPatientBlood(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setAddPatientOpen(false)}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-sm"
                >
                  Create Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Simulated Caregiver Refill Notification Modal */}
      {refillNotificationModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-xl">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Caregiver Refill Alert Dispatched</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Simulated notification sent via SMS & Email</p>
                </div>
              </div>
              <button
                onClick={() => setRefillNotificationModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg text-xs"
              >
                ✕
              </button>
            </div>

            {/* Recipient Overview */}
            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                <span>Caregiver Recipient:</span>
                <span className="text-teal-700 dark:text-teal-400">{refillNotificationModal.caregiver_name} ({refillNotificationModal.caregiver_relation})</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-slate-400" /> Phone (SMS):</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{refillNotificationModal.caregiver_phone}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-slate-400" /> Email Alert:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{refillNotificationModal.caregiver_email}</span>
              </div>
            </div>

            {/* Simulated SMS Message Container */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                Simulated SMS Transmission:
              </p>
              <div className="bg-slate-900 text-emerald-400 font-mono text-xs p-3.5 rounded-xl border border-slate-800 leading-relaxed shadow-inner">
                {refillNotificationModal.simulated_sms_text}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                Status: <strong className="text-emerald-600 dark:text-emerald-400">Delivered (Simulated)</strong>
              </span>
              <button
                onClick={() => setRefillNotificationModal(null)}
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Sound & Chime Picker Modal */}
      <AlertSoundPickerModal
        isOpen={isSoundPickerModalOpen}
        onClose={() => setIsSoundPickerModalOpen(false)}
        currentSound={alertSound}
        onSelectSound={handleSelectAlertSound}
        activePatientName={activePatient?.name || currentUser?.full_name || 'Patient'}
      />
    </div>
  );
}
