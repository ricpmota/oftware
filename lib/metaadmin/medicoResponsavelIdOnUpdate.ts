/**
 * Em update, `medicoResponsavelId` vazio/null não deve ir para o Firestore.
 * O cliente do paciente (wizard / efeito do médico indicado) costuma reenviar o
 * documento inteiro com null e apagava o vínculo gravado no aceite.
 */
export function applyMedicoResponsavelIdForFirestoreUpdate(
  dataToSave: Record<string, unknown>
): Record<string, unknown> {
  const incoming = dataToSave.medicoResponsavelId;
  const trimmed = typeof incoming === 'string' ? incoming.trim() : '';
  if (trimmed) {
    dataToSave.medicoResponsavelId = trimmed;
    return dataToSave;
  }
  delete dataToSave.medicoResponsavelId;
  return dataToSave;
}

export function pickNonEmptyMedicoResponsavelId(
  ...vals: Array<string | null | undefined>
): string | null {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}
