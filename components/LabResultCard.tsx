'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { LabRange } from '@/types/labRanges';
import {
  getLabExamMeta,
  getLabOptimizationStatus,
  type OptimizationStatus,
  type ReferenceStatus,
} from '@/lib/labExames/labOptimization';
import type { BioTrendDir } from '@/utils/bioImpedanciaTrend';
import { BioImpedanciaTrendGlyph } from '@/components/bodymap/BioImpedanciaTrendGlyph';
import { LabRangeBar, type LabBarVisualStatus } from '@/components/LabRangeBar';
import { LabOptimizationBadge } from '@/components/LabOptimizationBadge';

export type LabResultCardProps = {
  name: string;
  value: number | null | undefined;
  unit?: string;
  examKey: string;
  range: LabRange;
  trendDir?: BioTrendDir;
  /** @deprecated Preferir onValueChange (modal ao clicar no valor). */
  valueControl?: ReactNode;
  /** Editar valor (metaadmin) — clique no número abre modal. */
  onValueChange?: (nextValue: number) => void;
  /** Passo do input no modal (padrão: 1 se inteiro, senão 0.1). */
  valueStep?: number;
  adjustDisabled?: boolean;
  /** Alertas ou notas abaixo das infos. */
  footer?: ReactNode;
  /** Conteúdo extra (ex.: TrendLine). No desktop fica à direita; no mobile abaixo. */
  children?: ReactNode;
  className?: string;
};

function resolveVisualStatus(
  refStatus: ReferenceStatus,
  optStatus: OptimizationStatus
): LabBarVisualStatus {
  if (refStatus === 'below_reference' || refStatus === 'above_reference') {
    return 'attention';
  }
  if (optStatus === 'ideal') return 'ideal';
  if (
    optStatus === 'above_ideal' ||
    optStatus === 'below_ideal' ||
    optStatus === 'normal_but_not_ideal'
  ) {
    return 'optimize';
  }
  return 'neutral';
}

function formatDisplayValue(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const n = Number(value);
  if (Number.isInteger(n)) return String(n);
  const fixed = n.toFixed(1);
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
}

function resolveStep(value: number | null, valueStep?: number): number {
  if (valueStep != null && Number.isFinite(valueStep) && valueStep > 0) return valueStep;
  if (value == null) return 0.1;
  return Number.isInteger(value) ? 1 : 0.1;
}

/**
 * Apresentação visual de um exame laboratorial.
 * Não contém regras clínicas novas — reutiliza status/badge existentes.
 */
export function LabResultCard({
  name,
  value,
  unit,
  examKey,
  range,
  trendDir = 'none',
  valueControl,
  onValueChange,
  valueStep,
  adjustDisabled = false,
  footer,
  children,
  className = '',
}: LabResultCardProps) {
  const numericValue =
    value == null || Number.isNaN(Number(value)) ? null : Number(value);

  const meta = getLabExamMeta(examKey);
  const optResult = getLabOptimizationStatus({ value: numericValue, range, meta });
  const visualStatus = resolveVisualStatus(
    optResult.referenceStatus,
    optResult.optimizationStatus
  );

  const referenceText = `Referência: ${range.min}–${range.max}${range.unit ? ` ${range.unit}` : ''}`;
  const step = resolveStep(numericValue, valueStep);
  const canEdit = typeof onValueChange === 'function' && !adjustDisabled;

  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!editOpen) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [editOpen]);

  const openEdit = () => {
    if (!canEdit) return;
    setDraft(numericValue != null ? String(numericValue) : '');
    setEditOpen(true);
  };

  const saveEdit = () => {
    if (!canEdit) return;
    const parsed = parseFloat(draft.replace(',', '.'));
    if (!Number.isFinite(parsed)) return;
    onValueChange(parsed);
    setEditOpen(false);
  };

  const valueRow = (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0">
      {canEdit ? (
        <button
          type="button"
          onClick={openEdit}
          className="rounded-md px-0.5 text-left text-[1.2rem] font-bold leading-none tabular-nums tracking-tight text-[color:var(--text-primary)] underline-offset-2 hover:underline sm:text-[1.35rem]"
          title="Toque para alterar o valor"
        >
          {formatDisplayValue(numericValue)}
        </button>
      ) : (
        <span className="text-[1.2rem] font-bold leading-none tabular-nums tracking-tight text-[color:var(--text-primary)] sm:text-[1.35rem]">
          {formatDisplayValue(numericValue)}
        </span>
      )}
      {unit ? (
        <span className="whitespace-nowrap text-[11px] font-medium text-slate-500 sm:text-xs">
          {unit}
        </span>
      ) : null}
      <span className="inline-flex shrink-0 scale-90 self-center">
        <BioImpedanciaTrendGlyph dir={trendDir} />
      </span>
    </div>
  );

  const nameLabel = (
    <p className="text-[11px] font-semibold leading-tight text-slate-600 sm:text-xs">{name}</p>
  );

  const bar = (
    <LabRangeBar range={range} value={numericValue} status={visualStatus} height={12} />
  );

  const infoBlock = (
    <div className="min-w-0 space-y-1">
      {/* Mobile: valor e barra na mesma linha */}
      <div className="grid min-w-0 grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] items-center gap-2 lg:hidden">
        <div className="min-w-0 space-y-0.5">
          {nameLabel}
          {valueRow}
        </div>
        <div className="min-w-0 w-full">{bar}</div>
      </div>

      {/* Desktop: nome/valor empilhados; barra vai depois do badge */}
      <div className="hidden min-w-0 space-y-0.5 lg:block">
        {nameLabel}
        {valueRow}
      </div>

      {!onValueChange && valueControl ? (
        <div className="min-w-0 pt-0.5">{valueControl}</div>
      ) : null}

      <p className="text-[11px] leading-snug text-slate-500">{referenceText}</p>
      <div className="[&>div]:mt-0 [&>div]:gap-1 [&_span]:text-[10px]">
        <LabOptimizationBadge examKey={examKey} value={numericValue} range={range} />
      </div>
      {footer ? <div className="min-w-0">{footer}</div> : null}

      <div className="hidden min-w-0 w-full pt-1 lg:block">{bar}</div>
    </div>
  );

  return (
    <div
      className={`min-w-0 rounded-[16px] border border-[color:var(--border-default)] bg-[color:var(--surface-card)] shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${className}`}
    >
      <div
        className={`min-w-0 overflow-visible p-3 sm:p-3.5 ${
          children
            ? 'grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:items-center lg:gap-4'
            : ''
        }`}
      >
        {infoBlock}

        {children ? (
          <div className="min-w-0 w-full border-t border-[color:var(--border-default)] pt-2 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
            {children}
          </div>
        ) : null}
      </div>

      {editOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={() => setEditOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-[color:var(--border-default)] bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id={titleId} className="text-base font-semibold text-slate-900">
              Alterar valor
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">{name}</p>
            <label className="mt-4 block text-xs font-medium text-slate-600">
              Novo valor{unit ? ` (${unit})` : ''}
              <input
                ref={inputRef}
                type="number"
                step={step}
                inputMode="decimal"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    saveEdit();
                  }
                  if (e.key === 'Escape') setEditOpen(false);
                }}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-lg font-semibold tabular-nums text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              />
            </label>
            <p className="mt-1.5 text-[11px] text-slate-400">{referenceText}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="flex-1 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Iniciais para fallback de avatar (sem foto). */
