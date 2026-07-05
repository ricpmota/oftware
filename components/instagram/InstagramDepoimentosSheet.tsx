'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, ChevronLeft, ChevronRight, MessageSquareQuote, Star, X } from 'lucide-react';
import type { InstagramDepoimentoItem } from '@/components/instagram/instagramDepoimentosTypes';
import InstagramDepoimentoResultadoSheet from '@/components/instagram/InstagramDepoimentoResultadoSheet';

type Props = {
  depoimentos: InstagramDepoimentoItem[];
  open: boolean;
  onClose: () => void;
};

export default function InstagramDepoimentosSheet({ depoimentos, open, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState(0);
  const [chartDepoimento, setChartDepoimento] = useState<InstagramDepoimentoItem | null>(null);

  useEffect(() => {
    if (!open) return;
    setOffset(0);
    setChartDepoimento(null);
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (chartDepoimento) {
          setChartDepoimento(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, chartDepoimento]);

  const maxOffset = Math.max(0, depoimentos.length - 1);
  const current = depoimentos[offset] ?? null;
  const podeAnterior = offset > 0;
  const podeProximo = offset < maxOffset;

  return (
    <>
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Fechar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-[#020610]/75 backdrop-blur-sm"
              onClick={onClose}
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="instagram-depoimentos-title"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              className="fixed inset-x-3 bottom-3 z-50 mx-auto max-h-[min(88dvh,680px)] max-w-[420px] overflow-hidden rounded-2xl border border-white/15 bg-[#0a1428]/95 backdrop-blur-xl ring-2 ring-amber-400/25 shadow-[0_0_60px_rgba(251,191,36,0.1)] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2"
            >
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-500/15 blur-2xl opacity-60" />

              <div className="relative flex max-h-[min(88dvh,680px)] flex-col p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                      <MessageSquareQuote className="h-4 w-4" aria-hidden />
                    </span>
                    <h2 id="instagram-depoimentos-title" className="text-base font-semibold leading-snug text-white">
                      Depoimentos
                    </h2>
                  </div>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={onClose}
                    aria-label="Fechar"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>

                <p className="mb-4 text-[13px] leading-relaxed text-slate-300/95">
                  Histórias reais de pacientes que concluíram o tratamento.
                </p>

                {current ? (
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-snug text-white">{current.nome}</p>
                        {[current.cidadeEstado, current.idade != null ? `${current.idade} anos` : null]
                          .filter(Boolean)
                          .join(' · ') ? (
                          <p className="mt-0.5 text-xs text-slate-400">
                            {[current.cidadeEstado, current.idade != null ? `${current.idade} anos` : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <div className="flex items-center gap-0.5" aria-hidden>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={14}
                              className={
                                s <= (current.estrelas ?? 0)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-white/20'
                              }
                            />
                          ))}
                        </div>
                        {current.evolucao.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setChartDepoimento(current)}
                            className="inline-flex items-center gap-1 rounded-md bg-pink-500 px-2 py-0.5 text-[11px] font-medium leading-none text-white shadow-sm transition-colors hover:bg-pink-600"
                          >
                            <BarChart3 className="h-3 w-3 shrink-0" strokeWidth={2.25} />
                            Gráfico
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <blockquote className="whitespace-pre-wrap break-words border-l-2 border-emerald-400/70 pl-3 text-[13px] leading-relaxed text-slate-200/95 sm:text-sm">
                      {current.depoimento}
                    </blockquote>
                  </div>
                ) : null}

                {depoimentos.length > 1 ? (
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-white/10 pt-4">
                    <button
                      type="button"
                      disabled={!podeAnterior}
                      onClick={() => setOffset((o) => Math.max(0, o - 1))}
                      className={`rounded-full p-2 transition-colors ${
                        podeAnterior
                          ? 'bg-white/10 text-white hover:bg-white/15'
                          : 'cursor-not-allowed bg-white/5 text-white/25'
                      }`}
                      aria-label="Depoimento anterior"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="text-xs text-slate-400">
                      {offset + 1} de {depoimentos.length}
                    </span>
                    <button
                      type="button"
                      disabled={!podeProximo}
                      onClick={() => setOffset((o) => Math.min(maxOffset, o + 1))}
                      className={`rounded-full p-2 transition-colors ${
                        podeProximo
                          ? 'bg-white/10 text-white hover:bg-white/15'
                          : 'cursor-not-allowed bg-white/5 text-white/25'
                      }`}
                      aria-label="Próximo depoimento"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <InstagramDepoimentoResultadoSheet
        depoimento={chartDepoimento}
        onClose={() => setChartDepoimento(null)}
      />
    </>
  );
}
