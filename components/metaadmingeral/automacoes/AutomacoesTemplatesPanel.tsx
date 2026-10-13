'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import {
  AutomacoesChannelBadge,
  AutomacoesConstructionBanner,
  AutomacoesInfoNote,
  AutomacoesPageHeader,
  AutomacoesPlaceholderTable,
  AutomacoesStatusBadge,
} from '@/components/metaadmingeral/automacoes/automacoesCenterUi';
import {
  categoryLabel,
  channelLabel,
  templateStatusLabel,
  templateStatusTone,
} from '@/lib/metaadmingeral/automationCenterLabels';
import { buildAutomationTemplatePreviewBody, getAutomationNameForTemplate } from '@/lib/metaadmingeral/automationCenterTemplates';
import { findDisallowedTemplateVariable } from '@/lib/metaadmingeral/renderAutomationTemplate';
import type { AutomationTemplate, AutomationTemplateStatus } from '@/types/automationCenter';

type Props = {
  user: User | null;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const TEMPLATE_STATUSES: AutomationTemplateStatus[] = ['draft', 'published', 'inactive', 'planned'];

function TemplateEditorModal({
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
  const [status, setStatus] = useState<AutomationTemplateStatus>(template.status);
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
          status,
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
      setTimeout(() => onClose(), 600);
    } catch (err) {
      setSaveState('error');
      setError(err instanceof Error ? err.message : 'Erro ao salvar template.');
    }
  }, [body, description, name, onClose, onSaved, status, template.id, user, validationError]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-editor-title"
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
            <p className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/45">Editor de template</p>
            <h3 id="template-editor-title" className="mt-1 text-lg font-semibold text-[#E8EDED]">
              {template.name}
            </h3>
            <p className="mt-1 text-xs font-mono text-[#E8EDED]/45">{template.id}</p>
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
          <div className="grid gap-4 sm:grid-cols-2">
            <ReadOnlyField label="Automação vinculada" value={getAutomationNameForTemplate(template.automationId)} />
            <ReadOnlyField label="ID da automação" value={template.automationId} mono />
            <ReadOnlyField label="Canal" value={channelLabel(template.channel)} />
            <ReadOnlyField label="Categoria" value={categoryLabel(template.category)} />
            <ReadOnlyField label="Versão atual" value={`v${template.version}`} />
          </div>

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
            <label className="block text-xs font-medium uppercase tracking-wide text-[#E8EDED]/45 mb-2">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AutomationTemplateStatus)}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-[#E8EDED] focus:outline-none focus:ring-2 focus:ring-[#4CCB7A]/50"
            >
              {TEMPLATE_STATUSES.map((item) => (
                <option key={item} value={item}>
                  {templateStatusLabel(item)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/45 mb-2">
              Variáveis disponíveis (somente leitura)
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
              Corpo do template
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
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
              Prévia em tempo real
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
              onClick={handleSave}
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

function ReadOnlyField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/45">{label}</p>
      <p className={`mt-1 text-sm text-[#E8EDED]/80 ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  );
}

export default function AutomacoesTemplatesPanel({ user }: Props) {
  const [templates, setTemplates] = useState<AutomationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null);

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

      setTemplates(data.templates);
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

  const handleRowClick = useCallback(
    (rowIndex: number) => {
      const template = templates[rowIndex];
      if (template) setSelectedTemplate(template);
    },
    [templates],
  );

  const handleClose = useCallback(() => setSelectedTemplate(null), []);

  const handleSaved = useCallback((saved: AutomationTemplate) => {
    setTemplates((prev) => {
      const index = prev.findIndex((item) => item.id === saved.id);
      if (index === -1) return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      const next = [...prev];
      next[index] = saved;
      return next;
    });
  }, []);

  return (
    <div className="space-y-6">
      <AutomacoesPageHeader
        title="Templates"
        subtitle="Modelos de mensagem por canal e categoria — versionamento global"
      />

      <AutomacoesConstructionBanner />

      <AutomacoesInfoNote>
        Biblioteca global editável pelo MetaAdminGeral ({templates.length} templates). Clique em uma linha para
        editar. Seeds em memória servem como fallback quando o Firestore está vazio. Envios reais ainda não usam
        estes templates.
      </AutomacoesInfoNote>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[#E8EDED]/60">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando templates…
        </div>
      ) : null}

      {loadError ? (
        <p className="flex items-center gap-2 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {loadError}
        </p>
      ) : null}

      {!loading && !loadError ? (
        <AutomacoesPlaceholderTable
          title="Biblioteca de templates"
          headers={[
            'Nome',
            'Automação vinculada',
            'Canal',
            'Categoria',
            'Variáveis',
            'Status',
            'Versão',
          ]}
          onRowClick={handleRowClick}
          rows={templates.map((item) => [
            <div key={`${item.id}-name`}>
              <span className="font-medium text-[#E8EDED]">{item.name}</span>
              <p className="mt-0.5 text-xs font-mono text-[#E8EDED]/45">{item.id}</p>
            </div>,
            getAutomationNameForTemplate(item.automationId),
            <AutomacoesChannelBadge key={`${item.id}-ch`} channel={channelLabel(item.channel)} />,
            categoryLabel(item.category),
            <span key={`${item.id}-vars`} className="text-xs text-[#E8EDED]/60 font-mono">
              {item.variables.map((v) => `{${v}}`).join(', ')}
            </span>,
            <AutomacoesStatusBadge
              key={`${item.id}-st`}
              label={templateStatusLabel(item.status)}
              tone={templateStatusTone(item.status)}
            />,
            <span key={`${item.id}-ver`} className="text-xs text-[#E8EDED]/70">
              v{item.version}
            </span>,
          ])}
        />
      ) : null}

      {selectedTemplate ? (
        <TemplateEditorModal
          template={selectedTemplate}
          user={user}
          onClose={handleClose}
          onSaved={handleSaved}
        />
      ) : null}
    </div>
  );
}
