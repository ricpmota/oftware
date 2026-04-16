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
 * POST /api/conclusao/deletar-depoimento
 * Body: { pacienteId: string, medicoId: string }
 * Remove o depoimento do paciente, a classificação (estrelas) e invalida os links de conclusão (será necessário gerar novo link).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pacienteId = body.pacienteId?.trim();
    const medicoId = body.medicoId?.trim();

    if (!pacienteId || !medicoId) {
      return NextResponse.json(
        { error: 'pacienteId e medicoId são obrigatórios' },
        { status: 400 }
      );
    }

    const db = getFirebaseAdmin();

    const pacienteRef = db.collection('pacientes_completos').doc(pacienteId);
    const pacienteSnap = await pacienteRef.get();
    if (!pacienteSnap.exists) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }

    const paciente = pacienteSnap.data() as Record<string, unknown> & {
      planoTerapeutico?: Record<string, unknown> & { conclusaoTratamento?: Record<string, unknown> & { depoimento?: string } };
    };
    const conclusaoAtual = paciente?.planoTerapeutico?.conclusaoTratamento;
    if (!conclusaoAtual?.depoimento) {
      return NextResponse.json(
        { error: 'Paciente não possui depoimento para deletar' },
        { status: 400 }
      );
    }

    const conclusaoSemDepoimento = { ...conclusaoAtual };
    delete conclusaoSemDepoimento.depoimento;

    await pacienteRef.update({
      planoTerapeutico: {
        ...paciente.planoTerapeutico,
        conclusaoTratamento: conclusaoSemDepoimento,
      },
    });

    const docIdClass = docIdClassificacao(pacienteId, medicoId);
    const classRef = db.collection('classificacao_profissionais').doc(docIdClass);
    const classSnap = await classRef.get();
    if (classSnap.exists) {
      await classRef.delete();
    }

    const linksSnap = await db.collection('conclusao_links').where('pacienteId', '==', pacienteId).get();
    const batch = db.batch();
    linksSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    if (!linksSnap.empty) {
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      message: 'Depoimento e nota removidos. O link anterior foi invalidado; será necessário gerar um novo link para o paciente preencher novamente.',
    });
  } catch (error) {
    console.error('Erro ao deletar depoimento:', error);
    return NextResponse.json(
      { error: 'Erro ao deletar depoimento', details: (error as Error).message },
      { status: 500 }
    );
  }
}
