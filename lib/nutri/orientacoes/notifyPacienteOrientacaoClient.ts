import { nutriAgendaAuthFetch } from '@/lib/nutri/agenda/nutriAgendaAuthFetch';

/** Disparo best-effort após a nutricionista enviar uma orientação. */
export function notifyPacienteOrientacaoClient(pacienteId: string): void {
  const id = pacienteId.trim();
  if (!id) return;

  void nutriAgendaAuthFetch(
    `/api/metanutri/pacientes/${encodeURIComponent(id)}/orientacoes-notify`,
    { method: 'POST' }
  ).catch((error) => {
    console.warn('[orientacoes] aviso Canal Chat ao paciente:', error);
  });
}
