import { parseAmount } from './format';
import { hasMissingDate } from './sessions';
import type { Draft } from './types';
import { UNLIMITED_CAPACITY } from './types';

export type Errors = Record<string, string>;

const HTTP_URL = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

export function isHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isOnlineMode(draft: Pick<Draft, 'mode'>): boolean {
  return draft.mode === 'online' || draft.mode === 'hybrid';
}

export function isOfflineMode(draft: Pick<Draft, 'mode'>): boolean {
  return draft.mode === 'offline' || draft.mode === 'hybrid';
}

export function validateBasics(draft: Draft): Errors {
  const errors: Errors = {};
  if (!draft.title.trim()) errors.title = 'Please enter a class title.';
  if (draft.title.trim().length > 200) errors.title = 'Keep the title under 200 characters.';
  if (isOnlineMode(draft) && draft.meetingLink.trim() && !isHttpUrl(draft.meetingLink)) {
    errors.meetingLink = 'Enter a meeting link that starts with http:// or https://.';
  }
  return errors;
}

export function validateSchedule(draft: Draft): Errors {
  const errors: Errors = {};
  if (draft.sessions.length === 0) errors.sessions = 'Add at least one session.';
  for (const session of draft.sessions) {
    if (!session.date) errors[`session:${session.key}:date`] = 'Choose a date.';
    if (!session.time) errors[`session:${session.key}:time`] = 'Choose a start time.';
    if (session.override && session.link.trim() && !isHttpUrl(session.link)) {
      errors[`session:${session.key}:link`] = 'Enter a link that starts with http:// or https://.';
    }
  }
  if (isOfflineMode(draft) && !draft.venue.trim()) {
    errors.venue = 'Add a venue so students know where to go.';
  }
  if (isOnlineMode(draft) && draft.meetingLink.trim() && !isHttpUrl(draft.meetingLink)) {
    errors.meetingLink = 'Enter a meeting link that starts with http:// or https://.';
  }
  if (draft.mode === 'hybrid' && !draft.venue.trim()) {
    errors.venue = 'Add a venue for the in-person part of this class.';
  }
  return errors;
}

export function validateSeats(draft: Draft): Errors {
  const errors: Errors = {};
  if (draft.capMode === 'limited') {
    const capacity = Number.parseInt(draft.capacity, 10);
    if (!Number.isFinite(capacity) || capacity < 1) {
      errors.capacity = 'Enter at least 1 seat.';
    } else if (capacity >= UNLIMITED_CAPACITY) {
      errors.capacity = 'Enter a smaller number of seats.';
    }
  }
  if (draft.kind === 'paid' && parseAmount(draft.price) <= 0) {
    errors.price = 'Enter a price greater than ₦0.';
  }
  if (draft.kind === 'free' && draft.groupLink.trim() && !isHttpUrl(draft.groupLink)) {
    errors.groupLink = 'Enter a group link that starts with http:// or https://.';
  }
  return errors;
}

export function validateAccount(bankCode: string, accountNumber: string): Errors {
  const errors: Errors = {};
  if (!bankCode) errors.bank = 'Choose your bank.';
  if (!/^\d{10}$/.test(accountNumber)) errors.account = 'Enter a 10-digit account number.';
  return errors;
}

export function firstError(errors: Errors): string {
  return Object.values(errors)[0] ?? '';
}

export function hasMissingSessions(draft: Draft): boolean {
  return draft.sessions.some(hasMissingDate);
}
