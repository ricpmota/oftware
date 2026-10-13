'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Building2,
  Clock,
  Database,
  Gauge,
  ListChecks,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserRound,
  Wrench,
} from 'lucide-react';
import { METODO_ORGANIZATION, METODO_ORGANIZATION_ID } from '@/lib/organization/organizationRegistry';
import {
  AutomacoesInfoNote,
  AutomacoesPageHeader,
  AutomacoesPlaceholderTable,
  AutomacoesStatusBadge,
  AutomacoesSummaryCard,
} from '@/components/metaadmingeral/automacoes/automacoesCenterUi';

type QueueStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'skipped';

type QueueStatsCounts = Record<QueueStatus, number> & { total: number };

type QueueUpcomingItem = {
  id: string;
  automationId: string;
  patientName: string;
  milestone: 'd1' | 'dplus1' | 'dplus3' | 'birthday' | 'conclusao';
  status: QueueStatus;
  dateKey: string;
  scheduledDateKey: string;
  scheduledTime: string;
  scheduledFor: string | null;
  semana: number;
  dose: number;
  hasLink: boolean;
};

type QueueStatsResponse = {
  ok?: boolean;
  error?: string;
  stats?: {
    counts: QueueStatsCounts;
    dueNow: number;
    nextScheduledFor: string | null;
    upcoming: QueueUpcomingItem[];
  };
  audit?: {
    cronReadsOnlyQueue: boolean;
    minuteCronLimitDefault: number;
    lastAuditLog: unknown | null;
    note: string;
  };
};

type RebuildResult = {
  doctors?: number;
  enqueued?: number;
  updated?: number;
};

type RebuildResponse = {
  ok?: boolean;
  error?: string;
  scope?: string;
  result?: RebuildResult;
};

type EmailRebuildResult = {
  organizationId: string;
  leadsScanned: number;
  leadsEligible: number;
  leadsIneligible: number;
  enqueued: number;
  updated: number;
  skippedExisting: number;
  skippedConversion: number;
};

type EmailRebuildResponse = {
  ok?: boolean;
  error?: string;
  scope?: string;
  shadowMode?: boolean;
  async?: boolean;
  jobId?: string;
  status?: EmailRebuildJobStatus;
  message?: string;
  result?: EmailRebuildResult;
};

type EmailRebuildJobStatus = 'queued' | 'running' | 'completed' | 'failed';

type EmailRebuildJobResponse = {
  ok?: boolean;
  error?: string;
  job?: {
    id: string;
    status: EmailRebuildJobStatus;
    durationMs?: number;
    result?: EmailRebuildResult;
    error?: string;
  };
};

const EMAIL_REBUILD_POLL_INTERVAL_MS = 3000;
const EMAIL_REBUILD_POLL_MAX_ATTEMPTS = 200;

const EMAIL_REBUILD_ORGANIZATIONS = [METODO_ORGANIZATION] as const;

const REBUILD_CONFIRM_MESSAGE =
  'Essa ação reconstrói a fila de automações WhatsApp para a base atual. O cron de minuto continuará lendo apenas a fila otimizada.';

const EMAIL_REBUILD_CONFIRM_MESSAGE =
  'Esta ação apenas reconstrói a fila email_automation_queue para a organização selecionada.\n\n' +
  '• Nenhum e-mail será enviado.\n' +
  '• email_envios não será alterado.\n' +
  '• O engine permanece como está (não muda para queue).\n' +
  '• O cron legado de envio não é afetado.\n\n' +
  'Deseja continuar?';

function automationLabel(automationId: string): string {
  if (automationId === 'aplicacao_d1_whatsapp') return 'Aplicação D-1';
  if (automationId === 'aplicacao_atrasada_whatsapp') return 'Aplicação atrasada';
  if (automationId === 'injetavel_dia_whatsapp') return 'Injetável (dia)';
  if (automationId === 'injetavel_d1_whatsapp') return 'Injetável D-1';
  if (automationId === 'aniversario_paciente_whatsapp') return 'Aniversário';
  if (automationId === 'nutri_checkin_semanal_whatsapp') return 'Check-in Semanal Nutri';
  if (automationId === 'conclusao_tratamento_whatsapp') return 'Conclusão';
  return automationId;
}

