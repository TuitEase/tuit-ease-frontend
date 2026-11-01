import { clearAuthSession, getAuthToken } from '../auth/api';

export type Money = string | number;

export interface HostProfile {
  business_name: string;
  email: string;
  timezone: string;
  summary_hour: number;
  payout_ready: boolean;
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

export interface AtRiskStudent {
  booking: number;
  student: string;
  class: string;
  reasons: string[];
}

export interface DashboardOverview {
  stats: DashboardStats;
  at_risk: AtRiskStudent[];
  summary_preview: string;
}

export interface ClassSession {
  id: number;
  number: number;
  starts_at: string;
  duration_minutes: number;
}

export interface HostClass {
  id: number;
  title: string;
  slug: string;
  price: Money;
  currency: string;
  capacity: number;
  mode: 'online' | 'offline' | 'hybrid';
  is_published: boolean;
  sessions: ClassSession[];
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface HostClassPage extends Paginated<HostClass> {}

export interface ClassBooking {
  id: number;
  reference: string;
  student_name: string;
  student_phone: string;
  status: 'pending_payment' | 'active' | 'waitlisted' | 'cancelled';
  amount_due: Money;
  amount_paid: Money;
  balance: Money;
  payment_state: 'paid' | 'part_paid' | 'unpaid';
  confirmed: boolean;
  created_at: string;
}

interface ApiErrorPayload {
  detail?: unknown;
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
export class DashboardApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DashboardApiError';
  }
}

function errorMessage(payload: unknown): string {
  if (typeof payload === 'string') return payload;
  if (typeof payload === 'object' && payload !== null) {
    const body = payload as ApiErrorPayload;
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail)) {
      const messages = body.detail.filter((item): item is string => typeof item === 'string');
      if (messages.length) return messages.join(' ');
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
    throw new DashboardApiError('Could not connect to TuitEase. Check your connection and try again.');
  }

  if (response.status === 401) {
    clearAuthSession();
    window.location.assign('/signin/');
    throw new DashboardApiError('Your session has expired. Please sign in again.');
  }

  let data: unknown;
  try {
    data = response.status === 204 ? null : await response.json();
  } catch {
    throw new DashboardApiError('TuitEase returned an unreadable response. Please try again.');
  }
  if (!response.ok) throw new DashboardApiError(errorMessage(data));
  return data as T;
}

export const fetchHost = () => request<HostProfile>('/api/host/me/');
export const fetchOverview = () => request<DashboardOverview>('/api/host/dashboard/');

function paginatedResults<T>(payload: unknown): Paginated<T> {
  const body = (payload ?? {}) as Partial<Paginated<T>>;
  const results = Array.isArray(body.results)
    ? body.results
    : Array.isArray(payload)
      ? (payload as T[])
      : [];
  return {
    count: typeof body.count === 'number' ? body.count : results.length,
    next: typeof body.next === 'string' ? body.next : null,
    previous: typeof body.previous === 'string' ? body.previous : null,
    results,
  };
}

export const fetchClasses = async (page = 1): Promise<HostClassPage> => {
  const data = await request<unknown>(`/api/host/classes/?page=${page}`);
  return paginatedResults<HostClass>(data);
};

export const fetchClassBookings = async (classId: number): Promise<ClassBooking[]> => {
  const data = await request<unknown>(`/api/host/classes/${classId}/bookings/`);
  if (Array.isArray(data)) return data as ClassBooking[];
  const { results } = paginatedResults<ClassBooking>(data);
  if (results.length || (data as Partial<Paginated<ClassBooking>> | null)?.results) return results;
  throw new DashboardApiError('TuitEase returned an unexpected student list. Please try again.');
};

export const createClass = (input: {
  title: string;
  price: string;
  capacity: number;
  mode: HostClass['mode'];
  venue?: string;
  is_published: boolean;
  sessions: Array<{ starts_at: string; duration_minutes: number }>;
}) =>
  request<HostClass>('/api/host/classes/', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const markBookingPaid = (bookingId: number, amount: string) =>
  request<ClassBooking>(`/api/host/bookings/${bookingId}/mark-paid/`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });

export const remindBooking = (bookingId: number) =>
  request<{ sent: boolean }>(`/api/host/bookings/${bookingId}/remind/`, { method: 'POST' });

export const cancelBooking = (bookingId: number) =>
  request<ClassBooking>(`/api/host/bookings/${bookingId}/cancel/`, { method: 'POST' });

export const saveAttendance = (
  sessionId: number,
  marks: Array<{ booking: number; present: boolean }>,
) =>
  request<{ saved: boolean }>(`/api/host/sessions/${sessionId}/attendance/`, {
    method: 'POST',
    body: JSON.stringify({ marks }),
  });
