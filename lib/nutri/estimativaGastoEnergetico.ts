/**
 * Estimativa do Gasto Energético Total (ETAPA 6).
 * GET estimado = TMB estimada × fator de atividade (aproximação operacional).
 * Sem déficit, meta alimentar, GLP-1 ou intensidade desejada.
 */

import type { EstimativaTaxaMetabolicaBasal } from '@/lib/nutri/estimativaMetabolica';
import type { AtividadeFisicaEnergeticaDeclarada } from '@/lib/nutri/dadosEnergeticosPaciente';

export type HorasSentadoEnergetica = '<4h' | '4-8h' | '>8h';

export interface ContextoAtividadeEnergetica {
  atividadeFisicaDeclarada: AtividadeFisicaEnergeticaDeclarada | null;
  horasSentado: HorasSentadoEnergetica | null;
}

export type NivelAtividadeEnergetica =
  | 'sedentario'
  | 'levemente_ativo'
  | 'moderadamente_ativo'
  | 'muito_ativo'
  | 'indisponivel';

export type ConfiancaEstimativaAtividade = 'baixa' | 'moderada';

/** Fatores iniciais de estimativa (v1) — aproximações operacionais, não valores universais. */
export const FATORES_ATIVIDADE_GET_V1 = {
  sedentario: 1.2,
  levemente_ativo: 1.35,
  moderadamente_ativo: 1.5,
  muito_ativo: 1.7,
} as const;

export type NivelAtividadeComFator = keyof typeof FATORES_ATIVIDADE_GET_V1;

export type AlertaEstimativaGet =
  | 'ATIVIDADE_FISICA_INDISPONIVEL'
  | 'HORAS_SENTADO_INDISPONIVEL'
  | 'DURACAO_EXERCICIO_NAO_INFORMADA'
  | 'INTENSIDADE_EXERCICIO_NAO_INFORMADA'
  | 'NIVEL_REBAIXADO_POR_SEDENTARISMO_OCUPACIONAL'
  | 'ATIVIDADE_ALTA_SEM_CONFIRMAR_EXECUCAO';

export type MotivoGetIndisponivel =
  | 'TMB_INDISPONIVEL'
  | 'ATIVIDADE_FISICA_INDISPONIVEL'
  | 'FATOR_ATIVIDADE_INDISPONIVEL'
  | 'RESULTADO_INVALIDO';

export interface EstimativaGastoEnergeticoTotal {
  versao: 1;
  status: 'calculado' | 'indisponivel';
  tmbEstimativaKcalDia: number | null;
  nivelAtividade: NivelAtividadeEnergetica;
  fatorAtividade: number | null;
  confiancaAtividade: ConfiancaEstimativaAtividade | null;
  getEstimadoKcalDia: number | null;
  contextoAtividade: {
    atividadeFisicaDeclarada: AtividadeFisicaEnergeticaDeclarada | null;
    horasSentado: HorasSentadoEnergetica | null;
  };
  motivosIndisponibilidade: MotivoGetIndisponivel[];
  alertas: AlertaEstimativaGet[];
  observacoes: string[];
}

const ATIVIDADES_VALIDAS = new Set<AtividadeFisicaEnergeticaDeclarada>([
  'nunca',
  '1-2x',
  '3-4x',
  '5-7x',
]);

const HORAS_VALIDAS = new Set<HorasSentadoEnergetica>(['<4h', '4-8h', '>8h']);

const FATORES_ACEITOS = new Set<number>(Object.values(FATORES_ATIVIDADE_GET_V1));

const OBSERVACOES_CALCULADO = [
  'Estimativa baseada na atividade declarada. Não corresponde ainda à meta alimentar.',
  'Os fatores são aproximações operacionais iniciais devido à ausência de duração, intensidade, MET, passos e dados objetivos de execução.',
] as const;

function uniquePush<T>(arr: T[], item: T): void {
  if (!arr.includes(item)) arr.push(item);
}

function normalizarAtividade(
  valor: unknown
): AtividadeFisicaEnergeticaDeclarada | null {
  if (typeof valor !== 'string') return null;
  if (ATIVIDADES_VALIDAS.has(valor as AtividadeFisicaEnergeticaDeclarada)) {
    return valor as AtividadeFisicaEnergeticaDeclarada;
  }
  return null;
}

function normalizarHorasSentado(valor: unknown): HorasSentadoEnergetica | null {
  if (typeof valor !== 'string') return null;
  if (HORAS_VALIDAS.has(valor as HorasSentadoEnergetica)) {
    return valor as HorasSentadoEnergetica;
  }
  return null;
}

