import {
  dataPrevistaConclusaoComoEsquema,
  primeiraDoseDoPlano,
} from '@/utils/datasAplicacaoSemanaPlano';

/**
 * Data prevista de Conclusão: mesma regra do Esquema de Doses (última aplicação + 8 dias).
 */
export function dataConclusaoPrevisaoPaciente(planoTerapeutico: any, evolucaoSeguimento: any[]): Date | null {
  if (!planoTerapeutico || !primeiraDoseDoPlano(planoTerapeutico)) return null;
  return dataPrevistaConclusaoComoEsquema(planoTerapeutico, evolucaoSeguimento || []);
}
