// Rekap Nilai & Export to CSV / XLSX (PRD Section 63)

import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { exportRecapToCSV, exportRecapToXLSX, RecapRow } from '../../utils/exportUtils';
import { getGradePredicate } from '../../utils/gradeCalculators';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Search,
  CheckCircle2,
  AlertTriangle,
  Award,
  Layers,
  Calendar
} from 'lucide-react';
import { Badge } from '../common/Badge';

export const RekapNilaiExport: React.FC = () => {
  const {
    activeCourseId,
    activeCourse,
    periods,
    participants,
    assessments,
    attendance,
    showToast
  } = useApp();

  const [selectedPeriodFilter, setSelectedPeriodFilter] = useState<string>('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Course periods
  const coursePeriods = useMemo(() => {
    return periods.filter(p => p.courseId === activeCourseId);
  }, [periods, activeCourseId]);

  // Course Participants
  const courseParticipants = useMemo(() => {
    const periodIds = new Set(coursePeriods.map(p => p.id));
    return participants.filter(p => periodIds.has(p.periodId));
  }, [participants, coursePeriods]);

  // Filtered rows
  const recapData = useMemo(() => {
    return courseParticipants
      .filter(p => {
        if (selectedPeriodFilter !== 'ALL' && p.periodId !== selectedPeriodFilter) return false;
        if (selectedClassFilter !== 'ALL' && p.student.className !== selectedClassFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return p.student.name.toLowerCase().includes(q) || p.student.nim.toLowerCase().includes(q);
        }
        return true;
      })
      .map(part => {
        const periodObj = periods.find(per => per.id === part.periodId);
        const ass = assessments.find(a => a.periodId === part.periodId && a.studentId === part.studentId);
        const att = attendance.find(a => a.periodId === part.periodId && a.studentId === part.studentId);

        const attendancePct = att ? `${att.percentage}%` : '100%';
        const statusLabel = ass?.isPublished
          ? 'Dipublikasikan'
          : ass
          ? 'Sudah Dinilai (Draft)'
          : 'Belum Dinilai';

        const pred = ass && typeof ass.finalScore === 'number' && ass.finalScore > 0 ? getGradePredicate(ass.finalScore) : null;

        return {
          participantId: part.id,
          nim: part.student.nim,
          nama: part.student.name,
          kelas: part.student.className,
          periode: periodObj?.name || 'Periode',
          kehadiran: attendancePct,
          isEligible: att ? att.isEligible : true,
          kualitas: ass ? ass.qualityScore : '-',
          sikap: ass ? ass.attitudeScore : '-',
          kreativitas: ass ? ass.creativityScore : '-',
          laporan: ass ? ass.reportScore : '-',
          nilaiAkhir: ass ? ass.finalScore : '-',
          nilaiMutu: pred ? pred.letter : '-',
          sebutanMutu: pred ? pred.predicate : '-',
          predInfo: pred,
          feedback: ass ? ass.feedback : '-',
          status: statusLabel,
          isPublished: ass?.isPublished || false
        };
      });
  }, [courseParticipants, selectedPeriodFilter, selectedClassFilter, searchQuery, periods, assessments, attendance]);

  const handleExportCSV = () => {
    const exportRows: RecapRow[] = recapData.map(r => ({
      nim: r.nim,
      nama: r.nama,
      kelas: r.kelas,
      periode: r.periode,
      kehadiran: r.kehadiran,
      kualitas: r.kualitas,
      sikap: r.sikap,
      kreativitas: r.kreativitas,
      laporan: r.laporan,
      nilaiAkhir: r.nilaiAkhir,
      nilaiMutu: r.nilaiMutu,
      sebutanMutu: r.sebutanMutu,
      feedback: r.feedback,
      status: r.status
    }));

    exportRecapToCSV(exportRows, `Rekap_Nilai_${activeCourse?.slug || 'Poliwako'}.csv`);
    showToast('Export CSV Selesai', 'File CSV berhasil diunduh.', 'success');
  };

  const handleExportXLSX = () => {
    const exportRows: RecapRow[] = recapData.map(r => ({
      nim: r.nim,
      nama: r.nama,
      kelas: r.kelas,
      periode: r.periode,
      kehadiran: r.kehadiran,
      kualitas: r.kualitas,
      sikap: r.sikap,
      kreativitas: r.kreativitas,
      laporan: r.laporan,
      nilaiAkhir: r.nilaiAkhir,
      nilaiMutu: r.nilaiMutu,
      sebutanMutu: r.sebutanMutu,
      feedback: r.feedback,
      status: r.status
    }));

    exportRecapToXLSX(exportRows, activeCourse?.name || 'Praktik', `Rekap_Nilai_${activeCourse?.slug || 'Poliwako'}.xlsx`);
    showToast('Export Excel Selesai', 'File Excel (.xlsx) berhasil diunduh.', 'success');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              Laporan & Rekapitulasi
            </span>
            <span className="text-xs text-slate-400">{activeCourse?.name}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">Rekap Nilai Praktik Berbasis OBE</h2>
          <p className="text-xs text-slate-500">
            Rekapitulasi lengkap nilai mahasiswa per periode dan kelas. Siap diekspor ke format CSV & Microsoft Excel (XLSX).
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={handleExportCSV}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportXLSX}
            className="flex-1 md:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel (.XLSX)</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Cari NIM atau Nama Mahasiswa..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Periode:</span>
            <select
              value={selectedPeriodFilter}
              onChange={e => setSelectedPeriodFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Semua Periode</option>
              {coursePeriods.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Kelas:</span>
            <select
              value={selectedClassFilter}
              onChange={e => setSelectedClassFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">Semua Kelas</option>
              <option value="2A">2A</option>
              <option value="2B">2B</option>
              <option value="3A">3A</option>
            </select>
          </div>
        </div>

      </div>

      {/* Recap Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">NIM</th>
                <th className="py-3.5 px-4">Nama Mahasiswa</th>
                <th className="py-3.5 px-3">Kelas</th>
                <th className="py-3.5 px-4">Periode</th>
                <th className="py-3.5 px-3 text-center">Presensi</th>
                <th className="py-3.5 px-3 text-center">Kualitas (70%)</th>
                <th className="py-3.5 px-3 text-center">Sikap (10%)</th>
                <th className="py-3.5 px-3 text-center">Kreativitas (5%)</th>
                <th className="py-3.5 px-3 text-center">Laporan (15%)</th>
                <th className="py-3.5 px-4 text-center">Nilai Akhir</th>
                <th className="py-3.5 px-3 text-center">Nilai Mutu</th>
                <th className="py-3.5 px-4">Sebutan Mutu</th>
                <th className="py-3.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recapData.length > 0 ? (
                recapData.map(row => (
                  <tr key={row.participantId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{row.nim}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{row.nama}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-mono font-semibold">
                        {row.kelas}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 truncate max-w-[140px]">{row.periode}</td>
                    
                    {/* Kehadiran */}
                    <td className="py-3 px-3 text-center">
                      <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                        row.isEligible ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700 font-black'
                      }`}>
                        {row.kehadiran}
                      </span>
                    </td>

                    {/* Component Scores */}
                    <td className="py-3 px-3 text-center font-mono">{row.kualitas}</td>
                    <td className="py-3 px-3 text-center font-mono">{row.sikap}</td>
                    <td className="py-3 px-3 text-center font-mono">{row.kreativitas}</td>
                    <td className="py-3 px-3 text-center font-mono">{row.laporan}</td>

                    {/* Final Score */}
                    <td className="py-3 px-4 text-center">
                      <span className="font-mono font-black text-sm text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg">
                        {row.nilaiAkhir}
                      </span>
                    </td>

                    {/* Nilai Mutu */}
                    <td className="py-3 px-3 text-center">
                      {row.predInfo ? (
                        <span className={`inline-block font-bold px-2 py-0.5 rounded text-[11px] border ${row.predInfo.bgClass} ${row.predInfo.colorClass} ${row.predInfo.borderClass}`}>
                          {row.nilaiMutu}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">-</span>
                      )}
                    </td>

                    {/* Sebutan Mutu */}
                    <td className="py-3 px-4">
                      {row.predInfo ? (
                        <span className={`text-xs font-semibold ${row.predInfo.colorClass}`}>
                          {row.sebutanMutu}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">-</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <Badge status={row.isPublished ? 'PUBLISHED' : row.nilaiAkhir !== '-' ? 'ASSESSED' : 'NOT_STARTED'} label={row.status} size="sm" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-400">
                    Tidak ada rekapan nilai yang cocok dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
