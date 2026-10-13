/**
 * Leitura/escrita Firestore do slot de cardápio para mealImage.
 * Isolado do cliente Vertex.
 */

import type { Firestore } from 'firebase-admin/firestore';
import {
  buildMealImageSource,
  buildMealImageSourceHash,
  type MealImageRecord,
} from '@/lib/nutri/mealImageSource';
import {
  findSlotInList,
  isMealImagePendingFresh,
  isMealImageReadyAndCurrent,
  mealImageRecordFromSlot,
  normalizeMealImageSlotList,
  type MealImageRefeicaoKey,
  type MealImageSlot,
} from '@/lib/nutri/mealImageSlot';

export type MealImageLockResult =
  | { kind: 'already_current'; mealImage: MealImageRecord }
  | { kind: 'already_pending'; mealImage: MealImageRecord }
  | {
      kind: 'acquired';
      generationStartedAt: string;
      previousGcsPath?: string;
      previousMealImage?: MealImageRecord;
    }
  | { kind: 'missing' }
  | { kind: 'insufficient' }
  | { kind: 'source_changed'; mealImage?: MealImageRecord };

export type MealImageFinalizeResult =
  | { kind: 'ready'; mealImage: MealImageRecord }
  | { kind: 'source_changed'; mealImage?: MealImageRecord }
  | { kind: 'missing' };

function planoRef(db: Firestore, patientId: string) {
  return db.collection('pacientes_completos').doc(patientId).collection('nutricao').doc('plano');
}

function omitUndefinedRecord(record: MealImageRecord): MealImageRecord {
  const out: MealImageRecord = {};
  if (record.gcsPath) out.gcsPath = record.gcsPath;
  if (record.generatedAt) out.generatedAt = record.generatedAt;
  if (record.sourceHash) out.sourceHash = record.sourceHash;
  if (record.status) out.status = record.status;
  if (record.generationStartedAt) out.generationStartedAt = record.generationStartedAt;
  return out;
}

/** Se a regeneração falhar e havia ready/current, restaura essa foto. */
export function resolveMealImageAfterFailedGeneration(params: {
  currentHash: string;
  attemptedHash: string;
  previousMealImage?: MealImageRecord;
  existing?: MealImageRecord;
  previousGcsPath?: string;
}): MealImageRecord {
  if (
    params.currentHash === params.attemptedHash &&
    isMealImageReadyAndCurrent(params.previousMealImage, params.attemptedHash) &&
    params.previousMealImage
  ) {
    return omitUndefinedRecord({
      gcsPath: params.previousMealImage.gcsPath,
      generatedAt: params.previousMealImage.generatedAt,
      sourceHash: params.previousMealImage.sourceHash,
      status: 'ready',
    });
  }
  const gcsPath = params.existing?.gcsPath || params.previousGcsPath;
  return omitUndefinedRecord({
    ...(gcsPath ? { gcsPath } : {}),
    ...(params.existing?.generatedAt ? { generatedAt: params.existing.generatedAt } : {}),
    sourceHash: params.attemptedHash,
    status: 'failed',
  });
}

function writeSlots(
  slots: unknown[],
  index: number,
  slot: MealImageSlot,
  mealImage: MealImageRecord | undefined
): MealImageSlot[] {
  const next = slots.map((item, i) => {
    if (i !== index) return item as MealImageSlot;
    const copy: MealImageSlot = { ...(item as MealImageSlot), ...slot, id: slot.id };
    if (mealImage && (mealImage.gcsPath || mealImage.status || mealImage.sourceHash)) {
      copy.mealImage = omitUndefinedRecord(mealImage);
    } else {
      delete copy.mealImage;
    }
    return copy;
  });
  return next;
}

export async function loadMealImagePlano(
  db: Firestore,
  patientId: string
): Promise<Record<string, unknown> | null> {
  const snap = await planoRef(db, patientId).get();
  if (!snap.exists) return null;
  return (snap.data() || {}) as Record<string, unknown>;
}

