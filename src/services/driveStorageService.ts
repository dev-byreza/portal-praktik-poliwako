// Google Drive & Local Storage Service
// Handles student file uploads directly to Google Drive via backend integration
import { ApiService } from './apiService';

export interface UploadSubmissionOptions {
  courseId: string;
  periodId: string;
  studentId: string;
  assignmentId?: string;
  taskTitle?: string;
  submissionType?: 'ASSIGNMENT' | 'REPORT' | 'POST_TEST' | 'REMEDIAL' | 'FINAL_PROJECT';
  allowedFileType?: 'PDF' | 'IMAGE' | 'ZIP' | 'RAR' | 'ANY' | 'AUTOCAD_LINK';
  replaceStoragePath?: string;
  deferSignedUrl?: boolean;
}

export interface UploadResult {
  storagePath: string | null;
  publicUrl: string | null;
  driveUrl?: string | null;
  error: Error | null;
}

export async function uploadSubmissionFile(
  file: File,
  options: UploadSubmissionOptions
): Promise<UploadResult> {
  const allowedType = options.allowedFileType || 'PDF';
  const lowerName = file.name.toLowerCase();

  const isAllowed =
    allowedType === 'ANY'
      ? true
      : allowedType === 'IMAGE'
      ? file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(lowerName)
      : allowedType === 'AUTOCAD_LINK'
      ? true
      : lowerName.endsWith(`.${allowedType.toLowerCase()}`) ||
        (allowedType === 'PDF' && lowerName.endsWith('.pdf')) ||
        (allowedType === 'ZIP' && (lowerName.endsWith('.zip') || lowerName.endsWith('.rar')));

  if (!isAllowed) {
    return {
      storagePath: null,
      publicUrl: null,
      error: new Error(`File tidak valid: format ${allowedType} tidak diizinkan untuk tugas ini.`),
    };
  }

  if (file.size > 100 * 1024 * 1024) {
    return {
      storagePath: null,
      publicUrl: null,
      error: new Error('Ukuran file melebihi batas maksimal 100MB.'),
    };
  }

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Gagal membaca file berkas.'));
      reader.readAsDataURL(file);
    });

    const isLiveBackend = ApiService.isLiveBackend();
    let uploadedUrl = dataUrl;
    let drivePath = `${options.courseId}/${options.periodId}/${options.studentId}/${Date.now()}_${file.name}`;
    let driveUrl: string | null = null;

    if (!isLiveBackend) {
      return {
        storagePath: drivePath,
        publicUrl: uploadedUrl,
        driveUrl: null,
        error: null,
      };
    }

    // Send to backend drive upload service — do not silently fall back to base64 on live backend
    const res = await fetch('/api/drive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upload_submission_file',
        payload: {
          courseId: options.courseId,
          periodId: options.periodId,
          studentId: options.studentId,
          assignmentId: options.assignmentId,
          taskTitle: options.taskTitle,
          fileName: file.name,
          fileBase64: dataUrl,
          mimeType: file.type || 'application/octet-stream',
          submissionType: options.submissionType || 'ASSIGNMENT',
        },
      }),
    });

    const rawText = await res.text().catch(() => '');
    let driveRes: any = null;
    try {
      driveRes = rawText ? JSON.parse(rawText) : null;
    } catch {
      driveRes = null;
    }

    if (!res.ok || !driveRes?.success || !driveRes?.driveFileId || !driveRes?.fileUrl) {
      const serverMsg =
        res.status === 413
          ? 'Ukuran berkas melebihi batas unggahan server serverless (~3 MB).'
          : driveRes?.error ||
            (rawText && rawText.length < 200 ? rawText : '') ||
            `Gagal mengunggah berkas ke Google Drive (HTTP ${res.status}).`;
      return {
        storagePath: null,
        publicUrl: null,
        driveUrl: null,
        error: new Error(serverMsg),
      };
    }

    uploadedUrl = driveRes.fileUrl;
    driveUrl = driveRes.driveUrl || driveRes.fileUrl;
    drivePath = driveRes.driveFileId;

    return {
      storagePath: drivePath,
      publicUrl: uploadedUrl,
      driveUrl,
      error: null,
    };
  } catch (err: any) {
    return {
      storagePath: null,
      publicUrl: null,
      error: err,
    };
  }
}

// Alias for backwards compatibility
export const uploadSubmissionPDF = uploadSubmissionFile;

export async function getSubmissionSignedUrl(
  storagePath: string,
  _download: string | boolean = false
): Promise<string | null> {
  if (!storagePath) return null;
  return storagePath;
}

export async function uploadQuizImage(
  fileOrUrl: any,
  _materialId?: string,
  _questionId?: string
): Promise<string | null> {
  if (!fileOrUrl) return null;
  if (typeof fileOrUrl === 'string') return fileOrUrl;
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Gagal membaca file gambar quiz.'));
      reader.readAsDataURL(fileOrUrl);
    });
    return dataUrl;
  } catch {
    return null;
  }
}
