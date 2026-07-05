import 'server-only';

import type { DocumentData } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { parseMedicoInstagramBio } from '@/lib/instagram/instagramBioConfig';
import type { InstagramHubMedicoPublic } from '@/lib/instagram/instagramWhiteLabelTypes';

function pickCrm(data: Record<string, unknown> | undefined): { estado: string; numero: string } | null {
  const crm = data?.crm;
  if (!crm || typeof crm !== 'object' || Array.isArray(crm)) return null;
  const estado = String((crm as { estado?: unknown }).estado ?? '')
    .trim()
    .toUpperCase();
  const numero = String((crm as { numero?: unknown }).numero ?? '').replace(/\D/g, '');
  if (!estado || !numero) return null;
  return { estado, numero };
}

function pickWhiteLabel(data: Record<string, unknown> | undefined): InstagramHubMedicoPublic['whiteLabel'] {
  const wl = data?.whiteLabel;
  if (!wl || typeof wl !== 'object' || Array.isArray(wl)) return undefined;
  const w = wl as Record<string, unknown>;
  return {
    drPageLogoUrl: typeof w.drPageLogoUrl === 'string' ? w.drPageLogoUrl : undefined,
    publicPageLogoUrl: typeof w.publicPageLogoUrl === 'string' ? w.publicPageLogoUrl : undefined,
    ogImageUrl: typeof w.ogImageUrl === 'string' ? w.ogImageUrl : undefined,
  };
}

function mapMedicoDoc(id: string, data: DocumentData): InstagramHubMedicoPublic | null {
  const nome = String(data.nome ?? '').trim();
  if (!nome) return null;

  const crm = pickCrm(data as Record<string, unknown>);
  if (!crm) return null;

  const generoRaw = data.genero;
  const genero = generoRaw === 'F' ? 'F' : generoRaw === 'M' ? 'M' : undefined;

  return {
    id,
    nome,
    genero,
    email: String(data.email ?? '').trim().toLowerCase(),
    telefone: typeof data.telefone === 'string' ? data.telefone.trim() : null,
    fotoPerfilUrl: typeof data.fotoPerfilUrl === 'string' ? data.fotoPerfilUrl.trim() : null,
    crm,
    status: data.status === 'inativo' ? 'inativo' : 'ativo',
    instagramBio: parseMedicoInstagramBio(data.instagramBio),
    whiteLabel: pickWhiteLabel(data as Record<string, unknown>),
  };
}

/** Busca médico por `crm.estado` + `crm.numero` (números normalizados). */
export async function findMedicoByCrm(uf: string, numero: string): Promise<InstagramHubMedicoPublic | null> {
  const db = getFirestoreAdmin();
  const estado = uf.trim().toUpperCase();
  const crmNumero = numero.replace(/\D/g, '');
  if (!estado || !crmNumero) return null;

  const snapshot = await db
    .collection('medicos')
    .where('crm.estado', '==', estado)
    .where('crm.numero', '==', crmNumero)
    .limit(5)
    .get();

  if (snapshot.empty) {
    const altSnapshot = await db.collection('medicos').where('crm.estado', '==', estado).limit(200).get();
    const match = altSnapshot.docs.find((doc) => {
      const crm = pickCrm(doc.data() as Record<string, unknown>);
      return crm?.numero === crmNumero;
    });
    if (!match) return null;
    const medico = mapMedicoDoc(match.id, match.data());
    return medico?.status === 'inativo' ? null : medico;
  }

  const ativo = snapshot.docs.find((doc) => doc.data().status !== 'inativo') ?? snapshot.docs[0];
  const medico = mapMedicoDoc(ativo.id, ativo.data());
  return medico?.status === 'inativo' ? null : medico;
}
