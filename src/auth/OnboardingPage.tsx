import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  AuthApiError,
  completeHostOnboarding,
  fetchHostProfile,
  fetchPayoutBanks,
  getAuthToken,
  isAuthTokenStorageEvent,
  resolveAccountName,
  setupHostPayout,
  updateHostProfile,
  type Bank,
  type HostProfile,
} from './api';
import './auth.css';
import './onboarding.css';

const HOST_TYPES = [
  { value: 'tech', label: 'Tech & professional training' },
  { value: 'tutor', label: 'Tutoring & exam preparation' },
  { value: 'fitness', label: 'Fitness & wellness' },
  { value: 'creative', label: 'Creative classes & crafts' },
  { value: 'business', label: 'Business & leadership' },
  { value: 'community', label: 'Community & events' },
  { value: 'other', label: 'Something else' },
];

const TIMEZONES = [
  'Africa/Lagos',
  'Africa/Accra',
  'Africa/Nairobi',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'Europe/London',
  'UTC',
];

interface ProfileValues {
  business_name: string;
  host_type: string;
  whatsapp_number: string;
}

interface Preferences {
  timezone: string;
  summary_hour: number;
  daily_summary_enabled: boolean;
}

interface OnboardingPageProps {
  onNavigate?: (path: string) => void;
}

