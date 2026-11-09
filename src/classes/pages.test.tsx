import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ClassesApp from './ClassesApp';
import ClassDetailApp from './ClassDetailApp';

const api = vi.hoisted(() => ({
  ClassesApiError: class ClassesApiError extends Error {},
  fetchClass: vi.fn(),
  fetchClasses: vi.fn(),
  fetchClassesOverview: vi.fn(),
  fetchClassStudents: vi.fn(),
  fetchClassTotals: vi.fn(),
  fetchHostProfile: vi.fn(),
  fetchPayments: vi.fn(),
  fetchPendingInstallments: vi.fn(),
  publishClass: vi.fn(),
  remindBooking: vi.fn(),
  saveAttendance: vi.fn(),
}));

vi.mock('./api', () => api);

const host = {
  business_name: 'Ada Okafor Classes',
  email: 'ada@example.com',
  timezone: 'Africa/Lagos',
  summary_hour: 7,
  payout_ready: true,
};

const futureSession = {
  id: 9,
  number: 1,
  starts_at: '2030-01-05T09:00:00+01:00',
  duration_minutes: 120,
  meeting_link: null,
  venue: null,
};

function makeClass(overrides: Record<string, unknown> = {}) {
  return {
    id: 4,
    title: 'Python for Beginners',
    slug: 'python-for-beginners',
    description: 'Learn Python from scratch.',
    price: '20000.00',
    capacity: 30,
    currency: 'NGN',
    mode: 'online',
    meeting_link: '',
    venue: '',
    venue_map_link: '',
    group_link: '',
    is_published: true,
    waitlist_enabled: true,
    allow_installments: false,
    installment_count: 2,
    installment_interval_days: 14,
    require_seat_confirmation: true,
    sessions: [futureSession],
    seats: { capacity: 30, seats_left: 18, booked: 12, waitlist: 1, is_full: false },
    status: 'live',
    next_session: futureSession,
    flags: [],
    ...overrides,
  };
}

const student = {
  id: 100,
  reference: 'ref-100',
  student_id: 7,
  student_name: 'Tolu Kareem',
  student_phone: '08035559900',
  status: 'active',
  amount_due: '20000.00',
  amount_paid: '20000.00',
  balance: '0',
  payment_state: 'paid',
  confirmed: true,
  created_at: '2026-10-01T10:00:00Z',
};

function page<T>(items: T[]) {
  return { items, total: items.length, truncated: false };
}

function renderPage(element: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}

