'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { AlertCircle, Loader2, RefreshCw, Stethoscope } from 'lucide-react';
import {
  AutomacoesChannelBadge,
  AutomacoesInfoNote,
  AutomacoesPageHeader,
  AutomacoesPlaceholderTable,
  AutomacoesStatusBadge,
} from '@/components/metaadmingeral/automacoes/automacoesCenterUi';
import type {
  AutomationCenterDoctorActivityDto,
  AutomationCenterDoctorActivityStatus,
  AutomationCenterLogEventDto,
  AutomationCenterLogsDto,
} from '@/types/automationCenterLogs';

type Props = {
  user: User | null;
};

type ChannelFilter = 'all' | 'whatsapp' | 'email';
type StatusFilter = 'all' | 'sent' | 'failed' | 'skipped' | 'pending' | 'processing';

const REFRESH_MS = 60_000;

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function channelLabel(channel: AutomationCenterLogEventDto['channel']): string {
  return channel === 'whatsapp' ? 'WhatsApp' : 'E-mail';
}

function statusLabel(status: AutomationCenterLogEventDto['status']): string {
  switch (status) {
    case 'sent':
      return 'Enviado';
    case 'failed':
      return 'Falhou';
    case 'skipped':
      return 'Ignorado';
    case 'pending':
      return 'Pendente';
    case 'processing':
      return 'Processando';
    default:
      return status;
  }
}

function statusTone(
  status: AutomationCenterLogEventDto['status'],
): 'success' | 'warn' | 'muted' | 'neutral' {
  if (status === 'sent') return 'success';
  if (status === 'failed') return 'warn';
  if (status === 'pending' || status === 'processing') return 'neutral';
  return 'muted';
}

function eventDateLabel(event: AutomationCenterLogEventDto): string {
  if (event.scheduledFor && (event.status === 'pending' || event.status === 'processing')) {
    return formatDateTime(event.scheduledFor);
  }
  return formatDateTime(event.at);
}

function doctorActivityLabel(status: AutomationCenterDoctorActivityStatus): string {
  switch (status) {
    case 'active':
      return 'Enviando';
    case 'failed_recent':
      return 'Falha recente';
    case 'silent':
      return 'Sem envios (24h)';
    default:
      return status;
  }
}

function doctorActivityTone(status: AutomationCenterDoctorActivityStatus): 'success' | 'warn' | 'muted' {
  if (status === 'active') return 'success';
  if (status === 'failed_recent') return 'warn';
  return 'muted';
}

