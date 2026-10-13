import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import {
  getEmailAutomationEngineSetting,
  setEmailAutomationEngine,
} from '@/services/emailAutomationEngineService';
import { validateQueueEngineCutover } from '@/services/emailAutomationCutoverPreflightService';
import { isEmailAutomationEngine } from '@/types/emailAutomationEngine';

export const runtime = 'nodejs';

/**
 * POST /api/metaadmingeral/automacoes/email-queue/set-engine
 * Body: { organizationId: string, engine: 'legacy' | 'shadow' | 'queue' }
 */
export async function POST(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => null)) as {
      organizationId?: string;
      engine?: string;
    } | null;

    const organizationId = body?.organizationId?.trim();
    const engine = body?.engine;

    if (!organizationId) {
      return NextResponse.json({ ok: false, error: 'organizationId é obrigatório.' }, { status: 400 });
    }

    if (!isEmailAutomationEngine(engine)) {
      return NextResponse.json(
        { ok: false, error: 'engine inválido. Use legacy, shadow ou queue.' },
        { status: 400 },
      );
    }

    if (engine === 'queue') {
      const preflight = await validateQueueEngineCutover(organizationId);
      if (!preflight.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: preflight.error,
            checks: preflight.checks,
          },
          { status: 409 },
        );
      }

      const setting = await setEmailAutomationEngine({
        organizationId,
        engine,
        updatedBy: auth.email,
      });

      return NextResponse.json({
        ok: true,
        note: 'Motor queue ativado para a organização. Cron processa esta org pela fila.',
        preflight: preflight.checks,
        setting: {
          organizationId: setting.organizationId,
          engine: setting.engine,
          'automation.email.engine': setting.engine,
          updatedAt: setting.updatedAt,
          updatedBy: setting.updatedBy,
        },
      });
    }

    const setting = await setEmailAutomationEngine({
      organizationId,
      engine,
      updatedBy: auth.email,
    });

    return NextResponse.json({
      ok: true,
      note: 'Motor atualizado. Rollback disponível sem deploy.',
      setting: {
        organizationId: setting.organizationId,
        engine: setting.engine,
        'automation.email.engine': setting.engine,
        updatedAt: setting.updatedAt,
        updatedBy: setting.updatedBy,
      },
    });
  } catch (error) {
    console.error('[metaadmingeral/automacoes/email-queue/set-engine POST]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao definir motor de e-mail.',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/metaadmingeral/automacoes/email-queue/set-engine?organizationId=metodo
 */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const organizationId = request.nextUrl.searchParams.get('organizationId')?.trim();
    if (!organizationId) {
      return NextResponse.json({ ok: false, error: 'organizationId é obrigatório.' }, { status: 400 });
    }

    const setting = await getEmailAutomationEngineSetting(organizationId);

    return NextResponse.json({
      ok: true,
      setting: {
        organizationId: setting.organizationId,
        engine: setting.engine,
        'automation.email.engine': setting.engine,
        updatedAt: setting.updatedAt,
        updatedBy: setting.updatedBy,
      },
      note: 'Default implícito: legacy quando não há documento persistido.',
    });
  } catch (error) {
    console.error('[metaadmingeral/automacoes/email-queue/set-engine GET]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao ler motor de e-mail.',
      },
      { status: 500 },
    );
  }
}
