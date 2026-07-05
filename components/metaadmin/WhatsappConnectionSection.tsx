'use client';

/**
 * Aba WhatsApp no perfil do médico — Etapa 1.
 * Apenas conexão via QR Code e persistência de status.
 * Não envia mensagens, não sincroniza conversas, contatos ou CRM.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MessageCircle,
  Phone,
  RefreshCw,
  User,
  WifiOff,
} from 'lucide-react';
import type { WhatsappConnectionDto, WhatsappConnectionStatus } from '@/types/whatsappConnection';

const POLL_INTERVAL_MS = 7_000;

type Props = {
  medicoId?: string | null;
  disabled?: boolean;
  getAuthToken: () => Promise<string | null>;
  onNotify?: (message: string) => void;
};

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

function statusBadgeClass(status: WhatsappConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'bg-emerald-100 text-emerald-800 ring-emerald-200';
    case 'qr_pending':
      return 'bg-amber-100 text-amber-800 ring-amber-200';
    case 'error':
      return 'bg-red-100 text-red-800 ring-red-200';
    default:
      return 'bg-gray-100 text-gray-700 ring-gray-200';
  }
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
}: Props) {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [connection, setConnection] = useState<WhatsappConnectionDto | null>(null);
  const [status, setStatus] = useState<WhatsappConnectionStatus>('disconnected');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      } | null;

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error ?? 'Não foi possível completar a operação.');
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
        const data = await apiFetch('/api/metaadmin/whatsapp/status', { method: 'GET' });
        const nextStatus = data?.status ?? data?.connection?.status ?? 'disconnected';
        setStatus(nextStatus);
        setConnection(data?.connection ?? null);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao carregar status do WhatsApp.';
        setFetchError(message);
        setStatus('error');
        if (!silent) onNotify?.(message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [apiFetch, medicoId, onNotify],
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

    try {
      const data = await apiFetch('/api/metaadmin/whatsapp/start-session', { method: 'POST' });
      const nextStatus = data?.status ?? data?.connection?.status ?? 'qr_pending';
      setStatus(nextStatus);
      setConnection(data?.connection ?? null);
      onNotify?.('QR Code gerado. Escaneie com o WhatsApp do médico.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao conectar WhatsApp.';
      setFetchError(message);
      setStatus('error');
      onNotify?.(message);
    } finally {
      setActionLoading(false);
    }
  }, [apiFetch, disabled, medicoId, onNotify]);

  const handleDisconnect = useCallback(async () => {
    if (!medicoId || disabled) return;
    setActionLoading(true);
    setFetchError(null);

    try {
      const data = await apiFetch('/api/metaadmin/whatsapp/disconnect', { method: 'POST' });
      setStatus('disconnected');
      setConnection(data?.connection ?? null);
      onNotify?.('WhatsApp desconectado.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao desconectar WhatsApp.';
      setFetchError(message);
      onNotify?.(message);
    } finally {
      setActionLoading(false);
    }
  }, [apiFetch, disabled, medicoId, onNotify]);

  const effectiveStatus: WhatsappConnectionStatus =
    fetchError && status !== 'qr_pending' && status !== 'connected' ? 'error' : status;

  const qrCodeSrc = connection?.qrCode;

  if (!medicoId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        Perfil médico não carregado. Recarregue a página e tente novamente.
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
            WhatsApp
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Conecte seu WhatsApp para permitir futuros lembretes automáticos de aplicação.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 shrink-0 px-3 py-1 rounded-full text-xs font-semibold ring-1 ${statusBadgeClass(effectiveStatus)}`}
        >
          {effectiveStatus === 'connected' && <CheckCircle2 className="h-3.5 w-3.5" />}
          {effectiveStatus === 'qr_pending' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {effectiveStatus === 'error' && <AlertCircle className="h-3.5 w-3.5" />}
          {effectiveStatus === 'disconnected' && <WifiOff className="h-3.5 w-3.5" />}
          {statusBadgeLabel(effectiveStatus)}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      ) : effectiveStatus === 'disconnected' ? (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-600 bg-gray-50/50 dark:bg-gray-900/20 p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Seu WhatsApp ainda não está vinculado ao Oftware. A conexão será usada apenas para lembretes de
            aplicação no futuro — sem leitura de conversas nesta etapa.
          </p>
          <button
            type="button"
            onClick={() => void handleConnect()}
            disabled={disabled || actionLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
            Conectar WhatsApp
          </button>
        </div>
      ) : effectiveStatus === 'qr_pending' ? (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10 p-6 space-y-5">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Escaneie o QR Code abaixo com o WhatsApp do médico.
          </p>

          <div className="flex justify-center">
            {qrCodeSrc ? (
              <div className="rounded-2xl bg-white p-4 shadow-md border border-gray-100">
                <img
                  src={qrCodeSrc}
                  alt="QR Code para conectar WhatsApp"
                  className="h-64 w-64 object-contain"
                />
              </div>
            ) : (
              <div className="h-64 w-64 rounded-2xl bg-white border border-dashed border-gray-300 flex items-center justify-center text-sm text-gray-500">
                Gerando QR Code...
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleDisconnect()}
              disabled={disabled || actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-xl hover:bg-white dark:hover:bg-gray-800 disabled:opacity-60"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Cancelar conexão
            </button>
            <button
              type="button"
              onClick={() => void loadStatus(true)}
              disabled={disabled || actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar status
            </button>
          </div>
        </div>
      ) : effectiveStatus === 'connected' ? (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10 p-6 space-y-4">
          <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
            {connection?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <span className="font-medium text-gray-900 dark:text-white">Número:</span> {connection.phone}
                </span>
              </div>
            )}
            {connection?.profileName && (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <span className="font-medium text-gray-900 dark:text-white">Perfil:</span>{' '}
                  {connection.profileName}
                </span>
              </div>
            )}
            {formatDateTime(connection?.lastCheckAt) && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Última verificação: {formatDateTime(connection?.lastCheckAt)}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => void handleConnect()}
              disabled={disabled || actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-emerald-300 text-emerald-800 text-sm font-medium rounded-xl hover:bg-white dark:hover:bg-gray-800 disabled:opacity-60"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Reconectar
            </button>
            <button
              type="button"
              onClick={() => void handleDisconnect()}
              disabled={disabled || actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-red-200 text-red-700 text-sm font-medium rounded-xl hover:bg-red-50 disabled:opacity-60"
            >
              Desconectar
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 space-y-4">
          <p className="text-sm text-red-800">
            {connection?.errorMessage ??
              fetchError ??
              'Não foi possível conectar o WhatsApp. Verifique sua conexão e tente novamente.'}
          </p>
          <button
            type="button"
            onClick={() => void handleConnect()}
            disabled={disabled || actionLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-60"
          >
            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
