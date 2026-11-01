import { describe, expect, it } from 'vitest';
import { formatFee, formatMoney, formatNaira, fromKobo, sumNaira, toNaira } from './money';

describe('money', () => {
  it('converts decimal naira strings and numbers', () => {
    expect(toNaira('48000.00')).toBe(48000);
    expect(toNaira('20000.50')).toBe(20000.5);
    expect(toNaira(1500)).toBe(1500);
    expect(toNaira(null)).toBe(0);
    expect(toNaira(undefined)).toBe(0);
    expect(toNaira('')).toBe(0);
    expect(toNaira('not money')).toBe(0);
  });

  it('converts integer kobo only through the shared helper', () => {
    expect(fromKobo('4800000')).toBe(48000);
    expect(fromKobo('')).toBe(0);
  });

  it('formats whole naira with separators and rounds the rest away', () => {
    expect(formatNaira('48000.00')).toBe('₦48,000');
    expect(formatNaira(20000.5)).toBe('₦20,001');
    expect(formatNaira('0')).toBe('₦0');
    expect(formatNaira(null)).toBe('₦0');
  });

  it('formats fee rows with the design’s leading minus sign', () => {
    expect(formatFee('1500')).toBe('−₦1,500');
  });

  it('falls back gracefully for a currency Intl does not know', () => {
    expect(formatMoney('48000', 'NGN')).toBe('₦48,000');
    expect(formatMoney('48000', 'USD')).toContain('48,000');
    expect(formatMoney('48000', 'ZZZ')).toContain('48,000');
    expect(formatMoney('48000', 'NOPE')).toBe('NOPE 48,000');
  });

  it('sums mixed money values', () => {
    expect(sumNaira(['1000.50', 2000, null, undefined, 'oops'])).toBe(3000.5);
    expect(sumNaira([])).toBe(0);
  });
});
