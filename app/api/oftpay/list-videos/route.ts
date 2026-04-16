import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { Storage } from '@google-cloud/storage';
import { getMp4DurationFromBuffer } from '@/utils/mp4DurationFromBuffer';
import { getVideoDurationsBatch, saveVideoDuration } from '@/utils/videoDurationFirestore';
import type { File } from '@google-cloud/storage';

/** Objeto de credenciais do Google (service account) */
interface GCPCredentials {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key?: string;
  client_email?: string;
  [key: string]: unknown;
}

/** Garante que a chave privada tenha quebras de linha corretas (comum ao colar na Vercel) */
function normalizePrivateKey(creds: GCPCredentials): GCPCredentials {
  if (typeof creds.private_key === 'string') {
    return {
      ...creds,
      private_key: creds.private_key.replace(/\\n/g, '\n'),
    };
  }
  return creds;
}

/** Carrega credenciais: env JSON (Vercel) ou arquivo local (dev) */
function getCredentials(): GCPCredentials | null {
  const envJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (envJson) {
    try {
      const parsed = JSON.parse(envJson) as GCPCredentials;
      return normalizePrivateKey(parsed);
    } catch (e) {
      console.error('Falha ao fazer parse de GOOGLE_APPLICATION_CREDENTIALS_JSON:', e);
      return null;
    }
  }
  const relPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.cwd(), 'oftpay', 'gen-lang-client-0723351594-1970dd124eb0.json');
  const absPath = path.isAbsolute(relPath) ? relPath : path.join(process.cwd(), relPath);
  try {
    const raw = fs.readFileSync(absPath, 'utf8');
    const parsed = JSON.parse(raw) as GCPCredentials;
    return normalizePrivateKey(parsed);
  } catch {
    return null;
  }
}

