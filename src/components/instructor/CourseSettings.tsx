// Course Settings & Sub-CPMK (OBE) + Rubrik Sikap/Kreativitas/Laporan + Feedback Rules Range Editor

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { FeedbackRule, QualityComponent, QualityComponentType, RubricCriterion, SubCPMK } from '../../types';
import { getCourseRubrics } from '../../utils/courseRubrics';
import { getCourseQualityComponents, QUALITY_COMPONENT_TYPES } from '../../utils/qualityAssessment';
import { validateFeedbackRulesOverlap } from '../../utils/gradeCalculators';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  Sparkles,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  Scale,
  Target,
  BookOpen,
  HelpCircle,
  Heart,
  Lightbulb,
  FileText
} from 'lucide-react';

interface LocalRubric {
  id: string;
  name: string;
  description: string;
}

const RubricSection = ({
  title,
  subtitle,
  icon,
  badgeColor,
  list,
  onChange,
  onAdd,
  onRemove,
  addLabel,
  minItems = 1
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badgeColor: string;
  list: LocalRubric[];
  onChange: (index: number, field: keyof LocalRubric, val: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  addLabel: string;
  minItems?: number;
}) => (
  <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
      <div>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeColor}`}>
            {list.length} Kriteria
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">{subtitle}</p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
      >
        <Plus className="w-4 h-4" />
        <span>{addLabel}</span>
      </button>
    </div>

    <div className="space-y-4">
      {list.map((rubric, idx) => (
        <div
          key={rubric.id}
          className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 transition-all hover:border-slate-300"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1">
              <span className="w-6 h-6 rounded-lg bg-slate-700 text-white font-black text-xs flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <input
                type="text"
                aria-label={`${title}: nama kriteria ${idx + 1}`}
                maxLength={255}
                value={rubric.name}
                onChange={e => onChange(idx, 'name', e.target.value)}
                placeholder="Nama kriteria penilaian..."
                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <button
              type="button"
              onClick={() => onRemove(rubric.id)}
              disabled={list.length <= minItems}
              className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors shrink-0"
              title="Hapus Kriteria"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Deskripsi / Indikator Penilaian:
            </label>
            <textarea
              rows={2}
              aria-label={`${title}: indikator kriteria ${idx + 1}`}
              value={rubric.description}
              onChange={e => onChange(idx, 'description', e.target.value)}
              placeholder="Tuliskan deskripsi atau indikator yang digunakan untuk menilai kriteria ini..."
              className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);


export const CourseSettings: React.FC = () => {
  const {
    activeCourse,
    updateCourse,
    deleteCourse,
    feedbackRules,
    saveCustomFeedbackRules,
    showToast
  } = useApp();

  const [localFeedbackRules, setLocalFeedbackRules] = useState<FeedbackRule[]>(feedbackRules);
  const [localSubCpmks, setLocalSubCpmks] = useState<SubCPMK[]>(activeCourse?.subCpmks || []);
  const [localQualityComponents, setLocalQualityComponents] = useState<QualityComponent[]>([]);
  const [courseName, setCourseName] = useState<string>(activeCourse?.name || '');
  const [courseCode, setCourseCode] = useState<string>(activeCourse?.code || '');
  const [courseSlug, setCourseSlug] = useState<string>(activeCourse?.slug || '');
  const [courseDepartment, setCourseDepartment] = useState<string>(activeCourse?.department || '');
  const [academicYear, setAcademicYear] = useState<string>(activeCourse?.academicYear || '2026/2027');
  const [semester, setSemester] = useState<'Ganjil' | 'Genap'>(activeCourse?.semester || 'Ganjil');
  const [courseDesc, setCourseDesc] = useState<string>(activeCourse?.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [overlapError, setOverlapError] = useState<string | null>(null);

  const [localAttitudeRubrics, setLocalAttitudeRubrics] = useState<LocalRubric[]>([]);
  const [localCreativityRubrics, setLocalCreativityRubrics] = useState<LocalRubric[]>([]);
  const [localReportRubrics, setLocalReportRubrics] = useState<LocalRubric[]>([]);

  useEffect(() => {
    if (activeCourse) {
      setCourseName(activeCourse.name || '');
      setCourseCode(activeCourse.code || '');
      setCourseSlug(activeCourse.slug || '');
      setCourseDepartment(activeCourse.department || '');
      setAcademicYear(activeCourse.academicYear || '2026/2027');
      setSemester(activeCourse.semester || 'Ganjil');
      setLocalSubCpmks(activeCourse.subCpmks || []);
      const configuredComponents = getCourseQualityComponents(activeCourse);
      const subCpmkIds = new Set((activeCourse.subCpmks || []).map(item => item.id));
      const configuredComponentIds = new Set(configuredComponents.map(component => component.id));
      const legacyQualityRubrics = (activeCourse.qualityRubrics || [])
        .filter(r => r.category === 'QUALITY' && !r.subCpmkId && !subCpmkIds.has(r.id) && !configuredComponentIds.has(r.id))
        .map(r => ({ id: r.id, type: 'CUSTOM' as const, name: r.name, description: r.description, weightPercent: 0 }));
      setLocalQualityComponents([...configuredComponents, ...legacyQualityRubrics]);
      setCourseDesc(activeCourse.description || '');

      setLocalAttitudeRubrics(getCourseRubrics(activeCourse, 'ATTITUDE'));
      setLocalCreativityRubrics(getCourseRubrics(activeCourse, 'CREATIVITY'));
      setLocalReportRubrics(getCourseRubrics(activeCourse, 'REPORT'));
    }
  }, [activeCourse]);

  useEffect(() => {
    setLocalFeedbackRules(feedbackRules);
  }, [feedbackRules]);

  const handleSubCpmkChange = (index: number, field: keyof SubCPMK, val: any) => {
    const updated = [...localSubCpmks];
    updated[index] = { ...updated[index], [field]: val };
    setLocalSubCpmks(updated);
  };

  const handleAddSubCpmk = () => {
    const nextNum = localSubCpmks.length + 1;
    const newCpmk: SubCPMK = {
      id: crypto.randomUUID(),
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

  const makeChangeHandler = (
    setList: React.Dispatch<React.SetStateAction<LocalRubric[]>>
  ) => (index: number, field: keyof LocalRubric, val: string) => {
    setList(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const handleAttitudeChange = makeChangeHandler(setLocalAttitudeRubrics);
  const handleCreativityChange = makeChangeHandler(setLocalCreativityRubrics);
  const handleReportChange = makeChangeHandler(setLocalReportRubrics);

  const handleQualityComponentChange = (id: string, field: keyof QualityComponent, value: string | number) => {
    setLocalQualityComponents(prev => prev.map(component => component.id === id
      ? { ...component, [field]: value }
      : component));
  };

  const totalQualityWeight = React.useMemo(() =>
    Math.round(localQualityComponents.reduce((total, component) => total + (Number(component.weightPercent) || 0), 0) * 100) / 100,
  [localQualityComponents]);
  const zeroWeightQualityComponents = localQualityComponents.filter(component => Number(component.weightPercent) <= 0);
  const hasValidQualityWeights = localQualityComponents.length > 0 && totalQualityWeight === 100 && zeroWeightQualityComponents.length === 0;

  const handleQualityComponentAdd = () => {
    const nextNumber = localQualityComponents.filter(component => component.type === 'CUSTOM').length + 1;
    setLocalQualityComponents(prev => [...prev, {
      id: crypto.randomUUID(),
      type: 'CUSTOM',
      name: `Kualitas Lainnya ${nextNumber}`,
      description: 'Tuliskan indikator atau sumber nilai untuk komponen ini.',
      weightPercent: 10,
    }]);
  };

  const handleQualityComponentRemove = (id: string) => {
    setLocalQualityComponents(prev => prev.filter(component => component.id !== id));
  };

  const handleDistributeQualityWeights = () => {
    if (localQualityComponents.length === 0) return;
    const share = Math.floor((100 / localQualityComponents.length) * 100) / 100;
    const remainder = Math.round((100 - share * localQualityComponents.length) * 100) / 100;
    setLocalQualityComponents(prev => prev.map((component, index) => ({
      ...component,
      weightPercent: index === 0 ? share + remainder : share,
    })));
  };

  const handleAttitudeAdd = () => {
    const nextNum = localAttitudeRubrics.length + 1;
    setLocalAttitudeRubrics(prev => [...prev, { id: crypto.randomUUID(), name: `Kriteria Sikap ${nextNum}`, description: 'Deskripsikan indikator penilaian sikap.' }]);
    showToast('Kriteria Ditambahkan', `Kriteria Sikap ke-${nextNum} telah dibuat.`, 'info');
  };
  const handleAttitudeRemove = (id: string) => {
    if (localAttitudeRubrics.length <= 1) { showToast('Minimal 1 Kriteria', 'Harus ada minimal 1 kriteria Sikap.', 'warning'); return; }
    setLocalAttitudeRubrics(prev => prev.filter(r => r.id !== id));
    showToast('Kriteria Dihapus', 'Kriteria Sikap telah dihapus.', 'info');
  };

  const handleCreativityAdd = () => {
    const nextNum = localCreativityRubrics.length + 1;
    setLocalCreativityRubrics(prev => [...prev, { id: crypto.randomUUID(), name: `Kriteria Kreativitas ${nextNum}`, description: 'Deskripsikan indikator penilaian kreativitas.' }]);
    showToast('Kriteria Ditambahkan', `Kriteria Kreativitas ke-${nextNum} telah dibuat.`, 'info');
  };
  const handleCreativityRemove = (id: string) => {
    if (localCreativityRubrics.length <= 1) { showToast('Minimal 1 Kriteria', 'Harus ada minimal 1 kriteria Kreativitas.', 'warning'); return; }
    setLocalCreativityRubrics(prev => prev.filter(r => r.id !== id));
    showToast('Kriteria Dihapus', 'Kriteria Kreativitas telah dihapus.', 'info');
  };

  const handleReportAdd = () => {
    const nextNum = localReportRubrics.length + 1;
    setLocalReportRubrics(prev => [...prev, { id: crypto.randomUUID(), name: `Kriteria Laporan ${nextNum}`, description: 'Deskripsikan indikator penilaian laporan.' }]);
    showToast('Kriteria Ditambahkan', `Kriteria Laporan ke-${nextNum} telah dibuat.`, 'info');
  };
  const handleReportRemove = (id: string) => {
    if (localReportRubrics.length <= 1) { showToast('Minimal 1 Kriteria', 'Harus ada minimal 1 kriteria Laporan.', 'warning'); return; }
    setLocalReportRubrics(prev => prev.filter(r => r.id !== id));
    showToast('Kriteria Dihapus', 'Kriteria Laporan telah dihapus.', 'info');
  };

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

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !activeCourse) return;

    if (localQualityComponents.length === 0 || totalQualityWeight !== 100) {
      showToast('Bobot Kualitas Belum 100%', `Atur total bobot seluruh komponen Kualitas menjadi tepat 100%. Total saat ini ${totalQualityWeight}%.`, 'error');
      return;
    }
    if (zeroWeightQualityComponents.length > 0) {
      showToast('Komponen Belum Memiliki Bobot', `Atur bobot di atas 0% atau hapus komponen: ${zeroWeightQualityComponents.map(component => component.name).join(', ')}.`, 'error');
      return;
    }
    if (localQualityComponents.some(component => !component.name.trim() || !component.description.trim())) {
      showToast('Komponen Kualitas Belum Lengkap', 'Isi nama dan deskripsi setiap komponen Kualitas.', 'error');
      return;
    }

    if (!courseName.trim()) {
      showToast('Nama Mata Kuliah Kosong', 'Nama mata kuliah tidak boleh kosong.', 'error');
      return;
    }

    const normalizedSlug = courseSlug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
      showToast('Slug Belum Valid', 'Gunakan huruf kecil, angka, dan tanda hubung tanpa spasi.', 'error');
      return;
    }

    for (let i = 0; i < localSubCpmks.length; i++) {
      if (!localSubCpmks[i].code.trim() || !localSubCpmks[i].description.trim()) {
        showToast('Sub-CPMK Tidak Lengkap', `Kode dan deskripsi pada Sub-CPMK ke-${i + 1} tidak boleh kosong.`, 'error');
        return;
      }
    }

    for (const [label, rubrics] of [
      ['Sikap', localAttitudeRubrics],
      ['Kreativitas', localCreativityRubrics],
      ['Laporan', localReportRubrics],
    ] as const) {
      if (!rubrics.length || rubrics.some(r => !r.name.trim() || !r.description.trim())) {
        showToast('Rubrik Tidak Lengkap', `Isi nama dan indikator setiap kriteria ${label}.`, 'error');
        return;
      }
    }

    const err = validateFeedbackRulesOverlap(localFeedbackRules);
    if (err) {
      setOverlapError(err);
      showToast('Rentang Tumpang Tindih', err, 'error');
      return;
    }

    setIsSaving(true);
    try {
      const existingQualityRubrics = activeCourse.qualityRubrics.filter(r => r.category === 'QUALITY');

      const updatedQualityRubrics = localSubCpmks.map(cpmk => {
        const existing = existingQualityRubrics.find(r => r.subCpmkId === cpmk.id || r.id === cpmk.id);
        return {
          id: existing?.id || crypto.randomUUID(),
          subCpmkId: cpmk.id,
          name: existing?.name || cpmk.code,
          category: 'QUALITY' as const,
          description: cpmk.description
        };
      });

      const toRubricCriteria = (
        list: LocalRubric[],
        category: 'ATTITUDE' | 'CREATIVITY' | 'REPORT'
      ): RubricCriterion[] =>
        list.map(r => ({
          id: r.id,
          name: r.name.trim(),
          category,
          description: r.description.trim()
        }));

      await updateCourse({
        ...activeCourse,
        name: courseName.trim(),
        code: courseCode.trim() || activeCourse.code,
        slug: normalizedSlug,
        department: courseDepartment.trim() || activeCourse.department,
        academicYear,
        semester,
        description: courseDesc.trim(),
        subCpmks: localSubCpmks,
        qualityComponents: localQualityComponents.map(component => ({
          ...component,
          name: component.name.trim(),
          description: component.description.trim(),
          weightPercent: Number(component.weightPercent),
        })),
        qualityRubrics: [
          ...updatedQualityRubrics,
          ...toRubricCriteria(localAttitudeRubrics, 'ATTITUDE'),
          ...toRubricCriteria(localCreativityRubrics, 'CREATIVITY'),
          ...toRubricCriteria(localReportRubrics, 'REPORT'),
        ]
      });
      saveCustomFeedbackRules(localFeedbackRules);
      showToast('Pengaturan Disimpan', 'Pengaturan mata kuliah dan rubrik penilaian berhasil diperbarui.', 'success');
    } catch (error) {
      console.error('Gagal menyimpan pengaturan mata kuliah:', error);
      showToast('Pengaturan Belum Tersimpan', 'Penyimpanan belum selesai. Periksa koneksi dan akses akun, lalu coba simpan kembali.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!activeCourse || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteCourse(activeCourse.id);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Gagal menghapus mata kuliah:', error);
      showToast('Mata Kuliah Belum Dihapus', 'Penghapusan gagal. Periksa koneksi dan akses akun, lalu coba kembali.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };


  return (
    <div className="space-y-8">

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Hapus mata kuliah?"
        message={`Mata kuliah “${activeCourse?.name || ''}” beserta periode praktik, materi, peserta, absensi, nilai, tugas, dan pengumuman terkait akan dihapus permanen.`}
        confirmLabel={isDeleting ? 'Menghapus...' : 'Hapus Mata Kuliah'}
        onConfirm={() => { void handleDeleteCourse(); }}
        onCancel={() => { if (!isDeleting) setIsDeleteDialogOpen(false); }}
      />

      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Konfigurasi Mata Kuliah
            </span>
            <span className="text-xs text-slate-400">{activeCourse?.name}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Pengaturan MK, Sub-CPMK OBE, Rubrik Penilaian & Feedback</h2>
          <p className="text-xs text-slate-500">
            Kelola identitas mata kuliah, rumusan Sub-CPMK, kriteria rubrik Sikap/Kreativitas/Laporan, serta pemetaan pesan feedback otomatis.
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={isSaving || !activeCourse || !hasValidQualityWeights}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
        </button>
      </div>

      {/* Form */}
      <form id="course-settings-form" onSubmit={handleSaveAll}>
        <fieldset disabled={isSaving} className="space-y-8">

        {/* Section 1: Identitas Mata Kuliah */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-bold text-slate-900">Identitas & Informasi Mata Kuliah</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Atur nama mata kuliah, kodefikasi kurikulum, program studi, tahun akademik, serta deskripsi umum praktik.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Nama Mata Kuliah *</label>
              <input
                type="text"
                value={courseName}
                onChange={e => setCourseName(e.target.value)}
                required
                placeholder="Contoh: Praktik DPP 2 atau CAD 1.1"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-[11px] text-slate-400 mt-1">Nama ini tampil di header portal, selector mata kuliah, dan laporan akhir mahasiswa.</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Kode Mata Kuliah / Kodefikasi</label>
              <input
                type="text"
                value={courseCode}
                onChange={e => setCourseCode(e.target.value)}
                placeholder="Contoh: 338RM1P / DPP2"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-[11px] text-slate-400 mt-1">Kode kurikulum resmi prodi sesuai silabus.</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Slug Tautan Mahasiswa</label>
              <input
                type="text"
                value={courseSlug}
                onChange={e => setCourseSlug(e.target.value.toLowerCase())}
                placeholder="Contoh: dpp2"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <p className="text-[11px] text-slate-400 mt-1">Tautan langsung: /mahasiswa/unit/{courseSlug || 'slug-mata-kuliah'}.</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Program Studi / Jurusan</label>
              <input
                type="text"
                value={courseDepartment}
                onChange={e => setCourseDepartment(e.target.value)}
                placeholder="Contoh: Rekayasa Perancangan Mekanik"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Tahun Akademik</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={e => setAcademicYear(e.target.value)}
                  placeholder="2026/2027"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Semester</label>
                <select
                  value={semester}
                  onChange={e => setSemester(e.target.value as 'Ganjil' | 'Genap')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="Ganjil">Ganjil / Gasal</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">Deskripsi & Ruang Lingkup Mata Kuliah</label>
            <textarea
              rows={3}
              value={courseDesc}
              onChange={e => setCourseDesc(e.target.value)}
              placeholder="Deskripsikan ruang lingkup, kompetensi inti, dan standar industri yang dipelajari..."
              className="w-full p-3.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 leading-relaxed"
            ></textarea>
          </div>
        </div>

        {/* Section 2: Sub-CPMK OBE */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Pengaturan Sub-CPMK (Outcome-Based Education)</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  totalSubCpmkWeight === 100
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  Total Bobot: {totalSubCpmkWeight}%
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
                Atur capaian Sub-CPMK dan bobot internalnya di dalam cabang Sub-CPMK. Bobot cabang Sub-CPMK terhadap Kualitas diatur pada Komponen Nilai Kualitas di bawah.
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

          <div className="space-y-4">
            {localSubCpmks.map((cpmk, idx) => {
              const linkedRubricsCount = activeCourse?.qualityRubrics.filter(
                r => r.category === 'QUALITY' && r.subCpmkId === cpmk.id
              ).length || 0;
              return (
                <div key={cpmk.id} className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 transition-all hover:border-slate-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">{idx + 1}</span>
                      <input
                        type="text"
                        value={cpmk.code}
                        onChange={e => handleSubCpmkChange(idx, 'code', e.target.value)}
                        placeholder="Contoh: Sub-CPMK 1"
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-36"
                      />
                    </div>
                    <div className="flex items-center gap-3">
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
                      placeholder="Tuliskan kompetensi yang harus dicapai mahasiswa..."
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
                Sub-CPMK yang Anda simpan di sini akan secara otomatis menjadi acuan dalam <strong>Grading Workspace</strong> instruktur saat melakukan penilaian rubrik kualitas pada skala standar (100: Sangat Baik, 75: Baik, 50: Cukup, 25: Kurang, 0: Tidak Mengerjakan) serta ditampilkan pada modul <strong>Analitik &amp; Evaluasi Mutu</strong>.
              </p>
            </div>
          </div>
        </div>

        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Komponen Nilai Kualitas</h3>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${hasValidQualityWeights ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                  Total bobot {totalQualityWeight}% / 100%
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">
                Atur cabang nilai Kualitas yang tampil di Grading Workspace. Bobot semua cabang wajib berjumlah 100%; nilai Kualitas ini menyumbang 70% pada nilai akhir mahasiswa.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 self-start sm:self-auto">
              <button type="button" onClick={handleDistributeQualityWeights} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100">
                <Scale className="h-3.5 w-3.5" /> Bagi rata
              </button>
              <button type="button" onClick={handleQualityComponentAdd} className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100">
                <Plus className="h-4 w-4" /> Tambah komponen
              </button>
            </div>
          </div>

          {!hasValidQualityWeights && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {totalQualityWeight !== 100
                  ? `Total bobot harus tepat 100%. Saat ini ${totalQualityWeight}% (${totalQualityWeight < 100 ? `kurang ${Math.round((100 - totalQualityWeight) * 100) / 100}%` : `lebih ${Math.round((totalQualityWeight - 100) * 100) / 100}%`}); sesuaikan sebelum menyimpan.`
                  : `Masih ada komponen berbobot 0%: ${zeroWeightQualityComponents.map(component => component.name).join(', ')}. Atur bobot di atas 0% atau hapus komponen tersebut.`}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {localQualityComponents.map((component, index) => {
              const typeLabel = QUALITY_COMPONENT_TYPES.find(option => option.value === component.type)?.label || 'Komponen Kualitas';
              return (
                <div key={component.id} className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_auto] sm:items-center">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-xs font-black text-white">{index + 1}</span>
                      <input aria-label={`Nama komponen Kualitas ${index + 1}`} maxLength={100} value={component.name} onChange={e => handleQualityComponentChange(component.id, 'name', e.target.value)} className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <select aria-label={`Jenis komponen Kualitas ${index + 1}`} value={component.type} onChange={e => handleQualityComponentChange(component.id, 'type', e.target.value as QualityComponentType)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                      {QUALITY_COMPONENT_TYPES.map(option => {
                        const optionRepeatable = option.value === 'QUIZ' || option.value === 'CUSTOM';
                        const alreadyConfigured = !optionRepeatable && option.value !== component.type && localQualityComponents.some(item => item.type === option.value);
                        return <option key={option.value} value={option.value} disabled={alreadyConfigured}>{option.label}</option>;
                      })}
                    </select>
                    <button type="button" onClick={() => handleQualityComponentRemove(component.id)} aria-label={`Hapus komponen ${component.name}`} className="justify-self-end rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600" title="Hapus komponen">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-end">
                    <div>
                      <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Deskripsi / sumber nilai • {typeLabel}</label>
                      <textarea rows={2} aria-label={`Deskripsi komponen Kualitas ${index + 1}`} value={component.description} onChange={e => handleQualityComponentChange(component.id, 'description', e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Bobot Kualitas (%)
                      <input type="number" inputMode="decimal" min={0} max={100} step={0.01} value={component.weightPercent} onChange={e => handleQualityComponentChange(component.id, 'weightPercent', Math.max(0, Math.min(100, Number(e.target.value) || 0)))} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-center font-mono text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 3: Rubrik Sikap */}
        <RubricSection
          title="Kriteria Rubrik Sikap & K3 (Bobot 10%)"
          subtitle="Tentukan kriteria penilaian aspek sikap, kedisiplinan, kepatuhan K3, dan etika kerja mahasiswa selama praktik berlangsung."
          icon={<Heart className="w-5 h-5 text-emerald-600" />}
          badgeColor="bg-emerald-50 text-emerald-700 border-emerald-200"
          list={localAttitudeRubrics}
          onChange={handleAttitudeChange}
          onAdd={handleAttitudeAdd}
          onRemove={handleAttitudeRemove}
          addLabel="Tambah Kriteria Sikap"
        />

        {/* Section 4: Rubrik Kreativitas */}
        <RubricSection
          title="Kriteria Rubrik Kreativitas (Bobot 5%)"
          subtitle="Tentukan kriteria penilaian aspek kreativitas, inisiatif, inovasi, dan eksplorasi solusi teknis mahasiswa dalam praktik."
          icon={<Lightbulb className="w-5 h-5 text-amber-500" />}
          badgeColor="bg-amber-50 text-amber-700 border-amber-200"
          list={localCreativityRubrics}
          onChange={handleCreativityChange}
          onAdd={handleCreativityAdd}
          onRemove={handleCreativityRemove}
          addLabel="Tambah Kriteria Kreativitas"
        />

        {/* Section 5: Rubrik Laporan */}
        <RubricSection
          title="Kriteria Rubrik Laporan Praktik (Bobot 15%)"
          subtitle="Tentukan kriteria penilaian aspek laporan, dokumentasi, sistematika penulisan, dan kelengkapan data laporan praktik mahasiswa."
          icon={<FileText className="w-5 h-5 text-violet-600" />}
          badgeColor="bg-violet-50 text-violet-700 border-violet-200"
          list={localReportRubrics}
          onChange={handleReportChange}
          onAdd={handleReportAdd}
          onRemove={handleReportRemove}
          addLabel="Tambah Kriteria Laporan"
        />

        {/* Section 6: Feedback Rules */}
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

          {overlapError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{overlapError}</span>
            </div>
          )}

          <div className="space-y-3">
            {localFeedbackRules.map((rule, idx) => (
              <div key={rule.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
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

        </fieldset>
      </form>

      <section className="rounded-3xl border border-rose-200 bg-rose-50/70 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-rose-900">Zona Bahaya</h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-rose-700">
              Hapus mata kuliah ini hanya jika sudah tidak digunakan. Seluruh data praktik yang terhubung akan ikut terhapus dan tidak dapat dipulihkan.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsDeleteDialogOpen(true)}
            disabled={!activeCourse || isSaving || isDeleting}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/20 transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'Menghapus...' : 'Hapus Mata Kuliah'}
          </button>
        </div>
      </section>
    </div>
  );
};
