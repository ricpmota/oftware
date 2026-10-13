import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { parsePendingCanalChatPaymentCharge } from '@/lib/whatsapp/canalChatPendingAction';
import { clearPendingCanalChatAction } from '@/services/canalChatPendingPaymentService';
import {
  sendFinanceiroCobrancaWhatsapp,
  type SendFinanceiroCobrancaInput,
  type SendFinanceiroCobrancaResult,
} from '@/services/financeiroCobrancaWhatsappService';

const PACIENTES_COLLECTION = 'pacientes_completos';

export type FinanceiroCobrancaGateResult =
  | { status: 'sent'; result: SendFinanceiroCobrancaResult }
  | { status: 'confirmation_sent' }
  | { status: 'awaiting_confirmation' };

/**
 * Envia a cobrança imediatamente pelo Canal Chat.
 * A confirmação prévia por OK foi descontinuada — o paciente salva o número em /contatochat.
 */
export async function requestOrSendFinanceiroCobrancaWhatsapp(
  input: SendFinanceiroCobrancaInput,
): Promise<FinanceiroCobrancaGateResult> {
  const result = await sendFinanceiroCobrancaWhatsapp(input);
  const pacienteId = input.pacienteId.trim();

  try {
    const snap = await getFirestoreAdmin().collection(PACIENTES_COLLECTION).doc(pacienteId).get();
    if (parsePendingCanalChatPaymentCharge(snap.data()?.pendingCanalChatAction)) {
      await clearPendingCanalChatAction(pacienteId);
    }
  } catch {
    /* envio já ocorreu */
  }

  return { status: 'sent', result };
}
