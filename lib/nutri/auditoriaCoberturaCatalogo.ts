/**
 * ETAPA 10 — Auditoria determinística da cobertura do catálogo Opção 01.
 * Usa exclusivamente `montarPratoPadraoRefeicaoV2` (motor de produção).
 * Não altera catálogo, motor, Opção 01 nem Firestore.
 */

import { REFEICOES_NUTRI_ORDEM, type RefeicaoNutriKey } from '@/lib/nutri/distribuicaoMetasRefeicoes';
import {
  CATALOGO_OPCAO_01_ATUAL,
  filtrarCatalogoOpcao01PorRestricoes,
  itensDisponiveisCatalogoPorRefeicao,
  obterCatalogoPorVersao,
  type ItemCatalogoOpcao01,
} from '@/lib/nutri/catalogoOpcao01';
import {
  montarPratoPadraoRefeicaoV2,
  type AlertaMontagemPrato,
  type ItemCatalogoMontagem,
} from '@/lib/nutri/montagemPratoPadrao';

export type EstiloPlanoAuditoria =
  | 'digestiva'
  | 'plant_based'
  | 'rico_proteina'
  | 'low_carb_moderada'
  | 'mediterranea';

export type ModoAuditoriaCatalogo = 'completo' | 'amostra' | 'teste';

export type ClassificacaoCoberturaCatalogo =
  | 'excelente'
  | 'boa'
  | 'limitada'
  | 'insuficiente';

export const LIMITES_CLASSIFICACAO_COBERTURA_V1 = {
  versao: 1 as const,
  excelenteMin: 0.9,
  boaMin: 0.75,
  limitadaMin: 0.5,
} as const;

export const ESTILOS_AUDITADOS_V1: readonly EstiloPlanoAuditoria[] = [
  'digestiva',
  'plant_based',
  'rico_proteina',
  'low_carb_moderada',
  'mediterranea',
] as const;

export const RESTRICOES_AUDITADAS_V1: readonly string[][] = [
  [],
  ['vegetariano'],
  ['vegano'],
  ['intolerância lactose'],
  ['sem glúten'],
  ['vegetariano', 'intolerância lactose'],
  ['vegano', 'sem glúten'],
  ['intolerância lactose', 'sem glúten'],
] as const;

export const PREFERENCIAS_AUDITADAS_V1: readonly string[][] = [
  [],
  ['Frango'],
  ['Peixe'],
  ['Ovos'],
  ['Carne'],
  ['Laticínios'],
  ['Leguminosas'],
  ['Frango', 'Ovos'],
  ['Peixe', 'Frango'],
  ['Ovos', 'Laticínios'],
  ['Leguminosas', 'Ovos'],
] as const;

export const METAS_CALORIAS_POR_REFEICAO_V1: Record<RefeicaoNutriKey, readonly number[]> = {
  cafe: [200, 250, 300, 350, 400, 450, 500],
  lanche1: [100, 150, 200, 250, 300, 350],
  almoco: [300, 400, 500, 600, 700, 800],
  lanche2: [100, 150, 200, 250, 300, 350, 400],
  jantar: [250, 350, 450, 550, 650, 750],
};

export const METAS_PROTEINA_POR_REFEICAO_V1: Record<RefeicaoNutriKey, readonly number[]> = {
  cafe: [15, 20, 25, 30, 35, 40],
  lanche1: [10, 15, 20, 25, 30],
  almoco: [25, 30, 35, 40, 45, 50, 60],
  lanche2: [10, 15, 20, 25, 30, 35],
  jantar: [20, 25, 30, 35, 40, 45, 50],
};

/** Metas representativas para batch de preferências (controle de custo). */
export const METAS_REPRESENTATIVAS_PREF_V1: Record<
  RefeicaoNutriKey,
  readonly { kcal: number; prot: number }[]
> = {
  cafe: [
    { kcal: 300, prot: 25 },
    { kcal: 400, prot: 30 },
    { kcal: 450, prot: 35 },
    { kcal: 250, prot: 20 },
  ],
  lanche1: [
    { kcal: 150, prot: 15 },
    { kcal: 200, prot: 20 },
    { kcal: 250, prot: 25 },
    { kcal: 300, prot: 30 },
  ],
  almoco: [
    { kcal: 400, prot: 35 },
    { kcal: 500, prot: 40 },
    { kcal: 600, prot: 45 },
    { kcal: 700, prot: 50 },
  ],
  lanche2: [
    { kcal: 150, prot: 15 },
    { kcal: 200, prot: 20 },
    { kcal: 300, prot: 25 },
    { kcal: 350, prot: 30 },
  ],
  jantar: [
    { kcal: 350, prot: 30 },
    { kcal: 450, prot: 35 },
    { kcal: 550, prot: 40 },
    { kcal: 650, prot: 45 },
  ],
};

export interface ResultadoAuditoriaCenarioCatalogo {
  idCenario: string;
  refeicao: RefeicaoNutriKey;
  estilo: string;
  metaCaloriasKcal: number;
  metaProteinaG: number;
  restricoes: string[];
  preferenciasProteina: string[];
  status: 'atendido' | 'atendido_com_alertas' | 'nao_atendido';
  caloriasObtidasKcal: number | null;
  proteinaObtidaG: number | null;
  diferencaCaloriasKcal: number | null;
  diferencaProteinaG: number | null;
  dentroFaixaCalorias: boolean;
  dentroFaixaProteina: boolean;
  itensSelecionados: string[];
  alertas: AlertaMontagemPrato[];
  usouProteinaForaPreferencia: boolean;
  combinacaoNatural: boolean;
  motivosCombinacaoQuestionavel: string[];
}

export interface ResumoCoberturaSegmento {
  total: number;
  atendidos: number;
  percentualAtendimento: number;
  classificacao: ClassificacaoCoberturaCatalogo;
}

export interface ResumoCoberturaCatalogo {
  versao: 1;
  modo: ModoAuditoriaCatalogo;
  totalCenarios: number;
  atendidos: number;
  atendidosComAlertas: number;
  naoAtendidos: number;
  percentualAtendimento: number;
  classificacao: ClassificacaoCoberturaCatalogo;
  porRefeicao: Record<RefeicaoNutriKey, ResumoCoberturaSegmento>;
  porEstilo: Record<string, ResumoCoberturaSegmento>;
  porRestricao: Record<string, ResumoCoberturaSegmento>;
  porMetaProteina: Record<string, ResumoCoberturaSegmento>;
  porMetaCaloria: Record<string, ResumoCoberturaSegmento>;
  alertasMaisFrequentes: {
    alerta: AlertaMontagemPrato;
    quantidade: number;
    percentual: number;
  }[];
  metasProteicasMaisProblematicas: number[];
  metasCaloricasMaisProblematicas: number[];
  combinacoesQuestionaveisMaisFrequentes: string[];
  frequenciaItens: Record<string, number>;
  analisePeru: {
    vezesSelecionado: number;
    percentualCenariosComPeru: number;
    refeicoes: Record<string, number>;
  };
  analiseAzeite: {
    vezesSelecionado: number;
    cenariosComExcessoCaloricoComAzeite: number;
  };
  analiseFruta: {
    vezesSelecionado: number;
  };
}

export interface LacunaPorcaoCatalogo {
  categoria: string;
  itemBaseId: string;
  porcoesExistentes: string[];
  problema: string;
  porcaoIntermediariaSugerida?: string;
  cenariosQueResolveria: number;
}

export interface SugestaoExpansaoCatalogo {
  prioridade: 'alta' | 'media' | 'baixa';
  idSugerido: string;
  nome: string;
  categoria: 'proteina' | 'carboidrato' | 'vegetal' | 'gordura' | 'extra';
  porcao: string;
  proteinaG: number;
  caloriasKcal: number;
  estilosBeneficiados: string[];
  refeicoesBeneficiadas: RefeicaoNutriKey[];
  restricoesBeneficiadas: string[];
  falhasQueResolve: string[];
  quantidadeCenariosResolvidos: number;
  justificativaTecnica: string;
}

export interface RelatorioAuditoriaCatalogo {
  resumo: ResumoCoberturaCatalogo;
  cenarios: ResultadoAuditoriaCenarioCatalogo[];
  lacunasPorcao: LacunaPorcaoCatalogo[];
  sugestoesExpansao: SugestaoExpansaoCatalogo[];
  sugestoesRejeitadas: { idSugerido: string; motivo: string }[];
  notasCusto: string[];
}

