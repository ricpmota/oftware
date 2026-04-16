/**
 * Firebase Admin (servidor) — mesmo padrão de app/api/metaadmingeral/relatorios/tirzepatida/route.ts
 */
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

let cachedApp: App | null = null;

function getOrInitApp(): App {
  const existing = getApps();
  if (existing.length > 0) return existing[0]!;
  if (cachedApp) return cachedApp;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!privateKey || !clientEmail) {
    throw new Error('Firebase Admin não configurado (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY).');
  }
  const key = privateKey.replace(/\\n/g, '\n');
  cachedApp = initializeApp({ credential: cert({ projectId, clientEmail, privateKey: key }) });
  return cachedApp;
}

export function getFirestoreAdmin(): Firestore {
  return getFirestore(getOrInitApp());
}

export function getAuthAdmin(): Auth {
  return getAuth(getOrInitApp());
}
