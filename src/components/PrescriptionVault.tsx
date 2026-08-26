import React, { useState } from 'react';
import { FileText, Sparkles, Plus, Calendar, Check, Stethoscope, ArrowRight, Trash2 } from 'lucide-react';
import { Prescription, Patient } from '../types';

interface PrescriptionVaultProps {
  activePatient: Patient;
  prescriptions: Prescription[];
  onParsePrescription: (notes: string, doctorName: string) => Promise<void>;
  onAddExtractedMedicine: (medData: any) => void;
  onDeletePrescription?: (prescriptionId: number) => Promise<void>;
}

export const PrescriptionVault: React.FC<PrescriptionVaultProps> = ({
  activePatient,
  prescriptions,
  onParsePrescription,
  onAddExtractedMedicine,
  onDeletePrescription,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [doctorName, setDoctorName] = useState('Dr. ABC, MD');
  const [notes, setNotes] = useState('Rx: Metformin 500mg 1 tablet daily after breakfast. Atorvastatin 20mg 1 tablet daily at bedtime.');
  const [loading, setLoading] = useState(false);
  const [addedMeds, setAddedMeds] = useState<Record<string, boolean>>({});

  const handleParseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes) return;

    setLoading(true);
    await onParsePrescription(notes, doctorName);
    setLoading(false);
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Prescription Text Parser
            </span>
          </div>
          <h2 className="text-2xl font-extrabold mt-2">Digital Prescription Vault</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Store doctor prescription notes and parse medicine names, dosages, and schedules directly into your patient schedule.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md text-xs flex items-center space-x-2 self-start md:self-center"
        >
          <Plus className="h-4 w-4" />
          <span>Upload / Parse Prescription</span>
        </button>
      </div>

      {/* Prescription List */}
      <div className="space-y-4">
        {prescriptions.map((p) => (
          <div key={p.prescription_id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 relative transition-colors">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center space-x-3">
                <div className="bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 p-2.5 rounded-xl">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{p.doctor_name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Prescription Date: {p.prescription_date}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  Rx #{p.prescription_id}
                </span>
                {onDeletePrescription && (
                  <button
                    onClick={() => onDeletePrescription(p.prescription_id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                    title="Delete Prescription"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">Clinical / Doctor Notes:</p>
              <p className="italic text-slate-600 dark:text-slate-300 font-serif text-sm">"{p.notes}"</p>
            </div>

            {/* Extracted Medicines Card */}
            {p.medicines_extracted && p.medicines_extracted.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> Extracted Medicines:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {p.medicines_extracted.map((med, idx) => {
                    const key = `${p.prescription_id}-${idx}`;
                    const isAdded = addedMeds[key];

                    return (
                      <div key={idx} className="bg-teal-50/50 dark:bg-teal-950/20 p-3 rounded-xl border border-teal-200 dark:border-teal-800/60 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{med.name}</p>
                          <p className="text-slate-600 dark:text-slate-400">{med.dosage} • {med.frequency}</p>
                        </div>

                        <button
                          disabled={isAdded}
                          onClick={() => {
                            onAddExtractedMedicine({
                              patient_id: activePatient.patient_id,
                              name: med.name,
                              dosage: med.dosage,
                              form: 'Tablet',
                              instructions: `Prescribed by ${p.doctor_name}`,
                              start_date: new Date().toISOString().split('T')[0],
                              total_quantity: 30,
                              refill_threshold: 5,
                              schedules: [{ time: '08:00 AM', frequency: med.frequency }]
                            });
                            setAddedMeds(prev => ({ ...prev, [key]: true }));
                          }}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center gap-1 ${
                            isAdded
                              ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 cursor-default'
                              : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="h-3.5 w-3.5" /> Added
                            </>
                          ) : (
                            <>
                              <span>Add to Active</span> <ArrowRight className="h-3.5 w-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Parse Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700 transition-colors">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
              <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" /> Prescription Text Parser
            </h3>

            <form onSubmit={handleParseSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Doctor / Clinic Name</label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Prescription Notes / Text</label>
                <textarea
                  rows={4}
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Paste clinical note, doctor instructions or Rx list..."
                  className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none focus:border-teal-500 font-mono text-xs"
                ></textarea>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 shadow-md flex items-center gap-2"
                >
                  {loading ? 'Processing...' : 'Parse & Save Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
