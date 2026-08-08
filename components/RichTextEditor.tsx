'use client';

import dynamic from 'next/dynamic';
import { sanitizeRichHtml } from '@/helpers/sanitizeHtml';

export type RichTextEditorProps = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  minHeight?: number;
};

/**
 * Client-only CKEditor Classic (same family as Kartezya FAQ).
 * Image/media upload plugins are disabled — no arbitrary external/base64 images.
 * Output is sanitized before onChange (defense in depth with SafeRichText + BE).
 */
const RichTextEditorInner = dynamic(
  () => import('./RichTextEditorInner'),
  {
    ssr: false,
    loading: () => (
      <div className="border rounded p-3 text-muted small" style={{ minHeight: 160 }}>
        Editör yükleniyor…
      </div>
    ),
  },
);

export default function RichTextEditor(props: RichTextEditorProps) {
  return (
    <RichTextEditorInner
      {...props}
      onChange={(html) => props.onChange(sanitizeRichHtml(html))}
    />
  );
}
