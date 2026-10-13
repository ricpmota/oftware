import { NextRequest, NextResponse } from 'next/server';
import { notifyMedicoNovaSolicitacaoAcompanhamento } from '@/services/solicitacaoMedicoAvisoWhatsappService';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/send-whatsapp-novo-lead-medico
 * Body: { solicitacaoId }
 * Canal Chat → médico: paciente solicitou acompanhamento e aguarda aprovação.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { solicitacaoId?: string } | null;
    const solicitacaoId = body?.solicitacaoId?.trim() ?? '';
    if (!solicitacaoId) {
      return NextResponse.json({ ok: false, error: 'solicitacaoId é obrigatório' }, { status: 400 });
    }

    const result = await notifyMedicoNovaSolicitacaoAcompanhamento({ solicitacaoId });

    if (result.status === 'sent') {
      return NextResponse.json({ ok: true, status: result.status, phone: result.phone });
    }
    if (result.status === 'already_sent') {
      return NextResponse.json({ ok: true, status: result.status, alreadySent: true });
    }
    return NextResponse.json({
      ok: true,
      status: result.status,
      skipped: true,
      reason: result.reason,
    });
  } catch (error) {
    console.error('[send-whatsapp-novo-lead-medico]', error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Erro ao avisar o médico.',
      },
      { status: 500 },
    );
  }
}
