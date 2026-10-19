import fs from 'fs';

const appCtxPath = 'src/context/AppContext.tsx';
let appCtx = fs.readFileSync(appCtxPath, 'utf8');

// 1. Patch initial states in AppContext.tsx
const oldState = `  const [isInstructorLoggedIn, setIsInstructorLoggedIn] = useState<boolean>(() => (
    isLiveBackend ? false : StorageService.isInstructorLoggedIn()
  ));
  const [role, setRole] = useState<UserRole>(() => (
    isLiveBackend ? 'STUDENT' : (StorageService.isInstructorLoggedIn() ? 'INSTRUCTOR' : 'STUDENT')
  ));
  const [instructor, setInstructor] = useState<InstructorProfile>(() => (
    isLiveBackend ? { id: '', email: '', name: '', department: '' } : StorageService.getInstructor()
  ));`;

const newState = `  const [isInstructorLoggedIn, setIsInstructorLoggedIn] = useState<boolean>(() => (
    StorageService.isInstructorLoggedIn()
  ));
  const [role, setRole] = useState<UserRole>(() => (
    StorageService.isInstructorLoggedIn() ? 'INSTRUCTOR' : 'STUDENT'
  ));
  const [instructor, setInstructor] = useState<InstructorProfile>(() => (
    StorageService.getInstructor()
  ));`;

// 2. Patch onAuthStateChange in AppContext.tsx
const oldAuth = `    const { data: { subscription } } = authClient.auth.onAuthStateChange((event, session) => {
      if (!session || event === 'SIGNED_OUT') {
        clearLiveInstructorSession();
        return;
      }`;

const newAuth = `    const { data: { subscription } } = authClient.auth.onAuthStateChange((event, session) => {
      // If logged in via Neon, do not let Supabase empty session reset the instructor
      if (StorageService.isInstructorLoggedIn()) {
        return;
      }
      if (!session || event === 'SIGNED_OUT') {
        clearLiveInstructorSession();
        return;
      }`;

const normalize = (s) => s.replace(/\r\n/g, '\n');

let normAppCtx = normalize(appCtx);
if (normAppCtx.includes(normalize(oldState))) {
  normAppCtx = normAppCtx.replace(normalize(oldState), normalize(newState));
  console.log('Patched initial state in AppContext.tsx');
} else {
  console.warn('oldState not found in AppContext.tsx');
}

if (normAppCtx.includes(normalize(oldAuth))) {
  normAppCtx = normAppCtx.replace(normalize(oldAuth), normalize(newAuth));
  console.log('Patched onAuthStateChange in AppContext.tsx');
} else {
  console.warn('oldAuth not found in AppContext.tsx');
}

fs.writeFileSync(appCtxPath, normAppCtx, 'utf8');

// 3. Patch AuthLoginModal.tsx to navigate to /instruktur on login success
const modalPath = 'src/components/instructor/AuthLoginModal.tsx';
let modalCode = fs.readFileSync(modalPath, 'utf8');
let normModal = normalize(modalCode);

const oldModalSuccess = `      const result = await loginInstructor(loginEmail, loginPassword);
      if (result.success) {
        onClose();
      } else {`;

const newModalSuccess = `      const result = await loginInstructor(loginEmail, loginPassword);
      if (result.success) {
        onClose();
        if (typeof window !== 'undefined' && window.location.pathname.replace(/^\\/+|\\/+$/g, '').toLowerCase() !== 'instruktur') {
          window.location.href = '/instruktur';
        }
      } else {`;

if (normModal.includes(normalize(oldModalSuccess))) {
  normModal = normModal.replace(normalize(oldModalSuccess), normalize(newModalSuccess));
  console.log('Patched AuthLoginModal.tsx');
  fs.writeFileSync(modalPath, normModal, 'utf8');
} else {
  console.warn('oldModalSuccess not found in AuthLoginModal.tsx');
}
