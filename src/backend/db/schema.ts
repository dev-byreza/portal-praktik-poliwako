// Drizzle ORM Schema for Portal Praktik Poliwako
// Database: PostgreSQL / Supabase
// Implements PRD Section 77, 78 & 108

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  jsonb,
  uniqueIndex,
  index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// 1. PROFILES (Instructors)
// ==========================================
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // maps to auth.users.id
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  nip: varchar('nip', { length: 50 }),
  department: varchar('department', { length: 100 }).notNull().default('Teknik Mesin'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const profilesRelations = relations(profiles, ({ many }) => ({
  courses: many(courses),
  students: many(students),
}));

// ==========================================
// 2. MASTER STUDENTS (Separated from Course)
// ==========================================
export const students = pgTable('students', {
  id: uuid('id').primaryKey().defaultRandom(),
  instructorId: uuid('instructor_id').references(() => profiles.id, { onDelete: 'cascade' }),
  nim: varchar('nim', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  className: varchar('class_name', { length: 50 }).notNull(), // e.g., '2A', '2B'
  email: varchar('email', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  instructorNimIdx: uniqueIndex('instructor_nim_idx').on(table.instructorId, table.nim),
  nimIdx: index('students_nim_idx').on(table.nim),
  classIdx: index('students_class_idx').on(table.className),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  instructor: one(profiles, {
    fields: [students.instructorId],
    references: [profiles.id],
  }),
  participants: many(practiceParticipants),
  submissions: many(submissions),
  unitProgress: many(unitProgress),
  attendanceRecords: many(attendanceRecords),
  assessments: many(assessments),
  remedials: many(remedialAssignments),
}));

// ==========================================
// 3. COURSES (Mata Kuliah)
// ==========================================
export const courses = pgTable('courses', {
  id: uuid('id').primaryKey().defaultRandom(),
  instructorId: uuid('instructor_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  academicYear: varchar('academic_year', { length: 50 }).notNull(), // e.g., '2026/2027'
  semester: varchar('semester', { length: 20 }).notNull(), // 'Ganjil' | 'Genap'
  slug: varchar('slug', { length: 150 }).notNull().unique(), // e.g. 'pemesinan-cnc'
  description: text('description'),
  department: varchar('department', { length: 100 }).notNull().default('Teknik Mesin'),
  status: varchar('status', { length: 30 }).notNull().default('PUBLISHED'), // 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex('courses_slug_idx').on(table.slug),
  instructorCourseIdx: index('courses_instructor_idx').on(table.instructorId),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  instructor: one(profiles, {
    fields: [courses.instructorId],
    references: [profiles.id],
  }),
  subCpmks: many(courseSubCpmk),
  rubricCriteria: many(rubricCriteria),
  periods: many(practicePeriods),
  feedbackRules: many(feedbackRules),
}));

// ==========================================
// 4. COURSE SUB-CPMK (OBE Curriculum Mapping)
// ==========================================
export const courseSubCpmk = pgTable('course_sub_cpmk', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }).notNull(), // e.g. 'Sub-CPMK 1'
  description: text('description').notNull(),
  weightPercent: numeric('weight_percent', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  courseSubCpmkIdx: index('sub_cpmk_course_idx').on(table.courseId),
}));

export const courseSubCpmkRelations = relations(courseSubCpmk, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseSubCpmk.courseId],
    references: [courses.id],
  }),
  rubricCriteria: many(rubricCriteria),
}));

// ==========================================
// 5. RUBRIC CRITERIA (OBE & General Rubrics)
// ==========================================
export const rubricCriteria = pgTable('rubric_criteria', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  subCpmkId: uuid('sub_cpmk_id').references(() => courseSubCpmk.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(), // 'QUALITY' | 'ATTITUDE' | 'CREATIVITY' | 'REPORT'
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  rubricCourseCategoryIdx: index('rubric_course_cat_idx').on(table.courseId, table.category),
}));

export const rubricCriteriaRelations = relations(rubricCriteria, ({ one }) => ({
  course: one(courses, {
    fields: [rubricCriteria.courseId],
    references: [courses.id],
  }),
  subCpmk: one(courseSubCpmk, {
    fields: [rubricCriteria.subCpmkId],
    references: [courseSubCpmk.id],
  }),
}));

