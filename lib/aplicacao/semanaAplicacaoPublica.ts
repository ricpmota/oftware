import type { Firestore } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { resolverWeekIndexAplicacaoPublica } from '@/lib/aplicacao/resolverWeekIndexAplicacaoPublica';
import { BODYSCAN_SUBCOLLECTION, bodyScanDocIdForWeek } from '@/lib/bodyscan/bodyScanTypes';
import type { PacienteCompleto } from '@/types/obesidade';

/** Mesma chave usada ao gravar as fotos deste link. Não usar a semana resolvida aqui. */
export function applicationIdDoLinkAplicacao(
  linkData: Record<string, unknown>,
  token: string,
  dataAplicacao: string
): string {
  const candidate =
    (linkData.applicationId as string | undefined) ||
    (linkData.aplicacaoId as string | undefined) ||
    (linkData.applicationKey as string | undefined);
  if (candidate && candidate.trim()) return candidate.trim();
  const semanaLink = Number(linkData.semana ?? null);
  const semana = Number.isFinite(semanaLink) ? semanaLink : 'semana';
  return `app-${token.slice(0, 12)}-${semana}-${dataAplicacao}`;
}

/**
 * Semana global deste check-in, a mesma usada em /api/aplicacao/[token]/dados.
 * O campo cru do link às vezes fica em 1 enquanto o registro real é outra semana.
 */
export async function resolverSemanaAplicacaoDoLink(
  linkData: Record<string, unknown>
): Promise<number | null> {
  const pacienteId = String(linkData.pacienteId || '').trim();
  const bruta = Number(linkData.semana ?? null);
  if (!pacienteId) {
    return Number.isFinite(bruta) && bruta > 0 ? bruta : null;
  }

  const snap = await getFirestoreAdmin().collection('pacientes_completos').doc(pacienteId).get();
  if (!snap.exists) {
    return Number.isFinite(bruta) && bruta > 0 ? bruta : null;
  }

  const semana = resolverWeekIndexAplicacaoPublica({
    paciente: snap.data() as PacienteCompleto,
    semanaLink: linkData.semana,
    dataLink: typeof linkData.data === 'string' ? linkData.data : null,
  });
  return semana > 0 ? semana : Number.isFinite(bruta) && bruta > 0 ? bruta : null;
}

/** Garante que as fotos deste registro usem a semana do check-in, não a semana 1 antiga. */
export async function alinharSemanaFotosDaAplicacao(
  db: Firestore,
  params: { pacienteId: string; applicationId: string; semana: number }
): Promise<void> {
  const snap = await db
    .collection('pacientes_completos')
    .doc(params.pacienteId)
    .collection('progressPhotos')
    .where('applicationId', '==', params.applicationId)
    .get();

  const photoIds = new Set(snap.docs.map((doc) => doc.id));
  const scansSnap = await db
    .collection('pacientes_completos')
    .doc(params.pacienteId)
    .collection(BODYSCAN_SUBCOLLECTION)
    .get();

  const targetId = bodyScanDocIdForWeek(params.semana);
  const targetDoc = scansSnap.docs.find((doc) => doc.id === targetId);
  const batch = db.batch();
  let pendentes = 0;

  snap.docs.forEach((doc) => {
    const atual = Number(doc.data()?.semana);
    if (atual === params.semana) return;
    batch.update(doc.ref, { semana: params.semana });
    pendentes += 1;
  });

  for (const doc of scansSnap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const week = Number(data.week);
    if (week === params.semana) continue;
    const input = (data.input || {}) as { frontPhotoId?: string; sidePhotoId?: string };
    const front = String(input.frontPhotoId || '');
    const side = String(input.sidePhotoId || '');
    if (!photoIds.has(front) || !photoIds.has(side)) continue;
    if (targetDoc && targetDoc.id !== doc.id) continue;

    const destino = doc.ref.parent.doc(targetId);
    if (doc.id !== targetId) {
      batch.set(destino, { ...data, week: params.semana });
      batch.delete(doc.ref);
    } else {
      batch.update(doc.ref, { week: params.semana });
    }
    pendentes += 1;
    break;
  }

  if (pendentes > 0) await batch.commit();
}
