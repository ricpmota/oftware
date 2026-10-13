/**
 * Montagem da Opção 01 automática (ETAPA 9 + 10.5).
 * Usa metas da distribuição (ETAPA 8) quando disponíveis; fallback legado caso contrário.
 * ETAPA 10.5: template → contexto → afinidade → macros.
 */

import type {
  DistribuicaoMetasRefeicoes,
  RefeicaoNutriKey,
} from '@/lib/nutri/distribuicaoMetasRefeicoes';
import {
  VERSAO_CONTEXTO_ALIMENTAR,
  itemEhUltraprocessado,
  itemPermitidoNaRefeicaoAutomatica,
  obterAdequacaoItemParaRefeicao,
  obterContextoItem,
  type RefeicaoContextoKey,
} from '@/lib/nutri/contextoAlimentar';
import {
  afinidadePratoEhProibida,
  pontuarAfinidadePrato,
} from '@/lib/nutri/afinidadeAlimentos';
import {
  categoriaCatalogoParaTemplate,
  itemCompativelComTemplateCategoria,
  itemEhDoGrupoFruta,
  selecionarTemplatesValidos,
  type CategoriaTemplateRefeicao,
  type TemplateRefeicao,
} from '@/lib/nutri/templatesRefeicao';
import {
  grupoProteicoDeItemId,
  type GrupoProteinaPaciente,
} from '@/lib/nutri/gruposProteicos';
import type {
  AlertaDistribuicaoProteicaDia,
  DistribuicaoProteinasDia,
} from '@/lib/nutri/distribuicaoProteinasDia';
import type { PapelProteinaNoPrato } from '@/lib/nutri/papelProteina';
import { papelProteinaItem } from '@/lib/nutri/papelProteina';

export type OrigemOpcaoRefeicao = 'automatica' | 'manual' | 'taco' | 'paciente';

export type OrigemMetasMontagem = 'distribuicao_nova' | 'legado';

export interface ItemCatalogoMontagem {
  id: string;
  nome: string;
  categoria: 'proteina' | 'carboidrato' | 'legumes_salada' | 'gordura_boa' | 'extra' | 'lixo' | string;
  proteina_g: number;
  calorias_kcal: number;
  descricao?: string;
  /** Metadados opcionais (ETAPA 11). */
  atributos?: {
    vegetariano?: boolean;
    vegano?: boolean;
    semLactose?: boolean;
    semGluten?: boolean;
    ultraprocessado?: boolean;
    refeicoesPreferidas?: RefeicaoNutriKey[];
    refeicoesEvitar?: RefeicaoNutriKey[];
    prioridadeBase?: number;
    grupoCompatibilidade?: string;
  };
}

export interface OpcaoRefeicaoMontagem {
  id?: string;
  titulo?: string;
  descricao?: string;
  proteina_g?: number;
  calorias_kcal?: number;
  itensSelecionados?: string[];
  origem?: OrigemOpcaoRefeicao;
  geracaoAutomatica?: GeracaoAutomaticaMeta;
}

export interface GeracaoAutomaticaMeta {
  /** @deprecated Preferir versaoMotor */
  versao: 1 | 2;
  versaoMotor?: 2;
  versaoContextoAlimentar?: number;
  templateSelecionado?: string;
  scoreNutricional?: number;
  scoreContextual?: number;
  scoreFinal?: number;
  grupoProteicoPrincipal?: GrupoProteinaPaciente | null;
  papelProteina?: PapelProteinaNoPrato;
  geradaEm: string;
  metaCaloriasKcal: number;
  metaProteinaG: number;
  origemMetas: OrigemMetasMontagem;
  ajustesDistribuicao: string[];
  alertas?: AlertaMontagemPrato[];
  distribuicaoProteicaDia?: {
    versao: 1;
    preferenciasNormalizadas: GrupoProteinaPaciente[];
    grupoPrincipalPorRefeicao: Record<RefeicaoNutriKey, GrupoProteinaPaciente | null>;
    gruposDistintosUsados: GrupoProteinaPaciente[];
    alertas: AlertaDistribuicaoProteicaDia[];
  };
}

export interface MetasMontagemRefeicao {
  refeicao: RefeicaoNutriKey;
  caloriasAlvoKcal: number;
  proteinaAlvoG: number;
  origem: OrigemMetasMontagem;
}

