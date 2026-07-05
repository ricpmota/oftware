'use client';

import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Building2,
  Calendar,
  Dumbbell,
  Globe,
  Link2,
  Loader2,
  ShieldCheck,
  Stethoscope,
  Target,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import type { OrganizationDefinition } from '@/lib/organization/organizationTypes';
import type { OrganizationBrandingStored } from '@/lib/organization/organizationBrandingTypes';
import { ORGANIZATION_METODO_OG_FALLBACK_SRC } from '@/lib/organization/organizationBrandingDefaults';
import type {
  OrganizationDashboardMetrics,
} from '@/lib/metaadmingeral/buildOrganizationDashboardMetrics';
import type { OrganizationClinicalOutcomeMetrics } from '@/lib/metaadmingeral/buildOrganizationClinicalOutcomeMetrics';
import type { PlatformHealthReport } from '@/lib/platform-audit/types';

export type OrganizationDashboardLoading = {
  team: boolean;
  pacientes: boolean;
  leads: boolean;
  nps: boolean;
  compartilhados: boolean;
};

type OrganizationDashboardPanelProps = {
  user: User;
  organization: OrganizationDefinition;
  metrics: OrganizationDashboardMetrics;
  clinicalOutcomes: OrganizationClinicalOutcomeMetrics;
  loading: OrganizationDashboardLoading;
  onNavigate: (menuId: string) => void;
};

