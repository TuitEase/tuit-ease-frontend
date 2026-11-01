import type { Bank } from '../api';
import type { PayoutGate } from '../gating';
import { colors, errorTextStyle } from '../ui';

export interface PayoutPanelProps {
  gate: PayoutGate;
  banks: Bank[];
  savedBankName: string;
  savedLast4: string;
  bank: string;
  account: string;
  onBank: (value: string) => void;
  onAccount: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  error: string;
  fieldErrors: Record<string, string>;
  confirmed: boolean;
  onConfirmed: (value: boolean) => void;
  justSavedBankName: string;
  justSavedLast4: string;
  loadingBanks: boolean;
}

export function PayoutPanel({
  gate,
  banks,
  savedBankName,
  savedLast4,
  bank,
  account,
  onBank,
  onAccount,
  onSave,
  saving,
  error,
  fieldErrors,
  confirmed,
  onConfirmed,
  justSavedBankName,
  justSavedLast4,
  loadingBanks,
}: PayoutPanelProps) {
  return (
    <>
      {gate.showSaved && (
        <div
          style={{
            border: `1px solid ${colors.border}`,
            borderRadius: 16,
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            background: '#FFFFFF',
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 17 }}>Where your money goes</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: colors.panel, borderRadius: 12, padding: '12px 14px' }}>
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" style={{ flex: 'none' }}>
              <path
                d="M3 9l8-5 8 5M5 9v7M9 9v7M13 9v7M17 9v7M3 18h16"
                fill="none"
                stroke={colors.secondary}
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.35 }}>
              <span style={{ fontWeight: 700 }}>
                {savedBankName || 'Your bank'} ending {savedLast4 || '••••'}
              </span>
              <span style={{ fontSize: 14, color: colors.muted }}>Your saved payout account</span>
            </div>
          </div>
          <label htmlFor="f-confirm" style={{ display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
              id="f-confirm"
              type="checkbox"
              checked={confirmed}
              onChange={(event) => onConfirmed(event.target.checked)}
              style={{ flex: 'none', width: 22, height: 22, margin: '2px 0 0', accentColor: colors.coral }}
            />
            <span>I confirm that payments for this class should go to this account.</span>
          </label>
          <a
            href="/settings/"
            style={{ color: colors.coralText, fontWeight: 700, fontSize: 15, textDecoration: 'underline', alignSelf: 'flex-start' }}
          >
            Need a different account? Change it in account settings
          </a>
        </div>
      )}

      {gate.needsPayout && (
        <div
          style={{
            background: '#FFF6F2',
            border: `1px solid ${colors.payoutBorder}`,
            borderRadius: 16,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 17 }}>Add your payout account to publish</div>
            <div style={{ color: colors.secondary, fontSize: 14.5 }}>
              Paid classes need somewhere to send your money. Your share goes straight to your bank through Paystack. Your
              class stays saved as a draft until this is done.
            </div>
          </div>
          {error && (
            <div role="alert" style={{ ...errorTextStyle, fontWeight: 600 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="f-bank" style={{ fontSize: 14, fontWeight: 600 }}>
                Bank
              </label>
              <select
                id="f-bank"
                className="inp"
                value={bank}
                onChange={(event) => onBank(event.target.value)}
                aria-invalid={Boolean(fieldErrors.bank)}
                aria-describedby={fieldErrors.bank ? 'err-bank' : undefined}
              >
                <option value="">{loadingBanks ? 'Loading banks…' : 'Choose your bank'}</option>
                {banks.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.name}
                  </option>
                ))}
              </select>
              {fieldErrors.bank && (
                <div id="err-bank" role="alert" style={errorTextStyle}>
                  {fieldErrors.bank}
                </div>
              )}
            </div>
            <div style={{ flex: '1 1 200px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label htmlFor="f-acct" style={{ fontSize: 14, fontWeight: 600 }}>
                Account number
              </label>
              <input
                id="f-acct"
                className="inp"
                type="text"
                inputMode="numeric"
                maxLength={10}
                placeholder="10 digits"
                value={account}
                onChange={(event) => onAccount(event.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                aria-invalid={Boolean(fieldErrors.account)}
                aria-describedby={fieldErrors.account ? 'err-acct' : undefined}
              />
              {fieldErrors.account && (
                <div id="err-acct" role="alert" style={errorTextStyle}>
                  {fieldErrors.account}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !bank || account.length !== 10}
              aria-busy={saving}
              style={{
                minHeight: 48,
                padding: '0 22px',
                border: 'none',
                borderRadius: 12,
                background: colors.ink,
                color: '#FFFFFF',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Save account'}
            </button>
          </div>
        </div>
      )}

      {gate.showReady && (
        <div
          className="tt-fade-up"
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: colors.successFill,
            border: `1px solid ${colors.successBorder}`,
            borderRadius: 16,
            padding: '14px 18px',
            color: colors.success,
            fontWeight: 600,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" style={{ flex: 'none' }}>
            <circle cx="10" cy="10" r="10" fill={colors.success} />
            <path d="M5.5 10.3l3 3L14.5 7" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>
            Payout account ready: {justSavedBankName || savedBankName || 'Your bank'} ending {justSavedLast4 || savedLast4 || '••••'}
          </span>
        </div>
      )}
    </>
  );
}
