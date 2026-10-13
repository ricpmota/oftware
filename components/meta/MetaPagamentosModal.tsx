'use client';

import { DollarSign, Loader2, X } from 'lucide-react';
import { ObservacaoVendaResumo } from '@/components/metaadmin/ObservacaoVendaPanel';
import RelatorioFinanceiroPagamentosButton from '@/components/meta/RelatorioFinanceiroPagamentosButton';
import {
  buildVendasPdfFromPagamentoPaciente,
  getStatusPagamentoPaciente,
  getValoresPacienteDeParcelas,
} from '@/lib/metaadmin/buildFinanceiroRelatorioTransacoes';
import { observacaoVendaTemConteudo } from '@/lib/metaadmin/observacaoVenda';
import type { PacienteCompleto } from '@/types/obesidade';
import type { PagamentoPaciente } from '@/types/pagamento';

function formatMoney(v: number): string {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatData(v: Date | null | undefined): string {
  if (!v) return '—';
  if (Number.isNaN(v.getTime())) return '—';
  return v.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function statusLabel(status: string): string {
  if (status === 'pago') return 'Pago';
  if (status === 'iniciou_pagamento') return 'Parcial';
  return 'Aberto';
}

function statusBadgeClass(status: string): string {
  if (status === 'pago') return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300';
  if (status === 'iniciou_pagamento') {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300';
  }
  return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
}

function parcelaStatusLabel(status: string): string {
  if (status === 'paga') return 'Paga';
  if (status === 'atrasada') return 'Atrasada';
  return 'Pendente';
}

function parcelaStatusClass(status: string): string {
  if (status === 'paga') return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400';
  if (status === 'atrasada') return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400';
  return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400';
}

export type MetaPagamentosModalProps = {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  pagamento: PagamentoPaciente | null;
  paciente: PacienteCompleto | null;
};

export default function MetaPagamentosModal({
  open,
  onClose,
  loading,
  pagamento,
  paciente,
}: MetaPagamentosModalProps) {
  if (!open) return null;

  const totais = getValoresPacienteDeParcelas(pagamento);
  const status = getStatusPagamentoPaciente(pagamento);
  const { vendas } =
    pagamento != null
      ? buildVendasPdfFromPagamentoPaciente(pagamento, paciente || undefined)
      : { vendas: [] };
  const temVendas = vendas.some((v) => v.valorTotal > 0 || v.parcelas.length > 0);

  return (
    <div className="fixed inset-0 z-[70] flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-white dark:bg-gray-800">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30">
                <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Pagamentos</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Detalhes das vendas e parcelas</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col">
          {loading ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-emerald-600" />
              <p className="text-gray-500 dark:text-gray-400">Carregando pagamentos...</p>
            </div>
          ) : !temVendas ? (
            <div className="flex flex-1 flex-col items-center justify-center py-12 text-center text-gray-500 dark:text-gray-400">
              <DollarSign className="mx-auto mb-4 h-16 w-16 opacity-40" />
              <p className="font-medium">Nenhuma venda registrada</p>
              <p className="mt-1 text-sm">
                As vendas e parcelas aparecerão aqui quando forem cadastradas.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Total</p>
                  <p className="mt-1 text-xl font-semibold text-blue-700 dark:text-blue-400 tabular-nums">
                    {formatMoney(totais.valorTotal)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Recebido</p>
                  <p className="mt-1 text-xl font-semibold text-green-700 dark:text-green-400 tabular-nums">
                    {formatMoney(totais.valorPago)}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80 p-4">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Em aberto</p>
                  <p className="mt-1 text-xl font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                    {formatMoney(totais.valorPendente)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(status)}`}
                >
                  {statusLabel(status)}
                </span>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Vendas e parcelas</h4>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {vendas.map((venda, idx) => (
                    <div key={`${venda.label}-${idx}`} className="px-4 py-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{venda.label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{formatData(venda.data)}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-semibold text-gray-900 dark:text-white tabular-nums">
                            {formatMoney(venda.valorTotal)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Pago {formatMoney(venda.valorPago)} · Aberto {formatMoney(venda.valorPendente)}
                          </p>
                        </div>
                      </div>

                      {venda.parcelas.length > 0 && (
                        <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
                          <table className="min-w-full text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-500 dark:text-gray-400">
                              <tr>
                                <th className="px-2.5 py-2 text-left font-medium">#</th>
                                <th className="px-2.5 py-2 text-left font-medium">Vencimento</th>
                                <th className="px-2.5 py-2 text-left font-medium">Pagamento</th>
                                <th className="px-2.5 py-2 text-left font-medium">Status</th>
                                <th className="px-2.5 py-2 text-right font-medium">Valor</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                              {venda.parcelas.map((p) => (
                                <tr key={`${venda.label}-${p.numero}`}>
                                  <td className="px-2.5 py-2 text-gray-700 dark:text-gray-300">{p.numero}</td>
                                  <td className="px-2.5 py-2 text-gray-600 dark:text-gray-400">
                                    {formatData(p.dataVencimento)}
                                  </td>
                                  <td className="px-2.5 py-2 text-gray-600 dark:text-gray-400">
                                    {formatData(p.dataPagamento)}
                                  </td>
                                  <td className="px-2.5 py-2">
                                    <span
                                      className={`inline-flex text-[11px] px-2 py-0.5 rounded-full ${parcelaStatusClass(p.status)}`}
                                    >
                                      {parcelaStatusLabel(p.status)}
                                    </span>
                                  </td>
                                  <td className="px-2.5 py-2 text-right font-medium tabular-nums text-gray-900 dark:text-white">
                                    {formatMoney(p.valor)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {observacaoVendaTemConteudo(venda.observacao) ? (
                        <div className="rounded-lg border border-slate-100 dark:border-gray-700 bg-slate-50/80 dark:bg-gray-900/30 p-3">
                          <ObservacaoVendaResumo obs={venda.observacao} valorVenda={venda.valorTotal} />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>

              {pagamento?.observacoes?.trim() &&
                !vendas.some((v) => observacaoVendaTemConteudo(v.observacao)) && (
                  <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Observações</h4>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                      {pagamento.observacoes.trim()}
                    </p>
                  </div>
                )}
            </div>
          )}
          </div>
        </div>

        {paciente?.id ? (
          <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:border-gray-700 dark:bg-gray-800">
            <div className="mx-auto w-full max-w-3xl">
              <RelatorioFinanceiroPagamentosButton pacienteId={paciente.id} fullWidth />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
