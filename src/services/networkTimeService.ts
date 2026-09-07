// Real-time Internet Network Time Service (WITA - UTC+8, Asia/Makassar)
// Fetches accurate real-time date & time from authoritative internet sources
// with multi-level fallback (TimeAPI.io -> Supabase HTTP Date Header -> WorldTimeAPI -> Local Clock)

import { useState, useEffect, useCallback } from 'react';
import { isSupabaseConfigured } from './supabaseClient';

export interface NetworkTimeInfo {
  currentDate: Date;           // In WITA (UTC+8)
  dateString: string;          // YYYY-MM-DD
  timeString: string;          // HH:mm:ss
  formattedFull: string;       // e.g. "Senin, 07 September 2026, 14:50 WITA"
  isOnline: boolean;
  source: 'timeapi.io' | 'supabase_server' | 'worldtimeapi' | 'local_fallback';
  driftMs: number;             // Offset in ms relative to client Date.now()
  lastSyncedAt: number;
}

const STORAGE_OFFSET_KEY = 'poliwako_network_time_offset_ms';
const STORAGE_SYNC_TIME_KEY = 'poliwako_network_time_last_sync';

// In-memory cache
let cachedDriftMs: number = (() => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_OFFSET_KEY);
    if (saved) {
      const num = parseInt(saved, 10);
      if (!isNaN(num)) return num;
    }
  }
  return 0;
})();

let cachedSource: NetworkTimeInfo['source'] = 'local_fallback';
let isFetchingPromise: Promise<NetworkTimeInfo> | null = null;

// Convert UTC timestamp or Date to WITA (UTC+8) Date object
export function toWitaDate(utcTimestampOrDate: number | Date = Date.now()): Date {
  const timestamp = typeof utcTimestampOrDate === 'number' ? utcTimestampOrDate : utcTimestampOrDate.getTime();
  // Target WITA is UTC+8 (480 minutes offset)
  const witaOffsetMinutes = 8 * 60;
  // Local system timezone offset in minutes
  const clientTzOffsetMinutes = new Date(timestamp).getTimezoneOffset();
  // Calculate WITA equivalent
  return new Date(timestamp + (clientTzOffsetMinutes + witaOffsetMinutes) * 60000);
}

