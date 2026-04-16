import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getFirebaseAdmin() {
  const existingApps = getApps();
  let adminApp;
  
  if (existingApps.length > 0) {
    adminApp = existingApps[0];
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "oftware-9201e";
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    
    if (!privateKey || !clientEmail) {
      throw new Error('Variáveis de ambiente do Firebase Admin não configuradas');
    }
    
    let processedKey = privateKey.replace(/\\n/g, '\n');
    if (!processedKey.includes('\n') && processedKey.includes('-----BEGIN')) {
      processedKey = processedKey
        .replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
        .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----')
        .replace(/\n+/g, '\n');
    }
    
    adminApp = initializeApp({
      credential: cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: processedKey,
      }),
    });
  }
  
  return getFirestore(adminApp);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const nomeSobrenome = searchParams.get('nome');
    
    if (!nomeSobrenome) {
      return NextResponse.json(
        { error: 'Parâmetro "nome" é obrigatório' },
        { status: 400 }
      );
    }

    const db = getFirebaseAdmin();
    const nutricionistasSnapshot = await db.collection('nutricionistas').get();
    
    // Converter nomeSobrenome de "maria-silva" para "Maria Silva"
    const partesNome = nomeSobrenome
      .split('-')
      .map(parte => parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase());
    
    const nomeBusca = partesNome.join(' ');
    
    // Buscar nutricionista que tenha o nome começando com o nome buscado
    const nutricionistas = nutricionistasSnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dataCadastro: data.dataCadastro?.toDate?.() || data.dataCadastro,
        };
      })
      .filter((nutri: any) => {
        const nomeNutri = (nutri.nome || '').trim().toLowerCase();
        return nomeNutri.startsWith(nomeBusca.toLowerCase());
      });
    
    if (nutricionistas.length === 0) {
      return NextResponse.json(
        { error: 'Nutricionista não encontrado' },
        { status: 404 }
      );
    }
    
    // Retornar o primeiro nutricionista encontrado
    const nutricionista = nutricionistas[0];
    
    // Formatar resposta
    return NextResponse.json({
      id: nutricionista.id,
      userId: nutricionista.userId,
      email: nutricionista.email,
      nome: nutricionista.nome,
      registroNumero: nutricionista.registroNumero || '',
      cidades: nutricionista.cidades || [],
      dataCadastro: nutricionista.dataCadastro,
      status: nutricionista.status || 'inativo',
      isVerificado: nutricionista.isVerificado || false,
      medicoVinculadoIds: nutricionista.medicoVinculadoIds || [],
    });
  } catch (error) {
    console.error('Erro ao buscar nutricionista por nome:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar nutricionista', details: (error as Error).message },
      { status: 500 }
    );
  }
}
