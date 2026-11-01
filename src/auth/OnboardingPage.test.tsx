import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import OnboardingPage from './OnboardingPage';

const api = vi.hoisted(() => ({
  AuthApiError: class AuthApiError extends Error {
    fieldErrors = {};
  },
  completeHostOnboarding: vi.fn(),
  fetchHostProfile: vi.fn(),
  fetchPayoutBanks: vi.fn(),
  getAuthToken: vi.fn(),
  resolveAccountName: vi.fn(),
  setupHostPayout: vi.fn(),
  updateHostProfile: vi.fn(),
}));

vi.mock('./api', () => api);

const host = {
  business_name: 'Ada Classes',
  email: 'ada@example.com',
  host_type: '',
  whatsapp_number: '',
  timezone: 'Africa/Lagos',
  summary_hour: 7,
  daily_summary_enabled: true,
  needs_onboarding: true,
  payout_ready: false,
};

describe('host onboarding', () => {
  beforeEach(() => {
    api.getAuthToken.mockReturnValue('session-token');
    api.fetchHostProfile.mockResolvedValue(host);
    api.updateHostProfile.mockResolvedValue(host);
    api.completeHostOnboarding.mockResolvedValue({ ...host, needs_onboarding: false });
    api.fetchPayoutBanks.mockResolvedValue([{ name: 'Example Bank', code: '001' }]);
    api.resolveAccountName.mockResolvedValue('Ada Okafor');
    api.setupHostPayout.mockResolvedValue({ ...host, needs_onboarding: false, payout_ready: true });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('saves the host profile and preferences before completing onboarding', async () => {
    render(<OnboardingPage />);
    await screen.findByRole('heading', { name: 'Tell us about your classes' });

    fireEvent.change(screen.getByLabelText(/Business or host name/), { target: { value: 'Ada Learning' } });
    fireEvent.change(screen.getByLabelText('What kind of classes do you host?'), { target: { value: 'tech' } });
    fireEvent.change(screen.getByLabelText(/WhatsApp number/), { target: { value: '+2348012345678' } });
    fireEvent.click(screen.getByRole('button', { name: /Save and continue/ }));

    await screen.findByRole('heading', { name: 'Choose your class rhythm' });
    expect(api.updateHostProfile).toHaveBeenCalledWith({
      business_name: 'Ada Learning',
      host_type: 'tech',
      whatsapp_number: '+2348012345678',
    });

    fireEvent.change(screen.getByRole('combobox', { name: /Your time zone/ }), { target: { value: 'Africa/Accra' } });
    fireEvent.click(screen.getByRole('button', { name: /Save and continue/ }));

    await screen.findByRole('heading', { name: 'Where should class payments go?' });
    expect(api.updateHostProfile).toHaveBeenLastCalledWith({
      timezone: 'Africa/Accra',
      summary_hour: 7,
      daily_summary_enabled: true,
    });
    expect(api.completeHostOnboarding).toHaveBeenCalledWith({
      business_name: 'Ada Learning',
      host_type: 'tech',
      whatsapp_number: '+2348012345678',
    });
  }, 10000);

  it('allows hosts to defer payouts and accurately reports the incomplete setup', async () => {
    render(<OnboardingPage />);
    await screen.findByRole('heading', { name: 'Tell us about your classes' });

    fireEvent.change(screen.getByLabelText(/Business or host name/), { target: { value: 'Ada Learning' } });
    fireEvent.click(screen.getByRole('button', { name: /Save and continue/ }));
    await screen.findByRole('heading', { name: 'Choose your class rhythm' });
    fireEvent.click(screen.getByRole('button', { name: /Save and continue/ }));
    await screen.findByRole('heading', { name: 'Where should class payments go?' });

    fireEvent.click(screen.getByRole('button', { name: 'Skip payout setup for now' }));

    expect(await screen.findByRole('heading', { name: 'You’re ready to build your classes.' })).toBeInTheDocument();
    expect(screen.getByText(/You skipped payout setup/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Set up payouts' })).toHaveAttribute('href', '/onboarding/');
    expect(api.setupHostPayout).not.toHaveBeenCalled();
  });

  it('loads banks and submits payout details only after account validation', async () => {
    render(<OnboardingPage />);
    await screen.findByRole('heading', { name: 'Tell us about your classes' });
    fireEvent.change(screen.getByLabelText(/Business or host name/), { target: { value: 'Ada Learning' } });
    fireEvent.click(screen.getByRole('button', { name: /Save and continue/ }));
    await screen.findByRole('heading', { name: 'Choose your class rhythm' });
    fireEvent.click(screen.getByRole('button', { name: /Save and continue/ }));
    await screen.findByRole('heading', { name: 'Where should class payments go?' });

    await waitFor(() => expect(api.fetchPayoutBanks).toHaveBeenCalledOnce());
    fireEvent.change(screen.getByLabelText('Bank'), { target: { value: '001' } });
    fireEvent.change(screen.getByRole('textbox', { name: /10-digit account number/ }), { target: { value: '0123456789' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify account name/ }));

    await waitFor(() => expect(api.resolveAccountName).toHaveBeenCalledWith('001', '0123456789'));
    expect(await screen.findByText('Ada Okafor')).toBeInTheDocument();

    const connectButton = screen.getByRole('button', { name: /Connect payout account/ });
    expect(connectButton).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /I confirm this is the correct account name/ }));
    expect(connectButton).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /Connect payout account/ }));

    await waitFor(() => expect(api.setupHostPayout).toHaveBeenCalledWith('001', '0123456789'));
    expect(await screen.findByText(/Paystack payout account connected/)).toBeInTheDocument();
  });
});
