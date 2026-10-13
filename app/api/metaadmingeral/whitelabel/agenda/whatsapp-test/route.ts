import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { getAgendaSettings } from '@/lib/whiteLabel/agendaSettingsService';
import {
  buildWhiteLabelMeetingAvisoResponsavelMessage,
  buildWhiteLabelMeetingConfirmacaoLeadMessage,
} from '@/lib/whiteLabel/buildWhiteLabelMeetingWhatsAppMessages';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getWhatsappMedicoContext } from '@/lib/server/whatsappMedicoContext.server';
import { withWhatsappProviderAuth } from '@/lib/server/whatsappSessionAuth.server';
import { InternationalPhoneError } from '@/lib/whatsapp/resolveInternationalPhone';
import { resolveWhatsappTestDestination } from '@/lib/whatsapp/resolveWhatsappTestDestination';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import { sendTestMessage, WhatsappProviderError } from '@/services/whatsappProviderClient';

export const runtime = 'nodejs';

async function findDoctorIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const db = getFirestoreAdmin();
  const exact = await db.collection('medicos').where('email', '==', normalized).limit(1).get();
  if (!exact.empty) return exact.docs[0].id;
  const all = await db.collection('medicos').select('email').get();
  const match = all.docs.find(
    (d) => String(d.data().email || '').trim().toLowerCase() === normalized
  );
  return match?.id || null;
}

/**
 * POST /api/metaadmingeral/whitelabel/agenda/whatsapp-test
 *
 * Lead (digitação manual na UI): { target: 'lead', telefone, telefoneDdi, telefonePais }
 *   → resolveWhatsappTestDestination → sendTestMessage(..., { phoneIsResolved: true })
 *
 * Responsável (entidade BR-only em settings): { target: 'responsavel', phone? }
 *   → legado, sem phoneIsResolved.
 *
 * `phoneIsResolved` / `telefoneE164` do client são ignorados.
 */
export async function POST(request: NextRequest) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => null)) as {
      target?: 'lead' | 'responsavel';
      phone?: string;
      telefone?: string;
      telefoneDdi?: string;
      telefonePais?: string;
    } | null;

    const target = body?.target;
    if (target !== 'lead' && target !== 'responsavel') {
      return NextResponse.json(
        { error: 'Informe target: "lead" ou "responsavel".' },
        { status: 400 }
      );
    }

    const settings = await getAgendaSettings();
    const senderEmail = settings.whatsappSenderDoctorEmail || settings.whatsappResponsavelEmail;
    const doctorId = await findDoctorIdByEmail(senderEmail);
    if (!doctorId) {
      return NextResponse.json(
        { error: `Médico remetente não encontrado: ${senderEmail}` },
        { status: 404 }
      );
    }

    const connection = await getWhatsappConnectionByDoctor(doctorId);
    if (!connection || connection.status !== 'connected') {
      return NextResponse.json(
        { error: 'Conecte o WhatsApp do médico remetente no MetaAdmin antes de testar.' },
        { status: 409 }
      );
    }

    const sampleCtx = {
      leadNome: 'Lead Teste',
      leadEmail: 'lead.teste@email.com',
      leadWhatsapp: body?.telefone?.trim() || body?.phone?.trim() || '5511999999999',
      profissao: 'medico' as const,
      date: new Date().toISOString().slice(0, 10),
      startTime: '10:00',
      endTime: '11:00',
      googleMeetLink: 'https://meet.google.com/teste-oftware',
    };

    let phone: string;
    let phoneIsResolved = false;

    if (target === 'lead') {
      try {
        phone = resolveWhatsappTestDestination({
          telefone: body?.telefone ?? body?.phone,
          telefoneDdi: body?.telefoneDdi,
          telefonePais: body?.telefonePais,
        });
        phoneIsResolved = true;
      } catch (error) {
        if (error instanceof InternationalPhoneError) {
          return NextResponse.json(
            {
              error:
                error.code === 'EMPTY'
                  ? 'Informe o telefone do lead para o teste.'
                  : error.message,
            },
            { status: 400 }
          );
        }
        throw error;
      }
    } else {
      phone = (body?.phone?.trim() || settings.whatsappResponsavelPhone).trim();
      if (!phone) {
        return NextResponse.json(
          { error: 'Configure o WhatsApp do responsável antes de testar.' },
          { status: 400 }
        );
      }
    }

    const message =
      target === 'lead'
        ? `[TESTE]\n\n${buildWhiteLabelMeetingConfirmacaoLeadMessage(sampleCtx)}`
        : `[TESTE]\n\n${buildWhiteLabelMeetingAvisoResponsavelMessage(sampleCtx)}`;

    const sessionId =
      connection.sessionId?.trim() || (await getWhatsappMedicoContext(doctorId)).sessionId;

    const { result } = await withWhatsappProviderAuth(doctorId, sessionId, (token) =>
      sendTestMessage(sessionId, token, phone, message, {
        connectedPhone: connection.phone,
        allowSelfSend: true,
        ...(phoneIsResolved ? { phoneIsResolved: true } : {}),
      })
    );

    await registrarWhatsappMessageLog({
      medicoId: doctorId,
      type: 'whitelabel_meeting',
      status: 'sent',
      phone: result.phone ?? phone,
      message,
    });

    return NextResponse.json({
      ok: true,
      target,
      phone: result.phone ?? phone,
      message: result.mock
        ? 'Mensagem de teste simulada (modo mock).'
        : `Teste de alerta (${target === 'lead' ? 'lead' : 'responsável'}) enviado.`,
    });
  } catch (error) {
    console.error('[API agenda/whatsapp-test]', error);
    const failMessage =
      error instanceof WhatsappProviderError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Erro ao enviar teste.';
    return NextResponse.json(
      { ok: false, error: failMessage },
      { status: error instanceof WhatsappProviderError ? 400 : 500 }
    );
  }
}
