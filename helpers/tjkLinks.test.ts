import assert from 'assert';
import { cleanHorseName, getTjkHorseDetailUrl, getTjkHorseUrl } from './tjkLinks';

console.log('Running tjkLinks tests...');

// 1. cleanHorseName tests
assert.strictEqual(cleanHorseName('THREE VALLEYS (USA)'), 'THREE VALLEYS');
assert.strictEqual(cleanHorseName('BALASAGUN (IRE)'), 'BALASAGUN');
assert.strictEqual(cleanHorseName('ROCK OF GIBRALTAR [IRE]'), 'ROCK OF GIBRALTAR');
assert.strictEqual(cleanHorseName('HAZARFEN(Öldü)'), 'HAZARFEN');
assert.strictEqual(cleanHorseName('AĞA KARACA (1995) d a'), 'AĞA KARACA');
assert.strictEqual(cleanHorseName('TURBO k a'), 'TURBO');
assert.strictEqual(cleanHorseName(''), null);
assert.strictEqual(cleanHorseName('-'), null);
assert.strictEqual(cleanHorseName(null), null);
console.log('✓ cleanHorseName tests passed');

// 2. getTjkHorseDetailUrl tests
assert.strictEqual(
  getTjkHorseDetailUrl(99137),
  'https://www.tjk.org/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri?1=1&QueryParameter_AtId=99137'
);
assert.strictEqual(
  getTjkHorseDetailUrl('11514'),
  'https://www.tjk.org/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri?1=1&QueryParameter_AtId=11514'
);
assert.strictEqual(getTjkHorseDetailUrl(null), null);
console.log('✓ getTjkHorseDetailUrl tests passed');

// 3. getTjkHorseUrl tests
// With direct atId
assert.strictEqual(
  getTjkHorseUrl('TURBO', 99137),
  'https://www.tjk.org/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri?1=1&QueryParameter_AtId=99137'
);
// With numeric string
assert.strictEqual(
  getTjkHorseUrl('99137'),
  'https://www.tjk.org/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri?1=1&QueryParameter_AtId=99137'
);
// Name fallback routes to backend redirect endpoint
assert.strictEqual(
  getTjkHorseUrl('THREE VALLEYS (USA)'),
  '/api/v1/tjk/redirect?name=THREE%20VALLEYS'
);
assert.strictEqual(
  getTjkHorseUrl('BALASAGUN (IRE)'),
  '/api/v1/tjk/redirect?name=BALASAGUN'
);
assert.strictEqual(
  getTjkHorseUrl('ROCK OF GIBRALTAR'),
  '/api/v1/tjk/redirect?name=ROCK%20OF%20GIBRALTAR'
);
console.log('✓ getTjkHorseUrl tests passed');

console.log('All tjkLinks tests passed successfully! 🎉');
