'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Users } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import MetodoEmagrecerIcon from '@/components/metodo/MetodoEmagrecerIcon';
import {
  ORGANIZATION_METODO_PRIMARY_COLOR,
  ORGANIZATION_METODO_SECONDARY_COLOR,
} from '@/lib/organization/organizationBrandingDefaults';
import {
  organizationDashboardHeroPaint,
  type OrganizationDashboardHeroPaint,
  type OrganizationShellChrome,
} from '@/lib/organization/resolveOrganizationShellChrome';
import {
  buildPatientGrowthCustom,
  buildPatientGrowthMetrics,
  buildPatientGrowthPreset,
  PERIODOS_PACIENTE,
  type PatientGrowthBucket,
  type PatientGrowthPeriodDays,
  type PatientGrowthPreset,
} from '@/lib/metaadmin/dashboard/patientGrowthMetrics';

export type PacienteCadastroSerie = {
  timestamp: number;
  status?: string | null;
};

type Props = {
  total: number;
  cadastroTimestamps: number[];
  /** Cadastros com status atual. Só a variante expanded desenha as séries da legenda. */
  cadastros?: PacienteCadastroSerie[];
  navyColor?: string;
  /** Chrome autenticado. No Método o hero conserva as classes atuais. */
  chrome?: OrganizationShellChrome | null;
  className?: string;
  /** `expanded` é o gráfico grande do MetaAdmin. O padrão compacto permanece nos outros painéis. */
  variant?: 'compact' | 'expanded';
};

type SerieStatusId = 'total' | 'pendentes' | 'tratamento' | 'concluido' | 'abandono';

const SERIES_STATUS: { id: SerieStatusId; label: string; cor: string }[] = [
  { id: 'total', label: 'Total', cor: ORGANIZATION_METODO_PRIMARY_COLOR },
  { id: 'pendentes', label: 'Pendente', cor: '#F5C16C' },
  { id: 'tratamento', label: 'Tratamento', cor: '#7EC8E3' },
  { id: 'concluido', label: 'Concluído', cor: '#C4B5FD' },
  { id: 'abandono', label: 'Abandono', cor: '#FB7185' },
];

const PERIODS: { days: PatientGrowthPeriodDays; short: string; full: string }[] = [
  { days: 7, short: '7d', full: 'Últimos 7 dias' },
  { days: 30, short: '30d', full: 'Últimos 30 dias' },
  { days: 60, short: '60d', full: 'Últimos 60 dias' },
];

const HERO_SHADOW_METODO = 'shadow-[0_8px_24px_rgba(10,31,68,0.18)]';
const HERO_SHADOW_NEUTRAL = 'shadow-[0_8px_24px_rgba(17,24,39,0.18)]';

function heroShadowClass(classes: string, neutral: boolean): string {
  return neutral ? classes.split(HERO_SHADOW_METODO).join(HERO_SHADOW_NEUTRAL) : classes;
}

function HeroPatientIcon({ size, paint }: { size: 32 | 40; paint: OrganizationDashboardHeroPaint | null }) {
  if (!paint) return <MetodoEmagrecerIcon icon="paciente" size={size} />;
  return (
    <span
      aria-hidden="true"
      data-dashboard-neutral-icon="paciente"
      className="inline-flex shrink-0 items-center justify-center align-middle"
      style={{ width: size, height: size, borderRadius: '20%', backgroundColor: paint.sparkFill, color: paint.highlight }}
    >
      <Users className="h-1/2 w-1/2" strokeWidth={2} />
    </span>
  );
}

