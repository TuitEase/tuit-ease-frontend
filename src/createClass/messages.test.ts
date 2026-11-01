import { describe, expect, it } from 'vitest';
import { confirmText, summaryFor, timelineFor, viewOf } from './messages';
import { newSession } from './sessions';
import type { Draft } from './types';

function draft(overrides: Partial<Draft> = {}): Draft {
  return {
    version: 2,
    classId: 12,
    slug: 'intro-to-photography',
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

describe('message preview', () => {
  it('uses the host name and no group button when there is no group link', () => {
    const view = viewOf(draft(), 'Ada Codes');
    expect(view.confirmText).toContain('Hi there, you are registered for Intro to Photography with Ada Codes.');
    expect(view.confirmText).not.toContain('WhatsApp group');
    expect(view.isFree).toBe(true);
  });

  it('adds the group line for a free class with a group link', () => {
    const view = viewOf(draft({ groupLink: 'https://chat.whatsapp.com/abc' }), 'Ada Codes');
    expect(view.confirmText).toContain('Join the class WhatsApp group for updates from the host.');
  });

  it('shows the paid amount and the half payment when instalments are on', () => {
    const view = viewOf(draft({ kind: 'paid', price: '48000', installments: true }), 'Ada Codes');
    const text = confirmText(draft({ kind: 'paid', price: '48000', installments: true }), 'Ada Codes');
    expect(text).toContain('Paid so far: ₦24,000 of ₦48,000.');
    expect(view.priceBadge).toBe('₦48,000');
    expect(view.instalLine).toBe('or 2 payments of ₦24,000');
    expect(view.messagesNote).toContain('Paid classes');
  });

  it('builds the paid timeline and the free summary', () => {
    const paid = draft({ kind: 'paid', price: '48000', installments: true });
    expect(timelineFor(paid).map((row) => row.when)).toEqual([
      'On booking',
      '3 days before',
      '1 day before',
      '1 hour before',
      'Second payment',
      'After class',
    ]);
    expect(timelineFor(draft())).toEqual([]);

    const summary = summaryFor(draft());
    expect(summary.find((row) => row.key === 'price')?.value).toBe('Free');
    expect(summary.find((row) => row.key === 'title')?.value).toBe('Intro to Photography');
  });

  it('labels a multi-session class as a course', () => {
    const sessions = [
      newSession(1, { date: '2026-11-14', time: '10:00', duration: '120' }),
      newSession(2, { date: '2026-11-21', time: '10:00', duration: '120' }),
    ];
    const view = viewOf(draft({ sessions }), 'Ada Codes');
    expect(view.courseLabel).toBe('2-session course');
    expect(view.whenLine).toContain('2 sessions, starting');
  });
});
