import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import {
  getDoctorAutomationGovernanceDetail,
  listDoctorAutomationGovernance,
} from '@/services/automationDoctorGovernanceService';

export const runtime = 'nodejs';

/**
 * GET /api/metaadmingeral/automacoes/doctor-activations
 * GET /api/metaadmingeral/automacoes/doctor-activations?doctorId=...
 */
export async function GET(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const doctorId = request.nextUrl.searchParams.get('doctorId')?.trim();
    if (doctorId) {
      const doctor = await getDoctorAutomationGovernanceDetail(doctorId);
      if (!doctor) {
        return NextResponse.json(
          { ok: false, error: 'Médico não encontrado ou sem automações ativas.' },
          { status: 404 },
        );
      }
      return NextResponse.json({ ok: true, doctor });
    }

    const doctors = await listDoctorAutomationGovernance();

    return NextResponse.json({
      ok: true,
      doctors,
    });
  } catch (error) {
    console.error('[metaadmingeral/automacoes/doctor-activations GET]', error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : 'Erro ao carregar ativações por médico.',
      },
      { status: 500 },
    );
  }
}
