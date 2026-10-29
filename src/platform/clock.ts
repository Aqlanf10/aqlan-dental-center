import { failApp } from './errors.ts';

/**
 * Clinic-timezone-governed calendar & clock utilities.
 * Never derives clinic calendar dates via UTC `.toISOString().slice(0, 10)`.
 */
export function assertValidTimeZone(timeZone: string): string {
  if (typeof timeZone !== 'string' || !timeZone.trim() || timeZone !== timeZone.trim()) {
    failApp('INVALID_INPUT', 400, 'Invalid timezone');
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return timeZone;
  } catch {
    failApp('INVALID_INPUT', 400, 'Unsupported IANA timezone');
  }
}

export function assertIsoDate(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    failApp('INVALID_INPUT', 400, 'Expected YYYY-MM-DD calendar date');
  }
  const epoch = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(epoch) || new Date(epoch).toISOString().slice(0, 10) !== value) {
    failApp('INVALID_INPUT', 400, 'Non-existent calendar date');
  }
  return value;
}

export function clinicDateInZone(at: Date, timeZone: string): string {
  assertValidTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    calendar: 'gregory',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);
  const get = (t: string): string => parts.find(p => p.type === t)?.value ?? '';
  return assertIsoDate(`${get('year')}-${get('month')}-${get('day')}`);
}

/**
 * Returns ISO weekday index 0..6 where 0 = Sunday, 5 = Friday, 6 = Saturday
 * purely from the validated YYYY-MM-DD calendar date without host timezone drift.
 */
export function calendarWeekday(isoDate: string): number {
  const checked = assertIsoDate(isoDate);
  return new Date(`${checked}T12:00:00Z`).getUTCDay();
}

export function parseHHMMToMinutes(hhmm: unknown): number {
  if (typeof hhmm !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(hhmm)) {
    failApp('INVALID_INPUT', 400, 'Expected HH:MM 24h time');
  }
  const [h, m] = hhmm.split(':');
  return Number(h) * 60 + Number(m);
}

export function formatMinutesAsHHMM(totalMinutes: number): string {
  if (!Number.isInteger(totalMinutes) || totalMinutes < 0 || totalMinutes > 1440) {
    failApp('INVALID_INPUT', 400, 'Minutes out of day range');
  }
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function addCalendarMonths(isoDate: string, monthsToAdd: number): string {
  const checked = assertIsoDate(isoDate);
  if (!Number.isInteger(monthsToAdd) || monthsToAdd < 0 || monthsToAdd > 240) {
    failApp('INVALID_INPUT', 400, 'Invalid month offset');
  }
  const [yStr, mStr, dStr] = checked.split('-');
  const year = Number(yStr);
  const monthZero = Number(mStr) - 1 + monthsToAdd;
  const day = Number(dStr);
  const targetYear = year + Math.floor(monthZero / 12);
  const targetMonthZero = ((monthZero % 12) + 12) % 12;
  const maxDayInMonth = new Date(Date.UTC(targetYear, targetMonthZero + 1, 0)).getUTCDate();
  const clampedDay = Math.min(day, maxDayInMonth);
  const yyyy = String(targetYear).padStart(4, '0');
  const mm = String(targetMonthZero + 1).padStart(2, '0');
  const dd = String(clampedDay).padStart(2, '0');
  return assertIsoDate(`${yyyy}-${mm}-${dd}`);
}