export type AlertaMontagemPrato =
  | 'META_PROTEICA_NAO_ATINGIDA_PELO_CATALOGO'
  | 'META_CALORICA_NAO_ATINGIDA_PELO_CATALOGO'
  | 'META_CALORICA_EXCEDIDA_PARA_ATINGIR_PROTEINA'
  | 'CATALOGO_LIMITADO_PARA_O_PERFIL'
  | 'SEM_COMBINACAO_VALIDA'
  | 'SEM_COMBINACAO_NATURAL_VALIDA'
  | 'ITEM_SEM_CONTEXTO_ALIMENTAR';

export interface PontuacaoCombinacaoPrato {
  diferencaProteinaG: number;
  diferencaCaloriasKcal: number;
  dentroFaixaProteina: boolean;
  dentroFaixaCalorias: boolean;
  score: number;
}

export interface PontuacaoContextualPrato {
  adequacaoRefeicao: number;
  afinidadeCombinacao: number;
  prioridadeTemplate: number;
  penalidadeUltraprocessado: number;
  scoreContextual: number;
}

export interface PontuacaoFinalPrato {
  scoreNutricional: number;
  scoreContextual: number;
  scoreFinal: number;
}

export interface ResultadoMontagemPratoAutomatico {
  opcao: OpcaoRefeicaoMontagem | null;
  status: 'montada' | 'montada_com_alertas' | 'indisponivel';
  metaCaloriasKcal: number;
  metaProteinaG: number;
  caloriasObtidasKcal: number;
  proteinaObtidaG: number;
  diferencaCaloriasKcal: number;
  diferencaProteinaG: number;
  alertas: AlertaMontagemPrato[];
  templateSelecionado?: string;
  pontuacao?: PontuacaoFinalPrato;
  pontuacaoContextual?: PontuacaoContextualPrato;
  grupoProteicoPrincipal?: GrupoProteinaPaciente | null;
}

/** Calorias fixas legadas — só quando distribuição nova indisponível. */
export const CALORIAS_FIXAS_LEGADO_V1 = {
  cafe: 400,
  lanche1: 250,
  almoco: 550,
  lanche2: 200,
  jantar: 450,
} as const;

export interface PlanoLikeParaMetas {
  distribuicaoProteina: {
    cafe: string;
    almoco: string;
    jantar: string;
    lanche1: string;
    lanche2: string;
  };
  protDia_g?: number;
}

function uniquePush<T>(arr: T[], item: T): void {
  if (!arr.includes(item)) arr.push(item);
}

export function converterDistribuicaoProteinaLegada(distribuicao: string): number {
  const match = distribuicao.match(/(\d+)-(\d+)/);
  if (match) {
    return Math.round((parseInt(match[1], 10) + parseInt(match[2], 10)) / 2);
  }
  const numMatch = distribuicao.match(/(\d+)/);
  return numMatch ? parseInt(numMatch[1], 10) : 20;
}

/**
 * Na dúvida, não regenerar.
 * Regenera só se vazia, sem itens, sem origem manual/taco, sem geracao marcada como editada.
 */
export function opcaoPodeSerRegeneradaAutomaticamente(
  opcao: OpcaoRefeicaoMontagem | undefined | null
): boolean {
  if (!opcao) return true;

  if (opcao.origem === 'manual' || opcao.origem === 'taco' || opcao.origem === 'paciente') {
    return false;
  }

  const itens = opcao.itensSelecionados || [];
  if (
    itens.some(
      (id) =>
        id.startsWith('taco_') ||
        id.startsWith('imp_') ||
        id.startsWith('metanutri_') ||
        id.startsWith('manual_') ||
        id.includes('custom')
    )
  ) {
    return false;
  }

  // Já tem itens: só regenera se origem explícita automática
  if (itens.length > 0) {
    return opcao.origem === 'automatica';
  }

  const temDescricao = Boolean(opcao.descricao?.trim());
  const temMacros = (opcao.proteina_g || 0) > 0 || (opcao.calorias_kcal || 0) > 0;
  if (!temDescricao && !temMacros) return true;

  // Descrição/macros sem itens (legado texto): regenerar só se automática
  return opcao.origem === 'automatica';
}