// Format a WITA Date to YYYY-MM-DD
export function formatWitaDateToYmd(witaDate: Date): string {
  const yyyy = witaDate.getFullYear();
  const mm = String(witaDate.getMonth() + 1).padStart(2, '0');
  const dd = String(witaDate.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Format a WITA Date to HH:mm:ss
export function formatWitaTimeToHms(witaDate: Date): string {
  const hh = String(witaDate.getHours()).padStart(2, '0');
  const min = String(witaDate.getMinutes()).padStart(2, '0');
  const ss = String(witaDate.getSeconds()).padStart(2, '0');
  return `${hh}:${min}:${ss}`;
}

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function formatWitaDateFullIndonesian(witaDate: Date): string {
  const dayName = DAY_NAMES[witaDate.getDay()];
  const day = witaDate.getDate();
  const monthName = MONTH_NAMES[witaDate.getMonth()];
  const year = witaDate.getFullYear();
  const time = formatWitaTimeToHms(witaDate);
  return `${dayName}, ${day} ${monthName} ${year} • ${time} WITA`;
}

// Compute current real-time WITA Date using cached drift
export function getRealtimeWitaDate(): Date {
  const realUtcTimestamp = Date.now() + cachedDriftMs;
  return toWitaDate(realUtcTimestamp);
}

// Compute current real-time WITA YYYY-MM-DD string
export function getRealtimeWitaDateString(): string {
  return formatWitaDateToYmd(getRealtimeWitaDate());
}

// Fetch network time from real internet endpoints
export async function fetchInternetNetworkTime(forceRefresh: boolean = false): Promise<NetworkTimeInfo> {
  if (isFetchingPromise && !forceRefresh) {
    return isFetchingPromise;
  }

  isFetchingPromise = (async () => {
    let determinedUtcMs: number | null = null;
    let source: NetworkTimeInfo['source'] = 'local_fallback';

    // 1. Primary: TimeAPI.io (Asia/Makassar zone)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch('https://timeapi.io/api/time/current/zone?timeZone=Asia/Makassar', {
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        // data.dateTime: "2026-09-07T14:45:14.2428996" (in WITA, UTC+8)
        if (data && data.year && data.month && data.day) {
          const utcFromWita = Date.UTC(
            data.year,
            data.month - 1,
            data.day,
            data.hour || 0,
            data.minute || 0,
            data.seconds || 0,
            data.milliSeconds || 0
          ) - (8 * 3600 * 1000);
          determinedUtcMs = utcFromWita;
          source = 'timeapi.io';
        }
      }
    } catch {
      // Continue to next fallback
    }

    // 2. Secondary: Supabase server HTTP Date response header
    if (determinedUtcMs === null) {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const res = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'HEAD',
            headers: { apikey: supabaseKey },
            signal: controller.signal,
            cache: 'no-store'
          });
          clearTimeout(timeoutId);

          const dateHeader = res.headers.get('date');
          if (dateHeader) {
            const parsed = new Date(dateHeader).getTime();
            if (!isNaN(parsed) && parsed > 0) {
              determinedUtcMs = parsed;
              source = 'supabase_server';
            }
          }
        }
      } catch {
        // Continue to next fallback
      }
    }

    // 3. Tertiary: WorldTimeAPI
    if (determinedUtcMs === null) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Makassar', {
          signal: controller.signal,
          cache: 'no-store'
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data && data.unixtime) {
            determinedUtcMs = data.unixtime * 1000;
            source = 'worldtimeapi';
          }
        }
      } catch {
        // Fallback to local
      }
    }

    // 4. Fallback: Local client time
    if (determinedUtcMs === null) {
      determinedUtcMs = Date.now();
      source = 'local_fallback';
    }

    // Calculate drift relative to Date.now()
    const clientNow = Date.now();
    const driftMs = determinedUtcMs - clientNow;

    cachedDriftMs = driftMs;
    cachedSource = source;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_OFFSET_KEY, String(driftMs));
        localStorage.setItem(STORAGE_SYNC_TIME_KEY, String(clientNow));
      } catch {
        // Ignore quota/storage errors
      }
    }

    const witaDate = toWitaDate(determinedUtcMs);
    return {
      currentDate: witaDate,
      dateString: formatWitaDateToYmd(witaDate),
      timeString: formatWitaTimeToHms(witaDate),
      formattedFull: formatWitaDateFullIndonesian(witaDate),
      isOnline: source !== 'local_fallback',
      source,
      driftMs,
      lastSyncedAt: clientNow
    };
  })();

  try {
    const result = await isFetchingPromise;
    return result;
  } finally {
    isFetchingPromise = null;
  }
}

// React Hook for live realtime internet clock
export function useNetworkTime(syncIntervalMs: number = 5 * 60 * 1000) {
  const [networkInfo, setNetworkInfo] = useState<NetworkTimeInfo>(() => {
    const witaDate = getRealtimeWitaDate();
    return {
      currentDate: witaDate,
      dateString: formatWitaDateToYmd(witaDate),
      timeString: formatWitaTimeToHms(witaDate),
      formattedFull: formatWitaDateFullIndonesian(witaDate),
      isOnline: cachedSource !== 'local_fallback',
      source: cachedSource,
      driftMs: cachedDriftMs,
      lastSyncedAt: Date.now()
    };
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const performSync = useCallback(async (force: boolean = false) => {
    setIsSyncing(true);
    try {
      const updated = await fetchInternetNetworkTime(force);
      setNetworkInfo(updated);
    } catch (e) {
      console.warn('Network time sync notice:', e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Initial fetch on mount & background sync
  useEffect(() => {
    performSync(false);

    const intervalId = setInterval(() => {
      performSync(false);
    }, syncIntervalMs);

    // Sync when window regains focus
    const handleFocus = () => performSync(false);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [performSync, syncIntervalMs]);

  // Live tick clock every second
  useEffect(() => {
    const tickInterval = setInterval(() => {
      const witaDate = getRealtimeWitaDate();
      setNetworkInfo(prev => ({
        ...prev,
        currentDate: witaDate,
        dateString: formatWitaDateToYmd(witaDate),
        timeString: formatWitaTimeToHms(witaDate),
        formattedFull: formatWitaDateFullIndonesian(witaDate)
      }));
    }, 1000);

    return () => clearInterval(tickInterval);
  }, []);

  return {
    ...networkInfo,
    isSyncing,
    refreshTime: () => performSync(true)
  };
}
