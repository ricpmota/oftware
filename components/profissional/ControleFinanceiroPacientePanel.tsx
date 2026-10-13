'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  DollarSign,
  Plus,
  Receipt,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import type { PacienteCompleto } from '@/types/obesidade';
import type { PagamentoPaciente, ParcelaPagamento } from '@/types/pagamento';
import {
  calcularPosicaoInserirParcela,
  derivarStatusPagamentoDeParcelas,
  obterGruposParcelasPorVenda,
  recalcularTotaisParcelas,
  removerParcelasDoGrupo,
  renumberarParcelas,
  toDatePagamento,
} from '@/lib/profissional/controleFinanceiroParcelas';

export type ControleFinanceiroPacientePanelProps = {
  open: boolean;
  mode: 'embedded' | 'modal';
  paciente: PacienteCompleto;
  pagamentoInicial: PagamentoPaciente;
  onClose: () => void;
  onSave?: (pagamento: PagamentoPaciente) => Promise<void>;
  onFeedback?: (message: string) => void;
  /** Página pública / relatório: só visualização. */
  readOnly?: boolean;
  /** Relatório mobile: sem o card externo extra. */
  flushMobile?: boolean;
};

function emptyPagamento(pacienteId: string): PagamentoPaciente {
  return {
    pacienteId,
    statusPagamento: 'em_aberto',
    formaPagamento: null,
    valorTotal: 0,
    valorPago: 0,
    valorPendente: 0,
    parcelas: [],
    dataUltimaAtualizacao: new Date(),
  };
}

function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusParcelaClass(status: ParcelaPagamento['status']) {
  if (status === 'paga') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'atrasada') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

