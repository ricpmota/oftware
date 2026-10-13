/**
 * Planos-cardápio reutilizáveis do nutricionista (MetaNutri).
 * Independentes do plano do paciente — templates nomeados (ex.: Endometriose).
 */

export type RefeicaoPlanoKey = 'cafe' | 'lanche1' | 'almoco' | 'lanche2' | 'jantar';

export type CategoriaItemPlano =
  | 'proteina'
  | 'carboidrato'
  | 'legumes_salada'
  | 'gordura_boa'
  | 'extra'
  | 'lixo';

export type OrigemAlimentoPlano = 'metanutri' | 'taco' | 'manual' | 'legacy';

export interface ItemPlanoRefeicao {
  id: string;
  /** Nome base do alimento (sem sufixo "(100g)" quando a porção é editável). */
  nome: string;
  categoria: CategoriaItemPlano;
  /** Proteína já escalada para peso × quantidade atuais. */
  proteina_g: number;
  /** Calorias já escaladas para peso × quantidade atuais. */
  calorias_kcal: number;
  descricao?: string;
  /** Peso da porção em gramas (editável). */
  peso_g?: number;
  /** Quantidade / multiplicador da porção (ex.: 2). Default 1. */
  quantidade?: number;
  /** Rótulo livre da unidade (ex.: Unidade, fatia, colher). */
  unidade?: string;
  /** Macros de referência para o pesoBase_g. */
  proteinaBase_g?: number;
  caloriasBase_kcal?: number;
  /** Peso de referência dos macros base (ex.: 100). */
  pesoBase_g?: number;
  /**
   * ETAPA 07 — macros opcionais da porção.
   * undefined = desconhecido (não inventar 0).
   * 0 = fonte informou zero.
   */
  carboidrato_g?: number;
  gordura_g?: number;
  fibra_g?: number;
  carboidratoBase_g?: number;
  gorduraBase_g?: number;
  fibraBase_g?: number;
  /**
   * Rastreabilidade opcional (ETAPA 05). Planos antigos sem estes campos
   * continuam válidos. NÃO é referência viva ao alimento global.
   */
  origemAlimento?: OrigemAlimentoPlano;
  alimentoGlobalId?: string;
}

export interface RefeicaoPlanoTemplate {
  itens: ItemPlanoRefeicao[];
  itensSelecionados: string[];
  proteina_g: number;
  calorias_kcal: number;
  /** Totais opcionais (ETAPA 07) — soma só valores conhecidos. */
  carboidrato_g?: number;
  gordura_g?: number;
  fibra_g?: number;
  titulo?: string;
  descricao?: string;
  /** Observação do nutricionista sobre a refeição — visível também para o paciente. */
  observacao?: string;
}

export interface TotaisNutricionaisPlano {
  calorias_kcal: number;
  proteina_g: number;
  carboidrato_g: number;
  gordura_g: number;
  fibra_g: number;
}

export type CoberturaNutriente = { conhecidos: number; total: number };

export interface CoberturaNutricionalPlano {
  proteina: CoberturaNutriente;
  calorias: CoberturaNutriente;
  carboidrato: CoberturaNutriente;
  gordura: CoberturaNutriente;
  fibra: CoberturaNutriente;
}

export interface NutriPlanoCardapioTemplate {
  id: string;
  nutricionistaId: string;
  nome: string;
  criadoEm: Date;
  atualizadoEm: Date;
  refeicoes: Record<RefeicaoPlanoKey, RefeicaoPlanoTemplate>;
}

export const REFEICOES_PLANO_ORDEM: RefeicaoPlanoKey[] = [
  'cafe',
  'lanche1',
  'almoco',
  'lanche2',
  'jantar',
];

export const ROTULO_REFEICAO_PLANO: Record<RefeicaoPlanoKey, string> = {
  cafe: 'Café da Manhã',
  lanche1: 'Lanche da Manhã',
  almoco: 'Almoço',
  lanche2: 'Lanche da Tarde',
  jantar: 'Jantar',
};

