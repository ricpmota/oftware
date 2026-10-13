/**
 * Orquestra geração idempotente da foto do prato.
 * Sem UI. Sem signed URL. forceRegenerate só via política do endpoint.
 */

import type { Firestore } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { generateMealImageWithVertex, MealImageVertexError } from '@/lib/gcp/mealImageVertexClient.server';
import { createMealImageGenerationId, uploadMealImageToGcs } from '@/lib/nutri/mealImageStorage.server';
import { buildMealImagePrompt } from '@/lib/nutri/mealImagePrompt';
import {
  assertMealImageSourceWithinLimits,
  MEAL_COMPOSITION_TOO_LARGE,
  MEAL_IMAGE_MAX_PROMPT_CHARS,
} from '@/lib/nutri/mealImageSourceLimits';
import {
  logMealImageGeneration,
  logMealImageVertexCall,
  mealImageHashPrefix,
  type MealImageLogResult,
} from '@/lib/nutri/mealImageObservability.server';
import { mealImageGenerateRateLimited, MEAL_IMAGE_RATE_LIMITED } from '@/lib/nutri/mealImageGenerateRateLimit.server';
import { MEAL_IMAGE_PROVIDER_CONFIGURATION_ERROR } from '@/lib/nutri/mealImageGenerateFailure';
import { buildMealImageSourceHash, type MealImageRecord } from '@/lib/nutri/mealImageSource';
import {
  findSlotInList,
  isMealImagePendingFresh,
  isMealImageRefeicaoKey,
  isMealImageReadyAndCurrent,
  isSafeMealImageIdPart,
  mealImageRecordFromSlot,
  resolveRequestedSlotId,
  type MealImageRefeicaoKey,
} from '@/lib/nutri/mealImageSlot';
import {
  acquireMealImageGenerationLock,
  finalizeMealImageReady,
  loadMealImagePlano,
  markMealImageFailed,
} from '@/lib/nutri/mealImagePlanoStore.server';

export type MealImageGenerateOk = {
  ok: true;
  generated: boolean;
  reason?: 'already_current' | 'already_pending' | 'source_changed_during_generation';
  mealImage: MealImageRecord;
};

export type MealImageGenerateErr = {
  ok: false;
  code:
    | 'INVALID_INPUT'
    | 'PLANO_NOT_FOUND'
    | 'SLOT_NOT_FOUND'
    | 'MEAL_COMPOSITION_INSUFFICIENT'
    | 'MEAL_COMPOSITION_TOO_LARGE'
    | 'GENERATION_FAILED'
    | 'UPLOAD_FAILED'
    | 'MEAL_IMAGE_RATE_LIMITED'
    | 'MEAL_IMAGE_PROVIDER_CONFIGURATION_ERROR';
  message: string;
  mealImage?: MealImageRecord;
  stopAutomaticQueue?: boolean;
  retryable?: boolean;
};

export type MealImageGenerateResult = MealImageGenerateOk | MealImageGenerateErr;

export type MealImageGenerateInput = {
  patientId: string;
  refeicaoKey: string;
  slotId?: string | null;
  slotIndex?: number | null;
  forceRegenerate?: boolean;
  trigger?: 'manual' | 'automatic';
  actorKind?: 'patient' | 'nutritionist' | 'doctor';
  actorUid?: string;
};

