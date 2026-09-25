const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
function loadTypeScript(relativePath) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
  } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(js, { module, exports: module.exports, Date, Intl, console, require: () => ({}) });
  return module.exports;
}

const { submissionDeadline, isSubmissionClosed } = loadTypeScript('src/utils/submissionDeadline.ts');
const witaDeadline = Date.parse('2026-09-25T23:59:00+08:00');
assert.equal(submissionDeadline('2026-09-25 23:59 WITA'), witaDeadline);
assert.equal(submissionDeadline('2026-09-25T23:59'), witaDeadline);
assert.equal(isSubmissionClosed('2026-09-25 23:59 WITA', witaDeadline - 1), false);
assert.equal(isSubmissionClosed('2026-09-25 23:59 WITA', witaDeadline + 1), true);

const { getKnownProdiFromClass } = loadTypeScript('src/utils/academicUtils.ts');
assert.equal(getKnownProdiFromClass('1C').code, 'RPM', 'A database class 1C must map to the RPM study program');
assert.equal(getKnownProdiFromClass('1C').name, 'Rekayasa Perancangan Mekanik');
assert.match(getKnownProdiFromClass('1C').badgeClass, /yellow/, 'RPM ornaments must be yellow');
assert.equal(getKnownProdiFromClass('2D').code, 'TRPF', 'A database class 2D must map to the TRPF study program');
assert.equal(getKnownProdiFromClass('2D').name, 'Teknologi Rekayasa Pengelasan dan Fabrikasi');
assert.match(getKnownProdiFromClass('2D').badgeClass, /red/, 'TRPF ornaments must be red');
assert.equal(getKnownProdiFromClass('2A').code, 'PPM', 'A database class 2A must map to the PPM study program');
assert.equal(getKnownProdiFromClass('2A').name, 'Perawatan dan Perbaikan Mesin');
assert.match(getKnownProdiFromClass('2A').badgeClass, /blue/, 'PPM ornaments must be blue');
assert.equal(getKnownProdiFromClass(''), null, 'A missing class must not be guessed as PPM');
assert.equal(getKnownProdiFromClass('unknown'), null, 'An unknown class must not be guessed as PPM');
const studentLoginSource = fs.readFileSync(path.join(root, 'src/components/student/StudentIdentityModal.tsx'), 'utf8');
assert.match(studentLoginSource, /getKnownProdiFromClass\(targetStudent\?\.className\)/, 'Login must derive prodi only from an available verified class');
assert.match(studentLoginSource, /targetStudyProgram\?\.code/, 'Login must show the database-derived prodi before password entry');
const studentProgramMigrationFile = fs.readdirSync(path.join(root, 'supabase/migrations'))
  .find(file => file.endsWith('_add_student_program_name_to_auth_lookup.sql'));
assert.ok(studentProgramMigrationFile, 'The study-program lookup migration must exist');
const studentProgramMigration = fs.readFileSync(path.join(root, 'supabase/migrations', studentProgramMigrationFile), 'utf8');
assert.match(studentProgramMigration, /'studyProgramName', v_program_name/);
assert.match(studentProgramMigration, /v_student\.class_name/);

const { parseGradingScore } = loadTypeScript('src/utils/gradingScoreInput.ts');
assert.equal(parseGradingScore('82.75'), 82.75, 'Grading inputs must preserve decimal scores');
assert.equal(parseGradingScore('1.005'), 1.01, 'Scores must round to hundredth-point precision');
assert.equal(parseGradingScore('100.5'), 100, 'Scores must stay within the 0–100 range');
assert.equal(parseGradingScore('-0.5'), 0, 'Negative scores must be clamped to zero');
assert.equal(parseGradingScore('0'), 0, 'A score of zero must remain valid');
const gradingWorkspaceSource = fs.readFileSync(path.join(root, 'src/components/instructor/GradingWorkspace.tsx'), 'utf8');
assert.equal((gradingWorkspaceSource.match(/step=\{0\.01\}/g) || []).length, 4, 'All four numeric grading fields must accept hundredths');
assert.equal((gradingWorkspaceSource.match(/inputMode="decimal"/g) || []).length, 4, 'All numeric grading fields must offer a decimal keypad on mobile');
assert.equal((gradingWorkspaceSource.match(/parseGradingScore\(e\.target\.value\)/g) || []).length, 4, 'All numeric grading fields must use the decimal-safe parser');
const assessmentSchema = fs.readFileSync(path.join(root, 'supabase/migrations/0000_initial_schema.sql'), 'utf8');
assert.match(assessmentSchema, /entry_behavior_score NUMERIC\(5,2\)/, 'Supabase assessment fields must persist decimal grades');

