import { describe, expect, it } from 'vitest';
import type { PublicClass } from './api';
import {
  bookingReferenceFromSearch,
  buildView,
  classReturnUrl,
  firstNameOf,
  installmentChoiceCopy,
  installmentLaterLine,
  nextDueLine,
  normalizeNigerianPhone,
  paymentReferenceFromSearch,
  planNow,
  seatsLine,
  shareUrl,
  slugFromLocation,
} from './model';

const NOW = new Date('2026-10-31T09:00:00Z');

function session(number: number, startsAt: string, extra: Record<string, unknown> = {}) {
  return {
    id: number,
    number,
    starts_at: startsAt,
    duration_minutes: 180,
    meeting_link: '',
    replay_link: '',
    venue: null,
    ...extra,
  };
}

function baseClass(overrides: Partial<PublicClass> = {}): PublicClass {
  return {
    slug: 'pottery-for-beginners',
    title: 'Pottery for Beginners',
    description: 'Four Saturday mornings at the wheel.',
    host: 'Ada Codes',
    price: '48000.00',
    currency: 'NGN',
    mode: 'offline',
    venue: 'Yaba, Lagos',
    seats_left: 6,
    waitlist_enabled: true,
    allow_installments: true,
    installment_count: 2,
    sessions: [
      session(1, '2030-10-10T08:00:00Z'),
      session(2, '2030-10-17T08:00:00Z'),
      session(3, '2030-10-24T08:00:00Z'),
      session(4, '2030-10-31T08:00:00Z', { venue: 'Studio 2' }),
    ],
    ...overrides,
  };
}

describe('booking locations', () => {
  it('reads the slug from the public route and falls back to a query parameter', () => {
    expect(slugFromLocation({ pathname: '/class/pottery-for-beginners/', search: '' })).toBe(
      'pottery-for-beginners',
    );
    expect(slugFromLocation({ pathname: '/class/pottery%20class', search: '' })).toBe('pottery class');
    expect(slugFromLocation({ pathname: '/booking/complete', search: '?slug=pottery' })).toBe('pottery');
  });

  it('reads the booking and Paystack references separately', () => {
    expect(bookingReferenceFromSearch('?booking=abc-123&reference=pay-1')).toBe('abc-123');
    expect(paymentReferenceFromSearch('?booking=abc-123&reference=pay-1')).toBe('pay-1');
    expect(paymentReferenceFromSearch('?trxref=pay-2')).toBe('pay-2');
  });

  it('builds the share URL without a double slash', () => {
    expect(shareUrl('pottery', 'https://tuitease.app/')).toBe('https://tuitease.app/class/pottery/');
  });

  it('returns to the class page with both references', () => {
    expect(classReturnUrl('pottery', 'book-1', '?booking=book-1&reference=pay-1')).toBe(
      '/class/pottery/?booking=book-1&reference=pay-1',
    );
    expect(classReturnUrl('pottery', 'book-1', '?booking=book-1')).toBe('/class/pottery/?booking=book-1');
  });
});

describe('Nigerian phone numbers', () => {
  it('accepts the formats the form promises and returns E.164', () => {
    expect(normalizeNigerianPhone('0801 234 5678')).toBe('+2348012345678');
    expect(normalizeNigerianPhone('+234 801 234 5678')).toBe('+2348012345678');
    expect(normalizeNigerianPhone('2348012345678')).toBe('+2348012345678');
    expect(normalizeNigerianPhone('08012345678')).toBe('+2348012345678');
  });

  it('rejects short, non-numeric and foreign-looking numbers', () => {
    expect(normalizeNigerianPhone('0801 234')).toBeNull();
    expect(normalizeNigerianPhone('hello')).toBeNull();
    expect(normalizeNigerianPhone('+1 555 010 2030')).toBeNull();
  });
});

