import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { toFinanceiroCobrancaEnvioDto } from '@/services/financeiroCobrancaEnvioService';
import { requestOrSendFinanceiroCobrancaWhatsapp } from '@/services/financeiroCobrancaCanalChatGate';
import { previewFinanceiroCobrancaWhatsapp } from '@/services/financeiroCobrancaWhatsappService';
import { WhatsappProviderError } from '@/services/whatsappProviderClient';
import { whatsappTestErrorStatus } from '@/services/whatsappSendTestService';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/metaadmin/financeiro/cobranca-whatsapp
 * Body: { pacienteId, valorAberto?, preview? }
 * - preview: true → monta a mensagem sem enviar
 * - senão → envia cobrança via Canal Chat (sem link do relatório)
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    pacienteId?: string;
    valorAberto?: number;
    preview?: boolean;
  } | null;

  const pacienteId = body?.pacienteId?.trim() ?? '';
  if (!pacienteId) {
    return NextResponse.json({ ok: false, error: 'pacienteId é obrigatório.' }, { status: 400 });
  }

  const auth = await requireMedicoPacienteMetaadmin(request, pacienteId);
  if (!auth.ok) return auth.res;

  const valorRaw = body?.valorAberto;
  const valorAberto =
    typeof valorRaw === 'number' && Number.isFinite(valorRaw) && valorRaw > 0
      ? valorRaw
      : undefined;

  try {
    if (body?.preview === true) {
      const preview = await previewFinanceiroCobrancaWhatsapp({
        medicoId: auth.medicoDocId,
        pacienteId,
        valorAberto,
      });
      return NextResponse.json({
        ok: true,
        preview: true,
        phone: preview.phone,
        pacienteNome: preview.pacienteNome,
        message: preview.message,
        valorAberto: preview.valorAberto,
        valorLabel: preview.valorLabel,
        canalChatConnected: preview.canalChatConnected,
        canalChatVerified: preview.canalChatVerified,
        pendingPaymentCharge: preview.pendingPaymentCharge,
      });
    }

    const gate = await requestOrSendFinanceiroCobrancaWhatsapp({
      medicoId: auth.medicoDocId,
      pacienteId,
      valorAberto,
    });

    if (gate.status === 'confirmation_sent') {
      return NextResponse.json({
        ok: true,
        status: 'confirmation_sent',
        message: 'Confirmação enviada. A cobrança será enviada automaticamente após o paciente responder OK no Canal Chat.',
      });
    }

    if (gate.status === 'awaiting_confirmation') {
      return NextResponse.json({
        ok: true,
        status: 'awaiting_confirmation',
        message: 'Aguardando confirmação do Canal Chat.',
      });
    }

    return NextResponse.json({
      ok: true,
      status: 'sent',
      phone: gate.result.phone,
      message: 'Cobrança enviada pelo Canal Chat.',
      messageBody: gate.result.message,
      envio: toFinanceiroCobrancaEnvioDto(gate.result.envio),
    });
  } catch (error) {
    console.error('[metaadmin/financeiro/cobranca-whatsapp]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar cobrança.',
      },
      { status: error instanceof WhatsappProviderError ? whatsappTestErrorStatus(error) : 500 },
    );
  }
}
