import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FEE_PREVIEW_PATH, FeePreviewError, PUBLIC_PRICING_PATH, feePercentLabel, fetchFeePreview, fetchPublicPricing, percentToFraction } from './fees';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const preview = {
  student_pays: '48000.00',
  platform_fee: '1680.00',
  processing_fee: '820.00',
  host_receives: '45500.00',
  platform_percent: '3.5',
};

describe('fetchFeePreview', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('tuitease.auth.token', 'token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('maps the API payload to the shape the screens render', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(preview));

    await expect(fetchFeePreview('48000')).resolves.toEqual({
      studentPays: 48_000,
      paystackFee: 820,
      platformFee: 1_680,
      hostReceives: 45_500,
      platformPercent: 0.035,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(FEE_PREVIEW_PATH);
    expect(String(url)).toContain('amount=48000.00');
    expect((init?.headers as Headers).get('Authorization')).toBe('Token token');
  });

  it('asks the backend for the exact amount the host typed', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(preview));

    await fetchFeePreview('20000.5');

    expect(String(fetchMock.mock.calls[0][0])).toContain('amount=20000.50');
  });

  it('scopes the preview to a published class so its frozen rate applies', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(preview));

    await fetchFeePreview('48000', undefined, 17);

    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('amount=48000.00');
    expect(url).toContain('class_id=17');
  });

  it('passes the backend’s message through when the amount is too small', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ error: { code: 'invalid_amount', message: 'Payment is too small to cover fees' } }, 400),
    );

    await expect(fetchFeePreview(100)).rejects.toMatchObject({
      name: 'FeePreviewError',
      message: 'Payment is too small to cover fees',
      status: 400,
    });
  });

  it('does not call the API for a blank or zero price', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(fetchFeePreview(0)).rejects.toBeInstanceOf(FeePreviewError);
    await expect(fetchFeePreview('')).rejects.toBeInstanceOf(FeePreviewError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports an unreadable response instead of rendering bad numbers', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ unexpected: true }));

    await expect(fetchFeePreview(48_000)).rejects.toMatchObject({
      name: 'FeePreviewError',
      message: expect.stringContaining('unreadable'),
    });
  });

  it('clears the session when the token has expired', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ detail: 'Authentication credentials were not provided.' }, 401));

    await expect(fetchFeePreview(48_000)).rejects.toMatchObject({
      name: 'FeePreviewError',
      message: expect.stringContaining('session has expired'),
    });
    expect(localStorage.getItem('tuitease.auth.token')).toBeNull();
  });
});

describe('fetchPublicPricing', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('maps the public rate and examples without needing a token', async () => {
    localStorage.clear();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        currency: 'NGN',
        platform_percent: '4',
        examples: [{ ...preview, platform_percent: '4', platform_fee: '1920.00', host_receives: '45260.00' }],
      }),
    );

    await expect(fetchPublicPricing()).resolves.toEqual({
      currency: 'NGN',
      platformPercent: 0.04,
      examples: [
        {
          studentPays: 48_000,
          paystackFee: 820,
          platformFee: 1_920,
          hostReceives: 45_260,
          platformPercent: 0.04,
        },
      ],
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain(PUBLIC_PRICING_PATH);
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('rejects a pricing payload without usable examples', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ currency: 'NGN', examples: [] }));

    await expect(fetchPublicPricing()).rejects.toMatchObject({
      name: 'FeePreviewError',
      message: expect.stringContaining('unreadable'),
    });
  });

  it('passes the backend message through when pricing cannot load', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ detail: 'Pricing is temporarily unavailable.' }, 503),
    );

    await expect(fetchPublicPricing()).rejects.toMatchObject({
      name: 'FeePreviewError',
      message: 'Pricing is temporarily unavailable.',
      status: 503,
    });
  });
});

describe('percent formatting', () => {
  it('converts the API percentage into the fraction labels use', () => {
    expect(percentToFraction('3.5')).toBe(0.035);
    expect(percentToFraction(0)).toBe(0);
    expect(percentToFraction('')).toBe(0);
    expect(percentToFraction('nope')).toBe(0);
  });

  it('renders the platform rate without trailing zeros', () => {
    expect(feePercentLabel(0.035)).toBe('3.5%');
    expect(feePercentLabel(0.05)).toBe('5%');
    expect(feePercentLabel(0)).toBe('0%');
  });
});
