// OBE Analytics Section
// Modern, clean, and relevant learning outcomes & achievement indicators for Poliwako CAD Practice
import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  ArrowUpRight,
  ChevronDown,
  Layers,
  Sparkles,
  Target,
  FileCheck2
} from 'lucide-react';
import { GRADE_PREDICATE_RULES, getGradePredicate } from '../../utils/gradeCalculators';

interface OBEAnalyticsSectionProps {
  showMetricCards?: boolean;
  selectedPeriodFilter?: string;
  selectedClassFilter?: string;
  onNavigateTab?: (tab: string) => void;
}

// Convert points to smooth cubic bezier path
function getSplinePath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export const OBEAnalyticsSection: React.FC<OBEAnalyticsSectionProps> = ({
  showMetricCards = false,
  selectedPeriodFilter = 'ALL',
  selectedClassFilter = 'ALL',
  onNavigateTab
}) => {
  const { activeCourse, periods, participants, assessments, attendance, activeCourseId, learningUnits, submissions } = useApp();

  const coursePeriods = useMemo(() => {
    return periods.filter(p => p.courseId === activeCourseId);
  }, [periods, activeCourseId]);

  const [chartViewMode, setChartViewMode] = useState<'PERIOD' | 'UNIT' | 'COMPONENT'>('PERIOD');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Filter participants
  const courseParticipants = useMemo(() => {
    const periodIds = new Set(coursePeriods.map(p => p.id));
    return participants.filter(p => periodIds.has(p.periodId));
  }, [participants, coursePeriods]);

  const filteredParticipants = useMemo(() => {
    return courseParticipants.filter(p => {
      if (selectedPeriodFilter !== 'ALL' && p.periodId !== selectedPeriodFilter) return false;
      if (selectedClassFilter !== 'ALL' && p.student.className !== selectedClassFilter) return false;
      return true;
    });
  }, [courseParticipants, selectedPeriodFilter, selectedClassFilter]);

  // Real Learning & OBE Metrics Calculation
  const metrics = useMemo(() => {
    const total = filteredParticipants.length;
    const studentKeys = new Set(filteredParticipants.map(p => `${p.periodId}_${p.studentId}`));
    const validAssessments = assessments.filter(a =>
      studentKeys.has(`${a.periodId}_${a.studentId}`) &&
      Number.isFinite(a.finalScore) &&
      a.finalScore > 0
    );

    const scores = validAssessments.map(a => a.finalScore);
    const hasData = scores.length > 0;
    const gradedCount = validAssessments.length;

    const avgScore = hasData
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : '0.0';

    // Passing SKM (Standar Kelulusan Minimum = 75.0)
    const passedCount = scores.filter(s => s >= 75.0).length;
    const passRate = hasData
      ? Math.round((passedCount / scores.length) * 100)
      : 0;

    // Portfolio / Final Project Completion
    const completedProjectCount = filteredParticipants.filter(p => p.finalProjectConfirmed).length;
    const completionRate = total > 0
      ? Math.round((completedProjectCount / total) * 100)
      : 0;

    // Attendance Rate (Presensi Kehadiran >= 75%)
    const participantAttendance = attendance.filter(att =>
      filteredParticipants.some(p => p.studentId === att.studentId && p.periodId === att.periodId)
    );
    const eligibleCount = participantAttendance.filter(a => a.isEligible).length;
    const attendancePct = participantAttendance.length > 0
      ? Math.round((eligibleCount / participantAttendance.length) * 100)
      : 0;

    // Distribution across Poliwako OBE Predicates:
    // A (>=85), B (75-84.9), C (65-74.9), D/E (<65)
    const countA = scores.filter(s => s >= 85).length;
    const countB = scores.filter(s => s >= 75 && s < 85).length;
    const countC = scores.filter(s => s >= 65 && s < 75).length;
    const countRemedial = scores.filter(s => s < 65).length;
    const totalDist = scores.length;

    const pctA = totalDist > 0 ? Math.round((countA / totalDist) * 100) : 0;
    const pctB = totalDist > 0 ? Math.round((countB / totalDist) * 100) : 0;
    const pctC = totalDist > 0 ? Math.round((countC / totalDist) * 100) : 0;
    const pctRemedial = totalDist > 0 ? Math.max(0, 100 - (pctA + pctB + pctC)) : 0;

    const avgPred = hasData
      ? getGradePredicate(Number(avgScore))
      : { letter: '-', predicate: 'Belum Dinilai' };

    return {
      total,
      gradedCount,
      hasData,
      avgScore,
      passRate,
      completionRate,
      completedProjectCount,
      attendancePct,
      avgPred,
      distCounts: { countA, countB, countC, countRemedial },
      distPcts: { pctA, pctB, pctC, pctRemedial }
    };
  }, [filteredParticipants, assessments, attendance]);

  // Points for Dual Spline Curve Chart
  const splineChartData = useMemo(() => {
    let labels: string[] = [];
    let scoreValues: number[] = [];
    let progressValues: number[] = [];

    if (chartViewMode === 'PERIOD') {
      if (coursePeriods.length > 0) {
        labels = coursePeriods.slice(0, 7).map(p => p.name.replace(/Gelombang\s*/i, 'Gel '));
        scoreValues = coursePeriods.slice(0, 7).map(p => {
          const pScores = assessments.filter(a => a.periodId === p.id && Number.isFinite(a.finalScore) && a.finalScore > 0).map(a => a.finalScore);
          return pScores.length > 0 ? Math.round(pScores.reduce((a, b) => a + b, 0) / pScores.length) : 0;
        });
        progressValues = coursePeriods.slice(0, 7).map(p => {
          const pParts = participants.filter(part => part.periodId === p.id);
          const done = pParts.filter(part => part.finalProjectConfirmed).length;
          return pParts.length > 0 ? Math.round((done / pParts.length) * 100) : 0;
        });
      } else {
        labels = ['Belum Ada Periode'];
        scoreValues = [0];
        progressValues = [0];
      }
    } else if (chartViewMode === 'UNIT') {
      const periodIds = new Set(
        selectedPeriodFilter !== 'ALL'
          ? [selectedPeriodFilter]
          : coursePeriods.map(p => p.id)
      );
      const relevantUnits = learningUnits.filter(u => periodIds.has(u.periodId));

      const unitMap = new Map<number, { title: string; assignmentIds: string[] }>();
      relevantUnits.forEach(u => {
        const assignList = (u.assignments && u.assignments.length > 0)
          ? u.assignments
          : (u.assignment ? [u.assignment] : []);
        const assignIds = assignList.map(a => a.id);
        const existing = unitMap.get(u.unitNumber);
        if (existing) {
          assignIds.forEach(id => {
            if (!existing.assignmentIds.includes(id)) existing.assignmentIds.push(id);
          });
        } else {
          unitMap.set(u.unitNumber, {
            title: `Unit ${u.unitNumber}: ${u.title.length > 15 ? u.title.slice(0, 15) + '...' : u.title}`,
            assignmentIds: assignIds
          });
        }
      });

      const sortedUnitEntries = Array.from(unitMap.entries()).sort((a, b) => a[0] - b[0]);
      if (sortedUnitEntries.length > 0) {
        labels = sortedUnitEntries.map(e => e[1].title);
        progressValues = sortedUnitEntries.map(e => {
          const assignIds = new Set(e[1].assignmentIds);
          if (filteredParticipants.length === 0 || assignIds.size === 0) return 0;
          const studentsWithSubmission = new Set(
            submissions
              .filter(s => assignIds.has(s.assignmentId) && s.status !== 'REVISION_REQUIRED')
              .map(s => s.studentId)
          );
          const submittedCount = filteredParticipants.filter(p => studentsWithSubmission.has(p.studentId)).length;
          return Math.round((submittedCount / filteredParticipants.length) * 100);
        });
        scoreValues = sortedUnitEntries.map(() => {
          return metrics.hasData ? Math.round(Number(metrics.avgScore)) : 0;
        });
      } else {
        labels = ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Final Project'];
        scoreValues = [0, 0, 0, 0, 0];
        progressValues = [0, 0, 0, 0, 0];
      }
    } else {
      // OBE Components: Kualitas CAD (70%), Laporan (15%), Kedisiplinan (10%), Kreativitas (5%), Nilai Akhir
      labels = ['Kualitas CAD (70%)', 'Laporan (15%)', 'Kedisiplinan (10%)', 'Kreativitas (5%)', 'Nilai Akhir'];
      const studentKeys = new Set(filteredParticipants.map(p => `${p.periodId}_${p.studentId}`));
      const validAss = assessments.filter(a => studentKeys.has(`${a.periodId}_${a.studentId}`) && Number.isFinite(a.finalScore) && a.finalScore > 0);

      if (validAss.length > 0) {
        const avgKualitas = Math.round(validAss.reduce((sum, a) => sum + (a.qualityScore || 0), 0) / validAss.length);
        const avgLaporan = Math.round(validAss.reduce((sum, a) => sum + (a.reportScore || 0), 0) / validAss.length);
        const avgSikap = Math.round(validAss.reduce((sum, a) => sum + (a.attitudeScore || 0), 0) / validAss.length);
        const avgKreativitas = Math.round(validAss.reduce((sum, a) => sum + (a.creativityScore || 0), 0) / validAss.length);
        const avgAkhir = Math.round(validAss.reduce((sum, a) => sum + a.finalScore, 0) / validAss.length);

        scoreValues = [avgKualitas, avgLaporan, avgSikap, avgKreativitas, avgAkhir];
        const total = filteredParticipants.length || validAss.length;
        const assessedPct = Math.round((validAss.length / total) * 100);
        progressValues = [assessedPct, assessedPct, assessedPct, assessedPct, assessedPct];
      } else {
        scoreValues = [0, 0, 0, 0, 0];
        progressValues = [0, 0, 0, 0, 0];
      }
    }

    const count = labels.length;
    const startX = 50;
    const endX = 520;
    const stepX = count > 1 ? (endX - startX) / (count - 1) : 0;
    const xCoords = count === 1 ? [Math.round((startX + endX) / 2)] : labels.map((_, i) => Math.round(startX + i * stepX));

    // Map value (0 - 100) to SVG Y (195 down to 25)
    const getY = (val: number) => 195 - (Math.max(0, Math.min(100, val)) / 100) * 165;

    const scorePoints = xCoords.map((x, i) => ({
      x,
      y: getY(scoreValues[i]),
      val: scoreValues[i],
      label: labels[i]
    }));

    const progressPoints = xCoords.map((x, i) => ({
      x,
      y: getY(progressValues[i]),
      val: progressValues[i],
      label: labels[i]
    }));

    return {
      labels,
      scorePoints,
      progressPoints,
      scorePath: getSplinePath(scorePoints),
      progressPath: getSplinePath(progressPoints)
    };
  }, [chartViewMode, coursePeriods, assessments, participants, learningUnits, submissions, filteredParticipants, selectedPeriodFilter, metrics]);

  // Donut Ring Segments for OBE Grade Distribution
  const donutSegments = useMemo(() => {
    const { pctA, pctB, pctC, pctRemedial } = metrics.distPcts;
    const circumference = 2 * Math.PI * 62; // r = 62 -> ~389.56
    const pcts = [pctA, pctB, pctC, pctRemedial];

    // Segments:
    // 1. Nilai A (>=85): Indigo/Cyan (#06b6d4)
    // 2. Nilai B (75-84): Emerald (#10b981)
    // 3. Nilai C (65-74): Amber (#f59e0b)
    // 4. Remedial (<65): Rose (#f43f5e)
    const colors = ['#06b6d4', '#10b981', '#f59e0b', '#f43f5e'];
    const darkColors = ['#22d3ee', '#34d399', '#fbbf24', '#fb7185'];
    const ids = ['A', 'B', 'C', 'REMEDIAL'];
    const titles = ['Predikat A (≥85)', 'Predikat B (75-84)', 'Predikat C (65-74)', 'Remedial (<65)'];

    let currentOffset = 0;
    return pcts.map((pct, idx) => {
      const length = (pct / 100) * circumference;
      const seg = {
        id: ids[idx],
        title: titles[idx],
        pct,
        count: idx === 0 ? metrics.distCounts.countA : idx === 1 ? metrics.distCounts.countB : idx === 2 ? metrics.distCounts.countC : metrics.distCounts.countRemedial,
        color: colors[idx],
        darkColor: darkColors[idx],
        length,
        offset: currentOffset
      };
      currentOffset -= length;
      return seg;
    });
  }, [metrics.distPcts, metrics.distCounts]);

  return (
    <div className="space-y-6">
      
      {/* Optional Top 4 Summary Cards */}
      {showMetricCards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* 1. Total Mahasiswa */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {metrics.total}
                </span>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  Mahasiswa Praktik
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-800/60 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-4 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span className="flex items-center gap-0.5">
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                <span>100%</span>
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">Terdaftar aktif</span>
            </div>
          </div>

          {/* 2. Rata-rata Nilai OBE */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {metrics.hasData ? metrics.avgScore : '0.0'}
                </span>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  Rata-rata Nilai Akhir (IP)
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-4 text-xs font-bold">
              {metrics.hasData ? (
                <>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-[11px]">
                    Predikat {metrics.avgPred.letter} ({metrics.avgPred.predicate})
                  </span>
                  <span className="text-slate-400 font-normal text-[11px]">• SKM: 75</span>
                </>
              ) : (
                <>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[11px]">
                    Belum Dinilai ({metrics.gradedCount}/{metrics.total})
                  </span>
                  <span className="text-slate-400 font-normal text-[11px]">• SKM: 75</span>
                </>
              )}
            </div>
          </div>

          {/* 3. Tingkat Kelulusan SKM */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {metrics.passRate}%
                </span>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  Ketuntasan Standar SKM
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-4 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {metrics.hasData ? (
                <>
                  <span className="flex items-center gap-0.5">
                    <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                    <span>≥ 75.0</span>
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 font-medium">Lulus batas kelayakan</span>
                </>
              ) : (
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {metrics.gradedCount} dari {metrics.total} mahasiswa dinilai
                </span>
              )}
            </div>
          </div>

          {/* 4. Ketuntasan Portofolio */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {metrics.completionRate}%
                </span>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  Portofolio &amp; Final Project
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/60 flex items-center justify-center shrink-0">
                <FileCheck2 className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-4 text-xs font-bold text-amber-600 dark:text-amber-400">
              <span className="flex items-center gap-0.5">
                <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                <span>Job Sheet</span>
              </span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {metrics.completedProjectCount}/{metrics.total} CAD model disetujui
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Analytics Row: Dual Spline Curve (Left) + Donut Distribution (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Left Column (8 cols): Dual Spline Curve Capaian Pembelajaran OBE */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-100 dark:ring-cyan-800/40">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Analisis Capaian Pembelajaran (OBE)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Dinamika skor nilai praktik aktual vs tingkat ketuntasan portofolio mahasiswa
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              {/* Legend with colored indicators */}
              <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-medium text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500"></span>
                  <span>Rata-rata Nilai (Poin)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>Ketuntasan Tugas (%)</span>
                </div>
              </div>

              {/* Timeframe / Dimension Mode Toggle */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setChartViewMode('PERIOD')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartViewMode === 'PERIOD'
                      ? 'bg-white dark:bg-slate-900 text-cyan-700 dark:text-cyan-400 shadow-xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Gelombang
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('UNIT')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartViewMode === 'UNIT'
                      ? 'bg-white dark:bg-slate-900 text-cyan-700 dark:text-cyan-400 shadow-xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Unit CAD
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('COMPONENT')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartViewMode === 'COMPONENT'
                      ? 'bg-white dark:bg-slate-900 text-cyan-700 dark:text-cyan-400 shadow-xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Komponen
                </button>
              </div>
            </div>
          </div>

          {/* Dual Spline Chart Area */}
          <div className="relative pt-6 pb-2 select-none overflow-x-auto no-scrollbar">
            <svg
              viewBox="0 0 570 230"
              className="w-full min-w-[500px] h-64 overflow-visible"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Column Highlight Glow Gradient */}
                <linearGradient id="obe-column-highlight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                  <stop offset="70%" stopColor="#0891b2" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#0e7490" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines (100, 80, 60, 40, 20, 0) */}
              {[100, 80, 60, 40, 20, 0].map(val => {
                const y = 195 - (val / 100) * 165;
                return (
                  <g key={val}>
                    <line
                      x1="40"
                      y1={y}
                      x2="535"
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-100 dark:text-slate-800"
                      strokeWidth="1"
                    />
                    <text
                      x="18"
                      y={y + 4}
                      className="text-[11px] font-medium fill-slate-400 dark:fill-slate-500 font-mono"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Benchmark Reference Line: SKM = 75.0 */}
              <line
                x1="40"
                y1={195 - (75 / 100) * 165}
                x2="535"
                y2={195 - (75 / 100) * 165}
                stroke="#10b981"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                opacity="0.85"
              />
              <text
                x="535"
                y={195 - (75 / 100) * 165 - 5}
                textAnchor="end"
                className="fill-emerald-600 dark:fill-emerald-400 text-[10px] font-extrabold font-mono"
              >
                TARGET SKM: 75.0
              </text>

              {/* Hover Highlight Vertical Pill Bar */}
              {hoveredIndex !== null && splineChartData.scorePoints[hoveredIndex] && (
                <g className="transition-all duration-200">
                  <rect
                    x={splineChartData.scorePoints[hoveredIndex].x - 14}
                    y={Math.min(splineChartData.scorePoints[hoveredIndex].y, splineChartData.progressPoints[hoveredIndex].y) - 8}
                    width="28"
                    height={195 - Math.min(splineChartData.scorePoints[hoveredIndex].y, splineChartData.progressPoints[hoveredIndex].y) + 8}
                    rx="14"
                    fill="url(#obe-column-highlight)"
                  />
                  {/* Pin Dot: Score Curve */}
                  <circle
                    cx={splineChartData.scorePoints[hoveredIndex].x}
                    cy={splineChartData.scorePoints[hoveredIndex].y}
                    r="4.5"
                    fill="#06b6d4"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    className="drop-shadow-sm"
                  />
                  {/* Pin Dot: Progress Curve */}
                  <circle
                    cx={splineChartData.progressPoints[hoveredIndex].x}
                    cy={splineChartData.progressPoints[hoveredIndex].y}
                    r="4.5"
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    className="drop-shadow-sm"
                  />
                </g>
              )}

              {/* Amber Curve (Ketuntasan Tugas %) */}
              <path
                d={splineChartData.progressPath}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.75"
                strokeLinecap="round"
                className="drop-shadow-xs"
              />

              {/* Cyan Curve (Rata-rata Nilai Poin) */}
              <path
                d={splineChartData.scorePath}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="3"
                strokeLinecap="round"
                className="drop-shadow-xs"
              />

              {/* Interactive Hover Columns */}
              {splineChartData.scorePoints.map((pt, idx) => (
                <rect
                  key={idx}
                  x={pt.x - 25}
                  y="20"
                  width="50"
                  height="180"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                />
              ))}

              {/* X-Axis Labels */}
              {splineChartData.labels.map((label, idx) => {
                const x = splineChartData.scorePoints[idx]?.x || 0;
                const isHovered = hoveredIndex === idx;
                return (
                  <text
                    key={label}
                    x={x}
                    y="222"
                    textAnchor="middle"
                    className={`text-[11px] transition-colors cursor-pointer ${
                      isHovered
                        ? 'font-bold fill-cyan-700 dark:fill-cyan-300'
                        : 'font-semibold fill-slate-400 dark:fill-slate-500'
                    }`}
                    onClick={() => setHoveredIndex(idx)}
                  >
                    {label}
                  </text>
                );
              })}
            </svg>

            {/* Interactive Floating Tooltip */}
            {hoveredIndex !== null && splineChartData.scorePoints[hoveredIndex] && (
              <div
                className="absolute pointer-events-none transition-all duration-200 z-10 flex flex-col items-center"
                style={{
                  left: `${(splineChartData.scorePoints[hoveredIndex].x / 570) * 100}%`,
                  top: `${Math.max(8, (Math.min(splineChartData.scorePoints[hoveredIndex].y, splineChartData.progressPoints[hoveredIndex].y) / 230) * 100 - 35)}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-xl border border-slate-700 text-center animate-fadeIn min-w-[140px]">
                  <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider block">
                    {splineChartData.labels[hoveredIndex]}
                  </span>
                  <div className="flex items-baseline justify-center gap-2 mt-1">
                    <span className="text-sm font-extrabold text-white">
                      {splineChartData.scorePoints[hoveredIndex].val} Poin
                    </span>
                    <span className="text-[11px] font-bold text-amber-400">
                      • {splineChartData.progressPoints[hoveredIndex].val}% Tuntas
                    </span>
                  </div>
                  <span className={`text-[9px] font-semibold block mt-0.5 ${
                    splineChartData.scorePoints[hoveredIndex].val >= 75
                      ? 'text-emerald-400'
                      : splineChartData.scorePoints[hoveredIndex].val > 0
                        ? 'text-rose-400'
                        : 'text-slate-400'
                  }`}>
                    {splineChartData.scorePoints[hoveredIndex].val >= 75
                      ? '✓ Memenuhi SKM'
                      : splineChartData.scorePoints[hoveredIndex].val > 0
                        ? '⚠ Perlu Remedial'
                        : '⏳ Menunggu Penilaian'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Card Footer */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span>Standar SKM Poliwako: 75.0 (Kualitas 70% + Laporan 15% + Sikap 10% + Kreativitas 5%)</span>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('GRADING')}
                className="inline-flex items-center gap-1 font-bold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
              >
                <span>Buka Grading Workspace</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-cyan-500" />
              </button>
            )}
          </div>

        </div>

        {/* Right Column (4 cols): Segmented Donut Ring Distribusi Kelulusan OBE */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          
          {/* Header */}
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-800/40">
                <Award className="h-4 w-4" />
              </span>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Distribusi Nilai OBE
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Proporsi predikat capaian pembelajaran mahasiswa
            </p>
          </div>

          {/* Centered Donut Ring Chart */}
          <div className="py-6 flex items-center justify-center relative">
            <svg
              viewBox="0 0 200 200"
              className="w-48 h-48 transform -rotate-90 drop-shadow-xs"
            >
              {/* Background Ring Track */}
              <circle
                cx="100"
                cy="100"
                r="62"
                fill="none"
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800"
                strokeWidth="24"
              />

              {/* Segmented Donut Slices */}
              {donutSegments.map(seg => seg.length > 0 && (
                <circle
                  key={seg.id}
                  cx="100"
                  cy="100"
                  r="62"
                  fill="none"
                  stroke={seg.color}
                  strokeWidth="24"
                  strokeDasharray={`${seg.length} 389.5`}
                  strokeDashoffset={seg.offset}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              ))}
            </svg>

            {/* Central Score Display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {metrics.hasData ? metrics.avgScore : '0.0'}
              </span>
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                Rata-rata Kelas
              </span>
              <span className={`mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                metrics.hasData
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}>
                {metrics.hasData
                  ? `Predikat ${metrics.avgPred.letter} (${metrics.passRate}% Lulus)`
                  : `Belum Ada Nilai (0/${metrics.total})`}
              </span>
            </div>
          </div>

          {/* Legend: 4 Slices with precise counts and percentages */}
          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {donutSegments.map(seg => (
                <div key={seg.id} className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate text-[11px]">{seg.title}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0 text-[11px]">{seg.pct}% <span className="text-slate-400 text-[10px] font-normal">({seg.count})</span></span>
                </div>
              ))}
            </div>

            <div className={`mt-3 p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
              metrics.hasData
                ? 'bg-cyan-50/70 dark:bg-cyan-950/30 border-cyan-100 dark:border-cyan-900/50 text-cyan-900 dark:text-cyan-300'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              <span>Kelulusan Tuntas (≥75)</span>
              <span className="font-mono font-black">
                {metrics.hasData ? `${metrics.passRate}% Mahasiswa` : `0 Mahasiswa (${metrics.gradedCount}/${metrics.total} dinilai)`}
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
