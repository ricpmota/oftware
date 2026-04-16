import { NextResponse } from 'next/server';
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
    console.log('✅ Usando Firebase Admin SDK já inicializado');
    return adminAuth;
  }
  
  // Verificar variáveis de ambiente - tentar diferentes nomes possíveis
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "oftware-9201e";
  
  // Tentar diferentes nomes de variáveis de ambiente
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || 
                      process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
                      process.env.GOOGLE_APPLICATION_CREDENTIALS_CLIENT_EMAIL;
  
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || 
                     process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
                     process.env.GOOGLE_APPLICATION_CREDENTIALS_PRIVATE_KEY;
  
  // Log detalhado de todas as variáveis de ambiente relacionadas ao Firebase
  console.log('🔧 Verificando variáveis de ambiente:');
  console.log('- FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✅' : '❌');
  console.log('- NEXT_PUBLIC_FIREBASE_PROJECT_ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? '✅' : '❌');
  console.log('- projectId (usado):', projectId);
  console.log('- FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? `✅ (${process.env.FIREBASE_CLIENT_EMAIL.substring(0, 20)}...)` : '❌');
  console.log('- FIREBASE_ADMIN_CLIENT_EMAIL:', process.env.FIREBASE_ADMIN_CLIENT_EMAIL ? '✅' : '❌');
  console.log('- clientEmail (usado):', clientEmail ? `✅ (${clientEmail.substring(0, 20)}...)` : '❌');
  console.log('- FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? `✅ (${process.env.FIREBASE_PRIVATE_KEY.length} chars)` : '❌');
  console.log('- FIREBASE_ADMIN_PRIVATE_KEY:', process.env.FIREBASE_ADMIN_PRIVATE_KEY ? `✅ (${process.env.FIREBASE_ADMIN_PRIVATE_KEY.length} chars)` : '❌');
  console.log('- privateKey (usado):', privateKey ? `✅ (${privateKey.length} chars, começa com: ${privateKey.substring(0, 30)}...)` : '❌');
  
  // Listar todas as variáveis de ambiente que começam com FIREBASE para debug
  const firebaseEnvVars = Object.keys(process.env).filter(key => 
    key.toUpperCase().includes('FIREBASE') || 
    key.toUpperCase().includes('GOOGLE_APPLICATION')
  );
  console.log('📋 Variáveis de ambiente relacionadas ao Firebase encontradas:', firebaseEnvVars);
  
  if (!privateKey || !clientEmail) {
    const error = new Error(
      `Variáveis de ambiente necessárias não encontradas.\n` +
      `Procuradas: FIREBASE_CLIENT_EMAIL, FIREBASE_ADMIN_CLIENT_EMAIL\n` +
      `FIREBASE_PRIVATE_KEY, FIREBASE_ADMIN_PRIVATE_KEY\n` +
      `Variáveis Firebase encontradas: ${firebaseEnvVars.join(', ') || 'nenhuma'}`
    );
    console.error('❌', error.message);
    throw error;
  }
  
  try {
    // Processar a chave privada
    let processedKey = privateKey;
    
    // Substituir \\n por quebras de linha reais
    processedKey = processedKey.replace(/\\n/g, '\n');
    
    // Se não tiver quebras de linha mas tiver BEGIN/END, tentar formatar
    if (!processedKey.includes('\n') && processedKey.includes('-----BEGIN')) {
      processedKey = processedKey
        .replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
        .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----')
        .replace(/\n+/g, '\n'); // Remover quebras de linha duplicadas
    }
    
    console.log('🔧 Inicializando Firebase Admin SDK...');
    
    adminApp = initializeApp({
      credential: cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: processedKey,
      }),
    });
    
    adminAuth = getAuth(adminApp);
    console.log('✅ Firebase Admin SDK inicializado com sucesso');
    return adminAuth;
  } catch (error) {
    console.error('❌ Erro ao inicializar Firebase Admin:', error);
    console.error('❌ Tipo do erro:', (error as any)?.constructor?.name);
    console.error('❌ Mensagem:', (error as any)?.message);
    console.error('❌ Stack:', (error as any)?.stack);
    throw error;
  }
}

