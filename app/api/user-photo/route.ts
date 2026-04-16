import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

// Variável global para armazenar a instância do app
let adminApp: App | null = null;
let adminAuth: Auth | null = null;

// Função para inicializar Firebase Admin SDK
function getFirebaseAdmin(): Auth {
  // Se já temos uma instância, retornar
  if (adminAuth) {
    return adminAuth;
  }
  
  // Verificar se já existe um app inicializado
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
    adminAuth = getAuth(adminApp);
    return adminAuth;
  }
  
  // Verificar variáveis de ambiente
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "oftware-9201e";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || 
                      process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
                      process.env.GOOGLE_APPLICATION_CREDENTIALS_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || 
                     process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
                     process.env.GOOGLE_APPLICATION_CREDENTIALS_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error('Variáveis de ambiente do Firebase Admin não configuradas');
  }

  try {
    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
    adminAuth = getAuth(adminApp);
    return adminAuth;
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userIds } = await request.json();

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json(
        { error: 'userIds deve ser um array' },
        { status: 400 }
      );
    }

    const photos: Record<string, string | null> = {};

    // Buscar fotos de todos os usuários
    const auth = getFirebaseAdmin();
    await Promise.all(
      userIds.map(async (userId: string) => {
        try {
          const userRecord = await auth.getUser(userId);
          photos[userId] = userRecord.photoURL || null;
        } catch (error) {
          console.error(`Erro ao buscar foto do usuário ${userId}:`, error);
          photos[userId] = null;
        }
      })
    );

    return NextResponse.json({ photos });
  } catch (error) {
    console.error('Erro ao buscar fotos dos usuários:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar fotos dos usuários' },
      { status: 500 }
    );
  }
}
