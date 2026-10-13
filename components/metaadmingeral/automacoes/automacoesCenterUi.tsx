'use client';

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Info } from 'lucide-react';

export const AUTOMACOES_CANAIS = ['WhatsApp', 'E-mail', 'Push', 'SMS', 'Voz IA'] as const;

export type AutomacoesCanal = (typeof AUTOMACOES_CANAIS)[number];

export function AutomacoesConstructionBanner() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
      <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-300" />
      <p>
        <strong className="font-semibold text-amber-50">Centro de Automações</strong> da plataforma.
        As automações de <strong className="font-semibold text-amber-50">WhatsApp</strong> da jornada
        do paciente já disparam de verdade a partir daqui (catálogo, templates, liberações e ativações
        são reais). Os canais Push, SMS e Voz IA seguem no roadmap.
      </p>
    </div>
  );
}

export function AutomacoesPageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-[#E8EDED]">{title}</h2>
      <p className="mt-1 text-sm text-[#E8EDED]/60">{subtitle}</p>
    </div>
  );
}

export function AutomacoesSummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  onClick,
  active,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  onClick?: () => void;
  active?: boolean;
}) {
  const interactive = Boolean(onClick);

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`rounded-2xl border p-5 transition ${
        active
          ? 'border-[#4CCB7A]/45 bg-[#4CCB7A]/10 ring-1 ring-[#4CCB7A]/25'
          : 'border-white/10 bg-white/5'
      } ${interactive ? 'cursor-pointer hover:border-[#4CCB7A]/35 hover:bg-white/[0.07]' : ''}`}
    >
      <div className="flex items-center gap-2 text-[#E8EDED]/60">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-[#E8EDED]">{value}</p>
      {hint ? <p className="mt-1 text-sm text-[#E8EDED]/60">{hint}</p> : null}
    </div>
  );
}

export function AutomacoesInfoNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-[#E8EDED]/75">
      <Info className="h-4 w-4 shrink-0 mt-0.5 text-[#4CCB7A]" />
      <div>{children}</div>
    </div>
  );
}

export function AutomacoesStatusBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'success' | 'warn' | 'neutral' | 'muted';
}) {
  const className =
    tone === 'success'
      ? 'bg-[#4CCB7A]/15 text-[#4CCB7A]'
      : tone === 'warn'
        ? 'bg-amber-500/15 text-amber-300'
        : tone === 'muted'
          ? 'bg-white/5 text-[#E8EDED]/50'
          : 'bg-sky-500/15 text-sky-300';

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export function AutomacoesChannelBadge({ channel }: { channel: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-[#E8EDED]/80">
      {channel}
    </span>
  );
}

export function AutomacoesPlaceholderTable({
  title,
  headers,
  rows,
  onRowClick,
}: {
  title?: string;
  headers: string[];
  rows: ReactNode[][];
  onRowClick?: (rowIndex: number) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      {title ? (
        <div className="border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-semibold text-[#E8EDED]">{title}</h3>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-[#E8EDED]/50">
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 font-medium whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                onClick={onRowClick ? () => onRowClick(rowIndex) : undefined}
                className={`border-b border-white/5 last:border-0 hover:bg-white/[0.02] ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 text-[#E8EDED]/85 align-middle">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AutomacoesCanaisFuturosStrip() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/45">Canais futuros:</span>
      {AUTOMACOES_CANAIS.map((canal) => (
        <AutomacoesChannelBadge key={canal} channel={canal} />
      ))}
    </div>
  );
}
