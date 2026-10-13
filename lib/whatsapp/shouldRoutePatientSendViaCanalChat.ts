import { CANAL_CHAT_OWNER_ID } from '@/lib/whatsapp/canalChatOwner';
import { phonesLikelyMatch } from '@/services/whatsappProviderClient';

/**
 * Automações do WhatsApp do médico não podem enviar para o próprio número conectado
 * (self-send derruba a sessão). Nesse caso o envio deve ir pelo Canal Chat.
 */
export function shouldRoutePatientSendViaCanalChat(params: {
  ownerId: string;
  patientPhone: string;
  ownerPhones: Array<string | null | undefined>;
}): boolean {
  const ownerId = params.ownerId?.trim();
  if (!ownerId || ownerId === CANAL_CHAT_OWNER_ID) return false;

  const patientPhone = params.patientPhone?.trim();
  if (!patientPhone) return false;

  return params.ownerPhones.some((raw) => {
    const phone = typeof raw === 'string' ? raw.trim() : '';
    return phone.length > 0 && phonesLikelyMatch(patientPhone, phone);
  });
}
