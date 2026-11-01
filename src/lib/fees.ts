/**
 * Fee numbers come from the backend, nowhere else.
 *
 * `GET /api/host/fee-preview/?amount=` runs `payments/fees.py::breakdown` with
 * `settings.PLATFORM_FEE_PERCENT`, so the browser never owns the TuitEase rate
 * or the Paystack formula. Every price breakdown in the app (create-class
 * wizard, class detail, payments) goes through `fetchFeePreview`, so the same
 * price always shows the same numbers.
 *
 * The endpoint speaks snake_case and a percentage (`"3.5"`); `FeeBreakdown` is
 * the camelCase, fraction-shaped view the screens render (`0.035` → `"3.5%"`).
 */
import { clearAuthSession, getAuthToken } from '../auth/api';
import { toNaira, type MoneyInput } from './money';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

export const FEE_PREVIEW_PATH = '/api/host/fee-preview/';
export const PUBLIC_PRICING_PATH = '/api/public/pricing/';

export interface FeeBreakdown {
  /** What the student pays, in naira. */
  studentPays: number;
  /** Paystack's cut, in naira. */
  paystackFee: number;
  /** TuitEase's cut, in naira. */
  platformFee: number;
  /** What lands with the host, in naira. */
  hostReceives: number;
  /** Platform rate as a fraction: 0.035 means 3.5%. */
  platformPercent: number;
}

interface FeePreviewPayload {
  student_pays?: string;
  platform_fee?: string;
  processing_fee?: string;
  host_receives?: string;
  platform_percent?: string;
}

/** Public pricing payload from `/api/public/pricing/`. */
export interface PublicPricing {
  currency: string;
  /** Platform rate as a fraction: 0.04 means 4%. */
  platformPercent: number;
  /** Worked examples, ready to render as a table. */
  examples: FeeBreakdown[];
}

interface PublicPricingPayload {
  currency?: string;
  platform_percent?: string;
  examples?: FeePreviewPayload[];
}

export class FeePreviewError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'FeePreviewError';
    this.status = status;
  }
}

/** The API returns the rate as a percentage ("3.5"); labels take a fraction (0.035). */
export function percentToFraction(value: string | number | null | undefined): number {
  const percent = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));
  return Number.isFinite(percent) ? percent / 100 : 0;
}

export function feePercentLabel(platformPercent: number): string {
  return `${Number((platformPercent * 100).toFixed(2))}%`;
}

export function toFeeBreakdown(payload: FeePreviewPayload): FeeBreakdown {
  return {
    studentPays: toNaira(payload.student_pays),
    paystackFee: toNaira(payload.processing_fee),
    platformFee: toNaira(payload.platform_fee),
    hostReceives: toNaira(payload.host_receives),
    platformPercent: percentToFraction(payload.platform_percent),
  };
}

function errorMessage(body: unknown): string {
  if (body && typeof body === 'object') {
    const record = body as Record<string, unknown>;
    const error = record.error;
    if (error && typeof error === 'object') {
      const message = (error as Record<string, unknown>).message;
      if (typeof message === 'string' && message) return message;
    }
    if (typeof record.detail === 'string' && record.detail) return record.detail;
  }
  return 'Could not work out the fees for that price. Please try again.';
}

/**
 * Ask the backend what a payment of `amount` (naira) leaves the host.
 * Abortable so a fast typist only sees the answer for the price they stopped on.
 *
 * Pass `classId` for a class that already exists. The backend then answers with
 * that class's frozen rate instead of today's rate, so a class published months
 * ago still previews the numbers its students will actually pay.
 */
export async function fetchFeePreview(
  amount: MoneyInput,
  signal?: AbortSignal,
  classId?: number | null,
): Promise<FeeBreakdown> {
  const naira = toNaira(amount);
  if (naira <= 0) {
    throw new FeePreviewError('Enter a price to see what you receive.');
  }

  const headers = new Headers({ Accept: 'application/json' });
  const token = getAuthToken();
  if (token) headers.set('Authorization', `Token ${token}`);

  const query = new URLSearchParams({ amount: naira.toFixed(2) });
  if (classId && classId > 0) query.set('class_id', String(classId));
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${FEE_PREVIEW_PATH}?${query.toString()}`, { headers, signal });
  } catch (caught) {
    if (signal?.aborted) throw caught;
    throw new FeePreviewError('Could not reach TuitEase to work out the fees. Check your connection.');
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.status === 401) {
    clearAuthSession();
    throw new FeePreviewError('Your session has expired. Sign in again to see fees.', 401);
  }
  if (!response.ok) {
    throw new FeePreviewError(errorMessage(body), response.status);
  }

  const payload = body as FeePreviewPayload | null;
  if (!payload || payload.student_pays === undefined) {
    throw new FeePreviewError('TuitEase returned an unreadable fee preview. Please try again.', response.status);
  }
  return toFeeBreakdown(payload);
}

/**
 * The public fee rate plus worked examples for the marketing and pricing pages.
 * No token is needed; the backend serves this to signed-out visitors too.
 */
export async function fetchPublicPricing(signal?: AbortSignal): Promise<PublicPricing> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${PUBLIC_PRICING_PATH}`, {
      headers: { Accept: 'application/json' },
      signal,
    });
  } catch (caught) {
    if (signal?.aborted) throw caught;
    throw new FeePreviewError('Could not reach TuitEase for the current prices. Check your connection.');
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new FeePreviewError(errorMessage(body), response.status);
  }

  const payload = body as PublicPricingPayload | null;
  const examples = Array.isArray(payload?.examples)
    ? payload.examples
        .filter((example) => example && example.student_pays !== undefined)
        .map((example) => toFeeBreakdown(example))
    : [];

  if (!payload || payload.platform_percent === undefined || examples.length === 0) {
    throw new FeePreviewError('TuitEase returned unreadable pricing. Please try again.', response.status);
  }

  return {
    currency: payload.currency || 'NGN',
    platformPercent: percentToFraction(payload.platform_percent),
    examples,
  };
}
