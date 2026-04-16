import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { Storage } from '@google-cloud/storage';

/** Objeto de credenciais do Google (service account) */
interface GCPCredentials {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key?: string;
  client_email?: string;
  [key: string]: unknown;
}

function normalizePrivateKey(creds: GCPCredentials): GCPCredentials {
  if (typeof creds.private_key === 'string') {
    return { ...creds, private_key: creds.private_key.replace(/\\n/g, '\n') };
  }
  return creds;
}

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

/** Normaliza nome para comparação: remove extensão, lowercase, trim. */
function normalizeForMatch(name: string): string {
  return name
    .replace(/\.(pdf|cdr)$/i, '')
    .trim()
    .toLowerCase();
}

/**
 * GET /api/oftpay/apostila-signed-url?title=Nome da apostila&courseId=oftreview
 * Redireciona (302) para a URL assinada do PDF cujo nome corresponde ao título.
 * Usado pelo modal de referências do chat para abrir a apostila correta.
 */
export async function GET(request: NextRequest) {
  try {
    const title = request.nextUrl.searchParams.get('title')?.trim();
    const courseId = request.nextUrl.searchParams.get('courseId') || 'oftreview';

    if (!title) {
      return NextResponse.json({ error: 'Parâmetro title é obrigatório.' }, { status: 400 });
    }

    const bucketName = process.env.OFTPAY_GCS_BUCKET;
    if (!bucketName) {
      return NextResponse.json({ error: 'OFTPAY_GCS_BUCKET não configurado.' }, { status: 500 });
    }

    const credentials = getCredentials();
    if (!credentials) {
      return NextResponse.json(
        { error: 'Credenciais GCS não encontradas.' },
        { status: 500 }
      );
    }

    const storage = new Storage({ credentials });
    const bucket = storage.bucket(bucketName);
    // Propedeutics: PDFs em cada subpasta (PROPEDEUTICS/EMERGÊNCIA/Emergency.pdf). Demais: pasta APOSTILAS.
    const isPropedeutics = courseId.toLowerCase() === 'propedeutics';
    const prefix = isPropedeutics
      ? 'PROPEDEUTICS/'
      : courseId === 'oftreview'
        ? 'OFTREVIEW 2023/APOSTILAS/'
        : `${courseId.toUpperCase()}/APOSTILAS/`;

    const [allFiles] = await bucket.getFiles({ prefix, autoPaginate: true });
    const pdfFiles = allFiles.filter((f) => path.extname(f.name).toLowerCase() === '.pdf');

    const normalizedTitle = normalizeForMatch(title);

    for (const file of pdfFiles) {
      const fileName = path.basename(file.name);
      const baseName = fileName.replace(/\.pdf$/i, '');
      if (normalizeForMatch(baseName) === normalizedTitle || normalizeForMatch(fileName).includes(normalizedTitle) || normalizedTitle.includes(normalizeForMatch(baseName))) {
        const [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 60 * 60 * 1000,
        });
        return NextResponse.redirect(signedUrl, 302);
      }
    }

    return NextResponse.json(
      { error: 'Apostila não encontrada para o título informado.' },
      { status: 404 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Erro ao obter URL assinada da apostila:', message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
