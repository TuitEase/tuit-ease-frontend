import type { ReactNode } from 'react';
import './host-header.css';

export function HostHeader({ children, context }: { children?: ReactNode; context?: string }) {
  return (
    <header className="host-header">
      <a className="host-header-logo" href="/dashboard/" aria-label="Return to dashboard">
        <img src="/assets/tuitease-logo.png" alt="TuitEase" />
      </a>
      {context ? <span className="host-header-context">{context}</span> : null}
      {children ? <nav className="host-header-actions" aria-label="Page actions">{children}</nav> : null}
    </header>
  );
}
