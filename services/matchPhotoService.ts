import { auth } from '@/lib/firebase';
import { isValidFirebaseAuthUid } from '@/lib/firebase/isValidAuthUid';
import { isOwnMatchPhotoPath, MATCH_PHOTO_MAX, type MatchPhoto } from '@/lib/match/matchProfile';

export const MATCH_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function requireOwnUid(): string {
  const uid = auth.currentUser?.uid || '';
  if (!isValidFirebaseAuthUid(uid)) {
    throw new Error('Faça login novamente.');
  }
  return uid;
}

async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente.');
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export function validateMatchPhotoFile(file: File, currentCount: number): string | null {
  if (currentCount >= MATCH_PHOTO_MAX) return 'Você pode adicionar até 6 fotos.';
  if (!ALLOWED_TYPES.has(file.type)) return 'Use uma foto JPG, PNG ou WebP.';
  if (file.size > MATCH_PHOTO_MAX_BYTES) return 'A foto deve ter no máximo 5 MB.';
  return null;
}

export async function uploadMatchPhoto(file: File, order: number): Promise<MatchPhoto> {
  const uid = requireOwnUid();
  const body = new FormData();
  body.append('file', file);
  const response = await fetch('/api/meta/match/photo', {
    method: 'POST',
    headers: await authHeaders(),
    body,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    photo?: { id?: string; url?: string; storagePath?: string };
  };
  if (!response.ok || !payload.ok || !payload.photo?.id || !payload.photo.url || !payload.photo.storagePath) {
    throw new Error(payload.error || 'Não foi possível enviar a foto.');
  }
  if (!isOwnMatchPhotoPath(uid, payload.photo.storagePath)) {
    throw new Error('A foto não ficou na sua pasta.');
  }
  return {
    id: payload.photo.id,
    url: payload.photo.url,
    storagePath: payload.photo.storagePath,
    order,
    isPrimary: order === 0,
  };
}

export async function deleteMatchPhotoFile(storagePath: string): Promise<void> {
  const uid = requireOwnUid();
  if (!isOwnMatchPhotoPath(uid, storagePath)) return;
  const response = await fetch('/api/meta/match/photo', {
    method: 'DELETE',
    headers: {
      ...(await authHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ storagePath }),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || 'Não foi possível remover a foto.');
  }
}
