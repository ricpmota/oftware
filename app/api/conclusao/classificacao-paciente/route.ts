import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getFirebaseAdmin() {
  const existingApps = getApps();
  let adminApp;

  if (existingApps.length > 0) {
    adminApp = existingApps[0];
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e';
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
        projectId,
        clientEmail,
        privateKey: processedKey,
      }),
    });
  }

  return getFirestore(adminApp);
}

function docIdClassificacao(pacienteId: string, profissionalId: string): string {
  return `${pacienteId}_medico_${profissionalId}`;
}

/**
 * GET /api/conclusao/classificacao-paciente?pacienteId=xxx&medicoId=yyy
 * Retorna a nota (estrelas) que o paciente deu ao médico na conclusão do tratamento.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pacienteId = searchParams.get('pacienteId');
    const medicoId = searchParams.get('medicoId');

    if (!pacienteId?.trim() || !medicoId?.trim()) {
      return NextResponse.json(
        { error: 'pacienteId e medicoId são obrigatórios' },
        { status: 400 }
      );
    }

    const db = getFirebaseAdmin();
    const docId = docIdClassificacao(pacienteId.trim(), medicoId.trim());
    const ref = await db.collection('classificacao_profissionais').doc(docId).get();

    if (!ref.exists) {
      return NextResponse.json({ estrelas: null });
    }

    const data = ref.data() as { estrelas?: number };
    const estrelas = typeof data?.estrelas === 'number' && data.estrelas >= 1 && data.estrelas <= 5
      ? data.estrelas
      : null;

    return NextResponse.json({ estrelas });
  } catch (error) {
    console.error('Erro ao obter classificação do paciente:', error);
    return NextResponse.json(
      { error: 'Erro ao processar solicitação', details: (error as Error).message },
      { status: 500 }
    );
  }
}
