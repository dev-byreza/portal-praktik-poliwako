// Real Course & Student Data for Portal Praktik Poliwako
// Target: Politeknik Sorowako (PRD v1.0)
// Program Studi: Rekayasa Perancangan Mekanik
// Mata Kuliah: CAD 1.1 (Kelas 1C) - Tahun Akademik 2026/2027 Semester Gasal

import {
  InstructorProfile,
  Student,
  Course,
  PracticePeriod,
  PracticeParticipant,
  LearningUnit,
  UnitProgress,
  Submission,
  AttendanceRecord,
  Assessment,
  RemedialAssignment,
  FeedbackRule
} from '../types';

export const INITIAL_INSTRUCTOR: InstructorProfile = {
  id: 'inst-rezaf',
  email: 'rezaf@politekniksorowako.ac.id',
  name: 'M. Reza Firmansyah',
  nip: '198709122015041002',
  avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
  department: 'Rekayasa Perancangan Mekanik'
};

// 36 Mahasiswa Real Kelas 1C (Jadwal Semester Gasal 2026/2027)
export const INITIAL_STUDENTS: Student[] = [
  { id: 'std-22603001', nim: '22603001', name: 'Achmad Fawzan', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603002', nim: '22603002', name: 'Ade Meilan Alifia Sulaeman', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603003', nim: '22603003', name: 'Affan Farsyah', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603004', nim: '22603004', name: 'Afiqah Azwa Safrina', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603005', nim: '22603005', name: 'Andika Azis', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603006', nim: '22603006', name: 'Anesya Nurhawizah', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603007', nim: '22603007', name: 'Ayu Anugrah', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603008', nim: '22603008', name: 'Ayu Irmayanti', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603009', nim: '22603009', name: 'Bunga Cahya Putri Jenal', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603010', nim: '22603010', name: 'Daniel Adian Sura Parinding', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603011', nim: '22603011', name: 'Dede Irawan', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603012', nim: '22603012', name: 'Faiya Aisyah Naswah', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603013', nim: '22603013', name: 'Haura Hafizhah', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603014', nim: '22603014', name: 'Juan Farand', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603015', nim: '22603015', name: 'Khumaira Khaerunnisa', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603016', nim: '22603016', name: 'M. Fauzan Adhitya Pratama H', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603017', nim: '22603017', name: 'Muh. Anugrah Sesar', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603018', nim: '22603018', name: 'Muh. Diaz Raditya B.', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603019', nim: '22603019', name: 'Muh. Fakhrul Al Farezy Rozadin', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603020', nim: '22603020', name: 'Muh. Raihan Aryan', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603021', nim: '22603021', name: 'Muhammad Abyan Zaky', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603022', nim: '22603022', name: 'Muhammad Agam Haq', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603023', nim: '22603023', name: 'Muhammad Aidil Ahmadi', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603024', nim: '22603024', name: 'Nadya Zalzabila', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603025', nim: '22603025', name: 'Ranita Rosa Putri', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603026', nim: '22603026', name: 'Rausyan Fikran', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603027', nim: '22603027', name: 'Rizky Ramadhani A.', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603028', nim: '22603028', name: 'Rudhi Adhana Zet', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603029', nim: '22603029', name: 'Salsabila Aprilia Sukardi', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603030', nim: '22603030', name: 'Saskia Uhti Ramadhani', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603031', nim: '22603031', name: 'Sayyef Al Islam', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603032', nim: '22603032', name: 'Tazkia Kausara', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603033', nim: '22603033', name: 'Wahidatul Hasanah', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603034', nim: '22603034', name: 'William Gredi Sidwel Alinsky', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603035', nim: '22603035', name: 'Winda Tri Lestari', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603036', nim: '22603036', name: 'Yulfikatrin Yuyun', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
];

// Mata Kuliah Real: CAD 1.1
export const INITIAL_COURSES: Course[] = [
  {
    id: 'course-cad-1-1',
    instructorId: 'inst-rezaf',
    name: 'CAD 1.1',
    code: 'CAD1.1',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    slug: 'cad-1-1',
    department: 'Rekayasa Perancangan Mekanik',
    description: 'Praktik perancangan mekanik berbantuan komputer (CAD 1.1) Program Studi Rekayasa Perancangan Mekanik. Meliputi 2D sketching parametrik, pemodelan 3D solid part, assembly komponen mesin, dan drafting gambar kerja standar ISO.',
    status: 'PUBLISHED',
    createdAt: '2026-08-01T08:00:00.000Z',
    subCpmks: [
      {
        id: 'cpmk-cad1-1',
        code: 'Sub-CPMK 1',
        description: 'Mampu memahami antarmuka software CAD, navigasi viewport, dan parameter sketching 2D sesuai standar ISO.',
        weightPercent: 30
      },
      {
        id: 'cpmk-cad1-2',
        code: 'Sub-CPMK 2',
        description: 'Mampu membuat pemodelan part 3D parametrik (Extrude, Revolve, Sweep, Fillet/Chamfer) dengan akurasi dimensi.',
        weightPercent: 40
      },
      {
        id: 'cpmk-cad1-3',
        code: 'Sub-CPMK 3',
        description: 'Mampu menyusun gambar kerja drafting 2D lengkap dengan proyeksi orthogonal, potongan (section), dan toleransi geometri.',
        weightPercent: 30
      }
    ],
    qualityRubrics: [
      {
        id: 'rub-cad1-1',
        subCpmkId: 'cpmk-cad1-1',
        name: 'Ketepatan Sketsa 2D & Geometric Constraints',
        category: 'QUALITY',
        description: 'Kerapian, ketepatan fully-defined constraints, dan proporsi dimensi sketsa 2D.'
      },
      {
        id: 'rub-cad1-2',
        subCpmkId: 'cpmk-cad1-2',
        name: 'Akurasi Fitur Pemodelan 3D Solid',
        category: 'QUALITY',
        description: 'Kesesuaian fitur solid modeling dengan gambar kerja dan batas toleransi teknis.'
      },
      {
        id: 'rub-cad1-3',
        subCpmkId: 'cpmk-cad1-3',
        name: 'Standar Drafting 2D & Toleransi ISO',
        category: 'QUALITY',
        description: 'Standar etiket ISO, proyeksi orthogonal, potongan, dan ketepatan dimensi drafting.'
      }
    ]
  }
];

// 4 Gelombang Periode Praktik CAD 1.1 Sesuai Kalender Akademik Poliwako 2026
export const INITIAL_PERIODS: PracticePeriod[] = [
  {
    id: 'per-cad1-1-g1',
    courseId: 'course-cad-1-1',
    name: 'Gelombang 1 (Minggu 34)',
    periodNumber: 1,
    startDate: '2026-08-17',
    endDate: '2026-08-21',
    status: 'COMPLETED',
    finalProjectDriveUrl: 'https://drive.google.com/drive/folders/poliwako-cad1-g1',
    createdAt: '2026-08-10T08:00:00.000Z'
  },
  {
    id: 'per-cad1-1-g2',
    courseId: 'course-cad-1-1',
    name: 'Gelombang 2 (Minggu 36)',
    periodNumber: 2,
    startDate: '2026-08-31',
    endDate: '2026-09-04',
    status: 'ACTIVE',
    finalProjectDriveUrl: 'https://drive.google.com/drive/folders/poliwako-cad1-g2',
    createdAt: '2026-08-10T08:00:00.000Z'
  },
  {
    id: 'per-cad1-1-g3',
    courseId: 'course-cad-1-1',
    name: 'Gelombang 3 (Minggu 37)',
    periodNumber: 3,
    startDate: '2026-09-07',
    endDate: '2026-09-11',
    status: 'UPCOMING',
    finalProjectDriveUrl: 'https://drive.google.com/drive/folders/poliwako-cad1-g3',
    createdAt: '2026-08-10T08:00:00.000Z'
  },
  {
    id: 'per-cad1-1-g4',
    courseId: 'course-cad-1-1',
    name: 'Gelombang 4 (Minggu 38)',
    periodNumber: 4,
    startDate: '2026-09-14',
    endDate: '2026-09-18',
    status: 'UPCOMING',
    finalProjectDriveUrl: 'https://drive.google.com/drive/folders/poliwako-cad1-g4',
    createdAt: '2026-08-10T08:00:00.000Z'
  }
];

// Distribusi Peserta Real CAD 1.1 Berdasarkan Jadwal Resmi Kelas 1C
export const INITIAL_PARTICIPANTS: PracticeParticipant[] = [
  // --- Gelombang 1 (Minggu 34: 17-21 Agustus 2026) ---
  {
    id: 'part-g1-01',
    periodId: 'per-cad1-1-g1',
    studentId: 'std-22603003',
    student: INITIAL_STUDENTS[2], // Affan Farsyah
    enrolledAt: '2026-08-15T08:00:00.000Z',
    progressStatus: 'LEARNING_COMPLETE',
    finalProjectSubmittedAt: '2026-08-21T15:30:00.000Z',
    finalProjectConfirmed: true
  },
  {
    id: 'part-g1-02',
    periodId: 'per-cad1-1-g1',
    studentId: 'std-22603004',
    student: INITIAL_STUDENTS[3], // Afiqah Azwa Safrina
    enrolledAt: '2026-08-15T08:00:00.000Z',
    progressStatus: 'LEARNING_COMPLETE',
    finalProjectSubmittedAt: '2026-08-21T15:45:00.000Z',
    finalProjectConfirmed: true
  },
  {
    id: 'part-g1-03',
    periodId: 'per-cad1-1-g1',
    studentId: 'std-22603006',
    student: INITIAL_STUDENTS[5], // Anesya Nurhawizah
    enrolledAt: '2026-08-15T08:00:00.000Z',
    progressStatus: 'LEARNING_COMPLETE',
    finalProjectSubmittedAt: '2026-08-21T16:00:00.000Z',
    finalProjectConfirmed: true
  },
  {
    id: 'part-g1-04',
    periodId: 'per-cad1-1-g1',
    studentId: 'std-22603010',
    student: INITIAL_STUDENTS[9], // Daniel Adian Sura Parinding
    enrolledAt: '2026-08-15T08:00:00.000Z',
    progressStatus: 'LEARNING_COMPLETE',
    finalProjectSubmittedAt: '2026-08-21T15:10:00.000Z',
    finalProjectConfirmed: true
  },
  {
    id: 'part-g1-05',
    periodId: 'per-cad1-1-g1',
    studentId: 'std-22603012',
    student: INITIAL_STUDENTS[11], // Faiya Aisyah Naswah
    enrolledAt: '2026-08-15T08:00:00.000Z',
    progressStatus: 'LEARNING_COMPLETE',
    finalProjectSubmittedAt: '2026-08-21T16:20:00.000Z',
    finalProjectConfirmed: true
  },
  {
    id: 'part-g1-06',
    periodId: 'per-cad1-1-g1',
    studentId: 'std-22603015',
    student: INITIAL_STUDENTS[14], // Khumaira Khaerunnisa
    enrolledAt: '2026-08-15T08:00:00.000Z',
    progressStatus: 'LEARNING_COMPLETE',
    finalProjectSubmittedAt: '2026-08-21T15:50:00.000Z',
    finalProjectConfirmed: true
  },
  {
    id: 'part-g1-07',
    periodId: 'per-cad1-1-g1',
    studentId: 'std-22603020',
    student: INITIAL_STUDENTS[19], // Muh. Raihan Aryan
    enrolledAt: '2026-08-15T08:00:00.000Z',
    progressStatus: 'LEARNING_COMPLETE',
    finalProjectSubmittedAt: '2026-08-21T16:30:00.000Z',
    finalProjectConfirmed: true
  },
  {
    id: 'part-g1-08',
    periodId: 'per-cad1-1-g1',
    studentId: 'std-22603021',
    student: INITIAL_STUDENTS[20], // Muhammad Abyan Zaky
    enrolledAt: '2026-08-15T08:00:00.000Z',
    progressStatus: 'LEARNING_COMPLETE',
    finalProjectSubmittedAt: '2026-08-21T15:15:00.000Z',
    finalProjectConfirmed: true
  },
  {
    id: 'part-g1-09',
    periodId: 'per-cad1-1-g1',
    studentId: 'std-22603025',
    student: INITIAL_STUDENTS[24], // Ranita Rosa Putri
    enrolledAt: '2026-08-15T08:00:00.000Z',
    progressStatus: 'LEARNING_COMPLETE',
    finalProjectSubmittedAt: '2026-08-21T16:40:00.000Z',
    finalProjectConfirmed: true
  },
  {
    id: 'part-g1-10',
    periodId: 'per-cad1-1-g1',
    studentId: 'std-22603027',
    student: INITIAL_STUDENTS[26], // Rizky Ramadhani A.
    enrolledAt: '2026-08-15T08:00:00.000Z',
    progressStatus: 'LEARNING_COMPLETE',
    finalProjectSubmittedAt: '2026-08-21T16:05:00.000Z',
    finalProjectConfirmed: true
  },
  {
    id: 'part-g1-11',
    periodId: 'per-cad1-1-g1',
    studentId: 'std-22603030',
    student: INITIAL_STUDENTS[29], // Saskia Uhti Ramadhani
    enrolledAt: '2026-08-15T08:00:00.000Z',
    progressStatus: 'LEARNING_COMPLETE',
    finalProjectSubmittedAt: '2026-08-21T15:35:00.000Z',
    finalProjectConfirmed: true
  },
  {
    id: 'part-g1-12',
    periodId: 'per-cad1-1-g1',
    studentId: 'std-22603035',
    student: INITIAL_STUDENTS[34], // Winda Tri Lestari
    enrolledAt: '2026-08-15T08:00:00.000Z',
    progressStatus: 'LEARNING_COMPLETE',
    finalProjectSubmittedAt: '2026-08-21T16:15:00.000Z',
    finalProjectConfirmed: true
  },

  // --- Gelombang 2 (Minggu 36: 31 Agustus - 4 September 2026) ---
  {
    id: 'part-g2-01',
    periodId: 'per-cad1-1-g2',
    studentId: 'std-22603001',
    student: INITIAL_STUDENTS[0], // Achmad Fawzan
    enrolledAt: '2026-08-28T08:00:00.000Z',
    progressStatus: 'IN_PROGRESS',
    finalProjectSubmittedAt: '2026-09-04T14:30:00.000Z',
    finalProjectConfirmed: true
  },
  {
    id: 'part-g2-02',
    periodId: 'per-cad1-1-g2',
    studentId: 'std-22603005',
    student: INITIAL_STUDENTS[4], // Andika Azis
    enrolledAt: '2026-08-28T08:00:00.000Z',
    progressStatus: 'IN_PROGRESS',
    finalProjectSubmittedAt: '2026-09-04T15:10:00.000Z',
    finalProjectConfirmed: true
  },
  {
    id: 'part-g2-03',
    periodId: 'per-cad1-1-g2',
    studentId: 'std-22603007',
    student: INITIAL_STUDENTS[6], // Ayu Anugrah
    enrolledAt: '2026-08-28T08:00:00.000Z',
    progressStatus: 'IN_PROGRESS',
    finalProjectSubmittedAt: '2026-09-04T15:45:00.000Z',
    finalProjectConfirmed: true
  },
  {
    id: 'part-g2-04',
    periodId: 'per-cad1-1-g2',
    studentId: 'std-22603011',
    student: INITIAL_STUDENTS[10], // Dede Irawan
    enrolledAt: '2026-08-28T08:00:00.000Z',
    progressStatus: 'IN_PROGRESS',
    finalProjectSubmittedAt: '2026-09-04T16:00:00.000Z',
    finalProjectConfirmed: true
  },
  {
    id: 'part-g2-05',
    periodId: 'per-cad1-1-g2',
    studentId: 'std-22603013',
    student: INITIAL_STUDENTS[12], // Haura Hafizhah
    enrolledAt: '2026-08-28T08:00:00.000Z',
    progressStatus: 'IN_PROGRESS',
    finalProjectSubmittedAt: '2026-09-04T14:50:00.000Z',
    finalProjectConfirmed: true
  },
  {
    id: 'part-g2-06',
    periodId: 'per-cad1-1-g2',
    studentId: 'std-22603016',
    student: INITIAL_STUDENTS[15], // M. Fauzan Adhitya Pratama H
    enrolledAt: '2026-08-28T08:00:00.000Z',
    progressStatus: 'IN_PROGRESS',
    finalProjectSubmittedAt: '2026-09-04T15:30:00.000Z',
    finalProjectConfirmed: true
  },
  {
    id: 'part-g2-07',
    periodId: 'per-cad1-1-g2',
    studentId: 'std-22603018',
    student: INITIAL_STUDENTS[17], // Muh. Diaz Raditya B.
    enrolledAt: '2026-08-28T08:00:00.000Z',
    progressStatus: 'IN_PROGRESS',
    finalProjectSubmittedAt: '2026-09-04T16:15:00.000Z',
    finalProjectConfirmed: true
  },
  {
    id: 'part-g2-08',
    periodId: 'per-cad1-1-g2',
    studentId: 'std-22603024',
    student: INITIAL_STUDENTS[23], // Nadya Zalzabila
    enrolledAt: '2026-08-28T08:00:00.000Z',
    progressStatus: 'IN_PROGRESS',
    finalProjectSubmittedAt: '2026-09-04T15:20:00.000Z',
    finalProjectConfirmed: true
  },
  {
    id: 'part-g2-09',
    periodId: 'per-cad1-1-g2',
    studentId: 'std-22603028',
    student: INITIAL_STUDENTS[27], // Rudhi Adhana Zet
    enrolledAt: '2026-08-28T08:00:00.000Z',
    progressStatus: 'IN_PROGRESS',
    finalProjectSubmittedAt: '2026-09-04T16:30:00.000Z',
    finalProjectConfirmed: true
  },
  {
    id: 'part-g2-10',
    periodId: 'per-cad1-1-g2',
    studentId: 'std-22603031',
    student: INITIAL_STUDENTS[30], // Sayyef Al Islam
    enrolledAt: '2026-08-28T08:00:00.000Z',
    progressStatus: 'IN_PROGRESS',
    finalProjectSubmittedAt: '2026-09-04T15:55:00.000Z',
    finalProjectConfirmed: true
  },
  {
    id: 'part-g2-11',
    periodId: 'per-cad1-1-g2',
    studentId: 'std-22603036',
    student: INITIAL_STUDENTS[35], // Yulfikatrin Yuyun
    enrolledAt: '2026-08-28T08:00:00.000Z',
    progressStatus: 'IN_PROGRESS',
    finalProjectSubmittedAt: '2026-09-04T16:45:00.000Z',
    finalProjectConfirmed: true
  },

  // --- Gelombang 3 (Minggu 37: 7-11 September 2026) ---
  {
    id: 'part-g3-01',
    periodId: 'per-cad1-1-g3',
    studentId: 'std-22603008',
    student: INITIAL_STUDENTS[7], // Ayu Irmayanti
    enrolledAt: '2026-09-05T08:00:00.000Z',
    progressStatus: 'NOT_STARTED',
    finalProjectConfirmed: false
  },
  {
    id: 'part-g3-02',
    periodId: 'per-cad1-1-g3',
    studentId: 'std-22603009',
    student: INITIAL_STUDENTS[8], // Bunga Cahya Putri Jenal
    enrolledAt: '2026-09-05T08:00:00.000Z',
    progressStatus: 'NOT_STARTED',
    finalProjectConfirmed: false
  },
  {
    id: 'part-g3-03',
    periodId: 'per-cad1-1-g3',
    studentId: 'std-22603014',
    student: INITIAL_STUDENTS[13], // Juan Farand
    enrolledAt: '2026-09-05T08:00:00.000Z',
    progressStatus: 'NOT_STARTED',
    finalProjectConfirmed: false
  },
  {
    id: 'part-g3-04',
    periodId: 'per-cad1-1-g3',
    studentId: 'std-22603017',
    student: INITIAL_STUDENTS[16], // Muh. Anugrah Sesar
    enrolledAt: '2026-09-05T08:00:00.000Z',
    progressStatus: 'NOT_STARTED',
    finalProjectConfirmed: false
  },
  {
    id: 'part-g3-05',
    periodId: 'per-cad1-1-g3',
    studentId: 'std-22603022',
    student: INITIAL_STUDENTS[21], // Muhammad Agam Haq
    enrolledAt: '2026-09-05T08:00:00.000Z',
    progressStatus: 'NOT_STARTED',
    finalProjectConfirmed: false
  },
  {
    id: 'part-g3-06',
    periodId: 'per-cad1-1-g3',
    studentId: 'std-22603026',
    student: INITIAL_STUDENTS[25], // Rausyan Fikran
    enrolledAt: '2026-09-05T08:00:00.000Z',
    progressStatus: 'NOT_STARTED',
    finalProjectConfirmed: false
  },
  {
    id: 'part-g3-07',
    periodId: 'per-cad1-1-g3',
    studentId: 'std-22603029',
    student: INITIAL_STUDENTS[28], // Salsabila Aprilia Sukardi
    enrolledAt: '2026-09-05T08:00:00.000Z',
    progressStatus: 'NOT_STARTED',
    finalProjectConfirmed: false
  },
  {
    id: 'part-g3-08',
    periodId: 'per-cad1-1-g3',
    studentId: 'std-22603032',
    student: INITIAL_STUDENTS[31], // Tazkia Kausara
    enrolledAt: '2026-09-05T08:00:00.000Z',
    progressStatus: 'NOT_STARTED',
    finalProjectConfirmed: false
  },
  {
    id: 'part-g3-09',
    periodId: 'per-cad1-1-g3',
    studentId: 'std-22603034',
    student: INITIAL_STUDENTS[33], // William Gredi Sidwel Alinsky
    enrolledAt: '2026-09-05T08:00:00.000Z',
    progressStatus: 'NOT_STARTED',
    finalProjectConfirmed: false
  },

  // --- Gelombang 4 (Minggu 38: 14-18 September 2026) ---
  {
    id: 'part-g4-01',
    periodId: 'per-cad1-1-g4',
    studentId: 'std-22603002',
    student: INITIAL_STUDENTS[1], // Ade Meilan Alifia Sulaeman
    enrolledAt: '2026-09-10T08:00:00.000Z',
    progressStatus: 'NOT_STARTED',
    finalProjectConfirmed: false
  },
  {
    id: 'part-g4-02',
    periodId: 'per-cad1-1-g4',
    studentId: 'std-22603019',
    student: INITIAL_STUDENTS[18], // Muh. Fakhrul Al Farezy Rozadin
    enrolledAt: '2026-09-10T08:00:00.000Z',
    progressStatus: 'NOT_STARTED',
    finalProjectConfirmed: false
  },
  {
    id: 'part-g4-03',
    periodId: 'per-cad1-1-g4',
    studentId: 'std-22603023',
    student: INITIAL_STUDENTS[22], // Muhammad Aidil Ahmadi
    enrolledAt: '2026-09-10T08:00:00.000Z',
    progressStatus: 'NOT_STARTED',
    finalProjectConfirmed: false
  },
  {
    id: 'part-g4-04',
    periodId: 'per-cad1-1-g4',
    studentId: 'std-22603033',
    student: INITIAL_STUDENTS[32], // Wahidatul Hasanah
    enrolledAt: '2026-09-10T08:00:00.000Z',
    progressStatus: 'NOT_STARTED',
    finalProjectConfirmed: false
  }
];

// 5 Modul Pembelajaran CAD 1.1 untuk Gelombang 2 (Aktif Berjalan)
export const INITIAL_LEARNING_UNITS: LearningUnit[] = [
  {
    id: 'unit-cad1-m1',
    periodId: 'per-cad1-1-g2',
    unitNumber: 1,
    title: 'Pengenalan Antarmuka CAD & 2D Sketching Parametrik',
    description: 'Konfigurasi environment kerja CAD, navigasi viewport 3D, penggunaan perintah Line, Circle, Arc, Trim, serta penerapan Geometric Constraints (Coincident, Tangent, Concentric, Parallel, Perpendicular).',
    materials: [
      {
        id: 'mat-cad1-1',
        unitId: 'unit-cad1-m1',
        title: 'Modul Teori & SOP Praktik CAD 1.1 Poliwako',
        type: 'PDF',
        contentUrl: '/materials/Modul_CAD1_1_Poliwako.pdf',
        fileSize: '4.8 MB'
      }
    ],
    assignment: {
      id: 'asg-cad1-1',
      unitId: 'unit-cad1-m1',
      periodId: 'per-cad1-1-g2',
      title: 'Tugas Modul 1: Pembuatan Profil Sketsa Plat Berkait (Fully Defined)',
      description: 'Buat sketsa profil 2D komponen plat berkait mekanik lengkap dengan dimensi dan fully constrained. Unggah file gambar kerja dalam format PDF.',
      deadline: '31 Agustus 2026, 17:00 WITA',
      maxScore: 100,
      allowedFileType: 'PDF'
    }
  },
  {
    id: 'unit-cad1-m2',
    periodId: 'per-cad1-1-g2',
    unitNumber: 2,
    title: '3D Solid Modeling: Extrude, Cut & Revolve',
    description: 'Transformasi profil 2D menjadi model 3D solid menggunakan fitur Extrude Boss/Base, Extruded Cut, Revolve, dan Mirror. Analisis volume dan orientasi sumbu referensi.',
    materials: [
      {
        id: 'mat-cad1-2',
        unitId: 'unit-cad1-m2',
        title: 'Panduan Praktik Solid Modeling Parametrik',
        type: 'PDF',
        contentUrl: '/materials/Panduan_Solid_Modeling.pdf',
        fileSize: '3.2 MB'
      }
    ],
    assignment: {
      id: 'asg-cad1-2',
      unitId: 'unit-cad1-m2',
      periodId: 'per-cad1-1-g2',
      title: 'Tugas Modul 2: Pemodelan 3D Poros Bertingkat & Bracket Penumpu',
      description: 'Buat model 3D solid part poros bertingkat dan bracket penumpu sesuai dimensi spesifikasi lembar kerja ISO.',
      deadline: '1 September 2026, 17:00 WITA',
      maxScore: 100,
      allowedFileType: 'PDF'
    }
  },
  {
    id: 'unit-cad1-m3',
    periodId: 'per-cad1-1-g2',
    unitNumber: 3,
    title: 'Fitur Lanjutan: Sweep, Loft, Fillet & Chamfer Komponen Mesin',
    description: 'Penerapan fitur pemodelan kurva kompleks: Sweep sepanjang guide curve, Loft profil bertingkat, pembuatan ulir (thread), dan finishing radius fillet/chamfer.',
    materials: [
      {
        id: 'mat-cad1-3',
        unitId: 'unit-cad1-m3',
        title: 'Lembar Panduan Fitur Lanjutan Komponen Mesin',
        type: 'PDF',
        contentUrl: '/materials/Fitur_Lanjutan_CAD.pdf',
        fileSize: '5.1 MB'
      }
    ],
    assignment: {
      id: 'asg-cad1-3',
      unitId: 'unit-cad1-m3',
      periodId: 'per-cad1-1-g2',
      title: 'Tugas Modul 3: Pemodelan Flange & Pipa Melengkung 3D',
      description: 'Selesaikan pemodelan pipa flange berulir standar mesin industri dengan akurasi dimensi geometrik.',
      deadline: '2 September 2026, 17:00 WITA',
      maxScore: 100,
      allowedFileType: 'PDF'
    }
  },
  {
    id: 'unit-cad1-m4',
    periodId: 'per-cad1-1-g2',
    unitNumber: 4,
    title: '2D Drafting: Proyeksi Orthogonal, Potongan & Toleransi ISO',
    description: 'Penyusunan gambar kerja 2D teknis dari model 3D: pandangan utama (proyeksi Eropa/Amerika), potongan penampang (section view), detail view, dan pemberian toleransi linier serta geometri.',
    materials: [
      {
        id: 'mat-cad1-4',
        unitId: 'unit-cad1-m4',
        title: 'Standar Etiket & Drafting Gambar Kerja ISO Poliwako',
        type: 'PDF',
        contentUrl: '/materials/Standar_Drafting_ISO.pdf',
        fileSize: '3.9 MB'
      }
    ],
    assignment: {
      id: 'asg-cad1-4',
      unitId: 'unit-cad1-m4',
      periodId: 'per-cad1-1-g2',
      title: 'Tugas Modul 4: Lembar Kerja Gambar Drafting Lengkap Ukuran A3',
      description: 'Cetak gambar kerja dalam format PDF dengan etiket resmi Politeknik Sorowako, proyeksi orthogonal, dan toleransi suaian.',
      deadline: '3 September 2026, 17:00 WITA',
      maxScore: 100,
      allowedFileType: 'PDF'
    }
  },
  {
    id: 'unit-cad1-m5',
    periodId: 'per-cad1-1-g2',
    unitNumber: 5,
    title: 'Evaluasi Final Project CAD 1.1 & Penyusunan Laporan Praktik',
    description: 'Penyelesaian proyek akhir mandiri pemodelan dan drafting komponen mekanik lengkap, uji Post-Test komprehensif, dan pengunggahan laporan akhir praktikum.',
    materials: [
      {
        id: 'mat-cad1-5',
        unitId: 'unit-cad1-m5',
        title: 'Format Panduan Laporan Praktikum CAD 1.1',
        type: 'PDF',
        contentUrl: '/materials/Panduan_Laporan_CAD1_1.pdf',
        fileSize: '2.5 MB'
      }
    ],
    assignment: {
      id: 'asg-cad1-5',
      unitId: 'unit-cad1-m5',
      periodId: 'per-cad1-1-g2',
      title: 'Proyek Akhir: Berkas Gambar Kerja Lengkap & Laporan Praktik CAD 1.1',
      description: 'Kumpulkan bundel berkas final CAD (3D part file & 2D drawing PDF) beserta lembar laporan hasil inspeksi ukuran.',
      deadline: '4 September 2026, 17:00 WITA',
      maxScore: 100,
      allowedFileType: 'PDF'
    }
  }
];

// Presensi Real Praktik 5 Hari Gelombang 2
export const INITIAL_ATTENDANCE: AttendanceRecord[] = INITIAL_PARTICIPANTS.filter(p => p.periodId === 'per-cad1-1-g2').map((part, idx) => ({
  id: `att-cad1-g2-${idx + 1}`,
  periodId: 'per-cad1-1-g2',
  studentId: part.studentId,
  day1: 'HADIR',
  day2: 'HADIR',
  day3: 'HADIR',
  day4: 'HADIR',
  day5: 'HADIR',
  percentage: 100,
  isEligible: true,
  updatedAt: '2026-09-04T16:00:00.000Z'
}));

export const INITIAL_UNIT_PROGRESS: UnitProgress[] = [];
export const INITIAL_SUBMISSIONS: Submission[] = [];
export const INITIAL_ASSESSMENTS: Assessment[] = [];
export const INITIAL_REMEDIALS: RemedialAssignment[] = [];

export const INITIAL_FEEDBACK_RULES: FeedbackRule[] = [
  { id: 'fbr-1', courseId: 'global', minScore: 86, maxScore: 100, message: 'Sangat baik! Pemodelan CAD akurat, sketsa fully-defined, dan gambar kerja mematuhi standar ISO.' },
  { id: 'fbr-2', courseId: 'global', minScore: 76, maxScore: 85, message: 'Baik! Pemodelan memenuhi spesifikasi fungsi, tingkatkan ketelitian pada penempatan dimensi dan toleransi.' },
  { id: 'fbr-3', courseId: 'global', minScore: 61, maxScore: 75, message: 'Cukup baik. Perhatikan kelengkapan etiket standar Poliwako dan tata letak proyeksi gambar.' },
  { id: 'fbr-4', courseId: 'global', minScore: 41, maxScore: 60, message: 'Perlu ditingkatkan. Pelajari kembali aturan geometric constraints dan teknik potongan drafting.' },
  { id: 'fbr-5', courseId: 'global', minScore: 1, maxScore: 40, message: 'Perlu banyak perbaikan. Segera konsultasikan kendala pemodelan kepada instruktur.' },
  { id: 'fbr-6', courseId: 'global', minScore: 0, maxScore: 0, message: 'Belum ada capaian tugas CAD. Pastikan seluruh berkas tugas dikumpulkan sesuai jadwal.' },
];
