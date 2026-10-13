'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, MessageSquareQuote } from 'lucide-react';
import InstagramDepoimentosSheet from '@/components/instagram/InstagramDepoimentosSheet';
import type { InstagramDepoimentoItem } from '@/components/instagram/instagramDepoimentosTypes';

type Props = {
  medicoId: string;
  accentColor: string;
  /** Texto sobre o destaque fora do Método. Ausente mantém o navy atual. */
  accentTextColor?: string;
  pageBg: string;
  /** Botão compacto (cabeçalho do relatório). */
  variant?: 'card' | 'headerButton';
};

export default function PublicDoctorDepoimentos({
  medicoId,
  accentColor,
  accentTextColor,
  pageBg,
  variant = 'card',
}: Props) {
  const textStyle = accentTextColor ? { color: accentTextColor } : undefined;
  const mutedTextStyle = accentTextColor ? { color: accentTextColor, opacity: 0.7 } : undefined;
  const [depoimentos, setDepoimentos] = useState<InstagramDepoimentoItem[]>([]);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/depoimentos-medico?medicoId=${encodeURIComponent(medicoId)}`)
      .then((res) => (res.ok ? res.json() : { depoimentos: [] }))
      .then((data: { depoimentos?: InstagramDepoimentoItem[] }) => {
        if (!cancelled) setDepoimentos(data.depoimentos || []);
      })
      .catch(() => {
        if (!cancelled) setDepoimentos([]);
      });
    return () => {
      cancelled = true;
    };
  }, [medicoId]);

  if (variant !== 'headerButton' && depoimentos.length === 0) return null;

  const countLabel =
    depoimentos.length === 1
      ? 'História real de paciente que concluiu o tratamento'
      : `${depoimentos.length} histórias reais de pacientes que concluíram o tratamento`;

  return (
    <>
      {variant === 'headerButton' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label="Ver depoimentos do médico"
          className="inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-bold text-[#0A1F44] shadow-sm transition hover:opacity-95 sm:flex-none sm:px-3 sm:text-sm"
          style={{ backgroundColor: accentColor, ...textStyle }}
        >
          <MessageSquareQuote className="h-4 w-4 shrink-0" aria-hidden />
          Depoimentos
        </button>
      ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Depoimentos. Toque para ver histórias de pacientes."
        className="drprov-rise drprov-cta-shimmer group w-full overflow-hidden rounded-2xl px-4 py-4 text-left shadow-sm transition active:scale-[0.99] sm:px-5"
        style={{ backgroundColor: accentColor }}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: pageBg, color: accentColor }}
          >
            <MessageSquareQuote className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-bold tracking-tight text-[#0A1F44]" style={textStyle}>
              Depoimentos
            </span>
            <span className="mt-0.5 block text-[13px] leading-snug text-[#0A1F44]/70" style={mutedTextStyle}>
              {countLabel}
            </span>
          </span>
          <ChevronRight
            className="h-5 w-5 shrink-0 text-[#0A1F44]/70 transition group-hover:translate-x-0.5"
            style={mutedTextStyle}
            aria-hidden
          />
        </div>
      </button>
      )}

      {mounted
        ? createPortal(
            <div className="relative z-[80]">
              <InstagramDepoimentosSheet
                depoimentos={depoimentos}
                open={open}
                onClose={() => setOpen(false)}
                hidePatientName
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
