/**
 * Lê o slot no Firestore e assina o gcsPath do próprio documento.
 * Não aceita path arbitrário.
 */

import type { Firestore } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  buildMealImageSourceHash,
  type MealImageRecord,
  type MealImageStatus,
} from '@/lib/nutri/mealImageSource';
import {
  findSlotInList,
  isMealImageRefeicaoKey,
  isMealImageSignableCurrent,
  isSafeMealImageIdPart,
  mealImageRecordFromSlot,
  resolveRequestedSlotId,
  type MealImageRefeicaoKey,
} from '@/lib/nutri/mealImageSlot';
import { loadMealImagePlano } from '@/lib/nutri/mealImagePlanoStore.server';
import { downloadMealImageBytes, signMealImageGcsPath } from '@/lib/nutri/mealImageStorage.server';

export type MealImageReadOk = {
  ok: true;
  imageUrl: string | null;
  status: MealImageStatus | null;
  sourceHash?: string;
};

export type MealImageReadErr = {
  ok: false;
  code: 'INVALID_INPUT' | 'PLANO_NOT_FOUND' | 'SLOT_NOT_FOUND' | 'SIGN_FAILED';
  message: string;
};

export type MealImageReadResult = MealImageReadOk | MealImageReadErr;

export type MealImageReadInput = {
  patientId: string;
  refeicaoKey: string;
  slotId?: string | null;
  slotIndex?: number | null;
};

export type MealImageReadDeps = {
  loadPlano: (patientId: string) => Promise<Record<string, unknown> | null>;
  signPath: (gcsPath: string, patientId: string) => Promise<string>;
  downloadBytes?: (gcsPath: string, patientId: string) => Promise<{ buffer: Buffer; contentType: string }>;
};

export function createDefaultMealImageReadDeps(db?: Firestore): MealImageReadDeps {
  const firestore = db ?? getFirestoreAdmin();
  return {
    loadPlano: (patientId) => loadMealImagePlano(firestore, patientId),
    signPath: signMealImageGcsPath,
    downloadBytes: downloadMealImageBytes,
  };
}

function emptyOk(mealImage?: MealImageRecord): MealImageReadOk {
  return {
    ok: true,
    imageUrl: null,
    status: mealImage?.status || null,
    ...(mealImage?.sourceHash ? { sourceHash: mealImage.sourceHash } : {}),
  };
}

type ResolvedMealImage =
  | MealImageReadErr
  | { ok: true; patientId: string; gcsPath: string | null; mealImage?: MealImageRecord };

async function resolveSignableMealImage(
  input: MealImageReadInput,
  deps: MealImageReadDeps
): Promise<ResolvedMealImage> {
  const patientId = String(input.patientId || '').trim();
  const refeicaoKeyRaw = String(input.refeicaoKey || '').trim();
  if (!patientId || !isSafeMealImageIdPart(patientId) || !isMealImageRefeicaoKey(refeicaoKeyRaw)) {
    return { ok: false, code: 'INVALID_INPUT', message: 'patientId e refeicaoKey inválidos.' };
  }
  const refeicaoKey: MealImageRefeicaoKey = refeicaoKeyRaw;
  const slotId = resolveRequestedSlotId({
    refeicaoKey,
    slotId: input.slotId,
    slotIndex: input.slotIndex,
  });
  if (!slotId) {
    return { ok: false, code: 'INVALID_INPUT', message: 'Informe slotId ou slotIndex (1–5).' };
  }

  const plano = await deps.loadPlano(patientId);
  if (!plano) {
    return { ok: false, code: 'PLANO_NOT_FOUND', message: 'Plano nutricional não encontrado.' };
  }

  const opcoesSlots = (plano.opcoesSlots || {}) as Record<string, unknown>;
  const found = findSlotInList(opcoesSlots[refeicaoKey], refeicaoKey, slotId);
  if (!found) {
    return { ok: false, code: 'SLOT_NOT_FOUND', message: 'Opção da refeição não encontrada.' };
  }

  const mealImage = mealImageRecordFromSlot(found.slot);
  if (!mealImage) {
    return { ok: true, patientId, gcsPath: null };
  }

  const currentHash = buildMealImageSourceHash(found.slot);
  if (!isMealImageSignableCurrent(mealImage, currentHash) || !mealImage.gcsPath) {
    return { ok: true, patientId, gcsPath: null, mealImage };
  }

  return { ok: true, patientId, gcsPath: mealImage.gcsPath, mealImage };
}

export async function readMealImageSignedUrl(
  input: MealImageReadInput,
  deps: MealImageReadDeps = createDefaultMealImageReadDeps()
): Promise<MealImageReadResult> {
  const resolved = await resolveSignableMealImage(input, deps);
  if (!resolved.ok) return resolved;
  if (!resolved.gcsPath) return emptyOk(resolved.mealImage);

  try {
    const imageUrl = await deps.signPath(resolved.gcsPath, resolved.patientId);
    return {
      ok: true,
      imageUrl,
      status: resolved.mealImage?.status === 'pending' ? 'pending' : 'ready',
      sourceHash: resolved.mealImage?.sourceHash,
    };
  } catch (error) {
    console.error('[mealImage] signed URL falhou', error instanceof Error ? error.message : 'erro');
    return { ok: false, code: 'SIGN_FAILED', message: 'Não foi possível obter a imagem do prato.' };
  }
}

export type MealImageFileOk = {
  ok: true;
  buffer: Buffer;
  contentType: string;
};

export type MealImageFileResult = MealImageFileOk | MealImageReadErr | { ok: true; buffer: null };

export async function readMealImageFile(
  input: MealImageReadInput,
  deps: MealImageReadDeps = createDefaultMealImageReadDeps()
): Promise<MealImageFileResult> {
  const resolved = await resolveSignableMealImage(input, deps);
  if (!resolved.ok) return resolved;
  if (!resolved.gcsPath) return { ok: true, buffer: null };

  const download = deps.downloadBytes || downloadMealImageBytes;
  try {
    const file = await download(resolved.gcsPath, resolved.patientId);
    return { ok: true, buffer: file.buffer, contentType: file.contentType };
  } catch (error) {
    console.error('[mealImage] download falhou', error instanceof Error ? error.message : 'erro');
    return { ok: false, code: 'SIGN_FAILED', message: 'Não foi possível obter a imagem do prato.' };
  }
}