export function extrairPesoDoNome(nome: string): number | null {
  // Aceita "(100g)", "(100 g)", "(150G)" etc.
  const matches = String(nome || '').matchAll(/\((\d+(?:[.,]\d+)?)\s*g\)/gi);
  let last: number | null = null;
  for (const m of matches) {
    const n = Number(String(m[1]).replace(',', '.'));
    if (Number.isFinite(n) && n > 0) last = n;
  }
  return last;
}

export function nomeBaseAlimento(nome: string): string {
  let s = String(nome || '').trim();
  // Remove qualquer "(100g)" / "(130 g)" do nome — o valor vai para o campo Peso
  s = s.replace(/\s*\((\d+(?:[.,]\d+)?)\s*g\)/gi, '').trim();
  // Remove cauda de porção acumulada: " - 200g - 2 - Unidade - 200g - ..."
  const cortePorcao = s.search(/\s+-\s+\d+(?:[.,]\d+)?\s*g\b/i);
  if (cortePorcao > 0) {
    s = s.slice(0, cortePorcao).trim();
  }
  // Limpa espaços duplos / sobras de pontuação
  s = s.replace(/\s{2,}/g, ' ').replace(/\s+([,.;])/g, '$1').trim();
  return s;
}

/** Ex.: "Peito de frango grelhado - 100g - 2 - Unidade" */
export function formatarNomeItemPorcao(item: {
  nome: string;
  peso_g?: number;
  quantidade?: number;
  unidade?: string;
}): string {
  const base = nomeBaseAlimento(item.nome);
  const partes: string[] = [base];
  if (typeof item.peso_g === 'number' && item.peso_g > 0) {
    const peso =
      Math.abs(item.peso_g - Math.round(item.peso_g)) < 0.05
        ? String(Math.round(item.peso_g))
        : String(Math.round(item.peso_g * 10) / 10);
    partes.push(`${peso}g`);
  }
  if (typeof item.quantidade === 'number' && item.quantidade > 0) {
    const mostrarQtd = item.quantidade !== 1 || Boolean(item.unidade?.trim());
    if (mostrarQtd) {
      const q =
        Math.abs(item.quantidade - Math.round(item.quantidade)) < 0.001
          ? String(Math.round(item.quantidade))
          : String(Math.round(item.quantidade * 100) / 100);
      partes.push(q);
    }
  }
  const unidade = item.unidade?.trim();
  if (unidade) partes.push(unidade);
  return partes.join(' - ');
}

/**
 * Escala nutriente opcional: undefined permanece undefined; 0 escala para 0.
 * valorPorcao = valorBase × (peso_g / pesoBase_g) × quantidade
 */
export function escalarNutrienteOpcional(
  valorBase: number | undefined,
  fator: number,
  casas = 1
): number | undefined {
  if (valorBase === undefined) return undefined;
  if (!Number.isFinite(valorBase) || !Number.isFinite(fator)) return undefined;
  const f = 10 ** casas;
  return Math.round(valorBase * fator * f) / f;
}

/**
 * Recalcula macros a partir da base:
 * fator = (peso_g / pesoBase_g) * quantidade
 */
