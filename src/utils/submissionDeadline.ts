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
