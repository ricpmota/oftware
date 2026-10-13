import { nutriAgendaAuthFetch } from '@/lib/nutri/agenda/nutriAgendaAuthFetch';
import { personalAgendaAuthFetch } from '@/lib/personal/agenda/personalAgendaAuthFetch';

/** Disparo best-effort: o salvamento do prontuário não depende deste aviso. */
export function notifyMedicoNovaConsultaProntuarioClient(params: {
  pacienteId: string;
  data: string;
  hora: string;
  titulo?: string;
  variant?: 'nutricionista' | 'personal';
}): void {
  const pacienteId = params.pacienteId.trim();
  if (!pacienteId || !params.data.trim() || !params.hora.trim()) return;

  const isPersonal = params.variant === 'personal';
  const url = isPersonal
    ? `/api/metapersonal/pacientes/${encodeURIComponent(pacienteId)}/prontuario-consulta-notify`
    : `/api/metanutri/pacientes/${encodeURIComponent(pacienteId)}/prontuario-consulta-notify`;
  const authFetch = isPersonal ? personalAgendaAuthFetch : nutriAgendaAuthFetch;

  void authFetch(url, {
    method: 'POST',
    body: JSON.stringify({
      data: params.data,
      hora: params.hora,
      titulo: params.titulo,
    }),
  }).catch((error) => {
    console.warn('[Prontuário] aviso ao médico:', error);
  });
}
