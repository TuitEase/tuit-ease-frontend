import { clearAuthSession, getAuthToken } from '../auth/api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export class StudentsApiError extends Error {
  status?: number;
  detail?: string;

  constructor(message: string, status?: number, detail?: string) {
    super(message);
    this.name = 'StudentsApiError';
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

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body) headers.set('Content-Type', 'application/json');
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Token ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new StudentsApiError('Could not connect to TuitEase. Check your connection and try again.');
  }

  if (response.status === 401) {
    clearAuthSession();
    window.location.assign('/signin/');
    throw new StudentsApiError('Your session has expired. Please sign in again.', 401);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const message = errorMessage(payload);
    throw new StudentsApiError(message, response.status, message);
  }

  return payload as T;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface HostClassSession {
  id: number;
  number: number;
  starts_at: string;
  duration_minutes: number;
  replay_link?: string;
  meeting_link?: string | null;
  venue?: string | null;
}

export interface HostClassRecord {
  id: number;
  title: string;
  slug: string;
  description: string;
  price: string;
  capacity: number;
  currency: string;
  mode: 'online' | 'offline' | 'hybrid';
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
  platform_percent?: string | null;
  sessions: HostClassSession[];
  status: 'live' | 'ended';
  seats?: {
    capacity: number;
    seats_left: number;
    booked: number;
    waitlist: number;
    is_full: boolean;
  };
  next_session?: HostClassSession | null;
}

export interface ClassStudentBooking {
  id: number;
  reference: string;
  student_id: number;
  student_name: string;
  student_phone: string;
  status: 'pending_payment' | 'active' | 'waitlisted' | 'cancelled';
  amount_due: string;
  amount_paid: string;
  balance: string;
  payment_state: 'paid' | 'part_paid' | 'unpaid';
  confirmed: boolean;
  created_at: string;
  session_attendance: Array<{
    session_id: number;
    session_number: number;
    class_id: number;
  }>;
}

export interface StudentDetail {
  id: string;
  first_seen_at: string;
  name: string;
  phone: string;
  email: string | null;
  whatsapp_reachable: boolean;
  stats: {
    classes_booked: number;
    sessions_attended: number;
    missed_session: number;
    attendance_rate: number;
    total_paid: string | number;
    outstanding: string | number;
  };
}

export interface StudentBookingSummaryItem {
  id: number;
  reference: string;
  status: string;
  created_at: string;
  class_event?: {
    id: string;
    title: string;
    mode: string;
    is_paid: boolean;
    sessions?: {
      all: Array<{ id: number; number: number; venue?: string; meeting_link?: string; starts_at: string }>;
      total: number;
      attended: number;
      missed: number;
    };
    next_session?: { id: number; number: number; venue?: string; meeting_link?: string; starts_at: string };
  };
  money?: {
    price: string | number;
    paid: string | number;
    payment_state: string;
    price_due: string | number;
  };
  next_installment?: {
    amount: string | number;
    status: string;
    due_at: string;
  } | null;
  seat_confirmed: boolean;
}

export interface StudentPaymentRecord {
  id: number;
  created_at: string;
  paid_at: string | null;
  method: string;
  status: string;
  reference: string;
  class_title: string;
  amount?: string | number;
  platform_fee?: string | number;
  processing_fee?: string | number;
  host_amount?: string | number;
  host_receives?: string | number;
  note?: string;
}

/**
 * A row from `/api/host/payments/`. Unlike the per-student endpoint this one
 * carries the money fields and the fee split, so the Payments tab uses it and
 * filters by `booking_id` in the browser (one request, no N+1 per student).
 */
export interface HostPaymentRecord {
  id: number;
  amount: string;
  status: string;
  method: string;
  reference: string;
  paid_at: string | null;
  platform_fee: string;
  processing_fee: string;
  host_receives: string;
  platform_percent?: string | null;
  student_name: string;
  booking_id: number;
  class_name: string;
  class_id: number;
}

export interface StudentReminderMessage {
  id: number;
  kind: string;
  status: string;
  channel: string;
  sent_at: string | null;
}

export interface HostProfile {
  id: number;
  email: string;
  business_name: string;
  whatsapp_number: string;
  host_type: string;
  timezone: string;
  summary_hour: number;
  daily_summary_enabled: boolean;
  payout_ready: boolean;
  needs_onboarding: boolean;
}

