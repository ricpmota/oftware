import type { PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';
import { semanaIndexFromRegistro } from '@/utils/evolucaoAplicacaoHelpers';
import { semanaInicioCicloDoPlano } from '@/utils/datasAplicacaoSemanaPlano';

export const MAX_SEMANAS_TRATAMENTO = 200;

function ehRegistroConclusao(reg: SeguimentoSemanal): boolean {
  if (typeof reg.id === 'string' && reg.id.startsWith('seguimento-conclusao-')) return true;
  const cm = String(reg.comentarioMedico || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return cm.includes('semana de conclusao') || cm.includes('conclusao do tratamento');
}

/** Maior semana com registro de evolução (exceto conclusão). 0 se não houver. */
export function maiorSemanaComRegistro(paciente: PacienteCompleto): number {
  let max = 0;
  for (const e of paciente.evolucaoSeguimento || []) {
    if (ehRegistroConclusao(e)) continue;
    const w = semanaIndexFromRegistro(e);
    if (w > max) max = w;
  }
  return max;
}

/** Mínimo ao editar semanas: não pode ficar abaixo do último registro do ciclo ativo. */
export function limiteMinimoNumeroSemanasTratamento(paciente: PacienteCompleto): number {
  const inicio = semanaInicioCicloDoPlano(paciente.planoTerapeutico);
  let max = 0;
  for (const e of paciente.evolucaoSeguimento || []) {
    if (ehRegistroConclusao(e)) continue;
    const w = semanaIndexFromRegistro(e);
    if (w >= inicio && w > max) max = w;
  }
  if (max < inicio) return 1;
  return Math.max(1, max - inicio + 1);
}

export function clampNumeroSemanasTratamento(n: number, min: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(MAX_SEMANAS_TRATAMENTO, Math.max(min, Math.floor(n)));
}
