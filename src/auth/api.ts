export interface HostProfile {
  id?: number;
  business_name: string;
  email: string;
  whatsapp_number?: string;
  host_type?: string;
  timezone?: string;
  summary_hour?: number;
  daily_summary_enabled?: boolean;
  reminder_overrides?: Record<string, unknown>;
  payout_bank_code?: string;
  payout_account_last4?: string;
  needs_onboarding: boolean;
  payout_ready: boolean;
}

export interface HostPreferences {
  timezone: string;
  summary_hour: number;
  daily_summary_enabled: boolean;
}

export interface Bank {
  name: string;
  code: string;
}

export interface AuthResponse {
  token: string;
  host: HostProfile;
  created?: boolean;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  whatsapp_number: string;
  accepted_terms: true;
}

export interface SigninData {
  email: string;
  password: string;
}

export type AuthField = 'name' | 'email' | 'password' | 'whatsapp_number' | 'accepted_terms';
export type AuthFieldErrors = Partial<Record<AuthField, string>>;

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
const TOKEN_STORAGE_KEY = 'tuitease.auth.token';

export class AuthApiError extends Error {
  readonly fieldErrors: AuthFieldErrors;

  constructor(message: string, fieldErrors: AuthFieldErrors = {}) {
    super(message);
    this.name = 'AuthApiError';
    this.fieldErrors = fieldErrors;
  }
}

function messagesFrom(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isHostProfile(value: unknown): value is HostProfile {
  return (
    isRecord(value) &&
    typeof value.business_name === 'string' &&
    typeof value.email === 'string' &&
    typeof value.needs_onboarding === 'boolean' &&
    typeof value.payout_ready === 'boolean'
  );
}

async function authenticatedJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await authenticatedFetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...Object.fromEntries(new Headers(init.headers).entries()),
      },
    });
  } catch {
    throw new AuthApiError('Could not connect to TuitEase. Check your connection and try again.');
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new AuthApiError('TuitEase returned an unreadable response. Please try again.');
  }
  if (!response.ok) {
    const body = isRecord(data) ? data : {};
    const detail =
      messagesFrom(body.detail)[0] ??
      Object.entries(body)
        .filter(([field]) => field !== 'detail')
        .flatMap(([, value]) => messagesFrom(value))[0];
    throw new AuthApiError(detail ?? 'Your request could not be completed. Please try again.');
  }
  return data as T;
}

async function submitAuth<TPayload extends SignupData | SigninData>(
  endpoint: 'register' | 'login',
  payload: TPayload,
): Promise<AuthResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/${endpoint}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AuthApiError('Could not connect to TuitEase. Check your connection and try again.');
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new AuthApiError('TuitEase returned an unreadable response. Please try again.');
  }

  if (!response.ok) {
    const responseBody = isRecord(data) ? data : {};
    const fields: AuthFieldErrors = {};
    for (const field of ['name', 'email', 'password', 'whatsapp_number', 'accepted_terms'] as const) {
      const messages = messagesFrom(responseBody[field]);
      if (messages.length > 0) fields[field] = messages.join(' ');
    }
    const detail = messagesFrom(responseBody.detail)[0];
    throw new AuthApiError(detail ?? 'Please check your details and try again.', fields);
  }

  const result = isRecord(data) ? data : {};
  if (typeof result.token !== 'string' || result.token.length === 0 || !isHostProfile(result.host)) {
    throw new AuthApiError('TuitEase returned an incomplete sign-in response. Please try again.');
  }
  return { token: result.token, host: result.host };
}

export function registerHost(payload: SignupData): Promise<AuthResponse> {
  return submitAuth('register', payload);
}

export function signInHost(payload: SigninData): Promise<AuthResponse> {
  return submitAuth('login', payload);
}

async function submitPasswordReset<T>(endpoint: 'request' | 'confirm', payload: Record<string, string>): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/password-reset/${endpoint}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AuthApiError('Could not connect to TuitEase. Check your connection and try again.');
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new AuthApiError('TuitEase returned an unreadable response. Please try again.');
  }

  if (!response.ok) {
    const body = isRecord(data) ? data : {};
    const detail = messagesFrom(body.detail)[0] ?? messagesFrom(body.password)[0];
    throw new AuthApiError(detail ?? 'Your password reset could not be completed. Please try again.');
  }
  if (!isRecord(data) || typeof data.detail !== 'string') {
    throw new AuthApiError('TuitEase returned an incomplete password-reset response. Please try again.');
  }
  return data as T;
}

export function requestPasswordReset(email: string): Promise<{ detail: string }> {
  return submitPasswordReset('request', { email });
}

