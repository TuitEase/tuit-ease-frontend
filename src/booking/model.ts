import { formatCalendarDate, formatDateShort, formatTimeOnly, dateTile, DEFAULT_TIMEZONE } from '../lib/datetime';
import { formatMoney, toNaira } from '../lib/money';
import type {
  BookingStatus,
  BookingStatusInstallment,
  ClassMode,
  PublicClass,
  PublicSession,
} from './api';

/* ------------------------------------------------------------- locations */

const BOOKING_SLUG_KEY = 'tuitease.booking.slug.';
const BOOKING_NAME_KEY = 'tuitease.booking.name.';

/** `/class/pottery-for-beginners/` -> `pottery-for-beginners`. */
export function slugFromLocation(location: Pick<Location, 'pathname' | 'search'>): string {
  const match = /^\/class\/([^/]+)\/?$/.exec(location.pathname || '');
  if (match) {
    try {
      return decodeURIComponent(match[1]).trim();
    } catch {
      return '';
    }
  }
  const params = new URLSearchParams(location.search || '');
  return (params.get('slug') ?? '').trim();
}

export function bookingReferenceFromSearch(search: string): string | null {
  const value = new URLSearchParams(search || '').get('booking');
  return value && value.trim() ? value.trim() : null;
}

/** Paystack appends both `reference` and `trxref` to the callback URL. */
export function paymentReferenceFromSearch(search: string): string | null {
  const params = new URLSearchParams(search || '');
  const value = params.get('reference') ?? params.get('trxref');
  return value && value.trim() ? value.trim() : null;
}

export function shareUrl(slug: string, base: string): string {
  return `${base.replace(/\/+$/, '')}/class/${encodeURIComponent(slug)}/`;
}

/** The remembered class page, with both the booking and Paystack references. */
export function classReturnUrl(slug: string, reference: string, search: string): string {
  const params = new URLSearchParams();
  params.set('booking', reference);
  const paymentRef = paymentReferenceFromSearch(search);
  if (paymentRef) params.set('reference', paymentRef);
  return `/class/${encodeURIComponent(slug)}/?${params.toString()}`;
}

