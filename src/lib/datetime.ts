/**
 * Host-timezone formatting for class dates. The API sends ISO 8601 with an
 * offset; every label is rendered in the host's timezone from `host/me/`.
 */

export const DEFAULT_TIMEZONE = 'Africa/Lagos';

interface DateParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  weekday: string;
}

function safeDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function partsInZone(date: Date, timeZone: string): DateParts {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  });
  const result: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') result[part.type] = part.value;
  }
  return result as unknown as DateParts;
}

/** `2026-10-31` in the host's timezone. */
export function dateKey(iso: string | Date, timeZone = DEFAULT_TIMEZONE): string {
  const date = typeof iso === 'string' ? safeDate(iso) : iso;
  if (!date) return '';
  const parts = partsInZone(date, timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function todayKey(timeZone = DEFAULT_TIMEZONE): string {
  return dateKey(new Date(), timeZone);
}

function timeLabel(parts: DateParts): string {
  const hour = Number(parts.hour);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${parts.minute} ${suffix}`;
}

/** `9:00 AM` */
export function formatTimeOnly(iso: string, timeZone = DEFAULT_TIMEZONE): string {
  const date = safeDate(iso);
  if (!date) return '';
  return timeLabel(partsInZone(date, timeZone));
}

/** `Sat, 31 Oct · 9:00 AM` */
export function formatDateTime(iso: string, timeZone = DEFAULT_TIMEZONE): string {
  const date = safeDate(iso);
  if (!date) return 'Date to be announced';
  const parts = partsInZone(date, timeZone);
  const month = new Intl.DateTimeFormat('en-GB', { timeZone, month: 'short' }).format(date);
  return `${parts.weekday}, ${Number(parts.day)} ${month} · ${timeLabel(parts)}`;
}

/** `Sat, 31 Oct` */
export function formatDateShort(iso: string, timeZone = DEFAULT_TIMEZONE): string {
  const date = safeDate(iso);
  if (!date) return 'Date to be announced';
  const parts = partsInZone(date, timeZone);
  const month = new Intl.DateTimeFormat('en-GB', { timeZone, month: 'short' }).format(date);
  return `${parts.weekday}, ${Number(parts.day)} ${month}`;
}

/** `31 Oct` */
export function formatDayMonth(iso: string, timeZone = DEFAULT_TIMEZONE): string {
  const date = safeDate(iso);
  if (!date) return 'Date to be announced';
  const parts = partsInZone(date, timeZone);
  const month = new Intl.DateTimeFormat('en-GB', { timeZone, month: 'short' }).format(date);
  return `${Number(parts.day)} ${month}`;
}

/** `31 Oct` for a calendar date such as an instalment due date (no timezone shift). */
export function formatCalendarDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value || '—';
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return value;
  const label = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(date);
  return `${day} ${label}`;
}

/** `Ended 19 Sep` */
export function formatEnded(iso: string, timeZone = DEFAULT_TIMEZONE): string {
  return `Ended ${formatDayMonth(iso, timeZone)}`;
}

/** Month and day for the little date tiles in the design. */
export function dateTile(iso: string, timeZone = DEFAULT_TIMEZONE): { month: string; day: string } {
  const date = safeDate(iso);
  if (!date) return { month: '—', day: '—' };
  const parts = partsInZone(date, timeZone);
  const month = new Intl.DateTimeFormat('en-GB', { timeZone, month: 'short' }).format(date);
  return { month, day: parts.day };
}

/** Whole-day difference between two ISO dates in the host's timezone. */
export function dayDifference(iso: string, timeZone = DEFAULT_TIMEZONE, now = new Date()): number {
  const target = dateKey(iso, timeZone);
  const today = dateKey(now, timeZone);
  if (!target || !today) return 0;
  const [ty, tm, td] = target.split('-').map(Number);
  const [ny, nm, nd] = today.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(ny, nm - 1, nd)) / 86_400_000);
}

/** `In 3 days`, `Tomorrow`, `Today`, `In 2 hours`, `Started`. */
export function relativeWhen(iso: string, timeZone = DEFAULT_TIMEZONE, now = new Date()): string {
  const date = safeDate(iso);
  if (!date) return '';
  const diffMs = date.getTime() - now.getTime();
  if (diffMs <= 0) return 'Started';
  const days = dayDifference(iso, timeZone, now);
  if (days > 1) return `In ${days} days`;
  if (days === 1) return 'Tomorrow';
  if (days === 0) {
    const hours = Math.ceil(diffMs / 3_600_000);
    if (hours <= 1) return 'In under an hour';
    return `In ${hours} hours`;
  }
  return `In ${days} days`;
}

export function isFuture(iso: string | null | undefined, now = new Date()): boolean {
  const date = safeDate(iso);
  return date !== null && date.getTime() > now.getTime();
}

export function isSessionStarted(iso: string | null | undefined, now = new Date()): boolean {
  const date = safeDate(iso);
  return date !== null && date.getTime() <= now.getTime();
}
