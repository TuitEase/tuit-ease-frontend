import { useEffect, useState } from 'react';
import { formatMoney, toNaira } from '../lib/money';
import { BookingApiError, fetchBookingStatus, PUBLIC_OFFLINE_MESSAGE, retryPayment, type BookingStatus } from './api';
import { BrandLogo } from './components/BrandLogo';
import { Seo } from './components/Seo';
import './booking.css';
import './pay-page.css';

type Stage = 'loading' | 'ready' | 'paying' | 'error';

function referenceFromPath(pathname: string): string | null {
  return pathname.match(/^\/pay\/([0-9a-f-]{36})\/?$/i)?.[1] ?? null;
}

export function PayPage() {
  const [reference] = useState(() => referenceFromPath(window.location.pathname));
  const [booking, setBooking] = useState<BookingStatus | null>(null);
  const [stage, setStage] = useState<Stage>(reference ? 'loading' : 'error');
  const [error, setError] = useState<string | null>(reference ? null : 'This payment link is not valid.');

  useEffect(() => {
    if (!reference) return;
    let cancelled = false;
    fetchBookingStatus(reference).then(
      (result) => {
        if (cancelled) return;
        setBooking(result);
        setStage('ready');
      },
      (requestError: unknown) => {
        if (cancelled) return;
        setError(requestError instanceof BookingApiError ? requestError.message : PUBLIC_OFFLINE_MESSAGE);
        setStage('error');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [reference]);

  async function beginPayment() {
    if (!reference) return;
    setStage('paying');
    setError(null);
    try {
      const result = await retryPayment(reference);
      window.location.assign(result.authorization_url);
    } catch (requestError) {
      setError(requestError instanceof BookingApiError ? requestError.message : PUBLIC_OFFLINE_MESSAGE);
      setStage('ready');
    }
  }

  const balance = toNaira(booking?.balance);
  const canPay = Boolean(
    booking
    && balance > 0
    && ['pending_payment', 'active'].includes(booking.status),
  );
  const title = booking?.class || 'Your booking';

  return (
    <div className="booking-shell payment-link-shell">
      <Seo title="Complete your payment | TuitEase" description="Securely complete the remaining balance for your TuitEase booking." noindex />
      <header className="payment-link-header">
        <a href="/" aria-label="TuitEase home"><BrandLogo /></a>
        <span>Secure booking payment</span>
      </header>
      <main className="payment-link-main">
        <section className="payment-link-card" aria-labelledby="payment-link-title">
          <div className="payment-link-mark" aria-hidden="true">₦</div>
          <p className="payment-link-eyebrow">TuitEase checkout</p>
          <h1 id="payment-link-title">{stage === 'loading' ? 'Loading your booking…' : title}</h1>
          {stage === 'loading' ? <p className="payment-link-muted" role="status">Checking your payment details securely.</p> : null}
          {error ? <p className="payment-link-error" role="alert">{error}</p> : null}
          {booking && stage !== 'loading' ? (
            <>
              <div className="payment-link-amount">
                <span>{balance > 0 ? 'Remaining balance' : 'Amount paid'}</span>
                <strong>{formatMoney(balance > 0 ? booking.balance : booking.amount_paid)}</strong>
              </div>
              {canPay ? (
                <button
                  type="button"
                  className="payment-link-button"
                  disabled={stage === 'paying'}
                  onClick={() => void beginPayment()}
                >
                  {stage === 'paying' ? 'Connecting to secure checkout…' : 'Continue to payment'}
                </button>
              ) : (
                <p className="payment-link-status" role="status">
                  {booking.status === 'cancelled'
                    ? 'This booking is no longer active. Contact the class host for help.'
                    : booking.status === 'waitlisted'
                      ? 'This booking is on the waiting list and cannot be paid yet.'
                      : 'This booking has been paid in full. Thank you!'}
                </p>
              )}
              <p className="payment-link-footnote">Payments are processed securely by Paystack.</p>
            </>
          ) : null}
          {stage === 'error' && !booking ? (
            <a className="payment-link-back" href="/">Return to TuitEase</a>
          ) : null}
        </section>
      </main>
      <footer className="payment-link-footer">Powered by <strong>TuitEase</strong></footer>
    </div>
  );
}
