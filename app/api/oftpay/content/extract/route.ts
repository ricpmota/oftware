/**
 * POST /api/oftpay/content/extract
 * Extrai texto do PDF oficial no GCS e salva em oftreviewContent.
 * Admin only. Sem IA, sem capítulos, sem questões.
 */

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { extractPdfTextByPage } from '@/lib/oftpay/extractPdfTextByPage';
import {
  downloadGcsFile,
  findOftreviewApostilaPdfFile,
  getGcsCredentials,
} from '@/lib/oftpay/gcsOftreviewApostila';
import { QUESTOES_ADMIN_EMAIL } from '@/types/oftpayQuestoes';
import { OFTREVIEW_CONTENT_COLLECTION } from '@/types/oftreviewContent';

export const runtime = 'nodejs';
export const maxDuration = 300;

const COLLECTION = OFTREVIEW_CONTENT_COLLECTION;

interface ExtractBody {
  apostilaTitulo?: string;
}

async function verifyAdminEmail(
  request: NextRequest
): Promise<{ email: string } | NextResponse> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Token obrigatório.' }, { status: 401 });
  }

  try {
    const auth = getAuthAdmin();
    const decoded = await auth.verifyIdToken(token);
    const email = decoded.email?.trim();
    if (!email) {
      return NextResponse.json({ error: 'Token sem e-mail.' }, { status: 400 });
    }
    if (email.toLowerCase() !== QUESTOES_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({ error: 'Acesso negado: apenas administrador.' }, { status: 403 });
    }
    return { email };
  } catch {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminEmail(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = (await request.json().catch(() => ({}))) as ExtractBody;
    const apostilaTitulo = typeof body.apostilaTitulo === 'string' ? body.apostilaTitulo.trim() : '';

    if (!apostilaTitulo) {
      return NextResponse.json({ error: 'apostilaTitulo é obrigatório.' }, { status: 400 });
    }

    if (!process.env.OFTPAY_GCS_BUCKET) {
      return NextResponse.json({ error: 'OFTPAY_GCS_BUCKET não configurado.' }, { status: 500 });
    }

    if (!getGcsCredentials()) {
      return NextResponse.json({ error: 'Credenciais GCS não encontradas.' }, { status: 500 });
    }

    const match = await findOftreviewApostilaPdfFile(apostilaTitulo);
    if (!match) {
      return NextResponse.json(
        { error: 'Apostila não encontrada no bucket Oftreview.' },
        { status: 404 }
      );
    }

    const pdfBuffer = await downloadGcsFile(match.file);
    const { pages, totalPages } = await extractPdfTextByPage(pdfBuffer);

    const sourcePath = `gs://${match.bucketName}/${match.storagePath}`;
    const db = getFirestoreAdmin();

    const existingSnap = await db
      .collection(COLLECTION)
      .where('apostilaTitulo', '==', apostilaTitulo)
      .limit(1)
      .get();

    const payload = {
      apostilaTitulo,
      sourcePath,
      pages,
      totalPages,
      extractedAt: FieldValue.serverTimestamp(),
    };

    let docId: string;

    if (!existingSnap.empty) {
      docId = existingSnap.docs[0].id;
      await db.collection(COLLECTION).doc(docId).update(payload);
    } else {
      const ref = await db.collection(COLLECTION).add(payload);
      docId = ref.id;
    }

    return NextResponse.json({
      ok: true,
      id: docId,
      apostilaTitulo,
      sourcePath,
      totalPages,
      pagesExtracted: pages.length,
      message: existingSnap.empty
        ? 'Conteúdo extraído e salvo.'
        : 'Conteúdo reextraído e atualizado.',
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[content/extract] error:', msg, err);
    return NextResponse.json({ error: 'Erro interno ao extrair conteúdo.' }, { status: 500 });
  }
}
