import type { Firestore } from 'firebase-admin/firestore';
import { allocateUniqueAplicacaoPublicToken } from '@/lib/aplicacao/aplicacaoPublicToken';
import { buildOrganizacaoPublicUrl } from '@/lib/tenant/organizacaoPublicOrigin';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';

/** Data local YYYY-MM-DD (mesma convenção de aplicacao_links). */
export function toDataAplicacaoKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Garante documento em aplicacao_links e retorna token + URL pública /aplicacao/{token}.
 * Links novos usam código curto; documentos já existentes (incl. hex legado) são reaproveitados.
 */
export async function ensureAplicacaoPublicLink(
  db: Firestore,
  params: { pacienteId: string; dataStr: string; semana: number; dose: number },
  baseUrl?: string
): Promise<{ token: string; url: string }> {
  const pid = params.pacienteId.trim();
  const dataStr = params.dataStr.trim();
  const sem = params.semana;
  const key = `${pid}_${dataStr}_${sem}`;
  const snapshot = await db.collection('aplicacao_links').where('key', '==', key).limit(1).get();

  let token: string;
  if (!snapshot.empty) {
    token = snapshot.docs[0].id;
    const existingDose = snapshot.docs[0].data()?.dose;
    if (typeof params.dose === 'number' && Number.isFinite(params.dose) && existingDose !== params.dose) {
      await snapshot.docs[0].ref.update({ dose: params.dose });
    }
  } else {
    token = await allocateUniqueAplicacaoPublicToken(db, {
      pacienteId: pid,
      data: dataStr,
      semana: sem,
      dose: params.dose,
      key,
      createdAt: new Date(),
      ...shadowOrganizationFields(),
    });
  }

  return {
    token,
    url: buildOrganizacaoPublicUrl(`/aplicacao/${token}`, baseUrl),
  };
}

/**
 * Garante documento em aplicacao_links e retorna URL pública /aplicacao/{token}
 * (equivalente a GET /api/aplicacao/link no servidor).
 */
export async function ensureAplicacaoPublicUrl(
  db: Firestore,
  params: { pacienteId: string; data: Date; semana: number; dose: number },
  baseUrl?: string
): Promise<string> {
  const { url } = await ensureAplicacaoPublicLink(
    db,
    {
      pacienteId: params.pacienteId,
      dataStr: toDataAplicacaoKeyLocal(params.data),
      semana: params.semana,
      dose: params.dose,
    },
    baseUrl
  );
  return url;
}
