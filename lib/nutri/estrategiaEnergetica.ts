/**
 * Estratégia de déficit e meta calórica diária (ETAPA 7).
 * GET estimado → proposta de meta. Sem cardápio, proteína, persistência ou aprovação.
 *
 * Ordem das proteções:
 * 1. validar GET e entradas
 * 2. verificar bloqueios absolutos
 * 3. determinar intensidade aplicada
 * 4. calcular déficit
 * 5. calcular meta matemática
 * 6. identificar baixa/muito baixa energia
 * 7. aplicar piso por sexo
 * 8. aplicar proteção de TMB
 * 9. definir status e revisão
 */

import type { EstimativaGastoEnergeticoTotal } from '@/lib/nutri/estimativaGastoEnergetico';
import type {
  AtividadeFisicaEnergeticaDeclarada,
  SexoBiologicoEnergetico,
} from '@/lib/nutri/dadosEnergeticosPaciente';
import {
  IDADE_ENERGETICA_MAX_ANOS,
  IDADE_ENERGETICA_MIN_ANOS,
} from '@/lib/nutri/dadosEnergeticosPaciente';
import type { AnamneseIntensidadeDesejada } from '@/lib/nutri/anamneseNutricional';
import type { AnamneseObjetivoPrincipal, AnamneseSimNao, AnamneseSintomasGI } from '@/lib/nutri/anamneseNutricional';

/** Preferência do paciente (snapshot V2 / wizard). */
export type IntensidadeDesejada = AnamneseIntensidadeDesejada;

export type IntensidadeEnergeticaAplicada =
  | 'manutencao'
  | 'leve'
  | 'moderada'
  | 'intensiva'
  | 'indisponivel';

/** Déficits iniciais operacionais do motor (v1). */
export const DEFICITS_ENERGETICOS_V1 = {
  leve: 0.12,
  moderada: 0.2,
  intensiva: 0.3,
} as const;

/** Pisos do motor padrão — proteções, não prescrições universais. */
export const PISOS_CALORICOS_PADRAO_V1 = {
  feminino: 1200,
  masculino: 1500,
} as const;

export type StatusEstrategiaEnergetica =
  | 'calculada'
  | 'requer_revisao'
  | 'indisponivel';

export type ClassificacaoEnergetica =
  | 'padrao'
  | 'baixa_energia'
  | 'muito_baixa_energia'
  | 'indisponivel';

export type BloqueioEstrategiaEnergetica =
  | 'GET_INDISPONIVEL'
  | 'INTENSIDADE_DESEJADA_INDISPONIVEL'
  | 'GESTACAO'
  | 'LACTACAO'
  | 'IDADE_FORA_ESCOPO'
  | 'DADOS_CLINICOS_INSUFICIENTES'
  | 'RESULTADO_INVALIDO';

export type MotivoAjusteEstrategiaEnergetica =
  | 'INTENSIDADE_REDUZIDA_POR_COMPULSAO_NOTURNA'
  | 'INTENSIDADE_REDUZIDA_POR_FOME_EMOCIONAL'
  | 'INTENSIDADE_REDUZIDA_POR_HISTORICO_DE_RESTRICAO'
  | 'INTENSIDADE_REDUZIDA_POR_SINTOMAS_GI'
  | 'INTENSIDADE_REDUZIDA_PARA_PRESERVAR_RECOMPOSICAO'
  | 'INTENSIDADE_REDUZIDA_POR_ALTA_DEMANDA_DE_ATIVIDADE'
  | 'META_ELEVADA_AO_PISO_PADRAO'
  | 'META_ELEVADA_PARA_NAO_FICAR_ABAIXO_DA_TMB';

export type AlertaEstrategiaEnergetica =
  | 'INTENSIDADE_INTENSIVA_REQUER_APROVACAO'
  | 'ESTRATEGIA_BAIXA_ENERGIA_REQUER_SUPERVISAO'
  | 'META_CALCULADA_MUITO_BAIXA'
  | 'ESTRATEGIA_NAO_AUTORIZADA_AUTOMATICAMENTE'
  | 'OBJETIVO_MANUTENCAO_COM_INTENSIDADE_DE_PERDA'
  | 'GET_COM_CONFIANCA_BAIXA';

