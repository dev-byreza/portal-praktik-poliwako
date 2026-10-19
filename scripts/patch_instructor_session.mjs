import fs from 'fs';

const filePath = 'src/services/apiService.ts';
let code = fs.readFileSync(filePath, 'utf8');

// 1. Update logout and getCurrentInstructorId
const target1 = `  static async logout(): Promise<void> {
    await authSignOutInstructor();
  }

  static async getCurrentInstructorId(): Promise<string | null> {
    if (typeof window !== 'undefined'
      && window.location.pathname.replace(/\\/+$/, '').toLowerCase() === '/mahasiswa'
      && new URLSearchParams(window.location.search).get('student_reset') === '1') {
      return null;
    }
    const user = await getCurrentAuthUser();
    return user?.id || null;
  }`;

const replacement1 = `  static async logout(): Promise<void> {
    StorageService.setInstructorLoggedIn(false);
    try {
      await authSignOutInstructor();
    } catch {}
  }

  static async getCurrentInstructorId(): Promise<string | null> {
    if (typeof window !== 'undefined'
      && window.location.pathname.replace(/\\/+$/, '').toLowerCase() === '/mahasiswa'
      && new URLSearchParams(window.location.search).get('student_reset') === '1') {
      return null;
    }
    // Prioritize Neon instructor session
    if (StorageService.isInstructorLoggedIn()) {
      const saved = StorageService.getInstructor();
      if (saved?.id) return saved.id;
    }
    const user = await getCurrentAuthUser();
    return user?.id || null;
  }`;

// 2. Update getInstructorProfile
const target2 = `  static async getInstructorProfile(userId?: string): Promise<InstructorProfile> {
    if (!this.isLiveBackend() || !supabase || !userId) {
      return StorageService.getInstructor();
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error || !data) return StorageService.getInstructor();
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        nip: data.nip || undefined,
        department: data.department || 'Teknik Mesin',
        avatarUrl: data.avatar_url || undefined,
      };
    } catch {
      return StorageService.getInstructor();
    }
  }`;

const replacement2 = `  static async getInstructorProfile(userId?: string): Promise<InstructorProfile> {
    const saved = StorageService.getInstructor();
    if (saved?.id && (!userId || saved.id === userId)) {
      return saved;
    }
    try {
      const neon = await getNeonBootstrapData();
      if (userId && neon?.instructorDirectory?.[userId]) {
        const d = neon.instructorDirectory[userId];
        return {
          id: userId,
          email: saved?.email || '',
          name: d.name || 'Instruktur',
          nip: d.nip || undefined,
          department: d.department || 'Teknik Mesin',
          avatarUrl: d.avatarUrl || undefined,
        };
      }
    } catch {}
    if (!this.isLiveBackend() || !supabase || !userId) {
      return StorageService.getInstructor();
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error || !data) return StorageService.getInstructor();
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        nip: data.nip || undefined,
        department: data.department || 'Teknik Mesin',
        avatarUrl: data.avatar_url || undefined,
      };
    } catch {
      return StorageService.getInstructor();
    }
  }`;

// Normalize line endings for replacement
const normalize = (s) => s.replace(/\r\n/g, '\n');

let normalizedCode = normalize(code);
const normalizedT1 = normalize(target1);
const normalizedT2 = normalize(target2);

if (normalizedCode.includes(normalizedT1)) {
  normalizedCode = normalizedCode.replace(normalizedT1, normalize(replacement1));
  console.log('Successfully replaced target1 (getCurrentInstructorId & logout)');
} else {
  console.warn('target1 not found!');
}

if (normalizedCode.includes(normalizedT2)) {
  normalizedCode = normalizedCode.replace(normalizedT2, normalize(replacement2));
  console.log('Successfully replaced target2 (getInstructorProfile)');
} else {
  console.warn('target2 not found!');
}

fs.writeFileSync(filePath, normalizedCode, 'utf8');
console.log('Saved patched apiService.ts');
