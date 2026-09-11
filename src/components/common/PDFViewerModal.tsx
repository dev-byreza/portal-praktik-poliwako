import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Download, FileText, X, ZoomIn, ZoomOut } from 'lucide-react';
import { toGoogleDrivePreviewUrl } from '../../utils/googleDriveUtils';

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileUrl?: string;
  fileSize?: string;
  authorName?: string;
  submittedAt?: string;
}

const getFileKind = (title: string, fileUrl: string): 'image' | 'archive' | 'download' | 'document' => {
  const source = `${title} ${fileUrl}`.toLowerCase();
  if (/\.(jpe?g|png|gif|webp|svg)(?:$|[?#])/.test(source)) return 'image';
  if (/\.(zip|rar|7z|tar|gz)(?:$|[?#])/.test(source)) return 'archive';
  const extension = source.match(/\.([a-z0-9]{2,8})(?:$|[?#\s)])/);
  if (extension && extension[1] !== 'pdf') return 'download';
  return 'document';
};

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({
  isOpen,
  onClose,
  title,
  fileUrl,
  fileSize = 'File',
  authorName,
  submittedAt,
}) => {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [previewError, setPreviewError] = useState(false);
  const fileKind = useMemo(() => getFileKind(title, fileUrl || ''), [title, fileUrl]);
  const previewUrl = useMemo(() => toGoogleDrivePreviewUrl(fileUrl), [fileUrl]);

  useEffect(() => {
    if (!isOpen) return;
    setZoomLevel(100);
    setPreviewError(false);
  }, [isOpen, fileUrl]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (!fileUrl) return;
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = title;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const showFallback = !fileUrl || previewError || fileKind === 'archive' || fileKind === 'download';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-2 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label={`Pratinjau ${title}`}>
      <div className="flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-700/80 bg-slate-800/90 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-400/30 bg-blue-500/20 text-blue-300">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-white">{title}</h3>
              <p className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>{fileSize}</span>
                {authorName && <span>• {authorName}</span>}
                {submittedAt && <span>• {submittedAt}</span>}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {fileKind === 'image' && !showFallback && (
              <div className="hidden items-center rounded-lg border border-slate-700 bg-slate-950/60 p-1 text-xs sm:flex">
                <button type="button" onClick={() => setZoomLevel((value) => Math.max(50, value - 10))} className="rounded p-1 text-slate-300 transition hover:bg-slate-800 hover:text-white" aria-label="Perkecil gambar">
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="px-2 font-mono text-slate-300">{zoomLevel}%</span>
                <button type="button" onClick={() => setZoomLevel((value) => Math.min(200, value + 10))} className="rounded p-1 text-slate-300 transition hover:bg-slate-800 hover:text-white" aria-label="Perbesar gambar">
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
            )}
            <button type="button" onClick={handleDownload} disabled={!fileUrl} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Unduh File</span>
            </button>
            <button type="button" onClick={onClose} className="ml-1 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700/80 hover:text-white" aria-label="Tutup pratinjau">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-slate-950 p-3 sm:p-6">
          {showFallback ? (
            <div className="flex min-h-full items-center justify-center">
              <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 text-center">
                <AlertCircle className="mx-auto h-10 w-10 text-amber-400" />
                <h4 className="mt-3 text-sm font-bold text-white">Preview langsung tidak tersedia</h4>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">Gunakan tombol Unduh File untuk membuka file asli yang tersimpan.</p>
                {fileUrl && <button type="button" onClick={handleDownload} className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-blue-500">Unduh File Asli</button>}
              </div>
            </div>
          ) : fileKind === 'image' ? (
            <div className="flex min-h-full items-start justify-center overflow-auto">
              <img src={fileUrl} alt={title} onError={() => setPreviewError(true)} className="max-w-none rounded-lg bg-white object-contain shadow-2xl transition-transform duration-150" style={{ width: `${zoomLevel}%`, height: 'auto' }} />
            </div>
          ) : (
            <iframe src={previewUrl} title={title} onError={() => setPreviewError(true)} className="h-full min-h-[70vh] w-full rounded-lg border border-slate-700 bg-white" />
          )}
        </div>
      </div>
    </div>
  );
};
