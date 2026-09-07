// WITA (Asia/Makassar, UTC+8) Date and Time Utilities
// Integrated with authoritative internet realtime time synchronization

import { getRealtimeWitaDateString } from '../services/networkTimeService';
import { PeriodStatus } from '../types';

export function getWitaDateString(date?: Date): string {
  if (!date) {
    // Default to authoritative realtime internet date
    return getRealtimeWitaDateString();
  }
  // Format specific date as YYYY-MM-DD in UTC+8
  const witaOffset = 8 * 60; // in minutes
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const witaDate = new Date(utc + (witaOffset * 60000));
  
  const yyyy = witaDate.getFullYear();
  const mm = String(witaDate.getMonth() + 1).padStart(2, '0');
  const dd = String(witaDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const month = months[parseInt(parts[1], 10) - 1];
      const year = parts[0];
      return `${day} ${month} ${year}`;
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function formatPeriodRange(startDateStr: string, endDateStr: string): string {
  if (!startDateStr || !endDateStr) return '-';
  const startParts = startDateStr.split('-');
  const endParts = endDateStr.split('-');
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  if (startParts.length === 3 && endParts.length === 3) {
    const sDay = parseInt(startParts[2], 10);
    const eDay = parseInt(endParts[2], 10);
    const sMonth = months[parseInt(startParts[1], 10) - 1];
    const eMonth = months[parseInt(endParts[1], 10) - 1];
    const sYear = startParts[0];
    const eYear = endParts[0];

    if (sYear === eYear && sMonth === eMonth) {
      return `${sDay}–${eDay} ${sMonth} ${sYear}`;
    }
    return `${sDay} ${sMonth} ${sYear} – ${eDay} ${eMonth} ${eYear}`;
  }
  return `${startDateStr} – ${endDateStr}`;
}

export function computePeriodEndDate(startDateStr: string, durationDays: number = 5): string {
  // Default 5 days: e.g. Monday + 4 days = Friday (inclusive 5 days)
  if (!startDateStr) return '';
  const [year, month, day] = startDateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + (durationDays - 1));
  
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Automatically determine period status based on real-time internet date (WITA)
 */
export function computePeriodStatus(
  startDateStr: string,
  endDateStr: string,
  referenceDateStr?: string
): PeriodStatus {
  const todayStr = referenceDateStr || getRealtimeWitaDateString();
  if (!startDateStr || !endDateStr) return 'UPCOMING';
  if (todayStr < startDateStr) {
    return 'UPCOMING';
  }
  if (todayStr > endDateStr) {
    return 'COMPLETED';
  }
  return 'ACTIVE';
}

export interface PeriodAutoStatusInfo {
  status: PeriodStatus;
  label: string;
  badgeLabel: string;
  description: string;
  daysDiff: number;
  relativeNotice: string;
}

/**
 * Detailed real-time status evaluation with days remaining and explanation
 */
export function getPeriodStatusAutoInfo(
  startDateStr: string,
  endDateStr: string,
  referenceDateStr?: string
): PeriodAutoStatusInfo {
  const todayStr = referenceDateStr || getRealtimeWitaDateString();
  const status = computePeriodStatus(startDateStr, endDateStr, todayStr);

  const parseDays = (dStr: string) => {
    const [y, m, d] = dStr.split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / (1000 * 60 * 60 * 24));
  };

  const todayDays = parseDays(todayStr);
  const startDays = parseDays(startDateStr);
  const endDays = parseDays(endDateStr);

  if (status === 'UPCOMING') {
    const daysUntilStart = startDays - todayDays;
    return {
      status: 'UPCOMING',
      label: 'Akan Datang (Terjadwal)',
      badgeLabel: '🟡 Akan Datang',
      description: `Gelombang terjadwal mulai pada ${formatIndonesianDate(startDateStr)}.`,
      daysDiff: daysUntilStart,
      relativeNotice: daysUntilStart === 1
        ? 'Mulai besok'
        : `Mulai dalam ${daysUntilStart} hari lagi`
    };
  }

  if (status === 'ACTIVE') {
    const dayProgress = todayDays - startDays + 1;
    const daysRemaining = endDays - todayDays;
    return {
      status: 'ACTIVE',
      label: 'Aktif (Sedang Berjalan)',
      badgeLabel: '🟢 Aktif',
      description: `Sedang berlangsung hingga ${formatIndonesianDate(endDateStr)}.`,
      daysDiff: daysRemaining,
      relativeNotice: `Hari ke-${Math.max(1, dayProgress)} dari 5 hari kerja (sisa ${daysRemaining} hari)`
    };
  }

  // COMPLETED
  const daysSinceEnd = todayDays - endDays;
  return {
    status: 'COMPLETED',
    label: 'Selesai (Arsip Periode)',
    badgeLabel: '⚪ Selesai',
    description: `Periode telah selesai pada ${formatIndonesianDate(endDateStr)}.`,
    daysDiff: daysSinceEnd,
    relativeNotice: daysSinceEnd === 1
      ? 'Berakhir kemarin'
      : `Selesai ${daysSinceEnd} hari yang lalu`
  };
}
