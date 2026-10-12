import {
  Course,
  PracticePeriod,
  PracticeParticipant,
  LearningUnit,
  Assessment,
  AttendanceRecord,
  Submission,
  CriterionScore,
  Student
} from '../types';

export const DEMO_COURSE_ID = 'course-demo-cad-sim';

// 1. DATA MATA KULIAH DUMMY ANALITIK OBE
export const DEMO_OBE_COURSE: Course = {
  id: DEMO_COURSE_ID,
  instructorId: 'inst-rezaf',
  name: 'CAD 3D & Simulasi Mekanikal (Demo OBE)',
  code: 'CAD-OBE-301',
  academicYear: '2026/2027',
  semester: 'Genap',
  slug: 'cad-demo-obe',
  department: 'Rekayasa Perancangan Mekanik',
  description: 'Simulasi pembelajaran praktik CAD berbasis Outcome-Based Education (OBE) lengkap dengan data riil capaian Sub-CPMK, presensi, portofolio final project, dan evaluasi kurva performa.',
  status: 'PUBLISHED',
  createdAt: '2026-08-01T08:00:00.000Z',
  subCpmks: [
    {
      id: 'cpmk-demo-1',
      code: 'Sub-CPMK 1',
      description: 'Mampu merancang pemodelan 3D solid parametrik kompleks dan fitur surfacing presisi tinggi.',
      weightPercent: 30
    },
    {
      id: 'cpmk-demo-2',
      code: 'Sub-CPMK 2',
      description: 'Mampu melakukan perakitan mekanikal (Assembly), analisis gerak kinematika, dan deteksi interferensi komponen.',
      weightPercent: 25
    },
    {
      id: 'cpmk-demo-3',
      code: 'Sub-CPMK 3',
      description: 'Mampu menyusun gambar kerja drafting 2D standar ISO lengkap dengan etiket Poliwako, toleransi umum, dan GD&T.',
      weightPercent: 25
    },
    {
      id: 'cpmk-demo-4',
      code: 'Sub-CPMK 4',
      description: 'Mampu menyelesaikan proyek akhir (Final Project) portofolio desain mesin utuh beserta laporan rekayasa.',
      weightPercent: 20
    }
  ],
  qualityRubrics: [
    {
      id: 'rub-demo-q1',
      subCpmkId: 'cpmk-demo-1',
      name: 'Ketepatan Pemodelan 3D Solid & Surface',
      category: 'QUALITY',
      description: 'Akurasi fitur pemodelan parametrik 3D, fully-defined sketch, dan integritas geometri.'
    },
    {
      id: 'rub-demo-q2',
      subCpmkId: 'cpmk-demo-2',
      name: 'Akurasi Assembly Mekanikal & Motion Study',
      category: 'QUALITY',
      description: 'Ketepatan mate/constraint assembly komponen mesin, zero interference, dan analisis gerak.'
    },
    {
      id: 'rub-demo-q3',
      subCpmkId: 'cpmk-demo-3',
      name: 'Standar Gambar Kerja ISO & GD&T',
      category: 'QUALITY',
      description: 'Kepatuhan standar etiket ISO, penempatan dimensi, proyeksi orthogonal, dan toleransi geometri.'
    },
    {
      id: 'rub-demo-q4',
      subCpmkId: 'cpmk-demo-4',
      name: 'Validasi Desain & Kelengkapan Portofolio Final Project',
      category: 'QUALITY',
      description: 'Kesiapan file CAD 3D, dokumen PDF lembar kerja job sheet, dan kerapian etiket.'
    },
    {
      id: 'rub-demo-s1',
      name: 'Kedisiplinan Kehadiran & Kepatuhan APD K3 Lab',
      category: 'ATTITUDE',
      description: 'Ketepatan waktu kehadiran praktik, kepatuhan K3 keselamatan lab, dan etika kerja.'
    },
    {
      id: 'rub-demo-c1',
      name: 'Inovasi & Eksplorasi Desain Mekanikal',
      category: 'CREATIVITY',
      description: 'Kemampuan eksplorasi alternatif perancangan 3D, efisiensi feature tree, dan kreativitas solusi teknik.'
    },
    {
      id: 'rub-demo-r1',
      name: 'Sistematika Laporan Job Sheet & Etiket Gambar',
      category: 'REPORT',
      description: 'Sistematika pelaporan, lembar kerja job sheet, serta kelengkapan dimensi toleransi ISO.'
    }
  ]
};

