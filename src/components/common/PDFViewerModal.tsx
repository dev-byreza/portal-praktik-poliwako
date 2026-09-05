// Interactive PDF Viewer Component for In-App Document Inspection

import React, { useState } from 'react';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileText,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileUrl?: string;
  fileSize?: string;
  authorName?: string;
  submittedAt?: string;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({
  isOpen,
  onClose,
  title,
  fileUrl,
  fileSize = '3.4 MB',
  authorName,
  submittedAt
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const totalPages = 3;

  if (!isOpen) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl || '#';
    link.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    link.target = '_blank';
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-2 sm:p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl h-[92vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-800/90 border-b border-slate-700/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>{fileSize}</span>
                {authorName && <span>• {authorName}</span>}
                {submittedAt && <span>• {submittedAt}</span>}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center bg-slate-950/60 rounded-lg p-1 border border-slate-700 text-xs">
              <button
                onClick={() => setZoomLevel(prev => Math.max(prev - 15, 70))}
                className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-2 text-slate-300 font-mono font-medium">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(prev + 15, 160))}
                className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center bg-slate-950/60 rounded-lg p-1 border border-slate-700 text-xs">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-slate-300 font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
              title="Unduh PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Unduh PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-700/80 rounded-lg text-slate-400 hover:text-white transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Canvas Simulation */}
        <div className="flex-1 bg-slate-950 p-4 sm:p-8 overflow-auto flex justify-center items-start">
          <div
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
            className="w-[720px] min-h-[960px] bg-white text-slate-900 rounded-lg shadow-2xl p-10 flex flex-col justify-between border border-slate-300 transition-transform duration-150"
          >
            {/* Header Document */}
            <div>
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-950">POLITEKNIK SOROWAKO</h2>
                  <p className="text-xs uppercase tracking-wider text-slate-600 font-semibold">Jurusan Teknik Perawatan Mesin & Manufaktur</p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p className="font-mono font-semibold text-slate-800">ISO 9001:2015 Form</p>
                  <p>Kode Dokumen: POL-MES-2026</p>
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-y-2 text-xs">
                  <div>
                    <span className="text-slate-500">Mata Kuliah:</span>{' '}
                    <strong className="text-slate-900">Pemesinan CNC Dasar & Lanjut</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Lembar Dokumen:</span>{' '}
                    <strong className="text-slate-900">{title}</strong>
                  </div>
                  {authorName && (
                    <div>
                      <span className="text-slate-500">Mahasiswa / NIM:</span>{' '}
                      <strong className="text-slate-900">{authorName}</strong>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500">Tanggal Pemeriksaan:</span>{' '}
                    <strong className="text-slate-900">September 2026 (WITA)</strong>
                  </div>
                </div>
              </div>

              {/* Page Content Variations */}
              {currentPage === 1 && (
                <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                  <h4 className="font-bold text-sm text-slate-900 uppercase border-b pb-1">1. Parameter Pemesinan & Program NC</h4>
                  <p>
                    Program NC berikut telah disimulasikan menggunakan software CAD/CAM CAMWorks/Mastercam dengan post-processor standar Fanuc Oi-MD. Benda kerja berdimensi 100 x 80 x 25 mm material Aluminium Alloy 6061-T6.
                  </p>
                  
                  {/* G-Code Snippet Simulation */}
                  <div className="bg-slate-900 text-emerald-400 font-mono text-[11px] p-4 rounded-md shadow-inner leading-tight">
                    <p>%</p>
                    <p>O2401 (POLIWAKO-CNC-BASE-PLATE)</p>
                    <p>N10 G21 G90 G40 G80 G49 G17</p>
                    <p>N20 T01 M06 (ENDMILL D10 4-FLUTE HSS)</p>
                    <p>N30 G54 G00 X0. Y0. S3200 M03</p>
                    <p>N40 G43 H01 Z15. M08</p>
                    <p>N50 G01 Z-2.0 F350</p>
                    <p>N60 G01 X80.0 Y0. F800</p>
                    <p>N70 G02 X90.0 Y10.0 R10.0 F600</p>
                    <p>N80 G01 Y60.0</p>
                    <p>N90 G01 X10.0</p>
                    <p>N100 G00 Z25.0 M09</p>
                    <p>N110 G28 G91 Z0. M05</p>
                    <p>N120 M30</p>
                    <p>%</p>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Simulasi lintasan pahat (toolpath 3D) bebas interferensi klem pencekam. Cycle time estimasi: 04:32 menit.</span>
                  </div>
                </div>
              )}

              {currentPage === 2 && (
                <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                  <h4 className="font-bold text-sm text-slate-900 uppercase border-b pb-1">2. Lembar Pemeriksaan Kualitas & Dimensi (OBE Sub-CPMK 3)</h4>
                  <p>
                    Tabel data hasil pengukuran menggunakan Vernier Caliper (Ketelitian 0.02 mm) dan Micrometer Sekrup (Ketelitian 0.01 mm) pada temperatur ruang 24°C:
                  </p>

                  <table className="w-full border-collapse text-left border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-slate-100 font-semibold text-slate-800 border-b border-slate-300">
                        <th className="p-2 border-r border-slate-300">Fitur Geometri</th>
                        <th className="p-2 border-r border-slate-300">Nominal (mm)</th>
                        <th className="p-2 border-r border-slate-300">Toleransi ISO</th>
                        <th className="p-2 border-r border-slate-300">Aktual (mm)</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 border-r border-slate-200 font-medium">Panjang Total (X)</td>
                        <td className="p-2 border-r border-slate-200">100.00</td>
                        <td className="p-2 border-r border-slate-200">± 0.05</td>
                        <td className="p-2 border-r border-slate-200 font-mono">100.02</td>
                        <td className="p-2 text-emerald-600 font-semibold">OK (Pass)</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 border-r border-slate-200 font-medium">Lebar Total (Y)</td>
                        <td className="p-2 border-r border-slate-200">80.00</td>
                        <td className="p-2 border-r border-slate-200">± 0.05</td>
                        <td className="p-2 border-r border-slate-200 font-mono">79.98</td>
                        <td className="p-2 text-emerald-600 font-semibold">OK (Pass)</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 border-r border-slate-200 font-medium">Kedalaman Pocket (Z)</td>
                        <td className="p-2 border-r border-slate-200">5.00</td>
                        <td className="p-2 border-r border-slate-200">± 0.02</td>
                        <td className="p-2 border-r border-slate-200 font-mono">5.01</td>
                        <td className="p-2 text-emerald-600 font-semibold">OK (Pass)</td>
                      </tr>
                      <tr className="border-b border-slate-200">
                        <td className="p-2 border-r border-slate-200 font-medium">Diameter Lubang 4x M8</td>
                        <td className="p-2 border-r border-slate-200">Ø 6.80</td>
                        <td className="p-2 border-r border-slate-200">± 0.03</td>
                        <td className="p-2 border-r border-slate-200 font-mono">Ø 6.82</td>
                        <td className="p-2 text-emerald-600 font-semibold">OK (Pass)</td>
                      </tr>
                      <tr>
                        <td className="p-2 border-r border-slate-200 font-medium">Kekasaran Permukaan (Ra)</td>
                        <td className="p-2 border-r border-slate-200">N7 (&lt;1.6 µm)</td>
                        <td className="p-2 border-r border-slate-200">Max 1.6 µm</td>
                        <td className="p-2 border-r border-slate-200 font-mono">1.18 µm</td>
                        <td className="p-2 text-emerald-600 font-semibold">OK (Pass)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {currentPage === 3 && (
                <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
                  <h4 className="font-bold text-sm text-slate-900 uppercase border-b pb-1">3. Kesimpulan & Verifikasi Pengesahan</h4>
                  <p>
                    Berdasarkan seluruh proses praktikum yang telah dilaksanakan, benda kerja memenuhi seluruh kriteria kelulusan Sub-CPMK dan toleransi gambar kerja. Prosedur SOP K3 diterapkan secara konsisten.
                  </p>

                  <div className="grid grid-cols-2 gap-8 pt-10 text-center">
                    <div>
                      <p className="text-slate-500 mb-14">Mahasiswa Praktikan,</p>
                      <p className="font-bold text-slate-900 underline">{authorName || 'Andi Saputra'}</p>
                      <p className="text-slate-500">NIM. 240001</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-14">Instruktur Praktik Penguji,</p>
                      <p className="font-bold text-slate-900 underline">Ir. M. Reza Firmansyah, S.T., M.T.</p>
                      <p className="text-slate-500">NIP. 198709122015041002</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Document Footer */}
            <div className="border-t border-slate-200 pt-3 text-[10px] text-slate-400 flex justify-between">
              <span>Portal Praktik Poliwako • Verified Student PDF Submission</span>
              <span>Halaman {currentPage} dari {totalPages}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
