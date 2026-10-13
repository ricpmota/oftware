'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Lock,
  MessageSquare,
  Pencil,
  Wifi,
  WifiOff,
  Workflow,
  X,
  Zap,
} from 'lucide-react';
import { buildAutomationTemplatePreviewBody } from '@/lib/metaadmingeral/automationCenterTemplates';
import { findDisallowedTemplateVariable } from '@/lib/metaadmingeral/renderAutomationTemplate';
import { CONSULTA_CONFIRMACAO_LEGACY_VARIABLE_NAMES } from '@/lib/metaadmin/agenda/consultaMessageTemplates';
import { CONSULTA_CONFIRMACAO_AUTOMATION_ID } from '@/lib/whatsapp/canalChatTemplates';
import type {
  DoctorAutomationItemDto,
  DoctorAutomationTemplateSummaryDto,
} from '@/types/automationCenter';

type Props = {
  disabled?: boolean;
  getAuthToken: () => Promise<string | null>;
  onNotify?: (message: string) => void;
  inheritedHorario?: string;
  connected?: boolean;
  /** Endpoint GET/PUT das automações. Default: médico. */
  settingsApiPath?: string;
  /** Endpoint GET de logs (último envio). Default: médico. */
  logsApiPath?: string;
  /** Resumos por automationId (sobrescreve os padrões do médico). */
  automationSummaries?: Record<string, string>;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const DEFAULT_HORARIO = '08:00';

/** Resumos objetivos por automação — linguagem médica (uso interno, chave não exibida). */
const AUTOMATION_SUMMARIES: Record<string, string> = {
  aplicacao_dia_whatsapp:
    'Envia automaticamente uma mensagem ao paciente no dia programado da aplicação (fila WhatsApp, igual D-1/atrasada).',
  aplicacao_d1_whatsapp: 'Lembra o paciente um dia antes da aplicação.',
  aplicacao_atrasada_whatsapp: 'Notifica quando uma aplicação prevista não foi registrada.',
  injetavel_dia_whatsapp:
    'Envia automaticamente uma mensagem no dia da aplicação de protocolo injetável.',
  injetavel_d1_whatsapp: 'Lembra o paciente um dia antes da aplicação de protocolo injetável.',
  conclusao_tratamento_whatsapp:
    'Envia uma mensagem ao término do tratamento para registrar o resultado.',
  boas_vindas_paciente_whatsapp:
    'Quando você aceita a solicitação, o Canal Chat envia boas-vindas ao paciente com seu nome e CRM, pedindo para salvar o contato. Este número é só para avisos do sistema.',
  consulta_confirmacao_whatsapp:
    'Ao aceitar a solicitação (ou quando o paciente já vinculado agenda), envia a confirmação do horário. Sai do seu WhatsApp; se estiver desconectado, o Canal Chat envia.',
  consulta_lembrete_paciente_whatsapp:
    '30 minutos antes da consulta, o Canal Chat lembra o paciente do horário.',
  consulta_lembrete_medico_whatsapp:
    '30 minutos antes da consulta, o Canal Chat avisa você no telefone do cadastro.',
  solicitacao_acompanhamento_whatsapp:
    'Quando o paciente pede acompanhamento (mesmo com cadastro incompleto), o Canal Chat avisa você com o link da página de pacientes.',
  parcela_vencimento_whatsapp: 'Lembra o paciente sobre uma parcela próxima do vencimento.',
  cobranca_automatica_whatsapp:
    'No dia do vencimento da parcela no calendário, envia cobrança ao paciente pelo Canal Chat com o valor. Sem link — o paciente deve contatar o médico para consultar o relatório.',
  aniversario_paciente_whatsapp: 'Envia uma mensagem de felicitação no aniversário do paciente.',
  nutri_checkin_semanal_whatsapp:
    'Envie automaticamente ao paciente o link do Check-in Semanal no dia e horário definido no acompanhamento nutricional.',
  calendario_lembrete_whatsapp:
    'Envia lembretes do calendário pelo Canal Chat para o telefone de aviso.',
  compartilhamento_aceite_whatsapp:
    'Avisa o paciente por WhatsApp quando ele aceita o compartilhamento junto com o médico.',
};

export const PROFESSIONAL_AUTOMATION_SUMMARIES: Record<string, string> = {
  aniversario_paciente_whatsapp: 'Envia uma mensagem de felicitação no aniversário do paciente.',
  nutri_checkin_semanal_whatsapp:
    'Envie automaticamente ao paciente o link do Check-in Semanal no dia e horário definido no acompanhamento nutricional.',
  cobranca_automatica_whatsapp:
    'No dia do vencimento da parcela, envia cobrança ao paciente pelo Canal Chat com o valor. Sem link — o paciente deve contatar o médico para consultar o relatório.',
};

const EVENT_HORARIO_HINTS: Record<string, string> = {
  boas_vindas_paciente_whatsapp:
    'Enviado quando você aceita a solicitação de acompanhamento.',
  consulta_confirmacao_whatsapp:
    'Enviado ao confirmar o horário (aceite ou novo agendamento do paciente já vinculado).',
  consulta_lembrete_paciente_whatsapp:
    'Enviado 30 minutos antes da consulta, pelo Canal Chat.',
  consulta_lembrete_medico_whatsapp:
    'Enviado 30 minutos antes da consulta, no seu telefone de cadastro.',
  solicitacao_acompanhamento_whatsapp:
    'Enviado quando o paciente solicita acompanhamento.',
};

function friendlyMessageName(name?: string): string {
  if (!name) return 'Mensagem padrão';
  return name.replace(/\s*[—–-]\s*v\d+\s*$/i, '').trim();
}

function formatDateShort(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatLastEnvio(iso?: string | null): string {
  if (!iso) return 'Nenhum envio realizado ainda.';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Nenhum envio realizado ainda.';
  const now = new Date();
  const hh = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (date.toDateString() === now.toDateString()) return `Hoje às ${hh}`;
  const d = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `${d} às ${hh}`;
}

function DoctorAutomationSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow mt-1 transition duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function TemplatePreviewModal({
  template,
  automationName,
  onClose,
}: {
  template: DoctorAutomationTemplateSummaryDto;
  automationName: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 dark:border-gray-700 px-5 py-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Mensagem · {automationName}
            </p>
            <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
              {friendlyMessageName(template.name)}
            </h3>
            {template.description ? (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{template.description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">Mensagem</p>
            <pre className="whitespace-pre-wrap rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 px-4 py-3 text-sm text-gray-700 dark:text-gray-200 leading-relaxed font-sans">
              {template.body}
            </pre>
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">
              Como o paciente recebe
            </p>
            <pre className="whitespace-pre-wrap rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-gray-800 dark:text-gray-100 leading-relaxed font-sans">
              {template.previewBody}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplateEditorModal({
  item,
  disabled,
  onClose,
  onSave,
}: {
  item: DoctorAutomationItemDto;
  disabled?: boolean;
  onClose: () => void;
  onSave: (templateBody: string) => Promise<void>;
}) {
  const template = item.template;
  const [body, setBody] = useState(template?.body ?? '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const displayVariables = template?.variables ?? [];
  const allowedVariables = useMemo(() => {
    if (item.automationId !== CONSULTA_CONFIRMACAO_AUTOMATION_ID) return displayVariables;
    return [...displayVariables, ...CONSULTA_CONFIRMACAO_LEGACY_VARIABLE_NAMES];
  }, [displayVariables, item.automationId]);

  const validationError = useMemo(
    () => (body.trim() ? findDisallowedTemplateVariable(body, allowedVariables) : null),
    [allowedVariables, body],
  );

  const previewBody = useMemo(
    () => buildAutomationTemplatePreviewBody(body, displayVariables),
    [body, displayVariables],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && saveState !== 'saving') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, saveState]);

  const handleSave = useCallback(async () => {
    if (disabled) return;
    if (validationError) {
      setError(validationError);
      setSaveState('error');
      return;
    }
    setSaveState('saving');
    setError(null);
    try {
      await onSave(body);
      setSaveState('saved');
      window.setTimeout(() => onClose(), 400);
    } catch (err) {
      setSaveState('error');
      setError(err instanceof Error ? err.message : 'Erro ao salvar a mensagem.');
    }
  }, [body, disabled, onClose, onSave, validationError]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={() => {
        if (saveState !== 'saving') onClose();
      }}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 dark:border-gray-700 px-5 py-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Editar mensagem · {item.name}
            </p>
            <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
              {friendlyMessageName(template?.name)}
            </h3>
            {template?.description ? (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{template.description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saveState === 'saving'}
            className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {displayVariables.length > 0 ? (
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">
                Variáveis
              </p>
              <div className="flex flex-wrap gap-2">
                {displayVariables.map((variable) => (
                  <code
                    key={variable}
                    className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2 py-1 text-xs font-mono text-emerald-700 dark:text-emerald-400"
                  >
                    {`{${variable}}`}
                  </code>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">
              Corpo da mensagem
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              disabled={disabled || saveState === 'saving'}
              className={`w-full rounded-xl border bg-white dark:bg-gray-800/60 px-3 py-2 text-sm font-mono text-gray-800 dark:text-gray-100 leading-relaxed focus:outline-none focus:ring-2 disabled:opacity-50 ${
                validationError
                  ? 'border-red-300 focus:ring-red-400/40'
                  : 'border-gray-200 dark:border-gray-700 focus:ring-emerald-500/40'
              }`}
            />
            {validationError ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {validationError}
              </p>
            ) : (
              <p className="mt-2 text-xs text-gray-400">
                Deixe em branco para voltar ao texto padrão da organização.
              </p>
            )}
          </div>

          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 mb-1.5">
              Como a mensagem chega
            </p>
            <pre className="whitespace-pre-wrap rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-gray-800 dark:text-gray-100 leading-relaxed font-sans">
              {previewBody}
            </pre>
          </div>

          {error && saveState === 'error' ? (
            <p className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-700 pt-4">
            {saveState === 'saved' ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Salvo
              </span>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              disabled={saveState === 'saving'}
              className="rounded-lg border border-gray-200 dark:border-gray-600 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={disabled || saveState === 'saving' || !!validationError}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saveState === 'saving' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar mensagem
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MetaAdminDoctorAutomationsPanel({
  disabled,
  getAuthToken,
  onNotify,
  inheritedHorario,
  connected,
  settingsApiPath = '/api/metaadmin/automacoes/doctor-settings',
  logsApiPath = '/api/metaadmin/whatsapp/logs',
  automationSummaries,
}: Props) {
  const summaries = { ...AUTOMATION_SUMMARIES, ...automationSummaries };
  const [loading, setLoading] = useState(true);
  const [automations, setAutomations] = useState<DoctorAutomationItemDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [previewCard, setPreviewCard] = useState<DoctorAutomationItemDto | null>(null);
  const [editCard, setEditCard] = useState<DoctorAutomationItemDto | null>(null);
  const [lastEnvioAt, setLastEnvioAt] = useState<string | null>(null);

  // Horário editado localmente por automação (override até salvar). Ausente = usa o
  // horário individual salvo (item.horario) ou o padrão herdado do sistema.
  const [horarioEdits, setHorarioEdits] = useState<Record<string, string>>({});
  const [horarioStates, setHorarioStates] = useState<Record<string, SaveState>>({});
  const [horarioErrors, setHorarioErrors] = useState<Record<string, string>>({});

  const resolveHorario = useCallback(
    (item: DoctorAutomationItemDto): string =>
      horarioEdits[item.automationId] ??
      item.horario ??
      inheritedHorario?.trim() ??
      DEFAULT_HORARIO,
    [horarioEdits, inheritedHorario],
  );

  const saveHorario = useCallback(
    async (item: DoctorAutomationItemDto, value: string) => {
      const automationId = item.automationId;
      const next = value.trim();
      if (!/^\d{2}:\d{2}$/.test(next)) {
        setHorarioErrors((prev) => ({ ...prev, [automationId]: 'Use HH:mm (ex.: 08:00).' }));
        setHorarioStates((prev) => ({ ...prev, [automationId]: 'error' }));
        return;
      }
      if (next === (item.horario ?? inheritedHorario?.trim() ?? DEFAULT_HORARIO)) {
        // Sem mudança efetiva — não persiste.
        return;
      }

      setHorarioStates((prev) => ({ ...prev, [automationId]: 'saving' }));
      setHorarioErrors((prev) => {
        const copy = { ...prev };
        delete copy[automationId];
        return copy;
      });

      try {
        const token = await getAuthToken();
        if (!token) throw new Error('Sessão expirada. Faça login novamente.');

        const res = await fetch(settingsApiPath, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ automationId, horario: next }),
        });

        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          automations?: DoctorAutomationItemDto[];
        } | null;

        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error ?? 'Não foi possível salvar o horário.');
        }

        setAutomations(data?.automations ?? []);
        // Limpa o override para exibir o valor normalizado retornado pelo servidor.
        setHorarioEdits((prev) => {
          const copy = { ...prev };
          delete copy[automationId];
          return copy;
        });
        setHorarioStates((prev) => ({ ...prev, [automationId]: 'saved' }));
        window.setTimeout(() => {
          setHorarioStates((prev) =>
            prev[automationId] === 'saved' ? { ...prev, [automationId]: 'idle' } : prev,
          );
        }, 2000);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao salvar o horário.';
        setHorarioStates((prev) => ({ ...prev, [automationId]: 'error' }));
        setHorarioErrors((prev) => ({ ...prev, [automationId]: message }));
      }
    },
    [getAuthToken, inheritedHorario, settingsApiPath],
  );

  const saveTemplateBody = useCallback(
    async (item: DoctorAutomationItemDto, templateBody: string) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Sessão expirada. Faça login novamente.');

      const res = await fetch(settingsApiPath, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ automationId: item.automationId, templateBody }),
      });

      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        automations?: DoctorAutomationItemDto[];
      } | null;

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error ?? 'Não foi possível salvar a mensagem.');
      }

      setAutomations(data?.automations ?? []);
    },
    [getAuthToken, settingsApiPath],
  );

  const loadAutomations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const token = await getAuthToken();
      if (!token) throw new Error('Sessão expirada. Faça login novamente.');

      const [automationsRes, logsRes] = await Promise.all([
        fetch(settingsApiPath, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${logsApiPath}?limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null),
      ]);

      const data = (await automationsRes.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        automations?: DoctorAutomationItemDto[];
      } | null;

      if (!automationsRes.ok || data?.ok === false) {
        throw new Error(data?.error ?? 'Não foi possível carregar as automações.');
      }

      setAutomations(data?.automations ?? []);

      if (logsRes && logsRes.ok) {
        const logsData = (await logsRes.json().catch(() => null)) as {
          logs?: { type?: string; sentAt?: string }[];
        } | null;
        const lastReal = logsData?.logs?.find((log) => log.type !== 'test');
        setLastEnvioAt(lastReal?.sentAt ?? null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar automações.';
      setError(message);
      setAutomations([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthToken, settingsApiPath, logsApiPath]);

  useEffect(() => {
    void loadAutomations();
  }, [loadAutomations]);

  const handleToggle = useCallback(
    async (item: DoctorAutomationItemDto, enabled: boolean) => {
      const automationId = item.automationId;
      setSaveStates((prev) => ({ ...prev, [automationId]: 'saving' }));
      setSaveErrors((prev) => {
        const next = { ...prev };
        delete next[automationId];
        return next;
      });

      try {
        const token = await getAuthToken();
        if (!token) throw new Error('Sessão expirada. Faça login novamente.');

        const res = await fetch(settingsApiPath, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ automationId, enabled }),
        });

        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          automations?: DoctorAutomationItemDto[];
        } | null;

        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error ?? 'Não foi possível salvar.');
        }

        setAutomations(data?.automations ?? []);
        setSaveStates((prev) => ({ ...prev, [automationId]: 'saved' }));
        window.setTimeout(() => {
          setSaveStates((prev) =>
            prev[automationId] === 'saved' ? { ...prev, [automationId]: 'idle' } : prev,
          );
        }, 2000);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao salvar.';
        setSaveStates((prev) => ({ ...prev, [automationId]: 'error' }));
        setSaveErrors((prev) => ({ ...prev, [automationId]: message }));
        onNotify?.(message);
      }
    },
    [getAuthToken, onNotify, settingsApiPath],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-200">
        {error}
      </div>
    );
  }

  const disponiveis = automations.filter((item) => item.organizationReleased).length;
  const ativas = automations.filter((item) => item.enabledByDoctor).length;

  return (
    <div className="space-y-5">
      {/* Resumo superior */}
      <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-900/50 shadow-sm p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Workflow className="h-4 w-4 text-emerald-600" />
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Automações</h4>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-gray-50/70 dark:bg-gray-800/40 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              {connected ? (
                <Wifi className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-gray-400" />
              )}
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">WhatsApp</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
              {connected ? 'Conectado' : 'Não conectado'}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50/70 dark:bg-gray-800/40 px-3 py-2.5">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Disponíveis</span>
            <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
              {disponiveis} {disponiveis === 1 ? 'automação' : 'automações'}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50/70 dark:bg-gray-800/40 px-3 py-2.5">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Ativas</span>
            <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
              {ativas} {ativas === 1 ? 'automação' : 'automações'}
            </p>
          </div>
          <div className="rounded-xl bg-gray-50/70 dark:bg-gray-800/40 px-3 py-2.5">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">Último envio</span>
            <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-gray-100">
              {formatLastEnvio(lastEnvioAt)}
            </p>
          </div>
        </div>
      </div>

      {automations.length === 0 ? (
        <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-900/50 px-6 py-14 text-center">
          <Workflow className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Nenhuma automação disponível para você ainda
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Assim que houver comunicações liberadas, elas aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {automations.map((item) => {
            const saveState = saveStates[item.automationId] ?? 'idle';
            const horarioState = horarioStates[item.automationId] ?? 'idle';
            const released = item.organizationReleased === true;
            const switchDisabled = disabled || !released || saveState === 'saving';
            const criadoEm = formatDateShort(item.createdAt);
            const resumo = summaries[item.automationId] ?? item.description;
            const canEditTemplate = item.horarioFromEvent === true && Boolean(item.template);

            return (
              <div
                key={item.automationId}
                className={`rounded-2xl border bg-white dark:bg-gray-900/50 shadow-sm p-5 space-y-4 ${
                  released
                    ? 'border-gray-200/80 dark:border-gray-700'
                    : 'border-gray-200/60 dark:border-gray-800'
                }`}
              >
                {/* Cabeçalho: título + resumo + switch */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-emerald-600 shrink-0" />
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {item.name}
                      </h4>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{resumo}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <DoctorAutomationSwitch
                      checked={item.enabledByDoctor}
                      disabled={switchDisabled}
                      onChange={(enabled) => void handleToggle(item, enabled)}
                    />
                    <span className="text-[10px] font-medium text-gray-400">
                      {item.enabledByDoctor ? 'Automação ativa' : 'Ativar automação'}
                    </span>
                  </div>
                </div>

                {/* Disponibilidade */}
                {released ? (
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Disponível para uso
                  </div>
                ) : (
                  <div className="flex items-start gap-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700 px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                    <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    Esta automação está desabilitada pela organização.
                  </div>
                )}

                {/* Mensagem + Horário */}
                <div className={`grid gap-3 ${item.horarioFromPatientSchedule ? '' : 'sm:grid-cols-2'}`}>
                  <div className="rounded-xl border border-gray-200/80 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 px-3 py-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Mensagem
                    </p>
                    {item.template ? (
                      <>
                        <p className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                          {friendlyMessageName(item.template.name)}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <button
                            type="button"
                            onClick={() => setPreviewCard(item)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Visualizar
                          </button>
                          {canEditTemplate ? (
                            <button
                              type="button"
                              onClick={() => setEditCard(item)}
                              disabled={disabled || !released}
                              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline disabled:opacity-40 disabled:no-underline"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar mensagem
                            </button>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <p className="mt-1 text-sm text-gray-400">Sem mensagem definida</p>
                    )}
                  </div>

                  {item.horarioFromPatientSchedule ? (
                    <div className="rounded-xl border border-gray-200/80 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 px-3 py-2.5">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Horário de envio
                      </p>
                      <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                        Os envios serão realizados no dia e horário configurados no Check-in Semanal de cada
                        paciente.
                      </p>
                    </div>
                  ) : item.horarioFromEvent ? (
                    <div className="rounded-xl border border-gray-200/80 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 px-3 py-2.5">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Quando envia
                      </p>
                      <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                        {EVENT_HORARIO_HINTS[item.automationId] ??
                          'Disparo por evento — não usa horário diário.'}
                      </p>
                    </div>
                  ) : (
                  <div className="rounded-xl border border-gray-200/80 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 px-3 py-2.5">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Horário de envio (Brasília)
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="time"
                        value={resolveHorario(item)}
                        onChange={(e) =>
                          setHorarioEdits((prev) => ({
                            ...prev,
                            [item.automationId]: e.target.value,
                          }))
                        }
                        onBlur={(e) => void saveHorario(item, e.target.value)}
                        disabled={disabled || !released || horarioState === 'saving'}
                        className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900/80 px-2.5 py-1.5 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      {horarioState === 'saving' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                      ) : horarioState === 'saved' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      ) : null}
                    </div>
                    <span className="mt-1 inline-block text-[10px] text-gray-400">
                      Horário exclusivo desta automação
                    </span>
                    {horarioErrors[item.automationId] ? (
                      <p className="mt-1 text-[10px] text-red-500">
                        {horarioErrors[item.automationId]}
                      </p>
                    ) : null}
                  </div>
                  )}
                </div>

                {/* Rodapé */}
                <div className="flex items-center justify-between gap-3 pt-1 min-h-[20px]">
                  <div className="text-[11px] text-gray-400">
                    {criadoEm ? <span>Ativada em {criadoEm}</span> : <span>Ainda não ativada</span>}
                  </div>
                  <div>
                    {saveState === 'saving' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Salvando
                      </span>
                    ) : null}
                    {saveState === 'saved' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Salvo
                      </span>
                    ) : null}
                    {saveState === 'error' ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                        <AlertCircle className="h-3.5 w-3.5" />
                        {saveErrors[item.automationId]}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {previewCard?.template ? (
        <TemplatePreviewModal
          template={previewCard.template}
          automationName={previewCard.name}
          onClose={() => setPreviewCard(null)}
        />
      ) : null}

      {editCard?.template ? (
        <TemplateEditorModal
          item={editCard}
          disabled={disabled}
          onClose={() => setEditCard(null)}
          onSave={(templateBody) => saveTemplateBody(editCard, templateBody)}
        />
      ) : null}
    </div>
  );
}
