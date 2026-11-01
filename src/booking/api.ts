/**
 * Public booking API.
 *
 * Everything here is unauthenticated: the student opens a shared link and books
 * without an account. The module never reads a token, never logs a payload and
 * never computes a charge — the server decides how much to collect from the
 * class and the chosen plan.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export const PUBLIC_OFFLINE_MESSAGE = 'Something went wrong. Check your connection and try again.';

export class BookingApiError extends Error {
  status: number | null;
  code: string;
  fields: Record<string, string>;
  offline: boolean;

  constructor(
    message: string,
    options: { status?: number | null; code?: string; fields?: Record<string, string>; offline?: boolean } = {},
  ) {
    super(message);
    this.name = 'BookingApiError';
    this.status = options.status ?? null;
    this.code = options.code ?? 'request_failed';
    this.fields = options.fields ?? {};
    this.offline = options.offline ?? false;
  }
}

function firstString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.trim()) return item.trim();
    }
  }
  return null;
}

function parseFields(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const fields: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    const message = firstString(raw);
    if (message) fields[key] = message;
  }
  return fields;
}

function parseErrorPayload(payload: unknown, status: number): BookingApiError {
  const body = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {};
  const error = body.error && typeof body.error === 'object' && !Array.isArray(body.error)
    ? (body.error as Record<string, unknown>)
    : null;

  if (error) {
    const fields = parseFields(error.fields);
    const message =
      firstString(error.message) ??
      firstString(body.detail) ??
      firstString(error.code) ??
      'Something went wrong. Please try again.';
    return new BookingApiError(message, {
      status,
      code: firstString(error.code) ?? 'request_failed',
      fields,
    });
  }

  const fields = parseFields(body);
  const message = firstString(body.detail) ?? firstString(body.message) ?? Object.values(fields)[0];
  return new BookingApiError(message ?? 'Something went wrong. Please try again.', {
    status,
    fields,
  });
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body) headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers, credentials: 'omit' });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new BookingApiError(PUBLIC_OFFLINE_MESSAGE, { code: 'offline', offline: true });
  }

  let payload: unknown = null;
  try {
    payload = response.status === 204 ? null : await response.json();
  } catch {
    if (!response.ok) {
      throw new BookingApiError('TuitEase returned an unreadable response. Please try again.', {
        status: response.status,
      });
    }
  }

  if (!response.ok) throw parseErrorPayload(payload, response.status);
  return payload as T;
}

/* ------------------------------------------------------------------ types */

export type ClassMode = 'online' | 'offline' | 'hybrid';
export type PublicClassStatusCode = 'open' | 'full' | 'ended';

export interface PublicSession {
  id: number;
  number: number;
  starts_at: string;
  duration_minutes?: number;
  /** Present only if the backend starts returning one. Never shown before booking. */
  ends_at?: string | null;
  venue?: string | null;
  /** Private: sent so the calendar can include it after booking. Never rendered before. */
  meeting_link?: string | null;
  place_label?: string;
  differs_from_default?: boolean;
}

export interface PublicHostObject {
  name?: string;
  business_name?: string;
  first_name?: string;
  bio?: string | null;
}

export interface PublicInstallment {
  number: number;
  amount: string | number;
  due_at?: string | null;
  /** The existing booking-status endpoint calls this `due_date`. */
  due_date?: string | null;
}

export interface PublicCover {
  c1?: string;
  c2?: string;
  image_url?: string | null;
}

/**
 * The documented public class shape, plus optional fields this page can light
 * up when the backend grows them. Every optional field has a graceful fallback
 * so the page keeps working against today's payload (`_public_class_payload`).
 */
export interface PublicClass {
  slug: string;
  title: string;
  description: string;
  mode: ClassMode;
  status?: PublicClassStatusCode;
  host: string | PublicHostObject;
  price: string | number;
  currency: string;
  allow_installments: boolean;
  installment_count: number;
  installments?: PublicInstallment[];
  capacity?: number | null;
  booked?: number | null;
  seats_left?: number | null;
  waitlist_enabled: boolean;
  confirm_seat_enabled?: boolean;
  has_group_link?: boolean;
  group_link?: string | null;
  sessions: PublicSession[];
  venue?: string;
  timezone?: string;
  cover?: PublicCover | null;
  tags?: string[];
  level?: string | null;
}

export type BookingPlan = 'full' | 'installments';

export interface CreateBookingInput {
  name: string;
  phone: string;
  email: string | null;
  plan: BookingPlan;
}

export interface CreateBookingResponse {
  booking: string;
  status: 'pending_payment' | 'active' | 'waitlisted' | 'cancelled' | string;
  authorization_url?: string;
  payment_error?: string;
  /** Optional fields from the proposed richer contract. */
  amount_due_now?: string | number;
  reference?: string;
  group_link?: string | null;
  calendar_url?: string;
  position?: number;
}

export interface BookingStatusInstallment {
  number: number;
  amount: string | number;
  due_date: string;
  status: 'pending' | 'paid' | string;
}

export interface BookingStatus {
  class: string;
  status: 'pending_payment' | 'active' | 'waitlisted' | 'cancelled' | string;
  amount_due: string | number;
  amount_paid: string | number;
  balance: string | number;
  payment_state: 'paid' | 'part_paid' | 'unpaid' | string;
  installments: BookingStatusInstallment[];
  /** Optional fields from the proposed richer contract. */
  group_link?: string | null;
  calendar_url?: string;
  amount_paid_total?: string | number;
  next_due?: { amount: string | number; due_at: string } | null;
  position?: number;
}

/* -------------------------------------------------------------- requests */

export function fetchPublicClass(slug: string, signal?: AbortSignal): Promise<PublicClass> {
  return request<PublicClass>(`/api/public/classes/${encodeURIComponent(slug)}/`, { signal });
}

export function createPublicBooking(
  slug: string,
  input: CreateBookingInput,
  signal?: AbortSignal,
): Promise<CreateBookingResponse> {
  return request<CreateBookingResponse>(`/api/public/classes/${encodeURIComponent(slug)}/book/`, {
    method: 'POST',
    // `use_installments` is what the endpoint accepts today; `plan` is sent
    // alongside it so the server can move to the documented contract without a
    // coordinated frontend release.
    body: JSON.stringify({
      name: input.name,
      phone: input.phone,
      email: input.email,
      plan: input.plan,
      use_installments: input.plan === 'installments',
    }),
    signal,
  });
}

export function fetchBookingStatus(reference: string, signal?: AbortSignal): Promise<BookingStatus> {
  return request<BookingStatus>(`/api/public/bookings/${encodeURIComponent(reference)}/`, { signal });
}

export function verifyPayment(reference: string, signal?: AbortSignal): Promise<{ status: string }> {
  return request<{ status: string }>(
    `/api/public/payments/verify/?reference=${encodeURIComponent(reference)}`,
    { signal },
  );
}

export function retryPayment(reference: string, signal?: AbortSignal): Promise<{ authorization_url: string }> {
  return request<{ authorization_url: string }>(
    `/api/public/bookings/${encodeURIComponent(reference)}/pay/`,
    { method: 'POST', signal },
  );
}

export function bookingCalendarUrl(reference: string): string {
  return `${API_BASE_URL}/api/public/bookings/${encodeURIComponent(reference)}/calendar.ics`;
}
