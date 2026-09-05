// 6-Step Course Setup Wizard (PRD Section 19)

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SubCPMK, RubricCriterion } from '../../types';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  BookOpen,
  Link,
  Target,
  Scale,
  Eye,
  Send,
  Plus,
  Trash2,
  X,
  Layers
} from 'lucide-react';
import { ModalPortal } from '../common/ModalPortal';

interface CourseWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CourseWizardModal: React.FC<CourseWizardModalProps> = ({ isOpen, onClose }) => {
  const { createCourse, showToast } = useApp();
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Form states
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [academicYear, setAcademicYear] = useState('2026/2027');
  const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
  const [department, setDepartment] = useState('Perawatan dan Perbaikan Mesin');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');

  // Sub-CPMK states
  const [subCpmks, setSubCpmks] = useState<SubCPMK[]>([
    { id: 'cpmk-temp-1', code: 'Sub-CPMK 1', description: 'Mampu memahami dan menerapkan SOP K3 serta pengoperasian mesin.' },
    { id: 'cpmk-temp-2', code: 'Sub-CPMK 2', description: 'Mampu menyusun program NC dan melakukan zero point setting datum.' },
  ]);

  // Rubrics
  const [qualityRubrics, setQualityRubrics] = useState<RubricCriterion[]>([
    { id: 'q-1', name: 'Ketepatan Prosedur & Eksekusi', category: 'QUALITY', description: 'Kesesuaian langkah kerja pemesinan' },
    { id: 'q-2', name: 'Akurasi Geometris & Toleransi', category: 'QUALITY', description: 'Ketepatan ukuran sesuai ISO 2768-m' },
    { id: 's-1', name: 'Sikap Kerja & K3', category: 'ATTITUDE', description: 'Kepatuhan APD dan kedisiplinan bengkel' },
    { id: 'c-1', name: 'Kreativitas Solusi', category: 'CREATIVITY', description: 'Inisiatif optimasi lintasan cycle time' },
    { id: 'r-1', name: 'Laporan Praktik', category: 'REPORT', description: 'Kelengkapan tabel data inspeksi' },
  ]);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setCourseName(val);
    const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    setSlug(autoSlug);
  };

  const handleAddSubCpmk = () => {
    const nextNum = subCpmks.length + 1;
    setSubCpmks([
      ...subCpmks,
      { id: `cpmk-temp-${Date.now()}`, code: `Sub-CPMK ${nextNum}`, description: 'Deskripsi capaian pembelajaran...' }
    ]);
  };

  const handleRemoveSubCpmk = (id: string) => {
    if (subCpmks.length <= 1) return;
    setSubCpmks(subCpmks.filter(c => c.id !== id));
  };

  const handleFinish = () => {
    if (!courseName.trim()) {
      showToast('Form Tidak Lengkap', 'Nama Mata Kuliah wajib diisi.', 'error');
      setCurrentStep(1);
      return;
    }

    createCourse({
      name: courseName.trim(),
      code: courseCode.trim() || 'MES-100',
      academicYear,
      semester,
      slug: slug.trim() || `course-${Date.now()}`,
      department,
      description,
      subCpmks,
      qualityRubrics
    });

    onClose();
  };

  const steps = [
    { num: 1, label: 'Informasi', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { num: 2, label: 'URL Slug', icon: <Link className="w-3.5 h-3.5" /> },
    { num: 3, label: 'Sub-CPMK (OBE)', icon: <Target className="w-3.5 h-3.5" /> },
    { num: 4, label: 'Rubrik', icon: <Scale className="w-3.5 h-3.5" /> },
    { num: 5, label: 'Review', icon: <Eye className="w-3.5 h-3.5" /> },
    { num: 6, label: 'Publish', icon: <Send className="w-3.5 h-3.5" /> },
  ];

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/20 text-blue-300 rounded border border-blue-500/30">
                Setup Wizard
              </span>
              <span className="text-xs text-slate-400">Langkah {currentStep} dari 6</span>
            </div>
            <h2 className="text-lg font-bold text-white mt-0.5">Buat Mata Kuliah Praktik Baru</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between overflow-x-auto gap-2">
          {steps.map(step => (
            <div
              key={step.num}
              className={`flex items-center gap-1.5 text-xs font-semibold shrink-0 ${
                currentStep === step.num
                  ? 'text-blue-600 font-bold'
                  : currentStep > step.num
                  ? 'text-emerald-600'
                  : 'text-slate-400'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === step.num
                  ? 'bg-blue-600 text-white shadow-sm'
                  : currentStep > step.num
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-200 text-slate-500'
              }`}>
                {currentStep > step.num ? '✓' : step.num}
              </div>
              <span className="hidden sm:inline">{step.label}</span>
              {step.num < 6 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 ml-1" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
          
          {/* Step 1: Informasi */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Informasi Umum Mata Kuliah</h3>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nama Mata Kuliah *
                </label>
                <input
                  type="text"
                  value={courseName}
                  onChange={e => handleNameChange(e.target.value)}
                  placeholder="Contoh: Otomasi Industri & PLC"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Kode Mata Kuliah
                  </label>
                  <input
                    type="text"
                    value={courseCode}
                    onChange={e => setCourseCode(e.target.value)}
                    placeholder="MES-205P"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Tahun Ajaran
                  </label>
                  <input
                    type="text"
                    value={academicYear}
                    onChange={e => setAcademicYear(e.target.value)}
                    placeholder="2026/2027"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Semester
                  </label>
                  <select
                    value={semester}
                    onChange={e => setSemester(e.target.value as 'Ganjil' | 'Genap')}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Ganjil">Ganjil</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Program Studi
                </label>
                <select
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="Perawatan dan Perbaikan Mesin">Perawatan dan Perbaikan Mesin</option>
                  <option value="Rekayasa Perancangan Mekanik">Rekayasa Perancangan Mekanik</option>
                  <option value="Teknologi Rekayasa Pengelasan dan Fabrikasi">Teknologi Rekayasa Pengelasan dan Fabrikasi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Deskripsi Singkat Praktik
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Jelaskan cakupan pembelajaran praktik..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                ></textarea>
              </div>
            </div>
          )}

          {/* Step 2: URL & Slug */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Konfigurasi URL Mahasiswa (Public Slug)</h3>
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Custom Slug URL
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  placeholder="otomasi-industri"
                  className="w-full px-4 py-2.5 font-mono text-sm bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <p className="text-xs font-bold text-blue-900">Pratinjau URL Akses Mahasiswa:</p>
                <p className="text-xs font-mono text-blue-700 mt-1 bg-white px-3 py-2 rounded-lg border border-blue-200 truncate">
                  praktik.politekniksorowako.ac.id/{slug || 'nama-mata-kuliah'}
                </p>
                <p className="text-[11px] text-blue-600 mt-2">
                  URL ini dapat dibagikan kepada seluruh mahasiswa peserta tanpa perlu membuat akun login.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Sub-CPMK (OBE) */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b pb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Sub-CPMK (Outcome-Based Education)</h3>
                  <p className="text-xs text-slate-500">Tentukan capaian pembelajaran spesifik praktik ini.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddSubCpmk}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1 border border-blue-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Sub-CPMK</span>
                </button>
              </div>

              <div className="space-y-3">
                {subCpmks.map((cpmk, idx) => (
                  <div key={cpmk.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                    <input
                      type="text"
                      value={cpmk.code}
                      onChange={e => {
                        const updated = [...subCpmks];
                        updated[idx].code = e.target.value;
                        setSubCpmks(updated);
                      }}
                      className="w-28 px-2 py-1 bg-white border border-slate-300 rounded text-xs font-bold font-mono text-slate-800"
                    />
                    <input
                      type="text"
                      value={cpmk.description}
                      onChange={e => {
                        const updated = [...subCpmks];
                        updated[idx].description = e.target.value;
                        setSubCpmks(updated);
                      }}
                      placeholder="Uraian kompetensi Sub-CPMK..."
                      className="flex-1 px-3 py-1 bg-white border border-slate-300 rounded text-xs text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveSubCpmk(cpmk.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Rubrik Standar */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Konfigurasi Bobot Rubrik Penilaian</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <span className="text-xs font-bold text-blue-800 block">Kualitas (OBE)</span>
                  <span className="text-2xl font-black text-blue-600">70%</span>
                </div>
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <span className="text-xs font-bold text-indigo-800 block">Sikap & K3</span>
                  <span className="text-2xl font-black text-indigo-600">10%</span>
                </div>
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl">
                  <span className="text-xs font-bold text-teal-800 block">Kreativitas</span>
                  <span className="text-2xl font-black text-teal-600">5%</span>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-xs font-bold text-amber-800 block">Laporan Kerja</span>
                  <span className="text-2xl font-black text-amber-600">15%</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                <p className="font-bold text-slate-800">Skala Penilaian Standar Poliwako:</p>
                <div className="grid grid-cols-5 gap-2 mt-2 font-mono text-[11px] text-center font-bold">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded">100 (Sangat Baik)</div>
                  <div className="p-2 bg-blue-100 text-blue-800 rounded">75 (Baik)</div>
                  <div className="p-2 bg-amber-100 text-amber-800 rounded">50 (Cukup)</div>
                  <div className="p-2 bg-orange-100 text-orange-800 rounded">25 (Kurang)</div>
                  <div className="p-2 bg-rose-100 text-rose-800 rounded">0 (Tidak Ada)</div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-sm font-bold text-slate-900 border-b pb-2">Ringkasan Konfigurasi Mata Kuliah</h3>
              
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400">Nama Mata Kuliah:</span>
                    <p className="font-bold text-slate-900">{courseName || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Kode:</span>
                    <p className="font-bold text-slate-900">{courseCode || '-'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Tahun Ajaran / Semester:</span>
                    <p className="font-bold text-slate-900">{academicYear} • {semester}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Slug Mahasiswa:</span>
                    <p className="font-bold font-mono text-blue-600">/{slug}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <span className="text-slate-400">Sub-CPMK Terkonfigurasi ({subCpmks.length}):</span>
                  <ul className="list-disc list-inside mt-1 text-slate-700 space-y-0.5">
                    {subCpmks.map(c => (
                      <li key={c.id}><strong>{c.code}:</strong> {c.description}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Publish */}
          {currentStep === 6 && (
            <div className="text-center py-6 space-y-4 animate-fadeIn">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Mata Kuliah Siap Dipublikasikan!</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Setelah dipublikasikan, Anda dapat langsung menambahkan <strong>Periode Praktik</strong> dan memasukkan daftar mahasiswa melalui fitur <strong>Bulk Insert NIM</strong>.
              </p>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            disabled={currentStep === 1}
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Sebelumnya</span>
          </button>

          {currentStep < 6 ? (
            <button
              onClick={() => {
                if (currentStep === 1 && !courseName.trim()) {
                  showToast('Nama Wajib Diisi', 'Silakan masukkan nama mata kuliah terlebih dahulu.', 'warning');
                  return;
                }
                setCurrentStep(prev => prev + 1);
              }}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30 flex items-center gap-1.5"
            >
              <span>Lanjut</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="px-8 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Publikasikan Mata Kuliah</span>
            </button>
          )}
        </div>

      </div>
    </div>
    </ModalPortal>
  );
};
