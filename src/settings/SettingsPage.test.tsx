import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AccountSettingsPage from './SettingsPage';

const api = vi.hoisted(() => ({
  AuthApiError: class AuthApiError extends Error {},
  clearAuthSession: vi.fn(),
  fetchHostProfile: vi.fn(),
  fetchPayoutBanks: vi.fn(),
  getAuthToken: vi.fn(),
  resolveAccountName: vi.fn(),
  setupHostPayout: vi.fn(),
  updateHostProfile: vi.fn(),
}));

vi.mock('../auth/api', () => api);

const host = {
  business_name: 'Ada Classes',
  email: 'ada@example.com',
  whatsapp_number: '2348011112222',
  host_type: 'tutor',
  timezone: 'Africa/Lagos',
  summary_hour: 7,
  daily_summary_enabled: true,
  needs_onboarding: false,
  payout_ready: true,
  payout_bank_code: '058',
  payout_account_last4: '6789',
};

function renderSettings() {
  return render(<AccountSettingsPage />);
}

describe('account settings', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/settings/');
    api.getAuthToken.mockReturnValue('session-token');
    api.fetchHostProfile.mockResolvedValue(host);
    api.fetchPayoutBanks.mockResolvedValue([
      { name: 'Example Bank', code: '058' },
      { name: 'Access Bank', code: '044' },
    ]);
    api.resolveAccountName.mockResolvedValue('Ada Okafor');
    api.updateHostProfile.mockResolvedValue({ ...host, business_name: 'Ada Learning' });
    api.setupHostPayout.mockResolvedValue({ ...host, payout_account_last4: '4321' });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('saves editable host profile fields', async () => {
    renderSettings();

    fireEvent.change(await screen.findByLabelText('Business or host name'), { target: { value: 'Ada Learning' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'ada.updated@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    await waitFor(() => expect(api.updateHostProfile).toHaveBeenCalledWith({
      business_name: 'Ada Learning',
      email: 'ada.updated@example.com',
      whatsapp_number: '2348011112222',
      host_type: 'tutor',
    }));
    expect(await screen.findByRole('status')).toHaveTextContent('Your profile has been updated.');
  });

  it('verifies and saves a replacement payout account after confirmation', async () => {
    window.history.replaceState({}, '', '/settings/?section=payout');
    renderSettings();

    fireEvent.change(await screen.findByRole('combobox', { name: 'Bank' }), { target: { value: 'Example' } });
    fireEvent.click(screen.getByRole('option', { name: 'Example Bank' }));
    fireEvent.change(screen.getByLabelText('Account number'), { target: { value: '0123456789' } });

    await waitFor(() => expect(api.resolveAccountName).toHaveBeenCalledWith('058', '0123456789'));
    expect(await screen.findByText('Ada Okafor')).toBeInTheDocument();
    const saveButton = screen.getByRole('button', { name: 'Update payout account' });
    expect(saveButton).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm account' }));
    expect(saveButton).toBeEnabled();
    fireEvent.click(saveButton);

    await waitFor(() => expect(api.setupHostPayout).toHaveBeenCalledWith('058', '0123456789'));
    expect(await screen.findByRole('status')).toHaveTextContent('Your payout account has been updated.');
  });

  it('filters the already-loaded bank list locally as the user searches', async () => {
    window.history.replaceState({}, '', '/settings/?section=payout');
    renderSettings();
    const search = await screen.findByRole('combobox', { name: 'Bank' });
    fireEvent.focus(search);
    await screen.findByRole('option', { name: 'Example Bank' });
    expect(api.fetchPayoutBanks).toHaveBeenCalledOnce();

    fireEvent.change(search, { target: { value: 'access' } });

    expect(screen.getByRole('option', { name: 'Access Bank' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Example Bank' })).not.toBeInTheDocument();
    expect(api.fetchPayoutBanks).toHaveBeenCalledOnce();
  });
});
