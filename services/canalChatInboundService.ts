import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { CANAL_CHAT_OWNER_ID } from '@/lib/whatsapp/canalChatOwner';
import {
  isCanalChatOkText,
  isCanalChatSessionId,
  isInboundTextMessage,
  parseCanalChatInboundPayload,
  phoneLookupVariants,
  summarizeCanalChatInbound,
  type CanalChatInboundMessage,
} from '@/lib/whatsapp/canalChatInboundMessage';
import { CANAL_CHAT_PENDING_PAYMENT_CHARGE } from '@/lib/whatsapp/canalChatPendingAction';
import { flushPendingPaymentChargeAfterOk } from '@/services/canalChatPendingPaymentService';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import {
  normalizeWhatsappPhone,
  phonesLikelyMatch,
} from '@/services/whatsappProviderClient';

const PACIENTES_COLLECTION = 'pacientes_completos';

export type CanalChatInboundResult =
  | { status: 'verified'; patientId: string; organizationId?: string }
  | { status: 'already_verified'; patientId: string; organizationId?: string }
  | { status: 'ignored'; reason: string };

function logCanalChatInbound(raw: unknown, result: CanalChatInboundResult): void {
  const diagnostic = summarizeCanalChatInbound(raw);
  console.info('[CanalChatInbound]', {
    event: diagnostic.event,
    session: diagnostic.session,
    type: diagnostic.type,
    from: diagnostic.from,
    fromMe: diagnostic.fromMe,
    hasSenderPn: diagnostic.hasSenderPn,
    hasBody: diagnostic.hasBody,
    normalizedAsOk: diagnostic.normalizedAsOk,
    reason:
      result.status === 'ignored'
        ? result.reason
        : result.status === 'verified'
          ? 'verified'
          : 'already_verified',
    status: result.status,
  });
}

function extractPatientPhone(data: Record<string, unknown>): string | null {
  const dadosIdentificacao = data.dadosIdentificacao as Record<string, unknown> | undefined;
  const candidates = [
    data.canalChatPhoneKey,
    dadosIdentificacao?.telefone,
    data.telefone,
    data.celular,
    data.phone,
    data.whatsapp,
    data.telefoneWhatsApp,
  ];
  for (const raw of candidates) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    try {
      return normalizeWhatsappPhone(raw);
    } catch {
      const digits = raw.replace(/\D/g, '');
      if (digits.length >= 10) return digits;
    }
  }
  return null;
}

async function queryByPhoneField(
  field: string,
  variants: string[],
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  try {
    const snap = await getFirestoreAdmin()
      .collection(PACIENTES_COLLECTION)
      .where(field, 'in', variants)
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, data: doc.data() as Record<string, unknown> }));
  } catch {
    return [];
  }
}

async function findPatientsByChatId(
  chatIds: string[],
): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  const unique = [...new Set(chatIds.map((id) => id.trim().toLowerCase()).filter(Boolean))].slice(
    0,
    5,
  );
  if (unique.length === 0) return [];

  const snaps = await Promise.all(
    unique.map(async (chatId) => {
      try {
        const snap = await getFirestoreAdmin()
          .collection(PACIENTES_COLLECTION)
          .where('canalChatChatId', '==', chatId)
          .limit(5)
          .get();
        return snap.docs.map((doc) => ({
          id: doc.id,
          data: doc.data() as Record<string, unknown>,
        }));
      } catch {
        return [];
      }
    }),
  );

  const byId = new Map<string, Record<string, unknown>>();
  for (const rows of snaps) {
    for (const row of rows) byId.set(row.id, row.data);
  }
  return [...byId.entries()].map(([id, data]) => ({ id, data }));
}

async function findPatientsByWhatsappPhone(phone: string): Promise<
  Array<{ id: string; data: Record<string, unknown> }>
> {
  let normalized = phone;
  try {
    normalized = normalizeWhatsappPhone(phone);
  } catch {
    normalized = phone.replace(/\D/g, '');
  }
  const variants = phoneLookupVariants(normalized);
  if (variants.length === 0) return [];

  const snaps = await Promise.all([
    queryByPhoneField('canalChatPhoneKey', variants),
    queryByPhoneField('dadosIdentificacao.telefone', variants),
    queryByPhoneField('telefone', variants),
  ]);

  const byId = new Map<string, Record<string, unknown>>();
  for (const rows of snaps) {
    for (const row of rows) byId.set(row.id, row.data);
  }

  const matched: Array<{ id: string; data: Record<string, unknown> }> = [];
  for (const [id, data] of byId) {
    const docPhone = extractPatientPhone(data);
    const key = typeof data.canalChatPhoneKey === 'string' ? data.canalChatPhoneKey : '';
    const keyMatch = Boolean(key && phonesLikelyMatch(key, normalized));
    const phoneMatch = docPhone ? phonesLikelyMatch(docPhone, normalized) : false;
    if (keyMatch || phoneMatch) matched.push({ id, data });
  }
  return matched;
}