export type MealImageGenerateDeps = {
  now: () => Date;
  loadPlano: (patientId: string) => Promise<Record<string, unknown> | null>;
  acquireLock: (params: {
    patientId: string;
    refeicaoKey: MealImageRefeicaoKey;
    slotId: string;
    sourceHash: string;
    nowIso: string;
    nowMs: number;
    forceRegenerate?: boolean;
  }) => Promise<Awaited<ReturnType<typeof acquireMealImageGenerationLock>>>;
  generateImage: (prompt: string) => Promise<{ buffer: Buffer; mimeType: string }>;
  uploadImage: (params: {
    patientId: string;
    refeicaoKey: string;
    slotId: string;
    sourceHash: string;
    buffer: Buffer;
    mimeType: string;
    generationId: string;
  }) => Promise<{ gcsPath: string }>;
  finalizeReady: (params: {
    patientId: string;
    refeicaoKey: MealImageRefeicaoKey;
    slotId: string;
    sourceHash: string;
    gcsPath: string;
    generatedAt: string;
    generationStartedAt: string;
  }) => Promise<Awaited<ReturnType<typeof finalizeMealImageReady>>>;
  markFailed: (params: {
    patientId: string;
    refeicaoKey: MealImageRefeicaoKey;
    slotId: string;
    sourceHash: string;
    generationStartedAt: string;
    previousGcsPath?: string;
    previousMealImage?: MealImageRecord;
  }) => Promise<MealImageRecord | undefined>;
  logGeneration?: typeof logMealImageGeneration;
  logVertexCall?: typeof logMealImageVertexCall;
  isRateLimited?: (uid: string) => boolean;
  createGenerationId?: (now: Date) => string;
};

export function createDefaultMealImageGenerateDeps(db?: Firestore): MealImageGenerateDeps {
  const firestore = db ?? getFirestoreAdmin();
  return {
    now: () => new Date(),
    loadPlano: (patientId) => loadMealImagePlano(firestore, patientId),
    acquireLock: (params) => acquireMealImageGenerationLock({ db: firestore, ...params }),
    generateImage: (prompt) => generateMealImageWithVertex(prompt),
    uploadImage: uploadMealImageToGcs,
    finalizeReady: (params) => finalizeMealImageReady({ db: firestore, ...params }),
    markFailed: (params) => markMealImageFailed({ db: firestore, ...params }),
    logGeneration: logMealImageGeneration,
    logVertexCall: logMealImageVertexCall,
    isRateLimited: mealImageGenerateRateLimited,
    createGenerationId: createMealImageGenerationId,
  };
}

