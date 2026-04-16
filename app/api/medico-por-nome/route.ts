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
    const medicosSnapshot = await db.collection('medicos').get();

    // Normalizar como no slug (MetaAdmin): sem acentos, lowercase
    const normalizar = (str: string) =>
      (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();

    // Extrair sufixo numérico se existir (ex: "ricardo-mota2" -> numero=2, slugBase="ricardo-mota")
    const matchNumero = nomeSobrenome.match(/^(.+?)(\d+)$/);
    const slugBase = matchNumero ? matchNumero[1].replace(/-$/, '') : nomeSobrenome; // remove trailing - if any
    const indiceDuplicata = matchNumero ? parseInt(matchNumero[2], 10) : 1; // 1 = primeiro da lista
    const partesSlug = slugBase.split('-').filter((p) => p.length > 0);
    const firstSlug = partesSlug[0] ? normalizar(partesSlug[0]) : '';
    const lastSlug = partesSlug.length > 1 ? normalizar(partesSlug[partesSlug.length - 1]) : firstSlug;

    // Buscar médico cujo primeiro e último nome coincidam com o slug (igual ao gerarSlugBase do MetaAdmin)
    const medicos = medicosSnapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dataCadastro: data.dataCadastro?.toDate?.() || data.dataCadastro,
        };
      })
      .filter((medico: any) => {
        const nomeCompleto = (medico.nome || '').trim();
        if (!nomeCompleto) return false;
        const partes = nomeCompleto.split(/\s+/).filter((p: string) => p.length > 0);
        if (partes.length === 0) return false;
        const firstNome = normalizar(partes[0]);
        const lastNome = partes.length > 1 ? normalizar(partes[partes.length - 1]) : firstNome;
        return firstNome === firstSlug && lastNome === lastSlug;
      });
    
    if (medicos.length === 0) {
      return NextResponse.json(
        { error: 'Médico não encontrado' },
        { status: 404 }
      );
    }

    // Se slug tinha sufixo numérico (ex: ricardo-mota2), retornar o N-ésimo médico com esse nome
    const indice = Math.min(indiceDuplicata - 1, medicos.length - 1);
    const medico = medicos[Math.max(0, indice)];
    
    // Formatar resposta
    return NextResponse.json({
      id: medico.id,
      userId: medico.userId,
      email: medico.email,
      nome: medico.nome,
      genero: medico.genero,
      telefone: medico.telefone,
      fotoPerfilUrl: medico.fotoPerfilUrl ?? null,
      crm: medico.crm,
      localizacao: medico.localizacao,
      cidades: medico.cidades || [],
      dataCadastro: medico.dataCadastro,
      status: medico.status || 'ativo',
      isVerificado: medico.isVerificado || false,
    });
  } catch (error) {
    console.error('Erro ao buscar médico por nome:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar médico', details: (error as Error).message },
      { status: 500 }
    );
  }
}

