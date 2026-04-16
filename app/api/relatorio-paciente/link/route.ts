import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';

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

/**
 * GET /api/relatorio-paciente/link?pacienteId=xxx
 * Retorna a URL do relatório final do paciente (mesma usada no e-mail Conclusão do Tratamento).
 * Se já existir um link gerado anteriormente, retorna esse; senão cria um novo token e retorna o novo link.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pacienteId = searchParams.get('pacienteId');

    if (!pacienteId || pacienteId.trim() === '') {
      return NextResponse.json(
        { error: 'pacienteId é obrigatório' },
        { status: 400 }
      );
    }

    const db = getFirebaseAdmin();

    const snapshot = await db
      .collection('relatorio_paciente_links')
      .where('pacienteId', '==', pacienteId.trim())
      .limit(1)
      .get();

    let token: string;

    if (!snapshot.empty) {
      token = snapshot.docs[0].id;
    } else {
      token = crypto.randomBytes(32).toString('hex');
      await db.collection('relatorio_paciente_links').doc(token).set({
        pacienteId: pacienteId.trim(),
        createdAt: new Date(),
      });
    }

    const baseUrl =
      (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '') ||
      (typeof request.headers.get('origin') === 'string' ? request.headers.get('origin')!.replace(/\/$/, '') : '') ||
      'https://oftware.com.br';
    const url = `${baseUrl}/relatorio/${token}`;

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Erro ao obter link do relatório:', error);
    return NextResponse.json(
      { error: 'Erro ao obter link do relatório' },
      { status: 500 }
    );
  }
}
