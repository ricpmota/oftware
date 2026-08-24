import { primeiroNomePaciente } from '@/lib/aplicacao/buildAplicacaoWhatsAppMessage';

export const CANAL_CHAT_PENDING_PAYMENT_CHARGE = 'PAYMENT_CHARGE';

export type CanalChatPendingPaymentCharge = {
  type: typeof CANAL_CHAT_PENDING_PAYMENT_CHARGE;
  paymentId: string;
  medicoId: string;
  valorAberto?: number;
  status: 'pending' | 'processing';
};

export function buildCanalChatConfirmationRequestMessage(pacienteNome: string): string {
  const nome = primeiroNomePaciente(pacienteNome);
  return [
    `Olá, ${nome}! 👋`,
    '',
    'Este é o Canal Chat oficial utilizado para comunicações relacionadas ao seu acompanhamento.',
    '',
    '📲 Salve este número nos seus contatos para garantir que nossas mensagens cheguem corretamente até você.',
    '',
    'Para confirmar este canal, responda apenas:',
    '',
    'OK ✅',
  ].join('\n');
}

export function buildPendingPaymentChargeId(pacienteId: string): string {
  return `charge_${pacienteId.trim()}`;
}

export function parsePendingCanalChatPaymentCharge(
  raw: unknown,
): CanalChatPendingPaymentCharge | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const data = raw as Record<string, unknown>;
  if (data.type !== CANAL_CHAT_PENDING_PAYMENT_CHARGE) return null;
  const paymentId = typeof data.paymentId === 'string' ? data.paymentId.trim() : '';
  const medicoId = typeof data.medicoId === 'string' ? data.medicoId.trim() : '';
  if (!paymentId || !medicoId) return null;
  const valorRaw = data.valorAberto;
  const valorAberto =
    typeof valorRaw === 'number' && Number.isFinite(valorRaw) && valorRaw > 0 ? valorRaw : undefined;
  const status = data.status === 'processing' ? 'processing' : 'pending';
  return { type: CANAL_CHAT_PENDING_PAYMENT_CHARGE, paymentId, medicoId, valorAberto, status };
}
