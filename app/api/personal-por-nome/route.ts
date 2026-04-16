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
    const personalTrainersSnapshot = await db.collection('personal_trainers').get();

    // Normalizar como no slug: sem acentos, lowercase (ex: "lia-mota" → first "lia", last "mota")
    const normalizar = (str: string) =>
      (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    const partesSlug = nomeSobrenome.split('-').filter((p) => p.length > 0);
    const firstSlug = partesSlug[0] ? normalizar(partesSlug[0]) : '';
    const lastSlug = partesSlug.length > 1 ? normalizar(partesSlug[partesSlug.length - 1]) : firstSlug;

    // Buscar personal trainer cujo primeiro e último nome coincidam com o slug (igual ao gerarSlug do modal)
    const personalTrainers = personalTrainersSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dataCadastro: data.dataCadastro?.toDate?.() || data.dataCadastro,
        };
      })
      .filter((personal: any) => {
        const nomeCompleto = (personal.nome || '').trim();
        if (!nomeCompleto) return false;
        const partes = nomeCompleto.split(/\s+/).filter((p: string) => p.length > 0);
        if (partes.length === 0) return false;
        const firstNome = normalizar(partes[0]);
        const lastNome = partes.length > 1 ? normalizar(partes[partes.length - 1]) : firstNome;
        return firstNome === firstSlug && lastNome === lastSlug;
      });
    
    if (personalTrainers.length === 0) {
      return NextResponse.json(
        { error: 'Personal Trainer não encontrado' },
        { status: 404 }
      );
    }
    
    // Retornar o primeiro personal trainer encontrado
    const personalTrainer = personalTrainers[0];
    
    // Formatar resposta
    return NextResponse.json({
      id: personalTrainer.id,
      userId: personalTrainer.userId,
      email: personalTrainer.email,
      nome: personalTrainer.nome,
      registroNumero: personalTrainer.registroNumero || '',
      cidades: personalTrainer.cidades || [],
      dataCadastro: personalTrainer.dataCadastro,
      status: personalTrainer.status || 'inativo',
      isVerificado: personalTrainer.isVerificado || false,
      medicoVinculadoIds: personalTrainer.medicoVinculadoIds || [],
    });
  } catch (error) {
    console.error('Erro ao buscar personal trainer por nome:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar personal trainer', details: (error as Error).message },
      { status: 500 }
    );
  }
}
