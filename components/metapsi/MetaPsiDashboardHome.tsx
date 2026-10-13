'use client';

import { useEffect, useState } from 'react';
import {
  Inbox,
  Mail,
  Stethoscope,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';
import DashboardHeroKpi from '@/components/metaadmin/dashboard/DashboardHeroKpi';
import DashboardKpiCard from '@/components/metaadmin/dashboard/DashboardKpiCard';
import {
  ORGANIZATION_SHELL_NEUTRAL_SECONDARY,
  type OrganizationShellChrome,
} from '@/lib/organization/resolveOrganizationShellChrome';
import {
  buildMetaPsiDashboardMetrics,
  type MetaPsiDashboardMetrics,
} from '@/lib/metapsi/buildMetaPsiDashboardMetrics';
import { PacientePsiquiatraService } from '@/services/pacientePsiquiatraService';
import { SolicitacaoPsiquiatraService } from '@/services/solicitacaoPsiquiatraService';
import { SolicitacaoVinculoPsiquiatraMedicoService } from '@/services/solicitacaoVinculoPsiquiatraMedicoService';
import type { SolicitacaoPsiquiatraDoc } from '@/features/metaPsi/metaPsi.types';
import type { SolicitacaoVinculoPsiquiatraMedicoDoc } from '@/features/metaPsi/metaPsi.types';

export type MetaPsiHomeMenu =
  | 'pacientes'
  | 'medicos'
  | 'comunicacao'
  | 'leads'
  | 'financeiro'
  | 'calendario';

type Props = {
  psiquiatraId: string;
  medicoVinculadoIds: string[];
  navyColor?: string;
  chrome?: OrganizationShellChrome | null;
  onNavigate: (menu: MetaPsiHomeMenu) => void;
  /** Quando embutido sob ProfissionalDashboardHome — só atalhos + pendências. */
  hideHeroKpis?: boolean;
};

type Tone = 'amber' | 'blue' | 'green' | 'red';

function KpiSkeleton() {
  return (
    <div
      className="border bg-[var(--surface-card,#fff)] p-5 sm:p-6"
      style={{ borderColor: 'var(--border-default,#e5e7eb)', borderRadius: 18 }}
      data-metapsi-home-skeleton
    >
      <div className="mb-4 h-10 w-10 animate-pulse rounded-xl bg-gray-100" />
      <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
      <div className="mt-3 h-8 w-12 animate-pulse rounded bg-gray-100" />
      <div className="mt-3 h-3 w-28 animate-pulse rounded bg-gray-100" />
    </div>
  );
}

function ClickableKpi({
  onClick,
  label,
  value,
  description,
  icon,
  tone,
}: {
  onClick: () => void;
  label: string;
  value: number;
  description: string;
  icon: LucideIcon;
  tone: Tone;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-0 text-left transition-opacity hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--shell-mark,#4CCB7A)]"
      aria-label={`${label}: ${value}. ${description}`}
    >
      <DashboardKpiCard label={label} value={value} description={description} icon={icon} tone={tone} />
    </button>
  );
}

function QuickAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-w-0 items-center gap-2 rounded-xl border border-[color:var(--border-default,#e5e7eb)] bg-[color:var(--surface-card,#fff)] px-3.5 py-2.5 text-sm font-medium text-[color:var(--text-primary,#111827)] shadow-sm transition-colors hover:bg-gray-50"
    >
      <Icon className="h-4 w-4 shrink-0 text-[color:var(--shell-mark,#4CCB7A)]" />
      <span className="truncate">{label}</span>
    </button>
  );
}

/**
 * Início MetaPsi — chrome visual do ProfissionalDashboardHome (hero + KPI grid),
 * sem métricas de tratamento/peso/financeiro Nutri.
 */
export default function MetaPsiDashboardHome({
  psiquiatraId,
  medicoVinculadoIds,
  navyColor = ORGANIZATION_SHELL_NEUTRAL_SECONDARY,
  chrome,
  onNavigate,
  hideHeroKpis = false,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MetaPsiDashboardMetrics | null>(null);
  const [pendingShares, setPendingShares] = useState<SolicitacaoPsiquiatraDoc[]>([]);
  const [pendingVinculos, setPendingVinculos] = useState<SolicitacaoVinculoPsiquiatraMedicoDoc[]>([]);

  const medicoIdsKey = (medicoVinculadoIds || []).join('\0');

  useEffect(() => {
    const psiId = String(psiquiatraId || '').trim();
    if (!psiId) return;

    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const ids = medicoIdsKey ? medicoIdsKey.split('\0').filter(Boolean) : [];
        const [vinculos, shares, vinculosRec] = await Promise.all([
          PacientePsiquiatraService.listActiveVinculosByPsiquiatra(psiId),
          SolicitacaoPsiquiatraService.listPendingRequestsByPsiquiatra(psiId),
          SolicitacaoVinculoPsiquiatraMedicoService.listPendingVinculoRequestsByPsiquiatra(psiId),
        ]);
        if (cancelled) return;
        setPendingShares(shares);
        setPendingVinculos(vinculosRec);
        setMetrics(
          buildMetaPsiDashboardMetrics({
            vinculos,
            medicoVinculadoIds: ids,
            compartilhamentosPendentes: shares.length,
            vinculosPendentesRecebidos: vinculosRec.length,
            recentDays: 30,
          }),
        );
      } catch (err) {
        console.error('[MetaPsiDashboardHome]', err);
        if (!cancelled) {
          setError('Não foi possível carregar os indicadores. Tente novamente.');
          setMetrics(
            buildMetaPsiDashboardMetrics({
              vinculos: [],
              medicoVinculadoIds: medicoIdsKey ? medicoIdsKey.split('\0').filter(Boolean) : [],
              compartilhamentosPendentes: 0,
              vinculosPendentesRecebidos: 0,
            }),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [psiquiatraId, medicoIdsKey]);

  const m =
    metrics ??
    buildMetaPsiDashboardMetrics({
      vinculos: [],
      medicoVinculadoIds,
      compartilhamentosPendentes: 0,
      vinculosPendentesRecebidos: 0,
    });

  return (
    <div className="min-w-0 w-full space-y-6" data-metapsi-dashboard-home>
      {!hideHeroKpis ? (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-[color:var(--text-secondary,#6b7280)]">
            {m.medicosVinculados} médico{m.medicosVinculados === 1 ? '' : 's'} vinculado
            {m.medicosVinculados === 1 ? '' : 's'}
          </p>
        </div>
      ) : null}

      {error ? (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {!hideHeroKpis ? (
        loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
            <div
              className="col-span-2 h-[148px] animate-pulse lg:col-span-1"
              style={{ backgroundColor: chrome?.secondaryColor ?? navyColor, borderRadius: 20, opacity: 0.85 }}
              data-metapsi-home-skeleton
            />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
            <button
              type="button"
              onClick={() => onNavigate('pacientes')}
              className="col-span-2 min-w-0 text-left lg:col-span-1"
              aria-label={`Total de pacientes ativos: ${m.pacientesAtivos}`}
            >
              <DashboardHeroKpi
                total={m.pacientesAtivos}
                cadastroTimestamps={m.compartilhamentoTimestamps}
                navyColor={chrome?.secondaryColor ?? navyColor}
                chrome={chrome}
                className="relative col-span-2 overflow-visible p-5 shadow-[0_8px_24px_rgba(10,31,68,0.18)] sm:p-6 lg:col-span-1"
              />
            </button>
            <ClickableKpi
              onClick={() => onNavigate('medicos')}
              label="Médicos vinculados"
              value={m.medicosVinculados}
              description="Vínculo profissional ativo"
              icon={Stethoscope}
              tone="green"
            />
            <ClickableKpi
              onClick={() => onNavigate('pacientes')}
              label="Compartilhamentos"
              value={m.compartilhamentosPendentes}
              description="Pacientes aguardando aceite"
              icon={Inbox}
              tone="amber"
            />
            <ClickableKpi
              onClick={() => onNavigate('medicos')}
              label="Vínculos recebidos"
              value={m.vinculosPendentesRecebidos}
              description="Médicos aguardando aceite"
              icon={UserPlus}
              tone="blue"
            />
            <ClickableKpi
              onClick={() => onNavigate('pacientes')}
              label={`Novos (${m.recentDays}d)`}
              value={m.novosCompartilhamentosRecentes}
              description="Compartilhamentos recentes"
              icon={Users}
              tone="green"
            />
          </div>
        )
      ) : null}

      <div
        className="border bg-[var(--surface-card,#fff)]"
        style={{ borderColor: 'var(--border-default,#e5e7eb)', borderRadius: 18 }}
        data-metapsi-home-quick-actions
      >
        <div className="p-4 sm:px-5 sm:py-[18px]">
          <h3 className="text-[15px] font-semibold text-[color:var(--text-primary,#111827)]">Atalhos</h3>
          <p className="mt-0.5 text-[12px] text-[color:var(--text-secondary,#6b7280)]">
            Destinos disponíveis neste portal
          </p>
          <div className="mt-3 flex min-w-0 flex-wrap gap-2">
            <QuickAction label="Ver pacientes" icon={Users} onClick={() => onNavigate('pacientes')} />
            <QuickAction label="Ver médicos" icon={Stethoscope} onClick={() => onNavigate('medicos')} />
            <QuickAction label="Abrir leads" icon={Inbox} onClick={() => onNavigate('leads')} />
            <QuickAction
              label="Ver solicitações"
              icon={Inbox}
              onClick={() =>
                onNavigate(
                  m.compartilhamentosPendentes > 0
                    ? 'pacientes'
                    : m.vinculosPendentesRecebidos > 0
                      ? 'medicos'
                      : 'pacientes',
                )
              }
            />
            <QuickAction label="Abrir comunicação" icon={Mail} onClick={() => onNavigate('comunicacao')} />
          </div>
        </div>
      </div>

      <div
        className="border bg-[var(--surface-card,#fff)]"
        style={{ borderColor: 'var(--border-default,#e5e7eb)', borderRadius: 18 }}
        data-metapsi-home-pendencias
      >
        <div className="p-4 sm:px-5 sm:py-[18px]">
          <h3 className="text-[15px] font-semibold text-[color:var(--text-primary,#111827)]">Pendências</h3>
          <p className="mt-0.5 text-[12px] text-[color:var(--text-secondary,#6b7280)]">
            Itens que exigem ação do psiquiatra
          </p>

          {loading ? (
            <div className="mt-4 space-y-2" data-metapsi-home-skeleton>
              <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
              <div className="h-12 animate-pulse rounded-xl bg-gray-100" />
            </div>
          ) : pendingShares.length === 0 && pendingVinculos.length === 0 ? (
            <p className="mt-4 py-6 text-center text-sm text-[color:var(--text-secondary,#6b7280)]">
              Nenhuma pendência no momento
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100">
              {pendingShares.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate('pacientes')}
                    className="flex w-full min-w-0 items-center justify-between gap-3 py-3 text-left hover:bg-gray-50/80"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[color:var(--text-primary,#111827)]">
                        {s.pacienteNome || 'Paciente'}
                      </p>
                      <p className="truncate text-xs text-[color:var(--text-secondary,#6b7280)]">
                        Compartilhamento · {s.medicoNome || 'Médico'}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      Pendente
                    </span>
                  </button>
                </li>
              ))}
              {pendingVinculos.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate('medicos')}
                    className="flex w-full min-w-0 items-center justify-between gap-3 py-3 text-left hover:bg-gray-50/80"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[color:var(--text-primary,#111827)]">
                        {s.medicoNome || 'Médico'}
                      </p>
                      <p className="truncate text-xs text-[color:var(--text-secondary,#6b7280)]">
                        Vínculo profissional recebido
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                      Pendente
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
