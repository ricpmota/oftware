import { metaPsiAuthFetch } from '@/lib/metapsi/metaPsiAuthFetch';
import type { ProntuarioConsultaPsiPayload } from '@/lib/metapsi/prontuarioConsultaPsiquiatra';

export type CreateProntuarioConsultaPsiClientResult = {
  eventoId: string;
  titulo: string;
  descricao: string;
  data: string;
  hora: string;
  destaque?: string;
  dados?: Record<string, unknown>;
  psiquiatraId: string;
  psiquiatraNome: string;
  origem: 'psiquiatra';
  tipo: 'consulta';
};

/**
 * Client MetaPsi → POST /api/metapsi/pacientes/{id}/prontuario
 * Não grava timeline direto no Firestore do browser.
 */
export async function createProntuarioConsultaPsiClient(
  pacienteId: string,
  payload: ProntuarioConsultaPsiPayload
): Promise<CreateProntuarioConsultaPsiClientResult> {
  const pid = String(pacienteId || '').trim();
  if (!pid) throw new Error('pacienteId é obrigatório.');

  const res = await metaPsiAuthFetch(
    `/api/metapsi/pacientes/${encodeURIComponent(pid)}/prontuario`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );

  const json = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    evento?: CreateProntuarioConsultaPsiClientResult;
  };

  if (!res.ok || !json.evento?.eventoId) {
    throw new Error(json.error || 'Não foi possível salvar a consulta.');
  }

  return json.evento;
}
