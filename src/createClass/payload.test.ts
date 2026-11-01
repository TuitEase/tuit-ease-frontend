import { describe, expect, it } from 'vitest';
import { classPayload, sessionUpdatePayload } from './payload';
import { createEmptyDraft } from './draft';

describe('classPayload', () => {
  it('sends the class group link and a paid amount', () => {
    const draft = {
      ...createEmptyDraft(),
      title: 'Intro to Photography',
      kind: 'paid' as const,
      price: '48000',
      groupLink: ' https://chat.whatsapp.com/abc123 ',
    };

    const payload = classPayload(draft);

    expect(payload.group_link).toBe('https://chat.whatsapp.com/abc123');
    expect(payload.price).toBe('48000');
    expect(payload.is_published).toBe(false);
  });

  it('keeps an already published class live when the host edits it', () => {
    const draft = { ...createEmptyDraft(), title: 'Advanced Pottery', published: true };

    expect(classPayload(draft).is_published).toBe(true);
  });

  it('never charges a free class', () => {
    const draft = { ...createEmptyDraft(), title: 'Community meetup', kind: 'free' as const, price: '48000' };

    const payload = classPayload(draft);

    expect(payload.price).toBe('0');
    expect(payload.allow_installments).toBe(false);
  });
});

describe('sessionUpdatePayload', () => {
  it('sends an override link when the session has one', () => {
    const payload = sessionUpdatePayload(
      '2030-10-10T09:00:00.000Z',
      90,
      { override: true, link: ' https://meet.example/room ', venue: '' },
      true,
      false,
    );

    expect(payload).toEqual({
      starts_at: '2030-10-10T09:00:00.000Z',
      duration_minutes: 90,
      meeting_link: 'https://meet.example/room',
    });
  });

  it('clears an old override when the session uses the class location', () => {
    const payload = sessionUpdatePayload(
      '2030-10-10T09:00:00.000Z',
      120,
      { override: false, link: 'https://meet.example/room', venue: 'Old hall' },
      true,
      true,
    );

    expect(payload.meeting_link).toBe('');
    expect(payload.venue).toBe('');
  });
});
