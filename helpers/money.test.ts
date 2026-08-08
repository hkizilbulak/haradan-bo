import assert from 'node:assert/strict';
import { formatMoneyInput, parseMoneyInput } from './money.ts';

const validCases: Array<[string, number]> = [
  ['2', 200],
  ['20', 2_000],
  ['200', 20_000],
  ['200,5', 20_050],
  ['200,50', 20_050],
  ['1.200,50', 120_050],
  ['200.50', 20_050],
];

assert.deepEqual(parseMoneyInput(''), { kind: 'empty' }, 'empty editing state stays empty');
for (const [input, amountMinor] of validCases) {
  assert.deepEqual(parseMoneyInput(input), { kind: 'valid', amountMinor }, input);
}

// Selecting all and deleting/backspacing must remain a valid temporary empty state.
let editingValue = '200,50';
editingValue = editingValue.slice(0, -1);
assert.equal(editingValue, '200,5');
editingValue = '';
assert.deepEqual(parseMoneyInput(editingValue), { kind: 'empty' });

for (const invalid of ['abc', '1,2,3', '200,500', '1,200.50', '12.00,50', '-1', '1..2']) {
  assert.deepEqual(parseMoneyInput(invalid), { kind: 'invalid' }, invalid);
}

assert.equal(formatMoneyInput(20_000), '200,00');
assert.equal(formatMoneyInput(20_050), '200,50');

console.log('money helper tests passed');
