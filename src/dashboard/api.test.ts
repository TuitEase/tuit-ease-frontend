import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchClassBookings, fetchClasses } from './api';

const booking = {
  id: 12,
  reference: 'abc',
  student_name: 'Tolu Kareem',
  student_phone: '08035559900',
  status: 'active',
  amount_due: '20000',
  amount_paid: '10000',
  balance: '10000',
  payment_state: 'part_paid',
  confirmed: true,
  created_at: '2026-10-24T10:00:00Z',
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('dashboard api', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('tuitease.auth.token', 'token');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('unwraps the paginated class roster response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ count: 1, next: null, previous: null, results: [booking] }),
    );

    await expect(fetchClassBookings(4)).resolves.toEqual([booking]);
  });

  it('still accepts a plain array roster response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse([booking]));

    await expect(fetchClassBookings(4)).resolves.toEqual([booking]);
  });

  it('coerces a non-numeric class count so pagination stays usable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        count: { live: 1, draft: 0, ended: 0, all: 1 },
        next: null,
        previous: null,
        results: [{ id: 4, title: 'Python', sessions: [] }],
      }),
    );

    const page = await fetchClasses(1);

    expect(page.count).toBe(1);
    expect(page.results).toHaveLength(1);
  });
});
