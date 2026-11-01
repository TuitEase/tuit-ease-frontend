import type { CSSProperties, ReactNode } from 'react';
import { feePercentLabel, type FeeBreakdown } from '../../lib/fees';
import { naira } from '../format';
import { colors, errorTextStyle, optionCardStyle, switchKnobStyle, switchTrackStyle } from '../ui';

export function OptionCard({
  label,
  description,
  selected,
  onClick,
  style,
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  style?: CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{ ...optionCardStyle(selected), ...style }}
    >
      <span style={{ fontWeight: 700, fontSize: 16 }}>{label}</span>
      <span style={{ fontSize: 14, color: colors.muted, fontWeight: 500 }}>{description}</span>
    </button>
  );
}

export function Switch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      style={switchTrackStyle(checked)}
    >
      <span style={switchKnobStyle(checked)} />
    </button>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <div id={id} role="alert" style={errorTextStyle}>
      {message}
    </div>
  );
}

export function FeePanel({
  fee,
  status = 'idle',
  message,
  onRetry,
}: {
  fee: FeeBreakdown | null;
  status?: 'idle' | 'loading' | 'ready' | 'error';
  message?: string | null;
  onRetry?: () => void;
}) {
  const rowStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: 12 };
  return (
    <div
      aria-busy={status === 'loading'}
      style={{
        flex: '1 1 280px',
        minWidth: 0,
        background: colors.panel,
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        fontSize: 15,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 4 }}>You receive</div>
      {status === 'error' ? (
        <div role="alert" style={{ display: 'flex', flexDirection: 'column', gap: 10, color: colors.secondary }}>
          <span>{message || 'Could not work out the fees for that price.'}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              style={{
                alignSelf: 'flex-start',
                minHeight: 36,
                padding: '0 14px',
                border: `1px solid ${colors.border}`,
                background: '#FFFFFF',
                color: colors.ink,
                borderRadius: 10,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          )}
        </div>
      ) : !fee ? (
        <div role="status" aria-live="polite" style={{ color: colors.muted, fontSize: 14 }}>
          {status === 'loading' ? 'Calculating fees…' : 'Enter a price to see what you receive.'}
        </div>
      ) : (
        <>
          <div style={rowStyle}>
            <span>Student pays</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{naira(fee.studentPays)}</span>
          </div>
          <div style={{ ...rowStyle, color: colors.secondary }}>
            <span>Paystack fee</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>−{naira(fee.paystackFee)}</span>
          </div>
          <div style={{ ...rowStyle, color: colors.secondary }}>
            <span>TuitEase fee ({feePercentLabel(fee.platformPercent)})</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>−{naira(fee.platformFee)}</span>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 12,
              borderTop: `2px solid ${colors.ink}`,
              marginTop: 8,
              paddingTop: 10,
            }}
          >
            <span style={{ fontWeight: 700 }}>You receive</span>
            <span style={{ fontWeight: 800, fontSize: 24, fontVariantNumeric: 'tabular-nums' }}>
              {naira(fee.hostReceives)}
            </span>
          </div>
          <div style={{ marginTop: 6, color: colors.mutedSoft, fontSize: 13 }}>
            Calculated by TuitEase from your price.
          </div>
        </>
      )}
    </div>
  );
}

export function OptionsPanel({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', border: `1px solid ${colors.border}`, borderRadius: 16, overflow: 'hidden' }}>
      {children}
    </div>
  );
}

export function OptionRow({
  label,
  description,
  checked,
  onChange,
  last,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '16px 18px',
        borderBottom: last ? 'none' : `1px solid ${colors.divider}`,
        background: '#FFFFFF',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <div style={{ fontWeight: 700 }}>{label}</div>
        <div style={{ color: colors.muted, fontSize: 14 }}>{description}</div>
      </div>
      <Switch checked={checked} label={label} onChange={onChange} />
    </div>
  );
}
