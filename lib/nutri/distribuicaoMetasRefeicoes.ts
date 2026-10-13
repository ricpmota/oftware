/**
 * Distribuição automática da meta calórica/proteica entre refeições (ETAPA 8).
 * Calculada em paralelo — não altera Opção 01, cardápio nem caloriasSugerida_kcal legado.
 */

import type { EstrategiaEnergetica } from '@/lib/nutri/estrategiaEnergetica';
import type {
  AnamneseAtividadeFisica,
  AnamneseHorarioTrabalho,
  AnamneseNumeroRefeicoesDia,
  AnamneseObjetivoPrincipal,
  AnamneseSintomasGI,
} from '@/lib/nutri/anamneseNutricional';

export type RefeicaoNutriKey =
  | 'cafe'
  | 'lanche1'
  | 'almoco'
  | 'lanche2'
  | 'jantar';

export const REFEICOES_NUTRI_ORDEM: RefeicaoNutriKey[] = [
  'cafe',
  'lanche1',
  'almoco',
  'lanche2',
  'jantar',
];

export const DISTRIBUICAO_CALORICA_PADRAO_V1 = {
  cafe: 0.2,
  lanche1: 0.1,
  almoco: 0.3,
  lanche2: 0.15,
  jantar: 0.25,
} as const;

export const DISTRIBUICAO_PROTEICA_PADRAO_V1 = {
  cafe: 0.2,
  lanche1: 0.1,
  almoco: 0.3,
  lanche2: 0.15,
  jantar: 0.25,
} as const;

/** Café reduzido (pula café). */
const DIST_PULA_CAFE = {
  cafe: 0.12,
  lanche1: 0.18,
  almoco: 0.3,
  lanche2: 0.15,
  jantar: 0.25,
} as const;

/** Fome matinal alta. */
const DIST_FOME_MATINAL = {
  cafe: 0.25,
  lanche1: 0.1,
  almoco: 0.3,
  lanche2: 0.12,
  jantar: 0.23,
} as const;

/** Muita fome ao jantar → reforça almoço/lanche2. */
const DIST_FOME_JANTAR = {
  cafe: 0.18,
  lanche1: 0.1,
  almoco: 0.32,
  lanche2: 0.18,
  jantar: 0.22,
} as const;

/** Compulsão noturna. */
const DIST_COMPULSAO = {
  cafe: 0.2,
  lanche1: 0.1,
  almoco: 0.3,
  lanche2: 0.2,
  jantar: 0.2,
} as const;

/** GI grave — fracionada. */
const DIST_GI_GRAVE = {
  cafe: 0.18,
  lanche1: 0.15,
  almoco: 0.27,
  lanche2: 0.18,
  jantar: 0.22,
} as const;

/** Proteína para recomposição / atividade alta. */
const DIST_PROTEINA_RECOMPOSICAO = {
  cafe: 0.2,
  lanche1: 0.12,
  almoco: 0.28,
  lanche2: 0.15,
  jantar: 0.25,
} as const;

export type AjusteDistribuicaoRefeicoes =
  | 'CAFE_REDUZIDO_POR_BAIXA_ADESAO_MATINAL'
  | 'CAFE_REFORCADO_POR_FOME_MATINAL'
  | 'ALMOCO_E_LANCHE2_REFORCADOS_PARA_PREVENIR_FOME_NOTURNA'
  | 'LANCHE2_REFORCADO_POR_COMPULSAO_NOTURNA'
  | 'PORCOES_MENORES_E_PREPARACOES_DIGESTIVAS'
  | 'DISTRIBUICAO_FRACIONADA_POR_SINTOMAS_GI'
  | 'DISTRIBUICAO_DEVE_SEGUIR_HORARIO_ACORDADO'
  | 'PACIENTE_RELATA_MENOS_REFEICOES_QUE_O_PLANO_PADRAO'
  | 'PACIENTE_RELATA_MAIS_REFEICOES_QUE_O_PLANO_PADRAO'
  | 'PROTEINA_MAIS_DISTRIBUIDA_PARA_RECOMPOSICAO';

export type AlertaDistribuicaoRefeicoes =
  | 'REFEICAO_COM_META_CALORICA_MUITO_BAIXA'
  | 'REFEICAO_COM_META_CALORICA_ELEVADA'
  | 'ESTRATEGIA_REQUER_REVISAO_MAS_DISTRIBUICAO_CALCULADA';

export interface ContextoDistribuicaoRefeicoes {
  estrategiaEnergetica: EstrategiaEnergetica;
  proteinaDiariaG: number;
  numeroRefeicoesDia: AnamneseNumeroRefeicoesDia;
  horarioTrabalho: AnamneseHorarioTrabalho;
  fomeMatinal: number;
  fomeNoturna: number;
  pulaCafeManha: boolean;
  chegaComMuitaFomeJantar: boolean;
  compulsaoNoturna: boolean;
  sintomasGI: AnamneseSintomasGI;
  atividadeFisica: AnamneseAtividadeFisica;
  objetivoPrincipal: AnamneseObjetivoPrincipal;
}

