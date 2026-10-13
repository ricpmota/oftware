export const WHATSAPP_QUEUE_SKIP_PACIENTE_NAO_ENCONTRADO = 'Paciente não encontrado.';
export const WHATSAPP_QUEUE_SKIP_PACIENTE_FORA_DO_QUADRO =
  'Paciente não faz mais parte do quadro.';

export function isWhatsappQueueSkipForMissingPatient(errorMessage?: string): boolean {
  const msg = (errorMessage || '').trim();
  return (
    msg === WHATSAPP_QUEUE_SKIP_PACIENTE_FORA_DO_QUADRO ||
    msg.startsWith('Paciente não encontrado')
  );
}

/** Esconde da agenda ao vivo quem não está mais no quadro deste médico. */
export function shouldHideWhatsappAgendaItemForRoster(input: {
  patientId?: string | null;
  rosterIds: Set<string>;
}): boolean {
  const pid = (input.patientId || '').trim();
  if (!pid) return false;
  return !input.rosterIds.has(pid);
}
