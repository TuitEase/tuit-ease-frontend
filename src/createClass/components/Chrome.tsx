import type { ReactNode } from 'react';
import { colors, primaryButtonStyle, secondaryButtonStyle, textButtonStyle } from '../ui';
import { STEPS } from '../steps';
import type { StepKey } from '../types';
import { HostHeader } from '../../components/HostHeader';

export function TopBar() {
  return (
    <HostHeader context="Classes / New class">
      <a href="/dashboard/" style={{ color: colors.secondary, fontWeight: 600, fontSize: 15, padding: '10px 4px' }}>
          Exit without saving
      </a>
    </HostHeader>
  );
}

export function Stepper({
  step,
  onSelect,
}: {
  step: StepKey;
  onSelect: (step: StepKey) => void;
}) {
  return (
    <ol style={{ listStyle: 'none', margin: '0 0 28px', padding: 0, display: 'flex', flexWrap: 'wrap', gap: '10px 8px' }}>
      {STEPS.map((item, index) => {
        const active = item.key === step;
        const past = STEPS.findIndex((s) => s.key === step) > index;
        return (
          <li key={item.key} style={{ margin: 0 }}>
            <button
              type="button"
              onClick={() => onSelect(item.key)}
              aria-current={active ? 'step' : undefined}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                minHeight: 44,
                padding: '6px 16px 6px 8px',
                borderRadius: 999,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 15,
                border: `1px solid ${active ? colors.ink : colors.border}`,
                background: active ? colors.ink : '#FFFFFF',
                color: active ? '#FFFFFF' : colors.ink,
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  fontSize: 14,
                  fontWeight: 800,
                  background: active ? colors.coral : past ? colors.ink : colors.pillFill,
                  color: active || past ? '#FFFFFF' : colors.secondary,
                }}
              >
                {item.number}
              </span>
              <span>{item.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function PageHeading() {
  return (
    <>
      <h1 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: 34, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
        Create a class
      </h1>
      <p style={{ margin: '0 0 28px', color: colors.muted }}>
        Four short steps. Classes can go live in under a minute.
      </p>
    </>
  );
}

export function FormHeading({ number, title, help }: { number: number; title: string; help: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: colors.eyebrow,
        }}
      >
        Step {number} of 4
      </div>
      <h2 style={{ margin: 0, fontWeight: 800, fontSize: 26, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{title}</h2>
      <p style={{ margin: 0, color: colors.muted }}>{help}</p>
    </div>
  );
}

export function Alert({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <div
      id={id}
      role="alert"
      tabIndex={-1}
      style={{
        background: '#FFF6F2',
        border: `1px solid ${colors.payoutBorder}`,
        borderRadius: 12,
        padding: '12px 14px',
        color: colors.coralText,
        fontWeight: 600,
        fontSize: 14.5,
      }}
    >
      {message}
    </div>
  );
}

export interface NavRowProps {
  showBack: boolean;
  onBack: () => void;
  onSave: () => void;
  saveLabel: string;
  saving: boolean;
  onNext?: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  onPublish?: () => void;
  publishLabel?: string;
  publishDisabled?: boolean;
  notice?: string;
}

export function NavRow({
  showBack,
  onBack,
  onSave,
  saveLabel,
  saving,
  onNext,
  nextLabel,
  nextDisabled,
  onPublish,
  publishLabel,
  publishDisabled,
  notice,
}: NavRowProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          borderTop: `1px solid ${colors.divider}`,
          paddingTop: 22,
        }}
      >
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {showBack && (
            <button type="button" onClick={onBack} style={secondaryButtonStyle}>
              Back
            </button>
          )}
          <button type="button" onClick={onSave} disabled={saving} style={textButtonStyle} aria-busy={saving}>
            {saveLabel}
          </button>
        </div>
        {onPublish ? (
          <button
            type="button"
            onClick={onPublish}
            disabled={publishDisabled || saving}
            aria-busy={saving}
            style={primaryButtonStyle}
          >
            {saving ? 'Publishing…' : publishLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled || saving}
            aria-busy={saving}
            style={primaryButtonStyle}
          >
            {saving ? 'Saving…' : nextLabel}
          </button>
        )}
      </div>
      {notice ? (
        <div
          role="status"
          style={{ marginTop: 14, color: colors.success, fontWeight: 600, fontSize: 14 }}
        >
          {notice}
        </div>
      ) : null}
    </div>
  );
}

export function PreviewColumn({ children }: { children: ReactNode }) {
  return (
    <div className="tt-preview" style={{ flex: '1 1 300px', minWidth: 0, maxWidth: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontWeight: 700, color: colors.secondary, fontSize: 14, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Booking page preview
      </div>
      {children}
    </div>
  );
}
