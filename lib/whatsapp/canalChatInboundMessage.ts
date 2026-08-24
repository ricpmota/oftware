import { CANAL_CHAT_OWNER_ID, CANAL_CHAT_SESSION_ID } from '@/lib/whatsapp/canalChatOwner';

const TEXT_TYPES = new Set(['', 'chat', 'text', 'conversation', 'string', 'extendedtext']);
const MEDIA_TYPES = new Set([
  'image',
  'ptt',
  'audio',
  'document',
  'video',
  'sticker',
  'location',
  'vcard',
  'multi_vcard',
  'list_response',
  'buttons_response',
]);
const SKIP_EVENTS = new Set([
  'onack',
  'ack',
  'onpresencechanged',
  'onparticipantschanged',
  'onreactionmessage',
  'onpollresponse',
  'onrevokedmessage',
  'onlabelupdated',
]);

export type CanalChatInboundMessage = {
  event: string;
  sessionId: string;
  from: string;
  phone: string | null;
  chatIds: string[];
  hasSenderPn: boolean;
  hasBody: boolean;
  text: string;
  type: string;
  isGroup: boolean;
  fromMe: boolean;
  messageId?: string;
};

export type CanalChatInboundDiagnostic = {
  event: string;
  session: string;
  type: string;
  from: string;
  fromMe: boolean | null;
  hasSenderPn: boolean;
  hasBody: boolean;
  normalizedAsOk: boolean | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function unwrapPayload(raw: unknown): Record<string, unknown> | null {
  const root = asRecord(raw);
  if (!root) return null;
  const nested =
    asRecord(root.data) ||
    asRecord(root.response) ||
    asRecord(root.payload) ||
    asRecord(root.msg) ||
    asRecord(root.message);
  return nested ? { ...root, ...nested } : root;
}

export function extractWhatsappSenderPhone(from: string): string | null {
  const raw = from.trim();
  if (!raw) return null;
  if (/@(g\.us|broadcast)\b/i.test(raw)) return null;
  if (/@lid\b/i.test(raw)) return null;
  const user = raw.replace(/@.*$/, '').replace(/\D/g, '');
  if (user.length < 10 || user.length > 15) return null;
  return user;
}

function pickPhoneCandidate(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return extractWhatsappSenderPhone(value) ||
      (/^\d{10,15}$/.test(value.replace(/\D/g, '')) && !/@lid\b/i.test(value)
        ? value.replace(/\D/g, '')
        : null);
  }
  const obj = asRecord(value);
  if (!obj) return null;
  const serialized = pickString(obj, ['_serialized', 'id', 'user', 'phone', 'number', 'pn']);
  return serialized ? pickPhoneCandidate(serialized) : null;
}

function extractInboundText(payload: Record<string, unknown>): string {
  const direct = pickString(payload, [
    'body',
    'content',
    'caption',
    'text',
    'comment',
    'conversation',
    'contentText',
  ]);
  if (direct) return direct;
  const message = asRecord(payload.message);
  if (!message) return '';
  const nested = pickString(message, ['conversation', 'body', 'content', 'text', 'caption']);
  if (nested) return nested;
  const extended = asRecord(message.extendedTextMessage);
  return extended ? pickString(extended, ['text']) : '';
}

export function extractInboundPhone(
  payload: Record<string, unknown>,
  from: string,
  to: string,
  fromMe: boolean,
): string | null {
  const sender = asRecord(payload.sender);
  const key = asRecord(payload.key);
  const candidates = [
    fromMe ? to : from,
    pickString(payload, [
      'senderPn',
      'sender_pn',
      'senderPnJid',
      'participant',
      'author',
      'chatId',
      'chatid',
      'remoteJid',
      'peerJid',
    ]),
    sender
      ? pickString(sender, ['_serialized', 'id', 'user', 'phone', 'number', 'pn', 'senderPn'])
      : '',
    key ? pickString(key, ['remoteJid', 'participant', 'senderPn', 'sender_pn']) : '',
    from,
    to,
  ];
  for (const raw of candidates) {
    const phone = pickPhoneCandidate(raw);
    if (phone) return phone;
  }
  return null;
}

