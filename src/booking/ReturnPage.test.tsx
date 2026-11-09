import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rememberBookingSlug } from './model';
import { ReturnPage } from './ReturnPage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const BOOKING_REF = '22222222-2222-2222-2222-222222222222';

function openReturnPage(search: string): void {
  window.history.replaceState(null, '', `/booking/complete${search}`);
}

describe('ReturnPage', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/');
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it('asks the student to open their booking link when the return has no reference', async () => {
    openReturnPage('');
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    render(<ReturnPage />);

    expect(await screen.findByRole('heading', { name: 'No booking to confirm' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'TuitEase' })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('confirms a paid booking without a remembered class page', async () => {
    openReturnPage(`?booking=${BOOKING_REF}&reference=pay_ref_9`);
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/api/public/payments/verify/')) {
        return Promise.resolve(jsonResponse({ status: 'success' }));
      }
      return Promise.resolve(
        jsonResponse({
          class: 'Pottery for Beginners',
          status: 'active',
          amount_due: '48000.00',
          amount_paid: '48000.00',
          balance: '0.00',
          payment_state: 'paid',
          installments: [{ number: 1, amount: '48000.00', due_date: '2026-11-01', status: 'paid' }],
        }),
      );
    });

    render(<ReturnPage />);

    expect(await screen.findByRole('heading', { name: 'You are in!' })).toBeInTheDocument();
    expect(screen.getByText(/Pottery for Beginners is confirmed/)).toBeInTheDocument();
    expect(screen.getByText('Paid ₦48,000')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Add the sessions to my calendar/ })).toHaveAttribute(
      'href',
      expect.stringContaining(`/api/public/bookings/${BOOKING_REF}/calendar.ics`),
    );
  });

  it('sends the student back to their remembered class page with both references', async () => {
    openReturnPage(`?booking=${BOOKING_REF}&reference=pay_ref_9`);
    rememberBookingSlug(BOOKING_REF, 'pottery-for-beginners');

    render(<ReturnPage />);

    expect(await screen.findByRole('heading', { name: 'Taking you back…' })).toBeInTheDocument();
    expect(screen.getByText('Opening your class page to confirm the payment.')).toBeInTheDocument();
  });

  it('shows the waiting-list state from the server instead of assuming payment', async () => {
    openReturnPage(`?booking=${BOOKING_REF}`);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        class: 'Pottery for Beginners',
        status: 'waitlisted',
        amount_due: '0.00',
        amount_paid: '0.00',
        balance: '0.00',
        payment_state: 'unpaid',
        installments: [],
      }),
    );

    render(<ReturnPage />);

    expect(await screen.findByRole('heading', { name: 'You are on the list' })).toBeInTheDocument();
    expect(screen.getByText(/You have not been charged/)).toBeInTheDocument();
  });
});
