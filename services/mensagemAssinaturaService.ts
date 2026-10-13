import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  ASSINATURA_PADRAO_VERSAO,
  assinaturaHtmlUsaLogoErrada,
  buildAssinaturaDocId,
  buildDefaultAssinaturaHtml,
  type MensagemAssinaturaDefaults,
  type MensagemAssinaturaDoc,
  type MensagemAssinaturaRole,
} from '@/lib/pacienteMensagem/assinaturaMensagem';
import { sanitizeMensagemHtml } from '@/lib/pacienteMensagem/mensagemHtml';

const COLLECTION = 'mensagens_assinaturas';

type AssinaturaIdentity = {
  /** Firebase Auth UID (metadado). */
  userId: string;
  /** ID do documento do papel (medico / nutri / personal / paciente). */
  profileId: string;
  role: MensagemAssinaturaRole;
};

export class MensagemAssinaturaService {
  /**
   * Carrega assinatura do perfil (role + profileId).
   * Não compartilha entre metaadmin / metanutri / metapersonal / meta.
   */
  static async getAssinaturaHtml(
    identityOrUserId: AssinaturaIdentity | string,
    defaults: MensagemAssinaturaDefaults,
    profileIdLegacy?: string
  ): Promise<string> {
    const padrao = buildDefaultAssinaturaHtml(defaults);
    const identity = normalizeIdentity(identityOrUserId, defaults.role, profileIdLegacy);
    if (!identity) return padrao;

    const docId = buildAssinaturaDocId(identity.role, identity.profileId);
    if (!docId) return padrao;

    try {
      const ref = doc(db, COLLECTION, docId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as Record<string, unknown>;
        const html = typeof data.html === 'string' ? data.html.trim() : '';
        const versao = Number(data.padraoVersao || 0);
        const precisaReset =
          versao !== ASSINATURA_PADRAO_VERSAO ||
          !html ||
          assinaturaHtmlUsaLogoErrada(html);

        if (!precisaReset) {
          return sanitizeMensagemHtml(html);
        }

        await setDoc(
          ref,
          {
            userId: identity.userId,
            profileId: identity.profileId,
            role: identity.role,
            html: padrao,
            padraoVersao: ASSINATURA_PADRAO_VERSAO,
            atualizadoEm: new Date(),
            migratedToPadraoVersao: ASSINATURA_PADRAO_VERSAO,
          },
          { merge: true }
        );
        return padrao;
      }

      // Migração pontual: doc legado só por Auth UID, e somente se o role bater
      // (evita reutilizar "Dr. Fulano" no metanutri/metapersonal).
      if (identity.userId && identity.userId !== docId) {
        const legacy = await getDoc(doc(db, COLLECTION, identity.userId));
        if (legacy.exists()) {
          const data = legacy.data() as Record<string, unknown>;
          const legacyRole = String(data.role || '').trim().toLowerCase();
          const html = typeof data.html === 'string' ? data.html.trim() : '';
          if (
            html &&
            legacyRole === identity.role &&
            !assinaturaHtmlUsaLogoErrada(html) &&
            Number(data.padraoVersao || 0) === ASSINATURA_PADRAO_VERSAO
          ) {
            const migrated = sanitizeMensagemHtml(html);
            await setDoc(
              ref,
              {
                userId: identity.userId,
                profileId: identity.profileId,
                role: identity.role,
                html: migrated,
                padraoVersao: ASSINATURA_PADRAO_VERSAO,
                atualizadoEm: new Date(),
                migratedFromUserId: identity.userId,
              },
              { merge: true }
            );
            return migrated;
          }
        }
      }
    } catch (e) {
      console.warn('[MensagemAssinaturaService.getAssinaturaHtml]', e);
    }
    return padrao;
  }

  static async getAssinaturaDoc(
    identityOrUserId: AssinaturaIdentity | string,
    role?: MensagemAssinaturaRole,
    profileId?: string
  ): Promise<MensagemAssinaturaDoc | null> {
    const identity = normalizeIdentity(identityOrUserId, role || 'paciente', profileId);
    if (!identity) return null;
    const docId = buildAssinaturaDocId(identity.role, identity.profileId);
    if (!docId) return null;
    try {
      const snap = await getDoc(doc(db, COLLECTION, docId));
      if (!snap.exists()) return null;
      const data = snap.data() as Record<string, unknown>;
      return {
        userId: identity.userId,
        profileId: identity.profileId,
        role: (data.role as MensagemAssinaturaRole) || identity.role,
        html: typeof data.html === 'string' ? data.html : '',
        atualizadoEm:
          (data.atualizadoEm as { toDate?: () => Date })?.toDate?.() ||
          (data.atualizadoEm instanceof Date ? data.atualizadoEm : new Date()),
      };
    } catch (e) {
      console.warn('[MensagemAssinaturaService.getAssinaturaDoc]', e);
      return null;
    }
  }

  static async salvarAssinatura(params: {
    userId: string;
    profileId: string;
    role: MensagemAssinaturaRole;
    html: string;
  }): Promise<void> {
    const userId = String(params.userId || '').trim();
    const profileId = String(params.profileId || '').trim();
    const role = params.role;
    if (!profileId) throw new Error('profileId obrigatório para assinatura');
    if (!role) throw new Error('role obrigatório para assinatura');
    const docId = buildAssinaturaDocId(role, profileId);
    if (!docId) throw new Error('Identidade de assinatura inválida');
    const html = sanitizeMensagemHtml(params.html);
    await setDoc(
      doc(db, COLLECTION, docId),
      {
        userId: userId || profileId,
        profileId,
        role,
        html,
        padraoVersao: ASSINATURA_PADRAO_VERSAO,
        atualizadoEm: new Date(),
      },
      { merge: true }
    );
  }
}

function normalizeIdentity(
  identityOrUserId: AssinaturaIdentity | string,
  role: MensagemAssinaturaRole,
  profileIdLegacy?: string
): AssinaturaIdentity | null {
  if (identityOrUserId && typeof identityOrUserId === 'object') {
    const userId = String(identityOrUserId.userId || '').trim();
    const profileId = String(identityOrUserId.profileId || '').trim();
    const r = identityOrUserId.role || role;
    if (!profileId || !r) return null;
    return { userId: userId || profileId, profileId, role: r };
  }
  const userId = String(identityOrUserId || '').trim();
  const profileId = String(profileIdLegacy || userId).trim();
  if (!profileId || !role) return null;
  return { userId: userId || profileId, profileId, role };
}
