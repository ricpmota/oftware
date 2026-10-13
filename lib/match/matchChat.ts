export const MATCH_MESSAGE_MAX = 2000;
export const MATCH_FILE_MAX = 12 * 1024 * 1024;

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const FILE_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'audio/mpeg',
  'video/mp4',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);
const EXT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
  txt: 'text/plain',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export type MatchChatAttachment = {
  url: string;
  name: string;
  contentType: string;
  kind: 'image' | 'file';
};

export type ChatAccess = 'ok' | 'blocked' | 'inactive' | 'forbidden';

export function prepareMessageText(raw: string, allowEmpty = false): { ok: true; text: string } | { ok: false } {
  const text = raw.trim();
  if (text.length > MATCH_MESSAGE_MAX) return { ok: false };
  if (!text && !allowEmpty) return { ok: false };
  return { ok: true, text };
}

export function matchFileContentType(name: string, type: string): string | null {
  const declared = type.trim().toLowerCase();
  const ext = name.split('.').pop()?.trim().toLowerCase() || '';
  const fromExt = EXT_TYPES[ext];
  const resolved = IMAGE_TYPES.has(declared) || FILE_TYPES.has(declared) ? declared : fromExt;
  if (!resolved || !(IMAGE_TYPES.has(resolved) || FILE_TYPES.has(resolved))) return null;
  return resolved;
}

export function matchAttachmentKind(contentType: string): 'image' | 'file' {
  return IMAGE_TYPES.has(contentType) ? 'image' : 'file';
}

export function safeAttachmentName(name: string): string {
  const base = name.split(/[/\\]/).pop()?.trim() || 'arquivo';
  const clean = base.replace(/[^\w.\- ]+/g, '').slice(0, 80);
  return clean || 'arquivo';
}

export function chatAccess(input: {
  blocked: boolean;
  connectionExists: boolean;
  connectionActive: boolean;
  member: boolean;
}): ChatAccess {
  if (!input.member || !input.connectionExists) return 'forbidden';
  if (input.blocked) return 'blocked';
  if (!input.connectionActive) return 'inactive';
  return 'ok';
}

export function messageDayLabel(ms: number, now = Date.now()): string {
  const day = 24 * 60 * 60 * 1000;
  const start = (value: number) => {
    const date = new Date(value);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  };
  const days = Math.round((start(now) - start(ms)) / day);
  if (days <= 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long' }).format(new Date(ms));
}

export function messageClock(ms: number): string {
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
}