/** Lê um intervalo de bytes de um arquivo GCS para um Buffer (para parsear duração MP4). */
async function readGcsRange(file: File, start: number, end: number): Promise<Buffer> {
  const stream = file.createReadStream({ start, end });
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

/** Obtém duração em segundos a partir do conteúdo do vídeo (MP4/MOV). Se não for MP4 ou falhar, retorna null. */
async function getDurationFromFileContent(file: File, ext: string): Promise<number | null> {
  const extLower = ext.toLowerCase();
  if (extLower !== '.mp4' && extLower !== '.m4v' && extLower !== '.mov') {
    return null;
  }
  try {
    const [meta] = await file.getMetadata();
    const size = Number((meta as { size?: string })?.size ?? 0);
    if (!Number.isFinite(size) || size <= 0) return null;

    const headLen = Math.min(2 * 1024 * 1024, size); // primeiros 2 MB
    let buf = await readGcsRange(file, 0, headLen - 1);
    let duration = getMp4DurationFromBuffer(buf);
    if (duration != null) return Math.round(duration);

    // moov no final (MP4 não "fast start")
    const tailLen = Math.min(1024 * 1024, size);
    const tailStart = Math.max(0, size - tailLen);
    buf = await readGcsRange(file, tailStart, size - 1);
    duration = getMp4DurationFromBuffer(buf);
    return duration != null ? Math.round(duration) : null;
  } catch {
    return null;
  }
}

/**
 * GET /api/oftpay/list-videos?courseId=oftreview
 * Lista vídeos do curso no GCS. Requer OFTPAY_GCS_BUCKET e prefix (ou storagePath do curso).
 */
export async function GET(request: NextRequest) {
  try {
    const courseId = request.nextUrl.searchParams.get('courseId') || '';
    const bucketName = process.env.OFTPAY_GCS_BUCKET;
    const prefixParam = request.nextUrl.searchParams.get('prefix') || '';

    if (!bucketName) {
      return NextResponse.json(
        { error: 'OFTPAY_GCS_BUCKET não configurado. Defina na Vercel (Environment Variables).' },
        { status: 500 }
      );
    }

    const credentials = getCredentials();
    if (!credentials) {
      return NextResponse.json(
        {
          error:
            'Credenciais GCS não encontradas. Defina GOOGLE_APPLICATION_CREDENTIALS_JSON na Vercel com o conteúdo do JSON da chave (cole em uma única linha, sem quebras).',
        },
        { status: 500 }
      );
    }

    const storage = new Storage({ credentials });
    const bucket = storage.bucket(bucketName);
    const videoExtensions = ['.mp4', '.webm', '.mkv', '.mov', '.avi', '.m4v'];

    /** Descobre pastas na raiz do bucket (usa delimiter para obter "prefixes" com o nome EXATO que está no GCS). */
    async function getRootPrefixes(): Promise<string[]> {
      const [, , apiResponse] = await bucket.getFiles({
        prefix: '',
        delimiter: '/',
        autoPaginate: false,
      });
      const prefixes = (apiResponse as { prefixes?: string[] } | undefined)?.prefixes ?? [];
      return prefixes;
    }

    // Sempre montamos a árvore a partir do bucket: lemos as pastas na raiz e usamos o nome EXATO retornado pelo GCS (case-sensitive).
    const rootPrefixes = await getRootPrefixes();
    const courseIdLower = courseId.toLowerCase();
    const exactPrefix = rootPrefixes.find((p) => p.replace(/\/$/, '').toLowerCase().includes(courseIdLower));
    const prefix = exactPrefix ?? (prefixParam ? prefixParam.replace(/\/?$/, '/') : '');

    // Lista TODOS os arquivos sob esse prefix (incluindo todas as subpastas: Catarata/, etc.)
    const [allFiles] = await bucket.getFiles({ prefix, autoPaginate: true });
    const videoFiles = allFiles.filter((f) => {
      const ext = path.extname(f.name).toLowerCase();
      return videoExtensions.includes(ext);
    });

    const libraryId = `oftpay_${courseId || 'default'}`;
    const videoIds = videoFiles.map((f) => {
      const name = path.basename(f.name);
      const base = path.basename(f.name, path.extname(name));
      return base || name;
    });
    const durationMap = await getVideoDurationsBatch(libraryId, videoIds);

    const result = await Promise.all(
      videoFiles.map(async (file) => {
        const [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 60 * 60 * 1000, // 1 hora
        });
        const name = path.basename(file.name);
        const base = path.basename(file.name, path.extname(name));
        const videoId = base || name;
        const dirParts = file.name.replace(/\\/g, '/').split('/').filter(Boolean);
        const subject = dirParts.length > 1 ? dirParts[dirParts.length - 2] : 'Geral';

        // Duração: 1) Firestore (cache); 2) GCS custom metadata; 3) extração do arquivo (MP4/moov). Sem fallback fixo.
        let duration: number | null = durationMap.get(videoId)?.durationSeconds ?? null;
        const hadFromFirestore = duration != null;
        if (duration == null) {
          try {
            const [meta] = await file.getMetadata();
            const raw = (meta as { metadata?: Record<string, string> })?.metadata?.duration;
            if (raw != null && raw !== '') {
              const sec = Math.round(Number(raw));
              if (Number.isFinite(sec) && sec >= 0) duration = sec;
            }
          } catch {
            // ignora
          }
        }
        if (duration == null) {
          duration = await getDurationFromFileContent(file, path.extname(file.name));
        }
        if (duration != null && !hadFromFirestore) {
          try {
            await saveVideoDuration(libraryId, videoId, {
              title: name,
              storagePath: file.name,
              durationSeconds: duration,
            });
          } catch (e) {
            console.warn('Falha ao salvar duração no Firestore:', e);
          }
        }

        return {
          videoId,
          name,
          subject,
          url: signedUrl,
          storagePath: file.name,
          duration,
        };
      })
    );

    if (result.length === 0) {
      return NextResponse.json({
        videos: [],
        debug: {
          prefix,
          bucket: bucketName,
          totalObjectsListed: allFiles.length,
          rootFoldersFound: rootPrefixes,
          hint: 'Prefix usado é o nome exato da pasta no GCS (case-sensitive). Se totalObjectsListed for 0, confira permissões no bucket.',
        },
      });
    }
    return NextResponse.json({ videos: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Erro ao listar vídeos GCS:', message, err);
    return NextResponse.json(
      {
        error: message,
        hint:
          'Confira: OFTPAY_GCS_BUCKET, GOOGLE_APPLICATION_CREDENTIALS_JSON (JSON inteiro, uma linha). Bucket deve estar no mesmo projeto da chave.',
      },
      { status: 500 }
    );
  }
}