export function normalizeWhatsappChatId(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/@(g\.us|broadcast|newsletter)\b/i.test(value)) return null;
  if (/@(lid|c\.us|s\.whatsapp\.net)\b/i.test(value)) return value.toLowerCase();
  return null;
}

function collectChatIdCandidate(value: unknown, into: Set<string>): void {
  if (typeof value === 'string') {
    const id = normalizeWhatsappChatId(value);
    if (id) into.add(id);
    return;
  }
  const obj = asRecord(value);
  if (!obj) return;
  const serialized = pickString(obj, ['_serialized', 'id', 'user', 'remoteJid', 'chatId']);
  if (serialized) collectChatIdCandidate(serialized, into);
}

export function extractInboundChatIds(
  payload: Record<string, unknown>,
  from: string,
  to: string,
  fromMe: boolean,
): string[] {
  const ids = new Set<string>();
  collectChatIdCandidate(fromMe ? to : from, ids);
  collectChatIdCandidate(
    pickString(payload, ['chatId', 'chatid', 'remoteJid', 'peerJid', 'from', 'to']),
    ids,
  );
  collectChatIdCandidate(payload.sender, ids);
  collectChatIdCandidate(asRecord(payload.sender)?.id, ids);
  collectChatIdCandidate(payload.key, ids);
  collectChatIdCandidate(asRecord(payload.key)?.remoteJid, ids);
  collectChatIdCandidate(from, ids);
  collectChatIdCandidate(to, ids);
  return [...ids];
}

export function inboundPayloadHasSenderPn(payload: Record<string, unknown>): boolean {
  const sender = asRecord(payload.sender);
  const key = asRecord(payload.key);
  const candidates = [
    pickString(payload, ['senderPn', 'sender_pn', 'senderPnJid']),
    sender ? pickString(sender, ['senderPn', 'pn', 'phone', 'number']) : '',
    key ? pickString(key, ['senderPn', 'sender_pn']) : '',
  ];
  return candidates.some((item) => Boolean(item));
}

function maskInboundFrom(from: string): string {
  const trimmed = from.trim();
  if (!trimmed) return '';
  const at = trimmed.lastIndexOf('@');
  const domain = at >= 0 ? trimmed.slice(at) : '';
  const user = at >= 0 ? trimmed.slice(0, at) : trimmed;
  const tail = user.replace(/\D/g, '').slice(-4) || user.slice(-4);
  return `***${tail}${domain.toLowerCase()}`;
}

export function summarizeCanalChatInbound(raw: unknown): CanalChatInboundDiagnostic {
  const payload = unwrapPayload(raw) || {};
  const fromObj = asRecord(payload.from) || asRecord(payload.sender);
  const from =
    pickString(payload, ['from', 'author', 'chatId', 'chatid', 'remoteJid']) ||
    (fromObj ? pickString(fromObj, ['_serialized', 'id', 'user']) : '');
  const text = extractInboundText(payload);
  const hasBody = Boolean(text);
  return {
    event: pickString(payload, ['event', 'eventName', 'wook', 'wook']) || '',
    session: pickString(payload, ['session', 'sessionName', 'sessionId']) || '',
    type: pickString(payload, ['type', 'messageType', 'subtype']) || '',
    from: maskInboundFrom(from),
    fromMe:
      payload.fromMe === true || payload.fromMe === true || payload.self === true
        ? true
        : payload.fromMe === false
          ? false
          : null,
    hasSenderPn: inboundPayloadHasSenderPn(payload),
    hasBody,
    normalizedAsOk: hasBody ? isCanalChatOkText(text) : null,
  };
}

