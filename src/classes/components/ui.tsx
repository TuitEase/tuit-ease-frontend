import type { ReactNode } from 'react';

export type PillTone =
  | 'live'
  | 'draft'
  | 'ended'
  | 'paid'
  | 'part'
  | 'unpaid'
  | 'warning'
  | 'neutral';

export function Pill({ tone = 'neutral', children }: { tone?: PillTone; children: ReactNode }) {
  return <span className={`tt-pill tt-pill-${tone}`}>{children}</span>;
}

export function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const label =
    words.length === 0
      ? '?'
      : words.length === 1
        ? words[0].slice(0, 2).toUpperCase()
        : `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  return (
    <span className="tt-avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }} aria-hidden="true">
      {label}
    </span>
  );
}

export function Section({
  title,
  description,
  action,
  children,
  id,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section className="tt-section" id={id} aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="tt-section-head">
        <div>
          <h2 id={id ? `${id}-title` : undefined}>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action ? <div className="tt-section-action">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  dashed = false,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  dashed?: boolean;
}) {
  return (
    <div className={`tt-stat${dashed ? ' is-dashed' : ''}`}>
      <span className="tt-stat-label">{label}</span>
      <strong className="tt-stat-value">{value}</strong>
      {hint ? <span className="tt-stat-hint">{hint}</span> : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="tt-empty">
      <div className="tt-empty-mark" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
        </svg>
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action ? <div className="tt-empty-action">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ height = 18, width = '100%' }: { height?: number; width?: number | string }) {
  return <span className="tt-skeleton" style={{ height, width }} aria-hidden="true" />;
}

export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="tt-inline-error" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="tt-btn tt-btn-secondary tt-btn-small" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}
