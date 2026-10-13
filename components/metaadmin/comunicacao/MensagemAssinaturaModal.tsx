'use client';

import { useEffect, useState } from 'react';
import { PenLine, RefreshCw, X } from 'lucide-react';
import MensagemRichEditor from '@/components/metaadmin/comunicacao/MensagemRichEditor';
import MensagemHtmlBody from '@/components/metaadmin/comunicacao/MensagemHtmlBody';
import {
  buildDefaultAssinaturaHtml,
  type MensagemAssinaturaDefaults,
} from '@/lib/pacienteMensagem/assinaturaMensagem';
import { sanitizeMensagemHtml } from '@/lib/pacienteMensagem/mensagemHtml';
import { MensagemAssinaturaService } from '@/services/mensagemAssinaturaService';
import type { PacienteMensagemAnexo } from '@/services/pacienteMensagemService';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Auth UID (metadado). */
  userId: string;
  /** ID do perfil no papel atual (medicoId / nutriId / personalId / pacienteId). */
  profileId: string;
  defaults: MensagemAssinaturaDefaults;
  /** Usado no upload de imagens da assinatura. */
  uploadPacienteId: string;
  uploadEndpoint?: string;
  onSaved?: (html: string) => void;
  onNotify?: (msg: string) => void;
};

export default function MensagemAssinaturaModal({
  open,
  onClose,
  userId,
  profileId,
  defaults,
  uploadPacienteId,
  uploadEndpoint = '/api/metaadmin/mensagens-anexo-upload',
  onSaved,
  onNotify,
}: Props) {
  const [html, setHtml] = useState('');
  const [anexos, setAnexos] = useState<PacienteMensagemAnexo[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    if (!open || !profileId) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const current = await MensagemAssinaturaService.getAssinaturaHtml(
          { userId, profileId, role: defaults.role },
          defaults
        );
        if (cancelled) return;
        setHtml(current);
        setAnexos([]);
        setEditorKey((k) => k + 1);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // defaults serializado via campos usados
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId, profileId, defaults.displayName, defaults.registro, defaults.telefone, defaults.logoUrl, defaults.role]);

  if (!open) return null;

  const restaurarPadrao = () => {
    const padrao = buildDefaultAssinaturaHtml(defaults);
    setHtml(padrao);
    setAnexos([]);
    setEditorKey((k) => k + 1);
  };

  const salvar = async () => {
    if (!profileId) return;
    setSaving(true);
    try {
      const clean = sanitizeMensagemHtml(html);
      await MensagemAssinaturaService.salvarAssinatura({
        userId,
        profileId,
        role: defaults.role,
        html: clean,
      });
      onSaved?.(clean);
      onNotify?.('Assinatura salva!');
      onClose();
    } catch (e) {
      console.error(e);
      onNotify?.('Erro ao salvar assinatura. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/50 lg:items-center lg:p-4">
      <div className="flex h-full w-full flex-col overflow-hidden bg-white lg:h-auto lg:max-h-[90vh] lg:max-w-2xl lg:rounded-xl">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex min-w-0 items-center gap-2">
            <PenLine className="h-4 w-4 shrink-0 text-gray-500" />
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold text-gray-900">Assinatura</h3>
              <p className="truncate text-xs text-gray-500">
                Estilo Gmail · aparece no final da mensagem · clique na imagem para
                Pequeno / Médio / Grande
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
              <RefreshCw className="h-4 w-4 animate-spin" /> Carregando assinatura…
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Editar assinatura</label>
                <MensagemRichEditor
                  key={editorKey}
                  pacienteId={uploadPacienteId}
                  initialHtml={html}
                  onChangeHtml={setHtml}
                  anexos={anexos}
                  onAnexosChange={setAnexos}
                  disabled={saving}
                  uploadEndpoint={uploadEndpoint}
                  minHeightClassName="min-h-[160px]"
                  showAnexosList={false}
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-gray-600">Pré-visualização</p>
                <div className="rounded-lg border border-gray-200 bg-[#f8fafc] p-3">
                  <MensagemHtmlBody html={html} />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-4 py-3">
          <button
            type="button"
            onClick={restaurarPadrao}
            disabled={saving || loading}
            className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          >
            Restaurar padrão
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void salvar()}
              disabled={saving || loading}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Salvando…' : 'Salvar assinatura'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
