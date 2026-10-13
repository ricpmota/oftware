import { NextRequest, NextResponse } from 'next/server';
import { METAADMIN_GERAL_EMAIL } from '@/lib/meta/anamneseInteligenteGate';
import { getAuthAdmin } from '@/lib/server/firebaseAdminOftware';
import { getBearerToken, requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { apagarFilaWhatsappAplicacaoDoPaciente } from '@/services/whatsappRemindersService';

export const runtime = 'nodejs';
export const maxDuration = 30;

async function isMetaAdminGeralToken(request: NextRequest): Promise<boolean> {
  const token = getBearerToken(request);
  if (!token) return false;
  try {
    const decoded = await getAuthAdmin().verifyIdToken(token);
    const email = (decoded.email || '').trim().toLowerCase();
    return email === METAADMIN_GERAL_EMAIL.trim().toLowerCase();
  } catch {
    return false;
  }
}

/**
 * POST /api/metaadmin/automacoes/whatsapp-queue/clear-aplicacao-patient
 * Body: { pacienteId: string }
 *
 * Apaga lembretes de aplicação ainda não enviados (dia, véspera e atraso)
 * depois que um protocolo é excluído.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { pacienteId?: string } | null;
    const pacienteId = body?.pacienteId?.trim();
    if (!pacienteId) {
      return NextResponse.json({ ok: false, error: 'pacienteId é obrigatório.' }, { status: 400 });
    }

    const metaGeral = await isMetaAdminGeralToken(request);
    if (metaGeral) {
      const result = await apagarFilaWhatsappAplicacaoDoPaciente(pacienteId);
      return NextResponse.json({ ok: true, result });
    }

    const auth = await requireMedicoMetaadmin(request);
    if (!auth.ok) return auth.res;

    const result = await apagarFilaWhatsappAplicacaoDoPaciente(pacienteId, {
      expectedDoctorId: auth.medicoDocId,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error('[metaadmin/automacoes/whatsapp-queue/clear-aplicacao-patient POST]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao remover lembretes de aplicação.',
      },
      { status: 500 },
    );
  }
}