const { preparePeriodGradePublication, preparePeriodGradeUnpublication } = loadTypeScript('src/utils/gradePublication.ts');
const grades = [
  { id: 'zero-grade', periodId: 'p1', studentId: 's1', finalScore: 0, isPublished: false },
  { id: 'blocked-grade', periodId: 'p1', studentId: 's2', finalScore: 72, isPublished: true },
  { id: 'other-period', periodId: 'p2', studentId: 's3', finalScore: 90, isPublished: false },
];
const attendance = [
  { periodId: 'p1', studentId: 's1', percentage: 100, isEligible: true },
  { periodId: 'p1', studentId: 's2', percentage: 60, isEligible: false },
];
const remedials = [{ periodId: 'p1', studentId: 's2', status: 'BELUM_LULUS' }];
const publication = preparePeriodGradePublication(grades, 'p1', attendance, remedials, '2026-09-25T12:00:00.000Z');
assert.equal(publication.publishedCount, 1, 'A saved score of zero must still be publishable');
assert.equal(publication.blockedCount, 1, 'A student below 75% with incomplete remedials stays blocked');
assert.equal(publication.assessments[0].isPublished, true);
assert.equal(publication.assessments[1].isPublished, false);
assert.equal(publication.assessments[2], grades[2], 'Publishing one period must leave other periods untouched');
assert.equal(grades[0].isPublished, false, 'Preparing a publish must not mutate the source cache');
const withdrawn = preparePeriodGradeUnpublication(publication.assessments, 'p1');
assert.equal(withdrawn[0].isPublished, false, 'Unpublishing must include zero-point assessments');
assert.equal(withdrawn[1].isPublished, false);
assert.equal(withdrawn[2], grades[2]);

const scopedPolicyMigration = fs.readFileSync(path.join(root, 'supabase/migrations/20260925002500_student_session_row_security.sql'), 'utf8');
const activationMigration = fs.readFileSync(path.join(root, 'supabase/migrations/20260925045000_harden_student_activation_and_quiz_storage.sql'), 'utf8');
const studentEnrollmentMigrationFile = fs.readdirSync(path.join(root, 'supabase/migrations'))
  .find(file => file.endsWith('_add_session_scoped_student_enrollment_rpc.sql'));
