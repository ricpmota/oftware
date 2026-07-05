/** Parsing e logs de mensagens Instagram/Messenger (entry[].messaging[]). */

export type IncomingInstagramMessage = {
  senderId: string;
  recipientId: string;
  messageText: string;
  timestamp?: number;
};

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function parseJsonSafe(raw: string): unknown | null {
  try {
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return null;
  }
}

function coalesceId(value: unknown): string | undefined {
  if (typeof value === 'string' && value !== '') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function normalizeTimestamp(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** Extrai e registra mensagens de texto em entry[].messaging[] (Instagram / Messenger). */
export function extractIncomingInstagramMessages(
  payload: unknown,
): IncomingInstagramMessage[] {
  const messages: IncomingInstagramMessage[] = [];

  if (!isRecord(payload)) return messages;

  const entries = payload.entry;
  if (!Array.isArray(entries)) return messages;

  for (const entryItem of entries) {
    if (!isRecord(entryItem)) continue;

    const entryId = coalesceId(entryItem.id);
    const messaging = entryItem.messaging;
    if (!Array.isArray(messaging)) continue;

    for (const eventItem of messaging) {
      if (!isRecord(eventItem)) continue;

      const sender = eventItem.sender;
      const recipient = eventItem.recipient;
      const message = eventItem.message;
      if (!isRecord(sender) || !isRecord(recipient) || !isRecord(message)) continue;

      const msgEcho = message.is_echo === true;
      if (msgEcho) continue;

      const senderId = coalesceId(sender.id);
      const recipientId = coalesceId(recipient.id);
      if (senderId == null || recipientId == null) continue;

      if (entryId != null && senderId === entryId) continue;

      const textRaw = message.text;
      if (typeof textRaw !== 'string' || textRaw.trim() === '') continue;

      messages.push({
        senderId,
        recipientId,
        messageText: textRaw,
        timestamp:
          normalizeTimestamp(eventItem.timestamp) ?? normalizeTimestamp(message.timestamp),
      });
    }
  }

  return messages;
}

/** Extrai e registra mensagens de texto em entry[].messaging[] (Instagram / Messenger). */
export function logIncomingInstagramMessages(payload: unknown): IncomingInstagramMessage[] {
  const messages = extractIncomingInstagramMessages(payload);

  for (const message of messages) {
    console.log('Instagram message received');
    console.log('senderId', message.senderId);
    console.log('recipientId', message.recipientId);
    console.log('messageText', message.messageText);
    console.log('timestamp', message.timestamp ?? 'unknown');
  }

  return messages;
}
