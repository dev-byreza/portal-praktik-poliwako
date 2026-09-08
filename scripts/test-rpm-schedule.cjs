// Run with: node scripts/test-rpm-schedule.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const cache = new Map();
const storage = new Map([['poliwako_security_v7_auto_attendance', 'true']]);
const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key), clear: () => storage.clear() };
function load(file) {
  if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(file, 'utf8'));
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
  vm.runInNewContext(js, { module, exports: module.exports, console, Intl, Date, window: {}, localStorage,
    require: name => {
      assert.ok(name.startsWith('.'), 'Unexpected dependency: ' + name);
      const target = path.resolve(path.dirname(file), name);
      return load(fs.existsSync(target) && fs.statSync(target).isFile() ? target : target + '.ts');
    },
  });
  return module.exports;
}
const plain = value => JSON.parse(JSON.stringify(value));
const official = load(path.join(root, 'src/data/official-rpm-2026.json'));
const { getRpmSchedule, rpmPeriodStatus, reconcileRpmSchedule } = load(path.join(root, 'src/utils/rpmSchedule.ts'));
const data = load(path.join(root, 'src/data/mockData.ts'));
for (const courseId of ['course-cad-1-1', 'c3d4e5f6-d002-4000-8000-000000000001']) {
  const course = getRpmSchedule(courseId);
  const periods = data.INITIAL_PERIODS.filter(p => p.courseId === courseId);
  assert.equal(periods.length, course.periods.length);
  const enrolled = [];
  for (const expected of course.periods) {
    const period = periods.find(p => p.periodNumber === expected.periodNumber);
    assert.equal(period.startDate, expected.startDate);
    assert.equal(period.endDate, expected.endDate);
    assert.equal(period.name, expected.name);
    const nims = data.INITIAL_PARTICIPANTS.filter(p => p.periodId === period.id).map(p => p.student.nim);
    assert.deepEqual(plain(nims.sort()), [...expected.nims].sort());
    enrolled.push(...nims);
  }
  assert.equal(new Set(enrolled).size, course.students.length);
  assert.equal(enrolled.length, course.students.length);
  for (const student of course.students) {
    const actual = data.INITIAL_STUDENTS.find(s => s.nim === student.nim);
    assert.equal(actual.name, student.name, student.nim);
    assert.equal(actual.className, course.className);
  }
}
assert.deepEqual(official.courses[0].periods.map(p => p.week), [33, 35, 37, 39, 43]);
assert.deepEqual(official.courses[1].periods.map(p => p.week), [34, 36, 38]);
assert.equal(official.courses[0].students.some(s => s.nim === '22503027'), false);
assert.equal(rpmPeriodStatus('2026-09-07', '2026-09-11', '2026-09-08'), 'ACTIVE');
assert.equal(rpmPeriodStatus('2026-09-07', '2026-09-11', '2026-09-11'), 'ACTIVE');
assert.equal(rpmPeriodStatus('2026-09-07', '2026-09-11', '2026-09-12'), 'COMPLETED');
assert.equal(rpmPeriodStatus('2026-09-14', '2026-09-18', '2026-09-08'), 'UPCOMING');
const student = { ...data.INITIAL_STUDENTS.find(s => s.nim === '22603032'), password: 'existing-password' };
const oldPeriod = { ...data.INITIAL_PERIODS.find(p => p.periodNumber === 3 && p.courseId === 'c3d4e5f6-d002-4000-8000-000000000001'), startDate: '2026-08-24', endDate: '2026-08-28', status: 'COMPLETED' };
const old = [{ id: 'keep-participant-id', periodId: 'per-cad1-1-g3', studentId: student.id, student, enrolledAt: '2026-08-01', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false }];
const inputPeriods = data.INITIAL_PERIODS.map(p => p.id === oldPeriod.id ? oldPeriod : p);
const repaired = reconcileRpmSchedule([student], inputPeriods, old, '2026-09-08');
assert.equal(repaired.participants.find(p => p.id === 'keep-participant-id').periodId, 'per-cad1-1-g2');
assert.equal(repaired.students.find(s => s.id === student.id).password, 'existing-password');
assert.equal(repaired.periods.find(p => p.id === oldPeriod.id).status, 'ACTIVE');
assert.equal(old[0].periodId, 'per-cad1-1-g3', 'Input must not be mutated');
const again = reconcileRpmSchedule(repaired.students, repaired.periods, repaired.participants, '2026-09-08');
assert.deepEqual(plain(again.participants), plain(repaired.participants), 'Repeating correction must not add duplicates');
assert.equal(getRpmSchedule('b2c3d4e5-cad2-4000-8000-000000000001'), undefined, 'CAD 2 is outside this PDF scope');

storage.set('poliwako_students', JSON.stringify([student]));
storage.set('poliwako_periods', JSON.stringify(inputPeriods));
storage.set('poliwako_participants', JSON.stringify(old));
storage.set('poliwako_assessments', JSON.stringify([{ id: 'grade', studentId: student.id, periodId: 'per-cad1-1-g3', finalScore: 88 }]));
const { StorageService } = load(path.join(root, 'src/services/storageService.ts'));
assert.equal(JSON.parse(storage.get('poliwako_assessments'))[0].finalScore, 88);
assert.equal(StorageService.getParticipants()[0].periodId, 'per-cad1-1-g3', 'Do not move participants with existing activity automatically');
assert.ok(storage.has('poliwako_rpm_schedule_2026_pdf_v1_backup'));
assert.equal(StorageService.getPeriods().find(p => p.id === oldPeriod.id).startDate, '2026-09-07');
console.log('PASS: 71 names, exact class rosters, 8 periods, WITA status, cache correction, retry stability, and preservation of existing learning data.');
