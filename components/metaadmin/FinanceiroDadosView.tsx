'use client';

import { Fragment, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type FinanceiroMesLinha = {
  ano: number;
  mes: number;
  recebido: number;
  vendido: number;
  aberto: number;
  nome: string;
  nomeAbrev: string;
};

export type FinanceiroDetalheItem = {
  tipo: 'paciente' | 'venda_avulsa';
  nome: string;
  valor: number;
  data: string;
};

export type FinanceiroDemoLinha = {
  nome: string;
  vendido: number;
  recebido: number;
  aberto: number;
};

type DetalhesMes = {
  vendido: FinanceiroDetalheItem[];
  recebido: FinanceiroDetalheItem[];
  aberto: FinanceiroDetalheItem[];
};

type DetalhesLookup = {
  get: (key: string) => DetalhesMes | undefined;
};

type Props = {
  isMobile: boolean;
  isDark: boolean;
  porMes: FinanceiroMesLinha[];
  detalhesPorMes: DetalhesLookup;
  porCidade: FinanceiroDemoLinha[];
  porRegiao: FinanceiroDemoLinha[];
  porSexo: FinanceiroDemoLinha[];
  filtroAno: string | number;
  filtroMes: string | number;
  onFiltroAno: (value: string | number) => void;
  onFiltroMes: (value: string | number) => void;
  linhasExpandidas: Set<string>;
  onToggleLinha: (key: string) => void;
  onVoltar: () => void;
};

const MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

type Serie = 'vendido' | 'recebido' | 'aberto';

const SERIE_LABEL: Record<Serie, string> = {
  vendido: 'Vendido',
  recebido: 'Recebido',
  aberto: 'Aberto',
};

function palette(isDark: boolean) {
  return {
    vendido: isDark ? '#7EC8E3' : '#2563eb',
    recebido: isDark ? '#4CCB7A' : '#059669',
    aberto: isDark ? '#F5C16C' : '#d97706',
    grid: isDark ? 'rgba(232,237,237,0.14)' : '#f3f4f6',
    tick: isDark ? '#E8EDED' : '#6b7280',
    tooltipBg: isDark ? '#0A1F44' : '#ffffff',
    tooltipBorder: isDark ? 'rgba(255,255,255,0.14)' : '#e5e7eb',
    tooltipText: isDark ? '#E8EDED' : '#111827',
    muted: isDark ? 'rgba(232,237,237,0.65)' : '#6b7280',
  };
}

function fmtBrl(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

function fmtAxis(value: unknown) {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return '';
  const abs = Math.abs(numeric);
  if (abs >= 1_000_000) {
    return `${(numeric / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  }
  if (abs >= 1_000) {
    return `${Math.round(numeric / 1_000).toLocaleString('pt-BR')} mil`;
  }
  return Math.round(numeric).toLocaleString('pt-BR');
}

function shareLabel(part: number, total: number) {
  if (total <= 0 || part <= 0) return '0% do vendido';
  const pct = Math.round((part / total) * 100);
  return `${pct}% do vendido`;
}

function truncate(label: unknown, max: number) {
  const text = typeof label === 'string' ? label : label == null ? '' : String(label);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function MoneyTooltip({
  active,
  payload,
  label,
  colors,
}: {
  active?: boolean;
  payload?: Array<{
    dataKey?: string | number;
    value?: number;
    color?: string;
    name?: string;
    payload?: { nome?: string; nomeAbrev?: string };
  }>;
  label?: string;
  colors: ReturnType<typeof palette>;
}) {
  if (!active || !payload?.length) return null;
  const titulo = payload[0]?.payload?.nome || payload[0]?.payload?.nomeAbrev || label;
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs shadow-lg"
      style={{
        backgroundColor: colors.tooltipBg,
        border: `1px solid ${colors.tooltipBorder}`,
        color: colors.tooltipText,
      }}
    >
      <p className="mb-1.5 font-semibold">{titulo}</p>
      <ul className="space-y-1">
        {payload.map((item) => (
          <li key={String(item.dataKey)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              {SERIE_LABEL[item.dataKey as Serie] || item.name}
            </span>
            <span className="font-semibold tabular-nums">{fmtBrl(Number(item.value || 0))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SerieLegend({ colors }: { colors: ReturnType<typeof palette> }) {
  const items: Array<{ key: Serie; color: string }> = [
    { key: 'vendido', color: colors.vendido },
    { key: 'recebido', color: colors.recebido },
    { key: 'aberto', color: colors.aberto },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-1.5 text-[12px] text-gray-600 dark:text-gray-300">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          {SERIE_LABEL[item.key]}
        </li>
      ))}
    </ul>
  );
}

function KpiCard({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: number;
  color: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        <p className="text-[13px] font-medium text-gray-500">{label}</p>
      </div>
      <p className="mt-2 text-[22px] font-extrabold leading-none tabular-nums sm:text-[28px]" style={{ color }}>
        {fmtBrl(value)}
      </p>
      <p className="mt-2 text-[12px] text-gray-500">{hint}</p>
    </div>
  );
}

function MixBar({
  vendido,
  recebido,
  aberto,
  colors,
}: {
  vendido: number;
  recebido: number;
  aberto: number;
  colors: ReturnType<typeof palette>;
}) {
  const total = Math.max(vendido, 0) + Math.max(recebido, 0) + Math.max(aberto, 0);
  if (total <= 0) {
    return <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700" />;
  }
  const parts = [
    { value: Math.max(vendido, 0), color: colors.vendido },
    { value: Math.max(recebido, 0), color: colors.recebido },
    { value: Math.max(aberto, 0), color: colors.aberto },
  ];
  return (
    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
      {parts.map((part) =>
        part.value > 0 ? (
          <span
            key={part.color}
            style={{ width: `${(part.value / total) * 100}%`, backgroundColor: part.color }}
          />
        ) : null
      )}
    </div>
  );
}

function DetalheLista({
  titulo,
  itens,
  color,
}: {
  titulo: string;
  itens: FinanceiroDetalheItem[];
  color: string;
}) {
  const total = itens.reduce((sum, item) => sum + item.valor, 0);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h4 className="text-[13px] font-semibold" style={{ color }}>
          {titulo}
        </h4>
        <span className="text-[12px] font-semibold tabular-nums text-gray-700 dark:text-gray-200">{fmtBrl(total)}</span>
      </div>
      {itens.length === 0 ? (
        <p className="text-[12px] text-gray-500">Nenhum lançamento</p>
      ) : (
        <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {itens.map((item, index) => (
            <li key={`${item.nome}-${item.data}-${index}`} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-gray-900 dark:text-white" title={item.nome}>
                  {item.nome}
                </p>
                <p className="text-[11px] text-gray-500">
                  {item.tipo === 'venda_avulsa' ? 'Venda avulsa' : 'Paciente'} · {item.data}
                </p>
              </div>
              <span className="shrink-0 text-[13px] font-semibold tabular-nums text-gray-900 dark:text-white">
                {fmtBrl(item.valor)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DemoTabela({
  rotulo,
  rows,
  colors,
}: {
  rotulo: string;
  rows: FinanceiroDemoLinha[];
  colors: ReturnType<typeof palette>;
}) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-left text-[12px] font-medium text-gray-500 dark:bg-gray-700/40">
            <th className="px-3 py-2.5 font-medium">{rotulo}</th>
            <th className="px-3 py-2.5 text-right font-medium" style={{ color: colors.vendido }}>
              Vendido
            </th>
            <th className="px-3 py-2.5 text-right font-medium" style={{ color: colors.recebido }}>
              Recebido
            </th>
            <th className="px-3 py-2.5 text-right font-medium" style={{ color: colors.aberto }}>
              Aberto
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.nome} className="border-t border-gray-100 dark:border-gray-700">
              <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white">{row.nome}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-gray-800 dark:text-gray-100">{fmtBrl(row.vendido)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-gray-800 dark:text-gray-100">{fmtBrl(row.recebido)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-gray-800 dark:text-gray-100">{fmtBrl(row.aberto)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DemoCards({ rows, colors }: { rows: FinanceiroDemoLinha[]; colors: ReturnType<typeof palette> }) {
  const max = Math.max(...rows.map((row) => Math.max(row.vendido, row.recebido, row.aberto, 0)), 1);
  return (
    <ul className="space-y-3 md:hidden">
      {rows.map((row) => (
        <li key={row.nome} className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-700/40">
          <p className="text-[14px] font-semibold text-gray-900 dark:text-white">{row.nome}</p>
          <div className="mt-2 space-y-1.5">
            {(['vendido', 'recebido', 'aberto'] as Serie[]).map((key) => (
              <div key={key}>
                <div className="mb-0.5 flex items-center justify-between gap-2 text-[12px]">
                  <span className="text-gray-500">{SERIE_LABEL[key]}</span>
                  <span className="font-semibold tabular-nums text-gray-900 dark:text-white">{fmtBrl(row[key])}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white dark:bg-gray-800">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: row[key] > 0 ? `${Math.max(6, (row[key] / max) * 100)}%` : '0%',
                      backgroundColor: colors[key],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function FinanceiroDadosView({
  isMobile,
  isDark,
  porMes,
  detalhesPorMes,
  porCidade,
  porRegiao,
  porSexo,
  filtroAno,
  filtroMes,
  onFiltroAno,
  onFiltroMes,
  linhasExpandidas,
  onToggleLinha,
  onVoltar,
}: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mostrarTodasCidades, setMostrarTodasCidades] = useState(false);
  const colors = palette(isDark);
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();

  useEffect(() => {
    setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const anosDisponiveis = (() => {
    const anos = [...new Set(porMes.map((item) => item.ano))].sort((a, b) => a - b);
    if (anos.length === 0) return [anoAtual - 1, anoAtual, anoAtual + 1];
    return anos;
  })();

  const porMesFiltrado = porMes.filter((item) => {
    const matchAno = filtroAno === 'todos' || filtroAno === item.ano;
    const matchMes = filtroMes === 'todos' || filtroMes === item.mes;
    return matchAno && matchMes;
  });

  const totalVendido = porMesFiltrado.reduce((sum, item) => sum + item.vendido, 0);
  const totalRecebido = porMesFiltrado.reduce((sum, item) => sum + item.recebido, 0);
  const totalAberto = Math.max(0, porMesFiltrado.reduce((sum, item) => sum + (item.aberto || 0), 0));

  const cidadesVisiveis = mostrarTodasCidades ? porCidade : porCidade.slice(0, 8);
  const temDemo = porCidade.length > 0 || porRegiao.length > 0 || porSexo.length > 0;
  const sexoSlices = porSexo
    .map((item) => ({
      ...item,
      valor: item.vendido > 0 ? item.vendido : item.recebido,
      color:
        item.nome === 'Feminino' ? colors.recebido : item.nome === 'Masculino' ? colors.vendido : colors.aberto,
    }))
    .filter((item) => item.valor > 0);
  const sexoTotal = sexoSlices.reduce((sum, item) => sum + item.valor, 0);

  const chartHeight = isMobile ? 260 : 300;
  const chartMinWidth = isMobile && porMesFiltrado.length > 6 ? porMesFiltrado.length * 52 : undefined;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">Dados Financeiros</h2>
          <p className="mt-1 text-[13px] text-gray-500">Vendido, recebido e em aberto no período filtrado.</p>
        </div>
        <button
          type="button"
          onClick={onVoltar}
          className="inline-flex items-center justify-center gap-1.5 self-start rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-900 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-gray-500">Ano</span>
          <select
            value={filtroAno}
            onChange={(event) => onFiltroAno(event.target.value === 'todos' ? 'todos' : parseInt(event.target.value, 10))}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="todos">Todos</option>
            {anosDisponiveis.map((ano) => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-gray-500">Mês</span>
          <select
            value={filtroMes}
            onChange={(event) => onFiltroMes(event.target.value === 'todos' ? 'todos' : parseInt(event.target.value, 10))}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="todos">Todos</option>
            {MESES.map((nome, index) => (
              <option key={nome} value={index}>
                {nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard label="Vendido" value={totalVendido} color={colors.vendido} hint="Total previsto no período" />
        <KpiCard label="Recebido" value={totalRecebido} color={colors.recebido} hint={shareLabel(totalRecebido, totalVendido)} />
        <KpiCard label="Aberto" value={totalAberto} color={colors.aberto} hint={shareLabel(totalAberto, totalVendido)} />
      </div>

      {porMesFiltrado.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-12 text-center dark:border-gray-600 dark:bg-gray-800">
          <p className="text-sm text-gray-500">Nenhum dado financeiro encontrado para os filtros selecionados.</p>
        </div>
      ) : (
        <>
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">Evolução mensal</h3>
              <SerieLegend colors={colors} />
            </div>
            <div className="w-full overflow-x-auto">
              <div style={{ height: chartHeight, minWidth: chartMinWidth }} role="img" aria-label="Gráfico de vendido, recebido e aberto por mês">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porMesFiltrado} margin={{ top: 8, right: 4, left: 0, bottom: 4 }} barCategoryGap={isMobile ? '22%' : '28%'}>
                    <CartesianGrid stroke={colors.grid} vertical={false} />
                    <XAxis
                      dataKey="nomeAbrev"
                      tick={{ fontSize: 11, fill: colors.tick }}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      height={32}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: colors.tick }}
                      tickLine={false}
                      axisLine={false}
                      width={isMobile ? 42 : 52}
                      tickFormatter={fmtAxis}
                    />
                    <Tooltip content={<MoneyTooltip colors={colors} />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.04)' }} />
                    <Bar dataKey="vendido" fill={colors.vendido} radius={[5, 5, 0, 0]} maxBarSize={isMobile ? 14 : 22} isAnimationActive={!reduceMotion} />
                    <Bar dataKey="recebido" fill={colors.recebido} radius={[5, 5, 0, 0]} maxBarSize={isMobile ? 14 : 22} isAnimationActive={!reduceMotion} />
                    <Bar dataKey="aberto" fill={colors.aberto} radius={[5, 5, 0, 0]} maxBarSize={isMobile ? 14 : 22} isAnimationActive={!reduceMotion} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700 sm:px-5">
              <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">Por mês</h3>
            </div>

            <ul className="divide-y divide-gray-200 dark:divide-gray-700 md:hidden">
              {porMesFiltrado.map((item) => {
                const key = `${item.ano}-${item.mes}`;
                const aberto = item.aberto || 0;
                const expandido = linhasExpandidas.has(key);
                const detalhes = detalhesPorMes.get(key);
                const ehMesAtual = item.mes === mesAtual && item.ano === anoAtual;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      onClick={() => onToggleLinha(key)}
                      className={`w-full px-4 py-3 text-left ${ehMesAtual ? 'bg-gray-100 dark:bg-white/10' : ''}`}
                      aria-expanded={expandido}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ChevronRight className={`h-4 w-4 text-gray-500 transition-transform ${expandido ? 'rotate-90' : ''}`} />
                          <span className="text-[15px] font-semibold text-gray-900 dark:text-white">{item.nome}</span>
                        </div>
                        {ehMesAtual ? (
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-white/10 dark:text-gray-200">
                            Este mês
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <Metric label="Vendido" value={item.vendido} color={colors.vendido} />
                        <Metric label="Recebido" value={item.recebido} color={colors.recebido} />
                        <Metric label="Aberto" value={aberto} color={colors.aberto} />
                      </div>
                      <div className="mt-3">
                        <MixBar vendido={item.vendido} recebido={item.recebido} aberto={aberto} colors={colors} />
                      </div>
                    </button>
                    {expandido && detalhes ? <DetalhePainel detalhes={detalhes} colors={colors} /> : null}
                  </li>
                );
              })}
              <li className="px-4 py-3">
                <p className="text-[13px] font-semibold text-gray-900 dark:text-white">Total</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <Metric label="Vendido" value={totalVendido} color={colors.vendido} />
                  <Metric label="Recebido" value={totalRecebido} color={colors.recebido} />
                  <Metric label="Aberto" value={totalAberto} color={colors.aberto} />
                </div>
              </li>
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[12px] text-gray-500">
                    <th className="w-10 px-2 py-3" />
                    <th className="px-3 py-3 text-left font-medium">Mês</th>
                    <th className="px-3 py-3 text-right font-medium" style={{ color: colors.vendido }}>
                      Vendido
                    </th>
                    <th className="px-3 py-3 text-right font-medium" style={{ color: colors.recebido }}>
                      Recebido
                    </th>
                    <th className="px-3 py-3 text-right font-medium" style={{ color: colors.aberto }}>
                      Aberto
                    </th>
                    <th className="w-36 px-3 py-3 text-left font-medium">Composição</th>
                  </tr>
                </thead>
                <tbody>
                  {porMesFiltrado.map((item) => {
                    const key = `${item.ano}-${item.mes}`;
                    const aberto = item.aberto || 0;
                    const expandido = linhasExpandidas.has(key);
                    const detalhes = detalhesPorMes.get(key);
                    const ehMesAtual = item.mes === mesAtual && item.ano === anoAtual;
                    return (
                      <Fragment key={key}>
                        <tr className={ehMesAtual ? 'bg-gray-100 dark:bg-white/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => onToggleLinha(key)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-white/10"
                              aria-label={expandido ? 'Recolher detalhes' : 'Expandir detalhes'}
                              aria-expanded={expandido}
                            >
                              <ChevronRight className={`h-4 w-4 transition-transform ${expandido ? 'rotate-90' : ''}`} />
                            </button>
                          </td>
                          <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white">
                            {item.nome}
                            {ehMesAtual ? <span className="ml-2 text-[11px] font-medium text-gray-500">Este mês</span> : null}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums" style={{ color: colors.vendido }}>
                            {fmtBrl(item.vendido)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums" style={{ color: colors.recebido }}>
                            {fmtBrl(item.recebido)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums" style={{ color: colors.aberto }}>
                            {fmtBrl(aberto)}
                          </td>
                          <td className="px-3 py-2.5">
                            <MixBar vendido={item.vendido} recebido={item.recebido} aberto={aberto} colors={colors} />
                          </td>
                        </tr>
                        {expandido && detalhes ? (
                          <tr>
                            <td colSpan={6} className="bg-gray-50 px-4 py-3 dark:bg-gray-700/40">
                              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                                <DetalheLista titulo="Vendido" itens={detalhes.vendido} color={colors.vendido} />
                                <DetalheLista titulo="Recebido" itens={detalhes.recebido} color={colors.recebido} />
                                <DetalheLista titulo="Aberto" itens={detalhes.aberto} color={colors.aberto} />
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 font-bold dark:border-gray-600">
                    <td />
                    <td className="px-3 py-3 text-gray-900 dark:text-white">Total</td>
                    <td className="px-3 py-3 text-right tabular-nums" style={{ color: colors.vendido }}>
                      {fmtBrl(totalVendido)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums" style={{ color: colors.recebido }}>
                      {fmtBrl(totalRecebido)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums" style={{ color: colors.aberto }}>
                      {fmtBrl(totalAberto)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </>
      )}

      {temDemo ? (
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Resultado demográfico</h3>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {porSexo.length > 0 ? (
              <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
                <h4 className="text-[15px] font-semibold text-gray-900 dark:text-white">Por sexo</h4>
                <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                  {sexoSlices.length === 0 ? (
                    <p className="py-6 text-[13px] text-gray-500">Sem valores para este recorte.</p>
                  ) : (
                  <div className="relative h-[148px] w-[148px] shrink-0" role="img" aria-label="Distribuição do vendido por sexo">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sexoSlices}
                          dataKey="valor"
                          nameKey="nome"
                          innerRadius="68%"
                          outerRadius="96%"
                          paddingAngle={sexoSlices.length > 1 ? 2 : 0}
                          stroke="none"
                          isAnimationActive={!reduceMotion}
                        >
                          {sexoSlices.map((slice) => (
                            <Cell key={slice.nome} fill={slice.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [fmtBrl(Number(value || 0)), String(name)]}
                          contentStyle={{
                            backgroundColor: colors.tooltipBg,
                            border: `1px solid ${colors.tooltipBorder}`,
                            borderRadius: 12,
                            color: colors.tooltipText,
                            fontSize: 12,
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[13px] font-extrabold tabular-nums text-gray-900 dark:text-white">{fmtAxis(sexoTotal)}</span>
                      <span className="text-[11px] text-gray-500">vendido</span>
                    </div>
                  </div>
                  )}
                  <ul className="w-full min-w-0 flex-1 space-y-2">
                    {porSexo.map((item) => (
                      <li key={item.nome} className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="font-medium text-gray-900 dark:text-white">{item.nome}</span>
                        <span className="tabular-nums text-gray-600">{fmtBrl(item.vendido)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4">
                  <DemoCards rows={porSexo} colors={colors} />
                  <DemoTabela rotulo="Sexo" rows={porSexo} colors={colors} />
                </div>
              </article>
            ) : null}

            {porRegiao.length > 0 ? (
              <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="text-[15px] font-semibold text-gray-900 dark:text-white">Por região</h4>
                  <SerieLegend colors={colors} />
                </div>
                <div style={{ height: Math.max(180, porRegiao.length * (isMobile ? 46 : 40)) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={porRegiao}
                      layout="vertical"
                      margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                      barCategoryGap="28%"
                    >
                      <CartesianGrid stroke={colors.grid} horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="nome"
                        allowDuplicatedCategory={false}
                        width={isMobile ? 72 : 88}
                        tick={{ fontSize: 11, fill: colors.tick }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => truncate(value, isMobile ? 10 : 14)}
                      />
                      <Tooltip content={<MoneyTooltip colors={colors} />} />
                      <Bar dataKey="vendido" fill={colors.vendido} radius={[0, 4, 4, 0]} maxBarSize={10} isAnimationActive={!reduceMotion} />
                      <Bar dataKey="recebido" fill={colors.recebido} radius={[0, 4, 4, 0]} maxBarSize={10} isAnimationActive={!reduceMotion} />
                      <Bar dataKey="aberto" fill={colors.aberto} radius={[0, 4, 4, 0]} maxBarSize={10} isAnimationActive={!reduceMotion} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4">
                  <DemoCards rows={porRegiao} colors={colors} />
                  <DemoTabela rotulo="Região" rows={porRegiao} colors={colors} />
                </div>
              </article>
            ) : null}
          </div>

          {porCidade.length > 0 ? (
            <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h4 className="text-[15px] font-semibold text-gray-900 dark:text-white">Por cidade</h4>
                <SerieLegend colors={colors} />
              </div>
              <div style={{ height: Math.max(200, cidadesVisiveis.length * (isMobile ? 48 : 42)) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cidadesVisiveis}
                    layout="vertical"
                    margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                    barCategoryGap="26%"
                  >
                    <CartesianGrid stroke={colors.grid} horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      allowDuplicatedCategory={false}
                      width={isMobile ? 108 : 150}
                      tick={{ fontSize: 11, fill: colors.tick }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => truncate(value, isMobile ? 16 : 22)}
                    />
                    <Tooltip content={<MoneyTooltip colors={colors} />} />
                    <Bar dataKey="vendido" fill={colors.vendido} radius={[0, 4, 4, 0]} maxBarSize={10} isAnimationActive={!reduceMotion} />
                    <Bar dataKey="recebido" fill={colors.recebido} radius={[0, 4, 4, 0]} maxBarSize={10} isAnimationActive={!reduceMotion} />
                    <Bar dataKey="aberto" fill={colors.aberto} radius={[0, 4, 4, 0]} maxBarSize={10} isAnimationActive={!reduceMotion} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <DemoCards rows={cidadesVisiveis} colors={colors} />
                <DemoTabela rotulo="Cidade" rows={cidadesVisiveis} colors={colors} />
              </div>
              {porCidade.length > 8 ? (
                <button
                  type="button"
                  onClick={() => setMostrarTodasCidades((atual) => !atual)}
                  className="mt-3 text-[13px] font-medium text-gray-700 hover:text-gray-900 dark:text-gray-200"
                >
                  {mostrarTodasCidades ? 'Mostrar menos' : `Mostrar todas (${porCidade.length})`}
                </button>
              ) : null}
            </article>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-bold tabular-nums" style={{ color }}>
        {fmtBrl(value)}
      </p>
    </div>
  );
}

function DetalhePainel({ detalhes, colors }: { detalhes: DetalhesMes; colors: ReturnType<typeof palette> }) {
  return (
    <div className="space-y-3 bg-gray-50 px-4 py-3 dark:bg-gray-700/40">
      <DetalheLista titulo="Vendido" itens={detalhes.vendido} color={colors.vendido} />
      <DetalheLista titulo="Recebido" itens={detalhes.recebido} color={colors.recebido} />
      <DetalheLista titulo="Aberto" itens={detalhes.aberto} color={colors.aberto} />
    </div>
  );
}
