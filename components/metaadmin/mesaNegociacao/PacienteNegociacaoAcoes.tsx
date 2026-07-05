'use client';

import { MessageSquare, CheckCircle2 } from 'lucide-react';
import { TreatmentNegotiationService } from '@/lib/treatment-negotiation';
import type { StatusNegociacaoTerapeutica } from '@/lib/treatment-negotiation/types';

type Props = {
  status: StatusNegociacaoTerapeutica;
};

/**
 * Ações do paciente na negociação — preparado para etapa futura.
 * Nesta versão: somente visualização (botões desabilitados).
 */
export default function PacienteNegociacaoAcoes({ status }: Props) {
  const podeAceitar = TreatmentNegotiationService.acaoPacientePermitida(
    status,
    'aceitar_proposta'
  );
  const podeSolicitar = TreatmentNegotiationService.acaoPacientePermitida(
    status,
    'solicitar_alteracoes'
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Ações do paciente (em breve)
      </p>
      <p className="text-xs text-slate-600">
        {status === 'PROPOSTA_MEDICO'
          ? 'Seu médico enviou uma proposta de Plano Personalizado. Revise os detalhes abaixo.'
          : 'Nesta etapa o paciente visualiza a proposta. Aceite e contraproposta serão habilitados em versão futura.'}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!podeAceitar}
          title="Disponível quando o médico enviar a proposta"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Aceitar proposta
        </button>
        <button
          type="button"
          disabled={!podeSolicitar}
          title="Disponível quando o médico enviar a proposta"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Solicitar alterações
        </button>
      </div>
    </div>
  );
}
