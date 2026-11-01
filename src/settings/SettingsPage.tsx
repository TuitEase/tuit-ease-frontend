import { useEffect, useState, type FormEvent } from 'react';
import {
  clearAuthSession,
  fetchHostProfile,
  fetchPayoutBanks,
  getAuthToken,
  isAuthTokenStorageEvent,
  resolveAccountName,
  setupHostPayout,
  updateHostProfile,
  type Bank,
  type HostProfile,
} from '../auth/api';
import { HostHeader } from '../components/HostHeader';
import './settings.css';

type Section = 'profile' | 'payout';
type Notice = { kind: 'success' | 'error'; text: string } | null;

const HOST_TYPES = [
  ['tech', 'Tech & professional training'],
  ['tutor', 'Tutoring & exam preparation'],
  ['fitness', 'Fitness & wellness'],
  ['creative', 'Creative classes & crafts'],
  ['business', 'Business & leadership'],
  ['community', 'Community & events'],
  ['other', 'Something else'],
];

function initialSection(): Section {
  return new URLSearchParams(window.location.search).get('section') === 'payout' ? 'payout' : 'profile';
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('');
}

export default function AccountSettingsPage() {
  const [host, setHost] = useState<HostProfile | null>(null);
  const [section, setSection] = useState<Section>(initialSection);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [bankListOpen, setBankListOpen] = useState(false);
  const [activeBankIndex, setActiveBankIndex] = useState(0);
  const [profileError, setProfileError] = useState('');
  const [payoutError, setPayoutError] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [resolving, setResolving] = useState(false);
  const searchTerms = bankSearch.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const filteredBanks = banks.filter((bank) => {
    const bankName = bank.name.toLocaleLowerCase();
    return searchTerms.every((term) => bankName.includes(term));
  });

  const selectBank = (bank: Bank) => {
    setBankCode(bank.code);
    setBankSearch(bank.name);
    setBankListOpen(false);
    setActiveBankIndex(0);
    setAccountName('');
    setConfirmed(false);
    setPayoutError('');
  };

  useEffect(() => {
    if (!getAuthToken()) {
      window.location.assign('/signin/');
      return;
    }
    let active = true;
    fetchHostProfile()
      .then((profile) => {
        if (active) setHost(profile);
      })
      .catch((error: unknown) => {
        if (active) setProfileError(error instanceof Error ? error.message : 'Could not load your profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (isAuthTokenStorageEvent(event) && !getAuthToken()) window.location.assign('/signin/');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    if (section !== 'payout' || banks.length > 0 || bankLoading) return;
    let active = true;
    setBankLoading(true);
    fetchPayoutBanks()
      .then((items) => { if (active) setBanks(items); })
      .catch((error: unknown) => {
        if (active) setPayoutError(error instanceof Error ? error.message : 'Could not load banks.');
      })
      .finally(() => { if (active) setBankLoading(false); });
    return () => { active = false; };
  }, [section, banks.length]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!host) return;
    setProfileError('');
    setNotice(null);
    setSaving(true);
    const form = new FormData(event.currentTarget);
    try {
      const updated = await updateHostProfile({
        business_name: String(form.get('business_name')).trim(),
        email: String(form.get('email')).trim(),
        whatsapp_number: String(form.get('whatsapp_number')).trim(),
        host_type: String(form.get('host_type')),
      });
      setHost(updated);
      setNotice({ kind: 'success', text: 'Your profile has been updated.' });
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!bankCode || !/^\d{10}$/.test(accountNumber)) return;
    let active = true;
    const timeout = window.setTimeout(() => {
      setResolving(true);
      setPayoutError('');
      resolveAccountName(bankCode, accountNumber)
        .then((name) => {
          if (active) setAccountName(name);
        })
        .catch((error: unknown) => {
          if (active) {
            setAccountName('');
            setPayoutError(error instanceof Error ? error.message : 'Could not verify this account.');
          }
        })
        .finally(() => {
          if (active) setResolving(false);
        });
    }, 500);
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [bankCode, accountNumber]);

  const savePayout = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPayoutError('');
    setNotice(null);
    if (!bankCode || !/^\d{10}$/.test(accountNumber)) {
      setPayoutError('Choose a bank and enter a valid 10-digit account number.');
      return;
    }
    if (!accountName) {
      setPayoutError('Verify your account number before saving.');
      return;
    }
    if (!confirmed) {
      setPayoutError('Confirm that the account name matches the account you want to use.');
      return;
    }
    setSaving(true);
    try {
      const updated = await setupHostPayout(bankCode, accountNumber);
      setHost(updated);
      setAccountNumber('');
      setAccountName('');
      setConfirmed(false);
      setNotice({ kind: 'success', text: 'Your payout account has been updated.' });
    } catch (error) {
      setPayoutError(error instanceof Error ? error.message : 'Could not update your payout account.');
    } finally {
      setSaving(false);
    }
  };

  const logout = () => {
    clearAuthSession();
    window.location.assign('/');
  };

  if (loading) {
    return <main className="settings-loading" role="status">Loading your account settings…</main>;
  }

  return (
    <main className="settings-page">
      <HostHeader>
        <a className="settings-back-link" href="/dashboard/">Back to dashboard</a>
      </HostHeader>
      <div className="settings-layout">
        <aside className="settings-intro">
          <p className="settings-eyebrow">YOUR ACCOUNT</p>
          <h1>Account settings</h1>
          <p>Keep your host details and payout information up to date.</p>
          <nav className="settings-nav" aria-label="Account settings">
            <button type="button" className={section === 'profile' ? 'is-active' : ''} aria-current={section === 'profile' ? 'page' : undefined} onClick={() => setSection('profile')}>
              <span aria-hidden="true">01</span> Profile
            </button>
            <button type="button" className={section === 'payout' ? 'is-active' : ''} aria-current={section === 'payout' ? 'page' : undefined} onClick={() => { setPayoutError(''); setSection('payout'); }}>
              <span aria-hidden="true">02</span> Payout account
            </button>
          </nav>
        </aside>

        <section className="settings-card" aria-live="polite">
          {notice && <p className={`settings-notice notice-${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>{notice.text}</p>}
          {!host && profileError && <p className="settings-alert" role="alert">{profileError}</p>}
          {host && section === 'profile' && (
            <form onSubmit={(event) => void saveProfile(event)} className="settings-form">
              <div className="settings-form-heading">
                <span className="settings-avatar">{initials(host.business_name)}</span>
                <div><p className="settings-eyebrow">PROFILE DETAILS</p><h2>Your host profile</h2><p>These details help students and TuitEase identify your account.</p></div>
              </div>
              {profileError && <p className="settings-alert" role="alert">{profileError}</p>}
              <label className="settings-field">
                <span>Business or host name</span>
                <input name="business_name" defaultValue={host.business_name} maxLength={160} required />
              </label>
              <label className="settings-field">
                <span>Email address</span>
                <input name="email" type="email" autoComplete="email" defaultValue={host.email} required />
              </label>
              <label className="settings-field">
                <span>WhatsApp number <small>Optional</small></span>
                <input name="whatsapp_number" type="tel" autoComplete="tel" placeholder="+234 801 234 5678" defaultValue={host.whatsapp_number ?? ''} />
              </label>
              <label className="settings-field">
                <span>What kind of classes do you host?</span>
                <select name="host_type" defaultValue={host.host_type ?? ''}>
                  <option value="">Choose a category (optional)</option>
                  {HOST_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <p className="settings-help">Your email is also your sign-in address. Updating it changes the email you use next time you sign in.</p>
              <div className="settings-actions"><button className="settings-primary" type="submit" disabled={saving}>{saving ? 'Saving changes…' : 'Save profile'}</button></div>
            </form>
          )}
          {host && section === 'payout' && (
            <form onSubmit={(event) => void savePayout(event)} className="settings-form">
              <div className="settings-form-heading">
                <span className="settings-icon" aria-hidden="true">₦</span>
                <div><p className="settings-eyebrow">PAYMENT DESTINATION</p><h2>Payout account</h2><p>Payments are settled to your verified Nigerian bank account.</p></div>
              </div>
              <div className={`payout-status${host.payout_ready ? ' is-connected' : ''}`}>
                <span className="payout-status-dot" aria-hidden="true" />
                <div><strong>{host.payout_ready ? 'Payout account connected' : 'No payout account yet'}</strong>
                  <span>{host.payout_ready
                    ? host.payout_account_last4
                      ? `${banks.find((bank) => bank.code === host.payout_bank_code)?.name ?? 'Bank account'} ending in ${host.payout_account_last4}`
                      : 'Add a replacement account below at any time.'
                    : 'Add an account to receive payments for your paid classes.'}</span>
                </div>
              </div>
              <h3 className="settings-subheading">{host.payout_ready ? 'Update bank details' : 'Add bank details'}</h3>
              {bankLoading && <p className="settings-help" role="status">Loading Nigerian banks…</p>}
              <div className="settings-field bank-picker">
                <label htmlFor="payout-bank">Bank</label>
                <input
                  id="payout-bank"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={bankListOpen && filteredBanks.length > 0}
                  aria-controls="payout-bank-options"
                  aria-activedescendant={bankListOpen && filteredBanks[activeBankIndex] ? `payout-bank-option-${activeBankIndex}` : undefined}
                  value={bankSearch}
                  onFocus={() => setBankListOpen(true)}
                  onChange={(event) => {
                    setBankSearch(event.target.value);
                    setBankCode('');
                    setAccountName('');
                    setConfirmed(false);
                    setResolving(false);
                    setPayoutError('');
                    setActiveBankIndex(0);
                    setBankListOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setBankListOpen(false);
                    } else if (event.key === 'ArrowDown' && filteredBanks.length > 0) {
                      event.preventDefault();
                      setBankListOpen(true);
                      setActiveBankIndex((index) => (index + 1) % filteredBanks.length);
                    } else if (event.key === 'ArrowUp' && filteredBanks.length > 0) {
                      event.preventDefault();
                      setBankListOpen(true);
                      setActiveBankIndex((index) => (index - 1 + filteredBanks.length) % filteredBanks.length);
                    } else if (event.key === 'Enter' && bankListOpen && filteredBanks[activeBankIndex]) {
                      event.preventDefault();
                      selectBank(filteredBanks[activeBankIndex]);
                    }
                  }}
                  placeholder={bankLoading ? 'Loading banks…' : 'Type to find your bank'}
                  autoComplete="off"
                  aria-required="true"
                  disabled={bankLoading || banks.length === 0}
                />
                {bankListOpen && filteredBanks.length > 0 && (
                  <ul className="bank-picker-options" id="payout-bank-options" role="listbox">
                    {filteredBanks.map((bank, index) => (
                      <li key={bank.code}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={bank.code === bankCode}
                          id={`payout-bank-option-${index}`}
                          className={index === activeBankIndex ? 'is-active' : ''}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectBank(bank)}
                        >
                          {bank.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {bankListOpen && bankSearch.trim() && banks.length > 0 && filteredBanks.length === 0 && (
                  <p className="settings-inline-help">No banks match “{bankSearch}”. Try another name.</p>
                )}
                {bankCode && <small className="bank-picker-selected">Selected: {banks.find((bank) => bank.code === bankCode)?.name}</small>}
              </div>
              <label className="settings-field">
                <span>Account number</span>
                <input inputMode="numeric" autoComplete="off" maxLength={10} value={accountNumber} onChange={(event) => { setAccountNumber(event.target.value.replace(/\D/g, '').slice(0, 10)); setAccountName(''); setConfirmed(false); setResolving(false); setPayoutError(''); }} placeholder="10-digit account number" required />
              </label>
              {resolving && <p className="settings-help" role="status">Verifying account details…</p>}
              {accountName && (
                <div className="verified-account">
                  <span className="settings-eyebrow">ACCOUNT NAME</span>
                  <strong>{accountName}</strong>
                  <button className="settings-secondary" type="button" disabled={confirmed} onClick={() => setConfirmed(true)}>
                    {confirmed ? 'Account confirmed' : 'Confirm account'}
                  </button>
                </div>
              )}
              {payoutError && <p className="settings-alert" role="alert">{payoutError}</p>}
              <p className="settings-help">TuitEase sends your account number securely to Paystack to verify and update payouts. We only retain the bank code and last four digits for reference.</p>
              <div className="settings-actions"><button className="settings-primary" type="submit" disabled={saving || bankLoading || resolving || !confirmed}>{saving ? 'Saving account…' : host.payout_ready ? 'Update payout account' : 'Save payout account'}</button></div>
            </form>
          )}
          {host && (
            <footer className="settings-account-footer">
              <span className="settings-avatar settings-avatar-small">{initials(host.business_name)}</span>
              <span><strong>{host.business_name}</strong><small>{host.email}</small></span>
              <button type="button" onClick={logout}>Log out</button>
            </footer>
          )}
        </section>
      </div>
    </main>
  );
}
