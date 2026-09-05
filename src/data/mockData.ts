// Clean Initial Data for Portal Praktik Poliwako
// Real Instructor Account without dummy data
// Target: Politeknik Sorowako (PRD v1.0)

import {
  InstructorProfile,
  Student,
  Course,
  PracticePeriod,
  PracticeParticipant,
  LearningUnit,
  UnitProgress,
  Assignment,
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
  department: 'Teknik Mesin'
};

// Tanpa dummy data - Dimulai dari data bersih (clean state)
export const INITIAL_STUDENTS: Student[] = [];

export const INITIAL_COURSES: Course[] = [];

export const INITIAL_PERIODS: PracticePeriod[] = [];

export const INITIAL_PARTICIPANTS: PracticeParticipant[] = [];

export const INITIAL_LEARNING_UNITS: LearningUnit[] = [];

export const INITIAL_UNIT_PROGRESS: UnitProgress[] = [];

export const INITIAL_SUBMISSIONS: Submission[] = [];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

export const INITIAL_ASSESSMENTS: Assessment[] = [];

export const INITIAL_REMEDIALS: RemedialAssignment[] = [];

export const INITIAL_FEEDBACK_RULES: FeedbackRule[] = [
  { id: 'fbr-1', courseId: 'global', minScore: 86, maxScore: 100, message: 'Sangat baik! Pertahankan kualitas kerja dan konsistensi Anda.' },
  { id: 'fbr-2', courseId: 'global', minScore: 76, maxScore: 85, message: 'Baik! Pertahankan hasilnya dan tingkatkan ketelitian.' },
  { id: 'fbr-3', courseId: 'global', minScore: 61, maxScore: 75, message: 'Cukup baik. Tingkatkan pemahaman dan kualitas pekerjaan pada praktik berikutnya.' },
  { id: 'fbr-4', courseId: 'global', minScore: 41, maxScore: 60, message: 'Perlu ditingkatkan. Pelajari kembali materi dan perhatikan ketentuan praktik.' },
  { id: 'fbr-5', courseId: 'global', minScore: 1, maxScore: 40, message: 'Perlu banyak perbaikan. Fokus pada pemahaman dasar dan penyelesaian tugas praktik.' },
  { id: 'fbr-6', courseId: 'global', minScore: 0, maxScore: 0, message: 'Belum ada capaian. Pastikan tugas praktik diselesaikan sesuai ketentuan.' },
];