function formatPct(value: number): string {
  return Math.abs(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function statusDaSerie(status: string | null | undefined): Exclude<SerieStatusId, 'total'> | null {
  if (status === 'pendente') return 'pendentes';
  if (status === 'em_tratamento') return 'tratamento';
  if (status === 'concluido') return 'concluido';
  if (status === 'abandono') return 'abandono';
  return null;
}

function serieDoPeriodo(
  sparkline: number[],
  buckets: PatientGrowthBucket[],
  cadastros: PacienteCadastroSerie[] | undefined
) {
  const pontos = sparkline.map((total, index) => ({
    label: buckets[index]?.label ?? '',
    total,
    pendentes: 0,
    tratamento: 0,
    concluido: 0,
    abandono: 0,
  }));
  if (!cadastros || pontos.length === 0) return pontos;
  for (const cadastro of cadastros) {
    const key = statusDaSerie(cadastro.status);
    if (!key) continue;
    const index = buckets.findIndex(
      (bucket) => cadastro.timestamp >= bucket.startMs && cadastro.timestamp < bucket.endMs
    );
    if (index >= 0) pontos[index][key] += 1;
  }
  return pontos;
}

function dateKeyLocal(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function novosNoPeriodoLabel(novosAtual: number): string {
  if (novosAtual === 0) return 'Nenhum novo paciente no período';
  if (novosAtual === 1) return '+1 novo paciente no período';
  return `+${novosAtual} novos pacientes no período`;
}

function Sparkline({
  values,
  label,
  stroke = ORGANIZATION_METODO_PRIMARY_COLOR,
  fill = 'rgba(76, 203, 122, 0.18)',
}: {
  values: number[];
  label: string;
  stroke?: string;
  fill?: string;
}) {
  const width = 200;
  const height = 44;
  const max = Math.max(...values, 1);
  const points = values.map((value, index) => {
    const x = values.length <= 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - 3 - (value / max) * (height - 8);
    return [x, y] as const;
  });
  const line = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-11 w-full" role="img" aria-label={label}>
      <path d={area} fill={fill} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DashboardHeroKpi({
  total,
  cadastroTimestamps,
  cadastros,
  navyColor = ORGANIZATION_METODO_SECONDARY_COLOR,
  chrome,
  className,
  variant = 'compact',
}: Props) {
  const dynamic: OrganizationDashboardHeroPaint | null =
    chrome && !chrome.useMetodoChrome ? organizationDashboardHeroPaint(chrome) : null;
  const heroBackground = dynamic?.background ?? navyColor;
  const [periodDays, setPeriodDays] = useState<PatientGrowthPeriodDays>(30);
  const [preset, setPreset] = useState<PatientGrowthPreset>('30d');
  const [intervaloCustom, setIntervaloCustom] = useState<{ inicio: Date; fim: Date } | null>(null);
  const [modalPeriodo, setModalPeriodo] = useState(false);
  const [rascunhoInicio, setRascunhoInicio] = useState('');
  const [rascunhoFim, setRascunhoFim] = useState('');
  const [erroPeriodo, setErroPeriodo] = useState('');
  const [montado, setMontado] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [seriesVisiveis, setSeriesVisiveis] = useState<Record<SerieStatusId, boolean>>({
    total: true,
    pendentes: true,
    tratamento: true,
    concluido: true,
    abandono: true,
  });
  const menuRef = useRef<HTMLDivElement>(null);
  const growth = useMemo(() => {
    const anchorMs = Date.now();
    if (variant === 'expanded') {
      const metrics = intervaloCustom
        ? buildPatientGrowthCustom(cadastroTimestamps, intervaloCustom.inicio, intervaloCustom.fim)
        : buildPatientGrowthPreset(cadastroTimestamps, preset, anchorMs);
      return { anchorMs, metrics };
    }
    return { anchorMs, metrics: buildPatientGrowthMetrics(cadastroTimestamps, periodDays, anchorMs) };
  }, [variant, cadastroTimestamps, periodDays, preset, intervaloCustom]);
  const metrics = growth.metrics;
  const gradientId = useId().replace(/:/g, '');
  const selected = PERIODS.find((item) => item.days === periodDays) ?? PERIODS[1];

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [menuOpen]);

  const novosLabel =
    metrics.novosAtual === 0
      ? 'Nenhum novo paciente'
      : metrics.novosAtual === 1
        ? '+1 paciente'
        : `+${metrics.novosAtual} pacientes`;

  const trend =
    metrics.kind === 'up'
      ? { text: `↑ ${formatPct(metrics.percentual ?? 0)}%`, className: dynamic ? '' : 'text-[#4CCB7A]', color: dynamic?.highlight }
      : metrics.kind === 'down'
        ? { text: `↓ ${formatPct(metrics.percentual ?? 0)}%`, className: dynamic && !dynamic.onDark ? 'text-amber-700' : 'text-amber-300', color: undefined }
        : metrics.kind === 'flat'
          ? { text: '→ 0%', className: dynamic ? '' : 'text-white/70', color: dynamic?.muted }
          : metrics.kind === 'new'
            ? { text: 'Novos cadastros', className: dynamic ? '' : 'text-[#4CCB7A]', color: dynamic?.highlight }
            : { text: 'Sem variação', className: dynamic ? '' : 'text-white/70', color: dynamic?.muted };

  const sparkLabel = metrics.hasTemporalData
    ? `Cadastros nos ${selected.full.toLowerCase()}: ${novosLabel.replace(/^\+/, '')}, ${trend.text}.`
    : 'Dados temporais insuficientes';

  const escolherPreset = (id: PatientGrowthPreset) => {
    setIntervaloCustom(null);
    setPreset(id);
    setMenuOpen(false);
  };

  const abrirModalPeriodo = () => {
    const fim = new Date();
    const inicio = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate() - 29);
    setRascunhoInicio(dateKeyLocal(inicio));
    setRascunhoFim(dateKeyLocal(fim));
    setErroPeriodo('');
    setModalPeriodo(true);
    setMenuOpen(false);
  };

  const aplicarPeriodoCustom = () => {
    const inicio = parseDateKey(rascunhoInicio);
    const fim = parseDateKey(rascunhoFim);
    if (!inicio || !fim) {
      setErroPeriodo('Informe a data de início e a data final.');
      return;
    }
    if (fim.getTime() < inicio.getTime()) {
      setErroPeriodo('A data final precisa ser igual ou posterior à data de início.');
      return;
    }
    setIntervaloCustom({ inicio, fim });
    setModalPeriodo(false);
  };

  if (variant === 'expanded') {
    const serie = serieDoPeriodo(metrics.sparkline, metrics.buckets, cadastros);
    const intervaloEixo = serie.length > 40 ? 9 : serie.length > 14 ? 4 : 0;
    const comparaPeriodoAnterior =
      metrics.comparaAnterior && (metrics.kind === 'up' || metrics.kind === 'down' || metrics.kind === 'flat');
    const indicadores = (
      <>
        {metrics.comparaAnterior ? (
          <span className={`font-semibold ${trend.className}`} style={trend.color ? { color: trend.color } : undefined}>{trend.text}</span>
        ) : (
          <span className="font-semibold text-white/70" style={dynamic ? { color: dynamic.muted } : undefined}>Desde o primeiro cadastro</span>
        )}
        {comparaPeriodoAnterior ? <span className="text-white/60" style={dynamic ? { color: dynamic.muted } : undefined}>vs. período anterior</span> : null}
        <span className="text-white/35" style={dynamic ? { color: dynamic.muted } : undefined} aria-hidden>
          ·
        </span>
        <span className="text-white/75" style={dynamic ? { color: dynamic.text } : undefined}>{novosNoPeriodoLabel(metrics.novosAtual)}</span>
      </>
    );

    return (
      <div
        className={heroShadowClass(
          `relative min-w-0 overflow-hidden p-4 shadow-[0_8px_24px_rgba(10,31,68,0.18)] sm:p-6 lg:py-4 ${className ?? ''}`,
          dynamic !== null
        )}
        style={{ backgroundColor: heroBackground, borderRadius: 20 }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 lg:items-start">
          <div className="flex min-w-0 items-center gap-2.5 lg:items-start">
            <span className="lg:hidden">
              <HeroPatientIcon size={32} paint={dynamic} />
            </span>
            <span className="hidden h-11 w-11 shrink-0 items-start justify-center lg:flex">
              <HeroPatientIcon size={40} paint={dynamic} />
            </span>
            <div className="min-w-0 lg:pt-0.5">
              <p className="truncate text-sm font-medium text-white/80 lg:text-[13px] lg:leading-tight" style={dynamic ? { color: dynamic.muted } : undefined}>
                Total de pacientes
              </p>
              <p className="mt-0.5 hidden truncate text-[2.625rem] font-extrabold leading-none tabular-nums text-white lg:block" style={dynamic ? { color: dynamic.text } : undefined}>
                {total}
              </p>
              <p className="mt-1 hidden flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] leading-tight lg:flex">
                {indicadores}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <div className="hidden items-center gap-1 rounded-full bg-white/10 p-1 lg:flex">
              {PERIODOS_PACIENTE.map((item) => {
                const ativo = !intervaloCustom && item.id === preset;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => escolherPreset(item.id)}
                    aria-pressed={ativo}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      ativo ? '' : dynamic ? (dynamic.onDark ? 'hover:bg-white/10' : 'hover:bg-black/5') : 'text-white/80 hover:bg-white/10'
                    }`}
                    style={
                      ativo
                        ? dynamic
                          ? { backgroundColor: dynamic.chipBackground, color: dynamic.chipText }
                          : { backgroundColor: '#E8EDED', color: '#0A1F44' }
                        : dynamic
                          ? { color: dynamic.muted }
                          : undefined
                    }
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={abrirModalPeriodo}
              aria-pressed={Boolean(intervaloCustom)}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={
                intervaloCustom
                  ? dynamic
                    ? { backgroundColor: dynamic.chipBackground, color: dynamic.chipText }
                    : { backgroundColor: '#E8EDED', color: '#0A1F44' }
                  : dynamic
                    ? {
                        backgroundColor: dynamic.onDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        color: dynamic.muted,
                      }
                    : { backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }
              }
            >
              Período
            </button>
            <div ref={menuRef} className="relative lg:hidden">
              <button
                type="button"
                onClick={() => setMenuOpen((aberto) => !aberto)}
                className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-1 text-[11px] font-medium text-white/80 ${
                  dynamic && !dynamic.onDark ? 'border-black/10 bg-black/5' : 'border-white/15 bg-white/5'
                }`}
                style={dynamic ? { color: dynamic.muted } : undefined}
                aria-haspopup="listbox"
                aria-expanded={menuOpen}
                aria-label={`Filtro: ${intervaloCustom ? 'período personalizado' : preset}`}
              >
                {intervaloCustom ? 'Datas' : preset}
                <ChevronDown className="h-3 w-3 opacity-80" />
              </button>
              {menuOpen ? (
                <div
                  className="absolute right-0 z-20 mt-1 min-w-[88px] overflow-hidden rounded-xl border border-white/10 py-1 shadow-lg"
                  style={{ backgroundColor: heroBackground }}
                >
                  {PERIODOS_PACIENTE.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={!intervaloCustom && item.id === preset}
                      onClick={() => escolherPreset(item.id)}
                      className={`block w-full px-3 py-1.5 text-left text-xs ${
                        !intervaloCustom && item.id === preset
                          ? `font-semibold ${dynamic ? (dynamic.onDark ? 'bg-white/10' : 'bg-black/5') : 'bg-white/10 text-[#4CCB7A]'}`
                          : dynamic
                            ? dynamic.onDark
                              ? 'hover:bg-white/5'
                              : 'hover:bg-black/5'
                            : 'text-white/80 hover:bg-white/5'
                      }`}
                      style={
                        dynamic
                          ? { color: !intervaloCustom && item.id === preset ? dynamic.highlight : dynamic.muted }
                          : undefined
                      }
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <p className="mt-3 truncate text-[clamp(1.8rem,4vw,2.5rem)] font-extrabold leading-none tabular-nums text-white lg:hidden" style={dynamic ? { color: dynamic.text } : undefined}>
          {total}
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] sm:text-[13px] lg:hidden">
          {indicadores}
        </p>

        {metrics.hasTemporalData ? (
          <div className="mt-4 h-36 min-w-0 sm:h-44 lg:mt-2.5 lg:h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serie} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  {SERIES_STATUS.map((item) => {
                    const cor = item.id === 'total' && dynamic ? dynamic.totalSeries : item.cor;
                    return (
                    <linearGradient key={item.id} id={`${gradientId}-${item.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={cor} stopOpacity={0.32} />
                      <stop offset="100%" stopColor={cor} stopOpacity={0.02} />
                    </linearGradient>
                    );
                  })}
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fill: dynamic?.axis ?? 'rgba(232,237,237,0.65)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={intervaloEixo}
                  minTickGap={8}
                />
                <YAxis
                  width={32}
                  allowDecimals={false}
                  tick={{ fill: dynamic?.axis ?? 'rgba(232,237,237,0.55)', fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(valor: number) => String(Math.round(valor))}
                />
                <Tooltip
                  cursor={{ stroke: 'rgba(255,255,255,0.25)' }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div
                        className={`rounded-xl border border-white/10 px-3 py-2 text-xs text-white shadow-lg ${dynamic ? '' : 'bg-[#0A1F44]'}`}
                        style={dynamic ? { backgroundColor: dynamic.background, color: dynamic.text } : undefined}
                      >
                        <p className="text-white/70" style={dynamic ? { color: dynamic.muted } : undefined}>{label}</p>
                        {payload.map((item) => (
                          <p key={String(item.dataKey)} className="mt-0.5 flex items-center gap-1.5 font-semibold tabular-nums">
                            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                            {item.name}: {Math.round(Number(item.value) || 0).toLocaleString('pt-BR')}
                          </p>
                        ))}
                      </div>
                    );
                  }}
                />
                {SERIES_STATUS.map((item) => {
                  const cor = item.id === 'total' && dynamic ? dynamic.totalSeries : item.cor;
                  return (
                  <Area
                    key={item.id}
                    type="monotone"
                    dataKey={item.id}
                    name={item.label}
                    hide={!seriesVisiveis[item.id]}
                    stroke={cor}
                    strokeWidth={2}
                    fill={`url(#${gradientId}-${item.id})`}
                    dot={false}
                    activeDot={{ r: 3, fill: cor }}
                  />
                  );
                })}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-4 py-6 text-[12px] text-white/55 lg:mt-2.5 lg:py-4" style={dynamic ? { color: dynamic.muted } : undefined}>Dados temporais insuficientes</p>
        )}
        <div className="mt-2 flex flex-nowrap items-center justify-center gap-2 lg:mt-1.5">
          {SERIES_STATUS.map((item) => {
            const ativa = seriesVisiveis[item.id];
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={ativa}
                onClick={() => setSeriesVisiveis((atual) => ({ ...atual, [item.id]: !atual[item.id] }))}
                className="inline-flex min-h-8 items-center gap-1 whitespace-nowrap rounded-full px-1 py-1 text-[10px] font-semibold leading-none tracking-tight text-white sm:gap-1.5 sm:px-2.5 sm:text-[11px] sm:tracking-normal"
                style={{
                  backgroundColor: ativa
                    ? dynamic && !dynamic.onDark
                      ? 'rgba(0,0,0,0.06)'
                      : 'rgba(255,255,255,0.14)'
                    : 'transparent',
                  opacity: ativa ? 1 : 0.45,
                  ...(dynamic ? { color: dynamic.text } : {}),
                }}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full sm:h-2 sm:w-2" style={{ backgroundColor: item.id === 'total' && dynamic ? dynamic.totalSeries : item.cor }} />
                {item.label}
              </button>
            );
          })}
        </div>
        {montado && modalPeriodo
          ? createPortal(
              <div
                className="fixed inset-0 z-[90] flex items-end justify-center overflow-hidden bg-black/45 p-4 sm:items-center"
                onClick={() => setModalPeriodo(false)}
              >
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="pacientes-periodo-titulo"
                  className="box-border w-full min-w-0 max-w-sm overflow-hidden rounded-2xl bg-white p-4 shadow-xl sm:p-5"
                  onClick={(event) => event.stopPropagation()}
                >
                  <h2 id="pacientes-periodo-titulo" className="text-base font-semibold text-gray-900">
                    Período
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">Escolha a data de início e a data final.</p>
                  <label className="mt-4 block min-w-0 text-xs font-medium text-gray-600">
                    Data início
                    <input
                      type="date"
                      value={rascunhoInicio}
                      onChange={(event) => setRascunhoInicio(event.target.value)}
                      className="mt-1 box-border block w-full min-w-0 max-w-full rounded-xl border border-gray-200 px-2 py-2 text-sm text-gray-900"
                    />
                  </label>
                  <label className="mt-3 block min-w-0 text-xs font-medium text-gray-600">
                    Data final
                    <input
                      type="date"
                      value={rascunhoFim}
                      onChange={(event) => setRascunhoFim(event.target.value)}
                      className="mt-1 box-border block w-full min-w-0 max-w-full rounded-xl border border-gray-200 px-2 py-2 text-sm text-gray-900"
                    />
                  </label>
                  {erroPeriodo ? <p className="mt-3 text-xs text-red-600">{erroPeriodo}</p> : null}
                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setModalPeriodo(false)}
                      className="rounded-xl px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={aplicarPeriodoCustom}
                      className="rounded-xl px-3 py-2 text-sm font-semibold text-white"
                      style={{ backgroundColor: heroBackground, ...(dynamic ? { color: dynamic.text } : {}) }}
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )
          : null}
      </div>
    );
  }

  return (
    <div
      className={heroShadowClass(
        className ??
          'relative col-span-2 overflow-visible p-5 shadow-[0_8px_24px_rgba(10,31,68,0.18)] sm:p-6 lg:col-span-1',
        dynamic !== null
      )}
      style={{
        backgroundColor: heroBackground,
        borderRadius: 20,
      }}
    >
      <div className="relative">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <HeroPatientIcon size={32} paint={dynamic} />
            <p className="text-sm font-medium text-white/80" style={dynamic ? { color: dynamic.muted } : undefined}>Total de pacientes</p>
          </div>

          <div ref={menuRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-1 text-[11px] font-medium text-white/80 ${
                dynamic && !dynamic.onDark ? 'border-black/10 bg-black/5 hover:bg-black/10' : 'border-white/15 bg-white/5 hover:bg-white/10'
              }`}
              style={dynamic ? { color: dynamic.muted } : undefined}
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              aria-label={`Período: ${selected.full}`}
            >
              <span className="sm:hidden">{selected.short}</span>
              <span className="hidden sm:inline">Últimos {selected.short}</span>
              <ChevronDown className="h-3 w-3 opacity-80" />
            </button>
            {menuOpen ? (
              <div
                className={`absolute right-0 z-20 mt-1 min-w-[148px] overflow-hidden rounded-xl border border-white/10 py-1 shadow-lg ${dynamic ? '' : 'bg-[#0A1F44]'}`}
                style={dynamic ? { backgroundColor: dynamic.background } : undefined}
              >
                {PERIODS.map((item) => (
                  <button
                    key={item.days}
                    type="button"
                    role="option"
                    aria-selected={item.days === periodDays}
                    onClick={() => {
                      setPeriodDays(item.days);
                      setMenuOpen(false);
                    }}
                    className={`block w-full px-3 py-1.5 text-left text-xs ${
                      item.days === periodDays
                        ? `font-semibold ${dynamic ? (dynamic.onDark ? 'bg-white/10' : 'bg-black/5') : 'bg-white/10 text-[#4CCB7A]'}`
                        : dynamic
                          ? dynamic.onDark
                            ? 'hover:bg-white/5'
                            : 'hover:bg-black/5'
                          : 'text-white/80 hover:bg-white/5'
                    }`}
                    style={dynamic ? { color: item.days === periodDays ? dynamic.highlight : dynamic.muted } : undefined}
                  >
                    {item.full}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <p className="text-[32px] font-extrabold leading-none text-white md:text-[36px]" style={dynamic ? { color: dynamic.text } : undefined}>{total}</p>

        <div className="mt-3">
          {metrics.hasTemporalData ? (
            <Sparkline
              values={metrics.sparkline}
              label={sparkLabel}
              stroke={dynamic?.spark}
              fill={dynamic?.sparkFill}
            />
          ) : (
            <p className="py-2 text-[12px] text-white/55" style={dynamic ? { color: dynamic.muted } : undefined}>Dados temporais insuficientes</p>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] sm:text-[13px]">
          <span className={`inline-flex items-center font-semibold ${trend.className}`} style={trend.color ? { color: trend.color } : undefined}>{trend.text}</span>
          <span className="text-white/75" style={dynamic ? { color: dynamic.text } : undefined}>{novosLabel}</span>
        </div>
      </div>
    </div>
  );
}