// 2. DATA 4 GELOMBANG PERIODE PRAKTIK
export const DEMO_OBE_PERIODS: PracticePeriod[] = [
  {
    id: 'per-demo-g1',
    courseId: DEMO_COURSE_ID,
    name: 'Gelombang 1 (Minggu 36)',
    periodNumber: 1,
    startDate: '2026-08-31',
    endDate: '2026-09-04',
    status: 'COMPLETED',
    finalProjectDriveUrl: '',
    createdAt: '2026-08-25T08:00:00.000Z'
  },
  {
    id: 'per-demo-g2',
    courseId: DEMO_COURSE_ID,
    name: 'Gelombang 2 (Minggu 38)',
    periodNumber: 2,
    startDate: '2026-09-14',
    endDate: '2026-09-18',
    status: 'COMPLETED',
    finalProjectDriveUrl: '',
    createdAt: '2026-09-01T08:00:00.000Z'
  },
  {
    id: 'per-demo-g3',
    courseId: DEMO_COURSE_ID,
    name: 'Gelombang 3 (Minggu 40)',
    periodNumber: 3,
    startDate: '2026-09-28',
    endDate: '2026-10-02',
    status: 'COMPLETED',
    finalProjectDriveUrl: '',
    createdAt: '2026-09-15T08:00:00.000Z'
  },
  {
    id: 'per-demo-g4',
    courseId: DEMO_COURSE_ID,
    name: 'Gelombang 4 (Minggu 42)',
    periodNumber: 4,
    startDate: '2026-10-12',
    endDate: '2026-10-16',
    status: 'ACTIVE',
    finalProjectDriveUrl: '',
    createdAt: '2026-10-01T08:00:00.000Z'
  }
];

// 3. DATA LEARNING UNITS (4 UNIT CAD DI SETIAP GELOMBANG)
export const DEMO_OBE_UNITS: LearningUnit[] = DEMO_OBE_PERIODS.flatMap(period => [
  {
    id: `unit-demo-${period.id}-1`,
    periodId: period.id,
    unitNumber: 1,
    title: 'Dasar Pemodelan 3D Solid & Parametrik',
    description: 'Sketching, fully-defined constraints, extrude, revolve, dan fillet.',
    materials: [],
    assignments: [
      {
        id: `asg-demo-${period.id}-1`,
        periodId: period.id,
        title: 'Job Sheet 1: Bracket & Flange Modeling',
        description: 'Upload file part CAD (.step/.ipt/.sldprt) dan PDF drafting.',
        deadline: period.startDate + ' 17:00 WITA',
        maxScore: 100,
        allowedFileType: 'ZIP'
      }
    ]
  },
  {
    id: `unit-demo-${period.id}-2`,
    periodId: period.id,
    unitNumber: 2,
    title: 'Assembly Mekanikal & Motion Study',
    description: 'Perakitan komponen mesin, toleransi perakitan, dan cek tabrakan.',
    materials: [],
    assignments: [
      {
        id: `asg-demo-${period.id}-2`,
        periodId: period.id,
        title: 'Job Sheet 2: Gearbox Assembly',
        description: 'Upload file perakitan assembly CAD dan Bill of Materials.',
        deadline: period.startDate + ' 17:00 WITA',
        maxScore: 100,
        allowedFileType: 'ZIP'
      }
    ]
  },
  {
    id: `unit-demo-${period.id}-3`,
    periodId: period.id,
    unitNumber: 3,
    title: 'Gambar Kerja Standar ISO & Toleransi GD&T',
    description: 'Etiket Poliwako, proyeksi sudut pertama/ketiga, potongan, dan toleransi ISO.',
    materials: [],
    assignments: [
      {
        id: `asg-demo-${period.id}-3`,
        periodId: period.id,
        title: 'Job Sheet 3: ISO Production Drawing',
        description: 'Upload gambar kerja 2D format PDF standar industri.',
        deadline: period.startDate + ' 17:00 WITA',
        maxScore: 100,
        allowedFileType: 'PDF'
      }
    ]
  },
  {
    id: `unit-demo-${period.id}-4`,
    periodId: period.id,
    unitNumber: 4,
    title: 'Proyek Akhir Portofolio Mesin Presisi',
    description: 'Final Project rancang bangun mesin manufaktur terintegrasi.',
    materials: [],
    assignments: [
      {
        id: `asg-demo-${period.id}-4`,
        periodId: period.id,
        title: 'Final Project: Mechanical Machine Design',
        description: 'Upload berkas portofolio utuh dan laporan akhir rekayasa.',
        deadline: period.endDate + ' 17:00 WITA',
        maxScore: 100,
        allowedFileType: 'ZIP'
      }
    ]
  }
]);