export default function OnboardingPage({ onNavigate }: OnboardingPageProps = {}) {
  const [host, setHost] = useState<HostProfile | null>(null);
  const [profile, setProfile] = useState<ProfileValues>({
    business_name: '',
    host_type: '',
    whatsapp_number: '',
  });
  const [preferences, setPreferences] = useState<Preferences>({
    timezone: 'Africa/Lagos',
    summary_hour: 7,
    daily_summary_enabled: true,
  });
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);
  const banksRequested = useRef(false);
  const [bankRetry, setBankRetry] = useState(0);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvedAccountName, setResolvedAccountName] = useState('');
  const [accountNameConfirmed, setAccountNameConfirmed] = useState(false);
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [bankError, setBankError] = useState('');
  const [error, setError] = useState('');
  const [payoutSkipped, setPayoutSkipped] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      window.location.assign('/signin/');
      return;
    }
    let active = true;
    fetchHostProfile()
      .then((currentHost) => {
        if (!active) return;
        setHost(currentHost);
        setProfile({
          business_name: currentHost.business_name,
          host_type: currentHost.host_type ?? '',
          whatsapp_number: currentHost.whatsapp_number ?? '',
        });
        setPreferences({
          timezone: currentHost.timezone ?? 'Africa/Lagos',
          summary_hour: currentHost.summary_hour ?? 7,
          daily_summary_enabled: currentHost.daily_summary_enabled ?? true,
        });
        if (!currentHost.needs_onboarding) {
          if (!currentHost.payout_ready) setStep(2);
          else setCompleted(true);
        }
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        setError(
          loadError instanceof AuthApiError
            ? loadError.message
            : 'Could not load your host profile. Please refresh and try again.',
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (!isAuthTokenStorageEvent(event)) return;
      if (!getAuthToken()) window.location.assign('/signin/');
      else window.location.assign('/dashboard/');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (step !== 2 || host?.payout_ready || banks.length > 0 || banksRequested.current) return;
    let active = true;
    banksRequested.current = true;
    setBankLoading(true);
    setBankError('');
    fetchPayoutBanks()
      .then((availableBanks) => {
        if (active) setBanks(availableBanks);
      })
      .catch((bankListError: unknown) => {
        if (active) {
          setBankError(
            bankListError instanceof AuthApiError
              ? bankListError.message
              : 'Could not load the bank list. Please try again.',
          );
        }
      })
      .finally(() => {
        if (active) setBankLoading(false);
      });
    return () => {
      active = false;
      if (banks.length === 0) banksRequested.current = false;
    };
  }, [step, host?.payout_ready, banks.length, bankRetry]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileError('');
    setError('');
    const businessName = profile.business_name.trim();
    if (!businessName) {
      setProfileError('Enter your business or host name to continue.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateHostProfile({
        business_name: businessName,
        host_type: profile.host_type,
        whatsapp_number: profile.whatsapp_number.trim(),
      });
      setHost(updated);
      setProfile((current) => ({ ...current, business_name: businessName }));
      setStep(1);
    } catch (saveError) {
      setError(
        saveError instanceof AuthApiError
          ? saveError.message
          : 'Could not save your host profile. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await updateHostProfile(preferences);
      const updatedHost = await completeHostOnboarding({
        business_name: profile.business_name.trim(),
        host_type: profile.host_type,
        whatsapp_number: profile.whatsapp_number.trim(),
      });
      setHost({ ...updatedHost, ...preferences });
      setStep(2);
    } catch (saveError) {
      setError(
        saveError instanceof AuthApiError
          ? saveError.message
          : 'Could not save your preferences. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const resolveAccount = async () => {
    if (!bankCode || !/^\d{10}$/.test(accountNumber)) {
      setResolvedAccountName('');
      setAccountNameConfirmed(false);
      setBankError('Enter a valid 10-digit account number and choose a bank to verify the account name.');
      return;
    }
    setResolvingAccount(true);
    setResolvedAccountName('');
    setAccountNameConfirmed(false);
    setBankError('');
    setError('');
    try {
      const accountName = await resolveAccountName(bankCode, accountNumber);
      setResolvedAccountName(accountName);
      setBankError('');
    } catch (resolveError) {
      setResolvedAccountName('');
      setBankError(
        resolveError instanceof AuthApiError
          ? resolveError.message
          : 'We could not validate this account number. Please check the details and try again.',
      );
    } finally {
      setResolvingAccount(false);
    }
  };

  const savePayout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBankError('');
    setError('');
    if (!bankCode) {
      setBankError('Choose your bank to continue.');
      return;
    }
    if (!/^\d{10}$/.test(accountNumber)) {
      setBankError('Enter a valid 10-digit account number.');
      return;
    }
    if (!resolvedAccountName) {
      setBankError('Please verify the account name before continuing.');
      return;
    }
    if (!accountNameConfirmed) {
      setBankError('Confirm that the account name matches the account you want to use.');
      return;
    }
    setSaving(true);
    try {
      const updatedHost = await setupHostPayout(bankCode, accountNumber);
      setHost(updatedHost);
      setAccountNumber('');
      setResolvedAccountName('');
      setAccountNameConfirmed(false);
    } catch {
      setError('Payout setup could not be confirmed. Check the bank and account details, then try again.');
      return;
    } finally {
      setSaving(false);
    }
    if (onNavigate) onNavigate('/dashboard/');
    else window.location.assign('/dashboard/');
  };

  const finishWithoutPayout = () => {
    if (onNavigate) onNavigate('/dashboard/');
    else window.location.assign('/dashboard/');
  };

  if (loading) {
    return <main className="onboarding-loading" role="status">Loading your host setup…</main>;
  }

  return (
    <main className="onboarding-page">
      <header className="onboarding-header">
        <a className="onboarding-logo" href={getAuthToken() ? '/dashboard/' : '/'} aria-label={getAuthToken() ? 'Return to dashboard' : 'TuitEase home'}>
          <img src="/assets/tuitease-logo.png" alt="TuitEase" />
        </a>
        <a href="/" className="onboarding-exit">Exit setup</a>
      </header>

      <div className="onboarding-layout">
        <aside className="onboarding-aside">
          <p className="auth-eyebrow">Your host workspace</p>
          <h1>Let’s get your classes ready to run.</h1>
          <p className="onboarding-aside-copy">
            A few quick details help TuitEase tailor your class operations and payment setup.
          </p>
          <ol className="onboarding-progress" aria-label="Setup progress">
            {['Your profile', 'Class preferences', 'Payout setup'].map((label, index) => (
              <li
                key={label}
                className={index === step && !completed ? 'is-current' : index < step || completed ? 'is-done' : ''}
                aria-current={index === step && !completed ? 'step' : undefined}
              >
                <span className="onboarding-progress-number">{index < step || completed ? '✓' : index + 1}</span>
                <span>{label}{index === 2 && <small>Optional</small>}</span>
              </li>
            ))}
          </ol>
        </aside>

        <section className="onboarding-card" aria-live="polite">
          {host && error && <div className="onboarding-alert" role="alert">{error}</div>}

          {!host && !error && (
            <div className="onboarding-alert" role="alert">
              We couldn’t find your host profile. Please sign in again.
              <a href="/signin/"> Go to sign in</a>
            </div>
          )}
          {!host && error && (
            <div className="onboarding-alert" role="alert">
              {error} <a href="/signin/">Sign in again</a>
            </div>
          )}

          {host && completed && (
            <CompletionPanel host={host} payoutSkipped={payoutSkipped} />
          )}

          {host && !completed && step === 0 && (
            <form onSubmit={saveProfile} className="onboarding-form">
              <div className="onboarding-step-heading">
                <p className="auth-eyebrow">Step 1 of 3</p>
                <h2>Tell us about your classes</h2>
                <p>Start with the name students and attendees know you by.</p>
              </div>

              <label className="onboarding-field">
                <span>Business or host name <b aria-hidden="true">*</b></span>
                <input
                  autoComplete="organization"
                  maxLength={160}
                  value={profile.business_name}
                  onChange={(event) => setProfile({ ...profile, business_name: event.target.value })}
                  aria-invalid={Boolean(profileError)}
                  aria-describedby={profileError ? 'business-name-error' : undefined}
                  required
                />
                {profileError && <small id="business-name-error" className="onboarding-error">{profileError}</small>}
              </label>

              <label className="onboarding-field">
                <span>What kind of classes do you host?</span>
                <select
                  value={profile.host_type}
                  onChange={(event) => setProfile({ ...profile, host_type: event.target.value })}
                >
                  <option value="">Choose a category (optional)</option>
                  {HOST_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>

              <label className="onboarding-field">
                <span>WhatsApp number <small>Optional</small></span>
                <input
                  autoComplete="tel"
                  type="tel"
                  placeholder="+234 801 234 5678"
                  value={profile.whatsapp_number}
                  onChange={(event) => setProfile({ ...profile, whatsapp_number: event.target.value })}
                />
                <small>Used for your host summaries and important class updates.</small>
              </label>

              <div className="onboarding-actions">
                <button className="auth-submit" type="submit" disabled={saving}>
                  {saving ? 'Saving profile…' : 'Save and continue'} <span aria-hidden="true">→</span>
                </button>
              </div>
            </form>
          )}

          {host && !completed && step === 1 && (
            <form onSubmit={savePreferences} className="onboarding-form">
              <div className="onboarding-step-heading">
                <p className="auth-eyebrow">Step 2 of 3</p>
                <h2>Choose your class rhythm</h2>
                <p>Set the local time for your daily host summary. You can change these preferences later.</p>
              </div>

              <label className="onboarding-field">
                <span>Your time zone</span>
                <select
                  value={preferences.timezone}
                  onChange={(event) => setPreferences({ ...preferences, timezone: event.target.value })}
                >
                  {TIMEZONES.map((timezone) => (
                    <option key={timezone} value={timezone}>{timezone.replaceAll('_', ' ')}</option>
                  ))}
                </select>
                <small>Class reminders and your daily summary use this time zone.</small>
              </label>

              <label className="onboarding-field">
                <span>Daily summary time</span>
                <select
                  value={preferences.summary_hour}
                  onChange={(event) => setPreferences({ ...preferences, summary_hour: Number(event.target.value) })}
                  disabled={!preferences.daily_summary_enabled}
                >
                  {Array.from({ length: 24 }, (_, hour) => (
                    <option key={hour} value={hour}>
                      {new Intl.DateTimeFormat('en', { hour: 'numeric', hour12: true, timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 1, hour)))}
                    </option>
                  ))}
                </select>
              </label>

              <label className="onboarding-toggle">
                <span>
                  <strong>Send me a daily class summary</strong>
                  <small>Bookings, payments, upcoming classes, and students who may need a reminder.</small>
                </span>
                <input
                  type="checkbox"
                  checked={preferences.daily_summary_enabled}
                  onChange={(event) => setPreferences({ ...preferences, daily_summary_enabled: event.target.checked })}
                />
              </label>

              <div className="onboarding-actions onboarding-actions-between">
                <button type="button" className="onboarding-secondary" onClick={() => setStep(0)}>← Back</button>
                <button className="auth-submit" type="submit" disabled={saving}>
                  {saving ? 'Saving preferences…' : 'Save and continue'} <span aria-hidden="true">→</span>
                </button>
              </div>
            </form>
          )}

          {host && !completed && step === 2 && (
            <form onSubmit={savePayout} className="onboarding-form">
              <div className="onboarding-step-heading">
                <p className="auth-eyebrow">Step 3 of 3 · Optional</p>
                <h2>{host.payout_ready ? 'Payouts are ready' : 'Where should class payments go?'}</h2>
                <p>
                  {host.payout_ready
                    ? 'Your Paystack payout account is connected.'
                    : 'Connect a bank account through Paystack to receive paid-class settlements.'}
                </p>
              </div>

              {!host.payout_ready && (
                <>
                  <div className="onboarding-payout-note">
                    You can skip this for now. You’ll need payout setup before publishing paid classes;
                    free classes do not require it.
                  </div>

                  {bankError && (
                    <div className="onboarding-alert" role="alert">
                      {bankError}
                      {banksRequested.current && banks.length === 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            banksRequested.current = false;
                            setBankRetry((current) => current + 1);
                          }}
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  )}

                  <label className="onboarding-field">
                    <span>Bank</span>
                    <select
                      value={bankCode}
                      onChange={(event) => {
                        setBankCode(event.target.value);
                        setResolvedAccountName('');
                        setAccountNameConfirmed(false);
                        setBankError('');
                      }}
                      disabled={bankLoading || banks.length === 0}
                      required
                    >
                      <option value="">{bankLoading ? 'Loading banks…' : 'Select your bank'}</option>
                      {banks.map((bank) => (
                        <option key={bank.code} value={bank.code}>{bank.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="onboarding-field">
                    <span>10-digit account number</span>
                    <input
                      autoComplete="off"
                      inputMode="numeric"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      value={accountNumber}
                      onChange={(event) => {
                        const next = event.target.value.replace(/\D/g, '').slice(0, 10);
                        setAccountNumber(next);
                        setResolvedAccountName('');
                        setAccountNameConfirmed(false);
                        setBankError('');
                      }}
                      required
                    />
                    <small>Sent directly to Paystack to create your settlement account; never saved in TuitEase.</small>
                  </label>

                  <div className="onboarding-account-resolve">
                    <button type="button" className="onboarding-secondary" onClick={resolveAccount} disabled={resolvingAccount || !bankCode || !/^\d{10}$/.test(accountNumber)}>
                      {resolvingAccount ? 'Verifying account…' : 'Verify account name'}
                    </button>
                    {resolvedAccountName && (
                      <div className="onboarding-account-preview" role="status" aria-live="polite">
                        <span className="onboarding-account-preview-label">Account name</span>
                        <strong>{resolvedAccountName}</strong>
                      </div>
                    )}
                    {resolvedAccountName && (
                      <label className="onboarding-account-confirm">
                        <input
                          type="checkbox"
                          checked={accountNameConfirmed}
                          onChange={(event) => {
                            setAccountNameConfirmed(event.target.checked);
                            setBankError('');
                          }}
                        />
                        <span>I confirm this is the correct account name for my payouts.</span>
                      </label>
                    )}
                  </div>
                </>
              )}

              <div className="onboarding-actions onboarding-actions-between">
                {host.needs_onboarding
                  ? <button type="button" className="onboarding-secondary" onClick={() => setStep(1)}>← Back</button>
                  : <span />}
                {host.payout_ready ? (
                  <button type="button" className="auth-submit" onClick={() => setCompleted(true)}>
                    Finish setup <span aria-hidden="true">→</span>
                  </button>
                ) : (
                  <button className="auth-submit" type="submit" disabled={saving || bankLoading || !resolvedAccountName || !accountNameConfirmed}>
                    {saving ? 'Connecting securely…' : 'Connect payout account'} <span aria-hidden="true">→</span>
                  </button>
                )}
              </div>
              {!host.payout_ready && (
                <button type="button" className="onboarding-skip" onClick={finishWithoutPayout}>
                  Skip payout setup for now
                </button>
              )}
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

function CompletionPanel({ host, payoutSkipped }: { host: HostProfile; payoutSkipped: boolean }) {
  const payoutReady = host.payout_ready;
  return (
    <div className="onboarding-complete" role="status" aria-live="polite">
      <span className="onboarding-complete-icon" aria-hidden="true">✓</span>
      <p className="auth-eyebrow">Host setup complete</p>
      <h2>You’re ready to build your classes.</h2>
      <p>Your host profile and class-summary preferences have been saved.</p>
      <div className="onboarding-status-list">
        <p><span aria-hidden="true">✓</span> Host profile saved</p>
        <p><span aria-hidden="true">✓</span> Class preferences saved</p>
        <p>
          <span aria-hidden="true">{payoutReady ? '✓' : '○'}</span>
          {payoutReady ? 'Paystack payout account connected' : 'Payout setup deferred'}
        </p>
      </div>
      {!payoutReady && (
        <p className="onboarding-payout-warning">
          {payoutSkipped
            ? 'You skipped payout setup. You can return to /onboarding/ later; payout setup is required before publishing paid classes.'
            : 'Payout setup is still incomplete. You can return to /onboarding/ later; paid classes require it.'}
        </p>
      )}
      {!payoutReady && <a className="onboarding-payout-resume" href="/onboarding/">Set up payouts</a>}
      <a className="auth-home-link" href="/">Return to TuitEase home</a>
      <p className="onboarding-dashboard-note">
        Your profile is saved. The host dashboard and class-creation pages are not available yet.
      </p>
    </div>
  );
}
