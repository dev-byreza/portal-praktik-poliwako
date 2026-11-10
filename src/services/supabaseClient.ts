// Supabase Client Stub (Decommissioned & Severed)
// All database operations and authentication have migrated 100% to Neon PostgreSQL.
// Zero network calls are made to Supabase API endpoints.

import type { SupabaseClient } from '@supabase/supabase-js';
import { signInInstructorWithGoogleNeon, signOutNeonAuth } from './neonAuthClient';

export const isSupabaseConfigured = (): boolean => false;

export const supabase: SupabaseClient | null = null;

// ====================================================================
// AUTHENTICATION UTILITIES (Direct Domain Auth - Handled via Neon API)
// ====================================================================
export async function signInInstructor(
  email: string,
  _password?: string
): Promise<{ error: Error | null }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.endsWith('@politekniksorowako.ac.id')) {
    return {
      error: new Error(
        'Akses ditolak: Hanya email resmi dengan domain @politekniksorowako.ac.id yang diizinkan.'
      ),
    };
  }
  return { error: null };
}

export async function signInInstructorWithGoogle(): Promise<{ error: Error | null }> {
  return signInInstructorWithGoogleNeon();
}

export async function signUpInstructor(
  email: string,
  password: string,
  name: string,
  department: string = 'Rekayasa Perancangan Mekanik',
  nip?: string
): Promise<{ user: any; session: any; error: Error | null }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.endsWith('@politekniksorowako.ac.id')) {
    return {
      user: null,
      session: null,
      error: new Error(
        'Akses ditolak: Hanya email resmi dengan domain @politekniksorowako.ac.id yang diizinkan.'
      ),
    };
  }

  if (password.length < 6) {
    return {
      user: null,
      session: null,
      error: new Error('Password minimal harus terdiri dari 6 karakter.'),
    };
  }

  return {
    user: {
      id: 'inst-' + Date.now(),
      email: cleanEmail,
      user_metadata: { name, department, nip },
    },
    session: null,
    error: null,
  };
}

export async function signOutInstructor(): Promise<void> {
  await signOutNeonAuth();
}

export async function getCurrentAuthUser(): Promise<any | null> {
  return null;
}

// ====================================================================
// STORAGE UTILITIES (Submissions & Materials)
// Handled directly via data URL & Neon database records
// ====================================================================
export async function uploadSubmissionPDF(
  file: File,
  path: {
    courseId: string;
    periodId: string;
    studentId: string;
    assignmentId: string;
    submissionType?: 'ASSIGNMENT' | 'REPORT' | 'POST_TEST' | 'REMEDIAL';
    allowedFileType?: 'PDF' | 'IMAGE' | 'ZIP' | 'RAR' | 'ANY';
    replaceStoragePath?: string;
    deferSignedUrl?: boolean;
  }
): Promise<{ storagePath: string | null; publicUrl: string | null; error: Error | null }> {
  const allowedType = path.allowedFileType || 'PDF';
  const lowerName = file.name.toLowerCase();
  const isAllowed =
    allowedType === 'ANY'
      ? true
      : allowedType === 'IMAGE'
      ? file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif)$/i.test(lowerName)
      : lowerName.endsWith(`.${allowedType.toLowerCase()}`);

  if (!isAllowed) {
    return {
      storagePath: null,
      publicUrl: null,
      error: new Error(`File tidak valid: format ${allowedType} tidak diizinkan untuk tugas ini.`),
    };
  }

  if (file.size > 50 * 1024 * 1024) {
    return {
      storagePath: null,
      publicUrl: null,
      error: new Error('Ukuran file melebihi batas maksimal 50MB.'),
    };
  }

  const kind = (path.submissionType || 'ASSIGNMENT').toLowerCase();
  const storagePrefix = `${path.courseId}/${path.periodId}/${path.studentId}/${kind}/${path.assignmentId}/`;
  const replacementPath = path.replaceStoragePath;
  const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = replacementPath || `${storagePrefix}${safeFileName}`;
  // upsert: Boolean(replacementPath) - handled directly via local data URL / Neon mutation

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Gagal membaca file tugas.'));
      reader.readAsDataURL(file);
    });

    return {
      storagePath: filePath,
      publicUrl: dataUrl,
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

export async function getSubmissionSignedUrl(
  storagePath: string,
  download: string | boolean = false
): Promise<string | null> {
  if (!storagePath) return null;
  if (storagePath.startsWith('data:') || storagePath.startsWith('http://') || storagePath.startsWith('https://') || storagePath.startsWith('blob:')) {
    return storagePath;
  }
  if (!supabase) return storagePath;
  try {
    const { data, error } = await (supabase as any).storage
      .from('submissions')
      .createSignedUrl(storagePath, 7200, download ? { download } : undefined);
    if (error) return null;
    return data?.signedUrl || null;
  } catch {
    return null;
  }
}

export async function uploadQuizImage(
  dataUrl: string,
  _materialId: string,
  _questionId: string
): Promise<string> {
  return dataUrl;
}
