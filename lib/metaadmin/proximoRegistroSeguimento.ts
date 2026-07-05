import type { PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';
import {
  dataPrevistaConclusaoComoEsquema,
  semanaIndexConclusao,
} from '@/utils/datasAplicacaoSemanaPlano';
import { buildSemanasEsquemaDoses } from '@/utils/esquemaDosesSemana';
import { localPlanejadoParaSemana, registroEvolucaoPorSemana } from '@/utils/evolucaoAplicacaoHelpers';

export type NovoRegistroSeguimentoContext =
  | {
      tipo: 'dose';
      semana: number;
      data: Date;
      doseMg: number;
      localAplicacao: 'abdome' | 'coxa' | 'braco';
    }
  | {
      tipo: 'conclusao';
      semana: number;
      data: Date;
    };

export function ehRegistroConclusaoSeguimento(reg: SeguimentoSemanal | null | undefined): boolean {
  if (!reg) return false;
  if (typeof reg.id === 'string' && reg.id.startsWith('seguimento-conclusao-')) return true;
  const cm = String(reg.comentarioMedico || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return cm.includes('semana de conclusao') || cm.includes('conclusao do tratamento');
}

export function conclusaoJaRegistrada(paciente: PacienteCompleto): boolean {
  const plano = paciente.planoTerapeutico;
  if (!plano) return false;
  const semConcl = semanaIndexConclusao(plano);
  const evolucao = paciente.evolucaoSeguimento || [];
  if (evolucao.some(ehRegistroConclusaoSeguimento)) return true;
  const reg = registroEvolucaoPorSemana(evolucao, semConcl);
  return ehRegistroConclusaoSeguimento(reg);
}

/**
 * Próximo registro alinhado ao Esquema de Doses: primeira semana sem dose aplicada (pula canceladas),
 * depois semana de Conclusão (peso + circunferência).
 */
export function resolverProximoRegistroSeguimento(
  paciente: PacienteCompleto
): NovoRegistroSeguimentoContext | null {
  const built = buildSemanasEsquemaDoses(paciente);
  if (!built) return null;

  for (const item of built.semanas) {
    if (item.isConclusao) continue;
    if (item.isCancelada) continue;
    if (item.temDoseAplicada) continue;

    return {
      tipo: 'dose',
      semana: item.semana,
      data: new Date(item.dataExibicao.getTime()),
      doseMg: item.doseAtual,
      localAplicacao: localPlanejadoParaSemana(item.semana),
    };
  }

  if (conclusaoJaRegistrada(paciente)) return null;

  const plano = paciente.planoTerapeutico!;
  const semConcl = semanaIndexConclusao(plano);
  const evolucao = paciente.evolucaoSeguimento || [];
  const dataConclusao = dataPrevistaConclusaoComoEsquema(plano, evolucao);

  return {
    tipo: 'conclusao',
    semana: semConcl,
    data: new Date(dataConclusao.getTime()),
  };
}
