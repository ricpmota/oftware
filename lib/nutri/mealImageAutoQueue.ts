/**
 * Fila de geração automática de fotos do cardápio.
 * Sem UI. Concorrência limitada. Sem forceRegenerate.
 */

import { slotCardapioEstaVazio } from '@/lib/nutri/cardapioPrecedenciaNutri';
import { buildMealImageSourceHash, parseMealImageRecord } from '@/lib/nutri/mealImageSource';
import {
  isMealImagePendingFresh,
  isMealImageReadyAndCurrent,
  isMealImageRefeicaoKey,
  MEAL_IMAGE_REFEICAO_KEYS,
  mealImageRecordFromSlot,
  normalizeMealImageSlotList,
  slotIdFor,
  type MealImageRefeicaoKey,
  type MealImageSlot,
} from '@/lib/nutri/mealImageSlot';
import { mealImageGenerationSlotKey } from '@/lib/nutri/mealImageGenerateEligibility';
import type { MealImageGenerateClientResult } from '@/lib/nutri/mealImageGenerateClient';
import { shouldStopMealImageAutoQueue } from '@/lib/nutri/mealImageGenerateFailure';

export const MEAL_IMAGE_AUTO_CONCURRENCY = 1;

/** Atraso para limpar autoAttempted no unmount real, sem perder o remount do Strict Mode. */
export const MEAL_IMAGE_AUTO_ATTEMPTED_CLEAR_DELAY_MS = 400;

const autoAttemptedSession = new Map<string, Set<string>>();
const pendingAutoAttemptedClears = new Map<string, ReturnType<typeof setTimeout>>();

/** Tentativas desta sessão de Cardápio — sobrevive ao remount do Strict Mode. */
export function mealImageAutoAttemptedSessionFor(patientId: string): Set<string> {
  const id = String(patientId || '').trim();
  if (!id) return new Set();
  let set = autoAttemptedSession.get(id);
  if (!set) {
    set = new Set();
    autoAttemptedSession.set(id, set);
  }
  return set;
}

export function clearMealImageAutoAttemptedSession(patientId?: string): void {
  if (patientId) {
    const id = String(patientId || '').trim();
    if (!id) return;
    autoAttemptedSession.delete(id);
    return;
  }
  autoAttemptedSession.clear();
}

export function cancelMealImageAutoAttemptedClear(patientId?: string): void {
  const id = String(patientId || '').trim();
  if (!id) {
    for (const timer of pendingAutoAttemptedClears.values()) clearTimeout(timer);
    pendingAutoAttemptedClears.clear();
    return;
  }
  const timer = pendingAutoAttemptedClears.get(id);
  if (timer) {
    clearTimeout(timer);
    pendingAutoAttemptedClears.delete(id);
  }
}

/** Strict Mode remount cancela; saída real do Cardápio deixa expirar e limpa a sessão. */
export function scheduleMealImageAutoAttemptedClear(
  patientId: string,
  delayMs = MEAL_IMAGE_AUTO_ATTEMPTED_CLEAR_DELAY_MS
): void {
  const id = String(patientId || '').trim();
  if (!id) return;
  cancelMealImageAutoAttemptedClear(id);
  const timer = setTimeout(() => {
    pendingAutoAttemptedClears.delete(id);
    clearMealImageAutoAttemptedSession(id);
  }, delayMs);
  pendingAutoAttemptedClears.set(id, timer);
}

/** Resultado atrasado do paciente A não pode patchar o plano B nem estado após unmount. */
export function shouldApplyMealImageClientUpdate(params: {
  cancelled?: boolean;
  boundPatientId: string;
  currentPatientId: string;
}): boolean {
  if (params.cancelled) return false;
  const bound = String(params.boundPatientId || '').trim();
  const current = String(params.currentPatientId || '').trim();
  return Boolean(bound) && bound === current;
}

export function onMealImageAutoGenerationVisitStart(patientId: string): void {
  cancelMealImageAutoAttemptedClear(patientId);
}

export function onMealImageAutoGenerationVisitEnd(patientId: string): void {
  scheduleMealImageAutoAttemptedClear(patientId);
}

export type MealImageAutoJob = {
  refeicaoKey: MealImageRefeicaoKey;
  slotId: string;
  sourceHash: string;
};

export function mealImageAutoAttemptKey(
  refeicaoKey: string,
  slotId: string,
  sourceHash: string
): string {
  return `${refeicaoKey}:${slotId}:${sourceHash}`;
}

export function shouldRunMealImageAutoGeneration(params: {
  hasLinkedNutritionist: boolean;
  activeTab?: string;
  onlyChatNutri?: boolean;
  patientId?: string;
  hasPlano?: boolean;
}): boolean {
  return Boolean(
    params.hasLinkedNutritionist &&
      params.activeTab === 'cardapio' &&
      !params.onlyChatNutri &&
      params.patientId &&
      params.hasPlano
  );
}

