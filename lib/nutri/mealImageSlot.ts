import type { MealImageRecord, MealImageSourceOption } from '@/lib/nutri/mealImageSource';
import { parseMealImageRecord } from '@/lib/nutri/mealImageSource';

export const MEAL_IMAGE_REFEICAO_KEYS = ['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'] as const;
export type MealImageRefeicaoKey = (typeof MEAL_IMAGE_REFEICAO_KEYS)[number];

export const MEAL_IMAGE_PENDING_TIMEOUT_MS = 8 * 60 * 1000;

export type MealImageSlot = Omit<MealImageSourceOption, 'mealImage'> & {
  id?: string;
  mealImage?: MealImageRecord;
};

export function isMealImageRefeicaoKey(value: string): value is MealImageRefeicaoKey {
  return (MEAL_IMAGE_REFEICAO_KEYS as readonly string[]).includes(value);
}

export function slotIdFor(refeicaoKey: MealImageRefeicaoKey, slot: number): string {
  return `slot_${refeicaoKey}_${slot}`;
}

export function parseSlotIndexFromId(
  refeicaoKey: MealImageRefeicaoKey,
  slotId: string | undefined | null
): number | null {
  if (!slotId) return null;
  const match = slotId.trim().match(new RegExp(`^slot_${refeicaoKey}_([1-5])$`));
  if (!match) return null;
  return Number(match[1]);
}

export function resolveRequestedSlotId(params: {
  refeicaoKey: MealImageRefeicaoKey;
  slotId?: string | null;
  slotIndex?: number | null;
}): string | null {
  const fromId = typeof params.slotId === 'string' ? params.slotId.trim() : '';
  if (fromId) {
    return isMealImageSlotIdForRefeicao(params.refeicaoKey, fromId) ? fromId : null;
  }
  const idx = params.slotIndex;
  if (typeof idx === 'number' && Number.isInteger(idx) && idx >= 1 && idx <= 5) {
    return slotIdFor(params.refeicaoKey, idx);
  }
  return null;
}

export function isMealImageSlotIdForRefeicao(refeicaoKey: MealImageRefeicaoKey, slotId: string): boolean {
  return parseSlotIndexFromId(refeicaoKey, slotId) != null;
}

/** Path-safe: sem traversal, sem caracteres fora do alfabeto de IDs. */
export function isSafeMealImageIdPart(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\')) {
    return false;
  }
  return /^[a-zA-Z0-9._-]+$/.test(trimmed);
}

/** Firestore às vezes devolve mapa `{0: slot, 1: slot}` em vez de array. */
export function normalizeMealImageSlotList(slots: unknown): MealImageSlot[] {
  if (Array.isArray(slots)) {
    return slots.filter((item): item is MealImageSlot => Boolean(item) && typeof item === 'object');
  }
  if (slots && typeof slots === 'object') {
    return Object.keys(slots as Record<string, MealImageSlot>)
      .sort((a, b) => Number(a) - Number(b))
      .map((key) => (slots as Record<string, MealImageSlot>)[key])
      .filter((item): item is MealImageSlot => Boolean(item) && typeof item === 'object');
  }
  return [];
}

export function findSlotInList(
  slots: unknown,
  refeicaoKey: MealImageRefeicaoKey,
  slotId: string
): { index: number; slot: MealImageSlot } | null {
  const list = normalizeMealImageSlotList(slots);
  if (list.length === 0) return null;
  const wanted = slotId.trim();
  const byId = list.findIndex((item) => String(item.id || '').trim() === wanted);
  if (byId >= 0) {
    return { index: byId, slot: list[byId] };
  }
  const parsed = parseSlotIndexFromId(refeicaoKey, wanted);
  if (parsed != null) {
    const byIndex = list[parsed - 1];
    if (byIndex && typeof byIndex === 'object') {
      return { index: parsed - 1, slot: byIndex };
    }
  }
  return null;
}

export function isMealImageReadyAndCurrent(
  mealImage: MealImageRecord | undefined,
  sourceHash: string
): boolean {
  return Boolean(
    mealImage?.status === 'ready' &&
      mealImage.gcsPath &&
      mealImage.sourceHash &&
      mealImage.sourceHash === sourceHash
  );
}

/** Ready atual ou pending da mesma composição com foto anterior ainda no GCS. */
export function isMealImageSignableCurrent(
  mealImage: MealImageRecord | undefined,
  sourceHash: string
): boolean {
  if (!sourceHash || !mealImage?.gcsPath || !mealImage.sourceHash) return false;
  if (mealImage.sourceHash !== sourceHash) return false;
  return mealImage.status === 'ready' || mealImage.status === 'pending';
}

export function isMealImagePendingFresh(
  mealImage: MealImageRecord | undefined,
  sourceHash: string,
  nowMs: number,
  timeoutMs = MEAL_IMAGE_PENDING_TIMEOUT_MS
): boolean {
  if (mealImage?.status !== 'pending') return false;
  if (mealImage.sourceHash && mealImage.sourceHash !== sourceHash) return false;
  const started = mealImage.generationStartedAt
    ? Date.parse(mealImage.generationStartedAt)
    : NaN;
  if (!Number.isFinite(started)) return true;
  const age = nowMs - started;
  return age >= 0 && age < timeoutMs;
}

export function mealImageRecordFromSlot(slot: MealImageSlot | null | undefined): MealImageRecord | undefined {
  return parseMealImageRecord(slot?.mealImage);
}
