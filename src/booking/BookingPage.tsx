import { useEffect, useRef, useState } from 'react';
import {
  BookingApiError,
  createPublicBooking,
  fetchBookingStatus,
  fetchPublicClass,
  PUBLIC_OFFLINE_MESSAGE,
  retryPayment,
  verifyPayment,
  type BookingPlan,
  type BookingStatus,
  type CreateBookingResponse,
} from './api';
import {
  bookingReferenceFromSearch,
  buildView,
  firstNameOf,
  paymentReferenceFromSearch,
  readRememberedName,
  rememberBookingName,
  rememberBookingSlug,
  shareUrl,
  slugFromLocation,
  type PublicClassView,
} from './model';
import { publicBaseUrl } from '../createClass/format';
import { formatMoney } from '../lib/money';
import { ClassColumn } from './components/ClassColumn';
import { BrandLogo } from './components/BrandLogo';
import { BookingPanel, type BookingFormValues, type PanelStep, type WaitlistFormValues } from './components/BookingPanel';
import { Seo } from './components/Seo';
import { SharePanel } from './components/SharePanel';
import { ShareIcon } from './components/icons';

const CONFIRM_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 2_500;

type LoadStage = 'loading' | 'ready' | 'not-found' | 'error';

function asFull(view: PublicClassView): PublicClassView {
  return {
    ...view,
    status: 'full',
    seats: {
      ...view.seats,
      left: 0,
      booked: view.seats.capacity ?? view.seats.booked,
      percent: view.seats.capacity !== null ? 100 : view.seats.percent,
    },
  };
}

function asEnded(view: PublicClassView): PublicClassView {
  return { ...view, status: 'ended' };
}