describe('classes pages', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/classes/');
    api.fetchHostProfile.mockResolvedValue(host);
    api.fetchClassesOverview.mockResolvedValue({
      stats: { live_classes: 1, drafts: 1, past_classes: 2, students_booked: 14, collected_money: '30000' },
      upcoming_classes: [
        {
          session_id: 9,
          class_id: 4,
          class_title: 'Python for Beginners',
          starts_at: '2030-01-05T09:00:00+01:00',
          session_number: 1,
          session_total: 4,
          location: 'Yaba, Lagos',
          mode: 'offline',
        },
      ],
      attention: '',
      generated_at: '2030-01-01T09:00:00+01:00',
    });
    api.fetchClasses.mockResolvedValue(page([makeClass(), makeClass({ id: 5, title: 'Draft Class', is_published: false, price: '0' })]));
    api.fetchClassTotals.mockResolvedValue(page([]));
    api.fetchPendingInstallments.mockResolvedValue(page([]));
    api.fetchPayments.mockResolvedValue(page([]));
    api.fetchClassStudents.mockResolvedValue(page([student]));
    api.fetchClass.mockResolvedValue(makeClass());
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    vi.clearAllMocks();
  });

  it('renders the classes list with totals, cards and accessible view controls', async () => {
    renderPage(<ClassesApp />);

    expect(await screen.findByRole('heading', { name: 'Classes', level: 1 })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Coming up in the next 10 days' })).toBeInTheDocument();
    expect(
      screen.getByText('Everything you teach, in one place. 1 live, 1 draft, 2 past.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Live classes')).toBeInTheDocument();
    expect(screen.getByText('Open for booking now')).toBeInTheDocument();
    expect(screen.getByText('Finish setup to publish')).toBeInTheDocument();
    expect(screen.getByText('Students booked')).toBeInTheDocument();
    expect(screen.getByText('Across live classes')).toBeInTheDocument();
    expect(screen.getByText('From live classes')).toBeInTheDocument();
    expect(screen.getByText('₦30,000')).toBeInTheDocument();
    expect(screen.getByText('Session 1 of 4 · Yaba, Lagos')).toBeInTheDocument();
    expect(screen.queryByText(/this week/i)).not.toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Python for Beginners' })).toHaveAttribute(
      'href',
      '/classes/detail/?id=4',
    );
    expect(screen.getByText('Draft Class')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cards' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('Search classes')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/Showing 2 of 2 classes/);
    expect(screen.getAllByRole('link', { name: 'Manage' })[0]).toHaveAttribute('href', '/classes/detail/?id=4');
    expect(screen.getAllByRole('link', { name: 'Edit' })[0]).toHaveAttribute('href', '/classes/new/basics/?id=4');
  });

  it('shows only Overview and the draft banner for an unpublished class', async () => {
    window.history.replaceState(null, '', '/classes/detail/?id=5');
    api.fetchClass.mockResolvedValue(makeClass({ id: 5, is_published: false, sessions: [], next_session: null }));

    renderPage(<ClassDetailApp />);

    expect(await screen.findByRole('heading', { name: 'Python for Beginners', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('This class is still a draft.')).toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish class' })).toBeInTheDocument();
  });

  it('hides the Payments tab for a free published class', async () => {
    window.history.replaceState(null, '', '/classes/detail/?id=4');
    api.fetchClass.mockResolvedValue(makeClass({ price: '0' }));

    renderPage(<ClassDetailApp />);

    expect(await screen.findByRole('tab', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Students (1)' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Payments' })).not.toBeInTheDocument();
    expect(api.fetchPayments).not.toHaveBeenCalled();
  });

  it('uses payment class and booking IDs to show and remind the right class instalment', async () => {
    window.history.replaceState(null, '', '/classes/detail/?id=4');
    api.fetchPayments.mockResolvedValue(
      page([
        {
          id: 21,
          booking_id: 31,
          class_id: 4,
          amount: '5000',
          status: 'success',
          method: 'paystack',
          reference: 'this-class-payment',
          paid_at: '2026-11-02T10:00:00Z',
          student_name: 'Tolu Kareem',
          class_name: 'Python for Beginners',
        },
        {
          id: 22,
          booking_id: 32,
          class_id: 5,
          amount: '9000',
          status: 'success',
          method: 'paystack',
          reference: 'other-class-payment',
          paid_at: '2026-11-02T10:00:00Z',
          student_name: 'Tolu Kareem',
          class_name: 'Python for Beginners',
        },
      ]),
    );
    api.fetchPendingInstallments.mockResolvedValue(
      page([
        {
          id: 41,
          booking_id: 51,
          amount: '10000',
          due_date: '2030-01-10',
          student_name: 'Tolu Kareem',
          student_id: 7,
          class_name: 'Python for Beginners',
          class_id: 4,
        },
      ]),
    );
    api.remindBooking.mockResolvedValue({ sent: true });

    renderPage(<ClassDetailApp />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Payments' }));

    expect(await screen.findByTitle('this-class-payment')).toBeInTheDocument();
    expect(screen.queryByTitle('other-class-payment')).not.toBeInTheDocument();
    expect(
      screen.getByText('Payments are matched by class ID, so classes with the same name stay separate.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send payment reminder to Tolu Kareem' }));
    expect(api.remindBooking).toHaveBeenCalledWith(51);
    expect(await screen.findByText('Reminder sent to Tolu Kareem.')).toBeInTheDocument();
    expect(
      screen.getByText('Each instalment is linked to its booking. Send a payment reminder here or from the Students tab.'),
    ).toBeInTheDocument();
  });

  it('pre-ticks attendance saved on an earlier visit', async () => {
    const pastSession = {
      id: 12,
      number: 1,
      starts_at: '2020-01-05T09:00:00+01:00',
      duration_minutes: 120,
      venue: 'Yaba, Lagos',
      meeting_link: '',
    };
    window.history.replaceState(null, '', '/classes/detail/?id=4');
    api.fetchClass.mockResolvedValue(makeClass({ sessions: [pastSession], next_session: null }));
    api.fetchClassStudents.mockResolvedValue(
      page([
        {
          ...student,
          session_attendance: [{ session_id: 12, session_number: 1, class_id: 4 }],
        },
      ]),
    );

    renderPage(<ClassDetailApp />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Sessions' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Take attendance' }));

    expect(await screen.findByRole('checkbox', { name: /Tolu Kareem/i })).toBeChecked();
    expect(screen.getByText('Present')).toBeInTheDocument();
  });
});
