import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicClass } from './api';
import { BookingPage } from './BookingPage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function publicClass(overrides: Partial<PublicClass> = {}): PublicClass {
  return {
    slug: 'pottery-for-beginners',
    title: 'Pottery for Beginners',
    description: 'Four Saturday mornings at the wheel.',
    host: 'Ada Codes',
    price: '48000.00',
    currency: 'NGN',
    mode: 'offline',
    venue: 'Yaba, Lagos',
    capacity: 12,
    booked: 6,
    seats_left: 6,
    waitlist_enabled: true,
    allow_installments: true,
    installment_count: 2,
    installments: [
      { number: 1, amount: '24000.00', due_at: '2026-11-01' },
      { number: 2, amount: '24000.00', due_at: '2026-11-15' },
    ],
    sessions: [
      { id: 1, number: 1, starts_at: '2030-10-10T08:00:00Z', duration_minutes: 180 },
      { id: 2, number: 2, starts_at: '2030-10-17T08:00:00Z', duration_minutes: 180 },
      { id: 3, number: 3, starts_at: '2030-10-24T08:00:00Z', duration_minutes: 180 },
      { id: 4, number: 4, starts_at: '2030-10-31T08:00:00Z', duration_minutes: 180 },
    ],
    ...overrides,
  };
}

const BOOKING_REF = '11111111-1111-1111-1111-111111111111';

function openClassPage(search = ''): void {
  window.history.replaceState(null, '', `/class/pottery-for-beginners/${search}`);
}

function fillDetails(name = 'Ife Adebayo', phone = '0801 234 5678'): void {
  fireEvent.change(screen.getByLabelText('Your full name'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: phone } });
}

function postCalls(fetchMock: { mock: { calls: unknown[][] } }): unknown[][] {
  return fetchMock.mock.calls.filter((call) => {
    const init = call[1] as RequestInit | undefined;
    return init?.method === 'POST';
  });
}

