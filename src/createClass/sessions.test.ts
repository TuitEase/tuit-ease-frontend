import { describe, expect, it } from 'vitest';
import { addDays } from './format';
import {
  addSession,
  effectiveLink,
  effectiveVenue,
  isSessionChanged,
  newSession,
  removeSession,
  repeatWeekly,
  sessionNote,
  sessionWhereText,
  snapshotOf,
  type SessionList,
} from './sessions';
import type { Draft } from './types';

function draft(overrides: Partial<Draft> = {}): Draft {
  return {
    version: 2,
    classId: null,
    slug: '',
    published: false,
    title: 'Intro to Photography',
    description: '',
    mode: 'hybrid',
    sessions: [newSession(1, { date: '2026-11-14', time: '10:00', duration: '120' })],
    nextSessionKey: 2,
    savedSessionIds: [],
    meetingLink: 'https://meet.example.com/class',
    venue: 'Yaba Tech Hub',
    capMode: 'unlimited',
    capacity: '30',
    kind: 'free',
    price: '20000',
    groupLink: '',
    installments: false,
    waitlist: true,
    confirmSeat: true,
    updatedAt: 0,
    ...overrides,
  };
}

function list(overrides: Partial<Draft> = {}): SessionList {
  const value = draft(overrides);
  return { sessions: value.sessions, nextSessionKey: value.nextSessionKey };
}

describe('session list', () => {
  it('adds a session a week after the last one', () => {
    const added = addSession(list());
    expect(added.sessions).toHaveLength(2);
    expect(added.sessions[1].date).toBe(addDays('2026-11-14', 7));
    expect(added.sessions[1].time).toBe('10:00');
    expect(added.nextSessionKey).toBe(3);
  });

  it('removes a session but keeps at least one', () => {
    const two = addSession(list());
    const one = removeSession(two, two.sessions[0].key);
    expect(one.sessions).toHaveLength(1);
    expect(removeSession(one, one.sessions[0].key)).toBe(one);
  });

  it('repeats weekly for four weeks from the first session', () => {
    const repeated = repeatWeekly(list());
    expect(repeated.sessions).toHaveLength(4);
    expect(repeated.sessions.map((session) => session.date)).toEqual([
      '2026-11-14',
      '2026-11-21',
      '2026-11-28',
      '2026-12-05',
    ]);
  });

  it('falls back to the class location until a session overrides it', () => {
    const classDraft = draft();
    const plain = classDraft.sessions[0];
    expect(effectiveLink(classDraft, plain)).toBe('https://meet.example.com/class');
    expect(effectiveVenue(classDraft, plain)).toBe('Yaba Tech Hub');

    const overridden = { ...plain, override: true, link: 'https://meet.example.com/one', venue: 'Lekki Hub' };
    expect(effectiveLink(classDraft, overridden)).toBe('https://meet.example.com/one');
    expect(effectiveVenue(classDraft, overridden)).toBe('Lekki Hub');
  });

  it('uses the class location when an override is empty', () => {
    const classDraft = draft();
    const emptyOverride = { ...classDraft.sessions[0], override: true, link: '', venue: '' };
    expect(effectiveLink(classDraft, emptyOverride)).toBe('https://meet.example.com/class');
    expect(effectiveVenue(classDraft, emptyOverride)).toBe('Yaba Tech Hub');
  });

  it('describes the resolved location for each mode', () => {
    const classDraft = draft();
    expect(sessionWhereText(classDraft, classDraft.sessions[0], { online: true, offline: true })).toBe(
      'Venue: Yaba Tech Hub\nJoin online: https://meet.example.com/class',
    );
    expect(sessionNote(classDraft, classDraft.sessions[0])).toBe(
      'Location: Venue: Yaba Tech Hub, Join online: https://meet.example.com/class',
    );
  });

  it('detects edits to saved sessions', () => {
    const session = newSession(1, { date: '2026-11-14', time: '10:00', duration: '120' });
    expect(isSessionChanged(session)).toBe(false);

    const saved = { ...session, saved: snapshotOf(session) };
    expect(isSessionChanged(saved)).toBe(false);
    expect(isSessionChanged({ ...saved, time: '11:00' })).toBe(true);
    expect(isSessionChanged({ ...saved, override: true, link: 'https://meet.example.com/one' })).toBe(true);
  });
});
