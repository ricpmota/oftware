import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { sendBoasVindasTratamentoWhatsapp } from '@/services/boasVindasTratamentoWhatsappService';
import { notifyMedicoConsultaAposAceite } from '@/lib/metaadmin/agenda/consultaReminderService';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function resolvePacienteIdFromSolicitacao(
  sol: Record<string, unknown> | undefined,
): Promise<string> {
  const byId = typeof sol?.pacienteId === 'string' ? sol.pacienteId.trim() : '';
  if (byId) return byId;

  const email = typeof sol?.pacienteEmail === 'string' ? sol.pacienteEmail.trim() : '';
  if (!email) return '';

  const db = getFirestoreAdmin();
  const byEmail = await db.collection('pacientes_completos').where('email', '==', email).limit(1).get();
  if (!byEmail.empty) return byEmail.docs[0].id;

  const byUserId = await db
    .collection('pacientes_completos')
    .where('userId', '==', email)
    .limit(1)
    .get();
  return byUserId.empty ? '' : byUserId.docs[0].id;
}

/**
 * POST /api/metaadmin/solicitacoes/welcome-whatsapp
 * Body: { solicitacaoId }
 * Envia boas-vindas ao tratamento pelo Canal Chat após o aceite do vínculo.
 * Se o paciente agendou consulta, confirma o horário e garante os lembretes de 30 min.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { solicitacaoId?: string } | null;
  const solicitacaoId = body?.solicitacaoId?.trim() ?? '';
  if (!solicitacaoId) {
    return NextResponse.json({ ok: false, error: 'solicitacaoId é obrigatório.' }, { status: 400 });
  }

  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  try {
    const result = await sendBoasVindasTratamentoWhatsapp({
      solicitacaoId,
      medicoId: auth.medicoDocId,
    });

    let consulta: { hadConsulta: boolean } | undefined;
    try {
      const solSnap = await getFirestoreAdmin()
        .collection('solicitacoes_medico')
        .doc(solicitacaoId)
        .get();
      const sol = solSnap.data() as Record<string, unknown> | undefined;
      const pacienteId = await resolvePacienteIdFromSolicitacao(sol);
      const pacienteEmail = typeof sol?.pacienteEmail === 'string' ? sol.pacienteEmail : undefined;
      if (pacienteId || pacienteEmail) {
        consulta = await notifyMedicoConsultaAposAceite({
          medicoId: auth.medicoDocId,
          pacienteId,
          pacienteNome: typeof sol?.pacienteNome === 'string' ? sol.pacienteNome : 'Paciente',
          pacientePhone:
            typeof sol?.pacienteTelefone === 'string' ? sol.pacienteTelefone : undefined,
          pacienteEmail,
        });
      }
    } catch (consultaError) {
      console.error('[metaadmin/solicitacoes/welcome-whatsapp] consulta', consultaError);
    }

    if (result.status === 'sent') {
      return NextResponse.json({
        ok: true,
        status: result.status,
        phone: result.phone,
        consulta,
      });
    }
    if (result.status === 'already_sent') {
      return NextResponse.json({
        ok: true,
        status: result.status,
        alreadySent: true,
        consulta,
      });
    }
    return NextResponse.json({
      ok: true,
      status: result.status,
      skipped: true,
      reason: result.reason,
      consulta,
    });
  } catch (error) {
    console.error('[metaadmin/solicitacoes/welcome-whatsapp]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar boas-vindas.',
      },
      { status: 500 },
    );
  }
}
