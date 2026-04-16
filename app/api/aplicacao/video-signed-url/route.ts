import { NextResponse } from 'next/server';
import { getFile } from '@/lib/gcp/storage';

const VIDEO_PATH = 'Aplicacao/Aplicacao-Oftware.mp4';
const SIGNED_URL_TTL_MS = 60 * 60 * 1000; // 1 hora

/**
 * GET /api/aplicacao/video-signed-url
 * Retorna URL assinada do vídeo de aplicação (bucket oftware é privado).
 */
export async function GET() {
  try {
    const file = await getFile(VIDEO_PATH);
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + SIGNED_URL_TTL_MS,
    });
    return NextResponse.json({ ok: true, signedUrl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[aplicacao/video-signed-url] Erro:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
