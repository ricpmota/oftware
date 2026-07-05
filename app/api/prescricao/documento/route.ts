import { NextRequest, NextResponse } from 'next/server';
import { findSignedPrescriptionByValidationCode } from '@/lib/signature/prescriptionSignedDocumentLookup.server';
import { buildPrescriptionPublicDocumentJson } from '@/lib/signature/prescriptionPublicDocumentApi';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get('codigo')?.trim() ?? '';
  const format = request.nextUrl.searchParams.get('_format')?.trim().toLowerCase() ?? '';

  if (!codigo) {
    return NextResponse.json({ error: 'Informe o código de validação.' }, { status: 400 });
  }

  const document = await findSignedPrescriptionByValidationCode(codigo);
  if (!document) {
    if (format === 'application/pdf') {
      return new NextResponse('Documento não encontrado.', { status: 404 });
    }
    return NextResponse.json({ error: 'Documento não encontrado.', valid: false }, { status: 404 });
  }

  if (format === 'application/pdf') {
    const pdfUrl = document.signedPdfUrl.trim();
    if (!pdfUrl) {
      return new NextResponse('PDF indisponível.', { status: 404 });
    }
    return NextResponse.redirect(pdfUrl, { status: 302 });
  }

  return NextResponse.json(buildPrescriptionPublicDocumentJson(document));
}
