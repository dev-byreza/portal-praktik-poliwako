// Real Course & Student Data for Portal Praktik Poliwako
// Target: Politeknik Sorowako (PRD v1.0)
// Program Studi: Rekayasa Perancangan Mekanik
// Mata Kuliah: CAD 1.1 (Kelas 1C) - Tahun Akademik 2026/2027 Semester Gasal

import { rpmPeriodStatus } from '../utils/rpmSchedule';
import officialRpm from './official-rpm-2026.json';

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
  name: 'Reza Febriadi Rauf',
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
  { id: 'std-22603010', nim: '22603010', name: 'Daniel Adlan Sura Parinding', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603011', nim: '22603011', name: 'Dede Irawan', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603012', nim: '22603012', name: 'Falya Aisyah Naswah', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603013', nim: '22603013', name: 'Haura Hafizhah', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603014', nim: '22603014', name: 'Juan Farand', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603015', nim: '22603015', name: 'Khumaira Khaerunnisa', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603016', nim: '22603016', name: 'M. Fauzan Adhitya Pratama H', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603017', nim: '22603017', name: 'Muh. Anugrah Sesar', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603018', nim: '22603018', name: 'Muh. Diaz Raditya B.', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22603019', nim: '22603019', name: 'Muh. Fakhrul Al Farezqy Rozadin', className: '1C', createdAt: '2026-08-01T08:00:00.000Z' },
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
  // 35 Mahasiswa Real Kelas 2D - TRPF (Politeknik Sorowako)
  { id: 'std-22502001', nim: '22502001', name: 'A. Kireyna Riyadhul Jinan', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502002', nim: '22502002', name: 'A. Muh. Akbar Al Rasyid', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502003', nim: '22502003', name: 'Ahmad Ghufron Muhtadin', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502004', nim: '22502004', name: 'Ahmad Roqib Abdillah', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502005', nim: '22502005', name: 'Akmal Lasampa', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502006', nim: '22502006', name: 'Almulqi Naftaly Mahbub', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502007', nim: '22502007', name: 'Amarillah Achyar', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502008', nim: '22502008', name: 'Anriansa', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502009', nim: '22502009', name: 'Ardiansyah A. Roge', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502010', nim: '22502010', name: 'Bucek', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502011', nim: '22502011', name: 'Cristianto Ambatoding', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502012', nim: '22502012', name: 'Dafa Algazali Effendy', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502013', nim: '22502013', name: 'Dina Ayu Rizqi', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502014', nim: '22502014', name: 'Dixzar Tri Winarta', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502015', nim: '22502015', name: 'Fitryadeningsi Tompi', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502016', nim: '22502016', name: 'Gadiza Ferdinasari Asril', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502017', nim: '22502017', name: 'Geraldy Zefanya Peruge', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502018', nim: '22502018', name: 'Grey Faldi Tandililing', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502019', nim: '22502019', name: 'Irfansyah', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502020', nim: '22502020', name: 'Irsyad Rasya', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502022', nim: '22502022', name: 'Jeason Dwi Alexander P. A.', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502023', nim: '22502023', name: 'Jhesen Parinding', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502024', nim: '22502024', name: 'Keysya Arwiana Fitri', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502025', nim: '22502025', name: 'Khalaf Dhafin Alghifari', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502026', nim: '22502026', name: 'M. Habil', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502027', nim: '22502027', name: 'Maryo Putra Luneri Billahi', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502028', nim: '22502028', name: 'Muh. Firdzan', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502029', nim: '22502029', name: 'Muhammad Fauzan Al Dzakwan', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502030', nim: '22502030', name: 'Muhammad Reza', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502031', nim: '22502031', name: 'Muhammad Rifky Anugrah Surahman', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502032', nim: '22502032', name: 'Muhammad Wilby Noufal', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502033', nim: '22502033', name: 'Najwa Aqila Hafsah Elman', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502034', nim: '22502034', name: 'Phika Surtiani', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502035', nim: '22502035', name: 'Salwa Amelia', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  { id: 'std-22502036', nim: '22502036', name: 'Zahran Adnan', className: '2D - TRPF', createdAt: '2026-09-01T08:00:00.000Z' },
  // 35 Mahasiswa Real Kelas 2C - RPM (Politeknik Sorowako)
  { id: 'std-22503001', nim: '22503001', name: 'Afdhal Nur Fauzan', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503002', nim: '22503002', name: 'Ahmad Nabil', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503003', nim: '22503003', name: 'Ainun Musdalifah', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503004', nim: '22503004', name: 'Al Aura Anandita', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503005', nim: '22503005', name: 'Al-Mubara', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503006', nim: '22503006', name: 'Ananda Hexa Maulana', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503007', nim: '22503007', name: 'Andi Jumharyansah', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503008', nim: '22503008', name: 'Anugrah Pratama', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503009', nim: '22503009', name: 'Athika Fauziah Satyaputri', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503010', nim: '22503010', name: 'Deswita Dwianggia', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503011', nim: '22503011', name: 'Devi Purnama Sari', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503012', nim: '22503012', name: 'Dwilma Sophie Sisiliano', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503013', nim: '22503013', name: 'Effer Cliff Mandalele', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503014', nim: '22503014', name: 'Elisa', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503015', nim: '22503015', name: 'Fikri Hasan Bungasae', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503016', nim: '22503016', name: 'Gizza Ramadhani', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503017', nim: '22503017', name: 'Ikram Arif Ananda', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503018', nim: '22503018', name: 'Jayanti Lestari Lambe', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503019', nim: '22503019', name: 'M. Alief Kurniawan', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503020', nim: '22503020', name: 'Meylani Ayu Nathasa', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503021', nim: '22503021', name: 'Muh. Januar Farouq', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503022', nim: '22503022', name: 'Muh. Muzammil Musta', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503023', nim: '22503023', name: 'Muh. Naufal Al Khair', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503024', nim: '22503024', name: 'Muh. Nendra Arif', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503025', nim: '22503025', name: 'Muh. Rajab Hidayah An', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503026', nim: '22503026', name: 'Nabil Ardiansyah', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503028', nim: '22503028', name: 'Nita', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503029', nim: '22503029', name: 'Nur Ainun Alifda', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503030', nim: '22503030', name: 'Nur Hikma', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503031', nim: '22503031', name: 'Rasya Ahmad Al Farezi.A', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503032', nim: '22503032', name: 'Rezal Pabiaran', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503033', nim: '22503033', name: 'Silvia Nur Azizah', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503034', nim: '22503034', name: 'Valentin Merrandan', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503035', nim: '22503035', name: 'Yhogi Oktavianus Iksel', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  { id: 'std-22503036', nim: '22503036', name: 'Zahra Atifah Zal-Sabila', className: '2C', createdAt: '2026-08-01T08:00:00.000Z' },
  // Akun Dummy Tester Mahasiswa
  {
    id: 'std-tester-001',
    nim: '001',
    name: 'Tester',
    className: '1C',
    email: 'tester@politekniksorowako.ac.id',
    password: '123',
    hasCreatedPassword: true,
    createdAt: '2026-08-01T08:00:00.000Z'
  }
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
      },
      {
        id: 'rub-cad1-s1',
        name: 'Kedisiplinan Waktu & Kepatuhan APD / K3',
        category: 'ATTITUDE',
        description: 'Ketepatan waktu kehadiran, kepatuhan K3 bengkel/lab komputer, dan etika kerja.'
      },
      {
        id: 'rub-cad1-s2',
        name: 'Tanggung Jawab & Perawatan Fasilitas Lab CAD',
        category: 'ATTITUDE',
        description: 'Kerapian workstation, pemeliharaan software/hardware, dan kerja sama tim.'
      },
      {
        id: 'rub-cad1-c1',
        name: 'Inisiatif Desain & Optimasi Fitur CAD',
        category: 'CREATIVITY',
        description: 'Kemampuan eksplorasi alternatif pemodelan 3D, efisiensi feature tree, dan inovasi bentuk.'
      },
      {
        id: 'rub-cad1-r1',
        name: 'Kelengkapan Laporan Praktik & Etiket Drafting',
        category: 'REPORT',
        description: 'Sistematika pelaporan, lembar kerja job sheet, serta kelengkapan dimensi toleransi ISO.'
      }
    ]
  },
  {
    id: 'b2c3d4e5-cad2-4000-8000-000000000001',
    instructorId: 'inst-rezaf',
    name: 'CAD 2',
    code: 'CAD2',
    academicYear: '2026/2027',
    semester: 'Genap',
    slug: 'cad-2-trpf',
    department: 'Teknologi Rekayasa Pengelasan dan Fabrikasi',
    description: 'Praktik perancangan konstruksi berbantuan komputer tingkat lanjut (CAD 2) Program Studi Teknologi Rekayasa Pengelasan dan Fabrikasi (TRPF) Politeknik Sorowako. Meliputi pemodelan rangka konstruksi baja las (weldments/structural steel), desain lembaran logam (sheet metal design & unfolding), pemodelan bejana tekan dan piping spool, perakitan struktur fabrikasi & BOM, serta penyusunan gambar kerja fabrikasi 2D standar ISO dengan simbol pengelasan AWS A2.4 / ISO 2553.',
    status: 'PUBLISHED',
    createdAt: '2026-09-01T08:00:00.000Z',
    subCpmks: [
      {
        id: 'b2c3d4e5-cad2-4000-8000-000000000101',
        code: 'Sub-CPMK 1',
        description: 'Mampu merancang pemodelan rangka konstruksi baja dan struktur las (Weldments & Structural Members) lengkap dengan gusset, end cap, weld bead, dan penyusunan Cut List fabrikasi presisi.',
        weightPercent: 25
      },
      {
        id: 'b2c3d4e5-cad2-4000-8000-000000000102',
        code: 'Sub-CPMK 2',
        description: 'Mampu merancang komponen lembaran logam (Sheet Metal Design), menentukan K-Factor / Bend Allowance, serta menghasilkan pola bentangan (flat pattern) untuk proses fabrikasi shearing dan bending.',
        weightPercent: 25
      },
      {
        id: 'b2c3d4e5-cad2-4000-8000-000000000103',
        code: 'Sub-CPMK 3',
        description: 'Mampu memodelkan perakitan (Assembly Modeling) struktur fabrikasi, bejana tekan, atau sistem perpipaan (piping spool) serta melakukan analisis interferensi part dan Bill of Materials (BOM).',
        weightPercent: 25
      },
      {
        id: 'b2c3d4e5-cad2-4000-8000-000000000104',
        code: 'Sub-CPMK 4',
        description: 'Mampu menyusun gambar kerja fabrikasi (Shop Drawing / Isometric Spool) 2D standar ISO dengan penunjukan simbol pengelasan (ISO 2553 / AWS A2.4), toleransi dimensi, dan instruksi perakitan.',
        weightPercent: 25
      }
    ],
    qualityRubrics: [
      {
        id: 'e2c3d4e5-cad2-4000-8000-000000000401',
        subCpmkId: 'b2c3d4e5-cad2-4000-8000-000000000101',
        name: 'Akurasi Dimensi & Fitur Konstruksi Las (Weldments Cut List)',
        category: 'QUALITY',
        description: 'Ketepatan penetapan profil baja struktural, corner treatment (miter/butt), end cap, gusset, dan akurasi cut list.'
      },
      {
        id: 'e2c3d4e5-cad2-4000-8000-000000000402',
        subCpmkId: 'b2c3d4e5-cad2-4000-8000-000000000102',
        name: 'Presisi Flat Pattern & Parameter Bending Sheet Metal',
        category: 'QUALITY',
        description: 'Perhitungan tepat K-Factor, bend deduction, relief cut, dan akurasi pola bentangan (unfold pattern).'
      },
      {
        id: 'e2c3d4e5-cad2-4000-8000-000000000403',
        subCpmkId: 'b2c3d4e5-cad2-4000-8000-000000000103',
        name: 'Ketepatan Assembly & Analisis Bebas Interferensi Part',
        category: 'QUALITY',
        description: 'Penyusunan mate/constraint perakitan struktur, cek tabrakan interferensi, dan integrasi spool perpipaan.'
      },
      {
        id: 'e2c3d4e5-cad2-4000-8000-000000000404',
        subCpmkId: 'b2c3d4e5-cad2-4000-8000-000000000104',
        name: 'Standar Gambar Kerja & Kelengkapan Simbol Las (ISO 2553 / AWS)',
        category: 'QUALITY',
        description: 'Penerapan standar shop drawing ISO, detail potongan las, penunjukan simbol las AWS/ISO dan notasi ekor WPS.'
      },
      {
        id: 'e2c3d4e5-cad2-4000-8000-000000000405',
        name: 'Sikap Kerja, Kedisiplinan & Keselamatan K3 Bengkel/Studio',
        category: 'ATTITUDE',
        description: 'Disiplin kehadiran WITA, kepatuhan K3 keselamatan lab, etika kerja, dan tanggung jawab workstation CAD.'
      },
      {
        id: 'e2c3d4e5-cad2-4000-8000-000000000406',
        name: 'Inisiatif Optimasi Desain Fabrikasi & Efisiensi Material (Nesting)',
        category: 'CREATIVITY',
        description: 'Inisiatif optimasi layout profil struktur, nesting lembaran plat untuk meminimalkan scrap material fabrikasi.'
      },
      {
        id: 'e2c3d4e5-cad2-4000-8000-000000000407',
        name: 'Sistematika Laporan Gambar Kerja & Dokumen Fabrikasi',
        category: 'REPORT',
        description: 'Kerapian format laporan, etiket standar Politeknik Sorowako, dan kelengkapan lembar instruksi kerja fabrikasi.'
      }
    ]
  },
  {
    id: 'c3d4e5f6-d002-4000-8000-000000000001',
    instructorId: 'inst-rezaf',
    name: 'Praktik DPP 2',
    code: '338RM1P',
    academicYear: '2026/2027',
    semester: 'Ganjil',
    slug: 'dpp-2-rpm',
    department: 'Rekayasa Perancangan Mekanik',
    description: 'Praktik Desain Pemodelan Parametrik 2 (DPP 2) Program Studi Rekayasa Perancangan Mekanik (RPM) Politeknik Sorowako. Meliputi metodologi perancangan produk manufaktur presisi, rekayasa nilai (value engineering), pemilihan material dan standard parts teknik, pemodelan 3D mekanikal presisi, analisis kelayakan perakitan (Design for Assembly - DFA) dan manufaktur (Design for Manufacturing - DFM), pembuatan prototype fungsional, serta penyusunan dokumen gambar kerja teknik manufaktur standar ISO.',
    status: 'PUBLISHED',
    createdAt: '2026-08-01T08:00:00.000Z',
    subCpmks: [
      {
        id: 'c3d4e5f6-d002-4000-8000-000000000101',
        code: 'Sub-CPMK 1',
        description: 'Mampu mengidentifikasi kebutuhan spesifikasi teknis produk, menyusun Product Design Specification (PDS), serta mengembangkan alternatif konsep desain produk mekanik presisi.',
        weightPercent: 20
      },
      {
        id: 'c3d4e5f6-d002-4000-8000-000000000102',
        code: 'Sub-CPMK 2',
        description: 'Mampu menerapkan kaidah Design for Manufacturing (DFM) dan Design for Assembly (DFA) dalam pemilihan komponen mekanik presisi, material teknik, dan metode proses manufaktur.',
        weightPercent: 25
      },
      {
        id: 'c3d4e5f6-d002-4000-8000-000000000103',
        code: 'Sub-CPMK 3',
        description: 'Mampu membuat pemodelan 3D CAD parametrik perakitan produk mekanikal presisi lengkap dengan analisis toleransi geometri (GD&T ISO 1101) dan bebas tabrakan (zero collision).',
        weightPercent: 30
      },
      {
        id: 'c3d4e5f6-d002-4000-8000-000000000104',
        code: 'Sub-CPMK 4',
        description: 'Mampu menghasilkan prototype fungsional mekanik, menyusun Bill of Materials (BOM) terstruktur, dan menyajikan laporan rekayasa perancangan standar industri manufaktur.',
        weightPercent: 25
      }
    ],
    qualityRubrics: [
      {
        id: 'f3d4e5f6-d002-4000-8000-000000000401',
        subCpmkId: 'c3d4e5f6-d002-4000-8000-000000000101',
        name: 'Ketajaman Analisis Spesifikasi Teknis & Kelengkapan PDS',
        category: 'QUALITY',
        description: 'Kejelasan batasan desain, kriteria kinerja mekanik, beban operasional, dan kepatuhan standar industri.'
      },
      {
        id: 'f3d4e5f6-d002-4000-8000-000000000402',
        subCpmkId: 'c3d4e5f6-d002-4000-8000-000000000102',
        name: 'Efisiensi Desain Berdasarkan Kaidah DFM & DFA',
        category: 'QUALITY',
        description: 'Kemudahan perakitan (jumlah part minimal, tool access) dan kemudahan proses permesinan/fabrikasi komponen.'
      },
      {
        id: 'f3d4e5f6-d002-4000-8000-000000000403',
        subCpmkId: 'c3d4e5f6-d002-4000-8000-000000000102',
        name: 'Kesesuaian Pemilihan Material & Standar Komponen Komersial',
        category: 'QUALITY',
        description: 'Rasionalitas pemilihan grade material (baja paduan, alumunium, polimer) dan penggunaan fastener/bearing standar DIN/ISO.'
      },
      {
        id: 'f3d4e5f6-d002-4000-8000-000000000404',
        subCpmkId: 'c3d4e5f6-d002-4000-8000-000000000103',
        name: 'Akurasi Pemodelan 3D Assembly & Integritas Kinematika',
        category: 'QUALITY',
        description: 'Akurasi mates/constraints perakitan, mekanisme bebas interferensi gerakan, dan ketepatan rantai toleransi dimensi.'
      },
      {
        id: 'f3d4e5f6-d002-4000-8000-000000000405',
        subCpmkId: 'c3d4e5f6-d002-4000-8000-000000000103',
        name: 'Standar Penerapan Toleransi Geometri (GD&T ISO 1101)',
        category: 'QUALITY',
        description: 'Penerapan datum, toleransi bentuk, orientasi, dan lokasi (posisi, runout, kesilindrisan) sesuai fungsi kerja part.'
      },
      {
        id: 'f3d4e5f6-d002-4000-8000-000000000406',
        subCpmkId: 'c3d4e5f6-d002-4000-8000-000000000104',
        name: 'Kualitas Gambar Kerja Manufaktur 2D & Akurasi BOM',
        category: 'QUALITY',
        description: 'Kelengkapan proyeksi, potongan kompleks, detail ulir/chamfer, simbol kekasaran permukaan Ra, dan Bill of Materials.'
      },
      {
        id: 'f3d4e5f6-d002-4000-8000-000000000407',
        subCpmkId: 'c3d4e5f6-d002-4000-8000-000000000104',
        name: 'Kinerja Prototype Fungsional & Presentasi Rekayasa',
        category: 'QUALITY',
        description: 'Keberhasilan operasional prototipe mekanik, pemenuhan kriteria PDS, dan profesionalisme penyajian laporan teknis.'
      },
      {
        id: 'f3d4e5f6-d002-4000-8000-000000000408',
        name: 'Kedisiplinan Waktu & Kepatuhan APD / K3',
        category: 'ATTITUDE',
        description: 'Ketepatan waktu kehadiran WITA, kepatuhan K3 bengkel/lab komputer, dan etika kerja.'
      },
      {
        id: 'f3d4e5f6-d002-4000-8000-000000000409',
        name: 'Tanggung Jawab & Perawatan Fasilitas Lab CAD',
        category: 'ATTITUDE',
        description: 'Kerapian workstation, pemeliharaan software/hardware, dan kerja sama tim.'
      },
      {
        id: 'f3d4e5f6-d002-4000-8000-000000000410',
        name: 'Inisiatif Desain & Optimasi Fitur CAD',
        category: 'CREATIVITY',
        description: 'Kemampuan eksplorasi alternatif pemodelan 3D, efisiensi feature tree, dan inovasi bentuk.'
      },
      {
        id: 'f3d4e5f6-d002-4000-8000-000000000411',
        name: 'Kelengkapan Laporan Praktik & Etiket Drafting',
        category: 'REPORT',
        description: 'Sistematika pelaporan, lembar kerja job sheet, serta kelengkapan dimensi toleransi ISO.'
      }
    ]
  }
];

