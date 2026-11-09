import { clearAuthSession, getAuthToken } from '../auth/api';
import type { Money } from '../dashboard/api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
const PAGE_SIZE = 50;
const MAX_PAGES = 40;

export class ClassesApiError extends Error {
  status?: number;
  detail?: string;

  constructor(message: string, status?: number, detail?: string) {
    super(message);
    this.name = 'ClassesApiError';
    this.status = status;
    this.detail = detail;
  }
}

function errorMessage(payload: unknown): string {
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (typeof payload === 'object' && payload !== null) {
    const body = payload as Record<string, unknown>;
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail)) {
      const messages = body.detail.filter((item): item is string => typeof item === 'string');
      if (messages.length) return messages.join(' ');
    }
    for (const [key, value] of Object.entries(body)) {
      if (key === 'detail') continue;
      if (typeof value === 'string' && value.trim()) return value;
      if (Array.isArray(value)) {
        const first = value.find((item): item is string => typeof item === 'string' && item.trim().length > 0);
        if (first) return first;
      }
    }
  }
  return 'The request could not be completed. Please try again.';
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body) headers.set('Content-Type', 'application/json');
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Token ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ClassesApiError('Could not connect to TuitEase. Check your connection and try again.');
  }

  if (response.status === 401) {
    clearAuthSession();
    window.location.assign('/signin/');
    throw new ClassesApiError('Your session has expired. Please sign in again.', 401);
  }

  let data: unknown;
  try {
    data = response.status === 204 ? null : await response.json();
  } catch {
    throw new ClassesApiError('TuitEase returned an unreadable response. Please try again.', response.status);
  }

  if (!response.ok) throw new ClassesApiError(errorMessage(data), response.status, errorMessage(data));
  return data as T;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Page<T> {
  items: T[];
  total: number;
  truncated: boolean;
}

function normalizePage<T>(payload: unknown): Paginated<T> {
  if (Array.isArray(payload)) {
    return { count: payload.length, next: null, previous: null, results: payload as T[] };
  }
  const body = (payload ?? {}) as Partial<Paginated<T>>;
  return {
    count: typeof body.count === 'number' ? body.count : 0,
    next: typeof body.next === 'string' ? body.next : null,
    previous: typeof body.previous === 'string' ? body.previous : null,
    results: Array.isArray(body.results) ? body.results : [],
  };
}

/** `next` may be absolute; the dev proxy only understands same-origin paths. */
function nextPath(next: string | null): string | null {
  if (!next) return null;
  try {
    const url = new URL(next, window.location.origin);
    return `${url.pathname}${url.search}`;
  } catch {
    return next;
  }
}