interface DefinicaoCenario {
  idCenario: string;
  refeicao: RefeicaoNutriKey;
  estilo: EstiloPlanoAuditoria;
  metaCaloriasKcal: number;
  metaProteinaG: number;
  restricoes: string[];
  preferenciasProteina: string[];
}

function chaveRestricao(restricoes: string[]): string {
  return restricoes.length === 0 ? 'sem_restricao' : restricoes.slice().sort().join('+');
}

function chavePreferencia(prefs: string[]): string {
  return prefs.length === 0 ? 'sem_preferencia' : prefs.join('+');
}

export function classificarCoberturaPercentual(
  percentual: number
): ClassificacaoCoberturaCatalogo {
  if (percentual >= LIMITES_CLASSIFICACAO_COBERTURA_V1.excelenteMin) return 'excelente';
  if (percentual >= LIMITES_CLASSIFICACAO_COBERTURA_V1.boaMin) return 'boa';
  if (percentual >= LIMITES_CLASSIFICACAO_COBERTURA_V1.limitadaMin) return 'limitada';
  return 'insuficiente';
}

export function cenarioFoiAtendido(c: Pick<
  ResultadoAuditoriaCenarioCatalogo,
  'dentroFaixaCalorias' | 'dentroFaixaProteina' | 'alertas'
>): boolean {
  return (
    c.dentroFaixaProteina &&
    c.dentroFaixaCalorias &&
    !c.alertas.includes('SEM_COMBINACAO_VALIDA')
  );
}

/**
 * Filtro de restrições — delega ao catálogo canônico (atributos + fallback nome).
 */
export function filtrarCatalogoPorRestricoes(
  itens: readonly ItemCatalogoMontagem[],
  restricoes: string[]
): ItemCatalogoMontagem[] {
  return filtrarCatalogoOpcao01PorRestricoes(
    itens as ItemCatalogoOpcao01[],
    restricoes
  ) as ItemCatalogoMontagem[];
}

/** Disponibilidade por refeição — delega ao catálogo canônico. */
export function itensDisponiveisPorRefeicao(
  refeicao: RefeicaoNutriKey,
  restricoes: string[],
  catalogo: readonly ItemCatalogoMontagem[] = CATALOGO_OPCAO_01_ATUAL
): ItemCatalogoMontagem[] {
  return itensDisponiveisCatalogoPorRefeicao(
    refeicao,
    restricoes,
    catalogo as ItemCatalogoOpcao01[]
  ) as ItemCatalogoMontagem[];
}

export function avaliarNaturalidadeCombinacao(
  refeicao: RefeicaoNutriKey,
  idsItens: string[]
): { natural: boolean; motivos: string[] } {
  const motivos: string[] = [];
  const ids = idsItens.map((id) => id.toLowerCase());
  const join = ids.join(' ');
  const tem = (s: string) => join.includes(s);
  const countProtComplementares = ids.filter(
    (id) =>
      id.includes('whey') ||
      id.includes('iogurte') ||
      id.includes('claras') ||
      id.includes('cottage') ||
      id.includes('proteina_vegetal')
  ).length;

  if (tem('peixe') && tem('whey')) motivos.push('peixe_mais_whey');
  if (tem('carne') && tem('iogurte')) motivos.push('carne_mais_iogurte_proteico');
  if ((refeicao === 'almoco' || refeicao === 'jantar') && tem('fruta')) {
    motivos.push('fruta_em_almoco_ou_jantar');
  }
  if (tem('azeite') && tem('castanhas')) motivos.push('azeite_mais_castanhas');
  if (countProtComplementares >= 2) motivos.push('multiplos_complementos_proteicos');
  if (tem('peito_peru') && (refeicao === 'almoco' || refeicao === 'jantar')) {
    motivos.push('peru_ultraprocessado_como_principal');
  }
  if (tem('proteina_vegetal') && tem('whey')) motivos.push('proteina_vegetal_mais_whey');
  if (tem('proteina_vegetal') && (tem('peixe') || tem('carne'))) {
    motivos.push('proteina_vegetal_mais_animal');
  }
  if ((refeicao === 'almoco' || refeicao === 'jantar') && tem('tofu') && tem('whey')) {
    motivos.push('tofu_mais_whey_refeicao_principal');
  }
  if ((tem('feijao') || tem('lentilha') || tem('grao_bico')) && tem('whey')) {
    motivos.push('leguminosa_mais_whey');
  }
  // ETAPA 10.5 — contexto cultural
  if (refeicao === 'cafe' && tem('arroz')) motivos.push('arroz_no_cafe');
  if (refeicao === 'cafe' && (tem('ovos') || tem('ovo')) && tem('arroz')) {
    motivos.push('ovo_mais_arroz_no_cafe');
  }
  if ((refeicao === 'lanche1' || refeicao === 'lanche2') && tem('arroz')) {
    motivos.push('arroz_no_lanche');
  }
  if (refeicao === 'cafe' && (tem('frango') || tem('carne') || tem('peixe'))) {
    motivos.push('proteina_almoco_no_cafe');
  }
  if ((refeicao === 'almoco' || refeicao === 'jantar') && tem('whey')) {
    motivos.push('whey_em_refeicao_principal');
  }

  return { natural: motivos.length === 0, motivos };
}

function familiaPreferenciaDeId(id: string): string | null {
  const n = id.toLowerCase();
  if (n.includes('frango') || n.includes('peru')) return 'Frango';
  if (n.includes('peixe')) return 'Peixe';
  if (n.includes('ovos') || n.includes('claras')) return 'Ovos';
  if (n.includes('carne') || n.includes('patinho')) return 'Carne';
  if (n.includes('iogurte') || n.includes('cottage') || n.includes('queijo') || n.includes('whey')) {
    return 'Laticínios';
  }
  if (n.includes('tofu')) return 'Leguminosas';
  return null;
}

export function detectouProteinaForaPreferencia(
  idsItens: string[],
  preferencias: string[]
): boolean {
  if (!preferencias.length) return false;
  const prefsNorm = preferencias.map((p) => p.toLowerCase());
  const proteinas = idsItens.filter((id) => id.startsWith('prot_'));
  if (!proteinas.length) return false;
  const principal = proteinas[0];
  const fam = familiaPreferenciaDeId(principal);
  if (!fam) return true;
  return !prefsNorm.some((p) => fam.toLowerCase().includes(p) || p.includes(fam.toLowerCase()));
}

export function montarIdCenario(d: Omit<DefinicaoCenario, 'idCenario'>): string {
  return [
    d.refeicao,
    d.estilo,
    `k${d.metaCaloriasKcal}`,
    `p${d.metaProteinaG}`,
    chaveRestricao(d.restricoes),
    chavePreferencia(d.preferenciasProteina),
  ].join('|');
}

export function contarCenariosMatriz(modo: ModoAuditoriaCatalogo): number {
  return gerarDefinicoesCenarios(modo).length;
}