export async function fetchClasses(pageSize = 50): Promise<PaginatedResponse<HostClassRecord>> {
  return request<PaginatedResponse<HostClassRecord>>(`/api/host/classes/?page_size=${pageSize}`);
}

export async function fetchClass(classId: number): Promise<HostClassRecord> {
  return request<HostClassRecord>(`/api/host/classes/${classId}/`);
}

export async function fetchClassStudents(
  classId: number,
  pageSize = 100,
): Promise<PaginatedResponse<ClassStudentBooking>> {
  return request<PaginatedResponse<ClassStudentBooking>>(
    `/api/host/classes/${classId}/students/?page_size=${pageSize}`,
  );
}

/** DRF's `next` can be absolute; the dev proxy only understands same-origin paths. */
export function toApiPath(next: string | null): string | null {
  if (!next) return null;
  try {
    const url = new URL(next, window.location.origin);
    return `${url.pathname}${url.search}`;
  } catch {
    return next;
  }
}

export async function fetchClassStudentsNext(
  next: string,
): Promise<PaginatedResponse<ClassStudentBooking>> {
  return request<PaginatedResponse<ClassStudentBooking>>(next);
}

const PAYMENTS_PAGE_SIZE = 50;
const PAYMENTS_MAX_PAGES = 40;

/**
 * Fetch every payment the host has. Paginated at 50 by the backend, so walk the
 * pages once and let the page filter by `booking_id` locally.
 */
export async function fetchHostPayments(): Promise<HostPaymentRecord[]> {
  const rows: HostPaymentRecord[] = [];
  let path: string | null = `/api/host/payments/?page_size=${PAYMENTS_PAGE_SIZE}`;
  let page = 1;

  while (path && page <= PAYMENTS_MAX_PAGES) {
    const payload = await request<PaginatedResponse<HostPaymentRecord> | HostPaymentRecord[]>(path);
    if (Array.isArray(payload)) {
      rows.push(...payload);
      break;
    }
    rows.push(...(payload.results ?? []));
    path = toApiPath(payload.next);
    page += 1;
  }

  return rows;
}

export async function fetchStudentDetail(studentId: number): Promise<StudentDetail> {
  return request<StudentDetail>(`/api/host/students/${studentId}/`);
}

export async function fetchStudentBookings(
  studentId: number,
  pageSize = 50,
): Promise<PaginatedResponse<StudentBookingSummaryItem>> {
  return request<PaginatedResponse<StudentBookingSummaryItem>>(
    `/api/host/students/${studentId}/bookings/?page_size=${pageSize}`,
  );
}

export async function fetchStudentPayments(
  studentId: number,
  pageSize = 50,
): Promise<PaginatedResponse<StudentPaymentRecord>> {
  return request<PaginatedResponse<StudentPaymentRecord>>(
    `/api/host/students/${studentId}/payments/?page_size=${pageSize}`,
  );
}

export async function fetchStudentMessages(
  studentId: number,
  pageSize = 50,
): Promise<PaginatedResponse<StudentReminderMessage>> {
  return request<PaginatedResponse<StudentReminderMessage>>(
    `/api/host/students/${studentId}/messages/?page_size=${pageSize}`,
  );
}

export async function fetchHostProfile(): Promise<HostProfile> {
  return request<HostProfile>('/api/host/me/');
}

export async function recordManualPayment(
  bookingId: number,
  amount: number,
): Promise<ClassStudentBooking> {
  return request<ClassStudentBooking>(`/api/host/bookings/${bookingId}/mark-paid/`, {
    method: 'POST',
    body: JSON.stringify({ amount: String(amount) }),
  });
}

export async function saveAttendance(
  sessionId: number,
  marks: Array<{ booking: number; present: boolean }>,
): Promise<{ saved: boolean }> {
  return request<{ saved: boolean }>(`/api/host/sessions/${sessionId}/attendance/`, {
    method: 'POST',
    body: JSON.stringify({ marks }),
  });
}

export async function sendPaymentReminder(bookingId: number): Promise<{ sent: boolean }> {
  return request<{ sent: boolean }>(`/api/host/bookings/${bookingId}/remind/`, {
    method: 'POST',
  });
}

export async function cancelBooking(bookingId: number): Promise<ClassStudentBooking> {
  return request<ClassStudentBooking>(`/api/host/bookings/${bookingId}/cancel/`, {
    method: 'POST',
  });
}