export function obterMetasMontagemRefeicao(
  refeicao: RefeicaoNutriKey,
  distribuicaoNova: DistribuicaoMetasRefeicoes | null | undefined,
  plano: PlanoLikeParaMetas
): MetasMontagemRefeicao {
  if (
    distribuicaoNova &&
    distribuicaoNova.status === 'calculada' &&
    distribuicaoNova.refeicoes?.[refeicao]
  ) {
    const m = distribuicaoNova.refeicoes[refeicao];
    if (
      Number.isFinite(m.caloriasAlvoKcal) &&
      m.caloriasAlvoKcal > 0 &&
      Number.isFinite(m.proteinaAlvoG) &&
      m.proteinaAlvoG >= 0
    ) {
      return {
        refeicao,
        caloriasAlvoKcal: m.caloriasAlvoKcal,
        proteinaAlvoG: m.proteinaAlvoG,
        origem: 'distribuicao_nova',
      };
    }
  }

  return {
    refeicao,
    caloriasAlvoKcal: CALORIAS_FIXAS_LEGADO_V1[refeicao],
    proteinaAlvoG: converterDistribuicaoProteinaLegada(
      plano.distribuicaoProteina[refeicao]
    ),
    origem: 'legado',
  };
}

export function pontuarCombinacaoPrato(
  proteinaTotalG: number,
  caloriasTotalKcal: number,
  metaProteinaG: number,
  metaCaloriasKcal: number
): PontuacaoCombinacaoPrato {
  const diferencaProteinaG = Math.abs(proteinaTotalG - metaProteinaG);
  const diferencaCaloriasKcal = Math.abs(caloriasTotalKcal - metaCaloriasKcal);
  const dentroFaixaProteina =
    proteinaTotalG >= metaProteinaG * 0.9 && proteinaTotalG <= metaProteinaG * 1.1;
  const dentroFaixaCalorias =
    caloriasTotalKcal >= metaCaloriasKcal * 0.9 &&
    caloriasTotalKcal <= metaCaloriasKcal * 1.1;

  const diferencaProteinaPercentual =
    metaProteinaG > 0 ? diferencaProteinaG / metaProteinaG : 0;
  const diferencaCaloricaPercentual =
    metaCaloriasKcal > 0 ? diferencaCaloriasKcal / metaCaloriasKcal : 0;

  // Menor = melhor (escala nutricional legada)
  const score = diferencaProteinaPercentual * 2 + diferencaCaloricaPercentual;

  return {
    diferencaProteinaG,
    diferencaCaloriasKcal,
    dentroFaixaProteina,
    dentroFaixaCalorias,
    score,
  };
}

/** Score contextual 0–1 (maior = melhor). */
export function pontuarContextoPrato(
  itens: ItemCatalogoMontagem[],
  refeicao: RefeicaoContextoKey,
  template: TemplateRefeicao
): PontuacaoContextualPrato {
  const ids = itens.map((i) => i.id);
  const adeqs = ids.map((id) => obterAdequacaoItemParaRefeicao(id, refeicao));
  const adequacaoRefeicao =
    adeqs.length === 0 ? 0 : adeqs.reduce((a, b) => a + b, 0) / (adeqs.length * 5);
  const afinidadeCombinacao = pontuarAfinidadePrato(ids, refeicao);
  const prioridadeTemplate = Math.min(1, template.prioridadeBase / 110);
  const ultraprocessados = ids.filter((id) => itemEhUltraprocessado(id)).length;
  const penalidadeUltraprocessado = ultraprocessados > 0 ? 0.35 * ultraprocessados : 0;
  const scoreContextual = Math.max(
    0,
    Math.min(
      1,
      adequacaoRefeicao * 0.4 +
        afinidadeCombinacao * 0.4 +
        prioridadeTemplate * 0.2 -
        penalidadeUltraprocessado
    )
  );
  return {
    adequacaoRefeicao,
    afinidadeCombinacao,
    prioridadeTemplate,
    penalidadeUltraprocessado,
    scoreContextual,
  };
}

/**
 * Combina scores: menor scoreFinal = melhor.
 * scoreNutricional (menor melhor) normalizado; scoreContextual invertido.
 */
export function combinarScoresPrato(
  scoreNutricional: number,
  scoreContextual: number,
  estilo?: string
): PontuacaoFinalPrato {
  const nutNorm = Math.min(1, scoreNutricional); // tipicamente 0–~3; clamp
  const pesoNut = estilo === 'rico_proteina' ? 0.5 : 0.45;
  const pesoCtx = 1 - pesoNut;
  const scoreFinal = nutNorm * pesoNut + (1 - scoreContextual) * pesoCtx;
  return { scoreNutricional, scoreContextual, scoreFinal };
}