export function gerarDefinicoesCenarios(modo: ModoAuditoriaCatalogo): DefinicaoCenario[] {
  const out: DefinicaoCenario[] = [];
  const push = (d: Omit<DefinicaoCenario, 'idCenario'>) => {
    out.push({ ...d, idCenario: montarIdCenario(d) });
  };

  if (modo === 'teste') {
    for (const estilo of ESTILOS_AUDITADOS_V1) {
      for (const refeicao of REFEICOES_NUTRI_ORDEM) {
        push({
          refeicao,
          estilo,
          metaCaloriasKcal: METAS_REPRESENTATIVAS_PREF_V1[refeicao][0].kcal,
          metaProteinaG: METAS_REPRESENTATIVAS_PREF_V1[refeicao][0].prot,
          restricoes: [],
          preferenciasProteina: [],
        });
      }
    }
    // uma amostra de cada restrição e preferência
    for (const restricoes of RESTRICOES_AUDITADAS_V1) {
      push({
        refeicao: 'almoco',
        estilo: 'mediterranea',
        metaCaloriasKcal: 500,
        metaProteinaG: 40,
        restricoes: [...restricoes],
        preferenciasProteina: [],
      });
    }
    for (const prefs of PREFERENCIAS_AUDITADAS_V1) {
      push({
        refeicao: 'cafe',
        estilo: 'rico_proteina',
        metaCaloriasKcal: 350,
        metaProteinaG: 25,
        restricoes: [],
        preferenciasProteina: [...prefs],
      });
    }
    return dedupePorId(out);
  }

  if (modo === 'amostra') {
    for (const estilo of ESTILOS_AUDITADOS_V1) {
      for (const refeicao of REFEICOES_NUTRI_ORDEM) {
        for (const m of METAS_REPRESENTATIVAS_PREF_V1[refeicao]) {
          for (const restricoes of RESTRICOES_AUDITADAS_V1) {
            push({
              refeicao,
              estilo,
              metaCaloriasKcal: m.kcal,
              metaProteinaG: m.prot,
              restricoes: [...restricoes],
              preferenciasProteina: [],
            });
          }
        }
      }
    }
    for (const estilo of ESTILOS_AUDITADOS_V1) {
      for (const refeicao of REFEICOES_NUTRI_ORDEM) {
        const m = METAS_REPRESENTATIVAS_PREF_V1[refeicao][1];
        for (const prefs of PREFERENCIAS_AUDITADAS_V1) {
          push({
            refeicao,
            estilo,
            metaCaloriasKcal: m.kcal,
            metaProteinaG: m.prot,
            restricoes: [],
            preferenciasProteina: [...prefs],
          });
        }
      }
    }
    return dedupePorId(out);
  }

  // completo — batch A: todas metas × estilos × restrições × sem preferência
  for (const estilo of ESTILOS_AUDITADOS_V1) {
    for (const refeicao of REFEICOES_NUTRI_ORDEM) {
      for (const kcal of METAS_CALORIAS_POR_REFEICAO_V1[refeicao]) {
        for (const prot of METAS_PROTEINA_POR_REFEICAO_V1[refeicao]) {
          for (const restricoes of RESTRICOES_AUDITADAS_V1) {
            push({
              refeicao,
              estilo,
              metaCaloriasKcal: kcal,
              metaProteinaG: prot,
              restricoes: [...restricoes],
              preferenciasProteina: [],
            });
          }
        }
      }
    }
  }

  // batch B: preferências × metas representativas × estilos × sem restrição
  for (const estilo of ESTILOS_AUDITADOS_V1) {
    for (const refeicao of REFEICOES_NUTRI_ORDEM) {
      for (const m of METAS_REPRESENTATIVAS_PREF_V1[refeicao]) {
        for (const prefs of PREFERENCIAS_AUDITADAS_V1) {
          if (prefs.length === 0) continue; // já coberto no batch A
          push({
            refeicao,
            estilo,
            metaCaloriasKcal: m.kcal,
            metaProteinaG: m.prot,
            restricoes: [],
            preferenciasProteina: [...prefs],
          });
        }
      }
    }
  }

  return dedupePorId(out);
}

function dedupePorId(defs: DefinicaoCenario[]): DefinicaoCenario[] {
  const seen = new Set<string>();
  const out: DefinicaoCenario[] = [];
  for (const d of defs) {
    if (seen.has(d.idCenario)) continue;
    seen.add(d.idCenario);
    out.push(d);
  }
  return out;
}

export function avaliarCenarioAuditoria(
  def: DefinicaoCenario,
  catalogo: readonly ItemCatalogoMontagem[] = CATALOGO_OPCAO_01_ATUAL
): ResultadoAuditoriaCenarioCatalogo {
  const itens = itensDisponiveisPorRefeicao(def.refeicao, def.restricoes, catalogo);
  const snapshotAntes = JSON.stringify(catalogo);

  const resultado = montarPratoPadraoRefeicaoV2({
    refeicao: def.refeicao,
    metaProteinaG: def.metaProteinaG,
    metaCaloriasKcal: def.metaCaloriasKcal,
    origemMetas: 'distribuicao_nova',
    estilo: def.estilo,
    sintomasGI: def.estilo === 'digestiva' ? 'grave' : 'nenhum',
    restricoes: def.restricoes,
    preferenciasProteina: def.preferenciasProteina,
    itensDisponiveis: itens,
  });

  if (JSON.stringify(catalogo) !== snapshotAntes) {
    throw new Error('Auditoria mutou o catálogo de entrada');
  }

  const ids = resultado.opcao?.itensSelecionados || [];
  const naturalidade = avaliarNaturalidadeCombinacao(def.refeicao, ids);
  const dentroProt =
    resultado.proteinaObtidaG >= def.metaProteinaG * 0.9 &&
    resultado.proteinaObtidaG <= def.metaProteinaG * 1.1;
  const dentroKcal =
    resultado.caloriasObtidasKcal >= def.metaCaloriasKcal * 0.9 &&
    resultado.caloriasObtidasKcal <= def.metaCaloriasKcal * 1.1;

  const base: ResultadoAuditoriaCenarioCatalogo = {
    idCenario: def.idCenario,
    refeicao: def.refeicao,
    estilo: def.estilo,
    metaCaloriasKcal: def.metaCaloriasKcal,
    metaProteinaG: def.metaProteinaG,
    restricoes: [...def.restricoes],
    preferenciasProteina: [...def.preferenciasProteina],
    status: 'nao_atendido',
    caloriasObtidasKcal:
      resultado.status === 'indisponivel' ? null : resultado.caloriasObtidasKcal,
    proteinaObtidaG: resultado.status === 'indisponivel' ? null : resultado.proteinaObtidaG,
    diferencaCaloriasKcal:
      resultado.status === 'indisponivel' ? null : resultado.diferencaCaloriasKcal,
    diferencaProteinaG:
      resultado.status === 'indisponivel' ? null : resultado.diferencaProteinaG,
    dentroFaixaCalorias: resultado.status !== 'indisponivel' && dentroKcal,
    dentroFaixaProteina: resultado.status !== 'indisponivel' && dentroProt,
    itensSelecionados: [...ids],
    alertas: [...resultado.alertas],
    usouProteinaForaPreferencia: detectouProteinaForaPreferencia(ids, def.preferenciasProteina),
    combinacaoNatural: naturalidade.natural,
    motivosCombinacaoQuestionavel: naturalidade.motivos,
  };

  if (cenarioFoiAtendido(base)) {
    base.status =
      base.alertas.length > 0 || !base.combinacaoNatural
        ? 'atendido_com_alertas'
        : 'atendido';
  } else {
    base.status = 'nao_atendido';
  }

  return base;
}

function segmentoVazio(): ResumoCoberturaSegmento {
  return {
    total: 0,
    atendidos: 0,
    percentualAtendimento: 0,
    classificacao: 'insuficiente',
  };
}

function finalizarSegmento(s: ResumoCoberturaSegmento): ResumoCoberturaSegmento {
  const percentualAtendimento = s.total > 0 ? s.atendidos / s.total : 0;
  return {
    ...s,
    percentualAtendimento,
    classificacao: classificarCoberturaPercentual(percentualAtendimento),
  };
}

function acumularSegmento(
  map: Record<string, ResumoCoberturaSegmento>,
  chave: string,
  atendido: boolean
): void {
  if (!map[chave]) map[chave] = segmentoVazio();
  map[chave].total += 1;
  if (atendido) map[chave].atendidos += 1;
}