function nivelBasePorFrequencia(
  atividade: AtividadeFisicaEnergeticaDeclarada
): NivelAtividadeComFator {
  switch (atividade) {
    case 'nunca':
      return 'sedentario';
    case '1-2x':
      return 'levemente_ativo';
    case '3-4x':
      return 'moderadamente_ativo';
    case '5-7x':
      return 'muito_ativo';
  }
}

export interface ClassificacaoAtividadeGet {
  nivel: NivelAtividadeComFator;
  confianca: ConfiancaEstimativaAtividade;
  rebaixado: boolean;
  alertas: AlertaEstimativaGet[];
}

/**
 * Classifica nível, confiança e alertas a partir da anamnese declarada.
 * Exportada para testes da classificação isolada.
 */
export function classificarAtividadeEnergetica(
  atividade: AtividadeFisicaEnergeticaDeclarada,
  horasSentado: HorasSentadoEnergetica | null
): ClassificacaoAtividadeGet {
  const alertas: AlertaEstimativaGet[] = [];
  let nivel = nivelBasePorFrequencia(atividade);
  let rebaixado = false;

  if (atividade !== 'nunca') {
    uniquePush(alertas, 'DURACAO_EXERCICIO_NAO_INFORMADA');
    uniquePush(alertas, 'INTENSIDADE_EXERCICIO_NAO_INFORMADA');
  }
  if (atividade === '5-7x') {
    uniquePush(alertas, 'ATIVIDADE_ALTA_SEM_CONFIRMAR_EXECUCAO');
  }

  if (horasSentado == null) {
    uniquePush(alertas, 'HORAS_SENTADO_INDISPONIVEL');
  }

  // Regra A: nunca → sedentário (sem elevação)
  if (atividade === 'nunca') {
    return {
      nivel: 'sedentario',
      confianca: horasSentado != null ? 'moderada' : 'baixa',
      rebaixado: false,
      alertas,
    };
  }

  // Regras B–D: ajustes conservadores com >8h
  if (horasSentado === '>8h') {
    if (atividade === '1-2x') {
      // Regra B: permanece levemente_ativo, confiança baixa
      return {
        nivel: 'levemente_ativo',
        confianca: 'baixa',
        rebaixado: false,
        alertas,
      };
    }
    if (atividade === '3-4x') {
      // Regra C
      nivel = 'levemente_ativo';
      rebaixado = true;
      uniquePush(alertas, 'NIVEL_REBAIXADO_POR_SEDENTARISMO_OCUPACIONAL');
    } else if (atividade === '5-7x') {
      // Regra D
      nivel = 'moderadamente_ativo';
      rebaixado = true;
      uniquePush(alertas, 'NIVEL_REBAIXADO_POR_SEDENTARISMO_OCUPACIONAL');
    }
  }

  // Regra E: <4h não eleva (já usamos só frequência base + rebaixamentos)

  // Confiança
  let confianca: ConfiancaEstimativaAtividade = 'moderada';
  if (horasSentado == null || rebaixado || atividade === '5-7x') {
    confianca = 'baixa';
  }

  return { nivel, confianca, rebaixado, alertas };
}

function resultadoIndisponivel(params: {
  tmbKcal: number | null;
  contexto: EstimativaGastoEnergeticoTotal['contextoAtividade'];
  nivel: NivelAtividadeEnergetica;
  motivos: MotivoGetIndisponivel[];
  alertas: AlertaEstimativaGet[];
  confianca?: ConfiancaEstimativaAtividade | null;
  fator?: number | null;
}): EstimativaGastoEnergeticoTotal {
  return {
    versao: 1,
    status: 'indisponivel',
    tmbEstimativaKcalDia: params.tmbKcal,
    nivelAtividade: params.nivel,
    fatorAtividade: params.fator ?? null,
    confiancaAtividade: params.confianca ?? null,
    getEstimadoKcalDia: null,
    contextoAtividade: params.contexto,
    motivosIndisponibilidade: params.motivos,
    alertas: params.alertas,
    observacoes: [],
  };
}

/** Rótulo administrativo do nível (sem redesign). */
export function rotuloNivelAtividadeEnergetica(
  nivel: NivelAtividadeEnergetica
): string {
  switch (nivel) {
    case 'sedentario':
      return 'Sedentário';
    case 'levemente_ativo':
      return 'Levemente ativo';
    case 'moderadamente_ativo':
      return 'Moderadamente ativo';
    case 'muito_ativo':
      return 'Muito ativo';
    case 'indisponivel':
      return 'Indisponível';
    default:
      return nivel;
  }
}

