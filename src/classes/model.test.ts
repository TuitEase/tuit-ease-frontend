import { describe, expect, it } from 'vitest';
import type { ClassStudent, ClassTotals, HostClassRecord, PendingInstallment } from './api';
import { todayKey } from '../lib/datetime';
import {
  ALL_DETAIL_TABS,
  attendanceHistory,
  bookingStatusLabel,
  capacityOf,
  classDetailUrl,
  classFlags,
  classMetaLine,
  classScheduleLabel,
  classState,
  classTotalsFor,
  duplicateDraft,
  durationLabel,
  editClassUrl,
  filterAndSortClasses,
  filterStudents,
  isPaidClass,
  matchesSearch,
  modeBadgeLabel,
  modeLabel,
  nextTab,
  paymentStateLabel,
  pendingForClass,
  publicClassUrl,
  seatUsage,
  seatsLeftText,
  seatsText,
  sessionCountLabel,
  sessionLocation,
  sessionState,
  sortKeyLabel,
  statusCounts,
  studentAggregates,
  studentUrl,
  tabFromHash,
  tabsForClass,
} from './model';

const FUTURE_SESSION = {
  id: 10,
  number: 1,
  starts_at: '2030-01-05T09:00:00+01:00',
  duration_minutes: 120,
  meeting_link: null,
  venue: null,
};

const PAST_SESSION = {
  id: 11,
  number: 2,
  starts_at: '2020-03-10T18:00:00+01:00',
  duration_minutes: 90,
  meeting_link: null,
  venue: null,
};

function makeClass(overrides: Partial<HostClassRecord> = {}): HostClassRecord {
  const base: HostClassRecord = {
    id: 1,
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
    sessions: [FUTURE_SESSION],
    seats: { capacity: 30, seats_left: 18, booked: 12, waitlist: 2, is_full: false },
    status: 'live',
    next_session: FUTURE_SESSION,
    flags: [],
  };
  return { ...base, ...overrides };
}

function makeStudent(overrides: Partial<ClassStudent> = {}): ClassStudent {
  return {
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
    ...overrides,
  };
}

function makePending(overrides: Partial<PendingInstallment> = {}): PendingInstallment {
  return {
    id: 1,
    booking_id: 1,
    amount: '5000.00',
    due_date: '2026-10-01',
    student_name: 'Tolu Kareem',
    student_id: 7,
    class_name: 'Python for Beginners',
    class_id: 1,
    ...overrides,
  };
}

describe('class state and labels', () => {
  it('treats unpublished classes as drafts even when the status says ended', () => {
    expect(classState(makeClass({ is_published: false, status: 'ended' }))).toBe('draft');
    expect(classState(makeClass({ is_published: true, status: 'ended' }))).toBe('ended');
    expect(classState(makeClass({ is_published: true, status: 'live' }))).toBe('live');
  });

  it('derives paid/free from the price', () => {
    expect(isPaidClass(makeClass({ price: '20000.00' }))).toBe(true);
    expect(isPaidClass(makeClass({ price: '0' }))).toBe(false);
    expect(isPaidClass(makeClass({ price: '' }))).toBe(false);
  });

  it('formats the mode, session count and duration', () => {
    expect(modeLabel('online')).toBe('Online');
    expect(modeLabel('offline')).toBe('In person');
    expect(modeLabel('hybrid')).toBe('Online + in person');
    expect(modeBadgeLabel('online')).toBe('Online');
    expect(modeBadgeLabel('offline')).toBe('Offline');
    expect(modeBadgeLabel('hybrid')).toBe('Hybrid');
    expect(sessionCountLabel(0)).toBe('No sessions yet');
    expect(sessionCountLabel(1)).toBe('1 session');
    expect(sessionCountLabel(4)).toBe('4 sessions');
    expect(durationLabel(90)).toBe('1 hr 30 min');
    expect(durationLabel(60)).toBe('1 hour');
    expect(durationLabel(120)).toBe('2 hours');
    expect(durationLabel(1)).toBe('1 minute');
    expect(durationLabel(45)).toBe('45 minutes');
  });

  it('labels the schedule for drafts, live classes and ended classes', () => {
    expect(classScheduleLabel(makeClass({ is_published: false }), 'Africa/Lagos')).toBe(
      'Starts Sat, 5 Jan · 9:00 AM',
    );
    expect(classScheduleLabel(makeClass(), 'Africa/Lagos')).toBe('Next Sat, 5 Jan · 9:00 AM');
    expect(
      classScheduleLabel(
        makeClass({ status: 'ended', sessions: [PAST_SESSION], next_session: null }),
        'Africa/Lagos',
      ),
    ).toBe('Ended 10 Mar');
    expect(classScheduleLabel(makeClass({ is_published: false, sessions: [] }), 'Africa/Lagos')).toBe('Dates not set');
    expect(classScheduleLabel(makeClass({ status: 'ended', sessions: [] }), 'Africa/Lagos')).toBe('Ended');
    expect(classScheduleLabel(makeClass({ next_session: null }), 'Africa/Lagos')).toBe(
      'Next Sat, 5 Jan · 9:00 AM',
    );
  });

  it('joins mode, session count and schedule into a meta line', () => {
    expect(classMetaLine(makeClass(), 'Africa/Lagos')).toBe(
      'Online · 1 session · Next Sat, 5 Jan · 9:00 AM',
    );
  });

  it('labels sort keys', () => {
    expect(sortKeyLabel('next-session')).toBe('Next session');
    expect(sortKeyLabel('newest')).toBe('Newest first');
    expect(sortKeyLabel('title')).toBe('Title A–Z');
    expect(sortKeyLabel('price-desc')).toBe('Price high to low');
    expect(sortKeyLabel('students')).toBe('Most students');
  });
});

