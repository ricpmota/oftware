import crypto from 'crypto';
import type { Firestore } from 'firebase-admin/firestore';

/** Data local YYYY-MM-DD (mesma convenção de aplicacao_links). */
export function toDataAplicacaoKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
  const dataStr = toDataAplicacaoKeyLocal(params.data);
  const pid = params.pacienteId.trim();
  const sem = params.semana;
  const key = `${pid}_${dataStr}_${sem}`;
  const snapshot = await db.collection('aplicacao_links').where('key', '==', key).limit(1).get();

  let token: string;
  if (!snapshot.empty) {
    token = snapshot.docs[0].id;
  } else {
    token = crypto.randomBytes(32).toString('hex');
    await db.collection('aplicacao_links').doc(token).set({
      pacienteId: pid,
      data: dataStr,
      semana: sem,
      dose: params.dose,
      key,
      createdAt: new Date(),
    });
  }

  const fromEnv = (baseUrl || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  const fromVercel = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '';
  const base = fromEnv || fromVercel || 'https://oftware.com.br';

  return `${base.replace(/\/$/, '')}/aplicacao/${token}`;
}