export function aplicarPorcaoItem(item: ItemPlanoRefeicao): ItemPlanoRefeicao {
  const pesoBase = Math.max(0.01, item.pesoBase_g || item.peso_g || 100);
  const peso = Math.max(0.01, item.peso_g ?? pesoBase);
  const quantidade = Math.max(0.01, item.quantidade ?? 1);
  const fator = (peso / pesoBase) * quantidade;
  const proteinaBase = item.proteinaBase_g ?? item.proteina_g;
  const caloriasBase = item.caloriasBase_kcal ?? item.calorias_kcal;
  const carboidratoBase_g = item.carboidratoBase_g;
  const gorduraBase_g = item.gorduraBase_g;
  const fibraBase_g = item.fibraBase_g;

  return {
    ...item,
    nome: nomeBaseAlimento(item.nome),
    pesoBase_g: Math.round(pesoBase * 10) / 10,
    peso_g: Math.round(peso * 10) / 10,
    quantidade: Math.round(quantidade * 100) / 100,
    unidade: item.unidade || '',
    proteinaBase_g: Math.round(proteinaBase * 1000) / 1000,
    caloriasBase_kcal: Math.round(caloriasBase * 10) / 10,
    proteina_g: Math.round(proteinaBase * fator * 10) / 10,
    calorias_kcal: Math.round(caloriasBase * fator),
    carboidratoBase_g:
      carboidratoBase_g !== undefined
        ? Math.round(carboidratoBase_g * 1000) / 1000
        : undefined,
    gorduraBase_g:
      gorduraBase_g !== undefined ? Math.round(gorduraBase_g * 1000) / 1000 : undefined,
    fibraBase_g:
      fibraBase_g !== undefined ? Math.round(fibraBase_g * 1000) / 1000 : undefined,
    carboidrato_g: escalarNutrienteOpcional(carboidratoBase_g, fator, 1),
    gordura_g: escalarNutrienteOpcional(gorduraBase_g, fator, 1),
    fibra_g: escalarNutrienteOpcional(fibraBase_g, fator, 1),
  };
}

/** Garante campos de porção a partir do item do catálogo / TACO / legado. */
export function normalizarItemComPorcao(item: ItemPlanoRefeicao): ItemPlanoRefeicao {
  const pesoNome = extrairPesoDoNome(item.nome);
  const pesoBase =
    typeof item.pesoBase_g === 'number' && item.pesoBase_g > 0
      ? item.pesoBase_g
      : pesoNome || (typeof item.peso_g === 'number' && item.peso_g > 0 ? item.peso_g : 100);
  const peso =
    typeof item.peso_g === 'number' && item.peso_g > 0 ? item.peso_g : pesoNome || pesoBase;
  const quantidade =
    typeof item.quantidade === 'number' && item.quantidade > 0 ? item.quantidade : 1;

  const temBaseProtKcal =
    typeof item.proteinaBase_g === 'number' && typeof item.caloriasBase_kcal === 'number';

  let proteinaBase = item.proteinaBase_g;
  let caloriasBase = item.caloriasBase_kcal;
  if (!temBaseProtKcal) {
    const fatorAtual = (peso / pesoBase) * quantidade;
    proteinaBase = fatorAtual > 0 ? item.proteina_g / fatorAtual : item.proteina_g;
    caloriasBase = fatorAtual > 0 ? item.calorias_kcal / fatorAtual : item.calorias_kcal;
  }

  const fatorAtual = (peso / pesoBase) * quantidade;
  const deriveBase = (base: number | undefined, scaled: number | undefined) => {
    if (base !== undefined) return base;
    if (scaled === undefined) return undefined;
    return fatorAtual > 0 ? scaled / fatorAtual : scaled;
  };

  return aplicarPorcaoItem({
    ...item,
    nome: nomeBaseAlimento(item.nome),
    pesoBase_g: pesoBase,
    peso_g: peso,
    quantidade,
    unidade: item.unidade || '',
    proteinaBase_g: proteinaBase,
    caloriasBase_kcal: caloriasBase,
    carboidratoBase_g: deriveBase(item.carboidratoBase_g, item.carboidrato_g),
    gorduraBase_g: deriveBase(item.gorduraBase_g, item.gordura_g),
    fibraBase_g: deriveBase(item.fibraBase_g, item.fibra_g),
  });
}