function MetricCard({
  label,
  value,
  hint,
  loading,
  onClick,
}: {
  label: string;
  value: string | number;
  hint?: string;
  loading?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/50">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#E8EDED]">
        {loading ? <Loader2 className="inline h-6 w-6 animate-spin text-[#4CCB7A]" /> : value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[#E8EDED]/45">{hint}</p> : null}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:border-[#4CCB7A]/40 hover:bg-[#4CCB7A]/5"
      >
        {content}
      </button>
    );
  }

  return <div className="rounded-2xl border border-white/10 bg-white/5 p-4">{content}</div>;
}

function formatNps(value: number | null): string {
  if (value == null) return '—';
  return value.toFixed(1);
}

export default function OrganizationDashboardPanel({
  user,
  organization,
  metrics,
  clinicalOutcomes,
  loading,
  onNavigate,
}: OrganizationDashboardPanelProps) {
  const [branding, setBranding] = useState<OrganizationBrandingStored | null>(null);
  const [brandingLoading, setBrandingLoading] = useState(true);
  const [audit, setAudit] = useState<PlatformHealthReport | null>(null);
  const [auditLoading, setAuditLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setBrandingLoading(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/metaadmingeral/organizations/${organization.id}/branding`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!cancelled && res.ok) {
          setBranding(json.branding as OrganizationBrandingStored);
        }
      } catch {
        if (!cancelled) setBranding(null);
      } finally {
        if (!cancelled) setBrandingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organization.id, user]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setAuditLoading(true);
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/metaadmingeral/audit/platform-health', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled && res.ok) {
          setAudit(data as PlatformHealthReport);
        }
      } catch {
        if (!cancelled) setAudit(null);
      } finally {
        if (!cancelled) setAuditLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const logoUrl =
    branding?.logoMainUrl?.trim() ||
    branding?.ogImageUrl?.trim() ||
    ORGANIZATION_METODO_OG_FALLBACK_SRC;

  const domainUrl = branding?.siteUrl?.trim() || organization.primaryOrigin;

  const headerShortcuts = [
    { label: 'Marca', menuId: 'organizacao-metodo-branding', icon: Building2 },
    { label: 'Equipe', menuId: 'medicos', icon: Users },
    { label: 'Pacientes', menuId: 'pacientes', icon: Target },
    { label: 'Saúde da Organização', menuId: 'platform-health', icon: ShieldCheck },
  ];

  const coveragePercent = audit?.organization.coveragePercent;
  const publicLinksTotal = audit?.publicLinks.total;

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-2">
          {brandingLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-[#4CCB7A]" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="max-h-full max-w-full object-contain" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold text-[#E8EDED]">{organization.name}</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-[#E8EDED]/60">
            <Globe className="h-4 w-4 shrink-0" />
            <span className="truncate">{domainUrl}</span>
          </p>
          <p className="mt-1 text-sm text-[#E8EDED]/50">
            Status:{' '}
            <span className="font-medium text-[#4CCB7A]">Ativa</span>
            <span className="mx-2 text-[#E8EDED]/30">·</span>
            <span className="font-mono text-xs text-[#E8EDED]/45">ID: {organization.id}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {headerShortcuts.map(({ label, menuId, icon: Icon }) => (
            <button
              key={menuId}
              type="button"
              onClick={() => onNavigate(menuId)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-[#E8EDED] hover:border-[#4CCB7A]/40 hover:bg-[#4CCB7A]/10 transition-colors"
            >
              <Icon className="h-4 w-4 text-[#4CCB7A]" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards principais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Médicos"
          value={metrics.totalMedicos}
          hint={`${metrics.medicosVerificados} verificados`}
          loading={loading.team}
          onClick={() => onNavigate('medicos')}
        />
        <MetricCard
          label="Nutricionistas"
          value={metrics.totalNutricionistas}
          hint={`${metrics.nutricionistasVerificados} verificados`}
          loading={loading.team}
          onClick={() => onNavigate('nutricionistas')}
        />
        <MetricCard
          label="Personais"
          value={metrics.totalPersonalTrainers}
          hint={`${metrics.personalTrainersVerificados} verificados`}
          loading={loading.team}
          onClick={() => onNavigate('personal_trainers')}
        />
        <MetricCard
          label="Pacientes"
          value={metrics.totalPacientes}
          hint={`${metrics.pacientesEmTratamento} em tratamento`}
          loading={loading.pacientes}
          onClick={() => onNavigate('pacientes')}
        />
        <MetricCard
          label="Leads"
          value={metrics.totalLeadsAtivos}
          hint={`${metrics.totalLeads} no histórico`}
          loading={loading.leads}
          onClick={() => onNavigate('leads')}
        />
        <MetricCard
          label="NPS"
          value={formatNps(metrics.npsGeral)}
          hint={metrics.npsGeral != null ? 'Score geral' : 'Abra NPS para carregar'}
          loading={loading.nps}
          onClick={() => onNavigate('nps')}
        />
        <MetricCard
          label="Links públicos"
          value={publicLinksTotal ?? '—'}
          hint="Auditoria de links públicos"
          loading={auditLoading}
          onClick={() => onNavigate('platform-health')}
        />
        <MetricCard
          label="Organization coverage"
          value={coveragePercent != null ? `${coveragePercent}%` : '—'}
          hint={
            audit
              ? `${audit.organization.withoutOrganizationId} sem organizationId`
              : 'Auditoria de organização'
          }
          loading={auditLoading}
          onClick={() => onNavigate('platform-health')}
        />
      </div>

      {/* Resultados clínicos agregados */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#E8EDED]/50">
          Resultados clínicos
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <MetricCard
            label="Aplicações (quantidade)"
            value={clinicalOutcomes.totalAplicacoesQuantidade.toLocaleString('pt-BR')}
            loading={loading.pacientes}
          />
          <MetricCard
            label="Aplicações (mg)"
            value={`${clinicalOutcomes.totalAplicacoesMg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mg`}
            loading={loading.pacientes}
          />
          <MetricCard
            label="Peso perdido total"
            value={`${clinicalOutcomes.kgPerdidoTotal.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`}
            loading={loading.pacientes}
          />
          <MetricCard
            label="Redução abdominal total"
            value={`${clinicalOutcomes.circunferenciaAbdominalReduzidaTotalCm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} cm`}
            loading={loading.pacientes}
          />
          <MetricCard
            label="Calorias perdidas"
            value={`${clinicalOutcomes.totalCaloriasPerdidas.toLocaleString('pt-BR')} kcal`}
            hint="Equivalente ao peso total perdido"
            loading={loading.pacientes}
          />
        </div>
      </section>

      {/* Seção 1 — Resumo */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#E8EDED]/50">
          Resumo da organização
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs text-[#E8EDED]/50">Domínio</p>
            <p className="mt-1 text-sm font-medium text-[#E8EDED]">{domainUrl}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs text-[#E8EDED]/50">Status</p>
            <p className="mt-1 text-sm font-medium text-[#4CCB7A]">Ativa</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-xs text-[#E8EDED]/50">Solicitações pendentes</p>
            <p className="mt-1 text-sm font-medium text-[#E8EDED]">
              {loading.team ? '…' : metrics.solicitacoesPendentes}
            </p>
          </div>
        </div>
      </section>

      {/* Seção 2 — Equipe */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#E8EDED]/50">Equipe</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: 'Médicos', total: metrics.totalMedicos, verified: metrics.medicosVerificados, menuId: 'medicos', icon: Stethoscope },
            { label: 'Nutricionistas', total: metrics.totalNutricionistas, verified: metrics.nutricionistasVerificados, menuId: 'nutricionistas', icon: UtensilsCrossed },
            { label: 'Personais', total: metrics.totalPersonalTrainers, verified: metrics.personalTrainersVerificados, menuId: 'personal_trainers', icon: Dumbbell },
          ].map(({ label, total, verified, menuId, icon: Icon }) => (
            <button
              key={menuId}
              type="button"
              onClick={() => onNavigate(menuId)}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:border-[#4CCB7A]/30 transition-colors"
            >
              <Icon className="h-5 w-5 text-[#4CCB7A]" />
              <div>
                <p className="text-sm font-medium text-[#E8EDED]">{label}</p>
                <p className="text-xs text-[#E8EDED]/50">
                  {loading.team ? 'Carregando…' : `${total} · ${verified} verificados`}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Seção 3 — Pacientes e leads */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#E8EDED]/50">
          Pacientes e leads
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Em tratamento"
            value={metrics.pacientesEmTratamento}
            loading={loading.pacientes}
          />
          <MetricCard
            label="Pendentes"
            value={metrics.pacientesPendentes}
            loading={loading.pacientes}
          />
          <MetricCard
            label="Concluídos"
            value={metrics.pacientesConcluidos}
            loading={loading.pacientes}
          />
          <MetricCard
            label="Pacientes internos"
            value={metrics.pacientesCompartilhados}
            hint="Compartilhados entre profissionais"
            loading={loading.compartilhados}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            label="Leads ativos"
            value={metrics.totalLeadsAtivos}
            loading={loading.leads}
            onClick={() => onNavigate('leads')}
          />
          <MetricCard
            label="NPS geral"
            value={formatNps(metrics.npsGeral)}
            loading={loading.nps}
            onClick={() => onNavigate('nps')}
          />
        </div>
      </section>

      {/* Seção 4 — Saúde dos dados */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#E8EDED]/50">
          Saúde dos dados
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Cobertura organizationId"
            value={coveragePercent != null ? `${coveragePercent}%` : '—'}
            hint={audit ? `${audit.organization.totalDocuments} documentos` : undefined}
            loading={auditLoading}
            onClick={() => onNavigate('platform-health')}
          />
          <MetricCard
            label="Sem organizationId"
            value={audit?.organization.withoutOrganizationId ?? '—'}
            loading={auditLoading}
            onClick={() => onNavigate('platform-health')}
          />
          <MetricCard
            label="Links públicos"
            value={publicLinksTotal ?? '—'}
            hint={audit ? `${audit.publicLinks.withoutOrganizationId} sem org` : undefined}
            loading={auditLoading}
            onClick={() => onNavigate('platform-health')}
          />
          <MetricCard
            label="Agenda / solicitações"
            value={metrics.solicitacoesPendentes}
            hint="Solicitações de médico pendentes"
            loading={loading.team}
            onClick={() => onNavigate('calendario')}
          />
        </div>
      </section>

      {/* Seção 5 — Atalhos rápidos */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#E8EDED]/50">
          Atalhos rápidos
        </h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Marca', menuId: 'organizacao-metodo-branding', icon: Building2 },
            { label: 'Médicos', menuId: 'medicos', icon: Stethoscope },
            { label: 'Pacientes', menuId: 'pacientes', icon: Users },
            { label: 'Leads', menuId: 'leads', icon: Target },
            { label: 'NPS', menuId: 'nps', icon: TrendingUp },
            { label: 'Calendário', menuId: 'calendario', icon: Calendar },
            { label: 'Saúde da Plataforma', menuId: 'platform-health', icon: ShieldCheck },
            { label: 'Links públicos', menuId: 'platform-health', icon: Link2 },
          ].map(({ label, menuId, icon: Icon }) => (
            <button
              key={`${menuId}-${label}`}
              type="button"
              onClick={() => onNavigate(menuId)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-[#E8EDED] hover:border-[#4CCB7A]/40 hover:bg-[#4CCB7A]/10 transition-colors"
            >
              <Icon className="h-4 w-4 text-[#4CCB7A]" />
              {label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
