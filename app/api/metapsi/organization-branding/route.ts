import { NextRequest, NextResponse } from 'next/server';
import { COL_PSIQUIATRAS } from '@/features/metaPsi/metaPsi.constants';
import { loadMemberOrganizationBranding } from '@/lib/organization/loadMemberOrganizationBranding.server';
import { memberOrganizationLinkFromData } from '@/lib/organization/resolveMemberOrganizationId';
import { requestOrganizationHost } from '@/lib/organization/requestOrganizationHost';
import { requirePsiquiatraMetaPsi } from '@/lib/metapsi/requirePsiquiatraMetaPsi';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

/** GET — Marca da organização do psiquiatra logado. Campo vazio mantém o legado do Método. */
export async function GET(request: NextRequest) {
  const auth = await requirePsiquiatraMetaPsi(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const snap = await getFirestoreAdmin().collection(COL_PSIQUIATRAS).doc(auth.uid).get();
    const payload = await loadMemberOrganizationBranding({
      member: memberOrganizationLinkFromData(snap.data()),
      legacyDefault: 'metodo',
      host: requestOrganizationHost(request),
    });
    return NextResponse.json(payload);
  } catch (error) {
    console.error('[metapsi/organization-branding GET]', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao carregar Marca da Organização',
      },
      { status: 500 },
    );
  }
}
