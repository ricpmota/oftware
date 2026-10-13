import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import {
  listAutomationOrganizationSettings,
  listSettingsByOrganizationId,
  upsertAutomationOrganizationSetting,
} from '@/services/automationOrganizationSettingsService';
import { toAutomationOrganizationSettingDto } from '@/types/automationCenter';

export const runtime = 'nodejs';

/**
 * GET /api/metaadmingeral/automacoes/organization-settings?organizationId=metodo
 */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId')?.trim();
    const settings = organizationId
      ? await listSettingsByOrganizationId(organizationId)
      : await listAutomationOrganizationSettings();

    return NextResponse.json({
      ok: true,
      settings: settings.map(toAutomationOrganizationSettingDto),
    });
  } catch (error) {
    console.error('[metaadmingeral/automacoes/organization-settings GET]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar governança de automações.',
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/metaadmingeral/automacoes/organization-settings
 * Body: { organizationId, automationId, enabled }
 */
export async function PUT(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => null)) as {
      organizationId?: string;
      automationId?: string;
      enabled?: boolean;
    } | null;

    if (!body?.organizationId?.trim() || !body?.automationId?.trim()) {
      return NextResponse.json(
        { ok: false, error: 'organizationId e automationId são obrigatórios.' },
        { status: 400 },
      );
    }

    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json(
        { ok: false, error: 'enabled deve ser boolean.' },
        { status: 400 },
      );
    }

    const setting = await upsertAutomationOrganizationSetting({
      organizationId: body.organizationId.trim(),
      automationId: body.automationId.trim(),
      enabled: body.enabled,
      updatedBy: auth.email,
    });

    return NextResponse.json({
      ok: true,
      setting: toAutomationOrganizationSettingDto(setting),
    });
  } catch (error) {
    console.error('[metaadmingeral/automacoes/organization-settings PUT]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao salvar governança de automações.',
      },
      { status: 500 },
    );
  }
}
