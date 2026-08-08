/**
 * Turkey-focused optional mobile phone helpers for BO UX.
 * UI display/input: `532 123 45 67` (no leading 0).
 * Backend canonical remains `+905XXXXXXXXX`.
 */

const nonDigit = /\D+/g;

export const PHONE_INVALID_MESSAGE =
  'Telefon numarası 5 ile başlamalı ve 10 haneli olmalıdır.';

/** Strip country/trunk prefixes → national 10-digit significant number (5XXXXXXXXX). */
export function nationalSignificantDigits(raw: string): string {
  let digits = String(raw).replace(nonDigit, '');
  if (digits.startsWith('90') && digits.length >= 12) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  // Cap at 10 significant digits so users cannot type 20+ garbage.
  if (digits.length > 10) {
    digits = digits.slice(0, 10);
  }
  // Invalid paste / first key that is not a mobile prefix clears the field.
  if (digits.length > 0 && digits[0] !== '5') {
    return '';
  }
  return digits;
}

/** Controlled UI format `532 123 45 67` (or partial while typing). */
export function formatPhoneDisplayTR(raw?: string | null): string {
  if (!raw) return '';
  const digits = nationalSignificantDigits(raw);
  if (!digits) return '';
  const a = digits.slice(0, 3);
  const b = digits.slice(3, 6);
  const c = digits.slice(6, 8);
  const d = digits.slice(8, 10);
  return [a, b, c, d].filter(Boolean).join(' ');
}

/** Canonical API value `+905XXXXXXXXX`, or undefined when blank. */
export function toCanonicalPhoneTR(raw?: string | null): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  const trimmed = String(raw).trim();
  if (!trimmed) return undefined;
  const digits = nationalSignificantDigits(trimmed);
  if (!/^5\d{9}$/.test(digits)) {
    return undefined;
  }
  return `+90${digits}`;
}

export function isValidOptionalPhoneTR(raw?: string | null): boolean {
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return true;
  }
  return Boolean(toCanonicalPhoneTR(raw));
}