export function labPatientInitials(name: string): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Pill compacto de score geral (header). */
export function LabCompactScore({
  score,
  className = '',
}: {
  score: number;
  className?: string;
}) {
  const scoreColor =
    score >= 80
      ? 'var(--state-success)'
      : score >= 60
        ? 'var(--state-warning)'
        : 'var(--state-danger)';

  return (
    <div
      className={`shrink-0 rounded-xl border border-[color:var(--border-default)] bg-white px-3 py-1.5 text-right shadow-[0_1px_2px_rgba(0,0,0,0.03)] ${className}`}
    >
      <p className="text-[10px] font-medium leading-none text-slate-500">Score geral</p>
      <p className="mt-0.5 text-lg font-bold leading-tight tabular-nums" style={{ color: scoreColor }}>
        {score}%
      </p>
    </div>
  );
}

/** Legenda discreta dos estados já existentes no sistema. */
export function LabStatusLegend({ className = '' }: { className?: string }) {
  return (
    <div
      className={`grid grid-cols-1 gap-2 rounded-[16px] border border-[color:var(--border-default)] bg-[color:var(--surface-card)] px-3 py-2.5 text-[11px] sm:grid-cols-3 ${className}`}
    >
      <div className="flex items-start gap-2 min-w-0">
        <span
          className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
          style={{ background: 'var(--state-success)' }}
        >
          ✓
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-[color:var(--text-primary)]">Ideal</p>
          <p className="text-[color:var(--text-secondary)]">Dentro do ideal Oftware</p>
        </div>
      </div>
      <div className="flex items-start gap-2 min-w-0">
        <span
          className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
          style={{ background: 'var(--state-warning)' }}
        >
          ~
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-[color:var(--text-primary)]">Otimizar</p>
          <p className="text-[color:var(--text-secondary)]">Atenção para melhoria</p>
        </div>
      </div>
      <div className="flex items-start gap-2 min-w-0">
        <span
          className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
          style={{ background: 'var(--state-danger)' }}
        >
          !
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-[color:var(--text-primary)]">Atenção</p>
          <p className="text-[color:var(--text-secondary)]">Fora do ideal ou referência</p>
        </div>
      </div>
    </div>
  );
}

/** Header compacto do paciente (foto real via prop; fallback iniciais). */
export function LabPatientHeaderCard({
  patientName,
  dateLabel,
  score,
  patientPhotoUrl,
  className = '',
}: {
  patientName: string;
  dateLabel?: string | null;
  score?: number | null;
  /** URL já resolvida (Firebase Auth photoURL). Não buscar dentro do componente. */
  patientPhotoUrl?: string | null;
  className?: string;
}) {
  const initials = labPatientInitials(patientName);
  const photo = patientPhotoUrl?.trim() || null;

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-[18px] border border-[color:var(--border-default)] bg-[color:var(--surface-card)] px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:px-4 sm:py-3 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            className="h-[52px] w-[52px] shrink-0 rounded-full border border-white object-cover shadow-[0_1px_3px_rgba(0,0,0,0.08)] sm:h-16 sm:w-16 lg:h-[72px] lg:w-[72px]"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-sm font-semibold text-[color:var(--brand-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:h-16 sm:w-16 sm:text-base lg:h-[72px] lg:w-[72px]"
            aria-hidden
          >
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Paciente</p>
          <p className="truncate text-base font-semibold text-[color:var(--text-primary)] sm:text-lg">
            {patientName}
          </p>
          {dateLabel ? (
            <p className="mt-0.5 truncate text-sm text-slate-500">{dateLabel}</p>
          ) : null}
        </div>
      </div>
      {score != null ? <LabCompactScore score={score} /> : null}
    </div>
  );
}
