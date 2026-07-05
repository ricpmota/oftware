import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  type MedicoWhiteLabelResolved,
  type MedicoWhiteLabelSource,
} from '@/lib/whiteLabel/resolveMedicoWhiteLabel';
import { resolveMedicoWhiteLabelWithMetodo } from '@/lib/server/resolveMedicoWhiteLabelWithMetodo.server';

type MedicoDoc = MedicoWhiteLabelSource & {
  id: string;
  nome?: string;
  genero?: 'M' | 'F';
  fotoPerfilUrl?: string | null;
  whiteLabel?: MedicoWhiteLabelSource['whiteLabel'];
  metodoImagensAtivo?: boolean;
  organizationId?: string | null;
};

async function resolveFromDoc(doc: FirebaseFirestore.DocumentSnapshot): Promise<MedicoWhiteLabelResolved | null> {
  if (!doc.exists) return null;
  const data = doc.data() as MedicoDoc;
  if (!(data.nome || '').trim()) return null;
  return resolveMedicoWhiteLabelWithMetodo({
    nome: data.nome || '',
    genero: data.genero,
    fotoPerfilUrl: data.fotoPerfilUrl ?? null,
    whiteLabel: data.whiteLabel ?? undefined,
    metodoImagensAtivo: data.metodoImagensAtivo === true,
    organizationId: data.organizationId ?? null,
  });
}

function normalizarSlug(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Busca médico pelo slug da URL pública `/dr/[slug]`. */
export async function getMedicoWhiteLabelByDrSlug(slugParam: string): Promise<MedicoWhiteLabelResolved | null> {
  const nomeSobrenome = (slugParam || '').trim();
  if (!nomeSobrenome) return null;

  const db = getFirestoreAdmin();
  const medicosSnapshot = await db.collection('medicos').get();

  const matchNumero = nomeSobrenome.match(/^(.+?)(\d+)$/);
  const slugBase = matchNumero ? matchNumero[1].replace(/-$/, '') : nomeSobrenome;
  const indiceDuplicata = matchNumero ? parseInt(matchNumero[2], 10) : 1;
  const partesSlug = slugBase.split('-').filter((p) => p.length > 0);
  const firstSlug = partesSlug[0] ? normalizarSlug(partesSlug[0]) : '';
  const lastSlug = partesSlug.length > 1 ? normalizarSlug(partesSlug[partesSlug.length - 1]) : firstSlug;

  const medicos = medicosSnapshot.docs.filter((doc) => {
    const data = doc.data();
    const nomeCompleto = (data.nome || '').trim();
    if (!nomeCompleto) return false;
    const partes = nomeCompleto.split(/\s+/).filter((p: string) => p.length > 0);
    if (partes.length === 0) return false;
    const firstNome = normalizarSlug(partes[0]);
    const lastNome = partes.length > 1 ? normalizarSlug(partes[partes.length - 1]) : firstNome;
    return firstNome === firstSlug && lastNome === lastSlug;
  });

  if (medicos.length === 0) return null;

  const indice = Math.min(indiceDuplicata - 1, medicos.length - 1);
  return await resolveFromDoc(medicos[Math.max(0, indice)]);
}

/** Busca identidade white label via token de aplicação. */
export async function getMedicoWhiteLabelByAplicacaoToken(
  token: string,
): Promise<MedicoWhiteLabelResolved | null> {
  if (!token || token.length < 16) return null;

  const db = getFirestoreAdmin();
  const linkRef = await db.collection('aplicacao_links').doc(token).get();
  if (!linkRef.exists) return null;

  const linkData = linkRef.data() as { pacienteId?: string };
  const pacienteId = linkData.pacienteId;
  if (!pacienteId) return null;

  const pacienteSnap = await db.collection('pacientes_completos').doc(pacienteId).get();
  if (!pacienteSnap.exists) return null;

  const paciente = pacienteSnap.data() as { medicoResponsavelId?: string };
  const medicoId = paciente.medicoResponsavelId;
  if (!medicoId) return null;

  const medicoSnap = await db.collection('medicos').doc(medicoId).get();
  return await resolveFromDoc(medicoSnap);
}

/** Busca identidade white label via token de conclusão. */
export async function getMedicoWhiteLabelByConclusaoToken(
  token: string,
): Promise<MedicoWhiteLabelResolved | null> {
  if (!token || token.length < 16) return null;

  const db = getFirestoreAdmin();
  const linkRef = await db.collection('conclusao_links').doc(token).get();
  if (!linkRef.exists) return null;

  const linkData = linkRef.data() as { medicoId?: string };
  const medicoId = linkData.medicoId;
  if (!medicoId) return null;

  const medicoSnap = await db.collection('medicos').doc(medicoId).get();
  return await resolveFromDoc(medicoSnap);
}
