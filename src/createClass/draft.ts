import { useSyncExternalStore } from 'react';
import { newSession } from './sessions';
import type { CapMode, Draft, DraftSession, Kind, Mode, SessionSnapshot } from './types';

const DRAFT_KEY = 'tuitease.create-class.draft.v2';
const LEGACY_KEY = 'tuitease.create-class.draft';

function now(): number {
  return Date.now();
}

export function createEmptyDraft(): Draft {
  return {
    version: 2,
    classId: null,
    slug: '',
    published: false,
    title: '',
    description: '',
    mode: 'hybrid',
    sessions: [newSession(1)],
    nextSessionKey: 2,
    savedSessionIds: [],
    meetingLink: '',
    venue: '',
    capMode: 'unlimited',
    capacity: '30',
    kind: 'free',
    price: '20000',
    groupLink: '',
    installments: false,
    waitlist: true,
    confirmSeat: true,
    updatedAt: now(),
  };
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asMode(value: unknown): Mode {
  return value === 'online' || value === 'offline' || value === 'hybrid' ? value : 'hybrid';
}

function asCapMode(value: unknown): CapMode {
  return value === 'limited' ? 'limited' : 'unlimited';
}

function asKind(value: unknown): Kind {
  return value === 'paid' ? 'paid' : 'free';
}

function snapshot(value: unknown): SessionSnapshot | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const record = value as Record<string, unknown>;
  return {
    date: asString(record.date),
    time: asString(record.time),
    duration: asString(record.duration, '120'),
    link: asString(record.link),
    venue: asString(record.venue),
  };
}

function normalizeSession(value: unknown, index: number): DraftSession {
  const record = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const serverId = Number(record.serverId);
  return {
    key: asString(record.key, `s${index + 1}`) || `s${index + 1}`,
    serverId: Number.isFinite(serverId) && serverId > 0 ? serverId : undefined,
    date: asString(record.date),
    time: asString(record.time, '10:00'),
    duration: asString(record.duration, asString(record.dur, '120')),
    override: Boolean(record.override),
    link: asString(record.link),
    venue: asString(record.venue),
    saved: snapshot(record.saved),
    error: asString(record.error) || undefined,
  };
}

export function normalizeDraft(input: unknown): Draft {
  const base = createEmptyDraft();
  if (typeof input !== 'object' || input === null) return base;
  const record = input as Record<string, unknown>;

  const rawSessions = Array.isArray(record.sessions) ? record.sessions : [];
  const sessions = rawSessions.map(normalizeSession);
  const uniqueKeys = new Set<string>();
  sessions.forEach((session, index) => {
    if (uniqueKeys.has(session.key)) session.key = `s${index + 1}-${index}`;
    uniqueKeys.add(session.key);
  });

  const maxKey = sessions.reduce((max, session) => {
    const numeric = Number.parseInt(session.key.replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max;
  }, 0);
  const nextSessionKey = Math.max(
    Number.isFinite(Number(record.nextSessionKey)) ? Number(record.nextSessionKey) : base.nextSessionKey,
    maxKey + 1,
  );

  const classId = Number(record.classId);
  const savedSessionIds = Array.isArray(record.savedSessionIds)
    ? record.savedSessionIds.map(Number).filter((id) => Number.isFinite(id) && id > 0)
    : sessions.map((session) => session.serverId).filter((id): id is number => typeof id === 'number');

  return {
    version: 2,
    classId: Number.isFinite(classId) && classId > 0 ? classId : null,
    slug: asString(record.slug, asString(record.classSlug)),
    published: Boolean(record.published ?? record.done),
    title: asString(record.title),
    description: asString(record.description),
    mode: asMode(record.mode),
    sessions: sessions.length ? sessions : base.sessions,
    nextSessionKey,
    savedSessionIds,
    meetingLink: asString(record.meetingLink),
    venue: asString(record.venue),
    capMode: asCapMode(record.capMode),
    capacity: asString(record.capacity, base.capacity),
    kind: asKind(record.kind),
    price: asString(record.price, base.price),
    groupLink: asString(record.groupLink),
    installments: Boolean(record.installments ?? record.instalments),
    waitlist: record.waitlist === undefined ? base.waitlist : Boolean(record.waitlist),
    confirmSeat: record.confirmSeat === undefined ? base.confirmSeat : Boolean(record.confirmSeat),
    updatedAt: Number.isFinite(Number(record.updatedAt)) ? Number(record.updatedAt) : now(),
  };
}

function readStorage(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function read(): Draft {
  const current = readStorage(DRAFT_KEY);
  if (current) {
    try {
      return normalizeDraft(JSON.parse(current));
    } catch {
      return createEmptyDraft();
    }
  }
  const legacy = readStorage(LEGACY_KEY);
  if (legacy) {
    try {
      const migrated = normalizeDraft(JSON.parse(legacy));
      write(migrated);
      return migrated;
    } catch {
      return createEmptyDraft();
    }
  }
  return createEmptyDraft();
}

function write(draft: Draft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore quota/private mode */
  }
}

let cache: Draft = read();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function getDraft(): Draft {
  return cache;
}

export function setDraft(updater: (current: Draft) => Draft): Draft {
  const next = normalizeDraft(updater(cache));
  next.updatedAt = now();
  cache = next;
  write(next);
  emit();
  return next;
}

export function patchDraft(patch: Partial<Draft>): Draft {
  return setDraft((current) => ({ ...current, ...patch }));
}

export function replaceDraft(next: Draft): Draft {
  cache = normalizeDraft(next);
  cache.updatedAt = now();
  write(cache);
  emit();
  return cache;
}

export function resetDraft(): Draft {
  const next = createEmptyDraft();
  cache = next;
  try {
    sessionStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
  emit();
  return next;
}

export function patchSession(key: string, patch: Partial<DraftSession>): Draft {
  return setDraft((current) => ({
    ...current,
    sessions: current.sessions.map((session) => (session.key === key ? { ...session, ...patch } : session)),
  }));
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useDraft(): Draft {
  return useSyncExternalStore(subscribe, getDraft, getDraft);
}
