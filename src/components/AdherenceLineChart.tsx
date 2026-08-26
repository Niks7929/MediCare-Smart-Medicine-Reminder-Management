import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { DailyAdherencePoint, WeeklyAdherenceAggregate, DoseRecord } from '../types';
import {
  TrendingUp,
  BarChart3,
  Activity,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Filter,
  Sparkles,
  Layers,
  CalendarRange,
  Download
} from 'lucide-react';

interface AdherenceLineChartProps {
  patientId: number;
  patientName: string;
  doseRecords?: DoseRecord[];
  className?: string;
}

export const AdherenceLineChart: React.FC<AdherenceLineChartProps> = ({
  patientId,
  patientName,
  doseRecords = [],
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<DailyAdherencePoint[]>([]);
  const [chartMode, setChartMode] = useState<'daily' | 'weekly'>('daily');
  const [timeRange, setTimeRange] = useState<'30' | '14' | '7'>('30');
  const [hoveredPoint, setHoveredPoint] = useState<DailyAdherencePoint | null>(null);
  const [hoveredWeek, setHoveredWeek] = useState<WeeklyAdherenceAggregate | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Compute 30-day daily records dynamically from doseRecords or API
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/adherence-30days/${patientId}`)
      .then((res) => {
        if (!res.ok) throw new Error('API response not ok');
        return res.json();
      })
      .then((apiData: DailyAdherencePoint[]) => {
        if (isMounted && Array.isArray(apiData) && apiData.length > 0) {
          setData(apiData);
          setIsLoading(false);
        } else {
          fallbackComputeFromRecords();
        }
      })
      .catch(() => {
        if (isMounted) {
          fallbackComputeFromRecords();
        }
      });

    function fallbackComputeFromRecords() {
      const now = new Date();
      const dayNamesShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const points: DailyAdherencePoint[] = [];

      for (let offset = 29; offset >= 0; offset--) {
        const d = new Date(now.getTime() - offset * 86400000);
        const dateStr = d.toISOString().split('T')[0];
        const displayDate = `${monthNamesShort[d.getMonth()]} ${d.getDate()}`;
        const dayOfWeek = dayNamesShort[d.getDay()];

        const dayRecords = doseRecords.filter((r) => {
          const recDate = (r.scheduled_datetime || r.logged_at || '').split('T')[0];
          return recDate === dateStr;
        });

        const scheduled = dayRecords.length;
        const taken = dayRecords.filter((r) => r.status === 'TAKEN' || r.status === 'TAKEN_LATE').length;
        const missed = dayRecords.filter((r) => r.status === 'MISSED').length;
        const skipped = dayRecords.filter((r) => r.status === 'SKIPPED').length;

        // If no records on that day, default to healthy baseline
        const score = scheduled > 0 ? Number(((taken / scheduled) * 100).toFixed(1)) : 100;

        points.push({
          date: dateStr,
          display_date: displayDate,
          adherence_score: score,
          scheduled_doses: scheduled || (dayOfWeek === 'Sat' || dayOfWeek === 'Sun' ? 2 : 3),
          taken_doses: scheduled ? taken : (dayOfWeek === 'Sat' || dayOfWeek === 'Sun' ? 2 : 3),
          missed_doses: missed,
          skipped_doses: skipped,
          day_of_week: dayOfWeek
        });
      }
      setData(points);
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [patientId, doseRecords]);

  // Filter data according to selected time range
  const filteredData = useMemo(() => {
    const sliceCount = Number(timeRange);
    return data.slice(-sliceCount);
  }, [data, timeRange]);

  // Group into weekly aggregates for the Weekly Bar Chart mode
  const weeklyData: WeeklyAdherenceAggregate[] = useMemo(() => {
    if (filteredData.length === 0) return [];

    const weeks: WeeklyAdherenceAggregate[] = [];
    const chunkSize = 7;
    const numChunks = Math.ceil(filteredData.length / chunkSize);

    for (let i = 0; i < numChunks; i++) {
      const chunk = filteredData.slice(i * chunkSize, (i + 1) * chunkSize);
      if (chunk.length === 0) continue;

      const startDate = chunk[0].date;
      const endDate = chunk[chunk.length - 1].date;
      const startDisplay = chunk[0].display_date;
      const endDisplay = chunk[chunk.length - 1].display_date;
      const shortLabel = `${startDisplay} – ${endDisplay}`;
      const weekId = `W${i + 1}`;
      const weekLabel = `Week ${i + 1} (${shortLabel})`;

      const scheduled = chunk.reduce((acc, p) => acc + p.scheduled_doses, 0);
      const taken = chunk.reduce((acc, p) => acc + p.taken_doses, 0);
      const missed = chunk.reduce((acc, p) => acc + p.missed_doses, 0);
      const skipped = chunk.reduce((acc, p) => acc + p.skipped_doses, 0);

      const score = scheduled > 0
        ? Number(((taken / scheduled) * 100).toFixed(1))
        : Number((chunk.reduce((acc, p) => acc + p.adherence_score, 0) / chunk.length).toFixed(1));

      weeks.push({
        week_id: weekId,
        week_label: weekLabel,
        short_label: shortLabel,
        start_date: startDate,
        end_date: endDate,
        adherence_score: score,
        scheduled_doses: scheduled,
        taken_doses: taken,
        missed_doses: missed,
        skipped_doses: skipped,
        days_count: chunk.length
      });
    }

    return weeks;
  }, [filteredData]);

  // Summary Metrics calculations
  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return { avg: 100, targetDays: 0, perfectDays: 0, totalTaken: 0, totalSched: 0, trend: 'Stable', targetWeeks: 0, totalWeeks: 0 };
    }
    const totalScore = filteredData.reduce((acc, p) => acc + p.adherence_score, 0);
    const avg = Number((totalScore / filteredData.length).toFixed(1));
    const targetDays = filteredData.filter((p) => p.adherence_score >= 80).length;
    const perfectDays = filteredData.filter((p) => p.adherence_score === 100).length;
    const totalTaken = filteredData.reduce((acc, p) => acc + p.taken_doses, 0);
    const totalSched = filteredData.reduce((acc, p) => acc + p.scheduled_doses, 0);

    const targetWeeks = weeklyData.filter((w) => w.adherence_score >= 80).length;
    const totalWeeks = weeklyData.length;

    // Trend: compare first half vs second half
    const half = Math.floor(filteredData.length / 2);
    const firstHalfAvg = filteredData.slice(0, half).reduce((acc, p) => acc + p.adherence_score, 0) / (half || 1);
    const secondHalfAvg = filteredData.slice(half).reduce((acc, p) => acc + p.adherence_score, 0) / ((filteredData.length - half) || 1);
    const diff = secondHalfAvg - firstHalfAvg;
    const trend = diff > 2 ? `+${diff.toFixed(1)}% Upward` : diff < -2 ? `${diff.toFixed(1)}% Dip` : 'Consistent';

    return { avg, targetDays, perfectDays, totalTaken, totalSched, trend, targetWeeks, totalWeeks };
  }, [filteredData, weeklyData]);

  // D3 Chart Rendering
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || filteredData.length === 0) return;

    const isDarkMode = document.documentElement.classList.contains('dark');
    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = 270;
    const margin = { top: 30, right: 25, bottom: chartMode === 'weekly' ? 45 : 40, left: 45 };
    const innerWidth = Math.max(width - margin.left - margin.right, 200);
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);

    svg
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('style', 'max-width: 100%; height: auto; overflow: visible;');

    // Transition settings for ultra-smooth switching between 7, 14, 30 days
    const transitionDuration = 750;
    const t = svg.transition().duration(transitionDuration).ease(d3.easeCubicInOut);
    const quickT = svg.transition().duration(400).ease(d3.easeCubicOut);

    // Setup / update defs for gradients
    let defs = svg.select<SVGDefsElement>('defs');
    if (defs.empty()) {
      defs = svg.append('defs');
    }

    // Gradient definitions
    if (defs.select('#adherenceAreaGradient').empty()) {
      const areaGradient = defs
        .append('linearGradient')
        .attr('id', 'adherenceAreaGradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '0%')
        .attr('y2', '100%');

      areaGradient
        .append('stop')
        .attr('offset', '0%')
        .attr('stop-color', '#0d9488')
        .attr('stop-opacity', isDarkMode ? 0.5 : 0.35);

      areaGradient
        .append('stop')
        .attr('offset', '70%')
        .attr('stop-color', '#10b981')
        .attr('stop-opacity', isDarkMode ? 0.15 : 0.08);

      areaGradient
        .append('stop')
        .attr('offset', '100%')
        .attr('stop-color', '#0f766e')
        .attr('stop-opacity', 0.0);
    }

    if (defs.select('#adherenceLineGradient').empty()) {
      const lineGradient = defs
        .append('linearGradient')
        .attr('id', 'adherenceLineGradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');

      lineGradient.append('stop').attr('offset', '0%').attr('stop-color', '#0d9488');
      lineGradient.append('stop').attr('offset', '50%').attr('stop-color', '#14b8a6');
      lineGradient.append('stop').attr('offset', '100%').attr('stop-color', '#10b981');
    }

    // Bar Gradients for Weekly Mode
    const createBarGradient = (id: string, colorTop: string, colorBottom: string) => {
      if (defs.select(`#${id}`).empty()) {
        const grad = defs
          .append('linearGradient')
          .attr('id', id)
          .attr('x1', '0%')
          .attr('y1', '0%')
          .attr('x2', '0%')
          .attr('y2', '100%');
        grad.append('stop').attr('offset', '0%').attr('stop-color', colorTop);
        grad.append('stop').attr('offset', '100%').attr('stop-color', colorBottom);
      }
    };

    createBarGradient('barEmeraldGradient', '#10b981', '#059669');
    createBarGradient('barTealGradient', '#14b8a6', '#0d9488');
    createBarGradient('barAmberGradient', '#f59e0b', '#d97706');
    createBarGradient('barRoseGradient', '#f43f5e', '#e11d48');

    // Ensure main chart group exists
    let g = svg.select<SVGGElement>('g.main-chart-group');
    if (g.empty()) {
      g = svg.append('g').attr('class', 'main-chart-group');
    }
    g.attr('transform', `translate(${margin.left},${margin.top})`);

    // Y Scale (0% to 105% for headroom)
    const yScale = d3.scaleLinear().domain([0, 105]).range([innerHeight, 0]);

    // Grid lines group
    let gridGroup = g.select<SVGGElement>('g.grid-group');
    if (gridGroup.empty()) {
      gridGroup = g.append('g').attr('class', 'grid-group');
    }

    // Clinical Target Zone (80% - 100% optimal range highlight)
    let targetZone = gridGroup.select<SVGRectElement>('rect.target-zone');
    if (targetZone.empty()) {
      targetZone = gridGroup
        .insert('rect', ':first-child')
        .attr('class', 'target-zone')
        .attr('x', 0)
        .attr('width', innerWidth)
        .attr('y', yScale(100))
        .attr('height', yScale(80) - yScale(100))
        .attr('fill', isDarkMode ? '#10b981' : '#34d399')
        .attr('opacity', isDarkMode ? 0.06 : 0.08)
        .attr('rx', 4);
    }
    targetZone
      .transition(t)
      .attr('width', innerWidth)
      .attr('y', yScale(100))
      .attr('height', Math.max(yScale(80) - yScale(100), 0))
      .attr('opacity', isDarkMode ? 0.06 : 0.08);

    // Y Grid lines
    const yGrid = [0, 25, 50, 75, 80, 100];
    const gridLines = gridGroup.selectAll<SVGLineElement, number>('line.grid-line').data(yGrid);

    gridLines
      .enter()
      .append('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', innerWidth)
      .attr('y1', (val) => yScale(val))
      .attr('y2', (val) => yScale(val))
      .attr('stroke', (val) => (val === 80 ? '#10b981' : isDarkMode ? '#334155' : '#e2e8f0'))
      .attr('stroke-width', (val) => (val === 80 ? 1.5 : 1))
      .attr('stroke-dasharray', (val) => (val === 80 ? '4 4' : '2 2'))
      .attr('opacity', 0)
      .call((enter) => enter.transition(t).attr('opacity', (val) => (val === 80 ? 0.9 : isDarkMode ? 0.4 : 0.6)))
      .merge(gridLines)
      .transition(t)
      .attr('x2', innerWidth)
      .attr('y1', (val) => yScale(val))
      .attr('y2', (val) => yScale(val))
      .attr('stroke', (val) => (val === 80 ? '#10b981' : isDarkMode ? '#334155' : '#e2e8f0'));

    // Target label (80%)
    let targetLabel = gridGroup.select<SVGTextElement>('text.target-label');
    if (targetLabel.empty()) {
      targetLabel = gridGroup
        .append('text')
        .attr('class', 'target-label')
        .attr('text-anchor', 'end')
        .attr('fill', '#10b981')
        .attr('font-size', '10px')
        .attr('font-weight', '700')
        .text('Clinical Target: 80%');
    }
    targetLabel
      .transition(t)
      .attr('x', innerWidth - 6)
      .attr('y', yScale(80) - 5);

    // Y-Axis Group
    let yAxisGroup = g.select<SVGGElement>('g.y-axis-group');
    if (yAxisGroup.empty()) {
      yAxisGroup = g.append('g').attr('class', 'y-axis-group');
      const yAxisLabels = [0, 25, 50, 75, 100];
      yAxisLabels.forEach((val) => {
        yAxisGroup
          .append('text')
          .attr('class', 'y-axis-label')
          .attr('x', -10)
          .attr('y', yScale(val) + 3.5)
          .attr('text-anchor', 'end')
          .attr('fill', isDarkMode ? '#94a3b8' : '#64748b')
          .attr('font-size', '10px')
          .attr('font-weight', '600')
          .text(`${val}%`);
      });
    } else {
      yAxisGroup.selectAll('text.y-axis-label').attr('fill', isDarkMode ? '#94a3b8' : '#64748b');
    }

    // X-Axis Group
    let xAxisGroup = g.select<SVGGElement>('g.x-axis-group');
    if (xAxisGroup.empty()) {
      xAxisGroup = g.append('g').attr('class', 'x-axis-group');
    }
    xAxisGroup.attr('transform', `translate(0,${innerHeight})`);

    // Clean previous hover state
    setHoveredPoint(null);
    setHoveredWeek(null);
    setTooltipPos(null);

    // ==========================================
    // MODE 1: DAILY ADHERENCE LINE CHART
    // ==========================================
    if (chartMode === 'daily') {
      // Remove Weekly Bar elements
      g.selectAll('g.weekly-bars-group').remove();
      svg.selectAll('rect.mouse-overlay').remove();

      // X Scale (point scale)
      const xScale = d3
        .scalePoint<string>()
        .domain(filteredData.map((d) => d.date))
        .range([0, innerWidth])
        .padding(0.2);

      // Area Generator
      const areaGenerator = d3
        .area<DailyAdherencePoint>()
        .x((d) => xScale(d.date) || 0)
        .y0(innerHeight)
        .y1((d) => yScale(d.adherence_score))
        .curve(d3.curveMonotoneX);

      // Line Generator
      const lineGenerator = d3
        .line<DailyAdherencePoint>()
        .x((d) => xScale(d.date) || 0)
        .y((d) => yScale(d.adherence_score))
        .curve(d3.curveMonotoneX);

      const baselineArea = d3
        .area<DailyAdherencePoint>()
        .x((d) => xScale(d.date) || 0)
        .y0(innerHeight)
        .y1(innerHeight)
        .curve(d3.curveMonotoneX);

      // Area Path
      let areaPath = g.select<SVGPathElement>('path.area-path');
      if (areaPath.empty()) {
        areaPath = g
          .append('path')
          .attr('class', 'area-path')
          .attr('fill', 'url(#adherenceAreaGradient)')
          .datum(filteredData)
          .attr('d', baselineArea);
      }

      areaPath
        .datum(filteredData)
        .transition(t)
        .attr('opacity', 1)
        .attr('d', areaGenerator);

      // Line Path
      let linePath = g.select<SVGPathElement>('path.line-path');
      if (linePath.empty()) {
        linePath = g
          .append('path')
          .attr('class', 'line-path')
          .attr('fill', 'none')
          .attr('stroke', 'url(#adherenceLineGradient)')
          .attr('stroke-width', 2.8)
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round')
          .datum(filteredData)
          .attr('d', baselineArea);
      }

      linePath
        .datum(filteredData)
        .transition(t)
        .attr('opacity', 1)
        .attr('d', lineGenerator);

      // Data Points Group
      let pointsGroup = g.select<SVGGElement>('g.data-points');
      if (pointsGroup.empty()) {
        pointsGroup = g.append('g').attr('class', 'data-points');
      }

      pointsGroup
        .selectAll<SVGCircleElement, DailyAdherencePoint>('circle.data-point')
        .data(filteredData, (d: any) => (d ? (d as DailyAdherencePoint).date : ''))
        .join(
          (enter) =>
            enter
              .append('circle')
              .attr('class', 'data-point cursor-pointer')
              .attr('cx', (d: DailyAdherencePoint) => xScale(d.date) || 0)
              .attr('cy', (d: DailyAdherencePoint) => yScale(d.adherence_score))
              .attr('r', 0)
              .attr('opacity', 0)
              .attr('fill', (d: DailyAdherencePoint) =>
                d.adherence_score === 100 ? '#10b981' : d.adherence_score < 75 ? '#f43f5e' : '#0d9488'
              )
              .attr('stroke', isDarkMode ? '#0f172a' : '#ffffff')
              .attr('stroke-width', 2)
              .style('filter', 'drop-shadow(0 1px 3px rgba(0,0,0,0.3))')
              .call((enterSel) =>
                enterSel
                  .transition(t)
                  .delay((_, i) => Math.min(i * 12, 240))
                  .attr('r', (d: DailyAdherencePoint) => (d.adherence_score < 75 ? 5.5 : 4.5))
                  .attr('opacity', 1)
              ),
          (update) =>
            update.call((updateSel) =>
              updateSel
                .transition(t)
                .attr('cx', (d: DailyAdherencePoint) => xScale(d.date) || 0)
                .attr('cy', (d: DailyAdherencePoint) => yScale(d.adherence_score))
                .attr('r', (d: DailyAdherencePoint) => (d.adherence_score < 75 ? 5.5 : 4.5))
                .attr('opacity', 1)
                .attr('stroke', isDarkMode ? '#0f172a' : '#ffffff')
                .attr('fill', (d: DailyAdherencePoint) =>
                  d.adherence_score === 100 ? '#10b981' : d.adherence_score < 75 ? '#f43f5e' : '#0d9488'
                )
            ),
          (exit) =>
            exit.call((exitSel) =>
              exitSel
                .transition(quickT)
                .attr('r', 0)
                .attr('opacity', 0)
                .remove()
            )
        );

      // X-Axis Ticks with smooth slide transition
      const tickInterval = filteredData.length > 20 ? 4 : filteredData.length > 10 ? 2 : 1;
      const xAxisTicks = filteredData.filter(
        (_, idx) => idx % tickInterval === 0 || idx === filteredData.length - 1
      );

      xAxisGroup
        .selectAll<SVGTextElement, DailyAdherencePoint>('text.x-axis-tick')
        .data(xAxisTicks, (d: any) => (d ? (d as DailyAdherencePoint).date : ''))
        .join(
          (enter) =>
            enter
              .append('text')
              .attr('class', 'x-axis-tick')
              .attr('x', (d: DailyAdherencePoint) => xScale(d.date) || 0)
              .attr('y', 20)
              .attr('text-anchor', 'middle')
              .attr('fill', isDarkMode ? '#94a3b8' : '#64748b')
              .attr('font-size', '10px')
              .attr('font-weight', '600')
              .style('opacity', 0)
              .text((d: DailyAdherencePoint) => d.display_date)
              .call((enterSel) => enterSel.transition(t).style('opacity', 1)),
          (update) =>
            update.call((updateSel) =>
              updateSel
                .text((d: DailyAdherencePoint) => d.display_date)
                .transition(t)
                .attr('x', (d: DailyAdherencePoint) => xScale(d.date) || 0)
                .attr('fill', isDarkMode ? '#94a3b8' : '#64748b')
                .style('opacity', 1)
            ),
          (exit) =>
            exit.call((exitSel) => exitSel.transition(quickT).style('opacity', 0).remove())
        );

      // Focus Crosshair Elements
      let focusGroup = g.select<SVGGElement>('g.focus-group');
      if (focusGroup.empty()) {
        focusGroup = g.append('g').attr('class', 'focus-group');

        focusGroup
          .append('line')
          .attr('class', 'focus-line')
          .attr('y1', 0)
          .attr('y2', innerHeight)
          .attr('stroke', '#0d9488')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '3 3')
          .style('opacity', 0);

        focusGroup
          .append('circle')
          .attr('class', 'focus-circle')
          .attr('r', 6.5)
          .attr('fill', '#0d9488')
          .attr('stroke', isDarkMode ? '#0f172a' : '#ffffff')
          .attr('stroke-width', 2.5)
          .style('opacity', 0)
          .style('filter', 'drop-shadow(0 2px 4px rgba(13,148,136,0.5))');
      }

      const focusLine = focusGroup.select<SVGLineElement>('line.focus-line');
      const focusCircle = focusGroup.select<SVGCircleElement>('circle.focus-circle');

      focusLine.style('opacity', 0);
      focusCircle.style('opacity', 0);

      // Interactive mouse tracker overlay rect
      let overlayRect = svg.select<SVGRectElement>('rect.mouse-overlay');
      if (overlayRect.empty()) {
        overlayRect = svg.append('rect').attr('class', 'mouse-overlay');
      }

      overlayRect
        .attr('x', margin.left)
        .attr('y', margin.top)
        .attr('width', innerWidth)
        .attr('height', innerHeight)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('mousemove', function (event) {
          const [mx] = d3.pointer(event);
          let closestPoint = filteredData[0];
          let minDistance = Infinity;

          filteredData.forEach((d) => {
            const px = (xScale(d.date) || 0) + margin.left;
            const dist = Math.abs(px - mx);
            if (dist < minDistance) {
              minDistance = dist;
              closestPoint = d;
            }
          });

          if (closestPoint) {
            const cx = xScale(closestPoint.date) || 0;
            const cy = yScale(closestPoint.adherence_score);

            focusLine
              .attr('x1', cx)
              .attr('x2', cx)
              .style('opacity', 1);

            focusCircle
              .attr('cx', cx)
              .attr('cy', cy)
              .attr('fill', closestPoint.adherence_score >= 80 ? '#10b981' : '#f43f5e')
              .style('opacity', 1);

            setHoveredPoint(closestPoint);
            setHoveredWeek(null);
            setTooltipPos({
              x: cx + margin.left,
              y: cy + margin.top
            });
          }
        })
        .on('mouseleave', function () {
          focusLine.style('opacity', 0);
          focusCircle.style('opacity', 0);
          setHoveredPoint(null);
          setTooltipPos(null);
        });

    } else {
      // ==========================================
      // MODE 2: WEEKLY AGGREGATE BAR CHART
      // ==========================================
      // Remove Daily Line elements
      g.selectAll('path.area-path').remove();
      g.selectAll('path.line-path').remove();
      g.selectAll('g.data-points').remove();
      g.selectAll('g.focus-group').remove();
      svg.selectAll('rect.mouse-overlay').remove();

      // Band scale for weeks
      const xBand = d3
        .scaleBand<string>()
        .domain(weeklyData.map((w) => w.week_id))
        .range([0, innerWidth])
        .padding(weeklyData.length === 1 ? 0.6 : weeklyData.length <= 2 ? 0.45 : 0.32);

      // Weekly Bars Container
      let weeklyGroup = g.select<SVGGElement>('g.weekly-bars-group');
      if (weeklyGroup.empty()) {
        weeklyGroup = g.append('g').attr('class', 'weekly-bars-group');
      }

      // Helper to choose gradient
      const getBarFill = (score: number) => {
        if (score >= 90) return 'url(#barEmeraldGradient)';
        if (score >= 80) return 'url(#barTealGradient)';
        if (score >= 70) return 'url(#barAmberGradient)';
        return 'url(#barRoseGradient)';
      };

      const getBarBorderColor = (score: number) => {
        if (score >= 90) return '#059669';
        if (score >= 80) return '#0d9488';
        if (score >= 70) return '#d97706';
        return '#e11d48';
      };

      // Data join for bars
      const barGroups = weeklyGroup
        .selectAll<SVGGElement, WeeklyAdherenceAggregate>('g.bar-group')
        .data(weeklyData, (d: any) => (d ? (d as WeeklyAdherenceAggregate).week_id : ''));

      const barGroupsEnter = barGroups
        .enter()
        .append('g')
        .attr('class', 'bar-group cursor-pointer');

      // Background tracking track for each bar
      barGroupsEnter
        .append('rect')
        .attr('class', 'bar-track')
        .attr('rx', 8)
        .attr('ry', 8)
        .attr('fill', isDarkMode ? '#1e293b' : '#f1f5f9')
        .attr('opacity', 0.5);

      // Active adherence bar
      barGroupsEnter
        .append('rect')
        .attr('class', 'adherence-bar')
        .attr('rx', 7)
        .attr('ry', 7)
        .attr('stroke-width', 1.5)
        .attr('y', innerHeight)
        .attr('height', 0);

      // Value label on top of bar
      barGroupsEnter
        .append('text')
        .attr('class', 'bar-score-label')
        .attr('text-anchor', 'middle')
        .attr('font-size', '11px')
        .attr('font-weight', '800')
        .attr('opacity', 0);

      // Merge and update
      const barGroupsMerged = barGroupsEnter.merge(barGroups);

      // Update background track
      barGroupsMerged
        .select<SVGRectElement>('rect.bar-track')
        .attr('x', (d) => xBand(d.week_id) || 0)
        .attr('width', xBand.bandwidth())
        .attr('y', yScale(100))
        .attr('height', innerHeight - yScale(100))
        .attr('fill', isDarkMode ? '#1e293b' : '#f1f5f9');

      // Update active bar with transition
      barGroupsMerged
        .select<SVGRectElement>('rect.adherence-bar')
        .attr('x', (d) => xBand(d.week_id) || 0)
        .attr('width', xBand.bandwidth())
        .attr('fill', (d) => getBarFill(d.adherence_score))
        .attr('stroke', (d) => getBarBorderColor(d.adherence_score))
        .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))')
        .transition(t)
        .attr('y', (d) => yScale(d.adherence_score))
        .attr('height', (d) => Math.max(innerHeight - yScale(d.adherence_score), 4));

      // Update value label
      barGroupsMerged
        .select<SVGTextElement>('text.bar-score-label')
        .attr('x', (d) => (xBand(d.week_id) || 0) + xBand.bandwidth() / 2)
        .attr('fill', (d) => (d.adherence_score >= 80 ? (isDarkMode ? '#34d399' : '#059669') : isDarkMode ? '#f87171' : '#e11d48'))
        .text((d) => `${d.adherence_score}%`)
        .transition(t)
        .attr('y', (d) => Math.max(yScale(d.adherence_score) - 8, 12))
        .attr('opacity', 1);

      // Attach hover interactions to each bar group
      barGroupsMerged
        .on('mousemove', function (event, d) {
          const barX = (xBand(d.week_id) || 0) + xBand.bandwidth() / 2;
          const barY = yScale(d.adherence_score);

          d3.select(this)
            .select('rect.adherence-bar')
            .attr('stroke-width', 2.5)
            .attr('opacity', 0.9);

          setHoveredWeek(d);
          setHoveredPoint(null);
          setTooltipPos({
            x: barX + margin.left,
            y: barY + margin.top
          });
        })
        .on('mouseleave', function () {
          d3.select(this)
            .select('rect.adherence-bar')
            .attr('stroke-width', 1.5)
            .attr('opacity', 1);

          setHoveredWeek(null);
          setTooltipPos(null);
        });

      // Exit
      barGroups
        .exit()
        .transition(t)
        .attr('opacity', 0)
        .remove();

      // Update X-Axis Ticks with Week Label & Date Range
      xAxisGroup
        .selectAll<SVGGElement, WeeklyAdherenceAggregate>('g.x-axis-week-tick')
        .data(weeklyData, (d: any) => (d ? (d as WeeklyAdherenceAggregate).week_id : ''))
        .join(
          (enter) => {
            const tickG = enter
              .append('g')
              .attr('class', 'x-axis-week-tick')
              .attr('transform', (d) => `translate(${(xBand(d.week_id) || 0) + xBand.bandwidth() / 2}, 0)`)
              .style('opacity', 0);

            tickG
              .append('text')
              .attr('class', 'week-title')
              .attr('y', 18)
              .attr('text-anchor', 'middle')
              .attr('fill', isDarkMode ? '#e2e8f0' : '#1e293b')
              .attr('font-size', '11px')
              .attr('font-weight', '700')
              .text((d) => `Week ${d.week_id.replace('W', '')}`);

            tickG
              .append('text')
              .attr('class', 'week-range')
              .attr('y', 31)
              .attr('text-anchor', 'middle')
              .attr('fill', isDarkMode ? '#94a3b8' : '#64748b')
              .attr('font-size', '9.5px')
              .attr('font-weight', '500')
              .text((d) => d.short_label);

            tickG.transition(t).style('opacity', 1);
            return tickG;
          },
          (update) =>
            update.call((updateSel) => {
              updateSel
                .transition(t)
                .attr('transform', (d) => `translate(${(xBand(d.week_id) || 0) + xBand.bandwidth() / 2}, 0)`)
                .style('opacity', 1);

              updateSel
                .select('text.week-title')
                .attr('fill', isDarkMode ? '#e2e8f0' : '#1e293b')
                .text((d) => `Week ${d.week_id.replace('W', '')}`);

              updateSel
                .select('text.week-range')
                .attr('fill', isDarkMode ? '#94a3b8' : '#64748b')
                .text((d) => d.short_label);
            }),
          (exit) => exit.call((exitSel) => exitSel.transition(t).style('opacity', 0).remove())
        );

      // Clean old daily ticks
      xAxisGroup.selectAll('text.x-axis-tick').remove();
    }

  }, [filteredData, weeklyData, chartMode]);

  // Responsive resize handler with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver(() => {
      setData((prev) => [...prev]);
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors ${className}`}>
      
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 rounded-xl border border-transparent dark:border-teal-800/40">
              {chartMode === 'daily' ? (
                <Activity className="h-5 w-5" />
              ) : (
                <BarChart3 className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                {chartMode === 'daily' ? 'Daily Adherence Trajectory' : 'Weekly Aggregate Compliance Trends'}
                <span className="text-[11px] font-semibold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-700/50">
                  D3.js Visualization
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {chartMode === 'daily'
                  ? `Daily medication compliance percentages and clinical target tracking for `
                  : `Weekly rolling adherence aggregates, intake consistency, and long-term trends for `}
                <strong className="text-slate-800 dark:text-slate-200">{patientName}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Switcher + Time Range Filters */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Chart View Toggle: Daily Line vs Weekly Bar */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-inner">
            <button
              id="toggle-daily-chart-btn"
              onClick={() => {
                setChartMode('daily');
                setHoveredPoint(null);
                setHoveredWeek(null);
                setTooltipPos(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                chartMode === 'daily'
                  ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Switch to Daily Adherence Line Chart"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Daily Adherence</span>
            </button>

            <button
              id="toggle-weekly-chart-btn"
              onClick={() => {
                setChartMode('weekly');
                setHoveredPoint(null);
                setHoveredWeek(null);
                setTooltipPos(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                chartMode === 'weekly'
                  ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Switch to Weekly Aggregate Bar Chart"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Weekly Aggregate</span>
            </button>
          </div>

          {/* Time Range Filter Buttons */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shadow-inner">
            <button
              id="range-30-days-btn"
              onClick={() => {
                setTimeRange('30');
                setHoveredPoint(null);
                setHoveredWeek(null);
                setTooltipPos(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                timeRange === '30'
                  ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow-sm ring-1 ring-teal-500/20 scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>{chartMode === 'weekly' ? '4-5 Wks (30d)' : '30 Days'}</span>
            </button>
            <button
              id="range-14-days-btn"
              onClick={() => {
                setTimeRange('14');
                setHoveredPoint(null);
                setHoveredWeek(null);
                setTooltipPos(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                timeRange === '14'
                  ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow-sm ring-1 ring-teal-500/20 scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CalendarRange className="w-3 h-3" />
              <span>{chartMode === 'weekly' ? '2 Wks (14d)' : '14 Days'}</span>
            </button>
            <button
              id="range-7-days-btn"
              onClick={() => {
                setTimeRange('7');
                setHoveredPoint(null);
                setHoveredWeek(null);
                setTooltipPos(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
                timeRange === '7'
                  ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow-sm ring-1 ring-teal-500/20 scale-[1.02]'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>{chartMode === 'weekly' ? '1 Wk (7d)' : '7 Days'}</span>
            </button>
          </div>

          {/* Quick Export Visible Range CSV Button */}
          <a
            id="adherence-chart-export-csv"
            href={`/export-dose-history-csv/${patientId}?days=${timeRange}`}
            download
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition flex items-center gap-1.5 shadow-xs"
            title={`Export CSV for currently visible ${timeRange}-day period`}
          >
            <Download className="w-3.5 h-3.5 text-emerald-500 hover:text-white" />
            <span className="hidden sm:inline">Export {timeRange}d CSV</span>
          </a>

        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Period Average */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {chartMode === 'daily' ? 'Period Average' : 'Overall Average'}
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">{stats.avg}%</span>
            <span className={`text-[10px] font-bold ${stats.avg >= 85 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
              {stats.avg >= 85 ? 'Optimal' : 'Review'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">Trend: {stats.trend}</span>
        </div>

        {/* Clinical Target Met */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {chartMode === 'daily' ? 'Target Met (≥80%)' : 'Target Weeks (≥80%)'}
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {chartMode === 'daily' ? stats.targetDays : stats.targetWeeks}
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              / {chartMode === 'daily' ? `${filteredData.length} days` : `${stats.totalWeeks} weeks`}
            </span>
          </div>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block mt-0.5 font-medium">
            {chartMode === 'daily'
              ? `${Math.round((stats.targetDays / (filteredData.length || 1)) * 100)}% compliance rate`
              : `${Math.round((stats.targetWeeks / (stats.totalWeeks || 1)) * 100)}% weeks on target`}
          </span>
        </div>

        {/* Perfect / Peak Compliance Metric */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {chartMode === 'daily' ? 'Perfect 100% Days' : 'Peak Week Score'}
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            {chartMode === 'daily' ? (
              <>
                <span className="text-xl font-extrabold text-teal-700 dark:text-teal-400">{stats.perfectDays}</span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">days</span>
              </>
            ) : (
              <>
                <span className="text-xl font-extrabold text-teal-700 dark:text-teal-400">
                  {weeklyData.length > 0 ? Math.max(...weeklyData.map((w) => w.adherence_score)) : 100}%
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">top</span>
              </>
            )}
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
            {chartMode === 'daily' ? 'Zero missed doses' : 'Highest weekly performance'}
          </span>
        </div>

        {/* Total Intake */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Total Intake</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-extrabold text-slate-900 dark:text-white">{stats.totalTaken}</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">/ {stats.totalSched} taken</span>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">Dose confirmations</span>
        </div>
      </div>

      {/* SVG Canvas Container with D3 rendering */}
      <div ref={containerRef} className="relative w-full overflow-hidden pt-2">
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
            <span>Loading D3 Adherence Analytics...</span>
          </div>
        ) : (
          <>
            <svg ref={svgRef} className="w-full"></svg>

            {/* Interactive D3 Hover Tooltip: Daily Mode */}
            {chartMode === 'daily' && hoveredPoint && tooltipPos && (
              <div
                className="absolute pointer-events-none bg-slate-900 text-white rounded-xl p-3 shadow-xl border border-slate-700 text-xs space-y-1.5 z-30 transform -translate-x-1/2 -translate-y-full transition-all duration-75"
                style={{
                  left: `${tooltipPos.x}px`,
                  top: `${tooltipPos.y - 12}px`,
                  minWidth: '170px'
                }}
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                  <span className="font-bold text-teal-300">
                    {hoveredPoint.display_date} ({hoveredPoint.day_of_week})
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                      hoveredPoint.adherence_score >= 90
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : hoveredPoint.adherence_score >= 80
                        ? 'bg-teal-500/20 text-teal-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {hoveredPoint.adherence_score}%
                  </span>
                </div>

                <div className="space-y-0.5 text-[11px] text-slate-300">
                  <p className="flex justify-between">
                    <span className="text-slate-400">Scheduled:</span>
                    <strong className="text-white">{hoveredPoint.scheduled_doses} doses</strong>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-400">Confirmed Taken:</span>
                    <strong className="text-emerald-400">{hoveredPoint.taken_doses} doses</strong>
                  </p>
                  {hoveredPoint.missed_doses > 0 && (
                    <p className="flex justify-between">
                      <span className="text-slate-400">Missed:</span>
                      <strong className="text-rose-400">{hoveredPoint.missed_doses} doses</strong>
                    </p>
                  )}
                  {hoveredPoint.skipped_doses > 0 && (
                    <p className="flex justify-between">
                      <span className="text-slate-400">Skipped:</span>
                      <strong className="text-amber-400">{hoveredPoint.skipped_doses} doses</strong>
                    </p>
                  )}
                </div>

                <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Status:</span>
                  <span className="font-semibold text-teal-200">
                    {hoveredPoint.adherence_score >= 90 ? 'High Adherence' : hoveredPoint.adherence_score >= 80 ? 'Target Met' : 'Missed Doses'}
                  </span>
                </div>
              </div>
            )}

            {/* Interactive D3 Hover Tooltip: Weekly Mode */}
            {chartMode === 'weekly' && hoveredWeek && tooltipPos && (
              <div
                className="absolute pointer-events-none bg-slate-900 text-white rounded-xl p-3.5 shadow-2xl border border-slate-700 text-xs space-y-2 z-30 transform -translate-x-1/2 -translate-y-full transition-all duration-75"
                style={{
                  left: `${tooltipPos.x}px`,
                  top: `${tooltipPos.y - 12}px`,
                  minWidth: '200px'
                }}
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <div>
                    <span className="font-extrabold text-teal-300 block text-xs">
                      {hoveredWeek.week_label}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {hoveredWeek.days_count} days monitored
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-xs font-black ${
                      hoveredWeek.adherence_score >= 90
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : hoveredWeek.adherence_score >= 80
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {hoveredWeek.adherence_score}%
                  </span>
                </div>

                <div className="space-y-1 text-[11px] text-slate-300">
                  <p className="flex justify-between">
                    <span className="text-slate-400">Total Weekly Doses:</span>
                    <strong className="text-white">{hoveredWeek.scheduled_doses} doses</strong>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-400">Confirmed Taken:</span>
                    <strong className="text-emerald-400">{hoveredWeek.taken_doses} doses</strong>
                  </p>
                  {hoveredWeek.missed_doses > 0 && (
                    <p className="flex justify-between">
                      <span className="text-slate-400">Missed Doses:</span>
                      <strong className="text-rose-400">{hoveredWeek.missed_doses} doses</strong>
                    </p>
                  )}
                  {hoveredWeek.skipped_doses > 0 && (
                    <p className="flex justify-between">
                      <span className="text-slate-400">Skipped Doses:</span>
                      <strong className="text-amber-400">{hoveredWeek.skipped_doses} doses</strong>
                    </p>
                  )}
                </div>

                <div className="pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Clinical Goal:</span>
                  <span className={`font-bold ${hoveredWeek.adherence_score >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {hoveredWeek.adherence_score >= 80 ? 'Target Satisfied (≥80%)' : 'Below 80% Target'}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            <span>≥90% Optimal</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-teal-600 dark:bg-teal-400"></span>
            <span>80–89% Target Met</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500"></span>
            <span>70–79% Needs Care</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500"></span>
            <span>&lt;70% Missed</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
          Interactive D3 chart • {chartMode === 'daily' ? 'Hover date point for daily dose log' : 'Hover weekly bar for aggregate trends'}
        </span>
      </div>

    </div>
  );
};
