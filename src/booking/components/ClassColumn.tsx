import type { PublicClassView } from '../model';

export interface ClassColumnProps {
  view: PublicClassView;
}

export function ClassColumn({ view }: ClassColumnProps) {
  const coverStyle = view.cover.imageUrl
    ? undefined
    : { background: `linear-gradient(135deg, ${view.cover.c1}, ${view.cover.c2})` };

  return (
    <div className="booking-left">
      <article className="booking-card booking-card-header">
        <div className="booking-cover" style={coverStyle}>
          {view.cover.imageUrl && (
            <img className="booking-cover-image" src={view.cover.imageUrl} alt="" loading="lazy" />
          )}
          <span className="booking-cover-pill">{view.placePill}</span>
          <span className="booking-cover-watermark" aria-hidden="true">
            {view.watermark}
          </span>
        </div>
        <div className="booking-card-body">
          <h1 className="booking-title">{view.title}</h1>
          {view.description && <p className="booking-description">{view.description}</p>}
          {view.chips.length > 0 && (
            <div className="booking-chips">
              {view.chips.map((chip) => (
                <span className="booking-chip" key={chip}>
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>
      </article>

      <section className="booking-card" aria-labelledby="booking-when-title">
        <h2 className="booking-section-title" id="booking-when-title">
          When and where
        </h2>
        <p className="booking-section-note">{view.whenCopy}</p>
        {view.sessions.length === 0 && <p className="booking-muted">Dates are being finalised.</p>}
        {view.sessions.map((session) => (
          <div className="booking-session" key={session.id}>
            <div className="booking-date-tile" aria-hidden="true">
              <div className="booking-date-month">{session.month}</div>
              <div className="booking-date-day">{session.day}</div>
            </div>
            <div className="booking-session-body">
              <span className="booking-session-line">{session.line1}</span>
              <span className="booking-session-meta">{session.line2}</span>
            </div>
            {session.differs && <span className="booking-different">Different place</span>}
          </div>
        ))}
      </section>

      <section className="booking-card" aria-labelledby="booking-after-title">
        <h2 className="booking-section-title" id="booking-after-title">
          What happens after you book
        </h2>
        <div className="booking-steps">
          <div className="booking-step">
            <span className="booking-step-number" aria-hidden="true">
              1
            </span>
            <span>You get a WhatsApp message with the dates, the place and a calendar link.</span>
          </div>
          <div className="booking-step">
            <span className="booking-step-number" aria-hidden="true">
              2
            </span>
            <span>We remind you the day before and an hour before every session.</span>
          </div>
          {view.hasGroupLink && (
            <div className="booking-step">
              <span className="booking-step-number" aria-hidden="true">
                3
              </span>
              <span>You join the class group so you can ask questions.</span>
            </div>
          )}
        </div>
      </section>

      {view.host.bio && (
        <section className="booking-card booking-host-card" aria-label="Your host">
          <div className="booking-avatar booking-avatar-lg" aria-hidden="true">
            {view.host.initials}
          </div>
          <div className="booking-host-card-body">
            <span className="booking-host-card-name">Your host, {view.host.firstName}</span>
            <span className="booking-host-card-bio">{view.host.bio}</span>
          </div>
        </section>
      )}
    </div>
  );
}
