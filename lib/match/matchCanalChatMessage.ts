/** Texto do Canal Chat quando os dois se conectam. Sem dado clínico. */

export const MATCH_CANAL_CHAT_TEMPLATE_MAX = 1200;

/** {{nome}} é quem deu match. {{comuns}} vira a lista; some se não houver pontos em comum. */
export const DEFAULT_MATCH_CANAL_CHAT_TEMPLATE = `{{nome}} deu match com você no Match Saudável.

Vocês têm em comum:
{{comuns}}`;

export function sanitizeMatchCanalChatTemplate(value: string): string {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, MATCH_CANAL_CHAT_TEMPLATE_MAX);
}

function fillToken(source: string, token: string, value: string): string {
  return source.split(token).join(value);
}

export function renderMatchCanalChatTemplate(
  template: string,
  otherName: string,
  commonLabels: string[],
): string {
  const name = otherName.trim() || 'Alguém';
  const labels = commonLabels.map((label) => label.trim()).filter(Boolean).slice(0, 8);
  const source = sanitizeMatchCanalChatTemplate(template) || DEFAULT_MATCH_CANAL_CHAT_TEMPLATE;
  const bullets = labels.map((label) => `• ${label}`).join('\n');
  const lines = fillToken(source, '{{nome}}', name).split('\n');
  const out: string[] = [];
  for (const line of lines) {
    if (!line.includes('{{comuns}}')) {
      out.push(line);
      continue;
    }
    if (!labels.length) {
      while (out.length && out[out.length - 1].trim() === '') out.pop();
      const previous = out[out.length - 1]?.trim() ?? '';
      if (previous.endsWith(':') && previous.length <= 80 && !previous.includes('{{')) out.pop();
      while (out.length && out[out.length - 1].trim() === '') out.pop();
      const rest = fillToken(line, '{{comuns}}', '').trim();
      if (rest) out.push(rest);
      continue;
    }
    out.push(fillToken(line, '{{comuns}}', bullets));
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function buildMatchCanalChatMessage(otherName: string, commonLabels: string[]): string {
  return renderMatchCanalChatTemplate(DEFAULT_MATCH_CANAL_CHAT_TEMPLATE, otherName, commonLabels);
}
