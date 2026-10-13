import { NextRequest, NextResponse } from 'next/server';
import {
  isNextResponse,
  mentorActorFromAccess,
  requireMentorManager,
} from '@/lib/mentorados/requireMentorAccess.server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { MENTOR_CONTENTS_COLLECTION } from '@/lib/mentorados/mentorContent.server';
import {
  buildMentorStoragePath,
  createMentorSignedWriteUrl,
  isMentorThumbnailMime,
  isMentorVideoMime,
  MENTOR_MAX_THUMBNAIL_BYTES,
  MENTOR_MAX_VIDEO_BYTES,
  type MentorUploadKind,
} from '@/lib/mentorados/storage.server';

function isUploadKind(value: unknown): value is MentorUploadKind {
  return value === 'video' || value === 'thumbnail';
}

export async function POST(request: NextRequest) {
  const access = await requireMentorManager(request);
  if (isNextResponse(access)) return access;

  try {
    const body = (await request.json()) as {
      kind?: string;
      contentId?: string;
      filename?: string;
      contentType?: string;
      size?: number;
    };

    if (!isUploadKind(body.kind)) {
      return NextResponse.json({ error: 'kind deve ser video ou thumbnail.' }, { status: 400 });
    }
    const contentType = String(body.contentType || '').trim().toLowerCase();
    const filename = String(body.filename || '').trim();
    if (!filename) {
      return NextResponse.json({ error: 'filename obrigatório.' }, { status: 400 });
    }

    if (body.kind === 'video') {
      if (!isMentorVideoMime(contentType)) {
        return NextResponse.json(
          { error: 'Formato de vídeo inválido. Use MP4, MOV ou WEBM.' },
          { status: 400 }
        );
      }
      if (typeof body.size === 'number' && body.size > MENTOR_MAX_VIDEO_BYTES) {
        return NextResponse.json({ error: 'Vídeo excede o limite de 512 MB.' }, { status: 400 });
      }
    } else {
      if (!isMentorThumbnailMime(contentType)) {
        return NextResponse.json(
          { error: 'Formato de imagem inválido. Use JPG, PNG ou WEBP.' },
          { status: 400 }
        );
      }
      if (typeof body.size === 'number' && body.size > MENTOR_MAX_THUMBNAIL_BYTES) {
        return NextResponse.json({ error: 'Imagem excede o limite de 6 MB.' }, { status: 400 });
      }
    }

    const db = getFirestoreAdmin();
    const contentId = String(body.contentId || '').trim() || db.collection(MENTOR_CONTENTS_COLLECTION).doc().id;
    const storagePath = buildMentorStoragePath(body.kind, contentId, filename, contentType);
    const signed = await createMentorSignedWriteUrl({ storagePath, contentType });

    return NextResponse.json({
      contentId,
      storagePath,
      contentType,
      kind: body.kind,
      ...signed,
      actor: mentorActorFromAccess(access),
    });
  } catch (error) {
    console.error('[videosmentorados/upload-url]', error);
    return NextResponse.json({ error: 'Falha ao preparar o upload.' }, { status: 500 });
  }
}
