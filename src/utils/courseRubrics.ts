import { Course, CriterionScore, RubricCriterion } from '../types';

type GeneralCategory = 'ATTITUDE' | 'CREATIVITY' | 'REPORT';

// Preserve legacy default IDs so existing assessments retain their scores.
const DEFAULT_RUBRICS: Record<GeneralCategory, RubricCriterion[]> = {
  ATTITUDE: [
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
  }
],
  CREATIVITY: [
  {
    id: 'rub-cad1-c1',
    name: 'Inisiatif Desain & Optimasi Fitur CAD',
    category: 'CREATIVITY',
    description: 'Kemampuan eksplorasi alternatif pemodelan 3D, efisiensi feature tree, dan inovasi bentuk.'
  }
],
  REPORT: [
  {
    id: 'rub-cad1-r1',
    name: 'Kelengkapan Laporan Praktik & Etiket Drafting',
    category: 'REPORT',
    description: 'Sistematika pelaporan, lembar kerja job sheet, serta kelengkapan dimensi toleransi ISO.'
  }
]
};

export function getCourseRubrics(course: Course | null | undefined, category: GeneralCategory): RubricCriterion[] {
  const configured = course?.qualityRubrics?.filter(r => r.category === category) || [];
  return configured.length ? configured : DEFAULT_RUBRICS[category].map(r => ({ ...r }));
}

// Only active criteria contribute to the next assessment; retain scores by ID.
export function reconcileRubricScores(rubrics: RubricCriterion[], scores: CriterionScore[] | undefined, defaultScore: number, defaultLevel: string): CriterionScore[] {
  return rubrics.map(r => scores?.find(s => s.criterionId === r.id) || {
    criterionId: r.id, score: defaultScore, level: defaultLevel,
  });
}