export function isMealImageAutoEligible(params: {
  slot: MealImageSlot | null | undefined;
  refeicaoKey: MealImageRefeicaoKey;
  slotId: string;
  nowMs: number;
  generatingKeys?: ReadonlySet<string>;
  autoAttempted?: ReadonlySet<string>;
}): boolean {
  const slot = params.slot;
  if (!slot) return false;
  if (slotCardapioEstaVazio(slot)) return false;
  const sourceHash = buildMealImageSourceHash(slot);
  if (!sourceHash) return false;
  const mealImage = mealImageRecordFromSlot(slot) || parseMealImageRecord(slot.mealImage);
  if (isMealImageReadyAndCurrent(mealImage, sourceHash)) return false;
  if (isMealImagePendingFresh(mealImage, sourceHash, params.nowMs)) return false;
  const slotKey = mealImageGenerationSlotKey(params.refeicaoKey, params.slotId);
  if (params.generatingKeys?.has(slotKey)) return false;
  const attemptKey = mealImageAutoAttemptKey(params.refeicaoKey, params.slotId, sourceHash);
  if (params.autoAttempted?.has(attemptKey)) return false;
  return true;
}

function slotsForMeal(
  opcoesSlots: Record<string, unknown> | null | undefined,
  refeicaoKey: MealImageRefeicaoKey
): MealImageSlot[] {
  return normalizeMealImageSlotList(opcoesSlots?.[refeicaoKey]);
}

function orderedMealKeys(priorityKey?: string | null): MealImageRefeicaoKey[] {
  const priority =
    typeof priorityKey === 'string' && isMealImageRefeicaoKey(priorityKey) ? priorityKey : null;
  if (!priority) return [...MEAL_IMAGE_REFEICAO_KEYS];
  return [priority, ...MEAL_IMAGE_REFEICAO_KEYS.filter((key) => key !== priority)];
}

/** Snapshot estável: refeição visível primeiro, depois as demais na ordem do Cardápio. */
export function collectMealImageAutoJobs(params: {
  opcoesSlots: Record<string, unknown> | null | undefined;
  priority?: { refeicaoKey: string; slotId: string } | null;
  nowMs?: number;
  generatingKeys?: Iterable<string>;
  autoAttempted?: ReadonlySet<string>;
}): MealImageAutoJob[] {
  const nowMs = params.nowMs ?? Date.now();
  const generatingKeys = new Set(
    [...(params.generatingKeys || [])].filter((key) => key && key.length > 0)
  );
  const autoAttempted = params.autoAttempted;
  const jobs: MealImageAutoJob[] = [];
  const seen = new Set<string>();

  for (const refeicaoKey of orderedMealKeys(params.priority?.refeicaoKey)) {
    const slots = slotsForMeal(params.opcoesSlots, refeicaoKey);
    const indexed = slots.map((slot, index) => ({
      slot,
      slotId: String(slot.id || '').trim() || slotIdFor(refeicaoKey, index + 1),
    }));
    const priorityId =
      params.priority?.refeicaoKey === refeicaoKey ? String(params.priority.slotId || '').trim() : '';
    const ordered = priorityId
      ? [
          ...indexed.filter((item) => item.slotId === priorityId),
          ...indexed.filter((item) => item.slotId !== priorityId),
        ]
      : indexed;

    for (const item of ordered) {
      if (seen.has(`${refeicaoKey}:${item.slotId}`)) continue;
      if (
        !isMealImageAutoEligible({
          slot: item.slot,
          refeicaoKey,
          slotId: item.slotId,
          nowMs,
          generatingKeys,
          autoAttempted,
        })
      ) {
        continue;
      }
      seen.add(`${refeicaoKey}:${item.slotId}`);
      jobs.push({
        refeicaoKey,
        slotId: item.slotId,
        sourceHash: buildMealImageSourceHash(item.slot),
      });
    }
  }
  return jobs;
}

export async function runMealImageAutoQueue(params: {
  jobs: MealImageAutoJob[];
  concurrency?: number;
  autoAttempted: Set<string>;
  isCancelled: () => boolean;
  isGenerating: (slotKey: string) => boolean;
  setGenerating: (slotKey: string, busy: boolean) => void;
  request: (job: MealImageAutoJob) => Promise<MealImageGenerateClientResult>;
  onSlotResult: (job: MealImageAutoJob, result: MealImageGenerateClientResult) => void;
  onMaxInflight?: (n: number) => void;
}): Promise<void> {
  const concurrency = Math.max(1, params.concurrency ?? MEAL_IMAGE_AUTO_CONCURRENCY);
  let cursor = 0;
  let inflight = 0;
  let maxInflight = 0;
  let stopQueue = false;

  const worker = async () => {
    while (cursor < params.jobs.length) {
      if (params.isCancelled() || stopQueue) return;
      const job = params.jobs[cursor++];
      const attemptKey = mealImageAutoAttemptKey(job.refeicaoKey, job.slotId, job.sourceHash);
      if (params.autoAttempted.has(attemptKey)) continue;

      const slotKey = mealImageGenerationSlotKey(job.refeicaoKey, job.slotId);
      if (params.isGenerating(slotKey)) continue;
      if (params.isCancelled() || stopQueue) return;
      params.autoAttempted.add(attemptKey);

      params.setGenerating(slotKey, true);
      inflight += 1;
      maxInflight = Math.max(maxInflight, inflight);
      params.onMaxInflight?.(maxInflight);
      try {
        const result = await params.request(job);
        params.onSlotResult(job, result);
        if (shouldStopMealImageAutoQueue(result)) {
          stopQueue = true;
          return;
        }
      } catch {
        params.onSlotResult(job, {
          ok: false,
          code: 'NETWORK',
          message: 'Não foi possível gerar a imagem agora. Tente novamente.',
          httpStatus: 0,
        });
      } finally {
        inflight -= 1;
        params.setGenerating(slotKey, false);
      }
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, Math.max(params.jobs.length, 1)) }, () =>
    worker()
  );
  await Promise.all(workers);
}
