import { auth } from '@/lib/firebase';

const lastNotifyByPaciente = new Map<string, number>();
const DEBOUNCE_MS = 60_000;

/** Disparo best-effort após o personal salvar o treino. */
export function notifyPacienteTreinoPersonalClient(pacienteId: string): void {
  const id = pacienteId.trim();
  if (!id) return;

  const now = Date.now();
  const last = lastNotifyByPaciente.get(id) ?? 0;
  if (now - last < DEBOUNCE_MS) return;
  lastNotifyByPaciente.set(id, now);

  void (async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      await fetch(`/api/metapersonal/pacientes/${encodeURIComponent(id)}/treino-notify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.warn('[treino] aviso Canal Chat ao paciente:', error);
    }
  })();
}
