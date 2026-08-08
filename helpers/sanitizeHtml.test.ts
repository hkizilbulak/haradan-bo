/**
 * Node-runnable sanitizer regression checks (no live network).
 * Run: node --import tsx helpers/sanitizeHtml.test.ts
 * Fallback: npx tsx helpers/sanitizeHtml.test.ts
 */
import { looksLikeHtml, sanitizeRichHtml } from './sanitizeHtml.ts';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

assert(
  sanitizeRichHtml('Bu paket ilanınızı öne çıkarır.') === 'Bu paket ilanınızı öne çıkarır.',
  'plain text must pass through',
);

const allowed = sanitizeRichHtml(
  '<p>Merhaba <strong>a</strong> <em>b</em></p><ul><li>x</li></ul><ol><li>y</li></ol><blockquote>q</blockquote><a href="https://example.com" target="_blank">l</a>',
);
assert(allowed.includes('<strong>'), 'bold kept');
assert(allowed.includes('<em>'), 'italic kept');
assert(allowed.includes('<ul>'), 'ul kept');
assert(allowed.includes('<ol>'), 'ol kept');
assert(allowed.includes('<blockquote>'), 'quote kept');
assert(allowed.includes('https://example.com'), 'safe link kept');
assert(allowed.includes('noopener'), 'noopener added');

const xssCases = [
  '<script>alert(1)</script>',
  '<p><img src=x onerror="alert(1)"></p>',
  '<a href="javascript:alert(1)">x</a>',
  '<p onclick="alert(1)">click</p>',
  '<iframe src="https://evil"></iframe>',
  '<object data="x"></object>',
  '<embed src="x">',
  '<a href="data:text/html,hi">x</a>',
];

for (const input of xssCases) {
  const out = sanitizeRichHtml(input).toLowerCase();
  assert(!out.includes('<script'), `script blocked: ${input}`);
  assert(!out.includes('onerror'), `onerror blocked: ${input}`);
  assert(!out.includes('onclick'), `onclick blocked: ${input}`);
  assert(!out.includes('javascript:'), `javascript blocked: ${input}`);
  assert(!out.includes('<iframe'), `iframe blocked: ${input}`);
  assert(!out.includes('<object'), `object blocked: ${input}`);
  assert(!out.includes('<embed'), `embed blocked: ${input}`);
  assert(!out.includes('data:'), `data url blocked: ${input}`);
}

assert(!looksLikeHtml('plain'), 'plain not html');
assert(looksLikeHtml('<p>x</p>'), 'p is html');

console.log('sanitizeHtml tests: PASS');
