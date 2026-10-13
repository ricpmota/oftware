import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAdminStorageBucket, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

export type TipoFotoProgresso = 'frontal' | 'perfil';

export type ProgressPhotoPublic = {
  id: string;
  tipo: TipoFotoProgresso;
  url: string;
  data: string;
  semana?: number;
  applicationId: string;
  compartilharComMedico: boolean;
  storagePath?: string;
  createdAt: string;
};

export type ProgressPhotoScope = {
  pacienteId: string;
  applicationId: string;
  semana: number | null;
  dataAplicacao: string;
  origem: string;
};

export class ProgressPhotoError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function parseCreatedAtIso(v: unknown): string {
  if (!v) return new Date().toISOString();
  if (v instanceof Date) return v.toISOString();
  const ts = v as Timestamp;
  if (typeof ts?.toDate === 'function') return ts.toDate().toISOString();
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function photosCol(pacienteId: string) {
  return getFirestoreAdmin().collection('pacientes_completos').doc(pacienteId).collection('progressPhotos');
}

function extFromMime(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/heic') return 'heic';
  if (mime === 'image/heif') return 'heif';
  return 'jpg';
}

export async function listProgressPhotos(pacienteId: string): Promise<ProgressPhotoPublic[]> {
  const snap = await photosCol(pacienteId).get();
  return snap.docs
    .map((d) => {
      const data = d.data() as Record<string, unknown>;
      const tipo = data.tipo === 'perfil' || data.tipo === 'frontal' ? data.tipo : null;
      if (!tipo) return null;
      return {
        id: d.id,
        tipo,
        url: String(data.url || ''),
        data: String(data.dataAplicacao || ''),
        semana: typeof data.semana === 'number' ? data.semana : undefined,
        applicationId: String(data.applicationId || ''),
        compartilharComMedico: Boolean(data.compartilharComMedico),
        storagePath: data.storagePath ? String(data.storagePath) : undefined,
        createdAt: parseCreatedAtIso(data.createdAt),
      } satisfies ProgressPhotoPublic;
    })
    .filter((f): f is ProgressPhotoPublic => f != null && !!f.url)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function readSharePreference(
  pacienteId: string,
  applicationId: string,
  fotosDaAplicacao: ProgressPhotoPublic[]
): Promise<boolean> {
  const prefDoc = await getFirestoreAdmin()
    .collection('pacientes_completos')
    .doc(pacienteId)
    .collection('progressPhotoPreferences')
    .doc(applicationId)
    .get();
  if (typeof prefDoc.data()?.compartilharComMedico === 'boolean') {
    return Boolean(prefDoc.data()?.compartilharComMedico);
  }
  if (fotosDaAplicacao.length > 0) return Boolean(fotosDaAplicacao[0].compartilharComMedico);
  return true;
}

export async function createProgressPhoto(
  scope: ProgressPhotoScope,
  file: File,
  tipo: TipoFotoProgresso,
  compartilharComMedico: boolean
): Promise<ProgressPhotoPublic> {
  if (!file.type.startsWith('image/')) {
    throw new ProgressPhotoError(400, 'O arquivo deve ser uma imagem');
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new ProgressPhotoError(400, 'Imagem muito grande. Máximo: 8MB');
  }

  const existingSnap = await photosCol(scope.pacienteId)
    .where('applicationId', '==', scope.applicationId)
    .where('tipo', '==', tipo)
    .limit(1)
    .get();
  if (!existingSnap.empty) {
    throw new ProgressPhotoError(
      409,
      `Você já registrou uma foto ${tipo === 'frontal' ? 'frontal' : 'de perfil'} nesta etapa.`
    );
  }

  const fileExt = extFromMime(file.type);
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 9);
  const storagePath = `patients/${scope.pacienteId}/progress-photos/${scope.applicationId}/${tipo}-${timestamp}-${random}.${fileExt}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileRef = getAdminStorageBucket().file(storagePath);
  await fileRef.save(buffer, {
    metadata: {
      contentType: file.type || 'image/jpeg',
      cacheControl: 'public, max-age=31536000',
    },
  });
  await fileRef.makePublic();

  const bucketName = fileRef.bucket.name;
  const url = `https://storage.googleapis.com/${bucketName}/${storagePath}`;
  const photoRef = photosCol(scope.pacienteId).doc();
  const createdAt = new Date().toISOString();

  await photoRef.set({
    id: photoRef.id,
    applicationId: scope.applicationId,
    semana: scope.semana,
    dataAplicacao: scope.dataAplicacao,
    tipo,
    url,
    storagePath,
    compartilharComMedico,
    visivelParaPaciente: true,
    createdAt: FieldValue.serverTimestamp(),
    origem: scope.origem,
  });

  await getFirestoreAdmin()
    .collection('pacientes_completos')
    .doc(scope.pacienteId)
    .collection('progressPhotoPreferences')
    .doc(scope.applicationId)
    .set(
      {
        applicationId: scope.applicationId,
        compartilharComMedico,
        semana: scope.semana,
        dataAplicacao: scope.dataAplicacao,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  return {
    id: photoRef.id,
    tipo,
    url,
    data: scope.dataAplicacao,
    semana: scope.semana != null ? scope.semana : undefined,
    applicationId: scope.applicationId,
    compartilharComMedico,
    storagePath,
    createdAt,
  };
}

export async function deleteProgressPhoto(scope: ProgressPhotoScope, photoId: string): Promise<void> {
  if (!photoId) throw new ProgressPhotoError(400, 'Foto inválida para exclusão');

  const photoRef = photosCol(scope.pacienteId).doc(photoId);
  const photoSnap = await photoRef.get();
  if (!photoSnap.exists) throw new ProgressPhotoError(404, 'Foto não encontrada');

  const photoData = (photoSnap.data() || {}) as Record<string, unknown>;
  if (String(photoData.applicationId || '') !== scope.applicationId) {
    throw new ProgressPhotoError(403, 'Foto não pertence a este registro');
  }

  const storagePath = String(photoData.storagePath || '').trim();
  if (storagePath) {
    await getAdminStorageBucket().file(storagePath).delete({ ignoreNotFound: true });
  }
  await photoRef.delete();
}

export async function setProgressPhotoShare(
  scope: ProgressPhotoScope,
  compartilharComMedico: boolean
): Promise<void> {
  const db = getFirestoreAdmin();
  const photosSnap = await photosCol(scope.pacienteId).get();
  const batch = db.batch();
  photosSnap.docs.forEach((photoDoc) => {
    const data = photoDoc.data() as Record<string, unknown>;
    if (String(data.applicationId || '') === scope.applicationId) {
      batch.update(photoDoc.ref, { compartilharComMedico });
    }
  });
  batch.set(
    db
      .collection('pacientes_completos')
      .doc(scope.pacienteId)
      .collection('progressPhotoPreferences')
      .doc(scope.applicationId),
    {
      applicationId: scope.applicationId,
      compartilharComMedico,
      semana: scope.semana,
      dataAplicacao: scope.dataAplicacao,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  await batch.commit();
}
