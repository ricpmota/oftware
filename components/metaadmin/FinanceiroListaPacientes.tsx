'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Clock3, MapPin, Search, Tag, Wallet } from 'lucide-react';
import CalendarioPacienteAuthAvatar from '@/components/metaadmin/CalendarioPacienteAuthAvatar';

export type FinanceiroListaStatus = 'pago' | 'iniciou_pagamento' | 'em_aberto' | string;

export type FinanceiroListaPacienteItem = {
  id: string;
  nome: string;
  local?: string;
  photoUrl?: string | null;
  total: number;
  pago: number;
  aberto: number;
  status: FinanceiroListaStatus;
  vencido?: boolean;
  recenteEm?: number;
};

export type FinanceiroListaVendaItem = {
  id: string;
  titulo: string;
  cliente?: string;
  local?: string;
  photoUrl?: string | null;
  total: number;
  pago: number;
  aberto: number;
  status: FinanceiroListaStatus;
  vencido?: boolean;
  recenteEm?: number;
};

type Props = {
  isDark: boolean;
  busca: string;
  onBusca: (value: string) => void;
  statusFiltro: string;
  onStatusFiltro: (value: string) => void;
  pacientes: FinanceiroListaPacienteItem[];
  vendas: FinanceiroListaVendaItem[];
  onOpenPaciente: (id: string) => void;
  onOpenVenda: (id: string) => void;
};

type Faixa = 'pago' | 'parcial' | 'aberto' | 'vencido' | 'outro';
type Ordenacao = 'nome-az' | 'nome-za' | 'maior-valor' | 'menor-valor' | 'maior-aberto' | 'recentes';

type Linha = {
  key: string;
  kind: 'paciente' | 'venda';
  id: string;
  nome: string;
  local?: string;
  cliente?: string;
  photoUrl?: string | null;
  total: number;
  pago: number;
  aberto: number;
  status: string;
  vencido: boolean;
  recenteEm: number;
  faixa: Faixa;
};

const ORDENACOES: { id: Ordenacao; label: string }[] = [
  { id: 'nome-az', label: 'Nome (A-Z)' },
  { id: 'nome-za', label: 'Nome (Z-A)' },
  { id: 'maior-valor', label: 'Maior valor' },
  { id: 'menor-valor', label: 'Menor valor' },
  { id: 'maior-aberto', label: 'Maior valor em aberto' },
  { id: 'recentes', label: 'Mais recentes' },
];

function palette(isDark: boolean) {
  return {
    pago: isDark ? '#4CCB7A' : 'var(--state-success)',
    aberto: isDark ? '#F5C16C' : 'var(--state-warning)',
    total: isDark ? '#E8EDED' : 'var(--text-primary)',
    track: isDark ? 'rgba(245,193,108,0.22)' : '#fef3c7',
    chipTodos: isDark ? 'rgba(76,203,122,0.18)' : '#ecfdf5',
    chipAberto: isDark ? 'rgba(245,193,108,0.18)' : '#fff7ed',
    chipParcial: isDark ? 'rgba(250,204,21,0.16)' : '#fefce8',
    chipPago: isDark ? 'rgba(76,203,122,0.14)' : '#f0fdf4',
    chipVencido: isDark ? 'rgba(248,113,113,0.18)' : '#fff1f2',
  };
}

function fmtBrl(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtPct(value: number) {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function percentualPago(total: number, pago: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((pago / total) * 100)));
}

function faixaDe(status: string, vencido: boolean): Faixa {
  if (status === 'pago') return 'pago';
  if (vencido) return 'vencido';
  if (status === 'iniciou_pagamento') return 'parcial';
  if (status === 'em_aberto') return 'aberto';
  return 'outro';
}

function statusMeta(faixa: Faixa) {
  if (faixa === 'pago') return { label: 'Pago', className: 'bg-green-100 text-green-800' };
  if (faixa === 'parcial') return { label: 'Parcial', className: 'bg-yellow-100 text-yellow-800' };
  if (faixa === 'vencido') return { label: 'Vencido', className: 'bg-red-200 text-red-800' };
  if (faixa === 'aberto') return { label: 'Aberto', className: 'bg-red-100 text-red-800' };
  return { label: 'Negociação', className: 'bg-gray-100 text-gray-800' };
}

function combinaFaixa(filtro: string, linha: Linha) {
  if (!filtro || filtro === 'todos') return true;
  if (filtro === 'vencido') return linha.vencido;
  if (filtro === 'pago') return linha.status === 'pago';
  if (filtro === 'iniciou_pagamento') return linha.status === 'iniciou_pagamento';
  if (filtro === 'em_aberto') return linha.status === 'em_aberto';
  return linha.status === filtro;
}

