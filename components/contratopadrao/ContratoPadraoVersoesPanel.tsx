'use client';

import { useCallback, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import type { ContratoPadraoVersaoResumo } from '@/lib/contratos/contratoPadraoTypes';
import ContratoPadraoPreview from '@/components/contratopadrao/ContratoPadraoPreview';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  History,
  Loader2,
  RotateCcw,
} from 'lucide-react';

async function authFetch(url: string, init?: RequestInit) {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente.');
  const token = await user.getIdToken();
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
}

type ContratoPadraoVersoesPanelProps = {
  canEdit: boolean;
  currentVersionId: string | null;
  currentVersionNumber: number | null;
  onRestored: (payload: {
    template: string;
    updatedAt: string | null;
    updatedBy: string | null;
    currentVersionId: string | null;
    currentVersionNumber: number | null;
  }) => void;
  refreshKey?: number;
};

export default function ContratoPadraoVersoesPanel({
  canEdit,
  currentVersionId,
  currentVersionNumber,
  onRestored,
  refreshKey = 0,
}: ContratoPadraoVersoesPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [versoes, setVersoes] = useState<ContratoPadraoVersaoResumo[]>([]);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState('');
  const [loadingView, setLoadingView] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const loadVersoes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/contrato-padrao/versoes');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar versões.');
      setVersoes(data.versoes || []);
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Erro ao carregar versões.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (expanded) void loadVersoes();
  }, [expanded, loadVersoes, refreshKey]);

  const openVersao = async (id: string) => {
    setViewingId(id);
    setLoadingView(true);
    setViewingTemplate('');
    try {
      const res = await authFetch(`/api/contrato-padrao/versoes/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao abrir versão.');
      setViewingTemplate(data.versao?.template || '');
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Erro ao abrir versão.',
      });
      setViewingId(null);
    } finally {
      setLoadingView(false);
    }
  };

  const restaurarVersao = async (id: string) => {
    if (!canEdit) return;
    const versao = versoes.find((v) => v.id === id);
    const label = versao ? `versão ${versao.versionNumber}` : 'esta versão';
    if (
      !window.confirm(
        `Restaurar ${label} como contrato padrão atual? Será criada uma nova versão com esse conteúdo.`
      )
    ) {
      return;
    }

    setRestoringId(id);
    setMessage(null);
    try {
      const res = await authFetch(`/api/contrato-padrao/versoes/${id}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'restaurar' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao restaurar.');

      onRestored({
        template: data.template || '',
        updatedAt: data.updatedAt || null,
        updatedBy: data.updatedBy?.displayName || data.updatedBy?.email || null,
        currentVersionId: data.currentVersionId || null,
        currentVersionNumber: data.currentVersionNumber ?? null,
      });
      setViewingId(null);
      setViewingTemplate('');
      setMessage({ type: 'ok', text: 'Versão restaurada como padrão atual.' });
      await loadVersoes();
    } catch (e) {
      setMessage({
        type: 'err',
        text: e instanceof Error ? e.message : 'Erro ao restaurar versão.',
      });
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-gray-500" aria-hidden />
          <span className="text-sm font-semibold text-gray-800">Histórico de versões</span>
          {currentVersionNumber != null && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
              Atual: v{currentVersionNumber}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-200 px-4 py-4 space-y-4">
          <p className="text-xs text-gray-600">
            Cada salvamento cria uma nova versão. A mais recente é sempre o contrato padrão usado
            nos novos documentos. Versões antigas ficam disponíveis para consulta e restauração.
          </p>

          {message && (
            <div
              className={`rounded-lg border px-3 py-2 text-sm ${
                message.type === 'ok'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {message.text}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : versoes.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">Nenhuma versão salva ainda.</p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {versoes.map((versao) => (
                <li
                  key={versao.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        Versão {versao.versionNumber}
                      </span>
                      {versao.isCurrent || versao.id === currentVersionId ? (
                        <span className="rounded bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-800">
                          Padrão atual
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {new Date(versao.createdAt).toLocaleString('pt-BR')} ·{' '}
                      {versao.createdBy.displayName || versao.createdBy.email} ·{' '}
                      {versao.templateLength.toLocaleString('pt-BR')} caracteres
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void openVersao(versao.id)}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Consultar
                    </button>
                    {canEdit && !versao.isCurrent && versao.id !== currentVersionId && (
                      <button
                        type="button"
                        onClick={() => void restaurarVersao(versao.id)}
                        disabled={restoringId === versao.id}
                        className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                      >
                        {restoringId === versao.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Restaurar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {viewingId && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-800">Consulta de versão</h3>
                <button
                  type="button"
                  onClick={() => {
                    setViewingId(null);
                    setViewingTemplate('');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-800"
                >
                  Fechar
                </button>
              </div>
              {loadingView ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : (
                <>
                  <textarea
                    readOnly
                    value={viewingTemplate}
                    className="w-full min-h-[240px] rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-gray-800"
                  />
                  <ContratoPadraoPreview template={viewingTemplate} />
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
