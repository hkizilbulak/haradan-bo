'use client';

import { useEffect, useRef, useState } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import type { RichTextEditorProps } from './RichTextEditor';

const EDITOR_CONFIG = {
  toolbar: {
    items: [
      'undo',
      'redo',
      '|',
      'heading',
      '|',
      'bold',
      'italic',
      'link',
      'bulletedList',
      'numberedList',
      'blockQuote',
    ],
  },
  heading: {
    options: [
      { model: 'paragraph', title: 'Paragraf', class: 'ck-heading_paragraph' },
      { model: 'heading2', view: 'h2', title: 'Başlık 2', class: 'ck-heading_heading2' },
      { model: 'heading3', view: 'h3', title: 'Başlık 3', class: 'ck-heading_heading3' },
      { model: 'heading4', view: 'h4', title: 'Başlık 4', class: 'ck-heading_heading4' },
    ],
  },
  removePlugins: [
    'CKFinder',
    'CKFinderUploadAdapter',
    'EasyImage',
    'Image',
    'ImageCaption',
    'ImageStyle',
    'ImageToolbar',
    'ImageUpload',
    'MediaEmbed',
  ],
  link: {
    addTargetToExternalLinks: true,
    defaultProtocol: 'https://',
  },
};

type InnerProps = RichTextEditorProps;

export default function RichTextEditorInner({
  value,
  onChange,
  disabled,
  minHeight = 180,
}: InnerProps) {
  const [mounted, setMounted] = useState(false);
  const lastEmitted = useRef(value);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="border rounded p-3 text-muted small" style={{ minHeight }}>
        Editör yükleniyor…
      </div>
    );
  }

  return (
    <div className="ckeditor-wrapper" style={{ ['--ck-min-height' as string]: `${minHeight}px` }}>
      <CKEditor
        // Classic build default export is untyped; same cast pattern as Kartezya FaqModal.
        editor={ClassicEditor as any}
        data={value ?? ''}
        disabled={disabled}
        config={EDITOR_CONFIG as any}
        onChange={(_event: unknown, editor: { getData: () => string }) => {
          const data = editor.getData();
          lastEmitted.current = data;
          onChange(data);
        }}
        onBlur={(_event: unknown, editor: { getData: () => string }) => {
          const data = editor.getData();
          if (data !== lastEmitted.current) {
            lastEmitted.current = data;
            onChange(data);
          }
        }}
      />
    </div>
  );
}
