import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

type TipoFotoProgresso = 'frontal' | 'perfil';

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

    const storageBucket =
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;

    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: processedKey,
      }),
      storageBucket,
    });
  }

  return {
    db: getFirestore(adminApp),
    storage: getStorage(adminApp),
  };
}

function parseBool(value: FormDataEntryValue | null): boolean {
  if (typeof value !== 'string') return false;
  return value.toLowerCase() === 'true';
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const pacienteId = String(formData.get('pacienteId') || '').trim();
    const dataAplicacao = String(formData.get('dataAplicacao') || '').trim();
    const semana = Number(formData.get('semana'));
    const tipoRaw = String(formData.get('tipo') || '').trim().toLowerCase();
    const tipo: TipoFotoProgresso | null =
      tipoRaw === 'frontal' || tipoRaw === 'perfil' ? tipoRaw : null;
    const compartilharRaw = formData.get('compartilharComMedico');
    const compartilharComMedico =
      compartilharRaw == null ? true : parseBool(compartilharRaw);

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }
    if (!pacienteId) {
      return NextResponse.json({ error: 'Paciente inválido' }, { status: 400 });
    }
    if (!dataAplicacao) {
      return NextResponse.json({ error: 'Data da aplicação inválida' }, { status: 400 });
    }
    if (!Number.isFinite(semana) || semana <= 0) {
      return NextResponse.json({ error: 'Semana inválida' }, { status: 400 });
    }
    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de foto inválido' }, { status: 400 });
    }

    const mimeType = (file.type || '').toLowerCase();
    const fileNameExt = String(file.name || '')
      .split('.')
      .pop()
      ?.toLowerCase();
    const allowedTypes = new Set([
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ]);
    const allowedExts = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);
    const isAllowedType =
      (mimeType && allowedTypes.has(mimeType)) || (!mimeType && !!fileNameExt && allowedExts.has(fileNameExt));
    if (!isAllowedType) {
      return NextResponse.json(
        { error: 'Formato inválido. Use JPG, PNG, WEBP ou HEIC.' },
        { status: 400 }
      );
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Imagem muito grande. Máximo: 8MB' }, { status: 400 });
    }

    const { db, storage } = getFirebaseAdmin();
    const applicationId = `meta-semana-${semana}-${dataAplicacao}`;

    const existingSnap = await db
      .collection('pacientes_completos')
      .doc(pacienteId)
      .collection('progressPhotos')
      .where('applicationId', '==', applicationId)
      .where('tipo', '==', tipo)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      return NextResponse.json(
        { error: `Você já registrou uma foto ${tipo === 'frontal' ? 'frontal' : 'de perfil'} nesta semana.` },
        { status: 409 }
      );
    }

    const fileExt =
      mimeType === 'image/png' || fileNameExt === 'png'
        ? 'png'
        : mimeType === 'image/webp' || fileNameExt === 'webp'
          ? 'webp'
          : mimeType === 'image/heic' || fileNameExt === 'heic'
            ? 'heic'
            : mimeType === 'image/heif' || fileNameExt === 'heif'
              ? 'heif'
              : 'jpg';
    const contentType =
      mimeType ||
      (fileExt === 'png'
        ? 'image/png'
        : fileExt === 'webp'
          ? 'image/webp'
          : fileExt === 'heic'
            ? 'image/heic'
            : fileExt === 'heif'
              ? 'image/heif'
              : 'image/jpeg');
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 9);
    const storagePath = `patients/${pacienteId}/progress-photos/${applicationId}/${tipo}-${timestamp}-${random}.${fileExt}`;
    const storageBucket =
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      `${process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e'}.appspot.com`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileRef = storage.bucket(storageBucket).file(storagePath);
    await fileRef.save(buffer, {
      metadata: {
        contentType,
        cacheControl: 'public, max-age=31536000',
      },
    });
    await fileRef.makePublic();
    const url = `https://storage.googleapis.com/${storageBucket}/${storagePath}`;

    const photoRef = db
      .collection('pacientes_completos')
      .doc(pacienteId)
      .collection('progressPhotos')
      .doc();

    await photoRef.set({
      id: photoRef.id,
      applicationId,
      semana,
      dataAplicacao,
      tipo,
      url,
      storagePath,
      compartilharComMedico,
      visivelParaPaciente: true,
      origem: 'meta_aplicacoes',
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      foto: {
        id: photoRef.id,
        tipo,
        url,
        semana,
        dataAplicacao,
        applicationId,
        storagePath,
        compartilharComMedico,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Erro ao salvar foto de progresso via /meta:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar foto de progresso', details: (error as Error).message },
      { status: 500 }
    );
  }
}
