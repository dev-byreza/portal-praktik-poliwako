// Student Assignment & PDF Submission Card

import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Assignment, Submission } from '../../types';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Trash2
} from 'lucide-react';
import { PDFViewerModal } from '../common/PDFViewerModal';
import { formatDeadline, formatWitaDateTime } from '../../utils/dateUtils';

interface StudentAssignmentCardProps {
  assignment: Assignment;
  submission?: Submission;
  isPeriodExpired?: boolean;
}

type AllowedFileType = 'PDF' | 'IMAGE' | 'ZIP' | 'RAR' | 'ANY';

const parseDeadlineTimestamp = (value: string): number | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalized = raw
    .replace(/\s*WITA\s*$/i, '+08:00')
    .replace(
      /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?::(\d{2}))?([+-]\d{2}:\d{2})?$/,
      (_match, date, time, seconds = '00', timezone = '') => `${date}T${time}:${seconds}${timezone}`
    );
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const formatRemainingTime = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const fileRule = (type: AllowedFileType) => {
  switch (type) {
    case 'ANY': return { label: 'ALL FILES', extensions: 'semua format file', accept: undefined };
    case 'IMAGE': return { label: 'Gambar', extensions: '.jpg, .jpeg, .png, .webp, .gif', accept: 'image/*,.jpg,.jpeg,.png,.webp,.gif' };
    case 'ZIP': return { label: 'ZIP', extensions: '.zip', accept: '.zip,application/zip,application/x-zip-compressed' };
    case 'RAR': return { label: 'RAR', extensions: '.rar', accept: '.rar,application/vnd.rar,application/x-rar-compressed' };
    default: return { label: 'PDF', extensions: '.pdf', accept: '.pdf,application/pdf' };
  }
};