export interface MetaRefeicaoDistribuida {
  refeicao: RefeicaoNutriKey;
  percentualCalorico: number;
  caloriasAlvoKcal: number;
  percentualProteico: number;
  proteinaAlvoG: number;
}

export interface DistribuicaoMetasRefeicoes {
  versao: 1;
  status: 'calculada' | 'indisponivel';
  metaCaloricaDiaKcal: number | null;
  proteinaDiariaG: number | null;
  refeicoes: Record<RefeicaoNutriKey, MetaRefeicaoDistribuida>;
  ajustesAplicados: AjusteDistribuicaoRefeicoes[];
  alertas: AlertaDistribuicaoRefeicoes[];
  somaCaloriasKcal: number;
  somaProteinaG: number;
}

type TabelaPercentuais = Record<RefeicaoNutriKey, number>;

function uniquePush<T>(arr: T[], item: T): void {
  if (!arr.includes(item)) arr.push(item);
}

export function arredondarParaMultiploDe5(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.round(valor / 5) * 5;
}

function somaTabela(t: TabelaPercentuais): number {
  return REFEICOES_NUTRI_ORDEM.reduce((s, k) => s + t[k], 0);
}

function tabelaValida(t: TabelaPercentuais): boolean {
  const s = somaTabela(t);
  return Math.abs(s - 1) < 1e-9 && REFEICOES_NUTRI_ORDEM.every((k) => t[k] > 0);
}

function clonarPadraoCalorico(): TabelaPercentuais {
  return { ...DISTRIBUICAO_CALORICA_PADRAO_V1 };
}

function clonarPadraoProteico(): TabelaPercentuais {
  return { ...DISTRIBUICAO_PROTEICA_PADRAO_V1 };
}

/**
 * Prioridade da tabela calórica principal:
 * GI grave → compulsão → muita fome jantar → pula café → fome matinal → padrão
 */
export function selecionarTabelaCalorica(contexto: ContextoDistribuicaoRefeicoes): {
  tabela: TabelaPercentuais;
  ajustePrincipal: AjusteDistribuicaoRefeicoes | null;
  sinais: AjusteDistribuicaoRefeicoes[];
} {
  const sinais: AjusteDistribuicaoRefeicoes[] = [];

  if (contexto.sintomasGI === 'grave') {
    sinais.push('DISTRIBUICAO_FRACIONADA_POR_SINTOMAS_GI');
  }
  if (contexto.compulsaoNoturna) {
    sinais.push('LANCHE2_REFORCADO_POR_COMPULSAO_NOTURNA');
  }
  if (contexto.chegaComMuitaFomeJantar) {
    sinais.push('ALMOCO_E_LANCHE2_REFORCADOS_PARA_PREVENIR_FOME_NOTURNA');
  }
  if (contexto.pulaCafeManha) {
    sinais.push('CAFE_REDUZIDO_POR_BAIXA_ADESAO_MATINAL');
  }
  if (!contexto.pulaCafeManha && contexto.fomeMatinal >= 7) {
    sinais.push('CAFE_REFORCADO_POR_FOME_MATINAL');
  }

  if (contexto.sintomasGI === 'grave') {
    return {
      tabela: { ...DIST_GI_GRAVE },
      ajustePrincipal: 'DISTRIBUICAO_FRACIONADA_POR_SINTOMAS_GI',
      sinais,
    };
  }
  if (contexto.compulsaoNoturna) {
    return {
      tabela: { ...DIST_COMPULSAO },
      ajustePrincipal: 'LANCHE2_REFORCADO_POR_COMPULSAO_NOTURNA',
      sinais,
    };
  }
  if (contexto.chegaComMuitaFomeJantar) {
    return {
      tabela: { ...DIST_FOME_JANTAR },
      ajustePrincipal: 'ALMOCO_E_LANCHE2_REFORCADOS_PARA_PREVENIR_FOME_NOTURNA',
      sinais,
    };
  }
  if (contexto.pulaCafeManha) {
    return {
      tabela: { ...DIST_PULA_CAFE },
      ajustePrincipal: 'CAFE_REDUZIDO_POR_BAIXA_ADESAO_MATINAL',
      sinais,
    };
  }
  if (contexto.fomeMatinal >= 7) {
    return {
      tabela: { ...DIST_FOME_MATINAL },
      ajustePrincipal: 'CAFE_REFORCADO_POR_FOME_MATINAL',
      sinais,
    };
  }

  return { tabela: clonarPadraoCalorico(), ajustePrincipal: null, sinais };
}

