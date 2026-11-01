import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StudentsApp from './StudentsApp';
import type {
  ClassStudentBooking,
  HostClassRecord,
  HostPaymentRecord,
  HostProfile,
  StudentBookingSummaryItem,
  StudentDetail,
  StudentReminderMessage,
} from './api';

const api = vi.hoisted(() => ({
  fetchClasses: vi.fn(),
  fetchClass: vi.fn(),
  fetchClassStudents: vi.fn(),
  fetchClassStudentsNext: vi.fn(),
  toApiPath: vi.fn((next: string | null) => next),
  fetchHostPayments: vi.fn(),
  fetchStudentDetail: vi.fn(),
  fetchStudentBookings: vi.fn(),
  fetchStudentMessages: vi.fn(),
  fetchHostProfile: vi.fn(),
  recordManualPayment: vi.fn(),
  saveAttendance: vi.fn(),
  sendPaymentReminder: vi.fn(),
  cancelBooking: vi.fn(),
}));

vi.mock('./api', () => api);

const mockHost: HostProfile = {
  id: 1,
  email: 'ada@example.com',
  business_name: 'Ada Codes Studio',
  whatsapp_number: '+2348012345678',
  host_type: 'tech',
  timezone: 'Africa/Lagos',
  summary_hour: 8,
  daily_summary_enabled: true,
  payout_ready: true,
  needs_onboarding: false,
};

const mockPotteryClass: HostClassRecord = {
  id: 101,
  title: 'Pottery for Beginners',
  slug: 'pottery-for-beginners',
  description: 'Hands-on pottery workshop.',
  price: '48000.00',
  capacity: 12,
  currency: 'NGN',
  mode: 'offline',
  meeting_link: '',
  venue: 'Studio 4, Yaba, Lagos',
  venue_map_link: '',
  group_link: 'https://chat.whatsapp.com/xyz',
  is_published: true,
  waitlist_enabled: true,
  allow_installments: true,
  installment_count: 2,
  installment_interval_days: 14,
  require_seat_confirmation: true,
  status: 'live',
  seats: {
    capacity: 12,
    seats_left: 3,
    booked: 9,
    waitlist: 2,
    is_full: false,
  },
  sessions: [
    {
      id: 201,
      number: 1,
      starts_at: '2026-10-10T09:00:00Z',
      duration_minutes: 180,
      venue: 'Studio 4, Yaba, Lagos',
    },
    {
      id: 202,
      number: 2,
      starts_at: '2026-10-17T09:00:00Z',
      duration_minutes: 180,
      venue: 'Studio 4, Yaba, Lagos',
    },
    {
      id: 203,
      number: 3,
      starts_at: '2026-11-10T09:00:00Z',
      duration_minutes: 180,
      venue: 'Studio 4, Yaba, Lagos',
    },
  ],
  next_session: {
    id: 203,
    number: 3,
    starts_at: '2026-11-10T09:00:00Z',
    duration_minutes: 180,
    venue: 'Studio 4, Yaba, Lagos',
  },
};

const mockFreeClass: HostClassRecord = {
  id: 102,
  title: 'Intro to Photography',
  slug: 'intro-to-photography',
  description: 'Free online photography seminar.',
  price: '0.00',
  capacity: 100,
  currency: 'NGN',
  mode: 'online',
  meeting_link: 'https://meet.google.com/abc-defg-hij',
  venue: '',
  venue_map_link: '',
  group_link: '',
  is_published: true,
  waitlist_enabled: false,
  allow_installments: false,
  installment_count: 1,
  installment_interval_days: 0,
  require_seat_confirmation: false,
  status: 'live',
  seats: {
    capacity: 100,
    seats_left: 50,
    booked: 50,
    waitlist: 0,
    is_full: false,
  },
  sessions: [
    {
      id: 204,
      number: 1,
      starts_at: '2026-11-15T10:00:00Z',
      duration_minutes: 60,
      meeting_link: 'https://meet.google.com/abc-defg-hij',
    },
  ],
};