export interface ContextoEstrategiaEnergetica {
  get: EstimativaGastoEnergeticoTotal;
  intensidadeDesejada: IntensidadeDesejada | null;
  objetivoPrincipal: AnamneseObjetivoPrincipal;
  sexoBiologico: SexoBiologicoEnergetico | null;
  idadeAnos: number | null;
  imcAtual: number | null;
  atividadeFisicaDeclarada: AtividadeFisicaEnergeticaDeclarada | null;
  sintomasGI: AnamneseSintomasGI;
  efeitoSanfona: AnamneseSimNao;
  fomeEmocional: boolean;
  compulsaoNoturna: boolean;
  gestacaoConfirmada: boolean;
  lactacaoConfirmada: boolean;
}

export interface EstrategiaEnergetica {
  versao: 1;
  status: StatusEstrategiaEnergetica;
  getEstimadoKcalDia: number | null;
  intensidadeDesejada: IntensidadeDesejada | null;
  intensidadeAplicada: IntensidadeEnergeticaAplicada;
  deficitPercentual: number | null;
  deficitKcalDia: number | null;
  metaCaloricaCalculadaKcalDia: number | null;
  metaCaloricaAplicadaKcalDia: number | null;
  pisoCaloricoAplicadoKcalDia: number | null;
  motivosAjuste: MotivoAjusteEstrategiaEnergetica[];
  alertas: AlertaEstrategiaEnergetica[];
  bloqueios: BloqueioEstrategiaEnergetica[];
  requerAprovacaoProfissional: boolean;
  observacoes: string[];
}

const INTENSIDADES_PERDA = new Set<IntensidadeDesejada>([
  'leve',
  'moderada',
  'intensiva',
]);

function uniquePush<T>(arr: T[], item: T): void {
  if (!arr.includes(item)) arr.push(item);
}

export function classificarEnergiaKcal(kcal: number | null): ClassificacaoEnergetica {
  if (kcal == null || !Number.isFinite(kcal)) return 'indisponivel';
  if (kcal < 800) return 'muito_baixa_energia';
  if (kcal < 1200) return 'baixa_energia';
  return 'padrao';
}

export function rotuloIntensidadeAplicada(
  valor: IntensidadeEnergeticaAplicada
): string {
  switch (valor) {
    case 'manutencao':
      return 'Manutenção';
    case 'leve':
      return 'Leve';
    case 'moderada':
      return 'Moderada';
    case 'intensiva':
      return 'Intensiva';
    case 'indisponivel':
      return 'Indisponível';
    default:
      return valor;
  }
}

export function rotuloStatusEstrategia(status: StatusEstrategiaEnergetica): string {
  switch (status) {
    case 'calculada':
      return 'Calculada';
    case 'requer_revisao':
      return 'Requer revisão';
    case 'indisponivel':
      return 'Indisponível';
    default:
      return status;
  }
}

export function rotuloMotivoAjusteEstrategia(
  codigo: MotivoAjusteEstrategiaEnergetica
): string {
  switch (codigo) {
    case 'INTENSIDADE_REDUZIDA_POR_COMPULSAO_NOTURNA':
      return 'Intensidade reduzida por compulsão noturna';
    case 'INTENSIDADE_REDUZIDA_POR_FOME_EMOCIONAL':
      return 'Intensidade reduzida por fome emocional';
    case 'INTENSIDADE_REDUZIDA_POR_HISTORICO_DE_RESTRICAO':
      return 'Intensidade reduzida por histórico de efeito sanfona';
    case 'INTENSIDADE_REDUZIDA_POR_SINTOMAS_GI':
      return 'Intensidade reduzida por sintomas gastrointestinais';
    case 'INTENSIDADE_REDUZIDA_PARA_PRESERVAR_RECOMPOSICAO':
      return 'Intensidade reduzida para preservar recomposição';
    case 'INTENSIDADE_REDUZIDA_POR_ALTA_DEMANDA_DE_ATIVIDADE':
      return 'Intensidade reduzida por alta demanda de atividade';
    case 'META_ELEVADA_AO_PISO_PADRAO':
      return 'Meta elevada ao piso calórico padrão';
    case 'META_ELEVADA_PARA_NAO_FICAR_ABAIXO_DA_TMB':
      return 'Meta elevada para não ficar abaixo da TMB estimada';
    default:
      return codigo;
  }
}

