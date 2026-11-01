import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClassStudent, HostClassRecord } from '../api';
import { SessionsTab } from './SessionsTab';

const cls: HostClassRecord = {
  id: 4,
  title: 'Python for Beginners',
  slug: 'python-for-beginners',
  description: '',
  price: '20000.00',
  capacity: 30,
  currency: 'NGN',
  mode: 'offline',
  meeting_link: '',
  venue: 'Yaba, Lagos',
  venue_map_link: '',
  group_link: '',
  is_published: true,
  waitlist_enabled: false,
  allow_installments: false,
  installment_count: 1,
  installment_interval_days: 0,
  require_seat_confirmation: false,
  sessions: [
    {
      id: 10,
      number: 1,
      starts_at: '2020-01-05T09:00:00+01:00',
      duration_minutes: 120,
      venue: 'Yaba, Lagos',
      meeting_link: '',
    },
  ],
  seats: { capacity: 30, seats_left: 18, booked: 12, waitlist: 0, is_full: false },
  status: 'live',
  next_session: null,
  flags: [],
};

const student: ClassStudent = {
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
  session_attendance: [{ session_id: 10, session_number: 1, class_id: 4 }],
};

describe('SessionsTab attendance history', () => {
  afterEach(cleanup);

  it('pre-ticks marks saved on an earlier visit', () => {
    render(
      <SessionsTab
        cls={cls}
        students={[student]}
        timeZone="Africa/Lagos"
        ended={false}
        loading={false}
        marks={{}}
        history={{ '10:100': true }}
        savingKey={null}
        onToggle={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Take attendance' }));

    const checkbox = screen.getByRole('checkbox', { name: /Tolu Kareem/i });
    expect(checkbox).toBeChecked();
    expect(screen.getByText('Present')).toBeInTheDocument();
  });

  it('leaves a held session unmarked until attendance is taken', () => {
    render(
      <SessionsTab
        cls={cls}
        students={[{ ...student, session_attendance: [] }]}
        timeZone="Africa/Lagos"
        ended={false}
        loading={false}
        marks={{}}
        history={{}}
        savingKey={null}
        onToggle={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Take attendance' }));

    expect(screen.getByRole('checkbox', { name: /Tolu Kareem/i })).not.toBeChecked();
    expect(screen.getByText('Not marked')).toBeInTheDocument();
  });

  it('ignores history for sessions that no longer exist', () => {
    render(
      <SessionsTab
        cls={cls}
        students={[student]}
        timeZone="Africa/Lagos"
        ended={false}
        loading={false}
        marks={{}}
        history={{ '999:100': true }}
        savingKey={null}
        onToggle={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Take attendance' }));

    expect(screen.getByRole('checkbox', { name: /Tolu Kareem/i })).not.toBeChecked();
  });
});