// ==========================================
// 6. PRACTICE PERIODS (Periode Praktik)
// ==========================================
export const practicePeriods = pgTable('practice_periods', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(), // e.g., 'Minggu Praktik ke-1'
  periodNumber: integer('period_number').notNull(),
  startDate: date('start_date').notNull(), // YYYY-MM-DD in Asia/Makassar (WITA)
  endDate: date('end_date').notNull(), // 5 days by default
  status: varchar('status', { length: 30 }).notNull().default('UPCOMING'), // 'UPCOMING' | 'ACTIVE' | 'COMPLETED'
  finalProjectDriveUrl: text('final_project_drive_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  periodCourseIdx: index('period_course_idx').on(table.courseId),
  periodDateIdx: index('period_date_idx').on(table.startDate, table.endDate),
}));

export const practicePeriodsRelations = relations(practicePeriods, ({ one, many }) => ({
  course: one(courses, {
    fields: [practicePeriods.courseId],
    references: [courses.id],
  }),
  participants: many(practiceParticipants),
  learningUnits: many(learningUnits),
  assignments: many(assignments),
  attendanceRecords: many(attendanceRecords),
  assessments: many(assessments),
  remedialAssignments: many(remedialAssignments),
}));

// ==========================================
// 7. PRACTICE PARTICIPANTS (Peserta Praktik)
// ==========================================
export const practiceParticipants = pgTable('practice_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  periodId: uuid('period_id').notNull().references(() => practicePeriods.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
  progressStatus: varchar('progress_status', { length: 50 }).notNull().default('NOT_STARTED'),
  // 'NOT_STARTED' | 'IN_PROGRESS' | 'LEARNING_COMPLETE' | 'PROJECT_SUBMITTED' | 'ASSESSED' | 'PUBLISHED'
  finalProjectSubmittedAt: timestamp('final_project_submitted_at', { withTimezone: true }),
  finalProjectConfirmed: boolean('final_project_confirmed').notNull().default(false),
}, (table) => ({
  periodStudentIdx: uniqueIndex('participant_period_student_idx').on(table.periodId, table.studentId),
  participantPeriodIdx: index('participant_period_idx').on(table.periodId),
}));

export const practiceParticipantsRelations = relations(practiceParticipants, ({ one }) => ({
  period: one(practicePeriods, {
    fields: [practiceParticipants.periodId],
    references: [practicePeriods.id],
  }),
  student: one(students, {
    fields: [practiceParticipants.studentId],
    references: [students.id],
  }),
}));

// ==========================================
// 8. LEARNING UNITS (Modul Pembelajaran Bertahap)
// ==========================================
export const learningUnits = pgTable('learning_units', {
  id: uuid('id').primaryKey().defaultRandom(),
  periodId: uuid('period_id').notNull().references(() => practicePeriods.id, { onDelete: 'cascade' }),
  unitNumber: integer('unit_number').notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  periodUnitIdx: index('unit_period_idx').on(table.periodId, table.unitNumber),
}));

export const learningUnitsRelations = relations(learningUnits, ({ one, many }) => ({
  period: one(practicePeriods, {
    fields: [learningUnits.periodId],
    references: [practicePeriods.id],
  }),
  materials: many(learningMaterials),
  assignments: many(assignments),
  progressList: many(unitProgress),
}));

// ==========================================
// 9. LEARNING MATERIALS (Materi Unit)
// ==========================================
export const learningMaterials = pgTable('learning_materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id').notNull().references(() => learningUnits.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'RICHTEXT' | 'PDF' | 'YOUTUBE' | 'EXTERNAL_LINK'
  contentUrl: text('content_url'),
  contentText: text('content_text'),
  fileSize: varchar('file_size', { length: 50 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  materialUnitIdx: index('material_unit_idx').on(table.unitId),
}));

export const learningMaterialsRelations = relations(learningMaterials, ({ one }) => ({
  unit: one(learningUnits, {
    fields: [learningMaterials.unitId],
    references: [learningUnits.id],
  }),
}));

