'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import type { PagamentoPaciente } from '@/types/pagamento';
import FinanceiroRelatorioTransacoesPanel from '@/components/metaadmin/FinanceiroRelatorioTransacoesPanel';
import {
  agruparParcelasPorVenda,
  getStatusPagamentoPaciente,
  getValoresPacienteDeParcelas,
  type FinanceiroRelatorioTipo,
} from '@/lib/metaadmin/buildFinanceiroRelatorioTransacoes';

type Props = {
  pacientes: PacienteCompleto[];
  pagamentosPacientes: Record<string, PagamentoPaciente>;
  isMobile?: boolean;
  onGerenciarPaciente: (paciente: PacienteCompleto) => void;
  onErro?: (mensagem: string) => void;
  /** Accent for Gerenciar button — default green */
  accentClassName?: string;
};

type DetalheItem = {
  tipo: 'paciente' | 'venda_avulsa';
  nome: string;
  valor: number;
  data: string;
  pacienteId?: string;
};

function nomePaciente(paciente: PacienteCompleto | undefined, pacienteId: string): string {
  if (!paciente) return `Paciente ${pacienteId.slice(0, 8)}`;
  return paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || `Paciente ${pacienteId.slice(0, 8)}`;
}

function toDateSafe(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const t = (v as { toDate?: () => Date })?.toDate?.();
  if (t) return t;
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? null : d;
}

function obterDadosFinanceirosPorDia(
  pacientes: PacienteCompleto[],
  pagamentosPacientes: Record<string, PagamentoPaciente>
) {
  const mapaPorDia = new Map<string, { recebido: number; vendido: number; aberto: number }>();
  const detalhesPorDia = new Map<string, { vendido: DetalheItem[]; recebido: DetalheItem[]; aberto: DetalheItem[] }>();

  const dateKeyLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const addAoDia = (d: Date | null | undefined, recebido: number, vendido: number, aberto = 0) => {
    if (!d || Number.isNaN(d.getTime())) return;
    const key = dateKeyLocal(d);
    const atual = mapaPorDia.get(key) || { recebido: 0, vendido: 0, aberto: 0 };
    mapaPorDia.set(key, {
      recebido: atual.recebido + recebido,
      vendido: atual.vendido + vendido,
      aberto: atual.aberto + aberto,
    });
  };

  const pushDetalheDia = (
    d: Date | null | undefined,
    campo: 'vendido' | 'recebido' | 'aberto',
    item: DetalheItem
  ) => {
    if (!d || Number.isNaN(d.getTime())) return;
    const key = dateKeyLocal(d);
    if (!detalhesPorDia.has(key)) detalhesPorDia.set(key, { vendido: [], recebido: [], aberto: [] });
    detalhesPorDia.get(key)![campo].push(item);
  };

  const fmtData = (d: Date) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  Object.entries(pagamentosPacientes || {}).forEach(([pacienteId, pag]) => {
    const { valorTotal: valorTotalPaciente } = getValoresPacienteDeParcelas(pag);
    if (valorTotalPaciente <= 0) return;

    const paciente = pacientes.find((p) => p.id === pacienteId);
    const nome = nomePaciente(paciente, pacienteId);
    const dataCadastroPaciente = paciente
      ? toDateSafe(paciente.dadosIdentificacao?.dataCadastro) || toDateSafe(paciente.dataCadastro)
      : null;
    const dataVendaFallback =
      dataCadastroPaciente || toDateSafe(pag.dataUltimaAtualizacao) || new Date();

    const vendas = agruparParcelasPorVenda(pag.parcelas || [], dataVendaFallback);
    vendas.forEach((venda) => {
      if (venda.valorTotal <= 0) return;
      addAoDia(venda.data, 0, venda.valorTotal);
      pushDetalheDia(venda.data, 'vendido', {
        tipo: 'paciente',
        nome,
        valor: venda.valorTotal,
        data: fmtData(venda.data),
        pacienteId,
      });
    });

    let abertoAdicionadoPaciente = 0;
    (pag.parcelas || []).forEach((parcela) => {
      const val = parcela.valor || 0;
      if (parcela.status === 'paga') {
        const dataPag = toDateSafe(parcela.dataPagamento) || toDateSafe(parcela.dataVencimento);
        if (dataPag) {
          addAoDia(dataPag, val, 0);
          pushDetalheDia(dataPag, 'recebido', {
            tipo: 'paciente',
            nome,
            valor: val,
            data: fmtData(dataPag),
            pacienteId,
          });
        } else {
          const dtFallback = new Date();
          addAoDia(dtFallback, val, 0);
          pushDetalheDia(dtFallback, 'recebido', {
            tipo: 'paciente',
            nome,
            valor: val,
            data: fmtData(dtFallback),
            pacienteId,
          });
        }
      } else {
        const dataVen = toDateSafe(parcela.dataVencimento);
        if (dataVen) {
          abertoAdicionadoPaciente += val;
          addAoDia(dataVen, 0, 0, val);
          pushDetalheDia(dataVen, 'aberto', {
            tipo: 'paciente',
            nome,
            valor: val,
            data: fmtData(dataVen),
            pacienteId,
          });
        }
      }
    });

    const { valorPendente: valorPendentePag } = getValoresPacienteDeParcelas(pag);
    if (valorPendentePag > abertoAdicionadoPaciente) {
      const diff = valorPendentePag - abertoAdicionadoPaciente;
      const dataVen = toDateSafe(pag.dataVencimento);
      if (dataVen) {
        addAoDia(dataVen, 0, 0, diff);
        pushDetalheDia(dataVen, 'aberto', {
          tipo: 'paciente',
          nome,
          valor: diff,
          data: fmtData(dataVen),
          pacienteId,
        });
      }
    }
  });

  return { mapaPorDia, detalhesPorDia, dateKeyLocal };
}

