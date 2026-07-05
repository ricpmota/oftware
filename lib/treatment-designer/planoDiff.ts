/**
 * Ponto de integração para diff dinâmico ao alterar meta ou prazo.
 * UI futura: "O plano foi atualizado." + lista de diferenças.
 */
import type { ResumoDinamicoTratamento } from '@/lib/treatment-designer/types';

export const MENSAGEM_PLANO_ATUALIZADO = 'O plano foi atualizado.' as const;

export type CampoPlanoComparavel =
  | 'consultas'
  | 'bioimpedancias'
  | 'mg'
  | 'aplicacoes'
  | 'prazo_meses'
  | 'perda_semanal_kg';

export type DiferencaPlanoItem = {
  campo: CampoPlanoComparavel;
  delta: number;
  /** Ex.: "+2 consultas", "+18 mg" */
  rotuloFormatado: string;
};

export type PlanoDiffResult = {
  alterado: boolean;
  mensagem: typeof MENSAGEM_PLANO_ATUALIZADO | null;
  itens: DiferencaPlanoItem[];
};

function formatarDelta(
  campo: CampoPlanoComparavel,
  delta: number
): string | null {
  if (delta === 0) return null;
  const sinal = delta > 0 ? '+' : '';
  switch (campo) {
    case 'consultas':
      return `${sinal}${delta} consulta${Math.abs(delta) === 1 ? '' : 's'}`;
    case 'bioimpedancias':
      return `${sinal}${delta} bioimpedância${Math.abs(delta) === 1 ? '' : 's'}`;
    case 'mg':
      return `${sinal}${Math.round(delta)} mg`;
    case 'aplicacoes':
      return `${sinal}${delta} aplicaç${Math.abs(delta) === 1 ? 'ão' : 'ões'}`;
    case 'prazo_meses':
      return `${sinal}${delta} ${Math.abs(delta) === 1 ? 'mês' : 'meses'}`;
    case 'perda_semanal_kg':
      return `${sinal}${delta.toFixed(1)} kg/semana`;
    default:
      return null;
  }
}

function pushSeDelta(
  itens: DiferencaPlanoItem[],
  campo: CampoPlanoComparavel,
  anterior: number,
  atual: number
): void {
  const delta = atual - anterior;
  const rotulo = formatarDelta(campo, delta);
  if (rotulo) {
    itens.push({ campo, delta, rotuloFormatado: rotulo });
  }
}

/**
 * Compara dois resumos de plano. Não renderizado na UI nesta etapa.
 * Integrar em PlanoTerapeuticoInterativoClient quando diff for exibido.
 */
export function compararResumosPlano(
  anterior: ResumoDinamicoTratamento | null,
  atual: ResumoDinamicoTratamento
): PlanoDiffResult {
  if (!anterior) {
    return { alterado: false, mensagem: null, itens: [] };
  }

  const itens: DiferencaPlanoItem[] = [];
  pushSeDelta(itens, 'consultas', anterior.consultas, atual.consultas);
  pushSeDelta(itens, 'bioimpedancias', anterior.bioimpedancias, atual.bioimpedancias);
  pushSeDelta(itens, 'mg', anterior.doseTotalMg, atual.doseTotalMg);
  pushSeDelta(itens, 'aplicacoes', anterior.aplicacoes, atual.aplicacoes);
  pushSeDelta(itens, 'prazo_meses', anterior.prazoMeses, atual.prazoMeses);
  pushSeDelta(
    itens,
    'perda_semanal_kg',
    anterior.perdaSemanalKg,
    atual.perdaSemanalKg
  );

  const alterado = itens.length > 0;
  return {
    alterado,
    mensagem: alterado ? MENSAGEM_PLANO_ATUALIZADO : null,
    itens,
  };
}
