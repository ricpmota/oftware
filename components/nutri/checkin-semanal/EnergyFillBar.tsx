'use client';

import { useCallback, useRef } from 'react';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

const STOPS = [
  { at: 0, label: 'Esgotado' },
  { at: 25, label: 'Baixa' },
  { at: 50, label: 'Regular' },
  { at: 75, label: 'Boa' },
  { at: 100, label: 'Alta' },
] as const;

export function energyFillLabel(pct: number): string {
  if (pct <= 20) return 'Esgotado';
  if (pct <= 40) return 'Baixa';
  if (pct <= 60) return 'Regular';
  if (pct <= 80) return 'Boa';
  return 'Alta';
}

function parsePct(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return null;
  if (n >= 0 && n <= 100) return n;
  if (n >= 1 && n <= 5) return n * 20;
  return null;
}

export function EnergyFillBar({ value, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pct = parsePct(value);
  const unanswered = pct == null;
  const fill = unanswered ? 50 : pct;

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = rect.width <= 0 ? 0 : (clientX - rect.left) / rect.width;
      const next = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
      onChange(String(next));
    },
    [onChange]
  );

  return (
    <div className="mt-6">
      <p className="text-center text-3xl font-bold tracking-tight text-slate-900">
        {unanswered ? '—' : energyFillLabel(pct)}
      </p>
      <p className="mt-1 text-center text-sm font-medium text-slate-500">
        {unanswered ? 'Deslize o marcador com o dedo' : `${pct}%`}
      </p>
      {unanswered ? (
        <p className="mt-1 text-center text-xs text-slate-400">
          Esquerda = esgotado · Direita = muita energia
        </p>
      ) : null}

      <div className="mt-7 px-1">
        <div
          ref={trackRef}
          role="slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct ?? undefined}
          aria-valuetext={unanswered ? 'Não informado' : energyFillLabel(pct)}
          aria-label="Energia da semana. Deslize o marcador com o dedo."
          tabIndex={0}
          className="relative flex h-11 cursor-pointer touch-none select-none items-center"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            setFromClientX(event.clientX);
          }}
          onPointerMove={(event) => {
            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
            setFromClientX(event.clientX);
          }}
          onKeyDown={(event) => {
            const current = pct ?? 50;
            if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
              event.preventDefault();
              onChange(String(Math.min(100, current + 5)));
            }
            if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
              event.preventDefault();
              onChange(String(Math.max(0, current - 5)));
            }
          }}
        >
          <div className="absolute inset-x-0 h-2 rounded-full bg-slate-200" />
          <div
            className={`absolute left-0 h-2 rounded-full bg-gradient-to-r from-rose-400 via-amber-400 to-emerald-500 ${
              unanswered ? 'opacity-35' : ''
            }`}
            style={{ width: `${fill}%` }}
          />
          <div
            className={`absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md ${
              unanswered ? 'bg-slate-400' : 'bg-slate-900'
            }`}
            style={{ left: `${fill}%` }}
          />
        </div>

        <div className="mt-2 flex justify-between text-[11px] font-medium text-slate-400">
          {STOPS.map((stop) => (
            <span key={stop.at}>{stop.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
