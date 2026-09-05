// Practice Period Manager with Auto 5-Day Calculation & Bulk NIM Enrollment (PRD Section 21-27)

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PracticePeriod, Student } from '../../types';
import {
  Calendar,
  Plus,
  Copy,
  Users,
  UserPlus,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  X,
  Sparkles,
  Link,
  Search,
  Edit3,
  Zap,
  Check,
  RotateCcw
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { ModalPortal } from '../common/ModalPortal';
import { computePeriodEndDate, formatPeriodRange, getWitaDateString, computePeriodStatus } from '../../utils/dateUtils';

export const PracticePeriodManager: React.FC = () => {
  const {
    activeCourseId,
    activeCourse,
    periods,
    participants,
    students,
    createPeriod,
    duplicatePeriod,
    updatePeriod,
    deletePeriod,
    addParticipantsBulk,
    removeParticipant,
    showToast
  } = useApp();

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkNimModalOpen, setIsBulkNimModalOpen] = useState(false);

  // Period Form states (Create)
  const [startDateInput, setStartDateInput] = useState<string>(getWitaDateString());
  const [periodNameInput, setPeriodNameInput] = useState<string>('');
  const [driveUrlInput, setDriveUrlInput] = useState<string>('https://drive.google.com/drive/folders/poliwako-sample');

  // Edit Period Form states
  const [editNameInput, setEditNameInput] = useState<string>('');
  const [editStartDateInput, setEditStartDateInput] = useState<string>('');
  const [editEndDateInput, setEditEndDateInput] = useState<string>('');
  const [editStatusInput, setEditStatusInput] = useState<'UPCOMING' | 'ACTIVE' | 'COMPLETED'>('UPCOMING');
  const [editDriveUrlInput, setEditDriveUrlInput] = useState<string>('');
  const [autoCalculateEndDate, setAutoCalculateEndDate] = useState<boolean>(true);

  // Bulk NIM states (PRD Section 27)
  const [rawNimText, setRawNimText] = useState<string>('');
  const [bulkPreview, setBulkPreview] = useState<{
    valid: { student: Student; nim: string }[];
    alreadyEnrolled: { student: Student; nim: string }[];
    duplicates: string[];
    notFound: string[];
    // Tokens that matched multiple students (suffix ambiguous) - key = token, value = candidates
    ambiguous: { token: string; candidates: Student[] }[];
  }>({ valid: [], alreadyEnrolled: [], duplicates: [], notFound: [], ambiguous: [] });

  // Track disambiguated choices: token -> chosen student id (plain object, not Map)
  const [ambiguousResolved, setAmbiguousResolved] = useState<Record<string, string>>({});


  // Filter periods by active course
  const coursePeriods = useMemo(() => {
    return periods.filter(p => p.courseId === activeCourseId);
  }, [periods, activeCourseId]);

  const activeSelectedPeriod = coursePeriods.find(p => p.id === selectedPeriodId) || coursePeriods[0];

  // Participants of selected period
  const periodParticipants = useMemo(() => {
    if (!activeSelectedPeriod) return [];
    return participants.filter(p => p.periodId === activeSelectedPeriod.id);
  }, [participants, activeSelectedPeriod]);

  // Handle start date change with auto +5 days computation (PRD Section 22 & 95)
  const calculatedEndDate = useMemo(() => {
    return computePeriodEndDate(startDateInput, 5);
  }, [startDateInput]);

  // Smart create modal: calculate next Monday from the latest existing period
  const handleOpenCreatePeriod = () => {
    const nextNum = coursePeriods.length + 1;
    let suggestedStartDate = getWitaDateString();

    if (coursePeriods.length > 0) {
      // Find latest period by endDate
      const sorted = [...coursePeriods].sort((a, b) => b.endDate.localeCompare(a.endDate));
      const latestPeriod = sorted[0];
      if (latestPeriod && latestPeriod.endDate) {
        const [y, m, d] = latestPeriod.endDate.split('-').map(Number);
        const lastDate = new Date(Date.UTC(y, m - 1, d));
        const dayOfWeek = lastDate.getUTCDay(); // 5 = Friday
        
        let daysToAdd = 1;
        if (dayOfWeek === 5) daysToAdd = 3; // Friday -> Monday
        else if (dayOfWeek === 6) daysToAdd = 2; // Saturday -> Monday
        else if (dayOfWeek === 0) daysToAdd = 1; // Sunday -> Monday
        else daysToAdd = 3; // Default advance
        
        lastDate.setUTCDate(lastDate.getUTCDate() + daysToAdd);
        const ny = lastDate.getUTCFullYear();
        const nm = String(lastDate.getUTCMonth() + 1).padStart(2, '0');
        const nd = String(lastDate.getUTCDate()).padStart(2, '0');
        suggestedStartDate = `${ny}-${nm}-${nd}`;
      }
    }

    setStartDateInput(suggestedStartDate);
    setPeriodNameInput(`Minggu Praktik ke-${nextNum}`);
    setDriveUrlInput('https://drive.google.com/drive/folders/poliwako-sample');
    setIsCreateModalOpen(true);
  };

  const handleSaveNewPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    const newPeriod = createPeriod({
      courseId: activeCourseId,
      name: periodNameInput || `Minggu Praktik ke-${coursePeriods.length + 1}`,
      startDate: startDateInput,
      endDate: calculatedEndDate,
      finalProjectDriveUrl: driveUrlInput
    });
    if (newPeriod) {
      setSelectedPeriodId(newPeriod.id);
    }
    setIsCreateModalOpen(false);
  };

  // Open Edit Period Modal
  const handleOpenEditPeriod = (periodToEdit?: PracticePeriod) => {
    const target = periodToEdit || activeSelectedPeriod;
    if (!target) return;
    setEditNameInput(target.name);
    setEditStartDateInput(target.startDate);
    setEditEndDateInput(target.endDate);
    setEditStatusInput(target.status);
    setEditDriveUrlInput(target.finalProjectDriveUrl || '');
    setAutoCalculateEndDate(true);
    setIsEditModalOpen(true);
  };

  // Save changes from Edit Period Modal
  const handleSaveEditPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelectedPeriod) return;
    const finalEndDate = autoCalculateEndDate
      ? computePeriodEndDate(editStartDateInput, 5)
      : (editEndDateInput || computePeriodEndDate(editStartDateInput, 5));

    const updated: PracticePeriod = {
      ...activeSelectedPeriod,
      name: editNameInput.trim() || activeSelectedPeriod.name,
      startDate: editStartDateInput,
      endDate: finalEndDate,
      status: editStatusInput,
      finalProjectDriveUrl: editDriveUrlInput
    };
    updatePeriod(updated);
    setIsEditModalOpen(false);
  };

  // Quick activate period
  const handleMakePeriodActive = (period: PracticePeriod) => {
    updatePeriod({
      ...period,
      status: 'ACTIVE'
    });
  };

  // Delete period with confirmation
  const handleDeletePeriod = (period: PracticePeriod) => {
    if (coursePeriods.length <= 1) {
      showToast('Tidak Dapat Dihapus', 'Minimal harus ada 1 periode praktik untuk mata kuliah ini.', 'warning');
      return;
    }
    if (confirm(`Yakin ingin menghapus "${period.name}"? Data kehadiran dan nilai mahasiswa pada periode ini akan dihapus.`)) {
      deletePeriod(period.id);
      const remaining = coursePeriods.filter(p => p.id !== period.id);
      if (remaining.length > 0) {
        setSelectedPeriodId(remaining[0].id);
      }
    }
  };

  // Bulk NIM live lookup & validation (PRD Section 27 & 96)
  // Supports: full NIM exact match OR 3-digit suffix match (ambiguous if multiple angkatan)
  const handleProcessRawNims = (text: string) => {
    setRawNimText(text);
    if (!activeSelectedPeriod) return;

    // Split by newline, comma, tab, or space
    const tokens = text.split(/[\r\n,\t\s]+/).map(t => t.trim()).filter(Boolean);
    const existingEnrolledIds = new Set(periodParticipants.map(p => p.studentId));

    const valid: { student: Student; nim: string }[] = [];
    const alreadyEnrolled: { student: Student; nim: string }[] = [];
    const duplicates: string[] = [];
    const notFound: string[] = [];
    const ambiguous: { token: string; candidates: Student[] }[] = [];
    const seenInInput = new Set<string>();

    for (const token of tokens) {
      const tokenKey = token.toLowerCase();
      if (seenInInput.has(tokenKey)) {
        duplicates.push(token);
        continue;
      }
      seenInInput.add(tokenKey);

      // 1. Try exact match first
      const exactMatch = students.find(s => s.nim.toLowerCase() === tokenKey);
      if (exactMatch) {
        if (existingEnrolledIds.has(exactMatch.id)) {
          alreadyEnrolled.push({ student: exactMatch, nim: token });
        } else {
          valid.push({ student: exactMatch, nim: token });
        }
        continue;
      }

      // 2. If token is 1-5 digits, try suffix match (last N digits of NIM)
      if (/^\d{1,5}$/.test(token)) {
        const suffixLen = token.length;
        const suffixMatches = students.filter(s => {
          const nimClean = s.nim.replace(/\D/g, '');
          return nimClean.slice(-suffixLen) === token.replace(/\D/g, '');
        });

        if (suffixMatches.length === 0) {
          notFound.push(token);
        } else if (suffixMatches.length === 1) {
          // Unique suffix match — treat as resolved
          const only = suffixMatches[0];
          if (existingEnrolledIds.has(only.id)) {
            alreadyEnrolled.push({ student: only, nim: only.nim });
          } else {
            valid.push({ student: only, nim: only.nim });
          }
        } else {
          // Multiple candidates (beda angkatan) — needs disambiguation
          ambiguous.push({ token, candidates: suffixMatches });
        }
        continue;
      }

      // 3. Not found
      notFound.push(token);
    }

    // Re-apply any already-resolved ambiguous entries from previous selections
    setAmbiguousResolved(prev => {
      const next: Record<string, string> = {};
      // Only keep resolved tokens that still appear in ambiguous list
      for (const key of Object.keys(prev)) {
        if (ambiguous.find(a => a.token === key)) {
          next[key] = prev[key];
        }
      }
      return next;
    });

    setBulkPreview({ valid, alreadyEnrolled, duplicates, notFound, ambiguous });
  };

  // When instructor clicks a candidate for an ambiguous token
  const handleSelectAmbiguousStudent = (token: string, chosenStudent: Student) => {
    setAmbiguousResolved(prev => ({ ...prev, [token]: chosenStudent.id }));
  };

  const handleCommitBulkEnrollment = () => {
    if (!activeSelectedPeriod) return;

    // Collect NIMs from valid list
    const nimsFromValid = bulkPreview.valid.map(v => v.nim);

    // Collect NIMs from resolved ambiguous picks
    const existingEnrolledIds = new Set(periodParticipants.map(p => p.studentId));
    const nimsFromAmbiguous: string[] = [];
    for (const [token, chosenId] of Object.entries(ambiguousResolved)) {
      const student = students.find(s => s.id === chosenId);
      if (student && !existingEnrolledIds.has(student.id)) {
        nimsFromAmbiguous.push(student.nim);
      }
    }

    const nimsToAdd = [...nimsFromValid, ...nimsFromAmbiguous];
    const unresolvedCount = bulkPreview.ambiguous.filter(a => !(a.token in ambiguousResolved)).length;

    if (nimsToAdd.length === 0 && unresolvedCount > 0) {
      showToast('Pilih Mahasiswa', `${unresolvedCount} entri belum dipilih angkatannya. Klik salah satu nama untuk memilih.`, 'warning');
      return;
    }
    if (nimsToAdd.length === 0) {
      showToast('Tidak Ada Peserta', 'Tidak ada NIM valid untuk ditambahkan.', 'warning');
      return;
    }

    addParticipantsBulk(activeSelectedPeriod.id, nimsToAdd);
    setIsBulkNimModalOpen(false);
    setRawNimText('');
    setAmbiguousResolved({});
    setBulkPreview({ valid: [], alreadyEnrolled: [], duplicates: [], notFound: [], ambiguous: [] });
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Manajemen Periode
            </span>
            <span className="text-xs text-slate-400">{activeCourse?.name}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Periode Praktik & Peserta Mahasiswa</h2>
          <p className="text-xs text-slate-500">
            Satu mata kuliah dapat memiliki banyak gelombang periode praktik (default durasi 5 hari kerja WITA).
          </p>
        </div>

        <button
          onClick={handleOpenCreatePeriod}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Periode Baru</span>
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Period List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            <span>Daftar Gelombang Periode ({coursePeriods.length})</span>
          </div>

          <div className="space-y-2.5">
            {coursePeriods.map(period => {
              const isSelected = activeSelectedPeriod?.id === period.id;
              const pCount = participants.filter(p => p.periodId === period.id).length;

              return (
                <div
                  key={period.id}
                  onClick={() => setSelectedPeriodId(period.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-500/20 text-slate-900'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold leading-tight truncate">{period.name}</h4>
                      <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatPeriodRange(period.startDate, period.endDate)}</span>
                      </p>
                    </div>
                    <div className="shrink-0">
                      <Badge status={period.status} size="sm" />
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">{pCount} Mahasiswa Peserta</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPeriodId(period.id);
                          handleOpenEditPeriod(period);
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 p-0.5 cursor-pointer"
                        title="Ubah tanggal atau detail periode ini"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Ubah</span>
                      </button>
                      {isSelected && <span className="text-blue-600 font-bold">• Terpilih</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Period Details & Participant Enrollment (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {activeSelectedPeriod ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              
              {/* Period Header & Quick Actions */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 truncate">{activeSelectedPeriod.name}</h3>
                    <Badge status={activeSelectedPeriod.status} size="sm" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>Durasi: <strong className="text-slate-800 font-semibold">{formatPeriodRange(activeSelectedPeriod.startDate, activeSelectedPeriod.endDate)}</strong> (WITA)</span>
                    <span className="text-slate-300">•</span>
                    <span>{periodParticipants.length} Peserta Terdaftar</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleOpenEditPeriod(activeSelectedPeriod)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 border border-slate-300/80 cursor-pointer shadow-xs"
                    title="Ubah tanggal mulai, tanggal selesai, atau nama periode ini"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Ubah Tanggal / Detail</span>
                  </button>

                  {activeSelectedPeriod.status !== 'ACTIVE' && (
                    <button
                      onClick={() => handleMakePeriodActive(activeSelectedPeriod)}
                      className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Jadikan periode ini sebagai periode aktif untuk mahasiswa"
                    >
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Jadikan Aktif</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setRawNimText('');
                      setBulkPreview({ valid: [], alreadyEnrolled: [], duplicates: [], notFound: [], ambiguous: [] });
                      setAmbiguousResolved({});
                      setIsBulkNimModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/25 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Bulk Insert NIM</span>
                  </button>

                  {coursePeriods.length > 1 && (
                    <button
                      onClick={() => handleDeletePeriod(activeSelectedPeriod)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200 cursor-pointer"
                      title="Hapus Periode Ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Participants Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Daftar Peserta Periode Ini</span>
                  </h4>
                  <span className="text-xs font-semibold text-slate-500">
                    Total: {periodParticipants.length} Mahasiswa
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4">NIM</th>
                        <th className="py-3 px-4">Nama Mahasiswa</th>
                        <th className="py-3 px-4">Kelas</th>
                        <th className="py-3 px-4">Status Progres</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {periodParticipants.length > 0 ? (
                        periodParticipants.map(part => (
                          <tr key={part.id} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900">{part.student.nim}</td>
                            <td className="py-3 px-4 font-semibold text-slate-900">{part.student.name}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-mono font-semibold">
                                {part.student.className}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <Badge status={part.progressStatus} size="sm" />
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  if (confirm(`Keluarkan ${part.student.name} dari periode ini?`)) {
                                    removeParticipant(part.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Keluarkan Peserta"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400">
                            Belum ada peserta di periode ini. Klik <strong>Bulk Insert NIM</strong> untuk mendaftarkan mahasiswa.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p>Pilih salah satu periode di sisi kiri atau buat periode baru.</p>
            </div>
          )}
        </div>

      </div>

      {/* Modal Create Period */}
      {isCreateModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Buat Periode Praktik Baru</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPeriod} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nama Periode *
                </label>
                <input
                  type="text"
                  value={periodNameInput}
                  onChange={e => setPeriodNameInput(e.target.value)}
                  placeholder="Contoh: Minggu Praktik ke-2 (Grup B)"
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Tanggal Mulai Praktik (WITA) *
                </label>
                <input
                  type="date"
                  value={startDateInput}
                  onChange={e => setStartDateInput(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Auto 5-day Calculation Alert (PRD Section 22) */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Kalkulasi Otomatis 5 Hari Praktik:</span>
                </p>
                <p className="text-[11px] text-blue-800">
                  Tanggal Selesai Otomatis: <strong>{calculatedEndDate}</strong> ({formatPeriodRange(startDateInput, calculatedEndDate)})
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Link Google Drive Final Project
                </label>
                <input
                  type="url"
                  value={driveUrlInput}
                  onChange={e => setDriveUrlInput(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30"
                >
                  Simpan Periode
                </button>
              </div>
            </form>
          </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal Edit Period & Date Sync */}
      {isEditModalOpen && activeSelectedPeriod && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Ubah Jadwal & Detail Periode</h3>
                  <p className="text-[11px] text-slate-400">Sinkronkan tanggal mulai praktik dengan jadwal riil</p>
                </div>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPeriod} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nama Periode *
                </label>
                <input
                  type="text"
                  value={editNameInput}
                  onChange={e => setEditNameInput(e.target.value)}
                  placeholder="Contoh: Minggu Praktik ke-2 CAD/CAM"
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Tanggal Mulai (WITA) *
                  </label>
                  <input
                    type="date"
                    value={editStartDateInput}
                    onChange={e => {
                      const val = e.target.value;
                      setEditStartDateInput(val);
                      if (autoCalculateEndDate && val) {
                        setEditEndDateInput(computePeriodEndDate(val, 5));
                      }
                    }}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Tanggal Selesai (WITA) *
                  </label>
                  <input
                    type="date"
                    value={editEndDateInput}
                    onChange={e => {
                      setEditEndDateInput(e.target.value);
                      setAutoCalculateEndDate(false);
                    }}
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                  />
                </div>
              </div>

              {/* Auto 5-day toggle & preview */}
              <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-blue-950">
                    <input
                      type="checkbox"
                      checked={autoCalculateEndDate}
                      onChange={e => {
                        const checked = e.target.checked;
                        setAutoCalculateEndDate(checked);
                        if (checked && editStartDateInput) {
                          setEditEndDateInput(computePeriodEndDate(editStartDateInput, 5));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span>Kalkulasi Otomatis 5 Hari Kerja (Senin–Jumat)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (editStartDateInput) {
                        setEditEndDateInput(computePeriodEndDate(editStartDateInput, 5));
                        setAutoCalculateEndDate(true);
                      }
                    }}
                    className="text-[10px] font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                  >
                    Reset ke 5 Hari
                  </button>
                </div>
                <p className="text-[11px] text-blue-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>
                    Durasi Tersinkron: <strong>{formatPeriodRange(editStartDateInput, editEndDateInput)}</strong>
                  </span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Status Gelombang Periode
                </label>
                <select
                  value={editStatusInput}
                  onChange={e => setEditStatusInput(e.target.value as 'UPCOMING' | 'ACTIVE' | 'COMPLETED')}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                >
                  <option value="ACTIVE">🟢 Aktif (Sedang Berjalan & Terbuka untuk Mahasiswa)</option>
                  <option value="UPCOMING">🟡 Akan Datang (Terjadwal)</option>
                  <option value="COMPLETED">⚪ Selesai (Arsip Periode)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  * Menjadikan periode ini Aktif akan otomatis menonaktifkan gelombang lain pada mata kuliah ini.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Link Google Drive Final Project
                </label>
                <input
                  type="url"
                  value={editDriveUrlInput}
                  onChange={e => setEditDriveUrlInput(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal Bulk Insert NIM with Instant Live Lookup (PRD Section 27 & 96) */}
      {isBulkNimModalOpen && activeSelectedPeriod && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-cyan-400" />
                  <span>Bulk Insert NIM Peserta Periode</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Target: {activeSelectedPeriod.name}
                </p>
              </div>
              <button onClick={() => setIsBulkNimModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-5">
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Paste Daftar NIM Mahasiswa di sini:
                </label>
                <textarea
                  rows={4}
                  value={rawNimText}
                  onChange={e => handleProcessRawNims(e.target.value)}
                  placeholder="240001&#10;240002&#10;240003&#10;240004&#10;249999"
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                ></textarea>
                <p className="text-[11px] text-slate-400 mt-1">
                  Pisahkan dengan Enter atau spasi. Dukung NIM lengkap <strong>atau 3 digit akhir</strong> (misal: <code className="bg-slate-100 px-1 rounded">036</code>). Jika ada beda angkatan, pilih nama yang muncul.
                </p>
              </div>

              {/* Live Preview List (PRD Section 27) */}
              {(bulkPreview.valid.length > 0 || bulkPreview.alreadyEnrolled.length > 0 || bulkPreview.notFound.length > 0 || bulkPreview.duplicates.length > 0 || bulkPreview.ambiguous.length > 0) && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-800">Pratinjau Hasil Lookup NIM:</span>
                    <span className="text-blue-600 font-semibold">
                      {bulkPreview.valid.length + ambiguousResolved.size} Siap Ditambahkan
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-100 text-xs">
                    
                    {/* Valid Students */}
                    {bulkPreview.valid.map(v => (
                      <div key={v.nim} className="p-2.5 bg-emerald-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-mono font-bold text-slate-900">{v.student.nim}</span>
                          <span className="text-slate-800">— {v.student.name}</span>
                          <span className="px-1.5 py-0.2 text-[10px] bg-emerald-100 text-emerald-800 rounded font-bold font-mono">
                            Kelas {v.student.className}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-700">Valid</span>
                      </div>
                    ))}

                    {/* Ambiguous — needs user selection */}
                    {bulkPreview.ambiguous.map(({ token, candidates }) => {
                      const resolvedId = ambiguousResolved[token];
                      const chosenStudent = resolvedId ? candidates.find(c => c.id === resolvedId) : null;

                      // Once resolved: render exactly like a Valid row (green), but with a small "Ganti" link
                      if (chosenStudent) {
                        return (
                          <div key={token} className="p-2.5 bg-emerald-50/50 flex items-center justify-between group">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="font-mono font-bold text-slate-900">{chosenStudent.nim}</span>
                              <span className="text-slate-800">— {chosenStudent.name}</span>
                              <span className="px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 rounded font-bold font-mono">
                                Kelas {chosenStudent.className}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-emerald-700">Valid</span>
                              <button
                                type="button"
                                onClick={() => setAmbiguousResolved(prev => { const n = {...prev}; delete n[token]; return n; })}
                                className="text-[10px] text-violet-600 hover:text-violet-800 font-semibold underline cursor-pointer hidden group-hover:inline"
                              >
                                Ganti
                              </button>
                            </div>
                          </div>
                        );
                      }

                      // Unresolved: show candidate picker buttons
                      return (
                        <div key={token} className="p-2.5 bg-violet-50/60">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Search className="w-4 h-4 text-violet-600 shrink-0" />
                            <span className="font-mono font-bold text-violet-900">...{token}</span>
                            <span className="text-violet-800 text-[11px]">
                              — {candidates.length} mahasiswa cocok · <strong>Klik salah satu untuk pilih:</strong>
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 ml-6">
                            {candidates.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => handleSelectAmbiguousStudent(token, c)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-violet-300 bg-white text-violet-800 hover:bg-violet-100 transition-all cursor-pointer"
                              >
                                <span className="font-mono">{c.nim}</span>
                                <span className="opacity-80">– {c.name}</span>
                                <span className="opacity-60">[Angk. {c.nim.slice(0,2)}]</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {/* Already Enrolled */}
                    {bulkPreview.alreadyEnrolled.map(ae => (
                      <div key={ae.nim} className="p-2.5 bg-blue-50/40 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="font-mono font-bold text-slate-700">{ae.student.nim}</span>
                          <span className="text-slate-600">— {ae.student.name}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-blue-700">Sudah Terdaftar</span>
                      </div>
                    ))}

                    {/* Not Found */}
                    {bulkPreview.notFound.map(nim => (
                      <div key={nim} className="p-2.5 bg-rose-50/60 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span className="font-mono font-bold text-rose-900">{nim}</span>
                        </div>
                        <span className="text-[10px] font-bold text-rose-700">NIM Tidak Ditemukan di Database</span>
                      </div>
                    ))}

                    {/* Duplicates in Input */}
                    {bulkPreview.duplicates.map((nim, i) => (
                      <div key={`${nim}-${i}`} className="p-2.5 bg-amber-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                          <span className="font-mono font-bold text-amber-900">{nim}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-amber-700">Duplikat pada Input</span>
                      </div>
                    ))}

                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setIsBulkNimModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <div className="flex items-center gap-3">
                {bulkPreview.ambiguous.length > 0 && (
                  <span className="text-[11px] text-violet-700 font-semibold">
                    {bulkPreview.ambiguous.filter(a => !(a.token in ambiguousResolved)).length > 0
                      ? `⚠️ ${bulkPreview.ambiguous.filter(a => !(a.token in ambiguousResolved)).length} belum dipilih`
                      : '✅ Semua ambigu terselesaikan'}
                  </span>
                )}
                <button
                  onClick={handleCommitBulkEnrollment}
                  disabled={bulkPreview.valid.length + Object.keys(ambiguousResolved).length === 0}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30 flex items-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Tambahkan {bulkPreview.valid.length + Object.keys(ambiguousResolved).length} Peserta (Default 100% Hadir)</span>
                </button>
              </div>
            </div>

          </div>
          </div>
        </ModalPortal>
      )}

    </div>
  );
};
