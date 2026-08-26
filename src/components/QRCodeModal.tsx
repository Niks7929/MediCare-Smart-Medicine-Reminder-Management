import React from 'react';
import { QrCode, X, Check, ShieldCheck } from 'lucide-react';
import { Medicine } from '../types';

interface QRCodeModalProps {
  medicine: Medicine | null;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ medicine, onClose }) => {
  if (!medicine) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white dark:bg-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-center space-y-4 border border-slate-200 dark:border-slate-700 transition-colors">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto w-12 h-12 bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 rounded-2xl flex items-center justify-center shadow-sm">
          <QrCode className="h-6 w-6" />
        </div>

        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-teal-50 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-700">
            Digital Medicine Badge
          </span>
          <h3 className="text-xl font-black text-slate-900 dark:text-white mt-2">{medicine.name}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">{medicine.dosage} • {medicine.form}</p>
        </div>

        {/* QR Code Graphic Box */}
        <div className="bg-slate-900 p-4 rounded-2xl inline-block shadow-inner border border-slate-800">
          <svg className="w-44 h-44 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3z" fill="white" stroke="none" />
            <path d="M10 3h1v3h-1zM13 3h1v2h-1zM10 7h4v1h-4zM16 10h2v2h-2zM12 12h3v3h-3zM18 15h3v2h-3zM15 18h2v3h-2zM18 19h3v2h-3zM10 15h2v6h-2z" fill="white" stroke="none" />
          </svg>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-left text-xs space-y-1 text-slate-700 dark:text-slate-300">
          <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Embedded QR Payload:
          </p>
          <p className="font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all bg-white dark:bg-slate-800 p-1.5 rounded border border-slate-200 dark:border-slate-700">
            {medicine.qr_code_data}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 pt-1">
            Scannable by MediCare+ mobile scanner or caregiver device to instantly verify medicine details and remaining stock.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-slate-900 dark:bg-teal-600 hover:bg-slate-800 dark:hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md"
        >
          Close Badge
        </button>
      </div>
    </div>
  );
};
