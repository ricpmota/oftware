'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { AlertCircle, CheckCircle2, FileText, Loader2, Pencil, X } from 'lucide-react';
import { AutomacoesInfoNote, AutomacoesStatusBadge } from '@/components/metaadmingeral/automacoes/automacoesCenterUi';
import { buildAutomationTemplatePreviewBody } from '@/lib/metaadmingeral/automationCenterTemplates';
import { templateStatusLabel, templateStatusTone } from '@/lib/metaadmingeral/automationCenterLabels';
import { findDisallowedTemplateVariable } from '@/lib/metaadmingeral/renderAutomationTemplate';
import { CANAL_CHAT_TEMPLATE_AUTOMATION_IDS } from '@/lib/whatsapp/canalChatTemplates';
import type { AutomationTemplate } from '@/types/automationCenter';

type Props = {
  user: User | null;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const ORDER = [...CANAL_CHAT_TEMPLATE_AUTOMATION_IDS];

function CanalChatTemplateEditor({
  template,
  user,
  onClose,
  onSaved,
}: {
  template: AutomationTemplate;
  user: User | null;
  onClose: () => void;
  onSaved: (template: AutomationTemplate) => void;
}) {
  const [name, setName] = useState(template.name);
  const [description, setDescription] = useState(template.description);
  const [body, setBody] = useState(template.body);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);

  const validationError = useMemo(
    () => findDisallowedTemplateVariable(body, template.variables),
    [body, template.variables],
  );

  const previewBody = useMemo(
    () => buildAutomationTemplatePreviewBody(body, template.variables),
    [body, template.variables],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && saveState !== 'saving') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, saveState]);

  const handleSave = useCallback(async () => {
    if (!user) {
      setError('Faça login para salvar alterações.');
      setSaveState('error');
      return;
    }
    if (validationError) {
      setError(validationError);
      setSaveState('error');
      return;
    }

    setSaveState('saving');
    setError(null);

    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmingeral/automacoes/templates', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: template.id,
          name: name.trim(),
          description: description.trim(),
          status: 'published',
          body,
        }),
      });

      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        template?: AutomationTemplate;
      } | null;

      if (!res.ok || !data?.ok || !data.template) {
        throw new Error(data?.error ?? 'Não foi possível salvar o template.');
      }

      setSaveState('saved');
      onSaved(data.template);
      setTimeout(() => onClose(), 500);
    } catch (err) {
      setSaveState('error');
      setError(err instanceof Error ? err.message : 'Erro ao salvar template.');
    }
  }, [body, description, name, onClose, onSaved, template.id, user, validationError]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (saveState !== 'saving') onClose();
      }}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1419] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/45">
              Template Canal Chat
            </p>
            <h3 className="mt-1 text-lg font-semibold text-[#E8EDED]">{template.name}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saveState === 'saving'}
            className="shrink-0 rounded-lg p-2 text-[#E8EDED]/60 hover:bg-white/10 hover:text-[#E8EDED] transition-colors disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-[#E8EDED]/45 mb-2">
              Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-[#E8EDED] focus:outline-none focus:ring-2 focus:ring-[#4CCB7A]/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-[#E8EDED]/45 mb-2">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-[#E8EDED] focus:outline-none focus:ring-2 focus:ring-[#4CCB7A]/50"
            />
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/45 mb-2">
              Variáveis
            </p>
            <div className="flex flex-wrap gap-2">
              {template.variables.map((variable) => (
                <code
                  key={variable}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-mono text-[#4CCB7A]/90"
                >
                  {`{${variable}}`}
                </code>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium uppercase tracking-wide text-[#E8EDED]/45 mb-2">
              Corpo da mensagem
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className={`w-full rounded-xl border bg-black/30 px-3 py-2 text-sm font-mono text-[#E8EDED]/90 leading-relaxed focus:outline-none focus:ring-2 ${
                validationError
                  ? 'border-red-400/60 focus:ring-red-400/40'
                  : 'border-white/10 focus:ring-[#4CCB7A]/50'
              }`}
            />
            {validationError ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {validationError}
              </p>
            ) : null}
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/45 mb-2">
              Prévia
            </p>
            <pre className="whitespace-pre-wrap rounded-xl border border-[#4CCB7A]/20 bg-[#4CCB7A]/5 px-4 py-3 text-sm text-[#E8EDED]/90 leading-relaxed">
              {previewBody}
            </pre>
          </div>

          {error && saveState === 'error' ? (
            <p className="flex items-center gap-2 text-sm text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/10 pt-4">
            {saveState === 'saved' ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-[#4CCB7A]">
                <CheckCircle2 className="h-4 w-4" />
                Salvo
              </span>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              disabled={saveState === 'saving'}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-[#E8EDED]/80 hover:bg-white/5 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saveState === 'saving' || !!validationError || !name.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#4CCB7A] px-4 py-2 text-sm font-medium text-[#0f1419] hover:bg-[#3db86a] disabled:opacity-50"
            >
              {saveState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CanalChatTemplatesSection({ user }: Props) {
  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AutomationTemplate | null>(null);

  const loadTemplates = useCallback(async () => {
    if (!user) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmingeral/automacoes/templates', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        templates?: AutomationTemplate[];
      } | null;

      if (!res.ok || !data?.ok || !data.templates) {
        throw new Error(data?.error ?? 'Não foi possível carregar os templates.');
      }

      const filtered = data.templates
        .filter((item) => ORDER.includes(item.automationId as (typeof ORDER)[number]))
        .sort(
          (a, b) =>
            ORDER.indexOf(a.automationId as (typeof ORDER)[number]) -
            ORDER.indexOf(b.automationId as (typeof ORDER)[number]),
        );

      setTemplates(filtered);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erro ao carregar templates.');
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-[#E8EDED]">Templates do Canal Chat</h3>
        <p className="mt-1 text-sm text-[#E8EDED]/60">
          Textos enviados pelo Canal Chat: cobranças, boas-vindas, confirmação e lembretes de consulta,
          e aviso de nova solicitação ao médico. O médico também pode personalizar a saudação e as
          mensagens de reunião no painel WhatsApp → Automações.
        </p>
      </div>

      <AutomacoesInfoNote>
        <p>
          Variáveis comuns: <code className="font-mono text-[#4CCB7A]">{'{nome}'}</code>,{' '}
          <code className="font-mono text-[#4CCB7A]">{'{medico}'}</code>,{' '}
          <code className="font-mono text-[#4CCB7A]">{'{horario}'}</code>. Nas cobranças também há{' '}
          <code className="font-mono text-[#4CCB7A]">{'{valor}'}</code>
          {'. '}
          Na confirmação de consulta: <code className="font-mono text-[#4CCB7A]">{'{data}'}</code>,{' '}
          <code className="font-mono text-[#4CCB7A]">{'{horario_inicio}'}</code>. Sem link de relatório.
        </p>
      </AutomacoesInfoNote>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[#E8EDED]/60">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando templates…
        </div>
      ) : loadError ? (
        <p className="flex items-center gap-2 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {loadError}
        </p>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="mt-0.5 rounded-lg bg-[#4CCB7A]/15 p-2 text-[#4CCB7A]">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-[#E8EDED]">{template.name}</p>
                    <AutomacoesStatusBadge
                      label={templateStatusLabel(template.status)}
                      tone={templateStatusTone(template.status)}
                    />
                  </div>
                  <p className="mt-1 text-xs text-[#E8EDED]/55">{template.description}</p>
                  <p className="mt-1 text-[11px] font-mono text-[#E8EDED]/35">{template.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(template)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-[#E8EDED] hover:bg-white/10"
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar texto
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && user ? (
        <CanalChatTemplateEditor
          template={selected}
          user={user}
          onClose={() => setSelected(null)}
          onSaved={(saved) => {
            setTemplates((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
          }}
        />
      ) : null}
    </div>
  );
}
