import { publicBaseUrl, classShareMessage } from '../createClass/format';
import type { ClassResponse } from '../createClass/api';
import { draftFromClass } from '../createClass/fromClass';
import { UNLIMITED_CAPACITY } from '../createClass/types';
import {
  DEFAULT_TIMEZONE,
  dateKey,
  formatDateTime,
  formatDayMonth,
  todayKey,
} from '../lib/datetime';
import { sumNaira, toNaira } from '../lib/money';
import type {
  ClassStudent,
  ClassTotals,
  HostClassRecord,
  PendingInstallment,
} from './api';

export type ClassState = 'draft' | 'live' | 'ended';
export type StatusFilter = 'all' | 'published' | 'draft' | 'ended';
export type TypeFilter = 'all' | 'free' | 'paid';
export type SortKey = 'next-session' | 'newest' | 'title' | 'price-desc' | 'students';
export type StudentFilter = 'all' | 'paid' | 'part_paid' | 'unpaid' | 'waitlisted' | 'not_confirmed';
export type DetailTab = 'overview' | 'students' | 'sessions' | 'payments' | 'share';

export const ALL_DETAIL_TABS: DetailTab[] = ['overview', 'students', 'sessions', 'payments', 'share'];

export function classState(cls: HostClassRecord): ClassState {
  if (!cls.is_published) return 'draft';
  return cls.status === 'ended' ? 'ended' : 'live';
}

export function isPaidClass(cls: HostClassRecord): boolean {
  return toNaira(cls.price) > 0;
}

export function modeLabel(mode: HostClassRecord['mode']): string {
  if (mode === 'offline') return 'In person';
  if (mode === 'hybrid') return 'Online + in person';
  return 'Online';
}

/** Short badge copy used on class cards: Offline / Online / Hybrid. */
export function modeBadgeLabel(mode: HostClassRecord['mode']): string {
  if (mode === 'offline') return 'Offline';
  if (mode === 'hybrid') return 'Hybrid';
  return 'Online';
}

export function sessionCountLabel(count: number): string {
  if (count === 1) return '1 session';
  if (count <= 0) return 'No sessions yet';
  return `${count} sessions`;
}

export function durationLabel(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes || 0));
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  if (hours && rest) return `${hours} hr ${rest} min`;
  if (hours) return hours === 1 ? '1 hour' : `${hours} hours`;
  return rest === 1 ? '1 minute' : `${rest} minutes`;
}

export function capacityOf(cls: HostClassRecord): number | null {
  const raw = Number(cls.seats?.capacity ?? cls.capacity);
  if (!Number.isFinite(raw) || raw <= 0 || raw >= UNLIMITED_CAPACITY) return null;
  return raw;
}

export interface SeatUsage {
  booked: number;
  capacity: number | null;
  left: number | null;
  percent: number;
  waitlist: number;
}

export function seatUsage(cls: HostClassRecord): SeatUsage {
  const booked = Math.max(0, Number(cls.seats?.booked ?? 0));
  const capacity = capacityOf(cls);
  const waitlist = Math.max(0, Number(cls.seats?.waitlist ?? 0));
  const left = capacity === null ? null : Math.max(capacity - booked, 0);
  const percent = capacity ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;
  return { booked, capacity, left, percent, waitlist };
}

export function seatsText(cls: HostClassRecord): string {
  const usage = seatUsage(cls);
  if (usage.capacity === null) return `${usage.booked} booked · Unlimited seats`;
  return `${usage.booked} of ${usage.capacity} seats filled`;
}

export function seatsLeftText(cls: HostClassRecord): string {
  const usage = seatUsage(cls);
  if (usage.capacity === null) return 'Unlimited';
  if (usage.left === 0) return 'Full';
  return `${usage.left} of ${usage.capacity} left`;
}