export function criarItemComPorcao(input: {
  id: string;
  nome: string;
  categoria: CategoriaItemPlano;
  /** Macros para o pesoBase (ex.: valores TACO por 100g). */
  proteinaBase_g: number;
  caloriasBase_kcal: number;
  pesoBase_g?: number;
  peso_g?: number;
  quantidade?: number;
  unidade?: string;
  descricao?: string;
  origemAlimento?: OrigemAlimentoPlano;
  alimentoGlobalId?: string;
  /** ETAPA 07 — opcionais; undefined = desconhecido */
  carboidratoBase_g?: number;
  gorduraBase_g?: number;
  fibraBase_g?: number;
}): ItemPlanoRefeicao {
  return aplicarPorcaoItem({
    id: input.id,
    nome: nomeBaseAlimento(input.nome),
    categoria: input.categoria,
    proteina_g: input.proteinaBase_g,
    calorias_kcal: input.caloriasBase_kcal,
    proteinaBase_g: input.proteinaBase_g,
    caloriasBase_kcal: input.caloriasBase_kcal,
    pesoBase_g: input.pesoBase_g ?? 100,
    peso_g: input.peso_g ?? input.pesoBase_g ?? 100,
    quantidade: input.quantidade ?? 1,
    unidade: input.unidade || '',
    descricao: input.descricao,
    origemAlimento: input.origemAlimento,
    alimentoGlobalId: input.alimentoGlobalId,
    carboidratoBase_g: input.carboidratoBase_g,
    gorduraBase_g: input.gorduraBase_g,
    fibraBase_g: input.fibraBase_g,
    carboidrato_g: input.carboidratoBase_g,
    gordura_g: input.gorduraBase_g,
    fibra_g: input.fibraBase_g,
  });
}

export function criarRefeicaoPlanoVazia(): RefeicaoPlanoTemplate {
  return {
    itens: [],
    itensSelecionados: [],
    proteina_g: 0,
    calorias_kcal: 0,
    titulo: '',
    descricao: '',
    observacao: '',
  };
}

export function criarRefeicoesPlanoVazias(): Record<RefeicaoPlanoKey, RefeicaoPlanoTemplate> {
  return {
    cafe: criarRefeicaoPlanoVazia(),
    lanche1: criarRefeicaoPlanoVazia(),
    almoco: criarRefeicaoPlanoVazia(),
    lanche2: criarRefeicaoPlanoVazia(),
    jantar: criarRefeicaoPlanoVazia(),
  };
}

export function recalcularMacrosRefeicaoPlano(
  refeicao: RefeicaoPlanoTemplate
): RefeicaoPlanoTemplate {
  const selecionados = new Set(refeicao.itensSelecionados);
  const itensNormalizados = refeicao.itens.map((i) => normalizarItemComPorcao(i));
  const itensAtivos = itensNormalizados.filter((i) => selecionados.has(i.id));
  const proteina_g =
    Math.round(itensAtivos.reduce((acc, i) => acc + (i.proteina_g || 0), 0) * 10) / 10;
  const calorias_kcal = Math.round(
    itensAtivos.reduce((acc, i) => acc + (i.calorias_kcal || 0), 0)
  );
  const sumKnown = (getter: (i: ItemPlanoRefeicao) => number | undefined) => {
    let sum = 0;
    let any = false;
    for (const i of itensAtivos) {
      const v = getter(i);
      if (v !== undefined) {
        sum += v;
        any = true;
      }
    }
    return any ? Math.round(sum * 10) / 10 : undefined;
  };
  const titulo =
    itensAtivos
      .slice(0, 3)
      .map((i) => nomeBaseAlimento(i.nome))
      .join(' + ') ||
    refeicao.titulo ||
    '';
  const descricao =
    itensAtivos.map((i) => formatarNomeItemPorcao(i)).join(' · ') || refeicao.descricao || '';
  return {
    ...refeicao,
    itens: itensNormalizados,
    proteina_g,
    calorias_kcal,
    carboidrato_g: sumKnown((i) => i.carboidrato_g),
    gordura_g: sumKnown((i) => i.gordura_g),
    fibra_g: sumKnown((i) => i.fibra_g),
    titulo,
    descricao,
    observacao: refeicao.observacao || '',
  };
}

