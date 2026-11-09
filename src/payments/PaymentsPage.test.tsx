import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const api = vi.hoisted(() => ({
  downloadPaymentCsv: vi.fn(),
  fetchClassRanking: vi.fn(),
  fetchMonthlyCollections: vi.fn(),
  fetchOverdue: vi.fn(),
  fetchPaymentSummary: vi.fn(),
  fetchReminderPreview: vi.fn(),
  queueOverdueReminders: vi.fn(),
}));

vi.mock('./api', () => ({
  ...api,
  PaymentsApiError: class PaymentsApiError extends Error {},
}));

import { PaymentsPage } from './PaymentsPage';

describe('PaymentsPage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchPaymentSummary.mockResolvedValue({
      range: 'this_month',
      timezone: 'Africa/Lagos',
      as_of: '2026-11-02T12:00:00+01:00',
      period_start: '2026-11-01',
      collected_amount: '20000.00',
      successful_payment_count: 2,
      unique_student_count: 1,
      paid_on_time_percent: 75,
      paid_on_time_numerator: '15000.00',
      paid_on_time_denominator: '20000.00',
      still_to_come_amount: '5000.00',
      overdue_amount: '5000.00',
      overdue_booking_count: 1,
    });
    api.fetchMonthlyCollections.mockResolvedValue({
      timezone: 'Africa/Lagos',
      results: [{ month: '2026-11', amount: '20000.00', payment_count: 2 }],
    });
    api.fetchClassRanking.mockResolvedValue({
      range: 'this_month',
      results: [{
        class_id: 7,
        class_name: 'Design workshop',
        price: '20000.00',
        collected_amount: '20000.00',
        payment_count: 2,
        student_count: 1,
        outstanding_amount: '5000.00',
        ended: false,
      }],
    });
    api.fetchOverdue.mockResolvedValue({
      count: 1,
      next: null,
      previous: null,
      results: [{
        installment_id: 3,
        booking_id: 9,
        class_id: 7,
        class_name: 'Design workshop',
        student_name: 'Ada',
        amount: '5000.00',
        due_date: '2026-10-25',
        days_overdue: 8,
        last_reminded_on: null,
      }],
    });
    api.fetchReminderPreview.mockResolvedValue({
      eligible_count: 1,
      overdue_count: 1,
      opted_out_count: 0,
      send_allowed: false,
      template_name: null,
      disabled_reason: 'An approved WhatsApp payment template is not configured.',
      samples: [{ student_name: 'Ada', class_name: 'Design workshop', message: 'Payment preview text.' }],
    });
    api.downloadPaymentCsv.mockResolvedValue(true);
    api.queueOverdueReminders.mockResolvedValue({ queued: 1, skipped: 0 });
  });

  it('shows server-calculated financial metrics and the overdue list', async () => {
    render(<PaymentsPage />);

    expect(await screen.findAllByText('₦20,000')).not.toHaveLength(0);
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getAllByText('Ada')).not.toHaveLength(0);
    expect(screen.getByText('Payment preview text.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard/');
    expect(screen.queryByRole('link', { name: 'Classes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Students' })).not.toBeInTheDocument();
    expect(api.fetchPaymentSummary).toHaveBeenCalledWith('this_month');
  });

  it('keeps reminder sending disabled until the approved template is configured', async () => {
    render(<PaymentsPage />);

    const sendButton = await screen.findByRole('button', { name: 'Send overdue reminders' });
    expect(sendButton).toBeDisabled();
    fireEvent.click(sendButton);
    expect(api.queueOverdueReminders).not.toHaveBeenCalled();
  });

  it('requests a client-generated CSV export for the selected filters', async () => {
    render(<PaymentsPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Export received' }));

    await waitFor(() => {
      expect(api.downloadPaymentCsv).toHaveBeenCalledWith('received', 'this_month', undefined, 'Africa/Lagos');
    });
    expect(await screen.findByText('Your CSV export is ready.')).toBeInTheDocument();
  });
});