async function findPendingPatientsFallback(params: {
  phone: string | null;
  chatIds: string[];
}): Promise<Array<{ id: string; data: Record<string, unknown> }>> {
  let normalized = params.phone;
  if (normalized) {
    try {
      normalized = normalizeWhatsappPhone(normalized);
    } catch {
      normalized = normalized.replace(/\D/g, '');
    }
  }
  const chatIds = new Set(params.chatIds.map((id) => id.toLowerCase()));
  try {
    const snap = await getFirestoreAdmin()
      .collection(PACIENTES_COLLECTION)
      .where('pendingCanalChatAction.type', '==', CANAL_CHAT_PENDING_PAYMENT_CHARGE)
      .get();
    const matched: Array<{ id: string; data: Record<string, unknown> }> = [];
    for (const doc of snap.docs) {
      const data = doc.data() as Record<string, unknown>;
      const storedChatId =
        typeof data.canalChatChatId === 'string' ? data.canalChatChatId.toLowerCase() : '';
      if (storedChatId && chatIds.has(storedChatId)) {
        matched.push({ id: doc.id, data });
        continue;
      }
      if (!normalized) continue;
      const docPhone = extractPatientPhone(data);
      const key = typeof data.canalChatPhoneKey === 'string' ? data.canalChatPhoneKey : '';
      if (
        (key && phonesLikelyMatch(key, normalized)) ||
        (docPhone && phonesLikelyMatch(docPhone, normalized))
      ) {
        matched.push({ id: doc.id, data });
      }
    }
    return matched;
  } catch (error) {
    console.warn('[CanalChatInbound] pending fallback failed', error instanceof Error ? error.message : 'erro');
    return [];
  }
}

async function markPatientVerified(
  patientId: string,
  message: CanalChatInboundMessage,
  alreadyVerified: boolean,
): Promise<void> {
  if (alreadyVerified) return;
  const payload: Record<string, unknown> = {
    canalChatVerified: true,
    canalChatVerifiedAt: FieldValue.serverTimestamp(),
  };
  if (message.messageId) payload.canalChatVerifiedByMessageId = message.messageId;
  if (message.phone) payload.canalChatPhoneKey = message.phone;
  if (message.chatIds[0]) payload.canalChatChatId = message.chatIds[0];
  await getFirestoreAdmin().collection(PACIENTES_COLLECTION).doc(patientId).set(payload, {
    merge: true,
  });
}

export async function processCanalChatInbound(raw: unknown): Promise<CanalChatInboundResult> {
  const message = parseCanalChatInboundPayload(raw);
  const result = await processParsedCanalChatInbound(message);
  logCanalChatInbound(raw, result);
  return result;
}

async function processParsedCanalChatInbound(
  message: CanalChatInboundMessage | null,
): Promise<CanalChatInboundResult> {
  if (!message) return { status: 'ignored', reason: 'payload_invalido' };
  if (message.isGroup) return { status: 'ignored', reason: 'grupo' };
  if (!isInboundTextMessage(message.type, message.text)) {
    return { status: 'ignored', reason: 'nao_texto' };
  }
  if (!isCanalChatOkText(message.text)) return { status: 'ignored', reason: 'nao_ok' };
  if (message.fromMe && !message.phone && message.chatIds.length === 0) {
    return { status: 'ignored', reason: 'mensagem_propria' };
  }

  const connection = await getWhatsappConnectionByDoctor(CANAL_CHAT_OWNER_ID);
  const sessionOk =
    isCanalChatSessionId(message.sessionId, connection?.sessionId) || !message.sessionId.trim();
  if (!sessionOk) {
    return { status: 'ignored', reason: 'sessao_nao_canal_chat' };
  }
  if (!message.phone && message.chatIds.length === 0) {
    return { status: 'ignored', reason: 'telefone_ausente' };
  }

  // 1 chatId WhatsApp → 2 senderPn → 3 from @c.us → 4 telefone cadastro → 5 pending
  let patients = message.chatIds.length > 0 ? await findPatientsByChatId(message.chatIds) : [];
  if (patients.length === 0 && message.phone) {
    patients = await findPatientsByWhatsappPhone(message.phone);
  }
  if (patients.length === 0) {
    patients = await findPendingPatientsFallback({
      phone: message.phone,
      chatIds: message.chatIds,
    });
  }
  if (patients.length === 0) return { status: 'ignored', reason: 'paciente_nao_encontrado' };

  let already: CanalChatInboundResult | null = null;
  let verified: CanalChatInboundResult | null = null;

  for (const patient of patients) {
    const organizationId =
      typeof patient.data.organizationId === 'string' ? patient.data.organizationId : undefined;
    const wasVerified = patient.data.canalChatVerified === true;
    await markPatientVerified(patient.id, message, wasVerified);
    if (wasVerified) {
      already = { status: 'already_verified', patientId: patient.id, organizationId };
    } else {
      verified = { status: 'verified', patientId: patient.id, organizationId };
      try {
        await flushPendingPaymentChargeAfterOk(patient.id);
      } catch (error) {
        console.error('[CanalChatInbound] Pending charge flush failed', {
          patientId: patient.id,
          error: error instanceof Error ? error.message : 'erro',
        });
      }
    }
  }

  return verified ?? already ?? { status: 'ignored', reason: 'paciente_nao_encontrado' };
}
