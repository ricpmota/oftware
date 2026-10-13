import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import {
  getPersonalAutomationGovernanceDetail,
  listPersonalAutomationGovernance,
} from '@/services/automationDoctorGovernanceService';

export const runtime = 'nodejs';

/**
 * GET /api/metaadmingeral/automacoes/personal-activations
 * GET /api/metaadmingeral/automacoes/personal-activations?ownerId=...
 */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const ownerId = request.nextUrl.searchParams.get('ownerId')?.trim();
    if (ownerId) {
      const doctor = await getPersonalAutomationGovernanceDetail(ownerId);
      if (!doctor) {
        return NextResponse.json(
          { ok: false, error: 'Personal não encontrado ou sem automações ativas.' },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true, doctor });
    }

    const doctors = await listPersonalAutomationGovernance();
    return NextResponse.json({ ok: true, doctors });
  } catch (error) {
    console.error('[metaadmingeral/automacoes/personal-activations GET]', error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : 'Erro ao carregar ativações por personal.',
      },
      { status: 500 },
    );
  }
}