function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function local(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Lets the Paystack return page find the class page again after a full-page redirect. */
export function rememberBookingSlug(reference: string, slug: string): void {
  try {
    storage()?.setItem(`${BOOKING_SLUG_KEY}${reference}`, slug);
    local()?.setItem(`${BOOKING_SLUG_KEY}${reference}`, slug);
  } catch {
    /* private mode: the return page falls back to its standalone confirmation */
  }
}

export function readRememberedSlug(reference: string): string | null {
  try {
    return storage()?.getItem(`${BOOKING_SLUG_KEY}${reference}`) ?? local()?.getItem(`${BOOKING_SLUG_KEY}${reference}`) ?? null;
  } catch {
    return null;
  }
}

/** Lets a reloaded return page greet the student by name without another API call. */
export function rememberBookingName(reference: string, name: string): void {
  const value = name.trim();
  if (!value) return;
  try {
    storage()?.setItem(`${BOOKING_NAME_KEY}${reference}`, value);
    local()?.setItem(`${BOOKING_NAME_KEY}${reference}`, value);
  } catch {
    /* private mode: the page falls back to a nameless greeting */
  }
}

export function readRememberedName(reference: string): string | null {
  try {
    return storage()?.getItem(`${BOOKING_NAME_KEY}${reference}`) ?? local()?.getItem(`${BOOKING_NAME_KEY}${reference}`) ?? null;
  } catch {
    return null;
  }
}

export function firstNameOf(value: string | null | undefined): string {
  const parts = words(value ?? '');
  return parts.length ? parts[0] : '';
}

/* ---------------------------------------------------------------- phones */

/**
 * Accepts the formats the design promises: `0801 234 5678`, `+234...`, `234...`.
 * Returns E.164 (`+2348012345678`) so the server stores one canonical number.
 */
export function normalizeNigerianPhone(raw: string): string | null {
  const compact = String(raw ?? '').replace(/[\s\-().]/g, '');
  const digits = compact.startsWith('+') ? compact.slice(1) : compact;
  if (!/^\d+$/.test(digits)) return null;
  if (/^0[789][01]\d{8}$/.test(digits)) return `+234${digits.slice(1)}`;
  if (/^234[789][01]\d{8}$/.test(digits)) return `+${digits}`;
  return null;
}

/* ------------------------------------------------------------- view model */

export type BookingStatusKind = 'open' | 'full' | 'ended';

export interface SessionView {
  id: number;
  number: number;
  startsAt: string;
  endsAt: string;
  month: string;
  day: string;
  /** `Sat, 10 Oct` */
  dateLabel: string;
  /** `9:00 AM` */
  timeLabel: string;
  /** `9:00 AM to 12:00 PM` */
  timeRange: string;
  line1: string;
  line2: string;
  place: string;
  differs: boolean;
}

export interface PlanPart {
  number: number;
  amount: number;
  dueAt: string | null;
}

export interface PublicClassView {
  raw: PublicClass;
  slug: string;
  title: string;
  description: string;
  mode: ClassMode;
  modeLabel: string;
  status: BookingStatusKind;
  currency: string;
  price: number;
  isFree: boolean;
  host: { name: string; firstName: string; initials: string; bio: string | null };
  seats: {
    capacity: number | null;
    booked: number | null;
    left: number | null;
    percent: number | null;
  };
  fewLeft: boolean;
  sessions: SessionView[];
  sessionCount: number;
  durationLabel: string | null;
  chips: string[];
  placePill: string;
  defaultPlace: string;
  plans: { enabled: boolean; count: number; parts: PlanPart[] };
  waitlistEnabled: boolean;
  confirmSeat: boolean;
  hasGroupLink: boolean;
  groupLink: string | null;
  groupRevealed: boolean;
  cover: { c1: string; c2: string; imageUrl: string | null };
  timezone: string;
  firstSession: SessionView | null;
  watermark: string;
  whenCopy: string;
  priceLine: string;
  calendarNote: string;
}

function words(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean);
}

