import { addDays } from './format';
import type { Draft, DraftSession, SessionSnapshot } from './types';

export function newSession(key: number, patch: Partial<DraftSession> = {}): DraftSession {
  return {
    key: `s${key}`,
    date: '',
    time: '10:00',
    duration: '120',
    override: false,
    link: '',
    venue: '',
    ...patch,
  };
}

export function emptySession(): DraftSession {
  return newSession(1);
}

export interface SessionList {
  sessions: DraftSession[];
  nextSessionKey: number;
}

export function addSession(list: SessionList): SessionList {
  const last = list.sessions[list.sessions.length - 1];
  const session = newSession(list.nextSessionKey, {
    date: last ? addDays(last.date, 7) : '',
    time: last ? last.time : '10:00',
    duration: last ? last.duration : '120',
  });
  return {
    sessions: [...list.sessions, session],
    nextSessionKey: list.nextSessionKey + 1,
  };
}

export function removeSession(list: SessionList, key: string): SessionList {
  if (list.sessions.length <= 1) return list;
  return { ...list, sessions: list.sessions.filter((session) => session.key !== key) };
}

export function repeatWeekly(list: SessionList): SessionList {
  const base = list.sessions[0];
  if (!base) return list;
  let nextKey = list.nextSessionKey;
  const sessions = Array.from({ length: 4 }, (_, index) =>
    newSession(nextKey++, {
      date: addDays(base.date, index * 7),
      time: base.time,
      duration: base.duration,
    }),
  );
  return { sessions, nextSessionKey: nextKey };
}

export function effectiveVenue(draft: Pick<Draft, 'venue'>, session: DraftSession): string {
  return session.override && session.venue.trim() ? session.venue.trim() : draft.venue.trim();
}

export function effectiveLink(draft: Pick<Draft, 'meetingLink'>, session: DraftSession): string {
  return session.override && session.link.trim() ? session.link.trim() : draft.meetingLink.trim();
}

export function sessionWhereText(
  draft: Draft,
  session: DraftSession,
  options: { online: boolean; offline: boolean },
): string {
  const parts: string[] = [];
  if (options.offline) {
    const venue = effectiveVenue(draft, session);
    parts.push(venue ? `Venue: ${venue}` : 'Venue to be added');
  }
  if (options.online) {
    const link = effectiveLink(draft, session);
    parts.push(link ? `Join online: ${link}` : 'Meeting link to be added');
  }
  return parts.join('\n');
}

export function sessionNote(draft: Draft, session: DraftSession): string {
  if (session.override) return 'This session has its own location.';
  const where = sessionWhereText(draft, session, {
    online: draft.mode !== 'offline',
    offline: draft.mode !== 'online',
  }).replace(/\n/g, ', ');
  return `Location: ${where || 'same as the rest of the class'}`;
}

export function snapshotOf(session: DraftSession): SessionSnapshot {
  return {
    date: session.date,
    time: session.time,
    duration: session.duration,
    link: session.override ? session.link : '',
    venue: session.override ? session.venue : '',
  };
}

export function isSessionChanged(session: DraftSession): boolean {
  if (!session.saved) return false;
  const saved = session.saved;
  const current = snapshotOf(session);
  return (
    saved.date !== current.date ||
    saved.time !== current.time ||
    saved.duration !== current.duration ||
    saved.link !== current.link ||
    saved.venue !== current.venue
  );
}

export function hasMissingDate(session: DraftSession): boolean {
  return !session.date || !session.time;
}

export function anyOverride(sessions: DraftSession[]): boolean {
  return sessions.some((session) => session.override);
}

export function anySessionError(sessions: DraftSession[]): boolean {
  return sessions.some((session) => Boolean(session.error));
}
