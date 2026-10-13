import { parseDateKey } from '@/lib/whiteLabel/availabilitySlotUtils';

export function formatConsultaAgendadaTimelineText(input: {
  date: string;
  startTime: string;
  endTime?: string;
}): string {
  const parsed = parseDateKey(input.date);
  const dia = parsed
    ? new Date(parsed.year, parsed.month, parsed.day).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : input.date;
  const hora = input.endTime ? `${input.startTime} às ${input.endTime}` : input.startTime;
  return `Paciente escolheu a consulta: ${dia}, ${hora}.`;
}

export function formatConsultaAlteradaTimelineText(input: {
  date: string;
  startTime: string;
  endTime?: string;
  observacoes?: string;
}): string {
  const parsed = parseDateKey(input.date);
  const dia = parsed
    ? new Date(parsed.year, parsed.month, parsed.day).toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : input.date;
  const hora = input.endTime ? `${input.startTime} às ${input.endTime}` : input.startTime;
  const base = `Consulta alterada para: ${dia}, ${hora}.`;
  const note = input.observacoes?.trim();
  return note ? `${base} Observação: ${note}` : base;
}

/** Só avança da coluna inicial; não recua quem já está em cardápio/conclusão. */
export function shouldAdvanceNutriLeadToConsultasAgendadas(
  status: string | undefined,
  crmStageKey?: string | null
): boolean {
  const stage = (crmStageKey || status || 'nao_atendido').trim();
  return stage === 'nao_atendido' || stage === '';
}
