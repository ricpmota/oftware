/** PDF + imagens raster aceites em Exames de Imagem (upload + Gemini). */

export const EXAMES_IMAGEM_PDF_MIME = 'application/pdf';

export const EXAMES_IMAGEM_IMAGE_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

const EXT_TO_MIME: Record<string, string> = {
  pdf: EXAMES_IMAGEM_PDF_MIME,
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

export function extensaoArquivoLower(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

/** MIME estável a partir do ficheiro (corrige type vazio no mobile). */
export function mimeNormalizadoExameImagem(file: { type?: string; name: string }): string {
  const raw = (file.type || '').split(';')[0].trim().toLowerCase();
  if (raw && raw !== 'application/octet-stream') return raw;
  const ext = extensaoArquivoLower(file.name);
  return EXT_TO_MIME[ext] || raw || 'application/octet-stream';
}

export function isMimeExameImagemAceito(mime: string): boolean {
  const m = mime.split(';')[0].trim().toLowerCase();
  if (m === EXAMES_IMAGEM_PDF_MIME) return true;
  return (EXAMES_IMAGEM_IMAGE_MIMES as readonly string[]).includes(m);
}

/** Para pré-visualização: imagem raster vs PDF. */
export function exameImagemExibeComoImagem(
  mimeArquivo: string | null | undefined,
  nomeArquivo: string | null | undefined
): boolean {
  if (mimeArquivo) {
    const m = mimeArquivo.split(';')[0].trim().toLowerCase();
    if (m.startsWith('image/')) return true;
    if (m === EXAMES_IMAGEM_PDF_MIME) return false;
  }
  const n = (nomeArquivo || '').toLowerCase();
  if (n.endsWith('.pdf')) return false;
  return /\.(jpe?g|png|gif|webp)$/i.test(n);
}