/** Soma nutrientes das refeições (itens selecionados já refletidos nos totais da refeição). */
export function calcularTotaisNutricionaisPlano(
  refeicoes: Record<RefeicaoPlanoKey, RefeicaoPlanoTemplate>
): TotaisNutricionaisPlano {
  let calorias = 0;
  let proteina = 0;
  let carb = 0;
  let gord = 0;
  let fibra = 0;
  for (const key of REFEICOES_PLANO_ORDEM) {
    const r = recalcularMacrosRefeicaoPlano(refeicoes[key] || criarRefeicaoPlanoVazia());
    calorias += r.calorias_kcal || 0;
    proteina += r.proteina_g || 0;
    carb += r.carboidrato_g || 0;
    gord += r.gordura_g || 0;
    fibra += r.fibra_g || 0;
  }
  return {
    calorias_kcal: Math.round(calorias),
    proteina_g: Math.round(proteina * 10) / 10,
    carboidrato_g: Math.round(carb * 10) / 10,
    gordura_g: Math.round(gord * 10) / 10,
    fibra_g: Math.round(fibra * 10) / 10,
  };
}

/** Cobertura: quantos itens selecionados têm cada nutriente conhecido. */
export function calcularCoberturaNutricionalPlano(
  refeicoes: Record<RefeicaoPlanoKey, RefeicaoPlanoTemplate>
): CoberturaNutricionalPlano {
  const itens: ItemPlanoRefeicao[] = [];
  for (const key of REFEICOES_PLANO_ORDEM) {
    const r = refeicoes[key];
    if (!r) continue;
    const sel = new Set(r.itensSelecionados);
    for (const i of r.itens) {
      if (sel.has(i.id)) itens.push(normalizarItemComPorcao(i));
    }
  }
  const total = itens.length;
  const count = (pred: (i: ItemPlanoRefeicao) => boolean) => ({
    conhecidos: itens.filter(pred).length,
    total,
  });
  return {
    proteina: count(() => true), // legado sempre number
    calorias: count(() => true),
    carboidrato: count((i) => i.carboidrato_g !== undefined),
    gordura: count((i) => i.gordura_g !== undefined),
    fibra: count((i) => i.fibra_g !== undefined),
  };
}

/** Formata resumo discreto: 420 kcal • P 32g • C 44g • G 12g • F 7g */
export function formatarResumoMacrosItem(item: ItemPlanoRefeicao): string {
  const n = normalizarItemComPorcao(item);
  const parts = [`${n.calorias_kcal} kcal`, `P ${n.proteina_g}g`];
  if (n.carboidrato_g !== undefined) parts.push(`C ${n.carboidrato_g}g`);
  if (n.gordura_g !== undefined) parts.push(`G ${n.gordura_g}g`);
  if (n.fibra_g !== undefined) parts.push(`F ${n.fibra_g}g`);
  return parts.join(' • ');
}

export function formatarResumoMacrosRefeicao(refeicao: RefeicaoPlanoTemplate): string {
  const r = recalcularMacrosRefeicaoPlano(refeicao);
  const parts = [`${r.calorias_kcal} kcal`, `P ${r.proteina_g}g`];
  if (r.carboidrato_g !== undefined) parts.push(`C ${r.carboidrato_g}g`);
  if (r.gordura_g !== undefined) parts.push(`G ${r.gordura_g}g`);
  if (r.fibra_g !== undefined) parts.push(`F ${r.fibra_g}g`);
  return parts.join(' • ');
}

export function clonarItensComNovosIds(
  refeicao: RefeicaoPlanoTemplate,
  prefix: string
): RefeicaoPlanoTemplate {
  const idMap = new Map<string, string>();
  const itens = refeicao.itens.map((item, idx) => {
    const novoId = `${prefix}_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`;
    idMap.set(item.id, novoId);
    return { ...item, id: novoId };
  });
  const itensSelecionados = refeicao.itensSelecionados
    .map((id) => idMap.get(id))
    .filter((id): id is string => !!id);
  return recalcularMacrosRefeicaoPlano({
    ...refeicao,
    itens,
    itensSelecionados,
  });
}
