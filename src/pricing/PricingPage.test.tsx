import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PricingPage } from './PricingPage';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const pricing = {
  currency: 'NGN',
  platform_percent: '4',
  examples: [
    {
      student_pays: '20000.00',
      platform_fee: '800.00',
      processing_fee: '400.00',
      host_receives: '18800.00',
      platform_percent: '4',
    },
    {
      student_pays: '48000.00',
      platform_fee: '1920.00',
      processing_fee: '820.00',
      host_receives: '45260.00',
      platform_percent: '4',
    },
  ],
};

describe('PricingPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows the live rate and the total breakdown from the public pricing API', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(pricing));

    render(<PricingPage />);

    expect(screen.getByRole('link', { name: 'TuitEase home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('img', { name: 'TuitEase' })).toHaveAttribute('src', '/assets/tuitease-logo.png');
    expect(screen.getByText('Loading the current platform fee…')).toBeInTheDocument();

    expect((await screen.findAllByText('4%')).length).toBeGreaterThan(0);
    expect(screen.getByText('(4%)')).toBeInTheDocument();
    expect(screen.getAllByText('₦20,000').length).toBeGreaterThan(0);
    expect(screen.getByText('−₦800')).toBeInTheDocument();
    expect(screen.getByText('−₦400')).toBeInTheDocument();
    expect(screen.getByText('−₦1,200')).toBeInTheDocument();
    expect(screen.getAllByText('₦18,800').length).toBeGreaterThan(0);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/public/pricing/');
  });

  it('switches the breakdown when another example price is chosen', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(pricing));

    render(<PricingPage />);

    await screen.findAllByText('4%');
    const second = screen.getByRole('button', { name: '₦48,000' });
    expect(second).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(second);

    expect(second).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('−₦1,920')).toBeInTheDocument();
    expect(screen.getAllByText('₦45,260').length).toBeGreaterThan(0);
  });

  it('takes the percentage from platform_percent instead of a hardcoded rate', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        currency: 'NGN',
        platform_percent: '3.5',
        examples: [
          {
            student_pays: '10000.00',
            platform_fee: '350.00',
            processing_fee: '250.00',
            host_receives: '9400.00',
            platform_percent: '3.5',
          },
        ],
      }),
    );

    render(<PricingPage />);

    expect((await screen.findAllByText('3.5%')).length).toBeGreaterThan(0);
    expect(screen.getByText('(3.5%)')).toBeInTheDocument();
    expect(screen.queryAllByText('4%')).toHaveLength(0);
    expect(screen.queryAllByText('5%')).toHaveLength(0);
  });

  it('shows the backend error and retries on demand', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ detail: 'Pricing is temporarily unavailable.' }, 503))
      .mockResolvedValueOnce(jsonResponse(pricing));

    render(<PricingPage />);

    expect(await screen.findByText('Pricing is temporarily unavailable.')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getAllByText('4%').length).toBeGreaterThan(0));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
