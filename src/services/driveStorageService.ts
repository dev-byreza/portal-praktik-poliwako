// Google Drive & Local Storage Service
// Handles student file uploads directly to Google Drive via backend integration
import { ApiService } from './apiService';

export type UploadProgressCallback = (percent: number, statusText: string) => void;

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
  onProgress?: UploadProgressCallback;
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

  // Max 50 MB for Google Drive Direct Resumable Upload
  if (file.size > 50 * 1024 * 1024) {
    return {
      storagePath: null,
      publicUrl: null,
      error: new Error('Ukuran file melebihi batas maksimal (50 MB). Silakan kompres berkas Anda terlebih dahulu.'),
    };
  }

  const isLiveBackend = ApiService.isLiveBackend();
  let drivePath = `${options.courseId}/${options.periodId}/${options.studentId}/${Date.now()}_${file.name}`;

  if (!isLiveBackend) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Gagal membaca file berkas.'));
      reader.readAsDataURL(file);
    });
    return {
      storagePath: drivePath,
      publicUrl: dataUrl,
      driveUrl: null,
      error: null,
    };
  }

  // ---------------------------------------------------------------
  // METHOD A: Google Drive Direct Resumable Upload (Bypass Vercel 4.5MB)
  // Streams the raw binary file directly from browser to Google Drive!
  // ---------------------------------------------------------------
  try {
    options.onProgress?.(8, 'Menyiapkan sesi Google Drive...');
    const initRes = await fetch('/api/drive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'init_direct_upload',
        payload: {
          courseId: options.courseId,
          periodId: options.periodId,
          studentId: options.studentId,
          assignmentId: options.assignmentId,
          taskTitle: options.taskTitle,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          submissionType: options.submissionType || 'ASSIGNMENT',
          replaceStoragePath: options.replaceStoragePath,
        },
      }),
    });

    const initData = await initRes.json().catch(() => ({}));
    if (initRes.ok && initData?.success && initData?.uploadUrl) {
      options.onProgress?.(15, 'Mulai mengunggah berkas...');

      // Direct stream PUT to Google Drive via XMLHttpRequest for real-time progress events
      const driveUploadData = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', initData.uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

        if (xhr.upload) {
          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable && evt.total > 0) {
              const rawPercent = Math.min(100, Math.round((evt.loaded / evt.total) * 100));
              // Map byte stream from 15% to 85%
              const mappedPercent = Math.round(15 + (rawPercent * 0.70));
              options.onProgress?.(mappedPercent, `Mengunggah berkas (${rawPercent}%)...`);
            }
          };
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              resolve({});
            }
          } else {
            reject(new Error(`Drive upload failed (${xhr.status}): ${xhr.responseText}`));
          }
        };

        xhr.onerror = () => reject(new Error('Koneksi terputus saat mengunggah berkas ke Google Drive.'));
        xhr.ontimeout = () => reject(new Error('Waktu pengunggahan habis (timeout).'));
        xhr.send(file);
      });

      if (driveUploadData?.id) {
        options.onProgress?.(88, 'Menyimpan tautan dan hak akses berkas...');
        const finRes = await fetch('/api/drive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'finalize_direct_upload',
            payload: {
              fileId: driveUploadData.id,
              driveFileName: initData.driveFileName || file.name,
              periodId: options.periodId,
              studentId: options.studentId,
              submissionType: options.submissionType || 'ASSIGNMENT',
              taskFolderName: initData.taskFolderName,
              taskFolderUrl: initData.taskFolderUrl,
              replaceStoragePath: options.replaceStoragePath,
            },
          }),
        });

        const finData = await finRes.json().catch(() => ({}));
        if (finRes.ok && finData?.success && finData?.fileUrl) {
          options.onProgress?.(100, 'Pengunggahan berhasil!');
          return {
            storagePath: finData.driveFileId,
            publicUrl: finData.fileUrl,
            driveUrl: finData.driveUrl || finData.fileUrl,
            error: null,
          };
        }
      }
    }
  } catch (directErr) {
    console.warn('Direct resumable upload failed, attempting fallback if file is small:', directErr);
  }

  // ---------------------------------------------------------------
  // METHOD B: Serverless Proxy Fallback (for files <= 4.5 MB only)
  // ---------------------------------------------------------------
  if (file.size > 4.5 * 1024 * 1024) {
    return {
      storagePath: null,
      publicUrl: null,
      driveUrl: null,
      error: new Error('Gagal mengunggah berkas besar langsung ke Google Drive. Periksa koneksi internet Anda atau kompres berkas di bawah 4.5 MB.'),
    };
  }

  try {
    options.onProgress?.(25, 'Membaca berkas...');
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Gagal membaca file berkas.'));
      reader.readAsDataURL(file);
    });

    options.onProgress?.(50, 'Mengirim berkas melalui server...');
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
          replaceStoragePath: options.replaceStoragePath,
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
        driveRes?.error ||
        (rawText && rawText.length < 200 ? rawText : '') ||
        `Gagal mengunggah berkas ke Google Drive (HTTP ${res.status}).`;
      return {
        storagePath: null,
        publicUrl: null,
        driveUrl: null,
        error: new Error(serverMsg),
      };
    }

    options.onProgress?.(100, 'Pengunggahan berhasil!');
    return {
      storagePath: driveRes.driveFileId,
      publicUrl: driveRes.fileUrl,
      driveUrl: driveRes.driveUrl || driveRes.fileUrl,
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
