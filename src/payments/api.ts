import { authenticatedFetch } from '../auth/api';
import { fetchPayments } from '../classes/api';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export type PaymentRange = 'this_month' | 'last_3_months' | 'all';

export interface PaymentSummary {
  range: PaymentRange;
  timezone: string;
  as_of: string;
  period_start: string | null;
  collected_amount: string;
  successful_payment_count: number;
  unique_student_count: number;
  paid_on_time_percent: number | null;
  paid_on_time_numerator: string;
  paid_on_time_denominator: string;
  still_to_come_amount: string;
  overdue_amount: string;
  overdue_booking_count: number;
}

export interface MonthlyCollection {
  month: string;
  amount: string;
  payment_count: number;
}

export interface RankedClass {
  class_id: number;
  class_name: string;
  price: string;
  collected_amount: string;
  payment_count: number;
  student_count: number;
  outstanding_amount: string;
  ended: boolean;
}

export interface OverduePayment {
  installment_id: number;
  booking_id: number;
  class_id: number;
  class_name: string;
  student_name: string;
  amount: string;
  due_date: string;
  days_overdue: number;
  last_reminded_on: string | null;
}

export interface Page<T> {
  count: number;
  next: number | null;
  previous: number | null;
  results: T[];
}

export interface ReminderPreview {
  eligible_count: number;
  overdue_count: number;
  opted_out_count: number;
  send_allowed: boolean;
  template_name: string | null;
  disabled_reason: string | null;
  samples: Array<{ student_name: string; class_name: string; message: string | null }>;
}

export interface ReminderQueueResult {
  queued: number;
  skipped: number;
}

export type PaymentExportType = 'received' | 'overdue';

export class PaymentsApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'PaymentsApiError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    const headers = new Headers(init?.headers);
    headers.set('Accept', 'application/json');
    if (init?.body) headers.set('Content-Type', 'application/json');
    response = await authenticatedFetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new PaymentsApiError('Could not connect. Check your connection and try again.', 0);
  }

  if (response.status === 401) {
    window.location.assign('/signin/');
    throw new PaymentsApiError('Your session has expired. Please sign in again.', 401);
  }

  let payload: unknown;
  try {
    payload = response.status === 204 ? null : await response.json();
  } catch {
    throw new PaymentsApiError('TuitEase returned an unreadable response.', response.status);
  }
  if (!response.ok) {
    const body = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
    const error = body.error && typeof body.error === 'object' ? body.error as Record<string, unknown> : {};
    const message = typeof error.message === 'string'
      ? error.message
      : typeof body.detail === 'string'
        ? body.detail
        : 'The request could not be completed. Please try again.';
    throw new PaymentsApiError(message, response.status);
  }
  return payload as T;
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  return search.toString();
}

function dateInTimezone(value: string, timeZone: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
  return `${values.year}-${values.month}-${values.day}`;
}

function rangeStart(range: PaymentRange, timeZone: string): string | null {
  if (range === 'all') return null;
  const today = dateInTimezone(new Date().toISOString(), timeZone);
  if (!today) return null;
  const [year, month] = today.split('-').map(Number);
  const monthIndex = year * 12 + month - 1 - (range === 'this_month' ? 0 : 2);
  return `${Math.floor(monthIndex / 12).toString().padStart(4, '0')}-${(monthIndex % 12 + 1).toString().padStart(2, '0')}-01`;
}

function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  const safe = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Array<string | number | null>>): boolean {
  if (rows.length <= 1) return false;
  const content = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  const file = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return true;
}

export function fetchPaymentSummary(range: PaymentRange): Promise<PaymentSummary> {
  return request(`/api/host/payments/report/summary/?${query({ range })}`);
}

export function fetchMonthlyCollections(): Promise<{ timezone: string; results: MonthlyCollection[] }> {
  return request('/api/host/payments/report/monthly/');
}

export function fetchClassRanking(range: PaymentRange): Promise<{ range: PaymentRange; results: RankedClass[] }> {
  return request(`/api/host/payments/report/classes/?${query({ range })}`);
}

export function fetchOverdue(params: {
  classId?: number;
  page?: number;
}): Promise<Page<OverduePayment>> {
  return request(`/api/host/payments/report/overdue/?${query({
    class_id: params.classId,
    page: params.page ?? 1,
  })}`);
}

export function fetchReminderPreview(classId?: number): Promise<ReminderPreview> {
  return request(`/api/host/payments/report/reminders/preview/?${query({ class_id: classId })}`);
}

export function queueOverdueReminders(classId?: number): Promise<ReminderQueueResult> {
  return request(`/api/host/payments/report/reminders/send/?${query({ class_id: classId })}`, {
    method: 'POST',
  });
}

export async function downloadPaymentCsv(
  type: PaymentExportType,
  range: PaymentRange,
  classId?: number,
  timeZone = 'Africa/Lagos',
): Promise<boolean> {
  if (type === 'received') {
    const paymentPage = await fetchPayments();
    if (paymentPage.truncated) {
      throw new PaymentsApiError('There are more than 2,000 payment records. No partial CSV was downloaded.', 400);
    }
    const start = rangeStart(range, timeZone);
    const rows: Array<Array<string | number | null>> = [[
      'Class',
      'Student',
      'Amount (NGN)',
      'Status',
      'Method',
      'Date',
      'Reference',
    ]];
    const today = dateInTimezone(new Date().toISOString(), timeZone);
    for (const payment of paymentPage.items) {
      if (payment.status !== 'success' || !payment.paid_at || (classId !== undefined && payment.class_id !== classId)) {
        continue;
      }
      const paidDate = dateInTimezone(payment.paid_at, timeZone);
      if (!paidDate || (start && paidDate < start) || (today && paidDate > today)) continue;
      rows.push([
        payment.class_name,
        payment.student_name,
        payment.amount,
        'Received',
        payment.method === 'paystack' ? 'Paystack' : 'Cash or transfer',
        paidDate,
        payment.reference,
      ]);
    }
    return downloadCsv('payments-received.csv', rows);
  }

  const start = rangeStart(range, timeZone);
  const rows: Array<Array<string | number | null>> = [[
    'Class',
    'Student',
    'Amount (NGN)',
    'Status',
    'Method',
    'Date',
    'Reference',
  ]];
  let page = 1;
  let next: number | null = page;
  while (next !== null) {
    const overduePage = await fetchOverdue({ classId, page: next });
    for (const overdue of overduePage.results) {
      if (start && overdue.due_date < start) continue;
      rows.push([
        overdue.class_name,
        overdue.student_name,
        overdue.amount,
        'Overdue',
        '',
        overdue.due_date,
        `${overdue.booking_id}-${overdue.installment_id}`,
      ]);
    }
    next = overduePage.next;
    page += 1;
    if (page > 1000 && next !== null) {
      throw new PaymentsApiError('There are too many overdue records to export at once.', 400);
    }
  }
  return downloadCsv('payments-overdue.csv', rows);
}
