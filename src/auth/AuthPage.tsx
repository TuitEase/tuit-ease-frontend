import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  AuthApiError,
  confirmPasswordReset,
  getAuthToken,
  isAuthTokenStorageEvent,
  requestPasswordReset,
  registerHost,
  saveAuthSession,
  signInWithGoogle,
  signInHost,
  type AuthFieldErrors,
} from './api';
import './auth.css';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: { theme: 'outline'; size: 'large'; text: 'signup_with' | 'signin_with'; shape: 'rectangular'; width: number },
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

type AuthMode = 'signup' | 'signin';
type PasswordResetStep = 'request' | 'confirm';

interface AuthPageProps {
  mode: AuthMode;
  onNavigate?: (path: string) => void;
}

const initialValues = {
  name: '',
  email: '',
  password: '',
  whatsapp_number: '',
  accepted_terms: false,
};

export default function AuthPage({ mode, onNavigate }: AuthPageProps) {
  const isSignup = mode === 'signup';
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';
  const [values, setValues] = useState(initialValues);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState('');
  const [googleError, setGoogleError] = useState('');
  const [isResetFlow, setIsResetFlow] = useState(false);
  const [resetStep, setResetStep] = useState<PasswordResetStep>('request');
  const [resetCode, setResetCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetPasswordConfirmation, setResetPasswordConfirmation] = useState('');
  const [resetNotice, setResetNotice] = useState('');
  const [resetResendWait, setResetResendWait] = useState(0);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState('');
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleCredentialHandler = useRef<(credential: string) => void>(() => undefined);

  useEffect(() => {
    const goToDashboard = () => {
      if (onNavigate) onNavigate('/dashboard/');
      else window.location.assign('/dashboard/');
    };
    const handleStorage = (event: StorageEvent) => {
      if (isAuthTokenStorageEvent(event) && getAuthToken()) goToDashboard();
    };
    if (getAuthToken()) goToDashboard();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [onNavigate]);

  const updateValue = (field: keyof typeof initialValues, value: string | boolean) => {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
    setGoogleError('');
    setPasswordResetSuccess('');
  };

  const handleGoogleCredential = async (idToken: string) => {
    setGoogleError('');
    setFormError('');
    if (!idToken) {
      setGoogleError('Google did not return a sign-in credential. Please try again.');
      return;
    }
    if (isSignup && !values.accepted_terms) {
      setGoogleError('Accept the Terms of Service and Privacy Policy before continuing with Google.');
      return;
    }

    setIsSubmitting(true);
    try {
      const auth = await signInWithGoogle(idToken);
      saveAuthSession(auth);
      if (auth.host.needs_onboarding) {
        if (onNavigate) onNavigate('/onboarding/');
        else window.location.assign('/onboarding/');
        return;
      }
      if (onNavigate) onNavigate('/dashboard/');
      else window.location.assign('/dashboard/');
    } catch (error) {
      setGoogleError(
        error instanceof AuthApiError
          ? error.message
          : 'Google sign-in could not be completed. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  googleCredentialHandler.current = (credential) => {
    void handleGoogleCredential(credential);
  };

  useEffect(() => {
    const button = googleButtonRef.current;
    if (!googleClientId || !button) return;
    let active = true;
    let attachedScript: HTMLScriptElement | null = null;

    const initializeGoogleButton = () => {
      if (!active || !window.google?.accounts.id) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => googleCredentialHandler.current(response.credential ?? ''),
      });
      window.google.accounts.id.renderButton(button, {
        theme: 'outline',
        size: 'large',
        text: isSignup ? 'signup_with' : 'signin_with',
        shape: 'rectangular',
        width: Math.min(Math.max(button.clientWidth, 240), 400),
      });
    };

    const scriptLoaded = () => {
      if (!window.google?.accounts.id) {
        if (active) setGoogleError('Google sign-in could not be loaded. Please refresh and try again.');
        return;
      }
      initializeGoogleButton();
    };
    const scriptFailed = () => {
      if (active) setGoogleError('Google sign-in could not be loaded. Please check your connection and try again.');
    };

    if (window.google?.accounts.id) {
      initializeGoogleButton();
    } else {
      attachedScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://accounts.google.com/gsi/client"]',
      );
      if (!attachedScript) {
        attachedScript = document.createElement('script');
        attachedScript.src = 'https://accounts.google.com/gsi/client';
        attachedScript.async = true;
        attachedScript.defer = true;
        document.head.appendChild(attachedScript);
      }
      attachedScript.addEventListener('load', scriptLoaded);
      attachedScript.addEventListener('error', scriptFailed);
    }

    return () => {
      active = false;
      attachedScript?.removeEventListener('load', scriptLoaded);
      attachedScript?.removeEventListener('error', scriptFailed);
      if (button) button.replaceChildren();
    };
  }, [googleClientId, isSignup]);

  useEffect(() => {
    if (resetResendWait <= 0) return;
    const timeout = window.setTimeout(() => setResetResendWait((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timeout);
  }, [resetResendWait]);

  const validate = (): AuthFieldErrors => {
    const errors: AuthFieldErrors = {};
    if (isSignup && !values.name.trim()) errors.name = 'Enter your name or business name.';
    if (!values.email.trim()) errors.email = 'Enter your email address.';
    else {
      const emailInput = document.getElementById('email');
      if (emailInput instanceof HTMLInputElement && !emailInput.validity.valid) {
        errors.email = 'Enter a valid email address.';
      }
    }
    if (!values.password) errors.password = 'Enter your password.';
    if (isSignup && !values.accepted_terms) {
      errors.accepted_terms = 'Accept the Terms of Service and Privacy Policy to continue.';
    }
    return errors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    setFormError('');
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const auth = isSignup
        ? await registerHost({
            name: values.name.trim(),
            email: values.email.trim(),
            password: values.password,
            whatsapp_number: values.whatsapp_number.trim(),
            accepted_terms: true,
          })
        : await signInHost({ email: values.email.trim(), password: values.password });
      saveAuthSession(auth);
      if (isSignup || auth.host.needs_onboarding) {
        if (onNavigate) onNavigate('/onboarding/');
        else window.location.assign('/onboarding/');
        return;
      }
      if (onNavigate) onNavigate('/dashboard/');
      else window.location.assign('/dashboard/');
    } catch (error) {
      if (error instanceof AuthApiError) {
        setFieldErrors(error.fieldErrors);
        setFormError(error.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordResetSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    setResetNotice('');

    const emailInput = document.getElementById('reset-email');
    if (!values.email.trim() || (emailInput instanceof HTMLInputElement && !emailInput.validity.valid)) {
      setFormError('Enter a valid email address.');
      return;
    }
    if (resetStep === 'request') {
      setIsSubmitting(true);
      try {
        const result = await requestPasswordReset(values.email.trim());
        setResetNotice(result.detail);
        setResetStep('confirm');
        setResetResendWait(60);
      } catch (error) {
        setFormError(error instanceof Error ? error.message : 'Could not send a verification code. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!/^\d{6}$/.test(resetCode)) {
      setFormError('Enter the 6-digit verification code from your email.');
      return;
    }
    if (resetPassword.length < 1) {
      setFormError('Enter your new password.');
      return;
    }
    if (resetPassword !== resetPasswordConfirmation) {
      setFormError('The passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await confirmPasswordReset(values.email.trim(), resetCode, resetPassword);
      setIsResetFlow(false);
      setResetStep('request');
      setResetCode('');
      setResetPassword('');
      setResetPasswordConfirmation('');
      setResetNotice('');
      setResetResendWait(0);
      setValues((current) => ({ ...current, password: '' }));
      setPasswordResetSuccess(result.detail);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not reset your password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendPasswordResetCode = async () => {
    setFormError('');
    setResetNotice('');
    setIsSubmitting(true);
    try {
      const result = await requestPasswordReset(values.email.trim());
      setResetNotice(result.detail);
      setResetResendWait(60);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not send another code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startPasswordReset = () => {
    setIsResetFlow(true);
    setResetStep('request');
    setResetCode('');
    setResetPassword('');
    setResetPasswordConfirmation('');
    setResetNotice('');
    setResetResendWait(0);
    setFormError('');
    setPasswordResetSuccess('');
  };

  const returnToSignIn = () => {
    setIsResetFlow(false);
    setResetStep('request');
    setResetCode('');
    setResetPassword('');
    setResetPasswordConfirmation('');
    setResetNotice('');
    setResetResendWait(0);
    setFormError('');
    setPasswordResetSuccess('');
    setValues((current) => ({ ...current, password: '' }));
  };

  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="About TuitEase">
        <a className="auth-brand" href={getAuthToken() ? '/dashboard/' : '/'} aria-label={getAuthToken() ? 'Return to dashboard' : 'TuitEase home'}>
          <img src="/assets/tuitease-logo.png" alt="TuitEase" />
        </a>
        <div className="auth-story-content">
          <p className="auth-eyebrow">For class hosts, trainers, and tutors</p>
          <h1>More time teaching.<br /><em>Less time chasing.</em></h1>
          <p className="auth-story-copy">
            Keep your classes, bookings, payments, and student reminders moving in one place.
          </p>
          <div className="auth-story-note">
            <span className="auth-note-icon" aria-hidden="true">✓</span>
            <span>Set up your host account to get started.</span>
          </div>
        </div>
        <p className="auth-story-footer">Built for educators and creators across Africa.</p>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-top">
          <a className="auth-back-link" href="/">← Back to home</a>
          <p>
            {isSignup ? 'Already have an account?' : 'New to TuitEase?'}{' '}
            <a href={isSignup ? '/signin/' : '/signup/'}>
              {isSignup ? 'Sign in' : 'Create an account'}
            </a>
          </p>
        </div>

        <div className="auth-form-wrap">
          <div className="auth-heading">
            <p className="auth-eyebrow">
              {isResetFlow ? 'Verify it’s you' : isSignup ? 'Start with a free account' : 'Welcome back'}
            </p>
            <h2>{isResetFlow ? 'Reset your password' : isSignup ? 'Create your host account' : 'Sign in to TuitEase'}</h2>
            <p>
              {isResetFlow
                ? resetStep === 'request'
                  ? 'We’ll email you a one-time code to verify your address.'
                  : 'Enter the code we sent and choose a new password.'
                : isSignup
                ? 'A few details to set up your host profile.'
                : 'Enter your account details to continue.'}
            </p>
          </div>

          <form className="auth-form" onSubmit={isResetFlow ? handlePasswordResetSubmit : handleSubmit} noValidate>
                {formError && (
                  <div className="auth-alert" role="alert">
                    {formError}
                  </div>
                )}
                {!isResetFlow && passwordResetSuccess && (
                  <div className="auth-success" role="status">{passwordResetSuccess}</div>
                )}

                {isResetFlow ? (
                    <>
                      {resetNotice && <div className="auth-success" role="status">{resetNotice}</div>}
                      <FormField label="Email address" id="reset-email">
                        <input
                          autoComplete="email"
                          id="reset-email"
                          type="email"
                          value={values.email}
                          onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
                          required
                        />
                      </FormField>
                      {resetStep === 'confirm' && (
                        <>
                          <FormField label="Email verification code" id="reset-code">
                            <input
                              autoComplete="one-time-code"
                              id="reset-code"
                              inputMode="numeric"
                              maxLength={6}
                              pattern="[0-9]{6}"
                              value={resetCode}
                              onChange={(event) => setResetCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                              aria-describedby="reset-code-help"
                              required
                            />
                            <span className="auth-help" id="reset-code-help">The code expires in 10 minutes.</span>
                          </FormField>
                          <FormField label="New password" id="reset-password">
                            <input
                              autoComplete="new-password"
                              id="reset-password"
                              type="password"
                              value={resetPassword}
                              onChange={(event) => setResetPassword(event.target.value)}
                              required
                            />
                          </FormField>
                          <FormField label="Confirm new password" id="reset-password-confirmation">
                            <input
                              autoComplete="new-password"
                              id="reset-password-confirmation"
                              type="password"
                              value={resetPasswordConfirmation}
                              onChange={(event) => setResetPasswordConfirmation(event.target.value)}
                              required
                            />
                          </FormField>
                        </>
                      )}
                      <button className="auth-submit" type="submit" disabled={isSubmitting}>
                        {isSubmitting
                          ? resetStep === 'request' ? 'Sending code…' : 'Updating password…'
                          : resetStep === 'request' ? 'Send verification code' : 'Reset password'}
                        {!isSubmitting && <span aria-hidden="true">→</span>}
                      </button>
                      {resetStep === 'confirm' && (
                        <>
                          <button
                            className="auth-text-button"
                            type="button"
                            disabled={isSubmitting || resetResendWait > 0}
                            onClick={() => void resendPasswordResetCode()}
                          >
                            {resetResendWait > 0 ? `Resend code in ${resetResendWait}s` : 'Resend code'}
                          </button>
                          <button className="auth-text-button" type="button" onClick={() => { setResetStep('request'); setResetNotice(''); }}>
                            Use a different email address
                          </button>
                        </>
                      )}
                      <button className="auth-text-button" type="button" onClick={returnToSignIn}>
                        Back to sign in
                      </button>
                    </>
                ) : (
                  <>
                {isSignup && (
                  <FormField label="Name or business name" error={fieldErrors.name} id="name">
                    <input
                      autoComplete="name"
                      id="name"
                      maxLength={160}
                      value={values.name}
                      onChange={(event) => updateValue('name', event.target.value)}
                      aria-invalid={Boolean(fieldErrors.name)}
                      aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                      required
                    />
                  </FormField>
                )}

                <FormField label="Email address" error={fieldErrors.email} id="email">
                  <input
                    autoComplete="email"
                    id="email"
                    type="email"
                    value={values.email}
                    onChange={(event) => updateValue('email', event.target.value)}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                    required
                  />
                </FormField>

                <FormField label="Password" error={fieldErrors.password} id="password">
                  <div className="auth-password-input">
                    <input
                      autoComplete={isSignup ? 'new-password' : 'current-password'}
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={values.password}
                      onChange={(event) => updateValue('password', event.target.value)}
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                      required
                    />
                    <button
                      className="auth-password-toggle"
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </FormField>

                {!isSignup && (
                  <button className="auth-text-button auth-forgot-link" type="button" onClick={startPasswordReset}>
                    Forgot password?
                  </button>
                )}

                {isSignup && (
                  <>
                    <FormField label="WhatsApp number" error={fieldErrors.whatsapp_number} id="whatsapp">
                      <input
                        autoComplete="tel"
                        id="whatsapp"
                        type="tel"
                        placeholder="Optional"
                        value={values.whatsapp_number}
                        onChange={(event) => updateValue('whatsapp_number', event.target.value)}
                        aria-invalid={Boolean(fieldErrors.whatsapp_number)}
                        aria-describedby={fieldErrors.whatsapp_number ? 'whatsapp_number-error' : 'whatsapp-help'}
                      />
                      <span className="auth-help" id="whatsapp-help">
                        Add a number if you want to receive host summaries on WhatsApp.
                      </span>
                    </FormField>

                    <div className="auth-terms-field">
                      <label className="auth-checkbox-label" htmlFor="accepted_terms">
                        <input
                          id="accepted_terms"
                          type="checkbox"
                          required
                          checked={values.accepted_terms}
                          onChange={(event) => updateValue('accepted_terms', event.target.checked)}
                          aria-invalid={Boolean(fieldErrors.accepted_terms)}
                          aria-describedby={fieldErrors.accepted_terms ? 'accepted_terms-error' : undefined}
                        />
                        <span>
                          I accept the Terms of Service and Privacy Policy.
                        </span>
                      </label>
                      {fieldErrors.accepted_terms && (
                        <span className="auth-field-error" id="accepted_terms-error" role="alert">
                          {fieldErrors.accepted_terms}
                        </span>
                      )}
                    </div>
                  </>
                )}

                <button className="auth-submit" type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? isSignup ? 'Creating your account…' : 'Signing you in…'
                    : isSignup ? 'Create account' : 'Sign in'}
                  {!isSubmitting && <span aria-hidden="true">→</span>}
                </button>
                <p className="auth-security-note">
                  Your password is never saved in this browser.
                </p>
                {googleClientId && (
                  <>
                    <div className="auth-divider"><span>or continue with</span></div>
                    {googleError && <div className="auth-alert" role="alert">{googleError}</div>}
                    <div
                      ref={googleButtonRef}
                      className={`auth-google-button${isSubmitting ? ' is-disabled' : ''}`}
                      aria-label={isSignup ? 'Sign up with Google' : 'Sign in with Google'}
                      aria-busy={isSubmitting}
                    />
                  </>
                )}
                  </>
                )}
          </form>
        </div>

        <p className="auth-legal-footer">
          TuitEase host accounts are free to create. No subscription is started by signing up.
        </p>
      </section>
    </main>
  );
}

interface FormFieldProps {
  label: string;
  error?: string;
  id: string;
  children: ReactNode;
}

function FormField({ label, error, id, children }: FormFieldProps) {
  const errorId = `${id === 'whatsapp' ? 'whatsapp_number' : id}-error`;
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {error && <span className="auth-field-error" id={errorId} role="alert">{error}</span>}
    </div>
  );
}