describe('public class view', () => {
  it('uses the class instalments instead of a hard-coded split', () => {
    const view = buildView(
      baseClass({
        installments: [
          { number: 1, amount: '10000.00', due_at: '2030-12-05' },
          { number: 2, amount: '10000.00', due_at: '2030-12-19' },
          { number: 3, amount: '8000.00', due_at: '2031-01-02' },
        ],
        installment_count: 3,
      }),
      NOW,
    );

    expect(view.plans.count).toBe(3);
    expect(planNow(view, 'installments')).toBe(10_000);
    expect(view.priceLine).toBe('for all 4 sessions · or pay in 3 parts of ₦10,000');
    expect(installmentChoiceCopy(view)).toBe('₦10,000 now, ₦10,000 on 19 Dec');
    expect(installmentLaterLine(view)).toBe('Then ₦10,000 on 19 Dec. We will remind you on WhatsApp.');
  });

  it('shows the seat count and the running progress', () => {
    const view = buildView(baseClass({ capacity: 12, booked: 6, seats_left: 6 }), NOW);

    expect(view.status).toBe('open');
    expect(seatsLine(view)).toBe('6 of 12 seats taken');
    expect(view.seats.percent).toBe(50);
    expect(view.fewLeft).toBe(false);
  });

  it('falls back to seats left when the public payload has no capacity', () => {
    const view = buildView(baseClass({ seats_left: 3 }), NOW);

    expect(seatsLine(view)).toBe('3 seats left');
    expect(view.seats.percent).toBeNull();
    expect(view.fewLeft).toBe(true);
  });

  it('marks a full class from seats_left even without a status field', () => {
    const view = buildView(baseClass({ capacity: 12, seats_left: 0 }), NOW);

    expect(view.status).toBe('full');
    expect(seatsLine(view)).toBe('All 12 seats are taken');
  });

  it('marks a class ended when every session is in the past', () => {
    const view = buildView(
      baseClass({
        sessions: [session(1, '2025-01-10T08:00:00Z'), session(2, '2025-01-17T08:00:00Z')],
      }),
      NOW,
    );

    expect(view.status).toBe('ended');
  });

  it('maps a free class to no payment plan', () => {
    const view = buildView(baseClass({ price: '0.00', allow_installments: true }), NOW);

    expect(view.isFree).toBe(true);
    expect(view.plans.enabled).toBe(false);
    expect(view.priceLine).toBe('Free');
  });

  it('hides private meeting links and labels online sessions', () => {
    const view = buildView(
      baseClass({
        mode: 'online',
        venue: '',
        sessions: [session(1, '2030-10-10T08:00:00Z', { meeting_link: 'https://meet.example/secret' })],
      }),
      NOW,
    );

    expect(view.sessions[0].place).toBe('Link sent after you book');
    expect(JSON.stringify(view)).not.toContain('meet.example/secret');
  });

  it('flags a session with its own venue', () => {
    const view = buildView(baseClass(), NOW);

    expect(view.sessions[0].differs).toBe(false);
    expect(view.sessions[3].differs).toBe(true);
    expect(view.sessions[3].place).toBe('Studio 2');
  });

  it('numbers sessions by their order after a deleted session leaves a gap', () => {
    const view = buildView(
      baseClass({
        sessions: [
          session(1, '2030-10-10T08:00:00Z'),
          session(3, '2030-10-24T08:00:00Z'),
          session(4, '2030-10-31T08:00:00Z'),
        ],
      }),
      NOW,
    );

    expect(view.sessions.map((item) => item.number)).toEqual([1, 2, 3]);
    expect(view.sessions[1].line1.startsWith('Session 2 ·')).toBe(true);
  });

  it('formats the next unpaid instalment from the booking status', () => {
    expect(
      nextDueLine(
        {
          class: 'Pottery',
          status: 'active',
          amount_due: '48000.00',
          amount_paid: '24000.00',
          balance: '24000.00',
          payment_state: 'part_paid',
          installments: [
            { number: 1, amount: '24000.00', due_date: '2030-10-10', status: 'paid' },
            { number: 2, amount: '24000.00', due_date: '2030-11-01', status: 'pending' },
          ],
        },
        'NGN',
      ),
    ).toBe('₦24,000 due 1 Nov');
  });

  it('keeps only the first word for the greeting', () => {
    expect(firstNameOf('Ife Adebayo')).toBe('Ife');
    expect(firstNameOf('   ')).toBe('');
  });
});