describe('BookingPage', () => {
  beforeEach(() => {
    openClassPage();
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

  it('shows the brand logo alongside the class host', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(publicClass()));

    render(<BookingPage />);

    expect(await screen.findByRole('heading', { name: 'Pottery for Beginners' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'TuitEase' })).toBeInTheDocument();
    expect(screen.getByText('YOUR CLASS HOST')).toBeInTheDocument();
    expect(screen.getByText('Ada Codes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Share this class' }));
    expect(screen.getByRole('region', { name: 'Share this class' })).toBeInTheDocument();
    expect(screen.getByText('Scan to book')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument();
  });

  it('books a free class in one step and shows the confirmation', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      if (init?.method === 'POST') {
        return Promise.resolve(jsonResponse({ booking: BOOKING_REF, status: 'active' }, 201));
      }
      return Promise.resolve(jsonResponse(publicClass({ price: '0.00', allow_installments: false })));
    });

    render(<BookingPage />);

    expect(await screen.findByRole('heading', { name: 'Pottery for Beginners' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Reserve my seat' })[0]);
    expect(screen.getByRole('heading', { name: 'Reserve your free seat' })).toBeInTheDocument();

    fillDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Reserve my seat' }));

    expect(await screen.findByRole('heading', { name: 'You are in, Ife!' })).toBeInTheDocument();
    expect(screen.getByText('Free class · No payment needed')).toBeInTheDocument();
    expect(screen.getByText('Your seat is reserved. Details are on their way to your WhatsApp.')).toBeInTheDocument();

    const [post] = postCalls(fetchMock);
    expect(JSON.parse(String((post[1] as RequestInit).body))).toMatchObject({
      name: 'Ife Adebayo',
      phone: '+2348012345678',
      plan: 'full',
      use_installments: false,
    });
  });

  it('sends the instalment plan to the server instead of computing a charge', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      if (init?.method === 'POST') {
        return Promise.resolve(
          jsonResponse(
            {
              booking: BOOKING_REF,
              status: 'pending_payment',
              authorization_url: 'https://checkout.paystack.com/abc123',
            },
            201,
          ),
        );
      }
      return Promise.resolve(jsonResponse(publicClass()));
    });

    render(<BookingPage />);

    await screen.findByRole('heading', { name: 'Pottery for Beginners' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Reserve my seat' })[0]);
    fillDetails();
    fireEvent.click(screen.getByRole('radio', { name: /Pay in 2 parts/ }));
    expect(screen.getByRole('button', { name: 'Pay ₦24,000 securely' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pay ₦24,000 securely' }));

    await waitFor(() => expect(postCalls(fetchMock)).toHaveLength(1));
    expect(await screen.findByRole('heading', { name: 'Opening secure payment' })).toBeInTheDocument();
    const [post] = postCalls(fetchMock);
    expect(JSON.parse(String((post[1] as RequestInit).body))).toMatchObject({
      plan: 'installments',
      use_installments: true,
    });
  });

  it('joins the waiting list when the class is full', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      if (init?.method === 'POST') {
        return Promise.resolve(jsonResponse({ booking: BOOKING_REF, status: 'waitlisted' }, 201));
      }
      return Promise.resolve(jsonResponse(publicClass({ seats_left: 0, booked: 12 })));
    });

    render(<BookingPage />);

    expect(await screen.findByText('This class is full right now.')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Join the waiting list' })[0]);
    expect(screen.getByRole('heading', { name: 'Join the waiting list' })).toBeInTheDocument();

    fillDetails('Ada Obi', '0803 555 0199');
    fireEvent.click(screen.getByRole('button', { name: 'Add me to the waiting list' }));

    expect(await screen.findByRole('heading', { name: 'You are on the list, Ada' })).toBeInTheDocument();
    expect(screen.getByText('You have not been charged.')).toBeInTheDocument();
  });

  it('shows the duplicate message instead of booking twice', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      if (init?.method === 'POST') {
        return Promise.resolve(jsonResponse({ detail: 'You already have a booking for this class.' }, 400));
      }
      return Promise.resolve(jsonResponse(publicClass()));
    });

    render(<BookingPage />);

    await screen.findByRole('heading', { name: 'Pottery for Beginners' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Reserve my seat' })[0]);
    fillDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Pay ₦48,000 securely' }));

    expect(await screen.findByRole('heading', { name: 'You already have a seat' })).toBeInTheDocument();
  });

  it('turns a full-on-submit race into the waiting list', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      if (init?.method === 'POST') {
        return Promise.resolve(jsonResponse({ detail: 'Sorry, this class is full.' }, 400));
      }
      return Promise.resolve(jsonResponse(publicClass()));
    });

    render(<BookingPage />);

    await screen.findByRole('heading', { name: 'Pottery for Beginners' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Reserve my seat' })[0]);
    fillDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Pay ₦48,000 securely' }));

    expect(await screen.findByText('This class is full right now.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Join the waiting list' }).length).toBeGreaterThan(0);
  });

  it('validates the name and phone before calling the API', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse(publicClass()));

    render(<BookingPage />);

    await screen.findByRole('heading', { name: 'Pottery for Beginners' });
    fireEvent.click(screen.getAllByRole('button', { name: 'Reserve my seat' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Pay ₦48,000 securely' }));

    expect(screen.getByText('Please enter your name.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid Nigerian number, like 0801 234 5678.')).toBeInTheDocument();
    expect(postCalls(fetchMock)).toHaveLength(0);
  });

  it('shows a not-found page for an unknown class', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ detail: 'Class not found.' }, 404));

    render(<BookingPage />);

    expect(await screen.findByRole('heading', { name: 'This class could not be found' })).toBeInTheDocument();
  });

  it('offers a retry when the class page cannot load', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse(publicClass()));

    render(<BookingPage />);

    expect(await screen.findByRole('heading', { name: 'We could not load this class' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { name: 'Pottery for Beginners' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('confirms a payment return from the server and links the calendar', async () => {
    openClassPage(`?booking=${BOOKING_REF}&reference=pay_ref_1`);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url.includes('/api/public/payments/verify/')) {
        return Promise.resolve(jsonResponse({ status: 'success' }));
      }
      if (url.includes(`/api/public/bookings/${BOOKING_REF}/`)) {
        return Promise.resolve(
          jsonResponse({
            class: 'Pottery for Beginners',
            status: 'active',
            amount_due: '24000.00',
            amount_paid: '24000.00',
            balance: '24000.00',
            payment_state: 'part_paid',
            installments: [
              { number: 1, amount: '24000.00', due_date: '2026-11-01', status: 'paid' },
              { number: 2, amount: '24000.00', due_date: '2026-11-15', status: 'pending' },
            ],
          }),
        );
      }
      return Promise.resolve(jsonResponse(publicClass()));
    });

    render(<BookingPage />);

    expect(await screen.findByRole('heading', { name: 'You are in!' })).toBeInTheDocument();
    expect(screen.getByText(/Paid ₦24,000 · ₦24,000 due 15 Nov/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Add all 4 sessions to my calendar/ })).toHaveAttribute(
      'href',
      expect.stringContaining(`/api/public/bookings/${BOOKING_REF}/calendar.ics`),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/public/payments/verify/?reference=pay_ref_1'),
      expect.objectContaining({ credentials: 'omit' }),
    );
  });
});
