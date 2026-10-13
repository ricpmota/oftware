import { NextRequest, NextResponse } from 'next/server';
import { COL_PERSONAL_TRAINERS } from '@/features/metaPersonal/metaPersonal.constants';
import { loadMemberOrganizationBranding } from '@/lib/organization/loadMemberOrganizationBranding.server';
import { memberOrganizationLinkFromData } from '@/lib/organization/resolveMemberOrganizationId';
import { requestOrganizationHost } from '@/lib/organization/requestOrganizationHost';
import { requirePersonalMetaPersonal } from '@/lib/metapersonal/requirePersonalMetaPersonal';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

/** GET — Marca da organização do personal logado. Campo vazio mantém o legado do Método. */
export async function GET(request: NextRequest) {
  const auth = await requirePersonalMetaPersonal(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const snap = await getFirestoreAdmin().collection(COL_PERSONAL_TRAINERS).doc(auth.uid).get();
    const payload = await loadMemberOrganizationBranding({
      member: memberOrganizationLinkFromData(snap.data()),
      legacyDefault: 'metodo',
      host: requestOrganizationHost(request),
    });
    return NextResponse.json(payload);
  } catch (error) {
    console.error('[metapersonal/organization-branding GET]', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao carregar Marca da Organização',
      },
      { status: 500 },
    );
  }
}
