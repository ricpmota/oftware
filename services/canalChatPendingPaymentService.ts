import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { withWhatsappProviderAuth } from '@/lib/server/whatsappSessionAuth.server';
import { CANAL_CHAT_OWNER_ID } from '@/lib/whatsapp/canalChatOwner';
import {
  buildCanalChatConfirmationRequestMessage,
  buildPendingPaymentChargeId,
  CANAL_CHAT_PENDING_PAYMENT_CHARGE,
  parsePendingCanalChatPaymentCharge,
  type CanalChatPendingPaymentCharge,
} from '@/lib/whatsapp/canalChatPendingAction';
import {
  prepareFinanceiroCobrancaWhatsapp,
  sendFinanceiroCobrancaWhatsapp,
  type SendFinanceiroCobrancaInput,
} from '@/services/financeiroCobrancaWhatsappService';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import { sendTestMessage } from '@/services/whatsappProviderClient';

const PACIENTES_COLLECTION = 'pacientes_completos';

function patientRef(pacienteId: string) {
  return getFirestoreAdmin().collection(PACIENTES_COLLECTION).doc(pacienteId);
}

function toFirestorePending(action: CanalChatPendingPaymentCharge): Record<string, unknown> {
  return {
    type: CANAL_CHAT_PENDING_PAYMENT_CHARGE,
    paymentId: action.paymentId,
    medicoId: action.medicoId,
    valorAberto: action.valorAberto ?? null,
    status: action.status,
    createdAt: FieldValue.serverTimestamp(),
  };
}

export async function requestCanalChatConfirmationForPaymentCharge(
  input: SendFinanceiroCobrancaInput,
): Promise<'confirmation_sent' | 'awaiting_confirmation'> {
  const pacienteId = input.pacienteId.trim();
  const medicoId = input.medicoId.trim();
  const prepared = await prepareFinanceiroCobrancaWhatsapp(input, {
    requireCanalChatConnected: true,
  });

  const ref = patientRef(pacienteId);
  const snap = await ref.get();
  const existing = parsePendingCanalChatPaymentCharge(snap.data()?.pendingCanalChatAction);

  const nextAction: CanalChatPendingPaymentCharge = {
    type: CANAL_CHAT_PENDING_PAYMENT_CHARGE,
    paymentId: existing?.paymentId || buildPendingPaymentChargeId(pacienteId),
    medicoId,
    valorAberto: input.valorAberto,
    status: 'pending',
  };

  if (existing?.status === 'processing') {
    return 'awaiting_confirmation';
  }

  const message = buildCanalChatConfirmationRequestMessage(prepared.pacienteNome);

  let sentChatId: string | undefined;
  try {
    const { result: sent } = await withWhatsappProviderAuth(CANAL_CHAT_OWNER_ID, prepared.sessionId, (token) =>
      sendTestMessage(prepared.sessionId, token, prepared.phone, message, {
        connectedPhone: prepared.connectedPhone ?? undefined,
      }),
    );
    sentChatId = sent.chatId;
  } catch (error) {
    try {
      await registrarWhatsappMessageLog({
        medicoId,
        type: 'canal_chat_confirmacao',
        status: 'failed',
        phone: prepared.phone,
        message,
        pacienteId,
        pacienteNome: prepared.pacienteNome,
        errorMessage: error instanceof Error ? error.message : 'Falha ao pedir confirmação.',
      });
    } catch {
      /* ignore */
    }
    throw error;
  }

  await ref.set(
    {
      pendingCanalChatAction: toFirestorePending(nextAction),
      canalChatPhoneKey: prepared.phone,
      ...(sentChatId ? { canalChatChatId: sentChatId.toLowerCase() } : {}),
    },
    { merge: true },
  );

  try {
    await registrarWhatsappMessageLog({
      medicoId,
      type: 'canal_chat_confirmacao',
      status: 'sent',
      phone: prepared.phone,
      message,
      pacienteId,
      pacienteNome: prepared.pacienteNome,
    });
  } catch (logError) {
    console.warn('[CanalChat] confirmation log failed:', logError);
  }

  console.info('[CanalChat] Confirmation requested', { patientId: pacienteId });
  return 'confirmation_sent';
}

export async function claimPendingPaymentCharge(
  pacienteId: string,
): Promise<CanalChatPendingPaymentCharge | null> {
  const ref = patientRef(pacienteId);
  return getFirestoreAdmin().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const pending = parsePendingCanalChatPaymentCharge(snap.data()?.pendingCanalChatAction);
    if (!pending || pending.status === 'processing') return null;
    tx.set(
      ref,
      {
        pendingCanalChatAction: {
          type: pending.type,
          paymentId: pending.paymentId,
          medicoId: pending.medicoId,
          valorAberto: pending.valorAberto ?? null,
          status: 'processing',
          processingAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true },
    );
    return pending;
  });
}

export async function clearPendingCanalChatAction(pacienteId: string): Promise<void> {
  await patientRef(pacienteId).set(
    { pendingCanalChatAction: FieldValue.delete() },
    { merge: true },
  );
}

export async function restorePendingPaymentCharge(
  pacienteId: string,
  action: CanalChatPendingPaymentCharge,
): Promise<void> {
  await patientRef(pacienteId).set(
    { pendingCanalChatAction: toFirestorePending({ ...action, status: 'pending' }) },
    { merge: true },
  );
}

export async function flushPendingPaymentChargeAfterOk(
  pacienteId: string,
): Promise<'sent' | 'skipped' | 'failed'> {
  const claimed = await claimPendingPaymentCharge(pacienteId);
  if (!claimed) return 'skipped';

  try {
    await sendFinanceiroCobrancaWhatsapp({
      medicoId: claimed.medicoId,
      pacienteId,
      valorAberto: claimed.valorAberto,
    });
    await clearPendingCanalChatAction(pacienteId);
    console.info('[CanalChat] Pending payment charge sent', {
      patientId: pacienteId,
      paymentId: claimed.paymentId,
    });
    return 'sent';
  } catch (error) {
    await restorePendingPaymentCharge(pacienteId, claimed).catch(() => undefined);
    console.error('[CanalChat] Pending payment charge failed', {
      patientId: pacienteId,
      paymentId: claimed.paymentId,
      error: error instanceof Error ? error.message : 'erro',
    });
    return 'failed';
  }
}
