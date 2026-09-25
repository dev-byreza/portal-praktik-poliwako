/** Parse and clamp numeric grading input while retaining hundredth-point precision. */
export function parseGradingScore(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;

  const bounded = Math.min(100, Math.max(0, parsed));
  return Math.round((bounded + Number.EPSILON) * 100) / 100;
}
