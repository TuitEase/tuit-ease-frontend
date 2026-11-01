import { describe, expect, it } from 'vitest';
import { amountForApi, formatClassLink, parseAmount, publicBaseUrl } from './format';

describe('money parsing', () => {
  it('reads whole naira from plain and formatted input', () => {
    expect(parseAmount('48000')).toBe(48_000);
    expect(parseAmount('₦48,000')).toBe(48_000);
    expect(parseAmount('20000.50')).toBe(20_001);
  });

  it('treats empty or invalid prices as zero', () => {
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('abc')).toBe(0);
    expect(parseAmount('-500')).toBe(0);
  });

  it('sends the API a plain integer string', () => {
    expect(amountForApi('₦20,000.40')).toBe('20000');
  });
});

describe('booking links', () => {
  it('uses the /class/<slug>/ path and strips trailing slashes from the base', () => {
    expect(formatClassLink('https://tuitease.com/', 'intro-to-photography')).toBe(
      'https://tuitease.com/class/intro-to-photography/',
    );
  });

  it('falls back to the current origin', () => {
    expect(publicBaseUrl()).toBe(window.location.origin);
  });
});