function sessionTime(session: { starts_at: string }): number {
  const time = new Date(session.starts_at).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

export function firstSession(cls: HostClassRecord) {
  return [...(cls.sessions ?? [])].sort((a, b) => sessionTime(a) - sessionTime(b))[0] ?? null;
}

export function lastSession(cls: HostClassRecord) {
  return [...(cls.sessions ?? [])].sort((a, b) => sessionTime(b) - sessionTime(a))[0] ?? null;
}

export function nextSession(cls: HostClassRecord) {
  const candidate = cls.next_session && 'starts_at' in cls.next_session ? cls.next_session : null;
  if (candidate?.starts_at) return candidate;
  return (cls.sessions ?? []).find((session) => sessionTime(session) > Date.now()) ?? null;
}

/** One line the host can scan: "Online · 4 sessions · Next Sat, 31 Oct · 9:00 AM". */
export function classScheduleLabel(
  cls: HostClassRecord,
  timeZone = DEFAULT_TIMEZONE,
): string {
  const state = classState(cls);
  if (state === 'draft') {
    const first = firstSession(cls);
    return first ? `Starts ${formatDateTime(first.starts_at, timeZone)}` : 'Dates not set';
  }
  if (state === 'ended') {
    const last = lastSession(cls);
    return last ? `Ended ${formatDayMonth(last.starts_at, timeZone)}` : 'Ended';
  }
  const next = nextSession(cls);
  return next ? `Next ${formatDateTime(next.starts_at, timeZone)}` : 'No upcoming session';
}

export function classMetaLine(cls: HostClassRecord, timeZone = DEFAULT_TIMEZONE): string {
  return [modeLabel(cls.mode), sessionCountLabel(cls.sessions?.length ?? 0), classScheduleLabel(cls, timeZone)].join(
    ' · ',
  );
}

export function publicClassUrl(slug: string): string {
  const base = publicBaseUrl();
  return `${base}/class/${encodeURIComponent(slug)}/`;
}

export function classDetailUrl(id: number): string {
  return `/classes/detail/?id=${encodeURIComponent(String(id))}`;
}

export function editClassUrl(id: number): string {
  return `/classes/new/basics/?id=${encodeURIComponent(String(id))}`;
}

export function studentUrl(studentId: number, classId?: number): string {
  if (classId) {
    return `/students/?class=${encodeURIComponent(String(classId))}&student=${encodeURIComponent(String(studentId))}`;
  }
  return `/students/${encodeURIComponent(String(studentId))}/`;
}

export function classShareText(cls: HostClassRecord, timeZone = DEFAULT_TIMEZONE): string {
  const url = publicClassUrl(cls.slug);
  const when = classScheduleLabel(cls, timeZone);
  return classShareMessage(cls.title, when.replace(/^(Starts|Next) /, ''), url);
}

export function duplicateDraft(cls: HostClassRecord, timeZone: string) {
  return draftFromClass(cls as unknown as ClassResponse, timeZone, { copy: true });
}

export function paymentStateLabel(state: ClassStudent['payment_state']): string {
  if (state === 'paid') return 'Paid';
  if (state === 'part_paid') return 'Part-paid';
  return 'Unpaid';
}

export function bookingStatusLabel(status: ClassStudent['status']): string {
  if (status === 'waitlisted') return 'Waitlisted';
  if (status === 'pending_payment') return 'Awaiting payment';
  if (status === 'cancelled') return 'Cancelled';
  return 'Booked';
}

export interface StudentAggregates {
  students: number;
  waitlisted: number;
  collected: number;
  outstanding: number;
  expected: number;
  paid: number;
  partPaid: number;
  unpaid: number;
  unconfirmed: number;
}

/**
 * Money and counts for one class, from its own booking list. Cancelled bookings
 * are excluded; waitlisted bookings hold no seat and are reported separately.
 */
export function studentAggregates(students: ClassStudent[]): StudentAggregates {
  const live = students.filter((student) => student.status !== 'cancelled');
  const seated = live.filter(
    (student) => student.status === 'active' || student.status === 'pending_payment',
  );
  return {
    students: seated.length,
    waitlisted: live.filter((student) => student.status === 'waitlisted').length,
    collected: sumNaira(seated.map((student) => student.amount_paid)),
    outstanding: sumNaira(seated.map((student) => student.balance)),
    expected: sumNaira(seated.map((student) => student.amount_due)),
    paid: seated.filter((student) => student.payment_state === 'paid').length,
    partPaid: seated.filter((student) => student.payment_state === 'part_paid').length,
    unpaid: seated.filter((student) => student.payment_state === 'unpaid').length,
    unconfirmed: seated.filter((student) => !student.confirmed).length,
  };
}

export function filterStudents(students: ClassStudent[], query: string, filter: StudentFilter): ClassStudent[] {
  const needle = query.trim().toLowerCase();
  return students.filter((student) => {
    if (student.status === 'cancelled') return false;
    if (filter === 'waitlisted' && student.status !== 'waitlisted') return false;
    if (filter === 'not_confirmed' && (student.confirmed || student.status === 'waitlisted')) return false;
    if (filter === 'paid' && student.payment_state !== 'paid') return false;
    if (filter === 'part_paid' && student.payment_state !== 'part_paid') return false;
    if (filter === 'unpaid' && student.payment_state !== 'unpaid') return false;
    if (!needle) return true;
    return (
      student.student_name.toLowerCase().includes(needle) ||
      student.student_phone.toLowerCase().includes(needle)
    );
  });
}

export interface ClassTotalsMatch {
  total_paid: number;
  amount_over_due: number;
  total_students: number;
}

/**
 * `/payments/classes/` has no class id; it is keyed by title + price. Two
 * classes with the same title and price therefore share a row. Reported as a
 * backend gap; the detail page uses its own booking list for money.
 */
export function classTotalsFor(cls: HostClassRecord, totals: ClassTotals[]): ClassTotalsMatch | null {
  const price = Math.round(toNaira(cls.price));
  const match = totals.find(
    (row) => row.title.trim().toLowerCase() === cls.title.trim().toLowerCase() && Math.round(toNaira(row.price)) === price,
  );
  if (!match) return null;
  return {
    total_paid: toNaira(match.total_paid),
    amount_over_due: toNaira(match.amount_over_due),
    total_students: Number(match.total_students) || 0,
  };
}

export interface PendingInfo {
  count: number;
  overdueAmount: number;
  upcomingAmount: number;
  overdueCount: number;
}

export function pendingForClass(
  pending: PendingInstallment[],
  classId: number,
  timeZone = DEFAULT_TIMEZONE,
): PendingInfo {
  const today = todayKey(timeZone);
  const rows = pending.filter((row) => row.class_id === classId);
  let overdueAmount = 0;
  let upcomingAmount = 0;
  let overdueCount = 0;
  for (const row of rows) {
    if (String(row.due_date) < today) {
      overdueAmount += toNaira(row.amount);
      overdueCount += 1;
    } else {
      upcomingAmount += toNaira(row.amount);
    }
  }
  return { count: rows.length, overdueAmount, upcomingAmount, overdueCount };
}

export function classFlags(cls: HostClassRecord): Array<{ label: string; tone: 'warning' | 'neutral' }> {
  const flags: Array<{ label: string; tone: 'warning' | 'neutral' }> = [];
  for (const flag of cls.flags ?? []) {
    if (flag.code === 'overdue_instalments' && flag.count > 0) {
      flags.push({ label: `${flag.count} overdue`, tone: 'warning' });
    }
    if (flag.code === 'waitlist' && flag.count > 0) {
      flags.push({ label: `${flag.count} on waitlist`, tone: 'neutral' });
    }
  }
  return flags;
}

export function matchesSearch(cls: HostClassRecord, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const sessionVenues = (cls.sessions ?? []).map((session) => session.venue ?? '').join(' ');
  const haystack =
    `${cls.title} ${cls.description ?? ''} ${cls.slug} ${cls.venue ?? ''} ${cls.mode ?? ''} ${sessionVenues}`.toLowerCase();
  return needle.split(/\s+/).every((word) => haystack.includes(word));
}

export function sortKeyLabel(sort: SortKey): string {
  if (sort === 'next-session') return 'Next session';
  if (sort === 'title') return 'Title A–Z';
  if (sort === 'price-desc') return 'Price high to low';
  if (sort === 'students') return 'Most students';
  return 'Newest first';
}

export function filterAndSortClasses(
  classes: HostClassRecord[],
  options: { status: StatusFilter; type: TypeFilter; query: string; sort: SortKey },
): HostClassRecord[] {
  const filtered = classes.filter((cls) => {
    const state = classState(cls);
    if (options.status !== 'all') {
      if (options.status === 'published' && state !== 'live') return false;
      if (options.status === 'draft' && state !== 'draft') return false;
      if (options.status === 'ended' && state !== 'ended') return false;
    }
    const paid = isPaidClass(cls);
    if (options.type === 'paid' && !paid) return false;
    if (options.type === 'free' && paid) return false;
    return matchesSearch(cls, options.query);
  });

  if (options.sort === 'next-session') {
    // Soonest class first; drafts and finished classes fall to the bottom.
    const nextTime = (cls: HostClassRecord) => {
      const next = nextSession(cls);
      return next ? sessionTime(next) : Number.POSITIVE_INFINITY;
    };
    return [...filtered].sort((a, b) => nextTime(a) - nextTime(b));
  }
  if (options.sort === 'title') {
    return [...filtered].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  }
  if (options.sort === 'price-desc') {
    return [...filtered].sort((a, b) => toNaira(b.price) - toNaira(a.price));
  }
  if (options.sort === 'students') {
    return [...filtered].sort((a, b) => seatUsage(b).booked - seatUsage(a).booked);
  }
  return filtered;
}

export interface StatusCounts {
  all: number;
  published: number;
  draft: number;
  ended: number;
}

/**
 * How many classes each status chip would show, respecting the active type and
 * search filters but not the status chip itself. Keeps every chip's count
 * honest: choosing it always shows exactly that many items.
 */
export function statusCounts(
  classes: HostClassRecord[],
  options: { type: TypeFilter; query: string },
): StatusCounts {
  const base = { type: options.type, query: options.query, sort: 'newest' as SortKey };
  return {
    all: filterAndSortClasses(classes, { ...base, status: 'all' }).length,
    published: filterAndSortClasses(classes, { ...base, status: 'published' }).length,
    draft: filterAndSortClasses(classes, { ...base, status: 'draft' }).length,
    ended: filterAndSortClasses(classes, { ...base, status: 'ended' }).length,
  };
}

export function tabsForClass(cls: HostClassRecord): DetailTab[] {
  if (classState(cls) === 'draft') return ['overview'];
  if (!isPaidClass(cls)) return ALL_DETAIL_TABS.filter((tab) => tab !== 'payments');
  return ALL_DETAIL_TABS;
}

export function tabFromHash(hash: string, tabs: DetailTab[]): DetailTab {
  const value = hash.replace(/^#/, '').trim().toLowerCase();
  return (tabs as string[]).includes(value) ? (value as DetailTab) : 'overview';
}

export function nextTab(tabs: DetailTab[], current: DetailTab, step: 1 | -1): DetailTab {
  const index = tabs.indexOf(current);
  if (index < 0) return tabs[0] ?? 'overview';
  const nextIndex = (index + step + tabs.length) % tabs.length;
  return tabs[nextIndex];
}

export function sessionState(
  startsAt: string,
  timeZone = DEFAULT_TIMEZONE,
  now = new Date(),
): 'upcoming' | 'today' | 'past' {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return 'upcoming';
  if (dateKey(date, timeZone) === dateKey(now, timeZone)) return 'today';
  return date.getTime() > now.getTime() ? 'upcoming' : 'past';
}

export function sessionLocation(cls: HostClassRecord, session: { venue?: string | null; meeting_link?: string | null }): string {
  const venue = session.venue?.trim() || cls.venue?.trim();
  if (cls.mode === 'offline') return venue || 'Venue to be added';
  if (cls.mode === 'online') return 'Online';
  return venue ? `In person · ${venue}` : 'Online';
}

export function attendanceKey(sessionId: number, bookingId: number): string {
  return `${sessionId}:${bookingId}`;
}

/**
 * Flatten the class students' attendance history into the same keyed shape the
 * attendance checklist uses. The API only returns present marks, so anything
 * missing stays unmarked (and can still be marked this visit).
 *
 * Keyed by `session_id`, not `session.number`, because the backend can renumber
 * sessions after a schedule edit while old marks still point at the old id.
 */
export function attendanceHistory(students: ClassStudent[]): Record<string, boolean> {
  const history: Record<string, boolean> = {};
  for (const student of students) {
    for (const mark of student.session_attendance ?? []) {
      history[attendanceKey(mark.session_id, student.id)] = true;
    }
  }
  return history;
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export function readViewPreference(storage: Storage | undefined, key: string): 'cards' | 'list' | null {
  if (!storage) return null;
  try {
    const value = storage.getItem(key);
    return value === 'cards' || value === 'list' ? value : null;
  } catch {
    return null;
  }
}

export function writeViewPreference(storage: Storage | undefined, key: string, value: 'cards' | 'list'): void {
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch {
    /* private mode: keep the in-memory choice */
  }
}

