'use client';

import { useCallback, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { listOftreviewContent } from '@/services/oftreviewContentService';
import { OFTREVIEW_APOSTILAS_GCS_URI } from '@/types/oftpayQuestoes';
import type { OftreviewContentSummary } from '@/types/oftreviewContent';
import {
  AlertCircle,
  Database,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface OftreviewContentPanelProps {
  userEmail: string;
  isAdmin: boolean;
}

interface ApostilaPdfOption {
  id: string;
  name: string;
}

function formatExtractedAt(ms?: number): string {
  if (!ms) return '—';
  try {
    return new Date(ms).toLocaleString('pt-BR');
  } catch {
    return '—';
  }
}

export default function OftreviewContentPanel({ userEmail, isAdmin }: OftreviewContentPanelProps) {
  const [items, setItems] = useState<OftreviewContentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [apostilasPdf, setApostilasPdf] = useState<ApostilaPdfOption[]>([]);
  const [loadingApostilasPdf, setLoadingApostilasPdf] = useState(false);
  const [apostilasPdfError, setApostilasPdfError] = useState<string | null>(null);

  const [selectedApostila, setSelectedApostila] = useState('');
  const [extracting, setExtracting] = useState(false);

  const loadContent = useCallback(async () => {
    if (!isAdmin || !userEmail) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listOftreviewContent(userEmail);
      setItems(list);
    } catch (e) {
      console.error('[conteudo] loadContent:', e);
      setItems([]);
      setError('Não foi possível carregar o conteúdo extraído.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, userEmail]);

  const loadApostilasPdf = useCallback(async () => {
    setLoadingApostilasPdf(true);
    setApostilasPdfError(null);
    try {
      const res = await fetch('/api/oftpay/list-apostilas?courseId=oftreview');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Falha ao listar apostilas.');
      }
      const apostilas = Array.isArray(data.apostilas) ? data.apostilas : [];
      setApostilasPdf(
        apostilas.map((a: { id?: string; name?: string }) => ({
          id: String(a.id ?? a.name ?? ''),
          name: String(a.name ?? a.id ?? ''),
        }))
      );
    } catch (e) {
      console.error('[conteudo] loadApostilasPdf:', e);
      setApostilasPdf([]);
      setApostilasPdfError('Não foi possível carregar a lista de PDFs do bucket.');
    } finally {
      setLoadingApostilasPdf(false);
    }
  }, []);

  useEffect(() => {
    loadContent();
    loadApostilasPdf();
  }, [loadContent, loadApostilasPdf]);

  const handleExtract = async () => {
    if (!isAdmin || !selectedApostila) return;
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      setError('Faça login para extrair conteúdo.');
      return;
    }

    setExtracting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/oftpay/content/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ apostilaTitulo: selectedApostila }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Falha ao extrair conteúdo.');
        return;
      }

      setSuccessMessage(
        `${data.apostilaTitulo}: ${data.totalPages} páginas extraídas e salvas.`
      );
      await loadContent();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro de conexão ao extrair.');
    } finally {
      setExtracting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-6 text-sm text-gray-600">
        O conteúdo extraído é gerenciado apenas pelo administrador.
      </div>
    );
  }

  return (
    <section className="space-y-6" aria-labelledby="conteudo-extraido-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Database className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h2 id="conteudo-extraido-heading" className="text-lg font-medium text-gray-900">
              Conteúdo Extraído
            </h2>
            <p className="text-sm text-gray-600">
              Texto bruto das apostilas oficiais em{' '}
              <code className="text-xs bg-gray-100 px-1 rounded">{OFTREVIEW_APOSTILAS_GCS_URI}</code>
              . Apenas armazenamento — sem capítulos, subtemas ou questões.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadContent}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar lista
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          Extrair conteúdo
        </h3>

        {apostilasPdfError && (
          <p className="text-xs text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            {apostilasPdfError} Você ainda pode digitar o título manualmente abaixo.
          </p>
        )}

        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-600 mb-1">Apostila</label>
            {apostilasPdf.length > 0 ? (
              <select
                value={selectedApostila}
                onChange={(e) => setSelectedApostila(e.target.value)}
                disabled={extracting || loadingApostilasPdf}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white"
              >
                <option value="">Selecione uma apostila…</option>
                {apostilasPdf.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={selectedApostila}
                onChange={(e) => setSelectedApostila(e.target.value)}
                placeholder="Título do PDF no bucket"
                disabled={extracting}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            )}
          </div>
          <button
            type="button"
            onClick={handleExtract}
            disabled={!selectedApostila || extracting}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {extracting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extraindo…
              </>
            ) : (
              'Extrair conteúdo'
            )}
          </button>
        </div>

        {loadingApostilasPdf && (
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Carregando PDFs do bucket…
          </p>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">Apostilas com conteúdo salvo</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-gray-500 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center">
            Nenhum conteúdo extraído ainda. Selecione uma apostila e clique em Extrair conteúdo.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
                  <th className="px-4 py-2 font-medium">Apostila</th>
                  <th className="px-4 py-2 font-medium text-right">Páginas extraídas</th>
                  <th className="px-4 py-2 font-medium">Data de extração</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.apostilaTitulo}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{row.totalPages}</td>
                    <td className="px-4 py-3 text-gray-600">{formatExtractedAt(row.extractedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
