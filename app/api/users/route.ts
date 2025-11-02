import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Inicializar Firebase Admin SDK
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID || "oftware-9201e",
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Erro ao inicializar Firebase Admin:', error);
  }
}

export async function GET() {
  try {
    console.log('🔍 Iniciando busca de usuários do Firebase Auth...');
    console.log('🔧 Variáveis de ambiente disponíveis:');
    console.log('- FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅ Configurada' : '❌ Não configurada');
    console.log('- FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✅ Configurada' : '❌ Não configurada');
    console.log('- FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? '✅ Configurada' : '❌ Não configurada');
    
    const auth = getAuth();
    console.log('✅ Firebase Auth inicializado com sucesso');
    
    // Listar usuários do Firebase Authentication com paginação
    console.log('📋 Buscando lista de usuários...');
    let allUsers: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    let nextPageToken: string | undefined;
    
    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      allUsers = allUsers.concat(listUsersResult.users);
      nextPageToken = listUsersResult.pageToken;
      console.log(`📄 Página processada: ${listUsersResult.users.length} usuários (Total: ${allUsers.length})`);
    } while (nextPageToken);
    
    console.log(`✅ Total de usuários encontrados: ${allUsers.length}`);
    
    const users = allUsers.map(userRecord => ({
      uid: userRecord.uid,
      email: userRecord.email || '',
      displayName: userRecord.displayName || '',
      emailVerified: userRecord.emailVerified,
      disabled: userRecord.disabled,
      metadata: {
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime
      },
      providerData: userRecord.providerData.map((provider: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        providerId: provider.providerId,
        uid: provider.uid,
        email: provider.email,
        displayName: provider.displayName
      }))
    }));

    console.log('✅ Usuários formatados com sucesso');
    return NextResponse.json({ users });
  } catch (error) {
    console.error('❌ Erro ao buscar usuários:', error);
    console.error('❌ Detalhes do erro:', {
      message: (error as any)?.message, // eslint-disable-line @typescript-eslint/no-explicit-any
      code: (error as any)?.code, // eslint-disable-line @typescript-eslint/no-explicit-any
      stack: (error as any)?.stack // eslint-disable-line @typescript-eslint/no-explicit-any
    });
    return NextResponse.json(
      { error: 'Erro ao buscar usuários do Firebase Authentication', details: (error as any)?.message }, // eslint-disable-line @typescript-eslint/no-explicit-any
      { status: 500 }
    );
  }
}
