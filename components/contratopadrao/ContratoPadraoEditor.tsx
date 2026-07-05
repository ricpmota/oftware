'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { invalidateContratoPadraoTemplateClientCache } from '@/lib/contratos/contratoPadraoService';
import { CONTRATO_TIRZEPATIDA_PLACEHOLDER_KEYS } from '@/lib/contratos/contratoTirzepatidaTemplate';
import ContratoPadraoPreview from '@/components/contratopadrao/ContratoPadraoPreview';
import ContratoPadraoVersoesPanel from '@/components/contratopadrao/ContratoPadraoVersoesPanel';
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, Save } from 'lucide-react';

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

const textareaCls =
  'w-full min-h-[60vh] rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm leading-relaxed text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

export default function ContratoPadraoEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState('');
  const [savedTemplate, setSavedTemplate] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState('');
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [currentVersionNumber, setCurrentVersionNumber] = useState<number | null>(null);
  const [versoesRefreshKey, setVersoesRefreshKey] = useState(0);

  const isDirty = useMemo(() => template !== savedTemplate, [template, savedTemplate]);

  useEffect(() => {
    const timer = window.setTimeout(() => setPreviewTemplate(template), 350);
    return () => window.clearTimeout(timer);
  }, [template]);

  const loadTemplate = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await authFetch('/api/contrato-padrao');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar contrato.');
      setTemplate(data.template || '');
      setSavedTemplate(data.template || '');
      setCanEdit(data.canEdit === true);
      setUpdatedAt(data.updatedAt || null);
      setUpdatedBy(data.updatedBy?.displayName || data.updatedBy?.email || null);
      setCurrentVersionId(data.currentVersionId || null);
      setCurrentVersionNumber(
        typeof data.currentVersionNumber === 'number' ? data.currentVersionNumber : null
      );
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Erro ao carregar.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = '/';
        return;
      }
      setUserEmail(user.email);
      void loadTemplate();
    });
    return () => unsub();
  }, [loadTemplate]);

  const handleSave = async () => {
    if (!canEdit || !isDirty) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await authFetch('/api/contrato-padrao', {
        method: 'PUT',
        body: JSON.stringify({ template }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar.');
      setSavedTemplate(data.template || template);
      setUpdatedAt(data.updatedAt || null);
      setUpdatedBy(data.updatedBy?.displayName || data.updatedBy?.email || null);
      setCurrentVersionId(data.currentVersionId || null);
      setCurrentVersionNumber(
        typeof data.currentVersionNumber === 'number' ? data.currentVersionNumber : null
      );
      invalidateContratoPadraoTemplateClientCache();
      setVersoesRefreshKey((k) => k + 1);
      setMessage({
        type: 'ok',
        text: `Contrato salvo como versão ${data.currentVersionNumber ?? ''}.`.trim(),
      });
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Erro ao salvar.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" aria-hidden />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contrato padrão — Médico × Paciente</h1>
          <p className="mt-1 text-sm text-gray-600">
            Texto usado no contrato de tratamento assinado entre médico e paciente.
          </p>
          {updatedAt && (
            <p className="mt-2 text-xs text-gray-500">
              Última alteração: {new Date(updatedAt).toLocaleString('pt-BR')}
              {updatedBy ? ` por ${updatedBy}` : ''}
              {currentVersionNumber != null ? ` · versão ${currentVersionNumber}` : ''}
            </p>
          )}
          {userEmail && (
            <p className="mt-1 text-xs text-gray-500">
              Logado como {userEmail}
              {canEdit ? ' — permissão de edição ativa' : ' — somente leitura'}
            </p>
          )}
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar alterações
          </button>
        )}
      </div>

      {message && (
        <div
          className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.type === 'ok' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {!canEdit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Você pode visualizar o contrato, mas não tem permissão para salvar alterações. Peça ao
          administrador para liberar seu acesso em MetaAdminGeral → Contratos.
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-medium text-gray-800">Placeholders disponíveis</p>
        <p className="mt-1 text-xs text-gray-600">
          Use no texto no formato {'{{nomeDoCampo}}'}. Os valores são preenchidos automaticamente ao
          gerar o contrato de cada paciente.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {CONTRATO_TIRZEPATIDA_PLACEHOLDER_KEYS.map((key) => (
            <code
              key={key}
              className="rounded bg-white px-2 py-1 text-xs text-gray-700 ring-1 ring-gray-200"
            >
              {`{{${key}}}`}
            </code>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Use <code className="rounded bg-white px-1 ring-1 ring-gray-200">__QUEBRA_PAGINA_ASSINATURAS__</code>{' '}
          para forçar quebra de página antes das assinaturas no PDF.
        </p>
      </div>

      <ContratoPadraoVersoesPanel
        canEdit={canEdit}
        currentVersionId={currentVersionId}
        currentVersionNumber={currentVersionNumber}
        refreshKey={versoesRefreshKey}
        onRestored={({ template: restored, updatedAt: at, updatedBy: by, currentVersionId: vid, currentVersionNumber: vnum }) => {
          setTemplate(restored);
          setSavedTemplate(restored);
          setUpdatedAt(at);
          setUpdatedBy(by);
          setCurrentVersionId(vid);
          setCurrentVersionNumber(vnum);
          setVersoesRefreshKey((k) => k + 1);
          invalidateContratoPadraoTemplateClientCache();
        }}
      />

      <textarea
        value={template}
        onChange={(e) => setTemplate(e.target.value)}
        readOnly={!canEdit}
        className={`${textareaCls} ${!canEdit ? 'cursor-default bg-gray-50' : ''}`}
        spellCheck={false}
      />

      <ContratoPadraoPreview template={previewTemplate || template} />

      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
        <a
          href="/metaadmingeral?menu=contratos"
          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
        >
          Gerenciar permissões
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
