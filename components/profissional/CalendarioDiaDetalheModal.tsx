'use client';

import { X } from 'lucide-react';

export type StatusCalendarioEvolucao =
  | 'aplicado'
  | 'nao_preencheu'
  | 'futuro'
  | 'concluido'
  | 'conclusao_prevista'
  | 'cancelada'
  | 'perdida';

export type PagamentoDiaCalendario = {
  valor: number;
  status: string;
};

export type CalendarioDiaDetalhe = {
  data: Date;
  weekIndex?: number;
  /** Semana relativa ao protocolo (exibição). */
  semanaExibicao?: number;
  protocoloIndice?: number;
  status?: StatusCalendarioEvolucao;
  pagamentos?: PagamentoDiaCalendario[];
};

const STATUS_META: Record<
  StatusCalendarioEvolucao,
  { label: string; tone: string; explicacao: string }
> = {
  aplicado: {
    label: 'Aplicado',
    tone: 'bg-emerald-500 text-white',
    explicacao:
      'Nesta data está prevista (ou foi registrada) a aplicação da dose desta semana, e o paciente já marcou como aplicada.',
  },
  concluido: {
    label: 'Concluído',
    tone: 'bg-violet-500 text-white',
    explicacao:
      'Esta é a data da semana de conclusão do tratamento, e a conclusão já foi preenchida.',
  },
  conclusao_prevista: {
    label: 'Conclusão prevista',
    tone: 'bg-violet-600 text-white',
    explicacao:
      'Data prevista para a semana de conclusão do tratamento. Ainda não há conclusão preenchida.',
  },
  perdida: {
    label: 'Perdida',
    tone: 'bg-rose-600 text-white',
    explicacao:
      'A aplicação desta semana foi marcada como perdida ou esquecida — o paciente não aplicou a dose no período.',
  },
  nao_preencheu: {
    label: 'Não preenchido',
    tone: 'bg-rose-500 text-white',
    explicacao:
      'Data prevista da aplicação desta semana. A data já passou e o paciente ainda não registrou a aplicação/check-in.',
  },
  cancelada: {
    label: 'Cancelada',
    tone: 'bg-slate-400 text-white',
    explicacao:
      'Esta semana foi cancelada no plano terapêutico e não deve receber aplicação.',
  },
  futuro: {
    label: 'Futuro',
    tone: 'bg-sky-500 text-white',
    explicacao:
      'Data prevista da aplicação/check-in desta semana. Ainda não chegou — é um compromisso futuro do tratamento.',
  },
};

const PAGAMENTO_META: Record<string, { label: string; tone: string; explicacao: string }> = {
  paga: {
    label: 'Pago',
    tone: 'bg-emerald-500 text-white',
    explicacao: 'Parcela financeira marcada como paga nesta data.',
  },
  venda: {
    label: 'Venda',
    tone: 'bg-sky-500 text-white',
    explicacao: 'Data em que a venda/parcela foi registrada.',
  },
  vencimento: {
    label: 'Vencimento',
    tone: 'bg-amber-500 text-white',
    explicacao: 'Data de vencimento de uma parcela em aberto.',
  },
};

function fmtValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDataLonga(d: Date) {
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

type Props = {
  open: boolean;
  detalhe: CalendarioDiaDetalhe | null;
  onClose: () => void;
};

export function CalendarioDiaDetalheModal({ open, detalhe, onClose }: Props) {
  if (!open || !detalhe) return null;

  const statusMeta = detalhe.status ? STATUS_META[detalhe.status] : null;
  const pagamentos = detalhe.pagamentos || [];

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendario-dia-detalhe-titulo"
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-5 border border-slate-200/80 dark:border-slate-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Detalhe do dia
            </p>
            <h3
              id="calendario-dia-detalhe-titulo"
              className="text-base font-semibold text-slate-900 dark:text-slate-50 capitalize mt-0.5"
            >
              {fmtDataLonga(detalhe.data)}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          {statusMeta && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 p-3.5">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {detalhe.weekIndex != null && (
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900">
                    Semana {detalhe.semanaExibicao ?? detalhe.weekIndex}
                    {detalhe.protocoloIndice != null && detalhe.protocoloIndice > 1
                      ? ` · Protocolo ${detalhe.protocoloIndice}`
                      : ''}
                  </span>
                )}
                <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${statusMeta.tone}`}>
                  {statusMeta.label}
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                {statusMeta.explicacao}
              </p>
            </div>
          )}

          {pagamentos.map((p, i) => {
            const meta = PAGAMENTO_META[p.status] || {
              label: p.status,
              tone: 'bg-slate-500 text-white',
              explicacao: 'Informação financeira nesta data.',
            };
            return (
              <div
                key={`${p.status}-${i}`}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/50 p-3.5"
              >
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${meta.tone}`}>
                    {meta.label}
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {fmtValor(p.valor)}
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  {meta.explicacao}
                </p>
              </div>
            );
          })}

          {!statusMeta && pagamentos.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Não há informações registradas nesta data.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 transition-colors"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

export function labelStatusCalendario(status: StatusCalendarioEvolucao): string {
  return STATUS_META[status].label;
}