export function rotuloAlertaEstrategia(codigo: AlertaEstrategiaEnergetica): string {
  switch (codigo) {
    case 'INTENSIDADE_INTENSIVA_REQUER_APROVACAO':
      return 'Intensidade intensiva requer aprovação profissional';
    case 'ESTRATEGIA_BAIXA_ENERGIA_REQUER_SUPERVISAO':
      return 'Estratégia de baixa energia requer supervisão';
    case 'META_CALCULADA_MUITO_BAIXA':
      return 'Meta calculada muito baixa';
    case 'ESTRATEGIA_NAO_AUTORIZADA_AUTOMATICAMENTE':
      return 'Estratégia não autorizada automaticamente';
    case 'OBJETIVO_MANUTENCAO_COM_INTENSIDADE_DE_PERDA':
      return 'Objetivo de manutenção com intensidade de perda declarada';
    case 'GET_COM_CONFIANCA_BAIXA':
      return 'GET calculado com baixa confiança';
    default:
      return codigo;
  }
}

function resultadoIndisponivel(params: {
  getKcal: number | null;
  intensidadeDesejada: IntensidadeDesejada | null;
  bloqueios: BloqueioEstrategiaEnergetica[];
  alertas?: AlertaEstrategiaEnergetica[];
}): EstrategiaEnergetica {
  return {
    versao: 1,
    status: 'indisponivel',
    getEstimadoKcalDia: params.getKcal,
    intensidadeDesejada: params.intensidadeDesejada,
    intensidadeAplicada: 'indisponivel',
    deficitPercentual: null,
    deficitKcalDia: null,
    metaCaloricaCalculadaKcalDia: null,
    metaCaloricaAplicadaKcalDia: null,
    pisoCaloricoAplicadoKcalDia: null,
    motivosAjuste: [],
    alertas: params.alertas ?? [],
    bloqueios: params.bloqueios,
    requerAprovacaoProfissional: false,
    observacoes: [],
  };
}

/**
 * Determina intensidade aplicada (só mantém ou reduz — nunca eleva).
 */
export function determinarIntensidadeAplicada(
  contexto: ContextoEstrategiaEnergetica,
  intensidadeDesejada: IntensidadeDesejada
): {
  aplicada: Exclude<IntensidadeEnergeticaAplicada, 'manutencao' | 'indisponivel'>;
  motivos: MotivoAjusteEstrategiaEnergetica[];
  forcarRevisao: boolean;
} {
  let aplicada: Exclude<IntensidadeEnergeticaAplicada, 'manutencao' | 'indisponivel'> =
    intensidadeDesejada;
  const motivos: MotivoAjusteEstrategiaEnergetica[] = [];
  let forcarRevisao = false;

  if (aplicada === 'intensiva') {
    if (contexto.compulsaoNoturna) {
      aplicada = 'moderada';
      uniquePush(motivos, 'INTENSIDADE_REDUZIDA_POR_COMPULSAO_NOTURNA');
    }
    if (contexto.fomeEmocional) {
      aplicada = 'moderada';
      uniquePush(motivos, 'INTENSIDADE_REDUZIDA_POR_FOME_EMOCIONAL');
    }
    if (contexto.efeitoSanfona === 'sim') {
      aplicada = 'moderada';
      uniquePush(motivos, 'INTENSIDADE_REDUZIDA_POR_HISTORICO_DE_RESTRICAO');
    }
    if (contexto.sintomasGI === 'grave') {
      aplicada = 'moderada';
      uniquePush(motivos, 'INTENSIDADE_REDUZIDA_POR_SINTOMAS_GI');
      forcarRevisao = true;
    }
    if (contexto.objetivoPrincipal === 'recomposicao') {
      aplicada = 'moderada';
      uniquePush(motivos, 'INTENSIDADE_REDUZIDA_PARA_PRESERVAR_RECOMPOSICAO');
    }
    if (contexto.atividadeFisicaDeclarada === '5-7x') {
      aplicada = 'moderada';
      uniquePush(motivos, 'INTENSIDADE_REDUZIDA_POR_ALTA_DEMANDA_DE_ATIVIDADE');
    }
  }

  return { aplicada, motivos, forcarRevisao };
}