export function complementoProteicoCompativel(
  principalId: string,
  complementoId: string,
  refeicao: RefeicaoNutriKey
): boolean {
  if (principalId === complementoId) return false;
  if (afinidadePratoEhProibida([principalId, complementoId], refeicao)) return false;
  const p = principalId.toLowerCase();
  const c = complementoId.toLowerCase();
  const isLanche = refeicao === 'lanche1' || refeicao === 'lanche2';
  const isPo =
    (id: string) => id.includes('whey') || id.includes('proteina_vegetal');
  const isLeguminosa =
    (id: string) =>
      id.includes('feijao') || id.includes('lentilha') || id.includes('grao_bico');

  if (isPo(p) && isPo(c)) return false;
  if (c.includes('proteina_vegetal') && (p.includes('peixe') || p.includes('carne') || p.includes('whey'))) {
    return false;
  }
  if (p.includes('proteina_vegetal') && (c.includes('peixe') || c.includes('carne') || c.includes('whey'))) {
    return false;
  }
  if ((refeicao === 'almoco' || refeicao === 'jantar') && p.includes('tofu') && c.includes('whey')) {
    return false;
  }
  if (isLeguminosa(p) && c.includes('whey')) return false;
  if (isLeguminosa(c) && p.includes('whey')) return false;

  if ((p.includes('peixe') || p.includes('carne')) && c.includes('whey')) return false;
  if (p.includes('peixe') && c.includes('iogurte')) return false;
  if (p.includes('carne') && c.includes('iogurte')) return false;
  if (p.includes('tofu') && (c.includes('iogurte') || c.includes('ovos'))) {
    if (!isLeguminosa(c)) return false;
  }

  if (p.includes('tofu') && isLeguminosa(c)) return true;
  if (isLeguminosa(p) && c.includes('tofu')) return true;
  if (p.includes('ovos') && (c.includes('claras') || c.includes('cottage'))) return true;
  if (p.includes('ovos_1') && c.includes('claras')) return true;
  if (p.includes('iogurte') && c.includes('whey') && (refeicao === 'cafe' || isLanche)) {
    return true;
  }
  if (p.includes('cottage') && (c.includes('ovos') || c.includes('claras'))) return true;
  if (p.includes('frango') && c.includes('claras')) return true;
  if (
    (refeicao === 'cafe' || isLanche) &&
    (c.includes('whey') ||
      c.includes('iogurte') ||
      c.includes('claras') ||
      c.includes('cottage') ||
      c.includes('proteina_vegetal'))
  ) {
    return true;
  }
  if ((refeicao === 'almoco' || refeicao === 'jantar') && (c.includes('claras') || c.includes('cottage') || isLeguminosa(c))) {
    return true;
  }
  if ((refeicao === 'almoco' || refeicao === 'jantar') && c.includes('whey')) {
    return !p.includes('peixe') && !p.includes('carne') && !p.includes('tofu') && !isLeguminosa(p);
  }
  return false;
}

function prioridadeOrdenacaoItem(item: ItemCatalogoMontagem): number {
  if (item.atributos?.ultraprocessado || itemEhUltraprocessado(item.id)) {
    return 1000 + (item.atributos?.prioridadeBase || 0);
  }
  return item.atributos?.prioridadeBase ?? 50;
}

function preferenciaBateItem(item: ItemCatalogoMontagem, preferencias: string[]): boolean {
  if (!preferencias.length) return false;
  const blob = `${item.id} ${item.nome} ${(item.atributos?.grupoCompatibilidade || '')}`.toLowerCase();
  return preferencias.some((pref) => {
    const pl = pref.toLowerCase();
    if (pl.includes('frango') && blob.includes('frango')) return true;
    if (pl.includes('peixe') && blob.includes('peixe')) return true;
    if (pl.includes('ovos') && (blob.includes('ovos') || blob.includes('claras'))) return true;
    if (pl.includes('carne') && blob.includes('carne')) return true;
    if (pl.includes('latic') && (blob.includes('iogurte') || blob.includes('cottage'))) return true;
    if (pl.includes('legumin') && (blob.includes('feijao') || blob.includes('lentilha') || blob.includes('grao'))) return true;
    return false;
  });
}