export default function AutomacoesLogsPanel({ user }: Props) {
  const [logs, setLogs] = useState<AutomationCenterLogsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const loadLogs = useCallback(
    async (silent = false) => {
      if (!user) {
        setLogs(null);
        setLoading(false);
        return;
      }

      if (!silent) setRefreshing(true);
      setError(null);

      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/metaadmingeral/automacoes/logs?limit=200', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          logs?: AutomationCenterLogsDto;
        } | null;

        if (!res.ok || !data?.ok || !data.logs) {
          throw new Error(data?.error ?? 'Não foi possível carregar os logs.');
        }

        setLogs(data.logs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar logs.');
        setLogs(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  useEffect(() => {
    void loadLogs();
    const interval = setInterval(() => void loadLogs(true), REFRESH_MS);
    return () => clearInterval(interval);
  }, [loadLogs]);

  const filteredEvents = useMemo(() => {
    if (!logs) return [];
    return logs.events.filter((event) => {
      if (channelFilter !== 'all' && event.channel !== channelFilter) return false;
      if (statusFilter !== 'all' && event.status !== statusFilter) return false;
      return true;
    });
  }, [logs, channelFilter, statusFilter]);

  const silentDoctors = useMemo(
    () => (logs?.doctorActivity ?? []).filter((d) => d.activityStatus !== 'active'),
    [logs],
  );

  const pendingCount = useMemo(
    () => (logs?.events ?? []).filter((e) => e.status === 'pending' || e.status === 'processing').length,
    [logs],
  );

  const eventRows = filteredEvents.map((event) => [
    <span key={`${event.id}-dt`} className="whitespace-nowrap text-xs text-[#E8EDED]/75">
      {eventDateLabel(event)}
      {event.scheduledFor && (event.status === 'pending' || event.status === 'processing') ? (
        <span className="block text-[#E8EDED]/45">previsto</span>
      ) : null}
    </span>,
    event.organizationName ?? event.organizationId ?? '—',
    event.doctorName ?? '—',
    <AutomacoesChannelBadge key={`${event.id}-ch`} channel={channelLabel(event.channel)} />,
    <span key={`${event.id}-type`} className="text-[#E8EDED]/85">
      {event.eventType}
      {event.detail ? (
        <span className="block text-xs text-[#E8EDED]/50">{event.detail}</span>
      ) : null}
    </span>,
    <AutomacoesStatusBadge
      key={`${event.id}-st`}
      label={statusLabel(event.status)}
      tone={statusTone(event.status)}
    />,
    event.errorMessage ? (
      <span
        key={`${event.id}-err`}
        className={`text-xs max-w-[260px] block ${
          event.status === 'pending' || event.status === 'processing'
            ? 'text-sky-200/90'
            : 'text-amber-300/90'
        }`}
        title={event.errorMessage}
      >
        {event.errorMessage}
      </span>
    ) : (
      <span key={`${event.id}-ok`} className="text-xs text-[#E8EDED]/40">
        {event.recipient ?? '—'}
      </span>
    ),
  ]);

  const doctorRows = (logs?.doctorActivity ?? []).map((doctor: AutomationCenterDoctorActivityDto) => {
    const lastSendAt = doctor.lastWhatsappAt ?? doctor.lastEmailAt;
    const lastSendChannel = doctor.lastWhatsappAt
      ? 'WhatsApp'
      : doctor.lastEmailAt
        ? 'E-mail'
        : null;
    const lastSendStatus = doctor.lastWhatsappAt
      ? doctor.lastWhatsappStatus
      : doctor.lastEmailStatus;

    return [
      doctor.organizationName ?? doctor.organizationId,
      doctor.doctorName,
      <span key={`${doctor.doctorId}-last`} className="text-xs text-[#E8EDED]/75">
        {lastSendAt ? formatDateTime(lastSendAt) : '—'}
        {lastSendChannel ? (
          <span className="block text-[#E8EDED]/45">
            {lastSendChannel}
            {lastSendStatus ? ` · ${lastSendStatus === 'sent' ? 'enviado' : lastSendStatus === 'failed' ? 'falhou' : 'ignorado'}` : ''}
          </span>
        ) : null}
      </span>,
      <span key={`${doctor.doctorId}-cnt`} className="tabular-nums text-[#E8EDED]/75">
        {doctor.recentEventCount}
      </span>,
      <AutomacoesStatusBadge
        key={`${doctor.doctorId}-st`}
        label={doctorActivityLabel(doctor.activityStatus)}
        tone={doctorActivityTone(doctor.activityStatus)}
      />,
    ];
  });

  if (loading && !logs) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-[#E8EDED]/60">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando logs de automação…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <AutomacoesPageHeader
          title="Logs"
          subtitle="Envios, pendências e motivos de bloqueio em todos os médicos e organizações"
        />
        <button
          type="button"
          onClick={() => void loadLogs()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-[#E8EDED]/80 hover:bg-white/10 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      ) : null}

      {logs ? (
        <AutomacoesInfoNote>
          Atualizado em {formatDateTime(logs.generatedAt)} · auto-refresh a cada 1 minuto.
          {pendingCount > 0 ? (
            <span className="block mt-1 text-sky-200/80">
              {pendingCount} item(ns) pendente(s) ou em processamento — motivo do não envio na coluna Detalhe.
            </span>
          ) : null}
          {silentDoctors.length > 0 ? (
            <span className="block mt-1 text-amber-200/80">
              {silentDoctors.length} médico(s) com automação ativa sem envio nas últimas 24h ou com falha recente — revise abaixo.
            </span>
          ) : null}
        </AutomacoesInfoNote>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['all', 'Todos os canais'],
            ['whatsapp', 'WhatsApp'],
            ['email', 'E-mail'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setChannelFilter(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              channelFilter === id
                ? 'bg-[#4CCB7A]/15 text-[#4CCB7A] ring-1 ring-[#4CCB7A]/30'
                : 'bg-white/5 text-[#E8EDED]/60 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
        <span className="mx-1 w-px bg-white/10 self-stretch" />
        {(
          [
            ['all', 'Todos'],
            ['pending', 'Pendentes'],
            ['processing', 'Processando'],
            ['sent', 'Enviados'],
            ['failed', 'Falhas'],
            ['skipped', 'Ignorados'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setStatusFilter(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === id
                ? 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30'
                : 'bg-white/5 text-[#E8EDED]/60 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <AutomacoesPlaceholderTable
        title={`Eventos (${filteredEvents.length})`}
        headers={['Data / previsto', 'Organização', 'Médico', 'Canal', 'Tipo', 'Status', 'Detalhe / motivo']}
        rows={eventRows.length > 0 ? eventRows : [[
          <span key="empty-dt" className="text-[#E8EDED]/50">—</span>,
          <span key="empty-org" className="text-[#E8EDED]/50 col-span-6">Nenhum evento com os filtros atuais.</span>,
          '—',
          '—',
          '—',
          '—',
          '—',
        ]]}
      />

      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="border-b border-white/10 px-4 py-3 flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-[#4CCB7A]" />
          <h3 className="text-sm font-semibold text-[#E8EDED]">
            Atividade por médico ({logs?.doctorActivity.length ?? 0})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[#E8EDED]/50">
                {['Organização', 'Médico', 'Último envio', 'Eventos recentes', 'Situação'].map((header) => (
                  <th key={header} className="px-4 py-3 font-medium whitespace-nowrap">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doctorRows.length > 0 ? (
                doctorRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-3 text-[#E8EDED]/85 align-middle">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[#E8EDED]/50">
                    Nenhum médico com automação ativa encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
