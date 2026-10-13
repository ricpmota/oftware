import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/server/firebaseAdminOftware';
import { getBearerToken } from '@/lib/server/metaadminExamesImagemGate';
import { CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT } from '@/lib/50kgdepois/constants';

export type CinquentaKgDepoisAuth = {
  uid: string;
  email: string | null;
};

export function resolveParticipantId(request: NextRequest): string {
  const fromQuery = request.nextUrl.searchParams.get('participantId')?.trim();
  return fromQuery || CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT.id;
}

export async function requireCinquentaKgDepoisAuth(
  request: NextRequest
): Promise<CinquentaKgDepoisAuth | NextResponse> {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { error: 'Faça login para acessar esta entrevista.' },
      { status: 401 }
    );
  }

  try {
    const decoded = await getAuthAdmin().verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email?.trim().toLowerCase() || null,
    };
  } catch {
    return NextResponse.json(
      { error: 'Sessão expirada. Faça login novamente.' },
      { status: 401 }
    );
  }
}
