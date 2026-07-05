import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function getFirebaseAdmin() {
  const existingApps = getApps();
  let adminApp;

  if (existingApps.length > 0) {
    adminApp = existingApps[0];
  } else {
    const projectId =
      process.env.FIREBASE_PROJECT_ID ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      'oftware-9201e';
    const clientEmail =
      process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey =
      process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_ADMIN_PRIVATE_KEY;

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

function getApplicationId(
  linkData: Record<string, unknown>,
  token: string,
  semana: number | null,
  dataAplicacao: string
) {
  const candidate =
    (linkData.applicationId as string | undefined) ||
    (linkData.aplicacaoId as string | undefined) ||
    (linkData.applicationKey as string | undefined);
  if (candidate && candidate.trim()) return candidate.trim();
  return `app-${token.slice(0, 12)}-${semana ?? 'semana'}-${dataAplicacao}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token || token.length < 16) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    const body = await request.json();
    const compartilharComMedico = Boolean(body?.compartilharComMedico);

    const db = getFirebaseAdmin();
    const linkRef = await db.collection('aplicacao_links').doc(token).get();
    if (!linkRef.exists) {
      return NextResponse.json({ error: 'Link não encontrado ou expirado' }, { status: 404 });
    }

    const linkData = (linkRef.data() || {}) as Record<string, unknown>;
    const pacienteId = String(linkData.pacienteId || '').trim();
    const semana = Number(linkData.semana ?? null);
    const dataAplicacao = String(linkData.data || '').trim();
    if (!pacienteId) {
      return NextResponse.json({ error: 'Dados do link inválidos' }, { status: 400 });
    }

    const applicationId = getApplicationId(
      linkData,
      token,
      Number.isFinite(semana) ? semana : null,
      dataAplicacao
    );

    const photosSnap = await db
      .collection('pacientes_completos')
      .doc(pacienteId)
      .collection('progressPhotos')
      .get();

    const batch = db.batch();
    photosSnap.docs.forEach((photoDoc) => {
      const data = photoDoc.data() as Record<string, unknown>;
      if (String(data.applicationId || '') === applicationId) {
        batch.update(photoDoc.ref, { compartilharComMedico });
      }
    });

    const prefRef = db
      .collection('pacientes_completos')
      .doc(pacienteId)
      .collection('progressPhotoPreferences')
      .doc(applicationId);
    batch.set(
      prefRef,
      {
        applicationId,
        compartilharComMedico,
        semana: Number.isFinite(semana) ? semana : null,
        dataAplicacao,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await batch.commit();

    return NextResponse.json({ success: true, compartilharComMedico, applicationId });
  } catch (error) {
    console.error('Erro ao atualizar compartilhamento de fotos:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar compartilhamento', details: (error as Error).message },
      { status: 500 }
    );
  }
}
