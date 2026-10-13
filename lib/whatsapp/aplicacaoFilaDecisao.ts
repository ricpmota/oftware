import type { PacienteCompleto } from '@/types/obesidade';
import { buildSemanasEsquemaDoses } from '@/utils/esquemaDosesSemana';

export type DecisaoLembreteAplicacaoWhatsapp =
  | { pular: true; motivo: string }
  | { pular: false; registrada: boolean };

/**
 * O cron só deve enviar lembrete de aplicação se o paciente está em tratamento
 * e a semana ainda existe no plano vigente. Semana ausente (protocolo apagado)
 * não é "aplicação pendente".
 */
export function decisaoLembreteAplicacaoWhatsapp(
  paciente: PacienteCompleto,
  semana: number,
): DecisaoLembreteAplicacaoWhatsapp {
  if (paciente.statusTratamento !== 'em_tratamento') {
    return { pular: true, motivo: 'Paciente não está em tratamento.' };
  }

  const built = buildSemanasEsquemaDoses(paciente);
  const alvo = built?.semanas.find((s) => s.semana === semana && !s.isConclusao);
  if (!alvo) {
    return { pular: true, motivo: 'Aplicação não existe mais no plano terapêutico.' };
  }

  return { pular: false, registrada: alvo.temDoseAplicada === true };
}