export interface ContextoProteicoRefeicao {
  grupoPrincipalDesejado: GrupoProteinaPaciente | null;
  gruposAlternativos: GrupoProteinaPaciente[];
  contagemGruposNoDia: Partial<Record<GrupoProteinaPaciente, number>>;
  grupoUsadoNaRefeicaoAnterior: GrupoProteinaPaciente | null;
  /** Quando true, não sai do universo preferencial salvo último recurso. */
  restringirAoUniversoPreferencial?: boolean;
}

export interface ContextoMontagemPratoV2 {
  refeicao: RefeicaoNutriKey;
  metaProteinaG: number;
  metaCaloriasKcal: number;
  origemMetas: OrigemMetasMontagem;
  estilo: string;
  sintomasGI: 'nenhum' | 'leve' | 'moderado' | 'grave' | string;
  restricoes: string[];
  preferenciasProteina: string[];
  itensDisponiveis: ItemCatalogoMontagem[];
  ajustesDistribuicao?: string[];
  slotId?: string;
  cafeReduzido?: boolean;
  contextoProteico?: ContextoProteicoRefeicao;
  /** Snapshot diário anexado na geração (opcional). */
  distribuicaoProteicaDia?: DistribuicaoProteinasDia;
}

function totais(itens: ItemCatalogoMontagem[]): { p: number; k: number } {
  return {
    p: itens.reduce((a, i) => a + i.proteina_g, 0),
    k: itens.reduce((a, i) => a + i.calorias_kcal, 0),
  };
}

function mapearItensPorCategoriaTemplate(
  itens: ItemCatalogoMontagem[],
  template: TemplateRefeicao,
  refeicao: RefeicaoContextoKey
): Record<CategoriaTemplateRefeicao, ItemCatalogoMontagem[]> {
  const out: Record<CategoriaTemplateRefeicao, ItemCatalogoMontagem[]> = {
    proteina: [],
    carboidrato: [],
    fruta: [],
    vegetal: [],
    gordura: [],
    extra: [],
  };
  for (const item of itens) {
    if (!obterContextoItem(item.id)) continue;
    if (!itemPermitidoNaRefeicaoAutomatica(item.id, refeicao)) continue;
    const catTpl = categoriaCatalogoParaTemplate(item.categoria);
    if (!catTpl) continue;
    if (catTpl === 'fruta' || item.categoria === 'extra') {
      if (itemEhDoGrupoFruta(item.id) && itemCompativelComTemplateCategoria(item.id, 'fruta', template, refeicao)) {
        out.fruta.push(item);
      } else if (itemCompativelComTemplateCategoria(item.id, 'extra', template, refeicao)) {
        out.extra.push(item);
      }
      continue;
    }
    if (itemCompativelComTemplateCategoria(item.id, catTpl, template, refeicao)) {
      out[catTpl].push(item);
    }
  }
  return out;
}

function ordenarPorMetaEPreferencia(
  itens: ItemCatalogoMontagem[],
  metaP: number,
  preferencias: string[]
): ItemCatalogoMontagem[] {
  return [...itens].sort((a, b) => {
    const prefA = preferenciaBateItem(a, preferencias) ? 0 : 1;
    const prefB = preferenciaBateItem(b, preferencias) ? 0 : 1;
    if (prefA !== prefB) return prefA - prefB;
    const prio = prioridadeOrdenacaoItem(a) - prioridadeOrdenacaoItem(b);
    if (prio !== 0) return prio;
    return Math.abs(a.proteina_g - metaP) - Math.abs(b.proteina_g - metaP);
  });
}

