// Reactive LocalStorage & Mock Persistence Service

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

import {
  INITIAL_INSTRUCTOR,
  INITIAL_STUDENTS,
  INITIAL_COURSES,
  INITIAL_PERIODS,
  INITIAL_LEARNING_UNITS,
  INITIAL_PARTICIPANTS,
  INITIAL_UNIT_PROGRESS,
  INITIAL_SUBMISSIONS,
  INITIAL_ATTENDANCE,
  INITIAL_ASSESSMENTS,
  INITIAL_REMEDIALS,
  INITIAL_FEEDBACK_RULES
} from '../data/mockData';

const STORAGE_KEYS = {
  INSTRUCTOR: 'poliwako_instructor',
  STUDENTS: 'poliwako_students',
  COURSES: 'poliwako_courses',
  PERIODS: 'poliwako_periods',
  LEARNING_UNITS: 'poliwako_learning_units',
  PARTICIPANTS: 'poliwako_participants',
  UNIT_PROGRESS: 'poliwako_unit_progress',
  SUBMISSIONS: 'poliwako_submissions',
  ATTENDANCE: 'poliwako_attendance',
  ASSESSMENTS: 'poliwako_assessments',
  REMEDIALS: 'poliwako_remedials',
  FEEDBACK_RULES: 'poliwako_feedback_rules',
  CURRENT_STUDENT_SESSION: 'poliwako_student_session',
  ACTIVE_COURSE_ID: 'poliwako_active_course_id'
};

const CLEAN_VERSION_KEY = 'poliwako_clean_real_v1';

// Auto-purge old dummy data if clean version flag is missing
if (typeof window !== 'undefined' && !localStorage.getItem(CLEAN_VERSION_KEY)) {
  localStorage.clear();
  localStorage.setItem(CLEAN_VERSION_KEY, 'true');
  localStorage.setItem(STORAGE_KEYS.INSTRUCTOR, JSON.stringify(INITIAL_INSTRUCTOR));
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(INITIAL_STUDENTS));
  localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(INITIAL_COURSES));
  localStorage.setItem(STORAGE_KEYS.PERIODS, JSON.stringify(INITIAL_PERIODS));
  localStorage.setItem(STORAGE_KEYS.LEARNING_UNITS, JSON.stringify(INITIAL_LEARNING_UNITS));
  localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(INITIAL_PARTICIPANTS));
  localStorage.setItem(STORAGE_KEYS.UNIT_PROGRESS, JSON.stringify(INITIAL_UNIT_PROGRESS));
  localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(INITIAL_SUBMISSIONS));
  localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(INITIAL_ATTENDANCE));
  localStorage.setItem(STORAGE_KEYS.ASSESSMENTS, JSON.stringify(INITIAL_ASSESSMENTS));
  localStorage.setItem(STORAGE_KEYS.REMEDIALS, JSON.stringify(INITIAL_REMEDIALS));
  localStorage.setItem(STORAGE_KEYS.FEEDBACK_RULES, JSON.stringify(INITIAL_FEEDBACK_RULES));
}

function getItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.warn(`Error reading localStorage key ${key}:`, e);
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error saving to localStorage key ${key}:`, e);
  }
}

export class StorageService {
  // Reset all to clean real initial state without dummy data
  static resetToDefault(): void {
    localStorage.clear();
    localStorage.setItem(CLEAN_VERSION_KEY, 'true');
    setItem(STORAGE_KEYS.INSTRUCTOR, INITIAL_INSTRUCTOR);
    setItem(STORAGE_KEYS.STUDENTS, []);
    setItem(STORAGE_KEYS.COURSES, []);
    setItem(STORAGE_KEYS.PERIODS, []);
    setItem(STORAGE_KEYS.LEARNING_UNITS, []);
    setItem(STORAGE_KEYS.PARTICIPANTS, []);
    setItem(STORAGE_KEYS.UNIT_PROGRESS, []);
    setItem(STORAGE_KEYS.SUBMISSIONS, []);
    setItem(STORAGE_KEYS.ATTENDANCE, []);
    setItem(STORAGE_KEYS.ASSESSMENTS, []);
    setItem(STORAGE_KEYS.REMEDIALS, []);
    setItem(STORAGE_KEYS.FEEDBACK_RULES, INITIAL_FEEDBACK_RULES);
  }

  static getInstructor(): InstructorProfile {
    return getItem<InstructorProfile>(STORAGE_KEYS.INSTRUCTOR, INITIAL_INSTRUCTOR);
  }

  static saveInstructor(instructor: InstructorProfile): void {
    setItem(STORAGE_KEYS.INSTRUCTOR, instructor);
  }

  static getStudents(): Student[] {
    return getItem<Student[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  }

  static saveStudents(students: Student[]): void {
    setItem(STORAGE_KEYS.STUDENTS, students);
  }

  static addStudent(student: Omit<Student, 'id' | 'createdAt'>): Student {
    const students = this.getStudents();
    const newStudent: Student = {
      ...student,
      id: `std-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    students.unshift(newStudent);
    this.saveStudents(students);
    return newStudent;
  }

  static getCourses(): Course[] {
    return getItem<Course[]>(STORAGE_KEYS.COURSES, INITIAL_COURSES);
  }

  static saveCourses(courses: Course[]): void {
    setItem(STORAGE_KEYS.COURSES, courses);
  }

  static getActiveCourseId(): string {
    const courses = this.getCourses();
    const savedId = getItem<string>(STORAGE_KEYS.ACTIVE_COURSE_ID, courses[0]?.id || '');
    if (courses.some(c => c.id === savedId)) return savedId;
    return courses[0]?.id || '';
  }

  static setActiveCourseId(id: string): void {
    setItem(STORAGE_KEYS.ACTIVE_COURSE_ID, id);
  }

  static getPeriods(): PracticePeriod[] {
    return getItem<PracticePeriod[]>(STORAGE_KEYS.PERIODS, INITIAL_PERIODS);
  }

  static savePeriods(periods: PracticePeriod[]): void {
    setItem(STORAGE_KEYS.PERIODS, periods);
  }

  static getLearningUnits(): LearningUnit[] {
    return getItem<LearningUnit[]>(STORAGE_KEYS.LEARNING_UNITS, INITIAL_LEARNING_UNITS);
  }

  static saveLearningUnits(units: LearningUnit[]): void {
    setItem(STORAGE_KEYS.LEARNING_UNITS, units);
  }

  static getParticipants(): PracticeParticipant[] {
    return getItem<PracticeParticipant[]>(STORAGE_KEYS.PARTICIPANTS, INITIAL_PARTICIPANTS);
  }

  static saveParticipants(participants: PracticeParticipant[]): void {
    setItem(STORAGE_KEYS.PARTICIPANTS, participants);
  }

  static getUnitProgress(): UnitProgress[] {
    return getItem<UnitProgress[]>(STORAGE_KEYS.UNIT_PROGRESS, INITIAL_UNIT_PROGRESS);
  }

  static saveUnitProgress(progress: UnitProgress[]): void {
    setItem(STORAGE_KEYS.UNIT_PROGRESS, progress);
  }

  static getSubmissions(): Submission[] {
    return getItem<Submission[]>(STORAGE_KEYS.SUBMISSIONS, INITIAL_SUBMISSIONS);
  }

  static saveSubmissions(submissions: Submission[]): void {
    setItem(STORAGE_KEYS.SUBMISSIONS, submissions);
  }

  static getAttendance(): AttendanceRecord[] {
    return getItem<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, INITIAL_ATTENDANCE);
  }

  static saveAttendance(attendance: AttendanceRecord[]): void {
    setItem(STORAGE_KEYS.ATTENDANCE, attendance);
  }

  static getAssessments(): Assessment[] {
    return getItem<Assessment[]>(STORAGE_KEYS.ASSESSMENTS, INITIAL_ASSESSMENTS);
  }

  static saveAssessments(assessments: Assessment[]): void {
    setItem(STORAGE_KEYS.ASSESSMENTS, assessments);
  }

  static getRemedials(): RemedialAssignment[] {
    return getItem<RemedialAssignment[]>(STORAGE_KEYS.REMEDIALS, INITIAL_REMEDIALS);
  }

  static saveRemedials(remedials: RemedialAssignment[]): void {
    setItem(STORAGE_KEYS.REMEDIALS, remedials);
  }

  static getFeedbackRules(): FeedbackRule[] {
    return getItem<FeedbackRule[]>(STORAGE_KEYS.FEEDBACK_RULES, INITIAL_FEEDBACK_RULES);
  }

  static saveFeedbackRules(rules: FeedbackRule[]): void {
    setItem(STORAGE_KEYS.FEEDBACK_RULES, rules);
  }

  // Student Session
  static getStudentSession(): { studentId: string; courseSlug: string; periodId: string } | null {
    return getItem(STORAGE_KEYS.CURRENT_STUDENT_SESSION, null);
  }

  static setStudentSession(session: { studentId: string; courseSlug: string; periodId: string } | null): void {
    setItem(STORAGE_KEYS.CURRENT_STUDENT_SESSION, session);
  }
}
