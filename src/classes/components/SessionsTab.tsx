import { useState } from 'react';
import { dateTile, formatDateTime } from '../../lib/datetime';
import type { ClassStudent, HostClassRecord } from '../api';
import {
  attendanceKey,
  durationLabel,
  sessionLocation,
  sessionState,
} from '../model';
import { Avatar, EmptyState, Pill, Skeleton } from './ui';

export interface SessionsTabProps {
  cls: HostClassRecord;
  students: ClassStudent[];
  timeZone: string;
  ended: boolean;
  loading: boolean;
  marks: Record<string, boolean>;
  /** Present marks already saved on earlier visits, keyed by attendanceKey(). */
  history: Record<string, boolean>;
  savingKey: string | null;
  onToggle: (sessionId: number, bookingId: number, present: boolean) => void;
}

export function SessionsTab({
  cls,
  students,
  timeZone,
  ended,
  loading,
  marks,
  history,
  savingKey,
  onToggle,
}: SessionsTabProps) {
  const [openId, setOpenId] = useState<number | null>(null);
  const sessions = [...(cls.sessions ?? [])].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
  const attending = students.filter(
    (student) => student.status === 'active' || student.status === 'pending_payment',
  );

  if (!sessions.length) {
    return (
      <div className="tt-tab-body">
        <EmptyState
          title="No sessions yet"
          body="Add at least one date before students can book this class."
          action={
            <a className="tt-btn tt-btn-secondary" href={`/classes/new/basics/?id=${cls.id}`}>
              Edit the schedule
            </a>
          }
        />
      </div>
    );
  }

  return (
    <div className="tt-tab-body">
      <div className="tt-tab-head">
        <div>
          <h2>Sessions and attendance</h2>
          <p>
            {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} · {attending.length} students can be marked
          </p>
        </div>
      </div>

      <p className="tt-note">
        Marks already recorded on an earlier visit are ticked for you. Tick or untick anyone to correct the record.
      </p>

      <ul className="tt-session-cards">
        {sessions.map((session) => {
          const tile = dateTile(session.starts_at, timeZone);
          const state = sessionState(session.starts_at, timeZone);
          const open = openId === session.id;
          const panelId = `attendance-${session.id}`;
          return (
            <li className="tt-session-card" key={session.id}>
              <div className="tt-session-card-head">
                <span className="tt-date-tile" aria-hidden="true">
                  <span>{tile.month}</span>
                  <strong>{tile.day}</strong>
                </span>
                <div className="tt-session-card-body">
                  <h3>
                    Session {session.number}{' '}
                    <Pill tone={state === 'past' ? 'ended' : state === 'today' ? 'warning' : 'neutral'}>
                      {state === 'past' ? 'Ended' : state === 'today' ? 'Today' : 'Upcoming'}
                    </Pill>
                  </h3>
                  <p>
                    {formatDateTime(session.starts_at, timeZone)} · {durationLabel(session.duration_minutes)}
                  </p>
                  <p className="tt-muted">{sessionLocation(cls, session)}</p>
                </div>
                <button
                  type="button"
                  className="tt-btn tt-btn-secondary tt-btn-small"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenId(open ? null : session.id)}
                >
                  {open ? 'Hide attendance' : 'Take attendance'}
                </button>
              </div>

              {open ? (
                <div className="tt-attendance" id={panelId}>
                  {loading ? (
                    <div className="tt-stack" aria-hidden="true">
                      <Skeleton height={44} />
                      <Skeleton height={44} />
                      <Skeleton height={44} />
                    </div>
                  ) : attending.length === 0 ? (
                    <p className="tt-muted">No students have booked yet, so there is nobody to mark.</p>
                  ) : (
                    <ul className="tt-checklist">
                      {attending.map((student) => {
                        const key = attendanceKey(session.id, student.id);
                        const checked = marks[key] ?? history[key] ?? false;
                        const saving = savingKey === key;
                        return (
                          <li key={student.id}>
                            <label className="tt-check">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) => onToggle(session.id, student.id, event.target.checked)}
                                disabled={saving}
                                aria-describedby={`attendance-status-${session.id}`}
                              />
                              <Avatar name={student.student_name} size={32} />
                              <span className="tt-check-name">{student.student_name}</span>
                              <span className="tt-check-state" aria-hidden="true">
                                {saving ? 'Saving…' : checked ? 'Present' : 'Not marked'}
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <p className="tt-hint" id={`attendance-status-${session.id}`} role="status" aria-live="polite">
                    {savingKey ? 'Saving the last mark…' : 'Marks save as you tap. Untick to correct a mistake.'}
                  </p>
                  {ended ? (
                    <p className="tt-hint">This class has ended. You can still record who attended each session.</p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
