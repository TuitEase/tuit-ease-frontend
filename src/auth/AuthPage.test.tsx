import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthPage from './AuthPage';
import { authenticatedFetch, saveAuthSession } from './api';

const authResponse = {
  token: 'session-token',
  host: {
    business_name: 'Ada Classes',
    email: 'ada@example.com',
    needs_onboarding: true,
    payout_ready: false,
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('host authentication pages', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    delete window.google;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('registers a host and stores the session token', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(authResponse, 201));
    const onNavigate = vi.fn();
    render(<AuthPage mode="signup" onNavigate={onNavigate} />);

    fireEvent.change(screen.getByLabelText('Name or business name'), { target: { value: 'Ada Classes' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'A-strong-pass-77' } });
    fireEvent.click(screen.getByLabelText('I accept the Terms of Service and Privacy Policy.'));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('/onboarding/'));
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/register/', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        name: 'Ada Classes',
        email: 'ada@example.com',
        password: 'A-strong-pass-77',
        whatsapp_number: '',
        accepted_terms: true,
      }),
    }));
    expect(localStorage.getItem('tuitease.auth.token')).toBe('session-token');
    expect(onNavigate).toHaveBeenCalledWith('/onboarding/');
  });

  it('requires terms acceptance before submitting signup', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    render(<AuthPage mode="signup" />);

    fireEvent.change(screen.getByLabelText('Name or business name'), { target: { value: 'Ada Classes' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'A-strong-pass-77' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText(/accept the Terms of Service and Privacy Policy to continue/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects malformed email addresses before calling the API', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    render(<AuthPage mode="signin" />);

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows backend field errors without storing a session', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      email: ['That email is already registered. Sign in instead?'],
    }, 400));
    render(<AuthPage mode="signup" />);

    fireEvent.change(screen.getByLabelText('Name or business name'), { target: { value: 'Ada Classes' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'A-strong-pass-77' } });
    fireEvent.click(screen.getByLabelText('I accept the Terms of Service and Privacy Policy.'));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText(/already registered/i)).toBeInTheDocument();
    expect(localStorage.getItem('tuitease.auth.token')).toBeNull();
  });

  it('signs in, disables the form while waiting, and redirects completed hosts to the dashboard', async () => {
    const onNavigate = vi.fn();
    const signedInHost = { ...authResponse, host: { ...authResponse.host, needs_onboarding: false } };
    let resolveFetch: ((response: Response) => void) | undefined;
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise((resolve) => { resolveFetch = resolve; }),
    );
    render(<AuthPage mode="signin" onNavigate={onNavigate} />);

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'A-strong-pass-77' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('button', { name: 'Signing you in…' })).toBeDisabled();
    resolveFetch?.(jsonResponse(signedInHost));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('/dashboard/'));
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/login/', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'ada@example.com', password: 'A-strong-pass-77' }),
    }));
  });

  it('routes incomplete hosts from sign-in to onboarding', async () => {
    const onNavigate = vi.fn();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(authResponse));
    render(<AuthPage mode="signin" onNavigate={onNavigate} />);

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'ada@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'A-strong-pass-77' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('/onboarding/'));
    expect(localStorage.getItem('tuitease.auth.token')).toBe('session-token');
  });

  it('authenticates Google credentials through the backend and routes new hosts to onboarding', async () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'google-client-id');
    const onNavigate = vi.fn();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({
      ...authResponse,
      created: true,
    }, 201));
    let googleCallback: ((response: { credential: string }) => void) | undefined;
    const initialize = vi.fn((options: {
      client_id: string;
      callback: (response: { credential: string }) => void;
    }) => {
      googleCallback = options.callback;
    });
    const renderButton = vi.fn();
    window.google = { accounts: { id: { initialize, renderButton } } };

    render(<AuthPage mode="signup" onNavigate={onNavigate} />);
    await waitFor(() => expect(renderButton).toHaveBeenCalledOnce());
    expect(initialize).toHaveBeenCalledWith(expect.objectContaining({ client_id: 'google-client-id' }));

    fireEvent.click(screen.getByLabelText('I accept the Terms of Service and Privacy Policy.'));
    googleCallback?.({ credential: 'google-id-token' });

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('/onboarding/'));
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/google/', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ id_token: 'google-id-token' }),
    }));
    expect(localStorage.getItem('tuitease.auth.token')).toBe('session-token');
  });

  it('redirects an already authenticated visitor to the dashboard', async () => {
    localStorage.setItem('tuitease.auth.token', 'shared-token');
    const onNavigate = vi.fn();
    render(<AuthPage mode="signin" onNavigate={onNavigate} />);

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('/dashboard/'));
  });

  it('redirects an open sign-in tab when another tab establishes a session', async () => {
    const onNavigate = vi.fn();
    render(<AuthPage mode="signin" onNavigate={onNavigate} />);
    localStorage.setItem('tuitease.auth.token', 'shared-token');
    window.dispatchEvent(new StorageEvent('storage', { key: 'tuitease.auth.token', newValue: 'shared-token' }));

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith('/dashboard/'));
  });

  it('links to the other authentication page', () => {
    render(<AuthPage mode="signin" />);
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/signup/');
  });

  it('automatically returns to sign in after confirming the password reset', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ detail: 'If an account exists, a verification code has been sent.' }, 202))
      .mockResolvedValueOnce(jsonResponse({ detail: 'Your password has been reset. Sign in with your new password.' }));
    render(<AuthPage mode="signin" />);

    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'ada@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
    expect(await screen.findByText(/If an account exists/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resend code in 60s' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Email verification code'), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Stronger-pass-928!' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'Stronger-pass-928!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your password has been reset. Sign in with your new password.',
    );
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/auth/password-reset/request/', expect.objectContaining({
      body: JSON.stringify({ email: 'ada@example.com' }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/auth/password-reset/confirm/', expect.objectContaining({
      body: JSON.stringify({
        email: 'ada@example.com',
        code: '123456',
        password: 'Stronger-pass-928!',
      }),
    }));

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Return to sign in' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveValue('');
  });

  it('requires matching passwords before submitting an OTP reset', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ detail: 'If an account exists, a verification code has been sent.' }, 202),
    );
    render(<AuthPage mode="signin" />);

    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'ada@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));
    await screen.findByText(/If an account exists/);
    fireEvent.change(screen.getByLabelText('Email verification code'), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Stronger-pass-928!' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'different-pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('The passwords do not match.');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('adds Django token authorization to subsequent authenticated requests', async () => {
    saveAuthSession(authResponse);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));

    await authenticatedFetch('/api/host/me/');

    expect(fetchMock).toHaveBeenCalledWith('/api/host/me/', expect.any(Object));
    const requestOptions = fetchMock.mock.calls[0][1];
    expect(new Headers(requestOptions?.headers).get('Authorization')).toBe('Token session-token');
  });
});
