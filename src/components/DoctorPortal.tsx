import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Users, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Pill, 
  Send, 
  Activity, 
  Search, 
  Plus, 
  ShieldAlert, 
  TrendingUp, 
  UserCheck, 
  ChevronRight,
  Filter,
  Sparkles,
  ClipboardList,
  Calendar,
  Check,
  X,
  Trash2,
  AlertCircle,
  UserMinus,
  Printer,
  Mail,
  Building2,
  ShieldCheck,
  Award
} from 'lucide-react';
import { Patient, Medicine, DoseRecord, Prescription, PatientRosterItem, AdherenceStats, MLRiskPrediction, Caregiver, DoctorInfo } from '../types';
import { PrintableComplianceAudit } from './PrintableComplianceAudit';

interface DoctorPortalProps {
  doctorName: string;
  patients: Patient[];
  activePatient: Patient | null;
  onSelectPatient: (p: Patient) => void;
  medicines: Medicine[];
  prescriptions: Prescription[];
  doseRecords: DoseRecord[];
  onAddMedicine: (med: any) => Promise<void>;
  onParsePrescription: (notes: string, doctorName: string) => Promise<void>;
  onRefreshData: (patientId: number) => void;
  onDeletePatient?: (patientId: number) => Promise<void>;
  onDeletePrescription?: (prescriptionId: number) => Promise<void>;
  adherenceStats?: AdherenceStats;
  mlPrediction?: MLRiskPrediction | null;
  caregivers?: Caregiver[];
}

