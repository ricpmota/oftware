'use client';

import { Sparkles } from 'lucide-react';
import { formatarMoedaBRL } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import { formatarPrazoMeses } from '@/lib/planoTerapeutico/planoTerapeuticoPlanoUi';
import {
  MODALIDADES_PLANO,
  resolvePlanoPorModalidade,
  type ResolvePlanoModalidadeInput,
} from '@/lib/planoTerapeutico/modalidadesPlano';
import type { ModalidadePlanoAutomaticoId } from '@/lib/treatment-negotiation/types';
import type { PlanoTratamentoUnificado } from '@/lib/treatment-designer/types';

type Props = {
  resolverInput: Omit<ResolvePlanoModalidadeInput, 'modalidade'>;
  onCriarPersonalizado: () => void;
  temPersonalizado: boolean;
};

const AUTOMATICOS: ModalidadePlanoAutomaticoId[] = ['mensal', 'trimestral', 'semestral'];

const TEMAS: Record<ModalidadePlanoAutomaticoId, string> = {
  mensal: 'border-sky-200 bg-sky-50/50',
  trimestral: 'border-teal-200 bg-teal-50/50',
  semestral: 'border-violet-200 bg-violet-50/50',
};

function ResumoPlanoAutomatico({ plano }: { plano: PlanoTratamentoUnificado }) {
  return (
    <dl className="mt-3 space-y-1 text-xs">
      <div className="flex justify-between gap-2">
        <dt className="text-slate-500">Prazo</dt>
        <dd className="font-medium text-slate-800 tabular-nums">
          {formatarPrazoMeses(plano.estimativa.duracaoMeses, { usarClampSlider: false })}
        </dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt className="text-slate-500">Investimento</dt>
        <dd className="font-medium text-slate-800 tabular-nums">
          {formatarMoedaBRL(plano.valorTotal)}
        </dd>
      </div>
      <div className="flex justify-between gap-2">
        <dt className="text-slate-500">Medicação</dt>
        <dd className="font-medium text-slate-800 tabular-nums">
          {plano.estimativa.quantidadeMedicacaoMg} mg
        </dd>
      </div>
    </dl>
  );
}

export default function PlanosAutomaticosReferencia({
  resolverInput,
  onCriarPersonalizado,
  temPersonalizado,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Planos automáticos (referência)</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Calculados automaticamente — somente leitura. Não podem ser editados manualmente.
          </p>
        </div>
        {!temPersonalizado && (
          <button
            type="button"
            onClick={onCriarPersonalizado}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-amber-900 bg-amber-100 border border-amber-200 rounded-lg hover:bg-amber-200 transition-colors shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Criar Plano Personalizado
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {AUTOMATICOS.map((id) => {
          const plano = resolvePlanoPorModalidade({ ...resolverInput, modalidade: id });
          const rotulo = MODALIDADES_PLANO.find((m) => m.id === id)?.rotulo ?? id;
          return (
            <div
              key={id}
              className={`rounded-xl border p-4 ${TEMAS[id]}`}
              aria-readonly="true"
            >
              <p className="text-sm font-semibold text-slate-900">{rotulo}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-500 mt-1">
                Somente leitura
              </p>
              <ResumoPlanoAutomatico plano={plano} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