export default function ProfissionalFinanceiroSection({
  pacientes,
  pagamentosPacientes,
  isMobile = false,
  onGerenciarPaciente,
  onErro,
  accentClassName = 'text-green-700 hover:text-green-900',
}: Props) {
  const [relatorioFinanceiroTipo, setRelatorioFinanceiroTipo] = useState<FinanceiroRelatorioTipo | null>(null);
  const [financeiroCalendarioMes, setFinanceiroCalendarioMes] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [financeiroDataCalendarioSelecionada, setFinanceiroDataCalendarioSelecionada] = useState<string | null>(
    null
  );
  const [financeiroDetalheExpandido, setFinanceiroDetalheExpandido] = useState<string | null>(null);
  const [buscaPacienteFinanceiro, setBuscaPacienteFinanceiro] = useState('');
  const [filtroStatusPagamentoFinanceiro, setFiltroStatusPagamentoFinanceiro] = useState('todos');

  const pagamentosLista = Object.values(pagamentosPacientes || {});

  const totalVendido = pagamentosLista.reduce((sum, p) => {
    const { valorTotal } = getValoresPacienteDeParcelas(p);
    return sum + valorTotal;
  }, 0);

  const totalRecebido = pagamentosLista.reduce((sum, p) => {
    const status = getStatusPagamentoPaciente(p);
    if (status !== 'pago') return sum;
    const { valorTotal } = getValoresPacienteDeParcelas(p);
    return sum + valorTotal;
  }, 0);

  const totalAberto = pagamentosLista.reduce((sum, p) => {
    const status = getStatusPagamentoPaciente(p);
    const { valorTotal, valorPendente } = getValoresPacienteDeParcelas(p);
    if (status === 'pago') return sum;
    if (status === 'iniciou_pagamento') return sum + valorPendente;
    return sum + valorTotal;
  }, 0);

  if (relatorioFinanceiroTipo) {
    const totalCard =
      relatorioFinanceiroTipo === 'vendido'
        ? totalVendido
        : relatorioFinanceiroTipo === 'recebido'
          ? totalRecebido
          : totalAberto;
    return (
      <FinanceiroRelatorioTransacoesPanel
        tipo={relatorioFinanceiroTipo}
        pagamentosPacientes={pagamentosPacientes || {}}
        vendasAvulsas={[]}
        pacientes={pacientes}
        totalCard={totalCard}
        onVoltar={() => setRelatorioFinanceiroTipo(null)}
        isMobile={isMobile}
        onErro={onErro}
        onEditarPaciente={(pacienteId) => {
          const paciente =
            pacientes.find((p) => p.id === pacienteId) ||
            pacientes.find((p) => p.userId === pacienteId);
          if (!paciente) {
            onErro?.('Paciente não encontrado para abrir o controle de pagamento.');
            return;
          }
          onGerenciarPaciente(paciente);
        }}
      />
    );
  }

  const { mapaPorDia, detalhesPorDia, dateKeyLocal } = obterDadosFinanceirosPorDia(
    pacientes,
    pagamentosPacientes
  );

  const fmtFinanceiroCal = (v: number) =>
    'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const fmtFinanceiroCalSoNumero = (v: number) =>
    v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const mesesCalNome = [
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
  const yCal = financeiroCalendarioMes.year;
  const mCal = financeiroCalendarioMes.month;
  const primeiroDiaMes = new Date(yCal, mCal, 1);
  const offsetDomingo = primeiroDiaMes.getDay();
  const diasNoMes = new Date(yCal, mCal + 1, 0).getDate();
  const hojeKeyCal = dateKeyLocal(new Date());
  const tituloMesCal = `${mesesCalNome[mCal]} ${yCal}`;
  const detalheDiaSelecionado = financeiroDataCalendarioSelecionada
    ? detalhesPorDia.get(financeiroDataCalendarioSelecionada)
    : undefined;
  const totaisDiaSelecionado = financeiroDataCalendarioSelecionada
    ? mapaPorDia.get(financeiroDataCalendarioSelecionada)
    : undefined;

  let somatorioMesCalVenda = 0;
  let somatorioMesCalRecebido = 0;
  let somatorioMesCalAberto = 0;
  for (let di = 1; di <= diasNoMes; di++) {
    const kMes = dateKeyLocal(new Date(yCal, mCal, di));
    const tMes = mapaPorDia.get(kMes);
    if (tMes) {
      somatorioMesCalVenda += tMes.vendido;
      somatorioMesCalRecebido += tMes.recebido;
      somatorioMesCalAberto += tMes.aberto;
    }
  }

  const abrirGerenciarPorId = (pacienteId: string) => {
    const paciente = pacientes.find((p) => p.id === pacienteId);
    if (paciente) onGerenciarPaciente(paciente);
  };

  const pacientesFiltrados = pacientes
    .filter((paciente) => {
      const nomeCompleto = paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || '';
      const matchNome =
        buscaPacienteFinanceiro === '' ||
        nomeCompleto.toLowerCase().includes(buscaPacienteFinanceiro.toLowerCase());
      const pagamento = pagamentosPacientes[paciente.id];
      const statusPagamento = getStatusPagamentoPaciente(pagamento);
      const matchStatus =
        filtroStatusPagamentoFinanceiro === 'todos' || statusPagamento === filtroStatusPagamentoFinanceiro;
      return matchNome && matchStatus;
    })
    .sort((a, b) => {
      const na = (a.dadosIdentificacao?.nomeCompleto || a.nome || '').toLowerCase().trim();
      const nb = (b.dadosIdentificacao?.nomeCompleto || b.nome || '').toLowerCase().trim();
      return na.localeCompare(nb, 'pt-BR');
    });

  const somaTotal = pacientesFiltrados.reduce(
    (s, p) => s + getValoresPacienteDeParcelas(pagamentosPacientes[p.id]).valorTotal,
    0
  );
  const somaPago = pacientesFiltrados.reduce(
    (s, p) => s + getValoresPacienteDeParcelas(pagamentosPacientes[p.id]).valorPago,
    0
  );
  const somaAberto = pacientesFiltrados.reduce(
    (s, p) => s + getValoresPacienteDeParcelas(pagamentosPacientes[p.id]).valorPendente,
    0
  );
  const gridCols = 'md:grid-cols-[auto_minmax(0,1fr)_100px_100px_100px_90px_100px]';

  const renderListaDia = (
    items: DetalheItem[] | undefined,
    keyPrefix: string,
    badgeClass: string
  ) => {
    const filtrados = (items || []).filter((i) => i.valor > 0);
    if (filtrados.length === 0) {
      return <li className="px-4 py-6 text-sm text-center text-gray-500">Nenhum registro</li>;
    }
    return filtrados.map((item, idx) => (
      <li
        key={`${keyPrefix}-${idx}`}
        className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50/80"
      >
        {item.tipo === 'paciente' && item.pacienteId ? (
          <button
            type="button"
            onClick={() => abrirGerenciarPorId(item.pacienteId!)}
            className={`text-sm truncate min-w-0 font-medium text-left rounded-sm focus:outline-none focus:ring-2 focus:ring-offset-0 ${accentClassName} hover:underline focus:ring-green-500/40`}
            title={`Editar pagamento · ${item.nome}`}
          >
            {item.nome}
          </button>
        ) : (
          <span className="text-sm truncate min-w-0 font-medium text-gray-900" title={item.nome}>
            {item.tipo === 'paciente' ? item.nome : `${item.nome} · avulsa`}
          </span>
        )}
        <span className={`shrink-0 text-xs font-semibold rounded-full px-2 py-0.5 text-white ${badgeClass}`}>
          {fmtFinanceiroCal(item.valor)}
        </span>
      </li>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Cards de resumo — clique abre extrato analítico das transações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setRelatorioFinanceiroTipo('vendido')}
          className="bg-white shadow rounded-lg p-4 text-left transition-all hover:shadow-md hover:ring-2 hover:ring-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          aria-label="Abrir relatório de Total Vendido"
        >
          <p className="text-sm font-medium text-gray-500">Total Vendido</p>
          <p className="mt-2 text-2xl font-semibold text-blue-700">R$ {totalVendido.toFixed(2)}</p>
          <p className="mt-2 text-xs text-blue-600/80">Ver histórico →</p>
        </button>
        <button
          type="button"
          onClick={() => setRelatorioFinanceiroTipo('recebido')}
          className="bg-white shadow rounded-lg p-4 text-left transition-all hover:shadow-md hover:ring-2 hover:ring-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
          aria-label="Abrir relatório de Total Recebido"
        >
          <p className="text-sm font-medium text-gray-500">Total Recebido</p>
          <p className="mt-2 text-2xl font-semibold text-green-700">R$ {totalRecebido.toFixed(2)}</p>
          <p className="mt-2 text-xs text-green-600/80">Ver histórico →</p>
        </button>
        <button
          type="button"
          onClick={() => setRelatorioFinanceiroTipo('aberto')}
          className="bg-white shadow rounded-lg p-4 text-left transition-all hover:shadow-md hover:ring-2 hover:ring-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
          aria-label="Abrir relatório de Total Aberto"
        >
          <p className="text-sm font-medium text-gray-500">Total Aberto</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">R$ {totalAberto.toFixed(2)}</p>
          <p className="mt-2 text-xs text-amber-600/80">Ver histórico →</p>
        </button>
      </div>

      {/* Calendário financeiro + Movimentação do dia */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        <div className="w-full lg:w-1/2 lg:min-w-0 lg:max-w-none shrink-0 max-lg:p-0 max-lg:flex max-lg:flex-col max-lg:items-center max-lg:bg-transparent max-lg:shadow-none max-lg:border-0 max-lg:rounded-none lg:rounded-lg lg:shadow lg:p-4 lg:bg-white lg:border lg:border-gray-100">
          <div className="flex items-center gap-2 mb-3 w-full max-lg:justify-center lg:justify-between max-lg:px-1 lg:px-0">
            <h3 className="hidden lg:block text-lg font-semibold text-gray-900">Calendário financeiro</h3>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setFinanceiroCalendarioMes((prev) => {
                    const d = new Date(prev.year, prev.month - 1, 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  })
                }
                className="p-1.5 rounded-md transition-colors hover:bg-gray-100 text-gray-700"
                aria-label="Mês anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-medium min-w-[9rem] text-center capitalize text-gray-800">
                {tituloMesCal}
              </span>
              <button
                type="button"
                onClick={() =>
                  setFinanceiroCalendarioMes((prev) => {
                    const d = new Date(prev.year, prev.month + 1, 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  })
                }
                className="p-1.5 rounded-md transition-colors hover:bg-gray-100 text-gray-700"
                aria-label="Próximo mês"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="w-full lg:max-w-none">
            <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] sm:text-xs font-medium mb-1 text-gray-500">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1 max-lg:gap-0.5">
              {Array.from({ length: offsetDomingo }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[4.5rem] sm:min-h-[5.25rem]" />
              ))}
              {Array.from({ length: diasNoMes }).map((_, idx) => {
                const dia = idx + 1;
                const cellDate = new Date(yCal, mCal, dia);
                const keyDia = dateKeyLocal(cellDate);
                const tot = mapaPorDia.get(keyDia);
                const v = tot?.vendido ?? 0;
                const r = tot?.recebido ?? 0;
                const a = tot?.aberto ?? 0;
                const temAlgumValor = v > 0 || r > 0 || a > 0;
                const selecionado = financeiroDataCalendarioSelecionada === keyDia;
                const ehHoje = keyDia === hojeKeyCal;
                return (
                  <button
                    key={keyDia}
                    type="button"
                    onClick={() => setFinanceiroDataCalendarioSelecionada(keyDia)}
                    className={`min-h-[4.5rem] sm:min-h-[5.25rem] max-lg:min-h-[4rem] rounded-lg border p-1 sm:p-1.5 max-lg:p-0.5 text-left flex flex-col transition-colors ${
                      selecionado
                        ? 'border-green-600 bg-green-50 ring-1 ring-green-500'
                        : ehHoje
                          ? 'border-blue-200 bg-blue-50/80'
                          : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100 max-lg:border-gray-200/60 max-lg:bg-transparent'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-semibold text-gray-900">{dia}</span>
                    {temAlgumValor ? (
                      <div className="mt-auto flex flex-col gap-0.5 items-stretch">
                        {v > 0 && (
                          <span className="inline-flex justify-center rounded-full px-1 py-px text-[8px] font-semibold leading-tight text-white sm:text-[10px] sm:px-1.5 sm:py-0.5 bg-blue-600">
                            {isMobile ? fmtFinanceiroCalSoNumero(v) : fmtFinanceiroCal(v)}
                          </span>
                        )}
                        {r > 0 && (
                          <span className="inline-flex justify-center rounded-full px-1 py-px text-[8px] font-semibold leading-tight !text-white sm:text-[10px] sm:px-1.5 sm:py-0.5 bg-emerald-600">
                            {isMobile ? fmtFinanceiroCalSoNumero(r) : fmtFinanceiroCal(r)}
                          </span>
                        )}
                        {a > 0 && (
                          <span className="inline-flex justify-center rounded-full px-1 py-px text-[8px] font-semibold leading-tight text-white sm:text-[10px] sm:px-1.5 sm:py-0.5 bg-orange-500">
                            {isMobile ? fmtFinanceiroCalSoNumero(a) : fmtFinanceiroCal(a)}
                          </span>
                        )}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/2 lg:flex-1 min-w-0 rounded-2xl shadow-sm p-4 sm:p-5 bg-gradient-to-b from-gray-50/90 to-white border border-gray-200/80">
          <h3 className="text-base font-semibold tracking-tight mb-1 text-gray-900">Movimentação do dia</h3>
          <div className="mt-3 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 border bg-white/80 border-gray-200/90">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">
              Somatório do mês
            </p>
            <p className="text-sm font-semibold capitalize mt-0.5 text-gray-800">{tituloMesCal}</p>
            <div className="flex flex-wrap gap-2 mt-2.5">
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-white bg-blue-600 shadow-sm">
                Venda · {fmtFinanceiroCal(somatorioMesCalVenda)}
              </span>
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] sm:text-xs font-semibold !text-white bg-emerald-600 shadow-sm">
                Recebido · {fmtFinanceiroCal(somatorioMesCalRecebido)}
              </span>
              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-white bg-orange-500 shadow-sm">
                Aberto · {fmtFinanceiroCal(somatorioMesCalAberto)}
              </span>
            </div>
          </div>
          {!financeiroDataCalendarioSelecionada ? (
            <p className="text-sm mt-3 text-gray-500">
              Toque em uma data no calendário para ver vendas, recebimentos e valores em aberto.
            </p>
          ) : (
            <div className="space-y-5 mt-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Data selecionada</p>
                <p className="text-lg font-semibold capitalize text-gray-900">
                  {new Date(financeiroDataCalendarioSelecionada + 'T12:00:00').toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(totaisDiaSelecionado?.vendido ?? 0) > 0 && (
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white bg-blue-600 shadow-sm">
                    Vendido · {fmtFinanceiroCal(totaisDiaSelecionado!.vendido)}
                  </span>
                )}
                {(totaisDiaSelecionado?.recebido ?? 0) > 0 && (
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold !text-white bg-emerald-600 shadow-sm">
                    Recebido · {fmtFinanceiroCal(totaisDiaSelecionado!.recebido)}
                  </span>
                )}
                {(totaisDiaSelecionado?.aberto ?? 0) > 0 && (
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold text-white bg-orange-500 shadow-sm">
                    Aberto · {fmtFinanceiroCal(totaisDiaSelecionado!.aberto)}
                  </span>
                )}
                {(totaisDiaSelecionado?.vendido ?? 0) <= 0 &&
                  (totaisDiaSelecionado?.recebido ?? 0) <= 0 &&
                  (totaisDiaSelecionado?.aberto ?? 0) <= 0 && (
                    <span className="text-sm text-gray-500">Nenhum movimento neste dia.</span>
                  )}
              </div>
              <div className="grid grid-cols-1 gap-4 lg:gap-3">
                <div className="rounded-xl overflow-hidden bg-white shadow-sm ring-1 ring-gray-200/70">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-blue-50/60">
                    <span className="text-sm font-semibold text-blue-700">Vendido</span>
                    {(detalheDiaSelecionado?.vendido.reduce((s, x) => s + x.valor, 0) ?? 0) > 0 ? (
                      <span className="text-xs font-bold rounded-full px-2 py-0.5 text-white bg-blue-600">
                        {fmtFinanceiroCal(detalheDiaSelecionado!.vendido.reduce((s, x) => s + x.valor, 0))}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
                  <ul className="max-h-56 overflow-y-auto divide-y divide-gray-100">
                    {renderListaDia(detalheDiaSelecionado?.vendido, 'v', 'bg-blue-600')}
                  </ul>
                </div>
                <div className="rounded-xl overflow-hidden bg-white shadow-sm ring-1 ring-gray-200/70">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-emerald-50/60">
                    <span className="text-sm font-semibold text-emerald-800">Recebido</span>
                    {(detalheDiaSelecionado?.recebido.reduce((s, x) => s + x.valor, 0) ?? 0) > 0 ? (
                      <span className="text-xs font-bold rounded-full px-2 py-0.5 !text-white bg-emerald-600">
                        {fmtFinanceiroCal(detalheDiaSelecionado!.recebido.reduce((s, x) => s + x.valor, 0))}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
                  <ul className="max-h-56 overflow-y-auto divide-y divide-gray-100">
                    {renderListaDia(detalheDiaSelecionado?.recebido, 'r', 'bg-emerald-600')}
                  </ul>
                </div>
                <div className="rounded-xl overflow-hidden bg-white shadow-sm ring-1 ring-gray-200/70">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-orange-50/70">
                    <span className="text-sm font-semibold text-orange-900">Aberto</span>
                    {(detalheDiaSelecionado?.aberto.reduce((s, x) => s + x.valor, 0) ?? 0) > 0 ? (
                      <span className="text-xs font-bold rounded-full px-2 py-0.5 text-white bg-orange-500">
                        {fmtFinanceiroCal(detalheDiaSelecionado!.aberto.reduce((s, x) => s + x.valor, 0))}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
                  <ul className="max-h-56 overflow-y-auto divide-y divide-gray-100">
                    {renderListaDia(detalheDiaSelecionado?.aberto, 'a', 'bg-orange-500')}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar paciente por nome..."
              value={buscaPacienteFinanceiro}
              onChange={(e) => setBuscaPacienteFinanceiro(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent border border-gray-300 bg-white text-gray-900 focus:ring-blue-500"
            />
          </div>
          <div className="sm:w-48">
            <select
              value={filtroStatusPagamentoFinanceiro}
              onChange={(e) => setFiltroStatusPagamentoFinanceiro(e.target.value)}
              className="w-full px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:border-transparent border border-gray-300 bg-white text-gray-900 focus:ring-blue-500"
            >
              <option value="todos">Todos os Status</option>
              <option value="pago">Pago</option>
              <option value="em_aberto">Aberto</option>
              <option value="iniciou_pagamento">Parcial</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista expansível de pacientes */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="divide-y divide-gray-200">
          <div
            className={`hidden md:grid ${gridCols} md:gap-x-4 md:gap-y-1 md:px-4 md:py-3 md:bg-gray-50 md:border-b md:border-gray-200 md:text-xs md:font-semibold md:uppercase md:tracking-wider md:text-gray-500 md:items-center`}
          >
            <div className="w-8" />
            <div>Nome</div>
            <div className="text-right">Total</div>
            <div className="text-right">Pago</div>
            <div className="text-right">Em aberto</div>
            <div className="text-center">Status</div>
            <div className="text-right">Ações</div>
          </div>

          {pacientesFiltrados.map((paciente) => {
            const pagamento = pagamentosPacientes[paciente.id];
            const nomeCompleto = paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || '';
            const keyPac = `paciente-${paciente.id}`;
            const isExpanded = financeiroDetalheExpandido === keyPac;
            const status = getStatusPagamentoPaciente(pagamento);
            const valores = getValoresPacienteDeParcelas(pagamento);
            const toDateParcela = (d: Date | { toDate?: () => Date } | undefined) =>
              !d ? undefined : d instanceof Date ? d : (d as { toDate?: () => Date }).toDate?.();

            return (
              <div key={keyPac} className="border-b border-gray-200 last:border-b-0">
                <div
                  className={`flex flex-wrap items-center gap-2 sm:gap-4 px-4 py-3 hover:bg-gray-50 transition-colors md:grid ${gridCols} md:gap-x-4 md:flex-nowrap md:items-center`}
                >
                  <div className="flex-1 min-w-0 flex items-center gap-2 md:flex-initial md:min-w-0">
                    <button
                      type="button"
                      onClick={() => setFinanceiroDetalheExpandido(isExpanded ? null : keyPac)}
                      className="flex-shrink-0 p-1 text-gray-500 hover:text-gray-700 transition-colors"
                      aria-label={isExpanded ? 'Recolher detalhes' : 'Ver detalhes da venda'}
                    >
                      <ChevronRight
                        size={20}
                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-gray-900 truncate md:font-medium">{nomeCompleto}</div>
                      <div className="text-xs text-gray-500">
                        Paciente
                        {(paciente.dadosIdentificacao?.endereco?.cidade ||
                          paciente.dadosIdentificacao?.endereco?.estado) && (
                          <span>
                            {' '}
                            ·{' '}
                            {[
                              paciente.dadosIdentificacao?.endereco?.cidade,
                              paciente.dadosIdentificacao?.endereco?.estado,
                            ]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm w-full md:w-auto md:contents md:gap-x-4">
                    <span className="text-gray-600 md:text-right md:block md:min-w-[100px]">
                      Total: <strong>R$ {valores.valorTotal.toFixed(2)}</strong>
                    </span>
                    <span className="text-gray-600 md:text-right md:block md:min-w-[100px]">
                      Pago: <strong className="text-green-700">R$ {valores.valorPago.toFixed(2)}</strong>
                    </span>
                    <span className="text-gray-600 md:text-right md:block md:min-w-[100px]">
                      Em aberto:{' '}
                      <strong className="text-amber-600">R$ {valores.valorPendente.toFixed(2)}</strong>
                    </span>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        status === 'pago'
                          ? 'bg-green-100 text-green-800'
                          : status === 'iniciou_pagamento'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {status === 'pago' ? 'Pago' : status === 'iniciou_pagamento' ? 'Parcial' : 'Aberto'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onGerenciarPaciente(paciente)}
                      className={`${accentClassName} font-medium text-sm`}
                    >
                      Gerenciar
                    </button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 bg-gray-50 border-t border-gray-100">
                    <div className="pl-8 space-y-3">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Detalhe da venda
                      </p>
                      {pagamento?.formaPagamento && (
                        <p className="text-sm text-gray-700">
                          Forma de pagamento:{' '}
                          {pagamento.formaPagamento === 'a_vista'
                            ? 'À vista'
                            : pagamento.formaPagamento === 'dividido'
                              ? 'Dividido'
                              : 'Cartão'}
                        </p>
                      )}
                      {(pagamento?.parcelas?.length ?? 0) > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-600">Parcelas</p>
                          <ul className="space-y-1.5">
                            {pagamento!.parcelas!.map((parcela, idx) => {
                              const dataVen = toDateParcela(parcela.dataVencimento);
                              const dataPag = toDateParcela(parcela.dataPagamento);
                              return (
                                <li
                                  key={idx}
                                  className="flex flex-wrap items-center gap-2 text-sm py-1.5 px-2 bg-white rounded border border-gray-200"
                                >
                                  <span className="font-medium">Parcela {parcela.numero}</span>
                                  <span>R$ {(parcela.valor ?? 0).toFixed(2)}</span>
                                  <span className="text-gray-500">
                                    Venc: {dataVen ? dataVen.toLocaleDateString('pt-BR') : '-'}
                                    {parcela.status === 'paga' &&
                                      dataPag &&
                                      ` · Pago: ${dataPag.toLocaleDateString('pt-BR')}`}
                                  </span>
                                  <span
                                    className={`text-xs px-1.5 py-0.5 rounded ${
                                      parcela.status === 'paga'
                                        ? 'bg-green-100 text-green-800'
                                        : parcela.status === 'atrasada'
                                          ? 'bg-red-100 text-red-800'
                                          : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {parcela.status === 'paga'
                                      ? 'Paga'
                                      : parcela.status === 'atrasada'
                                        ? 'Atrasada'
                                        : 'Pendente'}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Nenhuma parcela cadastrada.</p>
                      )}
                      {pagamento?.observacoes && (
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Observações:</span> {pagamento.observacoes}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {pacientesFiltrados.length > 0 && (
            <div
              className={`border-t-2 border-gray-300 bg-gray-50 px-4 py-3 flex flex-wrap gap-x-4 gap-y-2 items-center md:grid ${gridCols} md:gap-x-4 md:items-center`}
            >
              <div className="hidden md:block w-8" />
              <div className="font-semibold text-gray-900 w-full md:w-auto">Total da lista</div>
              <div className="text-sm md:text-base">
                <span className="text-gray-500 md:hidden">Total: </span>
                <span className="font-semibold text-gray-900">R$ {somaTotal.toFixed(2)}</span>
              </div>
              <div className="text-sm md:text-base">
                <span className="text-gray-500 md:hidden">Pago: </span>
                <span className="font-semibold text-green-700">R$ {somaPago.toFixed(2)}</span>
              </div>
              <div className="text-sm md:text-base">
                <span className="text-gray-500 md:hidden">Em aberto: </span>
                <span className="font-semibold text-amber-600">R$ {somaAberto.toFixed(2)}</span>
              </div>
              <div className="hidden md:block" />
              <div className="hidden md:block" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