// ==========================================
// 10. UNIT PROGRESS (Progress Pembelajaran)
// ==========================================
export const unitProgress = pgTable('unit_progress', {
  id: uuid('id').primaryKey().defaultRandom(),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  unitId: uuid('unit_id').notNull().references(() => learningUnits.id, { onDelete: 'cascade' }),
  periodId: uuid('period_id').notNull().references(() => practicePeriods.id, { onDelete: 'cascade' }),
  isCompleted: boolean('is_completed').notNull().default(false),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({
  progressUniqueIdx: uniqueIndex('student_unit_progress_idx').on(table.studentId, table.unitId),
  progressPeriodIdx: index('unit_progress_period_idx').on(table.periodId),
}));

export const unitProgressRelations = relations(unitProgress, ({ one }) => ({
  student: one(students, {
    fields: [unitProgress.studentId],
    references: [students.id],
  }),
  unit: one(learningUnits, {
    fields: [unitProgress.unitId],
    references: [learningUnits.id],
  }),
  period: one(practicePeriods, {
    fields: [unitProgress.periodId],
    references: [practicePeriods.id],
  }),
}));

// ==========================================
// 11. ASSIGNMENTS (Tugas Praktik)
// ==========================================
export const assignments = pgTable('assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  unitId: uuid('unit_id').references(() => learningUnits.id, { onDelete: 'set null' }),
  periodId: uuid('period_id').notNull().references(() => practicePeriods.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  deadline: timestamp('deadline', { withTimezone: true }).notNull(),
  maxScore: integer('max_score').notNull().default(100),
  allowedFileType: varchar('allowed_file_type', { length: 20 }).notNull().default('PDF'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  assignmentPeriodIdx: index('assignment_period_idx').on(table.periodId),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  unit: one(learningUnits, {
    fields: [assignments.unitId],
    references: [learningUnits.id],
  }),
  period: one(practicePeriods, {
    fields: [assignments.periodId],
    references: [practicePeriods.id],
  }),
  submissions: many(submissions),
}));

// ==========================================
// 12. SUBMISSIONS (Pengumpulan Tugas PDF)
// ==========================================
export const submissions = pgTable('submissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  assignmentId: uuid('assignment_id').notNull().references(() => assignments.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  periodId: uuid('period_id').notNull().references(() => practicePeriods.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileUrl: text('file_url').notNull(),
  fileSize: varchar('file_size', { length: 50 }).notNull(),
  storagePath: text('storage_path'), // e.g. instructor/course/period/student/assignment.pdf
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  status: varchar('status', { length: 30 }).notNull().default('SUBMITTED'), // 'SUBMITTED' | 'GRADED'
}, (table) => ({
  submissionAssignmentStudentIdx: index('submission_assign_student_idx').on(table.assignmentId, table.studentId),
  submissionPeriodIdx: index('submission_period_idx').on(table.periodId),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  assignment: one(assignments, {
    fields: [submissions.assignmentId],
    references: [assignments.id],
  }),
  student: one(students, {
    fields: [submissions.studentId],
    references: [students.id],
  }),
  period: one(practicePeriods, {
    fields: [submissions.periodId],
    references: [practicePeriods.id],
  }),
}));

// ==========================================
// 13. ATTENDANCE RECORDS (Kehadiran 5 Hari Praktik)
// ==========================================
export const attendanceRecords = pgTable('attendance_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  periodId: uuid('period_id').notNull().references(() => practicePeriods.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  day1: varchar('day1', { length: 20 }).notNull().default('HADIR'), // 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPA'
  day2: varchar('day2', { length: 20 }).notNull().default('HADIR'),
  day3: varchar('day3', { length: 20 }).notNull().default('HADIR'),
  day4: varchar('day4', { length: 20 }).notNull().default('HADIR'),
  day5: varchar('day5', { length: 20 }).notNull().default('HADIR'),
  percentage: numeric('percentage', { precision: 5, scale: 2 }).notNull().default('100.00'), // 0 - 100
  isEligible: boolean('is_eligible').notNull().default(true), // >= 75%
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  attendancePeriodStudentIdx: uniqueIndex('attendance_period_student_idx').on(table.periodId, table.studentId),
}));

export const attendanceRecordsRelations = relations(attendanceRecords, ({ one }) => ({
  period: one(practicePeriods, {
    fields: [attendanceRecords.periodId],
    references: [practicePeriods.id],
  }),
  student: one(students, {
    fields: [attendanceRecords.studentId],
    references: [students.id],
  }),
}));

