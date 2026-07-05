import { NextRequest, NextResponse } from 'next/server';
import { isMetaAdminGeralEmail } from '@/lib/meta/anamneseInteligenteGate';
import { verifyAuthToken } from '@/lib/contratos/contratoPadraoService.server';

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
}

/** Gate para rotas de migração — futura UI MAG Ferramentas → Migrações. */
export async function requireMetaAdminGeralMigration(request: NextRequest) {
  const auth = await verifyAuthToken(getBearerToken(request));
  if (!auth.ok) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: auth.error }, { status: auth.status }),
    };
  }
  if (!isMetaAdminGeralEmail(auth.email)) {
    return {
      ok: false as const,
      res: NextResponse.json({ error: 'Acesso negado. Apenas MetaAdminGeral.' }, { status: 403 }),
    };
  }
  return { ok: true as const, auth };
}
