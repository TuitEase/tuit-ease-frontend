import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { clearAuthSession, getAuthToken, isAuthTokenStorageEvent } from '../auth/api';
import {
  cancelBooking,
  createClass,
  DashboardApiError,
  fetchClassBookings,
  fetchClasses,
  fetchHost,
  fetchOverview,
  markBookingPaid,
  remindBooking,
  saveAttendance,
  type ClassBooking,
  type HostClass,
} from './api';
import './dashboard.css';

type Filter = 'all' | 'paid' | 'part_paid' | 'unpaid' | 'not_confirmed';
type ToastState = { kind: 'success' | 'error'; message: string } | null;

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'paid', label: 'Paid' },
  { id: 'part_paid', label: 'Part-paid' },
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'not_confirmed', label: 'Not confirmed' },
];

function money(value: string | number, currency = 'NGN') {
  const amount = Number(value);
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || 'Host';
}

function dateTime(value?: string) {
  if (!value) return 'Date to be announced';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date to be announced';
  return new Intl.DateTimeFormat('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function initials(value: string) {
  return value.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

type NavIconName = 'home' | 'classes' | 'students' | 'messages' | 'payments' | 'settings';

function NavIcon({ name }: { name: NavIconName }) {
  const paths: Record<NavIconName, string> = {
    home: 'M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6',
    classes: 'M4 5.5h16v13H4zM8 9h8M8 12h8M8 15h5',
    students: 'M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 4.2a3.5 3.5 0 0 1 0 6.8M17 14.5a4 4 0 0 1 4 4V20',
    messages: 'M4 5h16v12H9l-5 4V5ZM8 9h8M8 13h5',
    payments: 'M3 6h18v12H3zM3 10h18M7 14h4',
    settings: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM19 13.5l2 1.2-2 3.5-2.2-1a7.8 7.8 0 0 1-1.8 1l-.3 2.3h-4l-.3-2.3a7.8 7.8 0 0 1-1.8-1l-2.2 1-2-3.5 2-1.2a7.5 7.5 0 0 1 0-2.1l-2-1.2 2-3.5 2.2 1a7.8 7.8 0 0 1 1.8-1L10.7 4h4l.3 2.3a7.8 7.8 0 0 1 1.8 1l2.2-1 2 3.5-2 1.2a7.5 7.5 0 0 1 0 2.5Z',
  };

  return (
    <span className="nav-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d={paths[name]} />
      </svg>
    </span>
  );
}

function paymentLabel(state: ClassBooking['payment_state']) {
  if (state === 'part_paid') return 'Part-paid';
  return state === 'paid' ? 'Paid' : 'Unpaid';
}

function filterBookings(bookings: ClassBooking[], filter: Filter) {
  if (filter === 'all') return bookings;
  if (filter === 'not_confirmed') return bookings.filter((booking) => !booking.confirmed);
  return bookings.filter((booking) => booking.payment_state === filter);
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const hasAuthToken = Boolean(getAuthToken());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [classesPage, setClassesPage] = useState(1);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [toast, setToast] = useState<ToastState>(null);
  const [activeDialog, setActiveDialog] = useState<'create' | 'attendance' | null>(null);
  const [paymentBooking, setPaymentBooking] = useState<ClassBooking | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ClassBooking | null>(null);
  const [actionBookingId, setActionBookingId] = useState<number | null>(null);
  const [attendanceMarks, setAttendanceMarks] = useState<Record<number, boolean>>({});
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [classError, setClassError] = useState('');

  useEffect(() => {
    const checkSession = (event?: StorageEvent) => {
      if (event && !isAuthTokenStorageEvent(event)) return;
      if (!getAuthToken()) window.location.assign('/signin/');
    };
    checkSession();
    window.addEventListener('storage', checkSession);
    return () => window.removeEventListener('storage', checkSession);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const hostQuery = useQuery({ queryKey: ['host-profile'], queryFn: fetchHost, enabled: hasAuthToken });
  const overviewQuery = useQuery({ queryKey: ['dashboard-overview'], queryFn: fetchOverview, enabled: hasAuthToken });
  const classesQuery = useQuery({
    queryKey: ['host-classes', classesPage],
    queryFn: () => fetchClasses(classesPage),
    enabled: hasAuthToken,
    placeholderData: keepPreviousData,
  });
  const classes = classesQuery.data?.results ?? [];
  const classPageCount = Math.max(1, Math.ceil((classesQuery.data?.count ?? 0) / 10));

  useEffect(() => {
    if (!classesQuery.isPlaceholderData && classes.length && !classes.some((item) => item.id === selectedClassId)) {
      setSelectedClassId(classes[0].id);
    }
  }, [classesQuery.isPlaceholderData, selectedClassId, classes]);

  const activeClass = classes.find((item) => item.id === selectedClassId) ?? null;
  const bookingsQuery = useQuery({
    queryKey: ['class-bookings', selectedClassId],
    queryFn: () => {
      if (selectedClassId === null) throw new DashboardApiError('Select a class to load its students.');
      return fetchClassBookings(selectedClassId);
    },
    enabled: hasAuthToken && selectedClassId !== null,
  });
  const bookings = bookingsQuery.data ?? [];
  const visibleBookings = useMemo(() => filterBookings(bookings, filter), [bookings, filter]);
  const host = hostQuery.data;
  const overview = overviewQuery.data;
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const summaryTime = host
    ? new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit', hour12: true }).format(
        new Date(2000, 0, 1, host.summary_hour, 0),
      )
    : '7:00 AM';
  const classSessions = activeClass?.sessions ?? [];
  const nextSession = classSessions.find((session) => new Date(session.starts_at) >= new Date()) ?? classSessions[0];
  const seatsTaken = bookings.filter((booking) => booking.status === 'active' || booking.status === 'pending_payment').length;
  const activeBookings = bookings.filter((booking) => booking.status !== 'waitlisted');
  const error = hostQuery.error ?? overviewQuery.error;

  const invalidateDashboard = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }),
      queryClient.invalidateQueries({ queryKey: ['host-classes'] }),
      queryClient.invalidateQueries({ queryKey: ['class-bookings'] }),
    ]);
  };

  const handleAction = async (booking: ClassBooking, action: 'remind' | 'link') => {
    setActionBookingId(booking.id);
    try {
      const result = await remindBooking(booking.id);
      if (!result.sent) throw new DashboardApiError('The message provider did not send the reminder. Check your messaging setup.');
      setToast({
        kind: 'success',
        message: `${action === 'link' ? 'Payment link' : 'Reminder'} sent to ${firstName(booking.student_name)}.`,
      });
    } catch (actionError) {
      setToast({
        kind: 'error',
        message: actionError instanceof Error ? actionError.message : 'Could not send the message. Please try again.',
      });
    } finally {
      setActionBookingId(null);
    }
  };

  const handleRiskAction = async (bookingId: number, studentName: string, hasBalance: boolean) => {
    setActionBookingId(bookingId);
    try {
      const result = await remindBooking(bookingId);
      if (!result.sent) throw new DashboardApiError('The message provider did not send the reminder. Check your messaging setup.');
      setToast({
        kind: 'success',
        message: `${hasBalance ? 'Payment link' : 'Reminder'} sent to ${firstName(studentName)}.`,
      });
    } catch (actionError) {
      setToast({
        kind: 'error',
        message: actionError instanceof Error ? actionError.message : 'Could not send the message. Please try again.',
      });
    } finally {
      setActionBookingId(null);
    }
  };

  const submitPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!paymentBooking) return;
    const entered = Number(paymentAmount);
    const balance = Number(paymentBooking.balance);
    if (!Number.isFinite(entered) || entered <= 0) {
      setPaymentError('Enter an amount greater than ₦0.');
      return;
    }
    if (entered > balance) {
      setPaymentError(`Amount cannot be greater than the outstanding balance of ${money(paymentBooking.balance)}.`);
      return;
    }
    setPaymentError('');
    setActionBookingId(paymentBooking.id);
    try {
      await markBookingPaid(paymentBooking.id, paymentAmount);
      setToast({ kind: 'success', message: `Payment recorded for ${paymentBooking.student_name}.` });
      setPaymentBooking(null);
      await invalidateDashboard();
    } catch (actionError) {
      setPaymentError(actionError instanceof Error ? actionError.message : 'Could not record this payment.');
    } finally {
      setActionBookingId(null);
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setActionBookingId(cancelTarget.id);
    try {
      await cancelBooking(cancelTarget.id);
      setToast({ kind: 'success', message: `Booking cancelled for ${cancelTarget.student_name}.` });
      setCancelTarget(null);
      await invalidateDashboard();
    } catch (actionError) {
      setToast({
        kind: 'error',
        message: actionError instanceof Error ? actionError.message : 'Could not cancel this booking.',
      });
    } finally {
      setActionBookingId(null);
    }
  };

  const copyBookingLink = async (classItem: HostClass) => {
    const link = `${window.location.origin}/class/${classItem.slug}/`;
    try {
      await navigator.clipboard.writeText(link);
      setToast({ kind: 'success', message: 'Booking link copied.' });
    } catch {
      setToast({ kind: 'error', message: 'Could not copy the booking link. Check browser clipboard permissions.' });
    }
  };

  const exportCsv = () => {
    if (!activeClass) return;
    const rows = [
      ['Student', 'Phone', 'Payment status', 'Amount due', 'Amount paid', 'Balance', 'Seat status'],
      ...bookings.map((booking) => [
        booking.student_name,
        booking.student_phone,
        paymentLabel(booking.payment_state),
        String(booking.amount_due),
        String(booking.amount_paid),
        String(booking.balance),
        booking.confirmed ? 'Confirmed' : 'No response',
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const file = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${activeClass.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-students.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const saveClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setClassError('');
    const form = new FormData(event.currentTarget);
    const mode = String(form.get('mode')) as HostClass['mode'];
    const startsAt = String(form.get('starts_at'));
    if (!startsAt || Number.isNaN(new Date(startsAt).getTime())) {
      setClassError('Choose a valid class date and time.');
      return;
    }
    try {
      const price = String(form.get('price') || '0');
      const isPublished = Number(price) === 0 || host?.payout_ready === true;
      const created = await createClass({
        title: String(form.get('title')).trim(),
        price,
        capacity: Number(form.get('capacity')),
        mode,
        is_published: isPublished,
        ...(mode === 'offline' || mode === 'hybrid' ? { venue: String(form.get('venue') ?? '').trim() } : {}),
        sessions: [{ starts_at: new Date(startsAt).toISOString(), duration_minutes: 120 }],
      });
      setClassesPage(1);
      setSelectedClassId(created.id);
      await invalidateDashboard();
      setActiveDialog(null);
      setToast({ kind: 'success', message: isPublished ? 'Class created and published.' : 'Class draft created. Add payout details to publish paid classes.' });
    } catch (createError) {
      setClassError(createError instanceof Error ? createError.message : 'Could not create this class.');
    }
  };

  const saveClassAttendance = async () => {
    if (!nextSession) {
      setToast({ kind: 'error', message: 'Add a session date before taking attendance.' });
      return;
    }
    setActionBookingId(-1);
    try {
      await saveAttendance(
        nextSession.id,
        activeBookings.map((booking) => ({
          booking: booking.id,
          present: attendanceMarks[booking.id] ?? false,
        })),
      );
      setToast({ kind: 'success', message: 'Attendance saved.' });
      setActiveDialog(null);
      setAttendanceMarks({});
    } catch (attendanceError) {
      setToast({
        kind: 'error',
        message: attendanceError instanceof Error ? attendanceError.message : 'Could not save attendance.',
      });
    } finally {
      setActionBookingId(null);
    }
  };

  const startPaymentForFirstUnpaid = () => {
    const booking = bookings.find((item) => Number(item.balance) > 0);
    if (!booking) {
      setToast({ kind: 'error', message: 'There are no outstanding payments for this class.' });
      return;
    }
    setPaymentBooking(booking);
    setPaymentAmount(String(booking.balance));
    setPaymentError('');
  };

  const startAttendance = () => {
    setAttendanceMarks(Object.fromEntries(activeBookings.map((booking) => [booking.id, false])));
    setActiveDialog('attendance');
  };

  const logout = () => {
    clearAuthSession();
    window.location.assign('/');
  };

  if (!hasAuthToken) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="dashboard-shell">
      <aside className={`dashboard-sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <a className="dashboard-brand" href="/dashboard/" aria-label="TuitEase dashboard">
          <img src="/assets/tuitease-logo.png" alt="TuitEase main logo" />
        </a>
        <nav className="dashboard-nav" aria-label="Primary navigation">
          <a href="/dashboard/" className="is-active" aria-current="page" onClick={() => setSidebarOpen(false)}>
            <NavIcon name="home" />Home
          </a>
          <a href="/classes/" onClick={() => setSidebarOpen(false)}>
            <NavIcon name="classes" />Classes
          </a>
          <a href="/students/" onClick={() => setSidebarOpen(false)}>
            <NavIcon name="students" />Students
          </a>
          <a href="/messages/" onClick={() => setSidebarOpen(false)}>
            <NavIcon name="messages" />Messages
          </a>
          <a href="/payments/" onClick={() => setSidebarOpen(false)}>
            <NavIcon name="payments" />Payments
          </a>
          <a href="/settings/" onClick={() => setSidebarOpen(false)}>
            <NavIcon name="settings" />Settings
          </a>
        </nav>
        <div className="dashboard-sidebar-account">
          <span className="dashboard-avatar">{initials(host?.business_name ?? 'Host')}</span>
          <span className="dashboard-account-copy">
            <strong>{host?.business_name ?? 'Your account'}</strong>
            <small>{host?.email ?? ''}</small>
          </span>
          <button className="dashboard-account-menu" type="button" onClick={logout} aria-label="Log out">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 17l5-5-5-5M15 12H3M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" />
            </svg>
            <span>Log out</span>
          </button>
        </div>
      </aside>
      {sidebarOpen && (
        <button className="dashboard-backdrop" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="dashboard-main" id="dashboard-top">
        <header className="dashboard-header">
          <button
            className="dashboard-menu-button"
            type="button"
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className="dashboard-welcome">
            <p className="dashboard-overline">HOST WORKSPACE</p>
            <h1>{greeting}, {firstName(host?.business_name ?? '')}</h1>
            <p>
              <time dateTime={now.toISOString()}>
                {new Intl.DateTimeFormat('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now)}
              </time>
              <span className="dashboard-welcome-separator">·</span>
              <span className="dashboard-welcome-context">Here is where your classes stand.</span>
            </p>
          </div>
          <button className="dashboard-primary" type="button" onClick={() => window.location.assign('/classes/new/')}>
            Create a class <span aria-hidden="true">+</span>
          </button>

        </header>

        {error && (
          <div className="dashboard-error" role="alert">
            <span>{error instanceof Error ? error.message : 'We could not load your dashboard.'}</span>
            <button type="button" onClick={() => void Promise.all([hostQuery.refetch(), overviewQuery.refetch(), classesQuery.refetch(), bookingsQuery.refetch()])}>Try again</button>
          </div>
        )}

        {(hostQuery.isLoading || overviewQuery.isLoading || classesQuery.isLoading) && !error ? (
          <DashboardSkeleton />
        ) : (
          <>
            {host && !host.payout_ready && (
              <section className="payout-banner" id="payout-settings" aria-labelledby="payout-heading">
                <div className="payout-banner-mark" aria-hidden="true">₦</div>
                <div>
                  <h2 id="payout-heading">Add your payout account to start receiving money</h2>
                  <p>You can build classes now. Paid classes go live once your bank account is added.</p>
                </div>
                <a href="/settings/?section=payout">Add payout account <span aria-hidden="true">→</span></a>
              </section>
            )}

            {overview && (
              <>
                <section className="dashboard-stats" id="dashboard-overview" aria-label="Host performance">
                  <StatTile label="Collected" value={money(overview.stats.collected)} detail={`of ${money(overview.stats.expected)} expected`} />
                  <StatTile label="Still outstanding" value={money(overview.stats.outstanding)} detail={`across ${overview.stats.outstanding_students} students`} />
                  <StatTile label="Active students" value={String(overview.stats.active_students)} detail={`${overview.stats.waitlisted} on a waiting list`} />
                  <StatTile label="At risk this week" value={String(overview.stats.at_risk)} detail="may not show up" emphasized />
                </section>

                <section className="dashboard-top-grid">
                  <article className="dashboard-card risk-card" aria-labelledby="risk-heading">
                    <div className="section-heading">
                      <div><p className="dashboard-overline">A LITTLE FOLLOW-UP GOES A LONG WAY</p><h2 id="risk-heading">Who may not show up</h2></div>
                      <a href="#class-panel" className="text-link">See all</a>
                    </div>
                    {overview.at_risk.length ? (
                      <>
                        <div className="risk-list">
                          {overview.at_risk.slice(0, 3).map((item) => {
                            const hasBalance = item.reasons.some((reason) => reason.startsWith('owes'));
                            return (
                              <div className="risk-row" key={item.booking}>
                                <span className="risk-avatar">{initials(item.student)}</span>
                                <div className="risk-student"><strong>{item.student}</strong><span>{item.class} · {item.reasons.join(', ')}</span></div>
                                <button
                                  className="button-secondary risk-action"
                                  type="button"
                                  disabled={actionBookingId === item.booking}
                                  onClick={() => void handleRiskAction(item.booking, item.student, hasBalance)}
                                >
                                  {actionBookingId === item.booking ? 'Sending…' : hasBalance ? 'Send payment link' : 'Send reminder'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                        {overview.at_risk.length > 3 && <a className="risk-more" href="#class-panel">and {overview.at_risk.length - 3} more students</a>}
                      </>
                    ) : (
                      <div className="empty-inline"><strong>Everyone is looking good.</strong><span>No students need a follow-up right now.</span></div>
                    )}
                  </article>

                  <article className="summary-card" id="morning-summary" aria-labelledby="summary-heading">
                    <div className="summary-heading-row">
                      <span className="summary-icon" aria-hidden="true">↗</span>
                      <span className="summary-label">YOUR DAILY WHATSAPP</span>
                    </div>
                    <h2 id="summary-heading">Tomorrow’s morning summary</h2>
                    <p className="summary-caption">Sent to you every morning at {summaryTime}</p>
                    <pre>{overview.summary_preview}</pre>
                  </article>
                </section>
              </>
            )}

            {classesQuery.isError ? (
              <section className="class-empty-state dashboard-classes-error" role="alert">
                <strong>{classesQuery.error instanceof Error ? classesQuery.error.message : 'Could not load your classes.'}</strong>
                <p>Try loading your classes again.</p>
                <button className="button-secondary" type="button" onClick={() => void classesQuery.refetch()}>Retry</button>
              </section>
            ) : !classes.length ? (
              <section className="dashboard-empty-state">
                <span className="empty-state-icon" aria-hidden="true">▤</span>
                <p className="dashboard-overline">YOUR FIRST CLASS IS A FEW DETAILS AWAY</p>
                <h2>Create your first class</h2>
                <p>Set a date, choose how people can join, and share a booking link with your community.</p>
                <button className="dashboard-primary" type="button" onClick={() => window.location.assign('/classes/new/')}>Create a class <span aria-hidden="true">+</span></button>

              </section>
            ) : (
              <>
                <section className="dashboard-card class-panel" id="class-panel" aria-labelledby="class-heading">
                  <div className="class-panel-heading">
                    <div>
                      <p className="dashboard-overline">YOUR CLASS AT A GLANCE</p>
                      <h2 id="class-heading">{activeClass?.title ?? 'Your classes'}</h2>
                      {activeClass && (
                        <p className="class-meta">
                          {dateTime(nextSession?.starts_at)} <span>·</span> {activeClass.mode} <span>·</span> {money(activeClass.price, activeClass.currency)} <span>·</span> {seatsTaken} of {activeClass.capacity} seats taken
                        </p>
                      )}
                    </div>
                    <div className="class-tools">
                      <label className="visually-hidden" htmlFor="class-selector">Select a class</label>
                      <select id="class-selector" value={selectedClassId ?? ''} onChange={(event) => { setSelectedClassId(Number(event.target.value)); setFilter('all'); }}>
                        {classes.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                      </select>
                      {classPageCount > 1 && (
                        <nav className="class-pager" aria-label="Class list pagination">
                          <button
                            type="button"
                            className="button-secondary"
                            aria-label="Previous classes"
                            disabled={classesPage <= 1 || classesQuery.isFetching}
                            onClick={() => setClassesPage((page) => Math.max(1, page - 1))}
                          >
                            Previous
                          </button>
                          <span>Page {classesPage} of {classPageCount}</span>
                          <button
                            type="button"
                            className="button-secondary"
                            aria-label="Next classes"
                            disabled={classesPage >= classPageCount || classesQuery.isFetching}
                            onClick={() => setClassesPage((page) => Math.min(classPageCount, page + 1))}
                          >
                            Next
                          </button>
                        </nav>
                      )}
                      {activeClass && <button className="button-secondary" type="button" onClick={() => void copyBookingLink(activeClass)}>Copy booking link</button>}
                      <button className="button-export" type="button" onClick={exportCsv}>Export CSV</button>
                    </div>
                  </div>

                  {bookingsQuery.isLoading ? <BookingSkeleton /> : bookingsQuery.error ? (
                    <div className="class-empty-state" role="alert">
                      <strong>{bookingsQuery.error instanceof Error ? bookingsQuery.error.message : 'Could not load this class roster.'}</strong>
                      <p>Try loading the students again.</p>
                      <button className="button-secondary" type="button" onClick={() => void bookingsQuery.refetch()}>Retry</button>
                    </div>
                  ) : !bookings.length ? (
                    <div className="class-empty-state">
                      <strong>Share your booking link to get your first student.</strong>
                      <p>Once students book, you’ll see payment and seat updates here.</p>
                      {activeClass && <button className="button-secondary" type="button" onClick={() => void copyBookingLink(activeClass)}>Copy booking link</button>}
                    </div>
                  ) : (
                    <>
                      <div className="filter-row" aria-label="Filter students">
                        {FILTERS.map(({ id, label }) => (
                          <button
                            key={id}
                            type="button"
                            className={`filter-chip${filter === id ? ' is-active' : ''}`}
                            aria-pressed={filter === id}
                            onClick={() => setFilter(id)}
                          >
                            {label} <span>{filterBookings(bookings, id).length}</span>
                          </button>
                        ))}
                      </div>
                      <div className="student-table-wrap">
                        <table className="student-table">
                          <thead><tr><th scope="col">Student</th><th scope="col">Payment</th><th scope="col">Balance</th><th scope="col">Seat</th><th scope="col">Actions</th></tr></thead>
                          <tbody>
                            {visibleBookings.map((booking) => (
                              <StudentRow
                                key={booking.id}
                                booking={booking}
                                busy={actionBookingId === booking.id}
                                onRemind={() => void handleAction(booking, 'remind')}
                                onLink={() => void handleAction(booking, 'link')}
                                onMarkPaid={() => { setPaymentBooking(booking); setPaymentAmount(String(booking.balance)); setPaymentError(''); }}
                                onCancel={() => setCancelTarget(booking)}
                              />
                            ))}
                          </tbody>
                        </table>
                        {!visibleBookings.length && <p className="filter-empty">No students match this filter.</p>}
                      </div>
                    </>
                  )}
                </section>

                <section className="helper-grid" id="payments" aria-label="Class tools">
                  <article className="helper-card">
                    <span className="helper-icon" aria-hidden="true">₦</span>
                    <div><h2>Record a payment</h2><p>Log cash or bank transfer payments and keep balances up to date.</p></div>
                    <button className="button-secondary" type="button" onClick={startPaymentForFirstUnpaid}>Record payment <span aria-hidden="true">→</span></button>
                  </article>
                  <article className="helper-card">
                    <span className="helper-icon helper-icon-blue" aria-hidden="true">✓</span>
                    <div><h2>Take attendance on the day</h2><p>Mark who showed up so your class records stay complete.</p></div>
                    <button className="button-secondary" type="button" onClick={startAttendance}>Take attendance <span aria-hidden="true">→</span></button>
                  </article>
                </section>
              </>
            )}
          </>
        )}
      </main>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      {paymentBooking && (
        <div className="dashboard-modal-backdrop" role="presentation">
          <section className="dashboard-modal" role="dialog" aria-modal="true" aria-labelledby="payment-dialog-title">
            <button className="modal-close" type="button" aria-label="Close" onClick={() => setPaymentBooking(null)}>×</button>
            <p className="dashboard-overline">RECORD A PAYMENT</p>
            <h2 id="payment-dialog-title">Payment from {paymentBooking.student_name}</h2>
            <p className="modal-description">Outstanding balance: <strong>{money(paymentBooking.balance)}</strong></p>
            <form onSubmit={(event) => void submitPayment(event)}>
              <label className="dialog-label" htmlFor="payment-amount">Amount received (₦)</label>
              <input id="payment-amount" type="number" min="0.01" step="0.01" value={paymentAmount} onChange={(event) => { setPaymentAmount(event.target.value); setPaymentError(''); }} required />
              {paymentError && <p className="dialog-error" role="alert">{paymentError}</p>}
              <div className="dialog-actions"><button type="button" className="button-secondary" onClick={() => setPaymentBooking(null)}>Back</button><button className="dashboard-primary" type="submit" disabled={actionBookingId === paymentBooking.id}>{actionBookingId === paymentBooking.id ? 'Saving…' : 'Save payment'}</button></div>
            </form>
          </section>
        </div>
      )}
      {cancelTarget && (
        <div className="dashboard-modal-backdrop" role="presentation">
          <section className="dashboard-modal" role="dialog" aria-modal="true" aria-labelledby="cancel-dialog-title">
            <button className="modal-close" type="button" aria-label="Close" onClick={() => setCancelTarget(null)}>×</button>
            <p className="dashboard-overline">CANCEL BOOKING</p>
            <h2 id="cancel-dialog-title">Cancel {cancelTarget.student_name}’s booking?</h2>
            <p className="modal-description">This will release the seat. You can’t undo this action from the dashboard.</p>
            <div className="dialog-actions"><button className="button-secondary" type="button" onClick={() => setCancelTarget(null)}>Keep booking</button><button className="button-danger" type="button" disabled={actionBookingId === cancelTarget.id} onClick={() => void confirmCancel()}>{actionBookingId === cancelTarget.id ? 'Cancelling…' : 'Cancel booking'}</button></div>
          </section>
        </div>
      )}
      {activeDialog === 'attendance' && (
        <div className="dashboard-modal-backdrop" role="presentation">
          <section className="dashboard-modal attendance-modal" role="dialog" aria-modal="true" aria-labelledby="attendance-dialog-title">
            <button className="modal-close" type="button" aria-label="Close" onClick={() => setActiveDialog(null)}>×</button>
            <p className="dashboard-overline">CLASS ROSTER</p>
            <h2 id="attendance-dialog-title">Take attendance</h2>
            <p className="modal-description">{activeClass?.title} · {dateTime(nextSession?.starts_at)}</p>
            {!activeBookings.length ? <p className="class-empty-state">There are no booked students to mark.</p> : (
              <div className="attendance-list">
                {activeBookings.map((booking) => (
                  <label key={booking.id} className="attendance-student">
                    <span><strong>{booking.student_name}</strong><small>{booking.student_phone}</small></span>
                    <span className="attendance-toggle-label">{attendanceMarks[booking.id] ? 'Present' : 'Absent'}</span>
                    <input type="checkbox" checked={attendanceMarks[booking.id] ?? false} onChange={(event) => setAttendanceMarks((current) => ({ ...current, [booking.id]: event.target.checked }))} aria-label={`${booking.student_name} present`} />
                  </label>
                ))}
              </div>
            )}
            <div className="dialog-actions"><button className="button-secondary" type="button" onClick={() => setActiveDialog(null)}>Close</button><button className="dashboard-primary" type="button" disabled={!activeBookings.length || actionBookingId === -1} onClick={() => void saveClassAttendance()}>{actionBookingId === -1 ? 'Saving…' : 'Save attendance'}</button></div>
          </section>
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, detail, emphasized = false }: { label: string; value: string; detail: string; emphasized?: boolean }) {
  return (
    <article className={`stat-tile${emphasized ? ' is-emphasized' : ''}`}>
      <span>{label}</span><strong>{value}</strong><small>{detail}</small>
    </article>
  );
}

function StatusChip({ kind, children }: { kind: 'paid' | 'part-paid' | 'unpaid' | 'confirmed' | 'no-response' | 'waitlisted'; children: string }) {
  return <span className={`status-chip status-${kind}`}>{children}</span>;
}

function StudentRow({
  booking,
  busy,
  onRemind,
  onLink,
  onMarkPaid,
  onCancel,
}: {
  booking: ClassBooking;
  busy: boolean;
  onRemind: () => void;
  onLink: () => void;
  onMarkPaid: () => void;
  onCancel: () => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const isWaitlisted = booking.status === 'waitlisted';
  const paymentKind = booking.payment_state === 'part_paid' ? 'part-paid' : booking.payment_state;
  return (
    <tr>
      <td data-label="Student"><div className="student-name-cell"><span className="student-initial">{initials(booking.student_name)}</span><span><strong>{booking.student_name}</strong><small>{booking.student_phone}</small></span></div></td>
      <td data-label="Payment"><StatusChip kind={paymentKind}>{paymentLabel(booking.payment_state)}</StatusChip></td>
      <td data-label="Balance" className="balance-cell">{money(booking.balance)}</td>
      <td data-label="Seat"><StatusChip kind={isWaitlisted ? 'waitlisted' : booking.confirmed ? 'confirmed' : 'no-response'}>{isWaitlisted ? 'Waitlisted' : booking.confirmed ? 'Confirmed' : 'No response'}</StatusChip></td>
      <td data-label="Actions">
        <div className="student-actions">
          {Number(booking.balance) > 0 && <button className="table-action" type="button" disabled={busy} onClick={onLink}>Send link</button>}
          {Number(booking.balance) > 0 && <button className="table-action table-action-solid" type="button" disabled={busy} onClick={onMarkPaid}>Mark paid</button>}
          {booking.payment_state === 'paid' && !booking.confirmed && !isWaitlisted && <button className="table-action" type="button" disabled={busy} onClick={onRemind}>Remind</button>}
          <div className="row-menu">
            <button className="row-menu-button" type="button" aria-label={`More actions for ${booking.student_name}`} aria-expanded={actionsOpen} onClick={() => setActionsOpen((open) => !open)}>···</button>
            {actionsOpen && <div className="row-menu-popover"><button type="button" onClick={() => { setActionsOpen(false); onCancel(); }}>Cancel booking</button></div>}
          </div>
        </div>
      </td>
    </tr>
  );
}

function Toast({ toast, onDismiss }: { toast: Exclude<ToastState, null>; onDismiss: () => void }) {
  return (
    <div className={`dashboard-toast toast-${toast.kind}`} role={toast.kind === 'error' ? 'alert' : 'status'}>
      <span>{toast.message}</span><button type="button" aria-label="Dismiss notification" onClick={onDismiss}>×</button>
    </div>
  );
}


function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-label="Loading dashboard" role="status">
      <span className="visually-hidden">Loading your dashboard…</span>
      <div className="skeleton-line skeleton-title" /><div className="skeleton-line skeleton-subtitle" />
      <div className="skeleton-stats">{[1, 2, 3, 4].map((item) => <div className="skeleton-block" key={item} />)}</div>
      <div className="skeleton-top"><div className="skeleton-block" /><div className="skeleton-block" /></div>
      <div className="skeleton-block skeleton-table" />
    </div>
  );
}

function BookingSkeleton() {
  return <div className="booking-skeleton" role="status" aria-label="Loading students">{[1, 2, 3].map((item) => <span key={item} />)}</div>;
}
