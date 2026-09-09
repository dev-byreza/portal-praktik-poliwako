// Supabase Client & Storage / Auth Utilities
// Target: Supabase Cloud / Self-hosted instance
// PRD Reference: Section 8, 43, 72, 80, 83

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseAnonKey.length > 20
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// ====================================================================
// AUTHENTICATION UTILITIES (Direct Email Auth with @politekniksorowako.ac.id)
// ====================================================================
export async function signInInstructor(
  email: string,
  password?: string
): Promise<{ error: Error | null }> {
  // Validate domain requirement
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.endsWith('@politekniksorowako.ac.id')) {
    return {
      error: new Error(
        'Akses ditolak: Hanya email resmi dengan domain @politekniksorowako.ac.id yang diizinkan.'
      ),
    };
  }

  if (!supabase) {
    // Local / Offline mode: valid domain permits instant sign-in
    return { error: null };
  }

  try {
    if (password) {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (error) throw error;
    } else {
      // Magic link or direct OTP without password
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
      });
      if (error) throw error;
    }
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

export async function signUpInstructor(
  email: string,
  password: string,
  name: string,
  department: string = 'Rekayasa Perancangan Mekanik',
  nip?: string
): Promise<{ user: any; error: Error | null }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail.endsWith('@politekniksorowako.ac.id')) {
    return {
      user: null,
      error: new Error(
        'Akses ditolak: Hanya email resmi dengan domain @politekniksorowako.ac.id yang diizinkan.'
      ),
    };
  }

  if (password.length < 6) {
    return {
      user: null,
      error: new Error('Password minimal harus terdiri dari 6 karakter.'),
    };
  }

  if (!supabase) {
    return {
      user: {
        id: 'inst-' + Date.now(),
        email: cleanEmail,
        user_metadata: { name, department, nip }
      },
      error: null
    };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: name.trim(),
          full_name: name.trim(),
          department: department.trim(),
          nip: nip?.trim() || '',
        },
      },
    });

    if (error) throw error;

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: cleanEmail,
        name: name.trim(),
        department: department.trim(),
        nip: nip?.trim() || null,
        updated_at: new Date().toISOString()
      });
    }

    return { user: data.user, error: null };
  } catch (err: any) {
    return { user: null, error: err };
  }
}

export async function signOutInstructor(): Promise<void> {
  if (supabase) {
    await supabase.auth.signOut();
  }
}

export async function getCurrentAuthUser() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}


// ====================================================================
// STORAGE UTILITIES (Submissions & Materials PDF)
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
  }
): Promise<{ storagePath: string | null; publicUrl: string | null; error: Error | null }> {
  // Validate file type
  const allowedType = path.allowedFileType || 'PDF';
  const lowerName = file.name.toLowerCase();
  const isAllowed = allowedType === 'ANY'
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

  // Max 50 MB (matches the Supabase submissions bucket limit)
  if (file.size > 50 * 1024 * 1024) {
    return {
      storagePath: null,
      publicUrl: null,
      error: new Error('Ukuran file melebihi batas maksimal 50MB.'),
    };
  }

  const kind = (path.submissionType || 'ASSIGNMENT').toLowerCase();
  const storagePrefix = `${path.courseId}/${path.periodId}/${path.studentId}/${kind}/${path.assignmentId}/`;
  const replacementPath = path.replaceStoragePath?.startsWith(storagePrefix)
    ? path.replaceStoragePath
    : undefined;
  const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  // Re-uploads reuse the existing object path, so the old file content is
  // replaced in Storage instead of leaving an orphaned previous submission.
  const filePath = replacementPath || `${storagePrefix}${safeFileName}`;

  if (!supabase) {
    return {
      storagePath: null,
      publicUrl: null,
      error: new Error('Penyimpanan Supabase belum terhubung. File tidak dikirim.'),
    };
  }

  try {
    // Browsers report different MIME values for ZIP/RAR files. Normalize the
    // value so Supabase Storage accepts the upload consistently and the
    // instructor can open the same object later using its signed URL.
    const contentType = allowedType === 'ANY'
      ? (file.type || 'application/octet-stream')
      : allowedType === 'PDF'
      ? 'application/pdf'
      : allowedType === 'IMAGE'
        ? (file.type || 'image/*')
        : allowedType === 'ZIP'
          ? 'application/zip'
          : 'application/vnd.rar';

    const { error: uploadError } = await supabase.storage
      .from('submissions')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      });

    if (uploadError) throw uploadError;

    // Submissions bucket is private; create a signed URL (valid for 2 hours)
    const { data: signedData, error: signError } = await supabase.storage
      .from('submissions')
      .createSignedUrl(filePath, 7200);

    if (signError) throw signError;

    return {
      storagePath: filePath,
      publicUrl: signedData?.signedUrl || null,
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

export async function getSubmissionSignedUrl(storagePath: string): Promise<string | null> {
  if (!supabase || !storagePath) return null;
  try {
    const { data, error } = await supabase.storage
      .from('submissions')
      .createSignedUrl(storagePath, 7200);
    if (error) return null;
    return data?.signedUrl || null;
  } catch {
    return null;
  }
}
