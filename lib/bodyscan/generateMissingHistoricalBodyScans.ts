/**
 * Gera BodyScans históricos ausentes a partir de progressPhotos já existentes.
 * Server-only. Reutiliza tryGenerateBodyScan (idempotência).
 * Não exige consentimento BodyScan separado — fotos existentes bastam.
 */

import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  discoverHistoricalBodyScanWeeks,
  mapWithConcurrency,
  type HistoricalDiscoverySummary,
  type HistoricalPhotoLike,
} from '@/lib/bodyscan/discoverHistoricalBodyScanWeeks';
import { BODYSCAN_SUBCOLLECTION } from '@/lib/bodyscan/bodyScanTypes';
import { tryGenerateBodyScan, type TryGenerateBodyScanResult } from '@/lib/bodyscan/tryGenerateBodyScan';

const DEFAULT_CONCURRENCY = 2;

export type HistoricalBackfillResult = HistoricalDiscoverySummary & {
  generated: number;
  skipped: number;
  failed: number;
  /** Sempre true: BodyScan não exige mais consentimento separado. */
  consentAccepted: boolean;
  results: Array<{ week: number; action: TryGenerateBodyScanResult['action']; reason?: string }>;
};

function createdAtMs(v: unknown): number {
  if (!v) return 0;
  if (typeof (v as { toMillis?: () => number }).toMillis === 'function') {
    return (v as { toMillis: () => number }).toMillis();
  }
  if (typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate().getTime();
  }
  if (v instanceof Date) return v.getTime();
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export async function discoverHistoricalBodyScansForPatient(
  patientId: string
): Promise<HistoricalDiscoverySummary & { consentAccepted: boolean }> {
  const db = getFirestoreAdmin();
  const pid = patientId.trim();
  // BodyScan liberado com fotos existentes — independente de consentimento separado
  // ou de compartilharComMedico.
  const consentAccepted = true;

  const pacienteSnap = await db.collection('pacientes_completos').doc(pid).get();
  if (!pacienteSnap.exists) {
    return {
      consentAccepted,
      foundPhotoWeeks: 0,
      weeksWithFrontAndSide: 0,
      eligibleWeeks: 0,
      alreadyCompleted: 0,
      pendingGeneration: 0,
      weeks: [],
      pendingWeeks: [],
    };
  }

  const paciente = pacienteSnap.data() || {};
  const heightCm = Number(
    (paciente.dadosClinicos as { medidasIniciais?: { altura?: number } } | undefined)
      ?.medidasIniciais?.altura
  );
  const evolucao = Array.isArray(paciente.evolucaoSeguimento) ? paciente.evolucaoSeguimento : [];

  const photosSnap = await pacienteSnap.ref.collection('progressPhotos').get();
  const photos: HistoricalPhotoLike[] = photosSnap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      tipo: String(data.tipo || ''),
      semana: typeof data.semana === 'number' ? data.semana : null,
      dataAplicacao: typeof data.dataAplicacao === 'string' ? data.dataAplicacao : null,
      createdAtMs: createdAtMs(data.createdAt),
    };
  });

  const scansSnap = await pacienteSnap.ref.collection(BODYSCAN_SUBCOLLECTION).get();
  const existingScans = scansSnap.docs.map((d) => {
    const data = d.data() as Record<string, unknown>;
    const input = (data.input || {}) as { frontPhotoId?: string; sidePhotoId?: string };
    return {
      week: Number(data.week),
      status: data.status as 'processing' | 'completed' | 'failed',
      analysisAvailable: data.analysisAvailable !== false,
      frontPhotoId: input.frontPhotoId,
      sidePhotoId: input.sidePhotoId,
    };
  });

  const discovery = discoverHistoricalBodyScanWeeks({
    photos,
    evolucao: evolucao.map((e: Record<string, unknown>) => ({
      weekIndex: typeof e.weekIndex === 'number' ? e.weekIndex : undefined,
      numeroSemana: typeof e.numeroSemana === 'number' ? e.numeroSemana : undefined,
      peso: typeof e.peso === 'number' ? e.peso : null,
      circunferenciaAbdominal:
        typeof e.circunferenciaAbdominal === 'number' ? e.circunferenciaAbdominal : null,
      dataRegistro:
        typeof e.dataRegistro === 'string'
          ? e.dataRegistro
          : e.dataRegistro && typeof (e.dataRegistro as { toDate?: () => Date }).toDate === 'function'
            ? (e.dataRegistro as { toDate: () => Date }).toDate().toISOString().slice(0, 10)
            : null,
    })),
    heightCm: Number.isFinite(heightCm) ? heightCm : null,
    existingScans,
  });

  return { ...discovery, consentAccepted };
}

/**
 * Descobre semanas elegíveis e gera BodyScans ausentes com concorrência limitada.
 */
export async function generateMissingHistoricalBodyScans(params: {
  patientId: string;
  concurrency?: number;
  /** Se true, só descobre — não chama Gemini. */
  dryRun?: boolean;
}): Promise<HistoricalBackfillResult> {
  const patientId = params.patientId.trim();
  const concurrency = params.concurrency ?? DEFAULT_CONCURRENCY;
  const discovery = await discoverHistoricalBodyScansForPatient(patientId);

  if (params.dryRun || discovery.pendingWeeks.length === 0) {
    return {
      ...discovery,
      generated: 0,
      skipped: discovery.alreadyCompleted,
      failed: 0,
      results: [],
    };
  }

  const weekMeta = new Map(discovery.weeks.map((w) => [w.week, w] as const));

  const results = await mapWithConcurrency(
    discovery.pendingWeeks,
    concurrency,
    async (week) => {
      const meta = weekMeta.get(week);
      console.info('[BodyScan Backfill]', { patientId, semana: week, status: 'start' });
      const result = await tryGenerateBodyScan({
        patientId,
        week,
        date: meta?.date,
      });
      console.info('[BodyScan Backfill]', {
        patientId,
        semana: week,
        status: result.action,
        reason: 'reason' in result ? result.reason : undefined,
      });
      return {
        week,
        action: result.action,
        reason: 'reason' in result ? result.reason : undefined,
      };
    }
  );

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  for (const r of results) {
    if (r.action === 'completed') generated += 1;
    else if (r.action === 'failed') failed += 1;
    else skipped += 1;
  }

  return {
    ...discovery,
    generated,
    skipped: skipped + discovery.alreadyCompleted,
    failed,
    results,
  };
}