export async function GET() {
  try {
    console.log('🔍 Iniciando busca de usuários do Firebase Authentication...');
    
    // PRIMEIRO: Tentar usar Firestore como fonte (já funciona)
    // NOTA: Firestore Client SDK não funciona em API routes sem autenticação
    // Vamos pular direto para o Admin SDK
    console.log('📋 Buscando usuários do Firebase Authentication via Admin SDK...');
    
    // SEGUNDO: Tentar usar Firebase Admin SDK (para ver TODOS os usuários do Authentication)
    console.log('📋 Tentativa 2: Buscando usuários do Firebase Authentication via Admin SDK...');
    let auth: Auth;
    try {
      auth = getFirebaseAdmin();
      console.log('✅ Firebase Auth obtido com sucesso');
    } catch (initError) {
      console.error('❌ Falha ao inicializar Firebase Admin:', initError);
      const errorMessage = (initError as Error).message;
      
      // Retornar erro mais informativo
      return NextResponse.json(
        { 
          error: 'Falha ao inicializar Firebase Admin SDK',
          details: errorMessage,
          hint: 'As variáveis FIREBASE_PRIVATE_KEY e FIREBASE_CLIENT_EMAIL são necessárias para acessar o Firebase Authentication. Elas são diferentes das variáveis NEXT_PUBLIC_FIREBASE_* que já estão configuradas.',
          solution: 'Configure no Vercel: Settings > Environment Variables > Add FIREBASE_PRIVATE_KEY e FIREBASE_CLIENT_EMAIL (obtenha do Firebase Console > Project Settings > Service Accounts)'
        },
        { status: 500 }
      );
    }
    
    // Listar usuários do Firebase Authentication com paginação
    console.log('📋 Buscando lista de usuários do Firebase Authentication...');
    let allUsers: any[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
    let nextPageToken: string | undefined;
    let pageCount = 0;
    
    try {
      do {
        pageCount++;
        console.log(`📄 Buscando página ${pageCount}...`);
        const listUsersResult = await auth.listUsers(1000, nextPageToken);
        allUsers = allUsers.concat(listUsersResult.users);
        nextPageToken = listUsersResult.pageToken;
        console.log(`✅ Página ${pageCount} processada: ${listUsersResult.users.length} usuários (Total acumulado: ${allUsers.length})`);
      } while (nextPageToken);
      
      console.log(`🎉 Busca concluída! Total de ${allUsers.length} usuários encontrados no Firebase Authentication`);
    } catch (listError) {
      console.error('❌ Erro ao listar usuários:', listError);
      console.error('❌ Tipo do erro:', (listError as any)?.constructor?.name);
      console.error('❌ Código do erro:', (listError as any)?.code);
      console.error('❌ Mensagem:', (listError as any)?.message);
      throw listError;
    }
    
    // Log de datas para debug
    if (allUsers.length > 0) {
      const dates = allUsers
        .map(u => u.metadata?.creationTime)
        .filter(Boolean)
        .sort();
      console.log(`📅 Primeira data de criação: ${dates[0]}`);
      console.log(`📅 Última data de criação: ${dates[dates.length - 1]}`);
      console.log(`📊 Amostra de usuários (primeiros 5):`, 
        allUsers.slice(0, 5).map(u => ({
          email: u.email,
          creationTime: u.metadata?.creationTime
        }))
      );
    }
    
    const users = allUsers.map(userRecord => ({
      uid: userRecord.uid,
      email: userRecord.email || '',
      displayName: userRecord.displayName || '',
      emailVerified: userRecord.emailVerified,
      disabled: userRecord.disabled,
      metadata: {
        creationTime: userRecord.metadata.creationTime ? 
          (typeof userRecord.metadata.creationTime === 'string' 
            ? userRecord.metadata.creationTime 
            : userRecord.metadata.creationTime.toISOString()) 
          : null,
        lastSignInTime: userRecord.metadata.lastSignInTime ? 
          (typeof userRecord.metadata.lastSignInTime === 'string' 
            ? userRecord.metadata.lastSignInTime 
            : userRecord.metadata.lastSignInTime.toISOString()) 
          : null
      },
      providerData: userRecord.providerData.map((provider: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
        providerId: provider.providerId,
        uid: provider.uid,
        email: provider.email,
        displayName: provider.displayName
      }))
    }));

    console.log('✅ Usuários formatados com sucesso');
    return NextResponse.json({ users, total: users.length });
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
