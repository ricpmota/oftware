import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import {
  listAutomationTemplates,
  upsertAutomationTemplate,
} from '@/services/automationTemplatesService';
import type { AutomationTemplateStatus } from '@/types/automationCenter';

export const runtime = 'nodejs';

const TEMPLATE_STATUSES: AutomationTemplateStatus[] = ['draft', 'published', 'inactive', 'planned'];

/**
 * GET /api/metaadmingeral/automacoes/templates
 */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const templates = await listAutomationTemplates();

    return NextResponse.json({
      ok: true,
      templates,
    });
  } catch (error) {
    console.error('[metaadmingeral/automacoes/templates GET]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao carregar templates de automação.',
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/metaadmingeral/automacoes/templates
 * Body: { id, name, description, status, body }
 */
export async function PUT(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => null)) as {
      id?: string;
      name?: string;
      description?: string;
      status?: AutomationTemplateStatus;
      body?: string;
    } | null;

    if (!body?.id?.trim()) {
      return NextResponse.json({ ok: false, error: 'id é obrigatório.' }, { status: 400 });
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ ok: false, error: 'name é obrigatório.' }, { status: 400 });
    }

    if (!body.body?.trim()) {
      return NextResponse.json({ ok: false, error: 'body é obrigatório.' }, { status: 400 });
    }

    if (!body.status || !TEMPLATE_STATUSES.includes(body.status)) {
      return NextResponse.json(
        { ok: false, error: 'status inválido.' },
        { status: 400 },
      );
    }

    const template = await upsertAutomationTemplate({
      id: body.id.trim(),
      name: body.name.trim(),
      description: body.description?.trim() ?? '',
      status: body.status,
      body: body.body,
      updatedBy: auth.email,
    });

    return NextResponse.json({
      ok: true,
      template,
    });
  } catch (error) {
    console.error('[metaadmingeral/automacoes/templates PUT]', error);
    const message = error instanceof Error ? error.message : 'Erro ao salvar template de automação.';
    const isValidation = message.startsWith('Variável não permitida:');
    return NextResponse.json(
      { ok: false, error: message },
      { status: isValidation ? 400 : 500 },
    );
  }
}
