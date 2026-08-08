import sanitizeHtmlLib from 'sanitize-html';

/** Tags allowed in BO/admin rich-text fields (package description, campaign email fallback). */
export const RICH_TEXT_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'ul',
  'ol',
  'li',
  'a',
  'blockquote',
  'h2',
  'h3',
  'h4',
] as const;

const ALLOWED_SCHEMES = ['http', 'https', 'mailto'] as const;

function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) {
    return false;
  }
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('vbscript:')) {
    return false;
  }
  if (lower.startsWith('#') || lower.startsWith('/')) {
    return true;
  }
  return ALLOWED_SCHEMES.some((scheme) => lower.startsWith(`${scheme}:`));
}

/**
 * Sanitize rich HTML for storage/render.
 * Plain text without tags is returned trimmed (backward compatible).
 */
export function sanitizeRichHtml(input: string | null | undefined): string {
  if (input == null) {
    return '';
  }
  const raw = String(input);
  if (!raw.trim()) {
    return '';
  }

  // Fast path: no angle brackets → treat as plain text (legacy package descriptions).
  if (!/[<>]/.test(raw)) {
    return raw.trim();
  }

  return sanitizeHtmlLib(raw, {
    allowedTags: [...RICH_TEXT_ALLOWED_TAGS],
    allowedAttributes: {
      a: ['href', 'target', 'rel', 'title'],
    },
    allowedSchemes: [...ALLOWED_SCHEMES],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href ?? '';
        if (!isSafeHref(href)) {
          return { tagName: 'span', attribs: {} };
        }
        const next: Record<string, string> = {
          href: href.trim(),
        };
        if (attribs.title) {
          next.title = attribs.title;
        }
        if (attribs.target === '_blank') {
          next.target = '_blank';
          next.rel = 'noopener noreferrer';
        }
        return { tagName, attribs: next };
      },
    },
  }).trim();
}

/** True when value looks like HTML markup (vs legacy plain text). */
export function looksLikeHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}
