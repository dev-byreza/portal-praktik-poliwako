// Student Assignment & PDF Submission Card

import React, { useState } from 'react';
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

interface StudentAssignmentCardProps {
  assignment: Assignment;
  submission?: Submission;
  isPeriodExpired?: boolean;
}

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
    // PDF Only Validation (PRD Section 42)
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Format Ditolak', 'Hanya file berformat PDF (.pdf) yang diperbolehkan untuk pengumpulan tugas.', 'error');
      return;
    }

    // Size limit 25MB
    if (file.size > 25 * 1024 * 1024) {
      showToast('Ukuran Terlalu Besar', 'Ukuran file PDF maksimal 25 MB.', 'error');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFile || !currentStudent || !studentSession) return;

    setIsUploading(true);
    setTimeout(() => {
      const formattedSize = `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB`;
      const fileName = `${currentStudent.nim}_${currentStudent.name.replace(/\s+/g, '_')}_${selectedFile.name}`;
      
      // Store dummy sample link
      submitAssignment(
        assignment.id,
        fileName,
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        formattedSize
      );

      setSelectedFile(null);
      setIsUploading(false);
    }, 600);
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
        
        {/* Assignment Header */}
        <div className="flex items-start justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
              <FileText className="w-3.5 h-3.5" />
              <span>Tugas Praktik (Wajib PDF)</span>
            </div>
            <h3 className="text-base font-bold text-slate-900">{assignment.title}</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{assignment.description}</p>
          </div>

          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              <Clock className="w-3.5 h-3.5" />
              <span>Deadline: {assignment.deadline}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Bobot: {assignment.maxScore} Poin</p>
          </div>
        </div>

        {/* Existing Submission Details */}
        {submission ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-800">{submission.fileName}</h4>
                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                      Terkumpul
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {submission.fileSize} • Diunggah pada {submission.submittedAt}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPreviewOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Lihat PDF</span>
                </button>
              </div>
            </div>

            {/* Re-upload Option if period still active */}
            {!isPeriodExpired && (
              <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>Ingin memperbarui file tugas?</span>
                <label className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer underline">
                  Ganti File PDF
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
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
            {!isPeriodExpired ? (
              <div>
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleFileDrop}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/60'
                  }`}
                >
                  <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700">
                    Tarik dan lepas file PDF tugas Anda di sini, atau
                  </p>
                  <label className="inline-block mt-2 px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-sm">
                    Pilih File PDF
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-400 mt-2">Hanya format PDF (Maks. 25 MB)</p>
                </div>

                {/* Selected File Preview before submit */}
                {selectedFile && (
                  <div className="mt-4 p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900">{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
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
              <div className="p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 flex items-center gap-3 text-xs">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Periode pengumpulan tugas telah berakhir. Materi masih dapat diakses untuk dipelajari.</span>
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
          submittedAt={submission.submittedAt}
        />
      )}
    </>
  );
};