describe('seats', () => {
  it('reports a limited capacity with a fill percentage', () => {
    const cls = makeClass();
    expect(capacityOf(cls)).toBe(30);
    expect(seatUsage(cls)).toEqual({ booked: 12, capacity: 30, left: 18, percent: 40, waitlist: 2 });
    expect(seatsText(cls)).toBe('12 of 30 seats filled');
    expect(seatsLeftText(cls)).toBe('18 of 30 left');
  });

  it('normalises the documented unlimited sentinel to null', () => {
    const cls = makeClass({
      capacity: 999_999,
      seats: { capacity: 999_999, seats_left: 0, booked: 12, waitlist: 0, is_full: false },
    });
    expect(capacityOf(cls)).toBeNull();
    expect(seatUsage(cls)).toEqual({ booked: 12, capacity: null, left: null, percent: 0, waitlist: 0 });
    expect(seatsText(cls)).toBe('12 booked · Unlimited seats');
    expect(seatsLeftText(cls)).toBe('Unlimited');
  });

  it('says Full when every seat is taken and clamps overbooking', () => {
    const full = makeClass({ seats: { capacity: 10, seats_left: 0, booked: 10, waitlist: 0, is_full: true } });
    expect(seatUsage(full)).toEqual({ booked: 10, capacity: 10, left: 0, percent: 100, waitlist: 0 });
    expect(seatsLeftText(full)).toBe('Full');

    const over = makeClass({ capacity: 10, seats: { capacity: 10, seats_left: 0, booked: 14, waitlist: 0, is_full: true } });
    expect(seatUsage(over)).toMatchObject({ left: 0, percent: 100 });
  });
});

describe('URLs', () => {
  it('builds detail, edit and student URLs from ids', () => {
    expect(classDetailUrl(42)).toBe('/classes/detail/?id=42');
    expect(editClassUrl(42)).toBe('/classes/new/basics/?id=42');
    expect(studentUrl(7)).toBe('/students/7/');
  });

  it('uses the documented /class/<slug>/ public route on a configured base', () => {
    expect(publicClassUrl('python for beginners')).toBe(
      `${window.location.origin}/class/python%20for%20beginners/`,
    );
  });
});

