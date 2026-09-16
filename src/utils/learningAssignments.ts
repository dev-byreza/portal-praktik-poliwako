import { Assignment, LearningUnit } from '../types';

/** Normalizes old one-assignment unit data and the current multi-assignment shape. */
export const getUnitAssignments = (unit?: LearningUnit): Assignment[] => {
  if (!unit) return [];
  if (unit.assignments && unit.assignments.length > 0) return unit.assignments;
  return unit.assignment ? [unit.assignment] : [];
};

/** Keeps the legacy field in sync for code/data written by older app versions. */
export const withUnitAssignments = (unit: LearningUnit, assignments: Assignment[]): LearningUnit => ({
  ...unit,
  assignments,
  assignment: assignments[0],
});
