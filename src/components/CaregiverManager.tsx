import React, { useState } from 'react';
import { ShieldCheck, UserPlus, Phone, Mail, BellRing, AlertTriangle, Send, CheckCircle2 } from 'lucide-react';
import { Caregiver, Patient } from '../types';

interface CaregiverManagerProps {
  activePatient: Patient;
  caregivers: Caregiver[];
  onAddCaregiver: (data: any) => void;
}

export const CaregiverManager: React.FC<CaregiverManagerProps> = ({
  activePatient,
  caregivers,
  onAddCaregiver,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('Spouse');
  const [phone, setPhone] = useState('+1 (555) 234-5678');
  const [email, setEmail] = useState('');
  const [alertSent, setAlertSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    onAddCaregiver({
      patient_id: activePatient.patient_id,
      name,
      relation,
      phone,
      email: email || `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    });

    setModalOpen(false);
    setName('');
  };

  const handleTriggerTestAlert = () => {
    setAlertSent(true);
    setTimeout(() => setAlertSent(false), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Privacy-First Caregiver Network
            </span>
          </div>
          <h2 className="text-2xl font-extrabold mt-2">Caregiver & Family Escalation Mode</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Designate trusted contacts (Spouse, Son/Daughter, Nurse) who receive automated adherence alerts if multiple doses are repeatedly missed.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md text-xs flex items-center space-x-2 self-start md:self-center"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add Trusted Caregiver</span>
        </button>
      </div>

      {/* Alert Test Confirmation Banner */}
      {alertSent && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-4 rounded-xl flex items-center justify-between text-xs animate-fadeIn shadow-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="font-bold">Test Adherence Alert Dispatched!</p>
              <p className="text-emerald-700">Simulated SMS & Email sent to active caregivers for {activePatient.name}.</p>
            </div>
          </div>
        </div>
      )}

      {/* Caregiver List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {caregivers.map((c) => (
          <div key={c.caregiver_id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/40 px-2.5 py-0.5 rounded-md border border-teal-200 dark:border-teal-700">
                  {c.relation}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2">{c.name}</h3>
              </div>
              <div className="bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 p-3 rounded-2xl">
                <ShieldCheck className="h-6 w-6" />
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-400" /> <span className="font-semibold text-slate-800 dark:text-slate-200">{c.phone}</span>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-400" /> <span className="font-semibold text-slate-800 dark:text-slate-200">{c.email}</span>
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <BellRing className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" /> Escalation Rules:
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                • Triggers alert after <strong className="text-slate-900 dark:text-slate-100">{c.notify_threshold} consecutive missed doses</strong>.
              </p>
              <p className="text-slate-600 dark:text-slate-400">• Patient privacy consent active for {activePatient.name}.</p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleTriggerTestAlert}
                className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold px-3 py-2 rounded-xl text-xs transition flex items-center gap-1.5 border border-slate-300 dark:border-slate-600"
              >
                <Send className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                <span>Test Escalation SMS</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Caregiver Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-700 transition-colors">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
              <UserPlus className="h-5 w-5 text-teal-600 dark:text-teal-400" /> Add Caregiver for {activePatient.name}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Caregiver Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Relationship</label>
                <select
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                >
                  <option value="Spouse">Spouse</option>
                  <option value="Son">Son</option>
                  <option value="Daughter">Daughter</option>
                  <option value="Parent">Parent</option>
                  <option value="Healthcare Provider">Healthcare Provider</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number for SMS Alert</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="caregiver@example.com"
                  className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-2.5 rounded-xl outline-none"
                />
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
                  className="px-5 py-2 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 shadow-md"
                >
                  Save Caregiver
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
