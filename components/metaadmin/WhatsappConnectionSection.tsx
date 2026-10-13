'use client';

/**
 * Central de Comunicação do médico (aba WhatsApp).
 * Sub-abas: Conexão · Automações · Logs.
 * A aba Conexão trata apenas do vínculo do WhatsApp — nenhuma configuração de envio.
 *
 * Props opcionais `apiBasePath` / `conexaoOnly` permitem reutilizar a mesma UI
 * em metanutri/metapersonal sem alterar o fluxo do metaadmin.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MessageCircle,
  RefreshCw,
  WifiOff,
  Workflow,
} from 'lucide-react';
import type { WhatsappConnectionDto, WhatsappConnectionStatus } from '@/types/whatsappConnection';
import WhatsappMessageLogPanel from '@/components/metaadmin/WhatsappMessageLogPanel';
import MetaAdminDoctorAutomationsPanel, {
  PROFESSIONAL_AUTOMATION_SUMMARIES,
} from '@/components/metaadmin/MetaAdminDoctorAutomationsPanel';

const POLL_INTERVAL_MS = 5_000;
const DEFAULT_AUTO_HORARIO = '08:00';

type WhatsappSubAba = 'conexao' | 'automacoes' | 'logs';

type Props = {
  medicoId?: string | null;
  disabled?: boolean;
  getAuthToken: () => Promise<string | null>;
  onNotify?: (message: string) => void;
  /** Base das rotas WhatsApp. Default: metaadmin (não alterar o fluxo médico). */
  apiBasePath?: string;
  /**
   * Endpoint GET/PUT das automações.
   * Default: derivado de apiBasePath (metaadmin → doctor-settings; nutri/personal → automacoes/settings).
   */
  automationsApiPath?: string;
  /** Só a aba Conexão — sem Automações/Logs. */
  conexaoOnly?: boolean;
  /** Texto quando o perfil ainda não carregou. */
  profileMissingMessage?: string;
  /** Resumos dos cards de automação (MetaNutri / MetaPersonal). */
  automationSummaries?: Record<string, string>;
};

function resolveAutomationsApiPath(whatsappBase: string, override?: string): string {
  if (override?.trim()) return override.replace(/\/$/, '');
  if (whatsappBase.includes('/metanutri/')) return '/api/metanutri/automacoes/settings';
  if (whatsappBase.includes('/metapersonal/')) return '/api/metapersonal/automacoes/settings';
  return '/api/metaadmin/automacoes/doctor-settings';
}

function formatDateTime(iso?: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusBadgeLabel(status: WhatsappConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'WhatsApp conectado';
    case 'qr_pending':
      return 'Aguardando leitura do QR Code';
    case 'error':
      return 'Erro na conexão';
    default:
      return 'Não conectado';
  }
}

