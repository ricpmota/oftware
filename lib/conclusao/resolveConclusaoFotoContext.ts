import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  isValidPublicLinkToken,
  normalizePublicLinkToken,
} from '@/lib/publicLinks/publicLinkToken';
import { semanaIndexConclusao, type PlanoDatasSlice } from '@/utils/datasAplicacaoSemanaPlano';

export type ConclusaoFotoContext = {
  pacienteId: string;
  applicationId: string;
  semana: number | null;
  dataAplicacao: string;
  protocoloIndice: number;
};

/**
 * Contexto da conclusão pública para fotos.
 * `applicationId` é estável por protocolo, separado de cada aplicação semanal.
 */
export async function resolveConclusaoFotoContext(
  tokenRaw: string
): Promise<ConclusaoFotoContext | null> {
  const token = normalizePublicLinkToken(tokenRaw);
  if (!isValidPublicLinkToken(token)) return null;

  const db = getFirestoreAdmin();
  const linkSnap = await db.collection('conclusao_links').doc(token).get();
  if (!linkSnap.exists) return null;

  const link = (linkSnap.data() || {}) as { pacienteId?: string; data?: string };
  const pacienteId = String(link.pacienteId || '').trim();
  if (!pacienteId) return null;

  const pacienteSnap = await db.collection('pacientes_completos').doc(pacienteId).get();
  if (!pacienteSnap.exists) return null;

  const plano = (pacienteSnap.data()?.planoTerapeutico || {}) as {
    historicoProtocolosTirzepatida?: unknown[];
    conclusaoTratamento?: { protocoloIndice?: number };
    numeroSemanasTratamento?: number;
    semanasCanceladas?: number[];
    datasAplicacaoIndividuais?: Record<string, string>;
    semanaInicioCiclo?: number;
  };

  const bruto =
    plano.conclusaoTratamento?.protocoloIndice != null
      ? Number(plano.conclusaoTratamento.protocoloIndice)
      : (plano.historicoProtocolosTirzepatida || []).length + 1;
  const protocoloIndice = Number.isFinite(bruto) && bruto >= 1 ? Math.floor(bruto) : 1;

  let semana: number | null = null;
  try {
    const s = semanaIndexConclusao(plano as PlanoDatasSlice);
    if (Number.isFinite(s) && s > 0) semana = s;
  } catch {
    semana = null;
  }

  return {
    pacienteId,
    applicationId: `conclusao-protocolo-${protocoloIndice}`,
    semana,
    dataAplicacao: String(link.data || '').trim(),
    protocoloIndice,
  };
}