function withPage(path: string, page: number): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}page=${page}&page_size=${PAGE_SIZE}`;
}

/**
 * The list endpoints are page-number paginated (max page_size 50). The design
 * needs the whole list so search, filters and per-class totals can run without
 * an N+1 request per class. Stop at MAX_PAGES and report `truncated` rather than
 * quietly showing a partial list.
 */
async function fetchAllPages<T>(path: string): Promise<Page<T>> {
  const items: T[] = [];
  let total = 0;
  let page = 1;
  let next: string | null = withPage(path, page);

  while (next && page <= MAX_PAGES) {
    const payload = normalizePage<T>(await request<unknown>(next));
    total = Math.max(total, payload.count);
    items.push(...payload.results);
    const candidate = nextPath(payload.next);
    if (!candidate) break;
    next = candidate;
    page += 1;
  }

  return { items, total: Math.max(total, items.length), truncated: Boolean(next) };
}

export type ClassMode = 'online' | 'offline' | 'hybrid';

export interface ClassSession {
  id: number;
  number: number;
  starts_at: string;
  duration_minutes: number;
  replay_link?: string;
  meeting_link: string | null;
  venue: string | null;
}

export interface ClassFlag {
  code: string;
  count: number;
}

export interface ClassSeats {
  capacity: number;
  seats_left: number;
  booked: number;
  waitlist: number;
  is_full: boolean;
}

export interface HostClassRecord {
  id: number;
  title: string;
  slug: string;
  description: string;
  price: Money;
  capacity: number;
  currency: string;
  mode: ClassMode;
  meeting_link: string;
  venue: string;
  venue_map_link: string;
  group_link: string;
  is_published: boolean;
  waitlist_enabled: boolean;
  allow_installments: boolean;
  installment_count: number;
  installment_interval_days: number;
  require_seat_confirmation: boolean;
  sessions: ClassSession[];
  seats: ClassSeats;
  status: 'live' | 'ended';
  next_session: ClassSession | null;
  flags: ClassFlag[];
}

export interface ClassesOverviewStats {
  live_classes: number;
  drafts: number;
  past_classes: number;
  students_booked: number;
  collected_money: Money | null;
}

export interface UpcomingClass {
  session_id: number;
  class_id: number;
  class_title: string;
  starts_at: string;
  session_number: number;
  session_total: number;
  location: string | null;
  mode: ClassMode;
}

export interface ClassesOverview {
  stats: ClassesOverviewStats;
  upcoming_classes: UpcomingClass[];
  attention: unknown[] | string;
  generated_at: string;
}

export interface HostProfile {
  business_name: string;
  email: string;
  timezone: string;
  summary_hour: number;
  payout_ready: boolean;
  payout_bank_code?: string;
  payout_account_last4?: string;
}

export interface DashboardStats {
  classes: number;
  active_students: number;
  outstanding_students: number;
  waitlisted: number;
  collected: Money;
  expected: Money;
  outstanding: Money;
  at_risk: number;
  payout_ready: boolean;
}

export interface ClassStudentAttendance {
  session_id: number;
  session_number: number;
  class_id: number;
}

export interface ClassStudent {
  id: number;
  reference: string;
  student_id: number;
  student_name: string;
  student_phone: string;
  status: 'pending_payment' | 'active' | 'waitlisted' | 'cancelled';
  amount_due: Money;
  amount_paid: Money;
  balance: Money;
  payment_state: 'paid' | 'part_paid' | 'unpaid';
  confirmed: boolean;
  created_at: string;
  /**
   * Present marks only. The API does not return an absent row, so a held
   * session with no entry here is "not marked" rather than "absent".
   */
  session_attendance?: ClassStudentAttendance[];
}

export interface PaymentRow {
  id: number;
  booking_id: number;
  class_id: number;
  amount: Money;
  status: string;
  method: string;
  reference: string;
  paid_at: string | null;
  student_name: string;
  class_name: string;
}

export interface PendingInstallment {
  id: number;
  booking_id: number;
  amount: Money;
  due_date: string;
  student_name: string;
  student_id: number;
  class_name: string;
  class_id: number;
}

export interface ClassTotals {
  title: string;
  total_students: number;
  is_paid: boolean;
  price: Money;
  total_paid: Money;
  amount_over_due: Money;
}

export const fetchClasses = () => fetchAllPages<HostClassRecord>('/api/host/classes/');

export const fetchClassesOverview = () => request<ClassesOverview>('/api/host/classes/overview/');

export const fetchClass = (id: number) => request<HostClassRecord>(`/api/host/classes/${id}/`);

export const fetchClassStudents = (id: number) =>
  fetchAllPages<ClassStudent>(`/api/host/classes/${id}/students/`);

export const fetchHostProfile = () => request<HostProfile>('/api/host/me/');

export const fetchDashboardStats = () =>
  request<{ stats: DashboardStats }>('/api/host/dashboard/').then((response) => response.stats);

export const fetchPayments = () => fetchAllPages<PaymentRow>('/api/host/payments/');

export const fetchPendingInstallments = () =>
  fetchAllPages<PendingInstallment>('/api/host/payments/pending/');

export const fetchClassTotals = () => fetchAllPages<ClassTotals>('/api/host/payments/classes/');

export const remindBooking = (bookingId: number) =>
  request<{ sent: boolean }>(`/api/host/bookings/${bookingId}/remind/`, { method: 'POST' });

export const saveAttendance = (sessionId: number, marks: Array<{ booking: number; present: boolean }>) =>
  request<{ saved: boolean }>(`/api/host/sessions/${sessionId}/attendance/`, {
    method: 'POST',
    body: JSON.stringify({ marks }),
  });

export const publishClass = (id: number) =>
  request<HostClassRecord>(`/api/host/classes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ is_published: true }),
  });
