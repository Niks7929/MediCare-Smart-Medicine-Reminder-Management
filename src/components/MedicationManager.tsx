import React, { useState } from 'react';
import { Pill, Plus, QrCode, AlertTriangle, Calendar, Clock, RefreshCw, Trash2, CheckCircle2, Send, Search, X, Bell, Stethoscope, Utensils, FileText } from 'lucide-react';
import { Medicine, Patient } from '../types';

interface MedicationManagerProps {
  activePatient: Patient;
  medicines: Medicine[];
  onAddMedicine: (medData: any) => void;
  onAddStock: (medId: number, quantity: number) => void;
  onDeleteMedicine: (medId: number) => void;
  onUpdateSnooze?: (medId: number, minutes: number) => void;
  onShowQR: (medicine: Medicine) => void;
  onRequestRefill?: (medicine: Medicine) => void;
}

export const MedicationManager: React.FC<MedicationManagerProps> = ({
  activePatient,
  medicines,
  onAddMedicine,
  onAddStock,
  onDeleteMedicine,
  onUpdateSnooze,
  onShowQR,
  onRequestRefill,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [stockModalMed, setStockModalMed] = useState<Medicine | null>(null);
  const [deleteConfirmMed, setDeleteConfirmMed] = useState<Medicine | null>(null);
  const [snoozeModalMed, setSnoozeModalMed] = useState<Medicine | null>(null);
  const [snoozeMinutesInput, setSnoozeMinutesInput] = useState('10');
  const [isDeleting, setIsDeleting] = useState(false);
  const [topUpQty, setTopUpQty] = useState('30');
  const [searchTerm, setSearchTerm] = useState('');

  // New Medicine Form State
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('1 tablet');
  const [form, setForm] = useState('Tablet');
  const [mealTiming, setMealTiming] = useState('AFTER_MEAL');
  const [instructions, setInstructions] = useState('Take after breakfast');
  const [precautions, setPrecautions] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [totalQuantity, setTotalQuantity] = useState('30');
  const [refillThreshold, setRefillThreshold] = useState('8');
  const [snoozeIntervalMinutes, setSnoozeIntervalMinutes] = useState('10');
  const [time, setTime] = useState('08:00 AM');
  const [frequency, setFrequency] = useState('Daily');

  const filteredMedicines = medicines.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    onAddMedicine({
      patient_id: activePatient.patient_id,
      name,
      dosage,
      form,
      meal_timing: mealTiming,
      instructions,
      precautions: precautions.trim() || undefined,
      doctor_name: doctorName.trim() || undefined,
      is_doctor_prescribed: !!doctorName.trim(),
      start_date: new Date().toISOString().split('T')[0],
      total_quantity: Number(totalQuantity) || 30,
      refill_threshold: Number(refillThreshold) || 5,
      snooze_interval_minutes: Number(snoozeIntervalMinutes) || 10,
      schedules: [{ time, frequency }]
    });

    setModalOpen(false);
    setName('');
    setPrecautions('');
    setDoctorName('');
    setSnoozeIntervalMinutes('10');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Pill className="h-6 w-6 text-teal-600 dark:text-teal-400" /> Medications & Inventory Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tracking active prescriptions, daily consumption rate, and automatic refill alerts for <strong className="text-slate-800 dark:text-slate-200">{activePatient.name}</strong>.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition flex items-center space-x-2 text-xs self-start sm:self-center"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Medicine</span>
        </button>
      </div>

      {/* Search Bar */}
      {medicines.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search medications by name (e.g. Metformin, Lisinopril, Atorvastatin)..."
              className="w-full bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 pl-9 pr-9 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-850 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 px-1">
            {searchTerm ? (
              <span className="inline-flex items-center gap-1 bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-2.5 py-1 rounded-lg text-[11px] font-semibold">
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

      {/* Medicines Grid */}
      {medicines.length > 0 ? (
        filteredMedicines.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMedicines.map((med) => {
              const percentage = Math.min(100, Math.round((med.remaining_quantity / med.total_quantity) * 100));

              return (
                <div
                  key={med.medicine_id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl p-6 border transition-all shadow-xs space-y-4 relative ${
                    med.needs_refill
                      ? 'border-amber-300 dark:border-amber-700 bg-amber-50/20 dark:bg-amber-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-teal-300 dark:hover:border-teal-600'
                  }`}
                >
                  {/* Refill Badge */}
                  {med.needs_refill && (
                    <span className="absolute top-4 right-4 bg-amber-500 text-slate-950 text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      <AlertTriangle className="h-3 w-3" /> Low Stock
                    </span>
                  )}

                  {/* Title & Info */}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                        {med.form}
                      </span>
                      {/* Doses Due Today Notification Badge */}
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-600 text-white shadow-xs">
                        <Bell className="h-3 w-3" />
                        <span>{(med.schedules && med.schedules.length > 0 ? med.schedules.length : 1)} {(med.schedules && med.schedules.length > 0 ? med.schedules.length : 1) === 1 ? 'Dose' : 'Doses'} Due Today</span>
                      </span>
                      {med.meal_timing && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700">
                          <Utensils className="h-2.5 w-2.5" />
                          {med.meal_timing === 'AFTER_MEAL' ? 'After Meal' :
                           med.meal_timing === 'BEFORE_MEAL' ? 'Before Meal' :
                           med.meal_timing === 'EMPTY_STOMACH' ? 'Empty Stomach' :
                           med.meal_timing === 'BEDTIME' ? 'Bedtime' : 'With Meal'}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{med.name}</h3>
                    {med.doctor_name && (
                      <p className="text-xs text-indigo-700 dark:text-indigo-300 font-bold flex items-center gap-1 mt-0.5">
                        <Stethoscope className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                        Prescribed by {med.doctor_name}
                      </p>
                    )}
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">Dosage: {med.dosage}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">"{med.instructions}"</p>
                    {med.precautions && (
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-200 dark:border-amber-800/60 mt-1.5 font-medium">
                        ⚠️ <strong>Precaution:</strong> {med.precautions}
                      </p>
                    )}
                  </div>

                  {/* Schedule Details */}
                  <div className="bg-slate-50 dark:bg-slate-800/70 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                    <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> Schedules:
                    </p>
                    {med.schedules.map((s, idx) => (
                      <p key={idx} className="text-slate-600 dark:text-slate-400 pl-5">
                        • <span className="font-semibold text-slate-900 dark:text-slate-200">{s.time}</span> ({s.frequency})
                      </p>
                    ))}
                  </div>

                  {/* Inventory Stock Visual Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-300">Stock Remaining</span>
                      <span className={med.needs_refill ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-slate-100'}>
                        {med.remaining_quantity} / {med.total_quantity} units ({percentage}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          med.needs_refill ? 'bg-amber-500' : 'bg-teal-600'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Est. supply remaining: <strong className="text-slate-800 dark:text-slate-200">{med.days_remaining} days</strong>
                    </p>
                  </div>

                  {/* Snooze Interval Customization Widget */}
                  <div className="bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center flex-shrink-0">
                        <Clock className="h-3.5 w-3.5" />
                      </div>
                      <div className="truncate">
                        <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block leading-none">Snooze Interval</span>
                        <span className="text-xs font-extrabold text-indigo-900 dark:text-indigo-300">
                          {med.snooze_interval_minutes || 10} mins
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSnoozeModalMed(med);
                        setSnoozeMinutesInput(String(med.snooze_interval_minutes || 10));
                      }}
                      className="px-2.5 py-1 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg transition flex items-center gap-1 shadow-xs"
                      title="Customize reminder snooze postponement"
                    >
                      <span>Customize</span>
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {onRequestRefill && (
                        <button
                          onClick={() => onRequestRefill(med)}
                          className={`font-bold px-2.5 py-1.5 rounded-lg border transition flex items-center gap-1 shadow-xs ${
                            med.refill_requested
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100'
                              : med.needs_refill
                              ? 'bg-amber-500 text-slate-950 border-amber-500 hover:bg-amber-600'
                              : 'bg-slate-900 dark:bg-slate-800 text-white border-slate-900 dark:border-slate-700 hover:bg-teal-700'
                          }`}
                          title="Request refill notification to caregiver"
                        >
                          <Send className="h-3 w-3" />
                          <span>{med.refill_requested ? 'Refill Pending' : 'Request Refill'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => setStockModalMed(med)}
                        className="bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-bold px-2.5 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800 transition flex items-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Top-up</span>
                      </button>

                      <button
                        onClick={() => onShowQR(med)}
                        className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 transition flex items-center gap-1"
                      >
                        <QrCode className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                        <span>QR</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmMed(med)}
                      className="inline-flex items-center gap-1.5 font-bold text-xs px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition ml-auto shadow-xs active:scale-95"
                      title={`Delete ${med.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-10 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3 shadow-xs">
            <Search className="h-7 w-7 mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No medications match "{searchTerm}"</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Please check your spelling or clear the filter query to view all medications.
            </p>
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold px-3.5 py-1.5 rounded-lg text-xs transition"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear Search</span>
            </button>
          </div>
        )
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 rounded-2xl flex items-center justify-center mx-auto">
            <Pill className="h-8 w-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Medications Added Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Add your prescribed tablets, capsules, or syrups for <strong className="text-slate-800 dark:text-slate-200">{activePatient.name}</strong> to configure daily dose timings and automatic low-stock alarms.
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md text-xs transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add First Medicine</span>
          </button>
        </div>
      )}

      {/* Add Medicine Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Pill className="h-5 w-5 text-teal-600 dark:text-teal-400" /> Add Medicine for {activePatient.name}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Medicine Name & Strength *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Metformin 500mg"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Dosage</label>
                  <input
                    type="text"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Form</label>
                  <select
                    value={form}
                    onChange={(e) => setForm(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Initial Quantity (Units)</label>
                  <input
                    type="number"
                    value={totalQuantity}
                    onChange={(e) => setTotalQuantity(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Refill Alert Threshold</label>
                  <input
                    type="number"
                    value={refillThreshold}
                    onChange={(e) => setRefillThreshold(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Scheduled Time</label>
                  <input
                    type="text"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="08:00 AM"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Twice Daily">Twice Daily</option>
                    <option value="Every 8 Hours">Every 8 Hours</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
              </div>

              {/* Snooze Interval Selector */}
              <div className="bg-indigo-50/60 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Dose Reminder Snooze Interval</span>
                  </label>
                  <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">Postpone delay</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={snoozeIntervalMinutes}
                    onChange={(e) => setSnoozeIntervalMinutes(e.target.value)}
                    className="w-20 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-xl px-2.5 py-1.5 text-xs text-center font-bold text-indigo-950 dark:text-indigo-200 outline-none"
                  />
                  <span className="text-xs text-slate-600 dark:text-slate-400">minutes</span>
                  <div className="flex-1 flex gap-1 justify-end flex-wrap">
                    {[5, 10, 15, 30, 60].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSnoozeIntervalMinutes(String(preset))}
                        className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition ${
                          Number(snoozeIntervalMinutes) === preset
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-slate-700'
                        }`}
                      >
                        {preset}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Food / Meal Timing Directive
                </label>
                <select
                  value={mealTiming}
                  onChange={(e) => setMealTiming(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                >
                  <option value="AFTER_MEAL">🍽️ After Meal (15-20 mins after food)</option>
                  <option value="BEFORE_MEAL">🥣 Before Meal (30 mins before food)</option>
                  <option value="EMPTY_STOMACH">💧 Empty Stomach (Morning with warm water)</option>
                  <option value="WITH_MEAL">🥗 With Meal (Along with meal)</option>
                  <option value="BEDTIME">🌙 Bedtime (Right before sleep)</option>
                  <option value="ANYTIME">⏰ Anytime (Standard schedule)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Prescription Instructions</label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Take with warm water after breakfast"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Prescribing Doctor (Optional)</label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Kulkarni, MD"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Precautions & Diet (Optional)</label>
                  <input
                    type="text"
                    value={precautions}
                    onChange={(e) => setPrecautions(e.target.value)}
                    placeholder="e.g. Avoid sour foods, drink plenty of water"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md"
                >
                  Save Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top-Up Stock Modal */}
      {stockModalMed && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Refill Stock: {stockModalMed.name}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Current Stock: <strong className="text-slate-900 dark:text-slate-200">{stockModalMed.remaining_quantity} units</strong>
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Add Units Purchased / Received</label>
              <input
                type="number"
                value={topUpQty}
                onChange={(e) => setTopUpQty(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white p-2.5 text-sm rounded-xl outline-none"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setStockModalMed(null)}
                className="px-3 py-2 text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onAddStock(stockModalMed.medicine_id, Number(topUpQty) || 30);
                  setStockModalMed(null);
                }}
                className="px-4 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-xs transition"
              >
                Confirm Stock Top-Up
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Prescription Confirmation Modal */}
      {deleteConfirmMed && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={() => !isDeleting && setDeleteConfirmMed(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Delete Medication Prescription
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Confirm removal for <strong className="text-slate-800 dark:text-slate-200">{activePatient.name}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmMed(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Medication Summary Card */}
            <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                  {deleteConfirmMed.name}
                </span>
                <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-[10px] font-bold">
                  {deleteConfirmMed.form}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-700">
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Dosage</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{deleteConfirmMed.dosage}</span>
                </div>
                <div>
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Current Stock</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{deleteConfirmMed.remaining_quantity} / {deleteConfirmMed.total_quantity} units</span>
                </div>
              </div>

              {deleteConfirmMed.schedules && deleteConfirmMed.schedules.length > 0 && (
                <div className="pt-1 text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-200/80 dark:border-slate-700">
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-bold">Scheduled Times</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {deleteConfirmMed.schedules.map(s => `${s.time} (${s.frequency})`).join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Warning Notice */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-950 dark:text-amber-100">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                Are you sure you want to permanently remove this medication?
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed pl-5">
                This will permanently delete the prescription, cancel scheduled intake reminders, and remove stock inventory tracking.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteConfirmMed(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await onDeleteMedicine(deleteConfirmMed.medicine_id);
                    setDeleteConfirmMed(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Medication'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snooze Customization Modal */}
      {snoozeModalMed && (
        <div 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={() => setSnoozeModalMed(null)}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Customize Snooze Interval
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    For <strong className="text-slate-800 dark:text-slate-200">{snoozeModalMed.name}</strong> ({snoozeModalMed.dosage})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSnoozeModalMed(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 rounded-xl p-3 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2">
              <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
              <p>
                When a dose alert triggers for this prescription, choosing <strong>Snooze</strong> will postpone the next reminder notification by this configured interval.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Select Preset Duration</label>
              
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20, 30, 45, 60, 90].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setSnoozeMinutesInput(String(mins))}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition text-center ${
                      Number(snoozeMinutesInput) === mins
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {mins} min
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={snoozeMinutesInput}
                  onChange={(e) => setSnoozeMinutesInput(e.target.value)}
                  className="w-24 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 text-slate-900 dark:text-white rounded-xl px-3 py-2 text-sm text-center font-extrabold outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-bold text-slate-900 dark:text-slate-200">Custom Delay (minutes)</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">Allowed range: 1 – 180 minutes</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSnoozeModalMed(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const mins = Math.max(1, Number(snoozeMinutesInput) || 10);
                  if (onUpdateSnooze) {
                    onUpdateSnooze(snoozeModalMed.medicine_id, mins);
                  } else {
                    snoozeModalMed.snooze_interval_minutes = mins;
                  }
                  setSnoozeModalMed(null);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Save Snooze Interval</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
