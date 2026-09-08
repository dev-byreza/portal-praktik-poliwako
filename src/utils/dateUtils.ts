// WITA (Asia/Makassar, UTC+8) Date and Time Utilities

import { getRealtimeWitaDateString } from '../services/networkTimeService';
import { PeriodStatus } from '../types';

export function getWitaDateString(date?: Date): string {
  if (!date) return getRealtimeWitaDateString();
  const wita = new Date(date.getTime() + (date.getTimezoneOffset() + 8 * 60) * 60000);
  return `${wita.getFullYear()}-${String(wita.getMonth() + 1).padStart(2, '0')}-${String(wita.getDate()).padStart(2, '0')}`;
}

export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '-';
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${Number(match[3])} ${months[Number(match[2]) - 1]} ${match[1]}`;
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? dateStr : parsed.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Display a deadline in a clear Indonesian format, always using WITA. */
export function formatDeadline(deadline: string): string {
  if (!deadline) return 'Belum ditentukan';
  const raw = String(deadline).trim();
  const legacy = raw.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?(?:\s*WITA)?$/i);
  if (legacy) {
    return `${Number(legacy[3])} ${['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][Number(legacy[2]) - 1]} ${legacy[1]}, pukul ${legacy[4]}.${legacy[5]} WITA`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(parsed).replace(/\./g, ':') + ' WITA';
}

/** Value for a native datetime-local input, rendered in WITA (UTC+8). */
export function toDateTimeLocalWita(value: string): string {
  if (!value) return '';
  const raw = String(value).trim();
  const legacy = raw.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);
  if (legacy) return `${legacy[1]}T${legacy[2]}`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(parsed).reduce<Record<string, string>>((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour === '24' ? '00' : parts.hour}:${parts.minute}`;
}

/** Convert a datetime-local value (interpreted as WITA) to the app's stored format. */
export function fromDateTimeLocalWita(value: string): string {
  const match = String(value || '').trim().match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return match ? `${match[1]} ${match[2]} WITA` : '';
}

/** Format stored ISO timestamps in the global WITA timezone for users. */
export function formatWitaDateTime(value: string): string {
  if (!value) return '-';
  const raw = String(value).trim();
  const legacy = raw.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::\d{2})?(?:\s*WITA)?$/i);
  if (legacy) {
    return `${Number(legacy[3])} ${['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][Number(legacy[2]) - 1]} ${legacy[1]}, pukul ${legacy[4]}.${legacy[5]} WITA`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(parsed).replace(/\./g, ':') + ' WITA';
}

export function formatPeriodRange(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) return '-';
  return `${formatIndonesianDate(startDateStr)} – ${formatIndonesianDate(endDateStr)}`;
}

export function computePeriodEndDate(startDateStr: string, durationDays: number = 5): string {
  if (!startDateStr) return '';
  const [year, month, day] = startDateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + durationDays - 1);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function computePeriodStatus(startDateStr: string, endDateStr: string, referenceDateStr?: string): PeriodStatus {
  const today = referenceDateStr || getRealtimeWitaDateString();
  if (!startDateStr || !endDateStr) return 'UPCOMING';
  if (today < startDateStr) return 'UPCOMING';
  if (today > endDateStr) return 'COMPLETED';
  return 'ACTIVE';
}
