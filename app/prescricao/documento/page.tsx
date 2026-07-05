import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { findSignedPrescriptionByValidationCode } from '@/lib/signature/prescriptionSignedDocumentLookup.server';
import PrescricaoDocumentoPublicClient from '@/app/prescricao/documento/PrescricaoDocumentoPublicClient';

type PageProps = {
  searchParams: Promise<{ codigo?: string; _format?: string }>;
};

export default async function PrescricaoDocumentoPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const format = sp._format?.trim().toLowerCase() ?? '';
  const codigo = sp.codigo?.trim() ?? '';

  if (format === 'application/pdf') {
    if (!codigo) {
      return new Response('Informe o código de validação.', { status: 400 });
    }
    const document = await findSignedPrescriptionByValidationCode(codigo);
    if (!document?.signedPdfUrl) {
      notFound();
    }
    redirect(document.signedPdfUrl);
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <PrescricaoDocumentoPublicClient initialCodigo={codigo} />
    </Suspense>
  );
}
