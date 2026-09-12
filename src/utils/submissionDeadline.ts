/** Interpret date-only and datetime-local deadlines in WITA, never in the browser timezone. */
export function submissionDeadline(value: string): number | null {
  const text = value.trim().replace(/\s+WITA$/i, '');
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return Date.parse(`${text}T23:59:59.999+08:00`);
  if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(text)) return null;
  const iso = text.replace(' ', 'T');
  const time = Date.parse(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso) ? iso : `${iso}+08:00`);
  return Number.isFinite(time) ? time : null;
}
export function isSubmissionClosed(deadline: string, now = Date.now()): boolean {
  const end = submissionDeadline(deadline);
  return end !== null && now > end;
}

export function formatSubmissionDeadline(value: string): string {
  const end = submissionDeadline(value);
  return end !== null && Number.isFinite(end) ? new Date(end).toLocaleString('id-ID', {timeZone:'Asia/Makassar', dateStyle:'medium', timeStyle:'short'}) : value || 'Belum ditentukan';
}

export type DeadlineUrgency = 'OVERDUE' | 'DUE_SOON' | 'UPCOMING' | 'LATER' | 'UNSCHEDULED';

/** Classify deadlines consistently across the student and instructor dashboards. */
export function getDeadlineUrgency(value: string, now = Date.now()): DeadlineUrgency {
  const end = submissionDeadline(value);
  if (end === null) return 'UNSCHEDULED';
  const remaining = end - now;
  if (remaining <= 0) return 'OVERDUE';
  if (remaining <= 24 * 60 * 60 * 1000) return 'DUE_SOON';
  if (remaining <= 3 * 24 * 60 * 60 * 1000) return 'UPCOMING';
  return 'LATER';
}

export function formatDeadlineDistance(value: string, now = Date.now()): string {
  const end = submissionDeadline(value);
  if (end === null) return 'Tenggat belum ditentukan';

  const distance = end - now;
  const absolute = Math.abs(distance);
  const minutes = Math.max(1, Math.ceil(absolute / (60 * 1000)));
  const hours = Math.ceil(absolute / (60 * 60 * 1000));
  const days = Math.ceil(absolute / (24 * 60 * 60 * 1000));
  const amount = minutes < 60 ? `${minutes} menit` : hours < 24 ? `${hours} jam` : `${days} hari`;
  return distance <= 0 ? `Terlambat ${amount}` : `Tersisa ${amount}`;
}
