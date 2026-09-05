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
  FileSpreadsheet
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { formatPeriodRange } from '../../utils/dateUtils';
import { getGradePredicate } from '../../utils/gradeCalculators';

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
    learningUnits,
    unitProgress,
    activeCourseId
  } = useApp();

  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [chartViewMode, setChartViewMode] = useState<'DAILY' | 'CATEGORY'>('DAILY');

  // Periods belonging to active course
  const coursePeriods = useMemo(() => {
    return periods.filter(p => p.courseId === activeCourseId);
  }, [periods, activeCourseId]);

  const activePeriod = coursePeriods.find(p => p.status === 'ACTIVE') || coursePeriods[0];

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
    
    // Learning progress average
    let totalProgressSum = 0;
    filteredParticipants.forEach(p => {
      const pUnits = learningUnits.filter(u => u.periodId === p.periodId);
      if (pUnits.length === 0) return;
      const completed = unitProgress.filter(up => up.studentId === p.studentId && up.periodId === p.periodId && up.isCompleted).length;
      totalProgressSum += (completed / pUnits.length);
    });
    const avgProgress = totalParticipants > 0 ? Math.round((totalProgressSum / totalParticipants) * 100) : 0;

    const projectSubmittedCount = filteredParticipants.filter(p => p.finalProjectConfirmed).length;
    const unfinishedCount = filteredParticipants.filter(p => !p.finalProjectConfirmed).length;

    // Assessment stats
    const gradedStudentIds = new Set(assessments.filter(a => a.finalScore > 0).map(a => `${a.periodId}_${a.studentId}`));
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
  }, [filteredParticipants, learningUnits, unitProgress, assessments, attendance]);

  // Top 3 Rankings (PRD Section 15)
  const topRankings = useMemo(() => {
    // 1. Top 3 for Active Period
    const activePeriodParticipants = activePeriod
      ? participants.filter(p => p.periodId === activePeriod.id)
      : [];

    const activePeriodScores = activePeriodParticipants
      .map(p => {
        const ass = assessments.find(a => a.periodId === p.periodId && a.studentId === p.studentId);
        return {
          participant: p,
          finalScore: ass?.finalScore || 0,
          isPublished: ass?.isPublished || false
        };
      })
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 3);

    // 2. Top 3 Overall Course Context
    const overallScores = courseParticipants
      .map(p => {
        const ass = assessments.find(a => a.periodId === p.periodId && a.studentId === p.studentId);
        const periodObj = periods.find(per => per.id === p.periodId);
        return {
          participant: p,
          periodName: periodObj?.name || 'Periode',
          finalScore: ass?.finalScore || 0,
          isPublished: ass?.isPublished || false
        };
      })
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 3);

    return { activePeriodScores, overallScores };
  }, [activePeriod, participants, courseParticipants, assessments, periods]);

  // Real Rekap Nilai & Daily Student Performance Calculation
  const rekapPerformance = useMemo(() => {
    // Collect all valid assessments for the currently filtered participants
    const studentAssessments = filteredParticipants
      .map(p => assessments.find(a => a.periodId === p.periodId && a.studentId === p.studentId))
      .filter((a): a is NonNullable<typeof a> => !!a && typeof a.finalScore === 'number' && a.finalScore > 0);

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
    const targetPeriodId = selectedPeriodFilter !== 'ALL' ? selectedPeriodFilter : activePeriod?.id;
    const periodUnits = learningUnits.filter(u => u.periodId === targetPeriodId);
    const u1 = periodUnits.find(u => u.unitNumber === 1);
    const u2 = periodUnits.find(u => u.unitNumber === 2);
    const u3 = periodUnits.find(u => u.unitNumber === 3);
    const u4 = periodUnits.find(u => u.unitNumber === 4);
    const u5 = periodUnits.find(u => u.unitNumber === 5);

    // Submissions count
    const studentIds = new Set(filteredParticipants.map(p => p.studentId));
    const relevantSubmissions = submissions.filter(s => studentIds.has(s.studentId));

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
  }, [filteredParticipants, assessments, submissions, learningUnits, activePeriod, selectedPeriodFilter]);

  return (
    <div className="space-y-8">
      
      {/* Welcome & Command Center Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 px-3 py-1 bg-cyan-500/20 text-cyan-300 rounded-full text-xs font-semibold w-fit border border-cyan-500/30 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Command Center Instruktur</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {activeCourse?.name || 'Portal Praktik Poliwako'}
          </h1>
          <p className="text-xs text-blue-200 mt-1 max-w-xl leading-relaxed">
            {activeCourse?.description || 'Kelola pembelajaran praktik, progres mahasiswa, kehadiran, rubrik OBE, dan rekap penilaian terintegrasi.'}
          </p>

          {activePeriod && (
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-300 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 w-fit">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Periode Berjalan: <strong className="text-white">{activePeriod.name}</strong> ({formatPeriodRange(activePeriod.startDate, activePeriod.endDate)})</span>
            </div>
          )}
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="flex flex-wrap gap-2.5 relative z-10 w-full md:w-auto">
          <button
            onClick={() => onNavigateTab('GRADING')}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
          >
            <Award className="w-4 h-4" />
            <span>Grading Workspace</span>
          </button>
          <button
            onClick={() => onNavigateTab('ATTENDANCE')}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" />
            <span>Kehadiran</span>
          </button>
          <button
            onClick={() => onNavigateTab('RECAP')}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Rekap & Export</span>
          </button>
        </div>
      </div>

      {/* Zero State Onboarding Notice (Tanpa Dummy Data) */}
      {courses.length === 0 && (
        <div className="bg-white rounded-3xl p-8 border border-dashed border-blue-300 text-center shadow-xs animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Layers className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Selamat Datang di Portal Praktik Poliwako</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4 leading-relaxed">
            Akun instruktur real Anda (<strong className="text-slate-700">rezaf@politekniksorowako.ac.id</strong>) telah aktif tanpa dummy data. Silakan buat mata kuliah praktik perdana Anda atau kelola database mahasiswa.
          </p>
          <div className="flex items-center justify-center gap-2.5">
            <button
              onClick={() => onNavigateTab('STUDENTS')}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
            >
              Kelola Database Mahasiswa
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar (PRD Section 14 & 66) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filter Data Dashboard</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Period Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Periode:</span>
            <select
              value={selectedPeriodFilter}
              onChange={e => setSelectedPeriodFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Semua Periode ({coursePeriods.length})</option>
              {coursePeriods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status === 'ACTIVE' ? 'Aktif' : p.status === 'UPCOMING' ? 'Akan Datang' : 'Selesai'})
                </option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Kelas:</span>
            <select
              value={selectedClassFilter}
              onChange={e => setSelectedClassFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Semua Kelas</option>
              <option value="2A">Kelas 2A</option>
              <option value="2B">Kelas 2B</option>
              <option value="3A">Kelas 3A</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid (PRD Section 13) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        
        {/* Total Peserta */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Peserta</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{kpiStats.totalParticipants}</div>
          <span className="text-[10px] text-slate-400 mt-1">Mahasiswa terdaftar</span>
        </div>

        {/* Progress Pembelajaran */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Progress Rata2</span>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-black text-teal-600">{kpiStats.avgProgress}%</div>
          <span className="text-[10px] text-slate-400 mt-1">Capaian unit materi</span>
        </div>

        {/* Project Dikumpulkan */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Project Masuk</span>
            <FolderArchive className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600">{kpiStats.projectSubmittedCount}</div>
          <span className="text-[10px] text-slate-400 mt-1">Folder Google Drive</span>
        </div>

        {/* Belum Selesai */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Belum Selesai</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">{kpiStats.unfinishedCount}</div>
          <span className="text-[10px] text-slate-400 mt-1">Masih proses unit</span>
        </div>

        {/* Sudah Dinilai */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Sudah Dinilai</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{kpiStats.gradedCount}</div>
          <span className="text-[10px] text-slate-400 mt-1">Evaluasi rubrik OBE</span>
        </div>

        {/* Belum Dinilai */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Belum Dinilai</span>
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-black text-orange-600">{kpiStats.ungradedCount}</div>
          <span className="text-[10px] text-slate-400 mt-1">Perlu grading</span>
        </div>

        {/* Kehadiran <75% */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Hadir &lt;75%</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600">{kpiStats.ineligibleCount}</div>
          <span className="text-[10px] text-slate-400 mt-1">Wajib remedial</span>
        </div>

      </div>

      {/* Main Charts & Rankings Row: Top 3 Periode (Left, Bigger) & Daily Chart (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left 7 cols: Top 3 Periode Berjalan (Bigger Size than Chart) */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                    Leaderboard Periode
                  </span>
                  <span className="text-xs text-slate-400">• Evaluasi OBE</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  <span>Top 3 Mahasiswa Periode Berjalan</span>
                </h3>
              </div>

              {activePeriod && (
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 w-fit">
                  {activePeriod.name}
                </span>
              )}
            </div>

            {/* 3 Prominent Ranking Cards */}
            <div className="space-y-3.5">
              {topRankings.activePeriodScores.length > 0 ? (
                topRankings.activePeriodScores.map((item, idx) => {
                  const rankStyles = [
                    {
                      bg: 'bg-gradient-to-r from-amber-50/80 via-amber-50/30 to-white border-amber-300 ring-1 ring-amber-400/20',
                      badge: 'bg-amber-400 text-amber-950 font-black shadow-sm',
                      label: '🏆 Peringkat 1',
                      scoreColor: 'text-amber-700',
                      medal: 'Juara 1'
                    },
                    {
                      bg: 'bg-gradient-to-r from-slate-100/80 via-slate-50/40 to-white border-slate-300',
                      badge: 'bg-slate-300 text-slate-800 font-bold',
                      label: '🥈 Peringkat 2',
                      scoreColor: 'text-slate-700',
                      medal: 'Juara 2'
                    },
                    {
                      bg: 'bg-gradient-to-r from-amber-900/5 via-amber-700/5 to-white border-amber-200',
                      badge: 'bg-amber-700/20 text-amber-900 font-bold',
                      label: '🥉 Peringkat 3',
                      scoreColor: 'text-amber-800',
                      medal: 'Juara 3'
                    }
                  ][idx] || {
                    bg: 'bg-slate-50 border-slate-200',
                    badge: 'bg-slate-200 text-slate-700',
                    label: `#${idx + 1}`,
                    scoreColor: 'text-blue-700',
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
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                              {rankStyles.label}
                            </span>
                            <span className="px-2 py-0.2 text-[10px] bg-white text-slate-600 rounded font-semibold border border-slate-200 font-mono">
                              Kelas {item.participant.student.className}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                            {item.participant.student.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-mono">
                            NIM: {item.participant.student.nim}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center sm:flex-col items-start sm:items-end justify-between border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/60 shrink-0">
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
                        <span className="text-[10px] font-semibold text-slate-500">
                          {item.isPublished ? '✓ Terpublikasi' : 'Draft Penilaian'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-400 border border-dashed rounded-2xl">
                  <Award className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold text-slate-600">Belum ada nilai yang dimasukkan pada periode ini</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Buka Grading Workspace untuk mulai menilai rubrik mahasiswa.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Formula OBE: Kualitas (70%) + Sikap (10%) + Kreativitas (5%) + Laporan (15%)</span>
            <button
              onClick={() => onNavigateTab('GRADING')}
              className="text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1"
            >
              <span>Grading Workspace</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right 5 cols: Performance Chart Synchronized to Rekap Nilai */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span>Grafik Perkembangan Mahasiswa</span>
                </h3>
                <p className="text-xs text-slate-500">Sinkronisasi Real-Time Rekap Nilai</p>
              </div>

              <div className="flex items-center gap-2">
                {/* View Mode Toggle: Harian vs Komponen Rekap */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setChartViewMode('DAILY')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      chartViewMode === 'DAILY'
                        ? 'bg-white text-blue-700 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Harian
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartViewMode('CATEGORY')}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      chartViewMode === 'CATEGORY'
                        ? 'bg-white text-blue-700 shadow-xs font-bold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Komponen
                  </button>
                </div>

                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                  rekapPerformance.hasData ? 'bg-blue-50 text-blue-700 font-mono font-bold' : 'bg-slate-100 text-slate-500'
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
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5 min-w-0">
                          <span className="shrink-0">{item.day}</span>
                          <span className="text-slate-400 font-normal text-[10px] truncate max-w-[130px] sm:max-w-xs">
                            • {item.label}
                          </span>
                        </div>
                        <div className="font-mono font-bold text-blue-700 shrink-0">
                          {item.avgScore} <span className="text-[10px] text-slate-400 font-normal">({item.submissions} Mhs)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
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
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <span>{cat.name}</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-600 font-mono">
                            {cat.weight}
                          </span>
                        </div>
                        <div className="font-mono font-bold text-indigo-700 shrink-0">
                          {cat.avgScore} <span className="text-[10px] text-slate-400 font-normal">({cat.count} Mhs)</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
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
              <div className="py-9 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl my-3">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
                <p className="text-xs font-semibold text-slate-700">Belum Ada Rekap Nilai Mahasiswa</p>
                <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs mx-auto">
                  Grafik perkembangan akan otomatis tersinkronisasi saat instruktur menginput nilai mahasiswa di Grading Workspace.
                </p>
                <button
                  onClick={() => onNavigateTab('GRADING')}
                  className="mt-3.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Mulai Menilai di Grading Workspace</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>SKM Kelulusan: 75.0</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateTab('REKAP')}
                className="text-slate-600 hover:text-emerald-700 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Buka Rekap Nilai</span>
              </button>
              <span>•</span>
              <button
                onClick={() => onNavigateTab('ANALYTICS')}
                className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Detail Analitik</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Row 2: Top 3 Umum Mata Kuliah (Diletakkan Terpisah di Bawah, Tidak Sejajar) */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                Akumulasi Seluruh Periode
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>Top 3 Umum Mata Kuliah ({activeCourse?.name})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pencapaian mahasiswa dengan nilai kumulatif tertinggi dari seluruh gelombang periode praktik pada mata kuliah ini.
            </p>
          </div>

          <span className="text-xs font-semibold text-slate-400">
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
                  border: 'border-indigo-200 bg-gradient-to-b from-indigo-50/50 to-white',
                  trophy: '🏆 Juara Umum 1'
                },
                {
                  badgeBg: 'bg-blue-600 text-white',
                  border: 'border-blue-200 bg-gradient-to-b from-blue-50/40 to-white',
                  trophy: '🥈 Juara Umum 2'
                },
                {
                  badgeBg: 'bg-teal-600 text-white',
                  border: 'border-teal-200 bg-gradient-to-b from-teal-50/40 to-white',
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
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        {cardThemes.trophy}
                      </span>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${cardThemes.badgeBg}`}>
                        #{idx + 1}
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {item.participant.student.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      NIM: {item.participant.student.nim} • Kelas {item.participant.student.className}
                    </p>
                    <p className="text-[11px] text-indigo-700 font-medium mt-1">
                      {item.periodName}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                    <span className="text-xs text-slate-400 font-semibold">Skor Akhir:</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-indigo-900">
                        {item.finalScore} <span className="text-xs text-slate-400 font-normal">Poin</span>
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
            <div className="col-span-3 p-8 text-center text-slate-400 border border-dashed rounded-2xl">
              <p className="text-xs font-semibold text-slate-600">Belum ada rekapan nilai kumulatif mata kuliah.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
