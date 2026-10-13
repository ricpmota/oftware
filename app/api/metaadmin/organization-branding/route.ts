import { NextRequest, NextResponse } from 'next/server';
import { loadMemberOrganizationBranding } from '@/lib/organization/loadMemberOrganizationBranding.server';
import { memberOrganizationLinkFromData } from '@/lib/organization/resolveMemberOrganizationId';
import { requestOrganizationHost } from '@/lib/organization/requestOrganizationHost';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

/**
 * GET — Marca da organização do médico logado.
 * O vínculo vem de `medicos/{id}`. Sem organizationId, só o legado `metodoImagensAtivo` usa o Método.
 */
export async function GET(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  try {
    const medSnap = await getFirestoreAdmin().collection('medicos').doc(auth.medicoDocId).get();
    const payload = await loadMemberOrganizationBranding({
      member: memberOrganizationLinkFromData(medSnap.data()),
      legacyDefault: 'none',
      host: requestOrganizationHost(request),
    });
    return NextResponse.json(payload);
  } catch (error) {
    console.error('[metaadmin/organization-branding GET]', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao carregar Marca da Organização',
      },
      { status: 500 },
    );
  }
}
