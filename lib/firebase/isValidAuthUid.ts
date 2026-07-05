/** UID do Firebase Auth — rejeita pseudo-ids como email_timestamp. */
export function isValidFirebaseAuthUid(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  const trimmed = id.trim();
  if (trimmed.length < 10 || trimmed.length > 128) return false;
  if (trimmed.includes('@')) return false;
  if (/^.+_\d{10,}$/.test(trimmed)) return false;
  return /^[a-zA-Z0-9_-]+$/.test(trimmed);
}
