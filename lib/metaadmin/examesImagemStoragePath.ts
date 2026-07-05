/**
 * Extrai o caminho do objeto no bucket a partir de URL pública antiga
 * (https://storage.googleapis.com/BUCKET/pacientes-exames-imagem/...).
 */
export function storagePathFromGcsPublicUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  try {
    const u = new URL(url.trim());
    if (u.hostname !== 'storage.googleapis.com') return null;
    const segments = u.pathname.split('/').filter(Boolean);
    if (segments.length < 2) return null;
    return segments.slice(1).join('/');
  } catch {
    return null;
  }
}
