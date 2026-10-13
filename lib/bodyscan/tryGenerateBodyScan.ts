/**
 * Orquestra geração idempotente do BodyScan para pacienteId + semana.
 * Server-only. Nunca deve quebrar o fluxo de fotos/aplicação.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminStorageBucket, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { calcularImcFromPesoAlturaCm } from '@/lib/meta/medidasIniciaisImc';
import { calculateBodyScanMasses } from '@/lib/bodyscan/bodyScanMasses';
import { prepareBodyScanImageForGemini } from '@/lib/bodyscan/prepareBodyScanImage';
import {
  BODYSCAN_PROMPT_VERSION,
  BODYSCAN_SUBCOLLECTION,
  bodyScanDocIdForWeek,
  type BodyScanDocument,
} from '@/lib/bodyscan/bodyScanTypes';
import { analyzeBodyScanWithGemini } from '@/services/bodyScanGeminiService';

const PROCESSING_LOCK_MS = 5 * 60 * 1000;

export type TryGenerateBodyScanResult =
  | { action: 'skipped'; reason: string }
  | { action: 'processing'; week: number }
  | { action: 'completed'; week: number; analysisAvailable: boolean }
  | { action: 'failed'; week: number; reason: string };

function toDateStr(v: unknown): string | null {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v.trim())) return v.trim().slice(0, 10);
  if (v && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    const d = (v as { toDate: () => Date }).toDate();
    if (!Number.isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const day = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return null;
}

function updatedAtMs(v: unknown): number {
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

async function downloadPhotoBuffer(storagePath: string | undefined, url: string | undefined): Promise<{
  buffer: Buffer;
  mimeType: string;
}> {
  const bucket = getAdminStorageBucket();
  if (storagePath) {
    const [buf] = await bucket.file(storagePath).download();
    const [meta] = await bucket.file(storagePath).getMetadata().catch(() => [null]);
    const mime =
      (meta && typeof (meta as { contentType?: string }).contentType === 'string'
        ? (meta as { contentType: string }).contentType
        : 'image/jpeg') || 'image/jpeg';
    return { buffer: Buffer.from(buf), mimeType: mime };
  }
  if (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha ao baixar foto para BodyScan.');
    const arr = await res.arrayBuffer();
    const mime = res.headers.get('content-type') || 'image/jpeg';
    return { buffer: Buffer.from(arr), mimeType: mime };
  }
  throw new Error('Foto sem storagePath/url.');
}

type ProgressPhotoDoc = {
  id: string;
  tipo: string;
  semana?: number | null;
  dataAplicacao?: string;
  storagePath?: string;
  url?: string;
  createdAt?: unknown;
};

function pickLatestPhoto(photos: ProgressPhotoDoc[], tipo: 'frontal' | 'perfil'): ProgressPhotoDoc | null {
  const filtered = photos.filter((p) => p.tipo === tipo);
  if (filtered.length === 0) return null;
  filtered.sort((a, b) => updatedAtMs(b.createdAt) - updatedAtMs(a.createdAt));
  return filtered[0] || null;
}

/**
 * Tenta gerar BodyScan para a semana. Seguro para chamar após upload/salvar peso.
 * Idempotente: não reprocessa se completed com mesmos photoIds ou processing recente.
 */
