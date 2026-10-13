import { NextRequest, NextResponse } from 'next/server';
import { requireMealImageAccess } from '@/lib/nutri/mealImageAccess.server';
import { generateMealImageForOption } from '@/lib/nutri/mealImageGenerateService.server';
import {
  assertPatientMayRequestMealImageGeneration,
  assertMealImageForceRegenerate,
  parseMealImageGenerateTrigger,
  parseMealImageForceRegenerate,
  INVALID_MEAL_IMAGE_TRIGGER,
} from '@/lib/nutri/mealImageGeneratePolicy.server';
import {
  isMealImageGenerationEnabled,
  MEAL_IMAGE_GENERATION_DISABLED_CODE,
} from '@/lib/nutri/mealImageFlags.server';
import { logMealImageGeneration, mealImageHashPrefix } from '@/lib/nutri/mealImageObservability.server';
import { MEAL_IMAGE_RATE_LIMITED } from '@/lib/nutri/mealImageGenerateRateLimit.server';

export const runtime = 'nodejs';
export const maxDuration = 120;

export const MEAL_IMAGE_BATCH_NOT_SUPPORTED = 'MEAL_IMAGE_BATCH_NOT_SUPPORTED';

function isBatchMealImageGenerateBody(body: unknown): boolean {
  if (Array.isArray(body)) return true;
  if (!body || typeof body !== 'object') return false;
  const rec = body as Record<string, unknown>;
  return [rec.slots, rec.items, rec.slotIds, rec.requests, rec.batch].some((value) => Array.isArray(value));
}

/**
 * POST /api/nutri/meal-image/generate
 * Body: { patientId, refeicaoKey, slotId?, slotIndex?, trigger?, forceRegenerate? }
 * Uma requisição = 1 paciente, 1 refeição, 1 slot. Não aceita texto do prato.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido.' }, { status: 400 });
  }

  if (isBatchMealImageGenerateBody(body)) {
    return NextResponse.json(
      {
        ok: false,
        code: MEAL_IMAGE_BATCH_NOT_SUPPORTED,
        error: 'A geração aceita apenas um paciente, uma refeição e um slot por requisição.',
      },
      { status: 400 }
    );
  }

  const payload = (body && typeof body === 'object' ? body : {}) as {
    patientId?: unknown;
    refeicaoKey?: unknown;
    slotId?: unknown;
    slotIndex?: unknown;
    trigger?: unknown;
    forceRegenerate?: unknown;
  };

  const patientId = typeof payload.patientId === 'string' ? payload.patientId : '';
  const auth = await requireMealImageAccess(request, patientId);
  if (auth instanceof NextResponse) return auth;

  const refeicaoKey = typeof payload.refeicaoKey === 'string' ? payload.refeicaoKey : '';
  const slotId = typeof payload.slotId === 'string' ? payload.slotId : '';

  if (!isMealImageGenerationEnabled()) {
    logMealImageGeneration({
      actorKind: auth.role,
      trigger: 'manual',
      forceRegenerate: false,
      refeicaoKey,
      slotId,
      patientKey: mealImageHashPrefix(auth.pacienteDocId),
      result: 'feature_disabled',
    });
    return NextResponse.json(
      {
        ok: false,
        code: MEAL_IMAGE_GENERATION_DISABLED_CODE,
        error: 'A geração de imagens do cardápio está temporariamente desligada.',
      },
      { status: 503 }
    );
  }

  const trigger = parseMealImageGenerateTrigger(payload.trigger);
  if (trigger === 'invalid') {
    return NextResponse.json(
      { ok: false, code: INVALID_MEAL_IMAGE_TRIGGER, error: 'Trigger de geração inválido.' },
      { status: 400 }
    );
  }

  const forceRegenerate = parseMealImageForceRegenerate(payload.forceRegenerate);
  if (forceRegenerate) {
    const forcePolicy = assertMealImageForceRegenerate({ access: auth, trigger });
    if (!forcePolicy.ok) {
      logMealImageGeneration({
        actorKind: auth.role,
        trigger,
        forceRegenerate: true,
        refeicaoKey,
        slotId,
        patientKey: mealImageHashPrefix(auth.pacienteDocId),
        result: 'forbidden',
      });
      return NextResponse.json(
        { ok: false, code: forcePolicy.code, error: forcePolicy.error },
        { status: forcePolicy.status }
      );
    }
  } else {
    const policy = await assertPatientMayRequestMealImageGeneration({ access: auth, trigger });
    if (!policy.ok) {
      logMealImageGeneration({
        actorKind: auth.role,
        trigger,
        forceRegenerate: false,
        refeicaoKey,
        slotId,
        patientKey: mealImageHashPrefix(auth.pacienteDocId),
        result: 'forbidden',
      });
      return NextResponse.json(
        { ok: false, code: policy.code, error: policy.error },
        { status: policy.status }
      );
    }
  }

  const result = await generateMealImageForOption({
    patientId: auth.pacienteDocId,
    refeicaoKey,
    slotId: typeof payload.slotId === 'string' ? payload.slotId : null,
    slotIndex: typeof payload.slotIndex === 'number' ? payload.slotIndex : null,
    trigger,
    actorKind: auth.role,
    actorUid: auth.uid,
    ...(forceRegenerate ? { forceRegenerate: true } : {}),
  });

  if (!result.ok) {
    const status =
      result.code === 'INVALID_INPUT' ||
      result.code === 'MEAL_COMPOSITION_INSUFFICIENT' ||
      result.code === 'MEAL_COMPOSITION_TOO_LARGE' ||
      result.code === 'SLOT_NOT_FOUND' ||
      result.code === 'PLANO_NOT_FOUND'
        ? 400
        : result.code === MEAL_IMAGE_RATE_LIMITED
          ? 429
          : 502;
    return NextResponse.json(
      {
        ok: false,
        code: result.code,
        error: result.message,
        ...(result.mealImage ? { mealImage: result.mealImage } : {}),
        ...(result.stopAutomaticQueue ? { stopAutomaticQueue: true } : {}),
        ...(result.retryable === false ? { retryable: false } : {}),
      },
      { status }
    );
  }

  return NextResponse.json({
    ok: true,
    generated: result.generated,
    ...(result.reason ? { reason: result.reason } : {}),
    mealImage: result.mealImage,
  });
}
