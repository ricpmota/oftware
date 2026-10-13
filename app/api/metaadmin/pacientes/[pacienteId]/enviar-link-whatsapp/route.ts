import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import {
  sendPacienteCadastroLinkWhatsapp,
  WHATSAPP_MEDICO_NAO_CONECTADO_MSG,
} from '@/services/whatsappPacienteCadastroLinkService';
import { WhatsappProviderError } from '@/services/whatsappProviderClient';
import { whatsappTestErrorStatus } from '@/services/whatsappSendTestService';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/metaadmin/pacientes/[pacienteId]/enviar-link-whatsapp
 * Envia o link de cadastro (/meta) pelo WhatsApp do médico para o telefone do paciente.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pacienteId: string }> },
) {
  const { pacienteId: rawId } = await params;
  const pacienteId = String(rawId || '').trim();
  if (!pacienteId) {
    return NextResponse.json({ ok: false, error: 'pacienteId é obrigatório.' }, { status: 400 });
  }

  const auth = await requireMedicoPacienteMetaadmin(request, pacienteId);
  if (!auth.ok) return auth.res;

  try {
    const result = await sendPacienteCadastroLinkWhatsapp({
      doctorId: auth.medicoDocId,
      pacienteId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[metaadmin/pacientes/enviar-link-whatsapp]', error);
    const message =
      error instanceof Error ? error.message : 'Erro ao enviar o link pelo WhatsApp.';
    const isDisconnected =
      error instanceof WhatsappProviderError && error.code === 'SESSION_NOT_READY';
    return NextResponse.json(
      {
        ok: false,
        error: isDisconnected ? WHATSAPP_MEDICO_NAO_CONECTADO_MSG : message,
        whatsappDisconnected: isDisconnected,
      },
      { status: error instanceof WhatsappProviderError ? whatsappTestErrorStatus(error) : 500 },
    );
  }
}
