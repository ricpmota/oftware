import type { ContratoTratamentoDocumentoRecord } from '@/lib/documentos/contrato-tratamento/contratoTratamentoTypes';
import type { ContratoTratamentoStatusAssinatura } from '@/lib/documentos/contrato-tratamento/contratoTratamentoTypes';
import { contratoTemAssinaturaMedica } from '@/lib/documentos/contrato-tratamento/contratoTratamentoFluxoAssinatura';

/** Rótulos curtos para badge na lista (Base do Tratamento). */
export const CONTRATO_TRATAMENTO_STATUS_BADGE_LABELS: Record<ContratoTratamentoStatusAssinatura, string> = {
  rascunho: 'Rascunho',
  assinado_medico: 'Médico assinado',
  aguardando_paciente: '🟡 Paciente pendente',
  aguardando_medico: 'Paciente assinou',
  assinado_completo: 'Completo',
};

export function contratoTratamentoStatusBadgeClass(
  status: ContratoTratamentoStatusAssinatura
): string {
  switch (status) {
    case 'rascunho':
      return 'bg-gray-100 text-gray-700 border-gray-200';
    case 'assinado_medico':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'aguardando_paciente':
      return 'bg-amber-50 text-amber-900 border-amber-200';
    case 'aguardando_medico':
      return 'bg-indigo-50 text-indigo-900 border-indigo-200';
    case 'assinado_completo':
      return 'bg-green-50 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export function medicoJaAssinouContrato(
  status: ContratoTratamentoStatusAssinatura,
  documento?: ContratoTratamentoDocumentoRecord | null
): boolean {
  if (status === 'assinado_completo') return true;
  if (contratoTemAssinaturaMedica(documento)) return true;
  if (status === 'assinado_medico') return true;
  return false;
}

export function pacienteAssinaturaPendente(status: ContratoTratamentoStatusAssinatura): boolean {
  return status === 'aguardando_paciente' || status === 'assinado_medico';
}
