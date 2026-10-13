import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import {
  getNutricionistaAutomationGovernanceDetail,
  listNutricionistaAutomationGovernance,
} from '@/services/automationDoctorGovernanceService';

export const runtime = 'nodejs';

/**
 * GET /api/metaadmingeral/automacoes/nutri-activations
 * GET /api/metaadmingeral/automacoes/nutri-activations?ownerId=...
 */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const ownerId = request.nextUrl.searchParams.get('ownerId')?.trim();
    if (ownerId) {
      const doctor = await getNutricionistaAutomationGovernanceDetail(ownerId);
      if (!doctor) {
        return NextResponse.json(
          { ok: false, error: 'Nutricionista não encontrado ou sem automações ativas.' },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true, doctor });
    }

    const doctors = await listNutricionistaAutomationGovernance();
    return NextResponse.json({ ok: true, doctors });
  } catch (error) {
    console.error('[metaadmingeral/automacoes/nutri-activations GET]', error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : 'Erro ao carregar ativações por nutricionista.',
      },
      { status: 500 },
    );
  }
}
