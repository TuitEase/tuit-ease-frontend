import { describe, expect, it } from 'vitest';
import {
  dateKey,
  dateTile,
  dayDifference,
  formatCalendarDate,
  formatDateShort,
  formatDateTime,
  formatDayMonth,
  formatEnded,
  formatTimeOnly,
  isFuture,
  isSessionStarted,
  relativeWhen,
} from './datetime';

const SATURDAY = '2030-01-05T09:00:00+01:00';

describe('datetime', () => {
  it('formats session labels in the host timezone', () => {
    expect(formatDateTime(SATURDAY, 'Africa/Lagos')).toBe('Sat, 5 Jan · 9:00 AM');
    expect(formatTimeOnly(SATURDAY, 'Africa/Lagos')).toBe('9:00 AM');
    expect(formatDateShort(SATURDAY, 'Africa/Lagos')).toBe('Sat, 5 Jan');
    expect(formatDayMonth(SATURDAY, 'Africa/Lagos')).toBe('5 Jan');
    expect(formatEnded(SATURDAY, 'Africa/Lagos')).toBe('Ended 5 Jan');
  });

  it('falls back for blank or invalid dates', () => {
    expect(formatDateTime('', 'Africa/Lagos')).toBe('Date to be announced');
    expect(formatDateTime('nope', 'Africa/Lagos')).toBe('Date to be announced');
    expect(formatTimeOnly('', 'Africa/Lagos')).toBe('');
    expect(dateTile('', 'Africa/Lagos')).toEqual({ month: '—', day: '—' });
  });

  it('uses 12-hour clock labels including midnight and noon', () => {
    expect(formatTimeOnly('2030-01-05T00:00:00+01:00', 'Africa/Lagos')).toBe('12:00 AM');
    expect(formatTimeOnly('2030-01-05T12:05:00+01:00', 'Africa/Lagos')).toBe('12:05 PM');
  });

  it('computes date keys in the requested timezone', () => {
    expect(dateKey('2030-01-05T00:30:00+01:00', 'Africa/Lagos')).toBe('2030-01-05');
    expect(dateKey('2030-01-05T00:30:00+01:00', 'UTC')).toBe('2030-01-04');
    expect(dateKey('nope', 'Africa/Lagos')).toBe('');
  });

  it('formats calendar dates without a timezone shift', () => {
    expect(formatCalendarDate('2026-10-31')).toBe('31 Oct');
    expect(formatCalendarDate('2026-01-01')).toBe('1 Jan');
    expect(formatCalendarDate('')).toBe('—');
    expect(formatCalendarDate('31/10/2026')).toBe('31/10/2026');
  });

  it('builds date tiles for the session cards', () => {
    expect(dateTile(SATURDAY, 'Africa/Lagos')).toEqual({ month: 'Jan', day: '05' });
  });

  it('measures whole-day distance in the host timezone', () => {
    const now = new Date('2026-10-30T08:00:00+01:00');
    expect(dayDifference('2026-11-02T09:00:00+01:00', 'Africa/Lagos', now)).toBe(3);
    expect(dayDifference('2026-10-29T09:00:00+01:00', 'Africa/Lagos', now)).toBe(-1);
  });

  it('describes when a session starts relative to now', () => {
    const now = new Date('2026-10-30T08:00:00+01:00');
    expect(relativeWhen('2026-11-02T09:00:00+01:00', 'Africa/Lagos', now)).toBe('In 3 days');
    expect(relativeWhen('2026-10-31T09:00:00+01:00', 'Africa/Lagos', now)).toBe('Tomorrow');
    expect(relativeWhen('2026-10-30T12:00:00+01:00', 'Africa/Lagos', now)).toBe('In 4 hours');
    expect(relativeWhen('2026-10-30T08:30:00+01:00', 'Africa/Lagos', now)).toBe('In under an hour');
    expect(relativeWhen('2026-10-29T09:00:00+01:00', 'Africa/Lagos', now)).toBe('Started');
    expect(relativeWhen('nope', 'Africa/Lagos', now)).toBe('');
  });

  it('answers future/started questions', () => {
    const now = new Date('2026-10-30T08:00:00+01:00');
    expect(isFuture('2026-10-31T09:00:00+01:00', now)).toBe(true);
    expect(isFuture('2026-10-29T09:00:00+01:00', now)).toBe(false);
    expect(isFuture(null, now)).toBe(false);
    expect(isSessionStarted('2026-10-29T09:00:00+01:00', now)).toBe(true);
    expect(isSessionStarted('2026-10-31T09:00:00+01:00', now)).toBe(false);
  });
});
