'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { PacienteCompleto } from '@/types/obesidade';
import { buildPatientDetailsMobileMetrics } from '@/lib/paciente/patientDetailsMobileMetrics';

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function useCountUp(
  target: number | null | undefined,
  replayKey: string,
  durationMs = 1100
): number | null {
  const [display, setDisplay] = useState<number | null>(null);
  const animatingRef = useRef(false);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (!replayKey) {
      setDisplay(null);
      animatingRef.current = false;
      return;
    }
    const to = targetRef.current;
    if (to == null || !Number.isFinite(to)) {
      setDisplay(null);
      return;
    }
    animatingRef.current = true;
    setDisplay(0);
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const latest = targetRef.current;
      const end = latest != null && Number.isFinite(latest) ? latest : to;
      const t = Math.min(1, (now - start) / durationMs);
      setDisplay(end * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(tick);
      else {
        animatingRef.current = false;
        setDisplay(end);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      animatingRef.current = false;
    };
  }, [replayKey, durationMs]);

  useEffect(() => {
    if (animatingRef.current) return;
    if (target == null || !Number.isFinite(target)) {
      setDisplay(null);
      return;
    }
    setDisplay(target);
  }, [target]);

  return display;
}

function calcularPosicaoMarcador(imc: number | null | undefined): number {
  if (!imc || imc === 0) return 0;
  if (imc < 18.5) return (imc / 18.5) * 25;
  if (imc < 25) return 25 + ((imc - 18.5) / (25 - 18.5)) * 25;
  if (imc < 30) return 50 + ((imc - 25) / (30 - 25)) * 25;
  return 75 + Math.min(((imc - 30) / 20) * 25, 25);
}

function imcMarkerColor(imc: number | null): string {
  if (!imc || imc === 0) return 'var(--text-secondary)';
  if (imc < 18.5) return '#60a5fa';
  if (imc < 25) return 'var(--state-success, #16a34a)';
  if (imc < 30) return 'var(--state-warning, #f59e0b)';
  return 'var(--state-danger, #ef4444)';
}

