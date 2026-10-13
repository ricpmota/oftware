import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  KAMILA_ORGANIZATION_ID,
  neutralKamillaContent,
  parseKamillaInstitutionalBranding,
  type KamillaInstitutionalContent,
} from './institutionalContent';

/** Leitura do branding oficial. Falha ou documento ausente devolvem a apresentação neutra. */
export async function loadKamillaInstitutionalContent(): Promise<KamillaInstitutionalContent> {
  try {
    const snap = await getFirestoreAdmin().collection('organizations').doc(KAMILA_ORGANIZATION_ID).get();
    if (!snap.exists) return neutralKamillaContent();
    return parseKamillaInstitutionalBranding(snap.data()?.branding) ?? neutralKamillaContent();
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[kamilla] branding indisponível — apresentação neutra', error);
    }
    return neutralKamillaContent();
  }
}
