import React, { useState, useMemo } from 'react';
import { DoseRecord } from '../types';
import {
  Download,
  Calendar,
  CalendarRange,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  X,
  Filter,
  Layers,
  Sparkles,
  Info,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface CsvExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: number;
  patientName: string;
  currentRange: 'ALL' | '30' | '14' | '7';
  currentFilter: 'ALL' | 'TAKEN' | 'MISSED';
  currentSearch: string;
  visibleRecordCount: number;
  totalRecordCount: number;
  doseRecords: DoseRecord[];
  onSelectRange?: (range: 'ALL' | '30' | '14' | '7') => void;
}

export const CsvExportModal: React.FC<CsvExportModalProps> = ({
  isOpen,
  onClose,
  patientId,
  patientName,
  currentRange,
  currentFilter,
  currentSearch,
  visibleRecordCount,
  totalRecordCount,
  doseRecords,
  onSelectRange
}) => {
  const [selectedExportRange, setSelectedExportRange] = useState<'CURRENT' | '7' | '14' | '30' | 'ALL'>('CURRENT');
  const [includeStatusFilter, setIncludeStatusFilter] = useState<boolean>(true);
  const [includeSearchFilter, setIncludeSearchFilter] = useState<boolean>(true);

  // Calculate dynamic record counts for each preset
  const presetStats = useMemo(() => {
    const now = Date.now();
    const calculateForDays = (days?: number) => {
      let recs = doseRecords.filter((d) => d.patient_id === patientId);

      if (includeStatusFilter) {
        if (currentFilter === 'TAKEN') {
          recs = recs.filter((d) => d.status === 'TAKEN' || d.status === 'TAKEN_LATE');
        } else if (currentFilter === 'MISSED') {
          recs = recs.filter((d) => d.status === 'MISSED' || d.status === 'SKIPPED');
        }
      }

      if (includeSearchFilter && currentSearch.trim()) {
        const q = currentSearch.trim().toLowerCase();
        recs = recs.filter((d) => d.medicine_name.toLowerCase().includes(q));
      }

      if (days) {
        const cutoff = now - days * 86400000;
        recs = recs.filter((d) => {
          const t = new Date(d.scheduled_datetime || d.logged_at).getTime();
          return t >= cutoff;
        });
      }

      const taken = recs.filter((d) => d.status === 'TAKEN' || d.status === 'TAKEN_LATE').length;
      const missed = recs.filter((d) => d.status === 'MISSED' || d.status === 'SKIPPED').length;
      const rate = recs.length > 0 ? Math.round((taken / recs.length) * 100) : 100;

      return {
        total: recs.length,
        taken,
        missed,
        rate
      };
    };

    return {
      seven: calculateForDays(7),
      fourteen: calculateForDays(14),
      thirty: calculateForDays(30),
      all: calculateForDays()
    };
  }, [doseRecords, patientId, currentFilter, currentSearch, includeStatusFilter, includeSearchFilter]);

  if (!isOpen) return null;

  // Build target export URL
  const getExportUrl = (rangeChoice: 'CURRENT' | '7' | '14' | '30' | 'ALL') => {
    const effectiveDays = rangeChoice === 'CURRENT' ? (currentRange === 'ALL' ? 'all' : currentRange) : rangeChoice.toLowerCase();
    const statusParam = includeStatusFilter ? currentFilter : 'ALL';
    const searchParam = includeSearchFilter && currentSearch.trim() ? `&q=${encodeURIComponent(currentSearch.trim())}` : '';

    return `/export-dose-history-csv/${patientId}?days=${effectiveDays}&status=${statusParam}${searchParam}`;
  };

  const getActiveSelectedCount = () => {
    switch (selectedExportRange) {
      case 'CURRENT':
        return currentRange === '7'
          ? presetStats.seven.total
          : currentRange === '14'
          ? presetStats.fourteen.total
          : currentRange === '30'
          ? presetStats.thirty.total
          : presetStats.all.total;
      case '7':
        return presetStats.seven.total;
      case '14':
        return presetStats.fourteen.total;
      case '30':
        return presetStats.thirty.total;
      case 'ALL':
        return presetStats.all.total;
    }
  };

  const getEffectiveRangeLabel = () => {
    switch (selectedExportRange) {
      case 'CURRENT':
        return currentRange === 'ALL' ? 'All Visible History' : `Currently Visible ${currentRange} Days`;
      case '7':
        return 'Last 7 Days (Recent Week)';
      case '14':
        return 'Last 14 Days (Bi-weekly)';
      case '30':
        return 'Last 30 Days (Monthly Review)';
      case 'ALL':
        return 'Entire Historical Dataset (All Time)';
    }
  };

  return (
    <div
      id="csv-export-modal-backdrop"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="csv-export-modal-card"
        className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 relative overflow-hidden"
      >
        {/* Header Ambient Glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Export Dose Compliance CSV
                </h3>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  Data Extract
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Download a filtered CSV report for <strong>{patientName}</strong> configured by date range.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Range Selection Mode */}
        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarRange className="w-3.5 h-3.5 text-emerald-500" />
              Select Date Range to Export:
            </label>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              Current view: <strong>{currentRange === 'ALL' ? 'All Time' : `${currentRange} Days`}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Option 1: Currently Visible Range */}
            <div
              onClick={() => setSelectedExportRange('CURRENT')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                selectedExportRange === 'CURRENT'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                    Currently Visible View
                  </span>
                </div>
                <span className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                  {currentRange === 'ALL' ? 'All Time' : `${currentRange}d`}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Exports exactly what you are seeing right now (
                <strong className="text-slate-800 dark:text-slate-200">
                  {currentRange === 'ALL'
                    ? `${presetStats.all.total} records`
                    : currentRange === '7'
                    ? `${presetStats.seven.total} records`
                    : currentRange === '14'
                    ? `${presetStats.fourteen.total} records`
                    : `${presetStats.thirty.total} records`}
                </strong>
                ).
              </p>
            </div>

            {/* Option 2: 7 Days (1 Week) */}
            <div
              onClick={() => setSelectedExportRange('7')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                selectedExportRange === '7'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Last 7 Days (1 Week)
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  {presetStats.seven.total} doses
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Recent weekly adherence snapshot ({presetStats.seven.rate}% adherence rate).
              </p>
            </div>

            {/* Option 3: 14 Days (2 Weeks) */}
            <div
              onClick={() => setSelectedExportRange('14')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                selectedExportRange === '14'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarRange className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Last 14 Days (Bi-weekly)
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  {presetStats.fourteen.total} doses
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Bi-weekly prescription & intake trend ({presetStats.fourteen.rate}% rate).
              </p>
            </div>

            {/* Option 4: 30 Days (1 Month) */}
            <div
              onClick={() => setSelectedExportRange('30')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                selectedExportRange === '30'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Last 30 Days (1 Month)
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  {presetStats.thirty.total} doses
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                Monthly compliance cycle ({presetStats.thirty.rate}% rate).
              </p>
            </div>

            {/* Option 5: Entire Historical Dataset (All Time) spanning full width */}
            <div
              onClick={() => setSelectedExportRange('ALL')}
              className={`sm:col-span-2 p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                selectedExportRange === 'ALL'
                  ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/20 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Entire Historical Dataset (All Time)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Complete archival audit trail from first registered intake to present.
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono font-extrabold text-slate-800 dark:text-slate-200">
                {presetStats.all.total} total doses
              </span>
            </div>
          </div>
        </div>

        {/* Filter Configuration Options */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/80 space-y-2.5">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            Applied Search & Status Filters in Export:
          </div>

          <div className="flex flex-col sm:flex-row gap-3 text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={includeStatusFilter}
                onChange={(e) => setIncludeStatusFilter(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800"
              />
              <span>
                Respect status filter: <strong>{currentFilter}</strong>
              </span>
            </label>

            {currentSearch.trim() && (
              <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={includeSearchFilter}
                  onChange={(e) => setIncludeSearchFilter(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800"
                />
                <span>
                  Respect search: <strong>"{currentSearch}"</strong>
                </span>
              </label>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Exporting: <strong className="text-emerald-600 dark:text-emerald-400">{getActiveSelectedCount()} records</strong> ({getEffectiveRangeLabel()})
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Cancel
            </button>

            <a
              id="confirm-csv-export-btn"
              href={getExportUrl(selectedExportRange)}
              download
              onClick={() => {
                setTimeout(onClose, 400);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition shadow-md hover:shadow-lg active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV Extract</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