function milestoneLabel(milestone: QueueUpcomingItem['milestone']): string {
  if (milestone === 'd0') return 'No dia';
  if (milestone === 'd1') return 'D-1 (véspera)';
  if (milestone === 'dplus1') return 'Atrasada D+1';
  if (milestone === 'dplus3') return 'Atrasada D+3';
  if (milestone === 'birthday') return 'Aniversário';
  if (milestone === 'conclusao') return 'Conclusão';
  return milestone;
}

function formatBrasil(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function emailRebuildJobStatusLabel(status: EmailRebuildJobStatus): string {
  if (status === 'queued') return 'Na fila';
  if (status === 'running') return 'Em execução no servidor';
  if (status === 'completed') return 'Concluído';
  return 'Falhou';
}

export default function AutomacoesFerramentasPanel({ user }: { user: User }) {
  const [stats, setStats] = useState<QueueStatsResponse['stats'] | null>(null);
  const [audit, setAudit] = useState<QueueStatsResponse['audit'] | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildResult, setRebuildResult] = useState<RebuildResult | null>(null);
  const [rebuildDurationMs, setRebuildDurationMs] = useState<number | null>(null);
  const [rebuildError, setRebuildError] = useState<string | null>(null);

  const [emailOrgId, setEmailOrgId] = useState<string>(METODO_ORGANIZATION_ID);
  const [rebuildingEmail, setRebuildingEmail] = useState(false);
  const [emailRebuildJobId, setEmailRebuildJobId] = useState<string | null>(null);
  const [emailRebuildJobStatus, setEmailRebuildJobStatus] = useState<EmailRebuildJobStatus | null>(null);
  const [emailRebuildResult, setEmailRebuildResult] = useState<EmailRebuildResult | null>(null);
  const [emailRebuildDurationMs, setEmailRebuildDurationMs] = useState<number | null>(null);
  const [emailRebuildError, setEmailRebuildError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setStatsError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmingeral/automacoes/whatsapp-queue/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json().catch(() => null)) as QueueStatsResponse | null;
      if (!res.ok || !data?.ok || !data.stats) {
        throw new Error(data?.error ?? 'Não foi possível carregar as estatísticas da fila.');
      }
      setStats(data.stats);
      setAudit(data.audit ?? null);
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas.');
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, [user]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const handleRebuildAll = useCallback(async () => {
    if (typeof window !== 'undefined' && !window.confirm(REBUILD_CONFIRM_MESSAGE)) {
      return;
    }
    setRebuilding(true);
    setRebuildError(null);
    setRebuildResult(null);
    setRebuildDurationMs(null);
    const start = Date.now();
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmingeral/automacoes/whatsapp-queue/rebuild', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      const data = (await res.json().catch(() => null)) as RebuildResponse | null;
      if (!res.ok || !data?.ok || !data.result) {
        throw new Error(data?.error ?? 'Falha ao reconstruir a fila.');
      }
      setRebuildResult(data.result);
      setRebuildDurationMs(Date.now() - start);
      await loadStats();
    } catch (err) {
      setRebuildError(err instanceof Error ? err.message : 'Erro ao reconstruir a fila.');
    } finally {
      setRebuilding(false);
    }
  }, [user, loadStats]);

  const handleRebuildEmailByOrganization = useCallback(async () => {
    if (typeof window !== 'undefined' && !window.confirm(EMAIL_REBUILD_CONFIRM_MESSAGE)) {
      return;
    }
    setRebuildingEmail(true);
    setEmailRebuildError(null);
    setEmailRebuildResult(null);
    setEmailRebuildDurationMs(null);
    setEmailRebuildJobId(null);
    setEmailRebuildJobStatus(null);
    const start = Date.now();
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmingeral/automacoes/email-queue/rebuild', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: emailOrgId }),
      });
      const data = (await res.json().catch(() => null)) as EmailRebuildResponse | null;

      if (res.status === 202 && data?.ok && data.jobId) {
        setEmailRebuildJobId(data.jobId);
        setEmailRebuildJobStatus(data.status ?? 'queued');

        for (let attempt = 0; attempt < EMAIL_REBUILD_POLL_MAX_ATTEMPTS; attempt += 1) {
          await sleep(EMAIL_REBUILD_POLL_INTERVAL_MS);
          const statusRes = await fetch(
            `/api/metaadmingeral/automacoes/email-queue/rebuild/status?jobId=${encodeURIComponent(data.jobId)}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          const statusData = (await statusRes.json().catch(() => null)) as EmailRebuildJobResponse | null;
          if (!statusRes.ok || !statusData?.ok || !statusData.job) {
            throw new Error(statusData?.error ?? 'Não foi possível consultar o status do rebuild.');
          }

          setEmailRebuildJobStatus(statusData.job.status);

          if (statusData.job.status === 'completed') {
            if (!statusData.job.result) {
              throw new Error('Rebuild concluído sem resultado.');
            }
            setEmailRebuildResult(statusData.job.result);
            setEmailRebuildDurationMs(statusData.job.durationMs ?? Date.now() - start);
            return;
          }

          if (statusData.job.status === 'failed') {
            throw new Error(statusData.job.error ?? 'Rebuild falhou no servidor.');
          }
        }

        throw new Error(
          'Rebuild ainda em execução no servidor. Consulte o jobId nos logs ou tente novamente em alguns minutos.',
        );
      }

      if (!res.ok || !data?.ok || !data.result) {
        throw new Error(data?.error ?? 'Falha ao reconstruir a fila de e-mails.');
      }
      setEmailRebuildResult(data.result);
      setEmailRebuildDurationMs(Date.now() - start);
    } catch (err) {
      setEmailRebuildError(err instanceof Error ? err.message : 'Erro ao reconstruir a fila de e-mails.');
    } finally {
      setRebuildingEmail(false);
    }
  }, [user, emailOrgId]);

  const counts = stats?.counts;

  return (
    <div className="space-y-6">
      <AutomacoesPageHeader
        title="Ferramentas"
        subtitle="Reconstrução controlada das filas de e-mail e WhatsApp — somente materialização da fila, sem envio automático nem alteração de engine."
      />

      {/* A) Reconstruir fila de e-mails */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-sky-300" />
          <h3 className="text-lg font-semibold text-[#E8EDED]">Reconstruir fila de e-mails por organização</h3>
        </div>
        <p className="text-sm text-[#E8EDED]/60">
          Materializa ou atualiza <code className="rounded bg-white/10 px-1">email_automation_queue</code> a partir
          dos leads elegíveis e do histórico em <code className="rounded bg-white/10 px-1">email_envios</code>{' '}
          (somente leitura). Operação de shadow mode — não dispara envio.
        </p>

        <AutomacoesInfoNote>
          <strong className="font-semibold text-[#E8EDED]">Esta ação apenas reconstrói a fila.</strong>{' '}
          Nenhum e-mail será enviado. Não altera <code className="rounded bg-white/10 px-1">email_envios</code>, não
          muda o engine para <code className="rounded bg-white/10 px-1">queue</code> e não interfere no cron legado.
          O rebuild roda em background no servidor — você pode fechar esta aba após o job ser enfileirado.
        </AutomacoesInfoNote>

        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1.5 text-sm text-[#E8EDED]/80">
            <span className="font-medium">Organização</span>
            <select
              value={emailOrgId}
              onChange={(event) => setEmailOrgId(event.target.value)}
              disabled={rebuildingEmail}
              className="min-w-[220px] rounded-xl border border-white/10 bg-[#0B1220] px-3 py-2 text-sm text-[#E8EDED] outline-none focus:border-sky-400/50 disabled:opacity-60"
            >
              {EMAIL_REBUILD_ORGANIZATIONS.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.id})
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => void handleRebuildEmailByOrganization()}
            disabled={rebuildingEmail || !emailOrgId}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-[#0B1220] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rebuildingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {rebuildingEmail ? 'Reconstruindo fila de e-mails…' : 'Reconstruir fila de e-mails'}
          </button>
        </div>

        {emailRebuildJobId ? (
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            <p>
              <span className="font-semibold">Job:</span>{' '}
              <code className="rounded bg-black/20 px-1 text-xs">{emailRebuildJobId}</code>
            </p>
            {emailRebuildJobStatus ? (
              <p className="mt-1 text-sky-100/80">
                Status: <span className="font-medium">{emailRebuildJobStatusLabel(emailRebuildJobStatus)}</span>
              </p>
            ) : null}
          </div>
        ) : null}

        {emailRebuildError ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{emailRebuildError}</span>
          </div>
        ) : null}

        {rebuildingEmail && !emailRebuildError ? (
          <div className="flex items-center gap-2 text-sm text-[#E8EDED]/60">
            <Loader2 className="h-4 w-4 animate-spin" />
            Aguardando conclusão no servidor (polling a cada 3s)…
          </div>
        ) : null}

        {emailRebuildResult ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AutomacoesSummaryCard label="Leads varridos" value={emailRebuildResult.leadsScanned} icon={UserRound} />
            <AutomacoesSummaryCard label="Elegíveis" value={emailRebuildResult.leadsEligible} icon={ListChecks} />
            <AutomacoesSummaryCard label="Enfileirados" value={emailRebuildResult.enqueued} icon={Mail} />
            <AutomacoesSummaryCard label="Atualizados" value={emailRebuildResult.updated} icon={RefreshCw} />
            <AutomacoesSummaryCard
              label="Já existentes"
              value={emailRebuildResult.skippedExisting}
              icon={ShieldCheck}
            />
            <AutomacoesSummaryCard
              label="Convertidos (skip)"
              value={emailRebuildResult.skippedConversion}
              icon={AlertTriangle}
            />
            <AutomacoesSummaryCard
              label="Tempo de execução"
              value={emailRebuildDurationMs != null ? `${(emailRebuildDurationMs / 1000).toFixed(1)}s` : '—'}
              icon={Clock}
            />
            <AutomacoesSummaryCard label="Organização" value={emailRebuildResult.organizationId} icon={Building2} />
          </div>
        ) : null}
      </section>

      {/* B) Reconstruir fila WhatsApp */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-[#4CCB7A]" />
          <h3 className="text-lg font-semibold text-[#E8EDED]">Reconstruir fila WhatsApp</h3>
        </div>
        <p className="text-sm text-[#E8EDED]/60">
          Varre a base atual e regrava a fila enxuta (D-1, D+1 e D+3) com id determinístico — não
          duplica documentos. Operação controlada, executada fora do cron de minuto.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleRebuildAll}
            disabled={rebuilding}
            className="inline-flex items-center gap-2 rounded-xl bg-[#4CCB7A] px-4 py-2 text-sm font-semibold text-[#0B1220] transition hover:bg-[#43b56d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rebuilding ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {rebuilding ? 'Reconstruindo…' : 'Reconstruir toda a base'}
          </button>

          <button
            type="button"
            disabled
            title="Em breve"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[#E8EDED]/40 cursor-not-allowed"
          >
            <Building2 className="h-4 w-4" />
            Reconstruir por organização
            <span className="text-[10px] uppercase tracking-wide">em breve</span>
          </button>

          <button
            type="button"
            disabled
            title="Em breve"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[#E8EDED]/40 cursor-not-allowed"
          >
            <UserRound className="h-4 w-4" />
            Reconstruir por médico
            <span className="text-[10px] uppercase tracking-wide">em breve</span>
          </button>
        </div>

        {rebuildError ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{rebuildError}</span>
          </div>
        ) : null}

        {rebuildResult ? (
          <div className="grid gap-3 sm:grid-cols-4">
            <AutomacoesSummaryCard label="Médicos processados" value={rebuildResult.doctors ?? 0} icon={UserRound} />
            <AutomacoesSummaryCard label="Itens enfileirados" value={rebuildResult.enqueued ?? 0} icon={ListChecks} />
            <AutomacoesSummaryCard label="Itens atualizados" value={rebuildResult.updated ?? 0} icon={RefreshCw} />
            <AutomacoesSummaryCard
              label="Tempo de execução"
              value={rebuildDurationMs != null ? `${(rebuildDurationMs / 1000).toFixed(1)}s` : '—'}
              icon={Clock}
            />
          </div>
        ) : null}
      </section>

      {/* C) Estatísticas da fila */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-sky-300" />
            <h3 className="text-lg font-semibold text-[#E8EDED]">Estatísticas da fila</h3>
          </div>
          <button
            type="button"
            onClick={() => void loadStats()}
            disabled={loadingStats}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-[#E8EDED]/80 transition hover:bg-white/10 disabled:opacity-60"
          >
            {loadingStats ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Atualizar
          </button>
        </div>

        {statsError ? (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{statsError}</span>
          </div>
        ) : null}

        {loadingStats && !stats ? (
          <div className="flex items-center gap-2 text-sm text-[#E8EDED]/60">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando estatísticas…
          </div>
        ) : null}

        {counts ? (
          <>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <AutomacoesSummaryCard label="Pendentes" value={counts.pending} icon={Clock} />
              <AutomacoesSummaryCard label="Processando" value={counts.processing} icon={Loader2} />
              <AutomacoesSummaryCard label="Enviados" value={counts.sent} icon={ShieldCheck} />
              <AutomacoesSummaryCard label="Falharam" value={counts.failed} icon={AlertTriangle} />
              <AutomacoesSummaryCard label="Ignorados" value={counts.skipped} icon={ListChecks} />
              <AutomacoesSummaryCard label="Total" value={counts.total} icon={Database} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <AutomacoesSummaryCard
                label="Vencidos agora"
                value={stats?.dueNow ?? 0}
                hint="Pendentes com envio já no ponto (o próximo minuto envia até o limite)."
                icon={Gauge}
              />
              <AutomacoesSummaryCard
                label="Próximo envio"
                value={formatBrasil(stats?.nextScheduledFor ?? null)}
                hint="Primeiro item pendente da fila (Brasília)."
                icon={Clock}
              />
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-[#E8EDED]/80">Próximos 10 pendentes</h4>
              {stats && stats.upcoming.length > 0 ? (
                <AutomacoesPlaceholderTable
                  headers={['Paciente', 'Automação', 'Marco', 'Envio (BR)', 'Sem/Dose', 'Link']}
                  rows={stats.upcoming.map((item) => [
                    item.patientName || '—',
                    automationLabel(item.automationId),
                    milestoneLabel(item.milestone),
                    formatBrasil(item.scheduledFor),
                    `S${item.semana} / D${item.dose}`,
                    item.hasLink ? (
                      <AutomacoesStatusBadge key={`${item.id}-link`} label="com link" tone="success" />
                    ) : (
                      <AutomacoesStatusBadge key={`${item.id}-nolink`} label="sem link" tone="muted" />
                    ),
                  ])}
                />
              ) : (
                <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-[#E8EDED]/50">
                  Nenhum item pendente na fila.
                </p>
              )}
            </div>
          </>
        ) : null}
      </section>

      {/* D) Auditoria de custo */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-amber-300" />
          <h3 className="text-lg font-semibold text-[#E8EDED]">Auditoria de custo</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <AutomacoesSummaryCard
            label="Leitura do cron de minuto"
            value={audit?.cronReadsOnlyQueue === false ? 'Verificar' : 'Apenas a fila'}
            hint="whatsapp_automation_queue (status pending + scheduledFor ≤ agora)."
            icon={Database}
          />
          <AutomacoesSummaryCard
            label="Limite por execução"
            value={audit?.minuteCronLimitDefault ?? 10}
            hint="Itens processados por rodada do cron de minuto (default)."
            icon={Gauge}
          />
        </div>

        <AutomacoesInfoNote>
          <strong className="font-semibold text-[#E8EDED]">O cron não varre pacientes.</strong> O motor de
          1 minuto lê somente a fila otimizada; a varredura de pacientes acontece apenas na reconstrução
          controlada (aqui e no cron diário leve das 03:30 BR). O último audit log (
          <code className="rounded bg-white/10 px-1">queueItemsRead / sentCount / skippedCount / failedCount / firestoreReadsEstimated / durationMs</code>
          ) é emitido nos logs do servidor a cada execução do cron.
        </AutomacoesInfoNote>
      </section>
    </div>
  );
}
