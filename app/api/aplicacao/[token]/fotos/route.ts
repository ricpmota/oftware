import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
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

function parseCreatedAtIso(v: unknown): string {
  if (!v) return new Date().toISOString();
  if (v instanceof Date) return v.toISOString();
  const ts = v as Timestamp;
  if (typeof ts?.toDate === 'function') return ts.toDate().toISOString();
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token || token.length < 16) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    const { db } = getFirebaseAdmin();
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

    const snap = await db
      .collection('pacientes_completos')
      .doc(pacienteId)
      .collection('progressPhotos')
      .get();

    const fotos = snap.docs
      .map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          tipo: (data.tipo as TipoFotoProgresso) || 'frontal',
          url: String(data.url || ''),
          data: String(data.dataAplicacao || ''),
          semana: typeof data.semana === 'number' ? data.semana : undefined,
          applicationId: String(data.applicationId || ''),
          compartilharComMedico: Boolean(data.compartilharComMedico),
          storagePath: data.storagePath ? String(data.storagePath) : undefined,
          createdAt: parseCreatedAtIso(data.createdAt),
        };
      })
      .filter((f) => !!f.url && (f.tipo === 'frontal' || f.tipo === 'perfil'))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const prefDoc = await db
      .collection('pacientes_completos')
      .doc(pacienteId)
      .collection('progressPhotoPreferences')
      .doc(applicationId)
      .get();

    const fotosDaAplicacao = fotos.filter((f) => f.applicationId === applicationId);
    const compartilharComMedico =
      typeof prefDoc.data()?.compartilharComMedico === 'boolean'
        ? Boolean(prefDoc.data()?.compartilharComMedico)
        : fotosDaAplicacao.length > 0
          ? Boolean(fotosDaAplicacao[0].compartilharComMedico)
          : true;

    return NextResponse.json({
      applicationId,
      compartilharComMedico,
      fotos,
    });
  } catch (error) {
    console.error('Erro ao carregar fotos de progresso:', error);
    return NextResponse.json(
      { error: 'Erro ao carregar fotos de progresso', details: (error as Error).message },
      { status: 500 }
    );
  }
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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const tipoRaw = String(formData.get('tipo') || '').trim().toLowerCase();
    const tipo: TipoFotoProgresso | null =
      tipoRaw === 'frontal' || tipoRaw === 'perfil' ? tipoRaw : null;
    const compartilharRaw = formData.get('compartilharComMedico');
    const compartilharComMedico =
      compartilharRaw == null ? true : parseBool(compartilharRaw);

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }
    if (!tipo) {
      return NextResponse.json({ error: 'Tipo de foto inválido' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'O arquivo deve ser uma imagem' }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Imagem muito grande. Máximo: 8MB' }, { status: 400 });
    }

    const { db, storage } = getFirebaseAdmin();
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
      file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
          ? 'webp'
          : file.type === 'image/heic'
            ? 'heic'
            : file.type === 'image/heif'
              ? 'heif'
              : 'jpg';
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
        contentType: file.type || 'image/jpeg',
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
      semana: Number.isFinite(semana) ? semana : null,
      dataAplicacao,
      tipo,
      url,
      storagePath,
      compartilharComMedico,
      visivelParaPaciente: true,
      createdAt: FieldValue.serverTimestamp(),
      origem: 'registro_aplicacao',
    });

    await db
      .collection('pacientes_completos')
      .doc(pacienteId)
      .collection('progressPhotoPreferences')
      .doc(applicationId)
      .set(
        {
          applicationId,
          compartilharComMedico,
          semana: Number.isFinite(semana) ? semana : null,
          dataAplicacao,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return NextResponse.json({
      foto: {
        id: photoRef.id,
        tipo,
        url,
        data: dataAplicacao,
        semana: Number.isFinite(semana) ? semana : undefined,
        applicationId,
        compartilharComMedico,
        storagePath,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Erro ao salvar foto de progresso:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar foto de progresso', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token || token.length < 16) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    let photoId = String(request.nextUrl.searchParams.get('photoId') || '').trim();
    if (!photoId) {
      try {
        const body = (await request.json()) as { photoId?: string };
        photoId = String(body?.photoId || '').trim();
      } catch {
        photoId = '';
      }
    }
    if (!photoId) {
      return NextResponse.json({ error: 'Foto inválida para exclusão' }, { status: 400 });
    }

    const { db, storage } = getFirebaseAdmin();
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

    const photoRef = db
      .collection('pacientes_completos')
      .doc(pacienteId)
      .collection('progressPhotos')
      .doc(photoId);
    const photoSnap = await photoRef.get();

    if (!photoSnap.exists) {
      return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 });
    }

    const photoData = (photoSnap.data() || {}) as Record<string, unknown>;
    if (String(photoData.applicationId || '') !== applicationId) {
      return NextResponse.json({ error: 'Foto não pertence a esta semana' }, { status: 403 });
    }

    const storagePath = String(photoData.storagePath || '').trim();
    if (storagePath) {
      const storageBucket =
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
        `${process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e'}.appspot.com`;

      await storage.bucket(storageBucket).file(storagePath).delete({ ignoreNotFound: true });
    }

    await photoRef.delete();

    return NextResponse.json({ success: true, photoId });
  } catch (error) {
    console.error('Erro ao excluir foto de progresso:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir foto de progresso', details: (error as Error).message },
      { status: 500 }
    );
  }
}
