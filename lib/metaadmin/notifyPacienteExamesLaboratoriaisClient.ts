import { auth } from '@/lib/firebase';

/** Disparo best-effort após salvar um exame laboratorial novo. */
export function notifyPacienteExamesLaboratoriaisClient(pacienteId: string): void {
  const id = pacienteId.trim();
  if (!id) return;

  void (async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      await fetch(`/api/metaadmin/pacientes/${encodeURIComponent(id)}/exames-laboratoriais-notify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.warn('[exames-lab] aviso Canal Chat ao paciente:', error);
    }
  })();
}
