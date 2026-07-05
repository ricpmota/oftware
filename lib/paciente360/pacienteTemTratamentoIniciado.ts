import type { PacienteCompleto } from '@/types/obesidade';

/**
 * Mesmo critério de `prontuarioPlanoEventos.ts` (não importado para não acoplar ao prontuário).
 */
export function pacienteTemTratamentoIniciado(paciente: PacienteCompleto): boolean {
  const pt = paciente.planoTerapeutico;
  if (!pt) return false;
  if (pt.startDate) return true;
  const status = pt.titrationStatus;
  if (status && status !== 'INICIADO') return true;
  if (pt.historicoDoses && pt.historicoDoses.length > 0) return true;
  if (pt.esquemaDosesCustomizado && Object.keys(pt.esquemaDosesCustomizado).length > 0) return true;
  if (
    'dataInicioTratamento' in paciente &&
    Boolean((paciente as { dataInicioTratamento?: unknown }).dataInicioTratamento)
  ) {
    return true;
  }
  return false;
}
