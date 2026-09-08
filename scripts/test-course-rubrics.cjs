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

let live = true;
let calls = [];
let cached = [];
let failTable;
let failOperation;
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
  './storageService': { StorageService: { getCourses: () => cached, saveCourses: courses => { cached = courses; } } },
});
const course = {
  id: '30000000-0000-4000-8000-000000000001', instructorId: 'owner', name: 'CAD',
  subCpmks: [{ id: 'legacy-sub', code: 'A', description: 'Kompetensi', weightPercent: 100 }],
  qualityRubrics: [
    { id: 'legacy-quality', subCpmkId: 'legacy-sub', name: 'Mutu', category: 'QUALITY', description: 'Mutu' },
    { id: 'legacy-attitude', name: 'Kerja sama', category: 'ATTITUDE', description: 'Kolaborasi tim' },
    { id: 'legacy-creativity', name: 'Solusi', category: 'CREATIVITY', description: 'Inovasi' },
  ],
};

(async () => {
  const saved = await ApiService.saveCourse(course);
  assert.match(saved.qualityRubrics[1].id, /^[0-9a-f-]{36}$/);
  assert.equal(saved.qualityRubrics[0].subCpmkId, saved.subCpmks[0].id);
  assert.equal(cached[0], saved);
  const rubricWrite = calls.find(c => c.table === 'rubric_criteria' && c.operation === 'upsert');
  assert.deepEqual(plain(rubricWrite.payload.map(r => r.category)), ['QUALITY', 'ATTITUDE', 'CREATIVITY']);
  assert.equal(rubricWrite.payload[1].description, 'Kolaborasi tim');
  for (const deletion of calls.filter(c => c.operation === 'delete')) {
    assert.equal(deletion.filters[0][0], 'course_id');
    assert.equal(deletion.filters[0][1], course.id);
    assert.equal(deletion.filters[1][0], 'id');
  }
  const retry = await ApiService.saveCourse(course);
  assert.equal(retry.qualityRubrics[1].id, saved.qualityRubrics[1].id);
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
  calls = []; live = false;
  const local = await ApiService.saveCourse(course);
  assert.equal(local, course);
  assert.equal(calls.length, 0);
  console.log('PASS: course rubric configuration, active scores, zero preservation, UUID stability, scoped deletes, save failures, and local mode.');
})().catch(error => { console.error(error); process.exitCode = 1; });