// ==========================================
// 14. ASSESSMENTS (Penilaian OBE & Bobot PRD)
// ==========================================
export const assessments = pgTable('assessments', {
  id: uuid('id').primaryKey().defaultRandom(),
  periodId: uuid('period_id').notNull().references(() => practicePeriods.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  qualityScore: numeric('quality_score', { precision: 5, scale: 2 }).notNull().default('0.00'), // Bobot 70%
  entryBehaviorScore: numeric('entry_behavior_score', { precision: 5, scale: 2 }), // 10% dari Kualitas
  subCpmkPracticeScore: numeric('sub_cpmk_practice_score', { precision: 5, scale: 2 }), // 50% dari Kualitas
  assignmentScore: numeric('assignment_score', { precision: 5, scale: 2 }), // 15% dari Kualitas
  postTestScore: numeric('post_test_score', { precision: 5, scale: 2 }), // 25% dari Kualitas
  postTestFileUrl: text('post_test_file_url'),
  attitudeScore: numeric('attitude_score', { precision: 5, scale: 2 }).notNull().default('0.00'), // Bobot 10%
  creativityScore: numeric('creativity_score', { precision: 5, scale: 2 }).notNull().default('0.00'), // Bobot 5%
  reportScore: numeric('report_score', { precision: 5, scale: 2 }).notNull().default('0.00'), // Bobot 15%
  finalScore: numeric('final_score', { precision: 5, scale: 2 }).notNull().default('0.00'), // Total Terhitung
  qualityScores: jsonb('quality_scores').default('[]'),
  attitudeScores: jsonb('attitude_scores').default('[]'),
  creativityScores: jsonb('creativity_scores').default('[]'),
  reportScores: jsonb('report_scores').default('[]'),
  feedback: text('feedback').notNull().default(''),
  isPublished: boolean('is_published').notNull().default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  gradedAt: timestamp('graded_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  assessmentPeriodStudentIdx: uniqueIndex('assessment_period_student_idx').on(table.periodId, table.studentId),
}));

export const assessmentsRelations = relations(assessments, ({ one }) => ({
  period: one(practicePeriods, {
    fields: [assessments.periodId],
    references: [practicePeriods.id],
  }),
  student: one(students, {
    fields: [assessments.studentId],
    references: [students.id],
  }),
}));

// ==========================================
// 15. REMEDIAL ASSIGNMENTS (Tugas Tambahan <75%)
// ==========================================
export const remedialAssignments = pgTable('remedial_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  periodId: uuid('period_id').notNull().references(() => practicePeriods.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  deadline: timestamp('deadline', { withTimezone: true }).notNull(),
  submissionFileName: varchar('submission_file_name', { length: 255 }),
  submissionFileUrl: text('submission_file_url'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  status: varchar('status', { length: 50 }).notNull().default('PENDING_SUBMISSION'),
  // 'PENDING_SUBMISSION' | 'SUBMITTED' | 'LULUS' | 'BELUM_LULUS'
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  remedialPeriodStudentIdx: index('remedial_period_student_idx').on(table.periodId, table.studentId),
}));

export const remedialAssignmentsRelations = relations(remedialAssignments, ({ one }) => ({
  period: one(practicePeriods, {
    fields: [remedialAssignments.periodId],
    references: [practicePeriods.id],
  }),
  student: one(students, {
    fields: [remedialAssignments.studentId],
    references: [students.id],
  }),
}));

// ==========================================
// 16. FEEDBACK RULES (Aturan Feedback Nilai)
// ==========================================
export const feedbackRules = pgTable('feedback_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull().references(() => courses.id, { onDelete: 'cascade' }),
  minScore: integer('min_score').notNull(),
  maxScore: integer('max_score').notNull(),
  message: text('message').notNull(),
}, (table) => ({
  feedbackCourseIdx: index('feedback_rules_course_idx').on(table.courseId),
}));

export const feedbackRulesRelations = relations(feedbackRules, ({ one }) => ({
  course: one(courses, {
    fields: [feedbackRules.courseId],
    references: [courses.id],
  }),
}));

// ==========================================
// 17. AUDIT LOGS (Audit Trail Sesuai PRD)
// ==========================================
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id'),
  courseId: uuid('course_id'),
  action: varchar('action', { length: 100 }).notNull(),
  details: jsonb('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  auditActionIdx: index('audit_action_idx').on(table.action),
  auditTimeIdx: index('audit_time_idx').on(table.createdAt),
}));
