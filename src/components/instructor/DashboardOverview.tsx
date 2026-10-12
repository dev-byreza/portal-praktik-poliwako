// Instructor Command Center Dashboard (PRD Section 11, 13, 14, 15)

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Users,
  TrendingUp,
  FolderArchive,
  CheckCircle,
  Clock,
  AlertTriangle,
  Award,
  Calendar,
  Layers,
  ArrowUpRight,
  Sparkles,
  BarChart3,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { formatPeriodRange } from '../../utils/dateUtils';
import { getGradePredicate } from '../../utils/gradeCalculators';
import { isSubmissionClosed } from '../../utils/submissionDeadline';
import { getUnitAssignments } from '../../utils/learningAssignments';
import { hasSuccessfulSubmission } from '../../utils/studentProgress';
import { AnnouncementManager } from './AnnouncementManager';
import { OBEAnalyticsSection } from './OBEAnalyticsSection';

interface DashboardOverviewProps {
  onNavigateTab: (tab: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigateTab }) => {
  const {
    activeCourse,
    courses,
    periods,
    participants,
    submissions,
    assessments,
    attendance,
    remedials,
    learningUnits,
    activeCourseId,
    isInitialDataLoaded,
    initialDataError
  } = useApp();

  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [chartViewMode, setChartViewMode] = useState<'DAILY' | 'CATEGORY'>('DAILY');

  // Periods belonging to active course
  const coursePeriods = useMemo(() => {
    return periods.filter(p => p.courseId === activeCourseId);
  }, [periods, activeCourseId]);

  const activePeriod = coursePeriods.find(p => p.status === 'ACTIVE');
  const latestPeriod = [...coursePeriods].sort((a, b) => (
    (new Date(b.startDate).getTime() || 0) - (new Date(a.startDate).getTime() || 0)
  ))[0];
  const dashboardPeriod = activePeriod || latestPeriod;

  // Participants of active course
  const courseParticipants = useMemo(() => {
    const periodIds = new Set(coursePeriods.map(p => p.id));
    return participants.filter(p => periodIds.has(p.periodId));
  }, [participants, coursePeriods]);

  // Filtered participants
  const filteredParticipants = useMemo(() => {
    return courseParticipants.filter(p => {
      if (selectedPeriodFilter !== 'ALL' && p.periodId !== selectedPeriodFilter) return false;
      if (selectedClassFilter !== 'ALL' && p.student.className !== selectedClassFilter) return false;
      return true;
    });
  }, [courseParticipants, selectedPeriodFilter, selectedClassFilter]);

  // KPI Calculations (PRD Section 13)
  const kpiStats = useMemo(() => {
    const totalParticipants = filteredParticipants.length;
    
    // Learning progress average. Count each successfully submitted assignment
    // so a student with partial uploads is no longer shown as 0% until an
    // entire unit is finished.
    let totalProgressSum = 0;
    filteredParticipants.forEach(p => {
      const pUnits = learningUnits.filter(u => u.periodId === p.periodId);
      const participantSubmissions = submissions.filter(submission => (
        submission.studentId === p.studentId && submission.periodId === p.periodId
      ));
      const assignments = pUnits.flatMap(unit => getUnitAssignments(unit));
      if (assignments.length === 0) return;
      const completed = assignments.filter(assignment => (
        hasSuccessfulSubmission(participantSubmissions, assignment.id)
      )).length;
      totalProgressSum += completed / assignments.length;
    });
    const avgProgress = totalParticipants > 0 ? Math.round((totalProgressSum / totalParticipants) * 100) : 0;

    const projectSubmittedCount = filteredParticipants.filter(p => p.finalProjectConfirmed).length;
    const unfinishedCount = filteredParticipants.filter(p => !p.finalProjectConfirmed).length;

    // Assessment stats
    const gradedStudentIds = new Set(assessments
      .filter(a => Number.isFinite(a.finalScore))
      .map(a => `${a.periodId}_${a.studentId}`));
    const gradedCount = filteredParticipants.filter(p => gradedStudentIds.has(`${p.periodId}_${p.studentId}`)).length;
    const ungradedCount = totalParticipants - gradedCount;

    // Attendance <75% count
    const ineligibleCount = filteredParticipants.filter(p => {
      const att = attendance.find(a => a.periodId === p.periodId && a.studentId === p.studentId);
      return att ? !att.isEligible : false;
    }).length;

    return {
      totalParticipants,
      avgProgress,
      projectSubmittedCount,
      unfinishedCount,
      gradedCount,
      ungradedCount,
      ineligibleCount
    };
  }, [filteredParticipants, learningUnits, submissions, assessments, attendance]);

  const actionQueue = useMemo(() => {
    const participantKeys = new Set(filteredParticipants.map(p => `${p.periodId}_${p.studentId}`));
    const relevantSubmissions = submissions.filter(s => participantKeys.has(`${s.periodId}_${s.studentId}`));
    const submittedParticipantKeys = new Set(
      relevantSubmissions
        .filter(submission => submission.status !== 'REVISION_REQUIRED')
        .map(s => `${s.periodId}_${s.studentId}`)
    );
    filteredParticipants.forEach(p => {
      if (p.finalProjectConfirmed && p.finalProjectReviewStatus !== 'REVISION_REQUIRED') submittedParticipantKeys.add(`${p.periodId}_${p.studentId}`);
    });

    const assessedParticipantKeys = new Set(
      assessments
        .filter(a => Number.isFinite(a.finalScore) && participantKeys.has(`${a.periodId}_${a.studentId}`))
        .map(a => `${a.periodId}_${a.studentId}`)
    );
    const pendingGrading = [...submittedParticipantKeys].filter(key => !assessedParticipantKeys.has(key)).length;
    const remedialReviews = remedials.filter(r => participantKeys.has(`${r.periodId}_${r.studentId}`) && r.status === 'SUBMITTED').length;
    const unpublishedGrades = assessments.filter(a => (
      participantKeys.has(`${a.periodId}_${a.studentId}`) && Number.isFinite(a.finalScore) && !a.isPublished
    )).length;
    const projectRevisions = filteredParticipants.filter(p => p.finalProjectReviewStatus === 'REVISION_REQUIRED').length;
    const assignmentRevisions = relevantSubmissions.filter(submission => submission.status === 'REVISION_REQUIRED').length;

    let overdueSubmissions = 0;
    filteredParticipants.forEach(participant => {
      const periodAssignments = learningUnits
        .filter(unit => unit.periodId === participant.periodId)
        .flatMap(getUnitAssignments)
        .filter(assignment => isSubmissionClosed(assignment.deadline));
      periodAssignments.forEach(assignment => {
        const hasSubmission = relevantSubmissions.some(submission => (
          submission.assignmentId === assignment.id
          && submission.periodId === participant.periodId
          && submission.studentId === participant.studentId
        ));
        if (!hasSubmission) overdueSubmissions += 1;
      });
    });

    return [
      {
        id: 'assignment-revision',
        count: assignmentRevisions,
        title: 'Berkas tugas masih direvisi',
        description: 'Mahasiswa sudah menerima catatan dan perlu mengunggah berkas perbaikan.',
        tab: 'GRADING',
        tone: 'rose',
        icon: AlertTriangle,
      },
      {
        id: 'remedial-review',
        count: remedialReviews,
        title: 'Remedial menunggu pemeriksaan',
        description: 'Berkas remedial sudah dikirim dan perlu keputusan lulus.',
        tab: 'ATTENDANCE',
        tone: 'rose',
        icon: AlertTriangle,
      },
      {
        id: 'project-revision',
        count: projectRevisions,
        title: 'Final project masih direvisi',
        description: 'Pantau mahasiswa yang belum mengirim perbaikan final project.',
        tab: 'GRADING',
        tone: 'amber',
        icon: Clock,
      },
      {
        id: 'pending-grading',
        count: pendingGrading,
        title: 'Siap untuk dinilai',
        description: 'Mahasiswa sudah mengumpulkan pekerjaan tetapi belum dinilai.',
        tab: 'GRADING',
        tone: 'blue',
        icon: Award,
      },
      {
        id: 'unpublished-grades',
        count: unpublishedGrades,
        title: 'Nilai belum dipublikasikan',
        description: 'Nilai sudah tersimpan sebagai draft dan belum terlihat mahasiswa.',
        tab: 'GRADING',
        tone: 'blue',
        icon: CheckCircle,
      },
      {
        id: 'low-attendance',
        count: kpiStats.ineligibleCount,
        title: 'Kehadiran di bawah 75%',
        description: 'Periksa presensi dan siapkan tindak lanjut remedial.',
        tab: 'ATTENDANCE',
        tone: 'rose',
        icon: AlertTriangle,
      },
      {
        id: 'overdue-submissions',
        count: overdueSubmissions,
        title: 'Tugas melewati tenggat',
        description: 'Jumlah tugas-mahasiswa yang belum memiliki berkas setelah tenggat.',
        tab: 'STUDIO',
        tone: 'amber',
        icon: Clock,
      },
    ].filter(item => item.count > 0);
  }, [assessments, filteredParticipants, kpiStats.ineligibleCount, learningUnits, remedials, submissions]);

  // Top 3 Rankings (PRD Section 15)
  const topRankings = useMemo(() => {
    // 1. Top 3 for Active Period
    const activePeriodParticipants = dashboardPeriod
      ? participants.filter(p => p.periodId === dashboardPeriod.id)
      : [];

    const activePeriodScores = activePeriodParticipants
      .map(p => {
        const ass = assessments.find(a => a.periodId === p.periodId && a.studentId === p.studentId);
        if (!ass || !Number.isFinite(ass.finalScore)) return null;
        return {
          participant: p,
          finalScore: ass.finalScore,
          isPublished: ass.isPublished
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 3);

    // 2. Top 3 Overall Course Context
    const overallScores = courseParticipants
      .map(p => {
        const ass = assessments.find(a => a.periodId === p.periodId && a.studentId === p.studentId);
        if (!ass || !Number.isFinite(ass.finalScore)) return null;
        const periodObj = periods.find(per => per.id === p.periodId);
        return {
          participant: p,
          periodName: periodObj?.name || 'Periode',
          finalScore: ass.finalScore,
          isPublished: ass.isPublished
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 3);

    return { activePeriodScores, overallScores };
  }, [dashboardPeriod, participants, courseParticipants, assessments, periods]);

  // Real Rekap Nilai & Daily Student Performance Calculation
  const rekapPerformance = useMemo(() => {
    // Collect all valid assessments for the currently filtered participants
    const studentAssessments = filteredParticipants
      .map(p => assessments.find(a => a.periodId === p.periodId && a.studentId === p.studentId))
      .filter((a): a is NonNullable<typeof a> => !!a && Number.isFinite(a.finalScore));

    const totalAssessed = studentAssessments.length;

    if (totalAssessed === 0) {
      return {
        hasData: false,
        overallAvg: '0.0',
        assessedCount: 0,
        totalParticipants: filteredParticipants.length,
        dailyItems: [],
        categoryItems: []
      };
    }

    // 1. Averages for Rekap Nilai Components
    const qualitySum = studentAssessments.reduce((acc, a) => acc + (a.qualityScore || 0), 0);
    const attitudeSum = studentAssessments.reduce((acc, a) => acc + (a.attitudeScore || 0), 0);
    const creativitySum = studentAssessments.reduce((acc, a) => acc + (a.creativityScore || 0), 0);
    const reportSum = studentAssessments.reduce((acc, a) => acc + (a.reportScore || 0), 0);
    const finalSum = studentAssessments.reduce((acc, a) => acc + (a.finalScore || 0), 0);

    const qualityAvg = Math.round((qualitySum / totalAssessed) * 10) / 10;
    const attitudeAvg = Math.round((attitudeSum / totalAssessed) * 10) / 10;
    const creativityAvg = Math.round((creativitySum / totalAssessed) * 10) / 10;
    const reportAvg = Math.round((reportSum / totalAssessed) * 10) / 10;
    const overallAvg = (finalSum / totalAssessed).toFixed(1);

    // Sub-components of Quality (if stored, otherwise derived from quality)
    const entrySum = studentAssessments.reduce((acc, a) => acc + (a.entryBehaviorScore ?? a.qualityScore), 0);
    const practiceSum = studentAssessments.reduce((acc, a) => acc + (a.subCpmkPracticeScore ?? a.qualityScore), 0);
    const assignmentSum = studentAssessments.reduce((acc, a) => acc + (a.assignmentScore ?? a.qualityScore), 0);
    const postTestSum = studentAssessments.reduce((acc, a) => acc + (a.postTestScore ?? a.qualityScore), 0);

    const entryAvg = Math.round((entrySum / totalAssessed) * 10) / 10;
    const practiceAvg = Math.round((practiceSum / totalAssessed) * 10) / 10;
    const assignmentAvg = Math.round((assignmentSum / totalAssessed) * 10) / 10;
    const postTestAvg = Math.round((postTestSum / totalAssessed) * 10) / 10;

    // Look up learning unit titles if available for the active period
    const targetPeriodId = selectedPeriodFilter !== 'ALL' ? selectedPeriodFilter : dashboardPeriod?.id;
    const periodUnits = learningUnits.filter(u => u.periodId === targetPeriodId);
    const u1 = periodUnits.find(u => u.unitNumber === 1);
    const u2 = periodUnits.find(u => u.unitNumber === 2);
    const u3 = periodUnits.find(u => u.unitNumber === 3);
    const u4 = periodUnits.find(u => u.unitNumber === 4);
    const u5 = periodUnits.find(u => u.unitNumber === 5);

    // Submissions count
    const studentIds = new Set(filteredParticipants.map(p => p.studentId));
    const periodIds = new Set(filteredParticipants.map(p => p.periodId));
    const relevantSubmissions = submissions.filter(s => studentIds.has(s.studentId) && periodIds.has(s.periodId));

    // Daily progression synchronized with 5-day practice stages & rekap
    const dailyItems = [
      {
        day: 'Hari 1 (Senin)',
        label: u1?.title || 'Kesiapan & Entry Behavior',
        component: 'Entry Behavior (10%)',
        avgScore: entryAvg,
        submissions: totalAssessed,
        color: 'from-blue-500 to-indigo-600'
      },
      {
        day: 'Hari 2 (Selasa)',
        label: u2?.title || 'Ketercapaian Praktik Sub-CPMK',
        component: 'Praktik Inti (50%)',
        avgScore: practiceAvg,
        submissions: totalAssessed,
        color: 'from-blue-600 to-cyan-600'
      },
      {
        day: 'Hari 3 (Rabu)',
        label: u3?.title || 'Tugas Modul & Lembar Kerja',
        component: 'Tugas Modul (15%)',
        avgScore: assignmentAvg,
        submissions: relevantSubmissions.length > 0 ? relevantSubmissions.length : totalAssessed,
        color: 'from-teal-500 to-emerald-600'
      },
      {
        day: 'Hari 4 (Kamis)',
        label: u4?.title || 'Sikap Kerja & Uji Post-Test',
        component: 'Sikap (10%) + Post-Test (25%)',
        avgScore: Math.round(((attitudeAvg + postTestAvg) / 2) * 10) / 10,
        submissions: totalAssessed,
        color: 'from-amber-500 to-orange-600'
      },
      {
        day: 'Hari 5 (Jumat)',
        label: u5?.title || 'Laporan Kerja & Nilai Akhir OBE',
        component: 'Laporan (15%) & Nilai OBE',
        avgScore: Math.round(Number(overallAvg) * 10) / 10,
        submissions: totalAssessed,
        color: 'from-indigo-600 to-purple-600'
      },
    ];

    // Direct Category Breakdown from Rekap Nilai
    const categoryItems = [
      {
        name: 'Nilai Kualitas',
        weight: '70%',
        avgScore: qualityAvg,
        count: totalAssessed,
        color: 'from-blue-500 to-indigo-600'
      },
      {
        name: 'Sikap Kerja & K3',
        weight: '10%',
        avgScore: attitudeAvg,
        count: totalAssessed,
        color: 'from-indigo-500 to-blue-600'
      },
      {
        name: 'Kreativitas & Inisiatif',
        weight: '5%',
        avgScore: creativityAvg,
        count: totalAssessed,
        color: 'from-teal-500 to-emerald-600'
      },
      {
        name: 'Laporan Kerja Praktik',
        weight: '15%',
        avgScore: reportAvg,
        count: totalAssessed,
        color: 'from-amber-500 to-orange-600'
      },
      {
        name: 'Nilai Akhir Kumulatif',
        weight: '100%',
        avgScore: Math.round(Number(overallAvg) * 10) / 10,
        count: totalAssessed,
        color: 'from-indigo-600 to-purple-600'
      },
    ];

    return {
      hasData: true,
      overallAvg,
      assessedCount: totalAssessed,
      totalParticipants: filteredParticipants.length,
      dailyItems,
      categoryItems
    };
  }, [filteredParticipants, assessments, submissions, learningUnits, dashboardPeriod, selectedPeriodFilter]);

  if (!isInitialDataLoaded) {
    return (
      <section aria-busy="true" aria-live="polite" className="space-y-4" role="status">
        <span className="sr-only">Memuat data dashboard dari server…</span>
        <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />)}
        </div>
        <div className="h-52 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </section>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {initialDataError && (
        <div role="alert" className="flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
          <span>{initialDataError}</span>
          <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-lg border border-amber-400 bg-white px-3 font-semibold hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 sm:self-auto">
            <RefreshCw className="h-4 w-4" /> Muat ulang
          </button>
        </div>
      )}
      
      {/* Clean & Modern Course Header matching Analytics & Evaluation page */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-cyan-500" />
              <span>{activeCourse?.code || 'CAD/CAM'} • Kurikulum OBE</span>
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">• Politeknik Sorowako</span>
            {dashboardPeriod && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {activePeriod ? 'Periode Aktif:' : 'Periode:'} {dashboardPeriod.name}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {activeCourse?.name || 'Portal Praktik Poliwako'}
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
            {activeCourse?.description || 'Monitoring capaian pembelajaran praktik CAD, evaluasi mutu OBE, dan rekap nilai terintegrasi.'}
          </p>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:self-auto self-start">
          <button
            onClick={() => onNavigateTab('GRADING')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 text-white text-xs font-bold border border-slate-800 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <Award className="w-4 h-4 text-cyan-400" />
            <span>Grading Workspace</span>
          </button>
          <button
            onClick={() => onNavigateTab('ATTENDANCE')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-800 shadow-xs transition-all cursor-pointer"
          >
            <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Kehadiran</span>
          </button>
          <button
            onClick={() => onNavigateTab('RECAP')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-800 shadow-xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Rekap Nilai</span>
          </button>
        </div>
      </div>

      {/* Modern Filter Strip matching Analytic & Evaluasi page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:px-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
          <Filter className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span>Filter Tampilan Dashboard</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Period Selector */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs font-semibold">
            <span className="text-slate-400 text-[11px]">Periode:</span>
            <select
              id="dashboard-period-filter"
              value={selectedPeriodFilter}
              onChange={e => setSelectedPeriodFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="dark:bg-slate-800">Semua Periode ({coursePeriods.length})</option>
              {coursePeriods.map(p => (
                <option key={p.id} value={p.id} className="dark:bg-slate-800">
                  {p.name} ({p.status === 'ACTIVE' ? 'Aktif' : p.status === 'UPCOMING' ? 'Akan Datang' : 'Selesai'})
                </option>
              ))}
            </select>
          </div>

          {/* Class Selector */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs font-semibold">
            <span className="text-slate-400 text-[11px]">Kelas:</span>
            <select
              id="dashboard-class-filter"
              value={selectedClassFilter}
              onChange={e => setSelectedClassFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="dark:bg-slate-800">Semua Kelas</option>
              <option value="2A" className="dark:bg-slate-800">Kelas 2A</option>
              <option value="2B" className="dark:bg-slate-800">Kelas 2B</option>
              <option value="3A" className="dark:bg-slate-800">Kelas 3A</option>
            </select>
          </div>
        </div>
      </div>

      {/* 1. OBE Analytics Section with 4 Metric Cards + Dual Curve + Donut Ring (Exact Match to Analytics & Evaluation Page) */}
      <OBEAnalyticsSection
        showMetricCards={true}
        selectedPeriodFilter={selectedPeriodFilter}
        selectedClassFilter={selectedClassFilter}
        onNavigateTab={onNavigateTab}
      />

      {/* 2. Operational Metrics Strip (Clean & Modern 4 Indicators) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Final Project Masuk</span>
            <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">{kpiStats.projectSubmittedCount}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-center shrink-0">
            <FolderArchive className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Siap Dinilai</span>
            <div className="text-xl font-extrabold text-cyan-600 dark:text-cyan-400 mt-0.5">{actionQueue.find(item => item.id === 'pending-grading')?.count || 0}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900/40 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Sudah Dinilai</span>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{kpiStats.gradedCount}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center shrink-0">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Presensi &lt;75%</span>
            <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">{kpiStats.ineligibleCount}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 3. Action Queue (Perlu Tindakan) */}
      {activeCourse && actionQueue.length > 0 && (
        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h2 className="text-base font-black text-slate-900 dark:text-white">Perlu tindakan</h2>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Antrean operasional dari filter periode dan kelas yang sedang dipilih.
              </p>
            </div>
            <span className="w-fit rounded-full border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
              {actionQueue.reduce((sum, item) => sum + item.count, 0)} item
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {actionQueue.map(item => {
              const containerClass = item.tone === 'rose'
                ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-slate-800/90 hover:bg-rose-100/60 dark:hover:bg-slate-800'
                : item.tone === 'amber'
                  ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-slate-800/90 hover:bg-amber-100/60 dark:hover:bg-slate-800'
                  : 'border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-slate-800/90 hover:bg-blue-100/60 dark:hover:bg-slate-800';
              const iconClass = item.tone === 'rose'
                ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300'
                : item.tone === 'amber'
                  ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                  : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigateTab(item.tab)}
                  className={`rounded-2xl border p-4 text-left transition-colors ${containerClass}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                      <item.icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</span>
                        <span className="text-xl font-black text-slate-900 dark:text-white">{item.count}</span>
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-slate-600 dark:text-slate-300">{item.description}</span>
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                        Tindak lanjuti <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <AnnouncementManager />

      {/* Main Charts & Rankings Row: Top 3 Periode (Left, Bigger) & Daily Chart (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left 7 cols: Top 3 Periode Berjalan (Bigger Size than Chart) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                    Leaderboard Periode
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">• Evaluasi OBE</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <span>Top 3 Mahasiswa {activePeriod ? 'Periode Berjalan' : dashboardPeriod ? 'Periode Terakhir' : 'Periode'}</span>
                </h3>
              </div>

              {dashboardPeriod && (
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 w-fit">
                  {dashboardPeriod.name}
                </span>
              )}
            </div>

            {/* 3 Prominent Ranking Cards */}
            <div className="space-y-3.5">
              {topRankings.activePeriodScores.length > 0 ? (
                topRankings.activePeriodScores.map((item, idx) => {
                  const rankStyles = [
                    {
                      bg: 'bg-gradient-to-r from-amber-50/80 via-amber-50/30 to-white dark:from-amber-950/35 dark:via-amber-950/15 dark:to-slate-900 border-amber-300 dark:border-amber-600/40 ring-1 ring-amber-400/20 dark:ring-amber-500/20',
                      badge: 'bg-amber-400 text-amber-950 font-black shadow-sm',
                      label: '🏆 Peringkat 1',
                      scoreColor: 'text-amber-700 dark:text-amber-400',
                      medal: 'Juara 1'
                    },
                    {
                      bg: 'bg-gradient-to-r from-slate-100/80 via-slate-50/40 to-white dark:from-slate-800/60 dark:via-slate-800/30 dark:to-slate-900 border-slate-300 dark:border-slate-700',
                      badge: 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold',
                      label: '🥈 Peringkat 2',
                      scoreColor: 'text-slate-700 dark:text-slate-300',
                      medal: 'Juara 2'
                    },
                    {
                      bg: 'bg-gradient-to-r from-amber-900/5 via-amber-700/5 to-white dark:from-amber-950/20 dark:via-amber-950/10 dark:to-slate-900 border-amber-200 dark:border-amber-800/50',
                      badge: 'bg-amber-700/20 dark:bg-amber-800/40 text-amber-900 dark:text-amber-300 font-bold',
                      label: '🥉 Peringkat 3',
                      scoreColor: 'text-amber-800 dark:text-amber-400',
                      medal: 'Juara 3'
                    }
                  ][idx] || {
                    bg: 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700',
                    badge: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
                    label: `#${idx + 1}`,
                    scoreColor: 'text-blue-700 dark:text-cyan-400',
                    medal: `Top ${idx + 1}`
                  };

                  return (
                    <div
                      key={item.participant.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${rankStyles.bg}`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm shrink-0 ${rankStyles.badge}`}>
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                              {rankStyles.label}
                            </span>
                            <span className="px-2 py-0.2 text-[10px] bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded font-semibold border border-slate-200 dark:border-slate-700 font-mono">
                              Kelas {item.participant.student.className}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
                            {item.participant.student.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            NIM: {item.participant.student.nim}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center sm:flex-col items-start sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60 dark:border-slate-800 shrink-0">
                        <div className="flex items-baseline gap-1.5">
                          <span className={`text-xl font-black ${rankStyles.scoreColor}`}>
                            {item.finalScore}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">/ 100</span>
                          {(() => {
                            const pred = getGradePredicate(item.finalScore);
                            return (
                              <span className={`ml-1 font-bold text-[10px] px-1.5 py-0.5 rounded border ${pred.bgClass} ${pred.colorClass} ${pred.borderClass}`}>
                                {pred.letter}
                              </span>
                            );
                          })()}
                        </div>
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          {item.isPublished ? '✓ Terpublikasi' : 'Draft Penilaian'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
                  <Award className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Belum ada nilai yang dimasukkan pada periode ini</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Buka Grading Workspace untuk mulai menilai rubrik mahasiswa.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span>Formula OBE: Kualitas (70%) + Sikap (10%) + Kreativitas (5%) + Laporan (15%)</span>
            <button
              onClick={() => onNavigateTab('GRADING')}
              className="text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 font-bold flex items-center gap-1"
            >
              <span>Grading Workspace</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right 5 cols: Performance Chart Synchronized to Rekap Nilai */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                  <span>Grafik Perkembangan Mahasiswa</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Sinkronisasi Real-Time Rekap Nilai</p>
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Toggle: Harian vs Komponen Rekap */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setChartViewMode('DAILY')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      chartViewMode === 'DAILY'
                        ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-cyan-400 shadow-xs font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Harian
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartViewMode('CATEGORY')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      chartViewMode === 'CATEGORY'
                        ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-cyan-400 shadow-xs font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    Komponen
                  </button>
                </div>

                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                  rekapPerformance.hasData ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-cyan-400 font-mono font-bold border border-transparent dark:border-blue-800/40' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {rekapPerformance.hasData ? `Rata2: ${rekapPerformance.overallAvg}` : 'Belum Dinilai'}
                </span>
              </div>
            </div>

            {/* Content: Real Synchronized Rekap Nilai Chart or Zero State */}
            {rekapPerformance.hasData ? (
              <div className="mt-5 space-y-3.5">
                {chartViewMode === 'DAILY' ? (
                  rekapPerformance.dailyItems.map((item, index) => (
                    <div key={index} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 min-w-0">
                          <span className="shrink-0">{item.day}</span>
                          <span className="text-slate-400 font-normal text-[10px] truncate max-w-[130px] sm:max-w-xs">
                            • {item.label}
                          </span>
                        </div>
                        <div className="font-mono font-bold text-blue-700 dark:text-cyan-400 shrink-0">
                          {item.avgScore} <span className="text-[10px] text-slate-400 font-normal">({item.submissions} Mhs)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`bg-gradient-to-r ${item.color} h-full rounded-full transition-all duration-700 ease-out`}
                          style={{ width: `${Math.min(100, Math.max(0, item.avgScore))}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                ) : (
                  rekapPerformance.categoryItems.map((cat, index) => (
                    <div key={index} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>{cat.name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                            {cat.weight}
                          </span>
                        </div>
                        <div className="font-mono font-bold text-indigo-700 dark:text-indigo-400 shrink-0">
                          {cat.avgScore} <span className="text-[10px] text-slate-400 font-normal">({cat.count} Mhs)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`bg-gradient-to-r ${cat.color} h-full rounded-full transition-all duration-700 ease-out`}
                          style={{ width: `${Math.min(100, Math.max(0, cat.avgScore))}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="py-9 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl my-3">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Belum Ada Rekap Nilai Mahasiswa</p>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs mx-auto">
                  Grafik perkembangan akan otomatis tersinkronisasi saat instruktur menginput nilai mahasiswa di Grading Workspace.
                </p>
                <button
                  onClick={() => onNavigateTab('GRADING')}
                  className="mt-3.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 text-white text-xs font-bold rounded-xl border border-slate-800 dark:border-slate-700 transition-all shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Mulai Menilai di Grading Workspace</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>SKM Kelulusan: 75.0</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateTab('REKAP')}
                className="text-slate-600 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Buka Rekap Nilai</span>
              </button>
              <span>•</span>
              <button
                onClick={() => onNavigateTab('ANALYTICS')}
                className="text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Detail Analitik</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Row 2: Top 3 Umum Mata Kuliah (Diletakkan Terpisah di Bawah, Tidak Sejajar) */}
      <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                Akumulasi Seluruh Periode
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Top 3 Umum Mata Kuliah ({activeCourse?.name})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pencapaian mahasiswa dengan nilai kumulatif tertinggi dari seluruh gelombang periode praktik pada mata kuliah ini.
            </p>
          </div>

          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
            Ranking Lintas Periode
          </span>
        </div>

        {/* 3 Horizontal Column Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topRankings.overallScores.length > 0 ? (
            topRankings.overallScores.map((item, idx) => {
              const cardThemes = [
                {
                  badgeBg: 'bg-indigo-600 text-white',
                  border: 'border-indigo-200 dark:border-indigo-800/60 bg-gradient-to-b from-indigo-50/50 dark:from-indigo-950/40 to-white dark:to-slate-900',
                  trophy: '🏆 Juara Umum 1'
                },
                {
                  badgeBg: 'bg-blue-600 text-white',
                  border: 'border-blue-200 dark:border-blue-800/60 bg-gradient-to-b from-blue-50/40 dark:from-blue-950/40 to-white dark:to-slate-900',
                  trophy: '🥈 Juara Umum 2'
                },
                {
                  badgeBg: 'bg-teal-600 text-white',
                  border: 'border-teal-200 dark:border-teal-800/60 bg-gradient-to-b from-teal-50/40 dark:from-teal-950/40 to-white dark:to-slate-900',
                  trophy: '🥉 Juara Umum 3'
                }
              ][idx];

              return (
                <div
                  key={item.participant.id}
                  className={`p-5 rounded-2xl border flex flex-col justify-between transition-all hover:shadow-md ${cardThemes.border}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {cardThemes.trophy}
                      </span>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${cardThemes.badgeBg}`}>
                        #{idx + 1}
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {item.participant.student.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                      NIM: {item.participant.student.nim} • Kelas {item.participant.student.className}
                    </p>
                    <p className="text-[11px] text-indigo-700 dark:text-indigo-400 font-medium mt-1">
                      {item.periodName}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-baseline justify-between">
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Skor Akhir:</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-indigo-900 dark:text-indigo-200">
                        {item.finalScore} <span className="text-xs text-slate-400 dark:text-slate-500 font-normal">Poin</span>
                      </span>
                      {(() => {
                        const pred = getGradePredicate(item.finalScore);
                        return (
                          <span className={`font-bold text-xs px-2 py-0.5 rounded border ${pred.bgClass} ${pred.colorClass} ${pred.borderClass}`}>
                            {pred.letter}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-3 p-8 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Belum ada rekapan nilai kumulatif mata kuliah.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
