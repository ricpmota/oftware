/**
 * POST /api/nutri/meal-image/generate
 * Inflight por slot evita POST duplicado.
 */

import type { MealImageRecord } from '@/lib/nutri/mealImageSource';

export const MEAL_IMAGE_GENERATE_API_PATH = '/api/nutri/meal-image/generate';

export type MealImageGenerateReason =
  | 'already_current'
  | 'already_pending'
  | 'source_changed_during_generation';

export type MealImageGenerateClientOk = {
  ok: true;
  generated: boolean;
  reason?: MealImageGenerateReason;
  mealImage: MealImageRecord;
};

export type MealImageGenerateClientErr = {
  ok: false;
  code: string;
  message: string;
  httpStatus: number;
  mealImage?: MealImageRecord;
  stopAutomaticQueue?: boolean;
  retryable?: boolean;
};

export type MealImageGenerateClientResult = MealImageGenerateClientOk | MealImageGenerateClientErr;

export type MealImageGenerateClientRequest = {
  patientId: string;
  refeicaoKey: string;
  slotId: string;
  trigger?: 'manual' | 'automatic';
  forceRegenerate?: boolean;
};

const inflight = new Map<string, Promise<MealImageGenerateClientResult>>();

export function mealImageGenerateInflightKey(request: MealImageGenerateClientRequest): string {
  return `${request.patientId}:${request.refeicaoKey}:${request.slotId}`;
}

export function clearMealImageGenerateInflight(): void {
  inflight.clear();
}

export type RequestMealImageGenerationDeps = {
  getToken: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
};

export async function requestMealImageGeneration(
  request: MealImageGenerateClientRequest,
  deps: RequestMealImageGenerationDeps
): Promise<MealImageGenerateClientResult> {
  const key = mealImageGenerateInflightKey(request);
  const existing = inflight.get(key);
  if (existing) return existing;

  const run = (async (): Promise<MealImageGenerateClientResult> => {
    const fetchImpl = deps.fetchImpl || fetch;
    const token = await deps.getToken();
    if (!token) {
      return {
        ok: false,
        code: 'UNAUTHENTICATED',
        message: 'Não foi possível gerar a imagem agora. Tente novamente.',
        httpStatus: 401,
      };
    }

    let res: Response;
    try {
      res = await fetchImpl(MEAL_IMAGE_GENERATE_API_PATH, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId: request.patientId,
          refeicaoKey: request.refeicaoKey,
          slotId: request.slotId,
          trigger: request.trigger === 'automatic' ? 'automatic' : 'manual',
          ...(request.forceRegenerate === true ? { forceRegenerate: true } : {}),
        }),
      });
    } catch {
      return {
        ok: false,
        code: 'NETWORK',
        message: 'Não foi possível gerar a imagem agora. Tente novamente.',
        httpStatus: 0,
      };
    }

    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      generated?: boolean;
      reason?: MealImageGenerateReason;
      mealImage?: MealImageRecord;
      code?: string;
      error?: string;
      stopAutomaticQueue?: boolean;
      retryable?: boolean;
    };

    if (!res.ok || json.ok === false) {
      return {
        ok: false,
        code: json.code || 'GENERATE_FAILED',
        message: 'Não foi possível gerar a imagem agora. Tente novamente.',
        httpStatus: res.status,
        ...(json.mealImage ? { mealImage: json.mealImage } : {}),
        ...(json.stopAutomaticQueue === true ? { stopAutomaticQueue: true } : {}),
        ...(json.retryable === false ? { retryable: false } : {}),
      };
    }

    return {
      ok: true,
      generated: Boolean(json.generated),
      ...(json.reason ? { reason: json.reason } : {}),
      mealImage: json.mealImage || { status: json.generated ? 'ready' : undefined },
    };
  })();

  inflight.set(key, run);
  try {
    return await run;
  } finally {
    inflight.delete(key);
  }
}