function metaVazia(): Record<RefeicaoNutriKey, MetaRefeicaoDistribuida> {
  const out = {} as Record<RefeicaoNutriKey, MetaRefeicaoDistribuida>;
  for (const k of REFEICOES_NUTRI_ORDEM) {
    out[k] = {
      refeicao: k,
      percentualCalorico: 0,
      caloriasAlvoKcal: 0,
      percentualProteico: 0,
      proteinaAlvoG: 0,
    };
  }
  return out;
}

export function rotuloRefeicaoNutri(key: RefeicaoNutriKey): string {
  switch (key) {
    case 'cafe':
      return 'Café';
    case 'lanche1':
      return 'Lanche manhã';
    case 'almoco':
      return 'Almoço';
    case 'lanche2':
      return 'Lanche tarde';
    case 'jantar':
      return 'Jantar';
    default:
      return key;
  }
}

export function rotuloAjusteDistribuicao(codigo: AjusteDistribuicaoRefeicoes): string {
  switch (codigo) {
    case 'CAFE_REDUZIDO_POR_BAIXA_ADESAO_MATINAL':
      return 'Café reduzido por baixa adesão matinal';
    case 'CAFE_REFORCADO_POR_FOME_MATINAL':
      return 'Café reforçado por fome matinal';
    case 'ALMOCO_E_LANCHE2_REFORCADOS_PARA_PREVENIR_FOME_NOTURNA':
      return 'Almoço e lanche da tarde reforçados para prevenir fome noturna';
    case 'LANCHE2_REFORCADO_POR_COMPULSAO_NOTURNA':
      return 'Lanche da tarde reforçado por compulsão noturna';
    case 'PORCOES_MENORES_E_PREPARACOES_DIGESTIVAS':
      return 'Porções menores e preparações digestivas (GI moderado)';
    case 'DISTRIBUICAO_FRACIONADA_POR_SINTOMAS_GI':
      return 'Distribuição fracionada por sintomas GI';
    case 'DISTRIBUICAO_DEVE_SEGUIR_HORARIO_ACORDADO':
      return 'Distribuição deve seguir horário acordado (trabalho noturno/turnos)';
    case 'PACIENTE_RELATA_MENOS_REFEICOES_QUE_O_PLANO_PADRAO':
      return 'Paciente relata menos refeições que o plano padrão';
    case 'PACIENTE_RELATA_MAIS_REFEICOES_QUE_O_PLANO_PADRAO':
      return 'Paciente relata mais refeições que o plano padrão';
    case 'PROTEINA_MAIS_DISTRIBUIDA_PARA_RECOMPOSICAO':
      return 'Proteína mais distribuída para recomposição/atividade';
    default:
      return codigo;
  }
}

/**
 * Distribui meta calórica aplicada e proteína diária em 5 refeições.
 */
