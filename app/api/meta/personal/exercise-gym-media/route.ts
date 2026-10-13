import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminStorageBucket, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { requirePacienteOrLinkedPersonal } from '@/lib/server/requirePacienteOrLinkedPersonal';
import {
  COL_EXERCISE_GYM_MEDIA,
  EXERCISE_GYM_MEDIA_MAX_BYTES,
  classifyExerciseGymMedia,
  exerciseGymMediaDocId,
  exerciseGymMediaExt,
  guessMimeFromName,
} from '@/lib/personal/exerciseGymMedia';

export const runtime = 'nodejs';
export const maxDuration = 60;

function storagePublicUrl(storagePath: string): string {
  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e'}.appspot.com`;
  return `https://storage.googleapis.com/${storageBucket}/${storagePath}`;
}

async function deleteStoragePath(storagePath: string | null | undefined) {
  const path = String(storagePath || '').trim();
  if (!path) return;
  try {
    await getAdminStorageBucket().file(path).delete({ ignoreNotFound: true });
  } catch (error) {
    console.warn('[exercise-gym-media] falha ao apagar arquivo antigo', error);
  }
}

/**
 * POST multipart/form-data: file, pacienteId, exerciseId
 * DELETE JSON: pacienteId, exerciseId
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const pacienteId = String(formData.get('pacienteId') || '').trim();
    const exerciseId = String(formData.get('exerciseId') || '').trim();

    if (!file) {
      return NextResponse.json({ ok: false, error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }
    if (!exerciseId) {
      return NextResponse.json({ ok: false, error: 'Exercício inválido.' }, { status: 400 });
    }

    const auth = await requirePacienteOrLinkedPersonal(request, pacienteId);
    if (auth instanceof NextResponse) return auth;

    const contentTypeRaw = (file.type || '').toLowerCase();
    const guessedMime = guessMimeFromName(file.name);
    const kind =
      classifyExerciseGymMedia(contentTypeRaw) || classifyExerciseGymMedia(guessedMime);
    const contentType =
      (classifyExerciseGymMedia(contentTypeRaw) ? contentTypeRaw : guessedMime) ||
      contentTypeRaw ||
      'application/octet-stream';
    if (!kind) {
      return NextResponse.json(
        { ok: false, error: 'Envie uma foto ou um vídeo da máquina.' },
        { status: 400 }
      );
    }
    if (file.size > EXERCISE_GYM_MEDIA_MAX_BYTES) {
      return NextResponse.json(
        { ok: false, error: 'Arquivo muito grande. Máximo 20 MB.' },
        { status: 400 }
      );
    }

    const docId = exerciseGymMediaDocId(auth.patientUserId, exerciseId);
    const db = getFirestoreAdmin();
    const ref = db.collection(COL_EXERCISE_GYM_MEDIA).doc(docId);
    const existing = await ref.get();
    const previousPath = existing.exists
      ? String((existing.data() as { storagePath?: string }).storagePath || '')
      : '';

    const ext = exerciseGymMediaExt(contentType, file.name);
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const storagePath = `patients/${auth.patientUserId}/exercise-gym-media/${exerciseId}/${timestamp}-${random}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const bucket = getAdminStorageBucket();
    const fileRef = bucket.file(storagePath);
    await fileRef.save(buffer, {
      metadata: {
        contentType,
        cacheControl: 'public, max-age=31536000',
      },
    });
    await fileRef.makePublic();

    const now = new Date().toISOString();
    const media = {
      patientUserId: auth.patientUserId,
      patientDocId: auth.pacienteDocId,
      exerciseId,
      kind,
      url: storagePublicUrl(storagePath),
      storagePath,
      contentType,
      createdByUid: auth.uid,
      createdAt: existing.exists
        ? String((existing.data() as { createdAt?: string }).createdAt || now)
        : now,
      updatedAt: now,
    };
    await ref.set(
      {
        ...media,
        updatedAtServer: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    if (previousPath && previousPath !== storagePath) {
      await deleteStoragePath(previousPath);
    }

    return NextResponse.json({
      ok: true,
      media: {
        id: docId,
        ...media,
      },
    });
  } catch (error: unknown) {
    console.error('[meta/personal/exercise-gym-media]', error);
    const err = error as { code?: string; message?: string };
    let errorMessage = 'Não foi possível salvar a foto real.';
    if (err.code === 404 || err.message?.includes('does not exist')) {
      errorMessage = 'O Firebase Storage não está configurado. Ative o bucket no Firebase Console.';
    } else if (err.message) {
      errorMessage = err.message;
    }
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      pacienteId?: string;
      exerciseId?: string;
    };
    const pacienteId = String(body.pacienteId || '').trim();
    const exerciseId = String(body.exerciseId || '').trim();
    if (!exerciseId) {
      return NextResponse.json({ ok: false, error: 'Exercício inválido.' }, { status: 400 });
    }

    const auth = await requirePacienteOrLinkedPersonal(request, pacienteId);
    if (auth instanceof NextResponse) return auth;

    const docId = exerciseGymMediaDocId(auth.patientUserId, exerciseId);
    const db = getFirestoreAdmin();
    const ref = db.collection(COL_EXERCISE_GYM_MEDIA).doc(docId);
    const snap = await ref.get();
    if (snap.exists) {
      const storagePath = String((snap.data() as { storagePath?: string }).storagePath || '');
      await ref.delete();
      await deleteStoragePath(storagePath);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[meta/personal/exercise-gym-media DELETE]', error);
    return NextResponse.json(
      { ok: false, error: 'Não foi possível remover a foto real.' },
      { status: 500 }
    );
  }
}