const mockWatercolorClass: HostClassRecord = {
  id: 103,
  title: 'Watercolour Basics',
  slug: 'watercolour-basics',
  description: 'Online watercolour class.',
  price: '30000.00',
  capacity: 20,
  currency: 'NGN',
  mode: 'online',
  meeting_link: 'https://meet.google.com/wat-colour',
  venue: '',
  venue_map_link: '',
  group_link: '',
  is_published: true,
  waitlist_enabled: false,
  allow_installments: false,
  installment_count: 1,
  installment_interval_days: 0,
  require_seat_confirmation: false,
  status: 'live',
  seats: {
    capacity: 20,
    seats_left: 18,
    booked: 2,
    waitlist: 0,
    is_full: false,
  },
  sessions: [
    {
      id: 205,
      number: 1,
      starts_at: '2026-11-20T10:00:00Z',
      duration_minutes: 90,
      meeting_link: 'https://meet.google.com/wat-colour',
    },
  ],
  next_session: {
    id: 205,
    number: 1,
    starts_at: '2026-11-20T10:00:00Z',
    duration_minutes: 90,
    meeting_link: 'https://meet.google.com/wat-colour',
  },
};

const mockBookings: ClassStudentBooking[] = [
  {
    id: 1,
    reference: 'REF-IFE-01',
    student_id: 11,
    student_name: 'Ife Adebayo',
    student_phone: '+2348012345678',
    status: 'active',
    amount_due: '48000.00',
    amount_paid: '24000.00',
    balance: '24000.00',
    payment_state: 'part_paid',
    confirmed: true,
    created_at: '2026-09-02T10:00:00Z',
    session_attendance: [{ session_id: 201, session_number: 1, class_id: 101 }],
  },
  {
    id: 2,
    reference: 'REF-AMAKA-02',
    student_id: 12,
    student_name: 'Amaka Obi',
    student_phone: '+2348062107781',
    status: 'active',
    amount_due: '48000.00',
    amount_paid: '48000.00',
    balance: '0.00',
    payment_state: 'paid',
    confirmed: true,
    created_at: '2026-09-05T12:00:00Z',
    session_attendance: [
      { session_id: 201, session_number: 1, class_id: 101 },
      { session_id: 202, session_number: 2, class_id: 101 },
    ],
  },
  {
    id: 3,
    reference: 'REF-HALIMA-03',
    student_id: 13,
    student_name: 'Halima Sani',
    student_phone: '+2348123007741',
    status: 'waitlisted',
    amount_due: '48000.00',
    amount_paid: '0.00',
    balance: '48000.00',
    payment_state: 'unpaid',
    confirmed: false,
    created_at: '2026-10-27T08:00:00Z',
    session_attendance: [],
  },
];

const mockStudentDetail: StudentDetail = {
  id: '11',
  first_seen_at: '2026-09-02T10:00:00Z',
  name: 'Ife Adebayo',
  phone: '+2348012345678',
  email: 'ife@example.com',
  whatsapp_reachable: true,
  stats: {
    classes_booked: 2,
    sessions_attended: 3,
    missed_session: 1,
    attendance_rate: 75,
    total_paid: '44000.00',
    outstanding: '24000.00',
  },
};

const mockStudentBookings: StudentBookingSummaryItem[] = [
  {
    id: 1,
    reference: 'REF-IFE-01',
    status: 'active',
    created_at: '2026-09-02T10:00:00Z',
    class_event: {
      id: '101',
      title: 'Pottery for Beginners',
      mode: 'offline',
      is_paid: true,
    },
    seat_confirmed: true,
  },
  {
    id: 99,
    reference: 'REF-IFE-99',
    status: 'active',
    created_at: '2026-09-10T10:00:00Z',
    class_event: {
      id: '103',
      title: 'Watercolour Basics',
      mode: 'online',
      is_paid: true,
    },
    seat_confirmed: true,
  },
];

