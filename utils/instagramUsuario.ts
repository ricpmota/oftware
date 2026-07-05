/**
 * Normaliza o @ / URL do Instagram para o usuário público (minúsculas, sem @, sem URL).
 * Retorna `null` se vazio ou inválido.
 */
export function normalizeMedicoInstagramUsuario(raw: unknown): string | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  const urlMatch = s.match(/instagram\.com\/([A-Za-z0-9._]+)\/?/i);
  if (urlMatch) s = urlMatch[1];
  s = s.replace(/^@+/, '').trim();
  if (!/^[A-Za-z0-9._]{1,30}$/.test(s)) return null;
  return s.toLowerCase();
}