export default function FinanceiroListaPacientes({
  isDark,
  busca,
  onBusca,
  statusFiltro,
  onStatusFiltro,
  pacientes,
  vendas,
  onOpenPaciente,
  onOpenVenda,
}: Props) {
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('nome-az');
  const colors = palette(isDark);

  const linhas = useMemo<Linha[]>(() => {
    const dePacientes: Linha[] = pacientes.map((item) => ({
      key: `paciente-${item.id}`,
      kind: 'paciente',
      id: item.id,
      nome: item.nome,
      local: item.local,
      photoUrl: item.photoUrl,
      total: item.total,
      pago: item.pago,
      aberto: item.aberto,
      status: item.status,
      vencido: Boolean(item.vencido),
      recenteEm: item.recenteEm || 0,
      faixa: faixaDe(item.status, Boolean(item.vencido)),
    }));
    const deVendas: Linha[] = vendas.map((item) => ({
      key: `venda-${item.id}`,
      kind: 'venda',
      id: item.id,
      nome: item.titulo,
      local: item.local,
      cliente: item.cliente,
      photoUrl: item.photoUrl,
      total: item.total,
      pago: item.pago,
      aberto: item.aberto,
      status: item.status,
      vencido: Boolean(item.vencido),
      recenteEm: item.recenteEm || 0,
      faixa: faixaDe(item.status, Boolean(item.vencido)),
    }));
    return [...dePacientes, ...deVendas];
  }, [pacientes, vendas]);

  const contagens = useMemo(() => {
    const base = { todos: linhas.length, aberto: 0, parcial: 0, pago: 0, vencido: 0 };
    linhas.forEach((linha) => {
      if (linha.status === 'em_aberto') base.aberto += 1;
      if (linha.status === 'iniciou_pagamento') base.parcial += 1;
      if (linha.status === 'pago') base.pago += 1;
      if (linha.vencido) base.vencido += 1;
    });
    return base;
  }, [linhas]);

  const visiveis = useMemo(() => {
    const filtradas = linhas.filter((linha) => combinaFaixa(statusFiltro, linha));
    const copia = [...filtradas];
    copia.sort((a, b) => {
      if (ordenacao === 'nome-za') return b.nome.localeCompare(a.nome, 'pt-BR');
      if (ordenacao === 'maior-valor') return b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR');
      if (ordenacao === 'menor-valor') return a.total - b.total || a.nome.localeCompare(b.nome, 'pt-BR');
      if (ordenacao === 'maior-aberto') return b.aberto - a.aberto || a.nome.localeCompare(b.nome, 'pt-BR');
      if (ordenacao === 'recentes') return b.recenteEm - a.recenteEm || a.nome.localeCompare(b.nome, 'pt-BR');
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
    return copia;
  }, [linhas, ordenacao, statusFiltro]);

  const pacientesVisiveis = visiveis.filter((linha) => linha.kind === 'paciente').length;
  const vendasVisiveis = visiveis.filter((linha) => linha.kind === 'venda').length;
  const total = visiveis.reduce((sum, linha) => sum + linha.total, 0);
  const pago = visiveis.reduce((sum, linha) => sum + linha.pago, 0);
  const aberto = visiveis.reduce((sum, linha) => sum + linha.aberto, 0);
  const recebidoShare = total > 0 ? Math.min(1, Math.max(0, pago / total)) : 0;
  const abertoShareBruto = total > 0 ? Math.min(1, Math.max(0, aberto / total)) : 0;
  const somaShare = recebidoShare + abertoShareBruto;
  const recebidoLargura = somaShare > 1 ? recebidoShare / somaShare : recebidoShare;
  const abertoLargura = somaShare > 1 ? abertoShareBruto / somaShare : abertoShareBruto;
  const buscaAtiva = busca.trim().length > 0;

  const chips: { id: string; label: string; count: number; bg: string }[] = [
    { id: 'todos', label: 'Todos', count: contagens.todos, bg: colors.chipTodos },
    { id: 'em_aberto', label: 'Em aberto', count: contagens.aberto, bg: colors.chipAberto },
    { id: 'iniciou_pagamento', label: 'Parcial', count: contagens.parcial, bg: colors.chipParcial },
    { id: 'pago', label: 'Pago', count: contagens.pago, bg: colors.chipPago },
    { id: 'vencido', label: 'Vencido', count: contagens.vencido, bg: colors.chipVencido },
  ];

  return (
    <div className="space-y-3 pb-24 md:pb-0">
      <section
        className="rounded-[20px] border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <div className="grid grid-cols-3 gap-2 sm:gap-0 sm:divide-x sm:divide-gray-200">
          <Indicador
            label="Total em vendas"
            value={fmtBrl(total)}
            detalhe={`${pacientesVisiveis} paciente${pacientesVisiveis === 1 ? '' : 's'} · ${vendasVisiveis} avulsa${vendasVisiveis === 1 ? '' : 's'}`}
            color={colors.total}
          />
          <Indicador
            label="Recebido"
            value={fmtBrl(pago)}
            detalhe={`${fmtPct(recebidoShare * 100)} do total`}
            color={colors.pago}
          />
          <Indicador
            label="A receber"
            value={fmtBrl(aberto)}
            detalhe={`${fmtPct(abertoShareBruto * 100)} do total`}
            color={colors.aberto}
          />
        </div>
        <div className="mt-4">
          <div className="flex h-2 overflow-hidden rounded-full" style={{ background: colors.track }} aria-hidden>
            <span style={{ width: `${recebidoLargura * 100}%`, background: colors.pago }} />
            <span style={{ width: `${abertoLargura * 100}%`, background: colors.aberto }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] font-semibold tabular-nums">
            <span style={{ color: colors.pago }}>{fmtPct(recebidoShare * 100)}</span>
            <span style={{ color: colors.aberto }}>{fmtPct(abertoShareBruto * 100)}</span>
          </div>
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {chips.map((chip) => {
          const ativo = statusFiltro === chip.id || (chip.id === 'todos' && statusFiltro === 'todos');
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => onStatusFiltro(chip.id)}
              aria-pressed={ativo}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-[13px] font-medium transition ${
                ativo ? 'border-green-600 text-gray-900 ring-2 ring-green-600/30' : 'border-transparent text-gray-700'
              }`}
              style={{ background: chip.bg }}
            >
              <span>{chip.label}</span>
              <span className="tabular-nums text-[12px] text-gray-500">{chip.count}</span>
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder="Buscar paciente ou venda..."
          value={busca}
          onChange={(event) => onBusca(event.target.value)}
          aria-label="Buscar paciente ou venda"
          className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-[15px] font-semibold text-gray-900">Pacientes e vendas</h3>
        <label className="flex items-center gap-2 text-[13px] text-gray-500">
          <span className="shrink-0">Ordenar por</span>
          <span className="relative min-w-0 flex-1 sm:flex-none">
            <select
              value={ordenacao}
              onChange={(event) => setOrdenacao(event.target.value as Ordenacao)}
              aria-label="Ordenar lista"
              className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-8 text-[13px] font-medium text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 sm:w-auto"
            >
              {ORDENACOES.map((opcao) => (
                <option key={opcao.id} value={opcao.id}>
                  {opcao.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </span>
        </label>
      </div>

      {visiveis.length === 0 ? (
        <p className="rounded-[20px] border border-dashed border-gray-300 px-4 py-10 text-center text-sm text-gray-500">
          {buscaAtiva
            ? 'Nenhum resultado para essa busca.'
            : linhas.length > 0
              ? 'Nenhum resultado neste filtro.'
              : 'Nenhum paciente ou venda para exibir.'}
        </p>
      ) : (
        <ul className="space-y-2.5 sm:space-y-3">
          {visiveis.map((linha) => (
            <li key={linha.key}>
              <button
                type="button"
                onClick={() => (linha.kind === 'paciente' ? onOpenPaciente(linha.id) : onOpenVenda(linha.id))}
                aria-label={`Abrir financeiro de ${linha.nome}`}
                className="w-full cursor-pointer rounded-[20px] border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition duration-200 hover:border-gray-300 hover:shadow-md active:scale-[0.99] md:active:scale-100"
              >
                <CardConteudo linha={linha} colors={colors} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Indicador({
  label,
  value,
  detalhe,
  color,
}: {
  label: string;
  value: string;
  detalhe: string;
  color: string;
}) {
  return (
    <div className="min-w-0 sm:px-4 sm:first:pl-0 sm:last:pr-0">
      <p className="truncate text-[11px] text-gray-500 sm:text-[13px]">{label}</p>
      <p className="mt-1 truncate text-[clamp(0.8rem,3.2vw,1.6rem)] font-extrabold leading-none tabular-nums" style={{ color }}>
        {value}
      </p>
      <p className="mt-1.5 truncate text-[10px] text-gray-500 sm:text-[12px]">{detalhe}</p>
    </div>
  );
}

function CardConteudo({ linha, colors }: { linha: Linha; colors: ReturnType<typeof palette> }) {
  const meta = statusMeta(linha.faixa);
  const pct = percentualPago(linha.total, linha.pago);
  const localPaciente = linha.kind === 'paciente' ? linha.local : undefined;
  return (
    <>
      <div className="flex items-center gap-3">
        <CalendarioPacienteAuthAvatar name={linha.nome} photoUrl={linha.photoUrl} dimensionClass="h-12 w-12 text-[13px]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-gray-900">{linha.nome}</p>
          {linha.kind === 'venda' ? (
            <p className="truncate text-[12px] text-gray-500">
              Venda avulsa{linha.cliente ? ` · ${linha.cliente}` : ''}
            </p>
          ) : localPaciente ? (
            <p className="flex min-w-0 items-center gap-1 text-[12px] text-gray-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{localPaciente}</span>
            </p>
          ) : null}
        </div>
        <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.className}`}>
          {meta.label}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Metrica icon={Tag} label="Total" value={linha.total} color={colors.total} />
        <Metrica icon={Wallet} label="Pago" value={linha.pago} color={colors.pago} />
        <Metrica icon={Clock3} label="Em aberto" value={linha.aberto} color={colors.aberto} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full" style={{ background: colors.track }} aria-hidden>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors.pago }} />
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-gray-500">{pct}% pago</span>
      </div>
    </>
  );
}

function Metrica({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Tag;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="min-w-0">
      <p className="flex items-center gap-1 text-[11px] text-gray-500">
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-0.5 truncate text-[13px] font-bold tabular-nums sm:text-sm" style={{ color }}>
        {fmtBrl(value)}
      </p>
    </div>
  );
}
