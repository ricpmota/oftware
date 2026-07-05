import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';

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
    if (!processedKey.includes('\n') && processedKey.includes('-----BEGIN PRIVATE KEY-----')) {
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
      storageBucket: storageBucket,
    });
  }

  return adminApp;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const categoriaRaw = (formData.get('categoria') as string | null)?.trim().toLowerCase() || 'perfil';
    const profissaoRaw = ((formData.get('profissao') as string | null)?.trim().toLowerCase() || 'medico') as
      | 'medico'
      | 'nutricionista'
      | 'personal';

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Arquivo deve ser uma imagem' }, { status: 400 });
    }

    if (file.size > 6 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Tamanho máximo: 6MB' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const ext = file.type === 'image/png' ? 'png' : file.name.split('.').pop() || 'png';
    const folderByCat: Record<string, string> =
      profissaoRaw === 'nutricionista'
        ? {
            perfil: 'nutricionista-perfil-fotos',
            cnh: 'nutricionista-verificacao/cnh',
            selfie: 'nutricionista-verificacao/selfie',
            crm_doc: 'nutricionista-verificacao/registro',
            registro_doc: 'nutricionista-verificacao/registro',
          }
        : profissaoRaw === 'personal'
          ? {
              perfil: 'personal-perfil-fotos',
              cnh: 'personal-verificacao/cnh',
              selfie: 'personal-verificacao/selfie',
              crm_doc: 'personal-verificacao/registro',
              registro_doc: 'personal-verificacao/registro',
            }
          : {
              perfil: 'medico-perfil-fotos',
              cnh: 'medico-verificacao/cnh',
              selfie: 'medico-verificacao/selfie',
              crm_doc: 'medico-verificacao/crm',
            };
    const folder = folderByCat[categoriaRaw] || folderByCat.perfil;
    const fileName = `${folder}/${timestamp}_${random}.${ext}`;

    const adminApp = getFirebaseAdmin();
    const storage = getStorage(adminApp);
    const storageBucket =
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
      `${process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e'}.appspot.com`;

    const bucket = storage.bucket(storageBucket);
    const fileRef = bucket.file(fileName);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type || 'image/png',
        cacheControl: 'public, max-age=31536000',
      },
    });

    await fileRef.makePublic();

    const publicUrl = `https://storage.googleapis.com/${storageBucket}/${fileName}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error: unknown) {
    console.error('Erro ao fazer upload da foto do médico:', error);
    const err = error as { code?: string; message?: string };
    let errorMessage = 'Erro ao fazer upload da imagem';
    if (err.code === 404 || err.message?.includes('does not exist')) {
      errorMessage =
        'O Firebase Storage não está configurado. Ative o bucket no Firebase Console.';
    } else if (err.message) {
      errorMessage = err.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