// 3 Gelombang Periode Praktik CAD 1.1 Sesuai Kalender Akademik Poliwako 2026
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
    status: 'COMPLETED',
    finalProjectDriveUrl: 'https://drive.google.com/drive/folders/poliwako-cad1-g2',
    createdAt: '2026-08-10T08:00:00.000Z'
  },
  {
    id: 'per-cad1-1-g3',
    courseId: 'course-cad-1-1',
    name: 'Gelombang 3 (Minggu 38)',
    periodNumber: 3,
    startDate: '2026-09-14',
    endDate: '2026-09-18',
    status: 'UPCOMING',
    autoStatus: true,
    finalProjectDriveUrl: 'https://drive.google.com/drive/folders/poliwako-cad1-g3',
    createdAt: '2026-08-10T08:00:00.000Z'
  },
  // 6 Gelombang Periode Praktik CAD 2 (Prodi TRPF - Kelas 2D)
  {
    id: 'c2b2c3d4-cad2-4000-8000-000000000201',
    courseId: 'b2c3d4e5-cad2-4000-8000-000000000001',
    name: 'Gelombang 1 (Minggu 34)',
    periodNumber: 1,
    startDate: '2026-08-17',
    endDate: '2026-08-21',
    status: 'COMPLETED',
    autoStatus: true,
    finalProjectDriveUrl: 'https://drive.google.com/drive/folders/poliwako-cad2-g1',
    createdAt: '2026-08-15T08:00:00.000Z'
  },
  {
    id: 'c2b2c3d4-cad2-4000-8000-000000000202',
    courseId: 'b2c3d4e5-cad2-4000-8000-000000000001',
    name: 'Gelombang 2 (Minggu 36)',
    periodNumber: 2,
    startDate: '2026-08-31',
    endDate: '2026-09-04',
    status: 'COMPLETED',
    autoStatus: true,
    finalProjectDriveUrl: 'https://drive.google.com/drive/folders/poliwako-cad2-g2',
    createdAt: '2026-08-25T08:00:00.000Z'
  },
  {
    id: 'c2b2c3d4-cad2-4000-8000-000000000203',
    courseId: 'b2c3d4e5-cad2-4000-8000-000000000001',
    name: 'Gelombang 3 (Minggu 38)',
    periodNumber: 3,
    startDate: '2026-09-14',
    endDate: '2026-09-18',
    status: 'UPCOMING',
    autoStatus: true,
    finalProjectDriveUrl: 'https://drive.google.com/drive/folders/poliwako-cad2-g3',
    createdAt: '2026-09-01T08:00:00.000Z'
  },
  {
    id: 'c2b2c3d4-cad2-4000-8000-000000000204',
    courseId: 'b2c3d4e5-cad2-4000-8000-000000000001',
    name: 'Gelombang 4 (Minggu 40)',
    periodNumber: 4,
    startDate: '2026-09-28',
    endDate: '2026-10-02',
    status: 'UPCOMING',
    finalProjectDriveUrl: 'https://drive.google.com/drive/folders/poliwako-cad2-g4',
    createdAt: '2026-09-01T08:00:00.000Z'
  },
  {
    id: 'c2b2c3d4-cad2-4000-8000-000000000205',
    courseId: 'b2c3d4e5-cad2-4000-8000-000000000001',
    name: 'Gelombang 5 (Minggu 43)',
    periodNumber: 5,
    startDate: '2026-10-19',
    endDate: '2026-10-23',
    status: 'UPCOMING',
    finalProjectDriveUrl: 'https://drive.google.com/drive/folders/poliwako-cad2-g5',
    createdAt: '2026-09-01T08:00:00.000Z'
  },
  {
    id: 'c2b2c3d4-cad2-4000-8000-000000000206',
    courseId: 'b2c3d4e5-cad2-4000-8000-000000000001',
    name: 'Gelombang 6 (Minggu 45)',
    periodNumber: 6,
    startDate: '2026-11-02',
    endDate: '2026-11-06',
    status: 'UPCOMING',
    finalProjectDriveUrl: 'https://drive.google.com/drive/folders/poliwako-cad2-g6',
    createdAt: '2026-09-01T08:00:00.000Z'
  },
  ...officialRpm.courses.find(c => c.code === 'DPP')!.periods.map(p => ({
    id: `e3d4e5f6-d002-4000-8000-00000000020${p.periodNumber}`,
    courseId: 'c3d4e5f6-d002-4000-8000-000000000001',
    name: p.name, periodNumber: p.periodNumber, startDate: p.startDate, endDate: p.endDate,
    status: rpmPeriodStatus(p.startDate, p.endDate), autoStatus: true, createdAt: '2026-08-01T08:00:00.000Z',
  })),
];

