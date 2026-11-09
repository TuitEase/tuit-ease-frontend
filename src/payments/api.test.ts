import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const classesApi = vi.hoisted(() => ({
  fetchPayments: vi.fn(),
}));
const authApi = vi.hoisted(() => ({
  authenticatedFetch: vi.fn(),
}));

vi.mock('../classes/api', () => classesApi);
vi.mock('../auth/api', () => authApi);

import { downloadPaymentCsv } from './api';

describe('downloadPaymentCsv', () => {
  let createdCsv: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    createdCsv = undefined;
    const NativeBlob = globalThis.Blob;
    vi.stubGlobal('Blob', class extends NativeBlob {
      constructor(parts: BlobPart[], options?: BlobPropertyBag) {
        super(parts, options);
        createdCsv = String(parts[0]);
      }
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:payments');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('exports received rows client-side with filtered data and spreadsheet-safe text', async () => {
    classesApi.fetchPayments.mockResolvedValue({
      items: [
        {
          class_id: 7,
          class_name: 'Design, workshop',
          student_name: '=SUM(1,1)',
          amount: '1200.00',
          status: 'success',
          method: 'paystack',
          reference: '+formula',
          paid_at: '2024-06-15T12:00:00Z',
        },
        {
          class_id: 8,
          class_name: 'Other class',
          student_name: 'Sam',
          amount: '800.00',
          status: 'success',
          method: 'manual',
          reference: 'ref-2',
          paid_at: '2024-06-15T12:00:00Z',
        },
        {
          class_id: 7,
          class_name: 'Design, workshop',
          student_name: 'Pending',
          amount: '500.00',
          status: 'pending',
          method: 'paystack',
          reference: 'ref-3',
          paid_at: null,
        },
      ],
      total: 3,
      truncated: false,
    });

    await expect(downloadPaymentCsv('received', 'all', 7, 'UTC')).resolves.toBe(true);

    expect(authApi.authenticatedFetch).not.toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:payments');
    expect(createdCsv).toMatch(/^\uFEFF/);
    expect(createdCsv).toContain('"Design, workshop"');
    expect(createdCsv).toContain('"\u0027=SUM(1,1)"');
    expect(createdCsv).toContain('"\u0027+formula"');
    expect(createdCsv).not.toContain('Other class');
    expect(createdCsv).not.toContain('Pending');
  });

  it('exports all balance-adjusted overdue pages without a CSV endpoint', async () => {
    authApi.authenticatedFetch
      .mockResolvedValueOnce(new Response(JSON.stringify({
        count: 2,
        next: 2,
        previous: null,
        results: [{
          installment_id: 10,
          booking_id: 20,
          class_id: 7,
          class_name: 'Design workshop',
          student_name: 'Ada',
          amount: '500.00',
          due_date: '2024-06-01',
          days_overdue: 10,
          last_reminded_on: null,
        }],
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        count: 2,
        next: null,
        previous: 1,
        results: [{
          installment_id: 11,
          booking_id: 21,
          class_id: 7,
          class_name: 'Design workshop',
          student_name: 'Lee',
          amount: '300.00',
          due_date: '2024-06-02',
          days_overdue: 9,
          last_reminded_on: null,
        }],
      }), { status: 200 }));

    await expect(downloadPaymentCsv('overdue', 'all', 7, 'UTC')).resolves.toBe(true);

    expect(authApi.authenticatedFetch).toHaveBeenCalledTimes(2);
    expect(authApi.authenticatedFetch.mock.calls[0][0]).toContain('/api/host/payments/report/overdue/');
    expect(authApi.authenticatedFetch.mock.calls[1][0]).toContain('page=2');
    expect(createdCsv).toContain('"Ada"');
    expect(createdCsv).toContain('"Lee"');
    expect(createdCsv).toContain('"Overdue"');
  });

  it('does not download a header-only file when no matching rows exist', async () => {
    classesApi.fetchPayments.mockResolvedValue({ items: [], total: 0, truncated: false });

    await expect(downloadPaymentCsv('received', 'all', undefined, 'UTC')).resolves.toBe(false);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('refuses to create a partial export when payment pagination is truncated', async () => {
    classesApi.fetchPayments.mockResolvedValue({ items: [], total: 2001, truncated: true });

    await expect(downloadPaymentCsv('received', 'all', undefined, 'UTC'))
      .rejects.toThrow('There are more than 2,000 payment records.');
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });
});
