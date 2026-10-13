'use client';

import { useMemo } from 'react';
import { FileText, Image as ImageIcon, Video } from 'lucide-react';
import type { PacienteMensagemAnexo } from '@/lib/pacienteMensagem/mensagemHtml';
import { sanitizeMensagemHtml } from '@/lib/pacienteMensagem/mensagemHtml';

type Props = {
  texto?: string;
  html?: string | null;
  anexos?: PacienteMensagemAnexo[];
  className?: string;
};

function AnexoIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <ImageIcon size={14} className="shrink-0" />;
  if (mime.startsWith('video/')) return <Video size={14} className="shrink-0" />;
  return <FileText size={14} className="shrink-0" />;
}

export default function MensagemHtmlBody({ texto, html, anexos, className = '' }: Props) {
  const safeHtml = useMemo(() => (html ? sanitizeMensagemHtml(html) : ''), [html]);

  return (
    <div className={className}>
      {safeHtml ? (
        <div
          className="prose prose-sm max-w-none text-gray-800 [&_img]:max-h-64 [&_img]:rounded-md [&_a]:text-blue-700"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />
      ) : (
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{texto || ''}</p>
      )}

      {anexos && anexos.length > 0 ? (
        <ul className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
          {anexos.map((a) => (
            <li key={a.id || a.url}>
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:underline"
              >
                <AnexoIcon mime={a.mimeType} />
                <span className="truncate">{a.name}</span>
              </a>
              {a.mimeType.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt={a.name} className="mt-1 max-h-40 rounded-md border border-gray-200" />
              ) : null}
              {a.mimeType.startsWith('video/') ? (
                <video src={a.url} controls className="mt-1 max-h-48 w-full rounded-md border border-gray-200" />
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
