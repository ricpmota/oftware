import { NextRequest, NextResponse } from 'next/server';
import { METAADMIN_GERAL_EMAIL } from '@/lib/meta/anamneseInteligenteGate';
import { getAuthAdmin } from '@/lib/server/firebaseAdminOftware';
import { getBearerToken, requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { rebuildWhatsappAutomationQueueForPatient } from '@/services/whatsappRemindersService';

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
 * POST /api/metaadmin/automacoes/whatsapp-queue/rebuild-patient
 * Body: { pacienteId: string }
 *
 * Gatilho leve: reconstrói a fila de lembretes de UM paciente
 * (após salvar/editar plano ou registrar aplicação pelo check-in).
 * Lê só o doc do paciente + os settings do médico — NÃO varre os demais.
 * Médico autenticado precisa ser o responsável; MetaAdmin Geral pode rebuildar qualquer paciente.
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
      const result = await rebuildWhatsappAutomationQueueForPatient(pacienteId);
      return NextResponse.json({ ok: true, result });
    }

    const auth = await requireMedicoMetaadmin(request);
    if (!auth.ok) return auth.res;

    const result = await rebuildWhatsappAutomationQueueForPatient(pacienteId, {
      expectedDoctorId: auth.medicoDocId,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error('[metaadmin/automacoes/whatsapp-queue/rebuild-patient POST]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao reconstruir a fila do paciente.',
      },
      { status: 500 },
    );
  }
}
