import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import {
  getOrganizationBrandingForAdmin,
  saveOrganizationBrandingForAdmin,
} from '@/lib/organization/getOrganizationBranding.server';
import { parseOrganizationBrandingStored } from '@/lib/organization/organizationBrandingFirestore.server';
import { getOrganizationById } from '@/lib/organization/organizationRegistry';

type RouteParams = { params: Promise<{ organizationId: string }> };

/** GET — Marca da Organização (consolidação oficial 11.1 + leitura). */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { organizationId } = await params;
    const id = (organizationId || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'organizationId obrigatório.' }, { status: 400 });
    }

    if (!getOrganizationById(id)) {
      return NextResponse.json({ error: `Organização não registrada: ${id}` }, { status: 404 });
    }

    const result = await getOrganizationBrandingForAdmin(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[metaadmingeral/organizations/branding GET]', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Erro ao carregar Marca da Organização',
      },
      { status: 500 },
    );
  }
}

/** PATCH — salva Marca da Organização em organizations/{id}.branding (sem alterar runtime público). */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { organizationId } = await params;
    const id = (organizationId || '').trim();
    if (!id) {
      return NextResponse.json({ error: 'organizationId obrigatório.' }, { status: 400 });
    }

    if (!getOrganizationById(id)) {
      return NextResponse.json({ error: `Organização não registrada: ${id}` }, { status: 404 });
    }

    const body = (await request.json()) as { branding?: unknown };
    const parsed = parseOrganizationBrandingStored(body.branding);
    if (!parsed) {
      return NextResponse.json({ error: 'Payload branding inválido.' }, { status: 400 });
    }

    const branding = await saveOrganizationBrandingForAdmin(id, parsed);
    return NextResponse.json({ ok: true, branding });
  } catch (error) {
    console.error('[metaadmingeral/organizations/branding PATCH]', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro ao salvar Marca da Organização',
      },
      { status: 500 },
    );
  }
}