// Helper to make qualityScores for an assessment
function makeQualityRubrics(qualityScore: number): CriterionScore[] {
  const getLvl = (s: number) => (s >= 85 ? 'Sangat Baik' : s >= 75 ? 'Baik' : s >= 60 ? 'Cukup' : 'Kurang');
  return [
    { criterionId: 'rub-demo-q1', score: qualityScore, level: getLvl(qualityScore) },
    { criterionId: 'rub-demo-q2', score: Math.min(100, qualityScore + 2), level: getLvl(qualityScore + 2) },
    { criterionId: 'rub-demo-q3', score: Math.max(0, qualityScore - 2), level: getLvl(qualityScore - 2) },
    { criterionId: 'rub-demo-q4', score: qualityScore, level: getLvl(qualityScore) }
  ];
}

// 4. FACTORY FOR DEMO OBE PARTICIPANTS, ASSESSMENTS, ATTENDANCE & SUBMISSIONS
export function buildDemoObeData(students: Student[]) {
  // Distribution target: 14 A, 15 B, 2 C, 1 Remedial -> 29/32 SKM Pass (91%), Average Score: 84.8
  const RAW_DEMO_SCORES = [
    // Period 1 (Gel 1 - 8 students)
    { finalScore: 90, q: 90, a: 92, c: 88, r: 90, projectConfirmed: true },
    { finalScore: 87, q: 87, a: 90, c: 85, r: 87, projectConfirmed: true },
    { finalScore: 84, q: 84, a: 86, c: 82, r: 84, projectConfirmed: true },
    { finalScore: 82, q: 82, a: 85, c: 80, r: 82, projectConfirmed: true },
    { finalScore: 80, q: 80, a: 82, c: 78, r: 80, projectConfirmed: true },
    { finalScore: 79, q: 79, a: 81, c: 78, r: 80, projectConfirmed: true },
    { finalScore: 78, q: 78, a: 80, c: 76, r: 78, projectConfirmed: true },
    { finalScore: 74, q: 73, a: 78, c: 72, r: 75, projectConfirmed: false }, // 1 unconfirmed

    // Period 2 (Gel 2 - 8 students)
    { finalScore: 92, q: 92, a: 95, c: 90, r: 92, projectConfirmed: true },
    { finalScore: 88, q: 88, a: 90, c: 86, r: 88, projectConfirmed: true },
    { finalScore: 86, q: 86, a: 88, c: 84, r: 86, projectConfirmed: true },
    { finalScore: 84, q: 84, a: 86, c: 82, r: 84, projectConfirmed: true },
    { finalScore: 83, q: 83, a: 85, c: 80, r: 83, projectConfirmed: true },
    { finalScore: 82, q: 82, a: 84, c: 80, r: 82, projectConfirmed: true },
    { finalScore: 81, q: 81, a: 83, c: 78, r: 81, projectConfirmed: true },
    { finalScore: 78, q: 78, a: 80, c: 75, r: 78, projectConfirmed: true },

    // Period 3 (Gel 3 - 8 students)
    { finalScore: 94, q: 94, a: 96, c: 92, r: 94, projectConfirmed: true },
    { finalScore: 91, q: 91, a: 94, c: 90, r: 91, projectConfirmed: true },
    { finalScore: 89, q: 89, a: 92, c: 88, r: 89, projectConfirmed: true },
    { finalScore: 88, q: 88, a: 90, c: 86, r: 88, projectConfirmed: true },
    { finalScore: 87, q: 87, a: 90, c: 85, r: 87, projectConfirmed: true },
    { finalScore: 86, q: 86, a: 88, c: 84, r: 86, projectConfirmed: true },
    { finalScore: 84, q: 84, a: 86, c: 82, r: 84, projectConfirmed: true },
    { finalScore: 83, q: 83, a: 85, c: 80, r: 83, projectConfirmed: true },

    // Period 4 (Gel 4 - 8 students)
    { finalScore: 93, q: 93, a: 95, c: 90, r: 93, projectConfirmed: true },
    { finalScore: 90, q: 90, a: 92, c: 88, r: 90, projectConfirmed: true },
    { finalScore: 88, q: 88, a: 90, c: 86, r: 88, projectConfirmed: true },
    { finalScore: 86, q: 86, a: 88, c: 84, r: 86, projectConfirmed: true },
    { finalScore: 84, q: 84, a: 86, c: 82, r: 84, projectConfirmed: true },
    { finalScore: 83, q: 83, a: 85, c: 80, r: 83, projectConfirmed: true },
    { finalScore: 72, q: 72, a: 76, c: 70, r: 72, projectConfirmed: false }, // 2nd unconfirmed
    { finalScore: 62, q: 61, a: 70, c: 60, r: 65, projectConfirmed: false }  // 3rd unconfirmed & Remedial
  ];

  const participants: PracticeParticipant[] = [];
  const assessments: Assessment[] = [];
  const attendance: AttendanceRecord[] = [];
  const submissions: Submission[] = [];

  RAW_DEMO_SCORES.forEach((item, idx) => {
    const periodIndex = Math.floor(idx / 8);
    const period = DEMO_OBE_PERIODS[periodIndex];
    const student = students[idx % students.length] || {
      id: `std-demo-${idx + 1}`,
      nim: `22509${String(idx + 1).padStart(3, '0')}`,
      name: `Mahasiswa Praktik ${idx + 1}`,
      className: idx % 2 === 0 ? '2A' : '2B',
      createdAt: '2026-08-01T08:00:00.000Z'
    };
    const participantId = `part-demo-g${periodIndex + 1}-${String(idx + 1).padStart(2, '0')}`;

    // Participant
    participants.push({
      id: participantId,
      periodId: period.id,
      studentId: student.id,
      student,
      enrolledAt: period.startDate + 'T08:00:00.000Z',
      progressStatus: 'PUBLISHED',
      finalProjectConfirmed: item.projectConfirmed,
      finalProjectSubmittedAt: item.projectConfirmed ? period.endDate + 'T14:30:00.000Z' : undefined,
      finalProjectReviewStatus: item.projectConfirmed ? 'ACCEPTED' : 'SUBMITTED',
      finalProjectUrl: item.projectConfirmed ? 'https://drive.google.com/poliwako/demo-cad-final-project' : undefined
    });

    // Assessment
    assessments.push({
      id: `ass-demo-${participantId}`,
      periodId: period.id,
      studentId: student.id,
      qualityScore: item.q,
      entryBehaviorScore: item.q >= 85 ? 90 : 80,
      subCpmkPracticeScore: item.q,
      assignmentScore: item.q,
      postTestScore: item.q,
      attitudeScore: item.a,
      creativityScore: item.c,
      reportScore: item.r,
      finalScore: item.finalScore,
      qualityScores: makeQualityRubrics(item.q),
      attitudeScores: [{ criterionId: 'rub-demo-s1', score: item.a, level: item.a >= 85 ? 'Sangat Baik' : 'Baik' }],
      creativityScores: [{ criterionId: 'rub-demo-c1', score: item.c, level: item.c >= 85 ? 'Sangat Baik' : 'Baik' }],
      reportScores: [{ criterionId: 'rub-demo-r1', score: item.r, level: item.r >= 85 ? 'Sangat Baik' : 'Baik' }],
      feedback: item.finalScore >= 85
        ? 'Karya pemodelan solid 3D dan drafting ISO sangat presisi, memenuhi kriteria OBE tingkat lanjut.'
        : item.finalScore >= 75
        ? 'Desain memenuhi standar fungsi mekanik dan batas SKM Poliwako. Terus pertahankan kerapian etiket.'
        : 'Perlu bimbingan remedial pada fitur toleransi GD&T dan assembly mating.',
      isPublished: true,
      publishedAt: period.endDate + 'T16:00:00.000Z',
      gradedAt: period.endDate + 'T15:30:00.000Z',
      updatedAt: period.endDate + 'T15:30:00.000Z'
    });

    // Attendance (100% presence, 1 izin on remedial)
    attendance.push({
      id: `att-demo-${participantId}`,
      periodId: period.id,
      studentId: student.id,
      day1: 'HADIR',
      day2: 'HADIR',
      day3: 'HADIR',
      day4: 'HADIR',
      day5: item.finalScore === 62 ? 'IZIN' : 'HADIR',
      percentage: item.finalScore === 62 ? 80 : 100,
      isEligible: true,
      updatedAt: period.endDate + 'T17:00:00.000Z'
    });

    // Submissions for each assignment
    for (let u = 1; u <= 4; u++) {
      submissions.push({
        id: `sub-demo-${participantId}-u${u}`,
        assignmentId: `asg-demo-${period.id}-${u}`,
        studentId: student.id,
        periodId: period.id,
        fileName: `JobSheet_${u}_${student.nim}.zip`,
        fileUrl: `https://storage.poliwako.ac.id/demo/jobsheet_${u}.zip`,
        fileSize: '3.4 MB',
        submittedAt: period.startDate + 'T16:00:00.000Z',
        status: 'GRADED'
      });
    }
  });

  return { participants, assessments, attendance, submissions };
}