const mockPayments: HostPaymentRecord[] = [
  {
    id: 501,
    paid_at: '2026-10-10T09:30:00Z',
    method: 'paystack',
    status: 'success',
    reference: 'PAY-8801',
    amount: '24000.00',
    platform_fee: '840.00',
    processing_fee: '460.00',
    host_receives: '22700.00',
    student_name: 'Ife Adebayo',
    booking_id: 1,
    class_name: 'Pottery for Beginners',
    class_id: 101,
  },
];

const mockMessages: StudentReminderMessage[] = [
  {
    id: 601,
    kind: 'day_before',
    status: 'sent',
    channel: 'WhatsApp',
    sent_at: '2026-10-09T09:00:00Z',
  },
];

describe('StudentsApp', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });

    api.fetchHostProfile.mockResolvedValue(mockHost);
    api.fetchClasses.mockResolvedValue({
      count: 3,
      next: null,
      previous: null,
      results: [mockPotteryClass, mockFreeClass, mockWatercolorClass],
    });
    api.fetchClass.mockResolvedValue(mockPotteryClass);
    api.fetchClassStudents.mockResolvedValue({ count: 3, next: null, previous: null, results: mockBookings });
    api.fetchClassStudentsNext.mockResolvedValue({ count: 0, next: null, previous: null, results: [] });
    api.fetchHostPayments.mockResolvedValue(mockPayments);
    api.fetchStudentDetail.mockResolvedValue(mockStudentDetail);
    api.fetchStudentBookings.mockResolvedValue({ count: 2, next: null, previous: null, results: mockStudentBookings });
    api.fetchStudentMessages.mockResolvedValue({ count: 1, next: null, previous: null, results: mockMessages });
    api.recordManualPayment.mockResolvedValue({ ...mockBookings[0], amount_paid: '48000.00', balance: '0.00' });
    api.saveAttendance.mockResolvedValue({ saved: true });
    api.sendPaymentReminder.mockResolvedValue({ sent: true });
    api.cancelBooking.mockResolvedValue({ ...mockBookings[0], status: 'cancelled' });

    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  function renderApp() {
    return render(
      <QueryClientProvider client={queryClient}>
        <StudentsApp />
      </QueryClientProvider>,
    );
  }

  it('renders top bar, class summary, and student list', async () => {
    renderApp();

    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Page actions' })).toContainElement(
      screen.getByRole('link', { name: 'Dashboard' }),
    );
    expect(screen.getByRole('link', { name: 'Return to dashboard' }).querySelector('img')).toHaveAttribute(
      'src',
      '/assets/tuitease-logo.png',
    );

    // Verify title and class name
    expect(await screen.findByRole('heading', { level: 1, name: 'Students' })).toBeInTheDocument();
    expect(await screen.findByText('Pottery for Beginners')).toBeInTheDocument();

    // Verify summary stats after student data resolves
    expect(await screen.findByText('Collected')).toBeInTheDocument();
    expect(await screen.findByText('₦72,000')).toBeInTheDocument(); // 24k (Ife) + 48k (Amaka)

    // Verify students in list (default filter is 'Booked')
    expect(await screen.findByRole('button', { name: /Ife Adebayo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Amaka Obi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Waiting list 1/i })).toBeInTheDocument();
  });

  it('filters students by search input', async () => {
    renderApp();

    expect(await screen.findByRole('button', { name: /Ife Adebayo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Amaka Obi/i })).toBeInTheDocument();

    const searchInput = screen.getByLabelText('Search this class');
    fireEvent.change(searchInput, { target: { value: 'Amaka' } });

    expect(screen.getByRole('button', { name: /Amaka Obi/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ife Adebayo/i })).not.toBeInTheDocument();

    // Empty search result
    fireEvent.change(searchInput, { target: { value: 'Nonexistent person' } });
    expect(screen.getByText('Nobody in this class matches your search.')).toBeInTheDocument();
  });

  it('filters by status tabs (Booked, Paid up, Waiting list)', async () => {
    renderApp();

    expect(await screen.findByRole('button', { name: /Ife Adebayo/i })).toBeInTheDocument();

    // Click "Waiting list" filter
    const waitlistBtn = screen.getByRole('button', { name: /Waiting list/i });
    fireEvent.click(waitlistBtn);

    // Only Halima should show in list
    expect(screen.getByRole('button', { name: /Halima Sani/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ife Adebayo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Amaka Obi/i })).not.toBeInTheDocument();

    // Click "Paid up" filter
    const paidUpBtn = screen.getByRole('button', { name: /Paid up/i });
    fireEvent.click(paidUpBtn);

    // Only Amaka should show in list
    expect(screen.getByRole('button', { name: /Amaka Obi/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ife Adebayo/i })).not.toBeInTheDocument();
  });

  it('selects student and shows detail header, WhatsApp link, and tabs', async () => {
    renderApp();

    // Ife is selected by default
    expect(await screen.findByRole('heading', { level: 2, name: 'Ife Adebayo' })).toBeInTheDocument();
    expect(await screen.findByText('ife@example.com')).toBeInTheDocument();

    // WhatsApp link
    const waLink = screen.getByRole('link', { name: /Message on WhatsApp/i });
    expect(waLink).toHaveAttribute('href', expect.stringContaining('https://wa.me/2348012345678'));

    // "Also in:" chip for Watercolour Basics
    expect(screen.getByText('Also in:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Watercolour Basics' })).toBeInTheDocument();
  });

  it('records manual payment with validation and success flash', async () => {
    renderApp();

    const recordBtn = await screen.findByRole('button', { name: 'Record payment' });
    fireEvent.click(recordBtn);

    // Form opens
    expect(screen.getByRole('region', { name: 'Record payment' })).toBeInTheDocument();
    const amountInput = screen.getByLabelText(/Amount/i);

    // Prefills with balance (24,000)
    expect(amountInput).toHaveValue(24000);

    // Try more than balance
    fireEvent.change(amountInput, { target: { value: '50000' } });
    expect(screen.getByText(/That is more than the ₦24,000 outstanding/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save payment' })).toBeDisabled();

    // Valid amount
    fireEvent.change(amountInput, { target: { value: '24000' } });
    const saveBtn = screen.getByRole('button', { name: 'Save payment' });
    expect(saveBtn).not.toBeDisabled();

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.recordManualPayment).toHaveBeenCalledWith(1, 24000);
    });

    // Flash confirmation
    expect(await screen.findByRole('status')).toHaveTextContent('₦24,000 recorded for Ife.');
  });

  it('toggles attendance for a held session', async () => {
    renderApp();

    // Wait for student details to load
    expect(await screen.findByRole('heading', { level: 2, name: 'Ife Adebayo' })).toBeInTheDocument();

    // Held session 1 has attendance
    const presentButtons = screen.getAllByRole('button', { name: 'Present' });
    expect(presentButtons.length).toBeGreaterThan(0);

    const absentButtons = screen.getAllByRole('button', { name: 'Absent' });
    // Click absent on session 1
    fireEvent.click(absentButtons[0]);

    await waitFor(() => {
      expect(api.saveAttendance).toHaveBeenCalledWith(201, [{ booking: 1, present: false }]);
    });
  });

  it('rolls attendance back and explains when the save fails', async () => {
    api.saveAttendance.mockRejectedValueOnce(new Error('Network down.'));
    renderApp();

    expect(await screen.findByRole('heading', { level: 2, name: 'Ife Adebayo' })).toBeInTheDocument();

    const absentButtons = screen.getAllByRole('button', { name: 'Absent' });
    const presentButtons = screen.getAllByRole('button', { name: 'Present' });
    expect(presentButtons[0]).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(absentButtons[0]);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not save attendance. Network down.',
    );
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Present' })[0]).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });
  });

  it('shows payment fee lines from the host payments endpoint', async () => {
    renderApp();

    expect(await screen.findByRole('heading', { level: 2, name: 'Ife Adebayo' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Payments' }));

    expect(await screen.findByText(/Paystack fee ₦460 · TuitEase fee ₦840/)).toBeInTheDocument();
    expect(screen.getByText(/You received ₦22,700/)).toBeInTheDocument();
    expect(api.fetchHostPayments).toHaveBeenCalled();
  });

  it('loads more students from the next page', async () => {
    api.fetchClassStudents.mockResolvedValue({
      count: 4,
      next: '/api/host/classes/101/students/?page=2',
      previous: null,
      results: mockBookings,
    });
    api.fetchClassStudentsNext.mockResolvedValue({
      count: 4,
      next: null,
      previous: null,
      results: [
        {
          id: 4,
          reference: 'REF-BOLA-04',
          student_id: 14,
          student_name: 'Bola Ade',
          student_phone: '08035550000',
          status: 'active',
          amount_due: '48000.00',
          amount_paid: '48000.00',
          balance: '0.00',
          payment_state: 'paid',
          confirmed: true,
          created_at: '2026-10-01T10:00:00Z',
          session_attendance: [],
        },
      ],
    });

    renderApp();

    const showMore = await screen.findByRole('button', { name: 'Show more students' });
    fireEvent.click(showMore);

    expect(await screen.findByRole('button', { name: /Bola Ade/i })).toBeInTheDocument();
    expect(api.fetchClassStudentsNext).toHaveBeenCalledWith('/api/host/classes/101/students/?page=2');
  });

  it('shows an error and retries when the class student list fails', async () => {
    api.fetchClassStudents.mockRejectedValueOnce(new Error('Could not load.'));
    renderApp();

    expect(await screen.findByText(/Could not load students for this class/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('sends payment reminder via WhatsApp', async () => {
    renderApp();

    const reminderBtn = await screen.findByRole('button', { name: 'Send payment reminder' });
    fireEvent.click(reminderBtn);

    await waitFor(() => {
      expect(api.sendPaymentReminder).toHaveBeenCalledWith(1);
    });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Payment reminder sent to Ife on WhatsApp.',
    );
  });

  it('saves private notes to localStorage', async () => {
    renderApp();

    const textarea = await screen.findByLabelText(/Your notes about Ife/i);
    fireEvent.change(textarea, { target: { value: 'Needs afternoon reminders.' } });
    fireEvent.blur(textarea);

    expect(localStorage.getItem('tuitease_student_notes_11')).toBe('Needs afternoon reminders.');
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('shows confirmation dialog before cancelling a booking', async () => {
    renderApp();

    const cancelLink = await screen.findByRole('button', { name: 'Cancel booking' });
    fireEvent.click(cancelLink);

    // Modal opens
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to cancel this booking?/i)).toBeInTheDocument();

    // Confirm cancel
    const confirmBtn = screen.getByRole('button', { name: 'Yes, cancel booking' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.cancelBooking).toHaveBeenCalledWith(1);
    });

    expect(await screen.findByRole('status')).toHaveTextContent("Ife's booking was cancelled.");
  });

  it('handles waiting list student actions', async () => {
    renderApp();

    // Click waitlist filter and select Halima
    const waitlistBtn = await screen.findByRole('button', { name: /Waiting list/i });
    fireEvent.click(waitlistBtn);

    const halimaRow = await screen.findByRole('button', { name: /Halima Sani/i });
    fireEvent.click(halimaRow);

    // Should show waiting list card
    expect(await screen.findByText(/On the waiting list/i)).toBeInTheDocument();
    const offerSeatBtn = screen.getByRole('button', { name: /Offer seat/i });
    expect(offerSeatBtn).toBeDisabled();
    expect(offerSeatBtn).toHaveAttribute('title', expect.stringContaining('not available yet'));

    // Remove from list
    const removeBtn = screen.getByRole('button', { name: 'Remove from list' });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(api.cancelBooking).toHaveBeenCalledWith(3);
    });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Halima was removed from the waiting list.',
    );
  });
});