export function calcularDistribuicaoMetasRefeicoes(
  contexto: ContextoDistribuicaoRefeicoes
): DistribuicaoMetasRefeicoes {
  const ajustesAplicados: AjusteDistribuicaoRefeicoes[] = [];
  const alertas: AlertaDistribuicaoRefeicoes[] = [];
  const vazia = metaVazia();

  const estrategia = contexto?.estrategiaEnergetica;
  const metaCal =
    estrategia?.metaCaloricaAplicadaKcalDia ?? null;
  const protRaw = contexto?.proteinaDiariaG;

  if (
    !estrategia ||
    estrategia.status === 'indisponivel' ||
    metaCal == null ||
    !Number.isFinite(metaCal) ||
    metaCal <= 0 ||
    typeof protRaw !== 'number' ||
    !Number.isFinite(protRaw) ||
    protRaw < 0
  ) {
    return {
      versao: 1,
      status: 'indisponivel',
      metaCaloricaDiaKcal: null,
      proteinaDiariaG: null,
      refeicoes: vazia,
      ajustesAplicados: [],
      alertas: [],
      somaCaloriasKcal: 0,
      somaProteinaG: 0,
    };
  }

  const metaProteinaDiaInteira = Math.round(protRaw);
  const { tabela: tabelaCal, ajustePrincipal, sinais } =
    selecionarTabelaCalorica(contexto);

  if (!tabelaValida(tabelaCal)) {
    return {
      versao: 1,
      status: 'indisponivel',
      metaCaloricaDiaKcal: metaCal,
      proteinaDiariaG: metaProteinaDiaInteira,
      refeicoes: vazia,
      ajustesAplicados: [],
      alertas: [],
      somaCaloriasKcal: 0,
      somaProteinaG: 0,
    };
  }

  // Ajuste principal + sinais relevantes (sem duplicar)
  if (ajustePrincipal) {
    uniquePush(ajustesAplicados, ajustePrincipal);
  }
  for (const s of sinais) {
    if (s !== ajustePrincipal) {
      // GI moderado / sinais secundários: registrar só se não forem a tabela
      // Sinais da regra vencedora já estão; demais sinais clínicos observados
      // Spec: "Registrar todos os sinais clínicos encontrados"
      uniquePush(ajustesAplicados, s);
    }
  }

  if (contexto.sintomasGI === 'moderado') {
    uniquePush(ajustesAplicados, 'PORCOES_MENORES_E_PREPARACOES_DIGESTIVAS');
  }

  if (
    contexto.horarioTrabalho === 'noturno' ||
    contexto.horarioTrabalho === 'turnos'
  ) {
    uniquePush(ajustesAplicados, 'DISTRIBUICAO_DEVE_SEGUIR_HORARIO_ACORDADO');
  }

  if (contexto.numeroRefeicoesDia === '2-3') {
    uniquePush(ajustesAplicados, 'PACIENTE_RELATA_MENOS_REFEICOES_QUE_O_PLANO_PADRAO');
  } else if (contexto.numeroRefeicoesDia === '>5') {
    uniquePush(ajustesAplicados, 'PACIENTE_RELATA_MAIS_REFEICOES_QUE_O_PLANO_PADRAO');
  }

  let tabelaProt = clonarPadraoProteico();
  // Proteína acompanha tabela calórica por padrão (mesmos %)
  tabelaProt = { ...tabelaCal };

  if (
    contexto.objetivoPrincipal === 'recomposicao' ||
    contexto.atividadeFisica === '5-7x'
  ) {
    tabelaProt = { ...DIST_PROTEINA_RECOMPOSICAO };
    uniquePush(ajustesAplicados, 'PROTEINA_MAIS_DISTRIBUIDA_PARA_RECOMPOSICAO');
  }

  if (!tabelaValida(tabelaProt)) {
    return {
      versao: 1,
      status: 'indisponivel',
      metaCaloricaDiaKcal: metaCal,
      proteinaDiariaG: metaProteinaDiaInteira,
      refeicoes: vazia,
      ajustesAplicados,
      alertas: [],
      somaCaloriasKcal: 0,
      somaProteinaG: 0,
    };
  }

  if (estrategia.status === 'requer_revisao') {
    uniquePush(alertas, 'ESTRATEGIA_REQUER_REVISAO_MAS_DISTRIBUICAO_CALCULADA');
  }

  // Calorias: arredonda para múltiplo de 5; residual no almoço
  const calorias: Record<RefeicaoNutriKey, number> = {
    cafe: 0,
    lanche1: 0,
    almoco: 0,
    lanche2: 0,
    jantar: 0,
  };
  for (const k of REFEICOES_NUTRI_ORDEM) {
    calorias[k] = arredondarParaMultiploDe5(metaCal * tabelaCal[k]);
  }
  const somaCalArred = REFEICOES_NUTRI_ORDEM.reduce((s, k) => s + calorias[k], 0);
  calorias.almoco += metaCal - somaCalArred;

  // Proteína: inteiro; residual no almoço
  const proteinas: Record<RefeicaoNutriKey, number> = {
    cafe: 0,
    lanche1: 0,
    almoco: 0,
    lanche2: 0,
    jantar: 0,
  };
  for (const k of REFEICOES_NUTRI_ORDEM) {
    proteinas[k] = Math.round(metaProteinaDiaInteira * tabelaProt[k]);
  }
  const somaProtArred = REFEICOES_NUTRI_ORDEM.reduce((s, k) => s + proteinas[k], 0);
  proteinas.almoco += metaProteinaDiaInteira - somaProtArred;

  const refeicoes = metaVazia();
  for (const k of REFEICOES_NUTRI_ORDEM) {
    refeicoes[k] = {
      refeicao: k,
      percentualCalorico: tabelaCal[k],
      caloriasAlvoKcal: calorias[k],
      percentualProteico: tabelaProt[k],
      proteinaAlvoG: proteinas[k],
    };
    if (calorias[k] < 100) {
      uniquePush(alertas, 'REFEICAO_COM_META_CALORICA_MUITO_BAIXA');
    }
    if (calorias[k] > 800) {
      uniquePush(alertas, 'REFEICAO_COM_META_CALORICA_ELEVADA');
    }
  }

  const somaCaloriasKcal = REFEICOES_NUTRI_ORDEM.reduce(
    (s, k) => s + refeicoes[k].caloriasAlvoKcal,
    0
  );
  const somaProteinaG = REFEICOES_NUTRI_ORDEM.reduce(
    (s, k) => s + refeicoes[k].proteinaAlvoG,
    0
  );

  return {
    versao: 1,
    status: 'calculada',
    metaCaloricaDiaKcal: metaCal,
    proteinaDiariaG: metaProteinaDiaInteira,
    refeicoes,
    ajustesAplicados,
    alertas,
    somaCaloriasKcal,
    somaProteinaG,
  };
}
