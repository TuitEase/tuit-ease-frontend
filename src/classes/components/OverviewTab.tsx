import { dateTile, formatDateTime } from '../../lib/datetime';
import { formatNaira } from '../../lib/money';
import {
  classScheduleLabel,
  capacityOf,
  durationLabel,
  editClassUrl,
  modeLabel,
  pendingForClass,
  seatUsage,
  seatsLeftText,
  sessionLocation,
  sessionState,
  studentAggregates,
  type DetailTab,
} from '../model';
import type { ClassStudent, HostClassRecord, PendingInstallment } from '../api';
import { Avatar, Pill, Section } from './ui';

export interface OverviewTabProps {
  cls: HostClassRecord;
  timeZone: string;
  students: ClassStudent[];
  pending: PendingInstallment[];
  paid: boolean;
  ended: boolean;
  draft: boolean;
  remindTargets: number;
  remindingAll: boolean;
  onOpenTab: (tab: DetailTab) => void;
  onCopy: () => void;
  onRemindAll: () => void;
}

export function OverviewTab({
  cls,
  timeZone,
  students,
  pending,
  paid,
  ended,
  draft,
  remindTargets,
  remindingAll,
  onOpenTab,
  onCopy,
  onRemindAll,
}: OverviewTabProps) {
  const aggregates = studentAggregates(students);
  const pendingInfo = pendingForClass(pending, cls.id, timeZone);
  const usage = seatUsage(cls);
  const capacity = capacityOf(cls);
  const liveStudents = students.filter((student) => student.status !== 'cancelled');
  const seated = students.filter(
    (student) => student.status === 'active' || student.status === 'pending_payment',
  );
  const sessions = [...(cls.sessions ?? [])].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
  const preview = sessions.slice(0, 4);

  return (
    <div className="tt-detail-grid">
      <div className="tt-stack">
        <Section title="About this class" id="about">
          <p className="tt-body">
            {cls.description?.trim() || 'No description yet. Add one so students know what to expect.'}
          </p>
          <dl className="tt-facts">
            <div>
              <dt>Format</dt>
              <dd>{modeLabel(cls.mode)}</dd>
            </div>
            <div>
              <dt>Price</dt>
              <dd>{paid ? `${formatNaira(cls.price)} per student` : 'Free'}</dd>
            </div>
            <div>
              <dt>Seats</dt>
              <dd>{capacity === null ? 'Unlimited' : `${capacity} seats`}</dd>
            </div>
            <div>
              <dt>Sessions</dt>
              <dd>{sessions.length}</dd>
            </div>
            <div>
              <dt>Instalments</dt>
              <dd>{paid && cls.allow_installments ? `${cls.installment_count} payments` : 'Pay in full'}</dd>
            </div>
            <div>
              <dt>Seat confirmation</dt>
              <dd>{cls.require_seat_confirmation ? 'Students reply YES' : 'Automatic'}</dd>
            </div>
          </dl>
        </Section>

        <Section
          title="Schedule"
          id="schedule"
          action={
            sessions.length ? (
              <button type="button" className="tt-btn tt-btn-ghost tt-btn-small" onClick={() => onOpenTab('sessions')}>
                Open sessions
              </button>
            ) : undefined
          }
        >
          {preview.length === 0 ? (
            <p className="tt-muted">No sessions yet. Add dates in the class editor.</p>
          ) : (
            <ul className="tt-session-list">
              {preview.map((session) => {
                const tile = dateTile(session.starts_at, timeZone);
                const state = sessionState(session.starts_at, timeZone);
                return (
                  <li key={session.id} className="tt-session-row">
                    <span className="tt-date-tile" aria-hidden="true">
                      <span>{tile.month}</span>
                      <strong>{tile.day}</strong>
                    </span>
                    <div className="tt-session-row-body">
                      <strong>Session {session.number}</strong>
                      <span>
                        {formatDateTime(session.starts_at, timeZone)} · {durationLabel(session.duration_minutes)}
                      </span>
                      <span className="tt-muted">{sessionLocation(cls, session)}</span>
                    </div>
                    <Pill tone={state === 'past' ? 'ended' : state === 'today' ? 'warning' : 'neutral'}>
                      {state === 'past' ? 'Ended' : state === 'today' ? 'Today' : 'Upcoming'}
                    </Pill>
                  </li>
                );
              })}
            </ul>
          )}
          {sessions.length > preview.length ? (
            <p className="tt-muted">
              Plus {sessions.length - preview.length} more {sessions.length - preview.length === 1 ? 'session' : 'sessions'}.
            </p>
          ) : null}
        </Section>

        <Section
          title="Students"
          id="students-preview"
          action={
            <button type="button" className="tt-btn tt-btn-ghost tt-btn-small" onClick={() => onOpenTab('students')}>
              Manage students
            </button>
          }
        >
          <div className="tt-preview-stats">
            <span>
              <strong>{aggregates.students}</strong> booked
            </span>
            <span>
              <strong>{aggregates.waitlisted}</strong> waitlisted
            </span>
            <span>
              <strong>{aggregates.unconfirmed}</strong> not confirmed
            </span>
            <span>
              <strong>{seatsLeftText(cls)}</strong>
            </span>
          </div>
          {liveStudents.length === 0 ? (
            <p className="tt-muted">No students yet. Share the class link to fill the first seats.</p>
          ) : (
            <ul className="tt-people">
              {liveStudents.slice(0, 6).map((student) => (
                <li key={student.id}>
                  <Avatar name={student.student_name} size={34} />
                  <span>{student.student_name}</span>
                  <Pill tone={student.status === 'waitlisted' ? 'draft' : student.confirmed ? 'live' : 'warning'}>
                    {student.status === 'waitlisted' ? 'Waitlist' : student.confirmed ? 'Confirmed' : 'Not confirmed'}
                  </Pill>
                </li>
              ))}
            </ul>
          )}
          {liveStudents.length > 6 ? <p className="tt-muted">And {liveStudents.length - 6} more.</p> : null}
        </Section>
      </div>

      <aside className="tt-stack">
        {paid ? (
          <Section title="Money" id="money-summary">
            <dl className="tt-money-list">
              <div>
                <dt>Collected</dt>
                <dd>{draft ? '—' : formatNaira(aggregates.collected)}</dd>
              </div>
              <div>
                <dt>Still to collect</dt>
                <dd>{draft ? '—' : formatNaira(aggregates.outstanding)}</dd>
              </div>
              {pendingInfo.overdueCount > 0 ? (
                <div className="is-warning">
                  <dt>Overdue</dt>
                  <dd>
                    {formatNaira(pendingInfo.overdueAmount)} · {pendingInfo.overdueCount}{' '}
                    {pendingInfo.overdueCount === 1 ? 'instalment' : 'instalments'}
                  </dd>
                </div>
              ) : null}
            </dl>
            <button type="button" className="tt-btn tt-btn-secondary tt-btn-small" onClick={() => onOpenTab('payments')}>
              Open payments
            </button>
          </Section>
        ) : (
          <Section title="Price" id="money-summary">
            <p className="tt-body">This is a free class. No payments to collect.</p>
          </Section>
        )}

        <Section title="Next up" id="next-up">
          <div className="tt-next-up">
            <span className="tt-next-up-label">{classScheduleLabel(cls, timeZone)}</span>
            <span className="tt-muted">
              {ended
                ? 'This class has ended. The page stays here for your records.'
                : occupiedSeatsNote(usage.booked, usage.capacity)}
            </span>
          </div>
        </Section>

        <Section title="Quick actions" id="quick-actions">
          <div className="tt-action-stack">
            {ended ? (
              <p className="tt-note">Reminders and waitlist offers are hidden because this class has ended.</p>
            ) : (
              <>
                <button
                  type="button"
                  className="tt-btn tt-btn-secondary"
                  onClick={onRemindAll}
                  disabled={remindTargets === 0 || remindingAll}
                  aria-busy={remindingAll}
                >
                  {remindingAll
                    ? 'Sending reminders…'
                    : remindTargets
                      ? `Remind ${remindTargets} ${remindTargets === 1 ? 'student' : 'students'}`
                      : 'Nothing to remind'}
                </button>
                <div>
                  <button
                    type="button"
                    className="tt-btn tt-btn-secondary"
                    disabled
                    aria-describedby="offer-seat-hint"
                  >
                    Offer a waitlisted seat
                  </button>
                  <p className="tt-hint" id="offer-seat-hint">
                    Offering a seat isn’t available yet. Message the student from their contact card for now.
                  </p>
                </div>
              </>
            )}
            <button type="button" className="tt-btn tt-btn-ghost" onClick={onCopy}>
              Copy class link
            </button>
            <button type="button" className="tt-btn tt-btn-ghost" onClick={() => onOpenTab('share')} disabled={draft}>
              Share or download QR
            </button>
            <a className="tt-btn tt-btn-ghost" href={editClassUrl(cls.id)}>
              Edit class
            </a>
          </div>
        </Section>
      </aside>
    </div>
  );
}

function occupiedSeatsNote(booked: number, capacity: number | null): string {
  if (capacity === null) return `${booked} booked. Seats are unlimited.`;
  const left = Math.max(capacity - booked, 0);
  if (left === 0) return 'Every seat is taken. The waitlist is open.';
  return `${left} ${left === 1 ? 'seat' : 'seats'} left of ${capacity}.`;
}
