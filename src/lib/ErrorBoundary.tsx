import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last-resort guard so a render error shows a recoverable message instead of
 * unmounting React and leaving the user with a blank page.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Page render failed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: '#F6F3EE',
          color: '#16161A',
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 24 }}>Something went wrong</h1>
          <p style={{ margin: '0 0 20px', color: '#5F5F66' }}>
            This page could not finish loading. Reloading usually fixes it.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              minHeight: 44,
              padding: '0 20px',
              borderRadius: 999,
              border: 0,
              background: '#CC4E32',
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