export function isCanalChatOkText(text: string): boolean {
  const normalized = text
    .replace(/[\u200B-\u200D\uFEFF\u2060\u00a0]/g, '')
    .trim()
    .replace(/^[*_~]+|[*_~]+$/g, '')
    .toUpperCase()
    .replace(/[^A-Z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized === 'OK';
}

export function isCanalChatSessionId(
  sessionId: string,
  liveSessionId?: string | null,
): boolean {
  const id = sessionId.trim();
  if (!id) return false;
  if (id === CANAL_CHAT_SESSION_ID || id === CANAL_CHAT_OWNER_ID) return true;
  const live = liveSessionId?.trim();
  return Boolean(live && id === live);
}

export function isInboundTextMessage(type: string, text = ''): boolean {
  const normalized = type.trim().toLowerCase();
  if (MEDIA_TYPES.has(normalized)) return false;
  if (TEXT_TYPES.has(normalized)) return true;
  if (normalized === 'onmessage' || normalized === 'onmsg' || normalized === 'onmessage') {
    return Boolean(text.trim());
  }
  return Boolean(text.trim()) && (!normalized || normalized.includes('message'));
}

export function parseCanalChatInboundPayload(raw: unknown): CanalChatInboundMessage | null {
  const payload = unwrapPayload(raw);
  if (!payload) return null;

  const event = pickString(payload, ['event', 'eventName', 'wook', 'wook']).toLowerCase();
  if (event && SKIP_EVENTS.has(event)) return null;
  if (event && event !== 'onmsg' && !event.includes('message')) return null;

  const fromObj = asRecord(payload.from) || asRecord(payload.sender);
  const from =
    pickString(payload, ['from', 'author', 'chatId', 'chatid', 'remoteJid']) ||
    (fromObj ? pickString(fromObj, ['_serialized', 'id', 'user']) : '');

  const idObj = asRecord(payload.id);
  const messageId =
    pickString(payload, ['id', 'messageId', 'msgId']) ||
    (idObj ? pickString(idObj, ['_serialized', 'id']) : '') ||
    undefined;

  const type = pickString(payload, ['type', 'messageType', 'subtype']);
  const text = extractInboundText(payload);
  const sessionId = pickString(payload, ['session', 'sessionName', 'sessionId']);
  const to =
    pickString(payload, ['to', 'chatId', 'chatid']) ||
    pickPhoneCandidate(payload.to) ||
    '';

  const isGroup =
    payload.isGroupMsg === true ||
    payload.isGroup === true ||
    payload.isGroupMsg === true ||
    /@(g\.us|broadcast)\b/i.test(from);

  const fromMe =
    payload.fromMe === true ||
    payload.fromMe === true ||
    payload.self === true;

  if (!sessionId && !from && !text) return null;

  return {
    event: event || 'onmessage',
    sessionId,
    from,
    phone: extractInboundPhone(payload, from, to, fromMe),
    chatIds: extractInboundChatIds(payload, from, to, fromMe),
    hasSenderPn: inboundPayloadHasSenderPn(payload),
    hasBody: Boolean(text),
    text,
    type,
    isGroup,
    fromMe,
    messageId,
  };
}

export function phoneLookupVariants(normalizedDigits: string): string[] {
  const digits = normalizedDigits.replace(/\D/g, '');
  const variants = new Set<string>();
  if (digits) variants.add(digits);
  if (digits.startsWith('55') && digits.length >= 12) {
    const national = digits.slice(2);
    variants.add(national);
    if (digits.length === 13) {
      const withoutNinth = `${digits.slice(0, 4)}${digits.slice(5)}`;
      variants.add(withoutNinth);
      variants.add(withoutNinth.slice(2));
    }
  } else if (digits.length === 11) {
    variants.add(`55${digits}`);
    variants.add(`${digits.slice(0, 2)}${digits.slice(3)}`);
  } else if (digits.length === 10) {
    variants.add(`55${digits}`);
    const withNinth = `${digits.slice(0, 2)}9${digits.slice(2)}`;
    variants.add(withNinth);
    variants.add(`55${withNinth}`);
  }
  return [...variants].filter((item) => item.length >= 10).slice(0, 10);
}
