import type { Firestore } from 'firebase-admin/firestore';
import { allocateUniquePublicLinkToken } from '@/lib/publicLinks/publicLinkToken';
import { buildOrganizacaoPublicUrl } from '@/lib/tenant/organizacaoPublicOrigin';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';

/** Data local YYYY-MM-DD (mesma convenção de conclusao_links e GET /api/conclusao/link). */
export function toDataConclusaoKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Garante documento em conclusao_links e retorna token + URL pública /conclusao/{token}.
 * Links novos usam código curto; documentos já existentes (incl. hex legado) são reaproveitados.
 */
export async function ensureConclusaoPublicLink(
  db: Firestore,
  params: { pacienteId: string; dataStr: string; medicoId: string },
  baseUrl?: string
): Promise<{ token: string; url: string }> {
  const pid = params.pacienteId.trim();
  const mid = params.medicoId.trim();
  const dataStr = params.dataStr.trim();
  const key = `conclusao_${pid}_${dataStr}`;
  const snapshot = await db.collection('conclusao_links').where('key', '==', key).limit(1).get();

  let token: string;
  if (!snapshot.empty) {
    token = snapshot.docs[0].id;
  } else {
    token = await allocateUniquePublicLinkToken(db, 'conclusao_links', {
      pacienteId: pid,
      data: dataStr,
      medicoId: mid,
      key,
      createdAt: new Date(),
      ...shadowOrganizationFields(),
    });
  }

  return {
    token,
    url: buildOrganizacaoPublicUrl(`/conclusao/${token}`, baseUrl),
  };
}

/**
 * Garante documento em conclusao_links e retorna URL pública /conclusao/{token}
 * (equivalente a GET /api/conclusao/link no servidor).
 */
export async function ensureConclusaoPublicUrl(
  db: Firestore,
  params: { pacienteId: string; data: Date; medicoId: string },
  baseUrl?: string
): Promise<string> {
  const pid = params.pacienteId.trim();
  const mid = params.medicoId.trim();
  if (!pid || !mid) {
    return '';
  }

  const { url } = await ensureConclusaoPublicLink(
    db,
    {
      pacienteId: pid,
      dataStr: toDataConclusaoKeyLocal(params.data),
      medicoId: mid,
    },
    baseUrl
  );
  return url;
}
