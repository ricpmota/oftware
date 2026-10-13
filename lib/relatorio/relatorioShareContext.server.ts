import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  isValidPublicLinkToken,
  normalizePublicLinkToken,
} from '@/lib/publicLinks/publicLinkToken';
import { getMedicoWhiteLabelByPacienteId } from '@/lib/server/medicoWhiteLabelLookup.server';
import type { MedicoWhiteLabelResolved } from '@/lib/whiteLabel/resolveMedicoWhiteLabel';

export type RelatorioShareContext = {
  pacienteNome: string;
  medicoNome: string;
  medicoGenero: 'M' | 'F' | null;
  whiteLabel: MedicoWhiteLabelResolved | null;
};

type PacienteShareDoc = {
  nome?: string;
  dadosIdentificacao?: { nomeCompleto?: string };
  medicoResponsavelId?: string;
};

/** Nome do paciente e do médico para o preview do link /relatorio/[token]. */
export async function getRelatorioShareContext(tokenRaw: string): Promise<RelatorioShareContext | null> {
  const token = normalizePublicLinkToken(tokenRaw);
  if (!isValidPublicLinkToken(token)) return null;

  const db = getFirestoreAdmin();
  const linkRef = await db.collection('relatorio_paciente_links').doc(token).get();
  if (!linkRef.exists) return null;

  const pacienteId = String((linkRef.data() as { pacienteId?: string } | undefined)?.pacienteId || '').trim();
  if (!pacienteId) return null;

  const pacienteSnap = await db.collection('pacientes_completos').doc(pacienteId).get();
  if (!pacienteSnap.exists) return null;

  const paciente = pacienteSnap.data() as PacienteShareDoc;
  const pacienteNome = (paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || '').trim();
  const medicoId = (paciente.medicoResponsavelId || '').trim();

  let medicoNome = '';
  let medicoGenero: 'M' | 'F' | null = null;
  if (medicoId) {
    const medicoSnap = await db.collection('medicos').doc(medicoId).get();
    if (medicoSnap.exists) {
      const medico = medicoSnap.data() as { nome?: string; genero?: string };
      medicoNome = (medico.nome || '').trim();
      medicoGenero = String(medico.genero || '').toUpperCase() === 'F' ? 'F' : medicoNome ? 'M' : null;
    }
  }

  const whiteLabel = await getMedicoWhiteLabelByPacienteId(pacienteId);
  return { pacienteNome, medicoNome, medicoGenero, whiteLabel };
}
