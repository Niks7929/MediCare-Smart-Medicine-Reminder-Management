import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { DoseRecord, MissedHourSlot, MissedHoursAnalysis, TimeOfDayGroup } from '../types';
import { analyzeMissedDoseHours, formatHour12, formatHourRange } from '../utils/missedHoursAnalyzer';
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Info,
  Calendar,
  CalendarRange,
  Sun,
  Sunrise,
  Sunset,
  Moon,
  Pill,
  Filter,
  ArrowRight,
  ShieldCheck,
  Zap,
  BarChart3,
  Layers,
  ChevronRight,
  X
} from 'lucide-react';

interface MissedDoseHoursBarChartProps {
  doseRecords: DoseRecord[];
  patientId: number;
  patientName: string;
  className?: string;
  onFilterByHour?: (hour: number) => void;
}

export const MissedDoseHoursBarChart: React.FC<MissedDoseHoursBarChartProps> = ({
  doseRecords,
  patientId,
  patientName,
  className = '',
  onFilterByHour
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // View Controls
  const [selectedRange, setSelectedRange] = useState<number | null>(30); // 7, 14, 30 or null for All
  const [chartMode, setChartMode] = useState<'HOURLY' | 'TIME_OF_DAY'>('HOURLY');
  const [metricMode, setMetricMode] = useState<'MISSED_COUNT' | 'MISSED_RATE' | 'STACKED'>('MISSED_COUNT');
  const [selectedSlot, setSelectedSlot] = useState<MissedHourSlot | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<MissedHourSlot | null>(null);
  const [selectedTodGroup, setSelectedTodGroup] = useState<TimeOfDayGroup | null>(null);

  // Compute live analysis
  const analysis: MissedHoursAnalysis = useMemo(() => {
    return analyzeMissedDoseHours(doseRecords, patientId, selectedRange);
  }, [doseRecords, patientId, selectedRange]);

  // Filter slots to only active hours (hours with at least 1 dose scheduled or default 24h)
  const displaySlots = useMemo(() => {
    // Show active hours or full daylight range
    const active = analysis.hourly_slots.filter((s) => s.total_scheduled > 0);
    if (active.length >= 4) {
      return analysis.hourly_slots.filter((s) => s.hour >= 6 && s.hour <= 23);
    }
    return analysis.hourly_slots;
  }, [analysis]);

  // Render D3 Chart
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 700;
    const height = 280;
    const margin = { top: 25, right: 20, bottom: 40, left: 45 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('style', 'max-width: 100%; height: auto;');

    // Defs for gradients & shadow filters
    const defs = svg.append('defs');

    // Missed gradient (Rose to Amber)
    const missedGradient = defs
      .append('linearGradient')
      .attr('id', 'missedBarGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    missedGradient.append('stop').attr('offset', '0%').attr('stop-color', '#f43f5e');
    missedGradient.append('stop').attr('offset', '100%').attr('stop-color', '#e11d48');

    // Peak vulnerability gradient (Crimson Pulse)
    const peakGradient = defs
      .append('linearGradient')
      .attr('id', 'peakBarGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    peakGradient.append('stop').attr('offset', '0%').attr('stop-color', '#ff4d4f');
    peakGradient.append('stop').attr('offset', '100%').attr('stop-color', '#b91c1c');

    // Taken gradient (Teal / Emerald)
    const takenGradient = defs
      .append('linearGradient')
      .attr('id', 'takenBarGradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    takenGradient.append('stop').attr('offset', '0%').attr('stop-color', '#10b981');
    takenGradient.append('stop').attr('offset', '100%').attr('stop-color', '#059669');

    // Subtle drop shadow
    const filter = defs.append('filter').attr('id', 'barShadow').attr('height', '130%');
    filter
      .append('feDropShadow')
      .attr('dx', '0')
      .attr('dy', '3')
      .attr('stdDeviation', '3')
      .attr('flood-opacity', '0.15');

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Grid lines
    const yGridScale = d3.scaleLinear().range([innerHeight, 0]);

    if (chartMode === 'HOURLY') {
      const x = d3
        .scaleBand<string>()
        .domain(displaySlots.map((d) => String(d.hour)))
        .range([0, innerWidth])
        .padding(0.28);

      let maxVal = 1;
      if (metricMode === 'MISSED_COUNT') {
        maxVal = Math.max(3, d3.max(displaySlots, (d: MissedHourSlot) => d.total_missed) ?? 1);
      } else if (metricMode === 'MISSED_RATE') {
        maxVal = 100;
      } else {
        // Stacked (Total scheduled = Taken + Missed)
        maxVal = Math.max(3, d3.max(displaySlots, (d: MissedHourSlot) => d.total_scheduled) ?? 1);
      }

      yGridScale.domain([0, maxVal]);
      const y = yGridScale;

      // Draw horizontal grid lines
      g.append('g')
        .attr('class', 'grid')
        .call(
          d3
            .axisLeft(y)
            .ticks(4)
            .tickSize(-innerWidth)
            .tickFormat(() => '')
        )
        .selectAll('line')
        .attr('stroke', 'currentColor')
        .attr('stroke-opacity', '0.08')
        .attr('stroke-dasharray', '3,3');

      g.select('.grid .domain').remove();

      // Render X Axis
      const xAxis = g
        .append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(
          d3.axisBottom(x).tickFormat((h) => {
            const hr = Number(h);
            return hr % 2 === 0 || displaySlots.length <= 12 ? formatHour12(hr) : '';
          })
        );

      xAxis.select('.domain').attr('stroke', '#94a3b8').attr('stroke-opacity', '0.3');
      xAxis
        .selectAll('text')
        .attr('fill', '#64748b')
        .attr('font-size', '11px')
        .attr('font-weight', '600');

      // Render Y Axis
      const yAxis = g.append('g').call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickFormat((d) => (metricMode === 'MISSED_RATE' ? `${d}%` : String(d)))
      );
      yAxis.select('.domain').remove();
      yAxis
        .selectAll('text')
        .attr('fill', '#64748b')
        .attr('font-size', '10px')
        .attr('font-weight', '600');

      // Bars Rendering
      if (metricMode === 'STACKED') {
        // Render Taken Bars (Base)
        g.selectAll<SVGRectElement, MissedHourSlot>('.bar-taken')
          .data(displaySlots)
          .enter()
          .append('rect')
          .attr('class', 'bar-taken')
          .attr('x', (d: MissedHourSlot) => x(String(d.hour)) || 0)
          .attr('width', x.bandwidth())
          .attr('y', (d: MissedHourSlot) => y(d.total_taken + d.total_missed))
          .attr('height', (d: MissedHourSlot) => innerHeight - y(d.total_taken))
          .attr('fill', 'url(#takenBarGradient)')
          .attr('rx', 4)
          .attr('opacity', 0.85);

        // Render Missed Bars (Top stack)
        g.selectAll<SVGRectElement, MissedHourSlot>('.bar-missed')
          .data(displaySlots)
          .enter()
          .append('rect')
          .attr('class', 'bar-missed cursor-pointer')
          .attr('x', (d: MissedHourSlot) => x(String(d.hour)) || 0)
          .attr('width', x.bandwidth())
          .attr('y', (d: MissedHourSlot) => y(d.total_missed))
          .attr('height', (d: MissedHourSlot) => innerHeight - y(d.total_missed))
          .attr('fill', (d: MissedHourSlot) => (d.is_peak_vulnerable ? 'url(#peakBarGradient)' : 'url(#missedBarGradient)'))
          .attr('rx', 4)
          .attr('filter', 'url(#barShadow)')
          .on('mouseenter', (event, d: MissedHourSlot) => setHoveredSlot(d))
          .on('mouseleave', () => setHoveredSlot(null))
          .on('click', (event, d: MissedHourSlot) => setSelectedSlot(selectedSlot?.hour === d.hour ? null : d));
      } else {
        // Single Bars (Missed Count or Missed Rate)
        g.selectAll<SVGRectElement, MissedHourSlot>('.bar-missed')
          .data(displaySlots)
          .enter()
          .append('rect')
          .attr('class', 'bar-missed cursor-pointer transition-all duration-200')
          .attr('x', (d: MissedHourSlot) => x(String(d.hour)) || 0)
          .attr('width', x.bandwidth())
          .attr('y', (d: MissedHourSlot) => {
            const val = metricMode === 'MISSED_COUNT' ? d.total_missed : d.missed_rate;
            return val > 0 ? y(val) : innerHeight - 2;
          })
          .attr('height', (d: MissedHourSlot) => {
            const val = metricMode === 'MISSED_COUNT' ? d.total_missed : d.missed_rate;
            return val > 0 ? Math.max(4, innerHeight - y(val)) : 2;
          })
          .attr('fill', (d: MissedHourSlot) => {
            const val = metricMode === 'MISSED_COUNT' ? d.total_missed : d.missed_rate;
            if (val === 0) return '#cbd5e1';
            if (d.is_peak_vulnerable) return 'url(#peakBarGradient)';
            if (d.severity === 'critical') return '#e11d48';
            if (d.severity === 'high') return '#f43f5e';
            return '#fb7185';
          })
          .attr('rx', (d: MissedHourSlot) => {
            const val = metricMode === 'MISSED_COUNT' ? d.total_missed : d.missed_rate;
            return val > 0 ? 5 : 1;
          })
          .attr('filter', (d: MissedHourSlot) => (d.total_missed > 0 ? 'url(#barShadow)' : 'none'))
          .attr('stroke', (d: MissedHourSlot) => (selectedSlot?.hour === d.hour ? '#ffffff' : 'none'))
          .attr('stroke-width', (d: MissedHourSlot) => (selectedSlot?.hour === d.hour ? 2 : 0))
          .on('mouseenter', (event, d: MissedHourSlot) => setHoveredSlot(d))
          .on('mouseleave', () => setHoveredSlot(null))
          .on('click', (event, d: MissedHourSlot) => setSelectedSlot(selectedSlot?.hour === d.hour ? null : d));

        // Value text labels above non-zero bars
        g.selectAll<SVGTextElement, MissedHourSlot>('.bar-label')
          .data(displaySlots.filter((d: MissedHourSlot) => (metricMode === 'MISSED_COUNT' ? d.total_missed > 0 : d.missed_rate > 0)))
          .enter()
          .append('text')
          .attr('class', 'bar-label pointer-events-none font-bold')
          .attr('x', (d: MissedHourSlot) => (x(String(d.hour)) || 0) + x.bandwidth() / 2)
          .attr('y', (d: MissedHourSlot) => {
            const val = metricMode === 'MISSED_COUNT' ? d.total_missed : d.missed_rate;
            return y(val) - 6;
          })
          .attr('text-anchor', 'middle')
          .attr('fill', (d: MissedHourSlot) => (d.is_peak_vulnerable ? '#dc2626' : '#64748b'))
          .attr('font-size', '10px')
          .text((d: MissedHourSlot) => (metricMode === 'MISSED_COUNT' ? `${d.total_missed}` : `${d.missed_rate}%`));
      }
    } else {
      // TIME OF DAY GROUP VIEW (5 Major Segments)
      const groups = analysis.time_of_day_groups;
      const x = d3
        .scaleBand<string>()
        .domain(groups.map((g) => g.label))
        .range([0, innerWidth])
        .padding(0.35);

      const maxMissed = Math.max(3, d3.max(groups, (g: TimeOfDayGroup) => g.total_missed) ?? 1);
      yGridScale.domain([0, metricMode === 'MISSED_RATE' ? 100 : maxMissed]);
      const y = yGridScale;

      // Draw horizontal grid lines
      g.append('g')
        .attr('class', 'grid')
        .call(
          d3
            .axisLeft(y)
            .ticks(4)
            .tickSize(-innerWidth)
            .tickFormat(() => '')
        )
        .selectAll('line')
        .attr('stroke', 'currentColor')
        .attr('stroke-opacity', '0.08')
        .attr('stroke-dasharray', '3,3');
      g.select('.grid .domain').remove();

      // X Axis
      const xAxis = g
        .append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x));

      xAxis.select('.domain').attr('stroke', '#94a3b8').attr('stroke-opacity', '0.3');
      xAxis
        .selectAll('text')
        .attr('fill', '#475569')
        .attr('font-size', '11px')
        .attr('font-weight', '700');

      // Y Axis
      const yAxis = g.append('g').call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickFormat((d) => (metricMode === 'MISSED_RATE' ? `${d}%` : String(d)))
      );
      yAxis.select('.domain').remove();
      yAxis
        .selectAll('text')
        .attr('fill', '#64748b')
        .attr('font-size', '10px')
        .attr('font-weight', '600');

      // Bars
      g.selectAll<SVGRectElement, TimeOfDayGroup>('.bar-tod')
        .data(groups)
        .enter()
        .append('rect')
        .attr('class', 'bar-tod cursor-pointer transition-all')
        .attr('x', (d: TimeOfDayGroup) => x(d.label) || 0)
        .attr('width', x.bandwidth())
        .attr('y', (d: TimeOfDayGroup) => {
          const val = metricMode === 'MISSED_RATE' ? d.missed_rate : d.total_missed;
          return val > 0 ? y(val) : innerHeight - 2;
        })
        .attr('height', (d: TimeOfDayGroup) => {
          const val = metricMode === 'MISSED_RATE' ? d.missed_rate : d.total_missed;
          return val > 0 ? Math.max(4, innerHeight - y(val)) : 2;
        })
        .attr('fill', (d: TimeOfDayGroup) => (d.total_missed > 0 ? d.color : '#cbd5e1'))
        .attr('rx', 6)
        .attr('filter', (d: TimeOfDayGroup) => (d.total_missed > 0 ? 'url(#barShadow)' : 'none'))
        .on('click', (event, d: TimeOfDayGroup) => setSelectedTodGroup(selectedTodGroup?.id === d.id ? null : d));

      // Labels
      g.selectAll<SVGTextElement, TimeOfDayGroup>('.bar-tod-label')
        .data(groups.filter((g: TimeOfDayGroup) => g.total_missed > 0))
        .enter()
        .append('text')
        .attr('class', 'bar-tod-label pointer-events-none font-bold')
        .attr('x', (d: TimeOfDayGroup) => (x(d.label) || 0) + x.bandwidth() / 2)
        .attr('y', (d: TimeOfDayGroup) => {
          const val = metricMode === 'MISSED_RATE' ? d.missed_rate : d.total_missed;
          return y(val) - 6;
        })
        .attr('text-anchor', 'middle')
        .attr('fill', (d: TimeOfDayGroup) => d.color)
        .attr('font-size', '11px')
        .text((d: TimeOfDayGroup) => (metricMode === 'MISSED_RATE' ? `${d.missed_rate}%` : `${d.total_missed} missed`));
    }
  }, [displaySlots, analysis, chartMode, metricMode, selectedSlot]);

  const activeFocus = hoveredSlot || selectedSlot;

  return (
    <div
      id="common-missed-dose-hours-section"
      className={`bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors ${className}`}
    >
      {/* Header & Controls Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60 shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Common Missed-Dose Hours
                </h3>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                  D3.js Chrono-Analysis
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Identify which times of day <strong>{patientName}</strong> struggles most with medication compliance.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Filtering Chips */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle: 24h Breakdown vs Time-of-Day Segments */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              id="missed-hours-mode-hourly"
              onClick={() => {
                setChartMode('HOURLY');
                setSelectedTodGroup(null);
              }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                chartMode === 'HOURLY'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Hourly (24h)</span>
            </button>
            <button
              id="missed-hours-mode-tod"
              onClick={() => {
                setChartMode('TIME_OF_DAY');
                setSelectedSlot(null);
              }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                chartMode === 'TIME_OF_DAY'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Time Slots</span>
            </button>
          </div>

          {/* Metric Toggle: Missed Count vs Missed Rate % */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setMetricMode('MISSED_COUNT')}
              className={`px-2.5 py-1.5 rounded-lg transition ${
                metricMode === 'MISSED_COUNT'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="View absolute count of missed doses"
            >
              Missed Count
            </button>
            <button
              onClick={() => setMetricMode('MISSED_RATE')}
              className={`px-2.5 py-1.5 rounded-lg transition ${
                metricMode === 'MISSED_RATE'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="View non-compliance percentage rate"
            >
              Missed Rate %
            </button>
            {chartMode === 'HOURLY' && (
              <button
                onClick={() => setMetricMode('STACKED')}
                className={`px-2.5 py-1.5 rounded-lg transition ${
                  metricMode === 'STACKED'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="View Taken vs Missed stacked comparison"
              >
                Taken vs Missed
              </button>
            )}
          </div>

          {/* Date Range Selector Chips */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setSelectedRange(7)}
              className={`px-2.5 py-1.5 rounded-lg transition ${
                selectedRange === 7
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              7d
            </button>
            <button
              onClick={() => setSelectedRange(14)}
              className={`px-2.5 py-1.5 rounded-lg transition ${
                selectedRange === 14
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              14d
            </button>
            <button
              onClick={() => setSelectedRange(30)}
              className={`px-2.5 py-1.5 rounded-lg transition ${
                selectedRange === 30
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              30d
            </button>
            <button
              onClick={() => setSelectedRange(null)}
              className={`px-2.5 py-1.5 rounded-lg transition ${
                selectedRange === null
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Time
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Summary Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Peak Vulnerability Hour */}
        <div className="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Peak Vulnerable Hour
            </span>
            {analysis.peak_hour && analysis.peak_hour.total_missed > 0 && (
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-rose-200/80 dark:bg-rose-900/80 text-rose-800 dark:text-rose-200 animate-pulse">
                High Risk
              </span>
            )}
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {analysis.peak_hour && analysis.peak_hour.total_missed > 0
                ? analysis.peak_hour.hour_label
                : 'None Identified'}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {analysis.peak_hour && analysis.peak_hour.total_missed > 0
                ? `${analysis.peak_hour.total_missed} missed doses (${analysis.peak_hour.missed_rate}% non-compliance)`
                : '100% adherence across all scheduled hours!'}
            </p>
          </div>
        </div>

        {/* Card 2: Highest Compliance Window */}
        <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Best Adherence Window
            </span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-200/80 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200">
              Optimal
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {analysis.best_hour ? analysis.best_hour.hour_label : '8 AM Morning'}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {analysis.best_hour
                ? `${analysis.best_hour.adherence_rate}% adherence (${analysis.best_hour.total_taken} verified)`
                : 'Consistent morning routine'}
            </p>
          </div>
        </div>

        {/* Card 3: Total Missed vs Scheduled */}
        <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-slate-500" />
              Total Missed in Range
            </span>
            <span className="text-xs font-mono font-extrabold text-slate-700 dark:text-slate-300">
              {selectedRange ? `${selectedRange}d snapshot` : 'All time'}
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 tracking-tight flex items-baseline gap-1.5">
              {analysis.total_missed}{' '}
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                / {analysis.total_scheduled} scheduled
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Overall failure rate: <strong>{analysis.overall_missed_rate}%</strong>
            </p>
          </div>
        </div>

        {/* Card 4: Actionable Behavioral Recommendation */}
        <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              Clinical Focus
            </span>
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
              Target: {analysis.actionable_recommendation.target_hour_label.split(' ')[0]}
            </span>
          </div>
          <div className="mt-2">
            <div className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
              {analysis.actionable_recommendation.title}
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
              {analysis.actionable_recommendation.clinical_tip}
            </p>
          </div>
        </div>
      </div>

      {/* Main D3 Bar Chart Canvas & Interactive Inspection Panel */}
      <div className="space-y-4">
        {/* D3 Canvas Container */}
        <div
          ref={containerRef}
          className="relative bg-slate-50/80 dark:bg-slate-950/40 rounded-2xl p-3 sm:p-4 border border-slate-200/80 dark:border-slate-800 overflow-hidden"
        >
          {/* Chart Header Info */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-2 pb-2">
            <span className="font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {chartMode === 'HOURLY'
                ? 'Time of Day (Hour-by-Hour 24h Axis)'
                : 'Standard Clinical Time Slots'}
            </span>
            <span className="text-[11px] font-mono">
              {metricMode === 'MISSED_COUNT'
                ? 'Y-Axis: Total Missed Doses'
                : metricMode === 'MISSED_RATE'
                ? 'Y-Axis: Non-Adherence %'
                : 'Y-Axis: Stacked Doses'}
            </span>
          </div>

          <svg ref={svgRef} className="w-full" />

          {/* Interactive Hover / Selection Floating Info Badge */}
          {activeFocus && (
            <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-fade-in text-xs">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-lg font-bold text-white ${
                    activeFocus.is_peak_vulnerable ? 'bg-rose-600' : 'bg-slate-700'
                  }`}
                >
                  {activeFocus.hour_label}
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{activeFocus.hour_display}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-normal">
                      {activeFocus.time_of_day_label}
                    </span>
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                    Missed: <strong className="text-rose-600 dark:text-rose-400">{activeFocus.total_missed}</strong> / {activeFocus.total_scheduled} scheduled ({activeFocus.missed_rate}% failure rate)
                  </div>
                </div>
              </div>

              {activeFocus.top_missed_meds.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-400 text-[11px]">Most skipped:</span>
                  {activeFocus.top_missed_meds.slice(0, 2).map((m) => (
                    <span
                      key={m.name}
                      className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-semibold"
                    >
                      {m.name} ({m.count}x)
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Time-of-Day Slots Quick Bar Gauges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2">
          {analysis.time_of_day_groups.map((grp) => {
            const isHighest = grp.total_missed > 0 && grp.total_missed === Math.max(...analysis.time_of_day_groups.map(g => g.total_missed));
            return (
              <div
                key={grp.id}
                onClick={() => {
                  setChartMode('TIME_OF_DAY');
                  setSelectedTodGroup(grp);
                }}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  selectedTodGroup?.id === grp.id
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-400 ring-2 ring-rose-400/20 shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                  <span className="flex items-center gap-1.5">
                    {grp.id === 'EARLY_MORNING' && <Sunrise className="w-3.5 h-3.5 text-sky-500" />}
                    {grp.id === 'MORNING' && <Sun className="w-3.5 h-3.5 text-amber-500" />}
                    {grp.id === 'AFTERNOON' && <Clock className="w-3.5 h-3.5 text-orange-500" />}
                    {grp.id === 'EVENING' && <Sunset className="w-3.5 h-3.5 text-purple-500" />}
                    {grp.id === 'NIGHT' && <Moon className="w-3.5 h-3.5 text-indigo-500" />}
                    {grp.label}
                  </span>
                  {isHighest && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                      Peak
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-baseline justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">{grp.time_span}</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    {grp.total_missed} missed
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-1.5 w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${grp.total_scheduled > 0 ? (grp.total_taken / grp.total_scheduled) * 100 : 100}%`,
                      backgroundColor: grp.missed_rate > 30 ? '#ef4444' : grp.missed_rate > 0 ? '#f59e0b' : '#10b981'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Hour Deep Drill-Down Card */}
        {selectedSlot && (
          <div
            id="hourly-drilldown-card"
            className="p-5 rounded-2xl bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-teal-500/10 border border-rose-200 dark:border-rose-900/60 shadow-sm space-y-3 animate-fade-in"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-rose-500 text-white font-black text-base shadow-sm">
                  {selectedSlot.hour_label}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Audit Breakdown: {selectedSlot.hour_display}</span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200">
                      {selectedSlot.time_of_day_label}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {selectedSlot.total_missed} non-compliant instances out of {selectedSlot.total_scheduled} scheduled doses ({selectedSlot.adherence_rate}% adherence rate).
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSlot(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              {/* Missed Medication Distribution */}
              <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-rose-500" />
                  Medicines Missed at this Hour:
                </div>
                {selectedSlot.top_missed_meds.length > 0 ? (
                  <div className="space-y-1">
                    {selectedSlot.top_missed_meds.map((m) => (
                      <div key={m.name} className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">{m.name}</span>
                        <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                          {m.count} time{m.count > 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic">No missed medicines at this hour.</div>
                )}
              </div>

              {/* Reported Rationale */}
              <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1.5 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-500" />
                  Patient-Reported Reasons:
                </div>
                {selectedSlot.top_reasons.length > 0 ? (
                  <div className="space-y-1">
                    {selectedSlot.top_reasons.map((r, i) => (
                      <div key={i} className="text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-1.5">
                        <span className="text-amber-500">•</span>
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-400 italic">No specific reasons reported.</div>
                )}
              </div>
            </div>

            {/* Direct Filter Action */}
            {onFilterByHour && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => onFilterByHour(selectedSlot.hour)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 shadow-2xs hover:shadow-xs transition"
                >
                  <span>Filter dose audit logs to {selectedSlot.hour_label}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
