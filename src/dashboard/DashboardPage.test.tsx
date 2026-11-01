import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DashboardPage from './DashboardPage';

const api = vi.hoisted(() => ({
  DashboardApiError: class DashboardApiError extends Error {},
  cancelBooking: vi.fn(),
  createClass: vi.fn(),
  fetchClassBookings: vi.fn(),
  fetchClasses: vi.fn(),
  fetchHost: vi.fn(),
  fetchOverview: vi.fn(),
  markBookingPaid: vi.fn(),
  remindBooking: vi.fn(),
  saveAttendance: vi.fn(),
}));

vi.mock('./api', () => api);

const host = {
  business_name: 'Ada Okafor Classes',
  email: 'ada@example.com',
  timezone: 'Africa/Lagos',
  summary_hour: 7,
  payout_ready: false,
};

const overview = {
  stats: {
    classes: 1,
    active_students: 2,
    outstanding_students: 1,
    waitlisted: 1,
    collected: '385000',
    expected: '505000',
    outstanding: '120000',
    at_risk: 1,
    payout_ready: false,
  },
  at_risk: [{ booking: 12, student: 'Tolu Kareem', class: 'Python Bootcamp', reasons: ['owes ₦10,000'] }],
  summary_preview: 'Good morning!\n- Payments received in the last 24 hours: ₦20,000',
};

const classItem = {
  id: 4,
  title: 'Python Bootcamp',
  slug: 'python-bootcamp',
  price: '20000',
  currency: 'NGN',
  capacity: 20,
  mode: 'online' as const,
  is_published: true,
  sessions: [{ id: 9, number: 1, starts_at: '2026-11-20T10:00:00Z', duration_minutes: 120 }],
};

const booking = {
  id: 12,
  reference: 'abc',
  student_name: 'Tolu Kareem',
  student_phone: '08035559900',
  status: 'active' as const,
  amount_due: '20000',
  amount_paid: '10000',
  balance: '10000',
  payment_state: 'part_paid' as const,
  confirmed: true,
  created_at: '2026-10-24T10:00:00Z',
};

function renderDashboard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DashboardPage />
    </QueryClientProvider>,
  );
}

describe('host dashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    sessionStorage.setItem('tuitease.auth.token', 'session-token');
    api.fetchHost.mockResolvedValue(host);
    api.fetchOverview.mockResolvedValue(overview);
    api.fetchClasses.mockResolvedValue({ count: 1, next: null, previous: null, results: [classItem] });
    api.fetchClassBookings.mockResolvedValue([booking]);
    api.markBookingPaid.mockResolvedValue({ ...booking, payment_state: 'paid' });
    api.remindBooking.mockResolvedValue({ sent: true });
    api.cancelBooking.mockResolvedValue(booking);
    api.saveAttendance.mockResolvedValue({ saved: true });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it('shows payout notice only when the host has not connected payouts and renders dashboard data', async () => {
    renderDashboard();

    expect(await screen.findByRole('heading', { name: /Good (morning|afternoon|evening), Ada/i })).toBeInTheDocument();
    expect(await screen.findByText('Add your payout account to start receiving money')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'TuitEase dashboard' })).toHaveAttribute('href', '/dashboard/');
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Messages' })).toHaveAttribute('href', '/dashboard/#dashboard-top');
    expect(screen.getByRole('link', { name: 'Payments' })).toHaveAttribute('href', '/dashboard/#payments');
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument();
    expect(screen.getByText('₦385,000')).toBeInTheDocument();
    expect(screen.getByText('Who may not show up')).toBeInTheDocument();
    expect(screen.getByText('Tomorrow’s morning summary')).toBeInTheDocument();
    expect(await screen.findAllByText('Tolu Kareem')).not.toHaveLength(0);
  });

  it('opens and closes the mobile sidebar navigation', async () => {
    renderDashboard();

    await screen.findByRole('heading', { name: /Good (morning|afternoon|evening), Ada/i });
    const menuButton = screen.getByRole('button', { name: 'Open menu' });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(menuButton);
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');
    expect(document.querySelector('.dashboard-sidebar')).toHaveClass('is-open');
    fireEvent.click(screen.getByRole('button', { name: 'Close navigation' }));
    expect(document.querySelector('.dashboard-sidebar')).not.toHaveClass('is-open');
  });

  it('hides the payout notice after the host connects payouts', async () => {
    api.fetchHost.mockResolvedValue({ ...host, payout_ready: true });
    const readyClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={readyClient}>
        <DashboardPage />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.queryByText('Add your payout account to start receiving money')).not.toBeInTheDocument());
  });

  it('paginates the class selector and loads the next page from the API', async () => {
    const pageTwoClass = { ...classItem, id: 14, title: 'Second page class' };
    api.fetchClasses
      .mockResolvedValueOnce({ count: 11, next: '?page=2', previous: null, results: [classItem] })
      .mockResolvedValueOnce({ count: 11, next: null, previous: '?page=1', results: [pageTwoClass] });

    renderDashboard();
    await screen.findByRole('option', { name: 'Python Bootcamp' });
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next classes' }));

    expect(await screen.findByRole('option', { name: 'Second page class' })).toBeInTheDocument();
    await waitFor(() => expect(api.fetchClasses).toHaveBeenLastCalledWith(2));
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
  });

  it('blocks a manual payment that is greater than the balance', async () => {
    renderDashboard();
    await waitFor(() => expect(api.fetchClassBookings).toHaveBeenCalledWith(4));
    await waitFor(() => expect(screen.queryByRole('status', { name: 'Loading students' })).not.toBeInTheDocument());

    fireEvent.click(await screen.findByRole('button', { name: 'Mark paid' }));
    const amount = screen.getByLabelText('Amount received (₦)');
    fireEvent.change(amount, { target: { value: '10001' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save payment' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Amount cannot be greater than the outstanding balance');
    expect(api.markBookingPaid).not.toHaveBeenCalled();
  });

  it('sends reminders and refreshes no page', async () => {
    renderDashboard();
    await waitFor(() => expect(api.fetchClassBookings).toHaveBeenCalledWith(4));
    await waitFor(() => expect(screen.queryByRole('status', { name: 'Loading students' })).not.toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: 'Send payment link' })[0]);
    await waitFor(() => expect(api.remindBooking).toHaveBeenCalledWith(12));
    expect(await screen.findByText('Payment link sent to Tolu.')).toBeInTheDocument();
    expect(api.remindBooking).toHaveBeenCalledWith(12);
  });
});
