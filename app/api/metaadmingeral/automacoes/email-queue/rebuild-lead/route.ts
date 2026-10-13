import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { rebuildEmailAutomationQueueForLead } from '@/services/emailAutomationRebuildService';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/metaadmingeral/automacoes/email-queue/rebuild-lead
 * Body: { leadId: string, organizationId?: string }
 *
 * Gatilho leve: reconstrói a fila de e-mails de UM lead.
 * NÃO envia e-mails (shadow mode).
 */
export async function POST(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => null)) as {
      leadId?: string;
      organizationId?: string;
    } | null;

    const leadId = body?.leadId?.trim();
    if (!leadId) {
      return NextResponse.json({ ok: false, error: 'leadId é obrigatório.' }, { status: 400 });
    }

    const result = await rebuildEmailAutomationQueueForLead(leadId, body?.organizationId?.trim() || undefined);

    return NextResponse.json({ ok: true, shadowMode: true, result });
  } catch (error) {
    console.error('[metaadmingeral/automacoes/email-queue/rebuild-lead POST]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao reconstruir fila do lead.',
      },
      { status: 500 },
    );
  }
}
