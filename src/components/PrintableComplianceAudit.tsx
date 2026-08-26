import React, { useState, useRef } from 'react';
import {
  Printer,
  X,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Pill,
  ShieldCheck,
  User,
  Calendar,
  Filter,
  Check,
  Download,
  Stethoscope,
  Info
} from 'lucide-react';
import { Patient, Medicine, DoseRecord, AdherenceStats, MLRiskPrediction, Caregiver } from '../types';

interface PrintableComplianceAuditProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  medicines: Medicine[];
  doseRecords: DoseRecord[];
  adherenceStats: AdherenceStats;
  mlPrediction: MLRiskPrediction | null;
  caregivers?: Caregiver[];
  doctorName?: string;
}

export const PrintableComplianceAudit: React.FC<PrintableComplianceAuditProps> = ({
  isOpen,
  onClose,
  patient,
  medicines,
  doseRecords,
  adherenceStats,
  mlPrediction,
  caregivers = [],
  doctorName = 'Dr. Attending Physician, MD'
}) => {
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'TAKEN' | 'MISSED'>('ALL');
  const [complianceImpactFilter, setComplianceImpactFilter] = useState<'ALL' | 'POSITIVE' | 'HIGH_IMPACT' | 'DELAYED'>('ALL');
  const [includeRegimen, setIncludeRegimen] = useState(true);
  const [includeSignatures, setIncludeSignatures] = useState(true);
  const [selectedMedFilter, setSelectedMedFilter] = useState<string>('ALL');

  if (!isOpen) return null;

  // Filter records based on user choices
  const filteredRecords = doseRecords.filter((r) => {
    if (selectedMedFilter !== 'ALL' && r.medicine_name !== selectedMedFilter) {
      return false;
    }
    // Status filter
    if (filterStatus === 'TAKEN' && !(r.status === 'TAKEN' || r.status === 'TAKEN_LATE')) {
      return false;
    }
    if (filterStatus === 'MISSED' && !(r.status === 'MISSED' || r.status === 'SKIPPED')) {
      return false;
    }
    // Compliance Impact filter
    if (complianceImpactFilter === 'POSITIVE' && r.status !== 'TAKEN') {
      return false;
    }
    if (complianceImpactFilter === 'HIGH_IMPACT' && !(r.status === 'MISSED' || r.status === 'SKIPPED')) {
      return false;
    }
    if (complianceImpactFilter === 'DELAYED' && r.status !== 'TAKEN_LATE') {
      return false;
    }
    return true;
  });

  const takenCount = doseRecords.filter(r => r.status === 'TAKEN' || r.status === 'TAKEN_LATE').length;
  const missedCount = doseRecords.filter(r => r.status === 'MISSED' || r.status === 'SKIPPED').length;
  const takenLateCount = doseRecords.filter(r => r.status === 'TAKEN_LATE').length;
  const skippedCount = doseRecords.filter(r => r.status === 'SKIPPED').length;

  const assignedCaregiver = caregivers.find(c => c.patient_id === patient.patient_id) || caregivers[0];
  const uniqueMedicineNames = Array.from(new Set(doseRecords.map(r => r.medicine_name)));

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  const auditReportId = `MEDICARE-AUDIT-${patient.patient_id}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

  return (
    <div
      id="printable-audit-modal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center p-2 sm:p-4 md:p-6"
    >
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl w-full max-w-5xl my-auto border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Control Bar (Hidden during actual paper print) */}
        <div className="no-print bg-slate-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-500/20 text-teal-300 rounded-xl border border-teal-500/30">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">Compliance Audit Trail & Print Mode</h2>
                <span className="bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Hard-Copy Generator
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Official clinical report of verified 'Dose Taken' vs 'Dose Missed' records for {patient.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow-lg shadow-teal-600/30 flex items-center gap-2"
              title="Print document or Save as PDF"
            >
              <Printer className="h-4 w-4" />
              <span>Print Hard Copy / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              title="Close print preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar (Hidden during actual paper print) */}
        <div className="no-print bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-600 flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400" /> Filter Logs:
            </span>

            {/* Filter by Status */}
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setFilterStatus('ALL')}
                className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition ${
                  filterStatus === 'ALL' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Doses ({doseRecords.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('TAKEN')}
                className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition ${
                  filterStatus === 'TAKEN' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Taken Only ({takenCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('MISSED')}
                className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition ${
                  filterStatus === 'MISSED' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Missed / Skipped ({missedCount})
              </button>
            </div>

            {/* Filter by Compliance Impact */}
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 shadow-2xs">
              <button
                type="button"
                onClick={() => setComplianceImpactFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition ${
                  complianceImpactFilter === 'ALL' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Impact
              </button>
              <button
                type="button"
                onClick={() => setComplianceImpactFilter('POSITIVE')}
                className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition ${
                  complianceImpactFilter === 'POSITIVE' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Positive Compliance (On-Time Verified Doses)"
              >
                + Adherent ({doseRecords.filter(r => r.status === 'TAKEN').length})
              </button>
              <button
                type="button"
                onClick={() => setComplianceImpactFilter('HIGH_IMPACT')}
                className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition ${
                  complianceImpactFilter === 'HIGH_IMPACT' ? 'bg-rose-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Critical Negative Impact (Missed or Skipped Doses)"
              >
                - Non-Compliance ({missedCount})
              </button>
              <button
                type="button"
                onClick={() => setComplianceImpactFilter('DELAYED')}
                className={`px-2.5 py-1 rounded-md font-bold text-[11px] transition ${
                  complianceImpactFilter === 'DELAYED' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Delayed Impact (Late Doses)"
              >
                ~ Delayed ({takenLateCount})
              </button>
            </div>

            {/* Filter by Specific Medicine */}
            {uniqueMedicineNames.length > 1 && (
              <select
                value={selectedMedFilter}
                onChange={(e) => setSelectedMedFilter(e.target.value)}
                className="bg-white border border-slate-300 text-slate-700 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-teal-500 font-medium"
              >
                <option value="ALL">All Prescribed Medications</option>
                {uniqueMedicineNames.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Hard-Copy Report Sections Options */}
          <div className="flex items-center gap-4 text-slate-700">
            <label className="flex items-center gap-1.5 cursor-pointer font-medium select-none">
              <input
                type="checkbox"
                checked={includeRegimen}
                onChange={(e) => setIncludeRegimen(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500 h-3.5 w-3.5 border-slate-300"
              />
              <span>Include Rx Regimen Summary</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer font-medium select-none">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={(e) => setIncludeSignatures(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500 h-3.5 w-3.5 border-slate-300"
              />
              <span>Include Physician Sign-off Block</span>
            </label>
          </div>
        </div>

        {/* Scrollable Printable Document Paper Canvas */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-6 bg-white print:p-0 print:overflow-visible flex-grow">
          
          {/* ----------------- PRINT REPORT CONTAINER ----------------- */}
          <div id="printable-audit-report" className="space-y-6 max-w-4xl mx-auto text-slate-900">
            
            {/* 1. Official Medical Header */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-slate-900 text-white rounded-lg">
                      <Pill className="h-5 w-5" />
                    </div>
                    <span className="text-xl font-black tracking-tight text-slate-950 uppercase">
                      MediCare+ Clinical Healthcare Systems
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-extrabold text-teal-900 mt-1 tracking-tight">
                    OFFICIAL MEDICATION COMPLIANCE & DOSE ADHERENCE AUDIT TRAIL
                  </h1>
                  <p className="text-xs text-slate-600">
                    Comprehensive chronological ledger of scheduled intakes, verified doses, omissions, and clinical reasons.
                  </p>
                </div>

                <div className="text-right sm:border-l sm:border-slate-200 sm:pl-4 space-y-0.5 text-xs text-slate-600">
                  <p className="font-mono font-bold text-slate-900 text-[11px] bg-slate-100 px-2 py-0.5 rounded inline-block border border-slate-300">
                    {auditReportId}
                  </p>
                  <p className="mt-1">
                    <strong>Generated:</strong> {currentDate}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    <strong>Time:</strong> {currentTime}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    <strong>Attending Clinician:</strong> {doctorName}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Patient Demographics & Profile Grid */}
            <div className="bg-slate-50/80 border border-slate-300 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[10px]">Patient Full Name</span>
                <span className="font-extrabold text-slate-900 text-sm">{patient.name}</span>
                <span className="text-slate-500 block text-[11px]">ID: #{patient.patient_id}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[10px]">Age & Gender</span>
                <span className="font-bold text-slate-800">{patient.age} years • {patient.gender || 'Not specified'}</span>
                <span className="text-slate-500 block text-[11px]">Relation: {patient.relationship}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[10px]">Blood Group</span>
                <span className="font-bold text-slate-800 text-xs px-2 py-0.5 bg-rose-50 text-rose-800 border border-rose-200 rounded inline-block">
                  {patient.blood_group || 'O+'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase font-bold text-[10px]">Designated Caregiver</span>
                <span className="font-bold text-slate-800">
                  {assignedCaregiver?.name ? `${assignedCaregiver.name} (${assignedCaregiver.relation})` : 'Self Managed / None'}
                </span>
                {assignedCaregiver?.phone && (
                  <span className="text-slate-500 block text-[10px]">{assignedCaregiver.phone}</span>
                )}
              </div>
            </div>

            {/* 3. Executive Adherence & Compliance KPI Summary Box */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
                <p className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">Adherence Score</p>
                <p className="text-2xl font-black text-teal-950 mt-0.5">{adherenceStats.adherence_score}%</p>
                <span className="text-[10px] font-semibold text-teal-700">{adherenceStats.status_label}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Logged Doses</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{doseRecords.length}</p>
                <span className="text-[10px] text-slate-500">Audit Entries</span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Doses Confirmed</p>
                <p className="text-2xl font-extrabold text-emerald-900 mt-0.5">{takenCount}</p>
                <span className="text-[10px] font-semibold text-emerald-700">
                  {doseRecords.length > 0 ? Math.round((takenCount / doseRecords.length) * 100) : 0}% compliance
                </span>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Missed / Skipped</p>
                <p className="text-2xl font-extrabold text-rose-900 mt-0.5">{missedCount}</p>
                <span className="text-[10px] font-semibold text-rose-700">
                  {skippedCount} skipped • {missedCount - skippedCount} missed
                </span>
              </div>
              <div className="p-3 bg-slate-900 text-white border border-slate-800 rounded-xl col-span-2 sm:col-span-1">
                <p className="text-[10px] font-bold text-teal-300 uppercase tracking-wider">ML Risk Level</p>
                <p className="text-lg font-black text-white mt-1">
                  {mlPrediction ? `${mlPrediction.risk_level}` : 'Low Risk'}
                </p>
                <span className="text-[10px] text-slate-300">
                  {mlPrediction ? `${mlPrediction.risk_score}% miss prob.` : 'Normal'}
                </span>
              </div>
            </div>

            {/* 4. PRIMARY SECTION: 'Dose Taken vs Dose Missed' Chronological Audit Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="h-4 w-4 text-teal-700" />
                  Chronological Dose Compliance & Intake Audit Trail ({filteredRecords.length} Records)
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  Showing: {filterStatus === 'ALL' ? 'All Intakes' : filterStatus === 'TAKEN' ? 'Confirmed Taken' : 'Missed & Skipped'}
                </span>
              </div>

              {filteredRecords.length > 0 ? (
                <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 uppercase font-bold text-[10px] tracking-wider border-b border-slate-300">
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">Scheduled Time</th>
                        <th className="py-2.5 px-3">Medication & Dosage</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3">Intake Timestamp</th>
                        <th className="py-2.5 px-3">Reason / Clinical Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredRecords.map((record, index) => {
                        const isTaken = record.status === 'TAKEN' || record.status === 'TAKEN_LATE';
                        const isMissed = record.status === 'MISSED' || record.status === 'SKIPPED';
                        const scheduledDate = new Date(record.scheduled_datetime || record.logged_at);

                        return (
                          <tr
                            key={`${filterStatus}-${complianceImpactFilter}-${selectedMedFilter}-${record.dose_id || index}`}
                            className={`animate-row-fade table-row-transition transition-all duration-300 page-break-inside-avoid ${
                              index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                            } ${isMissed ? 'bg-rose-50/20' : ''}`}
                          >
                            {/* Line # */}
                            <td className="py-2 px-3 text-center font-mono text-[10px] text-slate-400 font-semibold">
                              {index + 1}
                            </td>

                            {/* Scheduled Time */}
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span className="font-semibold text-slate-900 block">
                                {scheduledDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              <span className="text-[11px] text-slate-500 font-mono">
                                {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </td>

                            {/* Medication & Dosage */}
                            <td className="py-2 px-3">
                              <span className="font-bold text-slate-900 block">{record.medicine_name}</span>
                              <span className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded inline-block font-medium">
                                {record.dosage}
                              </span>
                            </td>

                            {/* Status Pill */}
                            <td className="py-2 px-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                                  record.status === 'TAKEN'
                                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                    : record.status === 'TAKEN_LATE'
                                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                                    : record.status === 'SKIPPED'
                                    ? 'bg-slate-200 text-slate-800 border-slate-400'
                                    : 'bg-rose-100 text-rose-900 border-rose-300'
                                }`}
                              >
                                {record.status === 'TAKEN'
                                  ? '✓ TAKEN'
                                  : record.status === 'TAKEN_LATE'
                                  ? '⏰ LATE'
                                  : record.status === 'SKIPPED'
                                  ? '⊖ SKIPPED'
                                  : '✕ MISSED'}
                              </span>
                            </td>

                            {/* Actual Intake Timestamp */}
                            <td className="py-2 px-3 text-slate-700 whitespace-nowrap font-mono text-[11px]">
                              {record.actual_datetime ? (
                                <span>
                                  {new Date(record.actual_datetime).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Not recorded / Omitted</span>
                              )}
                              {record.snooze_count > 0 && (
                                <span className="text-[10px] text-amber-700 block font-sans">
                                  (Snoozed {record.snooze_count}x • {record.snooze_minutes}m)
                                </span>
                              )}
                            </td>

                            {/* Patient-Reported Reason / Clinical Notes */}
                            <td className="py-2 px-3 text-slate-700 text-xs">
                              {record.missed_reason ? (
                                <span className="font-semibold text-rose-900 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded inline-block">
                                  "{record.missed_reason}"
                                </span>
                              ) : isTaken ? (
                                <span className="text-emerald-700 font-medium text-[11px]">
                                  Intake verified on schedule
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">
                                  No specific reason entered
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-500 text-xs space-y-1">
                  <CheckCircle2 className="h-6 w-6 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700">No dose records matching the current filter</p>
                  <p className="text-slate-400 text-[11px]">Adjust your filter settings to view other compliance logs.</p>
                </div>
              )}
            </div>

            {/* 5. ACTIVE PRESCRIPTION REGIMEN SUMMARY (Optional/Configurable) */}
            {includeRegimen && medicines.length > 0 && (
              <div className="space-y-2 pt-2 page-break-inside-avoid">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Pill className="h-4 w-4 text-teal-700" />
                    Active Prescribed Regimen Snapshot ({medicines.length} Medications)
                  </h3>
                  <span className="text-[11px] text-slate-500">Current active clinical regimen</span>
                </div>

                <table className="w-full text-left text-xs border border-slate-300 rounded-xl overflow-hidden border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 uppercase font-bold text-[10px] border-b border-slate-300">
                      <th className="py-2 px-3">Medication Name</th>
                      <th className="py-2 px-3">Form & Dosage</th>
                      <th className="py-2 px-3">Intake Instructions & Schedule</th>
                      <th className="py-2 px-3 text-right">Remaining Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {medicines.map((med) => (
                      <tr key={med.medicine_id} className="bg-white">
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {med.name}
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          {med.dosage} ({med.form})
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          <span>{med.instructions || 'As prescribed by physician'}</span>
                          <span className="block text-[10px] text-teal-700 font-semibold font-mono">
                            • Schedule: {med.schedules?.map(s => `${s.time} (${s.frequency})`).join(', ') || 'Daily'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {med.remaining_quantity} / {med.total_quantity} units
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 6. CLINICAL SIGN-OFF & ATTESTATION BLOCK (Optional/Configurable) */}
            {includeSignatures && (
              <div className="pt-4 page-break-inside-avoid space-y-4">
                <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50 space-y-4">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                    Physician Attestation & Clinical Verification
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    I hereby certify that this Medication Compliance Audit Trail has been reviewed for clinical completeness and accuracy. The reported doses and omissions reflect patient self-reporting, smart-dispenser timestamps, and caregiver verification logs.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-4">
                    {/* Doctor Signature */}
                    <div className="space-y-1">
                      <div className="border-b border-slate-900 h-10 flex items-end pb-1">
                        <span className="font-serif italic text-sm text-slate-800">{doctorName}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
                        <span className="font-bold uppercase text-slate-700">Physician Signature & Medical License</span>
                        <span>Date: {new Date().toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Patient / Caregiver Signature */}
                    <div className="space-y-1">
                      <div className="border-b border-slate-900 h-10 flex items-end pb-1">
                        <span className="font-serif italic text-sm text-slate-800">{patient.name}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-500 pt-0.5">
                        <span className="font-bold uppercase text-slate-700">Patient / Caregiver Signature</span>
                        <span>Date: {new Date().toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footnote & Disclaimer */}
                <div className="text-center text-[10px] text-slate-400 border-t border-slate-200 pt-3">
                  <p>
                    MediCare+ Smart Medication Adherence Platform • Electronic Health Record Audit Trail #{auditReportId} • Confidential Medical Document
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Modal Bottom Action Bar (Hidden during print) */}
        <div className="no-print bg-slate-100 border-t border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="h-4 w-4 text-teal-600 flex-shrink-0" />
            <span>
              Tip: In the browser print dialog, choose <strong>"Save as PDF"</strong> or select your physical printer.
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 font-bold rounded-xl border border-slate-300 text-xs transition"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition shadow-md flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              <span>Print Hard Copy Now</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
