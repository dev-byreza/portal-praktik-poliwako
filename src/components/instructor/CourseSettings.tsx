// Course Settings & Sub-CPMK (OBE) + Feedback Rules Range Editor (PRD Section 45, 46, 61, 62)

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { FeedbackRule, SubCPMK } from '../../types';
import { validateFeedbackRulesOverlap } from '../../utils/gradeCalculators';
import {
  Settings,
  Sparkles,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Target,
  BookOpen,
  Award,
  Layers,
  HelpCircle
} from 'lucide-react';

export const CourseSettings: React.FC = () => {
  const {
    activeCourse,
    updateCourse,
    feedbackRules,
    saveCustomFeedbackRules,
    showToast
  } = useApp();

  const [localFeedbackRules, setLocalFeedbackRules] = useState<FeedbackRule[]>(feedbackRules);
  const [localSubCpmks, setLocalSubCpmks] = useState<SubCPMK[]>(activeCourse?.subCpmks || []);
  const [courseDesc, setCourseDesc] = useState<string>(activeCourse?.description || '');
  const [overlapError, setOverlapError] = useState<string | null>(null);

  // Sync state whenever activeCourse changes
  useEffect(() => {
    if (activeCourse) {
      setLocalSubCpmks(activeCourse.subCpmks || []);
      setCourseDesc(activeCourse.description || '');
    }
  }, [activeCourse]);

  useEffect(() => {
    setLocalFeedbackRules(feedbackRules);
  }, [feedbackRules]);

  // Sub-CPMK handlers
  const handleSubCpmkChange = (index: number, field: keyof SubCPMK, val: any) => {
    const updated = [...localSubCpmks];
    updated[index] = { ...updated[index], [field]: val };
    setLocalSubCpmks(updated);
  };

  const handleAddSubCpmk = () => {
    const nextNum = localSubCpmks.length + 1;
    const newCpmk: SubCPMK = {
      id: `cpmk-${Date.now()}`,
      code: `Sub-CPMK ${nextNum}`,
      description: 'Mampu mendemonstrasikan prosedur praktik sesuai standar operasional bengkel.',
      weightPercent: 20
    };
    setLocalSubCpmks(prev => [...prev, newCpmk]);
    showToast('Sub-CPMK Ditambahkan', `Sub-CPMK ${nextNum} baru telah dibuat. Silakan sesuaikan deskripsinya.`, 'info');
  };

  const handleDistributeWeights = () => {
    if (localSubCpmks.length === 0) return;
    const share = Math.floor(100 / localSubCpmks.length);
    const remainder = 100 - (share * localSubCpmks.length);
    const updated = localSubCpmks.map((cpmk, i) => ({
      ...cpmk,
      weightPercent: i === 0 ? share + remainder : share
    }));
    setLocalSubCpmks(updated);
    showToast('Bobot Dibagi Rata', 'Bobot setiap Sub-CPMK telah diseimbangkan menjadi total 100%.', 'info');
  };

  const totalSubCpmkWeight = React.useMemo(() => {
    return localSubCpmks.reduce((acc, curr) => acc + (Number(curr.weightPercent) || 0), 0);
  }, [localSubCpmks]);

  const handleRemoveSubCpmk = (id: string) => {
    if (localSubCpmks.length <= 1) {
      showToast('Minimal 1 Sub-CPMK', 'Mata kuliah praktik harus memiliki minimal satu Sub-CPMK.', 'warning');
      return;
    }
    setLocalSubCpmks(prev => prev.filter(c => c.id !== id));
    showToast('Sub-CPMK Dihapus', 'Sub-CPMK telah dihapus dari mata kuliah.', 'info');
  };

  // Feedback Rules handlers
  const handleRuleChange = (index: number, field: keyof FeedbackRule, val: any) => {
    setOverlapError(null);
    const updated = [...localFeedbackRules];
    updated[index] = { ...updated[index], [field]: val };
    setLocalFeedbackRules(updated);
  };

  const handleAddRule = () => {
    setLocalFeedbackRules([
      ...localFeedbackRules,
      { id: `fb-custom-${Date.now()}`, courseId: activeCourse?.id || '', minScore: 0, maxScore: 50, message: 'Pesan evaluasi kustom...' }
    ]);
  };

  const handleRemoveRule = (id: string) => {
    if (localFeedbackRules.length <= 1) return;
    setLocalFeedbackRules(localFeedbackRules.filter(r => r.id !== id));
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate Sub-CPMKs have code and description
    for (let i = 0; i < localSubCpmks.length; i++) {
      if (!localSubCpmks[i].code.trim() || !localSubCpmks[i].description.trim()) {
        showToast('Sub-CPMK Tidak Lengkap', `Kode dan deskripsi pada Sub-CPMK ke-${i + 1} tidak boleh kosong.`, 'error');
        return;
      }
    }

    // Check overlap validation for feedback rules (PRD Section 62)
    const err = validateFeedbackRulesOverlap(localFeedbackRules);
    if (err) {
      setOverlapError(err);
      showToast('Rentang Tumpang Tindih', err, 'error');
      return;
    }

    saveCustomFeedbackRules(localFeedbackRules);

    if (activeCourse) {
      const existingQualityRubrics = activeCourse.qualityRubrics.filter(r => r.category === 'QUALITY');
      const nonQualityRubrics = activeCourse.qualityRubrics.filter(r => r.category !== 'QUALITY');

      const updatedQualityRubrics = localSubCpmks.map(cpmk => {
        const existing = existingQualityRubrics.find(r => r.subCpmkId === cpmk.id || r.id === cpmk.id);
        return {
          id: existing?.id || `rub-q-${cpmk.id}`,
          subCpmkId: cpmk.id,
          name: existing?.name || cpmk.code,
          category: 'QUALITY' as const,
          description: cpmk.description
        };
      });

      updateCourse({
        ...activeCourse,
        description: courseDesc,
        subCpmks: localSubCpmks,
        qualityRubrics: [...updatedQualityRubrics, ...nonQualityRubrics]
      });
    }

    showToast('Pengaturan Disimpan', 'Pengaturan mata kuliah, Sub-CPMK OBE, dan aturan feedback berhasil diperbarui.', 'success');
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Konfigurasi Mata Kuliah
            </span>
            <span className="text-xs text-slate-400">{activeCourse?.name}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Pengaturan MK, Sub-CPMK OBE & Feedback</h2>
          <p className="text-xs text-slate-500">
            Kelola identitas mata kuliah, rumusan Sub-CPMK (Capaian Pembelajaran Lulusan), serta pemetaan pesan feedback otomatis.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Perubahan</span>
        </button>
      </div>

      {/* Form Grid */}
      <form onSubmit={handleSaveAll} className="space-y-8">
        
        {/* Section 1: Pengaturan Sub-CPMK (Outcome-Based Education) - PRD Section 45, 46 */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Pengaturan Sub-CPMK (Outcome-Based Education)
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  totalSubCpmkWeight === 100
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  Total Bobot: {totalSubCpmkWeight}%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
                Setiap mata kuliah praktik memiliki Sub-CPMK spesifik yang menjadi rujukan penilaian kualitas benda kerja (Bobot 70%). Atur kode, uraian kompetensi, dan persentase bobot per Sub-CPMK.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleDistributeWeights}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors"
                title="Bagi rata bobot 100% ke seluruh Sub-CPMK"
              >
                <Scale className="w-3.5 h-3.5 text-slate-500" />
                <span>Bagi Rata Bobot</span>
              </button>

              <button
                type="button"
                onClick={handleAddSubCpmk}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Sub-CPMK</span>
              </button>
            </div>
          </div>

          {/* Sub-CPMK List */}
          <div className="space-y-4">
            {localSubCpmks.map((cpmk, idx) => {
              const linkedRubricsCount = activeCourse?.qualityRubrics.filter(
                r => r.category === 'QUALITY' && r.subCpmkId === cpmk.id
              ).length || 0;

              return (
                <div
                  key={cpmk.id}
                  className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 transition-all hover:border-slate-300"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={cpmk.code}
                        onChange={e => handleSubCpmkChange(idx, 'code', e.target.value)}
                        placeholder="Contoh: Sub-CPMK 1"
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-36"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Weight Percent Input */}
                      <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-300">
                        <span className="text-[11px] font-bold text-slate-500">Bobot:</span>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={cpmk.weightPercent ?? 0}
                          onChange={e => handleSubCpmkChange(idx, 'weightPercent', parseInt(e.target.value, 10) || 0)}
                          className="w-12 text-center text-xs font-mono font-bold text-slate-900 focus:outline-none"
                        />
                        <span className="text-[11px] font-bold text-slate-500">%</span>
                      </div>

                      {linkedRubricsCount > 0 && (
                        <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200 hidden sm:inline-block">
                          {linkedRubricsCount} Rubrik Terkait
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => handleRemoveSubCpmk(cpmk.id)}
                        disabled={localSubCpmks.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
                        title="Hapus Sub-CPMK"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Uraian Capaian Pembelajaran Lulusan (Kompetensi Spesifik):
                    </label>
                    <textarea
                      rows={2}
                      value={cpmk.description}
                      onChange={e => handleSubCpmkChange(idx, 'description', e.target.value)}
                      placeholder="Tuliskan kompetensi yang harus dicapai mahasiswa, misal: Mampu menyusun program G-Code mesin CNC Milling..."
                      className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    ></textarea>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Pedoman Outcome-Based Education (OBE):</span>
              <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                Sub-CPMK yang Anda simpan di sini akan secara otomatis menjadi acuan dalam <strong>Grading Workspace</strong> instruktur saat melakukan penilaian rubrik kualitas pada skala standar (100: Sangat Baik, 75: Baik, 50: Cukup, 25: Kurang, 0: Tidak Mengerjakan) serta ditampilkan pada modul <strong>Analitik & Evaluasi Mutu</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Course Info Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b pb-3">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>Deskripsi & Informasi Praktik</span>
          </h3>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Deskripsi Mata Kuliah
            </label>
            <textarea
              rows={3}
              value={courseDesc}
              onChange={e => setCourseDesc(e.target.value)}
              placeholder="Deskripsikan ruang lingkup praktik..."
              className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 leading-relaxed"
            ></textarea>
          </div>
        </div>

        {/* Section 3: Feedback Rules Table (PRD Section 61, 62) */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <span>Aturan Pesan Feedback Otomatis (Score Range Mapping)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pesan ini yang otomatis diberikan kepada mahasiswa berdasarkan rentang nilai akhir yang dicapai.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddRule}
              className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs rounded-xl border border-blue-200 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Rentang</span>
            </button>
          </div>

          {/* Overlap Error Banner */}
          {overlapError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2 animate-shake">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{overlapError}</span>
            </div>
          )}

          <div className="space-y-3">
            {localFeedbackRules.map((rule, idx) => (
              <div key={rule.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
                
                {/* Min & Max inputs */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-slate-500">Skor:</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={rule.minScore}
                    onChange={e => handleRuleChange(idx, 'minScore', parseInt(e.target.value, 10) || 0)}
                    className="w-16 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 text-center"
                  />
                  <span className="text-xs text-slate-400">s/d</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={rule.maxScore}
                    onChange={e => handleRuleChange(idx, 'maxScore', parseInt(e.target.value, 10) || 0)}
                    className="w-16 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 text-center"
                  />
                </div>

                {/* Message input */}
                <input
                  type="text"
                  value={rule.message}
                  onChange={e => handleRuleChange(idx, 'message', e.target.value)}
                  placeholder="Template pesan feedback..."
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800"
                />

                <button
                  type="button"
                  onClick={() => handleRemoveRule(rule.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors shrink-0"
                  title="Hapus Rentang"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </form>

    </div>
  );
};
