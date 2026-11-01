import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearFeePreviewCache, useFeePreview } from './useFeePreview';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const preview = {
  student_pays: '20000.00',
  platform_fee: '700.00',
  processing_fee: '400.00',
  host_receives: '18900.00',
  platform_percent: '3.5',
};

describe('useFeePreview', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('tuitease.auth.token', 'token');
    clearFeePreviewCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    clearFeePreviewCache();
  });

  it('stays idle until there is a price', () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useFeePreview(0));

    expect(result.current.status).toBe('idle');
    expect(result.current.fee).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('loads the backend breakdown and reuses it for the same amount', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(preview));
    const { result, rerender } = renderHook(({ amount }: { amount: string }) => useFeePreview(amount, 0), {
      initialProps: { amount: '20000' },
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.fee).toMatchObject({ studentPays: 20_000, hostReceives: 18_900 });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    rerender({ amount: '20000' });
    expect(result.current.fee?.hostReceives).toBe(18_900);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    rerender({ amount: '30000' });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('exposes the API error and retries on demand', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'Payment is too small to cover fees' } }, 400))
      .mockResolvedValueOnce(jsonResponse(preview));

    const { result } = renderHook(() => useFeePreview('100', 0));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.message).toBe('Payment is too small to cover fees');
    expect(result.current.fee).toBeNull();

    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.fee?.studentPays).toBe(20_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps class-scoped and unscoped previews apart in the cache', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(preview));

    const { result, rerender } = renderHook(
      ({ classId }: { classId: number | null }) => useFeePreview('20000', 0, classId),
      { initialProps: { classId: null as number | null } },
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    rerender({ classId: 17 });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(String(fetchMock.mock.calls[1][0])).toContain('class_id=17');

    // Asking again for the same class reuses its cached answer.
    rerender({ classId: null });
    rerender({ classId: 17 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