function initialsOf(value: string): string {
  const parts = words(value);
  if (!parts.length) return 'A';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function firstWord(value: string): string {
  const parts = words(value);
  return parts.length ? parts[0] : 'friend';
}

export function resolveHost(raw: PublicClass): PublicClassView['host'] {
  if (typeof raw.host === 'string') {
    const name = raw.host.trim() || 'Your host';
    return { name, firstName: firstWord(name), initials: initialsOf(name), bio: null };
  }
  const name = (raw.host?.name ?? raw.host?.business_name ?? raw.host?.first_name ?? '').trim() || 'Your host';
  const firstName = (raw.host?.first_name ?? '').trim() || firstWord(name);
  return {
    name,
    firstName,
    initials: initialsOf(name),
    bio: raw.host?.bio?.trim() || null,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sessionEnd(session: PublicSession): string {
  if (session.ends_at) return session.ends_at;
  const starts = new Date(session.starts_at);
  const minutes = typeof session.duration_minutes === 'number' ? session.duration_minutes : 0;
  if (Number.isNaN(starts.getTime()) || minutes <= 0) return session.starts_at;
  return new Date(starts.getTime() + minutes * 60_000).toISOString();
}

export function resolveStatus(
  raw: PublicClass,
  seats: PublicClassView['seats'],
  now: Date,
): BookingStatusKind {
  const sessions = Array.isArray(raw.sessions) ? raw.sessions : [];
  const ended =
    sessions.length > 0 &&
    sessions.every((session) => {
      const end = new Date(sessionEnd(session));
      return !Number.isNaN(end.getTime()) && end.getTime() <= now.getTime();
    });
  if (ended) return 'ended';
  if (seats.left === 0) return 'full';
  if (raw.status === 'open' || raw.status === 'full' || raw.status === 'ended') return raw.status;
  return 'open';
}

function resolveSeats(raw: PublicClass): PublicClassView['seats'] {
  const capacity =
    typeof raw.capacity === 'number' && Number.isFinite(raw.capacity) && raw.capacity > 0
      ? Math.floor(raw.capacity)
      : null;
  let left =
    typeof raw.seats_left === 'number' && Number.isFinite(raw.seats_left)
      ? Math.max(0, Math.floor(raw.seats_left))
      : null;
  let booked =
    typeof raw.booked === 'number' && Number.isFinite(raw.booked)
      ? Math.max(0, Math.floor(raw.booked))
      : null;

  if (left === null && capacity !== null && booked !== null) left = Math.max(capacity - booked, 0);
  if (booked === null && capacity !== null && left !== null) booked = Math.max(capacity - left, 0);
  if (capacity !== null && booked !== null) booked = Math.min(booked, capacity);

  const percent = capacity !== null && booked !== null ? clamp(Math.round((booked / capacity) * 100), 0, 100) : null;
  return { capacity, booked, left, percent };
}

function resolveParts(raw: PublicClass, price: number): { enabled: boolean; count: number; parts: PlanPart[] } {
  const count = raw.allow_installments ? Math.max(2, Math.floor(raw.installment_count || 2)) : 1;
  if (!raw.allow_installments || price <= 0) {
    return { enabled: false, count: 1, parts: [{ number: 1, amount: price, dueAt: null }] };
  }

  const supplied = Array.isArray(raw.installments) ? raw.installments : [];
  if (supplied.length >= 2) {
    const parts = supplied
      .filter((part) => part && typeof part.number === 'number')
      .sort((a, b) => a.number - b.number)
      .map((part) => ({
        number: part.number,
        amount: toNaira(part.amount),
        dueAt: part.due_at ?? part.due_date ?? null,
      }));
    if (parts.length >= 2) return { enabled: true, count: parts.length, parts };
  }

  // Display-only fallback. The server still owns the real split and the charge;
  // this mirrors its equal-parts maths so the student sees roughly what is due
  // today. Dates are deliberately omitted because the interval is not public.
  const totalKobo = Math.round(price * 100);
  const base = Math.floor(totalKobo / count);
  const parts: PlanPart[] = Array.from({ length: count }, (_, index) => ({
    number: index + 1,
    amount: (index === count - 1 ? totalKobo - base * (count - 1) : base) / 100,
    dueAt: null,
  }));
  return { enabled: true, count, parts };
}

function normalizePlace(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function resolveSessions(raw: PublicClass, timezone: string): SessionView[] {
  const classVenue = (raw.venue ?? '').trim();
  const fallbackPlace = classVenue || 'Venue to be announced';
  const sessions = Array.isArray(raw.sessions) ? [...raw.sessions] : [];
  sessions.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

  return sessions.map((session, index) => {
    const endsAt = sessionEnd(session);
    const tile = dateTile(session.starts_at, timezone);
    const startLabel = formatTimeOnly(session.starts_at, timezone);
    const endLabel = formatTimeOnly(endsAt, timezone);
    const ownVenue = (session.venue ?? '').trim();

    let place: string;
    let differs = false;

    if (session.place_label) {
      place = session.place_label;
      differs = Boolean(session.differs_from_default);
    } else if (raw.mode === 'online') {
      place = 'Link sent after you book';
    } else if (raw.mode === 'hybrid') {
      if (ownVenue) {
        place = ownVenue;
        differs = Boolean(classVenue && normalizePlace(ownVenue) !== normalizePlace(classVenue));
      } else if (session.meeting_link) {
        place = 'Online · link sent after you book';
      } else {
        place = classVenue || 'Online and in person';
      }
    } else {
      place = ownVenue || fallbackPlace;
      differs = Boolean(ownVenue && classVenue && normalizePlace(ownVenue) !== normalizePlace(classVenue));
    }

    const timeRange = startLabel && endLabel ? `${startLabel} to ${endLabel}` : startLabel || endLabel;
    return {
      id: session.id,
      number: index + 1,
      startsAt: session.starts_at,
      endsAt,
      month: tile.month,
      day: tile.day,
      dateLabel: formatDateShort(session.starts_at, timezone),
      timeLabel: startLabel,
      timeRange,
      line1: `Session ${index + 1} · ${formatDateShort(session.starts_at, timezone)}`,
      line2: [timeRange, place].filter(Boolean).join(' · '),
      place,
      differs,
    };
  });
}

function durationCopy(minutes: number | null): string | null {
  if (minutes === null || minutes <= 0) return null;
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} each`;
  }
  return `${minutes} minutes each`;
}

function sessionMinutes(session: PublicSession): number | null {
  if (typeof session.duration_minutes === 'number' && session.duration_minutes > 0) {
    return Math.floor(session.duration_minutes);
  }
  const start = new Date(session.starts_at).getTime();
  const end = new Date(sessionEnd(session)).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  return Math.round((end - start) / 60_000);
}

/**
 * The public payload currently includes private meeting/replay links. Drop them
 * from the view model so no component can accidentally render them before the
 * student has booked.
 */
function withoutPrivateLinks(raw: PublicClass): PublicClass {
  return {
    ...raw,
    sessions: (Array.isArray(raw.sessions) ? raw.sessions : []).map((session) => ({
      ...session,
      meeting_link: null,
      replay_link: null,
    })),
  };
}

export function buildView(source: PublicClass, now: Date = new Date()): PublicClassView {
  const raw = withoutPrivateLinks(source);
  const timezone = raw.timezone || DEFAULT_TIMEZONE;
  const price = Math.max(0, toNaira(raw.price));
  const currency = raw.currency || 'NGN';
  const isFree = price <= 0;
  const seats = resolveSeats(raw);
  const status = resolveStatus(raw, seats, now);
  const host = resolveHost(raw);
  const sessions = resolveSessions(raw, timezone);
  const plans = resolveParts(raw, isFree ? 0 : price);
  const firstSession = sessions[0] ?? null;
  const minutes = Array.isArray(raw.sessions) && raw.sessions.length ? sessionMinutes(raw.sessions[0]) : null;
  const durationLabel = durationCopy(minutes);
  const classVenue = (raw.venue ?? '').trim();
  const defaultPlace = classVenue || 'Venue to be announced';

  const modeLabel = raw.mode === 'offline' ? 'In person' : raw.mode === 'hybrid' ? 'Hybrid' : 'Online';
  const placePill =
    raw.mode === 'offline'
      ? `In person · ${defaultPlace}`
      : raw.mode === 'hybrid'
        ? `Hybrid · ${classVenue || 'Online and in person'}`
        : 'Online';

  const chips: string[] = [];
  if (sessions.length) chips.push(`${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'}`);
  if (durationLabel) chips.push(durationLabel);
  const level = (raw.level ?? '').trim();
  if (level) chips.push(level);
  if (Array.isArray(raw.tags)) {
    for (const tag of raw.tags) {
      const value = String(tag ?? '').trim();
      if (value && !chips.some((chip) => chip.toLowerCase() === value.toLowerCase())) chips.push(value);
    }
  }

  const groupLink = raw.group_link?.trim() || null;
  const hasGroupLink = raw.has_group_link ?? Boolean(groupLink);

  const sessionPhrase = sessions.length === 1 ? 'for your session' : `for all ${sessions.length} sessions`;
  const priceLine = isFree
    ? 'Free'
    : `${sessionPhrase}${
        plans.enabled ? ` · or pay in ${plans.count} parts of ${formatMoney(plans.parts[0].amount, currency)}` : ''
      }`;

  return {
    raw,
    slug: raw.slug,
    title: raw.title?.trim() || 'Your class',
    description: raw.description?.trim() || '',
    mode: raw.mode,
    modeLabel,
    status,
    currency,
    price,
    isFree,
    host,
    seats,
    fewLeft: seats.left !== null && seats.left > 0 && seats.left <= 3,
    sessions,
    sessionCount: sessions.length,
    durationLabel,
    chips,
    placePill,
    defaultPlace,
    plans,
    waitlistEnabled: Boolean(raw.waitlist_enabled),
    confirmSeat: Boolean(raw.confirm_seat_enabled),
    hasGroupLink,
    groupLink,
    groupRevealed: false,
    cover: {
      c1: raw.cover?.c1 || '#7C3F2A',
      c2: raw.cover?.c2 || '#C0663F',
      imageUrl: raw.cover?.image_url || null,
    },
    timezone,
    firstSession,
    watermark: initialsOf(raw.title ?? ''),
    whenCopy:
      sessions.length === 1
        ? 'One booking covers your session.'
        : `One booking covers all ${sessions.length} sessions.`,
    priceLine,
    calendarNote: 'A calendar link arrives with your WhatsApp message.',
  };
}

/* ----------------------------------------------------------- plan helpers */

/** The line above the seat progress bar. */
export function seatsLine(view: PublicClassView): string {
  const { capacity, booked, left } = view.seats;
  if (view.status === 'full') {
    return capacity !== null ? `All ${capacity} seats are taken` : 'All seats are taken';
  }
  if (capacity !== null && booked !== null) return `${booked} of ${capacity} seats taken`;
  if (left !== null) return `${left} ${left === 1 ? 'seat' : 'seats'} left`;
  if (booked !== null) return `${booked} booked`;
  return 'Seats available';
}

export function planNow(view: PublicClassView, plan: 'full' | 'installments'): number {
  return plan === 'installments' ? view.plans.parts[0]?.amount ?? view.price : view.price;
}

export function planLater(view: PublicClassView, plan: 'full' | 'installments'): PlanPart | null {
  if (plan !== 'installments' || !view.plans.enabled) return null;
  return view.plans.parts[1] ?? null;
}

/** `₦24,000 now, ₦24,000 on 1 Nov` — or a date-free version until the API sends dates. */
export function installmentChoiceCopy(view: PublicClassView): string {
  const first = view.plans.parts[0];
  const later = view.plans.parts[1];
  if (!first || !later) return '';
  const firstLabel = `${formatMoney(first.amount, view.currency)} now`;
  if (later.dueAt) {
    return `${firstLabel}, ${formatMoney(later.amount, view.currency)} on ${formatCalendarDate(later.dueAt)}`;
  }
  return `${firstLabel}, ${view.plans.count - 1} more ${view.plans.count - 1 === 1 ? 'payment' : 'payments'} later`;
}

/** The line under the “Pay today” total. */
export function installmentLaterLine(view: PublicClassView): string {
  const later = view.plans.parts[1];
  if (!later) return 'One payment. Nothing more to pay.';
  const remaining = view.plans.count - 1;
  if (later.dueAt) {
    return `Then ${formatMoney(later.amount, view.currency)} on ${formatCalendarDate(later.dueAt)}. We will remind you on WhatsApp.`;
  }
  return `Then ${remaining} more ${remaining === 1 ? 'payment' : 'payments'}. We will remind you on WhatsApp.`;
}

/* --------------------------------------------------------- booking status */

export function nextUnpaidInstallment(status: BookingStatus | null): BookingStatusInstallment | null {
  if (!status || !Array.isArray(status.installments)) return null;
  return status.installments.find((part) => part.status === 'pending') ?? null;
}

export function nextDueLine(status: BookingStatus | null, currency: string): string {
  if (!status) return '';
  if (status.next_due) {
    const due = status.next_due.due_at.slice(0, 10);
    return `${formatMoney(status.next_due.amount, currency)} due ${formatCalendarDate(due)}`;
  }
  const next = nextUnpaidInstallment(status);
  return next ? `${formatMoney(next.amount, currency)} due ${formatCalendarDate(next.due_date)}` : '';
}

export function bookingPaidAmount(status: BookingStatus | null): number {
  return status ? toNaira(status.amount_paid_total ?? status.amount_paid) : 0;
}
