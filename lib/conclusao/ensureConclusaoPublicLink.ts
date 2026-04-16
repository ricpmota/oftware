import crypto from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';

/** Data local YYYY-MM-DD (mesma convenção de conclusao_links e GET /api/conclusao/link). */
export function toDataConclusaoKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

  const dataStr = toDataConclusaoKeyLocal(params.data);
  const key = `conclusao_${pid}_${dataStr}`;
  const snapshot = await db.collection('conclusao_links').where('key', '==', key).limit(1).get();

  let token: string;
  if (!snapshot.empty) {
    token = snapshot.docs[0].id;
  } else {
    token = crypto.randomBytes(32).toString('hex');
    await db.collection('conclusao_links').doc(token).set({
      pacienteId: pid,
      data: dataStr,
      medicoId: mid,
      key,
      createdAt: new Date(),
    });
  }

  const fromEnv = (baseUrl || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  const fromVercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
  const base = fromEnv || fromVercel || 'https://oftware.com.br';

  return `${base.replace(/\/$/, '')}/conclusao/${token}`;
}
