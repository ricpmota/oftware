import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { normalizeMedicoChavePix } from '@/lib/metaadmin/cobrancaPixMessage';

function primeiroNome(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || '';
}

function isFemaleGenero(genero?: string | null): boolean {
  const g = (genero || '').trim().toLowerCase();
  return g === 'f' || g === 'female';
}

/** Ex.: "Dr. Ricardo" / "Dra. Ana". Sem nome → "seu médico". */
export function formatMedicoTitulo(nome?: string | null, genero?: string | null): string {
  const first = primeiroNome(nome || '');
  if (!first) return 'seu médico';
  return `${isFemaleGenero(genero) ? 'Dra.' : 'Dr.'} ${first}`;
}

function nomeFromDoc(data: Record<string, unknown> | undefined): {
  nome: string;
  genero: string | null;
} {
  const nome = typeof data?.nome === 'string' ? data.nome : '';
  const genero = typeof data?.genero === 'string' ? data.genero : null;
  return { nome, genero };
}

/**
 * Resolve "Dr. Fulano" / "Dra. Fulana" a partir do cadastro (médico, nutri ou personal).
 */
export async function resolveMedicoTituloByDoctorId(doctorId: string): Promise<string> {
  const id = doctorId?.trim();
  if (!id) return formatMedicoTitulo();

  const db = getFirestoreAdmin();
  const collections = ['medicos', 'nutricionistas', 'personal_trainers'] as const;

  for (const collection of collections) {
    const snap = await db.collection(collection).doc(id).get();
    if (!snap.exists) continue;
    const { nome, genero } = nomeFromDoc(snap.data() as Record<string, unknown>);
    if (nome.trim()) return formatMedicoTitulo(nome, genero);
  }

  try {
    const byUser = await db.collection('medicos').where('userId', '==', id).limit(1).get();
    if (!byUser.empty) {
      const { nome, genero } = nomeFromDoc(byUser.docs[0].data() as Record<string, unknown>);
      if (nome.trim()) return formatMedicoTitulo(nome, genero);
    }
  } catch {
    // ignore lookup errors — fallback below
  }

  return formatMedicoTitulo();
}

function chavePixFromDoc(data: Record<string, unknown> | undefined): string {
  return normalizeMedicoChavePix(data?.chavePix);
}

/**
 * Chave PIX cadastrada em Meu Perfil → Dados Iniciais. Vazio se não configurada.
 */
export async function resolveMedicoChavePixByDoctorId(doctorId: string): Promise<string> {
  const id = doctorId?.trim();
  if (!id) return '';

  const db = getFirestoreAdmin();
  const snap = await db.collection('medicos').doc(id).get();
  if (snap.exists) {
    const pix = chavePixFromDoc(snap.data() as Record<string, unknown>);
    if (pix) return pix;
  }

  try {
    const byUser = await db.collection('medicos').where('userId', '==', id).limit(1).get();
    if (!byUser.empty) {
      return chavePixFromDoc(byUser.docs[0].data() as Record<string, unknown>);
    }
  } catch {
    // ignore lookup errors — cobrança segue sem PIX
  }

  return '';
}
