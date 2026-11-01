import { amountForApi } from './format';
import type { ClassPayload, SessionPayload } from './api';
import type { Draft } from './types';
import { UNLIMITED_CAPACITY } from './types';

export function capacityForApi(draft: Draft): number {
  if (draft.capMode !== 'limited') return UNLIMITED_CAPACITY;
  const parsed = Number.parseInt(draft.capacity, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : UNLIMITED_CAPACITY;
}

/** Whole-class price, flags, and the design's fixed 2-part plan. */
export function classPayload(draft: Draft): ClassPayload {
  const paid = draft.kind === 'paid';
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    mode: draft.mode,
    meeting_link: draft.mode === 'offline' ? '' : draft.meetingLink.trim(),
    venue: draft.mode === 'online' ? '' : draft.venue.trim(),
    group_link: draft.groupLink.trim(),
    capacity: capacityForApi(draft),
    price: paid ? amountForApi(draft.price) : '0',
    is_published: draft.published,
    waitlist_enabled: draft.waitlist,
    allow_installments: paid && draft.installments,
    installment_count: paid && draft.installments ? 2 : 1,
    require_seat_confirmation: draft.confirmSeat,
  };
}

/**
 * Session rows store only their own overrides. Class-level values are the
 * fallback, resolved in the UI, so class edits keep applying to sessions that
 * did not opt out.
 */
export function sessionPayload(startsAt: string, durationMinutes: number): SessionPayload {
  return { starts_at: startsAt, duration_minutes: durationMinutes };
}

/** Per-session override values, only sent when the host set them. */
export function overridePayload(
  session: { override: boolean; link: string; venue: string },
  online: boolean,
  offline: boolean,
): SessionPayload | Record<string, string> {
  if (!session.override) return {};
  return {
    ...(online ? { meeting_link: session.link.trim() } : {}),
    ...(offline ? { venue: session.venue.trim() } : {}),
  };
}

/**
 * Full session values for PATCH. Unlike create, an update must send empty
 * strings once an override is switched off, otherwise the old link or venue
 * would stay on the session.
 */
export function sessionUpdatePayload(
  startsAt: string,
  durationMinutes: number,
  session: { override: boolean; link: string; venue: string },
  online: boolean,
  offline: boolean,
): SessionPayload {
  return {
    ...sessionPayload(startsAt, durationMinutes),
    ...(online ? { meeting_link: session.override ? session.link.trim() : '' } : {}),
    ...(offline ? { venue: session.override ? session.venue.trim() : '' } : {}),
  };
}
