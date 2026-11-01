import { clearAuthSession, getAuthToken } from '../auth/api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export class CreateClassApiError extends Error {
  fields: Record<string, string[]>;
  status?: number;

  constructor(message: string, fields: Record<string, string[]> = {}, status?: number) {
    super(message);
    this.name = 'CreateClassApiError';
    this.fields = fields;
    this.status = status;
  }
}

function collectFields(body: Record<string, unknown>): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === 'detail') continue;
    if (Array.isArray(value)) {
      const strings = value.filter((item): item is string => typeof item === 'string');
      if (strings.length) fields[key] = strings;
    } else if (typeof value === 'string') {
      fields[key] = [value];
    }
  }
  return fields;
}

function firstMessage(body: Record<string, unknown>, fields: Record<string, string[]>): string {
  if (typeof body.detail === 'string') return body.detail;
  if (Array.isArray(body.detail) && typeof body.detail[0] === 'string') return body.detail[0];
  for (const values of Object.values(fields)) {
    if (values[0]) return values[0];
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
    throw new CreateClassApiError('Could not connect to TuitEase. Check your connection and try again.');
  }
  if (response.status === 401) {
    clearAuthSession();
    window.location.assign('/signin/');
    throw new CreateClassApiError('Your session has expired. Please sign in again.', {}, 401);
  }
  let data: unknown;
  try {
    data = response.status === 204 ? null : await response.json();
  } catch {
    throw new CreateClassApiError('TuitEase returned an unreadable response. Please try again.', {}, response.status);
  }
  if (!response.ok) {
    if (typeof data === 'object' && data !== null) {
      const body = data as Record<string, unknown>;
      const fields = collectFields(body);
      throw new CreateClassApiError(firstMessage(body, fields), fields, response.status);
    }
    throw new CreateClassApiError('The request could not be completed. Please try again.', {}, response.status);
  }
  return data as T;
}

export interface HostProfile {
  business_name: string;
  email: string;
  timezone: string;
  summary_hour: number;
  payout_ready: boolean;
  payout_bank_code?: string;
  payout_account_last4?: string;
  needs_onboarding?: boolean;
}

export interface Bank {
  name: string;
  code: string;
}

export interface SessionPayload {
  starts_at: string;
  duration_minutes: number;
  meeting_link?: string;
  venue?: string;
}

export interface ClassPayload {
  title?: string;
  description?: string;
  mode?: 'online' | 'offline' | 'hybrid';
  meeting_link?: string;
  venue?: string;
  venue_map_link?: string;
  group_link?: string;
  capacity?: number;
  price?: string;
  is_published?: boolean;
  waitlist_enabled?: boolean;
  allow_installments?: boolean;
  installment_count?: number;
  installment_interval_days?: number;
  require_seat_confirmation?: boolean;
}

export interface SessionResponse {
  id: number;
  number: number;
  starts_at: string;
  duration_minutes: number;
  replay_link?: string;
  meeting_link: string | null;
  venue: string | null;
}

export interface ClassResponse {
  id: number;
  title: string;
  slug: string;
  description: string;
  price: string;
  currency: string;
  /** Missing from the current serializer; read `seats.capacity` when present. */
  capacity?: number;
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
  sessions: SessionResponse[];
  seats?: { capacity: number; seats_left: number; booked: number; waitlist: number; is_full: boolean };
}

export const fetchHostProfile = () => request<HostProfile>('/api/host/me/');

export const fetchBanks = () =>
  request<{ banks: Bank[] }>('/api/host/payout/banks/').then((response) => response.banks);

export const getClass = (id: number) => request<ClassResponse>(`/api/host/classes/${id}/`);

export const createClass = (input: ClassPayload) =>
  request<ClassResponse>('/api/host/classes/', { method: 'POST', body: JSON.stringify(input) });

export const patchClass = (id: number, input: ClassPayload) =>
  request<ClassResponse>(`/api/host/classes/${id}/`, { method: 'PATCH', body: JSON.stringify(input) });

export const createSession = (classId: number, input: SessionPayload) =>
  request<SessionResponse>(`/api/host/classes/${classId}/sessions/`, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const updateSession = (classId: number, sessionId: number, input: SessionPayload) =>
  request<SessionResponse>(`/api/host/classes/${classId}/sessions/${sessionId}/`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

/**
 * Deleting a session that is already gone is treated as success so a stale
 * draft (another tab, a retried save) can still finish saving.
 */
export async function deleteSession(classId: number, sessionId: number): Promise<void> {
  try {
    await request<null>(`/api/host/classes/${classId}/sessions/${sessionId}/`, { method: 'DELETE' });
  } catch (error) {
    if (error instanceof CreateClassApiError && error.status === 404) return;
    throw error;
  }
}

export const savePayout = (bankCode: string, accountNumber: string) =>
  request<HostProfile & { account_name: string }>('/api/host/payout/', {
    method: 'POST',
    body: JSON.stringify({ bank_code: bankCode, account_number: accountNumber }),
  });

export const resolveAccount = (bankCode: string, accountNumber: string) =>
  request<{ account_name: string }>('/api/host/payout/resolve/', {
    method: 'POST',
    body: JSON.stringify({ bank_code: bankCode, account_number: accountNumber }),
  });
