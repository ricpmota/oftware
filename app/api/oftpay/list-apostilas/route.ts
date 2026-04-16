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
    return {
      ...creds,
      private_key: creds.private_key.replace(/\\n/g, '\n'),
    };
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

/**
 * GET /api/oftpay/list-apostilas?courseId=oftreview&search=termo
 * Lista PDFs da pasta apostilas do curso no GCS (bucket/OFTREVIEW 2023/APOSTILAS/).
 * search: filtra por nome ou assunto (case insensitive).
 */
export async function GET(request: NextRequest) {
  try {
    const courseId = request.nextUrl.searchParams.get('courseId') || '';
    const searchParam = (request.nextUrl.searchParams.get('search') ?? request.nextUrl.searchParams.get('q') ?? '').trim().toLowerCase();
    const bucketName = process.env.OFTPAY_GCS_BUCKET;

    if (!bucketName) {
      return NextResponse.json(
        { error: 'OFTPAY_GCS_BUCKET não configurado.' },
        { status: 500 }
      );
    }

    const credentials = getCredentials();
    if (!credentials) {
      return NextResponse.json(
        { error: 'Credenciais GCS não encontradas. Defina GOOGLE_APPLICATION_CREDENTIALS_JSON.' },
        { status: 500 }
      );
    }

    const storage = new Storage({ credentials });
    const bucket = storage.bucket(bucketName);

    // Oftreview: PDFs em pasta única OFTREVIEW 2023/APOSTILAS/
    // Propedeutics: PDFs dentro de cada subpasta (ex: PROPEDEUTICS/EMERGÊNCIA/Emergency.pdf) — busca ativa em todas as subpastas
    const isPropedeutics = courseId.toLowerCase() === 'propedeutics';
    const prefix = isPropedeutics
      ? 'PROPEDEUTICS/'
      : courseId === 'oftreview'
        ? 'OFTREVIEW 2023/APOSTILAS/'
        : `${courseId.toUpperCase()}/APOSTILAS/`;

    const [allFiles] = await bucket.getFiles({ prefix, autoPaginate: true });
    const pdfFiles = allFiles.filter((f) => path.extname(f.name).toLowerCase() === '.pdf');

    let result = await Promise.all(
      pdfFiles.map(async (file) => {
        const [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 60 * 60 * 1000, // 1 hora
        });
        const name = path.basename(file.name);
        const base = path.basename(file.name, '.pdf');
        const dirParts = file.name.replace(/\\/g, '/').split('/').filter(Boolean);
        const subject = dirParts.length > 1 ? dirParts[dirParts.length - 2] : 'Apostilas';

        return {
          id: base || name,
          name: name.replace(/\.pdf$/i, ''),
          subject,
          url: signedUrl,
          storagePath: file.name,
        };
      })
    );

    // Busca: filtrar por nome ou assunto
    if (searchParam) {
      result = result.filter(
        (a) =>
          (a.name || '').toLowerCase().includes(searchParam) ||
          (a.subject || '').toLowerCase().includes(searchParam)
      );
    }

    // Ordenar por assunto e depois por nome
    result.sort((a, b) => {
      const c = (a.subject || '').localeCompare(b.subject || '', undefined, { sensitivity: 'base' });
      if (c !== 0) return c;
      return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true });
    });

    return NextResponse.json({
      apostilas: result,
      search: searchParam || undefined,
      debug: result.length === 0 ? { prefix, bucket: bucketName, totalInFolder: allFiles.length } : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Erro ao listar apostilas GCS:', message, err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
