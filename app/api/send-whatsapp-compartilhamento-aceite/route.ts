import { NextRequest, NextResponse } from 'next/server';
import { notifyCompartilhamentoAceiteWhatsapp } from '@/services/compartilhamentoAceiteWhatsappService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Após aceite do compartilhamento (nutri ou personal):
 * 1) WhatsApp do médico → paciente (apresenta o profissional + telefone)
 * 2) WhatsApp do profissional → paciente (confirma vínculo pelo médico)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const solicitacaoId =
      typeof body?.solicitacaoId === 'string' ? body.solicitacaoId.trim() : '';
    const roleRaw = typeof body?.role === 'string' ? body.role.trim() : '';

    const role =
      roleRaw === 'nutricionista' || roleRaw === 'personal_trainer'
        ? roleRaw
        : roleRaw === 'personal'
          ? 'personal_trainer'
          : null;

    if (!solicitacaoId || !role) {
      return NextResponse.json(
        { error: 'solicitacaoId e role (nutricionista|personal_trainer) são obrigatórios.' },
        { status: 400 },
      );
    }

    const result = await notifyCompartilhamentoAceiteWhatsapp({
      solicitacaoId,
      role,
      force: body?.force === true,
    });

    const httpOk = result.ok || result.jaEnviado === true;
    return NextResponse.json(
      {
        success: httpOk,
        jaEnviado: result.jaEnviado === true,
        medico: result.medico,
        profissional: result.profissional,
        error:
          httpOk
            ? undefined
            : [result.medico.error, result.profissional.error].filter(Boolean).join(' | ') ||
              'Nenhuma mensagem enviada.',
      },
      { status: httpOk ? 200 : 502 },
    );
  } catch (error) {
    console.error('send-whatsapp-compartilhamento-aceite:', error);
    return NextResponse.json(
      {
        error: 'Erro ao enviar WhatsApp de aceite.',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
