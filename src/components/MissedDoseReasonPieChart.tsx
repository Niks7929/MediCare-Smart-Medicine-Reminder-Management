import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { DoseRecord, MissedReasonSlice, MissedReasonDistribution } from '../types';
import { computeMissedReasonDistribution, REASON_DEFINITIONS } from '../utils/missedReasonCategorizer';
import {
  PieChart,
  Brain,
  Activity,
  PackageX,
  MapPin,
  Moon,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Info,
  ChevronRight,
  ShieldCheck,
  Filter,
  ArrowUpRight,
  Calendar,
  Clock
} from 'lucide-react';

interface MissedDoseReasonPieChartProps {
  doseRecords: DoseRecord[];
  patientId: number;
  patientName: string;
  className?: string;
  onFilterByReason?: (reasonId: string) => void;
}

export const MissedDoseReasonPieChart: React.FC<MissedDoseReasonPieChartProps> = ({
  doseRecords,
  patientId,
  patientName,
  className = '',
  onFilterByReason
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedSlice, setSelectedSlice] = useState<MissedReasonSlice | null>(null);
  const [hoveredSlice, setHoveredSlice] = useState<MissedReasonSlice | null>(null);
  const [showBenchmarkMode, setShowBenchmarkMode] = useState<boolean>(false);

  // Compute live distribution
  const distribution: MissedReasonDistribution = useMemo(() => {
    if (showBenchmarkMode) {
      // Benchmark clinical cohort reference distribution
      return {
        total_missed: 100,
        total_with_reason: 95,
        top_category: {
          id: 'forgot',
          category: 'Forgot / Distracted',
          count: 48,
          percentage: 48.0,
          color: '#f59e0b',
          badge_color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          icon: 'Brain',
          clinical_impact: 'Most common cause of subtherapeutic blood levels.',
          suggested_action: 'Smart alarm chimes and caregiver voice prompts.',
          records: []
        },
        slices: [
          {
            id: 'forgot',
            category: 'Forgot / Distracted',
            count: 48,
            percentage: 48.0,
            color: '#f59e0b',
            badge_color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
            icon: 'Brain',
            clinical_impact: 'Peak and trough drug fluctuations.',
            suggested_action: 'Set habit-anchored audio cues.',
            records: []
          },
          {
            id: 'nausea',
            category: 'Side Effects / Nausea',
            count: 24,
            percentage: 24.0,
            color: '#ec4899',
            badge_color: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
            icon: 'Activity',
            clinical_impact: 'Gastrointestinal intolerance.',
            suggested_action: 'Take post-meal with full glass of water.',
            records: []
          },
          {
            id: 'empty_supply',
            category: 'Empty Supply / Refill Delay',
            count: 15,
            percentage: 15.0,
            color: '#ef4444',
            badge_color: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
            icon: 'PackageX',
            clinical_impact: 'Abrupt treatment interruption.',
            suggested_action: '1-click pharmacy auto-refill triggers.',
            records: []
          },
          {
            id: 'travel_out',
            category: 'Out of Home / Travel',
            count: 8,
            percentage: 8.0,
            color: '#3b82f6',
            badge_color: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
            icon: 'MapPin',
            clinical_impact: 'Schedule transition lapses.',
            suggested_action: 'Use pocket pill packs.',
            records: []
          },
          {
            id: 'other',
            category: 'Other / Unspecified',
            count: 5,
            percentage: 5.0,
            color: '#64748b',
            badge_color: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
            icon: 'HelpCircle',
            clinical_impact: 'Uncategorized omission.',
            suggested_action: 'Encourage prompt note logging.',
            records: []
          }
        ]
      };
    }
    return computeMissedReasonDistribution(doseRecords, patientId);
  }, [doseRecords, patientId, showBenchmarkMode]);

  // Set default selected slice when distribution loads
  useEffect(() => {
    if (distribution.top_category && !selectedSlice) {
      setSelectedSlice(distribution.top_category);
    } else if (distribution.slices.length === 0) {
      setSelectedSlice(null);
    }
  }, [distribution]);

  // D3 Pie Chart Engine
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || distribution.slices.length === 0) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = Math.min(container.clientWidth || 320, 320);
    const height = 300;
    const radius = Math.min(width, height) / 2 - 16;
    const innerRadius = radius * 0.58; // Donut style

    svg.attr('viewBox', `0 0 ${width} ${height}`)
       .attr('width', '100%')
       .attr('height', height);

    svg.selectAll('*').remove();

    // Defs for shadows and gradients
    const defs = svg.append('defs');
    const filter = defs.append('filter').attr('id', 'pieSliceShadow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    filter.append('feDropShadow').attr('dx', '0').attr('dy', '3').attr('stdDeviation', '4').attr('flood-opacity', '0.35').attr('flood-color', '#000000');

    const g = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`);

    // D3 Pie Generator
    const pie = d3.pie<MissedReasonSlice>()
      .value((d) => d.count)
      .sort(null)
      .padAngle(0.035);

    // D3 Arc Generators
    const arc = d3.arc<d3.PieArcDatum<MissedReasonSlice>>()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .cornerRadius(6);

    const hoverArc = d3.arc<d3.PieArcDatum<MissedReasonSlice>>()
      .innerRadius(innerRadius - 2)
      .outerRadius(radius + 8)
      .cornerRadius(8);

    const pieData = pie(distribution.slices);

    // Draw Slices
    const slices = g.selectAll('.pie-slice')
      .data(pieData)
      .enter()
      .append('g')
      .attr('class', 'pie-slice')
      .style('cursor', 'pointer');

    slices.append('path')
      .attr('d', (d) => arc(d) as string)
      .attr('fill', (d) => d.data.color)
      .attr('stroke', '#0f172a')
      .attr('stroke-width', 2)
      .attr('filter', 'url(#pieSliceShadow)')
      .style('transition', 'all 0.3s ease-out')
      .on('mouseenter', function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', (d) => hoverArc(d as any) as string)
          .attr('opacity', 1.0);
        setHoveredSlice(d.data);
      })
      .on('mouseleave', function (event, d) {
        const isSelected = selectedSlice?.id === d.data.id;
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', (d) => (isSelected ? hoverArc(d as any) : arc(d as any)) as string)
          .attr('opacity', isSelected ? 1.0 : 0.9);
        setHoveredSlice(null);
      })
      .on('click', (event, d) => {
        setSelectedSlice(d.data);
        if (onFilterByReason) {
          onFilterByReason(d.data.id);
        }
      });

    // Animate Slice Entry
    slices.selectAll('path')
      .transition()
      .duration(800)
      .attrTween('d', function (d: any) {
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return function (t) {
          return arc(i(t)) as string;
        };
      });

    // Add Percentage Labels on Large Slices (> 10%)
    slices.append('text')
      .attr('transform', (d) => `translate(${arc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', '#ffffff')
      .attr('font-size', (d) => (d.data.percentage > 18 ? '12px' : '10px'))
      .attr('font-weight', '800')
      .attr('pointer-events', 'none')
      .text((d) => (d.data.percentage >= 9 ? `${Math.round(d.data.percentage)}%` : ''));

    // Center Donut Readout
    const centerG = g.append('g').attr('text-anchor', 'middle').attr('pointer-events', 'none');

    const activeDisplaySlice = hoveredSlice || selectedSlice;

    if (activeDisplaySlice) {
      centerG.append('text')
        .attr('y', -14)
        .attr('fill', '#94a3b8')
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .attr('letter-spacing', '0.05em')
        .text('REASON SHARE');

      centerG.append('text')
        .attr('y', 10)
        .attr('fill', activeDisplaySlice.color)
        .attr('font-size', '22px')
        .attr('font-weight', '900')
        .text(`${activeDisplaySlice.percentage}%`);

      centerG.append('text')
        .attr('y', 26)
        .attr('fill', '#cbd5e1')
        .attr('font-size', '10px')
        .attr('font-weight', '600')
        .text(`${activeDisplaySlice.count} of ${distribution.total_missed} doses`);
    } else {
      centerG.append('text')
        .attr('y', -10)
        .attr('fill', '#94a3b8')
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .text('TOTAL MISSED');

      centerG.append('text')
        .attr('y', 14)
        .attr('fill', '#ffffff')
        .attr('font-size', '24px')
        .attr('font-weight', '900')
        .text(`${distribution.total_missed}`);
    }

  }, [distribution, hoveredSlice, selectedSlice]);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Brain': return Brain;
      case 'Activity': return Activity;
      case 'PackageX': return PackageX;
      case 'MapPin': return MapPin;
      case 'Moon': return Moon;
      default: return HelpCircle;
    }
  };

  return (
    <div
      id="missed-dose-reason-distribution"
      className={`bg-slate-900 text-white rounded-3xl border border-slate-800 p-5 sm:p-6 shadow-xl relative overflow-hidden transition-all ${className}`}
    >
      {/* Ambient background glow */}
      <div className="absolute -right-16 -top-16 w-56 h-56 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                Missed Dose Reasons Breakdown
              </h3>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 px-2 py-0.5 rounded-md border border-slate-700">
                Distribution Analysis
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Breakdown of non-compliance audit logs by patient-reported rationale (e.g. Forgot, Nausea, Empty Supply)
            </p>
          </div>
        </div>

        {/* Action / Benchmark Toggle */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <button
            onClick={() => setShowBenchmarkMode(!showBenchmarkMode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              showBenchmarkMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
            }`}
            title="Toggle between this patient's actual logged records and clinical cohort benchmark data"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{showBenchmarkMode ? 'Viewing Cohort Benchmark' : 'Patient Actuals'}</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      {distribution.slices.length === 0 ? (
        /* Zero Missed Doses / Perfect Adherence State */
        <div className="py-12 px-4 text-center relative z-10 flex flex-col items-center justify-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20 animate-bounce">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="max-w-md">
            <h4 className="text-lg font-black text-white">100% Perfect Adherence!</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {patientName} has zero recorded missed or skipped doses. Every scheduled medication was taken on time.
            </p>
          </div>
          <button
            onClick={() => setShowBenchmarkMode(true)}
            className="mt-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-teal-300 px-4 py-2 rounded-xl border border-slate-700 transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>View Clinical Cohort Missed-Reason Distribution</span>
          </button>
        </div>
      ) : (
        /* Rich Pie Chart & Categorical Breakdown Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5 items-center relative z-10">
          {/* Left: D3 Donut Chart (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center relative" ref={containerRef}>
            <svg ref={svgRef} className="w-full max-w-[300px] h-[280px] block select-none" />
            <span className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <Info className="w-3 h-3" /> Hover or click slice to inspect clinical impact
            </span>
          </div>

          {/* Right: Reason Category Chips & Details Card (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Category Slices Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {distribution.slices.map((slice) => {
                const IconComponent = getIcon(slice.icon);
                const isSelected = selectedSlice?.id === slice.id;

                return (
                  <div
                    key={slice.id}
                    onClick={() => setSelectedSlice(slice)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-slate-950 border-teal-500 shadow-md ring-1 ring-teal-500/50 scale-[1.02]'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          <IconComponent className="w-3.5 h-3.5 text-slate-400" />
                          <span>{slice.category}</span>
                        </p>
                        <span className="text-[10px] text-slate-400">
                          {slice.count} {slice.count === 1 ? 'record' : 'records'} logged
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-black font-mono text-white">
                        {slice.percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Reason Clinical Guidance Card */}
            {selectedSlice && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 relative animate-fade-in space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: selectedSlice.color }}
                    />
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      {selectedSlice.category} Impact & Mitigation
                    </h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${selectedSlice.badge_color}`}>
                    {selectedSlice.count} Doses ({selectedSlice.percentage}%)
                  </span>
                </div>

                <div className="text-xs text-slate-300 space-y-1.5">
                  <p>
                    <strong className="text-slate-200">Clinical Consequence: </strong>
                    <span className="text-slate-400">{selectedSlice.clinical_impact}</span>
                  </p>
                  <p>
                    <strong className="text-teal-400">Recommended Action: </strong>
                    <span className="text-slate-300">{selectedSlice.suggested_action}</span>
                  </p>
                </div>

                {/* List of actual dose records for this reason */}
                {selectedSlice.records && selectedSlice.records.length > 0 && (
                  <div className="pt-2 mt-2 border-t border-slate-800/80">
                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-1.5">
                      Logged Incident Records ({selectedSlice.records.length}):
                    </p>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 text-xs">
                      {selectedSlice.records.map((rec) => (
                        <div
                          key={rec.dose_id}
                          className="bg-slate-900/90 border border-slate-800 p-2 rounded-xl flex items-center justify-between text-slate-300"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-white text-[11px] truncate">{rec.medicine_name}</p>
                            <p className="text-[10px] text-slate-400 italic truncate">
                              "{rec.missed_reason || 'No detailed explanation'}"
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">
                            {new Date(rec.scheduled_datetime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
