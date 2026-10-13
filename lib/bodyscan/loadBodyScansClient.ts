import { getAuth } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  serializeBodyScanDoc,
  sortBodyScansByWeekAsc,
  type BodyScanPublicView,
} from '@/lib/bodyscan/bodyScanSerialize';
import { BODYSCAN_SUBCOLLECTION } from '@/lib/bodyscan/bodyScanTypes';
import type { BodyScanBackfillSummary } from '@/components/bodyscan/BodyScanModal';

/** Carrega BodyScans via Firestore client (metaadmin / profissional autenticado). */
export async function loadBodyScansFromFirestoreClient(
  pacienteId: string
): Promise<BodyScanPublicView[]> {
  const snap = await getDocs(
    collection(db, 'pacientes_completos', pacienteId, BODYSCAN_SUBCOLLECTION)
  );
  return sortBodyScansByWeekAsc(
    snap.docs
      .map((d) => serializeBodyScanDoc(d.id, d.data() as Record<string, unknown>))
      .filter((x): x is BodyScanPublicView => x != null)
  );
}

/** Carrega BodyScans do paciente autenticado via API /meta. */
export async function loadBodyScansForMetaPatient(
  pacienteId: string
): Promise<BodyScanPublicView[]> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Não autenticado');
  const idToken = await user.getIdToken();
  const res = await fetch(
    `/api/meta/bodyscan?pacienteId=${encodeURIComponent(pacienteId)}&idToken=${encodeURIComponent(idToken)}`
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erro ao carregar BodyScan');
  return Array.isArray(json.scans) ? (json.scans as BodyScanPublicView[]) : [];
}

/** Carrega via token público de aplicação. */
export async function loadBodyScansForAplicacaoToken(
  token: string
): Promise<BodyScanPublicView[]> {
  const res = await fetch(`/api/aplicacao/${encodeURIComponent(token)}/bodyscan`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erro ao carregar BodyScan');
  return Array.isArray(json.scans) ? (json.scans as BodyScanPublicView[]) : [];
}

function parseWeekStatuses(raw: unknown): BodyScanBackfillSummary['weeks'] {
  if (!Array.isArray(raw)) return undefined;
  const weeks = raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const week = Number(row.week);
      if (!Number.isFinite(week)) return null;
      return {
        week,
        eligible: Boolean(row.eligible),
        reason: typeof row.reason === 'string' ? row.reason : undefined,
        hasFront: Boolean(row.hasFront),
        hasSide: Boolean(row.hasSide),
        needsGeneration: Boolean(row.needsGeneration),
        alreadyCompletedSamePhotos: Boolean(row.alreadyCompletedSamePhotos),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row != null);
  return weeks;
}

function parseBackfillSummary(json: Record<string, unknown>): BodyScanBackfillSummary {
  return {
    foundPhotoWeeks: Number(json.foundPhotoWeeks) || 0,
    weeksWithFrontAndSide: Number(json.weeksWithFrontAndSide) || 0,
    eligibleWeeks: Number(json.eligibleWeeks) || 0,
    alreadyCompleted: Number(json.alreadyCompleted) || 0,
    pendingGeneration: Number(json.pendingGeneration) || 0,
    generated: Number(json.generated) || 0,
    skipped: Number(json.skipped) || 0,
    failed: Number(json.failed) || 0,
    consentAccepted: Boolean(json.consentAccepted),
    weeks: parseWeekStatuses(json.weeks),
  };
}

/** Dry-run de descoberta histórica (paciente /meta). */
export async function discoverBodyScansForMetaPatient(
  pacienteId: string
): Promise<BodyScanBackfillSummary> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Não autenticado');
  const idToken = await user.getIdToken();
  const res = await fetch('/api/meta/bodyscan/backfill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pacienteId, idToken, dryRun: true }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erro ao descobrir histórico BodyScan');
  return parseBackfillSummary(json);
}

/** Aceita consentimento (opcional) e gera BodyScans históricos ausentes. */
export async function backfillBodyScansForMetaPatient(
  pacienteId: string,
  options?: { acceptConsent?: boolean }
): Promise<{ summary: BodyScanBackfillSummary; scans: BodyScanPublicView[] }> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Não autenticado');
  const idToken = await user.getIdToken();
  const res = await fetch('/api/meta/bodyscan/backfill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pacienteId,
      idToken,
      acceptConsent: options?.acceptConsent === true,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erro ao preparar histórico BodyScan');
  return {
    summary: parseBackfillSummary(json),
    scans: Array.isArray(json.scans) ? (json.scans as BodyScanPublicView[]) : [],
  };
}

/** Dry-run profissional. */
export async function discoverBodyScansForMetaAdminPatient(
  pacienteId: string
): Promise<BodyScanBackfillSummary> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Não autenticado');
  const idToken = await user.getIdToken();
  const res = await fetch(
    `/api/metaadmin/pacientes/${encodeURIComponent(pacienteId)}/bodyscan/backfill`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ dryRun: true, idToken }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erro ao descobrir histórico BodyScan');
  return parseBackfillSummary(json);
}

/** Backfill profissional (fotos existentes bastam — sem consentimento separado). */
export async function backfillBodyScansForMetaAdminPatient(
  pacienteId: string
): Promise<{ summary: BodyScanBackfillSummary; scans: BodyScanPublicView[] }> {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Não autenticado');
  const idToken = await user.getIdToken();
  const res = await fetch(
    `/api/metaadmin/pacientes/${encodeURIComponent(pacienteId)}/bodyscan/backfill`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ idToken }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Erro ao preparar histórico BodyScan');
  return {
    summary: parseBackfillSummary(json),
    scans: Array.isArray(json.scans) ? (json.scans as BodyScanPublicView[]) : [],
  };
}
