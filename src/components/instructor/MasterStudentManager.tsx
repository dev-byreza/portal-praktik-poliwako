// Master Mahasiswa & CSV Bulk Importer (PRD Section 16 & 17)

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Student } from '../../types';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Search,
  Filter,
  Trash2,
  Edit2,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
  Download,
  KeyRound
} from 'lucide-react';
import { ModalPortal } from '../common/ModalPortal';

export const MasterStudentManager: React.FC = () => {
  const { students, addStudent, updateStudent, deleteStudent, importStudentsCSV, resetStudentPassword, showToast } = useApp();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Form states for manual student add/edit
  const [formNim, setFormNim] = useState('');
  const [formName, setFormName] = useState('');
  const [formClass, setFormClass] = useState('2A');
  const [formEmail, setFormEmail] = useState('');

  // CSV Import states
  const [csvRawText, setCsvRawText] = useState('');
  const [parsedRows, setParsedRows] = useState<{ nim: string; name: string; className: string; isValid: boolean; error?: string }[]>([]);

  // Unique Classes in Master
  const availableClasses = useMemo(() => {
    const set = new Set(students.map(s => s.className));
    return Array.from(set).sort();
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (classFilter !== 'ALL' && s.className !== classFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.nim.toLowerCase().includes(q) || s.className.toLowerCase().includes(q);
      }
      return true;
    });
  }, [students, classFilter, searchQuery]);

  // Open Edit Form
  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormNim(student.nim);
    setFormName(student.name);
    setFormClass(student.className);
    setFormEmail(student.email || '');
    setIsAddModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingStudent(null);
    setFormNim('');
    setFormName('');
    setFormClass('2A');
    setFormEmail('');
    setIsAddModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNim.trim() || !formName.trim()) {
      showToast('Form Belum Lengkap', 'NIM dan Nama Mahasiswa wajib diisi.', 'error');
      return;
    }

    try {
      if (editingStudent) {
        updateStudent({
          ...editingStudent,
          nim: formNim.trim(),
          name: formName.trim(),
          className: formClass.trim(),
          email: formEmail.trim() || `${formNim.trim()}@student.politekniksorowako.ac.id`
        });
      } else {
        addStudent({
          nim: formNim.trim(),
          name: formName.trim(),
          className: formClass.trim(),
          email: formEmail.trim() || `${formNim.trim()}@student.politekniksorowako.ac.id`
        });
      }
      setIsAddModalOpen(false);
    } catch {
      // Handled in context
    }
  };

  // CSV Parsing & Validation (PRD Section 17)
  const handleParseCsv = (content: string) => {
    setCsvRawText(content);
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    const existingNims = new Set(students.map(s => s.nim.toLowerCase()));
    const seenInCsv = new Set<string>();

    const rows: { nim: string; name: string; className: string; isValid: boolean; error?: string }[] = [];

    // Check if line 0 is a header (contains 'nim' or 'nama')
    const startIndex = lines[0]?.toLowerCase().includes('nim') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      const nim = parts[0] || '';
      const name = parts[1] || '';
      const className = parts[2] || '2A';

      if (!nim || !name) {
        rows.push({ nim, name, className, isValid: false, error: 'Format baris tidak lengkap (NIM atau Nama kosong)' });
        continue;
      }

      if (existingNims.has(nim.toLowerCase())) {
        rows.push({ nim, name, className, isValid: false, error: 'NIM sudah ada di Master Mahasiswa' });
        continue;
      }

      if (seenInCsv.has(nim.toLowerCase())) {
        rows.push({ nim, name, className, isValid: false, error: 'Duplikat NIM di dalam file CSV yang sama' });
        continue;
      }

      seenInCsv.add(nim.toLowerCase());
      rows.push({ nim, name, className, isValid: true });
    }

    setParsedRows(rows);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleParseCsv(text);
      };
      reader.readAsText(file);
    }
  };

  const handleCommitCsvImport = () => {
    const validItems = parsedRows
      .filter(r => r.isValid)
      .map(r => ({
        nim: r.nim,
        name: r.name,
        className: r.className,
        email: `${r.nim}@student.politekniksorowako.ac.id`
      }));

    if (validItems.length === 0) {
      showToast('Import Gagal', 'Tidak ada data valid yang dapat diimpor.', 'error');
      return;
    }

    importStudentsCSV(validItems);
    setIsCsvModalOpen(false);
    setParsedRows([]);
    setCsvRawText('');
  };

  const handleDownloadSampleCsv = () => {
    const sample = 'NIM,Nama,Kelas\n240020,Muhammad Rizky,2A\n240021,Alya Nurhaliza,2A\n240022,Bagas Firmansyah,2B\n240023,Cindy Claudia,2B';
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Template_Import_Mahasiswa_Poliwako.csv';
    link.click();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Database Terpusat
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Database Mahasiswa</h2>
          <p className="text-xs text-slate-500">
            Kelola database mahasiswa terdaftar Politeknik Sorowako. Data ini dapat didaftarkan ke berbagai periode praktik. (Total: {students.length} Mahasiswa)
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => {
              setParsedRows([]);
              setCsvRawText('');
              setIsCsvModalOpen(true);
            }}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-300"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Mahasiswa</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari NIM atau Nama..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Filter Kelas */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Filter Kelas:</span>
          <select
            value={classFilter}
            onChange={e => setClassFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">Semua Kelas ({students.length})</option>
            {availableClasses.map(cls => (
              <option key={cls} value={cls}>Kelas {cls}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Student Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-6">NIM</th>
                <th className="py-3.5 px-6">Nama Mahasiswa</th>
                <th className="py-3.5 px-6">Kelas</th>
                <th className="py-3.5 px-6">Email Institusi</th>
                <th className="py-3.5 px-6">Status Akun</th>
                <th className="py-3.5 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStudents.length > 0 ? (
                filteredStudents.map(std => (
                  <tr key={std.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-bold text-slate-900">{std.nim}</td>
                    <td className="py-3.5 px-6 font-semibold text-slate-900 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        {std.name.charAt(0)}
                      </div>
                      <span>{std.name}</span>
                    </td>
                    <td className="py-3.5 px-6">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md font-semibold font-mono text-[11px] border border-slate-200">
                        {std.className}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-slate-500 font-mono text-[11px]">{std.email}</td>
                    <td className="py-3.5 px-6">
                      {std.hasCreatedPassword ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Password Aktif</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          <span>Belum Aktivasi</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {std.hasCreatedPassword && (
                          <button
                            onClick={() => {
                              if (confirm(`Reset password untuk mahasiswa ${std.name} (${std.nim})? Mahasiswa akan diminta membuat password baru saat login berikutnya.`)) {
                                resetStudentPassword(std.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Reset Password Mahasiswa"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenEdit(std)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Data"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Hapus mahasiswa ${std.name} (${std.nim}) dari Master?`)) {
                              deleteStudent(std.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Hapus Mahasiswa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-semibold text-slate-600">Tidak ada data mahasiswa ditemukan</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Coba ubah kata kunci pencarian atau filter kelas.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Student */}
      {isAddModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {editingStudent ? 'Edit Data Mahasiswa' : 'Tambah Mahasiswa Baru'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  NIM (Nomor Induk Mahasiswa) *
                </label>
                <input
                  type="text"
                  value={formNim}
                  onChange={e => setFormNim(e.target.value)}
                  placeholder="Contoh: 240015"
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Nama Lengkap Mahasiswa *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Contoh: Andi Saputra"
                  required
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Kelas *
                  </label>
                  <input
                    type="text"
                    value={formClass}
                    onChange={e => setFormClass(e.target.value)}
                    placeholder="2A, 2B, dsb."
                    required
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Email Mahasiswa (Opsional)
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                    placeholder="Auto generate NIM"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/30"
                >
                  Simpan Mahasiswa
                </button>
              </div>
            </form>
          </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal CSV Bulk Import (PRD Section 17) */}
      {isCsvModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <span>Import Mahasiswa dari File CSV</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Format kolom standar: NIM, Nama, Kelas</p>
              </div>
              <button onClick={() => setIsCsvModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              
              {/* Template downloader & Upload Area */}
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                <div className="text-xs text-emerald-900">
                  <p className="font-bold">Gunakan template format CSV resmi Poliwako</p>
                  <p className="text-[11px] text-emerald-700">Contoh format: 240001,Andi Saputra,2A</p>
                </div>
                <button
                  onClick={handleDownloadSampleCsv}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Contoh CSV</span>
                </button>
              </div>

              {/* Drag & drop or text paste */}
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center bg-slate-50/60">
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Pilih file CSV dari komputer Anda</p>
                <label className="inline-block mt-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer hover:bg-slate-50 transition-colors shadow-sm">
                  Browse File .CSV
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Or Paste Raw Text */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Atau Paste Isi Teks CSV di Sini:
                </label>
                <textarea
                  rows={4}
                  value={csvRawText}
                  onChange={e => handleParseCsv(e.target.value)}
                  placeholder="240020,Muhammad Rizky,2A&#10;240021,Alya Nurhaliza,2A"
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                ></textarea>
              </div>

              {/* Preview & Validation Table (PRD Section 17) */}
              {parsedRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>Pratinjau Hasil Validasi ({parsedRows.length} Baris Terdeteksi):</span>
                    <span className="text-emerald-600 font-semibold">
                      {parsedRows.filter(r => r.isValid).length} Valid • {parsedRows.filter(r => !r.isValid).length} Bermasalah
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-[10px]">
                        <tr className="divide-x divide-slate-200">
                          <th className="p-2">Status</th>
                          <th className="p-2">NIM</th>
                          <th className="p-2">Nama</th>
                          <th className="p-2">Kelas</th>
                          <th className="p-2">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {parsedRows.map((row, idx) => (
                          <tr key={idx} className={row.isValid ? 'bg-emerald-50/30' : 'bg-rose-50/50'}>
                            <td className="p-2">
                              {row.isValid ? (
                                <span className="text-emerald-600 font-bold flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> OK
                                </span>
                              ) : (
                                <span className="text-rose-600 font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5" /> Gagal
                                </span>
                              )}
                            </td>
                            <td className="p-2 font-bold text-slate-900">{row.nim || '-'}</td>
                            <td className="p-2 text-slate-800">{row.name || '-'}</td>
                            <td className="p-2">{row.className || '-'}</td>
                            <td className={`p-2 text-[10px] ${row.isValid ? 'text-emerald-700' : 'text-rose-700 font-bold'}`}>
                              {row.isValid ? 'Siap diimpor' : row.error}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setIsCsvModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleCommitCsvImport}
                disabled={parsedRows.filter(r => r.isValid).length === 0}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/30 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan {parsedRows.filter(r => r.isValid).length} Mahasiswa ke Master</span>
              </button>
            </div>

          </div>
          </div>
        </ModalPortal>
      )}

    </div>
  );
};
