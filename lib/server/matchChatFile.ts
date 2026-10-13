import { getAdminStorageBucket } from '@/lib/server/firebaseAdminOftware';
import {
  MATCH_FILE_MAX,
  matchAttachmentKind,
  matchFileContentType,
  safeAttachmentName,
  type MatchChatAttachment,
} from '@/lib/match/matchChat';

function storagePublicUrl(storagePath: string): string {
  const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'oftware-9201e'}.appspot.com`;
  return `https://storage.googleapis.com/${storageBucket}/${storagePath}`;
}

export async function uploadMatchChatFile(
  uid: string,
  pairKey: string,
  messageId: string,
  file: File
): Promise<{ ok: true; attachment: MatchChatAttachment } | { ok: false; error: string }> {
  if (file.size <= 0 || file.size > MATCH_FILE_MAX) {
    return { ok: false, error: 'O arquivo deve ter no máximo 12 MB.' };
  }
  const name = safeAttachmentName(file.name);
  const contentType = matchFileContentType(name, file.type);
  if (!contentType) return { ok: false, error: 'Esse tipo de arquivo não pode ser enviado.' };
  const ext = name.includes('.') ? name.split('.').pop() : 'bin';
  const storagePath = `match-chat/${pairKey}/${uid}/${messageId}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileRef = getAdminStorageBucket().file(storagePath);
  await fileRef.save(buffer, {
    metadata: { contentType, cacheControl: 'private, max-age=3600' },
  });
  let url = storagePublicUrl(storagePath);
  try {
    await fileRef.makePublic();
  } catch {
    const [signed] = await fileRef.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365 * 5,
    });
    url = signed;
  }
  return {
    ok: true,
    attachment: { url, name, contentType, kind: matchAttachmentKind(contentType) },
  };
}
