export type PacienteMensagemAnexo = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
};

/**
 * Remove scripts/handlers perigosos, mantendo formatação comum de e-mail.
 */
export function sanitizeMensagemHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  let out = html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, '$1=$2#$2')
    .replace(/<\/?(iframe|object|embed|link|meta|base)[^>]*>/gi, '');
  return out.trim();
}

/** Texto puro para preview / campo legado `mensagem`. */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
