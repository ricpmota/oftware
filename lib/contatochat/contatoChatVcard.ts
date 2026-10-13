export type ContatoChatVcardInput = {
  contactName: string;
  organizationName: string;
  phoneDigits: string;
  websiteUrl: string;
  note: string;
  photoUrl?: string | null;
};

function escapeVcardText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function foldVcardLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let remaining = line;
  chunks.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    chunks.push(` ${remaining.slice(0, 74)}`);
    remaining = remaining.slice(74);
  }
  return chunks.join('\r\n');
}

export function buildContatoChatVcard(input: ContatoChatVcardInput): string {
  const digits = input.phoneDigits.replace(/\D/g, '');
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVcardText(input.contactName)}`,
    `ORG:${escapeVcardText(input.organizationName)}`,
    `TEL;TYPE=CELL:+${digits}`,
    `URL:${input.websiteUrl.trim() || 'https://www.oftware.com.br'}`,
    `NOTE:${escapeVcardText(input.note)}`,
  ];
  const photo = input.photoUrl?.trim();
  if (photo) {
    lines.push(`PHOTO;VALUE=URI:${photo}`);
  }
  lines.push('END:VCARD');
  return `${lines.map(foldVcardLine).join('\r\n')}\r\n`;
}

export const CONTATO_CHAT_VCARD_NOTE =
  'Canal de notificações, novidades e atualizações do seu acompanhamento.';

export function contatoChatVcardFilename(contactName: string): string {
  const slug = contactName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'notificacoes'}.vcf`;
}
