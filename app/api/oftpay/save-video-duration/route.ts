import { NextRequest, NextResponse } from 'next/server';
import { saveVideoDuration } from '@/utils/videoDurationFirestore';

/**
 * POST /api/oftpay/save-video-duration
 * Salva a duração de um vídeo no Firestore (após extração no cliente via HTMLVideoElement).
 * Body: { libraryId: string, videoId: string, storagePath: string, title: string, durationSeconds: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { libraryId, videoId, storagePath, title, durationSeconds } = body;
    if (
      typeof libraryId !== 'string' ||
      !libraryId.trim() ||
      typeof videoId !== 'string' ||
      !videoId.trim() ||
      typeof storagePath !== 'string' ||
      typeof title !== 'string' ||
      typeof durationSeconds !== 'number' ||
      !Number.isFinite(durationSeconds) ||
      durationSeconds < 0
    ) {
      return NextResponse.json(
        { error: 'Body inválido. Requer: libraryId, videoId, storagePath, title (strings), durationSeconds (número >= 0).' },
        { status: 400 }
      );
    }
    await saveVideoDuration(libraryId.trim(), videoId.trim(), {
      title: title.trim(),
      storagePath: storagePath.trim(),
      durationSeconds,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Erro ao salvar duração do vídeo:', message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
