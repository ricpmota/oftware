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
 * GET /api/conclusao/link?pacienteId=xxx&data=YYYY-MM-DD&medicoId=xxx
 * Gera ou retorna link para o paciente preencher conclusão (peso final, circunferência, classificar médico).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pacienteId = searchParams.get('pacienteId');
    const dataStr = searchParams.get('data');
    const medicoId = searchParams.get('medicoId');

    if (!pacienteId?.trim() || !dataStr?.trim() || !medicoId?.trim()) {
      return NextResponse.json(
        { error: 'pacienteId, data e medicoId são obrigatórios' },
        { status: 400 }
      );
    }

    const db = getFirebaseAdmin();
    const key = `conclusao_${pacienteId.trim()}_${dataStr.trim()}`;
    const snapshot = await db
      .collection('conclusao_links')
      .where('key', '==', key)
      .limit(1)
      .get();

    let token: string;

    if (!snapshot.empty) {
      token = snapshot.docs[0].id;
    } else {
      token = crypto.randomBytes(32).toString('hex');
      await db.collection('conclusao_links').doc(token).set({
        pacienteId: pacienteId.trim(),
        data: dataStr.trim(),
        medicoId: medicoId.trim(),
        key,
        createdAt: new Date(),
      });
    }

    const baseUrl =
      (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '') ||
      (typeof request.headers.get('origin') === 'string' ? request.headers.get('origin')!.replace(/\/$/, '') : '') ||
      'https://oftware.com.br';
    const url = `${baseUrl}/conclusao/${token}`;

    return NextResponse.json({ url, token });
  } catch (error) {
    console.error('Erro ao obter link de conclusão:', error);
    return NextResponse.json(
      { error: 'Erro ao obter link' },
      { status: 500 }
    );
  }
}
