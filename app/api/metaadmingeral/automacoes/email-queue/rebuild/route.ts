import { after, NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { rebuildEmailAutomationQueueForLead } from '@/services/emailAutomationRebuildService';
import {
  createEmailAutomationRebuildJob,
  executeEmailAutomationRebuildJob,
} from '@/services/emailAutomationRebuildJobService';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * POST /api/metaadmingeral/automacoes/email-queue/rebuild
 * Body opcional: { leadId?, doctorId?, organizationId? }
 *
 * Reconstrói email_automation_queue sob demanda (shadow mode — não envia).
 * - leadId → um lead (síncrono, resposta 200)
 * - doctorId / organizationId / vazio → job assíncrono (resposta 202 + jobId)
 */
export async function POST(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => null)) as {
      leadId?: string;
      doctorId?: string;
      organizationId?: string;
    } | null;

    const leadId = body?.leadId?.trim();
    const doctorId = body?.doctorId?.trim();
    const organizationId = body?.organizationId?.trim();

    if (leadId) {
      const result = await rebuildEmailAutomationQueueForLead(leadId, organizationId || undefined);
      return NextResponse.json({ ok: true, scope: 'lead', shadowMode: true, async: false, result });
    }

    const scope = doctorId ? 'doctor' : organizationId ? 'organization' : 'all';
    const job = await createEmailAutomationRebuildJob({
      scope,
      organizationId: organizationId || undefined,
      doctorId: doctorId || undefined,
      requestedByUid: auth.uid,
      requestedByEmail: auth.email,
    });

    after(async () => {
      await executeEmailAutomationRebuildJob(job.id);
    });

    return NextResponse.json(
      {
        ok: true,
        scope,
        shadowMode: true,
        async: true,
        jobId: job.id,
        status: job.status,
        message:
          'Rebuild enfileirado. Acompanhe o progresso pelo jobId — não depende do timeout do navegador.',
      },
      { status: 202 },
    );
  } catch (error) {
    console.error('[metaadmingeral/automacoes/email-queue/rebuild POST]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao reconstruir fila de e-mails.',
      },
      { status: 500 },
    );
  }
}
