import {
  ALIMENTO_GLOBAL_BASE_QUANTIDADE_DEFAULT,
  ALIMENTO_GLOBAL_BASE_UNIDADE,
  isStatusAlimentoGlobal,
  type OrigemCadastroAlimentoGlobal,
  type StatusAlimentoGlobal,
} from './constants';
import { resolveFontesAlimento } from './fontes';
import { normalizeNomeAlimento } from './normalizeNomeAlimento';
import { isSegmentoAlimento, rotuloSegmentoAlimento } from './segmentos';
import type {
  AlimentoGlobal,
  AlimentoGlobalCreateInput,
  AlimentoGlobalListFilters,
  NutrienteExtraAlimento,
  PorcaoAlimentoGlobal,
} from './types';

/** Converte valor numérico: ausência → null; "0" → 0. Nunca promove null a 0. */
export function parseNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const t = value.trim().replace(',', '.');
    if (t === '') return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

export function parseNullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  const t = value.trim();
  return t.length ? t : null;
}

function toDateSafe(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof v === 'object' && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

function parsePorcoes(raw: unknown): PorcaoAlimentoGlobal[] {
  if (!Array.isArray(raw)) return [];
  const out: PorcaoAlimentoGlobal[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const id = typeof r.id === 'string' && r.id ? r.id : `porcao_${out.length + 1}`;
    const nome = typeof r.nome === 'string' ? r.nome.trim() : '';
    const quantidadeG = parseNullableNumber(r.quantidadeG);
    if (!nome || quantidadeG == null || quantidadeG <= 0) continue;
    const origem = r.origem === 'source' || r.origem === 'manual' ? r.origem : undefined;
    out.push({ id, nome, quantidadeG, ...(origem ? { origem } : {}) });
  }
  return out;
}

function parseNutrientesExtras(raw: unknown): NutrienteExtraAlimento[] {
  if (!Array.isArray(raw)) return [];
  const out: NutrienteExtraAlimento[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const nome = typeof r.nome === 'string' ? r.nome.trim() : '';
    const unidade = typeof r.unidade === 'string' ? r.unidade.trim() : '';
    if (!nome || !unidade) continue;
    out.push({
      id: typeof r.id === 'string' ? r.id : undefined,
      codigo: parseNullableString(r.codigo),
      nome,
      valor: parseNullableNumber(r.valor),
      unidade,
      valorOriginal: parseNullableString(r.valorOriginal),
    });
  }
  return out;
}

export function parseAlimentoGlobalDoc(
  id: string,
  data: Record<string, unknown>
): AlimentoGlobal | null {
  const nome = typeof data.nome === 'string' ? data.nome.trim() : '';
  if (!nome) return null;
  if (!isSegmentoAlimento(data.segmento)) return null;
  const status: StatusAlimentoGlobal = isStatusAlimentoGlobal(data.status) ? data.status : 'draft';
  const nomeNormalizado =
    typeof data.nomeNormalizado === 'string' && data.nomeNormalizado.trim()
      ? data.nomeNormalizado.trim()
      : normalizeNomeAlimento(nome);

  const origemCadastro =
    data.origemCadastro === 'manual' || data.origemCadastro === 'pdf_import'
      ? (data.origemCadastro as OrigemCadastroAlimentoGlobal)
      : 'manual';

  const baseQuantidade =
    parseNullableNumber(data.baseQuantidade) ?? ALIMENTO_GLOBAL_BASE_QUANTIDADE_DEFAULT;

  return {
    id,
    nome,
    nomeNormalizado,
    descricao: parseNullableString(data.descricao),
    nomeCientifico: parseNullableString(data.nomeCientifico),
    marca: parseNullableString(data.marca),
    segmento: data.segmento,
    estado: parseNullableString(data.estado),
    processamento: parseNullableString(data.processamento),
    preparo: parseNullableString(data.preparo),
    baseQuantidade,
    baseUnidade: ALIMENTO_GLOBAL_BASE_UNIDADE,
    energiaKcal: parseNullableNumber(data.energiaKcal),
    energiaKj: parseNullableNumber(data.energiaKj),
    proteinasG: parseNullableNumber(data.proteinasG),
    carboidratosG: parseNullableNumber(data.carboidratosG),
    gordurasTotaisG: parseNullableNumber(data.gordurasTotaisG),
    fibrasG: parseNullableNumber(data.fibrasG),
    glicoseG: parseNullableNumber(data.glicoseG),
    frutoseG: parseNullableNumber(data.frutoseG),
    lactoseG: parseNullableNumber(data.lactoseG),
    sacaroseG: parseNullableNumber(data.sacaroseG),
    acucaresTotaisG: parseNullableNumber(data.acucaresTotaisG),
    amidoTotalG: parseNullableNumber(data.amidoTotalG),
    amidoDisponivelG: parseNullableNumber(data.amidoDisponivelG),
    amidoResistenteG: parseNullableNumber(data.amidoResistenteG),
    gordurasSaturadasG: parseNullableNumber(data.gordurasSaturadasG),
    gordurasMonoinsaturadasG: parseNullableNumber(data.gordurasMonoinsaturadasG),
    gordurasPoliinsaturadasG: parseNullableNumber(data.gordurasPoliinsaturadasG),
    gordurasTransG: parseNullableNumber(data.gordurasTransG),
    calcioMg: parseNullableNumber(data.calcioMg),
    ferroMg: parseNullableNumber(data.ferroMg),
    magnesioMg: parseNullableNumber(data.magnesioMg),
    fosforoMg: parseNullableNumber(data.fosforoMg),
    potassioMg: parseNullableNumber(data.potassioMg),
    sodioMg: parseNullableNumber(data.sodioMg),
    zincoMg: parseNullableNumber(data.zincoMg),
    vitaminaAMcg: parseNullableNumber(data.vitaminaAMcg),
    vitaminaCMg: parseNullableNumber(data.vitaminaCMg),
    vitaminaDMcg: parseNullableNumber(data.vitaminaDMcg),
    vitaminaEMg: parseNullableNumber(data.vitaminaEMg),
    vitaminaB1Mg: parseNullableNumber(data.vitaminaB1Mg),
    vitaminaB2Mg: parseNullableNumber(data.vitaminaB2Mg),
    vitaminaB3Mg: parseNullableNumber(data.vitaminaB3Mg),
    vitaminaB6Mg: parseNullableNumber(data.vitaminaB6Mg),
    vitaminaB12Mcg: parseNullableNumber(data.vitaminaB12Mcg),
    folatoMcg: parseNullableNumber(data.folatoMcg),
    porcoes: parsePorcoes(data.porcoes),
    nutrientesExtras: parseNutrientesExtras(data.nutrientesExtras),
    ...(() => {
      const resolved = resolveFontesAlimento({ fonte: data.fonte, fontes: data.fontes });
      return { fonte: resolved.fonte, fontes: resolved.fontes };
    })(),
    origemCadastro,
    observacoes: parseNullableString(data.observacoes),
    status,
    criadoEm: toDateSafe(data.criadoEm),
    atualizadoEm: toDateSafe(data.atualizadoEm),
    criadoPorUid: parseNullableString(data.criadoPorUid),
    atualizadoPorUid: parseNullableString(data.atualizadoPorUid),
  };
}

/**
 * Serializa para Firestore preservando null explícito em nutrientes.
 * Strings vazias → null. Não promove null → 0.
 */
export function serializeAlimentoGlobalPayload(
  input: AlimentoGlobalCreateInput | Partial<AlimentoGlobal>,
  opts: { forCreate: boolean; uid?: string }
): Record<string, unknown> {
  const nome = typeof input.nome === 'string' ? input.nome.trim() : '';
  if (!nome && opts.forCreate) {
    throw new Error('Nome é obrigatório.');
  }
  if (opts.forCreate && !isSegmentoAlimento(input.segmento)) {
    throw new Error('Segmento é obrigatório.');
  }

  const out: Record<string, unknown> = {};

  if (nome) {
    out.nome = nome;
    out.nomeNormalizado = normalizeNomeAlimento(nome);
  }
  if (input.segmento !== undefined) {
    if (!isSegmentoAlimento(input.segmento)) throw new Error('Segmento inválido.');
    out.segmento = input.segmento;
  }
  if (input.status !== undefined) {
    if (!isStatusAlimentoGlobal(input.status)) throw new Error('Status inválido.');
    out.status = input.status;
  } else if (opts.forCreate) {
    out.status = 'draft';
  }

  const strFields = [
    'descricao',
    'nomeCientifico',
    'marca',
    'estado',
    'processamento',
    'preparo',
    'observacoes',
  ] as const;
  for (const key of strFields) {
    if (key in input) {
      out[key] = parseNullableString((input as Record<string, unknown>)[key]);
    } else if (opts.forCreate) {
      out[key] = null;
    }
  }

  const numFields = [
    'energiaKcal',
    'energiaKj',
    'proteinasG',
    'carboidratosG',
    'gordurasTotaisG',
    'fibrasG',
    'glicoseG',
    'frutoseG',
    'lactoseG',
    'sacaroseG',
    'acucaresTotaisG',
    'amidoTotalG',
    'amidoDisponivelG',
    'amidoResistenteG',
    'gordurasSaturadasG',
    'gordurasMonoinsaturadasG',
    'gordurasPoliinsaturadasG',
    'gordurasTransG',
    'calcioMg',
    'ferroMg',
    'magnesioMg',
    'fosforoMg',
    'potassioMg',
    'sodioMg',
    'zincoMg',
    'vitaminaAMcg',
    'vitaminaCMg',
    'vitaminaDMcg',
    'vitaminaEMg',
    'vitaminaB1Mg',
    'vitaminaB2Mg',
    'vitaminaB3Mg',
    'vitaminaB6Mg',
    'vitaminaB12Mcg',
    'folatoMcg',
  ] as const;

  for (const key of numFields) {
    if (key in input) {
      out[key] = parseNullableNumber((input as Record<string, unknown>)[key]);
    } else if (opts.forCreate) {
      out[key] = null;
    }
  }

  if (opts.forCreate || 'baseQuantidade' in input) {
    out.baseQuantidade =
      parseNullableNumber(input.baseQuantidade) ?? ALIMENTO_GLOBAL_BASE_QUANTIDADE_DEFAULT;
  }
  if (opts.forCreate || 'baseUnidade' in input) {
    out.baseUnidade = ALIMENTO_GLOBAL_BASE_UNIDADE;
  }

  if (opts.forCreate || 'porcoes' in input) {
    out.porcoes = parsePorcoes(input.porcoes);
  }
  if (opts.forCreate || 'nutrientesExtras' in input) {
    out.nutrientesExtras = parseNutrientesExtras(input.nutrientesExtras);
  }
  if (opts.forCreate || 'fonte' in input || 'fontes' in input) {
    const resolved = resolveFontesAlimento({
      fonte: input.fonte,
      fontes: input.fontes,
    });
    // Se só veio `fonte` no patch, anexar ao histórico implícito via serialize caller.
    out.fonte = resolved.fonte;
    out.fontes = resolved.fontes.length
      ? resolved.fontes
      : resolved.fonte
        ? [resolved.fonte]
        : [];
  }
  if (opts.forCreate || 'origemCadastro' in input) {
    out.origemCadastro =
      input.origemCadastro === 'pdf_import' || input.origemCadastro === 'manual'
        ? input.origemCadastro
        : 'manual';
  }

  if (opts.uid) {
    out.atualizadoPorUid = opts.uid;
    if (opts.forCreate) out.criadoPorUid = opts.uid;
  }

  return out;
}

export function alimentoMatchesFilters(
  alimento: AlimentoGlobal,
  filters: AlimentoGlobalListFilters
): boolean {
  if (filters.segmento && filters.segmento !== 'todos' && alimento.segmento !== filters.segmento) {
    return false;
  }
  if (filters.status && filters.status !== 'todos' && alimento.status !== filters.status) {
    return false;
  }
  const q = (filters.q || '').trim().toLowerCase();
  if (!q) return true;
  const qNorm = normalizeNomeAlimento(q);
  const haystacks = [
    alimento.nome.toLowerCase(),
    alimento.nomeNormalizado,
    alimento.segmento.toLowerCase(),
    rotuloSegmentoAlimento(alimento.segmento).toLowerCase(),
    (alimento.marca || '').toLowerCase(),
    (alimento.fonte?.codigoOriginal || '').toLowerCase(),
    (alimento.fonte?.nome || '').toLowerCase(),
    (alimento.descricao || '').toLowerCase(),
  ];
  return haystacks.some((h) => h.includes(q) || (qNorm.length > 0 && h.includes(qNorm)));
}

export function alimentoGlobalToJson(alimento: AlimentoGlobal) {
  return {
    ...alimento,
    criadoEm: alimento.criadoEm.toISOString(),
    atualizadoEm: alimento.atualizadoEm.toISOString(),
  };
}
