import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { isValidFirebaseAuthUid } from '@/lib/firebase/isValidAuthUid';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;

function getFirebaseAdmin(): Auth {
  if (adminAuth) {
    return adminAuth;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    adminAuth = getAuth(adminApp);
    return adminAuth;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e';
  const clientEmail =
    process.env.FIREBASE_CLIENT_EMAIL ||
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_CLIENT_EMAIL;
  const privateKey =
    process.env.FIREBASE_PRIVATE_KEY ||
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_PRIVATE_KEY;

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
  adminAuth = getAuth(adminApp);
  return adminAuth;
}

export async function POST(request: NextRequest) {
  try {
    const { userIds } = await request.json();

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: 'userIds deve ser um array' }, { status: 400 });
    }

    const photos: Record<string, string | null> = {};
    const auth = getFirebaseAdmin();

    await Promise.all(
      userIds.map(async (rawId: string) => {
        const userId = typeof rawId === 'string' ? rawId.trim() : '';
        if (!userId) return;

        if (!isValidFirebaseAuthUid(userId)) {
          photos[userId] = null;
          return;
        }

        try {
          const userRecord = await auth.getUser(userId);
          photos[userId] = userRecord.photoURL || null;
        } catch {
          photos[userId] = null;
        }
      })
    );

    return NextResponse.json({ photos });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Erro ao buscar fotos dos usuários:', error);
    }
    return NextResponse.json({ error: 'Erro ao buscar fotos dos usuários' }, { status: 500 });
  }
}
