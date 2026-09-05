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
  Sparkles
} from 'lucide-react';
import { PDFViewerModal } from '../common/PDFViewerModal';
import { ModalPortal } from '../common/ModalPortal';

export const LearningContentStudio: React.FC = () => {
  const {
    activeCourseId,
    activeCourse,
    periods,
    learningUnits,
    createLearningUnit,
    updateLearningUnit,
    deleteLearningUnit,
    showToast
  } = useApp();

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  
  // Modals
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<LearningUnit | null>(null);
  
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [matType, setMatType] = useState<'RICHTEXT' | 'PDF' | 'YOUTUBE' | 'EXTERNAL_LINK'>('PDF');
  const [matTitle, setMatTitle] = useState('');
  const [matUrl, setMatUrl] = useState('');
  const [matText, setMatText] = useState('');

  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignDeadline, setAssignDeadline] = useState('2026-09-11 23:59 WITA');

  const [pdfPreview, setPdfPreview] = useState<{ isOpen: boolean; title: string; url?: string } | null>(null);

  // Filter periods of active course
  const coursePeriods = useMemo(() => {
    return periods.filter(p => p.courseId === activeCourseId);
  }, [periods, activeCourseId]);

  const activeSelectedPeriod = coursePeriods.find(p => p.id === selectedPeriodId) || coursePeriods[0];

  // Units for selected period
  const periodUnits = useMemo(() => {
    if (!activeSelectedPeriod) return [];
    return learningUnits
      .filter(u => u.periodId === activeSelectedPeriod.id)
      .sort((a, b) => a.unitNumber - b.unitNumber);
  }, [learningUnits, activeSelectedPeriod]);

  const activeSelectedUnit = periodUnits.find(u => u.id === selectedUnitId) || periodUnits[0];

  // Unit Form states
  const [unitTitleInput, setUnitTitleInput] = useState('');
  const [unitDescInput, setUnitDescInput] = useState('');

  const handleOpenCreateUnit = () => {
    setEditingUnit(null);
    setUnitTitleInput(`Unit ${periodUnits.length + 1}: Judul Modul Praktik`);
    setUnitDescInput('');
    setIsUnitModalOpen(true);
  };

  const handleOpenEditUnit = (unit: LearningUnit) => {
    setEditingUnit(unit);
    setUnitTitleInput(unit.title);
    setUnitDescInput(unit.description);
    setIsUnitModalOpen(true);
  };

  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelectedPeriod) return;

    if (editingUnit) {
      updateLearningUnit({
        ...editingUnit,
        title: unitTitleInput.trim(),
        description: unitDescInput.trim()
      });
    } else {
      createLearningUnit({
        periodId: activeSelectedPeriod.id,
        title: unitTitleInput.trim(),
        description: unitDescInput.trim(),
        materials: []
      });
    }
    setIsUnitModalOpen(false);
  };

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelectedUnit) return;

    const newMat: LearningMaterial = {
      id: `mat-${Date.now()}`,
      unitId: activeSelectedUnit.id,
      title: matTitle.trim() || 'Materi Pembelajaran',
      type: matType,
      contentUrl: matUrl.trim() || (matType === 'PDF' ? 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' : undefined),
      contentText: matText.trim(),
      fileSize: matType === 'PDF' ? '2.4 MB' : undefined
    };

    const updatedMaterials = [...activeSelectedUnit.materials, newMat];
    updateLearningUnit({
      ...activeSelectedUnit,
      materials: updatedMaterials
    });

    setIsMaterialModalOpen(false);
    setMatTitle('');
    setMatUrl('');
    setMatText('');
    showToast('Materi Ditambahkan', `Materi "${newMat.title}" berhasil disimpan ke Unit ${activeSelectedUnit.unitNumber}.`, 'success');
  };

  const handleDeleteMaterial = (matId: string) => {
    if (!activeSelectedUnit) return;
    const updated = activeSelectedUnit.materials.filter(m => m.id !== matId);
    updateLearningUnit({ ...activeSelectedUnit, materials: updated });
    showToast('Materi Dihapus', 'Materi telah dihapus dari unit.', 'info');
  };

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelectedUnit || !activeSelectedPeriod) return;

    const newAssign: Assignment = {
      id: `assign-${Date.now()}`,
      unitId: activeSelectedUnit.id,
      periodId: activeSelectedPeriod.id,
      title: assignTitle.trim() || 'Tugas Praktik PDF',
      description: assignDesc.trim() || '',
      deadline: assignDeadline,
      maxScore: 100,
      allowedFileType: 'PDF'
    };

    updateLearningUnit({
      ...activeSelectedUnit,
      assignment: newAssign
    });

    setIsAssignmentModalOpen(false);
    showToast('Tugas Dikonfigurasi', `Tugas PDF berhasil diaktifkan pada Unit ${activeSelectedUnit.unitNumber}.`, 'success');
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
                  {unit.assignment ? (
                    <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                      Tugas PDF Aktif
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[10px]">Materi Saja</span>
                  )}
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
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setMatTitle('');
                      setMatUrl('');
                      setMatText('');
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
                          <h5 className="text-xs font-bold text-slate-900">{mat.title}</h5>
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

                      <button
                        onClick={() => handleDeleteMaterial(mat.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                        title="Hapus Materi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                    <span>Tugas Praktik Mahasiswa (Internal PDF Submission)</span>
                  </h4>
                  {!activeSelectedUnit.assignment && (
                    <button
                      onClick={() => {
                        setAssignTitle(`Tugas Unit ${activeSelectedUnit.unitNumber}: Judul Laporan`);
                        setAssignDesc('Upload dokumen laporan pengujian dalam format PDF (Maks. 25 MB).');
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
                            PDF Only
                          </span>
                        </div>
                        <p className="text-xs text-amber-800 mt-1 leading-relaxed">{activeSelectedUnit.assignment.description}</p>
                        <p className="text-[11px] text-amber-700 font-mono mt-2">
                          Deadline: {activeSelectedUnit.assignment.deadline} • Bobot: {activeSelectedUnit.assignment.maxScore} Poin
                        </p>
                      </div>

                      <button
                        onClick={handleDeleteAssignment}
                        className="p-1.5 text-amber-600 hover:text-rose-600 rounded transition-colors"
                        title="Hapus Tugas"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
              <h3 className="text-base font-bold text-white">Tambah Lampiran Materi</h3>
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
                    placeholder={matType === 'YOUTUBE' ? 'https://www.youtube.com/embed/...' : 'https://...'}
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
                  Simpan Materi
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
              <h3 className="text-base font-bold text-white">Konfigurasi Tugas Praktik (PDF)</h3>
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
                  type="text"
                  value={assignDeadline}
                  onChange={e => setAssignDeadline(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
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
                  Simpan Tugas
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

    </div>
  );
};