export function consolidarResumoCobertura(
  cenarios: ResultadoAuditoriaCenarioCatalogo[],
  modo: ModoAuditoriaCatalogo
): ResumoCoberturaCatalogo {
  const porRefeicao = {} as Record<RefeicaoNutriKey, ResumoCoberturaSegmento>;
  for (const r of REFEICOES_NUTRI_ORDEM) porRefeicao[r] = segmentoVazio();
  const porEstilo: Record<string, ResumoCoberturaSegmento> = {};
  const porRestricao: Record<string, ResumoCoberturaSegmento> = {};
  const porMetaProteina: Record<string, ResumoCoberturaSegmento> = {};
  const porMetaCaloria: Record<string, ResumoCoberturaSegmento> = {};
  const alertasCount = new Map<AlertaMontagemPrato, number>();
  const motivosQ = new Map<string, number>();
  const freqItens: Record<string, number> = {};
  const peruRefeicoes: Record<string, number> = {};
  let peruCount = 0;
  let azeiteCount = 0;
  let azeiteExcesso = 0;
  let frutaCount = 0;
  let atendidos = 0;
  let atendidosComAlertas = 0;
  let naoAtendidos = 0;

  for (const c of cenarios) {
    const ok = cenarioFoiAtendido(c);
    if (c.status === 'atendido') atendidos += 1;
    else if (c.status === 'atendido_com_alertas') {
      atendidos += 1;
      atendidosComAlertas += 1;
    } else naoAtendidos += 1;

    acumularSegmento(porRefeicao, c.refeicao, ok);
    acumularSegmento(porEstilo, c.estilo, ok);
    acumularSegmento(porRestricao, chaveRestricao(c.restricoes), ok);
    acumularSegmento(porMetaProteina, String(c.metaProteinaG), ok);
    acumularSegmento(porMetaCaloria, String(c.metaCaloriasKcal), ok);

    for (const a of c.alertas) {
      alertasCount.set(a, (alertasCount.get(a) || 0) + 1);
    }
    for (const m of c.motivosCombinacaoQuestionavel) {
      motivosQ.set(m, (motivosQ.get(m) || 0) + 1);
    }
    for (const id of c.itensSelecionados) {
      freqItens[id] = (freqItens[id] || 0) + 1;
      if (id.includes('peito_peru')) {
        peruCount += 1;
        peruRefeicoes[c.refeicao] = (peruRefeicoes[c.refeicao] || 0) + 1;
      }
      if (id.includes('azeite')) azeiteCount += 1;
      if (id.includes('fruta')) frutaCount += 1;
    }
    if (
      c.itensSelecionados.some((id) => id.includes('azeite')) &&
      c.caloriasObtidasKcal != null &&
      c.caloriasObtidasKcal > c.metaCaloriasKcal * 1.1
    ) {
      azeiteExcesso += 1;
    }
  }

  for (const r of REFEICOES_NUTRI_ORDEM) {
    porRefeicao[r] = finalizarSegmento(porRefeicao[r]);
  }
  for (const k of Object.keys(porEstilo)) porEstilo[k] = finalizarSegmento(porEstilo[k]);
  for (const k of Object.keys(porRestricao)) {
    porRestricao[k] = finalizarSegmento(porRestricao[k]);
  }
  for (const k of Object.keys(porMetaProteina)) {
    porMetaProteina[k] = finalizarSegmento(porMetaProteina[k]);
  }
  for (const k of Object.keys(porMetaCaloria)) {
    porMetaCaloria[k] = finalizarSegmento(porMetaCaloria[k]);
  }

  const total = cenarios.length;
  const percentualAtendimento = total > 0 ? atendidos / total : 0;

  const alertasMaisFrequentes = [...alertasCount.entries()]
    .map(([alerta, quantidade]) => ({
      alerta,
      quantidade,
      percentual: total > 0 ? quantidade / total : 0,
    }))
    .sort((a, b) => b.quantidade - a.quantidade);

  const metasProteicasMaisProblematicas = Object.entries(porMetaProteina)
    .filter(([, s]) => s.total >= 3)
    .sort((a, b) => a[1].percentualAtendimento - b[1].percentualAtendimento)
    .slice(0, 8)
    .map(([k]) => Number(k));

  const metasCaloricasMaisProblematicas = Object.entries(porMetaCaloria)
    .filter(([, s]) => s.total >= 3)
    .sort((a, b) => a[1].percentualAtendimento - b[1].percentualAtendimento)
    .slice(0, 8)
    .map(([k]) => Number(k));

  const combinacoesQuestionaveisMaisFrequentes = [...motivosQ.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([m]) => m);

  return {
    versao: 1,
    modo,
    totalCenarios: total,
    atendidos,
    atendidosComAlertas,
    naoAtendidos,
    percentualAtendimento,
    classificacao: classificarCoberturaPercentual(percentualAtendimento),
    porRefeicao,
    porEstilo,
    porRestricao,
    porMetaProteina,
    porMetaCaloria,
    alertasMaisFrequentes,
    metasProteicasMaisProblematicas,
    metasCaloricasMaisProblematicas,
    combinacoesQuestionaveisMaisFrequentes,
    frequenciaItens: freqItens,
    analisePeru: {
      vezesSelecionado: peruCount,
      percentualCenariosComPeru: total > 0 ? peruCount / total : 0,
      refeicoes: peruRefeicoes,
    },
    analiseAzeite: {
      vezesSelecionado: azeiteCount,
      cenariosComExcessoCaloricoComAzeite: azeiteExcesso,
    },
    analiseFruta: { vezesSelecionado: frutaCount },
  };
}

function estimarLacunasPorcao(
  cenarios: ResultadoAuditoriaCenarioCatalogo[],
  catalogo: readonly ItemCatalogoMontagem[]
): LacunaPorcaoCatalogo[] {
  const ids = new Set(catalogo.map((i) => i.id));
  const tem = (...candidatos: string[]) => candidatos.some((id) => ids.has(id));
  const falhasProt = cenarios.filter(
    (c) => !c.dentroFaixaProteina && c.proteinaObtidaG != null
  );
  const falhasKcalAlto = cenarios.filter(
    (c) =>
      c.caloriasObtidasKcal != null &&
      c.caloriasObtidasKcal > c.metaCaloriasKcal * 1.1
  );
  const falhasKcalBaixo = cenarios.filter(
    (c) =>
      c.caloriasObtidasKcal != null &&
      c.caloriasObtidasKcal < c.metaCaloriasKcal * 0.9
  );
  const plantFail = cenarios.filter(
    (c) =>
      (c.estilo === 'plant_based' || c.restricoes.includes('vegano')) &&
      c.status === 'nao_atendido'
  );

  const lacunas: LacunaPorcaoCatalogo[] = [
    {
      categoria: 'proteina',
      itemBaseId: 'prot_frango_100g',
      porcoesExistentes: ['prot_frango_100g', 'prot_frango_150g'].filter((id) => ids.has(id)),
      problema: 'Salto 100g→150g sem intermediário (~120g)',
      porcaoIntermediariaSugerida: 'prot_frango_120g',
      cenariosQueResolveria: falhasProt.filter(
        (c) =>
          c.proteinaObtidaG != null &&
          c.metaProteinaG - c.proteinaObtidaG > 0 &&
          c.metaProteinaG - c.proteinaObtidaG <= 8
      ).length,
    },
    {
      categoria: 'proteina',
      itemBaseId: 'prot_ovos_2un',
      porcoesExistentes: ['prot_ovos_2un', 'prot_ovos_3un'].filter((id) => ids.has(id)),
      problema: 'Sem porção de 1 ovo para metas baixas de café/lanche',
      porcaoIntermediariaSugerida: 'prot_ovos_1un',
      cenariosQueResolveria: falhasKcalAlto.filter((c) =>
        c.itensSelecionados.some((id) => id.includes('ovos'))
      ).length,
    },
    {
      categoria: 'gordura_boa',
      itemBaseId: 'gord_azeite_1col',
      porcoesExistentes: ['gord_azeite_1col'].filter((id) => ids.has(id)),
      problema: 'Única porção 120 kcal estoura metas pequenas',
      porcaoIntermediariaSugerida: 'gord_azeite_1col_cha',
      cenariosQueResolveria: falhasKcalAlto.filter((c) =>
        c.itensSelecionados.some((id) => id.includes('azeite'))
      ).length,
    },
    {
      categoria: 'carboidrato',
      itemBaseId: 'carb_arroz_integral_3col',
      porcoesExistentes: [
        'carb_arroz_integral_3col',
        'carb_arroz_branco_3col',
        'carb_arroz_branco_2col',
        'carb_arroz_branco_4col',
        'carb_arroz_integral_2col',
        'carb_arroz_integral_4col',
      ].filter((id) => ids.has(id)),
      problema: 'Apenas 3 colheres — falta 2 e 4 colheres',
      porcaoIntermediariaSugerida: 'carb_arroz_2col',
      cenariosQueResolveria: falhasKcalBaixo.length + falhasKcalAlto.length,
    },
    {
      categoria: 'proteina',
      itemBaseId: 'prot_tofu_100g',
      porcoesExistentes: ['prot_tofu_100g', 'prot_tofu_150g', 'prot_tofu_200g'].filter((id) =>
        ids.has(id)
      ),
      problema: 'Tofu só 100g (8g prot) — insuficiente para plant-based',
      porcaoIntermediariaSugerida: 'prot_tofu_200g',
      cenariosQueResolveria: plantFail.length,
    },
    {
      categoria: 'proteina',
      itemBaseId: 'prot_peixe_100g',
      porcoesExistentes: ['prot_peixe_100g', 'prot_peixe_150g'].filter((id) => ids.has(id)),
      problema: 'Sem peixe 150g para metas proteicas altas no jantar',
      porcaoIntermediariaSugerida: 'prot_peixe_150g',
      cenariosQueResolveria: falhasProt.filter(
        (c) => c.refeicao === 'jantar' || c.refeicao === 'almoco'
      ).length,
    },
    {
      categoria: 'proteina',
      itemBaseId: 'prot_claras_4un',
      porcoesExistentes: ['prot_claras_4un', 'prot_claras_2un'].filter((id) => ids.has(id)),
      problema: 'Sem 2 claras para complemento leve',
      porcaoIntermediariaSugerida: 'prot_claras_2un',
      cenariosQueResolveria: Math.round(falhasProt.length * 0.15),
    },
  ];

  return lacunas.filter((l) => {
    if (l.porcaoIntermediariaSugerida === 'carb_arroz_2col') {
      return !(tem('carb_arroz_branco_2col') && tem('carb_arroz_integral_2col'));
    }
    if (l.porcaoIntermediariaSugerida === 'carb_batata_doce_meia') {
      return !tem('carb_batata_doce_meia');
    }
    return !ids.has(l.porcaoIntermediariaSugerida);
  });
}

