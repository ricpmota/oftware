'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { EvolucaoTratamentoChart } from '@/components/EvolucaoTratamentoChart';
import type { InstagramDepoimentoItem } from '@/components/instagram/instagramDepoimentosTypes';

type Props = {
  depoimento: InstagramDepoimentoItem | null;
  onClose: () => void;
};

export default function InstagramDepoimentoResultadoSheet({ depoimento, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!depoimento) return;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [depoimento]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const d = depoimento;
  const metaLinha = d
    ? [d.cidadeEstado, d.idade != null ? `${d.idade} anos` : null].filter(Boolean).join(' · ')
    : '';

  return (
    <AnimatePresence>
      {d ? (
        <>
          <motion.button
            type="button"
            aria-label="Fechar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-[#020610]/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="instagram-depoimento-resultado-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-h-[min(90dvh,720px)] max-w-[420px] overflow-hidden rounded-2xl border border-white/15 bg-[#0a1428]/98 backdrop-blur-xl ring-2 ring-emerald-400/30 shadow-[0_0_60px_rgba(74,222,128,0.12)] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2"
          >
            <div className="flex max-h-[min(90dvh,720px)] flex-col">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
                <h2 id="instagram-depoimento-resultado-title" className="text-base font-semibold text-white">
                  Resultado do tratamento
                </h2>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                <p className="mb-4 text-sm text-slate-300/90">
                  {d.nome}
                  {metaLinha ? ` · ${metaLinha}` : ''}
                </p>

                <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                  <MetricCard label="Peso inicial" value={formatKg(d.pesoInicialKg)} />
                  <MetricCard label="Peso atual" value={formatKg(d.pesoAtualKg)} />
                  <MetricCard label="Perda total (kg)" value={formatPerdaKg(d.perdaTotalKg)} />
                  <MetricCard label="Perda percentual" value={formatPerdaPct(d.perdaPercentual)} />
                  <MetricCard label="Perda abdominal (cm)" value={formatPerdaCm(d.perdaAbdominalCm)} variant="blue" />
                  <MetricCard label="Perda percentual (cm)" value={formatPerdaPct(d.perdaPercentualAbdominal)} variant="blue" />
                </div>

                {d.evolucao.length > 0 ? (
                  <div className="rounded-xl border border-[#d1d5db] bg-[#E8EDED] p-3 sm:p-4">
                    <EvolucaoTratamentoChart
                      evolucao={d.evolucao}
                      pacienteId={d.pacienteId}
                      invertedModal
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function MetricCard({
  label,
  value,
  variant = 'green',
}: {
  label: string;
  value: string;
  variant?: 'green' | 'blue';
}) {
  const styles =
    variant === 'blue'
      ? 'border-[#2F8FA3]/35 bg-[#2F8FA3]/15'
      : 'border-[#4CCB7A]/30 bg-[#4CCB7A]/10';
  const labelClass = variant === 'blue' ? 'text-[#7BD7EA]' : 'text-[#4CCB7A]';

  return (
    <div className={`rounded-lg border p-3 ${styles}`}>
      <p className={`text-xs font-medium ${labelClass}`}>{label}</p>
      <p className="text-lg font-semibold text-[#E8EDED]">{value}</p>
    </div>
  );
}

function formatKg(v: number | null) {
  return v != null ? `${v.toFixed(1)} kg` : '—';
}

function formatPerdaKg(v: number | null) {
  return v != null ? `-${v.toFixed(1)} kg` : '—';
}

function formatPerdaPct(v: number | null) {
  return v != null ? `-${v.toFixed(1)}%` : '—';
}

function formatPerdaCm(v: number | null) {
  return v != null ? `-${v.toFixed(1)} cm` : '—';
}
