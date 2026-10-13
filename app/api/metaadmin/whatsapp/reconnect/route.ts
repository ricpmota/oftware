import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/metaadmin/whatsapp/reconnect
 * Alias de start-session: encerra vínculo antigo e gera QR novo.
 */
export async function POST(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  // Reutiliza a mesma lógica de Conectar (forceFreshQr).
  const { POST: startSessionPost } = await import('../start-session/route');
  return startSessionPost(request);
}
