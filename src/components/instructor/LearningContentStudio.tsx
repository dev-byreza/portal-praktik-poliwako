// Learning Content Studio (PRD Section 29-32, 41-43)

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { LearningUnit, LearningMaterial, Assignment } from '../../types';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  PlayCircle,
  FileText,
  ExternalLink,
  UploadCloud,
  CheckCircle2,
  X,
  Layers,
  Calendar,
  Sparkles,
  Copy,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  CheckSquare,
  Square,
  Check,
  AlertCircle,
  AlertTriangle
} from 'lucide-react';
import { PDFViewerModal } from '../common/PDFViewerModal';
import { ModalPortal } from '../common/ModalPortal';
import { formatDeadline, toDateTimeLocalWita, fromDateTimeLocalWita } from '../../utils/dateUtils';
import { getYouTubeVideoId, toYouTubeEmbedUrl } from '../../utils/youtubeUtils';

const newStudioEntityId = (prefix: string): string => (
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
);

export const LearningContentStudio: React.FC = () => {
  const {
    activeCourseId,
    activeCourse,
    periods,
    learningUnits,
    createLearningUnit,
    updateLearningUnit,
    updatePeriod,
    deleteLearningUnit,
    copyLearningUnits,
    showToast
  } = useApp();

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [isProjectLinkModalOpen, setIsProjectLinkModalOpen] = useState(false);
  const [projectDriveUrlInput, setProjectDriveUrlInput] = useState('');
  const [projectDescriptionInput, setProjectDescriptionInput] = useState('');

  // Modals
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<LearningUnit | null>(null);

  // Copy to Other Week Modal states
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [selectedUnitIdsToCopy, setSelectedUnitIdsToCopy] = useState<string[]>([]);
  const [selectedTargetPeriodIds, setSelectedTargetPeriodIds] = useState<string[]>([]);
  const [copyMode, setCopyMode] = useState<'APPEND' | 'REPLACE'>('APPEND');
  const [autoRedirectAfterCopy, setAutoRedirectAfterCopy] = useState(true);

  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [matType, setMatType] = useState<'RICHTEXT' | 'PDF' | 'YOUTUBE' | 'EXTERNAL_LINK'>('PDF');
  const [matTitle, setMatTitle] = useState('');
  const [matUrl, setMatUrl] = useState('');
  const [matText, setMatText] = useState('');
  const [editingMaterial, setEditingMaterial] = useState<LearningMaterial | null>(null);
  const [matCountdownEnabled, setMatCountdownEnabled] = useState(false);
  const [matCountdownMinutes, setMatCountdownMinutes] = useState('5');

  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignDeadline, setAssignDeadline] = useState('2026-09-11 23:59 WITA');
  const [assignAllowedFileType, setAssignAllowedFileType] = useState<'PDF' | 'IMAGE' | 'ZIP' | 'RAR' | 'ANY'>('PDF');
  const [assignSubmissionType, setAssignSubmissionType] = useState<'ASSIGNMENT' | 'REPORT' | 'POST_TEST'>('ASSIGNMENT');
  const [assignCountdownEnabled, setAssignCountdownEnabled] = useState(false);
  const [assignCountdownMinutes, setAssignCountdownMinutes] = useState('5');

  const [pdfPreview, setPdfPreview] = useState<{ isOpen: boolean; title: string; url?: string } | null>(null);

  // Filter periods of active course
  const coursePeriods = useMemo(() => {
    return periods.filter(p => p.courseId === activeCourseId);
  }, [periods, activeCourseId]);

  const activeSelectedPeriod = useMemo(() => {
    if (selectedPeriodId) {
      const found = coursePeriods.find(p => p.id === selectedPeriodId);
      if (found) return found;
    }
    const active = coursePeriods.find(p => p.status === 'ACTIVE');
    if (active) return active;
    return coursePeriods[coursePeriods.length - 1] || coursePeriods[0];
  }, [coursePeriods, selectedPeriodId]);

  // Units for selected period
  const periodUnits = useMemo(() => {
    if (!activeSelectedPeriod) return [];
    return learningUnits
      .filter(u => u.periodId === activeSelectedPeriod.id)
      .sort((a, b) => a.unitNumber - b.unitNumber);
  }, [learningUnits, activeSelectedPeriod]);

  const activeSelectedUnit = periodUnits.find(u => u.id === selectedUnitId) || periodUnits[0];

  const handleOpenProjectLink = () => {
    if (!activeSelectedPeriod) return;
    setProjectDriveUrlInput(activeSelectedPeriod.finalProjectDriveUrl || '');
    setProjectDescriptionInput(activeSelectedPeriod.finalProjectDescription || '');
    setIsProjectLinkModalOpen(true);
  };

  const handleSaveProjectLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelectedPeriod) return;
    const url = projectDriveUrlInput.trim();
    updatePeriod({
      ...activeSelectedPeriod,
      finalProjectDriveUrl: url || undefined,
      finalProjectDescription: projectDescriptionInput.trim() || undefined,
    });
    setIsProjectLinkModalOpen(false);
    showToast('Project Akhir Diperbarui', 'Link Google Drive project akhir berhasil disinkronkan.', 'success');
  };

  // Unit Form states
  const [unitTitleInput, setUnitTitleInput] = useState('');
  const [unitDescInput, setUnitDescInput] = useState('');
  const [unitCountdownEnabled, setUnitCountdownEnabled] = useState(false);
  const [unitCountdownMinutes, setUnitCountdownMinutes] = useState('5');

  const handleOpenCreateUnit = () => {
    setEditingUnit(null);
    setUnitTitleInput(`Unit ${periodUnits.length + 1}: Judul Modul Praktik`);
    setUnitDescInput('');
    setUnitCountdownEnabled(false);
    setUnitCountdownMinutes('5');
    setIsUnitModalOpen(true);
  };

  const handleOpenEditUnit = (unit: LearningUnit) => {
    setEditingUnit(unit);
    setUnitTitleInput(unit.title);
    setUnitDescInput(unit.description);
    setUnitCountdownEnabled(Boolean(unit.countdownEnabled));
    setUnitCountdownMinutes(String(Math.max(1, unit.countdownMinutes || 5)));
    setIsUnitModalOpen(true);
  };

  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelectedPeriod) return;

    if (editingUnit) {
      updateLearningUnit({
        ...editingUnit,
        title: unitTitleInput.trim(),
        description: unitDescInput.trim(),
        countdownEnabled: unitCountdownEnabled,
        countdownMinutes: unitCountdownEnabled ? Math.max(1, Number(unitCountdownMinutes) || 1) : undefined,
        countdownStartedAt: unitCountdownEnabled
          ? (editingUnit.countdownStartedAt || new Date().toISOString())
          : undefined
      });
    } else {
      createLearningUnit({
        periodId: activeSelectedPeriod.id,
        title: unitTitleInput.trim(),
        description: unitDescInput.trim(),
        materials: [],
        countdownEnabled: unitCountdownEnabled,
        countdownMinutes: unitCountdownEnabled ? Math.max(1, Number(unitCountdownMinutes) || 1) : undefined,
        countdownStartedAt: unitCountdownEnabled ? new Date().toISOString() : undefined
      });
    }
    setIsUnitModalOpen(false);
  };

  // Other periods available in the active course (excluding source period)
  const otherCoursePeriods = useMemo(() => {
    if (!activeSelectedPeriod) return [];
    return coursePeriods.filter(p => p.id !== activeSelectedPeriod.id);
  }, [coursePeriods, activeSelectedPeriod]);

  const handleOpenCopyModal = (preselectedUnit?: LearningUnit) => {
    if (!activeSelectedPeriod) return;

    if (preselectedUnit) {
      setSelectedUnitIdsToCopy([preselectedUnit.id]);
    } else {
      setSelectedUnitIdsToCopy(periodUnits.map(u => u.id));
    }

    if (otherCoursePeriods.length === 1) {
      setSelectedTargetPeriodIds([otherCoursePeriods[0].id]);
    } else {
      setSelectedTargetPeriodIds([]);
    }

    setCopyMode('APPEND');
    setIsCopyModalOpen(true);
  };

  const handleToggleUnitToCopy = (unitId: string) => {
    setSelectedUnitIdsToCopy(prev =>
      prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
    );
  };

  const handleToggleSelectAllUnits = () => {
    if (selectedUnitIdsToCopy.length === periodUnits.length) {
      setSelectedUnitIdsToCopy([]);
    } else {
      setSelectedUnitIdsToCopy(periodUnits.map(u => u.id));
    }
  };

  const handleToggleTargetPeriod = (periodId: string) => {
    setSelectedTargetPeriodIds(prev =>
      prev.includes(periodId) ? prev.filter(id => id !== periodId) : [...prev, periodId]
    );
  };

  const handleExecuteCopy = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUnitIdsToCopy.length === 0 || selectedTargetPeriodIds.length === 0) return;

    copyLearningUnits(selectedUnitIdsToCopy, selectedTargetPeriodIds, copyMode === 'REPLACE');

    const firstTarget = selectedTargetPeriodIds[0];
    setIsCopyModalOpen(false);

    if (autoRedirectAfterCopy && firstTarget) {
      setSelectedPeriodId(firstTarget);
    }
  };

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelectedUnit) return;
    if ((matType === 'PDF' || matType === 'YOUTUBE' || matType === 'EXTERNAL_LINK') && !matUrl.trim()) {
      showToast('URL Wajib Diisi', 'Masukkan URL file atau konten yang benar. PDF dummy tidak digunakan.', 'error');
      return;
    }
    if (matType === 'YOUTUBE' && !getYouTubeVideoId(matUrl)) {
      showToast('Link YouTube Tidak Valid', 'Gunakan link youtube.com/watch, youtu.be, shorts, atau embed yang benar.', 'error');
      return;
    }

    const newMat: LearningMaterial = {
      id: editingMaterial?.id || newStudioEntityId('mat'),
      unitId: activeSelectedUnit.id,
      title: matTitle.trim() || 'Materi Pembelajaran',
      type: matType,
      contentUrl: matType === 'YOUTUBE' ? (toYouTubeEmbedUrl(matUrl.trim()) || undefined) : (matUrl.trim() || undefined),
      contentText: matText.trim(),
      fileSize: editingMaterial?.fileSize,
      // Countdown access is configured once at the unit level.
      countdownEnabled: undefined,
      countdownMinutes: undefined,
      countdownStartedAt: undefined
    };

    const updatedMaterials = editingMaterial
      ? activeSelectedUnit.materials.map(material => material.id === editingMaterial.id ? newMat : material)
      : [...activeSelectedUnit.materials, newMat];
    updateLearningUnit({
      ...activeSelectedUnit,
      materials: updatedMaterials
    });

    setIsMaterialModalOpen(false);
    setMatTitle('');
    setMatUrl('');
    setMatText('');
    showToast(editingMaterial ? 'Materi Diperbarui' : 'Materi Ditambahkan', `Materi "${newMat.title}" berhasil disimpan ke Unit ${activeSelectedUnit.unitNumber}.`, 'success');
    setEditingMaterial(null);
  };

  const handleOpenEditMaterial = (material: LearningMaterial) => {
    setEditingMaterial(material);
    setMatType(material.type);
    setMatTitle(material.title);
    setMatUrl(material.contentUrl || '');
    setMatText(material.contentText || '');
    setMatCountdownEnabled(Boolean(material.countdownEnabled));
    setMatCountdownMinutes(String(Math.max(1, material.countdownMinutes || 5)));
    setIsMaterialModalOpen(true);
  };

  const handleDeleteMaterial = (matId: string) => {
    if (!activeSelectedUnit) return;
    const updated = activeSelectedUnit.materials.filter(m => m.id !== matId);
    updateLearningUnit({ ...activeSelectedUnit, materials: updated });
    showToast('Materi Dihapus', 'Materi telah dihapus dari unit.', 'info');
  };

  const handleMoveMaterial = (matId: string, direction: 'up' | 'down') => {
    if (!activeSelectedUnit) return;
    const currentIndex = activeSelectedUnit.materials.findIndex(material => material.id === matId);
    if (currentIndex < 0) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= activeSelectedUnit.materials.length) return;

    const reorderedMaterials = [...activeSelectedUnit.materials];
    const [movedMaterial] = reorderedMaterials.splice(currentIndex, 1);
    reorderedMaterials.splice(targetIndex, 0, movedMaterial);
    updateLearningUnit({ ...activeSelectedUnit, materials: reorderedMaterials });
    showToast(
      'Urutan Materi Diubah',
      `Materi "${movedMaterial.title}" dipindahkan ${direction === 'up' ? 'ke atas' : 'ke bawah'}.`,
      'success'
    );
  };

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelectedUnit || !activeSelectedPeriod) return;

    const newAssign: Assignment = {
      id: editingAssignment?.id || newStudioEntityId('assign'),
      unitId: activeSelectedUnit.id,
      periodId: activeSelectedPeriod.id,
      title: assignTitle.trim() || 'Tugas Praktik PDF',
      description: assignDesc.trim() || '',
      deadline: assignDeadline,
      maxScore: 100,
      allowedFileType: assignAllowedFileType,
      submissionType: assignSubmissionType,
      // Countdown access is configured once at the unit level.
      countdownEnabled: undefined,
      countdownMinutes: undefined,
      countdownStartedAt: undefined
    };

    updateLearningUnit({
      ...activeSelectedUnit,
      assignment: newAssign
    });

    setIsAssignmentModalOpen(false);
    setEditingAssignment(null);
    showToast(editingAssignment ? 'Tugas Diperbarui' : 'Tugas Dikonfigurasi', `Tugas PDF berhasil disimpan pada Unit ${activeSelectedUnit.unitNumber}.`, 'success');
  };

  const handleOpenEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setAssignTitle(assignment.title);
    setAssignDesc(assignment.description);
    setAssignDeadline(assignment.deadline);
    setAssignAllowedFileType(assignment.allowedFileType || 'PDF');
    setAssignSubmissionType(assignment.submissionType || 'ASSIGNMENT');
    setAssignCountdownEnabled(Boolean(assignment.countdownEnabled));
    setAssignCountdownMinutes(String(Math.max(1, assignment.countdownMinutes || 5)));
    setIsAssignmentModalOpen(true);
  };

  const handleDeleteAssignment = () => {
    if (!activeSelectedUnit) return;
    updateLearningUnit({
      ...activeSelectedUnit,
      assignment: undefined
    });
    showToast('Tugas Dihapus', 'Tugas praktik pada unit ini telah dinonaktifkan.', 'info');
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              LMS Authoring Studio
            </span>
            <span className="text-xs text-slate-400">{activeCourse?.name}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Pengelolaan Modul & Materi Praktik</h2>
          <p className="text-xs text-slate-500">
            Susun tahapan unit pembelajaran bertahap (progressive locking), sematkan video YouTube, modul PDF, instruksi teks, dan penugasan.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Pilih Periode:</span>
            <select
              value={activeSelectedPeriod?.id || ''}
              onChange={e => setSelectedPeriodId(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {coursePeriods.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => handleOpenCopyModal()}
            disabled={periodUnits.length === 0}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 font-bold text-xs rounded-xl border border-slate-300 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Salin modul dari minggu ini ke minggu lain"
          >
            <Copy className="w-4 h-4 text-blue-600" />
            <span>Salin ke Minggu Lain</span>
          </button>

          <button
            onClick={handleOpenCreateUnit}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Unit</span>
          </button>
        </div>
      </div>

      {/* Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Units List (4 cols) */}
        <div className="lg:col-span-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            <span>Daftar Unit Pembelajaran ({periodUnits.length})</span>
          </div>

          {activeSelectedPeriod && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Project Akhir
                  </div>
                  {activeSelectedPeriod.finalProjectDriveUrl ? (
                    <a
                      href={activeSelectedPeriod.finalProjectDriveUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="mt-1 block truncate text-[11px] font-semibold text-emerald-800 hover:underline"
                      title={activeSelectedPeriod.finalProjectDriveUrl}
                    >
                      Buka folder Google Drive
                    </a>
                  ) : (
                    <p className="mt-1 text-[11px] text-emerald-700">Link Drive belum diatur</p>
                  )}
                  {activeSelectedPeriod.finalProjectDescription && (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-emerald-800/80">
                      {activeSelectedPeriod.finalProjectDescription}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleOpenProjectLink}
                  className="shrink-0 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100"
                >
                  <Edit2 className="mr-1 inline-block h-3 w-3" />
                  Ubah Link
                </button>
              </div>
            </div>
          )}

          {periodUnits.map(unit => {
            const isSelected = activeSelectedUnit?.id === unit.id;
            return (
              <div
                key={unit.id}
                onClick={() => setSelectedUnitId(unit.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-500/20 text-slate-900'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Unit {unit.unitNumber}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5">{unit.title}</h4>
                    <p className="text-[11px] text-slate-500 truncate mt-1">{unit.description || 'Tidak ada deskripsi'}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCopyModal(unit);
                      }}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                      title="Salin Unit ini ke Minggu Lain"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditUnit(unit);
                      }}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                      title="Edit Unit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Hapus Unit ${unit.unitNumber}?`)) {
                          deleteLearningUnit(unit.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Hapus Unit"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{unit.materials.length} Lampiran Materi</span>
                  <div className="flex items-center gap-1.5">
                    {unit.assignment ? (
                      <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                        Tugas PDF Aktif
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Materi Saja</span>
                    )}
                    {unit.countdownEnabled && (
                      <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-[10px]">
                        Countdown Unit
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Selected Unit Detail (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {activeSelectedUnit ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">

              {/* Unit Info Header */}
              <div className="flex items-start justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                    Unit {activeSelectedUnit.unitNumber} Detail
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{activeSelectedUnit.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{activeSelectedUnit.description}</p>
                  {activeSelectedUnit.countdownEnabled && (
                    <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">
                      Countdown unit aktif · {activeSelectedUnit.countdownMinutes || 5} menit
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenCopyModal(activeSelectedUnit)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5"
                    title="Salin unit ini ke minggu lain"
                  >
                    <Copy className="w-4 h-4 text-blue-600" />
                    <span>Salin Unit Ini</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingMaterial(null);
                      setMatType('PDF');
                      setMatTitle('');
                      setMatUrl('');
                      setMatText('');
                      setMatCountdownEnabled(false);
                      setMatCountdownMinutes('5');
                      setIsMaterialModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Materi</span>
                  </button>
                </div>
              </div>

              {/* Materials List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>Lampiran Materi Pada Unit Ini ({activeSelectedUnit.materials.length})</span>
                </h4>

                <div className="space-y-3">
                  {activeSelectedUnit.materials.map(mat => (
                    <div key={mat.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 shrink-0">
                          {mat.type === 'YOUTUBE' && <PlayCircle className="w-5 h-5 text-red-600" />}
                          {mat.type === 'PDF' && <FileText className="w-5 h-5 text-red-600" />}
                          {mat.type === 'RICHTEXT' && <FileText className="w-5 h-5 text-blue-600" />}
                          {mat.type === 'EXTERNAL_LINK' && <ExternalLink className="w-5 h-5 text-emerald-600" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h5 className="text-xs font-bold text-slate-900">{mat.title}</h5>
                            {mat.countdownEnabled && (
                              <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-800">
                                Countdown {mat.countdownMinutes || 5} mnt
                              </span>
                            )}
                          </div>
                          {mat.type === 'RICHTEXT' && (
                            <p className="text-[11px] text-slate-600 line-clamp-2 mt-1">{mat.contentText}</p>
                          )}
                          {mat.type === 'YOUTUBE' && (
                            <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">{mat.contentUrl}</p>
                          )}
                          {mat.type === 'PDF' && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-slate-500 font-mono">{mat.fileSize || 'PDF Document'}</span>
                              <button
                                onClick={() => setPdfPreview({ isOpen: true, title: mat.title, url: mat.contentUrl })}
                                className="text-[11px] text-blue-600 hover:underline font-semibold"
                              >
                                Preview PDF
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <div className="flex flex-col items-center gap-0.5 mr-1">
                          <button
                            onClick={() => handleMoveMaterial(mat.id, 'up')}
                            disabled={activeSelectedUnit.materials[0]?.id === mat.id}
                            className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-25 disabled:cursor-not-allowed rounded transition-colors"
                            title="Pindahkan materi ke atas"
                            aria-label={`Pindahkan ${mat.title} ke atas`}
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveMaterial(mat.id, 'down')}
                            disabled={activeSelectedUnit.materials[activeSelectedUnit.materials.length - 1]?.id === mat.id}
                            className="p-1 text-slate-400 hover:text-blue-600 disabled:opacity-25 disabled:cursor-not-allowed rounded transition-colors"
                            title="Pindahkan materi ke bawah"
                            aria-label={`Pindahkan ${mat.title} ke bawah`}
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => handleOpenEditMaterial(mat)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors"
                          title="Edit Materi"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteMaterial(mat.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Hapus Materi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {activeSelectedUnit.materials.length === 0 && (
                    <p className="text-xs text-slate-400 p-4 border border-dashed rounded-xl text-center">
                      Belum ada lampiran materi pada unit ini. Klik "Tambah Materi" di atas.
                    </p>
                  )}
                </div>
              </div>

              {/* Assignment Box */}
              <div className="pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <span>Tugas Praktik Mahasiswa (Pengumpulan File)</span>
                  </h4>
                  {!activeSelectedUnit.assignment && (
                    <button
                      onClick={() => {
                        setEditingAssignment(null);
                        setAssignTitle(`Tugas Unit ${activeSelectedUnit.unitNumber}: Judul Laporan`);
                        setAssignDesc('Upload dokumen tugas sesuai format yang diizinkan (Maks. 25 MB).');
                        setAssignAllowedFileType('PDF');
                        setAssignSubmissionType('REPORT');
                        setAssignCountdownEnabled(false);
                        setAssignCountdownMinutes('5');
                        setIsAssignmentModalOpen(true);
                      }}
                      className="px-3 py-1 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-bold border border-amber-200 transition-colors"
                    >
                      + Buat Tugas Pada Unit Ini
                    </button>
                  )}
                </div>

                {activeSelectedUnit.assignment ? (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs font-bold text-amber-950">{activeSelectedUnit.assignment.title}</h5>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-200 text-amber-900 rounded">
                            {activeSelectedUnit.assignment.allowedFileType === 'ANY'
                              ? 'Semua File'
                              : activeSelectedUnit.assignment.allowedFileType === 'IMAGE'
                                ? 'IMAGE'
                                : `${activeSelectedUnit.assignment.allowedFileType} Only`}
                          </span>
                          {activeSelectedUnit.assignment.countdownEnabled && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-800 rounded">
                              Countdown {activeSelectedUnit.assignment.countdownMinutes || 5} mnt
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-amber-800 mt-1 leading-relaxed">{activeSelectedUnit.assignment.description}</p>
                        <p className="text-[11px] text-amber-700 font-mono mt-2">
                          Tenggat: {formatDeadline(activeSelectedUnit.assignment.deadline)} • Bobot: {activeSelectedUnit.assignment.maxScore} Poin
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditAssignment(activeSelectedUnit.assignment!)}
                          className="p-1.5 text-amber-600 hover:text-blue-600 rounded transition-colors"
                          title="Edit Tugas"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={handleDeleteAssignment}
                          className="p-1.5 text-amber-600 hover:text-rose-600 rounded transition-colors"
                          title="Hapus Tugas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 p-4 border border-dashed rounded-xl text-center">
                    Tidak ada tugas yang diwajibkan pada unit ini. Mahasiswa cukup menandai selesai untuk melanjutkan.
                  </p>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
              <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p>Pilih unit pembelajaran di sebelah kiri untuk melihat dan menyusun materi.</p>
            </div>
          )}
        </div>

      </div>

      {/* Modal Add/Edit Unit */}
      {isProjectLinkModalOpen && activeSelectedPeriod && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 p-6 text-white">
                <div>
                  <h3 className="text-base font-bold">Link Project Akhir</h3>
                  <p className="mt-1 text-[11px] text-slate-300">{activeSelectedPeriod.name}</p>
                </div>
                <button type="button" onClick={() => setIsProjectLinkModalOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSaveProjectLink} className="space-y-4 p-6">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Link Google Drive</label>
                  <input
                    type="url"
                    value={projectDriveUrlInput}
                    onChange={e => setProjectDriveUrlInput(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1.5 text-[11px] text-slate-500">Kosongkan jika project akhir belum memiliki folder Drive.</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-700">Deskripsi Project Akhir</label>
                  <textarea
                    rows={4}
                    value={projectDescriptionInput}
                    onChange={e => setProjectDescriptionInput(e.target.value)}
                    placeholder="Jelaskan project akhir, format berkas, dan instruksi pengumpulan..."
                    className="w-full resize-y rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsProjectLinkModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Batal</button>
                  <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500">Simpan Link</button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {isUnitModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                {editingUnit ? 'Edit Unit Pembelajaran' : 'Tambah Unit Pembelajaran'}
              </h3>
              <button onClick={() => setIsUnitModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Judul Unit Pembelajaran *
                </label>
                <input
                  type="text"
                  value={unitTitleInput}
                  onChange={e => setUnitTitleInput(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Deskripsi & Sasaran Pembelajaran
                </label>
                <textarea
                  rows={3}
                  value={unitDescInput}
                  onChange={e => setUnitDescInput(e.target.value)}
                  placeholder="Jelaskan instruksi atau kompetensi yang harus dicapai mahasiswa..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                ></textarea>
              </div>

              <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={unitCountdownEnabled}
                    onChange={e => setUnitCountdownEnabled(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>
                    <span className="block text-xs font-bold text-indigo-950">Aktifkan countdown akses unit</span>
                    <span className="block text-[10px] leading-relaxed text-indigo-700 mt-0.5">Seluruh materi dan tugas pada unit ini disembunyikan sampai countdown selesai.</span>
                  </span>
                </label>
                {unitCountdownEnabled && (
                  <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                    Durasi countdown (menit)
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={unitCountdownMinutes}
                      onChange={e => setUnitCountdownMinutes(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </label>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30"
                >
                  Simpan Unit
                </button>
              </div>
            </form>
          </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal Add Material */}
      {isMaterialModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-base font-bold text-white">{editingMaterial ? 'Edit Lampiran Materi' : 'Tambah Lampiran Materi'}</h3>
              <button onClick={() => setIsMaterialModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMaterial} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Tipe Materi
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setMatType('PDF')}
                    className={`p-2.5 rounded-xl border text-center font-bold ${
                      matType === 'PDF' ? 'bg-blue-50 border-blue-600 text-blue-900' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    Dokumen PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatType('YOUTUBE')}
                    className={`p-2.5 rounded-xl border text-center font-bold ${
                      matType === 'YOUTUBE' ? 'bg-red-50 border-red-600 text-red-900' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    YouTube Video
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatType('RICHTEXT')}
                    className={`p-2.5 rounded-xl border text-center font-bold ${
                      matType === 'RICHTEXT' ? 'bg-emerald-50 border-emerald-600 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    Teks Instruksi
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatType('EXTERNAL_LINK')}
                    className={`p-2.5 rounded-xl border text-center font-bold ${
                      matType === 'EXTERNAL_LINK' ? 'bg-purple-50 border-purple-600 text-purple-900' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    Link Eksternal
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Judul Materi *
                </label>
                <input
                  type="text"
                  value={matTitle}
                  onChange={e => setMatTitle(e.target.value)}
                  placeholder="Contoh: Modul SOP K3 CNC Milling"
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {(matType === 'PDF' || matType === 'YOUTUBE' || matType === 'EXTERNAL_LINK') && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    URL Konten (Embed link / URL file)
                  </label>
                  <input
                    type="url"
                    value={matUrl}
                    onChange={e => setMatUrl(e.target.value)}
                    placeholder={matType === 'YOUTUBE' ? 'https://www.youtube.com/watch?v=... atau https://youtu.be/...' : 'https://...'}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              )}

              {(matType === 'RICHTEXT' || matType === 'YOUTUBE') && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Catatan / Teks Instruksi
                  </label>
                  <textarea
                    rows={3}
                    value={matText}
                    onChange={e => setMatText(e.target.value)}
                    placeholder="Instruksi langkah kerja..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  ></textarea>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMaterialModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30"
                >
                  {editingMaterial ? 'Simpan Perubahan' : 'Simpan Materi'}
                </button>
              </div>
            </form>
          </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal Add Assignment */}
      {isAssignmentModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-base font-bold text-white">{editingAssignment ? 'Edit Tugas Praktik' : 'Konfigurasi Tugas Praktik'}</h3>
              <button onClick={() => setIsAssignmentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Judul Tugas *
                </label>
                <input
                  type="text"
                  value={assignTitle}
                  onChange={e => setAssignTitle(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Jenis Berkas Pengumpulan
                </label>
                <select
                  value={assignSubmissionType}
                  onChange={e => setAssignSubmissionType(e.target.value as 'ASSIGNMENT' | 'REPORT' | 'POST_TEST')}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="ASSIGNMENT">Tugas Modul</option>
                  <option value="REPORT">Laporan Praktik</option>
                  <option value="POST_TEST">Post-Test</option>
                </select>
                <p className="mt-1 text-[10px] text-slate-500">Jenis ini menentukan kategori berkas mahasiswa saat ditampilkan kepada instruktur.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Format File yang Diizinkan
                </label>
                <select
                  value={assignAllowedFileType}
                  onChange={e => setAssignAllowedFileType(e.target.value as 'PDF' | 'IMAGE' | 'ZIP' | 'RAR' | 'ANY')}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="PDF">PDF (.pdf)</option>
                  <option value="IMAGE">Gambar (.jpg, .png, .webp, .gif)</option>
                  <option value="ZIP">Arsip ZIP (.zip)</option>
                  <option value="RAR">Arsip RAR (.rar)</option>
                  <option value="ANY">Semua jenis file</option>
                </select>
                <p className="mt-1 text-[10px] text-slate-500">Mahasiswa hanya dapat mengunggah format yang dipilih (maksimal 25 MB).</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Deskripsi & Petunjuk Pengerjaan
                </label>
                <textarea
                  rows={3}
                  value={assignDesc}
                  onChange={e => setAssignDesc(e.target.value)}
                  placeholder="Jelaskan format yang harus diisi di PDF..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Batas Waktu Pengumpulan (Deadline)
                </label>
                <input
                  type="datetime-local"
                  value={toDateTimeLocalWita(assignDeadline)}
                  onChange={e => setAssignDeadline(fromDateTimeLocalWita(e.target.value))}
                  step="60"
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="mt-1.5 text-[10px] text-slate-500">Pilih tanggal dan jam pada kalender. Waktu disimpan sebagai WITA (UTC+8).</p>
                {assignDeadline && (
                  <p className="mt-1 text-[10px] font-semibold text-blue-700">Tersimpan: {formatDeadline(assignDeadline)}</p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignmentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/30"
                >
                  {editingAssignment ? 'Simpan Perubahan' : 'Simpan Tugas'}
                </button>
              </div>
            </form>
          </div>
          </div>
        </ModalPortal>
      )}

      {/* PDF Viewer Modal */}
      {pdfPreview && (
        <ModalPortal>
          <PDFViewerModal
            isOpen={pdfPreview.isOpen}
            onClose={() => setPdfPreview(null)}
            title={pdfPreview.title}
            fileUrl={pdfPreview.url}
          />
        </ModalPortal>
      )}

      {/* Modal Copy ke Minggu Lain */}
      {isCopyModalOpen && activeSelectedPeriod && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]">

              {/* Header */}
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                    <Copy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Salin Modul ke Minggu Lain
                    </h3>
                    <p className="text-xs text-slate-400">
                      Sumber: <span className="text-blue-400 font-semibold">{activeSelectedPeriod.name}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCopyModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleExecuteCopy} className="p-6 overflow-y-auto space-y-6 flex-1">

                {/* Step 1: Modul Sumber */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 inline-flex items-center justify-center text-[10px] font-bold">1</span>
                      <span>Pilih Modul yang Ingin Disalin</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleToggleSelectAllUnits}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {selectedUnitIdsToCopy.length === periodUnits.length
                        ? 'Batalkan Semua'
                        : `Pilih Semua (${periodUnits.length} Modul)`}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1 border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                    {periodUnits.map(u => {
                      const isChecked = selectedUnitIdsToCopy.includes(u.id);
                      return (
                        <div
                          key={u.id}
                          onClick={() => handleToggleUnitToCopy(u.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isChecked
                              ? 'bg-blue-50/90 border-blue-400 shadow-sm text-slate-900'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {}}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 pointer-events-none"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  Unit {u.unitNumber}
                                </span>
                                <h4 className="text-xs font-bold text-slate-900 truncate">{u.title}</h4>
                              </div>
                              {u.description && (
                                <p className="text-[11px] text-slate-500 truncate mt-0.5">{u.description}</p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                              {u.materials.length} Materi
                            </span>
                            {u.assignment && (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                                Tugas PDF
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {periodUnits.length === 0 && (
                      <div className="p-4 text-center text-xs text-slate-400">
                        Tidak ada modul pada minggu ini untuk disalin.
                      </div>
                    )}
                  </div>
                </div>

                {/* Step 2: Minggu / Periode Tujuan */}
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 inline-flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Pilih Minggu / Periode Tujuan</span>
                  </label>

                  {otherCoursePeriods.length === 0 ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-bold">Belum ada minggu / periode lain di mata kuliah ini.</p>
                        <p className="text-amber-700 mt-1">
                          Tambahkan periode praktik baru terlebih dahulu melalui menu <strong>Kelola Periode & Jadwal</strong> agar dapat menyalin modul ke minggu tersebut.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {otherCoursePeriods.map(targetPeriod => {
                        const isChecked = selectedTargetPeriodIds.includes(targetPeriod.id);
                        const targetUnitsCount = learningUnits.filter(u => u.periodId === targetPeriod.id).length;

                        return (
                          <div
                            key={targetPeriod.id}
                            onClick={() => handleToggleTargetPeriod(targetPeriod.id)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isChecked
                                ? 'bg-blue-50/90 border-blue-500 shadow-sm ring-1 ring-blue-500/30'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 pointer-events-none"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-bold text-slate-900">{targetPeriod.name}</h4>
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      targetPeriod.status === 'ACTIVE'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : targetPeriod.status === 'COMPLETED'
                                        ? 'bg-slate-100 text-slate-600'
                                        : 'bg-blue-100 text-blue-800'
                                    }`}
                                  >
                                    {targetPeriod.status === 'ACTIVE'
                                      ? 'Sedang Aktif'
                                      : targetPeriod.status === 'COMPLETED'
                                      ? 'Selesai'
                                      : 'Mendatang'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Jadwal: {targetPeriod.startDate} s/d {targetPeriod.endDate}
                                </p>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                  targetUnitsCount === 0
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {targetUnitsCount === 0 ? 'Masih Kosong' : `${targetUnitsCount} Modul Ada`}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Step 3: Opsi Penanganan Unit yang Sudah Ada */}
                {otherCoursePeriods.length > 0 && (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2.5">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 inline-flex items-center justify-center text-[10px] font-bold">3</span>
                      <span>Metode Penempatan Modul</span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setCopyMode('APPEND')}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          copyMode === 'APPEND'
                            ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="copyMode"
                            checked={copyMode === 'APPEND'}
                            onChange={() => setCopyMode('APPEND')}
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-bold text-slate-900">Tambahkan (Append)</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 pl-5 leading-relaxed">
                          Modul akan ditambahkan melanjutkan urutan unit modul yang sudah ada tanpa menghapus modul sebelumnya.
                        </p>
                      </div>

                      <div
                        onClick={() => setCopyMode('REPLACE')}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          copyMode === 'REPLACE'
                            ? 'bg-rose-50/80 border-rose-500 ring-2 ring-rose-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="copyMode"
                            checked={copyMode === 'REPLACE'}
                            onChange={() => setCopyMode('REPLACE')}
                            className="text-rose-600 focus:ring-rose-500"
                          />
                          <span className="text-xs font-bold text-rose-900">Gantikan (Replace / Timpa)</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 pl-5 leading-relaxed">
                          Hapus seluruh modul lama yang ada di minggu tujuan dan gantikan persis dengan modul yang disalin.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Redirect checkbox & Summary */}
                {otherCoursePeriods.length > 0 && (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoRedirectAfterCopy}
                        onChange={e => setAutoRedirectAfterCopy(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                      />
                      <span className="text-xs font-semibold text-slate-800">
                        Buka otomatis periode/minggu tujuan setelah selesai disalin
                      </span>
                    </label>

                    <div className="text-[11px] text-slate-600 flex items-center gap-2 pt-2 border-t border-slate-200">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        Akan menyalin <strong>{selectedUnitIdsToCopy.length} modul</strong> ke{' '}
                        <strong>{selectedTargetPeriodIds.length} minggu tujuan</strong>. Semua file PDF, link video, teks materi, dan instruksi penugasan akan terduplikasi secara independen.
                      </span>
                    </div>
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCopyModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={
                      otherCoursePeriods.length === 0 ||
                      selectedUnitIdsToCopy.length === 0 ||
                      selectedTargetPeriodIds.length === 0
                    }
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30 transition-all flex items-center gap-1.5"
                  >
                    <Copy className="w-4 h-4" />
                    <span>
                      Salin {selectedUnitIdsToCopy.length} Modul Sekarang
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

    </div>
  );
};
