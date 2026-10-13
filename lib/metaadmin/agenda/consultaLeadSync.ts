import { formatConsultaAgendadaTimelineText } from '@/lib/nutri/agenda/consultaLeadSync';

export { formatConsultaAgendadaTimelineText };

/** Só avança da coluna inicial; não recua quem já passou de Não Qualificado. */
export function shouldAdvanceMedicoLeadToConsultasAgendadas(
  status: string | undefined,
  crmStageKey?: string | null
): boolean {
  const stage = (crmStageKey || status || 'nao_qualificado').trim();
  return stage === 'nao_qualificado' || stage === '';
}
