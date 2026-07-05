import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';
import { buildOrganizacaoPublicUrl } from '@/lib/tenant/organizacaoPublicOrigin';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';

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
 * GET /api/aplicacao/link?pacienteId=xxx&data=YYYY-MM-DD&semana=N&dose=N
 * Gera ou retorna link para o paciente preencher dados da aplicação.
 * Armazena em aplicacao_links. Token é único por pacienteId+data+semana.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const pacienteId = searchParams.get('pacienteId');
    const dataStr = searchParams.get('data'); // YYYY-MM-DD
    const semana = searchParams.get('semana');
    const dose = searchParams.get('dose');

    if (!pacienteId?.trim() || !dataStr?.trim() || !semana || !dose) {
      return NextResponse.json(
        { error: 'pacienteId, data, semana e dose são obrigatórios' },
        { status: 400 }
      );
    }

    const db = getFirebaseAdmin();

    const key = `${pacienteId.trim()}_${dataStr.trim()}_${semana}`;
    const snapshot = await db
      .collection('aplicacao_links')
      .where('key', '==', key)
      .limit(1)
      .get();

    let token: string;

    if (!snapshot.empty) {
      token = snapshot.docs[0].id;
    } else {
      token = crypto.randomBytes(32).toString('hex');
      await db.collection('aplicacao_links').doc(token).set({
        pacienteId: pacienteId.trim(),
        data: dataStr.trim(),
        semana: parseInt(semana, 10),
        dose: parseFloat(dose),
        key,
        createdAt: new Date(),
        ...shadowOrganizationFields(),
      });
    }

    const url = buildOrganizacaoPublicUrl(`/aplicacao/${token}`);

    return NextResponse.json({ url, token });
  } catch (error) {
    console.error('Erro ao obter link de aplicação:', error);
    return NextResponse.json(
      { error: 'Erro ao obter link' },
      { status: 500 }
    );
  }
}
