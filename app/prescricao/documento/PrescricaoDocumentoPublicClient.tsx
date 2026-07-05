'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, ExternalLink, FileText, Loader2 } from 'lucide-react';
import type { PrescriptionPublicDocumentJson } from '@/lib/signature/prescriptionPublicDocumentApi';

type Props = {
  initialCodigo?: string;
};

export default function PrescricaoDocumentoPublicClient({ initialCodigo = '' }: Props) {
  const searchParams = useSearchParams();
  const codigoFromUrl = searchParams.get('codigo')?.trim() || initialCodigo;

  const [codeInput, setCodeInput] = useState(codigoFromUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PrescriptionPublicDocumentJson | null>(null);

  const pdfOpenUrl = useMemo(() => {
    if (!result?.publicPdfUrl) return '';
    return result.publicPdfUrl;
  }, [result?.publicPdfUrl]);

  const consultar = useCallback(async (rawCode: string) => {
    const code = rawCode.trim();
    if (!code) {
      setError('Informe o código de validação.');
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `/api/prescricao/documento?codigo=${encodeURIComponent(code)}`,
        { cache: 'no-store' }
      );
      const data = (await res.json()) as PrescriptionPublicDocumentJson & {
        error?: string;
        valid?: boolean;
      };
      if (!res.ok || !data.valid) {
        setError(data.error || 'Documento não encontrado.');
        return;
      }
      setResult(data);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('codigo', data.validationCode);
        url.searchParams.delete('_format');
        window.history.replaceState({}, '', url.toString());
      }
    } catch {
      setError('Não foi possível consultar o documento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (codigoFromUrl) {
      setCodeInput(codigoFromUrl);
      void consultar(codigoFromUrl);
    }
  }, [codigoFromUrl, consultar]);

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      <div className="max-w-lg mx-auto px-4 py-10">
        <header className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 mb-3">
            <FileText className="w-6 h-6" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Validação de Documento Médico Digital
          </h1>
          <p className="text-sm text-gray-600 mt-2">
            Portal Oftware — consulta por código impresso no receituário assinado digitalmente
            (ICP-Brasil).
          </p>
        </header>

        <form
          className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void consultar(codeInput);
          }}
        >
          <div>
            <label
              htmlFor="codigo-validacao"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Código de Validação
            </label>
            <input
              id="codigo-validacao"
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="OFTW-RE-XXXXXXXX"
              autoComplete="off"
              spellCheck={false}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono tracking-wide focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 rounded-lg disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Consultar Documento
          </button>
        </form>

        {error && (
          <p
            className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3"
            role="alert"
          >
            {error}
          </p>
        )}

        {result && (
          <div className="mt-6 bg-white rounded-xl border border-emerald-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden />
              <span className="font-semibold">Documento válido</span>
            </div>

            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 border-t border-emerald-100 pt-3">
              {result.statusLabel}
            </p>

            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Médico</dt>
                <dd className="font-medium text-gray-900">{result.physicianName}</dd>
                {result.physicianCrmLine ? (
                  <dd className="text-gray-700">{result.physicianCrmLine}</dd>
                ) : null}
              </div>
              {result.issuedAtFormatted ? (
                <div>
                  <dt className="text-gray-500">Data de emissão</dt>
                  <dd className="font-medium text-gray-900">{result.issuedAtFormatted}</dd>
                </div>
              ) : null}
              {result.signedAtFormatted ? (
                <div>
                  <dt className="text-gray-500">Data da assinatura</dt>
                  <dd className="font-medium text-gray-900">{result.signedAtFormatted}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-gray-500">Código de validação</dt>
                <dd className="font-mono text-gray-900">{result.validationCode}</dd>
              </div>
            </dl>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={pdfOpenUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 rounded-lg"
              >
                <FileText className="w-4 h-4" />
                Abrir PDF Original
              </a>
              <a
                href={result.itiValidationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-800 font-medium py-2.5 rounded-lg hover:bg-gray-50"
              >
                <ExternalLink className="w-4 h-4" />
                Validar Assinatura no ITI
              </a>
            </div>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-gray-500 leading-relaxed">
          Oftware — validação de documentos médicos assinados digitalmente.
          <br />
          Autenticidade da assinatura ICP-Brasil:{' '}
          <a
            href="https://validar.iti.gov.br"
            className="text-emerald-700 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            validar.iti.gov.br
          </a>
        </p>
      </div>
    </div>
  );
}