describe('filterAndSortClasses', () => {
  const live = makeClass({ id: 1, title: 'Zulu Masterclass', price: '50000', seats: { capacity: 40, seats_left: 10, booked: 30, waitlist: 0, is_full: false } });
  const draft = makeClass({ id: 2, title: 'Arduino Basics', price: '0', is_published: false, seats: { capacity: 20, seats_left: 20, booked: 0, waitlist: 0, is_full: false } });
  const ended = makeClass({ id: 3, title: 'Marketing 101', price: '10000', status: 'ended', seats: { capacity: 20, seats_left: 5, booked: 15, waitlist: 0, is_full: false } });
  const all = [live, draft, ended];

  const base = { status: 'all' as const, type: 'all' as const, query: '', sort: 'newest' as const };

  it('filters by lifecycle status', () => {
    expect(filterAndSortClasses(all, { ...base, status: 'published' }).map((cls) => cls.id)).toEqual([1]);
    expect(filterAndSortClasses(all, { ...base, status: 'draft' }).map((cls) => cls.id)).toEqual([2]);
    expect(filterAndSortClasses(all, { ...base, status: 'ended' }).map((cls) => cls.id)).toEqual([3]);
  });

  it('filters free and paid classes', () => {
    expect(filterAndSortClasses(all, { ...base, type: 'free' }).map((cls) => cls.id)).toEqual([2]);
    expect(filterAndSortClasses(all, { ...base, type: 'paid' }).map((cls) => cls.id)).toEqual([1, 3]);
  });

  it('matches every search word against title, description, slug and place', () => {
    expect(filterAndSortClasses(all, { ...base, query: 'arduino' }).map((cls) => cls.id)).toEqual([2]);
    expect(filterAndSortClasses(all, { ...base, query: 'learn python' }).map((cls) => cls.id)).toEqual([1, 2, 3]);
    expect(filterAndSortClasses(all, { ...base, query: 'marketing python' }).map((cls) => cls.id)).toEqual([3]);
    expect(filterAndSortClasses(all, { ...base, query: 'nothing here' })).toEqual([]);
  });

  it('finds a class by the venue students will attend', () => {
    const atVenue = makeClass({ id: 9, venue: 'Yaba, Lagos Studio 4', mode: 'offline' });
    expect(matchesSearch(atVenue, 'yaba')).toBe(true);
    expect(matchesSearch(atVenue, 'lagos studio')).toBe(true);
  });

  it('sorts by title, price and booked seats', () => {
    expect(filterAndSortClasses(all, { ...base, sort: 'title' }).map((cls) => cls.id)).toEqual([2, 3, 1]);
    expect(filterAndSortClasses(all, { ...base, sort: 'price-desc' }).map((cls) => cls.id)).toEqual([1, 3, 2]);
    expect(filterAndSortClasses(all, { ...base, sort: 'students' }).map((cls) => cls.id)).toEqual([1, 3, 2]);
  });

  it('keeps the API order for the default newest sort', () => {
    expect(filterAndSortClasses(all, base).map((cls) => cls.id)).toEqual([1, 2, 3]);
  });

  it('sorts by the soonest upcoming session, with dateless classes last', () => {
    const soon = makeClass({
      id: 4,
      sessions: [{ ...FUTURE_SESSION, id: 41, starts_at: '2030-01-01T09:00:00+01:00' }],
      next_session: { ...FUTURE_SESSION, id: 41, starts_at: '2030-01-01T09:00:00+01:00' },
    });
    const later = makeClass({
      id: 5,
      sessions: [{ ...FUTURE_SESSION, id: 51, starts_at: '2030-02-01T09:00:00+01:00' }],
      next_session: { ...FUTURE_SESSION, id: 51, starts_at: '2030-02-01T09:00:00+01:00' },
    });
    const dateless = makeClass({ id: 6, sessions: [], next_session: null });

    expect(
      filterAndSortClasses([dateless, later, soon], { ...base, sort: 'next-session' }).map((cls) => cls.id),
    ).toEqual([4, 5, 6]);
  });

  it('counts every status chip, respecting type and search', () => {
    expect(statusCounts(all, { type: 'all', query: '' })).toEqual({
      all: 3,
      published: 1,
      draft: 1,
      ended: 1,
    });
    expect(statusCounts(all, { type: 'paid', query: '' })).toEqual({
      all: 2,
      published: 1,
      draft: 0,
      ended: 1,
    });
    expect(statusCounts(all, { type: 'all', query: 'arduino' })).toEqual({
      all: 1,
      published: 0,
      draft: 1,
      ended: 0,
    });
  });
});

