import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationBranding } from '@/lib/organization/getOrganizationBranding.server';
import { isMetodoOrganizationMember } from '@/lib/organization/isMetodoOrganizationMember';
import { METODO_ORGANIZATION_ID } from '@/lib/organization/organizationRegistry';
import type { OrganizationId } from '@/lib/organization/organizationTypes';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

function resolveMedicoOrganizationId(data: Record<string, unknown> | undefined): OrganizationId | null {
  if (!data) return null;

  const member = isMetodoOrganizationMember({
    organizationId: typeof data.organizationId === 'string' ? data.organizationId : null,
    metodoImagensAtivo: data.metodoImagensAtivo === true,
  });

  if (!member) return null;

  const orgId = (typeof data.organizationId === 'string' ? data.organizationId.trim() : '') || METODO_ORGANIZATION_ID;
  return orgId as OrganizationId;
}

/** GET — Marca da Organização do médico logado (shell MetaAdmin). */
export async function GET(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  try {
    const db = getFirestoreAdmin();
    const medSnap = await db.collection('medicos').doc(auth.medicoDocId).get();
    const organizationId = resolveMedicoOrganizationId(medSnap.data());

    if (!organizationId) {
      return NextResponse.json({ organizationId: null, branding: null });
    }

    const branding = await getOrganizationBranding(organizationId);

    return NextResponse.json({
      organizationId,
      branding: {
        publicName: branding.publicName,
        logoMainUrl: branding.logoMainUrl,
        logoDarkUrl: branding.logoDarkUrl ?? null,
        logoLightUrl: branding.logoLightUrl ?? null,
      },
    });
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