interface HipoteseItem {
  idSugerido: string;
  nome: string;
  categoria: SugestaoExpansaoCatalogo['categoria'];
  porcao: string;
  proteinaG: number;
  caloriasKcal: number;
  falhasQueResolve: string[];
  estilosBeneficiados: string[];
  refeicoesBeneficiadas: RefeicaoNutriKey[];
  restricoesBeneficiadas: string[];
  justificativaTecnica: string;
  scoreFn: (ctx: {
    falhas: ResultadoAuditoriaCenarioCatalogo[];
    plantFail: ResultadoAuditoriaCenarioCatalogo[];
    digFail: ResultadoAuditoriaCenarioCatalogo[];
    lancheFail: ResultadoAuditoriaCenarioCatalogo[];
    lacunas: LacunaPorcaoCatalogo[];
  }) => number;
}

const HIPOTESES_EXPANSAO_V1: HipoteseItem[] = [
  {
    idSugerido: 'prot_frango_120g',
    nome: 'Peito de frango grelhado (120g)',
    categoria: 'proteina',
    porcao: '120 g',
    proteinaG: 37,
    caloriasKcal: 198,
    falhasQueResolve: ['salto_porcao_frango', 'meta_proteica_intermediaria'],
    estilosBeneficiados: ['rico_proteina', 'mediterranea', 'low_carb_moderada'],
    refeicoesBeneficiadas: ['almoco', 'jantar'],
    restricoesBeneficiadas: ['sem_restricao', 'sem glúten', 'intolerância lactose'],
    justificativaTecnica: 'Fecha o salto 100↔150g nas metas ~35–40g.',
    scoreFn: ({ lacunas }) =>
      lacunas.find((l) => l.itemBaseId === 'prot_frango_100g')?.cenariosQueResolveria || 0,
  },
  {
    idSugerido: 'prot_peixe_150g',
    nome: 'Peixe grelhado (150g)',
    categoria: 'proteina',
    porcao: '150 g',
    proteinaG: 38,
    caloriasKcal: 225,
    falhasQueResolve: ['meta_proteica_alta_jantar', 'digestiva_proteina'],
    estilosBeneficiados: ['digestiva', 'mediterranea'],
    refeicoesBeneficiadas: ['jantar', 'almoco'],
    restricoesBeneficiadas: ['sem_restricao', 'sem glúten', 'intolerância lactose'],
    justificativaTecnica: 'Amplia peixe para metas ≥35g sem forçar carne.',
    scoreFn: ({ lacunas }) =>
      lacunas.find((l) => l.itemBaseId === 'prot_peixe_100g')?.cenariosQueResolveria || 0,
  },
  {
    idSugerido: 'prot_carne_magra_150g',
    nome: 'Carne magra/patinho (150g)',
    categoria: 'proteina',
    porcao: '150 g',
    proteinaG: 39,
    caloriasKcal: 300,
    falhasQueResolve: ['meta_proteica_alta_almoco'],
    estilosBeneficiados: ['rico_proteina', 'low_carb_moderada'],
    refeicoesBeneficiadas: ['almoco', 'jantar'],
    restricoesBeneficiadas: ['sem_restricao'],
    justificativaTecnica: 'Porção maior de carne para recomposição.',
    scoreFn: ({ falhas }) =>
      falhas.filter((c) => c.metaProteinaG >= 45 && c.preferenciasProteina.includes('Carne'))
        .length,
  },
  {
    idSugerido: 'prot_tofu_150g',
    nome: 'Tofu (150g)',
    categoria: 'proteina',
    porcao: '150 g',
    proteinaG: 12,
    caloriasKcal: 114,
    falhasQueResolve: ['plant_based_proteina'],
    estilosBeneficiados: ['plant_based'],
    refeicoesBeneficiadas: ['almoco', 'jantar', 'cafe'],
    restricoesBeneficiadas: ['vegano', 'vegetariano', 'vegano+sem glúten'],
    justificativaTecnica: 'Porção intermediária de tofu.',
    scoreFn: ({ plantFail }) => Math.round(plantFail.length * 0.35),
  },
  {
    idSugerido: 'prot_tofu_200g',
    nome: 'Tofu (200g)',
    categoria: 'proteina',
    porcao: '200 g',
    proteinaG: 16,
    caloriasKcal: 152,
    falhasQueResolve: ['plant_based_proteina_alta'],
    estilosBeneficiados: ['plant_based'],
    refeicoesBeneficiadas: ['almoco', 'jantar'],
    restricoesBeneficiadas: ['vegano', 'vegetariano'],
    justificativaTecnica: 'Única proteína vegetal atual é fraca (8g/100g).',
    scoreFn: ({ plantFail, lacunas }) =>
      (lacunas.find((l) => l.itemBaseId === 'prot_tofu_100g')?.cenariosQueResolveria || 0) +
      Math.round(plantFail.length * 0.2),
  },
  {
    idSugerido: 'prot_ovos_1un',
    nome: '1 ovo inteiro',
    categoria: 'proteina',
    porcao: '1 unidade',
    proteinaG: 6,
    caloriasKcal: 70,
    falhasQueResolve: ['cafe_baixa_kcal', 'lanche_baixo'],
    estilosBeneficiados: ['digestiva', 'mediterranea', 'rico_proteina'],
    refeicoesBeneficiadas: ['cafe', 'lanche1', 'lanche2'],
    restricoesBeneficiadas: ['vegetariano', 'sem glúten'],
    justificativaTecnica: 'Permite café/lanche com meta calórica baixa.',
    scoreFn: ({ lacunas }) =>
      lacunas.find((l) => l.itemBaseId === 'prot_ovos_2un')?.cenariosQueResolveria || 0,
  },
  {
    idSugerido: 'prot_claras_2un',
    nome: '2 claras de ovo',
    categoria: 'proteina',
    porcao: '2 claras',
    proteinaG: 7,
    caloriasKcal: 34,
    falhasQueResolve: ['complemento_proteico_leve'],
    estilosBeneficiados: ['rico_proteina', 'digestiva'],
    refeicoesBeneficiadas: ['cafe', 'almoco', 'jantar'],
    restricoesBeneficiadas: ['vegetariano'],
    justificativaTecnica: 'Complemento menor que 4 claras.',
    scoreFn: ({ lacunas }) =>
      lacunas.find((l) => l.itemBaseId === 'prot_claras_4un')?.cenariosQueResolveria || 0,
  },
  {
    idSugerido: 'gord_azeite_1col_cha',
    nome: 'Azeite (1 colher de chá)',
    categoria: 'gordura',
    porcao: '1 colher de chá',
    proteinaG: 0,
    caloriasKcal: 40,
    falhasQueResolve: ['estouro_caloric_azeite'],
    estilosBeneficiados: ['mediterranea', 'digestiva', 'low_carb_moderada'],
    refeicoesBeneficiadas: ['almoco', 'jantar', 'cafe'],
    restricoesBeneficiadas: ['vegano', 'vegetariano', 'sem_restricao'],
    justificativaTecnica: 'Reduz impacto de 120 kcal em refeições pequenas.',
    scoreFn: ({ lacunas }) =>
      lacunas.find((l) => l.itemBaseId === 'gord_azeite_1col')?.cenariosQueResolveria || 0,
  },
  {
    idSugerido: 'gord_castanhas_meia',
    nome: 'Castanhas (meia porção)',
    categoria: 'gordura',
    porcao: 'meia porção',
    proteinaG: 1.5,
    caloriasKcal: 50,
    falhasQueResolve: ['lanche_gordura_controlada'],
    estilosBeneficiados: ['mediterranea'],
    refeicoesBeneficiadas: ['cafe', 'lanche1', 'lanche2'],
    restricoesBeneficiadas: ['vegano', 'vegetariano'],
    justificativaTecnica: 'Meia porção para caber em lanches ~150–200 kcal.',
    scoreFn: ({ lancheFail }) => Math.round(lancheFail.length * 0.08),
  },
  {
    idSugerido: 'carb_arroz_2col',
    nome: 'Arroz (2 colheres)',
    categoria: 'carboidrato',
    porcao: '2 colheres',
    proteinaG: 1,
    caloriasKcal: 90,
    falhasQueResolve: ['refeicao_menor_kcal'],
    estilosBeneficiados: ['digestiva', 'mediterranea'],
    refeicoesBeneficiadas: ['jantar', 'almoco'],
    restricoesBeneficiadas: ['sem_restricao', 'vegano'],
    justificativaTecnica: 'Permite jantares menores sem cortar carbo.',
    scoreFn: ({ lacunas }) =>
      Math.round(
        (lacunas.find((l) => l.itemBaseId === 'carb_arroz_integral_3col')?.cenariosQueResolveria ||
          0) * 0.4
      ),
  },
  {
    idSugerido: 'carb_arroz_4col',
    nome: 'Arroz (4 colheres)',
    categoria: 'carboidrato',
    porcao: '4 colheres',
    proteinaG: 3,
    caloriasKcal: 190,
    falhasQueResolve: ['meta_calorica_alta'],
    estilosBeneficiados: ['mediterranea', 'rico_proteina'],
    refeicoesBeneficiadas: ['almoco'],
    restricoesBeneficiadas: ['sem_restricao'],
    justificativaTecnica: 'Completa metas calóricas altas no almoço.',
    scoreFn: ({ falhas }) =>
      falhas.filter((c) => c.refeicao === 'almoco' && c.metaCaloriasKcal >= 700).length,
  },
  {
    idSugerido: 'carb_batata_doce_meia',
    nome: 'Batata-doce (meia unidade)',
    categoria: 'carboidrato',
    porcao: '1/2 unidade',
    proteinaG: 1,
    caloriasKcal: 90,
    falhasQueResolve: ['low_carb_porcao'],
    estilosBeneficiados: ['low_carb_moderada'],
    refeicoesBeneficiadas: ['almoco', 'jantar', 'cafe'],
    restricoesBeneficiadas: ['sem_restricao', 'sem glúten'],
    justificativaTecnica: 'Meia porção vs unidade média de 180 kcal.',
    scoreFn: ({ falhas }) =>
      falhas.filter((c) => c.estilo === 'low_carb_moderada').length,
  },
  {
    idSugerido: 'prot_feijao_1concha',
    nome: 'Feijão cozido (1 concha)',
    categoria: 'proteina',
    porcao: '1 concha (~80g)',
    proteinaG: 6,
    caloriasKcal: 70,
    falhasQueResolve: ['ausencia_leguminosas', 'plant_based'],
    estilosBeneficiados: ['plant_based', 'mediterranea'],
    refeicoesBeneficiadas: ['almoco', 'jantar'],
    restricoesBeneficiadas: ['vegano', 'vegetariano', 'sem glúten'],
    justificativaTecnica: 'Lacuna estrutural: não há leguminosas no catálogo.',
    scoreFn: ({ plantFail }) => Math.round(plantFail.length * 0.55),
  },
  {
    idSugerido: 'prot_lentilha_1concha',
    nome: 'Lentilha cozida (1 concha)',
    categoria: 'proteina',
    porcao: '1 concha',
    proteinaG: 7,
    caloriasKcal: 80,
    falhasQueResolve: ['plant_based_variedade'],
    estilosBeneficiados: ['plant_based'],
    refeicoesBeneficiadas: ['almoco', 'jantar'],
    restricoesBeneficiadas: ['vegano', 'vegetariano'],
    justificativaTecnica: 'Variedade além de tofu.',
    scoreFn: ({ plantFail }) => Math.round(plantFail.length * 0.25),
  },
  {
    idSugerido: 'prot_grao_bico_1concha',
    nome: 'Grão-de-bico (1 concha)',
    categoria: 'proteina',
    porcao: '1 concha',
    proteinaG: 6,
    caloriasKcal: 90,
    falhasQueResolve: ['plant_based_variedade'],
    estilosBeneficiados: ['plant_based', 'mediterranea'],
    refeicoesBeneficiadas: ['almoco'],
    restricoesBeneficiadas: ['vegano', 'vegetariano'],
    justificativaTecnica: 'Complemento mediterrâneo/plant-based.',
    scoreFn: ({ plantFail }) => Math.round(plantFail.length * 0.2),
  },
  {
    idSugerido: 'prot_atum_agua_1lata',
    nome: 'Atum em água (1 lata escorrida)',
    categoria: 'proteina',
    porcao: '~120 g',
    proteinaG: 28,
    caloriasKcal: 120,
    falhasQueResolve: ['proteina_pratica_almoco', 'digestiva'],
    estilosBeneficiados: ['digestiva', 'mediterranea', 'rico_proteina'],
    refeicoesBeneficiadas: ['almoco', 'jantar', 'lanche2'],
    restricoesBeneficiadas: ['sem_restricao', 'intolerância lactose'],
    justificativaTecnica: 'Proteína prática magra; útil em jantar leve.',
    scoreFn: ({ digFail, falhas }) =>
      Math.round(digFail.length * 0.15) +
      falhas.filter((c) => c.refeicao === 'jantar' && c.metaCaloriasKcal <= 350).length,
  },
  {
    idSugerido: 'prot_ricota_100g',
    nome: 'Ricota (100g)',
    categoria: 'proteina',
    porcao: '100 g',
    proteinaG: 11,
    caloriasKcal: 140,
    falhasQueResolve: ['variedade_laticinios'],
    estilosBeneficiados: ['mediterranea'],
    refeicoesBeneficiadas: ['cafe', 'lanche1'],
    restricoesBeneficiadas: ['vegetariano'],
    justificativaTecnica: 'Alternativa a cottage; impacto moderado.',
    scoreFn: ({ falhas }) => Math.round(falhas.length * 0.02),
  },
  {
    idSugerido: 'prot_iogurte_sem_lactose',
    nome: 'Iogurte proteico sem lactose',
    categoria: 'proteina',
    porcao: '170 g',
    proteinaG: 20,
    caloriasKcal: 150,
    falhasQueResolve: ['intolerancia_lactose_lanche'],
    estilosBeneficiados: ['rico_proteina', 'mediterranea'],
    refeicoesBeneficiadas: ['cafe', 'lanche1', 'lanche2'],
    restricoesBeneficiadas: ['intolerância lactose', 'vegetariano+intolerância lactose'],
    justificativaTecnica: 'Restitui iogurte quando lactose é restrita.',
    scoreFn: ({ falhas }) =>
      falhas.filter((c) => c.restricoes.includes('intolerância lactose')).length,
  },
  {
    idSugerido: 'prot_whey_isolado_sl',
    nome: 'Whey isolado sem lactose (1 dose)',
    categoria: 'proteina',
    porcao: '1 dose',
    proteinaG: 25,
    caloriasKcal: 110,
    falhasQueResolve: ['lactose_mais_suplemento'],
    estilosBeneficiados: ['rico_proteina'],
    refeicoesBeneficiadas: ['lanche1', 'lanche2', 'cafe'],
    restricoesBeneficiadas: ['intolerância lactose'],
    justificativaTecnica: 'Whey atual não é marcado sem lactose no filtro.',
    scoreFn: ({ falhas }) =>
      Math.round(
        falhas.filter((c) => c.restricoes.includes('intolerância lactose')).length * 0.4
      ),
  },
  {
    idSugerido: 'prot_proteina_vegetal',
    nome: 'Proteína vegetal em pó (1 dose)',
    categoria: 'proteina',
    porcao: '1 dose',
    proteinaG: 20,
    caloriasKcal: 110,
    falhasQueResolve: ['vegano_lanche', 'plant_based_alta_prot'],
    estilosBeneficiados: ['plant_based'],
    refeicoesBeneficiadas: ['lanche1', 'lanche2', 'cafe'],
    restricoesBeneficiadas: ['vegano', 'vegano+sem glúten'],
    justificativaTecnica: 'Lanches veganos hoje ficam sem whey/iogurte/ovos.',
    scoreFn: ({ plantFail, lancheFail }) =>
      lancheFail.filter((c) => c.restricoes.includes('vegano')).length +
      Math.round(plantFail.length * 0.3),
  },
  {
    idSugerido: 'carb_aveia_3col',
    nome: 'Aveia (3 colheres)',
    categoria: 'carboidrato',
    porcao: '3 colheres',
    proteinaG: 4,
    caloriasKcal: 110,
    falhasQueResolve: ['variedade_cafe'],
    estilosBeneficiados: ['mediterranea', 'rico_proteina'],
    refeicoesBeneficiadas: ['cafe'],
    restricoesBeneficiadas: ['vegetariano', 'vegano'],
    justificativaTecnica: 'Carbo de café além de pão.',
    scoreFn: ({ falhas }) => falhas.filter((c) => c.refeicao === 'cafe').length,
  },
  {
    idSugerido: 'carb_cuscuz_1prato',
    nome: 'Cuscuz (1 prato pequeno)',
    categoria: 'carboidrato',
    porcao: '1 prato pequeno',
    proteinaG: 3,
    caloriasKcal: 140,
    falhasQueResolve: ['variedade_regional'],
    estilosBeneficiados: ['digestiva'],
    refeicoesBeneficiadas: ['cafe', 'jantar'],
    restricoesBeneficiadas: ['sem_restricao'],
    justificativaTecnica: 'Benefício cultural; impacto limitado na cobertura.',
    scoreFn: ({ digFail }) => Math.round(digFail.length * 0.05),
  },
  {
    idSugerido: 'carb_tapioca_1un',
    nome: 'Tapioca (1 unidade média)',
    categoria: 'carboidrato',
    porcao: '1 unidade',
    proteinaG: 0,
    caloriasKcal: 140,
    falhasQueResolve: ['sem_gluten_carbo'],
    estilosBeneficiados: ['digestiva'],
    refeicoesBeneficiadas: ['cafe'],
    restricoesBeneficiadas: ['sem glúten', 'vegano+sem glúten'],
    justificativaTecnica: 'Carbo sem glúten para café.',
    scoreFn: ({ falhas }) =>
      falhas.filter((c) => c.restricoes.includes('sem glúten') && c.refeicao === 'cafe')
        .length,
  },
  {
    idSugerido: 'carb_pao_sem_gluten',
    nome: 'Pão sem glúten (1 fatia)',
    categoria: 'carboidrato',
    porcao: '1 fatia',
    proteinaG: 2,
    caloriasKcal: 70,
    falhasQueResolve: ['sem_gluten_pao'],
    estilosBeneficiados: ['mediterranea', 'digestiva'],
    refeicoesBeneficiadas: ['cafe'],
    restricoesBeneficiadas: ['sem glúten'],
    justificativaTecnica: 'Substitui pão integral filtrado por sem glúten.',
    scoreFn: ({ falhas }) =>
      falhas.filter((c) => c.restricoes.includes('sem glúten') && c.refeicao === 'cafe')
        .length,
  },
  {
    idSugerido: 'extra_sopa_digestiva',
    nome: 'Sopa leve de legumes (1 prato)',
    categoria: 'extra',
    porcao: '1 prato',
    proteinaG: 4,
    caloriasKcal: 120,
    falhasQueResolve: ['digestiva_refeicao_leve'],
    estilosBeneficiados: ['digestiva'],
    refeicoesBeneficiadas: ['jantar'],
    restricoesBeneficiadas: ['vegetariano', 'vegano'],
    justificativaTecnica: 'Jantar GI leve; catálogo não tem preparo líquido.',
    scoreFn: ({ digFail }) =>
      digFail.filter((c) => c.refeicao === 'jantar' && c.metaCaloriasKcal <= 350).length,
  },
];