function errorMessage(error: unknown): string {
  if (error instanceof BookingApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return PUBLIC_OFFLINE_MESSAGE;
}

export function BookingPage() {
  const [initialReference] = useState(() => bookingReferenceFromSearch(window.location.search));
  const [slug] = useState(() => slugFromLocation(window.location));

  const [stage, setStage] = useState<LoadStage>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<PublicClassView | null>(null);
  const [step, setStep] = useState<PanelStep>(() => (initialReference ? 'confirming' : 'page'));

  const [plan, setPlan] = useState<BookingPlan>('full');
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [bookingRef, setBookingRef] = useState<string | null>(initialReference);
  const [bookingStatus, setBookingStatus] = useState<BookingStatus | null>(null);
  const [confirmTimedOut, setConfirmTimedOut] = useState(false);
  const [confirmToken, setConfirmToken] = useState(0);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [authorizationUrl, setAuthorizationUrl] = useState<string | null>(null);
  const [firstName, setFirstName] = useState(() =>
    initialReference ? firstNameOf(readRememberedName(initialReference)) : '',
  );
  const [shareOpen, setShareOpen] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const busyRef = useRef(false);
  const verifiedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setStage('not-found');
      return;
    }
    const controller = new AbortController();
    let active = true;
    setStage('loading');
    setLoadError(null);

    fetchPublicClass(slug, controller.signal)
      .then((raw) => {
        if (!active) return;
        setView(buildView(raw));
        setStage('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        if (error instanceof BookingApiError && error.status === 404) {
          setStage('not-found');
          return;
        }
        setLoadError(errorMessage(error));
        setStage('error');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [slug, reloadToken]);

  useEffect(() => {
    if (stage !== 'ready' || step !== 'confirming' || !bookingRef) return;

    let cancelled = false;
    let timer: number | null = null;
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        timer = window.setTimeout(resolve, ms);
      });

    async function run() {
      const paymentRef = paymentReferenceFromSearch(window.location.search);
      if (paymentRef && verifiedRef.current !== paymentRef) {
        verifiedRef.current = paymentRef;
        try {
          await verifyPayment(paymentRef);
        } catch {
          /* The webhook may still land; polling the booking is the source of truth. */
        }
      }

      const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
      while (!cancelled) {
        try {
          const status = await fetchBookingStatus(bookingRef as string);
          if (cancelled) return;
          setBookingStatus(status);
          if (status.status === 'active') {
            setStep('done');
            return;
          }
          if (status.status === 'waitlisted') {
            setWaitlistPosition(status.position ?? null);
            setStep('wait-done');
            return;
          }
          if (status.status === 'cancelled') {
            setStep('released');
            return;
          }
        } catch (error) {
          if (cancelled) return;
          if (error instanceof BookingApiError && error.status === 404) {
            setStep('released');
            return;
          }
        }

        if (Date.now() >= deadline) {
          setConfirmTimedOut(true);
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
  }, [stage, step, bookingRef, confirmToken]);

  function applyBooking(response: CreateBookingResponse, displayName: string) {
    const reference = response.booking;
    setBookingRef(reference);
    if (view) rememberBookingSlug(reference, view.slug);
    if (displayName.trim()) {
      rememberBookingName(reference, displayName);
      setFirstName(firstNameOf(displayName));
    }

    if (response.status === 'waitlisted') {
      setWaitlistPosition(response.position ?? null);
      setStep('wait-done');
      return;
    }
    if (response.status === 'active') {
      setStep('done');
      return;
    }
    if (response.status === 'cancelled') {
      setStep('released');
      return;
    }
    if (response.authorization_url) {
      setAuthorizationUrl(response.authorization_url);
      setStep('paying');
      window.location.assign(response.authorization_url);
      return;
    }
    setPaymentError(response.payment_error ?? 'We could not start the payment. Please try again.');
    setStep('failed');
  }

  function handleBookingError(error: unknown) {
    if (error instanceof BookingApiError) {
      const message = error.message;
      const lower = message.toLowerCase();
      if (lower.includes('already have a booking')) {
        setStep('duplicate');
        return;
      }
      if (lower.includes('class is full')) {
        setView((current) => (current ? asFull(current) : current));
        setStep('page');
        return;
      }
      if (lower.includes('not open for booking') || lower.includes('not taking bookings')) {
        setView((current) => (current ? asEnded(current) : current));
        setStep('page');
        return;
      }
      if (error.fields && Object.keys(error.fields).length > 0) {
        setFieldErrors(error.fields);
        setFormError(null);
        setStep('form');
        return;
      }
      if (lower.includes('phone')) {
        setFieldErrors({ phone: message });
        setFormError(null);
        setStep('form');
        return;
      }
      if (lower.includes('enter your name')) {
        setFieldErrors({ name: message });
        setFormError(null);
        setStep('form');
        return;
      }
      setFormError(message);
      setStep('form');
      return;
    }
    setFormError(PUBLIC_OFFLINE_MESSAGE);
    setStep('form');
  }

  async function submitBooking(values: BookingFormValues) {
    if (!view || busyRef.current) return;
    busyRef.current = true;
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    setPaymentError(null);
    try {
      const response = await createPublicBooking(view.slug, values);
      applyBooking(response, values.name);
    } catch (error) {
      handleBookingError(error);
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  }

  async function submitWaitlist(values: WaitlistFormValues) {
    if (!view || busyRef.current) return;
    busyRef.current = true;
    setSubmitting(true);
    setFieldErrors({});
    setFormError(null);
    setPaymentError(null);
    try {
      const response = await createPublicBooking(view.slug, {
        name: values.name,
        phone: values.phone,
        email: null,
        plan: 'full',
      });
      applyBooking(response, values.name);
    } catch (error) {
      handleBookingError(error);
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  }

  async function retryCurrentPayment() {
    if (!bookingRef || busyRef.current) return;
    busyRef.current = true;
    setSubmitting(true);
    setPaymentError(null);
    try {
      const response = await retryPayment(bookingRef);
      if (response.authorization_url) {
        setAuthorizationUrl(response.authorization_url);
        setStep('paying');
        window.location.assign(response.authorization_url);
        return;
      }
      setPaymentError('We could not start the payment. Please try again.');
    } catch (error) {
      const message = errorMessage(error);
      if (/nothing left to pay/i.test(message)) {
        setConfirmTimedOut(false);
        setConfirmToken((value) => value + 1);
        setStep('confirming');
      } else {
        setPaymentError(message);
      }
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  }

  function startBooking() {
    setFieldErrors({});
    setFormError(null);
    setPaymentError(null);
    setStep('form');
  }

  function startWaitlist() {
    setFieldErrors({});
    setFormError(null);
    setStep('wait');
  }

  const base = publicBaseUrl();
  const share = view ? shareUrl(view.slug, base) : '';
  const title = view
    ? `${view.title} · ${view.host.name}`
    : stage === 'not-found'
      ? 'Class not found · TuitEase'
      : 'Book your seat · TuitEase';
  const description = view
    ? view.description || `${view.title} with ${view.host.name}. ${view.whenCopy}`
    : 'Book your seat for this class on TuitEase.';

  const stickyMoney = view ? (view.isFree ? 'Free' : formatMoney(view.price, view.currency)) : '';
  const stickyNote = view
    ? view.isFree
      ? 'No payment needed'
      : view.sessionCount === 1
        ? 'for your session'
        : `for all ${view.sessionCount} sessions`
    : '';
  const showSticky =
    view !== null &&
    step === 'page' &&
    view.status !== 'ended' &&
    (view.status !== 'full' || view.waitlistEnabled);

  return (
    <div className="booking-shell">
      <Seo title={title} description={description} image={view?.cover.imageUrl ?? null} url={view ? share : undefined} />

      {view ? (
        <header className="booking-hostbar">
          <div className="booking-hostbar-inner">
            <div className="booking-header-identity">
              <BrandLogo className="booking-brand-header" />
              <span className="booking-host-divider" aria-hidden="true" />
              <div className="booking-host booking-host-feature">
                <div className="booking-avatar" aria-hidden="true">
                  {view.host.initials}
                </div>
                <div className="booking-host-names">
                  <span className="booking-host-role">YOUR CLASS HOST</span>
                  <span className="booking-host-name">{view.host.name}</span>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="booking-share-toggle"
              aria-label="Share this class"
              title="Share this class"
              aria-expanded={shareOpen}
              aria-controls="booking-share-panel"
              onClick={() => setShareOpen((open) => !open)}
            >
              <ShareIcon color="#FFFFFF" />
            </button>
          </div>
        </header>
      ) : (
        <header className="booking-hostbar">
          <div className="booking-hostbar-inner">
            <BrandLogo className="booking-brand-header" />
          </div>
        </header>
      )}

      {stage === 'loading' && (
        <main className="booking-main">
          <div className="booking-skeleton" role="status" aria-busy="true" aria-label="Loading class details">
            <span className="booking-sr">Loading class details…</span>
            <div className="booking-skeleton-block" style={{ height: 60, borderRadius: 20 }} />
            <div className="booking-columns">
              <div className="booking-left">
                <div className="booking-skeleton-block" style={{ height: 340, borderRadius: 28 }} />
                <div className="booking-skeleton-block" style={{ height: 220, borderRadius: 24 }} />
              </div>
              <div className="booking-right">
                <div className="booking-skeleton-block" style={{ height: 300, borderRadius: 28 }} />
              </div>
            </div>
          </div>
        </main>
      )}

      {stage === 'not-found' && (
        <div className="booking-empty">
          <div className="booking-empty-card">
            <BrandLogo />
            <h1 className="booking-empty-title">This class could not be found</h1>
            <p className="booking-empty-copy">
              The link may be wrong, or the host has taken this class down. Ask them for a fresh link.
            </p>
            <div className="booking-empty-actions">
              <a className="booking-btn booking-btn-outline" href="/">
                Go to TuitEase
              </a>
            </div>
          </div>
        </div>
      )}

      {stage === 'error' && (
        <div className="booking-empty">
          <div className="booking-empty-card">
            <BrandLogo />
            <h1 className="booking-empty-title">We could not load this class</h1>
            <p className="booking-empty-copy">{loadError ?? PUBLIC_OFFLINE_MESSAGE}</p>
            <div className="booking-empty-actions">
              <button
                type="button"
                className="booking-btn booking-btn-primary"
                onClick={() => setReloadToken((value) => value + 1)}
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {stage === 'ready' && view && (
        <main className="booking-main">
          {shareOpen && (
            <SharePanel
              id="booking-share-panel"
              url={share}
              title={view.title}
              slug={view.slug}
              startsLine={view.firstSession?.line1 ?? ''}
            />
          )}

          <div className="booking-columns">
            <ClassColumn view={view} />

            <div className="booking-right">
              <BookingPanel
                view={view}
                step={step}
                plan={plan}
                onPlanChange={setPlan}
                submitting={submitting}
                fieldErrors={fieldErrors}
                formError={formError}
                paymentError={paymentError}
                bookingRef={bookingRef}
                bookingStatus={bookingStatus}
                confirmTimedOut={confirmTimedOut}
                waitlistPosition={waitlistPosition}
                firstName={firstName}
                authorizationUrl={authorizationUrl}
                onBack={() => setStep('page')}
                onStartBooking={startBooking}
                onStartWaitlist={startWaitlist}
                onSubmitBooking={(values) => void submitBooking(values)}
                onSubmitWaitlist={(values) => void submitWaitlist(values)}
                onRetryPayment={() => void retryCurrentPayment()}
                onCheckAgain={() => {
                  setConfirmTimedOut(false);
                  setConfirmToken((value) => value + 1);
                }}
                onShare={() => setShareOpen(true)}
              />
            </div>
          </div>

          <footer className="booking-footer">
            Booking page by <strong>TuitEase</strong>
          </footer>
        </main>
      )}

      {showSticky && view && (
        <div className="booking-sticky">
          <div className="booking-sticky-price">
            <strong>{stickyMoney}</strong>
            <span>{stickyNote}</span>
          </div>
          <button
            type="button"
            className={`booking-btn ${view.status === 'full' ? 'booking-btn-dark' : 'booking-btn-primary'}`}
            onClick={view.status === 'full' ? startWaitlist : startBooking}
          >
            {view.status === 'full' ? 'Join the waiting list' : 'Reserve my seat'}
          </button>
        </div>
      )}
    </div>
  );
}
