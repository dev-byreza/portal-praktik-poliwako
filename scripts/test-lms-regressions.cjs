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
assert.match(scopedPolicyMigration, /token_hash = encode\(digest\(v_token, 'sha256'\), 'hex'\)/, 'A student session token must be verified by its hash');
assert.match(scopedPolicyMigration, /CREATE POLICY "Student view own submissions"[\s\S]*?USING \(student_id = private\.current_student_id\(period_id\)\)/);
assert.match(scopedPolicyMigration, /CREATE POLICY "Student view own attendance"[\s\S]*?USING \(student_id = private\.current_student_id\(period_id\)\)/);
assert.match(scopedPolicyMigration, /CREATE POLICY "Student view own published assessment"[\s\S]*?student_id = private\.current_student_id\(period_id\)/);
assert.match(scopedPolicyMigration, /CREATE POLICY "Student view own remedials"[\s\S]*?USING \(student_id = private\.current_student_id\(period_id\)\)/);
assert.match(activationMigration, /CREATE POLICY "Students replace own remedial files"[\s\S]*?r\.status = 'BELUM_LULUS'[\s\S]*?r\.deadline > NOW\(\)/);
assert.match(activationMigration, /SET password_hash = NULL[\s\S]*?UPDATE private\.student_sessions[\s\S]*?revoked_at = COALESCE\(revoked_at, NOW\(\)\)/, 'Password reset must revoke live sessions');
assert.match(activationMigration, /failed_attempts < 5/);
assert.match(activationMigration, /r\.status = 'BELUM_LULUS'[\s\S]*?r\.deadline > NOW\(\)/, 'Remedial re-uploads must require a rejected attempt and an open deadline');

console.log('PASS: WITA deadlines, zero-score publish/withdraw, period isolation, student-session RLS definitions, reset revocation, and remedial update guards.');