function priorizarSugestoes(
  score: number,
  totalFalhas: number
): SugestaoExpansaoCatalogo['prioridade'] {
  if (totalFalhas <= 0) return 'baixa';
  const ratio = score / totalFalhas;
  if (score >= 80 || ratio >= 0.12) return 'alta';
  if (score >= 25 || ratio >= 0.04) return 'media';
  return 'baixa';
}

function catalogoTemId(
  id: string,
  catalogo: readonly ItemCatalogoMontagem[] = CATALOGO_OPCAO_01_ATUAL
): boolean {
  if (catalogo.some((i) => i.id === id)) return true;
  // Variantes nomeadas no lote 01 (arroz branco/integral) satisfazem hipótese genérica.
  if (id === 'carb_arroz_2col') {
    return (
      catalogo.some((i) => i.id === 'carb_arroz_branco_2col') &&
      catalogo.some((i) => i.id === 'carb_arroz_integral_2col')
    );
  }
  if (id === 'carb_arroz_4col') {
    return (
      catalogo.some((i) => i.id === 'carb_arroz_branco_4col') &&
      catalogo.some((i) => i.id === 'carb_arroz_integral_4col')
    );
  }
  return false;
}

function gerarSugestoesExpansao(
  cenarios: ResultadoAuditoriaCenarioCatalogo[],
  lacunas: LacunaPorcaoCatalogo[],
  catalogo: readonly ItemCatalogoMontagem[] = CATALOGO_OPCAO_01_ATUAL
): { sugestoes: SugestaoExpansaoCatalogo[]; rejeitadas: { idSugerido: string; motivo: string }[] } {
  const falhas = cenarios.filter((c) => c.status === 'nao_atendido');
  const plantFail = falhas.filter(
    (c) => c.estilo === 'plant_based' || c.restricoes.includes('vegano')
  );
  const digFail = falhas.filter((c) => c.estilo === 'digestiva');
  const lancheFail = falhas.filter((c) => c.refeicao === 'lanche1' || c.refeicao === 'lanche2');
  const ctx = { falhas, plantFail, digFail, lancheFail, lacunas };

  const sugestoes: SugestaoExpansaoCatalogo[] = [];
  const rejeitadas: { idSugerido: string; motivo: string }[] = [];

  for (const h of HIPOTESES_EXPANSAO_V1) {
    if (catalogoTemId(h.idSugerido, catalogo)) {
      rejeitadas.push({
        idSugerido: h.idSugerido,
        motivo: 'ID já existe no catálogo atual',
      });
      continue;
    }
    const quantidadeCenariosResolvidos = h.scoreFn(ctx);
    if (quantidadeCenariosResolvidos < 3) {
      rejeitadas.push({
        idSugerido: h.idSugerido,
        motivo: `Impacto estimado baixo (${quantidadeCenariosResolvidos} cenários)`,
      });
      continue;
    }
    sugestoes.push({
      prioridade: priorizarSugestoes(quantidadeCenariosResolvidos, falhas.length || 1),
      idSugerido: h.idSugerido,
      nome: h.nome,
      categoria: h.categoria,
      porcao: h.porcao,
      proteinaG: h.proteinaG,
      caloriasKcal: h.caloriasKcal,
      estilosBeneficiados: h.estilosBeneficiados,
      refeicoesBeneficiadas: h.refeicoesBeneficiadas,
      restricoesBeneficiadas: h.restricoesBeneficiadas,
      falhasQueResolve: h.falhasQueResolve,
      quantidadeCenariosResolvidos,
      justificativaTecnica: h.justificativaTecnica,
    });
  }

  sugestoes.sort((a, b) => {
    const p = { alta: 0, media: 1, baixa: 2 };
    if (p[a.prioridade] !== p[b.prioridade]) return p[a.prioridade] - p[b.prioridade];
    return b.quantidadeCenariosResolvidos - a.quantidadeCenariosResolvidos;
  });

  return { sugestoes, rejeitadas };
}

