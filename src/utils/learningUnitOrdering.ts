import type { LearningUnit } from '../types';

/**
 * Sort units by their persisted number while preserving the existing array
 * order when old data contains duplicate numbers.
 */
export const orderLearningUnits = (units: LearningUnit[]): LearningUnit[] => (
  units
    .map((unit, index) => ({ unit, index }))
    .sort((a, b) => a.unit.unitNumber - b.unit.unitNumber || a.index - b.index)
    .map(({ unit }) => unit)
);

/**
 * Rebuilds the 1..n sequence independently for every practice period.
 * The returned array keeps the original top-level order so unrelated state
 * consumers do not see their period groups rearranged unexpectedly.
 */
export const normalizeLearningUnitNumbers = (units: LearningUnit[]): LearningUnit[] => {
  const nextNumberById = new Map<string, number>();
  const periodIds = Array.from(new Set(units.map(unit => unit.periodId)));

  periodIds.forEach(periodId => {
    const periodUnits = orderLearningUnits(units.filter(unit => unit.periodId === periodId));
    periodUnits.forEach((unit, index) => nextNumberById.set(unit.id, index + 1));
  });

  return units.map(unit => {
    const unitNumber = nextNumberById.get(unit.id) ?? unit.unitNumber;
    return unit.unitNumber === unitNumber ? unit : { ...unit, unitNumber };
  });
};