assert.ok(studentEnrollmentMigrationFile, 'Student enrollment must have a server-authoritative session RPC');
const studentEnrollmentMigration = fs.readFileSync(path.join(root, 'supabase/migrations', studentEnrollmentMigrationFile), 'utf8');
assert.match(studentEnrollmentMigration, /session\.token_hash = encode\([\s\S]*?digest\(NULLIF\(BTRIM\(p_session_token\)/, 'Enrollment RPC must hash and verify the supplied server session');
assert.match(studentEnrollmentMigration, /participant\.period_id = session\.period_id/, 'Enrollment RPC must stay within the authenticated period');
assert.match(studentEnrollmentMigration, /REVOKE ALL ON FUNCTION public\.student_list_course_enrollments[\s\S]*?GRANT EXECUTE/, 'Enrollment RPC permissions must be explicit');
const enrollmentApiSource = fs.readFileSync(path.join(root, 'src/services/apiService.ts'), 'utf8');
assert.match(enrollmentApiSource, /rpc\('student_list_course_enrollments'[\s\S]*?p_session_token: studentSession\.sessionToken/, 'Student catalog enrollments must come from the token-verified server RPC');
const enrollmentSessionMigrationFile = fs.readdirSync(path.join(root, 'supabase/migrations'))
  .find(file => file.endsWith('_expand_session_scoped_student_enrollment.sql'));
assert.ok(enrollmentSessionMigrationFile, 'Student course switching must be backed by a scoped server session migration');
const enrollmentSessionMigration = fs.readFileSync(path.join(root, 'supabase/migrations', enrollmentSessionMigrationFile), 'utf8');
assert.match(enrollmentSessionMigration, /CREATE OR REPLACE FUNCTION public\.student_create_period_session[\s\S]*?participant\.student_id = v_student_id[\s\S]*?participant\.period_id = p_period_id[\s\S]*?private\.issue_student_session\(v_student_id, p_period_id\)/, 'Switching courses must verify enrollment before issuing a new period-bound token');
assert.match(enrollmentApiSource, /studentCreatePeriodSession\([\s\S]*?student_create_period_session/, 'Course switching must request a server-issued period token');
const studentSwitchSource = fs.readFileSync(path.join(root, 'src/components/student/StudentPortal.tsx'), 'utf8');
assert.match(studentSwitchSource, /await ApiService\.studentCreatePeriodSession[\s\S]*?setStudentIdentity\(currentStudent\.id, targetCourse\.slug, targetPeriod\.id, sessionToken\)/, 'Workspace navigation must install the server-issued token before entering a different period');
const secureStudentRpcMigrationFile = fs.readdirSync(path.join(root, 'supabase/migrations'))
  .find(file => file.endsWith('_hide_student_session_definers.sql'));
assert.ok(secureStudentRpcMigrationFile, 'Privileged enrollment logic must stay outside the public API schema');
const secureStudentRpcMigration = fs.readFileSync(path.join(root, 'supabase/migrations', secureStudentRpcMigrationFile), 'utf8');
assert.match(secureStudentRpcMigration, /private\.student_list_course_enrollments[\s\S]*?SECURITY DEFINER[\s\S]*?CREATE OR REPLACE FUNCTION public\.student_list_course_enrollments[\s\S]*?LANGUAGE SQL/, 'Public enrollment endpoint must be an invoker wrapper around private token checks');
assert.match(secureStudentRpcMigration, /private\.student_create_period_session[\s\S]*?SECURITY DEFINER[\s\S]*?CREATE OR REPLACE FUNCTION public\.student_create_period_session[\s\S]*?LANGUAGE SQL/, 'Public period-switch endpoint must be an invoker wrapper around private token checks');
assert.match(scopedPolicyMigration, /token_hash = encode\(digest\(v_token, 'sha256'\), 'hex'\)/, 'A student session token must be verified by its hash');
assert.match(scopedPolicyMigration, /CREATE POLICY "Student view own submissions"[\s\S]*?USING \(student_id = private\.current_student_id\(period_id\)\)/);
assert.match(scopedPolicyMigration, /CREATE POLICY "Student view own attendance"[\s\S]*?USING \(student_id = private\.current_student_id\(period_id\)\)/);
assert.match(scopedPolicyMigration, /CREATE POLICY "Student view own published assessment"[\s\S]*?student_id = private\.current_student_id\(period_id\)/);
assert.match(scopedPolicyMigration, /CREATE POLICY "Student view own remedials"[\s\S]*?USING \(student_id = private\.current_student_id\(period_id\)\)/);
assert.match(activationMigration, /CREATE POLICY "Students replace own remedial files"[\s\S]*?r\.status = 'BELUM_LULUS'[\s\S]*?r\.deadline > NOW\(\)/);
assert.match(activationMigration, /SET password_hash = NULL[\s\S]*?UPDATE private\.student_sessions[\s\S]*?revoked_at = COALESCE\(revoked_at, NOW\(\)\)/, 'Password reset must revoke live sessions');
assert.match(activationMigration, /failed_attempts < 5/);
assert.match(activationMigration, /r\.status = 'BELUM_LULUS'[\s\S]*?r\.deadline > NOW\(\)/, 'Remedial re-uploads must require a rejected attempt and an open deadline');

console.log('PASS: decimal grading, WITA deadlines, zero-score publish/withdraw, period isolation, student-session RLS definitions, reset revocation, and remedial update guards.');