/**
 * Executa a auditoria. Não rodar no render do cliente.
 */
export function executarAuditoriaCoberturaCatalogo(opcoes?: {
  modo?: ModoAuditoriaCatalogo;
  catalogo?: readonly ItemCatalogoMontagem[];
  /** 1 = snapshot legado; 2 = lote 01 (padrão atual). */
  versaoCatalogo?: 1 | 2;
}): RelatorioAuditoriaCatalogo {
  const modo = opcoes?.modo ?? 'completo';
  const versaoCatalogo = opcoes?.versaoCatalogo ?? 2;
  const catalogo =
    opcoes?.catalogo ?? obterCatalogoPorVersao(versaoCatalogo);
  const idsAntes = catalogo.map((i) => i.id).join(',');

  const defs = gerarDefinicoesCenarios(modo);
  const cenarios = defs.map((d) => avaliarCenarioAuditoria(d, catalogo));
  const resumo = consolidarResumoCobertura(cenarios, modo);
  const lacunasPorcao = estimarLacunasPorcao(cenarios, catalogo);
  const { sugestoes, rejeitadas } = gerarSugestoesExpansao(cenarios, lacunasPorcao, catalogo);

  if (catalogo.map((i) => i.id).join(',') !== idsAntes) {
    throw new Error('Catálogo foi alterado durante a auditoria');
  }

  const notasCusto = [
    `Modo=${modo}; versaoCatalogo=${versaoCatalogo}; cenários=${cenarios.length}.`,
    'Batch A (completo): metas×estilos×restrições×sem preferência.',
    'Batch B (completo): preferências×metas representativas×estilos×sem restrição.',
    'Modo amostra/teste reduz a matriz para CI/dev rápido.',
    'Nenhuma chamada externa, IA ou Firestore.',
  ];

  return {
    resumo,
    cenarios,
    lacunasPorcao,
    sugestoesExpansao: sugestoes,
    sugestoesRejeitadas: rejeitadas,
    notasCusto,
  };
}

