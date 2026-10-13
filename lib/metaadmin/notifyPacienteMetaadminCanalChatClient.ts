import { auth } from '@/lib/firebase';

function notifyPacienteMetaadminCanalChat(pacienteId: string, endpoint: string, logTag: string): void {
  const id = pacienteId.trim();
  if (!id) return;

  void (async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      await fetch(`/api/metaadmin/pacientes/${encodeURIComponent(id)}/${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.warn(`[${logTag}] aviso Canal Chat ao paciente:`, error);
    }
  })();
}

export function notifyPacienteBioimpedanciaClient(pacienteId: string): void {
  notifyPacienteMetaadminCanalChat(pacienteId, 'bioimpedancia-notify', 'bioimpedancia');
}

export function notifyPacienteExamesImagemClient(pacienteId: string): void {
  notifyPacienteMetaadminCanalChat(pacienteId, 'exames-imagem-notify', 'exames-imagem');
}

export function notifyPacientePlanoTerapeuticoClient(pacienteId: string): void {
  notifyPacienteMetaadminCanalChat(pacienteId, 'plano-terapeutico-notify', 'plano-terapeutico');
}
