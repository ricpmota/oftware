import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

const PACIENTES_COLLECTION = 'pacientes_completos';

export async function persistCanalChatInboundKeys(
  patientId: string,
  keys: { phone?: string | null; chatId?: string | null },
): Promise<void> {
  const id = patientId.trim();
  if (!id) return;

  const payload: Record<string, unknown> = {};
  const phone = keys.phone?.trim();
  const chatId = keys.chatId?.trim().toLowerCase();
  if (phone) payload.canalChatPhoneKey = phone;
  if (chatId && /@(lid|c\.us|s\.whatsapp\.net)\b/i.test(chatId)) {
    payload.canalChatChatId = chatId;
  }
  if (Object.keys(payload).length === 0) return;

  await getFirestoreAdmin().collection(PACIENTES_COLLECTION).doc(id).set(payload, { merge: true });
}
