import { nutriAgendaAuthFetch } from '@/lib/nutri/agenda/nutriAgendaAuthFetch';

const lastNotifyByPaciente = new Map<string, number>();
const DEBOUNCE_MS = 60_000;

/** Disparo best-effort após a nutricionista salvar o cardápio. */
export function notifyPacienteCardapioEditadoClient(pacienteId: string): void {
  const id = pacienteId.trim();
  if (!id) return;

  const now = Date.now();
  const last = lastNotifyByPaciente.get(id) ?? 0;
  if (now - last < DEBOUNCE_MS) return;
  lastNotifyByPaciente.set(id, now);

  void nutriAgendaAuthFetch(
    `/api/metanutri/pacientes/${encodeURIComponent(id)}/cardapio-notify`,
    { method: 'POST' }
  ).catch((error) => {
    console.warn('[cardapio] aviso Canal Chat ao paciente:', error);
  });
}
