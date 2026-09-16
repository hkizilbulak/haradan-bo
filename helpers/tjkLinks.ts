/**
 * Utility functions for generating direct TJK links in Haradan Back-Office.
 */

/**
 * Normalizes horse names by removing country codes, years, coat suffixes, and status tags.
 * e.g. "THREE VALLEYS (USA)" -> "THREE VALLEYS"
 *      "BALASAGUN (IRE)" -> "BALASAGUN"
 *      "HAZARFEN (Öldü)" -> "HAZARFEN"
 */
export function cleanHorseName(rawName: string | null | undefined): string | null {
  if (!rawName || rawName.trim() === '' || rawName.trim() === '-') return null;

  // 1. Remove parenthesized/bracketed tokens e.g. "(USA)", "(1995)", "[TUR]", "(Öldü)"
  let cleanName = rawName.replace(/\s*[\(\[].*?[\)\]]/g, '').trim();

  // 2. Remove coat/don abbreviations at the end of the horse name
  const coatEndRegex = /\s+(k\s*a|k\s*k|d\s*a|d\s*k|a\s*a|a\s*k|y\s*a|y\s*k|d\s*ö|b\s*a|kır|doru|al|yağız)$/i;
  cleanName = cleanName.replace(coatEndRegex, '').trim();

  if (!cleanName || cleanName === '-') return null;
  return cleanName;
}

/**
 * Generates the official TJK horse detail page URL using the horse's official AtId.
 * e.g. https://www.tjk.org/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri?1=1&QueryParameter_AtId=99137
 */
export function getTjkHorseDetailUrl(atId: string | number | null | undefined): string | null {
  if (atId == null) return null;
  const cleanId = String(atId).trim();
  if (!cleanId || cleanId === '-') return null;
  return `https://www.tjk.org/TR/YarisSever/Query/ConnectedPage/AtKosuBilgileri?1=1&QueryParameter_AtId=${encodeURIComponent(cleanId)}`;
}

/**
 * Resolves the base origin for backend API requests in Back-Office.
 */
export function getTjkRedirectBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const proxyUrl = process.env.NEXT_PUBLIC_DEV_PROXY_URL;
    if (proxyUrl && window.location.origin !== proxyUrl) {
      return proxyUrl.replace(/\/+$/, '');
    }
  }
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (apiBase) {
    return apiBase.replace(/\/+$/, '');
  }
  return '';
}

/**
 * Builds the official TJK horse URL.
 * If atId is provided or rawNameOrId is numeric, links directly to AtKosuBilgileri?AtId=...
 * Otherwise, routes through Haradan's live TJK resolver redirect endpoint (/api/v1/tjk/redirect?name=...)
 * which resolves the AtId in ~300ms and 302-redirects directly to the horse's official AtKosuBilgileri page.
 */
export function getTjkHorseUrl(
  rawNameOrId: string | null | undefined,
  atId?: string | number | null
): string | null {
  if (atId != null && String(atId).trim() !== '' && String(atId).trim() !== '-') {
    return getTjkHorseDetailUrl(atId);
  }

  if (!rawNameOrId || rawNameOrId.trim() === '' || rawNameOrId.trim() === '-') return null;
  const trimmed = rawNameOrId.trim();

  // If identifier is directly numeric AtId
  if (/^\d+$/.test(trimmed)) {
    return getTjkHorseDetailUrl(trimmed);
  }

  const cleanName = cleanHorseName(trimmed);
  if (!cleanName) return null;

  const base = getTjkRedirectBaseUrl();
  return `${base}/api/v1/tjk/redirect?name=${encodeURIComponent(cleanName)}`;
}
