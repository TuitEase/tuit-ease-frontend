import { clearAuthSession, getAuthToken } from '../auth/api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export interface MessageClass {
  id: number;
  title: string;
  status: 'live' | 'ended';
  seats: { booked: number; waitlist: number };
  message_audience: { students: number; waiting_list: number };
}

export interface MessageSummary {
  needs_attention: number;
  sent_today: number;
  daily_limit: number;
  messages_remaining: number;
  sent_percent_30d: number;
  scheduled: number;
  delivery_metric_note: string;
}

export interface CursorPage<T> {
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface MessageIssue {
  id: number;
  class_id: number;
  class_title: string;
  student_id: number;
  student_name: string;
  student_phone: string;
  kind: string;
  occurred_at: string | null;
  state: 'failed' | 'sms_fallback';
  reason_code: string;
  reason_text: string;
  can_retry: boolean;
}

export interface MessageActivity {
  id: number;
  class_id: number;
  class_title: string;
  kind: string;
  kind_label: string;
  recipient_label: string;
  occurred_at: string | null;
  scheduled_for: string;
  delivery_status: 'scheduled' | 'failed' | 'skipped' | 'sent' | 'sms_fallback';
  delivered: number;
  failed: number;
  sms_fallback: number;
}

export interface MessagePreview {
  rendered_text: string;
  send_time_label: string;
}

export interface ReminderPreviews {
  confirmation: MessagePreview | null;
  day_before: MessagePreview | null;
  hour_before: MessagePreview | null;
  sample_student: string | null;
}

export interface AnnouncementPreview {
  rendered_text: string;
  template_name: string;
  in_template: boolean;
  template_approved: boolean;
}

export class MessagesApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = 'MessagesApiError';
  }
}

function messageFrom(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) return 'The request could not be completed.';
  const body = payload as { detail?: unknown; error?: { message?: unknown } };
  if (typeof body.error?.message === 'string') return body.error.message;
  if (typeof body.detail === 'string') return body.detail;
  return 'The request could not be completed.';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');
  if (init?.body) headers.set('Content-Type', 'application/json');
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Token ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new MessagesApiError('Could not connect to TuitEase. Check your connection and try again.');
  }
  if (response.status === 401) {
    clearAuthSession();
    window.location.assign('/signin/');
    throw new MessagesApiError('Your session has expired. Please sign in again.', 401);
  }

  let payload: unknown;
  try {
    payload = response.status === 204 ? null : await response.json();
  } catch {
    throw new MessagesApiError('TuitEase returned an unreadable response.', response.status);
  }
  if (!response.ok) throw new MessagesApiError(messageFrom(payload), response.status);
  return payload as T;
}

function pagePath(next: string | null): string | null {
  if (!next) return null;
  const url = new URL(next, window.location.origin);
  return `${url.pathname}${url.search}`;
}

export async function fetchMessageClasses(): Promise<MessageClass[]> {
  const classes: MessageClass[] = [];
  let path: string | null = '/api/host/classes/?page=1&page_size=50';
  while (path) {
    const page: CursorPage<MessageClass> & { count?: number } = await request(path);
    classes.push(...page.results);
    path = pagePath(page.next);
  }
  return classes;
}

export const fetchMessageSummary = (classId: string) =>
  request<MessageSummary>(`/api/host/messages/summary/?class=${encodeURIComponent(classId)}`);

export const fetchMessageIssues = (classId: string, cursor?: string | null) => {
  const query = new URLSearchParams({ class: classId });
  if (cursor) query.set('cursor', cursor);
  return request<CursorPage<MessageIssue>>(`/api/host/messages/issues/?${query}`);
};

export const fetchMessageActivity = (classId: string, statusFilter: string, cursor?: string | null) => {
  const query = new URLSearchParams({ class: classId, status: statusFilter });
  if (cursor) query.set('cursor', cursor);
  return request<CursorPage<MessageActivity>>(`/api/host/messages/activity/?${query}`);
};

export const fetchReminderPreviews = (classId: number) =>
  request<ReminderPreviews>(`/api/host/messages/previews/?class=${classId}`);

export const fetchAnnouncementPreview = (classId: number, text: string, studentId?: number) => {
  const query = new URLSearchParams({ text });
  if (studentId) query.set('student_id', String(studentId));
  return request<AnnouncementPreview>(`/api/host/classes/${classId}/announcement/preview/?${query}`);
};

export const retryMessage = (messageId: number) =>
  request<{ scheduled: boolean }>(`/api/host/messages/${messageId}/retry/`, { method: 'POST' });

export const handleMessage = (messageId: number) =>
  request<{ handled: boolean }>(`/api/host/messages/${messageId}/handled/`, { method: 'POST' });
