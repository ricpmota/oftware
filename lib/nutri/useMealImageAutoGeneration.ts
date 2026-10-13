'use client';

import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { auth } from '@/lib/firebase';
import { requestMealImageGeneration } from '@/lib/nutri/mealImageGenerateClient';
import type { MealImageRecord } from '@/lib/nutri/mealImageSource';
import {
  clearMealImageAutoAttemptedSession,
  collectMealImageAutoJobs,
  cancelMealImageAutoAttemptedClear,
  MEAL_IMAGE_AUTO_CONCURRENCY,
  mealImageAutoAttemptedSessionFor,
  onMealImageAutoGenerationVisitEnd,
  onMealImageAutoGenerationVisitStart,
  runMealImageAutoQueue,
  shouldApplyMealImageClientUpdate,
} from '@/lib/nutri/mealImageAutoQueue';

/**
 * Fila automática no Cardápio quando o paciente tem nutricionista.
 * Snapshot dos jobs na montagem do efeito — não recria a fila a cada patch de mealImage.
 */
export function useMealImageAutoGeneration(params: {
  enabled: boolean;
  patientId: string;
  opcoesSlots: Record<string, unknown> | null | undefined;
  priorityRef: MutableRefObject<{ refeicaoKey: string; slotId: string }>;
  generatingRef: MutableRefObject<Record<string, boolean>>;
  setGeneratingMealImages: Dispatch<SetStateAction<Record<string, boolean>>>;
  applyMealImage: (refeicaoKey: string, slotId: string, mealImage: MealImageRecord) => void;
  /** Grava o cardápio visível no Firestore antes do POST — o servidor só lê o documento. */
  prepareSlots?: () => Promise<Record<string, unknown> | null | undefined>;
}): void {
  const opcoesSlotsRef = useRef(params.opcoesSlots);
  opcoesSlotsRef.current = params.opcoesSlots;
  const applyRef = useRef(params.applyMealImage);
  applyRef.current = params.applyMealImage;
  const setGeneratingRef = useRef(params.setGeneratingMealImages);
  setGeneratingRef.current = params.setGeneratingMealImages;
  const generatingRef = params.generatingRef;
  const priorityRef = params.priorityRef;
  const patientIdRef = useRef(params.patientId);
  patientIdRef.current = params.patientId;

  const prepareSlotsRef = useRef(params.prepareSlots);
  prepareSlotsRef.current = params.prepareSlots;

  useEffect(() => {
    if (!params.enabled || !params.patientId) {
      cancelMealImageAutoAttemptedClear(params.patientId);
      clearMealImageAutoAttemptedSession(params.patientId);
      return;
    }

    const boundPatientId = params.patientId;
    onMealImageAutoGenerationVisitStart(boundPatientId);
    const autoAttempted = mealImageAutoAttemptedSessionFor(boundPatientId);
    let cancelled = false;

    const run = async () => {
      let opcoesSlots = opcoesSlotsRef.current;
      const prepareSlots = prepareSlotsRef.current;
      if (prepareSlots) {
        try {
          const prepared = await prepareSlots();
          if (prepared && typeof prepared === 'object') {
            opcoesSlots = prepared;
            opcoesSlotsRef.current = prepared;
          }
        } catch {
          // Segue com o snapshot em memória; o POST ainda pode funcionar se o plano já estiver salvo.
        }
      }
      if (cancelled) return;
      const jobs = collectMealImageAutoJobs({
        opcoesSlots,
        priority: priorityRef.current,
        generatingKeys: Object.entries(generatingRef.current)
          .filter(([, busy]) => busy)
          .map(([key]) => key),
        autoAttempted,
      });

      await runMealImageAutoQueue({
        jobs,
        concurrency: MEAL_IMAGE_AUTO_CONCURRENCY,
        autoAttempted,
        isCancelled: () => cancelled,
        isGenerating: (slotKey) => Boolean(generatingRef.current[slotKey]),
        setGenerating: (slotKey, busy) => {
          if (cancelled) return;
          if (
            !shouldApplyMealImageClientUpdate({
              boundPatientId,
              currentPatientId: patientIdRef.current,
            })
          ) {
            return;
          }
          setGeneratingRef.current((prev) => {
            if (busy) {
              if (prev[slotKey]) return prev;
              return { ...prev, [slotKey]: true };
            }
            if (!prev[slotKey]) return prev;
            const next = { ...prev };
            delete next[slotKey];
            return next;
          });
        },
        request: (job) =>
          requestMealImageGeneration(
            {
              patientId: boundPatientId,
              refeicaoKey: job.refeicaoKey,
              slotId: job.slotId,
              trigger: 'automatic',
            },
            { getToken: async () => (await auth.currentUser?.getIdToken()) || null }
          ),
        onSlotResult: (job, result) => {
          if (
            !shouldApplyMealImageClientUpdate({
              cancelled,
              boundPatientId,
              currentPatientId: patientIdRef.current,
            })
          ) {
            return;
          }
          if (result.mealImage) {
            applyRef.current(job.refeicaoKey, job.slotId, result.mealImage);
            return;
          }
          if (!result.ok) {
            applyRef.current(job.refeicaoKey, job.slotId, {
              status: 'failed',
              sourceHash: job.sourceHash,
            });
          }
        },
      });
    };

    void run();

    return () => {
      cancelled = true;
      onMealImageAutoGenerationVisitEnd(boundPatientId);
    };
    // Snapshot intencional: plano/mealImage não rearmam a fila.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.enabled, params.patientId]);
}
