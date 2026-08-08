'use client';

import { looksLikeHtml, sanitizeRichHtml } from '@/helpers/sanitizeHtml';

type Props = {
  value?: string | null;
  className?: string;
  as?: 'div' | 'span';
};

/**
 * Renders rich or legacy plain text safely.
 * Never passes raw API HTML to the DOM — only sanitizer output.
 */
export default function SafeRichText({ value, className, as = 'div' }: Props) {
  const raw = value ?? '';
  if (!raw.trim()) {
    return null;
  }

  if (!looksLikeHtml(raw)) {
    const Tag = as;
    return <Tag className={className}>{raw}</Tag>;
  }

  const safe = sanitizeRichHtml(raw);
  if (!safe) {
    return null;
  }

  const Tag = as;
  return (
    <Tag
      className={className ? `${className} rich-text-content` : 'rich-text-content'}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
