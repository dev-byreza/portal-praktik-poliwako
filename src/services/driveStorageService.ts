// Google Drive & Local Storage Service
// Handles student file uploads directly to Google Drive via backend integration

export interface UploadSubmissionOptions {
  courseId: string;
  periodId: string;
  studentId: string;
  assignmentId?: string;
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

    let uploadedUrl = dataUrl;
    let drivePath = `${options.courseId}/${options.periodId}/${options.studentId}/${Date.now()}_${file.name}`;
    let driveUrl: string | null = null;

    // Send to backend drive upload service
    try {
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
            fileName: file.name,
            fileBase64: dataUrl,
            mimeType: file.type || 'application/octet-stream',
            submissionType: options.submissionType || 'ASSIGNMENT',
          },
        }),
      });

      const driveRes = await res.json().catch(() => null);
      if (res.ok && driveRes?.fileUrl) {
        uploadedUrl = driveRes.fileUrl;
        driveUrl = driveRes.driveUrl || null;
        if (driveRes.driveFileId) {
          drivePath = driveRes.driveFileId;
        }
      }
    } catch (driveErr) {
      console.warn('Backend Drive upload warning, using data fallback:', driveErr);
    }

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
