export const SUPPORTED_MONEY_FRACTION_DIGITS = 2;

export type MoneyInputParseResult =
  | { kind: 'empty' }
  | { kind: 'invalid' }
  | { kind: 'valid'; amountMinor: number };

/**
 * Parse a Turkish-friendly major-unit string without floating point.
 * Accepted examples: 200, 200,5, 200,50, 1.200,50 and 200.50.
 */
export function parseMoneyInput(major: string | undefined | null): MoneyInputParseResult {
  if (major === undefined || major === null || major.trim() === '') {
    return { kind: 'empty' };
  }

  const raw = major.trim().replace(/\s/g, '');
  if (!raw || raw.startsWith('-')) {
    return { kind: 'invalid' };
  }

  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');
  let whole: string;
  let fraction = '';

  if (hasComma && hasDot) {
    // Turkish grouping/decimal form: 1.234,56.
    const lastComma = raw.lastIndexOf(',');
    if (lastComma < raw.lastIndexOf('.')) {
      return { kind: 'invalid' };
    }
    const groupedWhole = raw.slice(0, lastComma);
    if (!/^\d{1,3}(\.\d{3})*$/.test(groupedWhole)) {
      return { kind: 'invalid' };
    }
    whole = groupedWhole.replace(/\./g, '');
    fraction = raw.slice(lastComma + 1);
  } else if (hasComma) {
    const parts = raw.split(',');
    if (parts.length !== 2) {
      return { kind: 'invalid' };
    }
    [whole, fraction] = parts;
  } else if (hasDot) {
    const parts = raw.split('.');
    if (parts.length !== 2) {
      return { kind: 'invalid' };
    }
    [whole, fraction] = parts;
  } else {
    whole = raw;
  }

  if (!/^\d+$/.test(whole) || (fraction !== '' && !/^\d+$/.test(fraction))) {
    return { kind: 'invalid' };
  }
  if (fraction.length > SUPPORTED_MONEY_FRACTION_DIGITS) {
    return { kind: 'invalid' };
  }

  const paddedFraction = (fraction + '00').slice(0, SUPPORTED_MONEY_FRACTION_DIGITS);
  try {
    const minor = BigInt(whole) * BigInt(100) + BigInt(paddedFraction);
    if (minor > BigInt(Number.MAX_SAFE_INTEGER)) {
      return { kind: 'invalid' };
    }
    return { kind: 'valid', amountMinor: Number(minor) };
  } catch {
    return { kind: 'invalid' };
  }
}

/** Format a known-safe minor-unit integer for the next editing session. */
export function formatMoneyInput(amountMinor?: number | null): string {
  if (amountMinor === undefined || amountMinor === null) {
    return '';
  }
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    return '';
  }

  const minor = BigInt(amountMinor);
  const hundred = BigInt(100);
  const whole = minor / hundred;
  const fraction = minor % hundred;
  return `${whole.toString()},${fraction.toString().padStart(2, '0')}`;
}
