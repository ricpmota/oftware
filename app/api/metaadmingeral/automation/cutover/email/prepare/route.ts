import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { prepareEmailCutover } from '@/services/emailCutoverControlService';

export const runtime = 'nodejs';

/** POST /api/metaadmingeral/automation/cutover/email/prepare */
export async function POST(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      organizationId?: string;
      externalQueryInsightsBaseline?: {
        reads24h?: number;
        executions24h?: number;
        note?: string;
      };
    };

    const organizationId = body.organizationId?.trim() || 'metodo';
    const control = await prepareEmailCutover({
      organizationId,
      createdBy: auth.email,
      externalQueryInsightsBaseline: body.externalQueryInsightsBaseline
        ? {
            ...body.externalQueryInsightsBaseline,
            capturedAt: new Date().toISOString(),
          }
        : null,
    });

    return NextResponse.json({ ok: true, control });
  } catch (error) {
    console.error('[automation/cutover/email/prepare POST]', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Erro ao preparar cutover.' },
      { status: 400 },
    );
  }
}
