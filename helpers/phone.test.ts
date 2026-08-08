/**
 * Node-runnable phone helper checks (no live network).
 * Run: node --experimental-strip-types helpers/phone.test.ts
 */
import {
  formatPhoneDisplayTR,
  isValidOptionalPhoneTR,
  nationalSignificantDigits,
  PHONE_INVALID_MESSAGE,
  toCanonicalPhoneTR,
} from './phone.ts';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

assert(PHONE_INVALID_MESSAGE.includes('5 ile başlamalı'), 'message constant set');

assert(nationalSignificantDigits('5321234567') === '5321234567', 'plain digits');
assert(nationalSignificantDigits('0532 123 45 67') === '5321234567', 'leading 0 stripped');
assert(nationalSignificantDigits('+90 532 123 45 67') === '5321234567', 'country code stripped');
assert(nationalSignificantDigits('4321234567') === '', 'non-5 first digit clears');
assert(nationalSignificantDigits('4') === '', 'invalid first key clears');
assert(nationalSignificantDigits('5') === '5', 'valid first digit kept');
assert(nationalSignificantDigits('') === '', 'empty stays empty');

assert(formatPhoneDisplayTR('+905321234567') === '532 123 45 67', 'display format');
assert(formatPhoneDisplayTR('53212') === '532 12', 'partial display');
assert(formatPhoneDisplayTR('4123') === '', 'invalid paste display empty');

assert(toCanonicalPhoneTR('532 123 45 67') === '+905321234567', 'canonical');
assert(toCanonicalPhoneTR('') === undefined, 'blank canonical undefined');
assert(toCanonicalPhoneTR('532123') === undefined, 'incomplete not canonical');

assert(isValidOptionalPhoneTR('') === true, 'optional empty ok');
assert(isValidOptionalPhoneTR('532 123 45 67') === true, 'valid optional');
assert(isValidOptionalPhoneTR('4123456789') === false, 'invalid optional');

console.log('phone.test.ts: all assertions passed');
