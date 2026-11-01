import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { bookingCalendarUrl, type BookingPlan, type BookingStatus } from '../api';
import {
  bookingPaidAmount,
  installmentChoiceCopy,
  installmentLaterLine,
  nextDueLine,
  normalizeNigerianPhone,
  planLater,
  planNow,
  seatsLine,
  type PublicClassView,
} from '../model';
import { formatCalendarDate } from '../../lib/datetime';
import { formatMoney, toNaira } from '../../lib/money';
import { CalendarIcon, CheckCircle, LockIcon, WhatsAppIcon } from './icons';

export type PanelStep =
  | 'page'
  | 'form'
  | 'wait'
  | 'paying'
  | 'failed'
  | 'confirming'
  | 'done'
  | 'wait-done'
  | 'duplicate'
  | 'released';

export interface BookingFormValues {
  name: string;
  phone: string;
  email: string | null;
  plan: BookingPlan;
}

export interface WaitlistFormValues {
  name: string;
  phone: string;
}

export interface BookingPanelProps {
  view: PublicClassView;
  step: PanelStep;
  plan: BookingPlan;
  onPlanChange: (plan: BookingPlan) => void;
  submitting: boolean;
  fieldErrors: Record<string, string>;
  formError: string | null;
  paymentError: string | null;
  bookingRef: string | null;
  bookingStatus: BookingStatus | null;
  confirmTimedOut: boolean;
  waitlistPosition: number | null;
  firstName: string;
  authorizationUrl: string | null;
  onBack: () => void;
  onStartBooking: () => void;
  onStartWaitlist: () => void;
  onSubmitBooking: (values: BookingFormValues) => void;
  onSubmitWaitlist: (values: WaitlistFormValues) => void;
  onRetryPayment: () => void;
  onCheckAgain: () => void;
  onShare: () => void;
}

function sessionPhrase(count: number): string {
  if (count <= 0) return 'for this class';
  return count === 1 ? 'for your session' : `for all ${count} sessions`;
}

function paymentRows(view: PublicClassView, plan: BookingPlan) {
  const now = planNow(view, plan);
  const later = planLater(view, plan);
  return { now, later };
}

