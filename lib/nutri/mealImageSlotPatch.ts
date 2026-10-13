import type { MealImageRecord } from '@/lib/nutri/mealImageSource';

/** Atualiza somente o slot pedido — gerações em voo não contaminam outra opção. */
export function patchSlotMealImage<T extends { id?: string; mealImage?: unknown }>(
  slots: T[] | null | undefined,
  slotId: string,
  mealImage: MealImageRecord
): T[] {
  const list = Array.isArray(slots) ? slots.slice() : [];
  const wanted = slotId.trim();
  return list.map((slot) => {
    if (String(slot?.id || '').trim() !== wanted) return slot;
    const previous = (slot.mealImage || {}) as MealImageRecord;
    const gcsPath = mealImage.gcsPath || previous.gcsPath;
    const next: MealImageRecord = {
      ...(gcsPath ? { gcsPath } : {}),
      ...(mealImage.generatedAt || previous.generatedAt
        ? { generatedAt: mealImage.generatedAt || previous.generatedAt }
        : {}),
      ...(mealImage.sourceHash || previous.sourceHash
        ? { sourceHash: mealImage.sourceHash || previous.sourceHash }
        : {}),
      ...(mealImage.status ? { status: mealImage.status } : {}),
    };
    return { ...slot, mealImage: next };
  });
}