function gerarCandidatosTemplate(
  porCat: Record<CategoriaTemplateRefeicao, ItemCatalogoMontagem[]>,
  template: TemplateRefeicao,
  metaP: number,
  preferencias: string[]
): ItemCatalogoMontagem[][] {
  const obrigatorias = template.categoriasObrigatorias;
  for (const cat of obrigatorias) {
    if (porCat[cat].length === 0) return [];
  }

  const lim = (arr: ItemCatalogoMontagem[], n: number) =>
    ordenarPorMetaEPreferencia(arr, metaP, preferencias).slice(0, n);

  const optionalSlot = (
    cat: CategoriaTemplateRefeicao,
    n: number
  ): (ItemCatalogoMontagem | undefined)[] => {
    if (template.categoriasObrigatorias.includes(cat)) return lim(porCat[cat], Math.min(n, 3));
    if (template.categoriasOpcionais.includes(cat)) {
      return [undefined, ...lim(porCat[cat], Math.min(n, 2))];
    }
    return [undefined];
  };

  const prots = lim(porCat.proteina, 4);
  const carbs = optionalSlot('carboidrato', 3);
  const vegetais = optionalSlot('vegetal', 2);
  const frutas = optionalSlot('fruta', 1);
  const gorduras = optionalSlot('gordura', 1);

  const plates: ItemCatalogoMontagem[][] = [];
  for (const prot of prots) {
    for (const carb of carbs) {
      for (const veg of vegetais) {
        for (const fruta of frutas) {
          for (const gord of gorduras) {
            const plate: ItemCatalogoMontagem[] = [prot];
            if (carb) plate.push(carb);
            if (veg) plate.push(veg);
            if (fruta) plate.push(fruta);
            if (gord) plate.push(gord);

            const comps = porCat.proteina.filter(
              (c) =>
                c.id !== prot.id &&
                complementoProteicoCompativel(prot.id, c.id, template.refeicoes[0]) &&
                (c.id.includes('claras') || c.id.includes('cottage'))
            );
            plates.push(plate);
            if (comps[0] && plate.length <= 3) {
              plates.push([...plate, comps[0]]);
            }
          }
        }
      }
    }
  }
  return plates;
}

/**
 * Motor V2 + contexto: escolhe template natural, depois combinação com melhor score final.
 */
