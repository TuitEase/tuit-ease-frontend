import { useEffect, useRef, useState } from 'react';
import {
  BookingApiError,
  bookingCalendarUrl,
  fetchBookingStatus,
  PUBLIC_OFFLINE_MESSAGE,
  verifyPayment,
  type BookingStatus,
} from './api';
import {
  bookingPaidAmount,
  bookingReferenceFromSearch,
  classReturnUrl,
  firstNameOf,
  nextDueLine,
  paymentReferenceFromSearch,
  readRememberedName,
  readRememberedSlug,
} from './model';
import { formatMoney, toNaira } from '../lib/money';
import { CalendarIcon, CheckCircle } from './components/icons';
import { BrandLogo } from './components/BrandLogo';
import { Seo } from './components/Seo';

const CONFIRM_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 2_500;

type Stage = 'redirecting' | 'loading' | 'confirmed' | 'waitlisted' | 'released' | 'timed-out' | 'missing' | 'error';

export function ReturnPage() {
  const [search] = useState(() => window.location.search);
  const [reference] = useState(() => bookingReferenceFromSearch(search));
  const [slug] = useState(() => (reference ? readRememberedSlug(reference) : null));
  const [status, setStatus] = useState<BookingStatus | null>(null);
  const [stage, setStage] = useState<Stage>(() => {
    if (!reference) return 'missing';
    return slug ? 'redirecting' : 'loading';
  });
  const [error, setError] = useState<string | null>(null);
  const checkedRef = useRef<string | null>(null);

  useEffect(() => {
    if (stage !== 'redirecting' || !reference || !slug) return;
    window.location.replace(classReturnUrl(slug, reference, search));
  }, [stage, reference, slug, search]);

  useEffect(() => {
    if (stage !== 'loading' || !reference) return;

    let cancelled = false;
    let timer: number | null = null;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timer = window.setTimeout(resolve, ms);
      });

    async function run() {
      const paymentRef = paymentReferenceFromSearch(search);
      if (paymentRef && checkedRef.current !== paymentRef) {
        checkedRef.current = paymentRef;
        try {
          await verifyPayment(paymentRef);
        } catch {
          /* Fall through to the booking status; the webhook is the source of truth. */
        }
      }

      const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
      while (!cancelled) {
        try {
          const next = await fetchBookingStatus(reference as string);
          if (cancelled) return;
          setStatus(next);
          if (next.status === 'active') {
            setStage('confirmed');
            return;
          }
          if (next.status === 'waitlisted') {
            setStage('waitlisted');
            return;
          }
          if (next.status === 'cancelled') {
            setStage('released');
            return;
          }
        } catch (err) {
          if (cancelled) return;
          setError(err instanceof BookingApiError ? err.message : PUBLIC_OFFLINE_MESSAGE);
          setStage('error');
          return;
        }

        if (Date.now() >= deadline) {
          setStage('timed-out');
          return;
        }
        await wait(POLL_INTERVAL_MS);
      }
    }

    void run();
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [stage, reference, search]);

  const firstName = reference ? firstNameOf(readRememberedName(reference)) : '';
  const title = stage === 'confirmed' ? 'Booking confirmed · TuitEase' : 'Confirming your booking · TuitEase';

  return (
    <div className="booking-shell">
      <Seo title={title} description="Confirming your TuitEase booking." noindex />

      <header className="booking-hostbar">
        <div className="booking-hostbar-inner">
          <BrandLogo className="booking-brand-header" />
        </div>
      </header>

      <div className="booking-empty">
        <div className="booking-empty-card" aria-live="polite">
          {stage === 'redirecting' && (
            <>
              <div className="booking-spinner" aria-hidden="true" />
              <h1 className="booking-empty-title">Taking you back…</h1>
              <p className="booking-empty-copy">Opening your class page to confirm the payment.</p>
            </>
          )}

          {stage === 'loading' && (
            <>
              <div className="booking-spinner" aria-hidden="true" />
              <h1 className="booking-empty-title">Confirming your payment</h1>
              <p className="booking-empty-copy">This usually takes a few seconds. Keep this page open.</p>
            </>
          )}

          {stage === 'confirmed' && (
            <>
              <CheckCircle />
              <h1 className="booking-empty-title">{firstName ? `You are in, ${firstName}!` : 'You are in!'}</h1>
              <p className="booking-empty-copy">
                {status?.class ? `${status.class} is confirmed.` : 'Your booking is confirmed.'} We sent the details to
                your WhatsApp.
              </p>
              <div className="booking-done-card">
                {status?.class && <strong>{status.class}</strong>}
                <span className="booking-paid-line">
                  Paid {formatMoney(bookingPaidAmount(status), 'NGN')}
                  {status && toNaira(status.balance) > 0
                    ? ` · ${nextDueLine(status, 'NGN') || `${formatMoney(status.balance, 'NGN')} due later`}`
                    : ''}
                </span>
              </div>
              {reference && (
                <a className="booking-btn booking-btn-outline-whatsapp" href={bookingCalendarUrl(reference)}>
                  <CalendarIcon />
                  Add the sessions to my calendar
                </a>
              )}
            </>
          )}

          {stage === 'waitlisted' && (
            <>
              <CheckCircle fill="#16161A" label="Added to the waiting list" />
              <h1 className="booking-empty-title">{firstName ? `You are on the list, ${firstName}` : 'You are on the list'}</h1>
              <p className="booking-empty-copy">
                If a seat opens we will message you on WhatsApp and you will have 24 hours to take it. You have not been
                charged.
              </p>
            </>
          )}

          {stage === 'released' && (
            <>
              <h1 className="booking-empty-title">Your seat was released</h1>
              <p className="booking-empty-copy">
                We could not confirm your payment in time, so the seat went back to the class. You have not been
                charged.
              </p>
            </>
          )}

          {stage === 'timed-out' && (
            <>
              <div className="booking-spinner" aria-hidden="true" />
              <h1 className="booking-empty-title">Still confirming</h1>
              <p className="booking-empty-copy">
                We will message you on WhatsApp when it is done. You do not need to pay again.
              </p>
            </>
          )}

          {stage === 'missing' && (
            <>
              <h1 className="booking-empty-title">No booking to confirm</h1>
              <p className="booking-empty-copy">Open the link your host sent you to see your class and booking.</p>
            </>
          )}

          {stage === 'error' && (
            <>
              <h1 className="booking-empty-title">We could not confirm your booking</h1>
              <p className="booking-empty-copy">{error ?? PUBLIC_OFFLINE_MESSAGE}</p>
            </>
          )}

          {(stage === 'confirmed' ||
            stage === 'released' ||
            stage === 'timed-out' ||
            stage === 'missing' ||
            stage === 'error') && (
            <a className="booking-btn booking-btn-outline" href="/">
              Go to TuitEase
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