export function confirmPasswordReset(email: string, code: string, password: string): Promise<{ detail: string }> {
  return submitPasswordReset('confirm', { email, code, password });
}

export async function signInWithGoogle(idToken: string): Promise<AuthResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/google/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id_token: idToken }),
    });
  } catch {
    throw new AuthApiError('Could not connect to TuitEase. Check your connection and try again.');
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new AuthApiError('TuitEase returned an unreadable response. Please try again.');
  }

  if (!response.ok) {
    const body = isRecord(data) ? data : {};
    const detail = messagesFrom(body.detail)[0];
    throw new AuthApiError(detail ?? 'Google sign-in could not be completed. Please try again.');
  }

  const result = isRecord(data) ? data : {};
  if (
    typeof result.token !== 'string' ||
    result.token.length === 0 ||
    !isHostProfile(result.host) ||
    (result.created !== undefined && typeof result.created !== 'boolean')
  ) {
    throw new AuthApiError('TuitEase returned an incomplete Google sign-in response. Please try again.');
  }
  return {
    token: result.token,
    host: result.host,
    ...(typeof result.created === 'boolean' ? { created: result.created } : {}),
  };
}

export function saveAuthSession(auth: AuthResponse): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, auth.token);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    throw new AuthApiError('Your browser could not save this session. Enable browser storage and try again.');
  }
}

export function getAuthToken(): string | null {
  const sharedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (sharedToken) return sharedToken;

  const legacyToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
  if (!legacyToken) return null;

  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, legacyToken);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    return legacyToken;
  }
  return legacyToken;
}

export function clearAuthSession(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function isAuthTokenStorageEvent(event: StorageEvent): boolean {
  return event.key === TOKEN_STORAGE_KEY || event.key === null;
}

export function getAuthenticatedHeaders(headers: HeadersInit = {}): Headers {
  const requestHeaders = new Headers(headers);
  const token = getAuthToken();
  if (token) requestHeaders.set('Authorization', `Token ${token}`);
  return requestHeaders;
}

export function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return fetch(input, { ...init, headers: getAuthenticatedHeaders(init.headers) });
}

export async function fetchHostProfile(): Promise<HostProfile> {
  const host = await authenticatedJson<unknown>('/api/host/me/');
  if (!isHostProfile(host)) {
    throw new AuthApiError('TuitEase returned an incomplete host profile. Please try again.');
  }
  return host;
}

export async function updateHostProfile(values: Partial<HostProfile>): Promise<HostProfile> {
  const host = await authenticatedJson<unknown>('/api/host/me/', {
    method: 'PATCH',
    body: JSON.stringify(values),
  });
  if (!isHostProfile(host)) {
    throw new AuthApiError('TuitEase returned an incomplete host profile. Please try again.');
  }
  return host;
}

export async function completeHostOnboarding(values: {
  business_name: string;
  host_type: string;
  whatsapp_number: string;
}): Promise<HostProfile> {
  const host = await authenticatedJson<unknown>('/api/host/onboarding/', {
    method: 'POST',
    body: JSON.stringify(values),
  });
  if (!isHostProfile(host)) {
    throw new AuthApiError('TuitEase returned an incomplete host profile. Please try again.');
  }
  return host;
}

export async function fetchPayoutBanks(): Promise<Bank[]> {
  const result = await authenticatedJson<unknown>('/api/host/payout/banks/');
  if (!isRecord(result) || !Array.isArray(result.banks)) {
    throw new AuthApiError('TuitEase returned an invalid bank list. Please try again.');
  }
  return result.banks.filter(
    (bank): bank is Bank =>
      isRecord(bank) && typeof bank.name === 'string' && typeof bank.code === 'string',
  );
}

export async function resolveAccountName(bank_code: string, account_number: string): Promise<string> {
  const result = await authenticatedJson<unknown>('/api/host/payout/resolve/', {
    method: 'POST',
    body: JSON.stringify({ bank_code, account_number }),
  });
  if (!isRecord(result) || typeof result.account_name !== 'string' || result.account_name.trim() === '') {
    throw new AuthApiError('We could not confirm the account holder name. Please check the bank details and try again.');
  }
  return result.account_name.trim();
}

export async function setupHostPayout(bank_code: string, account_number: string): Promise<HostProfile> {
  const host = await authenticatedJson<unknown>('/api/host/payout/', {
    method: 'POST',
    body: JSON.stringify({ bank_code, account_number }),
  });
  if (!isHostProfile(host)) {
    throw new AuthApiError('TuitEase returned an incomplete payout status. Please try again.');
  }
  return host;
}
