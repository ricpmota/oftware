import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';

export type AgendaMedicoAuth = {
  medicoDocId: string;
  uid: string;
};

export async function requireAgendaMedico(
  request: NextRequest
): Promise<AgendaMedicoAuth | NextResponse> {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;
  return { medicoDocId: auth.medicoDocId, uid: auth.uid };
}
