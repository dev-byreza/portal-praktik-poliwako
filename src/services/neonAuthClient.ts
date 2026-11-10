// Neon Managed Better Auth Client
// Direct integration with Neon Auth (Better Auth) for Google OAuth and Session Management
// Target: https://ep-quiet-lab-b39rfs7j.neonauth.c-4.ap-southeast-1.aws.neon.tech/neondb/auth

const NEON_AUTH_URL =
  import.meta.env.VITE_NEON_AUTH_URL || '/api/auth';

export interface NeonUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NeonSession {
  id: string;
  userId: string;
  expiresAt: string;
  token?: string;
}

export interface NeonAuthSessionResult {
  user: NeonUser;
  session: NeonSession;
}

/**
 * Initiates Google OAuth Sign-In via Neon Managed Better Auth.
 * Redirects the browser to Google's consent screen and returns to callbackURL.
 */
export async function signInInstructorWithGoogleNeon(): Promise<{ error: Error | null }> {
  if (typeof window === 'undefined') return { error: null };

  try {
    const callbackURL = `${window.location.origin}/instruktur`;
    const res = await fetch(`${NEON_AUTH_URL}/sign-in/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        provider: 'google',
        callbackURL,
      }),
    });

    const data = await res.json().catch(() => null);
    if (data?.url) {
      window.location.href = data.url;
      return { error: null };
    }

    return {
      error: new Error(
        data?.message || 'Gagal memulai login Google melalui Neon Better Auth.'
      ),
    };
  } catch (err: any) {
    console.error('Neon Better Auth Google Sign-in error:', err);
    return {
      error: new Error(
        err?.message || 'Tidak dapat terhubung ke server autentikasi Neon.'
      ),
    };
  }
}

/**
 * Checks for an active session with Neon Managed Better Auth.
 */
export async function getNeonAuthSession(): Promise<NeonAuthSessionResult | null> {
  if (typeof window === 'undefined') return null;

  try {
    const searchParams = new URLSearchParams(window.location.search);
    const verifier = searchParams.get('neon_auth_session_verifier');
    const endpoint = verifier
      ? `${NEON_AUTH_URL}/get-session?neon_auth_session_verifier=${encodeURIComponent(verifier)}`
      : `${NEON_AUTH_URL}/get-session`;

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    const data = await res.json().catch(() => null);
    const user = data?.user || data?.data?.user;
    const session = data?.session || data?.data?.session;

    if (user && user.email) {
      if (verifier && typeof window.history?.replaceState === 'function') {
        searchParams.delete('neon_auth_session_verifier');
        const cleanQuery = searchParams.toString();
        const cleanUrl = window.location.pathname + (cleanQuery ? `?${cleanQuery}` : '') + window.location.hash;
        window.history.replaceState({}, '', cleanUrl);
      }
      return { user, session: session || { id: 'neon-' + Date.now(), userId: user.id, expiresAt: '' } } as NeonAuthSessionResult;
    }
  } catch (err) {
    console.warn('Neon Better Auth getSession error:', err);
  }
  return null;
}

/**
 * Signs out the session from Neon Managed Better Auth.
 */
export async function signOutNeonAuth(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    await fetch(`${NEON_AUTH_URL}/sign-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
  } catch (err) {
    console.warn('Neon Better Auth signOut error:', err);
  }
}

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

export async function getCurrentAuthUser(): Promise<any | null> {
  const session = await getNeonAuthSession();
  return session?.user || null;
}

export const mockClient: any = null;
