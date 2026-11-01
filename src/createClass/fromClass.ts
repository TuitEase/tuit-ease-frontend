import type { ClassResponse } from './api';
import { dateTimeInZone, isPastSession } from './datetime';
import { createEmptyDraft } from './draft';
import type { Draft, DraftSession } from './types';
import { UNLIMITED_CAPACITY } from './types';

function priceString(raw: string): string {
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value <= 0) return '20000';
  return String(Math.round(value));
}

/**
 * Turns an API class into a wizard draft. Used for duplicate (copy = true:
 * no id, title suffixed, past sessions dropped) and for reopening a draft by
 * `?id=` when sessionStorage is empty.
 */
export function draftFromClass(
  cls: ClassResponse,
  timeZone: string,
  options: { copy?: boolean } = {},
): Draft {
  const copy = Boolean(options.copy);
  const base = createEmptyDraft();
  let nextKey = 1;

  const sessions: DraftSession[] = [];
  for (const session of cls.sessions ?? []) {
    const { date, time } = dateTimeInZone(session.starts_at, timeZone);
    if (!date) continue;
    if (copy && isPastSession(date, time, timeZone)) continue;
    const override = Boolean(session.meeting_link || session.venue);
    const link = session.meeting_link ?? '';
    const venue = session.venue ?? '';
    sessions.push({
      key: `s${nextKey++}`,
      serverId: copy ? undefined : session.id,
      date,
      time,
      duration: String(session.duration_minutes || 120),
      override,
      link,
      venue,
      saved: copy
        ? undefined
        : { date, time, duration: String(session.duration_minutes || 120), link, venue },
    });
  }

  // The class serializer exposes capacity on `seats`; older responses may have
  // it at the top level, so accept either while the backend catches up.
  const capacity = Number(cls.seats?.capacity ?? cls.capacity);
  const paid = Number.parseFloat(cls.price) > 0;

  return {
    ...base,
    classId: copy ? null : cls.id,
    slug: copy ? '' : cls.slug,
    published: copy ? false : cls.is_published,
    title: copy ? `${cls.title} (copy)` : cls.title,
    description: cls.description ?? '',
    mode: cls.mode ?? 'hybrid',
    sessions: sessions.length ? sessions : [base.sessions[0]],
    nextSessionKey: Math.max(nextKey, 2),
    savedSessionIds: copy ? [] : sessions.map((session) => session.serverId).filter((id): id is number => typeof id === 'number'),
    meetingLink: cls.meeting_link ?? '',
    venue: cls.venue ?? '',
    capMode: Number.isFinite(capacity) && capacity > 0 && capacity < UNLIMITED_CAPACITY ? 'limited' : 'unlimited',
    capacity: Number.isFinite(capacity) && capacity > 0 && capacity < UNLIMITED_CAPACITY ? String(capacity) : base.capacity,
    kind: paid ? 'paid' : 'free',
    price: paid ? priceString(cls.price) : base.price,
    groupLink: cls.group_link ?? '',
    installments: Boolean(cls.allow_installments),
    waitlist: Boolean(cls.waitlist_enabled),
    confirmSeat: Boolean(cls.require_seat_confirmation),
  };
}

/** Removes sessions that already passed, keeping at least one row. */
export function dropPastSessions(draft: Draft, timeZone: string): Draft {
  const future = draft.sessions.filter((session) => !isPastSession(session.date, session.time, timeZone));
  return future.length ? { ...draft, sessions: future } : draft;
}
