// Grading, Attendance, and Feedback Formula Utilities for OBE

import { AttendanceRecord, AttendanceStatus, FeedbackRule } from '../types';

export const RUBRIC_LEVELS = [
  { label: 'Sangat Baik', score: 100, color: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' },
  { label: 'Baik', score: 75, color: 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100' },
  { label: 'Cukup', score: 50, color: 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100' },
  { label: 'Kurang', score: 25, color: 'bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100' },
  { label: 'Tidak Mengerjakan', score: 0, color: 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100' },
] as const;

// Standar Rujukan Distribusi Predikat Nilai Poliwako
// Rujukan: Nilai Angka, Nilai Mutu (Huruf), Sebutan Mutu (Predikat). (Tanpa Angka Mutu)
export interface GradePredicateRule {
  key: string;
  letter: string; // Nilai Mutu (A, A-, B+, B, B-, C+, C, D+, D, E)
  predicate: string; // Sebutan Mutu (Sangat Baik, Baik, Cukup, dst)
  minScore100: number; // Skala 0-100 (misal: 85.00)
  maxScore100: number; // Skala 0-100 (misal: 100.00)
  minScore10: string; // Skala 0-10 format string (misal: "8,50")
  maxScore10: string; // Skala 0-10 format string (misal: "10,00")
  range10Label: string; // "8,50 – 10,00"
  range100Label: string; // "85,00 – 100,00"
  colorClass: string;
  bgClass: string;
  borderClass: string;
  barColor: string;
}

export const GRADE_PREDICATE_RULES: GradePredicateRule[] = [
  {
    key: 'A',
    letter: 'A',
    predicate: 'Sangat Baik',
    minScore100: 85.0,
    maxScore100: 100.0,
    minScore10: '8,50',
    maxScore10: '10,00',
    range10Label: '8,50 – 10,00',
    range100Label: '85,00 – 100,00',
    colorClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200',
    barColor: 'bg-emerald-500'
  },
  {
    key: 'A_MINUS',
    letter: 'A-',
    predicate: 'Hampir Sangat Baik',
    minScore100: 80.0,
    maxScore100: 84.99,
    minScore10: '8,00',
    maxScore10: '8,49',
    range10Label: '8,00 – 8,49',
    range100Label: '80,00 – 84,99',
    colorClass: 'text-teal-700',
    bgClass: 'bg-teal-50',
    borderClass: 'border-teal-200',
    barColor: 'bg-teal-500'
  },
  {
    key: 'B_PLUS',
    letter: 'B+',
    predicate: 'Lebih dari Baik',
    minScore100: 75.0,
    maxScore100: 79.99,
    minScore10: '7,50',
    maxScore10: '7,99',
    range10Label: '7,50 – 7,99',
    range100Label: '75,00 – 79,99',
    colorClass: 'text-blue-700',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200',
    barColor: 'bg-blue-500'
  },
  {
    key: 'B',
    letter: 'B',
    predicate: 'Baik',
    minScore100: 70.0,
    maxScore100: 74.99,
    minScore10: '7,00',
    maxScore10: '7,49',
    range10Label: '7,00 – 7,49',
    range100Label: '70,00 – 74,99',
    colorClass: 'text-indigo-700',
    bgClass: 'bg-indigo-50',
    borderClass: 'border-indigo-200',
    barColor: 'bg-indigo-500'
  },
  {
    key: 'B_MINUS',
    letter: 'B-',
    predicate: 'Cukup Baik',
    minScore100: 63.0,
    maxScore100: 69.99,
    minScore10: '6,30',
    maxScore10: '6,99',
    range10Label: '6,30 – 6,99',
    range100Label: '63,00 – 69,99',
    colorClass: 'text-sky-700',
    bgClass: 'bg-sky-50',
    borderClass: 'border-sky-200',
    barColor: 'bg-sky-500'
  },
  {
    key: 'C_PLUS',
    letter: 'C+',
    predicate: 'Lebih dari Cukup',
    minScore100: 57.0,
    maxScore100: 62.99,
    minScore10: '5,70',
    maxScore10: '6,29',
    range10Label: '5,70 – 6,29',
    range100Label: '57,00 – 62,99',
    colorClass: 'text-amber-700',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200',
    barColor: 'bg-amber-500'
  },
  {
    key: 'C',
    letter: 'C',
    predicate: 'Cukup',
    minScore100: 51.0,
    maxScore100: 56.99,
    minScore10: '5,10',
    maxScore10: '5,69',
    range10Label: '5,10 – 5,69',
    range100Label: '51,00 – 56,99',
    colorClass: 'text-yellow-700',
    bgClass: 'bg-yellow-50',
    borderClass: 'border-yellow-200',
    barColor: 'bg-yellow-500'
  },
  {
    key: 'D_PLUS',
    letter: 'D+',
    predicate: 'Kurang dari Cukup',
    minScore100: 46.0,
    maxScore100: 50.99,
    minScore10: '4,60',
    maxScore10: '5,09',
    range10Label: '4,60 – 5,09',
    range100Label: '46,00 – 50,99',
    colorClass: 'text-orange-700',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-200',
    barColor: 'bg-orange-500'
  },
  {
    key: 'D',
    letter: 'D',
    predicate: 'Kurang',
    minScore100: 40.0,
    maxScore100: 45.99,
    minScore10: '4,00',
    maxScore10: '4,59',
    range10Label: '4,00 – 4,59',
    range100Label: '40,00 – 45,99',
    colorClass: 'text-rose-600',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-200',
    barColor: 'bg-rose-400'
  },
  {
    key: 'E',
    letter: 'E',
    predicate: 'Sangat Kurang',
    minScore100: 0,
    maxScore100: 39.99,
    minScore10: '0',
    maxScore10: '3,99',
    range10Label: '< 4,00',
    range100Label: '< 40,00',
    colorClass: 'text-rose-700',
    bgClass: 'bg-rose-100',
    borderClass: 'border-rose-300',
    barColor: 'bg-rose-600'
  }
];

export function getGradePredicate(score: number): GradePredicateRule {
  // Menangani skala nilai 0-100 atau 0-10
  const normalized = score > 10 ? score : score * 10;
  const match = GRADE_PREDICATE_RULES.find(rule => normalized >= rule.minScore100);
  return match || GRADE_PREDICATE_RULES[GRADE_PREDICATE_RULES.length - 1];
}

export const DEFAULT_FEEDBACK_RULES: Omit<FeedbackRule, 'courseId'>[] = [
  { id: 'fb-1', minScore: 85, maxScore: 100, message: 'Sangat baik! Pertahankan kualitas kerja dan konsistensi Anda.' },
  { id: 'fb-2', minScore: 70, maxScore: 84, message: 'Baik! Pertahankan hasilnya dan tingkatkan ketelitian.' },
  { id: 'fb-3', minScore: 57, maxScore: 69, message: 'Cukup baik. Tingkatkan pemahaman dan kualitas pekerjaan pada praktik berikutnya.' },
  { id: 'fb-4', minScore: 40, maxScore: 56, message: 'Perlu ditingkatkan. Pelajari kembali materi dan perhatikan ketentuan praktik.' },
  { id: 'fb-5', minScore: 1, maxScore: 39, message: 'Perlu banyak perbaikan. Fokus pada pemahaman dasar dan penyelesaian tugas praktik.' },
  { id: 'fb-6', minScore: 0, maxScore: 0, message: 'Belum ada capaian. Pastikan tugas praktik diselesaikan sesuai ketentuan.' },
];

// Quality Component Composite Formula (Turunan Nilai Kualitas 70%):
// Entry Behavior (10%) + Ketercapaian Praktik Sub-CPMK (50%) + Tugas (15%) + Post-Test (25%) = 100% dari Kualitas
export function calculateQualityCompositeScore(
  entryBehaviorScore: number, // 10%
  subCpmkPracticeScore: number, // 50%
  assignmentScore: number, // 15%
  postTestScore: number // 25%
): number {
  const composite = (entryBehaviorScore * 0.10) + (subCpmkPracticeScore * 0.50) + (assignmentScore * 0.15) + (postTestScore * 0.25);
  return Math.round(composite * 100) / 100;
}

export function calculateWeightedFinalScore(
  qualityScore: number,
  attitudeScore: number,
  creativityScore: number,
  reportScore: number
): number {
  // Quality (70%) + Attitude (10%) + Creativity (5%) + Report (15%)
  const final = (qualityScore * 0.70) + (attitudeScore * 0.10) + (creativityScore * 0.05) + (reportScore * 0.15);
  return Math.round(final * 100) / 100;
}

export function computeAttendanceStats(record: {
  day1: AttendanceStatus;
  day2: AttendanceStatus;
  day3: AttendanceStatus;
  day4: AttendanceStatus;
  day5: AttendanceStatus;
}): { attendedDays: number; percentage: number; isEligible: boolean } {
  const days = [record.day1, record.day2, record.day3, record.day4, record.day5];
  const attendedDays = days.filter(d => d === 'HADIR').length;
  const percentage = attendedDays * 20; // Each day is 20%
  const isEligible = percentage >= 75; // >= 75% threshold (4 or 5 days)
  return { attendedDays, percentage, isEligible };
}

export function getFeedbackForScore(score: number, customRules?: FeedbackRule[]): string {
  const rules = customRules && customRules.length > 0 ? customRules : DEFAULT_FEEDBACK_RULES;
  
  const rounded = Math.round(score);
  const matched = rules.find(r => rounded >= r.minScore && rounded <= r.maxScore);
  if (matched) return matched.message;

  if (score >= 86) return 'Sangat baik! Pertahankan kualitas kerja dan konsistensi Anda.';
  if (score >= 76) return 'Baik! Pertahankan hasilnya dan tingkatkan ketelitian.';
  if (score >= 61) return 'Cukup baik. Tingkatkan pemahaman dan kualitas pekerjaan pada praktik berikutnya.';
  if (score >= 41) return 'Perlu ditingkatkan. Pelajari kembali materi dan perhatikan ketentuan praktik.';
  if (score >= 1) return 'Perlu banyak perbaikan. Fokus pada pemahaman dasar dan penyelesaian tugas praktik.';
  return 'Belum ada capaian. Pastikan tugas praktik diselesaikan sesuai ketentuan.';
}

export function validateFeedbackRulesOverlap(rules: { minScore: number; maxScore: number }[]): string | null {
  // Check ranges are valid and non-overlapping
  for (let i = 0; i < rules.length; i++) {
    const r1 = rules[i];
    if (r1.minScore > r1.maxScore) {
      return `Rentang tidak valid: Nilai minimum (${r1.minScore}) tidak boleh lebih besar dari maksimum (${r1.maxScore}).`;
    }
    for (let j = i + 1; j < rules.length; j++) {
      const r2 = rules[j];
      const overlap = Math.max(r1.minScore, r2.minScore) <= Math.min(r1.maxScore, r2.maxScore);
      if (overlap) {
        return `Tumpang tindih rentang nilai terdeteksi antara (${r1.minScore}–${r1.maxScore}) dan (${r2.minScore}–${r2.maxScore}).`;
      }
    }
  }
  return null;
}