function formatMetaMedida(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatEvolucaoArrow(value: number, unit?: 'kg' | 'cm') {
  const arrow = value < 0 ? '↓' : value > 0 ? '↑' : '';
  const num = Math.abs(value).toFixed(1);
  const unitPart = unit ? `\u00A0${unit}` : '';
  return `${arrow ? `${arrow} ` : ''}${num}${unitPart}`;
}

function evolucaoTextClass(value: number) {
  if (value < 0) return 'text-[color:var(--state-success,#16a34a)]';
  if (value > 0) return 'text-orange-600';
  return 'text-[color:var(--text-secondary,#6b7280)]';
}

function CircularMetaBadge({
  percent,
  hintLabel,
  hintKind,
}: {
  percent: number | null | undefined;
  hintLabel?: string | null;
  hintKind?: 'peso' | 'abdominal' | 'imc';
}) {
  const [showHint, setShowHint] = useState(false);
  const size = 40;
  const stroke = 3.5;
  const pct =
    percent != null && Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : null;
  const pctLabel = pct != null ? Math.round(pct) : null;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = pct != null ? (pct / 100) * c : 0;
  const inner = Math.max(22, size - 14);

  useEffect(() => {
    if (!showHint) return;
    const t = window.setTimeout(() => setShowHint(false), 2000);
    return () => window.clearTimeout(t);
  }, [showHint]);

  const hintTitle = hintKind === 'abdominal' ? 'Meta abdominal' : 'Meta de peso';
  const hintBody = hintLabel?.trim() || (pctLabel != null ? `${pctLabel}%` : null);

  return (
    <div className="relative flex shrink-0 flex-col items-center">
      <button
        type="button"
        className="relative"
        style={{ width: size, height: size }}
        aria-label={pctLabel != null ? `${pctLabel}% da meta` : 'Meta não definida'}
        onClick={() => {
          if (!hintBody && pctLabel == null) return;
          setShowHint(true);
        }}
      >
        <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(2,44,34,0.18)" strokeWidth={stroke} />
          {pct != null ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="#022c22"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c}`}
            />
          ) : null}
        </svg>
        <span
          className="absolute left-1/2 top-1/2 flex items-center justify-center rounded-full bg-white text-[10px] font-extrabold tabular-nums leading-none text-[#022c22] shadow-sm shadow-emerald-950/15"
          style={{ width: inner, height: inner, transform: 'translate(-50%, -50%)' }}
        >
          {pctLabel != null ? `${pctLabel}%` : '—'}
        </span>
      </button>
      {showHint && hintBody ? (
        <div
          className="pointer-events-none absolute z-[6]"
          style={{ top: '100%', left: '50%', transform: 'translate(-50%, 6px)' }}
          aria-hidden
        >
          <div className="mx-auto h-0 w-0 border-x-[5px] border-b-[5px] border-x-transparent border-b-slate-800/90" />
          <div className="whitespace-nowrap rounded-full bg-slate-800/90 px-2.5 py-1 text-center text-[10px] font-semibold leading-tight tracking-wide text-white shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
            <span className="block opacity-90">{hintTitle}</span>
            <span className="tabular-nums">{hintBody}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function KpiColumn({
  metaPercent,
  metaHintLabel,
  metaHintKind,
  metaValorLabel,
  metaValorUnit,
  label,
  valueNumber,
  valueUnit,
  evolucao,
  evolucaoClassName,
  alturaLabel,
}: {
  metaPercent?: number | null;
  metaHintLabel?: string | null;
  metaHintKind?: 'peso' | 'abdominal' | 'imc';
  metaValorLabel?: string | null;
  metaValorUnit?: 'kg' | 'cm';
  label: string;
  valueNumber: string | null;
  valueUnit?: string;
  evolucao?: string | null;
  evolucaoClassName?: string;
  alturaLabel?: string | null;
}) {
  return (
    <div
      className="relative flex min-w-0 flex-col items-center overflow-visible rounded-2xl border border-emerald-100/70 px-1.5 py-2.5 text-center sm:px-2 sm:py-3"
      style={{ background: 'linear-gradient(165deg, #ecfdf5 0%, #d1fae5 48%, #a7f3d0 100%)' }}
    >
      <div className="mb-1.5 flex justify-center">
        <CircularMetaBadge percent={metaPercent} hintLabel={metaHintLabel} hintKind={metaHintKind} />
      </div>
      <div className="mb-1 flex h-[2.05rem] items-end justify-center">
        <div className="whitespace-pre-line text-[10px] font-semibold uppercase tracking-wide leading-tight text-emerald-900/55 sm:text-[11px]">
          {label}
        </div>
      </div>
      <div className="flex min-h-[1.65rem] flex-wrap items-baseline justify-center gap-x-0.5 leading-none">
        {valueNumber != null ? (
          <>
            <span className="whitespace-nowrap text-[22px] font-extrabold tabular-nums tracking-tight text-emerald-950 sm:text-[24px]">
              {valueNumber}
            </span>
            {valueUnit ? (
              <span className="whitespace-nowrap text-[12px] font-medium text-emerald-800/60">{valueUnit}</span>
            ) : null}
          </>
        ) : (
          <span className="text-[22px] font-extrabold text-emerald-800/40 sm:text-[24px]">-</span>
        )}
      </div>
      {evolucao ? (
        <div
          className={`mt-1.5 whitespace-nowrap text-[13px] font-bold tabular-nums leading-tight ${evolucaoClassName || 'text-[color:var(--state-success,#16a34a)]'}`}
        >
          {evolucao}
        </div>
      ) : null}
      {alturaLabel ? (
        <div className="mt-1.5 inline-flex max-w-full items-center justify-center rounded-full bg-white/70 px-2 py-0.5 text-[10px] leading-tight text-emerald-900/60 ring-1 ring-white/50">
          <span>Altura&nbsp;</span>
          <span className="font-semibold tabular-nums text-emerald-950">{alturaLabel}&nbsp;m</span>
        </div>
      ) : null}
      {metaValorLabel && metaValorUnit ? (
        <div className="mt-1.5 inline-flex max-w-full items-center justify-center whitespace-nowrap rounded-full bg-white/70 px-2 py-0.5 text-[10px] leading-tight text-emerald-900/60 ring-1 ring-white/50">
          <span>Meta:&nbsp;</span>
          <span className="font-semibold tabular-nums text-emerald-950">
            {metaValorLabel}&nbsp;{metaValorUnit}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export function MedidasCorporaisResumo({
  paciente,
  ativo = true,
}: {
  paciente: PacienteCompleto;
  ativo?: boolean;
}) {
  const m = buildPatientDetailsMobileMetrics(paciente);
  const replayKey = ativo ? paciente.id || 'medidas' : '';
  const pesoAnim = useCountUp(m.pesoAtual != null && m.pesoAtual > 0 ? m.pesoAtual : null, replayKey);
  const compAnim = useCountUp(
    m.compAbdominalAtual != null && m.compAbdominalAtual > 0 ? m.compAbdominalAtual : null,
    replayKey
  );
  const imcAnim = useCountUp(m.imcAtual != null && m.imcAtual > 0 ? m.imcAtual : null, replayKey);
  const perdaPesoAnim = useCountUp(m.perdaPesoTotal, replayKey);
  const perdaCompAnim = useCountUp(m.perdaCompAbdominalTotal, replayKey);
  const perdaImcAnim = useCountUp(m.perdaImcTotal, replayKey);
  const metaPctPeso = useCountUp(
    m.metaProgressPesoPct != null && Number.isFinite(m.metaProgressPesoPct)
      ? Math.max(0, Math.min(100, m.metaProgressPesoPct))
      : null,
    replayKey
  );
  const metaPctAbdominal = useCountUp(
    m.metaProgressAbdominalPct != null && Number.isFinite(m.metaProgressAbdominalPct)
      ? Math.max(0, Math.min(100, m.metaProgressAbdominalPct))
      : null,
    replayKey
  );

  const imcExibido = imcAnim != null && imcAnim > 0 ? imcAnim : m.imcAtual;
  const markerPercent =
    imcExibido != null && imcExibido > 0 ? calcularPosicaoMarcador(imcExibido) : m.imcMarkerPercent;
  const markerColor = imcMarkerColor(imcExibido);
  const imcMetaExibido = m.imcMeta != null && m.imcMeta > 0 ? m.imcMeta : null;
  const metaMarkerPercent = imcMetaExibido != null ? calcularPosicaoMarcador(imcMetaExibido) : null;
  const pesoMetaBadge = m.pesoMetaKg != null && m.pesoMetaKg > 0 ? formatMetaMedida(m.pesoMetaKg) : null;
  const compMetaBadge =
    m.compAbdominalMetaCm != null && m.compAbdominalMetaCm > 0
      ? formatMetaMedida(m.compAbdominalMetaCm)
      : null;
  const hasImcBar = m.imcAtual != null && m.imcAtual > 0 && m.alturaMetros != null && m.alturaMetros > 0;
  const showResumo =
    (m.pesoAtual != null && m.pesoAtual > 0) ||
    (m.compAbdominalAtual != null && m.compAbdominalAtual > 0) ||
    (m.imcAtual != null && m.imcAtual > 0);

  if (!showResumo) {
    return <p className="text-sm text-slate-500">Sem medidas registradas.</p>;
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <KpiColumn
          metaPercent={metaPctPeso}
          metaHintLabel={m.metaPesoValorLabel}
          metaHintKind="peso"
          metaValorLabel={pesoMetaBadge}
          metaValorUnit="kg"
          label="Peso atual"
          valueNumber={
            pesoAnim != null && pesoAnim > 0
              ? pesoAnim.toFixed(1)
              : m.pesoAtual != null && m.pesoAtual > 0
                ? m.pesoAtual.toFixed(1)
                : null
          }
          valueUnit="kg"
          evolucao={
            perdaPesoAnim !== null
              ? formatEvolucaoArrow(perdaPesoAnim, 'kg')
              : m.perdaPesoTotal !== null
                ? formatEvolucaoArrow(m.perdaPesoTotal, 'kg')
                : null
          }
          evolucaoClassName={
            (perdaPesoAnim ?? m.perdaPesoTotal) != null
              ? evolucaoTextClass((perdaPesoAnim ?? m.perdaPesoTotal) as number)
              : undefined
          }
        />
        <KpiColumn
          metaPercent={metaPctAbdominal}
          metaHintLabel={m.metaAbdominalValorLabel}
          metaHintKind="abdominal"
          metaValorLabel={compMetaBadge}
          metaValorUnit="cm"
          label={'Comprimento\nabdominal'}
          valueNumber={
            compAnim != null && compAnim > 0
              ? compAnim.toFixed(1)
              : m.compAbdominalAtual != null && m.compAbdominalAtual > 0
                ? m.compAbdominalAtual.toFixed(1)
                : null
          }
          valueUnit="cm"
          evolucao={
            perdaCompAnim !== null
              ? formatEvolucaoArrow(perdaCompAnim, 'cm')
              : m.perdaCompAbdominalTotal !== null
                ? formatEvolucaoArrow(m.perdaCompAbdominalTotal, 'cm')
                : null
          }
          evolucaoClassName={
            (perdaCompAnim ?? m.perdaCompAbdominalTotal) != null
              ? evolucaoTextClass((perdaCompAnim ?? m.perdaCompAbdominalTotal) as number)
              : undefined
          }
        />
        <KpiColumn
          metaPercent={metaPctPeso}
          metaHintLabel={m.metaPesoValorLabel}
          metaHintKind="imc"
          label="IMC"
          valueNumber={
            imcAnim != null && imcAnim > 0
              ? imcAnim.toFixed(1)
              : m.imcAtual != null && m.imcAtual > 0
                ? m.imcAtual.toFixed(1)
                : null
          }
          evolucao={
            perdaImcAnim !== null
              ? formatEvolucaoArrow(perdaImcAnim)
              : m.perdaImcTotal !== null
                ? formatEvolucaoArrow(m.perdaImcTotal)
                : null
          }
          evolucaoClassName={
            (perdaImcAnim ?? m.perdaImcTotal) != null
              ? evolucaoTextClass((perdaImcAnim ?? m.perdaImcTotal) as number)
              : undefined
          }
          alturaLabel={m.alturaMetros != null && m.alturaMetros > 0 ? m.alturaMetros.toFixed(2) : null}
        />
      </div>

      {hasImcBar ? (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <div
            className="relative w-full"
            style={{ paddingTop: metaMarkerPercent != null ? 52 : 26, paddingBottom: 2 }}
          >
            {m.grauObesidadeLabel ? (
              <div
                className={`pointer-events-none absolute left-0 top-0 z-[2] max-w-[58%] truncate text-[11px] font-semibold leading-tight ${m.grauObesidadeClassName}`}
              >
                {m.grauObesidadeLabel}
              </div>
            ) : null}
            <div className="relative w-full overflow-visible rounded-full" style={{ height: 8 }}>
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, #93c5fd 0%, #93c5fd 25%, #6ee7b7 25%, #6ee7b7 50%, #fcd34d 50%, #fcd34d 75%, #fca5a5 75%, #fca5a5 100%)',
                }}
              />
              {metaMarkerPercent != null && imcMetaExibido != null ? (
                <div
                  className="pointer-events-none absolute bottom-full z-[6] mb-0.5 flex -translate-x-1/2 flex-col items-center drop-shadow-md"
                  style={{ left: `clamp(14px, ${metaMarkerPercent}%, calc(100% - 14px))` }}
                  title={`IMC correspondente à meta: ${imcMetaExibido.toFixed(1)}`}
                  role="img"
                  aria-label={`IMC correspondente à meta: ${imcMetaExibido.toFixed(1)}`}
                >
                  <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white shadow-md">
                    <Image
                      src="/icones/imc-meta-alvo-simbolo.png"
                      alt=""
                      width={18}
                      height={18}
                      className="h-[88%] w-[88%] object-contain object-center"
                      draggable={false}
                    />
                  </div>
                  <div className="-mt-px h-0 w-0 shrink-0 border-x-[6px] border-t-[7px] border-x-transparent border-t-white" aria-hidden />
                </div>
              ) : null}
              <div
                className="pointer-events-none absolute z-[4]"
                style={{
                  left: `clamp(16px, ${markerPercent}%, calc(100% - 16px))`,
                  top: 0,
                  transform: 'translate(-50%, calc(-100% - 6px))',
                }}
              >
                <div
                  className="rounded-md px-1.5 py-0.5 text-[11px] font-bold leading-none text-white shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
                  style={{ background: markerColor }}
                >
                  {(imcExibido ?? m.imcAtual!).toFixed(1)}
                </div>
                <div
                  className="mx-auto h-0 w-0 border-x-[4px] border-t-[5px] border-x-transparent"
                  style={{ borderTopColor: markerColor }}
                  aria-hidden
                />
              </div>
              <div
                className="absolute top-1/2 z-[3] -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${markerPercent}%` }}
              >
                <div
                  className="rounded-full border-2 border-white shadow-[0_1px_3px_rgba(0,0,0,0.14)]"
                  style={{ width: 20, height: 20, background: markerColor }}
                  aria-hidden
                />
              </div>
            </div>
          </div>
          <div className="mt-2 flex justify-between">
            <span className="text-[11px] text-gray-500">Baixo</span>
            <span className="text-[11px] text-gray-500">Saudável</span>
            <span className="text-[11px] text-gray-500">Alto</span>
            <span className="text-[11px] text-gray-500">Obeso</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
