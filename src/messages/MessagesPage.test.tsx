import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MessagesPage from './MessagesPage';

const messagesApi = vi.hoisted(() => ({
  fetchAnnouncementPreview: vi.fn(),
  fetchMessageActivity: vi.fn(),
  fetchMessageClasses: vi.fn(),
  fetchMessageIssues: vi.fn(),
  fetchMessageSummary: vi.fn(),
  fetchReminderPreviews: vi.fn(),
  handleMessage: vi.fn(),
  retryMessage: vi.fn(),
}));

vi.mock('./api', () => messagesApi);
vi.mock('../dashboard/api', () => ({
  fetchHost: vi.fn().mockResolvedValue({
    business_name: 'Ada Classes',
    timezone: 'Africa/Lagos',
  }),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MessagesPage />
    </QueryClientProvider>,
  );
}

describe('MessagesPage', () => {
  beforeEach(() => {
    localStorage.setItem('tuitease.auth.token', 'test-token');
    window.history.replaceState(null, '', '/messages/?tab=announce');
    messagesApi.fetchMessageClasses.mockResolvedValue([{
      id: 8,
      title: 'Python Basics',
      status: 'live',
      seats: { booked: 1, waitlist: 0 },
      message_audience: { students: 1, waiting_list: 0 },
    }]);
    messagesApi.fetchMessageSummary.mockResolvedValue({
      needs_attention: 0,
      sent_today: 0,
      daily_limit: 250,
      messages_remaining: 250,
      sent_percent_30d: 100,
      scheduled: 0,
      delivery_metric_note: 'Provider accepted.',
    });
    messagesApi.fetchMessageIssues.mockResolvedValue({ results: [], next: null, previous: null });
    messagesApi.fetchAnnouncementPreview.mockResolvedValue({
      rendered_text: 'Hi Ada, an update about Python Basics:',
      template_name: 'class_update',
      in_template: false,
      template_approved: false,
    });
    messagesApi.fetchReminderPreviews.mockResolvedValue({
      confirmation: null,
      day_before: null,
      hour_before: null,
      sample_student: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('keeps sending disabled until the WhatsApp template is approved', async () => {
    renderPage();

    expect(await screen.findByText(/No approved WhatsApp “Class update” template/)).toBeInTheDocument();
    expect(messagesApi.fetchMessageClasses).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Send to/ })).toBeDisabled();
  });
});
