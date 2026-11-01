/**
 * The API stores `starts_at` as a datetime. The wizard collects a local date and
 * time in the host's timezone, so we combine them and send ISO 8601 with the
 * offset for that zone. `Africa/Lagos` is the fallback used across the app.
 */

export const DEFAULT_TIMEZONE = 'Africa/Lagos';

interface Parts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
}

function partsInZone(date: Date, timeZone: string): Parts {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const result: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') result[part.type] = part.value;
  }
  return result as unknown as Parts;
}

/** Milliseconds that the zone is ahead of UTC at this instant. */
function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = partsInZone(date, timeZone);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((asUtc - date.getTime()) / 1000) * 1000;
}

function offsetSuffix(offsetMs: number): string {
  const totalMinutes = Math.round(offsetMs / 60000);
  const sign = totalMinutes >= 0 ? '+' : '-';
  const absolute = Math.abs(totalMinutes);
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0');
  const minutes = String(absolute % 60).padStart(2, '0');
  return `${sign}${hours}:${minutes}`;
}

/**
 * Returns e.g. `2026-11-14T10:00:00+01:00`, or null when the inputs are not a
 * complete date and time.
 */
export function combineHostDateTime(date: string, time: string, timeZone = DEFAULT_TIMEZONE): string | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time);
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return null;

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const firstOffset = zoneOffsetMs(new Date(utcGuess), timeZone);
  let instant = utcGuess - firstOffset;
  const secondOffset = zoneOffsetMs(new Date(instant), timeZone);
  if (secondOffset !== firstOffset) instant = utcGuess - secondOffset;

  const local = partsInZone(new Date(instant), timeZone);
  const offset = zoneOffsetMs(new Date(instant), timeZone);
  return `${local.year}-${local.month}-${local.day}T${local.hour}:${local.minute}:00${offsetSuffix(offset)}`;
}

/** Converts an API datetime into the host-local date/time fields. */
export function dateTimeInZone(iso: string, timeZone = DEFAULT_TIMEZONE): { date: string; time: string } {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return { date: '', time: '' };
  const local = partsInZone(parsed, timeZone);
  return { date: `${local.year}-${local.month}-${local.day}`, time: `${local.hour}:${local.minute}` };
}

export function isPastSession(date: string, time: string, timeZone = DEFAULT_TIMEZONE): boolean {
  const iso = combineHostDateTime(date, time, timeZone);
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}
