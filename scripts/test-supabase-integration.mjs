import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = { ...process.env };
if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*(VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY)\s*=\s*(.*?)\s*$/);
    if (match && !env[match[1]]) env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

const url = env.VITE_SUPABASE_URL;
const publicKey = env.VITE_SUPABASE_ANON_KEY;
if (!url || !publicKey) {
  console.log('SKIP: Supabase schema smoke test (public URL/key are not configured).');
  process.exit(0);
}

const client = createClient(url, publicKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const schemaChecks = [
  ['assessments', 'id,period_id,student_id,is_published'],
  ['attendance_records', 'id,period_id,student_id'],
  ['submissions', 'id,period_id,student_id,storage_path,status'],
  ['remedial_assignments', 'id,period_id,student_id,submission_storage_path,deadline,status'],
];

for (const [table, columns] of schemaChecks) {
  const { error } = await client.from(table).select(columns).limit(0);
  if (error) {
    console.error(`FAIL: Supabase schema smoke test for ${table} (${error.code || 'request error'}).`);
    process.exit(1);
  }
}

const { data: invalidEnrollmentSession, error: enrollmentError } = await client.rpc(
  'student_list_course_enrollments',
  { p_session_token: 'invalid-regression-test-token' },
);
if (enrollmentError || !Array.isArray(invalidEnrollmentSession) || invalidEnrollmentSession.length !== 0) {
  console.error(`FAIL: session-scoped enrollment RPC rejected an invalid token incorrectly (${enrollmentError?.code || 'unexpected rows'}).`);
  process.exit(1);
}
const { data: invalidPeriodSession, error: periodSessionError } = await client.rpc(
  'student_create_period_session',
  {
    p_session_token: 'invalid-regression-test-token',
    p_course_slug: 'invalid-course',
    p_period_id: '00000000-0000-0000-0000-000000000000',
  },
);
if (periodSessionError || invalidPeriodSession?.success !== false) {
  console.error(`FAIL: period-session RPC did not deny an invalid token (${periodSessionError?.code || 'unexpected response'}).`);
  process.exit(1);
}
const { data: invalidRestoreSession, error: restoreSessionError } = await client.rpc(
  'student_restore_session_profile',
  { p_session_token: 'invalid-regression-test-token' },
);
if (restoreSessionError || invalidRestoreSession?.success !== false) {
  console.error(`FAIL: profile-restore RPC did not deny an invalid token (${restoreSessionError?.code || 'unexpected response'}).`);
  process.exit(1);
}

const { data: missingPasswordStudent, error: passwordSetupError } = await client.rpc(
  'student_auth_set_password',
  {
    p_nim: 'regression-missing-student-' + crypto.randomUUID(),
    p_password: 'Regression-password-1',
    p_course_slug: null,
    p_period_id: null,
  },
);
if (passwordSetupError || missingPasswordStudent?.success !== false || missingPasswordStudent?.message !== 'NIM tidak ditemukan.') {
  console.error(`FAIL: code-free password RPC did not deny a missing student (${passwordSetupError?.code || 'unexpected response'}).`);
  process.exit(1);
}
const { error: anonymousResetError } = await client.rpc('student_auth_reset_password', {
  p_student_id: '00000000-0000-0000-0000-000000000000',
});
if (!anonymousResetError || anonymousResetError.code !== '42501') {
  console.error(`FAIL: anonymous callers must not execute password reset (${anonymousResetError?.code || 'unexpected access'}).`);
  process.exit(1);
}

console.log(`PASS: Supabase Data API smoke test (${schemaChecks.length} tables; invalid session tokens, missing password student, and anonymous reset denied).`);