export const DoctorPortal: React.FC<DoctorPortalProps> = ({
  doctorName,
  patients,
  activePatient,
  onSelectPatient,
  medicines,
  prescriptions,
  doseRecords,
  onAddMedicine,
  onParsePrescription,
  onRefreshData,
  onDeletePatient,
  onDeletePrescription,
  adherenceStats = { adherence_score: 95, doses_taken: 19, doses_missed: 1, streak_days: 7, status_label: 'Optimal Adherence' },
  mlPrediction = null,
  caregivers = []
}) => {
  const [activeDoctorTab, setActiveDoctorTab] = useState<'roster' | 'doctors' | 'prescribe' | 'refills' | 'analytics'>('roster');
  const [roster, setRoster] = useState<PatientRosterItem[]>([]);
  const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [doctorSearchTerm, setDoctorSearchTerm] = useState('');
  const [sideDoctorSearch, setSideDoctorSearch] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('ALL');
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Patient Deletion Confirmation State
  const [patientToDelete, setPatientToDelete] = useState<PatientRosterItem | null>(null);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);

  // Manual Add Patient Modal State
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientAge, setNewPatientAge] = useState(30);
  const [newPatientGender, setNewPatientGender] = useState('Male');
  const [newPatientBlood, setNewPatientBlood] = useState('O+');
  const [newPatientRel, setNewPatientRel] = useState('Patient');
  const [addingPatientLoading, setAddingPatientLoading] = useState(false);
  const [patientCreateSuccess, setPatientCreateSuccess] = useState('');

  // Manual Add Doctor Modal State
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [newDoctorName, setNewDoctorName] = useState('');
  const [newDoctorEmail, setNewDoctorEmail] = useState('');
  const [newDoctorPass, setNewDoctorPass] = useState('doctor123');
  const [newDoctorSpecialty, setNewDoctorSpecialty] = useState('General Physician / Internal Medicine');
  const [newDoctorDept, setNewDoctorDept] = useState('Clinical OPD & Inpatient Care');
  const [addingDoctorLoading, setAddingDoctorLoading] = useState(false);
  const [doctorCreateSuccess, setDoctorCreateSuccess] = useState('');

  // Prescription Writer State
  const [rxTargetPatientId, setRxTargetPatientId] = useState<number | ''>('');
  const [rxNotes, setRxNotes] = useState('');
  const [rxMedName, setRxMedName] = useState('');
  const [rxDosage, setRxDosage] = useState('1 Tablet');
  const [rxForm, setRxForm] = useState('Tablet');
  const [rxInstructions, setRxInstructions] = useState('Take 1 tablet after breakfast with warm water.');
  const [rxPrecautions, setRxPrecautions] = useState('Drink 2.5 to 3 liters of water daily. Avoid skipping doses.');
  const [rxMealTiming, setRxMealTiming] = useState<'AFTER_MEAL' | 'BEFORE_MEAL' | 'WITH_MEAL' | 'EMPTY_STOMACH' | 'BEDTIME' | 'ANYTIME'>('AFTER_MEAL');
  const [rxFrequencyPreset, setRxFrequencyPreset] = useState<'ONCE' | 'TWICE' | 'THRICE' | 'CUSTOM'>('TWICE');
  const [rxSchedulesList, setRxSchedulesList] = useState<{ time: string; frequency: string; label: string }[]>([
    { time: '08:00 AM', frequency: 'Daily', label: 'Morning / सकाळ' },
    { time: '08:30 PM', frequency: 'Daily', label: 'Night / रात्र' }
  ]);
  const [rxQuantity, setRxQuantity] = useState('30');
  const [submittingRx, setSubmittingRx] = useState(false);
  const [rxSuccessMsg, setRxSuccessMsg] = useState('');

  // Synchronize target patient id when activePatient changes
  useEffect(() => {
    if (activePatient) {
      setRxTargetPatientId(activePatient.patient_id);
    } else if (roster.length > 0 && !rxTargetPatientId) {
      setRxTargetPatientId(roster[0].patient_id);
    }
  }, [activePatient, roster]);

  // Handle frequency preset changes
  const handleFrequencyPresetChange = (preset: 'ONCE' | 'TWICE' | 'THRICE' | 'CUSTOM') => {
    setRxFrequencyPreset(preset);
    if (preset === 'ONCE') {
      setRxSchedulesList([
        { time: '08:00 AM', frequency: 'Daily', label: 'Morning / सकाळ' }
      ]);
    } else if (preset === 'TWICE') {
      setRxSchedulesList([
        { time: '08:00 AM', frequency: 'Daily', label: 'Morning / सकाळ' },
        { time: '08:30 PM', frequency: 'Daily', label: 'Night / रात्र' }
      ]);
    } else if (preset === 'THRICE') {
      setRxSchedulesList([
        { time: '08:00 AM', frequency: 'Daily', label: 'Morning / सकाळ' },
        { time: '01:00 PM', frequency: 'Daily', label: 'Afternoon / दुपार' },
        { time: '08:30 PM', frequency: 'Daily', label: 'Night / रात्र' }
      ]);
    }
  };

  const handleAddTimeSlot = () => {
    setRxSchedulesList(prev => [
      ...prev,
      { time: '06:00 PM', frequency: 'Daily', label: 'Evening / संध्याकाळ' }
    ]);
    setRxFrequencyPreset('CUSTOM');
  };

  const handleRemoveTimeSlot = (index: number) => {
    if (rxSchedulesList.length <= 1) return;
    setRxSchedulesList(prev => prev.filter((_, i) => i !== index));
    setRxFrequencyPreset('CUSTOM');
  };

  const handleUpdateTimeSlot = (index: number, field: 'time' | 'label', val: string) => {
    setRxSchedulesList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Quick medicine selection helper
  const handleSelectMedTemplate = (name: string, defaultDosage: string, form: string, timing: typeof rxMealTiming, instr: string, prec: string) => {
    setRxMedName(name);
    setRxDosage(defaultDosage);
    setRxForm(form);
    setRxMealTiming(timing);
    setRxInstructions(instr);
    setRxPrecautions(prec);
  };

  // Handle Direct Prescription Issuance
  const handleIssuePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetPatient = roster.find(p => p.patient_id === Number(rxTargetPatientId)) || activePatient;
    if (!targetPatient || !rxMedName.trim()) {
      alert('Please select a patient and enter medication name.');
      return;
    }

    setSubmittingRx(true);
    setRxSuccessMsg('');

    try {
      // Direct call to comprehensive /api/doctor/prescribe
      const res = await fetch('/api/doctor/prescribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: targetPatient.patient_id,
          doctor_name: doctorName,
          medicine_name: rxMedName.trim(),
          dosage: rxDosage.trim() || '1 tablet',
          form: rxForm,
          instructions: rxInstructions.trim() || 'Take as prescribed by physician',
          precautions: rxPrecautions.trim() || 'Follow prescribed timing strictly',
          meal_timing: rxMealTiming,
          schedules: rxSchedulesList,
          total_quantity: Number(rxQuantity) || 30,
          refill_threshold: 7
        })
      });

      if (res.ok) {
        const result = await res.json();
        const timingLabels = rxSchedulesList.map(s => `${s.time} (${s.label})`).join(', ');
        setRxSuccessMsg(`✅ Prescription successfully issued to ${targetPatient.name}! Medications, daily schedule (${timingLabels}), meal instructions, and warnings have synced directly to ${targetPatient.name}'s Patient portal and Caregiver dashboard.`);
        
        onRefreshData(targetPatient.patient_id);
      } else {
        // Fallback to onAddMedicine and onParsePrescription
        await onAddMedicine({
          patient_id: targetPatient.patient_id,
          name: rxMedName.trim(),
          dosage: rxDosage.trim() || '1 tablet',
          form: rxForm,
          instructions: rxInstructions.trim() || 'Take as prescribed by doctor',
          meal_timing: rxMealTiming,
          doctor_name: doctorName,
          doctor_specialty: 'Attending Physician / Clinical Medicine',
          doctor_notes: rxInstructions.trim(),
          precautions: rxPrecautions.trim(),
          is_doctor_prescribed: true,
          total_quantity: Number(rxQuantity) || 30,
          refill_threshold: 7,
          schedules: rxSchedulesList
        });

        const timingLabels = rxSchedulesList.map(s => `${s.time} (${s.label})`).join(', ');
        const fullRxNote = `Prescription for ${targetPatient.name}: ${rxMedName.trim()} (${rxDosage}) | Timings: [${timingLabels}] | Meal: ${rxMealTiming} | Instructions: "${rxInstructions}" | Precautions: "${rxPrecautions}" | Prescribed by ${doctorName}.`;
        await onParsePrescription(fullRxNote, doctorName);

        setRxSuccessMsg(`✅ Prescription issued to ${targetPatient.name}! Synced across Patient and Caregiver portals.`);
        onRefreshData(targetPatient.patient_id);
      }
      
      // Reset input fields
      setRxMedName('');
      setRxDosage('1 Tablet');
      setRxInstructions('Take with warm water after breakfast.');
      setRxPrecautions('Drink 2.5 to 3 liters of water daily. Avoid skipping doses.');
      
      fetchRoster();
    } catch (err) {
      console.error('Failed to issue prescription:', err);
    } finally {
      setSubmittingRx(false);
    }
  };

  // Refill Approval Modal / Action State
  const [approvingMed, setApprovingMed] = useState<Medicine | null>(null);
  const [approveQuantity, setApproveQuantity] = useState('30');
  const [approvalNotes, setApprovalNotes] = useState('Approved by primary physician. 30-day supply authorized.');
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalSuccess, setApprovalSuccess] = useState('');

  // Fetch clinical roster (Patients only)
  const fetchRoster = async () => {
    setLoadingRoster(true);
    try {
      const res = await fetch('/api/doctor/roster');
      if (res.ok) {
        const data = await res.json();
        setRoster(data);
      }
    } catch (err) {
      console.error('Error fetching doctor roster:', err);
    } finally {
      setLoadingRoster(false);
    }
  };

  // Fetch registered doctors
  const fetchDoctors = async () => {
    setLoadingDoctors(true);
    try {
      const res = await fetch('/api/doctors');
      if (res.ok) {
        const data = await res.json();
        setDoctors(data);
      }
    } catch (err) {
      console.error('Error fetching doctors:', err);
    } finally {
      setLoadingDoctors(false);
    }
  };

  // Handle Manual Patient Creation from Doctor Portal
  const handleAddPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim()) {
      alert('Please enter patient full name');
      return;
    }

    setAddingPatientLoading(true);
    setPatientCreateSuccess('');
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPatientName.trim(),
          relationship: newPatientRel,
          age: Number(newPatientAge) || 30,
          gender: newPatientGender,
          blood_group: newPatientBlood,
          primary_user_id: 1002
        })
      });

      if (res.ok) {
        const newPatientData = await res.json();
        setPatientCreateSuccess(`Successfully added patient ${newPatientName.trim()} to clinical records!`);
        setNewPatientName('');
        setNewPatientAge(30);
        setTimeout(() => {
          setShowAddPatientModal(false);
          setPatientCreateSuccess('');
        }, 1200);
        fetchRoster();
        if (onSelectPatient && newPatientData) {
          onSelectPatient(newPatientData);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Failed to create patient profile');
      }
    } catch (err) {
      console.error('Error adding patient:', err);
      alert('Error connecting to server. Please try again.');
    } finally {
      setAddingPatientLoading(false);
    }
  };

  // Handle Manual Doctor Registration from Doctor Directory
  const handleAddDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctorName.trim() || !newDoctorEmail.trim()) {
      alert('Please enter doctor name and email address');
      return;
    }

    setAddingDoctorLoading(true);
    setDoctorCreateSuccess('');
    try {
      const res = await fetch('/api/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: newDoctorName.trim(),
          email: newDoctorEmail.trim(),
          password: newDoctorPass || 'doctor123',
          specialty: newDoctorSpecialty,
          department: newDoctorDept
        })
      });

      if (res.ok) {
        setDoctorCreateSuccess(`Physician record for ${newDoctorName.trim()} created! Credentials: ${newDoctorEmail.trim()} / ${newDoctorPass || 'doctor123'}`);
        setNewDoctorName('');
        setNewDoctorEmail('');
        setTimeout(() => {
          setShowAddDoctorModal(false);
          setDoctorCreateSuccess('');
        }, 1500);
        fetchDoctors();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || 'Failed to register doctor profile');
      }
    } catch (err) {
      console.error('Error adding doctor:', err);
      alert('Error connecting to server. Please try again.');
    } finally {
      setAddingDoctorLoading(false);
    }
  };

  useEffect(() => {
    fetchRoster();
    fetchDoctors();
  }, [activePatient, medicines]);

  const handleConfirmDeletePatient = async () => {
    if (!patientToDelete) return;
    setIsDeletingPatient(true);
    try {
      if (onDeletePatient) {
        await onDeletePatient(patientToDelete.patient_id);
      } else {
        await fetch(`/api/patients/${patientToDelete.patient_id}`, { method: 'DELETE' });
      }
      setRoster(prev => prev.filter(p => p.patient_id !== patientToDelete.patient_id));
      if (activePatient?.patient_id === patientToDelete.patient_id) {
        const remaining = roster.filter(p => p.patient_id !== patientToDelete.patient_id);
        if (remaining.length > 0) {
          onSelectPatient(remaining[0]);
        }
      }
      setPatientToDelete(null);
      fetchRoster();
    } catch (err) {
      console.error('Error deleting patient:', err);
    } finally {
      setIsDeletingPatient(false);
    }
  };

  // Strictly decoupled patient roster list (never contains doctor records)
  const filteredRoster = roster.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
    p.blood_group.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
    (p.relationship && p.relationship.toLowerCase().includes(searchTerm.toLowerCase().trim()))
  );

  // Strictly registered doctors filtering
  const registeredDoctorsOnly = doctors.filter(doc => 
    Boolean(doc.user_id && doc.full_name && (doc.role === 'doctor' || doc.role === undefined || doc.specialty))
  );

  // Side Panel filtered registered doctors
  const filteredSideDoctors = registeredDoctorsOnly.filter(doc => {
    const query = sideDoctorSearch.toLowerCase().trim();
    if (!query) return true;
    return (
      doc.full_name.toLowerCase().includes(query) ||
      (doc.specialty && doc.specialty.toLowerCase().includes(query)) ||
      (doc.department && doc.department.toLowerCase().includes(query)) ||
      (doc.email && doc.email.toLowerCase().includes(query))
    );
  });

  // Doctor Directory Tab filtered doctors
  const filteredDirectoryDoctors = registeredDoctorsOnly.filter(doc => {
    const matchesSearch = 
      doc.full_name.toLowerCase().includes(doctorSearchTerm.toLowerCase().trim()) ||
      (doc.email && doc.email.toLowerCase().includes(doctorSearchTerm.toLowerCase().trim())) ||
      (doc.department && doc.department.toLowerCase().includes(doctorSearchTerm.toLowerCase().trim())) ||
      (doc.specialty && doc.specialty.toLowerCase().includes(doctorSearchTerm.toLowerCase().trim()));

    const matchesSpecialty = 
      selectedSpecialty === 'ALL' || 
      (doc.specialty && doc.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase()));

    return matchesSearch && matchesSpecialty;
  });

  // Extract distinct specialties for quick filters
  const specialtiesList = ['ALL', ...Array.from(new Set(registeredDoctorsOnly.map(d => d.specialty || 'General Physician')))];

  // Handle Physician Refill Authorization
  const handleApproveRefill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingMed) return;

    setApprovalLoading(true);
    try {
      const res = await fetch('/api/doctor/approve-refill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_id: approvingMed.medicine_id,
          approved_quantity: Number(approveQuantity) || 30,
          doctor_notes: approvalNotes,
          doctor_name: doctorName
        })
      });

      if (res.ok) {
        setApprovalSuccess(`Refill approved! Added ${approveQuantity} units to ${approvingMed.name} supply.`);
        if (activePatient) {
          onRefreshData(activePatient.patient_id);
        }
        fetchRoster();
        setTimeout(() => {
          setApprovingMed(null);
          setApprovalSuccess('');
        }, 1200);
      }
    } catch (err) {
      console.error('Error approving refill:', err);
    } finally {
      setApprovalLoading(false);
    }
  };

  // Pending refills count across active patients
  const pendingRefillsList = medicines.filter(m => m.refill_requested || m.refill_status === 'REFILL_REQUESTED');

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Clinician Profile Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start sm:items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 shadow-inner flex-shrink-0">
              <Stethoscope className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{doctorName}</h1>
                <span className="bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Attending Physician
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Clinical Prescription Manager • Multi-Patient Adherence Oversight • Refill Authorization Hub
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 bg-slate-950/60 p-2.5 rounded-2xl border border-slate-800 text-xs">
            <div className="px-3 py-1.5 text-center">
              <p className="text-slate-400 text-[10px] uppercase font-bold">Total Patients</p>
              <p className="text-lg font-extrabold text-teal-400">{roster.length}</p>
            </div>
            <div className="w-px h-8 bg-slate-800"></div>
            <div className="px-3 py-1.5 text-center">
              <p className="text-slate-400 text-[10px] uppercase font-bold">Registered Doctors</p>
              <p className="text-lg font-extrabold text-indigo-400">{registeredDoctorsOnly.length}</p>
            </div>
            <div className="w-px h-8 bg-slate-800"></div>
            <div className="px-3 py-1.5 text-center">
              <p className="text-slate-400 text-[10px] uppercase font-bold">Pending Refills</p>
              <p className={`text-lg font-extrabold ${pendingRefillsList.length > 0 ? 'text-amber-400 animate-pulse' : 'text-emerald-400'}`}>
                {pendingRefillsList.length}
              </p>
            </div>
            <div className="w-px h-8 bg-slate-800"></div>
            <div className="px-3 py-1.5 text-center">
              <p className="text-slate-400 text-[10px] uppercase font-bold">Active Chart</p>
              <p className="text-sm font-bold text-teal-300 truncate max-w-[100px]">
                {activePatient?.name || 'None'}
              </p>
            </div>
          </div>
        </div>

        {/* Doctor Action Navigation Tabs */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveDoctorTab('roster')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              activeDoctorTab === 'roster'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Clinical Patients Roster ({roster.length})</span>
          </button>

          <button
            onClick={() => setActiveDoctorTab('doctors')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              activeDoctorTab === 'doctors'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Stethoscope className="h-4 w-4" />
            <span>Hospital Doctors Directory ({registeredDoctorsOnly.length})</span>
          </button>

          <button
            onClick={() => setActiveDoctorTab('prescribe')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              activeDoctorTab === 'prescribe'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Write & Issue Prescription</span>
          </button>

          <button
            onClick={() => setActiveDoctorTab('refills')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 relative ${
              activeDoctorTab === 'refills'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Send className="h-4 w-4" />
            <span>Authorize Refills</span>
            {pendingRefillsList.length > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                {pendingRefillsList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveDoctorTab('analytics')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              activeDoctorTab === 'analytics'
                ? 'bg-teal-600 text-white shadow-md'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Adherence & ML Risk Center</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* TAB 1: CLINICAL PATIENT ROSTER (WITH REGISTERED DOCTORS SIDE PANEL) */}
      {/* ---------------------------------------------------- */}
      {activeDoctorTab === 'roster' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            
            {/* Main Patients List (3 Cols) - Completely Decoupled from Doctor Profiles */}
            <div className="lg:col-span-3 space-y-5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filter patient roster by name, blood group, or relationship..."
                    className="w-full bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-850 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <button
                    type="button"
                    onClick={() => setShowAddPatientModal(true)}
                    className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs transition shadow-md shadow-teal-600/20 flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Patient</span>
                  </button>
                  <span className="bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800/40 font-bold">
                    🧑‍🤝‍🧑 {filteredRoster.length} Active Patients
                  </span>
                </div>
              </div>

              {filteredRoster.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 border border-slate-200 dark:border-slate-800 text-center space-y-3">
                  <Users className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">No Patient Records Found</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    There are no patient profiles matching your search. Registered patient profiles and their medication compliance charts appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredRoster.map((patient) => {
                    const isSelected = activePatient?.patient_id === patient.patient_id;

                    return (
                      <div
                        key={patient.patient_id}
                        onClick={() => onSelectPatient(patient)}
                        className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border transition-all cursor-pointer shadow-sm relative space-y-4 hover:shadow-md ${
                          isSelected
                            ? 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/10 dark:bg-teal-950/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-700'
                        }`}
                      >
                        {/* Active Badge */}
                        {isSelected && (
                          <span className="absolute top-4 right-4 bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                            <Check className="h-3 w-3" /> Active Chart
                          </span>
                        )}

                        {/* Patient Header Details */}
                        <div className="flex items-start space-x-3">
                          <div className="w-12 h-12 rounded-xl bg-teal-100/60 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/50 flex items-center justify-center font-bold text-teal-800 dark:text-teal-300 text-sm">
                            {patient.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-slate-900 dark:text-white text-base">{patient.name}</h3>
                              <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                Patient
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {patient.age} yrs • {patient.gender} • Blood Group: <strong className="text-slate-800 dark:text-slate-200">{patient.blood_group}</strong>
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                              Caregiver: <span className="text-slate-600 dark:text-slate-300 font-medium">{patient.caregiver_name}</span>
                            </p>
                          </div>
                        </div>

                        {/* Clinical Indicators */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase">Adherence Score</p>
                            <p className={`font-extrabold text-sm ${
                              patient.adherence_score >= 80 ? 'text-emerald-600 dark:text-emerald-400' : patient.adherence_score >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {patient.adherence_score}%
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase">Active Rx Drugs</p>
                            <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{patient.active_medicines_count} meds</p>
                          </div>
                        </div>

                        {/* Flags: Low Stock or Refill Request */}
                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          {patient.has_pending_refill && (
                            <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-amber-700 dark:text-amber-400" /> Refill Requested
                            </span>
                          )}
                          {patient.has_low_stock && !patient.has_pending_refill && (
                            <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50 px-2 py-0.5 rounded-md font-semibold">
                              Low Supply Alert
                            </span>
                          )}
                          {patient.missed_doses_count > 0 && (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md font-semibold">
                              {patient.missed_doses_count} missed dose{patient.missed_doses_count === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectPatient(patient);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-teal-100 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 px-2.5 py-1.5 rounded-lg transition"
                            >
                              <span>Inspect Chart</span>
                              <ChevronRight className="h-3 w-3" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectPatient(patient);
                                setRxTargetPatientId(patient.patient_id);
                                setActiveDoctorTab('prescribe');
                              }}
                              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2.5 py-1.5 rounded-lg transition"
                              title="Write prescription & timings for this patient"
                            >
                              <FileText className="h-3 w-3" />
                              <span>Prescribe (औषध द्या)</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPatientToDelete(patient);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg border border-transparent hover:border-rose-200 dark:hover:border-rose-800/50 transition"
                            title={`Delete ${patient.name}'s chart`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Side Column: Dedicated Registered Doctors Directory (Decoupled from Patients) */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-xl">
                      <Stethoscope className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">Registered Doctors</h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-400">Hospital Medical Staff ({registeredDoctorsOnly.length})</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveDoctorTab('doctors')}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold hover:underline"
                  >
                    View All →
                  </button>
                </div>

                {/* Quick Search for Registered Doctors in Side Panel */}
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={sideDoctorSearch}
                    onChange={(e) => setSideDoctorSearch(e.target.value)}
                    placeholder="Filter doctors by name or specialty..."
                    className="w-full bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 pl-8 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-850 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                  />
                  {sideDoctorSearch && (
                    <button
                      type="button"
                      onClick={() => setSideDoctorSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Filtered Registered Doctors List */}
                <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                  {filteredSideDoctors.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 space-y-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                      <Stethoscope className="h-6 w-6 text-slate-300 dark:text-slate-600 mx-auto" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">No registered doctors match filter</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-400">Only verified physician accounts are shown</p>
                    </div>
                  ) : (
                    filteredSideDoctors.map((doc) => (
                      <div
                        key={doc.user_id}
                        className="bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-700/60 hover:border-indigo-200 dark:hover:border-indigo-800/40 transition space-y-2 group shadow-none hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                              {doc.full_name.replace(/^(Dr\.\s*|Dr\s*)/i, '').charAt(0) || 'D'}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-900 dark:group-hover:text-indigo-200 transition">
                                  {doc.full_name.startsWith('Dr.') ? doc.full_name : `Dr. ${doc.full_name}`}
                                </span>
                              </div>
                              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
                                {doc.specialty || 'General Physician'}
                              </p>
                            </div>
                          </div>
                          <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                          </span>
                        </div>

                        <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                          <span className="truncate max-w-[140px]" title={doc.email}>
                            ✉️ {doc.email}
                          </span>
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                            MD / Physician
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Clinical Access Decoupling</span>
                  </div>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-tight">
                    Doctor records represent licensed hospital staff. Patient medical charts and adherence records remain fully separated in the clinical roster.
                  </p>
                </div>
              </div>
            </div>

          </div>

          {/* Delete Patient Confirmation Modal */}
          {patientToDelete && (
            <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                  <div className="p-3 bg-rose-100 dark:bg-rose-950/60 rounded-2xl border border-transparent dark:border-rose-800/40">
                    <Trash2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Delete Patient Profile</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Permanently remove clinical chart</p>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1 text-slate-700 dark:text-slate-300">
                  <p>
                    Are you sure you want to delete <strong className="text-slate-900 dark:text-white">{patientToDelete.name}</strong> ({patientToDelete.age} yrs, Blood Group: {patientToDelete.blood_group})?
                  </p>
                  <p className="text-rose-600 dark:text-rose-400 font-semibold text-[11px] mt-1">
                    ⚠️ This will permanently erase all active medication schedules, dose compliance logs, and clinical records for this patient.
                  </p>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    disabled={isDeletingPatient}
                    onClick={() => setPatientToDelete(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingPatient}
                    onClick={handleConfirmDeletePatient}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-md shadow-rose-600/20 flex items-center gap-2"
                  >
                    {isDeletingPatient ? (
                      <span>Deleting...</span>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        <span>Confirm & Delete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 2: DEDICATED HOSPITAL DOCTORS DIRECTORY */}
      {/* ---------------------------------------------------- */}
      {activeDoctorTab === 'doctors' && (
        <div className="space-y-6">
          {/* Doctors Directory Top Bar with Search and Filters */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={doctorSearchTerm}
                  onChange={(e) => setDoctorSearchTerm(e.target.value)}
                  placeholder="Search registered doctors by name, email, specialty, or department..."
                  className="w-full bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-850 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
                {doctorSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setDoctorSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Doctor</span>
                </button>
                <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/40 font-bold flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  {filteredDirectoryDoctors.length} Registered Doctors
                </span>
              </div>
            </div>

            {/* Specialty Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-slate-400 dark:text-slate-400 font-semibold text-[11px] mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Filter Specialty:
              </span>
              {specialtiesList.map((spec) => (
                <button
                  key={spec}
                  onClick={() => setSelectedSpecialty(spec)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    selectedSpecialty === spec
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {spec === 'ALL' ? 'All Specialties' : spec}
                </button>
              ))}
            </div>
          </div>

          {filteredDirectoryDoctors.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <Stethoscope className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-white">No Registered Doctors Found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                No verified physician accounts match your search filters. Create new doctor accounts via the registration interface to add them here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDirectoryDoctors.map((doc) => (
                <div
                  key={doc.user_id}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition relative group"
                >
                  <div className="flex items-start space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 flex-shrink-0 font-extrabold text-sm">
                      <Stethoscope className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                          {doc.full_name.startsWith('Dr.') ? doc.full_name : `Dr. ${doc.full_name}`}
                        </h3>
                        <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> On-Duty
                        </span>
                      </div>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                        {doc.specialty || 'Attending Physician'}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-slate-400" />
                        {doc.department || 'Clinical Outpatient Department'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1.5">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400 dark:text-slate-400">Email:</span>
                      <strong className="text-slate-800 dark:text-slate-200 truncate max-w-[170px]">{doc.email}</strong>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400 dark:text-slate-400">Clinical Role:</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">Physician / Doctor</span>
                    </div>
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span className="text-slate-400 dark:text-slate-400">Rx Authorization:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" /> Full Authority
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                    <button
                      onClick={() => setActiveDoctorTab('prescribe')}
                      className="flex-1 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Issue Prescription</span>
                    </button>

                    <a
                      href={`mailto:${doc.email}`}
                      className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition"
                      title={`Send email to ${doc.full_name}`}
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: WRITE & ISSUE OFFICIAL DIGITAL PRESCRIPTION */}
      {/* ---------------------------------------------------- */}
      {activeDoctorTab === 'prescribe' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 rounded-2xl">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Issue Digital Prescription & Schedule</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Prescribe medicines, exact daily timings, meal directives, and precautions. Updates patient account automatically.
                  </p>
                </div>
              </div>
              <span className="text-[11px] bg-teal-50 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-700 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                Instant Patient Sync
              </span>
            </div>

            {rxSuccessMsg && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                <span className="font-medium leading-relaxed">{rxSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleIssuePrescription} className="space-y-5 text-xs">
              {/* 1. Target Patient Selector */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                <label className="block font-bold text-slate-900 dark:text-white">
                  1. Select Target Patient (रुग्ण निवडा) *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <select
                    value={rxTargetPatientId}
                    onChange={(e) => setRxTargetPatientId(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none font-semibold focus:border-teal-500"
                  >
                    {roster.map(p => (
                      <option key={p.patient_id} value={p.patient_id}>
                        {p.name} (Age: {p.age} • Blood: {p.blood_group || 'O+'})
                      </option>
                    ))}
                  </select>

                  {roster.find(p => p.patient_id === Number(rxTargetPatientId)) && (
                    <div className="flex items-center space-x-2 bg-white dark:bg-slate-850 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="font-bold text-teal-600 dark:text-teal-400">Selected Chart:</span>
                      <span className="truncate">{roster.find(p => p.patient_id === Number(rxTargetPatientId))?.name}</span>
                      <span className="text-slate-400">({roster.find(p => p.patient_id === Number(rxTargetPatientId))?.relationship || 'Self'})</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Fast Common Medicine Presets */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Quick Select Common Medicine (नेहमीची औषधे):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: 'Metformin 500mg', dose: '500 mg (1 Tab)', form: 'Tablet', meal: 'AFTER_MEAL' as const, instr: 'Take 1 tablet with water immediately after breakfast. Do not skip.', prec: 'Maintain low sugar diet, avoid alcohol, check HbA1c every 3 months.' },
                    { name: 'Telmisartan 40mg', dose: '40 mg (1 Tab)', form: 'Tablet', meal: 'AFTER_MEAL' as const, instr: 'Take 1 tablet after morning breakfast with a glass of water.', prec: 'Monitor blood pressure weekly, reduce dietary salt intake.' },
                    { name: 'Pantoprazole 40mg', dose: '40 mg (1 Tab)', form: 'Tablet', meal: 'EMPTY_STOMACH' as const, instr: 'Take on empty stomach 30 minutes before morning tea/breakfast.', prec: 'Avoid spicy, oily, and sour food during acidity flare-up.' },
                    { name: 'Amoxicillin 500mg', dose: '500 mg (1 Cap)', form: 'Capsule', meal: 'AFTER_MEAL' as const, instr: 'Take 1 capsule twice daily after meals. Complete full 5-day course.', prec: 'Drink plenty of water. Do not stop midway even if feeling better.' },
                    { name: 'Paracetamol 650mg', dose: '650 mg (1 Tab)', form: 'Tablet', meal: 'AFTER_MEAL' as const, instr: 'Take 1 tablet after meals when fever or body pain is present.', prec: 'Do not exceed 3 tablets in 24 hours. Stay well hydrated.' },
                    { name: 'Atorvastatin 20mg', dose: '20 mg (1 Tab)', form: 'Tablet', meal: 'BEDTIME' as const, instr: 'Take 1 tablet at night before bedtime with water.', prec: 'Avoid deep fried food and high cholesterol foods.' },
                    { name: 'Thyroxine 50mcg', dose: '50 mcg (1 Tab)', form: 'Tablet', meal: 'EMPTY_STOMACH' as const, instr: 'Take early morning on empty stomach with warm water 45 min before food.', prec: 'Do not consume milk or calcium supplements within 2 hours.' },
                    { name: 'Cetirizine 10mg', dose: '10 mg (1 Tab)', form: 'Tablet', meal: 'BEDTIME' as const, instr: 'Take 1 tablet at night before sleep for allergy and cold relief.', prec: 'May cause mild drowsiness. Avoid driving immediately after dose.' }
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectMedTemplate(item.name, item.dose, item.form, item.meal, item.instr, item.prec)}
                      className="text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/60 hover:text-teal-700 dark:hover:text-teal-300 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg transition"
                    >
                      + {item.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Medicine Name & Dosage Specification */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Medication Name (औषधाचे नाव) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Metformin 500mg, Telmisartan 40mg"
                    value={rxMedName}
                    onChange={(e) => setRxMedName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none focus:border-teal-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Dosage Unit (प्रमाण) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1 Tablet, 500mg, 5ml"
                    value={rxDosage}
                    onChange={(e) => setRxDosage(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none focus:border-teal-500 font-bold"
                  />
                </div>
              </div>

              {/* 4. Form & Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Form (प्रकार)</label>
                  <select
                    value={rxForm}
                    onChange={(e) => setRxForm(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                  >
                    <option value="Tablet">Tablet (गोळी)</option>
                    <option value="Capsule">Capsule (कॅप्सुल)</option>
                    <option value="Syrup">Syrup (सिरप / द्रव)</option>
                    <option value="Injection">Injection (इंजेक्शन)</option>
                    <option value="Drops">Drops (थेंब)</option>
                    <option value="Inhaler">Inhaler (इन्हेलर)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Total Supply Quantity (एकूण संख्या/दिवस)</label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={rxQuantity}
                    onChange={(e) => setRxQuantity(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none font-bold"
                  />
                </div>
              </div>

              {/* 5. Food & Meal Timing Directive */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                <label className="block font-bold text-slate-900 dark:text-white">
                  🍽️ Meal & Food Timing Directive (जेवणाची वेळ व पथ्य) *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'AFTER_MEAL', label: '🍽️ After Food / जेवणा नंतर', desc: 'जेवण झाल्यावर 15-20 मिनिटांनी' },
                    { id: 'BEFORE_MEAL', label: '🥣 Before Food / जेवणा आधी', desc: 'जेवणापूर्वी 30 मिनिटे' },
                    { id: 'EMPTY_STOMACH', label: '💧 Empty Stomach / उपाशी पोटी', desc: 'सकाळी उठल्यावर उपाशी पोटी' },
                    { id: 'WITH_MEAL', label: '🥗 With Meal / जेवणा सोबत', desc: 'जेवताना मध्येच' },
                    { id: 'BEDTIME', label: '🌙 Before Bed / झोपण्यापूर्वी', desc: 'रात्री झोपण्याआधी' },
                    { id: 'ANYTIME', label: '⏰ Anytime / कधीही', desc: 'भरपूर पाण्यासोबत' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setRxMealTiming(m.id as any)}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        rxMealTiming === m.id
                          ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                      }`}
                    >
                      <span className="font-bold text-[11px]">{m.label}</span>
                      <span className={`text-[10px] mt-0.5 ${rxMealTiming === m.id ? 'text-teal-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        {m.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 6. Daily Dose Frequency & Time Slots */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="block font-bold text-slate-900 dark:text-white">
                    ⏰ Daily Dose Timings (दिवसातून किती वेळा व कोणत्या वेळी घ्यायचे) *
                  </label>
                  <div className="flex items-center gap-1.5">
                    {[
                      { id: 'ONCE', label: '1x Daily (1 वेळ)' },
                      { id: 'TWICE', label: '2x Daily (2 वेळा)' },
                      { id: 'THRICE', label: '3x Daily (3 वेळा)' }
                    ].map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleFrequencyPresetChange(preset.id as any)}
                        className={`px-2.5 py-1 text-[11px] rounded-lg font-bold transition ${
                          rxFrequencyPreset === preset.id
                            ? 'bg-teal-600 text-white'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {rxSchedulesList.map((slot, index) => (
                    <div key={index} className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center text-xs flex-shrink-0">
                        {index + 1}
                      </div>

                      <input
                        type="text"
                        placeholder="Time (e.g. 08:00 AM)"
                        value={slot.time}
                        onChange={(e) => handleUpdateTimeSlot(index, 'time', e.target.value)}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white p-2 rounded-lg text-xs font-bold w-32 outline-none focus:border-teal-500"
                      />

                      <input
                        type="text"
                        placeholder="Label (e.g. Morning / सकाळ)"
                        value={slot.label}
                        onChange={(e) => handleUpdateTimeSlot(index, 'label', e.target.value)}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white p-2 rounded-lg text-xs font-medium flex-1 outline-none focus:border-teal-500"
                      />

                      {rxSchedulesList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTimeSlot(index)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition"
                          title="Remove time slot"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddTimeSlot}
                    className="w-full py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-teal-600 dark:text-teal-400 border border-dashed border-teal-300 dark:border-teal-700/80 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add Custom Time Slot (वेळेची भर घाला)</span>
                  </button>
                </div>
              </div>

              {/* 7. Clinical Instructions & Meal Directives */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  📋 Clinical Instructions & Advice (डॉक्टरांच्या वैद्यकीय सूचना) *
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Take 1 tablet with warm water after breakfast. Do not skip evening dose."
                  value={rxInstructions}
                  onChange={(e) => setRxInstructions(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none focus:border-teal-500 font-medium leading-relaxed"
                ></textarea>
                <div className="flex flex-wrap gap-1">
                  {[
                    'सकाळी नाश्त्यानंतर कोमट पाण्यासोबत 1 गोळी घ्यावी.',
                    'औषध वेळेवर घ्यावे, नागा टाळावा.',
                    'सकाळी उपाशी पोटी चहाच्या 30 मिनिटे आधी घ्यावे.',
                    'दर आठवड्याला बीपी व साखर तपासावी.',
                    '14 दिवसांचा कोर्स पूर्ण करावा, मध्येच बंद करू नये.'
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRxInstructions(chip)}
                      className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 transition"
                    >
                      "{chip}"
                    </button>
                  ))}
                </div>
              </div>

              {/* 8. Special Precautions & Warnings */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 dark:text-slate-300">
                  ⚠️ Special Precautions & Diet Rules (खबरदारी व पथ्य)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Drink 2.5 to 3 liters of water daily. Avoid oily and spicy foods during medication course."
                  value={rxPrecautions}
                  onChange={(e) => setRxPrecautions(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none focus:border-teal-500 font-medium leading-relaxed"
                ></textarea>
                <div className="flex flex-wrap gap-1">
                  {[
                    'दिवसाला भरपूर (2 ते 3 लिटर) पाणी प्यावे.',
                    'तेलकट, तिखट व मसालेदार पदार्थ पूर्णपणे टाळावेत.',
                    'दुग्धजन्य पदार्थ 1 तास आधी/नंतर टाळावेत.',
                    'काही त्रास किंवा ऍलर्जी झाल्यास त्वरित डॉक्टरांशी संपर्क साधावा.'
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRxPrecautions(chip)}
                      className="text-[10px] bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 transition"
                    >
                      "{chip}"
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Prescription will be signed as <strong className="text-slate-900 dark:text-white">{doctorName}</strong>.
                </div>
                <button
                  type="submit"
                  disabled={submittingRx}
                  className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 transition flex items-center space-x-2 text-xs"
                >
                  {submittingRx ? (
                    <span>Signing & Transmitting Rx to Patient...</span>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      <span>Issue & Transmit Prescription to Patient (रुग्णास पाठवा)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Active Patient Rx History */}
          <div className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 transition-colors">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              Patient Rx History ({prescriptions.length})
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Archived prescriptions issued to <strong className="text-slate-800 dark:text-slate-200">{activePatient?.name}</strong>.
            </p>

            <div className="space-y-3 overflow-y-auto max-h-96">
              {prescriptions.map((rx) => (
                <div key={rx.prescription_id} className="bg-white dark:bg-slate-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 relative group">
                  <div className="flex items-center justify-between font-bold text-slate-800 dark:text-white pr-6">
                    <span>{rx.doctor_name}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-400 font-normal">{rx.prescription_date}</span>
                  </div>
                  {onDeletePrescription && (
                    <button
                      type="button"
                      onClick={() => onDeletePrescription(rx.prescription_id)}
                      className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                      title="Delete prescription record"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] italic">"{rx.notes}"</p>
                  <div className="pt-1 flex flex-wrap gap-1">
                    {rx.medicines_extracted.map((m, idx) => (
                      <span key={idx} className="bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/40 px-2 py-0.5 rounded text-[10px] font-semibold">
                        {m.name} ({m.dosage})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {prescriptions.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-6">No previous prescriptions recorded.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 3: REFILL AUTHORIZATION HUB */}
      {/* ---------------------------------------------------- */}
      {activeDoctorTab === 'refills' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Send className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  Prescription Refill Authorizations
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Review and authorize renewal requests submitted by patients and caregivers.
                </p>
              </div>
            </div>

            {medicines.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold bg-slate-50/70 dark:bg-slate-800/50">
                      <th className="py-3 px-4 rounded-l-lg">Medication & Dosage</th>
                      <th className="py-3 px-4">Current Stock</th>
                      <th className="py-3 px-4">Refill Status</th>
                      <th className="py-3 px-4">Requested On</th>
                      <th className="py-3 px-4 text-right rounded-r-lg">Physician Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {medicines.map((med) => {
                      const isPending = med.refill_requested || med.refill_status === 'REFILL_REQUESTED';
                      const isLow = med.remaining_quantity <= med.refill_threshold;

                      return (
                        <tr key={med.medicine_id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${isPending ? 'bg-amber-50/20 dark:bg-amber-950/20' : ''}`}>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-2.5">
                              <div className="p-2 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 rounded-lg">
                                <Pill className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 dark:text-white text-sm">{med.name}</p>
                                <p className="text-slate-500 dark:text-slate-400 text-[11px]">{med.dosage} • {med.form}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`font-extrabold ${isLow ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                              {med.remaining_quantity} / {med.total_quantity} units
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {isPending ? (
                              <span className="inline-flex items-center gap-1.5 bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 px-2.5 py-1 rounded-full text-[11px] font-bold animate-pulse">
                                <AlertTriangle className="h-3 w-3 text-amber-700 dark:text-amber-400" /> Pending Approval
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> Regular Supply
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                            {med.last_refill_requested_at
                              ? new Date(med.last_refill_requested_at).toLocaleDateString()
                              : 'Not requested'}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setApprovingMed(med);
                                setApproveQuantity('30');
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm ${
                                isPending
                                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-md transform active:scale-95'
                                  : 'bg-slate-900 dark:bg-teal-600 hover:bg-teal-700 dark:hover:bg-teal-500 text-white'
                              }`}
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>{isPending ? 'Authorize Refill' : 'Top-up Supply'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-400 text-center py-8">No medications found for this patient.</p>
            )}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* TAB 4: CLINICAL ADHERENCE & ML RISK ANALYTICS */}
      {/* ---------------------------------------------------- */}
      {activeDoctorTab === 'analytics' && (
        <div className="space-y-6">
          {/* Active Patient Compliance Header & Hard Copy Action */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-black text-base border border-teal-200 dark:border-teal-800/50 flex-shrink-0">
                {activePatient ? activePatient.name.charAt(0).toUpperCase() : 'P'}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
                    {activePatient ? activePatient.name : 'Select Patient'}
                  </h3>
                  {activePatient && (
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-0.5 rounded-full font-bold">
                      Age: {activePatient.age} • Blood: {activePatient.blood_group || 'O+'}
                    </span>
                  )}
                  <span className="text-xs bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/50 px-2.5 py-0.5 rounded-full font-bold">
                    Adherence: {adherenceStats.adherence_score}% ({adherenceStats.status_label})
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Logged Doses: <strong className="text-slate-800 dark:text-slate-200">{doseRecords.length} records</strong> • Verified Taken: <strong className="text-emerald-700 dark:text-emerald-400">{doseRecords.filter(r => r.status === 'TAKEN' || r.status === 'TAKEN_LATE').length}</strong> • Missed: <strong className="text-rose-700 dark:text-rose-400">{doseRecords.filter(r => r.status === 'MISSED' || r.status === 'SKIPPED').length}</strong>
                </p>
              </div>
            </div>

            {activePatient && (
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(true)}
                className="bg-slate-900 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-md flex items-center gap-2 self-start md:self-center active:scale-95"
              >
                <Printer className="h-4 w-4 text-teal-300" />
                <span>Print Official Compliance Audit (Hard Copy)</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Missed Dose Cause Analysis */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-colors">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                Missed Dose Reasons & Non-Adherence Logs
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Patient-reported explanations for omitted doses to assist clinical decision making.
              </p>

              <div className="space-y-3 overflow-y-auto max-h-80">
                {doseRecords
                  .filter(d => d.status === 'MISSED' || d.status === 'SKIPPED')
                  .map((record) => (
                    <div key={record.dose_id} className="animate-row-fade table-row-transition p-3 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-50/80 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-800/40 rounded-xl text-xs space-y-1 transition-all duration-300">
                      <div className="flex items-center justify-between font-bold text-rose-900 dark:text-rose-300">
                        <span>{record.medicine_name} ({record.dosage})</span>
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-normal">
                          {new Date(record.logged_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-rose-800 dark:text-rose-300">
                        Reason: <em>"{record.missed_reason || 'No specific explanation provided by patient.'}"</em>
                      </p>
                      {record.snooze_count > 0 && (
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Snoozed {record.snooze_count} times ({record.snooze_minutes} mins) before omission.
                        </p>
                      )}
                    </div>
                  ))}
                {doseRecords.filter(d => d.status === 'MISSED' || d.status === 'SKIPPED').length === 0 && (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-xs text-slate-400 dark:text-slate-400">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 dark:text-slate-300">Zero Missed Doses Logged</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-400">Patient has 100% reported adherence in this cycle.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Clinical Action Directives */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-sm space-y-4">
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-teal-400" />
                Physician AI Recommendation Protocol
              </h3>
              <p className="text-xs text-slate-400">
                Automated clinical insights based on dosage timing adherence patterns.
              </p>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-teal-400 mt-1.5 flex-shrink-0"></span>
                  <div>
                    <p className="font-bold text-slate-200">Refill Lead Time Assurance</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Maintain at least 7-day buffer on antihypertensive medications to avoid rebound blood pressure episodes.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0"></span>
                  <div>
                    <p className="font-bold text-slate-200">Caregiver Escalation Check</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Ensure assigned caregiver receives automated SMS triggers if 2 consecutive morning doses are skipped.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-start gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 flex-shrink-0"></span>
                  <div>
                    <p className="font-bold text-slate-200">Voice Synthesis Protocol for Geriatric Regimens</p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      For seniors above 65, active speech reminders increase confirmed intake rate by ~34%.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* MODAL: DOCTOR REFILL APPROVAL */}
      {/* ---------------------------------------------------- */}
      {approvingMed && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 rounded-xl">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">Physician Refill Authorization</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{approvingMed.name} ({approvingMed.dosage})</p>
                </div>
              </div>
              <button
                onClick={() => setApprovingMed(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg text-xs"
              >
                ✕
              </button>
            </div>

            {approvalSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                {approvalSuccess}
              </div>
            )}

            <form onSubmit={handleApproveRefill} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Authorized Units Supply</label>
                <div className="grid grid-cols-3 gap-2">
                  {['30', '60', '90'].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setApproveQuantity(qty)}
                      className={`py-2 rounded-xl border text-xs font-bold transition ${
                        approveQuantity === qty
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      +{qty} Units
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Physician Authorization Notes</label>
                <textarea
                  rows={2}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none focus:border-teal-500"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setApprovingMed(null)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={approvalLoading}
                  className="px-5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold rounded-xl hover:from-teal-700 hover:to-emerald-700 shadow-md"
                >
                  {approvalLoading ? 'Authorizing...' : 'Authorize & Replenish Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print-Friendly Hard-Copy Compliance Audit Modal */}
      {activePatient && (
        <PrintableComplianceAudit
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          patient={activePatient}
          medicines={medicines}
          doseRecords={doseRecords}
          adherenceStats={adherenceStats}
          mlPrediction={mlPrediction}
          caregivers={caregivers}
          doctorName={doctorName}
        />
      )}

      {/* Manual Add Patient Modal */}
      {showAddPatientModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 rounded-2xl">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Add New Patient</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Register a patient profile manually</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPatientModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {patientCreateSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>{patientCreateSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddPatientSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name / Patient Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  placeholder="e.g. Nikita Chaudhari, Rohan Sharma"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Category / Relationship</label>
                  <select
                    value={newPatientRel}
                    onChange={(e) => setNewPatientRel(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                  >
                    <option value="Patient">Outpatient (General)</option>
                    <option value="Self">Self / Primary</option>
                    <option value="Parent">Parent / Senior</option>
                    <option value="Child">Pediatric / Child</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Inpatient">Inpatient Ward</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Age (Years)</label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={newPatientAge}
                    onChange={(e) => setNewPatientAge(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Gender</label>
                  <select
                    value={newPatientGender}
                    onChange={(e) => setNewPatientGender(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
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
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
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

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPatientModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingPatientLoading}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>{addingPatientLoading ? 'Adding...' : 'Add Patient Record'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Add Doctor Modal */}
      {showAddDoctorModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Register Physician / Doctor</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Add a new licensed medical doctor to hospital staff</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDoctorModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {doctorCreateSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>{doctorCreateSuccess}</span>
              </div>
            )}

            <form onSubmit={handleAddDoctorSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Doctor Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newDoctorName}
                  onChange={(e) => setNewDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Rajesh Kulkarni or Sunil Deshmukh"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address (Login Username) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newDoctorEmail}
                  onChange={(e) => setNewDoctorEmail(e.target.value)}
                  placeholder="e.g. dr.sunil@medicare.org"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Temporary Password</label>
                <input
                  type="text"
                  value={newDoctorPass}
                  onChange={(e) => setNewDoctorPass(e.target.value)}
                  placeholder="e.g. doctor123"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Medical Specialty</label>
                  <select
                    value={newDoctorSpecialty}
                    onChange={(e) => setNewDoctorSpecialty(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                  >
                    <option value="General Physician / Internal Medicine">General Physician / Internal Medicine</option>
                    <option value="Cardiologist">Cardiologist</option>
                    <option value="Endocrinologist & Diabetologist">Endocrinologist & Diabetologist</option>
                    <option value="Neurologist">Neurologist</option>
                    <option value="Pediatrician">Pediatrician</option>
                    <option value="Geriatric Medicine">Geriatric Medicine</option>
                    <option value="Pulmonologist">Pulmonologist</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Hospital Department</label>
                  <input
                    type="text"
                    value={newDoctorDept}
                    onChange={(e) => setNewDoctorDept(e.target.value)}
                    placeholder="e.g. OPD & Clinical Care"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingDoctorLoading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  <span>{addingDoctorLoading ? 'Registering...' : 'Register Doctor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