// Distribusi Peserta Real CAD 1.1 Berdasarkan Jadwal Resmi Kelas 1C
export const INITIAL_PARTICIPANTS: PracticeParticipant[] = [
  ...officialRpm.courses.flatMap(course => course.periods.flatMap(period => period.nims.map(nim => {
    const student = INITIAL_STUDENTS.find(s => s.nim === nim)!;
    const periodId = course.code === 'DPP'
      ? `e3d4e5f6-d002-4000-8000-00000000020${period.periodNumber}`
      : `per-cad1-1-g${period.periodNumber}`;
    return {
      id: `part-${course.code}-g${period.periodNumber}-${nim}`, periodId,
      studentId: student.id, student, enrolledAt: period.startDate + 'T00:00:00.000Z',
      progressStatus: 'NOT_STARTED' as const, finalProjectConfirmed: false,
    };
  }))),
  // Gelombang 1 CAD 2
  { id: 'part-cad2-g1-01', periodId: 'c2b2c3d4-cad2-4000-8000-000000000201', studentId: 'std-22502003', student: INITIAL_STUDENTS.find(s => s.nim === '22502003')!, enrolledAt: '2026-09-07T08:00:00.000Z', progressStatus: 'IN_PROGRESS', finalProjectConfirmed: true },
  { id: 'part-cad2-g1-02', periodId: 'c2b2c3d4-cad2-4000-8000-000000000201', studentId: 'std-22502007', student: INITIAL_STUDENTS.find(s => s.nim === '22502007')!, enrolledAt: '2026-09-07T08:00:00.000Z', progressStatus: 'IN_PROGRESS', finalProjectConfirmed: true },
  { id: 'part-cad2-g1-03', periodId: 'c2b2c3d4-cad2-4000-8000-000000000201', studentId: 'std-22502014', student: INITIAL_STUDENTS.find(s => s.nim === '22502014')!, enrolledAt: '2026-09-07T08:00:00.000Z', progressStatus: 'IN_PROGRESS', finalProjectConfirmed: true },
  { id: 'part-cad2-g1-04', periodId: 'c2b2c3d4-cad2-4000-8000-000000000201', studentId: 'std-22502020', student: INITIAL_STUDENTS.find(s => s.nim === '22502020')!, enrolledAt: '2026-09-07T08:00:00.000Z', progressStatus: 'IN_PROGRESS', finalProjectConfirmed: true },
  { id: 'part-cad2-g1-05', periodId: 'c2b2c3d4-cad2-4000-8000-000000000201', studentId: 'std-22502027', student: INITIAL_STUDENTS.find(s => s.nim === '22502027')!, enrolledAt: '2026-09-07T08:00:00.000Z', progressStatus: 'IN_PROGRESS', finalProjectConfirmed: true },
  { id: 'part-cad2-g1-06', periodId: 'c2b2c3d4-cad2-4000-8000-000000000201', studentId: 'std-22502034', student: INITIAL_STUDENTS.find(s => s.nim === '22502034')!, enrolledAt: '2026-09-07T08:00:00.000Z', progressStatus: 'IN_PROGRESS', finalProjectConfirmed: true },

  // Gelombang 2 CAD 2
  { id: 'part-cad2-g2-01', periodId: 'c2b2c3d4-cad2-4000-8000-000000000202', studentId: 'std-22502004', student: INITIAL_STUDENTS.find(s => s.nim === '22502004')!, enrolledAt: '2026-09-14T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g2-02', periodId: 'c2b2c3d4-cad2-4000-8000-000000000202', studentId: 'std-22502009', student: INITIAL_STUDENTS.find(s => s.nim === '22502009')!, enrolledAt: '2026-09-14T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g2-03', periodId: 'c2b2c3d4-cad2-4000-8000-000000000202', studentId: 'std-22502015', student: INITIAL_STUDENTS.find(s => s.nim === '22502015')!, enrolledAt: '2026-09-14T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g2-04', periodId: 'c2b2c3d4-cad2-4000-8000-000000000202', studentId: 'std-22502022', student: INITIAL_STUDENTS.find(s => s.nim === '22502022')!, enrolledAt: '2026-09-14T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g2-05', periodId: 'c2b2c3d4-cad2-4000-8000-000000000202', studentId: 'std-22502028', student: INITIAL_STUDENTS.find(s => s.nim === '22502028')!, enrolledAt: '2026-09-14T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g2-06', periodId: 'c2b2c3d4-cad2-4000-8000-000000000202', studentId: 'std-22502033', student: INITIAL_STUDENTS.find(s => s.nim === '22502033')!, enrolledAt: '2026-09-14T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },

  // Gelombang 3 CAD 2
  { id: 'part-cad2-g3-01', periodId: 'c2b2c3d4-cad2-4000-8000-000000000203', studentId: 'std-22502005', student: INITIAL_STUDENTS.find(s => s.nim === '22502005')!, enrolledAt: '2026-09-21T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g3-02', periodId: 'c2b2c3d4-cad2-4000-8000-000000000203', studentId: 'std-22502010', student: INITIAL_STUDENTS.find(s => s.nim === '22502010')!, enrolledAt: '2026-09-21T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g3-03', periodId: 'c2b2c3d4-cad2-4000-8000-000000000203', studentId: 'std-22502016', student: INITIAL_STUDENTS.find(s => s.nim === '22502016')!, enrolledAt: '2026-09-21T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g3-04', periodId: 'c2b2c3d4-cad2-4000-8000-000000000203', studentId: 'std-22502023', student: INITIAL_STUDENTS.find(s => s.nim === '22502023')!, enrolledAt: '2026-09-21T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g3-05', periodId: 'c2b2c3d4-cad2-4000-8000-000000000203', studentId: 'std-22502030', student: INITIAL_STUDENTS.find(s => s.nim === '22502030')!, enrolledAt: '2026-09-21T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g3-06', periodId: 'c2b2c3d4-cad2-4000-8000-000000000203', studentId: 'std-22502036', student: INITIAL_STUDENTS.find(s => s.nim === '22502036')!, enrolledAt: '2026-09-21T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },

  // Gelombang 4 CAD 2
  { id: 'part-cad2-g4-01', periodId: 'c2b2c3d4-cad2-4000-8000-000000000204', studentId: 'std-22502002', student: INITIAL_STUDENTS.find(s => s.nim === '22502002')!, enrolledAt: '2026-09-28T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g4-02', periodId: 'c2b2c3d4-cad2-4000-8000-000000000204', studentId: 'std-22502007', student: INITIAL_STUDENTS.find(s => s.nim === '22502007')!, enrolledAt: '2026-09-28T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g4-03', periodId: 'c2b2c3d4-cad2-4000-8000-000000000204', studentId: 'std-22502018', student: INITIAL_STUDENTS.find(s => s.nim === '22502018')!, enrolledAt: '2026-09-28T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g4-04', periodId: 'c2b2c3d4-cad2-4000-8000-000000000204', studentId: 'std-22502026', student: INITIAL_STUDENTS.find(s => s.nim === '22502026')!, enrolledAt: '2026-09-28T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g4-05', periodId: 'c2b2c3d4-cad2-4000-8000-000000000204', studentId: 'std-22502031', student: INITIAL_STUDENTS.find(s => s.nim === '22502031')!, enrolledAt: '2026-09-28T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g4-06', periodId: 'c2b2c3d4-cad2-4000-8000-000000000204', studentId: 'std-22502035', student: INITIAL_STUDENTS.find(s => s.nim === '22502035')!, enrolledAt: '2026-09-28T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },

  // Gelombang 5 CAD 2
  { id: 'part-cad2-g5-01', periodId: 'c2b2c3d4-cad2-4000-8000-000000000205', studentId: 'std-22502001', student: INITIAL_STUDENTS.find(s => s.nim === '22502001')!, enrolledAt: '2026-10-05T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g5-02', periodId: 'c2b2c3d4-cad2-4000-8000-000000000205', studentId: 'std-22502012', student: INITIAL_STUDENTS.find(s => s.nim === '22502012')!, enrolledAt: '2026-10-05T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g5-03', periodId: 'c2b2c3d4-cad2-4000-8000-000000000205', studentId: 'std-22502019', student: INITIAL_STUDENTS.find(s => s.nim === '22502019')!, enrolledAt: '2026-10-05T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g5-04', periodId: 'c2b2c3d4-cad2-4000-8000-000000000205', studentId: 'std-22502025', student: INITIAL_STUDENTS.find(s => s.nim === '22502025')!, enrolledAt: '2026-10-05T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g5-05', periodId: 'c2b2c3d4-cad2-4000-8000-000000000205', studentId: 'std-22502029', student: INITIAL_STUDENTS.find(s => s.nim === '22502029')!, enrolledAt: '2026-10-05T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g5-06', periodId: 'c2b2c3d4-cad2-4000-8000-000000000205', studentId: 'std-22502032', student: INITIAL_STUDENTS.find(s => s.nim === '22502032')!, enrolledAt: '2026-10-05T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },

  // Gelombang 6 CAD 2
  { id: 'part-cad2-g6-01', periodId: 'c2b2c3d4-cad2-4000-8000-000000000206', studentId: 'std-22502006', student: INITIAL_STUDENTS.find(s => s.nim === '22502006')!, enrolledAt: '2026-10-12T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g6-02', periodId: 'c2b2c3d4-cad2-4000-8000-000000000206', studentId: 'std-22502008', student: INITIAL_STUDENTS.find(s => s.nim === '22502008')!, enrolledAt: '2026-10-12T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g6-03', periodId: 'c2b2c3d4-cad2-4000-8000-000000000206', studentId: 'std-22502011', student: INITIAL_STUDENTS.find(s => s.nim === '22502011')!, enrolledAt: '2026-10-12T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g6-04', periodId: 'c2b2c3d4-cad2-4000-8000-000000000206', studentId: 'std-22502013', student: INITIAL_STUDENTS.find(s => s.nim === '22502013')!, enrolledAt: '2026-10-12T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g6-05', periodId: 'c2b2c3d4-cad2-4000-8000-000000000206', studentId: 'std-22502017', student: INITIAL_STUDENTS.find(s => s.nim === '22502017')!, enrolledAt: '2026-10-12T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false },
  { id: 'part-cad2-g6-06', periodId: 'c2b2c3d4-cad2-4000-8000-000000000206', studentId: 'std-22502024', student: INITIAL_STUDENTS.find(s => s.nim === '22502024')!, enrolledAt: '2026-10-12T08:00:00.000Z', progressStatus: 'NOT_STARTED', finalProjectConfirmed: false }
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
  },
  // 5 Modul Pembelajaran Praktik CAD 2 untuk Gelombang 1
  {
    id: 'd2b2c3d4-cad2-4000-8000-000000000301',
    periodId: 'c2b2c3d4-cad2-4000-8000-000000000201',
    unitNumber: 1,
    title: 'Modul 1: Pemodelan Rangka Struktur Baja Las (Weldment & Structural Member)',
    description: 'Pemodelan struktur rangka batang baja, standar profil (Hollow SHS/RHS, WF, UNP, Siku), corner treatment (miter/butt), gusset, end cap, dan Cut List fabrikasi.',
    materials: [
      {
        id: 'f2c3d4e5-cad2-4000-8000-000000000501',
        unitId: 'd2b2c3d4-cad2-4000-8000-000000000301',
        title: 'Panduan Teknis 1.1: Pemodelan Profil Baja Struktural & Corner Treatment',
        type: 'RICHTEXT',
        contentText: 'Panduan lengkap pemodelan rangka batang 3D sketch, pemilihan profil baja, dan corner treatment miter/butt.'
      }
    ],
    assignment: {
      id: 'a2c3d4e5-cad2-4000-8000-000000000601',
      unitId: 'd2b2c3d4-cad2-4000-8000-000000000301',
      periodId: 'c2b2c3d4-cad2-4000-8000-000000000201',
      title: 'Tugas Modul 1: Desain & Cut List Rangka Meja Fabrikasi Heavy-Duty',
      description: 'Kumpulkan lembar gambar kerja 3D Weldment rangka meja kerja fabrikasi lengkap dengan Cut List Table terinci. Format file PDF.',
      deadline: '11 September 2026, 17:00 WITA',
      maxScore: 100,
      allowedFileType: 'PDF'
    }
  },
  {
    id: 'd2b2c3d4-cad2-4000-8000-000000000302',
    periodId: 'c2b2c3d4-cad2-4000-8000-000000000201',
    unitNumber: 2,
    title: 'Modul 2: Perancangan Lembaran Logam & Pola Bentangan (Sheet Metal Design & Unfold)',
    description: 'Fitur Base Flange, Edge Flange, Miter Flange, Hem, dan Corner Relief. Penentuan parameter K-Factor/Bend Allowance, dan pola bentangan datar (flat pattern).',
    materials: [
      {
        id: 'f2c3d4e5-cad2-4000-8000-000000000503',
        unitId: 'd2b2c3d4-cad2-4000-8000-000000000302',
        title: 'Panduan Teknis 2.1: Prinsip Desain Lembaran Logam & Bending Allowance',
        type: 'RICHTEXT',
        contentText: 'Prinsip desain lembaran logam, sumbu netral, perhitungan K-factor, dan bentangan unfold untuk CNC cutting.'
      }
    ],
    assignment: {
      id: 'a2c3d4e5-cad2-4000-8000-000000000602',
      unitId: 'd2b2c3d4-cad2-4000-8000-000000000302',
      periodId: 'c2b2c3d4-cad2-4000-8000-000000000201',
      title: 'Tugas Modul 2: Pemodelan Enclosure Fabrikasi Lembaran Logam & Flat Pattern',
      description: 'Upload laporan hasil pemodelan 3D bodi enclosure, diagram bentangan datar (Flat Pattern Unfold), dan tabel K-factor. Format PDF.',
      deadline: '11 September 2026, 17:00 WITA',
      maxScore: 100,
      allowedFileType: 'PDF'
    }
  },
  {
    id: 'd2b2c3d4-cad2-4000-8000-000000000303',
    periodId: 'c2b2c3d4-cad2-4000-8000-000000000201',
    unitNumber: 3,
    title: 'Modul 3: Desain Tangki, Bejana Tekan & Sistem Perpipaan (Pressure Vessel & Piping Spool)',
    description: 'Pemodelan silinder shell roll, head torispherical/ellipsoidal, orientasi nozzle, dan perancangan jalur isometrik piping spool standar ASME/ISO.',
    materials: [
      {
        id: 'f2c3d4e5-cad2-4000-8000-000000000505',
        unitId: 'd2b2c3d4-cad2-4000-8000-000000000303',
        title: 'Panduan Teknis 3.1: Konstruksi Bejana Tekan & Standar Piping Spool',
        type: 'RICHTEXT',
        contentText: 'Anatomi bejana tekan, pemilihan head bejana, orientasi nozzle, dan standar spool perpipaan butt-weld.'
      }
    ],
    assignment: {
      id: 'a2c3d4e5-cad2-4000-8000-000000000603',
      unitId: 'd2b2c3d4-cad2-4000-8000-000000000303',
      periodId: 'c2b2c3d4-cad2-4000-8000-000000000201',
      title: 'Tugas Modul 3: Desain Tangki Penampung Fluida & Isometrik Spool Pipa',
      description: 'Kumpulkan gambar model 3D tangki bertekanan dengan nozzle dan isometrik spool jalur perpipaan standar ASME. Format PDF.',
      deadline: '11 September 2026, 17:00 WITA',
      maxScore: 100,
      allowedFileType: 'PDF'
    }
  },
  {
    id: 'd2b2c3d4-cad2-4000-8000-000000000304',
    periodId: 'c2b2c3d4-cad2-4000-8000-000000000201',
    unitNumber: 4,
    title: 'Modul 4: Perakitan Struktur Fabrikasi & Bill of Materials (Assembly & Cut List BOM)',
    description: 'Strategi assembly konstruksi fabrikasi, constraint geometri, uji tabrakan interferensi, dan otomatisasi tabel Bill of Materials (BOM) estimasi berat.',
    materials: [
      {
        id: 'f2c3d4e5-cad2-4000-8000-000000000506',
        unitId: 'd2b2c3d4-cad2-4000-8000-000000000304',
        title: 'Panduan Teknis 4.1: Perakitan Struktur Fabrikasi & Otomatisasi BOM',
        type: 'RICHTEXT',
        contentText: 'Metodologi perakitan struktur fabrikasi, cek interferensi part, dan penyusunan tabel BOM material baja.'
      }
    ],
    assignment: {
      id: 'a2c3d4e5-cad2-4000-8000-000000000604',
      unitId: 'd2b2c3d4-cad2-4000-8000-000000000304',
      periodId: 'c2b2c3d4-cad2-4000-8000-000000000201',
      title: 'Tugas Modul 4: Evaluasi Perakitan Gantry Frame & Tabel Bill of Materials (BOM)',
      description: 'Laporan analisis perakitan struktur fabrikasi gantry crane, hasil uji tabrakan part, dan tabel BOM lengkap estimasi berat. Format PDF.',
      deadline: '11 September 2026, 17:00 WITA',
      maxScore: 100,
      allowedFileType: 'PDF'
    }
  },
  {
    id: 'd2b2c3d4-cad2-4000-8000-000000000305',
    periodId: 'c2b2c3d4-cad2-4000-8000-000000000201',
    unitNumber: 5,
    title: 'Modul 5: Technical Drafting Fabrikasi & Notasi Simbol Las Standar (ISO 2553 & AWS A2.4)',
    description: 'Penyusunan gambar kerja shop drawing A3 ISO, proyeksi ortogonal, irisan detail sambungan las, dan notasi simbol pengelasan AWS/ISO lengkap notasi WPS.',
    materials: [
      {
        id: 'f2c3d4e5-cad2-4000-8000-000000000507',
        unitId: 'd2b2c3d4-cad2-4000-8000-000000000305',
        title: 'Panduan Lengkap 5.1: Notasi Simbol Pengelasan Standar ISO 2553 & AWS A2.4',
        type: 'RICHTEXT',
        contentText: 'Anatomi simbol las: garis referensi, panah, simbol dasar (fillet/groove), simbol tambahan all-around/field weld, dan notasi ekor WPS.'
      }
    ],
    assignment: {
      id: 'a2c3d4e5-cad2-4000-8000-000000000605',
      unitId: 'd2b2c3d4-cad2-4000-8000-000000000305',
      periodId: 'c2b2c3d4-cad2-4000-8000-000000000201',
      title: 'Tugas Modul 5 (Tugas Akhir): Shop Drawing Fabrikasi Komprehensif Berstandar Simbol Las ISO/AWS',
      description: 'Karya akhir gambar kerja shop drawing fabrikasi ukuran A3 standar Politeknik Sorowako lengkap simbol pengelasan AWS/ISO dan etiket resmi. Format PDF.',
      deadline: '11 September 2026, 17:00 WITA',
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