export async function tryGenerateBodyScan(params: {
  patientId: string;
  week: number;
  /** Se omitido, usa dataAplicacao das fotos ou dataRegistro do seguimento. */
  date?: string;
}): Promise<TryGenerateBodyScanResult> {
  const patientId = params.patientId.trim();
  const week = Number(params.week);
  if (!patientId || !Number.isFinite(week) || week < 1) {
    return { action: 'skipped', reason: 'paciente/semana inválidos' };
  }

  const db = getFirestoreAdmin();
  const docId = bodyScanDocIdForWeek(week);
  const bodyScanRef = db
    .collection('pacientes_completos')
    .doc(patientId)
    .collection(BODYSCAN_SUBCOLLECTION)
    .doc(docId);

  try {
    // BodyScan é liberado com as fotos existentes — não depende de consentimento
    // separado nem de compartilharComMedico.
    const pacienteSnap = await db.collection('pacientes_completos').doc(patientId).get();
    if (!pacienteSnap.exists) {
      return { action: 'skipped', reason: 'paciente não encontrado' };
    }
    const paciente = pacienteSnap.data() || {};
    const alturaCm = Number(
      (paciente.dadosClinicos as { medidasIniciais?: { altura?: number } } | undefined)?.medidasIniciais
        ?.altura
    );
    if (!Number.isFinite(alturaCm) || alturaCm <= 0) {
      return { action: 'skipped', reason: 'altura inválida' };
    }

    const evolucao = Array.isArray(paciente.evolucaoSeguimento) ? paciente.evolucaoSeguimento : [];
    const registro = evolucao.find(
      (e: { weekIndex?: number; numeroSemana?: number; peso?: number }) =>
        (e.weekIndex ?? e.numeroSemana) === week
    ) as
      | {
          peso?: number;
          circunferenciaAbdominal?: number;
          dataRegistro?: unknown;
        }
      | undefined;

    const weightKg = Number(registro?.peso);
    if (!Number.isFinite(weightKg) || weightKg <= 0) {
      return { action: 'skipped', reason: 'peso da semana ausente' };
    }

    const abdominal =
      registro?.circunferenciaAbdominal != null && Number.isFinite(Number(registro.circunferenciaAbdominal))
        ? Number(registro.circunferenciaAbdominal)
        : undefined;

    const bmi = calcularImcFromPesoAlturaCm(weightKg, alturaCm);
    if (bmi == null) {
      return { action: 'skipped', reason: 'IMC não calculável' };
    }

    const photosSnap = await db
      .collection('pacientes_completos')
      .doc(patientId)
      .collection('progressPhotos')
      .where('semana', '==', week)
      .get();

    const photos: ProgressPhotoDoc[] = photosSnap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        tipo: String(data.tipo || ''),
        semana: typeof data.semana === 'number' ? data.semana : null,
        dataAplicacao: typeof data.dataAplicacao === 'string' ? data.dataAplicacao : undefined,
        storagePath: typeof data.storagePath === 'string' ? data.storagePath : undefined,
        url: typeof data.url === 'string' ? data.url : undefined,
        createdAt: data.createdAt,
      };
    });

    const front = pickLatestPhoto(photos, 'frontal');
    const side = pickLatestPhoto(photos, 'perfil');
    if (!front || !side) {
      return { action: 'skipped', reason: !front && !side ? 'faltam fotos' : !front ? 'falta frontal' : 'falta perfil' };
    }

    const date =
      params.date ||
      front.dataAplicacao ||
      side.dataAplicacao ||
      toDateStr(registro?.dataRegistro) ||
      new Date().toISOString().slice(0, 10);

    const existingSnap = await bodyScanRef.get();
    const existing = existingSnap.exists ? (existingSnap.data() as BodyScanDocument) : null;

    if (existing?.status === 'completed' && existing.analysisAvailable !== false) {
      const samePhotos =
        existing.input?.frontPhotoId === front.id && existing.input?.sidePhotoId === side.id;
      if (samePhotos) {
        return { action: 'skipped', reason: 'BodyScan já concluído para as mesmas fotos' };
      }
    }

    if (existing?.status === 'processing') {
      const age = Date.now() - updatedAtMs(existing.updatedAt);
      if (age >= 0 && age < PROCESSING_LOCK_MS) {
        return { action: 'skipped', reason: 'BodyScan já em processamento' };
      }
    }

    const input = {
      weightKg,
      ...(abdominal != null ? { abdominalCircumferenceCm: abdominal } : {}),
      heightCm: alturaCm,
      bmi,
      frontPhotoId: front.id,
      sidePhotoId: side.id,
    };

    // Lock idempotente
    const locked = await db.runTransaction(async (tx) => {
      const fresh = await tx.get(bodyScanRef);
      const cur = fresh.exists ? (fresh.data() as BodyScanDocument) : null;
      if (
        cur?.status === 'completed' &&
        cur.analysisAvailable !== false &&
        cur.input?.frontPhotoId === front.id &&
        cur.input?.sidePhotoId === side.id
      ) {
        return false;
      }
      if (cur?.status === 'processing') {
        const age = Date.now() - updatedAtMs(cur.updatedAt);
        if (age >= 0 && age < PROCESSING_LOCK_MS) return false;
      }
      tx.set(
        bodyScanRef,
        {
          patientId,
          week,
          date,
          status: 'processing',
          analysisAvailable: false,
          unavailableReason: null,
          input,
          promptVersion: BODYSCAN_PROMPT_VERSION,
          errorMessage: null,
          updatedAt: FieldValue.serverTimestamp(),
          ...(fresh.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
        },
        { merge: true }
      );
      return true;
    });

    if (!locked) {
      return { action: 'skipped', reason: 'lock BodyScan não adquirido' };
    }

    try {
      const [frontRaw, sideRaw] = await Promise.all([
        downloadPhotoBuffer(front.storagePath, front.url),
        downloadPhotoBuffer(side.storagePath, side.url),
      ]);
      const [frontPrep, sidePrep] = await Promise.all([
        prepareBodyScanImageForGemini(frontRaw),
        prepareBodyScanImageForGemini(sideRaw),
      ]);

      const { validation, model } = await analyzeBodyScanWithGemini({
        front: { buffer: frontPrep.buffer, mimeType: frontPrep.mimeType, label: 'front' },
        side: { buffer: sidePrep.buffer, mimeType: sidePrep.mimeType, label: 'side' },
        anthropometrics: {
          weightKg,
          heightCm: alturaCm,
          bmi,
          abdominalCircumferenceCm: abdominal,
          week,
          date,
        },
      });

      if (!validation.ok) {
        await bodyScanRef.set(
          {
            status: 'failed',
            analysisAvailable: false,
            unavailableReason: null,
            errorMessage: 'Não foi possível gerar o BodyScan desta semana.',
            model,
            promptVersion: BODYSCAN_PROMPT_VERSION,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        return { action: 'failed', week, reason: validation.error };
      }

      const bf = validation.value.bodyFat;
      const masses = calculateBodyScanMasses({
        weightKg,
        minPercent: bf.estimatedRange?.minPercent ?? null,
        centralPercent: bf.centralEstimatePercent,
        maxPercent: bf.estimatedRange?.maxPercent ?? null,
      });

      await bodyScanRef.set(
        {
          patientId,
          week,
          date,
          status: 'completed',
          analysisAvailable: validation.analysisAvailable,
          unavailableReason: validation.unavailableReason ?? null,
          input,
          imageQuality: validation.value.imageQuality,
          morphology: validation.value.morphology,
          bodyFat: {
            estimatedMinPercent: bf.estimatedRange?.minPercent ?? null,
            estimatedCentralPercent: bf.centralEstimatePercent,
            estimatedMaxPercent: bf.estimatedRange?.maxPercent ?? null,
            confidence: bf.confidence,
          },
          estimatedFatMassKg: masses.estimatedFatMassKg,
          estimatedFatFreeMassKg: masses.estimatedFatFreeMassKg,
          confidence: validation.value.confidence,
          limitations: validation.value.limitations,
          model,
          promptVersion: BODYSCAN_PROMPT_VERSION,
          errorMessage: null,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return {
        action: 'completed',
        week,
        analysisAvailable: validation.analysisAvailable,
      };
    } catch (err) {
      console.error('[BodyScan] falha na geração', {
        patientId,
        week,
        message: err instanceof Error ? err.message : String(err),
      });
      await bodyScanRef.set(
        {
          status: 'failed',
          analysisAvailable: false,
          errorMessage: 'Não foi possível gerar o BodyScan desta semana.',
          promptVersion: BODYSCAN_PROMPT_VERSION,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return {
        action: 'failed',
        week,
        reason: err instanceof Error ? err.message : 'erro desconhecido',
      };
    }
  } catch (err) {
    console.error('[BodyScan] tryGenerateBodyScan erro externo', {
      patientId,
      week,
      message: err instanceof Error ? err.message : String(err),
    });
    return { action: 'skipped', reason: 'erro interno BodyScan' };
  }
}

/** Agenda BodyScan sem bloquear a resposta HTTP. */
export function scheduleBodyScanGeneration(params: { patientId: string; week: number; date?: string }): void {
  void tryGenerateBodyScan(params).catch((err) => {
    console.error('[BodyScan] schedule error', err instanceof Error ? err.message : err);
  });
}
