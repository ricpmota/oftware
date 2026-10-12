import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import {
  createOrganizationServer,
  validateCreateOrganizationInput,
} from '@/lib/organization/createOrganization.server';
import {
  archiveDemoOrganizationsInFirestore,
  listOrganizationsMergedServer,
} from '@/lib/organization/resolveOrganizationDefinition.server';

/** GET — lista organizações ativas (Método + Firestore), sem demos. */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const archivedDemoIds = await archiveDemoOrganizationsInFirestore();
    const organizations = await listOrganizationsMergedServer();
    return NextResponse.json({
      organizations,
      archivedDemoIds,
    });
  } catch (error) {
    console.error('[metaadmingeral/organizations GET]', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Erro ao listar organizações',
      },
      { status: 500 },
    );
  }
}

/** POST — cria Nova Organização (registry Firestore + branding seed isolado). */
export async function POST(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json()) as {
      name?: string;
      organizationId?: string;
      domain?: string;
    };

    const validated = validateCreateOrganizationInput({
      name: body.name || '',
      organizationId: body.organizationId,
      domain: body.domain || '',
    });
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const result = await createOrganizationServer({
      name: body.name || '',
      organizationId: body.organizationId,
      domain: body.domain || '',
    });

    return NextResponse.json({
      ok: true,
      organization: result.organization,
      created: result.created,
    });
  } catch (error) {
    console.error('[metaadmingeral/organizations POST]', error);
    const message = error instanceof Error ? error.message : 'Erro ao criar organização';
    const status =
      message.includes('Já existe') || message.includes('já está vinculado') || message.includes('reservado')
        ? 409
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
