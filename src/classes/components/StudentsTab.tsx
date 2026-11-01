import { useMemo, useState } from 'react';
import { formatNaira } from '../../lib/money';
import type { ClassStudent, HostClassRecord } from '../api';
import {
  bookingStatusLabel,
  filterStudents,
  paymentStateLabel,
  studentAggregates,
  studentUrl,
  type StudentFilter,
} from '../model';
import { Avatar, InlineError, Pill, Skeleton } from './ui';

const FILTERS: Array<{ id: StudentFilter; label: string }> = [
  { id: 'all', label: 'All students' },
  { id: 'paid', label: 'Paid' },
  { id: 'part_paid', label: 'Part-paid' },
  { id: 'unpaid', label: 'Unpaid' },
  { id: 'not_confirmed', label: 'Not confirmed' },
  { id: 'waitlisted', label: 'Waitlist' },
];

const FREE_FILTERS: Array<{ id: StudentFilter; label: string }> = [
  { id: 'all', label: 'All students' },
  { id: 'not_confirmed', label: 'Not confirmed' },
  { id: 'waitlisted', label: 'Waitlist' },
];

function paymentTone(state: ClassStudent['payment_state']) {
  if (state === 'paid') return 'paid' as const;
  if (state === 'part_paid') return 'part' as const;
  return 'unpaid' as const;
}

function canRemind(cls: HostClassRecord, student: ClassStudent): boolean {
  if (student.status === 'waitlisted' || student.status === 'cancelled') return false;
  return Number(student.balance) > 0 || (cls.require_seat_confirmation && !student.confirmed);
}

export interface StudentsTabProps {
  cls: HostClassRecord;
  students: ClassStudent[];
  paid: boolean;
  ended: boolean;
  loading: boolean;
  error?: string;
  onRetry: () => void;
  onRemind: (student: ClassStudent) => void;
  remindingId: number | null;
}

export function StudentsTab({
  cls,
  students,
  paid,
  ended,
  loading,
  error,
  onRetry,
  onRemind,
  remindingId,
}: StudentsTabProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StudentFilter>('all');
  const filters = paid ? FILTERS : FREE_FILTERS;
  const aggregates = studentAggregates(students);

  const filtered = useMemo(() => filterStudents(students, query, filter), [students, query, filter]);
  const activeFilter = filters.some((item) => item.id === filter) ? filter : 'all';

  return (
    <div className="tt-tab-body">
      <div className="tt-tab-head">
        <div>
          <h2>Students</h2>
          <p>
            {aggregates.students} booked
            {aggregates.waitlisted ? ` · ${aggregates.waitlisted} waitlisted` : ''}
            {aggregates.unconfirmed ? ` · ${aggregates.unconfirmed} not confirmed` : ''}
          </p>
        </div>
        {paid ? (
          <div className="tt-mini-stats">
            <span>
              <strong>{aggregates.paid}</strong> paid
            </span>
            <span>
              <strong>{formatNaira(aggregates.outstanding)}</strong> outstanding
            </span>
          </div>
        ) : null}
      </div>

      <div className="tt-list-tools">
        <div className="tt-field tt-search">
          <label htmlFor="student-search">Search students</label>
          <div className="tt-input-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              id="student-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name or phone number"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="tt-field">
          <label htmlFor="student-filter">Show</label>
          <select
            id="student-filter"
            value={activeFilter}
            onChange={(event) => setFilter(event.target.value as StudentFilter)}
          >
            {filters.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="tt-result-line" role="status" aria-live="polite">
        {loading
          ? 'Loading students…'
          : `Showing ${filtered.length} of ${Math.max(students.filter((student) => student.status !== 'cancelled').length, 0)} students`}
      </p>

      {error ? (
        <InlineError message={error} onRetry={onRetry} />
      ) : loading ? (
        <div className="tt-table-wrap" aria-hidden="true">
          <div className="tt-skeleton-table">
            {[0, 1, 2, 3].map((key) => (
              <Skeleton key={key} height={52} />
            ))}
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="tt-inline-empty">
          <h3>{students.length ? 'No students match that view' : 'No students yet'}</h3>
          <p>
            {students.length
              ? 'Try a different search, or choose All students.'
              : 'Share the class link and the first booking will show up here.'}
          </p>
        </div>
      ) : (
        <div className="tt-table-wrap">
          <table className="tt-table">
            <caption className="tt-sr-only">Students in {cls.title}</caption>
            <thead>
              <tr>
                <th scope="col">Student</th>
                <th scope="col">Contact</th>
                {paid ? <th scope="col">Payment</th> : null}
                <th scope="col">Status</th>
                <th scope="col">
                  <span className="tt-sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => {
                const remindable = canRemind(cls, student);
                return (
                  <tr key={student.id}>
                    <td>
                      <div className="tt-person">
                        <Avatar name={student.student_name} size={38} />
                        <div>
                          <a href={studentUrl(student.student_id, cls.id)}>{student.student_name}</a>
                          <span>{bookingStatusLabel(student.status)}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <a className="tt-phone" href={`tel:${student.student_phone}`}>
                        {student.student_phone}
                      </a>
                    </td>
                    {paid ? (
                      <td>
                        <div className="tt-payment-cell">
                          <strong>{formatNaira(student.amount_paid)}</strong>
                          <span>of {formatNaira(student.amount_due)}</span>
                          {Number(student.balance) > 0 ? <em>{formatNaira(student.balance)} left</em> : null}
                        </div>
                      </td>
                    ) : null}
                    <td>
                      <div className="tt-status-cell">
                        {student.status === 'waitlisted' ? (
                          <Pill tone="draft">Waitlisted</Pill>
                        ) : paid ? (
                          <Pill tone={paymentTone(student.payment_state)}>{paymentStateLabel(student.payment_state)}</Pill>
                        ) : (
                          <Pill tone="neutral">Free seat</Pill>
                        )}
                        {student.status !== 'waitlisted' ? (
                          <span className={`tt-confirm ${student.confirmed ? 'is-confirmed' : ''}`}>
                            {student.confirmed ? 'Seat confirmed' : 'Seat not confirmed'}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="tt-row-actions">
                        {!ended ? (
                          <button
                            type="button"
                            className="tt-btn tt-btn-ghost tt-btn-small"
                            onClick={() => onRemind(student)}
                            disabled={!remindable || remindingId === student.id}
                            aria-busy={remindingId === student.id}
                            title={
                              remindable
                                ? 'Send a WhatsApp reminder'
                                : student.status === 'waitlisted'
                                  ? 'Waitlisted students are not reminded'
                                  : 'Nothing to remind for this student'
                            }
                          >
                            {remindingId === student.id ? 'Sending…' : 'Remind'}
                          </button>
                        ) : null}
                        <a className="tt-btn tt-btn-ghost tt-btn-small" href={studentUrl(student.student_id, cls.id)}>
                          View
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
