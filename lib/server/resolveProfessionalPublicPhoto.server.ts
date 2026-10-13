import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { isValidFirebaseAuthUid } from '@/lib/firebase/isValidAuthUid';

let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;
  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0]!;
    return adminApp;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'oftware-9201e';
  const clientEmail =
    process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey =
    process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error('Variáveis de ambiente do Firebase Admin não configuradas');
  }

  adminApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
  return adminApp;
}

/**
 * Foto pública do nutri/personal no link /dr/... :
 * 1) fotoPerfilUrl do Meu Perfil (MetaNutri/MetaPersonal)
 * 2) photoURL do Firebase Auth (mesma foto vista no shell do painel)
 */
export async function resolveProfessionalPublicPhoto(params: {
  fotoPerfilUrl?: string | null;
  userId?: string | null;
}): Promise<string | null> {
  const fromPerfil = String(params.fotoPerfilUrl || '').trim();
  if (fromPerfil) return fromPerfil;

  const userId = String(params.userId || '').trim();
  if (!userId || !isValidFirebaseAuthUid(userId)) return null;

  try {
    const user = await getAuth(getAdminApp()).getUser(userId);
    const authPhoto = String(user.photoURL || '').trim();
    return authPhoto || null;
  } catch {
    return null;
  }
}