export function rotuloConfiancaAtividade(
  confianca: ConfiancaEstimativaAtividade
): string {
  return confianca === 'moderada' ? 'Moderada' : 'Baixa';
}

export function rotuloMotivoGetIndisponivel(motivo: MotivoGetIndisponivel): string {
  switch (motivo) {
    case 'TMB_INDISPONIVEL':
      return 'TMB estimada indisponível';
    case 'ATIVIDADE_FISICA_INDISPONIVEL':
      return 'atividade física declarada não informada';
    case 'FATOR_ATIVIDADE_INDISPONIVEL':
      return 'fator de atividade indisponível';
    case 'RESULTADO_INVALIDO':
      return 'resultado do GET estimado inválido';
    default:
      return motivo;
  }
}

/**
 * GET estimado = TMB estimada × fator de atividade classificado.
 * Não recalcula TMB; não aplica déficit nem meta alimentar.
 */
export function calcularEstimativaGet(
  tmb: EstimativaTaxaMetabolicaBasal,
  atividade: ContextoAtividadeEnergetica
): EstimativaGastoEnergeticoTotal {
  const atividadeDecl = normalizarAtividade(atividade?.atividadeFisicaDeclarada);
  const horasSentado = normalizarHorasSentado(atividade?.horasSentado);
  const contexto: EstimativaGastoEnergeticoTotal['contextoAtividade'] = {
    atividadeFisicaDeclarada: atividadeDecl,
    horasSentado,
  };

  const motivos: MotivoGetIndisponivel[] = [];
  const alertas: AlertaEstimativaGet[] = [];

  const tmbKcal = tmb?.tmbEstimativaKcalDia ?? null;
  const tmbOk =
    tmb?.status === 'calculada' &&
    typeof tmbKcal === 'number' &&
    Number.isFinite(tmbKcal) &&
    tmbKcal > 0;

  if (!tmbOk) {
    uniquePush(motivos, 'TMB_INDISPONIVEL');
  }

  if (atividadeDecl == null) {
    uniquePush(motivos, 'ATIVIDADE_FISICA_INDISPONIVEL');
    uniquePush(alertas, 'ATIVIDADE_FISICA_INDISPONIVEL');
    if (horasSentado == null) {
      uniquePush(alertas, 'HORAS_SENTADO_INDISPONIVEL');
    }
    return resultadoIndisponivel({
      tmbKcal: tmbOk ? tmbKcal : null,
      contexto,
      nivel: 'indisponivel',
      motivos,
      alertas,
    });
  }

  if (!tmbOk) {
    const classif = classificarAtividadeEnergetica(atividadeDecl, horasSentado);
    return resultadoIndisponivel({
      tmbKcal: null,
      contexto,
      nivel: classif.nivel,
      motivos,
      alertas: [...classif.alertas],
      confianca: classif.confianca,
      fator: FATORES_ATIVIDADE_GET_V1[classif.nivel],
    });
  }

  const classif = classificarAtividadeEnergetica(atividadeDecl, horasSentado);
  for (const a of classif.alertas) uniquePush(alertas, a);

  const fator = FATORES_ATIVIDADE_GET_V1[classif.nivel];
  if (
    typeof fator !== 'number' ||
    !Number.isFinite(fator) ||
    !FATORES_ACEITOS.has(fator)
  ) {
    uniquePush(motivos, 'FATOR_ATIVIDADE_INDISPONIVEL');
    return resultadoIndisponivel({
      tmbKcal,
      contexto,
      nivel: classif.nivel,
      motivos,
      alertas,
      confianca: classif.confianca,
    });
  }

  const getBruto = tmbKcal * fator;
  const getArredondado = Math.round(getBruto);

  if (!Number.isFinite(getArredondado) || getArredondado <= 0) {
    return resultadoIndisponivel({
      tmbKcal,
      contexto,
      nivel: classif.nivel,
      motivos: ['RESULTADO_INVALIDO'],
      alertas,
      confianca: classif.confianca,
      fator,
    });
  }

  return {
    versao: 1,
    status: 'calculado',
    tmbEstimativaKcalDia: tmbKcal,
    nivelAtividade: classif.nivel,
    fatorAtividade: fator,
    confiancaAtividade: classif.confianca,
    getEstimadoKcalDia: getArredondado,
    contextoAtividade: contexto,
    motivosIndisponibilidade: [],
    alertas,
    observacoes: [...OBSERVACOES_CALCULADO],
  };
}
