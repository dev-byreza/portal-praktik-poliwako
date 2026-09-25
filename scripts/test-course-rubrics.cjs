// Run with: node scripts/test-course-rubrics.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const ts = require('typescript');

function loadSource(relativePath, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  }}).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports, crypto: webcrypto, TextEncoder, console,
    require: name => {
      if (!(name in dependencies)) throw new Error('Unexpected dependency: ' + name);
      return dependencies[name];
    },
  });
  return module.exports;
}

const plain = value => JSON.parse(JSON.stringify(value));
const { getCourseRubrics, reconcileRubricScores } = loadSource('src/utils/courseRubrics.ts');
const { buildCourseQualityItems, calculateQualityPracticeScore, calculateWeightedQualityScore, getCourseQualityComponents } = loadSource('src/utils/qualityAssessment.ts');
const courseSettingsSource = fs.readFileSync(path.join(__dirname, '..', 'src/components/instructor/CourseSettings.tsx'), 'utf8');
const attitude = getCourseRubrics(null, 'ATTITUDE');
assert.equal(attitude[0].id, 'rub-cad1-s1');
attitude[0].name = 'Edited';
assert.notEqual(getCourseRubrics(null, 'ATTITUDE')[0].name, 'Edited');
const custom = [
  { id: 'kept', name: 'Kerja sama', category: 'ATTITUDE', description: 'Indikator khusus' },
  { id: 'new', name: 'Etika kerja', category: 'ATTITUDE', description: 'Indikator baru' },
];
assert.deepEqual(plain(getCourseRubrics({ qualityRubrics: custom }, 'ATTITUDE')), custom);
const scores = reconcileRubricScores(custom, [
  { criterionId: 'removed', score: 0, level: 'Tidak Mengerjakan' },
  { criterionId: 'kept', score: 50, level: 'Cukup' },
], 100, 'Sangat Baik');
assert.deepEqual(plain(scores), [
  { criterionId: 'kept', score: 50, level: 'Cukup' },
  { criterionId: 'new', score: 100, level: 'Sangat Baik' },
]);
assert.equal(scores.reduce((sum, s) => sum + s.score, 0) / scores.length, 75);
assert.equal(reconcileRubricScores(custom, [{ criterionId: 'kept', score: 0, level: 'Tidak Mengerjakan' }], 75, 'Baik')[0].score, 0);

const qualityCourse = {
  subCpmks: [
    { id: 'sub-1', code: 'Sub-CPMK 1', description: 'Ketepatan proses', weightPercent: 60 },
    { id: 'sub-2', code: 'Sub-CPMK 2', description: 'Ketepatan hasil', weightPercent: 40 },
  ],
  qualityRubrics: [
    { id: 'rub-sub-1', subCpmkId: 'sub-1', name: 'Sub-CPMK 1', category: 'QUALITY', description: 'Ketepatan proses' },
    { id: 'rub-sub-2', subCpmkId: 'sub-2', name: 'Sub-CPMK 2', category: 'QUALITY', description: 'Ketepatan hasil' },
    { id: 'quality-extra', name: 'Kerapian benda kerja', category: 'QUALITY', description: 'Finishing dan kerapian' },
    { id: 'attitude', name: 'Kedisiplinan', category: 'ATTITUDE', description: 'Kepatuhan waktu' },
  ],
};
const qualityItems = buildCourseQualityItems(qualityCourse);
assert.equal(qualityItems.length, 2, 'Sub-CPMK criteria must appear in their quality branch, separate from other quality components');
assert.deepEqual(plain(qualityItems.map(item => item.isSubCpmk)), [true, true]);
assert.equal(calculateQualityPracticeScore(qualityItems.slice(0, 2), [
  { criterionId: 'sub-1', score: 100, level: 'Sangat Baik' },
  { criterionId: 'sub-2', score: 50, level: 'Cukup' },
]), 80, 'Sub-CPMK scores must use configured weight percentages');
assert.equal(calculateQualityPracticeScore(qualityItems, [
  { criterionId: 'sub-1', score: 100, level: 'Sangat Baik' },
  { criterionId: 'sub-2', score: 50, level: 'Cukup' },
]), 80, 'Sub-CPMK criteria must use their internal weights');
const defaultQualityComponents = getCourseQualityComponents({ qualityComponents: undefined });
assert.equal(defaultQualityComponents.reduce((sum, item) => sum + item.weightPercent, 0), 100, 'Default Quality branches must total 100%');
assert.equal(calculateWeightedQualityScore(defaultQualityComponents, {
  'quality-entry': 100, 'quality-sub-cpmk': 80, 'quality-assignment': 50, 'quality-post-test': 100,
}), 82.5, 'Configured branch weights must determine the Quality score');
const customComponents = defaultQualityComponents.map(item => item.id === 'quality-sub-cpmk' ? { ...item, weightPercent: 40 } : item.id === 'quality-post-test' ? { ...item, weightPercent: 20 } : item);
customComponents.push({ id: 'quiz-1', type: 'QUIZ', name: 'Kuis 1', description: 'Tes modul', weightPercent: 15 });
assert.equal(calculateWeightedQualityScore(customComponents, {
  'quality-entry': 100, 'quality-sub-cpmk': 80, 'quality-assignment': 50, 'quality-post-test': 100, 'quiz-1': 80,
}), 81.5, 'A customizable quiz branch must participate in the 100% Quality total');
assert.equal(calculateWeightedQualityScore(customComponents.slice(1), {}), 0, 'Invalid Quality totals must not produce a usable score');
assert.equal(calculateWeightedQualityScore([
  ...defaultQualityComponents,
  { id: 'legacy-custom', type: 'CUSTOM', name: 'Mutu', description: 'Mutu', weightPercent: 0 },
], {}), 0, 'A zero-weight branch must be corrected or removed before grading');
assert.deepEqual(plain(buildCourseQualityItems({
  subCpmks: [], qualityRubrics: [qualityCourse.qualityRubrics[2]],
}).map(item => item.title)), ['Kerapian benda kerja'], 'Quality-only legacy courses must keep their rubrics gradeable');
assert.match(courseSettingsSource, /localQualityComponents/);
assert.match(courseSettingsSource, /qualityComponents: localQualityComponents\.map/, 'Quality branches and weights must be saved with the course');
assert.match(courseSettingsSource, /totalQualityWeight !== 100/, 'Saving settings must require a 100% Quality total');

