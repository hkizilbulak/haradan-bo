/**
 * Node-runnable advert public URL helper checks.
 * Run: node --experimental-strip-types helpers/advertUrl.test.ts
 */
import { buildAdvertDetailUrl, getFrontendBaseUrl } from '../contants/urls.ts';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

const originalFrontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL;
process.env.NEXT_PUBLIC_FRONTEND_URL = 'https://example.com/';

assert(getFrontendBaseUrl() === 'https://example.com', 'trailing slash trimmed from frontend base');
assert(
  buildAdvertDetailUrl(42) === 'https://example.com/advert/42',
  'numeric advert id encoded in detail path',
);
assert(
  buildAdvertDetailUrl(' 99 ') === 'https://example.com/advert/99',
  'string advert id trimmed',
);

process.env.NEXT_PUBLIC_FRONTEND_URL = originalFrontendUrl;

console.log('advertUrl.test.ts: ok');