describe('detail tabs', () => {
  it('shows only Overview for a draft', () => {
    expect(tabsForClass(makeClass({ is_published: false }))).toEqual(['overview']);
  });

  it('hides Payments for a free class', () => {
    expect(tabsForClass(makeClass({ price: '0' }))).toEqual(ALL_DETAIL_TABS.filter((tab) => tab !== 'payments'));
  });

  it('shows every tab for a paid, published class', () => {
    expect(tabsForClass(makeClass())).toEqual(ALL_DETAIL_TABS);
  });

  it('reads a valid tab from the hash and falls back to Overview', () => {
    expect(tabFromHash('#students', ALL_DETAIL_TABS)).toBe('students');
    expect(tabFromHash('#Payments', ALL_DETAIL_TABS)).toBe('payments');
    expect(tabFromHash('#payments', ['overview'])).toBe('overview');
    expect(tabFromHash('', ALL_DETAIL_TABS)).toBe('overview');
  });

  it('wraps keyboard navigation around the tab list', () => {
    expect(nextTab(ALL_DETAIL_TABS, 'overview', -1)).toBe('share');
    expect(nextTab(ALL_DETAIL_TABS, 'share', 1)).toBe('overview');
    expect(nextTab(ALL_DETAIL_TABS, 'students', 1)).toBe('sessions');
    expect(nextTab([], 'overview', 1)).toBe('overview');
  });
});

describe('sessions', () => {
  const now = new Date('2026-10-30T12:00:00+01:00');

  it('classifies sessions as today, upcoming or past in the host timezone', () => {
    expect(sessionState('2026-10-30T18:00:00+01:00', 'Africa/Lagos', now)).toBe('today');
    expect(sessionState('2026-11-02T09:00:00+01:00', 'Africa/Lagos', now)).toBe('upcoming');
    expect(sessionState('2026-10-20T09:00:00+01:00', 'Africa/Lagos', now)).toBe('past');
    expect(sessionState('not-a-date', 'Africa/Lagos', now)).toBe('upcoming');
  });

  it('uses the session venue before the class venue and respects the mode', () => {
    const online = makeClass();
    expect(sessionLocation(online, { venue: 'Lagos' })).toBe('Online');

    const offline = makeClass({ mode: 'offline', venue: 'Yaba Hall' });
    expect(sessionLocation(offline, {})).toBe('Yaba Hall');
    expect(sessionLocation(offline, { venue: 'Ikeja Hub' })).toBe('Ikeja Hub');
    expect(sessionLocation(makeClass({ mode: 'offline', venue: '' }), {})).toBe('Venue to be added');

    const hybrid = makeClass({ mode: 'hybrid' });
    expect(sessionLocation(hybrid, { venue: 'Yaba Hall' })).toBe('In person · Yaba Hall');
    expect(sessionLocation(hybrid, {})).toBe('Online');
  });
});

describe('student aggregates and filters', () => {
  const students: ClassStudent[] = [
    makeStudent(),
    makeStudent({ id: 101, student_id: 8, student_name: 'Ada Obi', student_phone: '0803', status: 'pending_payment', amount_paid: '10000', balance: '10000', payment_state: 'part_paid', confirmed: false }),
    makeStudent({ id: 102, student_id: 9, student_name: 'Bola Ade', student_phone: '0804', status: 'waitlisted', amount_due: '0', amount_paid: '0', balance: '0', payment_state: 'unpaid' }),
    makeStudent({ id: 103, student_id: 10, student_name: 'Cancelled Person', student_phone: '0805', status: 'cancelled' }),
  ];

  it('counts seated students and money but excludes waitlisted and cancelled bookings', () => {
    expect(studentAggregates(students)).toEqual({
      students: 2,
      waitlisted: 1,
      collected: 30000,
      outstanding: 10000,
      expected: 40000,
      paid: 1,
      partPaid: 1,
      unpaid: 0,
      unconfirmed: 1,
    });
  });

  it('filters by payment state, confirmation and waitlist', () => {
    expect(filterStudents(students, '', 'all').map((student) => student.id)).toEqual([100, 101, 102]);
    expect(filterStudents(students, '', 'paid').map((student) => student.id)).toEqual([100]);
    expect(filterStudents(students, '', 'part_paid').map((student) => student.id)).toEqual([101]);
    expect(filterStudents(students, '', 'not_confirmed').map((student) => student.id)).toEqual([101]);
    expect(filterStudents(students, '', 'waitlisted').map((student) => student.id)).toEqual([102]);
    expect(filterStudents(students, '0804', 'all').map((student) => student.id)).toEqual([102]);
    expect(filterStudents(students, 'ada', 'all').map((student) => student.id)).toEqual([101]);
    expect(filterStudents(students, 'cancelled', 'all')).toEqual([]);
  });

  it('labels payment and booking states', () => {
    expect(paymentStateLabel('paid')).toBe('Paid');
    expect(paymentStateLabel('part_paid')).toBe('Part-paid');
    expect(paymentStateLabel('unpaid')).toBe('Unpaid');
    expect(bookingStatusLabel('waitlisted')).toBe('Waitlisted');
    expect(bookingStatusLabel('pending_payment')).toBe('Awaiting payment');
    expect(bookingStatusLabel('cancelled')).toBe('Cancelled');
    expect(bookingStatusLabel('active')).toBe('Booked');
  });
});

