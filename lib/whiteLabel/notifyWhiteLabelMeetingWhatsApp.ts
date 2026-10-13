import { getAgendaSettings } from '@/lib/whiteLabel/agendaSettingsService';
import {
  buildWhiteLabelMeetingAvisoResponsavelMessage,
  buildWhiteLabelMeetingConfirmacaoLeadMessage,
  type WhiteLabelMeetingWhatsAppContext,
} from '@/lib/whiteLabel/buildWhiteLabelMeetingWhatsAppMessages';
import { getWhatsappMedicoContext } from '@/lib/server/whatsappMedicoContext.server';
import { withWhatsappProviderAuth } from '@/lib/server/whatsappSessionAuth.server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import { sendTestMessage, WhatsappProviderError } from '@/services/whatsappProviderClient';
import { tryResolvePhoneFromLeadDoc } from '@/lib/whatsapp/resolveLeadPhone';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function findDoctorIdByEmail(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const db = getFirestoreAdmin();
  const exact = await db.collection('medicos').where('email', '==', normalized).limit(1).get();
  if (!exact.empty) return exact.docs[0].id;

  const all = await db.collection('medicos').select('email').get();
  const match = all.docs.find((d) => normalizeEmail(String(d.data().email || '')) === normalized);
  return match?.id || null;
}

async function sendViaDoctorSession(params: {
  doctorId: string;
  phone: string;
  message: string;
  phoneIsResolved?: boolean;
}): Promise<{ ok: true; phone?: string } | { ok: false; error: string }> {
  const connection = await getWhatsappConnectionByDoctor(params.doctorId);
  if (!connection || connection.status !== 'connected') {
    return {
      ok: false,
      error: 'WhatsApp do médico remetente não está conectado no MetaAdmin.',
    };
  }

  const sessionId =
    connection.sessionId?.trim() || (await getWhatsappMedicoContext(params.doctorId)).sessionId;

  try {
    const { result } = await withWhatsappProviderAuth(params.doctorId, sessionId, (token) =>
      sendTestMessage(sessionId, token, params.phone, params.message, {
        connectedPhone: connection.phone,
        allowSelfSend: true,
        ...(params.phoneIsResolved ? { phoneIsResolved: true } : {}),
      })
    );

    await registrarWhatsappMessageLog({
      medicoId: params.doctorId,
      type: 'whitelabel_meeting',
      status: 'sent',
      phone: result.phone ?? params.phone,
      message: params.message,
    });

    return { ok: true, phone: result.phone };
  } catch (error) {
    const failMessage =
      error instanceof WhatsappProviderError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Erro ao enviar WhatsApp.';

    await registrarWhatsappMessageLog({
      medicoId: params.doctorId,
      type: 'whitelabel_meeting',
      status: 'failed',
      phone: params.phone,
      message: params.message,
      errorMessage: failMessage,
    }).catch(() => undefined);

    return { ok: false, error: failMessage };
  }
}

export type NotifyWhiteLabelMeetingWhatsAppResult = {
  attempted: boolean;
  lead?: { ok: boolean; error?: string };
  responsavel?: { ok: boolean; error?: string };
  skippedReason?: string;
};

/**
 * Confirmação WhatsApp do agendamento WL para o lead e/ou responsável.
 * Nunca deve derrubar a criação da reunião — erros ficam só no retorno/log.
 */
export async function notifyWhiteLabelMeetingWhatsApp(
  ctx: WhiteLabelMeetingWhatsAppContext
): Promise<NotifyWhiteLabelMeetingWhatsAppResult> {
  const settings = await getAgendaSettings();

  if (!settings.whatsappConfirmacaoEnabled) {
    return { attempted: false, skippedReason: 'Confirmação WhatsApp desativada nas configurações.' };
  }

  if (!settings.whatsappNotifyLead && !settings.whatsappNotifyResponsavel) {
    return { attempted: false, skippedReason: 'Nenhum destinatário de WhatsApp habilitado.' };
  }

  const senderEmail = settings.whatsappSenderDoctorEmail || settings.whatsappResponsavelEmail;
  const doctorId = await findDoctorIdByEmail(senderEmail);
  if (!doctorId) {
    return {
      attempted: false,
      skippedReason: `Médico remetente não encontrado: ${senderEmail}`,
    };
  }

  const result: NotifyWhiteLabelMeetingWhatsAppResult = { attempted: true };

  if (settings.whatsappNotifyLead) {
    const resolvedLeadPhone = tryResolvePhoneFromLeadDoc({
      whatsapp: ctx.leadWhatsapp,
      whatsappDdi: ctx.leadWhatsappDdi,
      whatsappPais: ctx.leadWhatsappPais,
    });
    if (!resolvedLeadPhone) {
      result.lead = { ok: false, error: 'Lead sem WhatsApp cadastrado.' };
    } else {
      const message = buildWhiteLabelMeetingConfirmacaoLeadMessage(ctx);
      const sent = await sendViaDoctorSession({
        doctorId,
        phone: resolvedLeadPhone,
        message,
        phoneIsResolved: true,
      });
      result.lead = sent.ok ? { ok: true } : { ok: false, error: sent.error };
    }
  }

  if (settings.whatsappNotifyResponsavel) {
    const phone = settings.whatsappResponsavelPhone?.trim();
    if (!phone) {
      result.responsavel = { ok: false, error: 'Telefone do responsável não configurado.' };
    } else {
      const message = buildWhiteLabelMeetingAvisoResponsavelMessage(ctx);
      const sent = await sendViaDoctorSession({ doctorId, phone, message });
      result.responsavel = sent.ok ? { ok: true } : { ok: false, error: sent.error };
    }
  }

  return result;
}