export function ControleFinanceiroPacientePanel({
  open,
  mode,
  paciente,
  pagamentoInicial,
  onClose,
  onSave,
  onFeedback,
  readOnly = false,
  flushMobile = false,
}: ControleFinanceiroPacientePanelProps) {
  const embedded = mode === 'embedded';
  const flush = embedded && flushMobile;
  const [dadosPagamento, setDadosPagamento] = useState<PagamentoPaciente>(pagamentoInicial);
  const [vendaTabAtiva, setVendaTabAtiva] = useState(0);
  const [pagamentoParcialIdx, setPagamentoParcialIdx] = useState<number | null>(null);
  const [pagamentoParcialValor, setPagamentoParcialValor] = useState('');
  const [showModalNovaVendaData, setShowModalNovaVendaData] = useState(false);
  const [novaVendaDataSelecionada, setNovaVendaDataSelecionada] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDadosPagamento(pagamentoInicial || emptyPagamento(paciente.id));
    setVendaTabAtiva(0);
    setPagamentoParcialIdx(null);
    setPagamentoParcialValor('');
    setShowModalNovaVendaData(false);
  }, [open, paciente.id, pagamentoInicial]);

  const dataCadastro =
    paciente.dadosIdentificacao?.dataCadastro ?? paciente.dataCadastro;
  const dataVendaFallback = useMemo(
    () => (dataCadastro ? new Date(dataCadastro as string | Date) : new Date()),
    [dataCadastro]
  );

  if (!open) return null;

  const parcelas = dadosPagamento.parcelas || [];
  const grupos = obterGruposParcelasPorVenda(parcelas, dataVendaFallback);
  const tabIdx = Math.min(vendaTabAtiva, Math.max(0, grupos.length - 1));
  const grupoAtivo = grupos[tabIdx] ?? grupos[0];
  const totalGeral = grupos.reduce((s, v) => s + v.valorTotal, 0);
  const pagoGeral = grupos.reduce((s, v) => s + v.valorPago, 0);
  const pendenteGeral = grupos.reduce((s, v) => s + v.valorPendente, 0);

  const atualizarParcelas = (novasParcelas: ParcelaPagamento[]) => {
    const renumeradas = renumberarParcelas(novasParcelas);
    setDadosPagamento({
      ...dadosPagamento,
      parcelas: renumeradas,
      ...recalcularTotaisParcelas(renumeradas),
    });
  };

  const adicionarParcelaNaVendaAtiva = () => {
    const atuais = dadosPagamento.parcelas || [];
    const insertAt = calcularPosicaoInserirParcela(grupos, tabIdx, atuais.length);
    const parcelaRef =
      grupoAtivo.indices.length > 0
        ? atuais[grupoAtivo.indices[grupoAtivo.indices.length - 1]]
        : null;
    const ultimaData = parcelaRef?.dataVencimento
      ? toDatePagamento(parcelaRef.dataVencimento) ?? grupoAtivo.data
      : grupoAtivo.data;
    const dataVencimento = new Date(ultimaData);
    dataVencimento.setMonth(ultimaData.getMonth() + 1);
    const novaParcela: ParcelaPagamento = {
      numero: grupoAtivo.indices.length + 1,
      valor: 0,
      dataVencimento,
      status: 'pendente',
    };
    atualizarParcelas([...atuais.slice(0, insertAt), novaParcela, ...atuais.slice(insertAt)]);
  };

  const handleSalvar = async () => {
    if (readOnly || !onSave) return;
    try {
      setSalvando(true);
      const parcelasAtuais = dadosPagamento.parcelas || [];
      const totais = recalcularTotaisParcelas(parcelasAtuais);
      const statusPagamento = derivarStatusPagamentoDeParcelas(parcelasAtuais);
      const pacienteId = (paciente.id || '').toString().trim();
      if (!pacienteId) throw new Error('Paciente sem ID válido para salvar pagamento.');
      const dataVenda =
        dadosPagamento.dataVenda ??
        paciente.dadosIdentificacao?.dataCadastro ??
        paciente.dataCadastro;
      const pagamentoAtualizado: PagamentoPaciente = {
        ...dadosPagamento,
        pacienteId,
        ...totais,
        statusPagamento,
        dataVenda: dataVenda as Date | undefined,
        dataUltimaAtualizacao: new Date(),
      };
      await onSave(pagamentoAtualizado);
      setDadosPagamento(pagamentoAtualizado);
      onFeedback?.('Pagamento salvo com sucesso!');
      if (!embedded) onClose();
    } catch (error) {
      console.error('Erro ao salvar pagamento:', error);
      onFeedback?.('Erro ao salvar pagamento');
    } finally {
      setSalvando(false);
    }
  };

  const shell = (
    <div
      className={
        embedded
          ? flush
            ? 'flex flex-col w-full h-full min-h-0 overflow-hidden sm:rounded-xl sm:border sm:border-slate-200 sm:shadow-sm sm:bg-gradient-to-b sm:from-slate-50 sm:via-white sm:to-slate-50'
            : 'flex flex-col w-full h-full min-h-0 rounded-xl border border-slate-200 shadow-sm bg-gradient-to-b from-slate-50 via-white to-slate-50 overflow-hidden'
          : 'flex flex-col w-full h-[100dvh] md:h-auto md:max-h-[92vh] md:max-w-2xl md:rounded-2xl md:shadow-2xl bg-gradient-to-b from-slate-50 via-white to-slate-50 overflow-hidden'
      }
    >
      <div className={`flex-shrink-0 py-3 sm:py-4 border-b border-slate-200/80 bg-white/95 backdrop-blur-md ${flush ? 'px-0 sm:px-6' : 'px-4 sm:px-6'}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <DollarSign className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                Controle Financeiro
              </p>
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
                {embedded
                  ? 'Pagamentos e parcelas'
                  : paciente.dadosIdentificacao?.nomeCompleto || paciente.nome}
              </h2>
            </div>
          </div>
          {!embedded ? (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 shrink-0 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto overflow-x-hidden min-w-0 space-y-5 ${flush ? 'px-0 py-3 sm:px-6 sm:py-5' : 'px-4 sm:px-6 py-5'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(10rem,0.45fr)_minmax(0,1.55fr)] gap-4 lg:gap-5 lg:items-stretch min-w-0">
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col lg:min-h-[28rem] max-h-[min(40vh,22rem)] lg:max-h-none">
            <div className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/40 px-3 py-3 space-y-2.5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Vendas</p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">
                  {grupos.length} registro{grupos.length === 1 ? '' : 's'}
                </p>
              </div>
              {!readOnly ? (
              <button
                type="button"
                onClick={() => {
                  setNovaVendaDataSelecionada(new Date().toISOString().slice(0, 10));
                  setShowModalNovaVendaData(true);
                }}
                className="w-full px-2.5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 inline-flex items-center justify-center gap-1.5 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Venda
              </button>
              ) : null}
            </div>
            <nav
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain py-2 px-2 space-y-0.5"
              aria-label="Vendas do paciente"
            >
              {grupos.map((grupo, idx) => {
                const ativo = tabIdx === idx;
                const dataLabel = grupo.data
                  .toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                  .replace(/\./g, '');
                return (
                  <div
                    key={`venda-${idx}-${grupo.label}`}
                    className={`w-full flex items-start gap-1 rounded-lg pr-1 transition-colors ${
                      ativo
                        ? 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-500/30'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setVendaTabAtiva(idx)}
                      className="min-w-0 flex-1 px-2.5 py-2 text-left"
                    >
                      <span className="block text-sm font-medium leading-tight truncate">
                        {grupo.label}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500 tabular-nums">
                        <Calendar className="w-3 h-3 shrink-0 opacity-70" aria-hidden />
                        {dataLabel}
                        {grupo.label === 'Venda Inicial' ? (
                          <span className="text-slate-400">· cadastro</span>
                        ) : null}
                      </span>
                      {grupo.valorPendente > 0 ? (
                        <span className="mt-1 inline-flex text-[10px] font-semibold text-amber-700 bg-amber-50 ring-1 ring-amber-200/80 rounded-full px-1.5 py-0.5">
                          Pend. R$ {fmtMoeda(grupo.valorPendente)}
                        </span>
                      ) : grupo.valorTotal > 0 ? (
                        <span className="mt-1 inline-flex text-[10px] font-semibold text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200/80 rounded-full px-1.5 py-0.5">
                          Quitada
                        </span>
                      ) : null}
                    </button>
                    {!readOnly && grupo.indices.length > 0 ? (
                      <button
                        type="button"
                        disabled={salvando}
                        onClick={async () => {
                          if (!window.confirm(`Excluir ${grupo.label}? As parcelas desta venda serão removidas.`)) {
                            return;
                          }
                          const novasParcelas = removerParcelasDoGrupo(parcelas, grupo.indices);
                          const pagamentoAtualizado: PagamentoPaciente = {
                            ...dadosPagamento,
                            parcelas: novasParcelas,
                            ...recalcularTotaisParcelas(novasParcelas),
                            statusPagamento: derivarStatusPagamentoDeParcelas(novasParcelas),
                            dataUltimaAtualizacao: new Date(),
                          };
                          const focarVenda = (atual: number) => {
                            if (idx < atual) return atual - 1;
                            if (idx === atual) return Math.max(0, Math.min(atual, grupos.length - 2));
                            return atual;
                          };
                          if (!onSave) {
                            setDadosPagamento(pagamentoAtualizado);
                            setVendaTabAtiva(focarVenda);
                            return;
                          }
                          try {
                            setSalvando(true);
                            await onSave(pagamentoAtualizado);
                            setDadosPagamento(pagamentoAtualizado);
                            setVendaTabAtiva(focarVenda);
                            onFeedback?.(`${grupo.label} excluída.`);
                          } catch (error) {
                            console.error('Erro ao excluir venda:', error);
                            onFeedback?.('Erro ao excluir venda');
                          } finally {
                            setSalvando(false);
                          }
                        }}
                        className="mt-1.5 p-1.5 rounded-lg text-red-500 hover:bg-red-50 shrink-0 transition-colors"
                        title={`Excluir ${grupo.label}`}
                        aria-label={`Excluir ${grupo.label}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </nav>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col lg:min-h-[28rem]">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Detalhe da venda
                </p>
                <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">
                  {grupoAtivo.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3 shrink-0" />
                  {grupoAtivo.data.toLocaleDateString('pt-BR')}
                  {grupoAtivo.label === 'Venda Inicial' && (
                    <span className="text-slate-400">· cadastro</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="grid grid-cols-3 divide-x divide-slate-100">
                <div className="px-3 py-3 sm:px-4 sm:py-4 text-center sm:text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Total
                  </p>
                  <p className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                    R$ {fmtMoeda(grupoAtivo.valorTotal)}
                  </p>
                </div>
                <div className="px-3 py-3 sm:px-4 sm:py-4 text-center sm:text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                    Pago
                  </p>
                  <p className="text-sm sm:text-base font-bold text-emerald-700 mt-0.5">
                    R$ {fmtMoeda(grupoAtivo.valorPago)}
                  </p>
                </div>
                <div className="px-3 py-3 sm:px-4 sm:py-4 text-center sm:text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                    Pendente
                  </p>
                  <p className="text-sm sm:text-base font-bold text-amber-600 mt-0.5">
                    R$ {fmtMoeda(grupoAtivo.valorPendente)}
                  </p>
                </div>
              </div>

              <div className="px-4 py-4 border-t border-slate-100">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Parcelas
                  </p>
                  <span className="text-xs text-slate-400">
                    {grupoAtivo.indices.length}{' '}
                    {grupoAtivo.indices.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>

                {grupoAtivo.indices.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
                    <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Nenhuma parcela nesta venda.</p>
                    {!readOnly ? (
                      <p className="text-xs text-slate-400 mt-1">Adicione a primeira parcela abaixo.</p>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-3 pr-0.5">
                    {grupoAtivo.indices.map((idx) => {
                      const parcela = parcelas[idx];
                      return (
                        <div
                          key={idx}
                          className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-slate-50 border-b border-slate-100">
                            <span className="text-sm font-semibold text-slate-800">
                              Parcela {parcela.numero}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <select
                                value={parcela.status}
                                disabled={readOnly}
                                onChange={(e) => {
                                  const novasParcelas = [...parcelas];
                                  const novoStatus = e.target.value as
                                    | 'pendente'
                                    | 'paga'
                                    | 'atrasada';
                                  const dataVenc = parcela.dataVencimento;
                                  const dataPagSePaga =
                                    novoStatus === 'paga'
                                      ? toDatePagamento(dataVenc) ?? new Date()
                                      : undefined;
                                  novasParcelas[idx] = {
                                    ...parcela,
                                    status: novoStatus,
                                    dataPagamento: dataPagSePaga,
                                  };
                                  atualizarParcelas(novasParcelas);
                                }}
                                className={`text-xs font-medium px-2.5 py-1 rounded-lg border focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${statusParcelaClass(parcela.status)} ${readOnly ? 'cursor-default opacity-90' : 'cursor-pointer'}`}
                              >
                                <option value="pendente">Pendente</option>
                                <option value="paga">Paga</option>
                                <option value="atrasada">Atrasada</option>
                              </select>
                              {parcelas.length > 1 && !readOnly && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    let novasParcelas = parcelas.filter((_, i) => i !== idx);
                                    if (
                                      parcela.dataVenda &&
                                      novasParcelas[idx] &&
                                      !novasParcelas[idx].dataVenda
                                    ) {
                                      novasParcelas = novasParcelas.map((p, i) =>
                                        i === idx ? { ...p, dataVenda: parcela.dataVenda } : p
                                      );
                                    }
                                    atualizarParcelas(novasParcelas);
                                  }}
                                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                  title="Deletar parcela"
                                  aria-label="Deletar parcela"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                                Valor (R$)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={parcela.valor || ''}
                                disabled={readOnly}
                                onChange={(e) => {
                                  const novasParcelas = [...parcelas];
                                  novasParcelas[idx] = {
                                    ...parcela,
                                    valor: parseFloat(e.target.value) || 0,
                                  };
                                  atualizarParcelas(novasParcelas);
                                }}
                                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 disabled:bg-slate-50 disabled:text-slate-700"
                                placeholder="0,00"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                                Vencimento
                              </label>
                              <input
                                type="date"
                                value={
                                  parcela.dataVencimento
                                    ? new Date(parcela.dataVencimento).toISOString().slice(0, 10)
                                    : ''
                                }
                                disabled={readOnly}
                                onChange={(e) => {
                                  const novasParcelas = [...parcelas];
                                  const novaData = e.target.value
                                    ? new Date(`${e.target.value}T00:00:00`)
                                    : undefined;
                                  novasParcelas[idx] = {
                                    ...parcela,
                                    dataVencimento: novaData as Date,
                                  };
                                  setDadosPagamento({ ...dadosPagamento, parcelas: novasParcelas });
                                }}
                                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 disabled:bg-slate-50 disabled:text-slate-700"
                              />
                            </div>
                            {parcela.status === 'paga' && (
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
                                  Data do pagamento
                                </label>
                                <input
                                  type="date"
                                  value={
                                    parcela.dataPagamento
                                      ? new Date(parcela.dataPagamento).toISOString().slice(0, 10)
                                      : parcela.dataVencimento
                                        ? new Date(parcela.dataVencimento).toISOString().slice(0, 10)
                                        : ''
                                  }
                                  onChange={(e) => {
                                    const novasParcelas = [...parcelas];
                                    const novaData = e.target.value
                                      ? new Date(`${e.target.value}T00:00:00`)
                                      : undefined;
                                    novasParcelas[idx] = { ...parcela, dataPagamento: novaData };
                                    setDadosPagamento({
                                      ...dadosPagamento,
                                      parcelas: novasParcelas,
                                    });
                                  }}
                                  disabled={readOnly}
                                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 disabled:bg-slate-50 disabled:text-slate-700"
                                  title="Data em que o valor foi efetivamente recebido"
                                />
                              </div>
                            )}
                            {(parcela.status === 'pendente' || parcela.status === 'atrasada') &&
                              (parcela.valor || 0) > 0 &&
                              !readOnly && (
                                <div className="sm:col-span-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPagamentoParcialIdx(idx);
                                      setPagamentoParcialValor('');
                                    }}
                                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                  >
                                    <DollarSign className="w-3.5 h-3.5" />
                                    Inserir pagamento parcial
                                  </button>
                                </div>
                              )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!readOnly ? (
                <button
                  type="button"
                  onClick={adicionarParcelaNaVendaAtiva}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Parcela
                </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {grupos.length > 1 && (
          <div className="rounded-2xl bg-slate-900 text-white p-4 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Total geral
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total</p>
                <p className="text-sm sm:text-base font-bold mt-0.5">R$ {fmtMoeda(totalGeral)}</p>
              </div>
              <div>
                <p className="text-[10px] text-emerald-400 uppercase tracking-wide">Pago</p>
                <p className="text-sm sm:text-base font-bold text-emerald-300 mt-0.5">
                  R$ {fmtMoeda(pagoGeral)}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-amber-400 uppercase tracking-wide">Pendente</p>
                <p className="text-sm sm:text-base font-bold text-amber-300 mt-0.5">
                  R$ {fmtMoeda(pendenteGeral)}
                </p>
              </div>
            </div>
          </div>
        )}

        {(!dadosPagamento.parcelas || dadosPagamento.parcelas.length === 0) &&
          (dadosPagamento.valorPendente || 0) > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Data prevista para receber
              </label>
              <input
                type="date"
                value={
                  dadosPagamento.dataVencimento
                    ? new Date(dadosPagamento.dataVencimento).toISOString().slice(0, 10)
                    : ''
                }
                disabled={readOnly}
                onChange={(e) => {
                  const novaData = e.target.value
                    ? new Date(`${e.target.value}T00:00:00`)
                    : undefined;
                  setDadosPagamento({
                    ...dadosPagamento,
                    dataVencimento: novaData,
                  });
                }}
                className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              />
            </div>
          )}

        {pagamentoParcialIdx !== null &&
          (() => {
            const parcelaRef = dadosPagamento.parcelas?.[pagamentoParcialIdx];
            if (!parcelaRef) return null;
            const valorParcela = parcelaRef.valor || 0;
            const valorParcialNum = parseFloat(pagamentoParcialValor.replace(',', '.')) || 0;
            const saldoRestante = Math.round((valorParcela - valorParcialNum) * 100) / 100;
            const valorParcialValido = valorParcialNum > 0 && valorParcialNum < valorParcela;
            return (
              <div
                className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={() => {
                  setPagamentoParcialIdx(null);
                  setPagamentoParcialValor('');
                }}
              >
                <div
                  className="bg-white rounded-2xl shadow-2xl p-5 max-w-sm w-full border border-slate-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-100 text-blue-700">
                      <DollarSign className="w-4 h-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Pagamento parcial</h3>
                      <p className="text-xs text-slate-500">
                        Parcela {parcelaRef.numero} · R${' '}
                        {valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                    Valor recebido (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={valorParcela - 0.01}
                    value={pagamentoParcialValor}
                    onChange={(e) => setPagamentoParcialValor(e.target.value)}
                    className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 mb-3"
                    placeholder="Ex.: 500,00"
                    autoFocus
                  />
                  {valorParcialValido &&
                    (() => {
                      const vencSaldo = new Date();
                      vencSaldo.setHours(0, 0, 0, 0);
                      vencSaldo.setMonth(vencSaldo.getMonth() + 1);
                      return (
                        <p className="text-xs text-slate-600 mb-4 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                          R${' '}
                          {valorParcialNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} será
                          marcado como pago e uma nova parcela de R${' '}
                          {saldoRestante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ficará
                          em aberto com vencimento em {vencSaldo.toLocaleDateString('pt-BR')}.
                        </p>
                      );
                    })()}
                  {pagamentoParcialValor && !valorParcialValido && (
                    <p className="text-xs text-red-600 mb-4">
                      Informe um valor maior que zero e menor que R${' '}
                      {valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.
                    </p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setPagamentoParcialIdx(null);
                        setPagamentoParcialValor('');
                      }}
                      className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={!valorParcialValido}
                      onClick={() => {
                        const idx = pagamentoParcialIdx;
                        const parcela = dadosPagamento.parcelas?.[idx];
                        if (!parcela) return;
                        const valorOriginal = parcela.valor || 0;
                        const saldo = Math.round((valorOriginal - valorParcialNum) * 100) / 100;
                        const hoje = new Date();
                        hoje.setHours(0, 0, 0, 0);
                        const dataVencimentoSaldo = new Date(hoje);
                        dataVencimentoSaldo.setMonth(hoje.getMonth() + 1);
                        const atuais = dadosPagamento.parcelas || [];
                        const novasParcelas = [...atuais];
                        novasParcelas[idx] = {
                          ...parcela,
                          valor: valorParcialNum,
                          status: 'paga',
                          dataPagamento: hoje,
                        };
                        novasParcelas.splice(idx + 1, 0, {
                          numero: parcela.numero + 1,
                          valor: saldo,
                          dataVencimento: dataVencimentoSaldo,
                          status: 'pendente',
                        });
                        const renumeradas = renumberarParcelas(novasParcelas);
                        setDadosPagamento({
                          ...dadosPagamento,
                          parcelas: renumeradas,
                          ...recalcularTotaisParcelas(renumeradas),
                        });
                        setPagamentoParcialIdx(null);
                        setPagamentoParcialValor('');
                      }}
                      className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

        {showModalNovaVendaData && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowModalNovaVendaData(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl p-5 max-w-sm w-full border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-100 text-blue-700">
                  <Plus className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Nova Venda</h3>
                  <p className="text-xs text-slate-500">Data registrada nas estatísticas de vendido</p>
                </div>
              </div>
              <input
                type="date"
                value={novaVendaDataSelecionada}
                onChange={(e) => setNovaVendaDataSelecionada(e.target.value)}
                className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 mb-5"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModalNovaVendaData(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const dataVenda = new Date(`${novaVendaDataSelecionada}T00:00:00`);
                    if (Number.isNaN(dataVenda.getTime())) return;
                    const atuais = dadosPagamento.parcelas || [];
                    const dataVencimento = new Date(dataVenda);
                    dataVencimento.setMonth(dataVenda.getMonth() + 1);
                    const novaParcela: ParcelaPagamento = {
                      numero: 1,
                      valor: 0,
                      dataVencimento,
                      status: 'pendente',
                      dataVenda,
                    };
                    const novasParcelas = renumberarParcelas([...atuais, novaParcela]);
                    const novosGrupos = obterGruposParcelasPorVenda(
                      novasParcelas,
                      dataVendaFallback
                    );
                    setDadosPagamento({
                      ...dadosPagamento,
                      parcelas: novasParcelas,
                      ...recalcularTotaisParcelas(novasParcelas),
                    });
                    setVendaTabAtiva(novosGrupos.length - 1);
                    setShowModalNovaVendaData(false);
                  }}
                  className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Observações
          </label>
          <textarea
            value={dadosPagamento.observacoes || ''}
            readOnly={readOnly}
            onChange={(e) => {
              setDadosPagamento({
                ...dadosPagamento,
                observacoes: e.target.value,
              });
            }}
            rows={3}
            className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 resize-none"
            placeholder="Anotações sobre o pagamento..."
          />
        </div>
      </div>

      {!readOnly ? (
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-t border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            disabled={salvando}
            onClick={() => void handleSalvar()}
            className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            title="Salvar"
            aria-label="Salvar"
          >
            <Save className="w-4 h-4" />
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
      ) : null}
    </div>
  );

  if (embedded) return shell;

  // Portal + z acima do PatientDetailsMobileModal (z-60) e overlays de exames/bio (z-70)
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col overflow-hidden md:items-center md:justify-center md:bg-black/50 md:p-4">
      {shell}
    </div>,
    document.body
  );
}

export function pagamentoVazioParaPaciente(pacienteId: string): PagamentoPaciente {
  return emptyPagamento(pacienteId);
}