export function BookingPanel(props: BookingPanelProps) {
  const {
    view,
    step,
    plan,
    onPlanChange,
    submitting,
    fieldErrors,
    formError,
    paymentError,
    bookingRef,
    bookingStatus,
    confirmTimedOut,
    waitlistPosition,
    firstName,
    authorizationUrl,
    onBack,
    onStartBooking,
    onStartWaitlist,
    onSubmitBooking,
    onSubmitWaitlist,
    onRetryPayment,
    onCheckAgain,
    onShare,
  } = props;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

  const full = view.status === 'full';
  const ended = view.status === 'ended';
  const showPlans = view.plans.enabled && !view.isFree;
  const { now: amountNow, later: amountLater } = paymentRows(view, plan);
  const dueNow = formatMoney(amountNow, view.currency);

  function fieldError(key: string): string | undefined {
    return localErrors[key] ?? fieldErrors[key] ?? (key === 'phone' ? fieldErrors.phone_number : undefined);
  }

  function validate(includePlan: boolean): BookingFormValues | WaitlistFormValues | null {
    const next: Record<string, string> = {};
    const trimmedName = name.trim();
    const normalizedPhone = normalizeNigerianPhone(phone);
    if (!trimmedName) next.name = 'Please enter your name.';
    if (!normalizedPhone) next.phone = 'Enter a valid Nigerian number, like 0801 234 5678.';
    const trimmedEmail = email.trim();
    if (includePlan && trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      next.email = 'Enter a valid email address.';
    }
    setLocalErrors(next);
    if (Object.keys(next).length > 0) return null;
    if (!includePlan) return { name: trimmedName, phone: normalizedPhone as string };
    return {
      name: trimmedName,
      phone: normalizedPhone as string,
      email: trimmedEmail || null,
      plan: showPlans ? plan : 'full',
    };
  }

  function handleBookingSubmit(event: FormEvent) {
    event.preventDefault();
    const values = validate(true);
    if (!values) return;
    onSubmitBooking(values as BookingFormValues);
  }

  function handleWaitlistSubmit(event: FormEvent) {
    event.preventDefault();
    const values = validate(false);
    if (!values) return;
    onSubmitWaitlist(values as WaitlistFormValues);
  }

  function handleRadioKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (!['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) return;
    event.preventDefault();
    const next: BookingPlan = plan === 'full' ? 'installments' : 'full';
    onPlanChange(next);
    const group = event.currentTarget.parentElement;
    window.setTimeout(() => {
      group?.querySelector<HTMLButtonElement>(`[role="radio"][data-plan="${next}"]`)?.focus();
    }, 0);
  }

  function renderNameField(id: string) {
    const message = fieldError('name');
    return (
      <div className="booking-field">
        <label className="booking-label" htmlFor={id}>
          Your full name
        </label>
        <input
          id={id}
          className="booking-input"
          type="text"
          autoComplete="name"
          placeholder="e.g. Ife Adebayo"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-invalid={message ? 'true' : undefined}
          aria-describedby={message ? `${id}-error` : undefined}
        />
        {message && (
          <span className="booking-error" id={`${id}-error`} role="alert">
            {message}
          </span>
        )}
      </div>
    );
  }

  function renderPhoneField(id: string) {
    const message = fieldError('phone');
    return (
      <div className="booking-field">
        <label className="booking-label" htmlFor={id}>
          WhatsApp number
        </label>
        <input
          id={id}
          className="booking-input"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0801 234 5678"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          aria-invalid={message ? 'true' : undefined}
          aria-describedby={`${id}-hint${message ? ` ${id}-error` : ''}`}
        />
        <span className="booking-hint" id={`${id}-hint`}>
          Your confirmation and reminders go here.
        </span>
        {message && (
          <span className="booking-error" id={`${id}-error`} role="alert">
            {message}
          </span>
        )}
      </div>
    );
  }

  if (step === 'done') {
    const first = view.firstSession;
    const paid = bookingStatus ? bookingPaidAmount(bookingStatus) : view.isFree ? 0 : amountNow;
    const balance = bookingStatus ? toNaira(bookingStatus.balance) : 0;
    const nextDue = bookingStatus ? nextDueLine(bookingStatus, view.currency) : '';
    const rest =
      bookingStatus && balance > 0
        ? nextDue || `${formatMoney(balance, view.currency)} due later`
        : !bookingStatus && amountLater
          ? `${formatMoney(amountLater.amount, view.currency)} due ${
              amountLater.dueAt ? formatCalendarDate(amountLater.dueAt) : 'later'
            }`
          : '';
    const calendarHref = bookingStatus?.calendar_url || (bookingRef ? bookingCalendarUrl(bookingRef) : null);
    const groupLink = bookingStatus?.group_link || view.groupLink;
    const calendarLabel =
      view.sessionCount === 1 ? 'Add my session to my calendar' : `Add all ${view.sessionCount} sessions to my calendar`;

    return (
      <>
        <section className="booking-panel booking-panel-center" aria-label="Booking confirmed">
          <CheckCircle />
          <div>
            <h2 className="booking-done-title">{firstName ? `You are in, ${firstName}!` : 'You are in!'}</h2>
            <p className="booking-done-sub">
              {view.isFree
                ? 'Your seat is reserved. Details are on their way to your WhatsApp.'
                : 'Your seat is confirmed. A receipt is on its way.'}
            </p>
          </div>

          <div className="booking-done-card">
            <strong>{view.title}</strong>
            {first ? (
              <>
                <span>
                  First session: {first.dateLabel} · {first.timeLabel}
                </span>
                <span>{first.place}</span>
              </>
            ) : (
              <span>Dates are being finalised.</span>
            )}
            {view.isFree ? (
              <span className="booking-paid-line">Free class · No payment needed</span>
            ) : (
              <span className="booking-paid-line">
                Paid {formatMoney(paid, view.currency)}
                {rest ? ` · ${rest}` : ''}
              </span>
            )}
          </div>

          <div className="booking-done-actions">
            {calendarHref && (
              <a className="booking-btn booking-btn-outline-whatsapp" href={calendarHref}>
                <CalendarIcon />
                {calendarLabel}
              </a>
            )}
            {groupLink && (
              <a className="booking-btn booking-btn-whatsapp" href={groupLink} target="_blank" rel="noreferrer">
                <WhatsAppIcon />
                Join the class WhatsApp group
              </a>
            )}
          </div>

          <p className="booking-hint">
            We sent the details to your WhatsApp. You will get a reminder the day before and an hour before every
            session.
          </p>
        </section>

        <section className="booking-friend" aria-label="Bring a friend">
          <strong>Bring a friend</strong>
          <p className="booking-muted" style={{ fontSize: '16px' }}>
            Share the link, or let them scan the code from your screen.
          </p>
          <button
            type="button"
            className="booking-btn booking-btn-outline booking-btn-small"
            style={{ alignSelf: 'flex-start' }}
            onClick={onShare}
          >
            Share with friends
          </button>
        </section>
      </>
    );
  }

  if (step === 'wait-done') {
    return (
      <section className="booking-panel booking-panel-center" aria-label="Waiting list">
        <CheckCircle fill="#16161A" label="Added to the waiting list" />
        <h2 className="booking-done-title">{firstName ? `You are on the list, ${firstName}` : 'You are on the list'}</h2>
        <p className="booking-panel-copy">
          {waitlistPosition !== null && waitlistPosition > 0 ? `You are number ${waitlistPosition}. ` : ''}
          If a seat opens we will message you on WhatsApp and you will have 24 hours to take it.
        </p>
        <p className="booking-notice booking-notice-success" style={{ width: '100%' }}>
          You have not been charged.
        </p>
        <button type="button" className="booking-btn booking-btn-outline booking-btn-small" onClick={onShare}>
          Share this class
        </button>
      </section>
    );
  }

  if (step === 'duplicate') {
    return (
      <section className="booking-panel" aria-label="Already booked">
        <h2 className="booking-panel-title">You already have a seat</h2>
        <p className="booking-panel-copy">
          You already have a booking for this class. Check your WhatsApp for the details we sent you.
        </p>
        <button type="button" className="booking-btn booking-btn-outline booking-btn-small" onClick={onShare}>
          Share this class
        </button>
      </section>
    );
  }

  if (step === 'confirming') {
    return (
      <section className="booking-panel booking-panel-center" aria-label="Confirming payment" aria-live="polite">
        {!confirmTimedOut && <div className="booking-spinner" aria-hidden="true" />}
        <h2 className="booking-panel-title">{confirmTimedOut ? 'Still confirming' : 'Confirming your payment'}</h2>
        <p className="booking-panel-copy">
          {confirmTimedOut
            ? 'We will message you on WhatsApp when it is done. You do not need to pay again.'
            : 'This usually takes a few seconds. Keep this page open.'}
        </p>
        {confirmTimedOut && (
          <button type="button" className="booking-btn booking-btn-outline" onClick={onCheckAgain}>
            Check again
          </button>
        )}
      </section>
    );
  }

  if (step === 'released') {
    return (
      <section className="booking-panel" aria-label="Seat released">
        <h2 className="booking-panel-title">Your seat was released</h2>
        <p className="booking-panel-copy">
          We could not confirm your payment in time, so the seat went back to the class. You have not been charged.
        </p>
        <button type="button" className="booking-btn booking-btn-primary" onClick={onStartBooking}>
          Book again
        </button>
      </section>
    );
  }

  if (step === 'failed') {
    return (
      <section className="booking-panel booking-panel-danger" aria-label="Payment failed">
        <h2 className="booking-panel-title" style={{ color: 'var(--b-danger)' }}>
          Payment did not go through
        </h2>
        <p className="booking-panel-copy">
          You have not been charged. Your seat is held for 60 minutes while you try again.
        </p>
        {paymentError && (
          <p className="booking-notice booking-notice-danger" role="alert">
            {paymentError}
          </p>
        )}
        <button
          type="button"
          className="booking-btn booking-btn-primary"
          onClick={onRetryPayment}
          disabled={submitting}
          aria-busy={submitting}
        >
          {submitting ? 'Opening payment…' : 'Try again'}
        </button>
      </section>
    );
  }

  if (step === 'paying') {
    return (
      <section className="booking-panel booking-panel-center" aria-label="Opening payment" aria-live="polite">
        <div className="booking-spinner" aria-hidden="true" />
        <h2 className="booking-panel-title">Opening secure payment</h2>
        <p className="booking-panel-copy">
          You will pay {dueNow} on Paystack. Come back here when you are done and we will confirm your seat.
        </p>
        {authorizationUrl && (
          <a className="booking-btn booking-btn-dark" href={authorizationUrl}>
            Continue to Paystack
          </a>
        )}
      </section>
    );
  }

  if (step === 'wait') {
    return (
      <section className="booking-panel" aria-label="Join the waiting list">
        <div className="booking-panel-head">
          <h2 className="booking-panel-title">Join the waiting list</h2>
          <button type="button" className="booking-linkbtn" onClick={onBack}>
            Back
          </button>
        </div>
        <p className="booking-section-note">No payment now. If a seat opens we message you on WhatsApp.</p>
        <form onSubmit={handleWaitlistSubmit} noValidate>
          <div className="booking-field-stack" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {renderNameField('booking-wait-name')}
            {renderPhoneField('booking-wait-phone')}
            {formError && (
              <p className="booking-notice booking-notice-danger" role="alert">
                {formError}
              </p>
            )}
            <button
              type="submit"
              className="booking-btn booking-btn-dark"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? 'Adding you…' : 'Add me to the waiting list'}
            </button>
          </div>
        </form>
      </section>
    );
  }

  if (step === 'form') {
    return (
      <section className="booking-panel" aria-label="Your details">
        <div className="booking-panel-head">
          <h2 className="booking-panel-title">{view.isFree ? 'Reserve your free seat' : 'Your details'}</h2>
          <button type="button" className="booking-linkbtn" onClick={onBack}>
            Back
          </button>
        </div>
        <form onSubmit={handleBookingSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {renderNameField('booking-name')}
            {renderPhoneField('booking-phone')}

            <div className="booking-field">
              <label className="booking-label" htmlFor="booking-email">
                Email <span className="booking-label-optional">(optional, for your receipt)</span>
              </label>
              <input
                id="booking-email"
                className="booking-input"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={fieldError('email') ? 'true' : undefined}
                aria-describedby={fieldError('email') ? 'booking-email-error' : undefined}
              />
              {fieldError('email') && (
                <span className="booking-error" id="booking-email-error" role="alert">
                  {fieldError('email')}
                </span>
              )}
            </div>

            {showPlans && (
              <div className="booking-radios" role="radiogroup" aria-label="How would you like to pay?">
                <span className="booking-radio-label">How would you like to pay?</span>
                <button
                  type="button"
                  role="radio"
                  data-plan="full"
                  aria-checked={plan === 'full'}
                  tabIndex={plan === 'full' ? 0 : -1}
                  className="booking-radio"
                  onClick={() => onPlanChange('full')}
                  onKeyDown={handleRadioKey}
                >
                  <span className="booking-radio-copy">
                    <span className="booking-radio-title">Pay everything now</span>
                    <span className="booking-radio-note">One payment {sessionPhrase(view.sessionCount)}</span>
                  </span>
                  <span className="booking-radio-amount">{formatMoney(view.price, view.currency)}</span>
                </button>
                <button
                  type="button"
                  role="radio"
                  data-plan="installments"
                  aria-checked={plan === 'installments'}
                  tabIndex={plan === 'installments' ? 0 : -1}
                  className="booking-radio"
                  onClick={() => onPlanChange('installments')}
                  onKeyDown={handleRadioKey}
                >
                  <span className="booking-radio-copy">
                    <span className="booking-radio-title">Pay in {view.plans.count} parts</span>
                    <span className="booking-radio-note">{installmentChoiceCopy(view)}</span>
                  </span>
                  <span className="booking-radio-amount">
                    {formatMoney(planNow(view, 'installments'), view.currency)} now
                  </span>
                </button>
              </div>
            )}

            <div className="booking-summary">
              <div className="booking-summary-row">
                <span className="booking-muted">{view.title}</span>
                <span>{formatMoney(view.price, view.currency)}</span>
              </div>
              <div className="booking-summary-row booking-summary-total">
                <span>{view.isFree ? 'Total' : 'Pay today'}</span>
                <span>{formatMoney(amountNow, view.currency)}</span>
              </div>
              {showPlans && (
                <div className="booking-hint">
                  {plan === 'installments' ? installmentLaterLine(view) : 'One payment. Nothing more to pay.'}
                </div>
              )}
            </div>

            {view.confirmSeat && (
              <p className="booking-hint">We will message you on WhatsApp. Reply YES to confirm your seat.</p>
            )}

            {formError && (
              <p className="booking-notice booking-notice-danger" role="alert">
                {formError}
              </p>
            )}

            <button
              type="submit"
              className="booking-btn booking-btn-primary"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting
                ? 'Opening secure payment…'
                : view.isFree
                  ? 'Reserve my seat'
                  : `Pay ${dueNow} securely`}
            </button>
            <div className="booking-secure">
              <LockIcon />
              <span>
                {view.isFree
                  ? 'We only use your number to send class messages.'
                  : 'Secure payment by Paystack. We never see your card.'}
              </span>
            </div>
          </div>
        </form>
      </section>
    );
  }

  return (
    <section className="booking-panel" aria-label="Book this class">
      <div className="booking-price-block">
        <div className="booking-price">{view.isFree ? 'Free' : formatMoney(view.price, view.currency)}</div>
        <div className="booking-price-note">
          {view.isFree ? 'No payment needed. Reserve a seat and we will remind you.' : view.priceLine}
        </div>
      </div>

      <div className="booking-seats">
        <div className="booking-seats-line">
          <span>{seatsLine(view)}</span>
        </div>
        {view.seats.percent !== null && (
          <div
            className="booking-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={view.seats.percent}
            aria-label="Seats taken"
          >
            <div
              className={`booking-progress-fill${full ? ' booking-progress-fill-full' : ''}`}
              style={{ width: `${view.seats.percent}%` }}
            />
          </div>
        )}
        {view.fewLeft && <span className="booking-pill-warning">Only {view.seats.left} seats left</span>}
      </div>

      {ended ? (
        <p className="booking-notice booking-notice-warning">This class is not taking bookings.</p>
      ) : full ? (
        <>
          <p className="booking-notice booking-notice-danger">This class is full right now.</p>
          {view.waitlistEnabled ? (
            <>
              <button type="button" className="booking-btn booking-btn-dark" onClick={onStartWaitlist}>
                Join the waiting list
              </button>
              <p className="booking-muted-small" style={{ textAlign: 'center' }}>
                If a seat opens, we message you first. You have 24 hours to take it.
              </p>
            </>
          ) : (
            <p className="booking-muted">The waiting list is closed for this class.</p>
          )}
        </>
      ) : (
        <>
          <button type="button" className="booking-btn booking-btn-primary" onClick={onStartBooking}>
            Reserve my seat
          </button>
          <div className="booking-muted-small" style={{ textAlign: 'center' }}>
            No account needed. Takes about a minute.
          </div>
        </>
      )}
    </section>
  );
}
