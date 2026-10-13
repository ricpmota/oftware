'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, DollarSign } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ORGANIZATION_METODO_SECONDARY_COLOR } from '@/lib/organization/organizationBrandingDefaults';
import {
  dateKeyLocal,
  granularidadeDaSerie,
  intervaloAnterior,
  intervaloAnteriorEquivalente,
  intervaloDoPeriodo,
  intervaloTotal,
  inicioDoDia,
  parseDateKey,
  PERIODOS_FINANCEIRO,
  serieFinanceira,
  somarIntervalo,
  variacaoDe,
  type DetalhesPorDia,
  type FinanceiroPeriodo,
  type MapaPorDia,
  type VariacaoFinanceira,
} from '@/lib/metaadmin/financeiroDashboardPeriodo';

type Props = {
  mapaPorDia: MapaPorDia;
  detalhesPorDia: DetalhesPorDia;
  isDark?: boolean;
  onAbrirRelatorio: (tipo: 'vendido' | 'recebido' | 'aberto') => void;
};

const CORES = {
  vendido: { light: '#2563eb', dark: '#7EC8E3' },
  recebido: { light: '#059669', dark: '#4CCB7A' },
  aberto: { light: '#d97706', dark: '#F5C16C' },
} as const;

function fmtMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtPct(valor: number): string {
  return Math.abs(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function fmtDelta(valor: number): string {
  const abs = fmtMoeda(Math.abs(valor));
  if (valor > 0) return `+ ${abs}`;
  if (valor < 0) return `− ${abs}`;
  return abs;
}

function textoVariacao(variacao: VariacaoFinanceira): string {
  if (variacao.kind === 'sem-base') return 'Sem base anterior';
  if (variacao.kind === 'flat') return '→ 0%';
  const seta = variacao.kind === 'up' ? '↑' : '↓';
  return `${seta} ${fmtPct(variacao.percentual ?? 0)}%`;
}

function corVariacao(variacao: VariacaoFinanceira, neutra: boolean, isDark: boolean): string {
  if (neutra || variacao.kind === 'flat' || variacao.kind === 'sem-base') {
    return isDark ? 'rgba(232,237,237,0.65)' : '#64748b';
  }
  if (variacao.kind === 'up') return isDark ? '#4CCB7A' : '#059669';
  return isDark ? '#F5C16C' : '#b45309';
}

export default function FinanceiroDashboard({
  mapaPorDia,
  detalhesPorDia,
  isDark = false,
  onAbrirRelatorio,
}: Props) {
  const [periodo, setPeriodo] = useState<FinanceiroPeriodo>('30d');
  const [intervaloCustom, setIntervaloCustom] = useState<{ inicio: Date; fim: Date } | null>(null);
  const [modalPeriodo, setModalPeriodo] = useState(false);
  const [rascunhoInicio, setRascunhoInicio] = useState('');
  const [rascunhoFim, setRascunhoFim] = useState('');
  const [erroPeriodo, setErroPeriodo] = useState('');
  const [seriesVisiveis, setSeriesVisiveis] = useState({ vendido: true, recebido: true, aberto: true });
  const [menuAberto, setMenuAberto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const gradVendido = useId().replace(/:/g, '');
  const gradRecebido = `${gradVendido}-recebido`;
  const gradAberto = `${gradVendido}-aberto`;
  const hoje = useMemo(() => inicioDoDia(new Date()), []);
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
  }, []);

  useEffect(() => {
    if (!menuAberto) return;
    const fechar = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuAberto(false);
    };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, [menuAberto]);

  const modelo = useMemo(() => {
    const atual = intervaloCustom
      ? { inicio: inicioDoDia(intervaloCustom.inicio), fim: inicioDoDia(intervaloCustom.fim) }
      : periodo === 'total'
        ? intervaloTotal(mapaPorDia, hoje)
        : intervaloDoPeriodo(periodo, hoje);
    const anterior = intervaloCustom
      ? intervaloAnteriorEquivalente(atual)
      : periodo === 'total'
        ? null
        : intervaloAnterior(periodo, atual);
    const totaisAtuais = somarIntervalo(mapaPorDia, detalhesPorDia, atual.inicio, atual.fim);
    const totaisAnteriores = anterior
      ? somarIntervalo(mapaPorDia, detalhesPorDia, anterior.inicio, anterior.fim)
      : null;
    const ticket = totaisAtuais.vendas > 0 ? totaisAtuais.vendido / totaisAtuais.vendas : 0;
    const granularidade = granularidadeDaSerie(intervaloCustom ? 'custom' : periodo, atual.inicio, atual.fim);
    return {
      atual,
      totaisAtuais,
      ticket,
      serie: serieFinanceira(granularidade, mapaPorDia, atual.inicio, atual.fim),
      variacaoVendido: totaisAnteriores ? variacaoDe(totaisAtuais.vendido, totaisAnteriores.vendido) : null,
      variacaoRecebido: totaisAnteriores ? variacaoDe(totaisAtuais.recebido, totaisAnteriores.recebido) : null,
      variacaoAberto: totaisAnteriores ? variacaoDe(totaisAtuais.aberto, totaisAnteriores.aberto) : null,
    };
  }, [periodo, intervaloCustom, hoje, mapaPorDia, detalhesPorDia]);

  const intervaloEixo = modelo.serie.length > 40 ? 9 : modelo.serie.length > 14 ? 4 : 0;
  const corVendido = '#7EC8E3';
  const corRecebido = '#4CCB7A';
  const corAberto = '#FB923C';

  const escolherPreset = (id: FinanceiroPeriodo) => {
    setIntervaloCustom(null);
    setPeriodo(id);
    setMenuAberto(false);
  };

  const abrirModalPeriodo = () => {
    const inicio = dateKeyLocal(modelo.atual.inicio);
    const fim = dateKeyLocal(modelo.atual.fim);
    setRascunhoInicio(inicio);
    setRascunhoFim(fim);
    setErroPeriodo('');
    setModalPeriodo(true);
    setMenuAberto(false);
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

  const kpis: Array<{
    tipo: 'vendido' | 'recebido' | 'aberto';
    label: string;
    valor: number;
    variacao: VariacaoFinanceira | null;
    neutra: boolean;
  }> = [
    { tipo: 'vendido', label: 'Vendido', valor: modelo.totaisAtuais.vendido, variacao: modelo.variacaoVendido, neutra: false },
    { tipo: 'recebido', label: 'Recebido', valor: modelo.totaisAtuais.recebido, variacao: modelo.variacaoRecebido, neutra: false },
    { tipo: 'aberto', label: 'A receber', valor: modelo.totaisAtuais.aberto, variacao: modelo.variacaoAberto, neutra: true },
  ];

  const seriesGrafico = [
    { id: 'vendido' as const, label: 'Vendido', cor: corVendido },
    { id: 'recebido' as const, label: 'Recebido', cor: corRecebido },
    { id: 'aberto' as const, label: 'A receber', cor: corAberto },
  ];

  return (
    <div className="min-w-0 space-y-3 sm:space-y-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {kpis.map((kpi) => {
          const cor = CORES[kpi.tipo][isDark ? 'dark' : 'light'];
          return (
            <button
              key={kpi.tipo}
              type="button"
              onClick={() => onAbrirRelatorio(kpi.tipo)}
              aria-label={`Abrir relatório de ${kpi.label}`}
              className="min-w-0 cursor-pointer rounded-[20px] border border-gray-200 bg-white p-3 text-left shadow-sm transition duration-200 hover:border-gray-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-500 active:scale-[0.99] sm:p-4"
            >
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cor }} />
                <span className="truncate text-[11px] font-medium text-gray-500 sm:text-[13px]">{kpi.label}</span>
              </span>
              <p
                className="mt-2 truncate text-[clamp(0.85rem,3.2vw,1.5rem)] font-extrabold leading-none tabular-nums"
                style={{ color: cor }}
              >
                {fmtMoeda(kpi.valor)}
              </p>
              {kpi.variacao ? (
                <p
                  className="mt-1.5 line-clamp-2 text-[10px] font-medium leading-tight sm:text-[11px]"
                  style={{ color: corVariacao(kpi.variacao, kpi.neutra, isDark) }}
                >
                  {textoVariacao(kpi.variacao)}
                  {kpi.variacao.kind === 'sem-base' ? null : (
                    <span className="font-normal text-gray-400"> vs. período anterior</span>
                  )}
                </p>
              ) : (
                <p className="mt-1.5 text-[10px] font-medium text-gray-400 sm:text-[11px]">desde o início</p>
              )}
            </button>
          );
        })}
      </div>

      <section
        className="min-w-0 overflow-hidden p-4 shadow-[0_8px_24px_rgba(10,31,68,0.18)] sm:p-6"
        style={{ backgroundColor: ORGANIZATION_METODO_SECONDARY_COLOR, borderRadius: 20 }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
              <DollarSign className="h-4 w-4" aria-hidden />
            </span>
            <p className="truncate text-sm font-medium text-white/80">Vendas</p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <div className="hidden items-center gap-1 rounded-full bg-white/10 p-1 lg:flex">
              {PERIODOS_FINANCEIRO.map((item) => {
                const ativo = !intervaloCustom && item.id === periodo;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => escolherPreset(item.id)}
                    aria-pressed={ativo}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${ativo ? '' : 'text-white/80 hover:bg-white/10'}`}
                    style={ativo ? { backgroundColor: '#E8EDED', color: '#0A1F44' } : undefined}
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
                  ? { backgroundColor: '#E8EDED', color: '#0A1F44' }
                  : { backgroundColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }
              }
            >
              Período
            </button>
            <div ref={menuRef} className="relative lg:hidden">
              <button
                type="button"
                onClick={() => setMenuAberto((aberto) => !aberto)}
                className="inline-flex items-center gap-0.5 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-medium text-white/80"
                aria-haspopup="listbox"
                aria-expanded={menuAberto}
                aria-label={`Filtro: ${intervaloCustom ? 'período personalizado' : periodo}`}
              >
                {intervaloCustom ? 'Datas' : periodo}
                <ChevronDown className="h-3 w-3 opacity-80" />
              </button>
              {menuAberto ? (
                <div
                  className="absolute right-0 z-20 mt-1 min-w-[88px] overflow-hidden rounded-xl border border-white/10 py-1 shadow-lg"
                  style={{ backgroundColor: ORGANIZATION_METODO_SECONDARY_COLOR }}
                >
                  {PERIODOS_FINANCEIRO.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="option"
                      aria-selected={!intervaloCustom && item.id === periodo}
                      onClick={() => escolherPreset(item.id)}
                      className={`block w-full px-3 py-1.5 text-left text-xs ${
                        !intervaloCustom && item.id === periodo
                          ? 'bg-white/10 font-semibold text-[#4CCB7A]'
                          : 'text-white/80 hover:bg-white/5'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <p className="mt-3 truncate text-[clamp(1.6rem,4vw,2.25rem)] font-extrabold leading-none tabular-nums text-white">
          {fmtMoeda(modelo.totaisAtuais.vendido)}
        </p>
        {modelo.variacaoVendido ? (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] sm:text-[13px]">
            <span className="font-semibold" style={{ color: corVariacao(modelo.variacaoVendido, false, true) }}>
              {textoVariacao(modelo.variacaoVendido)}
            </span>
            <span className="text-white/75">
              {fmtDelta(modelo.variacaoVendido.delta)} vs. período anterior
            </span>
          </p>
        ) : (
          <p className="mt-2 text-[12px] text-white/70 sm:text-[13px]">Tudo registrado até o último vencimento</p>
        )}

        <div className="mt-4 h-36 min-w-0 sm:h-44 lg:h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={modelo.serie} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradVendido} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={corVendido} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={corVendido} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id={gradRecebido} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={corRecebido} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={corRecebido} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id={gradAberto} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={corAberto} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={corAberto} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fill: 'rgba(232,237,237,0.65)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={intervaloEixo}
                minTickGap={8}
              />
              <YAxis
                width={36}
                tick={{ fill: 'rgba(232,237,237,0.55)', fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(valor: number) =>
                  valor >= 1000 ? `${Math.round(valor / 1000)}k` : String(Math.round(valor))
                }
              />
              <Tooltip
                cursor={{ stroke: 'rgba(255,255,255,0.25)' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-xl border border-white/10 bg-[#0A1F44] px-3 py-2 text-xs text-white shadow-lg">
                      <p className="text-white/70">{label}</p>
                      {payload.map((item) => (
                        <p key={String(item.dataKey)} className="mt-0.5 flex items-center gap-1.5 font-semibold tabular-nums">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                          {fmtMoeda(Number(item.value) || 0)}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="vendido" name="Vendido" hide={!seriesVisiveis.vendido} stroke={corVendido} strokeWidth={2} fill={`url(#${gradVendido})`} dot={false} activeDot={{ r: 3, fill: corVendido }} />
              <Area type="monotone" dataKey="recebido" name="Recebido" hide={!seriesVisiveis.recebido} stroke={corRecebido} strokeWidth={2} fill={`url(#${gradRecebido})`} dot={false} activeDot={{ r: 3, fill: corRecebido }} />
              <Area type="monotone" dataKey="aberto" name="A receber" hide={!seriesVisiveis.aberto} stroke={corAberto} strokeWidth={2} fill={`url(#${gradAberto})`} dot={false} activeDot={{ r: 3, fill: corAberto }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {seriesGrafico.map((serie) => {
            const ativa = seriesVisiveis[serie.id];
            return (
              <button
                key={serie.id}
                type="button"
                aria-pressed={ativa}
                onClick={() => setSeriesVisiveis((atual) => ({ ...atual, [serie.id]: !atual[serie.id] }))}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
                style={{ backgroundColor: ativa ? 'rgba(255,255,255,0.14)' : 'transparent', opacity: ativa ? 1 : 0.45 }}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: serie.cor }} />
                {serie.label}
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="min-w-0 rounded-[18px] border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
          <p className="truncate text-[11px] font-medium text-gray-500 sm:text-[13px]">Vendas</p>
          <p className="mt-1 truncate text-[clamp(1.25rem,3.4vw,2rem)] font-extrabold leading-none tabular-nums text-gray-900">
            {modelo.totaisAtuais.vendas.toLocaleString('pt-BR')}
          </p>
          <p className="mt-2 truncate text-[11px] text-gray-400">no período</p>
        </div>
        <div className="min-w-0 rounded-[18px] border border-gray-200 bg-white p-3 shadow-sm sm:p-5">
          <p className="truncate text-[11px] font-medium text-gray-500 sm:text-[13px]">Ticket médio</p>
          <p className="mt-1 truncate text-[clamp(1rem,3vw,2rem)] font-extrabold leading-none tabular-nums text-gray-900">
            {fmtMoeda(modelo.ticket)}
          </p>
          <p className="mt-2 truncate text-[11px] text-gray-400">por venda no período</p>
        </div>
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
                aria-labelledby="financeiro-periodo-titulo"
                className="box-border w-full min-w-0 max-w-sm overflow-hidden rounded-2xl bg-white p-4 shadow-xl sm:p-5"
                onClick={(event) => event.stopPropagation()}
              >
                <h2 id="financeiro-periodo-titulo" className="text-base font-semibold text-gray-900">
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
                    style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}
                  />
                </label>
                <label className="mt-3 block min-w-0 text-xs font-medium text-gray-600">
                  Data final
                  <input
                    type="date"
                    value={rascunhoFim}
                    onChange={(event) => setRascunhoFim(event.target.value)}
                    className="mt-1 box-border block w-full min-w-0 max-w-full rounded-xl border border-gray-200 px-2 py-2 text-sm text-gray-900"
                    style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}
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
                    style={{ backgroundColor: ORGANIZATION_METODO_SECONDARY_COLOR }}
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
