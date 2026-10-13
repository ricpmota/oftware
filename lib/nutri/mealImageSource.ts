/**
 * Fonte textual e hash da composição visual de um prato do Cardápio.
 * Server/client safe — sem Node crypto, sem GCS, sem IA.
 *
 * mealImage vive em OpcaoRefeicao (plano.opcoesSlots[refeicaoKey][slot]).
 * Campo opcional: planos antigos sem mealImage continuam válidos.
 */

import { formatarNomeItemPorcao } from '@/lib/nutri/planosNutricionista';

export type MealImageStatus = 'ready' | 'pending' | 'failed';

export interface MealImageData {
  gcsPath: string;
  generatedAt?: string;
  sourceHash?: string;
  status?: MealImageStatus;
  /** ISO — lock de geração. Ausente em imagens ready. */
  generationStartedAt?: string;
}

/** Registro persistido (failed/pending pode existir sem gcsPath). */
export type MealImageRecord = {
  gcsPath?: string;
  generatedAt?: string;
  sourceHash?: string;
  status?: MealImageStatus;
  generationStartedAt?: string;
};

/** Item mínimo para descrever o prato — alinhado a itensDetalhe / ItemRefeicao. */
export type MealImageSourceItem = {
  nome?: string;
  peso_g?: number;
  quantidade?: number;
  unidade?: string;
  id?: string;
  proteina_g?: number;
  calorias_kcal?: number;
};

/** Recorte de OpcaoRefeicao usado pelo helper (não acopla ao NutriContent). */
export type MealImageSourceOption = {
  titulo?: string;
  descricao?: string;
  itensDetalhe?: MealImageSourceItem[] | null;
  itensSelecionados?: string[] | null;
  proteina_g?: number;
  calorias_kcal?: number;
  mealImage?: MealImageData;
};

const MEAL_IMAGE_STATUS: ReadonlySet<string> = new Set(['ready', 'pending', 'failed']);

/** Trim + espaços colapsados + quebras normalizadas. Não reordena linhas. */
export function normalizeMealImageSourceText(text: string): string {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t\f\v]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function linhaItemDetalhe(item: MealImageSourceItem | null | undefined): string {
  const nome = typeof item?.nome === 'string' ? item.nome.trim() : '';
  if (!nome) return '';
  return normalizeMealImageSourceText(
    formatarNomeItemPorcao({
      nome,
      peso_g: typeof item?.peso_g === 'number' ? item.peso_g : undefined,
      quantidade: typeof item?.quantidade === 'number' ? item.quantidade : undefined,
      unidade: item?.unidade,
    })
  );
}

function sourceFromItensDetalhe(itens: MealImageSourceItem[] | null | undefined): string {
  if (!Array.isArray(itens) || itens.length === 0) return '';
  const linhas = itens.map(linhaItemDetalhe).filter((linha) => linha.length > 0);
  return linhas.join('\n');
}

function sourceFromDescricao(descricao: string | undefined): string {
  return normalizeMealImageSourceText(descricao || '');
}

/**
 * Descrição canônica da composição alimentar (sem título de UI).
 * Prioridade: itensDetalhe → descricao. itensSelecionados (só IDs) não descrevem o prato.
 * Sem composição: string vazia.
 */
export function buildMealImageSource(option: MealImageSourceOption | null | undefined): string {
  if (!option) return '';
  const fromDetalhe = sourceFromItensDetalhe(option.itensDetalhe);
  if (fromDetalhe) return fromDetalhe;
  return sourceFromDescricao(option.descricao);
}

/** FNV-1a 32-bit — determinístico em JS (browser e Node). */
function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function hashSourceText(source: string): string {
  const a = fnv1a32(source);
  const b = fnv1a32(`\u0001${source}`);
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

/**
 * Hash da composição visual. Vazio se não houver prato descrevível.
 * Não inclui titulo, macros agregados, IDs, timestamps nem mealImage.
 */
export function buildMealImageSourceHash(option: MealImageSourceOption | null | undefined): string {
  const source = buildMealImageSource(option);
  if (!source) return '';
  return hashSourceText(source);
}

export function parseMealImageRecord(value: unknown): MealImageRecord | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const record: MealImageRecord = {};

  if (typeof raw.gcsPath === 'string') {
    const gcsPath = raw.gcsPath.trim();
    if (gcsPath) record.gcsPath = gcsPath;
  }
  if (typeof raw.generatedAt === 'string') {
    const generatedAt = raw.generatedAt.trim();
    if (generatedAt) record.generatedAt = generatedAt;
  }
  if (typeof raw.sourceHash === 'string') {
    const sourceHash = raw.sourceHash.trim();
    if (sourceHash) record.sourceHash = sourceHash;
  }
  if (typeof raw.status === 'string' && MEAL_IMAGE_STATUS.has(raw.status)) {
    record.status = raw.status as MealImageStatus;
  }
  if (typeof raw.generationStartedAt === 'string') {
    const generationStartedAt = raw.generationStartedAt.trim();
    if (generationStartedAt) record.generationStartedAt = generationStartedAt;
  }

  if (
    !record.gcsPath &&
    !record.sourceHash &&
    !record.status &&
    !record.generatedAt &&
    !record.generationStartedAt
  ) {
    return undefined;
  }
  return record;
}

/** Aceita só mealImage com gcsPath não vazio — nunca materializa `{ gcsPath: '' }`. */
export function pickMealImage(value: unknown): MealImageData | undefined {
  const record = parseMealImageRecord(value);
  if (!record?.gcsPath) return undefined;
  return {
    gcsPath: record.gcsPath,
    ...(record.generatedAt ? { generatedAt: record.generatedAt } : {}),
    ...(record.sourceHash ? { sourceHash: record.sourceHash } : {}),
    ...(record.status ? { status: record.status } : {}),
    ...(record.generationStartedAt ? { generationStartedAt: record.generationStartedAt } : {}),
  };
}

/**
 * Copia mealImage existente (next, senão previous). Não cria campo novo.
 * Usado em rebuilds de OpcaoRefeicao para o save não descartar a imagem.
 */
export function withMealImage<T extends { mealImage?: MealImageData }>(
  next: T,
  previous?: { mealImage?: MealImageData } | null
): T {
  const mealImage = pickMealImage(next.mealImage) ?? pickMealImage(previous?.mealImage);
  if (!mealImage) {
    if (next.mealImage === undefined) return next;
    const { mealImage: _omit, ...rest } = next;
    return rest as T;
  }
  return { ...next, mealImage };
}