export async function generateMealImageForOption(
  input: MealImageGenerateInput,
  deps: MealImageGenerateDeps = createDefaultMealImageGenerateDeps()
): Promise<MealImageGenerateResult> {
  const startedAt = Date.now();
  const logGeneration = deps.logGeneration || logMealImageGeneration;
  const logVertexCall = deps.logVertexCall || logMealImageVertexCall;
  const trigger = input.trigger === 'automatic' ? 'automatic' : 'manual';
  const actorKind = input.actorKind;
  const forceRegenerate = Boolean(input.forceRegenerate);
  let logRefeicao = String(input.refeicaoKey || '');
  let logSlot = String(input.slotId || '');

  const emit = (
    result: MealImageLogResult,
    extra?: { generationId?: string; sourceHashPrefix?: string; vertexMs?: number; uploadMs?: number }
  ) => {
    logGeneration({
      result,
      trigger,
      forceRegenerate,
      ...(actorKind ? { actorKind } : {}),
      durationMs: Date.now() - startedAt,
      patientKey: mealImageHashPrefix(String(input.patientId || '')),
      refeicaoKey: logRefeicao,
      slotId: logSlot,
      ...extra,
    });
  };

  const patientId = String(input.patientId || '').trim();
  const refeicaoKeyRaw = String(input.refeicaoKey || '').trim();
  if (
    !patientId ||
    !isSafeMealImageIdPart(patientId) ||
    !isMealImageRefeicaoKey(refeicaoKeyRaw)
  ) {
    emit('invalid_input');
    return { ok: false, code: 'INVALID_INPUT', message: 'patientId e refeicaoKey inválidos.' };
  }
  const refeicaoKey: MealImageRefeicaoKey = refeicaoKeyRaw;
  logRefeicao = refeicaoKey;
  const slotId = resolveRequestedSlotId({
    refeicaoKey,
    slotId: input.slotId,
    slotIndex: input.slotIndex,
  });
  if (!slotId || !isSafeMealImageIdPart(slotId)) {
    emit('invalid_input');
    return { ok: false, code: 'INVALID_INPUT', message: 'Informe slotId ou slotIndex (1–5) da refeição.' };
  }
  logSlot = slotId;

  const plano = await deps.loadPlano(patientId);
  if (!plano) {
    emit('invalid_input');
    return { ok: false, code: 'PLANO_NOT_FOUND', message: 'Plano nutricional não encontrado.' };
  }

  const opcoesSlots = (plano.opcoesSlots || {}) as Record<string, unknown>;
  const found = findSlotInList(opcoesSlots[refeicaoKey], refeicaoKey, slotId);
  if (!found) {
    emit('invalid_input');
    return { ok: false, code: 'SLOT_NOT_FOUND', message: 'Opção da refeição não encontrada.' };
  }

  const limits = assertMealImageSourceWithinLimits(found.slot);
  if (!limits.ok) {
    emit('invalid_source');
    return {
      ok: false,
      code: MEAL_COMPOSITION_TOO_LARGE,
      message: 'A composição do prato é grande demais para gerar a imagem.',
    };
  }

  const source = limits.source;
  const sourceHash = buildMealImageSourceHash(found.slot);
  const sourceHashPrefix = mealImageHashPrefix(sourceHash);
  if (!source || !sourceHash) {
    emit('invalid_source', { sourceHashPrefix });
    return {
      ok: false,
      code: 'MEAL_COMPOSITION_INSUFFICIENT',
      message: 'A opção não tem composição suficiente para gerar a imagem.',
    };
  }

  const existing = mealImageRecordFromSlot(found.slot);
  const now = deps.now();
  if (!forceRegenerate && isMealImageReadyAndCurrent(existing, sourceHash) && existing) {
    emit('already_current', { sourceHashPrefix });
    return { ok: true, generated: false, reason: 'already_current', mealImage: existing };
  }
  if (isMealImagePendingFresh(existing, sourceHash, now.getTime()) && existing) {
    emit('already_pending', { sourceHashPrefix });
    return { ok: true, generated: false, reason: 'already_pending', mealImage: existing };
  }

  const prompt = buildMealImagePrompt(found.slot);
  if (!prompt) {
    emit('invalid_source', { sourceHashPrefix });
    return {
      ok: false,
      code: 'MEAL_COMPOSITION_INSUFFICIENT',
      message: 'A opção não tem composição suficiente para gerar a imagem.',
    };
  }
  if (prompt.length > MEAL_IMAGE_MAX_PROMPT_CHARS) {
    emit('invalid_source', { sourceHashPrefix });
    return {
      ok: false,
      code: MEAL_COMPOSITION_TOO_LARGE,
      message: 'A composição do prato é grande demais para gerar a imagem.',
    };
  }

  const checkRate = deps.isRateLimited || mealImageGenerateRateLimited;
  if (input.actorUid && checkRate(input.actorUid)) {
    emit('rate_limited', { sourceHashPrefix });
    return {
      ok: false,
      code: MEAL_IMAGE_RATE_LIMITED,
      message: 'Muitas tentativas de geração. Tente novamente em alguns minutos.',
    };
  }

  const nowIso = now.toISOString();
  const lock = await deps.acquireLock({
    patientId,
    refeicaoKey,
    slotId,
    sourceHash,
    nowIso,
    nowMs: now.getTime(),
    ...(forceRegenerate ? { forceRegenerate: true } : {}),
  });

  if (lock.kind === 'missing') {
    emit('invalid_input', { sourceHashPrefix });
    return { ok: false, code: 'SLOT_NOT_FOUND', message: 'Opção da refeição não encontrada.' };
  }
  if (lock.kind === 'insufficient') {
    emit('invalid_source', { sourceHashPrefix });
    return {
      ok: false,
      code: 'MEAL_COMPOSITION_INSUFFICIENT',
      message: 'A opção não tem composição suficiente para gerar a imagem.',
    };
  }
  if (lock.kind === 'already_current') {
    emit('already_current', { sourceHashPrefix });
    return { ok: true, generated: false, reason: 'already_current', mealImage: lock.mealImage };
  }
  if (lock.kind === 'already_pending') {
    emit('already_pending', { sourceHashPrefix });
    return { ok: true, generated: false, reason: 'already_pending', mealImage: lock.mealImage };
  }
  if (lock.kind === 'source_changed') {
    emit('source_changed', { sourceHashPrefix });
    return {
      ok: true,
      generated: false,
      reason: 'source_changed_during_generation',
      mealImage: lock.mealImage || { sourceHash, status: 'failed' },
    };
  }

  const createId = deps.createGenerationId || createMealImageGenerationId;
  const generationId = createId(now);

  let image: { buffer: Buffer; mimeType: string };
  const vertexStarted = Date.now();
  logVertexCall({
    generationId,
    trigger,
    forceRegenerate,
    ...(actorKind ? { actorKind } : {}),
  });
  try {
    image = await deps.generateImage(prompt);
    if (!image.buffer?.length) {
      throw new Error('Imagem vazia');
    }
  } catch (error) {
    console.error('[mealImage] geração falhou', error instanceof Error ? error.message : 'erro');
    const failed = await deps.markFailed({
      patientId,
      refeicaoKey,
      slotId,
      sourceHash,
      generationStartedAt: lock.generationStartedAt,
      previousGcsPath: lock.previousGcsPath,
      previousMealImage: lock.previousMealImage,
    });
    const systemic =
      error instanceof MealImageVertexError &&
      (error.systemic || error.code === 'VERTEX_CONFIG' || error.code === 'VERTEX_AUTH');
    emit(systemic ? 'failed_vertex_configuration' : 'failed_vertex', {
      generationId,
      sourceHashPrefix,
      vertexMs: Date.now() - vertexStarted,
    });
    if (systemic) {
      return {
        ok: false,
        code: MEAL_IMAGE_PROVIDER_CONFIGURATION_ERROR,
        message: 'Não foi possível gerar a imagem do prato.',
        mealImage: failed,
        stopAutomaticQueue: true,
        retryable: false,
      };
    }
    return {
      ok: false,
      code: 'GENERATION_FAILED',
      message: 'Não foi possível gerar a imagem do prato.',
      mealImage: failed,
    };
  }
  const vertexMs = Date.now() - vertexStarted;

  let gcsPath: string;
  const uploadStarted = Date.now();
  try {
    const uploaded = await deps.uploadImage({
      patientId,
      refeicaoKey,
      slotId,
      sourceHash,
      buffer: image.buffer,
      mimeType: image.mimeType,
      generationId,
    });
    gcsPath = uploaded.gcsPath;
  } catch (error) {
    console.error('[mealImage] upload falhou', error instanceof Error ? error.message : 'erro');
    const failed = await deps.markFailed({
      patientId,
      refeicaoKey,
      slotId,
      sourceHash,
      generationStartedAt: lock.generationStartedAt,
      previousGcsPath: lock.previousGcsPath,
      previousMealImage: lock.previousMealImage,
    });
    emit('failed_storage', {
      generationId,
      sourceHashPrefix,
      vertexMs,
      uploadMs: Date.now() - uploadStarted,
    });
    return {
      ok: false,
      code: 'UPLOAD_FAILED',
      message: 'Não foi possível salvar a imagem do prato.',
      mealImage: failed,
    };
  }
  const uploadMs = Date.now() - uploadStarted;

  const finalized = await deps.finalizeReady({
    patientId,
    refeicaoKey,
    slotId,
    sourceHash,
    gcsPath,
    generatedAt: deps.now().toISOString(),
    generationStartedAt: lock.generationStartedAt,
  });

  if (finalized.kind === 'source_changed') {
    emit('source_changed', { generationId, sourceHashPrefix, vertexMs, uploadMs });
    return {
      ok: true,
      generated: false,
      reason: 'source_changed_during_generation',
      mealImage: finalized.mealImage || {
        ...(lock.previousGcsPath ? { gcsPath: lock.previousGcsPath } : {}),
        sourceHash,
        status: 'failed',
      },
    };
  }
  if (finalized.kind === 'missing' || !finalized.mealImage) {
    emit('invalid_input', { generationId, sourceHashPrefix, vertexMs, uploadMs });
    return { ok: false, code: 'SLOT_NOT_FOUND', message: 'Opção da refeição não encontrada.' };
  }
  emit('generated', { generationId, sourceHashPrefix, vertexMs, uploadMs });
  return { ok: true, generated: true, mealImage: finalized.mealImage };
}
