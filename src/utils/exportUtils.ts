// Export Utilities for Rekap Nilai (CSV & Excel XLSX)
import * as XLSX from 'xlsx';

export interface RecapRow {
  nim: string;
  nama: string;
  kelas: string;
  periode: string;
  kehadiran: string; // e.g. '100% (5/5 Hari)'
  kualitas: number | string;
  sikap: number | string;
  kreativitas: number | string;
  laporan: number | string;
  nilaiAkhir: number | string;
  nilaiMutu?: string; // e.g. 'A', 'A-', 'B+'
  sebutanMutu?: string; // e.g. 'Sangat Baik', 'Hampir Sangat Baik'
  feedback: string;
  status: string; // 'Dipublikasikan', 'Belum Dinilai', 'Remedial'
}

export function exportRecapToCSV(data: RecapRow[], filename: string = 'Rekap_Nilai_Praktik_Poliwako.csv') {
  const headers = [
    'NIM',
    'Nama Mahasiswa',
    'Kelas',
    'Periode Praktik',
    'Kehadiran',
    'Nilai Kualitas (70%)',
    'Nilai Sikap (10%)',
    'Nilai Kreativitas (5%)',
    'Nilai Laporan (15%)',
    'Nilai Akhir',
    'Nilai Mutu',
    'Sebutan Mutu',
    'Catatan / Feedback',
    'Status Penilaian'
  ];

  const rows = data.map(row => [
    `"${row.nim}"`,
    `"${row.nama.replace(/"/g, '""')}"`,
    `"${row.kelas}"`,
    `"${row.periode}"`,
    `"${row.kehadiran}"`,
    row.kualitas,
    row.sikap,
    row.kreativitas,
    row.laporan,
    row.nilaiAkhir,
    `"${row.nilaiMutu || '-'}"`,
    `"${row.sebutanMutu || '-'}"`,
    `"${(row.feedback || '').replace(/"/g, '""')}"`,
    `"${row.status}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportRecapToXLSX(data: RecapRow[], courseName: string = 'Praktik', filename: string = 'Rekap_Nilai_Praktik_Poliwako.xlsx') {
  const formattedData = data.map(row => ({
    'NIM': row.nim,
    'Nama Mahasiswa': row.nama,
    'Kelas': row.kelas,
    'Periode': row.periode,
    'Kehadiran': row.kehadiran,
    'Kualitas (70%)': row.kualitas,
    'Sikap (10%)': row.sikap,
    'Kreativitas (5%)': row.kreativitas,
    'Laporan (15%)': row.laporan,
    'Nilai Akhir': row.nilaiAkhir,
    'Nilai Mutu': row.nilaiMutu || '-',
    'Sebutan Mutu': row.sebutanMutu || '-',
    'Feedback': row.feedback,
    'Status': row.status
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, courseName.slice(0, 31) || 'Rekap Nilai');

  // Auto-width columns
  const max_widths = [12, 28, 8, 22, 16, 14, 12, 14, 14, 12, 12, 20, 40, 16];
  worksheet['!cols'] = max_widths.map(w => ({ wch: w }));

  XLSX.writeFile(workbook, filename);
}