export default function WhatsappConnectionSection({
  medicoId,
  disabled,
  getAuthToken,
  onNotify,
  apiBasePath = '/api/metaadmin/whatsapp',
  automationsApiPath,
  conexaoOnly = false,
  profileMissingMessage = 'Perfil médico não carregado. Recarregue a página e tente novamente.',
  automationSummaries,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [connection, setConnection] = useState<WhatsappConnectionDto | null>(null);
  const [status, setStatus] = useState<WhatsappConnectionStatus>('disconnected');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [autoHorario, setAutoHorario] = useState(DEFAULT_AUTO_HORARIO);
  const [subAba, setSubAba] = useState<WhatsappSubAba>('conexao');
  const [logRefreshKey, setLogRefreshKey] = useState(0);
  const [resendModalOpen, setResendModalOpen] = useState(false);
  const [unsentTodayCount, setUnsentTodayCount] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [sharedWithMedico, setSharedWithMedico] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resendPromptShownRef = useRef(false);
  const basePath = apiBasePath.replace(/\/$/, '');
  const settingsPath = resolveAutomationsApiPath(basePath, automationsApiPath);

  const apiFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      const token = await getAuthToken();
      if (!token) throw new Error('Sessão expirada. Faça login novamente.');

      const res = await fetch(path, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(init?.headers ?? {}),
        },
      });

      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        status?: WhatsappConnectionStatus;
        connection?: WhatsappConnectionDto | null;
        qrCode?: string;
        justConnected?: boolean;
        unsentTodayCount?: number;
        sharedWithMedico?: boolean;
      } | null;

      if (!res.ok || data?.ok === false) {
        const statusHint = res.status ? ` (HTTP ${res.status})` : '';
        throw new Error((data?.error ?? 'Não foi possível completar a operação.') + statusHint);
      }

      return data;
    },
    [getAuthToken],
  );

  const loadStatus = useCallback(
    async (silent = false) => {
      if (!medicoId) return;
      if (!silent) setLoading(true);
      setFetchError(null);

      try {
        const data = await apiFetch(`${basePath}/status`, { method: 'GET' });
        let nextStatus = data?.status ?? data?.connection?.status ?? 'disconnected';
        // Evita flicker: CLOSED transitório do WPP não deve derrubar a tela do QR.
        setStatus((prev) => {
          if (prev === 'qr_pending' && nextStatus === 'disconnected') {
            nextStatus = 'qr_pending';
            return prev;
          }
          return nextStatus;
        });
        setConnection((prev) => {
          const incoming = data?.connection ?? null;
          if (!incoming) return prev?.status === 'qr_pending' ? prev : null;
          if (prev?.status === 'qr_pending' && incoming.status === 'disconnected') {
            return {
              ...incoming,
              status: 'qr_pending',
              qrCode: incoming.qrCode ?? prev.qrCode,
            };
          }
          return incoming;
        });
        setSharedWithMedico(data?.sharedWithMedico === true);
        setAutoHorario(data?.connection?.autoAplicacaoHorario ?? DEFAULT_AUTO_HORARIO);
        if (!silent) setLogRefreshKey((k) => k + 1);

        const count = data?.unsentTodayCount ?? 0;
        if (!conexaoOnly && data?.justConnected && count > 0 && !resendPromptShownRef.current) {
          resendPromptShownRef.current = true;
          setUnsentTodayCount(count);
          setResendModalOpen(true);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao carregar status do WhatsApp.';
        setFetchError(message);
        setStatus((prev) => (prev === 'qr_pending' ? prev : 'error'));
        if (!silent) onNotify?.(message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [apiFetch, basePath, conexaoOnly, medicoId, onNotify],
  );

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (status === 'qr_pending' && medicoId) {
      pollRef.current = setInterval(() => {
        void loadStatus(true);
      }, POLL_INTERVAL_MS);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status, medicoId, loadStatus]);

  const handleConnect = useCallback(async () => {
    if (!medicoId || disabled) return;
    setActionLoading(true);
    setFetchError(null);
    resendPromptShownRef.current = false;
    // Feedback imediato — start-session encerra sessão antiga e gera QR novo.
    setStatus('qr_pending');
    setConnection((prev) =>
      prev
        ? {
            ...prev,
            status: 'qr_pending',
            qrCode: undefined,
            phone: undefined,
            profileName: undefined,
            errorMessage: undefined,
          }
        : null,
    );

    try {
      const data = await apiFetch(`${basePath}/start-session`, { method: 'POST' });
      const rawStatus = data?.status ?? data?.connection?.status ?? 'qr_pending';
      const nextStatus =
        rawStatus === 'connected'
          ? 'connected'
          : rawStatus === 'error'
            ? 'error'
            : 'qr_pending';
      setStatus(nextStatus);
      setSharedWithMedico(data?.sharedWithMedico === true);
      setConnection(
        data?.connection
          ? {
              ...data.connection,
              status: nextStatus,
            }
          : null,
      );
      onNotify?.(
        data?.connection?.qrCode || data?.qrCode
          ? 'QR Code gerado. Escaneie com o WhatsApp.'
          : nextStatus === 'connected'
            ? 'WhatsApp conectado.'
            : 'Gerando QR Code… escaneie quando aparecer.',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao conectar WhatsApp.';
      const isGatewayTimeout = /504|tempo esgotado|timeout/i.test(message);
      // 504: o WPP pode ter iniciado mesmo assim — mantém tela de QR e faz poll.
      if (isGatewayTimeout) {
        setStatus('qr_pending');
        setFetchError(null);
        onNotify?.('Aguardando QR Code… Continaremos verificando automaticamente.');
        void loadStatus(true);
      } else {
        setFetchError(message);
        setStatus('error');
        onNotify?.(message);
      }
    } finally {
      setActionLoading(false);
    }
  }, [apiFetch, basePath, disabled, loadStatus, medicoId, onNotify]);

  const handleDisconnect = useCallback(async () => {
    if (!medicoId || disabled) return;
    setActionLoading(true);
    setFetchError(null);
    resendPromptShownRef.current = false;

    try {
      const data = await apiFetch(`${basePath}/disconnect`, { method: 'POST' });
      setStatus('disconnected');
      setConnection(data?.connection ?? null);
      setSharedWithMedico(data?.sharedWithMedico === true);
      const warning =
        typeof (data as { warning?: string })?.warning === 'string'
          ? (data as { warning: string }).warning
          : null;
      const message =
        typeof (data as { message?: string })?.message === 'string'
          ? (data as { message: string }).message
          : 'WhatsApp desconectado. Use Conectar para gerar um novo QR Code.';
      onNotify?.(warning || message);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao desconectar WhatsApp.';
      setFetchError(message);
      onNotify?.(message);
    } finally {
      setActionLoading(false);
    }
  }, [apiFetch, basePath, disabled, medicoId, onNotify]);

  const handleResendToday = useCallback(async () => {
    setResendLoading(true);
    try {
      const data = await apiFetch(`${basePath}/reactivate-today`, { method: 'POST' });
      const total = (data as { total?: number })?.total ?? 0;
      setResendModalOpen(false);
      onNotify?.(
        total > 0
          ? `${total} mensagem(ns) de hoje reativada(s). O envio automático retoma em instantes.`
          : 'Nenhuma mensagem pendente de hoje para reenviar.',
      );
      setLogRefreshKey((k) => k + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao reativar envios de hoje.';
      onNotify?.(message);
    } finally {
      setResendLoading(false);
    }
  }, [apiFetch, basePath, onNotify]);

  const effectiveStatus: WhatsappConnectionStatus =
    fetchError && status !== 'qr_pending' && status !== 'connected' ? 'error' : status;

  const qrCodeSrc = connection?.qrCode;

  if (!medicoId) {
    return (
      <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 p-5 text-sm text-amber-900 dark:text-amber-200">
        {profileMissingMessage}
      </div>
    );
  }

  const connectionCard = loading ? (
    <div className="flex items-center justify-center py-20 text-gray-500">
      <Loader2 className="h-9 w-9 animate-spin text-emerald-600" />
    </div>
  ) : effectiveStatus === 'disconnected' ? (
    <div className="flex flex-col h-full justify-between gap-6">
      <div className="space-y-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
          <MessageCircle className="h-6 w-6" />
        </div>
        <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          Vincule o WhatsApp do consultório para habilitar as comunicações com seus pacientes. Não há
          leitura de conversas — apenas envio de mensagens autorizadas.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void handleConnect()}
        disabled={disabled || actionLoading}
        className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
        Conectar WhatsApp
      </button>
    </div>
  ) : effectiveStatus === 'qr_pending' ? (
    <div className="space-y-5">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Abra o WhatsApp no celular → <strong>Aparelhos conectados</strong> → <strong>Conectar aparelho</strong> e
        escaneie o código.
      </p>
      <div className="flex justify-center">
        {qrCodeSrc ? (
          <div className="rounded-2xl bg-white p-5 shadow-lg shadow-gray-200/60 dark:shadow-none border border-gray-100 dark:border-gray-700">
            <img src={qrCodeSrc} alt="QR Code para conectar WhatsApp" className="h-56 w-56 sm:h-64 sm:w-64 object-contain" />
          </div>
        ) : (
          <div className="h-56 w-56 sm:h-64 sm:w-64 rounded-2xl bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-600 flex flex-col items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            Gerando QR Code...
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleDisconnect()}
          disabled={disabled || actionLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60 transition-colors"
        >
          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => void loadStatus(true)}
          disabled={disabled || actionLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </button>
      </div>
    </div>
  ) : effectiveStatus === 'connected' ? (
    <div className="flex flex-col h-full justify-between gap-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          WhatsApp conectado e pronto para enviar as comunicações.
        </div>
        {(connection?.phone || connection?.profileName) && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {connection.phone ? connection.phone : ''}
            {connection.profileName ? `${connection.phone ? ' · ' : ''}${connection.profileName}` : ''}
          </p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Ao desconectar, o vínculo é encerrado. Use Conectar depois para gerar um novo QR Code.
        </p>
      </div>
      <button
        type="button"
        onClick={() => void handleDisconnect()}
        disabled={disabled || actionLoading}
        className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-5 py-2.5 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 text-sm font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WifiOff className="h-4 w-4" />}
        Desconectar
      </button>
    </div>
  ) : (
    <div className="space-y-4">
      <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
        {connection?.errorMessage ??
          fetchError ??
          'Não foi possível conectar o WhatsApp. Verifique sua conexão e tente novamente.'}
      </p>
      <button
        type="button"
        onClick={() => void handleConnect()}
        disabled={disabled || actionLoading}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-60 transition-colors"
      >
        {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
        Conectar
      </button>
    </div>
  );

  const tabButtonClass = (active: boolean) =>
    `inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
      active
        ? 'bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-400 shadow-sm'
        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
    }`;

  return (
    <div className="w-full space-y-6">
      {resendModalOpen && !conexaoOnly ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-labelledby="whatsapp-resend-title"
            className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-xl p-6 space-y-4"
          >
            <h3 id="whatsapp-resend-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              Reenviar mensagens de hoje?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Encontramos <strong>{unsentTodayCount}</strong> mensagem(ns) de hoje que não foram enviadas
              enquanto o WhatsApp estava desconectado. Deseja reativá-las agora?
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Apenas o dia de hoje será considerado — dias anteriores não serão reenviados.
            </p>
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                onClick={() => setResendModalOpen(false)}
                disabled={resendLoading}
                className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
              >
                Agora não
              </button>
              <button
                type="button"
                onClick={() => void handleResendToday()}
                disabled={resendLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {resendLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Sim, reenviar de hoje
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {/* Hero compacto — resumo rápido do status */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-3 sm:px-5 sm:py-3.5 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-semibold">
                {effectiveStatus === 'connected' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
                {effectiveStatus === 'qr_pending' && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
                {effectiveStatus === 'error' && <AlertCircle className="h-4 w-4 shrink-0" />}
                {effectiveStatus === 'disconnected' && <WifiOff className="h-4 w-4 shrink-0" />}
                {statusBadgeLabel(effectiveStatus)}
              </div>
              {effectiveStatus === 'connected' && (
                <p className="mt-0.5 text-xs text-emerald-50/90 truncate">
                  {connection?.phone ? connection.phone : ''}
                  {connection?.profileName ? ` · ${connection.profileName}` : ''}
                  {formatDateTime(connection?.lastCheckAt)
                    ? ` · Sincronizado ${formatDateTime(connection?.lastCheckAt)}`
                    : ''}
                </p>
              )}
            </div>
          </div>
          {(effectiveStatus === 'connected' ||
            effectiveStatus === 'error' ||
            effectiveStatus === 'disconnected') && (
            <div className="flex gap-2 shrink-0">
              {effectiveStatus === 'disconnected' || effectiveStatus === 'error' ? (
                <button
                  type="button"
                  onClick={() => void handleConnect()}
                  disabled={disabled || actionLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-semibold disabled:opacity-60 transition-colors"
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                  Conectar
                </button>
              ) : null}
              {effectiveStatus === 'connected' ? (
                <button
                  type="button"
                  onClick={() => void handleDisconnect()}
                  disabled={disabled || actionLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-red-500/30 px-3 py-1.5 text-xs font-medium disabled:opacity-60 transition-colors"
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <WifiOff className="h-3.5 w-3.5" />}
                  Desconectar
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {sharedWithMedico ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Este WhatsApp é o mesmo da sua conta de médico no Meta Admin — não é necessário conectar outro
          número. Desconectar aqui também desconecta no Meta Admin.
        </div>
      ) : null}

      {/* Sub-abas — no metaadmin; nutri/personal ficam só na conexão */}
      {!conexaoOnly ? (
        <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700 w-full sm:w-auto sm:inline-flex">
          <button type="button" onClick={() => setSubAba('conexao')} className={tabButtonClass(subAba === 'conexao')}>
            <MessageCircle className="h-4 w-4" />
            Conexão
          </button>
          <button
            type="button"
            onClick={() => setSubAba('automacoes')}
            className={tabButtonClass(subAba === 'automacoes')}
          >
            <Workflow className="h-4 w-4" />
            Automações
          </button>
          <button type="button" onClick={() => setSubAba('logs')} className={tabButtonClass(subAba === 'logs')}>
            <ClipboardList className="h-4 w-4" />
            Logs
          </button>
        </div>
      ) : null}

      {!conexaoOnly && subAba === 'automacoes' ? (
        <MetaAdminDoctorAutomationsPanel
          disabled={disabled}
          getAuthToken={getAuthToken}
          onNotify={onNotify}
          inheritedHorario={autoHorario}
          connected={effectiveStatus === 'connected'}
          settingsApiPath={settingsPath}
          logsApiPath={`${basePath}/logs`}
          automationSummaries={
            automationSummaries ??
            (basePath.includes('/metanutri/') || basePath.includes('/metapersonal/')
              ? PROFESSIONAL_AUTOMATION_SUMMARIES
              : undefined)
          }
        />
      ) : !conexaoOnly && subAba === 'logs' ? (
        <WhatsappMessageLogPanel
          disabled={disabled}
          getAuthToken={getAuthToken}
          refreshKey={logRefreshKey}
          apiBasePath={basePath}
        />
      ) : (
        <>
          <div className="max-w-2xl">
            <div className="rounded-2xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-900/50 shadow-sm p-5 sm:p-6">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
                Conexão
              </h4>
              {connectionCard}
            </div>
          </div>

          {fetchError && effectiveStatus !== 'error' && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-4 py-3 text-sm text-red-800 dark:text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {fetchError}
            </div>
          )}
        </>
      )}
    </div>
  );
}