export function montarPratoPadraoRefeicaoV2(
  ctx: ContextoMontagemPratoV2
): ResultadoMontagemPratoAutomatico {
  const alertas: AlertaMontagemPrato[] = [];
  const metaP = Math.max(1, ctx.metaProteinaG);
  const metaK = Math.max(50, ctx.metaCaloriasKcal);
  const refeicao = ctx.refeicao as RefeicaoContextoKey;

  const itensBrutos = ctx.itensDisponiveis.filter((i) => i.categoria !== 'lixo');
  const semContexto = itensBrutos.filter((i) => !obterContextoItem(i.id));
  if (semContexto.length > 0) {
    uniquePush(alertas, 'ITEM_SEM_CONTEXTO_ALIMENTAR');
  }
  const giSevero =
    ctx.estilo === 'digestiva' ||
    ctx.sintomasGI === 'grave' ||
    ctx.sintomasGI === 'moderado';
  let itens = itensBrutos.filter((i) => obterContextoItem(i.id));
  // Digestiva: evita salada grande crua na geração automática
  if (giSevero) {
    itens = itens.filter((i) => !i.id.includes('salada_grande'));
  }

  const ctxProt = ctx.contextoProteico;
  const gruposTentativa: (GrupoProteinaPaciente | null)[] = [];
  if (ctxProt?.grupoPrincipalDesejado) {
    gruposTentativa.push(ctxProt.grupoPrincipalDesejado);
  }
  for (const g of ctxProt?.gruposAlternativos || []) {
    if (!gruposTentativa.includes(g)) gruposTentativa.push(g);
  }
  gruposTentativa.push(null); // fallback livre (último recurso)

  if (itens.filter((i) => i.categoria === 'proteina').length === 0) {
    uniquePush(alertas, 'SEM_COMBINACAO_NATURAL_VALIDA');
    uniquePush(alertas, 'CATALOGO_LIMITADO_PARA_O_PERFIL');
    return {
      opcao: null,
      status: 'indisponivel',
      metaCaloriasKcal: metaK,
      metaProteinaG: metaP,
      caloriasObtidasKcal: 0,
      proteinaObtidaG: 0,
      diferencaCaloriasKcal: metaK,
      diferencaProteinaG: metaP,
      alertas,
    };
  }

  const templates = selecionarTemplatesValidos({
    refeicao,
    estilo: ctx.estilo,
    cafeReduzido: ctx.cafeReduzido,
    sintomasGI: ctx.sintomasGI,
  });

  let melhor: ItemCatalogoMontagem[] | null = null;
  let melhorFinal = Number.POSITIVE_INFINITY;
  let melhorTemplate: TemplateRefeicao | null = null;
  let melhorPontNut: PontuacaoCombinacaoPrato | null = null;
  let melhorPontCtx: PontuacaoContextualPrato | null = null;
  let melhorPontFinal: PontuacaoFinalPrato | null = null;
  let melhorGrupo: GrupoProteinaPaciente | null = null;
  let candidatesAvaliados = 0;

  for (const grupoAlvo of gruposTentativa) {
    const itensGrupo =
      grupoAlvo == null
        ? itens
        : itens.map((i) => {
            if (i.categoria !== 'proteina') return i;
            return i;
          }).filter((i) => {
            if (i.categoria !== 'proteina') return true;
            return grupoProteicoDeItemId(i.id) === grupoAlvo;
          });

    if (
      grupoAlvo != null &&
      itensGrupo.filter((i) => i.categoria === 'proteina').length === 0
    ) {
      continue;
    }

    for (const template of templates) {
      const porCat = mapearItensPorCategoriaTemplate(itensGrupo, template, refeicao);
      const plates = gerarCandidatosTemplate(
        porCat,
        template,
        metaP,
        ctx.preferenciasProteina
      );
      for (const plate of plates) {
        const ids = plate.map((i) => i.id);
        const protPrincipal = plate.find((i) => i.categoria === 'proteina');
        const grupoPlate = protPrincipal
          ? grupoProteicoDeItemId(protPrincipal.id)
          : null;

        if (grupoAlvo != null && grupoPlate !== grupoAlvo) continue;
        if (ids.some((id) => !itemPermitidoNaRefeicaoAutomatica(id, refeicao))) continue;
        if (afinidadePratoEhProibida(ids, refeicao)) continue;
        if (
          (refeicao === 'cafe' || refeicao === 'lanche1' || refeicao === 'lanche2') &&
          ids.some((id) => id.includes('arroz'))
        ) {
          continue;
        }
        if (
          (refeicao === 'cafe' || refeicao === 'lanche1' || refeicao === 'lanche2') &&
          ids.some((id) => id.includes('feijao'))
        ) {
          continue;
        }

        candidatesAvaliados += 1;
        const t = totais(plate);
        const pontNut = pontuarCombinacaoPrato(t.p, t.k, metaP, metaK);
        const pontCtx = pontuarContextoPrato(plate, refeicao, template);
        const pontFinal = combinarScoresPrato(
          pontNut.score,
          pontCtx.scoreContextual,
          ctx.estilo
        );

        let score = pontFinal.scoreFinal;

        // Preferência forte via grupo do dia
        if (grupoAlvo != null && grupoPlate === grupoAlvo) {
          score -= 0.25;
        } else if (
          ctxProt?.grupoPrincipalDesejado &&
          grupoPlate === ctxProt.grupoPrincipalDesejado
        ) {
          score -= 0.25;
        } else if (plate.some((i) => preferenciaBateItem(i, ctx.preferenciasProteina))) {
          score -= 0.08;
        } else if (ctxProt?.restringirAoUniversoPreferencial && grupoAlvo == null) {
          score += 0.35; // fora do universo preferencial
        }

        // Penalidade repetição / consecutivo
        if (grupoPlate && ctxProt) {
          const usado = ctxProt.contagemGruposNoDia[grupoPlate] || 0;
          if (usado >= 2) score += 0.2;
          if (ctxProt.grupoUsadoNaRefeicaoAnterior === grupoPlate) score += 0.25;
        }

        // Grupo ainda não usado: bônus
        if (grupoPlate && ctxProt && (ctxProt.contagemGruposNoDia[grupoPlate] || 0) === 0) {
          score -= 0.08;
        }

        if (score < melhorFinal) {
          melhorFinal = score;
          melhor = plate;
          melhorTemplate = template;
          melhorPontNut = pontNut;
          melhorPontCtx = pontCtx;
          melhorPontFinal = pontFinal;
          melhorGrupo = grupoPlate;
        }
      }
    }

    // Se já achou com o grupo desejado/alternativo, não precisa ir ao fallback livre
    if (melhor && grupoAlvo != null) break;
  }

  if (!melhor || !melhorTemplate || candidatesAvaliados === 0) {
    uniquePush(alertas, 'SEM_COMBINACAO_NATURAL_VALIDA');
    uniquePush(alertas, 'CATALOGO_LIMITADO_PARA_O_PERFIL');
    return {
      opcao: null,
      status: 'indisponivel',
      metaCaloriasKcal: metaK,
      metaProteinaG: metaP,
      caloriasObtidasKcal: 0,
      proteinaObtidaG: 0,
      diferencaCaloriasKcal: metaK,
      diferencaProteinaG: metaP,
      alertas,
    };
  }

  const obt = totais(melhor);
  const pont = melhorPontNut!;

  if (!pont.dentroFaixaProteina) {
    uniquePush(alertas, 'META_PROTEICA_NAO_ATINGIDA_PELO_CATALOGO');
  }
  if (obt.k < metaK * 0.9) {
    uniquePush(alertas, 'META_CALORICA_NAO_ATINGIDA_PELO_CATALOGO');
  }
  if (obt.k > metaK * 1.1 && obt.p >= metaP * 0.9) {
    uniquePush(alertas, 'META_CALORICA_EXCEDIDA_PARA_ATINGIR_PROTEINA');
  }
  if (!pont.dentroFaixaProteina || !pont.dentroFaixaCalorias) {
    uniquePush(alertas, 'CATALOGO_LIMITADO_PARA_O_PERFIL');
  }

  const status: ResultadoMontagemPratoAutomatico['status'] =
    alertas.length > 0 ? 'montada_com_alertas' : 'montada';

  const protId = melhor.find((i) => i.categoria === 'proteina')?.id;
  const distMeta = ctx.distribuicaoProteicaDia
    ? {
        versao: 1 as const,
        preferenciasNormalizadas: ctx.distribuicaoProteicaDia.preferenciasNormalizadas,
        grupoPrincipalPorRefeicao: ctx.distribuicaoProteicaDia.grupoPrincipalPorRefeicao,
        gruposDistintosUsados: ctx.distribuicaoProteicaDia.gruposSelecionados,
        alertas: ctx.distribuicaoProteicaDia.alertas,
      }
    : undefined;

  const opcao: OpcaoRefeicaoMontagem = {
    id: ctx.slotId || `slot_${ctx.refeicao}_1`,
    titulo: 'Opção 01',
    descricao: melhor.map((i) => i.nome).join(' + '),
    proteina_g: Math.round(obt.p),
    calorias_kcal: Math.round(obt.k),
    itensSelecionados: melhor.map((i) => i.id),
    origem: 'automatica',
    geracaoAutomatica: {
      versao: 2,
      versaoMotor: 2,
      versaoContextoAlimentar: VERSAO_CONTEXTO_ALIMENTAR,
      templateSelecionado: melhorTemplate.id,
      scoreNutricional: melhorPontFinal?.scoreNutricional,
      scoreContextual: melhorPontFinal?.scoreContextual,
      scoreFinal: melhorPontFinal?.scoreFinal,
      grupoProteicoPrincipal: melhorGrupo,
      papelProteina: protId ? papelProteinaItem(protId) : undefined,
      geradaEm: new Date().toISOString(),
      metaCaloriasKcal: metaK,
      metaProteinaG: metaP,
      origemMetas: ctx.origemMetas,
      ajustesDistribuicao: ctx.ajustesDistribuicao || [],
      alertas: [...alertas],
      distribuicaoProteicaDia: distMeta,
    },
  };

  return {
    opcao,
    status,
    metaCaloriasKcal: metaK,
    metaProteinaG: metaP,
    caloriasObtidasKcal: Math.round(obt.k),
    proteinaObtidaG: Math.round(obt.p),
    diferencaCaloriasKcal: Math.round(obt.k - metaK),
    diferencaProteinaG: Math.round(obt.p - metaP),
    alertas,
    templateSelecionado: melhorTemplate.id,
    pontuacao: melhorPontFinal || undefined,
    pontuacaoContextual: melhorPontCtx || undefined,
    grupoProteicoPrincipal: melhorGrupo,
  };
}

/** Status textual para painel admin. */
export function statusFaixaMontagem(
  obtido: number,
  meta: number,
  tolerancia = 0.1
): 'Dentro' | 'Atenção' {
  if (meta <= 0) return 'Atenção';
  const diff = Math.abs(obtido - meta) / meta;
  return diff <= tolerancia ? 'Dentro' : 'Atenção';
}

/** Rotulo amigável do template para painel técnico. */
export function rotuloTemplateMontagem(templateId: string | undefined): string {
  if (!templateId) return '—';
  return templateId
    .replace(/^cafe_/, 'Café — ')
    .replace(/^lanche_/, 'Lanche — ')
    .replace(/^almoco_/, 'Almoço — ')
    .replace(/^jantar_/, 'Jantar — ')
    .replace(/_/g, ' ');
}
