// Core Types for Portal Praktik Poliwako

export type UserRole = 'INSTRUCTOR' | 'STUDENT';

export interface InstructorProfile {
  id: string;
  email: string;
  name: string;
  nip?: string;
  avatarUrl?: string;
  department: string;
}

export interface Student {
  id: string;
  nim: string;
  name: string;
  className: string; // e.g., '2A', '2B', '3A'
  email?: string;
  password?: string;
  hasCreatedPassword?: boolean;
  createdAt: string;
}

export interface SubCPMK {
  id: string;
  code: string; // e.g. 'Sub-CPMK 1'
  description: string;
  weightPercent?: number;
}

export interface RubricLevel {
  label: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Kurang' | 'Tidak Mengerjakan';
  score: 100 | 75 | 50 | 25 | 0;
  description: string;
}

export interface RubricCriterion {
  id: string;
  subCpmkId?: string; // Links to OBE Sub-CPMK for Quality criteria
  name: string;
  category: 'QUALITY' | 'ATTITUDE' | 'CREATIVITY' | 'REPORT';
  description: string;
}

export interface Course {
  id: string;
  instructorId: string;
  name: string;
  code: string;
  academicYear: string; // e.g., '2026/2027'
  semester: 'Ganjil' | 'Genap';
  slug: string; // e.g. 'pemesinan-cnc'
  description: string;
  department: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
  subCpmks: SubCPMK[];
  qualityRubrics: RubricCriterion[];
}

export type PeriodStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED';

export interface PracticePeriod {
  id: string;
  courseId: string;
  name: string; // e.g., 'Minggu Praktik ke-1'
  periodNumber: number;
  startDate: string; // YYYY-MM-DD (Asia/Makassar WITA)
  endDate: string; // YYYY-MM-DD (5 days by default)
  status: PeriodStatus;
  finalProjectDriveUrl?: string;
  createdAt: string;
}

export interface PracticeParticipant {
  id: string;
  periodId: string;
  studentId: string;
  student: Student;
  enrolledAt: string;
  progressStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'LEARNING_COMPLETE' | 'PROJECT_SUBMITTED' | 'ASSESSED' | 'PUBLISHED';
  finalProjectSubmittedAt?: string;
  finalProjectConfirmed: boolean;
}

export type MaterialType = 'RICHTEXT' | 'PDF' | 'YOUTUBE' | 'EXTERNAL_LINK';

export interface LearningMaterial {
  id: string;
  unitId: string;
  title: string;
  type: MaterialType;
  contentUrl?: string; // PDF link or YouTube or Google Drive
  contentText?: string; // Rich text notes
  fileSize?: string;
}

export interface Assignment {
  id: string;
  unitId?: string;
  periodId: string;
  title: string;
  description: string;
  deadline: string;
  maxScore: number;
  allowedFileType: 'PDF';
}

export interface LearningUnit {
  id: string;
  periodId: string;
  unitNumber: number;
  title: string;
  description: string;
  materials: LearningMaterial[];
  assignment?: Assignment;
}

export interface UnitProgress {
  id: string;
  studentId: string;
  unitId: string;
  periodId: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  periodId: string;
  fileName: string;
  fileUrl: string;
  fileSize: string;
  submittedAt: string;
  status: 'SUBMITTED' | 'GRADED';
}

export type AttendanceStatus = 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPA';

export interface AttendanceRecord {
  id: string;
  periodId: string;
  studentId: string;
  day1: AttendanceStatus; // Day 1 = Monday
  day2: AttendanceStatus;
  day3: AttendanceStatus;
  day4: AttendanceStatus;
  day5: AttendanceStatus; // Day 5 = Friday
  percentage: number; // 0, 20, 40, 60, 80, 100
  isEligible: boolean; // >= 75% -> true (4 or 5 days)
  updatedAt: string;
}

export interface CriterionScore {
  criterionId: string;
  score: number; // 100, 75, 50, 25, 0
  level: string;
}

export interface Assessment {
  id: string;
  periodId: string;
  studentId: string;
  qualityScore: number; // 70% weight overall
  // Turunan Komponen Nilai Kualitas (Total 100% dari Kualitas):
  entryBehaviorScore?: number; // 10% (Input Nilai Kesiapan)
  subCpmkPracticeScore?: number; // 50% (Ketercapaian Praktik - dari Sub-CPMK)
  assignmentScore?: number; // 15% (Tugas Praktik - Input Nilai)
  postTestScore?: number; // 25% (Post-Test - Input Nilai & Berkas PDF)
  postTestFileUrl?: string; // Berkas PDF Post-Test
  attitudeScore: number; // 10% weight overall
  creativityScore: number; // 5% weight overall
  reportScore: number; // 15% weight overall
  finalScore: number;
  qualityScores: CriterionScore[];
  attitudeScores: CriterionScore[];
  creativityScores: CriterionScore[];
  reportScores: CriterionScore[];
  feedback: string;
  isPublished: boolean;
  publishedAt?: string;
  gradedAt: string;
  updatedAt: string;
}

export interface RemedialAssignment {
  id: string;
  periodId: string;
  studentId: string;
  title: string;
  description: string;
  deadline: string;
  submissionFileName?: string;
  submissionFileUrl?: string;
  submittedAt?: string;
  status: 'PENDING_SUBMISSION' | 'SUBMITTED' | 'LULUS' | 'BELUM_LULUS';
  reviewedAt?: string;
}

export interface FeedbackRule {
  id: string;
  courseId: string;
  minScore: number;
  maxScore: number;
  message: string;
}

export interface DailyPerformance {
  date: string;
  dayLabel: string;
  averageScore: number;
  submissionsCount: number;
}
