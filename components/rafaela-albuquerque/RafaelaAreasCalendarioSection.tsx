'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Scale } from 'lucide-react';
import { BRAND } from '@/rafaela-albuquerque/siteConfig';
import { areasCalendario } from '@/rafaela-albuquerque/landingCopy';

const carrosselSlideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 36 : -36,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? -36 : 36,
    opacity: 0,
  }),
};

export default function RafaelaAreasCalendarioSection() {
  const [areaIndex, setAreaIndex] = useState(0);
  const [areaDir, setAreaDir] = useState(0);

  const n = areasCalendario.length;
  const atual = areasCalendario[areaIndex];

  const goArea = (next: number) => {
    if (next < 0 || next >= n) return;
    setAreaDir(next > areaIndex ? 1 : -1);
    setAreaIndex(next);
  };

  const accent = BRAND.primary;
  const soft = BRAND.primarySoft;
  const muted = BRAND.textMuted;
  const strong = BRAND.textStrong;
  const text = BRAND.text;
  const border = BRAND.border;

  const cellBase =
    'flex min-h-[72px] flex-col items-center justify-center border-r p-2 text-center transition-all sm:min-h-[88px] last:border-r-0';
  const cellBorder = { borderColor: `${border}` } as const;

  return (
    <div className="mx-auto w-full max-w-4xl">
        <div
          className="mb-8 overflow-hidden rounded-2xl border bg-white shadow-md"
          style={{ borderColor: border, boxShadow: '0 12px 40px -12px rgba(36, 95, 112, 0.12)' }}
        >
          <div
            className="flex items-center justify-between gap-3 border-b px-3 py-3 sm:px-5 sm:py-4"
            style={{ borderColor: border, backgroundColor: soft }}
          >
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border opacity-40"
              style={{ borderColor: border, color: muted }}
              disabled
              aria-hidden
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
              <Scale className="h-5 w-5 shrink-0" style={{ color: accent }} strokeWidth={1.75} aria-hidden />
              <div className="min-w-0 text-center">
                <p className="truncate text-sm font-bold sm:text-base" style={{ color: strong }}>
                  Áreas de atuação
                </p>
              </div>
            </div>
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border opacity-40"
              style={{ borderColor: border, color: muted }}
              disabled
              aria-hidden
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div
            className="grid grid-cols-3 border-b text-center text-[0.65rem] font-semibold uppercase tracking-wide sm:text-xs"
            style={{ borderColor: border, backgroundColor: `${soft}cc`, color: muted }}
          >
            {areasCalendario.map((a) => (
              <div key={a.key} className="border-r py-2 last:border-r-0" style={{ borderColor: border }}>
                {a.shortLabel}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-0 border-b p-2 sm:p-3" style={{ borderColor: border, backgroundColor: '#ffffff' }}>
            {areasCalendario.map((a, i) => {
              const sel = i === areaIndex;
              const num = String(i + 1).padStart(2, '0');
              return (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => goArea(i)}
                  className={`${cellBase} ${sel ? 'ring-1 ring-inset' : 'hover:bg-black/[0.02]'}`}
                  style={{
                    ...cellBorder,
                    ...(sel
                      ? {
                          backgroundColor: 'rgba(64, 153, 179, 0.12)',
                          boxShadow: `inset 0 0 0 1px ${accent}66`,
                        }
                      : {}),
                  }}
                  aria-label={`${a.slot} — ${a.title}`}
                  aria-current={sel ? 'step' : undefined}
                >
                  <span className="text-[0.65rem] font-medium uppercase" style={{ color: muted }}>
                    {a.slot}
                  </span>
                  <span
                    className="mt-1 text-xl font-bold tabular-nums sm:text-2xl"
                    style={{ color: sel ? accent : strong }}
                  >
                    {num}
                  </span>
                  <span
                    className="mt-1 line-clamp-2 max-w-full px-0.5 text-[0.65rem] font-medium leading-tight sm:text-xs"
                    style={{ color: text }}
                  >
                    {a.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm" style={{ color: muted }}>
          <span>
            Área{' '}
            <span className="font-semibold" style={{ color: accent }}>
              {areaIndex + 1}
            </span>
            {' / '}
            {n}
          </span>
          <span style={{ color: BRAND.textSoft }}>{atual.slot}</span>
        </div>

        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: border }}>
          <motion.div
            className="h-full rounded-full"
            style={{
              background: `linear-gradient(90deg, ${BRAND.heroBgVia}, ${accent})`,
            }}
            initial={false}
            animate={{ width: `${((areaIndex + 1) / n) * 100}%` }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-4">
          <button
            type="button"
            aria-label="Área anterior"
            disabled={areaIndex === 0}
            onClick={() => goArea(areaIndex - 1)}
            className="order-2 hidden min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors sm:order-none sm:flex sm:h-auto sm:w-12 sm:min-h-0 sm:flex-col sm:px-0 disabled:opacity-40"
            style={{ borderColor: border, backgroundColor: '#fff', color: accent }}
          >
            <ChevronLeft className="h-6 w-6 sm:mx-auto" />
            <span className="sm:sr-only">Área anterior</span>
          </button>

          <div
            className="order-1 min-h-0 flex-1 overflow-hidden rounded-2xl border bg-white shadow-md sm:order-none sm:min-h-[280px]"
            style={{ borderColor: border }}
          >
            <AnimatePresence initial={false} custom={areaDir} mode="wait">
              <motion.div
                key={areaIndex}
                custom={areaDir}
                variants={carrosselSlideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                className="h-full p-5 sm:p-8"
              >
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-xl border text-lg font-bold tabular-nums"
                    style={{ borderColor: `${accent}55`, backgroundColor: soft, color: accent }}
                  >
                    {String(areaIndex + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: accent }}>
                      {atual.slot}
                    </p>
                    <p className="text-lg font-bold sm:text-xl" style={{ color: strong }}>
                      {atual.title}
                    </p>
                  </div>
                </div>
                <p className="mb-2 text-sm font-semibold" style={{ color: accent }}>
                  Objetivo
                </p>
                <p className="mb-5 text-sm leading-relaxed sm:text-base" style={{ color: text }}>
                  {atual.objetivo}
                </p>
                <p className="mb-2 text-sm font-semibold" style={{ color: accent }}>
                  Em foco
                </p>
                <ul className="space-y-2">
                  {atual.detalhes.map((linha) => (
                    <li key={linha} className="flex gap-3 text-sm sm:text-base" style={{ color: text }}>
                      <Check className="mt-0.5 h-5 w-5 shrink-0" style={{ color: accent }} aria-hidden />
                      <span>{linha}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            type="button"
            aria-label="Próxima área"
            disabled={areaIndex >= n - 1}
            onClick={() => goArea(areaIndex + 1)}
            className="order-3 hidden min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors sm:flex sm:h-auto sm:w-12 sm:flex-col sm:px-0 sm:py-4 disabled:opacity-40"
            style={{
              borderColor: `${accent}55`,
              background: `linear-gradient(90deg, rgba(64,153,179,0.14), rgba(47,127,150,0.1))`,
              color: accent,
            }}
          >
            <ChevronRight className="h-6 w-6 sm:mx-auto" />
            <span className="sm:sr-only">Próxima área</span>
          </button>
        </div>

        <div className="mt-1 grid grid-cols-2 gap-3 sm:hidden">
          <button
            type="button"
            disabled={areaIndex === 0}
            onClick={() => goArea(areaIndex - 1)}
            className="min-h-[48px] rounded-xl border px-3 text-sm font-semibold disabled:opacity-40"
            style={{ borderColor: border, color: strong }}
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={areaIndex >= n - 1}
            onClick={() => goArea(areaIndex + 1)}
            className="min-h-[48px] rounded-xl border px-3 text-sm font-semibold disabled:opacity-40"
            style={{ borderColor: `${accent}55`, backgroundColor: soft, color: accent }}
          >
            Próxima
          </button>
        </div>
    </div>
  );
}
