import { Course, CriterionScore, QualityComponent, QualityComponentType } from '../types';

export const QUALITY_COMPONENT_DEFAULTS: QualityComponent[] = [
  { id: 'quality-entry', type: 'ENTRY_BEHAVIOR', name: 'Kesiapan Praktik', description: 'Kesiapan awal, pemahaman prasyarat, dan kepatuhan SOP dasar.', weightPercent: 10 },
  { id: 'quality-sub-cpmk', type: 'SUB_CPMK', name: 'Ketercapaian Sub-CPMK', description: 'Capaian proses praktik dan mutu benda kerja berdasarkan Sub-CPMK.', weightPercent: 50 },
  { id: 'quality-assignment', type: 'ASSIGNMENT', name: 'Tugas Praktik', description: 'Nilai tugas dan worksheet dari materi praktik.', weightPercent: 15 },
  { id: 'quality-post-test', type: 'POST_TEST', name: 'Post-Test Praktik', description: 'Nilai evaluasi akhir praktik dan inspection report.', weightPercent: 25 },
];

export const QUALITY_COMPONENT_TYPES: { value: QualityComponentType; label: string }[] = [
  { value: 'ENTRY_BEHAVIOR', label: 'Kesiapan praktik' },
  { value: 'SUB_CPMK', label: 'Sub-CPMK' },
  { value: 'ASSIGNMENT', label: 'Tugas' },
  { value: 'QUIZ', label: 'Kuis' },
  { value: 'POST_TEST', label: 'Post-test' },
  { value: 'CUSTOM', label: 'Kualitas lainnya' },
];

export function getCourseQualityComponents(
  course: Pick<Course, 'qualityComponents'> | null | undefined
): QualityComponent[] {
  const configured = course?.qualityComponents;
  return configured?.length ? configured : QUALITY_COMPONENT_DEFAULTS.map(item => ({ ...item }));
}

export interface QualityAssessmentItem {
  id: string;
  rubricId: string;
  code: string;
  title: string;
  description: string;
  weightPercent?: number;
  isSubCpmk: boolean;
}

export function buildCourseQualityItems(
  course: Pick<Course, 'subCpmks' | 'qualityRubrics'> | null | undefined
): QualityAssessmentItem[] {
  if (!course) return [];
  const subCpmks = course.subCpmks || [];
  const qualityRubrics = (course.qualityRubrics || []).filter(r => r.category === 'QUALITY');

  if (subCpmks.length === 0) {
    return qualityRubrics.map(r => ({
      id: r.id,
      rubricId: r.id,
      code: 'Aspek Kualitas',
      title: r.name,
      description: r.description,
      isSubCpmk: false,
    }));
  }

  const subCpmkItems = subCpmks.map(cpmk => {
    const linkedRubric = qualityRubrics.find(r => r.subCpmkId === cpmk.id || r.id === cpmk.id);
    return {
      id: cpmk.id,
      rubricId: linkedRubric?.id || cpmk.id,
      code: cpmk.code,
      title: linkedRubric && linkedRubric.name !== cpmk.code ? linkedRubric.name : cpmk.code,
      description: cpmk.description || linkedRubric?.description || '',
      weightPercent: cpmk.weightPercent,
      isSubCpmk: true,
    };
  });

  return subCpmkItems;
}

export function calculateQualityPracticeScore(
  items: QualityAssessmentItem[],
  scores: CriterionScore[]
): number {
  if (items.length === 0) return 0;
  const getScore = (item: QualityAssessmentItem) =>
    scores.find(score => score.criterionId === item.id || score.criterionId === item.rubricId)?.score ?? 75;
  const subCpmkItems = items.filter(item => item.isSubCpmk);
  const scoredItems = subCpmkItems.length > 0 ? subCpmkItems : items;
  const totalWeight = scoredItems.reduce((total, item) => total + (item.weightPercent || 0), 0);
  const hasValidWeights = subCpmkItems.length > 0
    && scoredItems.every(item => typeof item.weightPercent === 'number' && item.weightPercent > 0)
    && totalWeight === 100;
  const score = hasValidWeights
    ? scoredItems.reduce((total, item) => total + getScore(item) * ((item.weightPercent || 0) / 100), 0)
    : scoredItems.reduce((total, item) => total + getScore(item), 0) / scoredItems.length;
  return Math.round(score * 100) / 100;
}

export function calculateWeightedQualityScore(
  components: QualityComponent[],
  componentScores: Record<string, number>
): number {
  const totalWeight = Math.round(components.reduce((total, component) => total + component.weightPercent, 0) * 100) / 100;
  if (components.length === 0 || totalWeight !== 100 || components.some(component => component.weightPercent <= 0)) return 0;
  const weightedScore = components.reduce((total, component) =>
    total + (componentScores[component.id] ?? 0) * (component.weightPercent / 100), 0);
  return Math.round(weightedScore * 100) / 100;
}
