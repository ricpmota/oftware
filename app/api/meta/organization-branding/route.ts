import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/server/firebaseAdminOftware';
import { getBearerToken } from '@/lib/server/metaadminExamesImagemGate';
import { getOrganizationBranding } from '@/lib/organization/getOrganizationBranding.server';
import { organizationHostMatchesMember } from '@/lib/organization/memberOrganizationBranding';
import { toPatientOrganizationBrandingPublic } from '@/lib/organization/patientOrganizationBranding';
import { requestOrganizationHost } from '@/lib/organization/requestOrganizationHost';
import { resolveOrganizationDefinition } from '@/lib/organization/resolveOrganizationDefinition.server';
import { resolveOrganizationIdForAuthenticatedPaciente } from '@/lib/organization/resolveOrganizationIdForAuthenticatedPaciente.server';
import { resolveOrganizationIdFromRegisteredHosts } from '@/lib/organization/resolveOrganizationIdFromRegisteredHosts.server';

export const runtime = 'nodejs';

/**
 * GET /api/meta/organization-branding
 * Identidade da organização do paciente autenticado.
 * Não aceita organizationId na query — resolve pelo vínculo do token.
 */
export async function GET(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Faça login novamente.' }, { status: 401 });
  }

  let uid: string;
  let email: string | undefined;
  try {
    const decoded = await getAuthAdmin().verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email;
  } catch {
    return NextResponse.json({ ok: false, error: 'Sessão expirada. Faça login novamente.' }, { status: 401 });
  }

  try {
    const organizationId = await resolveOrganizationIdForAuthenticatedPaciente({ uid, email });
    const hostOrganizationId = await resolveOrganizationIdFromRegisteredHosts(
      requestOrganizationHost(request),
    );
    const organizationMatch = organizationHostMatchesMember(organizationId, hostOrganizationId);

    if (!organizationId) {
      return NextResponse.json({
        ok: true,
        organizationId: null,
        branding: null,
        sourceLayer: null,
        hostOrganizationId,
        organizationMatch,
      });
    }

    const organization = await resolveOrganizationDefinition(organizationId);
    if (!organization) {
      return NextResponse.json({
        ok: true,
        organizationId,
        branding: null,
        sourceLayer: null,
        hostOrganizationId,
        organizationMatch,
      });
    }

    const branding = await getOrganizationBranding(organizationId);
    return NextResponse.json({
      ok: true,
      organizationId,
      sourceLayer: branding.sourceLayer,
      branding: toPatientOrganizationBrandingPublic(branding),
      hostOrganizationId,
      organizationMatch,
    });
  } catch (error) {
    console.error('[api/meta/organization-branding]', error instanceof Error ? error.message : 'erro');
    return NextResponse.json(
      { ok: false, error: 'Não foi possível carregar a identidade da organização.' },
      { status: 500 },
    );
  }
}