let live = true;
let calls = [];
let cached = [];
let failTable;
let failOperation;
let cachedAssessments = [];
let cachedAttendance = [];
const oldSubId = '10000000-0000-4000-8000-000000000001';
const oldRubricId = '20000000-0000-4000-8000-000000000001';
const fakeClient = {
  from(table) {
    const call = { table, filters: [] };
    calls.push(call);
    const query = {
      select() { call.operation ||= 'select'; return query; },
      single() { return query; },
      eq(key, value) { call.filters.push([key, value]); return query; },
      in(key, value) { call.filters.push([key, value]); return query; },
      upsert(payload) { call.operation = 'upsert'; call.payload = payload; return query; },
      delete() { call.operation = 'delete'; return query; },
      then(resolve, reject) {
        const error = table === failTable && call.operation === failOperation ? new Error('Save denied') : null;
        const data = call.operation === 'select'
          ? [{ id: table === 'rubric_criteria' ? oldRubricId : oldSubId }]
          : { id: 'saved' };
        return Promise.resolve({ data, error }).then(resolve, reject);
      },
    };
    return query;
  },
};
const { ApiService } = loadSource('src/services/apiService.ts', {
  './supabaseClient': { supabase: fakeClient, isSupabaseConfigured: () => live },
  './storageService': { StorageService: {
    getCourses: () => cached,
    saveCourses: courses => { cached = courses; },
    getAssessments: () => cachedAssessments,
    saveAssessments: assessments => { cachedAssessments = assessments; },
    getAttendance: () => cachedAttendance,
    saveAttendance: attendance => { cachedAttendance = attendance; },
  } },
  '../utils/learningAssignments': { getUnitAssignments: () => [] },
  '../utils/learningUnitOrdering': { normalizeLearningUnitNumbers: units => units },
  '../utils/qualityAssessment': { getCourseQualityComponents },
});
const course = {
  id: '30000000-0000-4000-8000-000000000001', instructorId: 'owner', name: 'CAD',
  qualityComponents: defaultQualityComponents,
  subCpmks: [{ id: 'legacy-sub', code: 'A', description: 'Kompetensi', weightPercent: 100 }],
  qualityRubrics: [
    { id: 'legacy-quality', subCpmkId: 'legacy-sub', name: 'Mutu', category: 'QUALITY', description: 'Mutu' },
    { id: 'legacy-attitude', name: 'Kerja sama', category: 'ATTITUDE', description: 'Kolaborasi tim' },
    { id: 'legacy-creativity', name: 'Solusi', category: 'CREATIVITY', description: 'Inovasi' },
    { id: 'legacy-quality-extra', name: 'Finishing benda kerja', category: 'QUALITY', description: 'Periksa hasil akhir' },
  ],
};

