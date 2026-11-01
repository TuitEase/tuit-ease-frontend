import { useState } from 'react';
import { useWizard } from '../wizardContext';
import { isOfflineMode, isOnlineMode } from '../validation';
import { sessionNote } from '../sessions';
import { colors, errorTextStyle, fieldStackStyle, hintStyle, labelStyle } from '../ui';
import { FieldError } from '../components/Controls';

const DURATIONS = [
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' },
  { value: '240', label: '4 hours' },
];

export function ScheduleStep() {
  const {
    draft,
    update,
    updateSession,
    addSession,
    removeSession,
    repeatWeeklySessions,
    fieldErrors,
  } = useWizard();

  const online = isOnlineMode(draft);
  const offline = isOfflineMode(draft);
  const count = draft.sessions.length;
  const [confirmKey, setConfirmKey] = useState<string | null>(null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
          <div style={{ fontWeight: 700 }}>Sessions</div>
          <div style={{ color: colors.muted, fontSize: 14 }}>One booking and one payment covers every session.</div>
        </div>

        {draft.sessions.map((session, index) => {
          const dateError = fieldErrors[`session:${session.key}:date`];
          const timeError = fieldErrors[`session:${session.key}:time`];
          const linkError = fieldErrors[`session:${session.key}:link`];
          const locationNote = sessionNote(draft, session);
          return (
            <div
              key={session.key}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'flex-end',
                gap: 12,
                border: `1px solid ${colors.border}`,
                borderRadius: 16,
                padding: 16,
                background: colors.sessionRow,
              }}
            >
              <div style={{ flex: '0 0 100%', fontWeight: 700, fontSize: 14, color: colors.secondary }}>
                {count > 1 ? `Session ${index + 1}` : 'Your session'}
              </div>

              <div style={{ flex: '1 1 170px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor={`s-${session.key}-date`} style={{ fontSize: 14, fontWeight: 600 }}>
                  Date
                </label>
                <input
                  id={`s-${session.key}-date`}
                  className="inp"
                  type="date"
                  value={session.date}
                  onChange={(event) => updateSession(session.key, { date: event.target.value })}
                  aria-invalid={Boolean(dateError)}
                  aria-describedby={dateError ? `err-${session.key}-date` : undefined}
                />
                {dateError && (
                  <div id={`err-${session.key}-date`} role="alert" style={errorTextStyle}>
                    {dateError}
                  </div>
                )}
              </div>

              <div style={{ flex: '1 1 130px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor={`s-${session.key}-time`} style={{ fontSize: 14, fontWeight: 600 }}>
                  Start time
                </label>
                <input
                  id={`s-${session.key}-time`}
                  className="inp"
                  type="time"
                  value={session.time}
                  onChange={(event) => updateSession(session.key, { time: event.target.value })}
                  aria-invalid={Boolean(timeError)}
                  aria-describedby={timeError ? `err-${session.key}-time` : undefined}
                />
                {timeError && (
                  <div id={`err-${session.key}-time`} role="alert" style={errorTextStyle}>
                    {timeError}
                  </div>
                )}
              </div>

              <div style={{ flex: '1 1 130px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor={`s-${session.key}-length`} style={{ fontSize: 14, fontWeight: 600 }}>
                  Length
                </label>
                <select
                  id={`s-${session.key}-length`}
                  className="inp"
                  value={session.duration}
                  onChange={(event) => updateSession(session.key, { duration: event.target.value })}
                >
                  {DURATIONS.map((duration) => (
                    <option key={duration.value} value={duration.value}>
                      {duration.label}
                    </option>
                  ))}
                </select>
              </div>

              {count > 1 && confirmKey !== session.key && (
                <button
                  type="button"
                  onClick={() => {
                    if (session.serverId) {
                      setConfirmKey(session.key);
                      return;
                    }
                    removeSession(session.key);
                  }}
                  aria-label="Remove this session"
                  style={{
                    minHeight: 48,
                    padding: '0 16px',
                    border: `1px solid ${colors.inputBorder}`,
                    background: '#FFFFFF',
                    borderRadius: 12,
                    fontWeight: 600,
                    color: colors.secondary,
                    cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              )}

              {confirmKey === session.key && (
                <div
                  role="group"
                  aria-label="Confirm deleting this session"
                  style={{
                    flex: '0 0 100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    border: `1px solid ${colors.payoutBorder}`,
                    background: colors.selected,
                    borderRadius: 12,
                    padding: 12,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, color: colors.secondary }}>
                    Delete this session? Attendance and reminders for it will be removed when you save.
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        removeSession(session.key);
                        setConfirmKey(null);
                      }}
                      style={{
                        minHeight: 44,
                        padding: '0 16px',
                        border: 'none',
                        background: colors.coral,
                        color: '#FFFFFF',
                        borderRadius: 10,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Delete session
                    </button>
                    <button
                      type="button"
                      autoFocus
                      onClick={() => setConfirmKey(null)}
                      style={{
                        minHeight: 44,
                        padding: '0 16px',
                        border: `1px solid ${colors.inputBorder}`,
                        background: '#FFFFFF',
                        color: colors.ink,
                        borderRadius: 10,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Keep session
                    </button>
                  </div>
                </div>
              )}

              <div
                style={{
                  flex: '0 0 100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  borderTop: `1px solid ${colors.divider}`,
                  paddingTop: 12,
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ color: colors.secondary, fontSize: 14, overflowWrap: 'anywhere' }}>{locationNote}</div>
                  <button
                    type="button"
                    onClick={() => updateSession(session.key, { override: !session.override })}
                    aria-expanded={session.override}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: colors.coralText,
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '6px 4px',
                      minHeight: 36,
                    }}
                  >
                    {session.override ? 'Use the class location' : 'This session is somewhere else'}
                  </button>
                </div>

                {session.override && online && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label htmlFor={`s-${session.key}-link`} style={{ fontSize: 14, fontWeight: 600 }}>
                      Meeting link for this session
                    </label>
                    <input
                      id={`s-${session.key}-link`}
                      className="inp"
                      type="url"
                      placeholder="https://meet.google.com/..."
                      value={session.link}
                      onChange={(event) => updateSession(session.key, { link: event.target.value })}
                      aria-invalid={Boolean(linkError)}
                      aria-describedby={linkError ? `err-${session.key}-link` : undefined}
                    />
                    {linkError && (
                      <div id={`err-${session.key}-link`} role="alert" style={errorTextStyle}>
                        {linkError}
                      </div>
                    )}
                  </div>
                )}

                {session.override && offline && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label htmlFor={`s-${session.key}-venue`} style={{ fontSize: 14, fontWeight: 600 }}>
                      Venue for this session
                    </label>
                    <input
                      id={`s-${session.key}-venue`}
                      className="inp"
                      type="text"
                      placeholder="e.g. Lekki Hub, 4 Admiralty Way"
                      value={session.venue}
                      onChange={(event) => updateSession(session.key, { venue: event.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button
            type="button"
            onClick={addSession}
            style={{
              minHeight: 46,
              padding: '0 18px',
              border: `1.5px dashed ${colors.coral}`,
              background: '#FFFFFF',
              color: colors.coralText,
              borderRadius: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            + Add a session
          </button>
          <button
            type="button"
            onClick={repeatWeeklySessions}
            style={{
              minHeight: 46,
              padding: '0 18px',
              border: `1px solid ${colors.inputBorder}`,
              background: '#FFFFFF',
              color: colors.ink,
              borderRadius: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Repeat weekly for 4 weeks
          </button>
        </div>
      </div>

      {online && (
        <div style={fieldStackStyle}>
          <label htmlFor="f-link" style={labelStyle}>
            Meeting link for all sessions
          </label>
          <input
            id="f-link"
            className="inp"
            type="url"
            placeholder="https://meet.google.com/..."
            value={draft.meetingLink}
            onChange={(event) => update({ meetingLink: event.target.value })}
            aria-invalid={Boolean(fieldErrors.meetingLink)}
            aria-describedby={fieldErrors.meetingLink ? 'err-link' : undefined}
          />
          <FieldError id="err-link" message={fieldErrors.meetingLink} />
          <div style={hintStyle}>Used for every session unless you change it on a session above.</div>
        </div>
      )}

      {offline && (
        <div style={fieldStackStyle}>
          <label htmlFor="f-venue" style={labelStyle}>
            Venue for all sessions
          </label>
          <input
            id="f-venue"
            className="inp"
            type="text"
            placeholder="e.g. Yaba Tech Hub, 12 Herbert Macaulay Way"
            value={draft.venue}
            onChange={(event) => update({ venue: event.target.value })}
            aria-invalid={Boolean(fieldErrors.venue)}
            aria-describedby={fieldErrors.venue ? 'err-venue' : undefined}
          />
          <FieldError id="err-venue" message={fieldErrors.venue} />
          <div style={hintStyle}>
            Used for every session unless you change it on a session above. Add a map link if you can.
          </div>
        </div>
      )}
    </div>
  );
}
