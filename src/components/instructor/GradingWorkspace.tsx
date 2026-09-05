// Desktop Split-Screen OBE Grading Workspace (PRD Section 50, 51, 52)

import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Assessment, CriterionScore, Submission } from '../../types';
import {
  calculateQualityCompositeScore,
  calculateWeightedFinalScore,
  getFeedbackForScore,
  getGradePredicate,
  RUBRIC_LEVELS
} from '../../utils/gradeCalculators';
import {
  Scale,
  CheckCircle2,
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Save,
  Send,
  AlertCircle,
  ExternalLink,
  Award,
  Layers,
  ArrowRight,
  Target,
  BookOpen,
  Compass,
  Eye,
  EyeOff,
  FileCheck
} from 'lucide-react';
import { Badge } from '../common/Badge';

export const GradingWorkspace: React.FC = () => {
  const {
    activeCourseId,
    activeCourse,
    periods,
    participants,
    submissions,
    assessments,
    feedbackRules,
    attendance,
    learningUnits,
    saveAssessment,
    publishPeriodGrades,
    showToast
  } = useApp();

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [currentStudentIndex, setCurrentStudentIndex] = useState<number>(0);
  const [pdfZoom, setPdfZoom] = useState<number>(100);
  const [pdfPage, setPdfPage] = useState<number>(1);
  const [isAutosaving, setIsAutosaving] = useState<boolean>(false);
  const [customFeedback, setCustomFeedback] = useState<string>('');

  // Top Category Tabs Navigation & PDF Preview Visibility
  const [activeCategoryTab, setActiveCategoryTab] = useState<'QUALITY' | 'ATTITUDE' | 'CREATIVITY' | 'REPORT' | 'ALL'>('QUALITY');
  const [isPdfOpen, setIsPdfOpen] = useState<boolean>(true);

  // Turunan Nilai Kualitas (70%) States
  const [entryBehaviorScore, setEntryBehaviorScore] = useState<number>(85); // 10%
  const [assignmentScore, setAssignmentScore] = useState<number>(85); // 15%
  const [postTestScore, setPostTestScore] = useState<number>(80); // 25%
  const [reportScore, setReportScore] = useState<number>(80); // Laporan 15%
  const [activeDocType, setActiveDocType] = useState<'SUBMISSION' | 'POST_TEST' | 'ASSIGNMENT'>('SUBMISSION');
  const [activeAssignmentId, setActiveAssignmentId] = useState<string>('');
  const [taskScores, setTaskScores] = useState<{ [assignmentId: string]: number }>({});

  // Course Periods
  const coursePeriods = useMemo(() => {
    return periods.filter(p => p.courseId === activeCourseId);
  }, [periods, activeCourseId]);

  const activeSelectedPeriod = coursePeriods.find(p => p.id === selectedPeriodId) || coursePeriods[0];

  // Participants
  const periodParticipants = useMemo(() => {
    if (!activeSelectedPeriod) return [];
    return participants.filter(p => p.periodId === activeSelectedPeriod.id);
  }, [participants, activeSelectedPeriod]);

  const currentParticipant = periodParticipants[currentStudentIndex] || periodParticipants[0];

  // Current Student Assessment
  const existingAssessment = useMemo(() => {
    if (!activeSelectedPeriod || !currentParticipant) return null;
    return assessments.find(
      a => a.periodId === activeSelectedPeriod.id && a.studentId === currentParticipant.studentId
    ) || null;
  }, [assessments, activeSelectedPeriod, currentParticipant]);

  // Current Submissions for this student
  const studentSubmissions = useMemo(() => {
    if (!activeSelectedPeriod || !currentParticipant) return [];
    return submissions.filter(
      s => s.periodId === activeSelectedPeriod.id && s.studentId === currentParticipant.studentId
    );
  }, [submissions, activeSelectedPeriod, currentParticipant]);

  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('');
  const activeSubmission = studentSubmissions.find(s => s.id === selectedSubmissionId) || studentSubmissions[0];

  // Derived tasks from Learning Units with assignments for the selected period
  const periodUnitsWithAssignments = useMemo(() => {
    if (!activeSelectedPeriod) return [];
    return learningUnits.filter(
      u => u.periodId === activeSelectedPeriod.id && !!u.assignment
    );
  }, [learningUnits, activeSelectedPeriod]);

  const tasksToGrade = useMemo(() => {
    if (periodUnitsWithAssignments.length > 0) {
      return periodUnitsWithAssignments.map(u => ({
        id: u.assignment!.id,
        unitId: u.id,
        unitNumber: u.unitNumber,
        unitTitle: u.title,
        assignmentTitle: u.assignment!.title,
        description: u.assignment!.description,
        deadline: u.assignment!.deadline,
        maxScore: u.assignment!.maxScore
      }));
    }
    // Fallback if no specific assignment exists yet on the units
    return [
      {
        id: 'task-default',
        unitId: 'unit-default',
        unitNumber: 1,
        unitTitle: 'Modul Praktik',
        assignmentTitle: 'Tugas Praktik / Worksheet Mandiri',
        description: 'Penilaian lembar perhitungan teknis, kalkulasi parameter mesin, job sheet, dan tugas mandiri.',
        deadline: 'Sesuai Jadwal Praktik',
        maxScore: 100
      }
    ];
  }, [periodUnitsWithAssignments]);

  const activeTask = useMemo(() => {
    return tasksToGrade.find(t => t.id === activeAssignmentId) || tasksToGrade[0];
  }, [tasksToGrade, activeAssignmentId]);

  const activeAssignmentSubmission = useMemo(() => {
    if (!currentParticipant || !activeSelectedPeriod || !activeTask) return undefined;
    return submissions.find(
      s => s.assignmentId === activeTask.id &&
           s.studentId === currentParticipant.studentId &&
           s.periodId === activeSelectedPeriod.id
    );
  }, [submissions, activeTask, currentParticipant, activeSelectedPeriod]);

  // Active Course Sub-CPMKs & Rubrics (OBE Quality Component - PRD Section 45, 46)
  const qualityItems = useMemo(() => {
    if (!activeCourse) return [];
    const subCpmks = activeCourse.subCpmks || [];
    const qualityRubrics = activeCourse.qualityRubrics.filter(r => r.category === 'QUALITY') || [];

    if (subCpmks.length === 0) {
      // Fallback if course has no subCpmks defined
      return qualityRubrics.map(r => ({
        id: r.id,
        rubricId: r.id,
        code: 'Kriteria Mutu',
        title: r.name,
        description: r.description,
        weightPercent: undefined as number | undefined
      }));
    }

    return subCpmks.map(cpmk => {
      const matchedRubric = qualityRubrics.find(r => r.subCpmkId === cpmk.id || r.id === cpmk.id);
      return {
        id: cpmk.id,
        rubricId: matchedRubric?.id || cpmk.id,
        code: cpmk.code,
        title: matchedRubric && matchedRubric.name !== cpmk.code ? matchedRubric.name : cpmk.code,
        description: cpmk.description || matchedRubric?.description || '',
        weightPercent: cpmk.weightPercent
      };
    });
  }, [activeCourse]);

  const attitudeRubrics = useMemo(() => {
    return activeCourse?.qualityRubrics.filter(r => r.category === 'ATTITUDE') || [];
  }, [activeCourse]);

  const creativityRubrics = useMemo(() => {
    return activeCourse?.qualityRubrics.filter(r => r.category === 'CREATIVITY') || [];
  }, [activeCourse]);

  const reportRubrics = useMemo(() => {
    return activeCourse?.qualityRubrics.filter(r => r.category === 'REPORT') || [];
  }, [activeCourse]);

  // Local Criterion Scores State
  const [qualityScores, setQualityScores] = useState<CriterionScore[]>([]);
  const [attitudeScores, setAttitudeScores] = useState<CriterionScore[]>([]);
  const [creativityScores, setCreativityScores] = useState<CriterionScore[]>([]);
  const [reportScores, setReportScores] = useState<CriterionScore[]>([]);

  // Initialize scores when student or course changes
  useEffect(() => {
    if (existingAssessment) {
      setQualityScores(existingAssessment.qualityScores || []);
      setEntryBehaviorScore(existingAssessment.entryBehaviorScore ?? 85);
      
      const initialTaskScores: { [assignmentId: string]: number } = {};
      tasksToGrade.forEach(t => {
        initialTaskScores[t.id] = existingAssessment.assignmentScore ?? 85;
      });
      setTaskScores(initialTaskScores);
      setAssignmentScore(existingAssessment.assignmentScore ?? 85);
      
      setPostTestScore(existingAssessment.postTestScore ?? 80);
      setReportScore(existingAssessment.reportScore ?? (existingAssessment.reportScores?.[0]?.score ?? 80));
      setAttitudeScores(existingAssessment.attitudeScores || []);
      setCreativityScores(existingAssessment.creativityScores || []);
      setReportScores(existingAssessment.reportScores || []);
      setCustomFeedback(existingAssessment.feedback || '');
    } else {
      // Default: set initial 75 for each course Sub-CPMK
      const defaultQ = qualityItems.map(item => ({ criterionId: item.id, score: 75, level: 'Baik' }));
      const defaultA = attitudeRubrics.map(r => ({ criterionId: r.id, score: 100, level: 'Sangat Baik' }));
      const defaultC = creativityRubrics.map(r => ({ criterionId: r.id, score: 75, level: 'Baik' }));
      const defaultR = reportRubrics.map(r => ({ criterionId: r.id, score: 75, level: 'Baik' }));

      setQualityScores(defaultQ);
      setEntryBehaviorScore(85);
      
      const initialTaskScores: { [assignmentId: string]: number } = {};
      tasksToGrade.forEach(t => {
        initialTaskScores[t.id] = 85;
      });
      setTaskScores(initialTaskScores);
      setAssignmentScore(85);
      
      setPostTestScore(80);
      setReportScore(80);
      setAttitudeScores(defaultA);
      setCreativityScores(defaultC);
      setReportScores(defaultR);
      setCustomFeedback('');
    }
  }, [currentParticipant, existingAssessment, activeCourse, qualityItems, tasksToGrade]);

  // Compute Sub-CPMK Practice Average (Ketercapaian Praktik - 50% dari Kualitas)
  const subCpmkPracticeScore = useMemo(() => {
    if (qualityItems.length === 0) return 0;

    // Check if all Sub-CPMKs have weighted percentages defined that sum to 100
    const hasValidWeights = qualityItems.every(item => typeof item.weightPercent === 'number' && item.weightPercent > 0);
    const totalWeight = qualityItems.reduce((acc, item) => acc + (item.weightPercent || 0), 0);

    if (hasValidWeights && totalWeight === 100) {
      let weightedSum = 0;
      qualityItems.forEach(item => {
        const scoreObj = qualityScores.find(q => q.criterionId === item.id || q.criterionId === item.rubricId);
        const score = scoreObj?.score ?? 75;
        weightedSum += score * ((item.weightPercent || 0) / 100);
      });
      return Math.round(weightedSum * 100) / 100;
    }

    // Default simple average across all course Sub-CPMKs
    let sum = 0;
    qualityItems.forEach(item => {
      const scoreObj = qualityScores.find(q => q.criterionId === item.id || q.criterionId === item.rubricId);
      const score = scoreObj?.score ?? 75;
      sum += score;
    });
    return Math.round((sum / qualityItems.length) * 100) / 100;
  }, [qualityItems, qualityScores]);

  // Alias for backward compatibility
  const qualityAvg = subCpmkPracticeScore;

  // Compute Total Nilai Kualitas (70%) via 4 Turunan Formula:
  // Entry Behavior (10%) + Ketercapaian Praktik Sub-CPMK (50%) + Tugas (15%) + Post-Test (25%) = 100%
  const compositeQualityScore = useMemo(() => {
    return calculateQualityCompositeScore(
      entryBehaviorScore,
      subCpmkPracticeScore,
      assignmentScore,
      postTestScore
    );
  }, [entryBehaviorScore, subCpmkPracticeScore, assignmentScore, postTestScore]);

  const attitudeAvg = useMemo(() => {
    if (attitudeScores.length === 0) return 0;
    const sum = attitudeScores.reduce((acc, curr) => acc + curr.score, 0);
    return Math.round((sum / attitudeScores.length) * 100) / 100;
  }, [attitudeScores]);

  const creativityAvg = useMemo(() => {
    if (creativityScores.length === 0) return 0;
    const sum = creativityScores.reduce((acc, curr) => acc + curr.score, 0);
    return Math.round((sum / creativityScores.length) * 100) / 100;
  }, [creativityScores]);

  const reportAvg = reportScore;

  // Compute final score via Formula (PRD Section 50):
  // Final = Quality (70%) + Attitude (10%) + Creativity (5%) + Report (15%)
  const computedFinalScore = useMemo(() => {
    return calculateWeightedFinalScore(compositeQualityScore, attitudeAvg, creativityAvg, reportAvg);
  }, [compositeQualityScore, attitudeAvg, creativityAvg, reportAvg]);

  // Auto-feedback message
  const autoFeedback = useMemo(() => {
    return getFeedbackForScore(computedFinalScore, feedbackRules);
  }, [computedFinalScore, feedbackRules]);

  // Handlers for Turunan Nilai Kualitas
  const handleEntryBehaviorChange = (score: number) => {
    setIsAutosaving(true);
    setEntryBehaviorScore(score);
    setTimeout(() => setIsAutosaving(false), 400);
  };

  const handleAssignmentScoreChange = (score: number) => {
    setIsAutosaving(true);
    setAssignmentScore(score);
    setTimeout(() => setIsAutosaving(false), 400);
  };

  const handleTaskScoreChange = (assignmentId: string, score: number) => {
    setIsAutosaving(true);
    setTaskScores(prev => {
      const updated = { ...prev, [assignmentId]: score };
      const keys = Object.keys(updated);
      if (keys.length > 0) {
        const sum = keys.reduce((acc, k) => acc + (updated[k] || 0), 0);
        const avg = Math.round((sum / keys.length) * 100) / 100;
        setAssignmentScore(avg);
      } else {
        setAssignmentScore(score);
      }
      return updated;
    });
    setTimeout(() => setIsAutosaving(false), 400);
  };

  const handleInspectAssignmentPdf = (assignmentId: string, submission?: Submission, taskTitle?: string) => {
    setIsPdfOpen(true);
    setActiveDocType('ASSIGNMENT');
    setActiveAssignmentId(assignmentId);
    if (submission) {
      setSelectedSubmissionId(submission.id);
    }
    showToast('Memuat Berkas Tugas', `Dokumen PDF untuk ${taskTitle || 'Tugas Praktik'} ditampilkan di panel sebelah kiri.`, 'info');
  };

  const handlePostTestScoreChange = (score: number) => {
    setIsAutosaving(true);
    setPostTestScore(score);
    setTimeout(() => setIsAutosaving(false), 400);
  };

  const handleInspectPostTestPdf = () => {
    setIsPdfOpen(true);
    setActiveDocType('POST_TEST');
    showToast('Memuat Berkas Post-Test', 'Lembar hasil Post-Test mahasiswa ditampilkan di panel PDF sebelah kiri.', 'info');
  };

  // Handler for Component 4: Laporan (15%)
  const handleReportScoreChange = (score: number) => {
    setIsAutosaving(true);
    setReportScore(score);
    setReportScores(
      reportRubrics.length > 0
        ? reportRubrics.map(r => ({
            criterionId: r.id,
            score,
            level: score >= 85 ? 'Sangat Baik' : score >= 75 ? 'Baik' : score >= 50 ? 'Cukup' : 'Kurang'
          }))
        : [{ criterionId: 'rep-default', score, level: 'Baik' }]
    );
    setTimeout(() => setIsAutosaving(false), 400);
  };

  const handleInspectReportPdf = () => {
    setIsPdfOpen(true);
    setActiveDocType('SUBMISSION');
    showToast('Memuat Berkas Laporan', 'Dokumen PDF Laporan Praktikum mahasiswa ditampilkan di panel PDF sebelah kiri.', 'info');
  };

  // Handle Level Selection for Sub-CPMK and other rubrics
  const handleScoreChange = (
    category: 'QUALITY' | 'ATTITUDE' | 'CREATIVITY' | 'REPORT',
    criterionId: string,
    score: number,
    level: string
  ) => {
    setIsAutosaving(true);
    if (category === 'QUALITY') {
      const item = qualityItems.find(q => q.id === criterionId || q.rubricId === criterionId);
      setQualityScores(prev => {
        const filtered = prev.filter(
          p => p.criterionId !== criterionId && (item ? p.criterionId !== item.rubricId : true)
        );
        return [...filtered, { criterionId, score, level }];
      });
    } else if (category === 'ATTITUDE') {
      setAttitudeScores(prev => {
        const filtered = prev.filter(p => p.criterionId !== criterionId);
        return [...filtered, { criterionId, score, level }];
      });
    } else if (category === 'CREATIVITY') {
      setCreativityScores(prev => {
        const filtered = prev.filter(p => p.criterionId !== criterionId);
        return [...filtered, { criterionId, score, level }];
      });
    } else if (category === 'REPORT') {
      setReportScores(prev => {
        const filtered = prev.filter(p => p.criterionId !== criterionId);
        return [...filtered, { criterionId, score, level }];
      });
    }

    setTimeout(() => {
      setIsAutosaving(false);
    }, 400);
  };

  // Save current assessment
  const handleSaveAssessment = (navigateNext: boolean = false) => {
    if (!activeSelectedPeriod || !currentParticipant) return;

    const postTestFileName = `${currentParticipant.student.nim}_PostTest_Komprehensif.pdf`;

    const newAssessment: Assessment = {
      id: existingAssessment?.id || `ass-${Date.now()}`,
      periodId: activeSelectedPeriod.id,
      studentId: currentParticipant.studentId,
      qualityScore: compositeQualityScore,
      entryBehaviorScore,
      subCpmkPracticeScore,
      assignmentScore,
      postTestScore,
      postTestFileUrl: postTestFileName,
      attitudeScore: attitudeAvg,
      creativityScore: creativityAvg,
      reportScore: reportAvg,
      finalScore: computedFinalScore,
      qualityScores,
      attitudeScores,
      creativityScores,
      reportScores,
      feedback: customFeedback.trim() || autoFeedback,
      isPublished: existingAssessment?.isPublished || false,
      gradedAt: new Date().toLocaleDateString('id-ID'),
      updatedAt: new Date().toLocaleDateString('id-ID')
    };

    saveAssessment(newAssessment);
    showToast('Penilaian Tersimpan', `Nilai ${currentParticipant.student.name}: ${computedFinalScore} poin berhasil disimpan.`, 'success');

    if (navigateNext && currentStudentIndex < periodParticipants.length - 1) {
      setCurrentStudentIndex(prev => prev + 1);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Controls */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              OBE Grading Workspace
            </span>
            <span className="text-xs text-slate-400">{activeCourse?.name}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Rubrik Penilaian & PDF Submission Live Inspection</h2>
          <p className="text-xs text-slate-500">
            Penilaian split-screen tanpa reload halaman. Skor dihitung otomatis: Kualitas (70%) + Sikap (10%) + Kreativitas (5%) + Laporan (15%).
          </p>
        </div>

        {/* Period & Student Quick Navigator */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={activeSelectedPeriod?.id || ''}
            onChange={e => setSelectedPeriodId(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {coursePeriods.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <button
            onClick={() => {
              if (activeSelectedPeriod) {
                publishPeriodGrades(activeSelectedPeriod.id);
              }
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Publikasikan Nilai</span>
          </button>
        </div>
      </div>

      {/* Main Split Screen Area (PRD Section 51) */}
      {currentParticipant ? (
        <div className={`grid gap-6 items-start transition-all duration-300 ${isPdfOpen ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
          
          {/* Left Pane: PDF Document Previewer (6 cols) */}
          {isPdfOpen && (
            <div className="lg:col-span-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[82vh]">
            
            {/* Document Tabs Switcher */}
            <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                <button
                  type="button"
                  onClick={() => setActiveDocType('SUBMISSION')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all shrink-0 ${
                    activeDocType === 'SUBMISSION'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Laporan PDF (15%)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveDocType('ASSIGNMENT');
                    if (!activeAssignmentId && tasksToGrade[0]) {
                      setActiveAssignmentId(tasksToGrade[0].id);
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all shrink-0 ${
                    activeDocType === 'ASSIGNMENT'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Tugas Modul PDF (15%)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDocType('POST_TEST')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] flex items-center gap-1.5 transition-all shrink-0 ${
                    activeDocType === 'POST_TEST'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Post-Test PDF (25%)</span>
                </button>
              </div>

              <span className="text-[10px] font-mono text-slate-400 hidden lg:inline-block shrink-0">
                {activeDocType === 'POST_TEST' ? 'Evaluasi Akhir (25%)' : activeDocType === 'ASSIGNMENT' ? `Tugas Modul ${activeTask?.unitNumber || 1} (15%)` : 'Laporan Praktik (15%)'}
              </span>
            </div>

            {/* PDF Header & Toolbar */}
            <div className="px-5 py-3 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className={`w-4 h-4 shrink-0 ${
                  activeDocType === 'POST_TEST'
                    ? 'text-amber-400'
                    : activeDocType === 'ASSIGNMENT'
                    ? 'text-teal-400'
                    : 'text-blue-400'
                }`} />
                <span className="font-bold truncate">
                  {activeDocType === 'POST_TEST'
                    ? `${currentParticipant.student.nim}_PostTest_Komprehensif.pdf`
                    : activeDocType === 'ASSIGNMENT'
                    ? (activeAssignmentSubmission?.fileName || `${currentParticipant.student.nim}_Tugas_${activeTask?.unitNumber || 1}.pdf`)
                    : (activeSubmission?.fileName || `${currentParticipant.student.nim}_Laporan_Praktikum.pdf`)}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 ${
                  activeDocType === 'POST_TEST'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                    : activeDocType === 'ASSIGNMENT'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-400/30'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                }`}>
                  {activeDocType === 'POST_TEST'
                    ? 'Post-Test (25%)'
                    : activeDocType === 'ASSIGNMENT'
                    ? `Tugas Modul ${activeTask?.unitNumber || 1}`
                    : 'Laporan (15%)'}
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center bg-slate-950/60 rounded-lg p-1 border border-slate-700 text-xs text-slate-300">
                  <button onClick={() => setPdfZoom(prev => Math.max(prev - 10, 70))} className="p-1 hover:text-white" title="Zoom Out">
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-1 font-mono text-[10px]">{pdfZoom}%</span>
                  <button onClick={() => setPdfZoom(prev => Math.min(prev + 10, 140))} className="p-1 hover:text-white" title="Zoom In">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center bg-slate-950/60 rounded-lg p-1 border border-slate-700 text-xs text-slate-300">
                  <button
                    disabled={pdfPage <= 1}
                    onClick={() => setPdfPage(prev => Math.max(prev - 1, 1))}
                    className="p-1 hover:text-white disabled:opacity-30"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-1 text-[10px]">{pdfPage}/3</span>
                  <button
                    disabled={pdfPage >= 3}
                    onClick={() => setPdfPage(prev => Math.min(prev + 1, 3))}
                    className="p-1 hover:text-white disabled:opacity-30"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPdfOpen(false)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 hover:text-rose-100 rounded-lg text-xs font-semibold transition-all border border-rose-500/30 ml-1 cursor-pointer"
                  title="Tutup & Sembunyikan Preview PDF"
                >
                  <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Tutup PDF</span>
                </button>
              </div>
            </div>

            {/* Simulated Live Sheet Paper */}
            <div className="flex-1 bg-slate-200 p-6 overflow-auto flex justify-center items-start">
              <div
                style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: 'top center' }}
                className="w-[520px] min-h-[720px] bg-white text-slate-900 rounded-lg shadow-2xl p-6 flex flex-col justify-between border border-slate-300 transition-transform text-xs"
              >
                <div>
                  {activeDocType === 'POST_TEST' ? (
                    <div className="space-y-4">
                      {/* Post-Test Header */}
                      <div className="flex justify-between items-center border-b-2 border-amber-600 pb-2 mb-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                            <h4 className="font-black text-sm tracking-wider text-slate-900 uppercase">POLITEKNIK SOROWAKO</h4>
                          </div>
                          <p className="text-[10px] text-amber-800 font-bold uppercase">Lembar Evaluasi Uji Post-Test Praktik (Bobot 25%)</p>
                        </div>
                        <div className="text-right text-[10px] text-slate-500 font-mono">
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[9px] block mb-0.5">RESMI POLIWAKO</span>
                          NIM: {currentParticipant.student.nim}
                        </div>
                      </div>

                      {/* Identitas Peserta Uji */}
                      <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200 text-[11px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Praktikan:</span>
                          <span className="font-bold text-slate-900">{currentParticipant.student.name} (Kelas {currentParticipant.student.className})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Mata Kuliah:</span>
                          <span className="font-bold text-slate-800">{activeCourse?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Periode Pelaksanaan:</span>
                          <span className="font-mono text-slate-800">{activeSelectedPeriod?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Status Berkas:</span>
                          <span className="text-emerald-700 font-bold font-mono">✓ LULUS VERIFIKASI DOKUMEN</span>
                        </div>
                      </div>

                      {/* Rincian Soal & Verifikasi Post-Test */}
                      <div className="space-y-3 pt-1">
                        <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wide border-b pb-1 text-amber-900 flex items-center gap-1.5">
                          <span>1. Hasil Jawaban Teori & Analisis G-Code</span>
                          <span className="text-[10px] text-slate-400 font-normal">(Hal {pdfPage})</span>
                        </h5>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          Mahasiswa telah menjawab seluruh pertanyaan komprehensif mengenai kalkulasi spindle speed $S$, feedrate $F$, serta mitigasi resiko tabrakan pahat (collision avoidance).
                        </p>

                        <div className="p-3 bg-slate-900 text-slate-100 rounded-xl font-mono text-[10px] space-y-1">
                          <p className="text-amber-400 font-bold"># VERIFIKASI POST-TEST INSPECTION SHEET:</p>
                          <p>✓ Uji Teori K3 & SOP Bengkel : 100% Benar</p>
                          <p>✓ Uji Sintaks G-Code (G00, G01, G02, G03) : 95% Sesuai</p>
                          <p>✓ Kalibrasi Tool Offset & WCS Offset : Akurat (0.00 mm deviation)</p>
                          <p>✓ Hasil Pemeriksaan Akhir Benda Kerja : MEMENUHI STANDAR ISO</p>
                        </div>

                        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Catatan Verifikator Lab Mesin:
                          </span>
                          <p className="text-[11px] text-slate-700 italic leading-relaxed">
                            "Mahasiswa mendemonstrasikan penguasaan materi komprehensif yang sangat baik pada siklus praktik 5 hari. Benda kerja post-test memenuhi standar toleransi gambar kerja."
                          </p>
                        </div>
                      </div>

                      {/* Tanda Tangan & Timestamp */}
                      <div className="pt-4 border-t border-dashed border-slate-300 flex justify-between items-end text-[10px] text-slate-600">
                        <div>
                          <p className="font-bold text-slate-900">Sistem Portal Praktik Poliwako</p>
                          <p className="font-mono text-slate-400">Verifikasi Digital: WITA-SEC-2026</p>
                        </div>
                        <div className="text-center">
                          <div className="w-20 h-10 border border-dashed border-emerald-400 rounded bg-emerald-50 text-emerald-700 font-mono font-bold text-[9px] flex items-center justify-center mb-1">
                            STAMP PASS
                          </div>
                          <p className="font-bold text-slate-800">Instruktur Praktik</p>
                        </div>
                      </div>
                    </div>
                  ) : activeDocType === 'ASSIGNMENT' ? (
                    <div className="space-y-4">
                      {/* Assignment Header */}
                      <div className="flex justify-between items-center border-b-2 border-teal-600 pb-2 mb-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block"></span>
                            <h4 className="font-black text-sm tracking-wider text-slate-900 uppercase">POLITEKNIK SOROWAKO</h4>
                          </div>
                          <p className="text-[10px] text-teal-800 font-bold uppercase">
                            Lembar Penyerahan Tugas Praktik • Modul {activeTask?.unitNumber || 1}
                          </p>
                        </div>
                        <div className="text-right text-[10px] text-slate-500 font-mono">
                          <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 font-bold text-[9px] block mb-0.5">TUGAS MODUL</span>
                          NIM: {currentParticipant.student.nim}
                        </div>
                      </div>

                      {/* Identitas Mahasiswa & Tugas */}
                      <div className="bg-teal-50/50 p-3 rounded-xl border border-teal-200 text-[11px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Praktikan:</span>
                          <span className="font-bold text-slate-900">{currentParticipant.student.name} (Kelas {currentParticipant.student.className})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Tugas / Modul:</span>
                          <span className="font-bold text-teal-950">{activeTask?.assignmentTitle}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Materi Pelajaran:</span>
                          <span className="font-medium text-slate-800">{activeTask?.unitTitle}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 font-medium">Status Berkas:</span>
                          <span className="text-emerald-700 font-bold font-mono">
                            {activeAssignmentSubmission ? `✓ DITERIMA (${activeAssignmentSubmission.fileSize})` : '✓ FILE PDF TUGAS PRAKTIK'}
                          </span>
                        </div>
                      </div>

                      {/* Isi Tugas / Program */}
                      <div className="space-y-3 pt-1">
                        <h5 className="font-bold text-xs text-slate-900 uppercase tracking-wide border-b pb-1 text-teal-900 flex items-center justify-between">
                          <span>Lembar Kerja Praktik & Dokumentasi</span>
                          <span className="text-[10px] text-slate-400 font-normal">Hal {pdfPage} dari 3</span>
                        </h5>
                        <p className="text-[11px] text-slate-700 leading-relaxed">
                          {activeTask?.description}
                        </p>

                        <div className="p-3 bg-slate-900 text-teal-300 rounded-xl font-mono text-[10px] space-y-1">
                          <p className="text-white font-bold"># LOG EKSEKUSI TUGAS MODUL {activeTask?.unitNumber || 1}:</p>
                          <p>✓ Parameter Perhitungan : Spindle Speed S=3200 RPM, Feedrate F=350 mm/min</p>
                          <p>✓ Kode Pemesinan : G00, G01, G02, G03, G81 VERIFIED</p>
                          <p>✓ Kesesuaian Benda Kerja : MEMENUHI SPESIFIKASI MODUL</p>
                        </div>

                        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Catatan Pengerjaan Mahasiswa:
                          </span>
                          <p className="text-[11px] text-slate-700 italic leading-relaxed">
                            "Tugas telah diselesaikan dan diuji coba melalui simulasi CAM sebelum dijalankan pada mesin CNC. Hasil pengukuran telah sesuai batas toleransi teknis."
                          </p>
                        </div>
                      </div>

                      {/* Tanda Tangan */}
                      <div className="pt-4 border-t border-dashed border-slate-300 flex justify-between items-end text-[10px] text-slate-600">
                        <div>
                          <p className="font-bold text-slate-900">Portal Praktik Poliwako</p>
                          <p className="font-mono text-slate-400">Berkas: {activeAssignmentSubmission?.fileName || `${currentParticipant.student.nim}_Tugas_${activeTask?.unitNumber || 1}.pdf`}</p>
                        </div>
                        <div className="text-center">
                          <div className="w-20 h-10 border border-dashed border-teal-500 rounded bg-teal-50 text-teal-700 font-mono font-bold text-[9px] flex items-center justify-center mb-1">
                            STAMP ACC
                          </div>
                          <p className="font-bold text-slate-800">Instruktur Praktik</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2 mb-4">
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">POLITEKNIK SOROWAKO</h4>
                          <p className="text-[10px] text-slate-500">Laporan Praktik Mahasiswa</p>
                        </div>
                        <div className="text-right text-[10px] text-slate-500 font-mono">
                          NIM: {currentParticipant.student.nim}
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded border border-slate-200 mb-4 text-[11px]">
                        <p><strong>Praktikan:</strong> {currentParticipant.student.name} (Kelas {currentParticipant.student.className})</p>
                        <p><strong>Mata Kuliah:</strong> {activeCourse?.name}</p>
                        <p><strong>Waktu Submit:</strong> {activeSubmission?.submittedAt || '10 September 2026'}</p>
                      </div>

                      {pdfPage === 1 && (
                        <div className="space-y-3 text-[11px] text-slate-700 leading-relaxed">
                          <h5 className="font-bold text-slate-900 uppercase border-b pb-1">1. Program Kode G & Lintasan CAM</h5>
                          <p>Berikut adalah baris program NC hasil kalkulasi feedrate dan cutting parameters:</p>
                          <div className="bg-slate-900 text-emerald-400 font-mono text-[10px] p-3 rounded">
                            <p>O2401 (POLIWAKO-MILLING)</p>
                            <p>G21 G90 G54 G00 X0. Y0. S3200 M03</p>
                            <p>G43 H01 Z10. M08</p>
                            <p>G01 Z-2.0 F300</p>
                            <p>G01 X80.0 Y0. F750</p>
                            <p>G02 X90.0 Y10.0 R10.0</p>
                            <p>G01 Y60.0</p>
                            <p>M30</p>
                          </div>
                        </div>
                      )}

                      {pdfPage === 2 && (
                        <div className="space-y-3 text-[11px] text-slate-700 leading-relaxed">
                          <h5 className="font-bold text-slate-900 uppercase border-b pb-1">2. Lembar Inspeksi Toleransi Dimensi</h5>
                          <table className="w-full border-collapse border border-slate-300 text-[10px]">
                            <thead>
                              <tr className="bg-slate-100 font-bold border-b border-slate-300">
                                <th className="p-1 border-r">Fitur</th>
                                <th className="p-1 border-r">Nominal</th>
                                <th className="p-1 border-r">Toleransi</th>
                                <th className="p-1 border-r">Hasil Aktual</th>
                                <th className="p-1">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b">
                                <td className="p-1 border-r">Panjang X</td>
                                <td className="p-1 border-r">100.00</td>
                                <td className="p-1 border-r">±0.05</td>
                                <td className="p-1 border-r font-mono">100.02</td>
                                <td className="p-1 text-emerald-600 font-bold">PASS</td>
                              </tr>
                              <tr className="border-b">
                                <td className="p-1 border-r">Lebar Y</td>
                                <td className="p-1 border-r">80.00</td>
                                <td className="p-1 border-r">±0.05</td>
                                <td className="p-1 border-r font-mono">79.98</td>
                                <td className="p-1 text-emerald-600 font-bold">PASS</td>
                              </tr>
                              <tr>
                                <td className="p-1 border-r">Roughness (Ra)</td>
                                <td className="p-1 border-r">1.6 µm</td>
                                <td className="p-1 border-r">Max 1.6</td>
                                <td className="p-1 border-r font-mono">1.21 µm</td>
                                <td className="p-1 text-emerald-600 font-bold">PASS</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}

                      {pdfPage === 3 && (
                        <div className="space-y-3 text-[11px] text-slate-700 leading-relaxed">
                          <h5 className="font-bold text-slate-900 uppercase border-b pb-1">3. Evaluasi & Keselamatan Kerja</h5>
                          <p>Seluruh proses pemotongan aluminium Al6061 telah mematuhi standar APD bengkel. Tidak terjadi tabrakan pahat (crash) dan dimensi akhir sesuai ketentuan gambar kerja.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-2 text-[9px] text-slate-400 flex justify-between">
                  <span>Portal Praktik Poliwako • Halaman {pdfPage} dari 3</span>
                  <span>{currentParticipant.student.name}</span>
                </div>
              </div>
            </div>

          </div>
          )}

          {/* Right Pane: Student OBE Rubric Grading Form (6 cols when PDF open, full width when PDF closed) */}
          <div className={`${isPdfOpen ? 'lg:col-span-6' : 'w-full max-w-5xl mx-auto'} bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 max-h-[82vh] overflow-y-auto transition-all`}>
            
            {/* Student Switcher Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
                  {currentParticipant.student.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{currentParticipant.student.name}</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    NIM: {currentParticipant.student.nim} • Kelas {currentParticipant.student.className}
                  </p>
                </div>
              </div>

              {/* Student Navigation & PDF Toggle Controls */}
              <div className="flex items-center gap-2">
                {!isPdfOpen && (
                  <button
                    type="button"
                    onClick={() => setIsPdfOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-800 rounded-xl text-xs font-bold border border-blue-200 transition-all shadow-xs"
                    title="Buka kembali dokumen preview PDF di sisi kiri"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span>Buka Preview PDF</span>
                  </button>
                )}

                <button
                  disabled={currentStudentIndex === 0}
                  onClick={() => setCurrentStudentIndex(prev => Math.max(prev - 1, 0))}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-lg text-slate-700"
                  title="Mahasiswa Sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-slate-600">
                  {currentStudentIndex + 1} / {periodParticipants.length}
                </span>
                <button
                  disabled={currentStudentIndex >= periodParticipants.length - 1}
                  onClick={() => setCurrentStudentIndex(prev => Math.min(prev + 1, periodParticipants.length - 1))}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-30 rounded-lg text-slate-700"
                  title="Mahasiswa Berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Autosave Status Indicator (PRD Section 52) */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isAutosaving ? 'Menyimpan perubahan...' : '✓ Perubahan Tersimpan'}</span>
              </div>
              <Badge status={existingAssessment?.isPublished ? 'PUBLISHED' : 'ASSESSED'} size="sm" />
            </div>

            {/* Menu Navigasi Kategori Nilai (Top Menu Tabs) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Menu Kategori Penilaian
                </span>
                <span className="text-[10px] text-slate-400">
                  Klik tab untuk fokus memeriksa per-kategori
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200">
                {/* 1. Kualitas (70%) */}
                <button
                  type="button"
                  onClick={() => setActiveCategoryTab('QUALITY')}
                  className={`p-2.5 rounded-xl text-left transition-all flex flex-col justify-between cursor-pointer ${
                    activeCategoryTab === 'QUALITY'
                      ? 'bg-white shadow-sm border border-blue-300 ring-2 ring-blue-500/20'
                      : 'hover:bg-white/70 text-slate-600 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-[11px] font-bold truncate ${activeCategoryTab === 'QUALITY' ? 'text-blue-900' : 'text-slate-700'}`}>
                      1. Kualitas
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 shrink-0">
                      70%
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-[10px] text-slate-400">Rata2:</span>
                    <span className="text-xs font-mono font-black text-blue-700">{compositeQualityScore}</span>
                  </div>
                </button>

                {/* 2. Sikap (10%) */}
                <button
                  type="button"
                  onClick={() => setActiveCategoryTab('ATTITUDE')}
                  className={`p-2.5 rounded-xl text-left transition-all flex flex-col justify-between cursor-pointer ${
                    activeCategoryTab === 'ATTITUDE'
                      ? 'bg-white shadow-sm border border-indigo-300 ring-2 ring-indigo-500/20'
                      : 'hover:bg-white/70 text-slate-600 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-[11px] font-bold truncate ${activeCategoryTab === 'ATTITUDE' ? 'text-indigo-900' : 'text-slate-700'}`}>
                      2. Sikap
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-100 text-indigo-800 shrink-0">
                      10%
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-[10px] text-slate-400">Rata2:</span>
                    <span className="text-xs font-mono font-black text-indigo-700">{attitudeAvg}</span>
                  </div>
                </button>

                {/* 3. Kreativitas (5%) */}
                <button
                  type="button"
                  onClick={() => setActiveCategoryTab('CREATIVITY')}
                  className={`p-2.5 rounded-xl text-left transition-all flex flex-col justify-between cursor-pointer ${
                    activeCategoryTab === 'CREATIVITY'
                      ? 'bg-white shadow-sm border border-teal-300 ring-2 ring-teal-500/20'
                      : 'hover:bg-white/70 text-slate-600 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-[11px] font-bold truncate ${activeCategoryTab === 'CREATIVITY' ? 'text-teal-900' : 'text-slate-700'}`}>
                      3. Kreativitas
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-100 text-teal-800 shrink-0">
                      5%
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-[10px] text-slate-400">Rata2:</span>
                    <span className="text-xs font-mono font-black text-teal-700">{creativityAvg}</span>
                  </div>
                </button>

                {/* 4. Laporan (15%) */}
                <button
                  type="button"
                  onClick={() => setActiveCategoryTab('REPORT')}
                  className={`p-2.5 rounded-xl text-left transition-all flex flex-col justify-between cursor-pointer ${
                    activeCategoryTab === 'REPORT'
                      ? 'bg-white shadow-sm border border-amber-300 ring-2 ring-amber-500/20'
                      : 'hover:bg-white/70 text-slate-600 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-[11px] font-bold truncate ${activeCategoryTab === 'REPORT' ? 'text-amber-900' : 'text-slate-700'}`}>
                      4. Laporan
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 shrink-0">
                      15%
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-[10px] text-slate-400">Rata2:</span>
                    <span className="text-xs font-mono font-black text-amber-700">{reportScore}</span>
                  </div>
                </button>

                {/* 5. Semua Kategori */}
                <button
                  type="button"
                  onClick={() => setActiveCategoryTab('ALL')}
                  className={`col-span-2 sm:col-span-1 p-2.5 rounded-xl text-left transition-all flex flex-col justify-between cursor-pointer ${
                    activeCategoryTab === 'ALL'
                      ? 'bg-white shadow-sm border border-slate-400 ring-2 ring-slate-500/20'
                      : 'hover:bg-white/70 text-slate-600 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-[11px] font-bold truncate ${activeCategoryTab === 'ALL' ? 'text-slate-900' : 'text-slate-700'}`}>
                      Semua
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 text-slate-700 shrink-0">
                      100%
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-[10px] text-slate-400">Total:</span>
                    <span className="text-xs font-mono font-black text-slate-800">{computedFinalScore}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* COMPONENT 1: NILAI KUALITAS (70%) */}
            {/* Turunan: Entry Behavior (10%) + Ketercapaian Praktik Sub-CPMK (50%) + Tugas (15%) + Post-Test (25%) */}
            {/* ========================================================================= */}
            {(activeCategoryTab === 'QUALITY' || activeCategoryTab === 'ALL') && (
            <div className="space-y-3">
              
              {/* Header Nilai Kualitas (70%) - Format seragam seperti Sikap */}
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  Nilai Kualitas (Bobot 70%)
                </h4>
                <span className="text-xs font-black text-blue-700 font-mono">
                  Rata2: {compositeQualityScore}
                </span>
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* TURUNAN 1: ENTRY BEHAVIOR (10%) - INPUT NILAI */}
              {/* ----------------------------------------------------------------- */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 transition-all hover:border-slate-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-black text-[10px] flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Entry Behavior (Bobot 10%)</span>
                      </h5>
                      <p className="text-[10px] text-slate-500">
                        Kesiapan awal mahasiswa, pemahaman prasyarat materi, dan kepatuhan SOP dasar bengkel.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-[10px] font-mono text-slate-400">Kontribusi:</span>
                    <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                      {(entryBehaviorScore * 0.10).toFixed(1)} Poin
                    </span>
                  </div>
                </div>

                {/* Input Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-slate-700">Skor (0-100):</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={entryBehaviorScore}
                      onChange={e => handleEntryBehaviorChange(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                      className="w-20 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-center text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[100, 85, 75, 50, 0].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleEntryBehaviorChange(val)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                          entryBehaviorScore === val
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* TURUNAN 2: KETERCAPAIAN PRAKTIK (50%) - MERUPAKAN SUB-CPMK */}
              {/* ----------------------------------------------------------------- */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-black text-[10px] flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-blue-600" />
                        <h5 className="text-xs font-bold text-slate-900">
                          Ketercapaian Praktik (Bobot 50%)
                        </h5>
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
                          Sub-CPMK
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Penilaian langsung pada mutu proses dan benda kerja berdasarkan Sub-CPMK ({qualityItems.length} Sub-CPMK Terkonfigurasi).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-[10px] font-mono text-slate-400">Rata2: {subCpmkPracticeScore} • Kontribusi:</span>
                    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                      {(subCpmkPracticeScore * 0.50).toFixed(1)} Poin
                    </span>
                  </div>
                </div>

                {/* Sub-CPMK Items */}
                <div className="space-y-3 pt-1">
                  {qualityItems.map(item => {
                    const currentScoreObj = qualityScores.find(q => q.criterionId === item.id || q.criterionId === item.rubricId);
                    const activeScore = currentScoreObj?.score ?? 75;

                    return (
                      <div key={item.id} className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2 hover:border-blue-300 transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-600 text-white font-mono shadow-xs">
                                {item.code}
                              </span>
                              {item.weightPercent !== undefined && item.weightPercent > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                  Bobot: {item.weightPercent}%
                                </span>
                              )}
                              <h6 className="text-xs font-bold text-slate-900">{item.title}</h6>
                            </div>
                            <p className="text-[10px] text-slate-600 leading-relaxed">{item.description}</p>
                          </div>
                          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-lg shrink-0">
                            {activeScore} Poin
                          </span>
                        </div>

                        {/* Scale Buttons 100/75/50/25/0 */}
                        <div className="grid grid-cols-5 gap-1.5 pt-1">
                          {RUBRIC_LEVELS.map(lvl => (
                            <button
                              key={lvl.score}
                              type="button"
                              onClick={() => handleScoreChange('QUALITY', item.id, lvl.score, lvl.label)}
                              className={`py-1.5 px-1 rounded-lg text-center text-[10px] font-bold border transition-all ${
                                activeScore === lvl.score
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <div>{lvl.score}</div>
                              <div className="text-[8px] font-normal truncate opacity-90">{lvl.label}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* TURUNAN 3: TUGAS PRAKTIK (15%) - DIHUBUNGKAN KE MATERI TUGAS */}
              {/* ----------------------------------------------------------------- */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-black text-[10px] flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                        <h5 className="text-xs font-bold text-slate-900">
                          Tugas Praktik / Worksheet (Bobot 15%)
                        </h5>
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-teal-100 text-teal-800">
                          {tasksToGrade.length} Tugas Materi
                        </span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                          File PDF
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Dihubungkan langsung dari tugas materi praktik dengan verifikasi berkas PDF seperti Post-Test.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-[10px] font-mono text-slate-400">Rata2: {assignmentScore} • Kontribusi:</span>
                    <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200">
                      {(assignmentScore * 0.15).toFixed(1)} Poin
                    </span>
                  </div>
                </div>

                {/* List of Tasks Connected to Materials */}
                <div className="space-y-3.5 pt-0.5">
                  {tasksToGrade.map((task) => {
                    const studentSubmission = submissions.find(
                      s => s.assignmentId === task.id &&
                           s.studentId === currentParticipant.studentId &&
                           s.periodId === activeSelectedPeriod.id
                    );
                    const currentScore = taskScores[task.id] ?? 85;

                    return (
                      <div key={task.id} className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-3 hover:border-teal-300 transition-all shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-slate-100 pb-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-100 text-slate-700">
                                Modul {task.unitNumber}
                              </span>
                              <h6 className="text-xs font-bold text-slate-900">{task.assignmentTitle}</h6>
                            </div>
                            <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                              {task.description}
                            </p>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 shrink-0 self-start sm:self-auto">
                            Tenggat: {task.deadline}
                          </span>
                        </div>

                        {/* PDF File Inspector Box like Post-Test */}
                        <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 block truncate max-w-xs">
                                {studentSubmission?.fileName || `${currentParticipant.student.nim}_Tugas${task.unitNumber}_Dokumen.pdf`}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {studentSubmission
                                  ? `Dokumen PDF Tugas • ${studentSubmission.fileSize} • Diunggah: ${studentSubmission.submittedAt}`
                                  : 'Dokumen PDF Tugas Praktik • 2.8 MB • Terverifikasi'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleInspectAssignmentPdf(task.id, studentSubmission, task.assignmentTitle)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all shadow-xs ${
                              activeDocType === 'ASSIGNMENT' && activeAssignmentId === task.id
                                ? 'bg-amber-600 text-white border-amber-600'
                                : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>{activeDocType === 'ASSIGNMENT' && activeAssignmentId === task.id ? 'Sedang Ditampilkan di Kiri' : 'Inspeksi Lembar PDF'}</span>
                          </button>
                        </div>

                        {/* Score Input Controls */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-0.5">
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] font-bold text-slate-700">Skor Tugas (0-100):</label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={currentScore}
                              onChange={e => handleTaskScoreChange(task.id, Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                              className="w-20 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-center text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                            />
                          </div>

                          {/* Preset quick buttons */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {[100, 85, 75, 50, 0].map(val => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => handleTaskScoreChange(task.id, val)}
                                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                                  currentScore === val
                                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* TURUNAN 4: POST-TEST (25%) - FILE PDF & NILAI */}
              {/* ----------------------------------------------------------------- */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-indigo-100 text-indigo-700 font-black text-[10px] flex items-center justify-center shrink-0">
                      4
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                        <h5 className="text-xs font-bold text-slate-900">
                          Post-Test Praktik (Bobot 25%)
                        </h5>
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                          File PDF
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Evaluasi lembar tes akhir praktik / inspection report komprehensif mahasiswa dalam format PDF.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-[10px] font-mono text-slate-400">Kontribusi:</span>
                    <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                      {(postTestScore * 0.25).toFixed(1)} Poin
                    </span>
                  </div>
                </div>

                {/* PDF File Inspector Trigger */}
                <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block truncate max-w-xs">
                        {currentParticipant.student.nim}_PostTest_Komprehensif.pdf
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Dokumen PDF Hasil Uji Komprehensif • 2.4 MB
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleInspectPostTestPdf()}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all shadow-xs ${
                      activeDocType === 'POST_TEST'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{activeDocType === 'POST_TEST' ? 'Sedang Ditampilkan di Kiri' : 'Inspeksi Lembar PDF'}</span>
                  </button>
                </div>

                {/* Score Input Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-slate-700">Skor Post-Test (0-100):</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={postTestScore}
                      onChange={e => handlePostTestScoreChange(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                      className="w-20 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-center text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[100, 85, 75, 50, 0].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handlePostTestScoreChange(val)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                          postTestScore === val
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

                {activeCategoryTab === 'QUALITY' && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveCategoryTab('ATTITUDE')}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-indigo-200 transition-all shadow-xs cursor-pointer"
                    >
                      <span>Lanjut: Nilai Sikap & K3 (10%)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Component 2: Sikap Kerja & K3 (10%) */}
            {(activeCategoryTab === 'ATTITUDE' || activeCategoryTab === 'ALL') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                    Sikap & K3 (Bobot 10%)
                  </h4>
                <span className="text-xs font-black text-indigo-700 font-mono">
                  Rata2: {attitudeAvg}
                </span>
              </div>

              {attitudeRubrics.map(rub => {
                const currentScoreObj = attitudeScores.find(q => q.criterionId === rub.id);
                const activeScore = currentScoreObj?.score ?? 100;

                return (
                  <div key={rub.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-start justify-between">
                      <h5 className="text-xs font-bold text-slate-900">{rub.name}</h5>
                      <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded">
                        {activeScore}
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 pt-1">
                      {RUBRIC_LEVELS.map(lvl => (
                        <button
                          key={lvl.score}
                          type="button"
                          onClick={() => handleScoreChange('ATTITUDE', rub.id, lvl.score, lvl.label)}
                          className={`py-1.5 px-1 rounded-lg text-center text-[10px] font-bold border transition-all ${
                            activeScore === lvl.score
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <div>{lvl.score}</div>
                          <div className="text-[8px] font-normal truncate">{lvl.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
                {activeCategoryTab === 'ATTITUDE' && (
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveCategoryTab('QUALITY')}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Kembali ke Kualitas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCategoryTab('CREATIVITY')}
                      className="px-4 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-teal-200 transition-all shadow-xs cursor-pointer"
                    >
                      <span>Lanjut: Kreativitas (5%)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Component 3: Kreativitas & Inisiatif (5%) */}
            {(activeCategoryTab === 'CREATIVITY' || activeCategoryTab === 'ALL') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-900">
                    Kreativitas (Bobot 5%)
                  </h4>
                  <span className="text-xs font-black text-teal-700 font-mono">
                    Rata2: {creativityAvg}
                  </span>
                </div>

                {creativityRubrics.map(rub => {
                  const currentScoreObj = creativityScores.find(q => q.criterionId === rub.id);
                  const activeScore = currentScoreObj?.score ?? 75;

                  return (
                    <div key={rub.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                      <div className="flex items-start justify-between">
                        <h5 className="text-xs font-bold text-slate-900">{rub.name}</h5>
                        <span className="text-xs font-mono font-bold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded">
                          {activeScore}
                        </span>
                      </div>
                      <div className="grid grid-cols-5 gap-1.5 pt-1">
                        {RUBRIC_LEVELS.map(lvl => (
                          <button
                            key={lvl.score}
                            type="button"
                            onClick={() => handleScoreChange('CREATIVITY', rub.id, lvl.score, lvl.label)}
                            className={`py-1.5 px-1 rounded-lg text-center text-[10px] font-bold border transition-all ${
                              activeScore === lvl.score
                                ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div>{lvl.score}</div>
                            <div className="text-[8px] font-normal truncate">{lvl.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {activeCategoryTab === 'CREATIVITY' && (
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setActiveCategoryTab('ATTITUDE')}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Kembali ke Sikap</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCategoryTab('REPORT')}
                      className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-amber-200 transition-all shadow-xs cursor-pointer"
                    >
                      <span>Lanjut: Laporan (15%)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Component 4: Laporan Kerja Praktik (15%) */}
            {(activeCategoryTab === 'REPORT' || activeCategoryTab === 'ALL') && (
              <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Laporan Kerja (Bobot 15%)
                </h4>
                <span className="text-xs font-black text-amber-700 font-mono">
                  Rata2: {reportScore}
                </span>
              </div>

              {/* Laporan Card matching Post-Test format */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        <h5 className="text-xs font-bold text-slate-900">
                          Laporan Praktikum (Bobot 15%)
                        </h5>
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                          File PDF
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Evaluasi dokumen laporan lengkap praktikum mahasiswa dalam format PDF.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="text-[10px] font-mono text-slate-400">Kontribusi:</span>
                    <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                      {(reportScore * 0.15).toFixed(1)} Poin
                    </span>
                  </div>
                </div>

                {/* PDF File Inspector Trigger */}
                <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block truncate max-w-xs">
                        {activeSubmission?.fileName || `${currentParticipant.student.nim}_Laporan_Praktikum.pdf`}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Dokumen PDF Laporan Praktikum • {activeSubmission?.fileSize || '3.2 MB'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleInspectReportPdf()}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all shadow-xs ${
                      activeDocType === 'SUBMISSION'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{activeDocType === 'SUBMISSION' ? 'Sedang Ditampilkan di Kiri' : 'Inspeksi Lembar PDF'}</span>
                  </button>
                </div>

                {/* Score Input Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-slate-700">Skor Laporan (0-100):</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={reportScore}
                      onChange={e => handleReportScoreChange(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                      className="w-20 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-center text-xs font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[100, 85, 75, 50, 0].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleReportScoreChange(val)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                          reportScore === val
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {activeCategoryTab === 'REPORT' && (
                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveCategoryTab('CREATIVITY')}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Kembali ke Kreativitas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCategoryTab('ALL')}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <span>Tinjau Semua Kategori</span>
                    <Layers className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
            )}

            {/* Live Final Score Badge & Formula Summary (PRD Section 50) */}
            <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-2xl p-5 shadow-lg border border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                    Nilai Akhir Terkalkulasi (OBE)
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black">{computedFinalScore}</span>
                    <span className="text-xs text-slate-400">/ 100</span>
                  </div>
                  {(() => {
                    const pred = getGradePredicate(computedFinalScore);
                    return (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black rounded text-[10px]">
                          {pred.letter}
                        </span>
                        <span className="text-xs text-cyan-200 font-semibold">
                          {pred.predicate}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({pred.range10Label})
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div className="text-right text-[10px] text-slate-300 font-mono space-y-0.5">
                  <p>Kualitas (70%): {(compositeQualityScore * 0.70).toFixed(2)}</p>
                  <p>Sikap (10%): {(attitudeAvg * 0.10).toFixed(2)}</p>
                  <p>Kreativitas (5%): {(creativityAvg * 0.05).toFixed(2)}</p>
                  <p>Laporan (15%): {(reportAvg * 0.15).toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Feedback Message Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Catatan & Feedback Mahasiswa:</span>
              </label>
              <textarea
                rows={2}
                value={customFeedback || autoFeedback}
                onChange={e => setCustomFeedback(e.target.value)}
                placeholder={autoFeedback}
                className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 font-medium"
              ></textarea>
              <p className="text-[10px] text-slate-400 mt-1">
                Catatan ini yang akan dilihat oleh mahasiswa setelah nilai dipublikasikan.
              </p>
            </div>

            {/* Action Buttons: Save & Next Student */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                onClick={() => handleSaveAssessment(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 border border-slate-300"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Penilaian</span>
              </button>

              <button
                onClick={() => handleSaveAssessment(true)}
                className="flex-1 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>Simpan & Nilai Mahasiswa Berikutnya</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
          <p>Belum ada mahasiswa di periode ini.</p>
        </div>
      )}

    </div>
  );
};
