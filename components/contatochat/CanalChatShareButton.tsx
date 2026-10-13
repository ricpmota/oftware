'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, MessageCircle, Share2 } from 'lucide-react';
import { buildContatoChatPublicUrl } from '@/lib/contatochat/contatoChatPublicPath';
import {
  CANAL_CHAT_LINK_DESCRIPTION,
  CANAL_CHAT_LINK_TITLE,
} from '@/lib/contatochat/contatoChatMetadata';
import { gerarSlugDrMedico } from '@/utils/medicoDrSlug';

type Props = {
  medicoId: string;
  medicoNome: string;
};

export default function CanalChatShareButton({ medicoId, medicoNome }: Props) {
  const url = useMemo(
    () =>
      buildContatoChatPublicUrl({
        medicoId,
        slug: gerarSlugDrMedico(medicoNome || ''),
      }),
    [medicoId, medicoNome],
  );
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || dialogRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setCoords({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    }
    setOpen(true);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function nativeShare() {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: CANAL_CHAT_LINK_TITLE,
          text: CANAL_CHAT_LINK_DESCRIPTION,
          url,
        });
        setOpen(false);
        return;
      } catch {
        /* cancelado */
      }
    }
    await copyLink();
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    `${CANAL_CHAT_LINK_TITLE}\n${CANAL_CHAT_LINK_DESCRIPTION}\n${url}`,
  )}`;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <MessageCircle size={14} />
        Canal Chat
      </button>

      {open && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={dialogRef}
              role="dialog"
              className="w-[min(calc(100vw-2rem),320px)] rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
              style={{ position: 'fixed', top: coords.top, right: coords.right, zIndex: 80 }}
            >
              <p className="text-sm font-semibold text-gray-900">Compartilhar Canal Chat</p>
              <p className="mt-1 text-[12px] leading-relaxed text-gray-500">
                Envie este link aos pacientes para salvarem o contato de notificações no celular.
              </p>
              <p className="mt-2 truncate rounded-lg bg-gray-50 px-2.5 py-1.5 text-[11px] text-gray-600">
                {url}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => void copyLink()}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                >
                  {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  {copied ? 'Copiado' : 'Copiar link'}
                </button>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
                >
                  <MessageCircle size={13} />
                  WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => void nativeShare()}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <Share2 size={13} />
                  Compartilhar
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