export const StudentAssignmentCard: React.FC<StudentAssignmentCardProps> = ({
  assignment,
  submission,
  isPeriodExpired = false
}) => {
  const { currentStudent, studentSession, submitAssignment, showToast } = useApp();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const deadlineTimestamp = useMemo(() => parseDeadlineTimestamp(assignment.deadline), [assignment.deadline]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadlineTimestamp === null) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [deadlineTimestamp]);

  const remainingMilliseconds = deadlineTimestamp === null ? null : deadlineTimestamp - now;
  const isDeadlinePassed = remainingMilliseconds !== null && remainingMilliseconds <= 0;
  const isUrgent = remainingMilliseconds !== null && remainingMilliseconds > 0 && remainingMilliseconds <= 5 * 60 * 1000;

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    if (isDeadlinePassed) {
      showToast('Tenggat Berakhir', 'Batas waktu pengumpulan sudah berakhir. Tunggu instruktur memperbarui deadline.', 'error');
      return;
    }
    const allowedType = (assignment.allowedFileType || 'PDF') as AllowedFileType;
    const rule = fileRule(allowedType);
    const lowerName = file.name.toLowerCase();
    const isAllowed = allowedType === 'ANY'
      ? true
      : allowedType === 'IMAGE'
      ? file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(lowerName)
      : lowerName.endsWith(`.${allowedType.toLowerCase()}`);
    if (!isAllowed) {
      showToast('Format Ditolak', `Tugas ini hanya menerima ${rule.label} (${rule.extensions}).`, 'error');
      return;
    }

    // Size limit 50MB (matches the Supabase submissions bucket limit)
    if (file.size > 50 * 1024 * 1024) {
      showToast('Ukuran Terlalu Besar', 'Ukuran file maksimal 50 MB.', 'error');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (isDeadlinePassed) {
      showToast('Tenggat Berakhir', 'Batas waktu pengumpulan sudah berakhir. Tunggu instruktur memperbarui deadline.', 'error');
      return;
    }
    setIsUploading(true);
    try {
      const result = await submitAssignment(
        assignment.id,
        selectedFile,
        assignment.submissionType || 'ASSIGNMENT',
        assignment.allowedFileType || 'PDF'
      );
      if (result.success) setSelectedFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 overflow-hidden">
        
        {/* Assignment Header */}
        <div className="flex flex-col md:flex-row items-start justify-between gap-3 md:gap-4 mb-4 pb-4 border-b border-slate-100">
          <div className="min-w-0 w-full">
            <div className="inline-flex max-w-full items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
              <FileText className="w-3.5 h-3.5" />
              <span className="leading-tight">Tugas Praktik (Wajib {fileRule((assignment.allowedFileType || 'PDF') as AllowedFileType).label})</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 break-words">{assignment.title}</h3>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed break-words">{assignment.description}</p>
          </div>

          <div className="w-full md:w-auto max-w-full text-left md:text-right shrink-0">
            <div className="flex flex-wrap items-center justify-start md:justify-end gap-2">
              <div className="inline-flex max-w-full min-w-0 items-start gap-1 text-[11px] sm:text-xs text-amber-600 font-medium bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200">
                <Clock className="w-3.5 h-3.5 shrink-0 mt-px" />
                <span className="min-w-0 leading-tight whitespace-normal break-words">Tenggat: {formatDeadline(assignment.deadline)}</span>
              </div>
              {remainingMilliseconds !== null && (
                <div
                  className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] sm:text-xs font-bold tabular-nums transition-colors ${
                    isDeadlinePassed || isUrgent
                      ? 'border-rose-300 bg-rose-50 text-rose-700'
                      : 'border-blue-200 bg-blue-50 text-blue-700'
                  } ${isUrgent ? 'animate-pulse' : ''}`}
                  aria-live="polite"
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span className="min-w-0 whitespace-normal break-words">
                    {isDeadlinePassed
                      ? 'Waktu pengumpulan telah berakhir'
                      : `Sisa waktu: ${formatRemainingTime(remainingMilliseconds)}`}
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">Bobot: {assignment.maxScore} Poin</p>
          </div>
        </div>

        {submission ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-800 break-all">{submission.fileName}</h4>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                      Terkumpul
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {submission.fileSize} • Diunggah pada {formatWitaDateTime(submission.submittedAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => setIsPreviewOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Lihat / Unduh File</span>
                </button>
              </div>
            </div>

            {/* Re-upload Option if period still active */}
            {!isPeriodExpired && !isDeadlinePassed && (
              <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
                <span>Ingin memperbarui file tugas?</span>
                <label className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer underline">
                  Ganti File
                  <input
                    type="file"
                    accept={fileRule((assignment.allowedFileType || 'PDF') as AllowedFileType).accept}
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        ) : (
          /* File Upload Dropzone */
          <div>
            {!isPeriodExpired && !isDeadlinePassed ? (
              <div>
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  className={`border-2 border-dashed rounded-xl p-4 sm:p-6 text-center transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/60'
                  }`}
                >
                  <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    Tarik dan lepas file {fileRule((assignment.allowedFileType || 'PDF') as AllowedFileType).label} tugas Anda di sini, atau
                  </p>
                  <label className="inline-block mt-2 px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-sm">
                    Pilih File
                    <input
                      type="file"
                    accept={fileRule((assignment.allowedFileType || 'PDF') as AllowedFileType).accept}
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-400 mt-2">Format: {fileRule((assignment.allowedFileType || 'PDF') as AllowedFileType).extensions} (Maks. 50 MB)</p>
                </div>

                {/* Selected File Preview before submit */}
                {selectedFile && (
                  <div className="mt-4 p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900 break-all">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        {isUploading ? 'Mengunggah...' : 'Kirim Tugas'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 flex items-start gap-3 text-sm leading-relaxed">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>
                  {isDeadlinePassed
                    ? 'Batas waktu pengumpulan tugas telah berakhir. Materi masih dapat diakses untuk dipelajari.'
                    : 'Periode pengumpulan tugas telah berakhir. Materi masih dapat diakses untuk dipelajari.'}
                </span>
              </div>
            )}
          </div>
        )}

      </div>

      {/* PDF Viewer Modal */}
      {submission && (
        <PDFViewerModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          title={submission.fileName}
          fileUrl={submission.fileUrl}
          fileSize={submission.fileSize}
          authorName={currentStudent?.name}
          submittedAt={formatWitaDateTime(submission.submittedAt)}
        />
      )}
    </>
  );
};