(async () => {
  const saved = await ApiService.saveCourse(course);
  assert.match(saved.qualityRubrics[1].id, /^[0-9a-f-]{36}$/);
  assert.equal(saved.qualityRubrics[0].subCpmkId, saved.subCpmks[0].id);
  assert.equal(cached[0], saved);
  const courseWrite = calls.find(c => c.table === 'courses' && c.operation === 'upsert');
  assert.equal(courseWrite.payload.quality_components.length, 4, 'Quality branch configuration must persist with the course in Supabase');
  const rubricWrite = calls.find(c => c.table === 'rubric_criteria' && c.operation === 'upsert');
  assert.deepEqual(plain(rubricWrite.payload.map(r => r.category)), ['QUALITY', 'ATTITUDE', 'CREATIVITY', 'QUALITY']);
  assert.equal(rubricWrite.payload[1].description, 'Kolaborasi tim');
  assert.equal(rubricWrite.payload[3].name, 'Finishing benda kerja', 'Additional QUALITY criteria must persist through Supabase rubric upsert');
  assert.match(saved.qualityRubrics[3].id, /^[0-9a-f-]{36}$/);
  for (const deletion of calls.filter(c => c.operation === 'delete')) {
    assert.equal(deletion.filters[0][0], 'course_id');
    assert.equal(deletion.filters[0][1], course.id);
    assert.equal(deletion.filters[1][0], 'id');
  }
  const retry = await ApiService.saveCourse(course);
  assert.equal(retry.qualityRubrics[1].id, saved.qualityRubrics[1].id);
  assert.equal(retry.qualityRubrics[3].id, saved.qualityRubrics[3].id, 'Additional quality rubric IDs must remain stable across retries');
  const other = await ApiService.saveCourse({ ...course, id: '40000000-0000-4000-8000-000000000001' });
  assert.notEqual(other.qualityRubrics[1].id, saved.qualityRubrics[1].id);
  const unchanged = await ApiService.saveCourse(saved);
  assert.equal(unchanged.qualityRubrics[1].id, saved.qualityRubrics[1].id);
  for (const [table, operation] of [['courses', 'upsert'], ['rubric_criteria', 'select'], ['rubric_criteria', 'upsert'], ['rubric_criteria', 'delete']]) {
    calls = []; cached = []; failTable = table; failOperation = operation;
    await assert.rejects(ApiService.saveCourse(course), /Save denied/);
    assert.equal(cached.length, 0, 'Failed saves must not be cached as successful');
    if (operation !== 'delete') assert.equal(calls.some(c => c.operation === 'delete'), false);
  }
  calls = []; failTable = null; failOperation = null;
  const grade = { id: 'grade-1', periodId: 'period-1', studentId: 'student-1', finalScore: 0, isPublished: false };
  await ApiService.saveAssessment(grade);
  assert.equal(cachedAssessments[0], grade, 'A zero-point assessment is still persisted as a grade record');
  failTable = 'assessments'; failOperation = 'upsert';
  await assert.rejects(ApiService.saveAssessment({ ...grade, isPublished: true }), /Save denied/);
  assert.equal(cachedAssessments[0].isPublished, false, 'Failed server saves must not replace the confirmed cache');

  failTable = null; failOperation = null;
  const attendance = { id: 'attendance-1', periodId: 'period-1', studentId: 'student-1', day1: 'ALPA', percentage: 0, isEligible: false };
  await ApiService.saveAttendanceRecord(attendance);
  assert.equal(cachedAttendance[0], attendance);
  failTable = 'attendance_records'; failOperation = 'upsert';
  await assert.rejects(ApiService.saveAttendanceRecord({ ...attendance, percentage: 100, isEligible: true }), /Save denied/);
  assert.equal(cachedAttendance[0].percentage, 0, 'Failed attendance writes must leave the last server-confirmed cache intact');
  calls = []; live = false;
  const local = await ApiService.saveCourse(course);
  assert.equal(local, course);
  assert.equal(calls.length, 0);
  console.log('PASS: course rubric configuration, active scores, zero preservation, UUID stability, scoped deletes, save failures, and local mode.');
})().catch(error => { console.error(error); process.exitCode = 1; });