export async function acquireMealImageGenerationLock(params: {
  db: Firestore;
  patientId: string;
  refeicaoKey: MealImageRefeicaoKey;
  slotId: string;
  sourceHash: string;
  nowIso: string;
  nowMs: number;
  forceRegenerate?: boolean;
}): Promise<MealImageLockResult> {
  const ref = planoRef(params.db, params.patientId);
  return params.db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { kind: 'missing' as const };
    const data = (snap.data() || {}) as Record<string, unknown>;
    const opcoesSlots = (data.opcoesSlots || {}) as Record<string, unknown>;
    const slots = normalizeMealImageSlotList(opcoesSlots[params.refeicaoKey]);
    const found = findSlotInList(slots, params.refeicaoKey, params.slotId);
    if (!found) return { kind: 'missing' as const };

    const source = buildMealImageSource(found.slot);
    const currentHash = buildMealImageSourceHash(found.slot);
    if (!source || !currentHash) return { kind: 'insufficient' as const };
    if (currentHash !== params.sourceHash) {
      return { kind: 'source_changed' as const, mealImage: mealImageRecordFromSlot(found.slot) };
    }
    const hash = params.sourceHash;
    const existing = mealImageRecordFromSlot(found.slot);

    if (!params.forceRegenerate && isMealImageReadyAndCurrent(existing, hash)) {
      return { kind: 'already_current' as const, mealImage: existing! };
    }
    if (isMealImagePendingFresh(existing, hash, params.nowMs)) {
      return { kind: 'already_pending' as const, mealImage: existing || { status: 'pending', sourceHash: hash } };
    }

    const pending: MealImageRecord = {
      ...(existing?.gcsPath ? { gcsPath: existing.gcsPath } : {}),
      ...(existing?.generatedAt ? { generatedAt: existing.generatedAt } : {}),
      sourceHash: hash,
      status: 'pending',
      generationStartedAt: params.nowIso,
    };
    const nextSlots = writeSlots(slots, found.index, found.slot, pending);
    tx.set(
      ref,
      { opcoesSlots: { ...(opcoesSlots as object), [params.refeicaoKey]: nextSlots } },
      { merge: true }
    );
    return {
      kind: 'acquired' as const,
      generationStartedAt: params.nowIso,
      ...(existing ? { previousMealImage: existing } : {}),
      ...(existing?.gcsPath ? { previousGcsPath: existing.gcsPath } : {}),
    };
  });
}

export async function finalizeMealImageReady(params: {
  db: Firestore;
  patientId: string;
  refeicaoKey: MealImageRefeicaoKey;
  slotId: string;
  sourceHash: string;
  gcsPath: string;
  generatedAt: string;
  generationStartedAt: string;
}): Promise<MealImageFinalizeResult> {
  const ref = planoRef(params.db, params.patientId);
  return params.db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { kind: 'missing' as const };
    const data = (snap.data() || {}) as Record<string, unknown>;
    const opcoesSlots = (data.opcoesSlots || {}) as Record<string, unknown>;
    const slots = normalizeMealImageSlotList(opcoesSlots[params.refeicaoKey]);
    const found = findSlotInList(slots, params.refeicaoKey, params.slotId);
    if (!found) return { kind: 'missing' as const };

    const currentHash = buildMealImageSourceHash(found.slot);
    const existing = mealImageRecordFromSlot(found.slot);

    if (currentHash !== params.sourceHash) {
      if (existing?.generationStartedAt === params.generationStartedAt) {
        const failed: MealImageRecord = {
          ...(existing.gcsPath ? { gcsPath: existing.gcsPath } : {}),
          ...(existing.generatedAt ? { generatedAt: existing.generatedAt } : {}),
          sourceHash: params.sourceHash,
          status: 'failed',
        };
        const nextSlots = writeSlots(slots, found.index, found.slot, failed);
        tx.set(
          ref,
          { opcoesSlots: { ...(opcoesSlots as object), [params.refeicaoKey]: nextSlots } },
          { merge: true }
        );
        return { kind: 'source_changed' as const, mealImage: failed };
      }
      return { kind: 'source_changed' as const, mealImage: existing };
    }

    const ready: MealImageRecord = {
      gcsPath: params.gcsPath,
      generatedAt: params.generatedAt,
      sourceHash: params.sourceHash,
      status: 'ready',
    };
    const nextSlots = writeSlots(slots, found.index, found.slot, ready);
    tx.set(
      ref,
      { opcoesSlots: { ...(opcoesSlots as object), [params.refeicaoKey]: nextSlots } },
      { merge: true }
    );
    return { kind: 'ready' as const, mealImage: ready };
  });
}

export async function markMealImageFailed(params: {
  db: Firestore;
  patientId: string;
  refeicaoKey: MealImageRefeicaoKey;
  slotId: string;
  sourceHash: string;
  generationStartedAt: string;
  previousGcsPath?: string;
  previousMealImage?: MealImageRecord;
}): Promise<MealImageRecord | undefined> {
  const ref = planoRef(params.db, params.patientId);
  return params.db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return undefined;
    const data = (snap.data() || {}) as Record<string, unknown>;
    const opcoesSlots = (data.opcoesSlots || {}) as Record<string, unknown>;
    const slots = normalizeMealImageSlotList(opcoesSlots[params.refeicaoKey]);
    const found = findSlotInList(slots, params.refeicaoKey, params.slotId);
    if (!found) return undefined;
    const existing = mealImageRecordFromSlot(found.slot);
    if (existing?.generationStartedAt && existing.generationStartedAt !== params.generationStartedAt) {
      return existing;
    }
    const currentHash = buildMealImageSourceHash(found.slot);
    const nextImage = resolveMealImageAfterFailedGeneration({
      currentHash,
      attemptedHash: params.sourceHash,
      previousMealImage: params.previousMealImage,
      existing,
      previousGcsPath: params.previousGcsPath,
    });
    const nextSlots = writeSlots(slots, found.index, found.slot, nextImage);
    tx.set(
      ref,
      { opcoesSlots: { ...(opcoesSlots as object), [params.refeicaoKey]: nextSlots } },
      { merge: true }
    );
    return nextImage;
  });
}
