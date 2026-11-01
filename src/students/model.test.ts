import { describe, expect, it } from 'vitest';
import { normalizePhoneDigits, whatsappLink } from './model';

describe('phone helpers', () => {
  it('normalises local Nigerian numbers to the 234 country code', () => {
    expect(normalizePhoneDigits('0803 555 9900')).toBe('2348035559900');
    expect(normalizePhoneDigits('+234 803 555 9900')).toBe('2348035559900');
    expect(normalizePhoneDigits('00234-803-555-9900')).toBe('2348035559900');
  });

  it('leaves international numbers alone and blanks empty values', () => {
    expect(normalizePhoneDigits('+44 7700 900123')).toBe('447700900123');
    expect(normalizePhoneDigits('')).toBe('');
  });

  it('builds a WhatsApp deep link only for plausible numbers', () => {
    expect(whatsappLink('08035559900', 'Ife Adebayo')).toBe(
      `https://wa.me/2348035559900?text=${encodeURIComponent('Hi Ife, ')}`,
    );
    expect(whatsappLink('', 'Ife Adebayo')).toBeNull();
    expect(whatsappLink('123', 'Ife Adebayo')).toBeNull();
    expect(whatsappLink('12345678901234567890', 'Ife Adebayo')).toBeNull();
  });
});