export function gerarMarkdownRelatorioAuditoria(
  relatorio: RelatorioAuditoriaCatalogo
): string {
  const r = relatorio.resumo;
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const lines: string[] = [];
  lines.push('# Auditoria de cobertura do catálogo — V1');
  lines.push('');
  lines.push('## 1. Resumo executivo');
  lines.push('');
  lines.push(
    `Modo **${r.modo}**: ${r.totalCenarios} cenários · atendimento **${pct(r.percentualAtendimento)}** · classificação **${r.classificacao}**.`
  );
  lines.push(
    `Atendidos: ${r.atendidos} (com alertas/naturalidade: ${r.atendidosComAlertas}) · Não atendidos: ${r.naoAtendidos}.`
  );
  lines.push('');
  lines.push('## 2–3. Totais e cobertura geral');
  lines.push('');
  lines.push(`| Métrica | Valor |`);
  lines.push(`|--------:|------:|`);
  lines.push(`| Total | ${r.totalCenarios} |`);
  lines.push(`| Atendidos | ${r.atendidos} |`);
  lines.push(`| % | ${pct(r.percentualAtendimento)} |`);
  lines.push(`| Classe | ${r.classificacao} |`);
  lines.push('');
  lines.push('## 4. Cobertura por refeição');
  lines.push('');
  lines.push('| Refeição | Total | Atendidos | % | Classe |');
  lines.push('|----------|------:|----------:|--:|--------|');
  for (const key of REFEICOES_NUTRI_ORDEM) {
    const s = r.porRefeicao[key];
    lines.push(
      `| ${key} | ${s.total} | ${s.atendidos} | ${pct(s.percentualAtendimento)} | ${s.classificacao} |`
    );
  }
  lines.push('');
  lines.push('## 5. Cobertura por estilo');
  lines.push('');
  lines.push('| Estilo | Total | Atendidos | % | Classe |');
  lines.push('|--------|------:|----------:|--:|--------|');
  for (const [k, s] of Object.entries(r.porEstilo).sort()) {
    lines.push(
      `| ${k} | ${s.total} | ${s.atendidos} | ${pct(s.percentualAtendimento)} | ${s.classificacao} |`
    );
  }
  lines.push('');
  lines.push('## 6. Cobertura por restrição');
  lines.push('');
  lines.push('| Restrição | Total | Atendidos | % | Classe |');
  lines.push('|-----------|------:|----------:|--:|--------|');
  for (const [k, s] of Object.entries(r.porRestricao).sort(
    (a, b) => a[1].percentualAtendimento - b[1].percentualAtendimento
  )) {
    lines.push(
      `| ${k} | ${s.total} | ${s.atendidos} | ${pct(s.percentualAtendimento)} | ${s.classificacao} |`
    );
  }
  lines.push('');
  lines.push('## 7. Metas proteicas problemáticas');
  lines.push('');
  lines.push('| Meta proteica | Cenários | Atendidos | Cobertura |');
  lines.push('| ------------: | -------: | --------: | --------: |');
  for (const [k, s] of Object.entries(r.porMetaProteina).sort(
    (a, b) => Number(a[0]) - Number(b[0])
  )) {
    lines.push(
      `| ${k} g | ${s.total} | ${s.atendidos} | ${pct(s.percentualAtendimento)} |`
    );
  }
  lines.push('');
  lines.push(`Mais problemáticas: ${r.metasProteicasMaisProblematicas.join(', ')} g.`);
  lines.push('');
  lines.push('## 8. Metas calóricas problemáticas');
  lines.push('');
  lines.push('| Meta calórica | Cenários | Atendidos | Cobertura |');
  lines.push('| ------------: | -------: | --------: | --------: |');
  for (const [k, s] of Object.entries(r.porMetaCaloria).sort(
    (a, b) => Number(a[0]) - Number(b[0])
  )) {
    lines.push(
      `| ${k} | ${s.total} | ${s.atendidos} | ${pct(s.percentualAtendimento)} |`
    );
  }
  lines.push('');
  lines.push(`Mais problemáticas: ${r.metasCaloricasMaisProblematicas.join(', ')} kcal.`);
  lines.push('');
  lines.push('## 9. Alertas mais frequentes');
  lines.push('');
  for (const a of r.alertasMaisFrequentes) {
    lines.push(`- \`${a.alerta}\`: ${a.quantidade} (${pct(a.percentual)})`);
  }
  lines.push('');
  lines.push('## 10. Combinações questionáveis');
  lines.push('');
  for (const m of r.combinacoesQuestionaveisMaisFrequentes) {
    lines.push(`- ${m}`);
  }
  lines.push('');
  lines.push('## 11. Lacunas de porção');
  lines.push('');
  for (const l of relatorio.lacunasPorcao) {
    lines.push(
      `- **${l.itemBaseId}**: ${l.problema} → sugerido \`${l.porcaoIntermediariaSugerida || '—'}\` (~${l.cenariosQueResolveria} cenários)`
    );
  }
  lines.push('');
  lines.push('## 12. Limitações plant-based');
  lines.push('');
  lines.push(
    `- Estilo plant_based / restrição vegano: ver tabela por estilo/restrição.`
  );
  const temLeguminosas = relatorio.cenarios.some((c) =>
    c.itensSelecionados.some(
      (id) => id.includes('feijao') || id.includes('lentilha') || id.includes('grao_bico')
    )
  );
  const temTofuMaior = relatorio.cenarios.some((c) =>
    c.itensSelecionados.some((id) => id === 'prot_tofu_150g' || id === 'prot_tofu_200g')
  );
  if (temLeguminosas || temTofuMaior) {
    lines.push(
      `- Lote 01 presente (tofu ≥150g / leguminosas / proteína vegetal); gargalo restante: densidade proteica em almoço/jantar e metas altas.`
    );
  } else {
    lines.push(
      `- Dependência de tofu 100g (8g prot); sem feijão/lentilha/grão-de-bico; lanches veganos sem proteína prática.`
    );
  }
  lines.push('');
  lines.push('## 13. Limitações digestivas');
  lines.push('');
  lines.push(
    `- Há \`leg_legumes_cozidos\`, arroz branco e mandioca; azeite 120 kcal ainda pesa; poucas opções de jantar muito leve.`
  );
  lines.push('');
  lines.push('## 14. Análise dos itens atuais');
  lines.push('');
  lines.push(
    `- Peito de peru: selecionado ${r.analisePeru.vezesSelecionado}× (${pct(r.analisePeru.percentualCenariosComPeru)}); ultraprocessado — candidato a rebaixamento futuro.`
  );
  lines.push(
    `- Azeite: ${r.analiseAzeite.vezesSelecionado}×; excesso calórico com azeite: ${r.analiseAzeite.cenariosComExcessoCaloricoComAzeite}.`
  );
  lines.push(`- Fruta pequena: ${r.analiseFruta.vezesSelecionado}× (genérica, 60 kcal).`);
  lines.push('');
  lines.push('## 15. Sugestões priorizadas');
  lines.push('');
  for (const p of ['alta', 'media', 'baixa'] as const) {
    const list = relatorio.sugestoesExpansao.filter((s) => s.prioridade === p);
    if (!list.length) continue;
    lines.push(`### Prioridade ${p}`);
    lines.push('');
    for (const s of list) {
      lines.push(
        `- \`${s.idSugerido}\` — ${s.nome} (~${s.quantidadeCenariosResolvidos} cenários): ${s.justificativaTecnica}`
      );
    }
    lines.push('');
  }
  lines.push('## 16. Itens avaliados e rejeitados / baixo impacto');
  lines.push('');
  for (const s of relatorio.sugestoesRejeitadas) {
    lines.push(`- \`${s.idSugerido}\`: ${s.motivo}`);
  }
  lines.push('');
  lines.push('## 17. Próximos passos');
  lines.push('');
  lines.push('- Avaliar lote 02 (atum, aveia, pão sem glúten, castanhas meia, azeite colher de chá) com validação nutricional.');
  lines.push('- Não cadastrar sugestões sem validação nutricional.');
  lines.push('- Atacar densidade proteica almoço/jantar plant-based sem manipular score/tolerância.');
  lines.push('');
  lines.push('## Notas de custo');
  lines.push('');
  for (const n of relatorio.notasCusto) lines.push(`- ${n}`);
  lines.push('');
  return lines.join('\n');
}
