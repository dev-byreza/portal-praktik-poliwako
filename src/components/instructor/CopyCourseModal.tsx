// Copy Course Modal (PRD Section 20)

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Copy, X, CheckCircle2 } from 'lucide-react';
import { ModalPortal } from '../common/ModalPortal';

interface CopyCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceCourseId: string;
}

export const CopyCourseModal: React.FC<CopyCourseModalProps> = ({
  isOpen,
  onClose,
  sourceCourseId
}) => {
  const { courses, copyCourse, showToast } = useApp();
  const source = courses.find(c => c.id === sourceCourseId) || courses[0];

  const [newName, setNewName] = useState(source ? `${source.name} (Salinan)` : '');
  const [academicYear, setAcademicYear] = useState('2027/2028');
  const [semester, setSemester] = useState<'Ganjil' | 'Genap'>('Genap');

  if (!isOpen || !source) return null;

  const handleCopy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast('Nama Wajib Diisi', 'Silakan masukkan nama mata kuliah baru.', 'error');
      return;
    }

    copyCourse(sourceCourseId, newName.trim(), academicYear, semester);
    onClose();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-cyan-300 flex items-center justify-center">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Salin Struktur Mata Kuliah</h3>
              <p className="text-[11px] text-slate-400">Dari: {source.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCopy} className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 leading-relaxed">
            <strong>Catatan Salin:</strong> Struktur materi, tugas, Sub-CPMK, dan rubrik akan disalin. Data peserta, nilai, kehadiran, dan submission tidak ikut disalin.
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Nama Mata Kuliah Baru *
            </label>
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Tahun Ajaran Baru
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={e => setAcademicYear(e.target.value)}
                placeholder="2027/2028"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Semester Baru
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

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30"
            >
              Salin Sekarang
            </button>
          </div>
        </form>

      </div>
    </div>
    </ModalPortal>
  );
};