/**
 * Estratégia energética a partir do GET estimado e dados estruturados.
 */
export function calcularEstrategiaEnergetica(
  contexto: ContextoEstrategiaEnergetica
): EstrategiaEnergetica {
  const alertas: AlertaEstrategiaEnergetica[] = [];
  const bloqueios: BloqueioEstrategiaEnergetica[] = [];
  const motivosAjuste: MotivoAjusteEstrategiaEnergetica[] = [];

  const get = contexto?.get;
  const getKcal = get?.getEstimadoKcalDia ?? null;
  const getOk =
    get?.status === 'calculado' &&
    typeof getKcal === 'number' &&
    Number.isFinite(getKcal) &&
    getKcal > 0;

  const intensidadeDesejada = contexto?.intensidadeDesejada ?? null;
  const tmbKcal = get?.tmbEstimativaKcalDia ?? null;

  // 1–2. Validação e bloqueios absolutos
  if (!getOk) {
    uniquePush(bloqueios, 'GET_INDISPONIVEL');
  }
  if (intensidadeDesejada == null || !INTENSIDADES_PERDA.has(intensidadeDesejada)) {
    uniquePush(bloqueios, 'INTENSIDADE_DESEJADA_INDISPONIVEL');
  }
  if (contexto?.gestacaoConfirmada) {
    uniquePush(bloqueios, 'GESTACAO');
  }
  if (contexto?.lactacaoConfirmada) {
    uniquePush(bloqueios, 'LACTACAO');
  }

  const idade = contexto?.idadeAnos;
  if (
    idade == null ||
    !Number.isFinite(idade) ||
    idade < IDADE_ENERGETICA_MIN_ANOS ||
    idade > IDADE_ENERGETICA_MAX_ANOS
  ) {
    uniquePush(bloqueios, 'IDADE_FORA_ESCOPO');
  }

  const sexo = contexto?.sexoBiologico;
  if (sexo !== 'masculino' && sexo !== 'feminino') {
    uniquePush(bloqueios, 'DADOS_CLINICOS_INSUFICIENTES');
  }

  if (bloqueios.length > 0) {
    return resultadoIndisponivel({
      getKcal: getOk ? getKcal : null,
      intensidadeDesejada,
      bloqueios,
    });
  }

  // Confiança baixa do GET
  if (get.confiancaAtividade === 'baixa') {
    uniquePush(alertas, 'GET_COM_CONFIANCA_BAIXA');
  }

  // Manutenção: déficit zero
  if (contexto.objetivoPrincipal === 'manutencao') {
    // Intensidade desejada de perda com objetivo manutenção → alerta de conflito
    uniquePush(alertas, 'OBJETIVO_MANUTENCAO_COM_INTENSIDADE_DE_PERDA');

    let status: StatusEstrategiaEnergetica = 'calculada';
    let requerAprovacao = false;
    if (alertas.includes('GET_COM_CONFIANCA_BAIXA')) {
      status = 'requer_revisao';
      requerAprovacao = true;
    }

    return {
      versao: 1,
      status,
      getEstimadoKcalDia: getKcal,
      intensidadeDesejada,
      intensidadeAplicada: 'manutencao',
      deficitPercentual: 0,
      deficitKcalDia: 0,
      metaCaloricaCalculadaKcalDia: getKcal,
      metaCaloricaAplicadaKcalDia: getKcal,
      pisoCaloricoAplicadoKcalDia: PISOS_CALORICOS_PADRAO_V1[sexo!],
      motivosAjuste: [],
      alertas,
      bloqueios: [],
      requerAprovacaoProfissional: requerAprovacao,
      observacoes: [
        'Proposta de manutenção energética (déficit zero).',
        'Esta proposta ainda não altera o cardápio. A aplicação dependerá da etapa de aprovação e distribuição alimentar.',
      ],
    };
  }

  // 3. Intensidade aplicada
  const det = determinarIntensidadeAplicada(contexto, intensidadeDesejada!);
  for (const m of det.motivos) uniquePush(motivosAjuste, m);

  const intensidadeAplicada = det.aplicada;
  const deficitPercentual = DEFICITS_ENERGETICOS_V1[intensidadeAplicada];

  // 4–5. Déficit e meta matemática
  const deficitKcalDia = Math.round(getKcal! * deficitPercentual);
  const metaCaloricaCalculadaKcalDia = Math.round(
    getKcal! * (1 - deficitPercentual)
  );

  if (
    !Number.isFinite(metaCaloricaCalculadaKcalDia) ||
    metaCaloricaCalculadaKcalDia <= 0 ||
    !Number.isFinite(deficitKcalDia)
  ) {
    return resultadoIndisponivel({
      getKcal,
      intensidadeDesejada,
      bloqueios: ['RESULTADO_INVALIDO'],
    });
  }

  // 6. Classificação de baixa energia (sobre valor calculado)
  const classifCalc = classificarEnergiaKcal(metaCaloricaCalculadaKcalDia);
  if (classifCalc === 'baixa_energia') {
    uniquePush(alertas, 'ESTRATEGIA_BAIXA_ENERGIA_REQUER_SUPERVISAO');
  }
  if (classifCalc === 'muito_baixa_energia') {
    uniquePush(alertas, 'META_CALCULADA_MUITO_BAIXA');
    uniquePush(alertas, 'ESTRATEGIA_NAO_AUTORIZADA_AUTOMATICAMENTE');
  }

  // 7. Piso por sexo
  const piso = PISOS_CALORICOS_PADRAO_V1[sexo!];
  let metaAplicada = metaCaloricaCalculadaKcalDia;
  if (metaAplicada < piso) {
    metaAplicada = piso;
    uniquePush(motivosAjuste, 'META_ELEVADA_AO_PISO_PADRAO');
  }

  // 8. Proteção TMB
  if (
    typeof tmbKcal === 'number' &&
    Number.isFinite(tmbKcal) &&
    tmbKcal > 0 &&
    metaAplicada < tmbKcal
  ) {
    metaAplicada = Math.max(piso, tmbKcal);
    uniquePush(motivosAjuste, 'META_ELEVADA_PARA_NAO_FICAR_ABAIXO_DA_TMB');
  }

  // 9. Status e revisão
  let status: StatusEstrategiaEnergetica = 'calculada';
  let requerAprovacao = false;

  if (intensidadeAplicada === 'intensiva') {
    uniquePush(alertas, 'INTENSIDADE_INTENSIVA_REQUER_APROVACAO');
    status = 'requer_revisao';
    requerAprovacao = true;
  }

  if (det.forcarRevisao) {
    status = 'requer_revisao';
    requerAprovacao = true;
  }

  if (
    alertas.includes('GET_COM_CONFIANCA_BAIXA') ||
    alertas.includes('ESTRATEGIA_BAIXA_ENERGIA_REQUER_SUPERVISAO') ||
    alertas.includes('META_CALCULADA_MUITO_BAIXA') ||
    alertas.includes('ESTRATEGIA_NAO_AUTORIZADA_AUTOMATICAMENTE') ||
    motivosAjuste.includes('META_ELEVADA_AO_PISO_PADRAO') ||
    motivosAjuste.includes('META_ELEVADA_PARA_NAO_FICAR_ABAIXO_DA_TMB')
  ) {
    status = 'requer_revisao';
    requerAprovacao = true;
  }

  return {
    versao: 1,
    status,
    getEstimadoKcalDia: getKcal,
    intensidadeDesejada,
    intensidadeAplicada,
    deficitPercentual,
    deficitKcalDia,
    metaCaloricaCalculadaKcalDia,
    metaCaloricaAplicadaKcalDia: metaAplicada,
    pisoCaloricoAplicadoKcalDia: piso,
    motivosAjuste,
    alertas,
    bloqueios: [],
    requerAprovacaoProfissional: requerAprovacao,
    observacoes: [
      'Proposta de estratégia energética a partir do GET estimado.',
      'Esta proposta ainda não altera o cardápio. A aplicação dependerá da etapa de aprovação e distribuição alimentar.',
    ],
  };
}
