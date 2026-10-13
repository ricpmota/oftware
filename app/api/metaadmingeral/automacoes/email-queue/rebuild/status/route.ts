import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { getEmailAutomationRebuildJob } from '@/services/emailAutomationRebuildJobService';

export const runtime = 'nodejs';

/**
 * GET /api/metaadmingeral/automacoes/email-queue/rebuild/status?jobId=...
 */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  const jobId = request.nextUrl.searchParams.get('jobId')?.trim();
  if (!jobId) {
    return NextResponse.json({ ok: false, error: 'Parâmetro jobId é obrigatório.' }, { status: 400 });
  }

  const job = await getEmailAutomationRebuildJob(jobId);
  if (!job) {
    return NextResponse.json({ ok: false, error: 'Job não encontrado.' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    job,
    shadowMode: true,
  });
}
