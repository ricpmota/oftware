'use client';

import { formatarMoedaBRL } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import { formatarPrazoMeses } from '@/lib/planoTerapeutico/planoTerapeuticoPlanoUi';
import { PLANO_PERSONALIZADO_CARD } from '@/lib/treatment-negotiation/constants';
import type { StatusNegociacaoTerapeutica } from '@/lib/treatment-negotiation/types';
import { STATUS_NEGOCIACAO_LABELS } from '@/lib/treatment-negotiation/types';
import type { PlanoTratamentoUnificado } from '@/lib/treatment-designer/types';

type Props = {
  plano: PlanoTratamentoUnificado;
  status: StatusNegociacaoTerapeutica;
  versaoAtual: number;
  nomePlano?: string;
  descricaoCurta?: string;
};

export default function PlanoPersonalizadoCard({ plano, status, versaoAtual, nomePlano, descricaoCurta }: Props) {
  const { estimativa } = plano;

  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-gradient-to-b from-amber-50/80 to-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-amber-100 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-amber-950">
              {nomePlano || PLANO_PERSONALIZADO_CARD.titulo}
            </h3>
            <span className="rounded-full bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5">
              {PLANO_PERSONALIZADO_CARD.badge}
            </span>
          </div>
          <p className="text-sm text-amber-800/90 mt-0.5">
            {descricaoCurta || PLANO_PERSONALIZADO_CARD.subtitulo}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Status
          </p>
          <p className="text-xs font-medium text-slate-800">{STATUS_NEGOCIACAO_LABELS[status]}</p>
          {versaoAtual > 0 && (
            <p className="text-[10px] text-slate-500 mt-0.5">Versão {versaoAtual}</p>
          )}
        </div>
      </div>

      <div className="px-4 py-3">
        <p className="text-sm text-slate-600">{PLANO_PERSONALIZADO_CARD.descricao}</p>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-white border border-amber-100 p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Prazo</p>
            <p className="text-sm font-semibold text-slate-900 tabular-nums">
              {formatarPrazoMeses(estimativa.duracaoMeses, { usarClampSlider: false })}
            </p>
          </div>
          <div className="rounded-xl bg-white border border-amber-100 p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Investimento</p>
            <p className="text-sm font-semibold text-slate-900 tabular-nums">
              {formatarMoedaBRL(plano.valorTotal)}
            </p>
          </div>
          <div className="rounded-xl bg-white border border-amber-100 p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Medicação</p>
            <p className="text-sm font-semibold text-slate-900 tabular-nums">
              {estimativa.quantidadeMedicacaoMg} mg
            </p>
          </div>
          <div className="rounded-xl bg-white border border-amber-100 p-3">
            <p className="text-[10px] uppercase tracking-wide text-slate-500">Semanas</p>
            <p className="text-sm font-semibold text-slate-900 tabular-nums">
              {estimativa.duracaoSemanas}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
