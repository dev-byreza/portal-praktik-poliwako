// OBE Analytics Section
// Modern Line Wave & Grouped Bar Charts for Poliwako CAD Practice
import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  ArrowUpRight,
  BarChart3,
  Activity,
  Layers,
  FileCheck2
} from 'lucide-react';
import { computeSynchronizedGradeDistribution, getGradePredicate } from '../../utils/gradeCalculators';
import { getUnitAssignments } from '../../utils/learningAssignments';
import {
  buildCourseQualityItems,
  extractAssessmentQualityComponentScore,
  getCourseQualityComponents,
} from '../../utils/qualityAssessment';

interface OBEAnalyticsSectionProps {
  showMetricCards?: boolean;
  selectedPeriodFilter?: string;
  selectedClassFilter?: string;
  onNavigateTab?: (tab: string) => void;
}

// Convert points to smooth S-curve cubic bezier wave path
function getSmoothWavePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    if (points.length === 2) {
      const dx = (p2.x - p1.x) * 0.45;
      d += ` C ${(p1.x + dx).toFixed(1)} ${p1.y.toFixed(1)}, ${(p2.x - dx).toFixed(1)} ${p2.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    } else {
      const tension = 0.22;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = Math.max(20, Math.min(195, p1.y + (p2.y - p0.y) * tension));
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = Math.max(20, Math.min(195, p2.y - (p3.y - p1.y) * tension));
      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
  }
  return d;
}

function getSmoothAreaPath(points: { x: number; y: number }[], baselineY = 195): string {
  if (points.length < 2) return '';
  const linePath = getSmoothWavePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z`;
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

  const [chartViewMode, setChartViewMode] = useState<'PERIOD' | 'UNIT' | 'COMPONENT' | 'QUALITY'>('PERIOD');
  const [chartStyle, setChartStyle] = useState<'COMBO' | 'LINE' | 'BAR'>('COMBO');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const qualityComponents = useMemo(() => getCourseQualityComponents(activeCourse), [activeCourse]);
  const qualityItems = useMemo(() => buildCourseQualityItems(activeCourse), [activeCourse]);

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

  // Real Learning & OBE Metrics Calculation (Synchronized with GradingWorkspace & gradeCalculators)
  const metrics = useMemo(() => {
    const total = filteredParticipants.length;
    const studentKeys = new Set(filteredParticipants.map(p => `${p.periodId}_${p.studentId}`));
    const validAssessments = assessments.filter(a =>
      studentKeys.has(`${a.periodId}_${a.studentId}`) &&
      Number.isFinite(a.finalScore)
    );

    const scores = validAssessments.map(a => a.finalScore);
    const hasData = scores.length > 0;
    const gradedCount = validAssessments.length;

    const avgScore = hasData
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : '0.0';

    // Lulus kriteria Baik/Cukup sesuai klasifikasi GRADE_PREDICATE_RULES (C >= 51.0, B >= 70.0)
    const passedCount = scores.filter(s => s >= 51.0).length;
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

    // Synchronized Grade Distribution strictly from GRADE_PREDICATE_RULES (A, A-, B+, B, B-, C+, C, D+, D, E)
    const gradeDist = computeSynchronizedGradeDistribution(scores);

    const avgPred = hasData
      ? getGradePredicate(Number(avgScore))
      : { letter: '-', predicate: 'Belum Dinilai', range100Label: '-', colorClass: 'text-slate-500', bgClass: 'bg-slate-100', borderClass: 'border-slate-200' };

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
      gradeDist,
    };
  }, [filteredParticipants, assessments, attendance]);

  // Points for Modern Line & Grouped Bar Chart
  const chartData = useMemo(() => {
    let labels: string[] = [];
    let fullTitles: string[] = [];
    let scoreValues: number[] = [];
    let progressValues: number[] = [];

    if (chartViewMode === 'PERIOD') {
      if (coursePeriods.length > 0) {
        const sliced = coursePeriods.slice(0, 8);
        labels = sliced.map(p => p.name.replace(/Gelombang\s*/i, 'Gel '));
        fullTitles = sliced.map(p => p.name);
        scoreValues = sliced.map(p => {
          const pScores = assessments.filter(a => a.periodId === p.id && Number.isFinite(a.finalScore)).map(a => a.finalScore);
          return pScores.length > 0 ? Math.round(pScores.reduce((a, b) => a + b, 0) / pScores.length) : 0;
        });
        progressValues = sliced.map(p => {
          const pParts = participants.filter(part => part.periodId === p.id);
          const done = pParts.filter(part => part.finalProjectConfirmed).length;
          return pParts.length > 0 ? Math.round((done / pParts.length) * 100) : 0;
        });
      } else {
        labels = ['Belum Ada Gelombang'];
        fullTitles = labels;
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
        const assignList = getUnitAssignments(u);
        const assignIds = assignList.map(a => a.id);
        const existing = unitMap.get(u.unitNumber);
        if (existing) {
          assignIds.forEach(id => {
            if (!existing.assignmentIds.includes(id)) existing.assignmentIds.push(id);
          });
        } else {
          unitMap.set(u.unitNumber, {
            title: u.title,
            assignmentIds: assignIds
          });
        }
      });

      const sortedUnitEntries = Array.from(unitMap.entries()).sort((a, b) => a[0] - b[0]);
      const studentKeys = new Set(filteredParticipants.map(p => `${p.periodId}_${p.studentId}`));
      const validAss = assessments.filter(a => studentKeys.has(`${a.periodId}_${a.studentId}`) && Number.isFinite(a.finalScore));

      if (sortedUnitEntries.length > 0) {
        labels = sortedUnitEntries.map(e => `Unit ${e[0]}`);
        fullTitles = sortedUnitEntries.map(e => `Unit ${e[0]}: ${e[1].title}`);
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
        scoreValues = sortedUnitEntries.map((_, idx) => {
          if (validAss.length === 0) return 0;
          if (idx === 0) return Math.round(validAss.reduce((s, a) => s + (a.entryBehaviorScore ?? a.qualityScore), 0) / validAss.length);
          if (idx === 1) return Math.round(validAss.reduce((s, a) => s + (a.subCpmkPracticeScore ?? a.qualityScore), 0) / validAss.length);
          if (idx === 2) return Math.round(validAss.reduce((s, a) => s + (a.assignmentScore ?? a.qualityScore), 0) / validAss.length);
          return Math.round(validAss.reduce((s, a) => s + a.finalScore, 0) / validAss.length);
        });
      } else {
        labels = ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Final Project'];
        fullTitles = labels;
        scoreValues = [0, 0, 0, 0, 0];
        progressValues = [0, 0, 0, 0, 0];
      }
    } else if (chartViewMode === 'QUALITY') {
      // Synchronized directly with Cabang Nilai Kualitas in GradingWorkspace (getCourseQualityComponents)
      const studentKeys = new Set(filteredParticipants.map(p => `${p.periodId}_${p.studentId}`));
      const validAss = assessments.filter(a => studentKeys.has(`${a.periodId}_${a.studentId}`) && Number.isFinite(a.finalScore));
      const total = filteredParticipants.length || validAss.length;
      const assessedPct = total > 0 ? Math.round((validAss.length / total) * 100) : 0;

      labels = [
        ...qualityComponents.map(c => `${c.name.split(' ')[0]} (${c.weightPercent}%)`),
        'Total Kualitas (70%)'
      ];
      fullTitles = [
        ...qualityComponents.map(c => `${c.name} — Bobot ${c.weightPercent}% dari Kualitas`),
        'Rata-rata Komposit Nilai Kualitas (Bobot 70%)'
      ];

      if (validAss.length > 0) {
        scoreValues = [
          ...qualityComponents.map(comp =>
            Math.round(
              validAss.reduce((sum, a) => sum + extractAssessmentQualityComponentScore(a, comp, qualityItems), 0) /
                validAss.length
            )
          ),
          Math.round(validAss.reduce((sum, a) => sum + (a.qualityScore || 0), 0) / validAss.length)
        ];
        progressValues = [
          ...qualityComponents.map(comp => {
            if (comp.type === 'ENTRY_BEHAVIOR') return metrics.attendancePct || assessedPct;
            if (comp.type === 'ASSIGNMENT' || comp.type === 'POST_TEST') return metrics.completionRate || assessedPct;
            return assessedPct;
          }),
          assessedPct
        ];
      } else {
        scoreValues = labels.map(() => 0);
        progressValues = labels.map(() => 0);
      }
    } else {
      // Synchronized 1:1 with GradingWorkspace Menu Kategori Penilaian:
      // 1. Kualitas (70%), 2. Sikap (10%), 3. Kreativitas (5%), 4. Laporan (15%), Semua / Total OBE (100%)
      labels = ['1. Kualitas (70%)', '2. Sikap (10%)', '3. Kreativitas (5%)', '4. Laporan (15%)', 'Total OBE (100%)'];
      fullTitles = [
        '1. Nilai Kualitas (Bobot 70%)',
        '2. Nilai Sikap & K3 (Bobot 10%)',
        '3. Nilai Kreativitas & Inisiatif (Bobot 5%)',
        '4. Nilai Laporan Praktikum (Bobot 15%)',
        'Nilai Akhir Terkalkulasi OBE (Bobot 100%)'
      ];
      const studentKeys = new Set(filteredParticipants.map(p => `${p.periodId}_${p.studentId}`));
      const validAss = assessments.filter(a => studentKeys.has(`${a.periodId}_${a.studentId}`) && Number.isFinite(a.finalScore));

      if (validAss.length > 0) {
        const avgKualitas = Math.round(validAss.reduce((sum, a) => sum + (a.qualityScore || 0), 0) / validAss.length);
        const avgSikap = Math.round(validAss.reduce((sum, a) => sum + (a.attitudeScore || 0), 0) / validAss.length);
        const avgKreativitas = Math.round(validAss.reduce((sum, a) => sum + (a.creativityScore || 0), 0) / validAss.length);
        const avgLaporan = Math.round(validAss.reduce((sum, a) => sum + (a.reportScore || 0), 0) / validAss.length);
        const avgAkhir = Math.round(validAss.reduce((sum, a) => sum + a.finalScore, 0) / validAss.length);

        scoreValues = [avgKualitas, avgSikap, avgKreativitas, avgLaporan, avgAkhir];
        const total = filteredParticipants.length || validAss.length;
        const assessedPct = Math.round((validAss.length / total) * 100);
        progressValues = [
          assessedPct,
          metrics.attendancePct || assessedPct,
          assessedPct,
          metrics.completionRate || assessedPct,
          metrics.passRate || assessedPct
        ];
      } else {
        scoreValues = [0, 0, 0, 0, 0];
        progressValues = [0, 0, 0, 0, 0];
      }
    }

    const count = labels.length;
    const startX = count === 2 ? 120 : count === 3 ? 95 : 65;
    const endX = count === 2 ? 465 : count === 3 ? 490 : 525;
    const stepX = count > 1 ? (endX - startX) / (count - 1) : 0;
    const xCoords = count === 1 ? [Math.round((startX + endX) / 2)] : labels.map((_, i) => Math.round(startX + i * stepX));

    // Map value (0 - 100) to SVG Y (195 down to 28)
    const getY = (val: number) => 195 - (Math.max(0, Math.min(100, val)) / 100) * 162;

    const scorePoints = xCoords.map((x, i) => ({
      x,
      y: getY(scoreValues[i]),
      val: scoreValues[i],
      label: labels[i],
      fullTitle: fullTitles[i] || labels[i]
    }));

    const progressPoints = xCoords.map((x, i) => ({
      x,
      y: getY(progressValues[i]),
      val: progressValues[i],
      label: labels[i],
      fullTitle: fullTitles[i] || labels[i]
    }));

    return {
      labels,
      fullTitles,
      scorePoints,
      progressPoints,
      scorePath: getSmoothWavePath(scorePoints),
      progressPath: getSmoothWavePath(progressPoints),
      scoreAreaPath: getSmoothAreaPath(scorePoints, 195),
      progressAreaPath: getSmoothAreaPath(progressPoints, 195)
    };
  }, [chartViewMode, coursePeriods, assessments, participants, attendance, learningUnits, submissions, filteredParticipants, selectedPeriodFilter, metrics, qualityComponents, qualityItems]);

  // Maximum count across the 10 GRADE_PREDICATE_RULES for scaling the Vertical Bar Chart
  const maxPredicateCount = useMemo(() => {
    return Math.max(1, ...metrics.gradeDist.byPredicate.map(rule => rule.count));
  }, [metrics.gradeDist.byPredicate]);

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
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-center shrink-0">
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
              <div className="w-10 h-10 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-800/60 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-4 text-xs font-bold">
              {metrics.hasData ? (
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-[11px]">
                  Predikat {metrics.avgPred.letter} ({metrics.avgPred.predicate})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-[11px]">
                  Belum Dinilai ({metrics.gradedCount}/{metrics.total})
                </span>
              )}
            </div>
          </div>

          {/* 3. Tingkat Kelulusan */}
          <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {metrics.passRate}%
                </span>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  Tingkat Kelulusan Kelas
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
              <div className="w-10 h-10 rounded-2xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-800/60 flex items-center justify-center shrink-0">
                <FileCheck2 className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-4 text-xs font-bold text-orange-600 dark:text-orange-400">
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

      {/* Main Analytics Row: Modern Line & Bar Chart (Left 8 cols) + Segmented Donut & Stacked Bar (Right 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        
        {/* Left Column (8 cols): Modern Line Wave & Grouped Bar Chart */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          
          {/* Header Controls */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-100 dark:ring-indigo-800/40">
                  <TrendingUp className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                    Analisis Capaian Pembelajaran (OBE)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Visualisasi kurva gelombang &amp; diagram batang performa nilai vs ketuntasan mahasiswa
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              {/* Chart Visual Type Selector: Gabungan | Kurva Line | Diagram Batang */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setChartStyle('COMBO')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartStyle === 'COMBO'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Tampilkan Gabungan Line & Diagram Batang"
                >
                  <Layers className="w-3 h-3" />
                  <span>Line &amp; Bar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartStyle('LINE')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartStyle === 'LINE'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Tampilkan Diagram Line Gelombang Modern"
                >
                  <Activity className="w-3 h-3" />
                  <span>Line</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartStyle('BAR')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartStyle === 'BAR'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Tampilkan Diagram Batang Modern"
                >
                  <BarChart3 className="w-3 h-3" />
                  <span>Batang</span>
                </button>
              </div>

              {/* Dimension Mode Toggle (Synchronized with GradingWorkspace Categories & Quality Branches) */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setChartViewMode('PERIOD')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartViewMode === 'PERIOD'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Gelombang
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('COMPONENT')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartViewMode === 'COMPONENT'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="4 Kategori Utama Penilaian di Grading Workspace (Kualitas 70%, Sikap 10%, Kreativitas 5%, Laporan 15%)"
                >
                  Kategori
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('QUALITY')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartViewMode === 'QUALITY'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                  title="Turunan Nilai Kualitas di Grading Workspace (Entry, Sub-CPMK, Tugas, Post-Test)"
                >
                  Kualitas
                </button>
                <button
                  type="button"
                  onClick={() => setChartViewMode('UNIT')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    chartViewMode === 'UNIT'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Unit CAD
                </button>
              </div>
            </div>
          </div>

          {/* Interactive SVG Chart Area */}
          <div className="relative pt-5 pb-2 select-none overflow-x-auto no-scrollbar">
            <svg
              viewBox="0 0 570 236"
              className="w-full min-w-[500px] h-64 overflow-visible"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <defs>
                {/* Indigo Area Fill under Score Curve */}
                <linearGradient id="obe-indigo-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.26" />
                  <stop offset="65%" stopColor="#6366f1" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>

                {/* Coral Orange Area Fill under Progress Curve */}
                <linearGradient id="obe-coral-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity="0.22" />
                  <stop offset="65%" stopColor="#fb923c" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#fb923c" stopOpacity="0.0" />
                </linearGradient>

                {/* Vertical Bar Gradients */}
                <linearGradient id="obe-bar-indigo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
                <linearGradient id="obe-bar-coral" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#fdba74" />
                </linearGradient>
                <linearGradient id="obe-bar-cyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#67e8f9" />
                </linearGradient>

                {/* Column Hover Glow */}
                <linearGradient id="obe-column-highlight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines (100, 80, 60, 40, 20, 0) */}
              {[100, 80, 60, 40, 20, 0].map(val => {
                const y = 195 - (val / 100) * 162;
                return (
                  <g key={val}>
                    <line
                      x1="40"
                      y1={y}
                      x2="545"
                      y2={y}
                      stroke="currentColor"
                      className="text-slate-100 dark:text-slate-800/90"
                      strokeWidth="1"
                    />
                    <text
                      x="14"
                      y={y + 4}
                      className="text-[10px] font-semibold fill-slate-400 dark:fill-slate-500 font-mono"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Hover Column Highlight Pill */}
              {hoveredIndex !== null && chartData.scorePoints[hoveredIndex] && (
                <rect
                  x={chartData.scorePoints[hoveredIndex].x - 24}
                  y="24"
                  width="48"
                  height="171"
                  rx="12"
                  fill="url(#obe-column-highlight)"
                  className="transition-all duration-200"
                />
              )}

              {/* GROUPED VERTICAL BARS (Shown in BAR and COMBO modes) */}
              {(chartStyle === 'BAR' || chartStyle === 'COMBO') &&
                chartData.scorePoints.map((pt, idx) => {
                  const progPt = chartData.progressPoints[idx];
                  const isCombo = chartStyle === 'COMBO';
                  const barWidth = isCombo ? 11 : 14;
                  const scoreHeight = Math.max(4, 195 - pt.y);
                  const progHeight = Math.max(4, 195 - progPt.y);
                  const barOpacity = isCombo ? (hoveredIndex === idx ? 0.85 : 0.42) : 0.95;

                  return (
                    <g key={`bars-${idx}`} opacity={barOpacity} className="transition-opacity duration-200">
                      {/* Subtle Track */}
                      <rect
                        x={pt.x - barWidth - 2}
                        y="33"
                        width={barWidth}
                        height="162"
                        rx="6"
                        className="fill-slate-100/80 dark:fill-slate-800/45"
                      />
                      <rect
                        x={pt.x + 2}
                        y="33"
                        width={barWidth}
                        height="162"
                        rx="6"
                        className="fill-slate-100/80 dark:fill-slate-800/45"
                      />
                      {/* Bar 1: Rata-rata Nilai */}
                      <rect
                        x={pt.x - barWidth - 2}
                        y={195 - scoreHeight}
                        width={barWidth}
                        height={scoreHeight}
                        rx="6"
                        fill="url(#obe-bar-indigo)"
                      />
                      {/* Bar 2: Ketuntasan Tugas */}
                      <rect
                        x={pt.x + 2}
                        y={195 - progHeight}
                        width={barWidth}
                        height={progHeight}
                        rx="6"
                        fill="url(#obe-bar-coral)"
                      />
                    </g>
                  );
                })}

              {/* SMOOTH WAVE LINE & AREA CURVES (Shown in LINE and COMBO modes) */}
              {(chartStyle === 'LINE' || chartStyle === 'COMBO') && (
                <>
                  {/* Soft Area Gradients beneath the curves */}
                  <path
                    d={chartData.progressAreaPath}
                    fill="url(#obe-coral-area)"
                  />
                  <path
                    d={chartData.scoreAreaPath}
                    fill="url(#obe-indigo-area)"
                  />

                  {/* Coral Orange Curve (Ketuntasan Tugas %) */}
                  <path
                    d={chartData.progressPath}
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Indigo Curve (Rata-rata Nilai Poin) */}
                  <path
                    d={chartData.scorePath}
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Hollow Ring Nodes on Data Points (Matching reference design) */}
                  {chartData.progressPoints.map((pt, idx) => {
                    const isHovered = hoveredIndex === idx;
                    return (
                      <circle
                        key={`prog-node-${idx}`}
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 5.5 : 4}
                        className="fill-white dark:fill-slate-900 transition-all duration-150"
                        stroke="#f97316"
                        strokeWidth={isHovered ? 3 : 2.25}
                      />
                    );
                  })}

                  {chartData.scorePoints.map((pt, idx) => {
                    const isHovered = hoveredIndex === idx;
                    return (
                      <circle
                        key={`score-node-${idx}`}
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 6 : 4.5}
                        className="fill-white dark:fill-slate-900 transition-all duration-150"
                        stroke="#4f46e5"
                        strokeWidth={isHovered ? 3.25 : 2.5}
                      />
                    );
                  })}
                </>
              )}

              {/* Interactive Hover Hit Columns */}
              {chartData.scorePoints.map((pt, idx) => (
                <rect
                  key={`hit-${idx}`}
                  x={pt.x - 28}
                  y="20"
                  width="56"
                  height="185"
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onClick={() => setHoveredIndex(idx)}
                />
              ))}

              {/* X-Axis Labels */}
              {chartData.labels.map((label, idx) => {
                const x = chartData.scorePoints[idx]?.x || 0;
                const isHovered = hoveredIndex === idx;
                return (
                  <text
                    key={`${label}-${idx}`}
                    x={x}
                    y="220"
                    textAnchor="middle"
                    className={`text-[10.5px] transition-colors cursor-pointer ${
                      isHovered
                        ? 'font-extrabold fill-indigo-600 dark:fill-indigo-400'
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
            {hoveredIndex !== null && chartData.scorePoints[hoveredIndex] && (
              <div
                className="absolute pointer-events-none transition-all duration-200 z-10 flex flex-col items-center"
                style={{
                  left: `${Math.min(84, Math.max(16, (chartData.scorePoints[hoveredIndex].x / 570) * 100))}%`,
                  top: `${Math.max(4, (Math.min(chartData.scorePoints[hoveredIndex].y, chartData.progressPoints[hoveredIndex].y) / 236) * 100 - 34)}%`,
                  transform: 'translateX(-50%)'
                }}
              >
                <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-700/80 text-center min-w-[165px]">
                  <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block truncate max-w-[190px]">
                    {chartData.fullTitles[hoveredIndex]}
                  </span>
                  <div className="flex items-center justify-center gap-3 mt-1.5 text-xs">
                    <span className="flex items-center gap-1 font-extrabold text-white">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                      {chartData.scorePoints[hoveredIndex].val} Poin
                    </span>
                    <span className="flex items-center gap-1 font-bold text-orange-400">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      {chartData.progressPoints[hoveredIndex].val}% Tuntas
                    </span>
                  </div>
                  {chartData.scorePoints[hoveredIndex].val > 0 && (() => {
                    const ptPred = getGradePredicate(chartData.scorePoints[hoveredIndex].val);
                    return (
                      <span className="text-[10px] font-bold text-cyan-300 block mt-1">
                        Mutu {ptPred.letter} • {ptPred.predicate}
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Legend & Footer */}
          <div className="mt-3 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex flex-wrap items-center gap-4 font-semibold text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center">
                  <span className="w-4 h-0.5 bg-indigo-600 rounded-full"></span>
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-indigo-600 bg-white dark:bg-slate-900 -ml-2.5"></span>
                </span>
                <span>Rata-rata Nilai (Poin)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center">
                  <span className="w-4 h-0.5 bg-orange-500 rounded-full"></span>
                  <span className="w-2.5 h-2.5 rounded-full border-2 border-orange-500 bg-white dark:bg-slate-900 -ml-2.5"></span>
                </span>
                <span>Ketuntasan Tugas (%)</span>
              </div>
            </div>

            {onNavigateTab ? (
              <button
                type="button"
                onClick={() => onNavigateTab('GRADING')}
                className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors cursor-pointer"
              >
                <span>Buka Grading Workspace</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="text-[10px] text-slate-400">Formula OBE: Kualitas 70% + Laporan 15% + Sikap 10% + Kreativitas 5%</span>
            )}
          </div>

        </div>

        {/* Right Column (4 cols): Diagram Batang Vertikal Distribusi Nilai OBE (10 Klasifikasi Grading) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-4">
          
          {/* Header */}
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-100 dark:ring-indigo-800/40">
                  <Award className="h-4 w-4" />
                </span>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  Distribusi Nilai OBE
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Diagram batang vertikal klasifikasi nilai mutu (A s/d E)
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300 shrink-0">
              {metrics.gradedCount}/{metrics.total} Dinilai
            </span>
          </div>

          {/* Class Average Summary Banner */}
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Rata-rata Kelas
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  {metrics.hasData ? metrics.avgScore : '0.0'}
                </span>
                {metrics.hasData && (
                  <span className="text-[11px] font-mono font-semibold text-slate-400">
                    ({metrics.avgPred.range100Label})
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Nilai &amp; Sebutan Mutu
              </span>
              <div className="mt-1">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-extrabold border ${metrics.avgPred.bgClass} ${metrics.avgPred.colorClass} ${metrics.avgPred.borderClass}`}>
                  <span>{metrics.avgPred.letter}</span>
                  <span>•</span>
                  <span>{metrics.avgPred.predicate}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Vertical Bar Chart (10 Official Grading Classifications: A, A-, B+, B, B-, C+, C, D+, D, E) */}
          <div className="p-3.5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/35 border border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              <span>Diagram Batang Vertikal (A – E)</span>
              <span className="font-mono text-slate-500 dark:text-slate-400">Jumlah Mahasiswa</span>
            </div>

            {/* 10 Vertical Bars */}
            <div className="h-36 flex items-end justify-between gap-1.5 pt-5 px-1 border-b border-slate-200/80 dark:border-slate-700/70">
              {metrics.gradeDist.byPredicate.map(rule => {
                const heightPct = rule.count > 0
                  ? Math.max(14, Math.round((rule.count / maxPredicateCount) * 100))
                  : 4;
                return (
                  <div
                    key={`vbar-${rule.key}`}
                    className="flex-1 flex flex-col items-center justify-end h-full gap-1 group"
                    title={`Nilai Mutu ${rule.letter} (${rule.predicate})\nRentang: ${rule.range10Label} (${rule.range100Label})\nJumlah: ${rule.count} Mahasiswa (${rule.pct}%)`}
                  >
                    <span className={`text-[10px] font-mono font-extrabold leading-none ${
                      rule.count > 0
                        ? 'text-slate-800 dark:text-slate-100'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}>
                      {rule.count}
                    </span>
                    <div className="w-full max-w-[22px] h-full bg-slate-200/60 dark:bg-slate-700/40 rounded-t-lg flex items-end overflow-hidden">
                      <div
                        className="w-full rounded-t-lg transition-all duration-700 group-hover:brightness-110"
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: rule.hexColor,
                          opacity: rule.count > 0 ? 1 : 0.25,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X-Axis Labels: Nilai Mutu (A..E) + Rentang Nilai */}
            <div className="flex items-start justify-between gap-1 pt-2 px-0.5">
              {metrics.gradeDist.byPredicate.map(rule => (
                <div key={`xlbl-${rule.key}`} className="flex-1 text-center min-w-0">
                  <span className={`inline-block text-[10px] font-mono font-black leading-tight ${
                    rule.count > 0 ? rule.colorClass : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {rule.letter}
                  </span>
                  <span className="text-[7.5px] font-mono text-slate-400 dark:text-slate-500 block leading-tight tracking-tighter truncate mt-0.5">
                    {rule.shortRange}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Official Grading Classification Table Summary (Sesuai Tabel Klasifikasi Nilai Mutu Poliwako) */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <span>Klasifikasi Nilai Mutu &amp; Rentang Angka</span>
              <span>Proporsi</span>
            </div>

            {/* Multi-segment Horizontal Stacked Bar */}
            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex p-0.5 gap-0.5">
              {metrics.hasData ? (
                metrics.gradeDist.byPredicate.map(rule => rule.pct > 0 && (
                  <div
                    key={`hbar-${rule.key}`}
                    style={{ width: `${rule.pct}%`, backgroundColor: rule.hexColor }}
                    className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-700"
                    title={`${rule.letter} (${rule.predicate} • ${rule.range100Label}): ${rule.pct}% (${rule.count} Mahasiswa)`}
                  />
                ))
              ) : (
                <div className="w-full h-full rounded-full bg-slate-200 dark:bg-slate-700" />
              )}
            </div>

            {/* 10 Classification Rows in Compact 2-Column Grid matching Grading Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs max-h-56 overflow-y-auto pr-0.5">
              {metrics.gradeDist.byPredicate.map(rule => (
                <div
                  key={`row-${rule.key}`}
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border transition-colors ${
                    rule.count > 0
                      ? 'bg-slate-50/90 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80'
                      : 'bg-slate-50/40 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800/50 opacity-75'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-7 py-0.5 rounded-md text-center font-mono text-[10.5px] font-extrabold border shrink-0 ${rule.bgClass} ${rule.colorClass} ${rule.borderClass}`}>
                      {rule.letter}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-700 dark:text-slate-200 text-[11px] leading-tight truncate" title={rule.predicate}>
                        {rule.predicate}
                      </p>
                      <p className="font-mono text-[9.5px] text-slate-400 dark:text-slate-500 leading-tight truncate" title={`${rule.range10Label} (${rule.range100Label})`}>
                        {rule.range100Label}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-mono font-extrabold text-slate-900 dark:text-white text-[11px] block leading-tight">
                      {rule.pct}%
                    </span>
                    <span className="font-mono text-[9.5px] text-slate-400 block leading-tight">
                      {rule.count} mhs
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
