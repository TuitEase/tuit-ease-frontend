/**
 * One place for money.
 *
 * The API returns Decimal naira (strings such as "48000.00"), not kobo. Convert
 * once here and format every amount through `formatNaira`/`formatMoney` so the
 * rest of the app never has to think about the unit. If the backend starts
 * returning integer kobo, add the kobo branch here and nowhere else.
 */

export type MoneyInput = string | number | null | undefined;

/** Decimal naira -> number of naira. Invalid/blank values become 0. */
export function toNaira(value: MoneyInput): number {
  if (value === null || value === undefined || value === '') return 0;
  const amount = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(amount) ? amount : 0;
}

/** Integer kobo -> naira. Kept here so a future kobo API is a one-file change. */
export function fromKobo(value: MoneyInput): number {
  return toNaira(value) / 100;
}

/** `₦48,000` — whole naira, thousands separators. */
export function formatNaira(value: MoneyInput): string {
  const amount = Math.round(toNaira(value));
  return `₦${Math.abs(amount).toLocaleString('en-US')}`;
}

/** Currency-aware formatting for the rare non-NGN value. */
export function formatMoney(value: MoneyInput, currency = 'NGN'): string {
  if (!currency || currency.toUpperCase() === 'NGN') return formatNaira(value);
  const amount = toNaira(value);
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString('en-US')}`;
  }
}

/** A fee amount shown with the design's leading minus sign. */
export function formatFee(value: MoneyInput): string {
  return `−${formatNaira(value)}`;
}

export function sumNaira(values: Iterable<MoneyInput>): number {
  let total = 0;
  for (const value of values) total += toNaira(value);
  return total;
}
