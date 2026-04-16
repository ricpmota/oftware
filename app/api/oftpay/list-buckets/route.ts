import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { Storage } from '@google-cloud/storage';

function getCredentials(): object | null {
  const envJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (envJson) {
    try {
      return JSON.parse(envJson) as object;
    } catch {
      return null;
    }
  }
  const relPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(process.cwd(), 'oftpay', 'gen-lang-client-0723351594-1970dd124eb0.json');
  const absPath = path.isAbsolute(relPath) ? relPath : path.join(process.cwd(), relPath);
  try {
    const raw = fs.readFileSync(absPath, 'utf8');
    return JSON.parse(raw) as object;
  } catch (e) {
    console.error('Credenciais não encontradas em', absPath, e);
    return null;
  }
}

/**
 * GET /api/oftpay/list-buckets
 * Lista buckets do projeto GCS (para você descobrir o nome do bucket dos vídeos).
 */
export async function GET() {
  try {
    const credentials = getCredentials();
    if (!credentials) {
      return NextResponse.json(
        {
          error:
            'Credenciais não encontradas. Defina GOOGLE_APPLICATION_CREDENTIALS (caminho do JSON) ou GOOGLE_APPLICATION_CREDENTIALS_JSON.',
        },
        { status: 500 }
      );
    }

    const storage = new Storage({ credentials });
    const [buckets] = await storage.getBuckets();
    const names = buckets.map((b) => b.name);

    return NextResponse.json({ buckets: names, count: names.length });
  } catch (err) {
    console.error('Erro ao listar buckets:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao listar buckets' },
      { status: 500 }
    );
  }
}
