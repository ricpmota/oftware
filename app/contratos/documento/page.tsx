import { Suspense } from 'react';

/**
 * TODO: Implementar consulta pública de Contrato de Tratamento assinado (paridade com /prescricao/documento).
 * URLs de validação e QR Code do contrato já apontam para esta rota.
 */
export default function ContratoDocumentoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-lg font-semibold text-gray-900">Consulta de Contrato de Tratamento</h1>
          <p className="text-sm text-gray-600">
            Validação pública em implementação. Utilize o código <strong>OFTW-CT-</strong> impresso no documento ou
            valide a assinatura ICP-Brasil em{' '}
            <a
              href="https://validar.iti.gov.br"
              className="text-blue-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              validar.iti.gov.br
            </a>
            .
          </p>
        </div>
      </main>
    </Suspense>
  );
}