describe('attendance history', () => {
  it('keys present marks by session id and booking id', () => {
    const students = [
      makeStudent({
        id: 100,
        session_attendance: [
          { session_id: 10, session_number: 1, class_id: 4 },
          { session_id: 11, session_number: 2, class_id: 4 },
        ],
      }),
      makeStudent({ id: 101, session_attendance: [] }),
      makeStudent({ id: 102 }),
    ];

    expect(attendanceHistory(students)).toEqual({
      '10:100': true,
      '11:100': true,
    });
  });

  it('returns an empty map when nobody has been marked present', () => {
    expect(attendanceHistory([makeStudent({ session_attendance: [] })])).toEqual({});
  });
});

describe('class totals and pending instalments', () => {
  const totals: ClassTotals[] = [
    { title: 'Python for Beginners', total_students: 2, is_paid: true, price: '20000.00', total_paid: '30000.00', amount_over_due: '5000.00' },
  ];

  it('matches the class totals row by title and price', () => {
    expect(classTotalsFor(makeClass(), totals)).toEqual({
      total_paid: 30000,
      amount_over_due: 5000,
      total_students: 2,
    });
    expect(classTotalsFor(makeClass({ price: '10000' }), totals)).toBeNull();
    expect(classTotalsFor(makeClass({ title: 'Other' }), totals)).toBeNull();
  });

  it('splits overdue and upcoming instalments for one class', () => {
    const today = todayKey('Africa/Lagos');
    const yesterday = shiftDate(today, -1);
    const nextWeek = shiftDate(today, 7);
    const rows = [
      makePending({ id: 1, amount: '5000', due_date: yesterday }),
      makePending({ id: 2, amount: '3000', due_date: today }),
      makePending({ id: 3, amount: '2000', due_date: nextWeek }),
      makePending({ id: 4, amount: '9000', due_date: yesterday, class_id: 99 }),
    ];

    expect(pendingForClass(rows, 1, 'Africa/Lagos')).toEqual({
      count: 3,
      overdueAmount: 5000,
      upcomingAmount: 5000,
      overdueCount: 1,
    });
  });

  it('maps known class flags and ignores empty ones', () => {
    expect(
      classFlags(
        makeClass({
          flags: [
            { code: 'overdue_instalments', count: 2 },
            { code: 'waitlist', count: 3 },
            { code: 'waitlist', count: 0 },
          ],
        }),
      ),
    ).toEqual([
      { label: '2 overdue', tone: 'warning' },
      { label: '3 on waitlist', tone: 'neutral' },
    ]);
  });
});

describe('duplicate draft', () => {
  it('prefills a copy without the id and drops past sessions', () => {
    const draft = duplicateDraft(
      makeClass({ sessions: [PAST_SESSION, FUTURE_SESSION], next_session: FUTURE_SESSION }),
      'Africa/Lagos',
    );
    expect(draft.title).toBe('Python for Beginners (copy)');
    expect(draft.classId).toBeNull();
    expect(draft.slug).toBe('');
    expect(draft.published).toBe(false);
    expect(draft.sessions).toHaveLength(1);
    expect(draft.sessions[0].date).toBe('2030-01-05');
    expect(draft.sessions[0].serverId).toBeUndefined();
    expect(draft.savedSessionIds).toEqual([]);
  });
});

function shiftDate(dateKeyValue: string, days: number): string {
  const [year, month, day] = dateKeyValue.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}
