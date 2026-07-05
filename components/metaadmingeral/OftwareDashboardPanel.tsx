'use client';

import {
  Activity,
  Building2,
  Flame,
  Layers,
  Loader2,
  Pill,
  Ruler,
  Scale,
  Stethoscope,
  Target,
  Users,
} from 'lucide-react';
import type { OrganizationDefinition } from '@/lib/organization/organizationTypes';
import type { OrganizationClinicalOutcomeMetrics } from '@/lib/metaadmingeral/buildOrganizationClinicalOutcomeMetrics';
import type { OrganizationDashboardMetrics } from '@/lib/metaadmingeral/buildOrganizationDashboardMetrics';

type OftwareDashboardLoading = {
  team: boolean;
  pacientes: boolean;
  leads: boolean;
};

type OftwareDashboardPanelProps = {
  organizations: OrganizationDefinition[];
  metrics: OrganizationDashboardMetrics;
  clinicalOutcomes: OrganizationClinicalOutcomeMetrics;
  loading: OftwareDashboardLoading;
  onOpenOrganization?: () => void;
};

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: typeof Layers;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center gap-2 text-[#E8EDED]/60">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-bold text-[#E8EDED]">
        {loading ? <Loader2 className="inline h-6 w-6 animate-spin text-[#4CCB7A]" /> : value}
      </p>
      {hint ? <p className="mt-1 text-sm text-[#E8EDED]/60">{hint}</p> : null}
    </div>
  );
}

export default function OftwareDashboardPanel({
  organizations,
  metrics,
  clinicalOutcomes,
  loading,
  onOpenOrganization,
}: OftwareDashboardPanelProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-[#E8EDED]">Dashboard Oftware</h2>
        <p className="mt-1 text-sm text-[#E8EDED]/60">
          Plataforma SaaS — totais consolidados de todas as organizações
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#E8EDED]/50">
          Plataforma
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Organizações"
            value={organizations.length}
            hint={`${organizations.length === 1 ? 'Ativa' : 'Ativas'} na plataforma`}
            icon={Layers}
          />
          <SummaryCard
            label="Médicos"
            value={metrics.totalMedicos}
            hint={`${metrics.medicosVerificados} verificados`}
            icon={Stethoscope}
            loading={loading.team}
          />
          <SummaryCard
            label="Pacientes"
            value={metrics.totalPacientes}
            hint={`${metrics.pacientesEmTratamento} em tratamento`}
            icon={Users}
            loading={loading.pacientes}
          />
          <SummaryCard
            label="Leads ativos"
            value={metrics.totalLeadsAtivos}
            hint={`${metrics.totalLeads} no histórico`}
            icon={Target}
            loading={loading.leads}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#E8EDED]/50">
          Resultados clínicos — todas as organizações
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <SummaryCard
            label="Aplicações (quantidade)"
            value={clinicalOutcomes.totalAplicacoesQuantidade.toLocaleString('pt-BR')}
            icon={Activity}
            loading={loading.pacientes}
          />
          <SummaryCard
            label="Aplicações (mg)"
            value={`${clinicalOutcomes.totalAplicacoesMg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mg`}
            icon={Pill}
            loading={loading.pacientes}
          />
          <SummaryCard
            label="Peso perdido total"
            value={`${clinicalOutcomes.kgPerdidoTotal.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg`}
            icon={Scale}
            loading={loading.pacientes}
          />
          <SummaryCard
            label="Redução abdominal total"
            value={`${clinicalOutcomes.circunferenciaAbdominalReduzidaTotalCm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} cm`}
            icon={Ruler}
            loading={loading.pacientes}
          />
          <SummaryCard
            label="Calorias perdidas"
            value={`${clinicalOutcomes.totalCaloriasPerdidas.toLocaleString('pt-BR')} kcal`}
            hint="Equivalente ao peso total perdido"
            icon={Flame}
            loading={loading.pacientes}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#E8EDED]/50">
          Equipe e pacientes
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Nutricionistas"
            value={metrics.totalNutricionistas}
            hint={`${metrics.nutricionistasVerificados} verificados`}
            icon={Users}
            loading={loading.team}
          />
          <SummaryCard
            label="Personais"
            value={metrics.totalPersonalTrainers}
            hint={`${metrics.personalTrainersVerificados} verificados`}
            icon={Users}
            loading={loading.team}
          />
          <SummaryCard
            label="Pacientes concluídos"
            value={metrics.pacientesConcluidos}
            icon={Target}
            loading={loading.pacientes}
          />
          <SummaryCard
            label="Pacientes compartilhados"
            value={metrics.pacientesCompartilhados}
            icon={Users}
            loading={loading.pacientes}
          />
        </div>
      </section>

      {onOpenOrganization && organizations.length > 0 ? (
        <button
          type="button"
          onClick={onOpenOrganization}
          className="inline-flex items-center gap-2 rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/10 px-4 py-2 text-sm font-medium text-[#22C55E] transition-colors hover:bg-[#22C55E]/20"
        >
          <Building2 className="h-4 w-4" />
          Ver organizações
        </button>
      ) : null}
    </div>
  );
}
