'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import DashboardAbandonmentReasons from '@/components/metaadmin/dashboard/DashboardAbandonmentReasons';
import DashboardAgeDistribution from '@/components/metaadmin/dashboard/DashboardAgeDistribution';
import DashboardAverageAge from '@/components/metaadmin/dashboard/DashboardAverageAge';
import DashboardBaseSegmentedControl from '@/components/metaadmin/dashboard/DashboardBaseSegmentedControl';
import DashboardGenderDistribution from '@/components/metaadmin/dashboard/DashboardGenderDistribution';
import DashboardHeroKpi from '@/components/metaadmin/dashboard/DashboardHeroKpi';
import DashboardKpiCard from '@/components/metaadmin/dashboard/DashboardKpiCard';
import DashboardPatientExperience from '@/components/metaadmin/dashboard/DashboardPatientExperience';
import DashboardPortfolioSummary from '@/components/metaadmin/dashboard/DashboardPortfolioSummary';
import DashboardTreatmentMetrics from '@/components/metaadmin/dashboard/DashboardTreatmentMetrics';
import DashboardWeightEvolution from '@/components/metaadmin/dashboard/DashboardWeightEvolution';
import DashboardDepoimentoResultadoModal from '@/components/profissional/dashboard/DashboardDepoimentoResultadoModal';
import { resolvePacienteCadastroDate } from '@/lib/metaadmin/dashboard/patientGrowthMetrics';
import type { WeightAgeFilter, WeightSexFilter } from '@/lib/metaadmin/dashboard/weightEvolutionAnalysis';
import {
  buildDashboardDepoimentosFromPacientes,
  collectDepoimentoAuthUserIds,
  computeTreatmentTotals,
} from '@/lib/profissional/dashboard/buildDashboardDepoimentos';
import type { PacienteCompleto } from '@/types/obesidade';
import type { DashboardDepoimento } from '@/components/metaadmin/dashboard/DashboardTestimonialCard';
import type { OrganizationShellChrome } from '@/lib/organization/resolveOrganizationShellChrome';

type BaseFiltro = 'meus' | 'oftware';

type FinancialTotals = {
  recebido: number;
  emAberto: number;
  previsto: number;
};

type Props = {
  pacientesOwn: PacienteCompleto[];
  todosPacientesOftware: PacienteCompleto[];
  loadingTodosPacientes: boolean;
  filtroBase: BaseFiltro;
  onFiltroBaseChange: (next: BaseFiltro) => void;
  organizationName: string;
  navyColor?: string;
  chrome?: OrganizationShellChrome | null;
  filtroDose: string;
  filtroFaixaEtaria: string;
  filtroSexo: string;
  onDoseChange: (value: string) => void;
  onFaixaChange: (value: string) => void;
  onSexoChange: (value: string) => void;
  onOpenPaciente: (pacienteId: string) => void;
  medicosVinculados?: number;
  financial?: FinancialTotals;
  afterStatusKpis?: ReactNode;
};

function toDateNasc(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    try {
      const d = (value as { toDate: () => Date }).toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  }
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

function idadeFromNasc(dataNasc: unknown): number | null {
  const dataNascimento = toDateNasc(dataNasc);
  if (!dataNascimento) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - dataNascimento.getFullYear();
  if (
    hoje.getMonth() < dataNascimento.getMonth() ||
    (hoje.getMonth() === dataNascimento.getMonth() && hoje.getDate() < dataNascimento.getDate())
  ) {
    idade--;
  }
  return idade > 0 ? idade : null;
}

function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ProfissionalDashboardHome({
  pacientesOwn,
  todosPacientesOftware,
  loadingTodosPacientes,
  filtroBase,
  onFiltroBaseChange,
  organizationName,
  navyColor,
  chrome,
  filtroDose,
  filtroFaixaEtaria,
  filtroSexo,
  onDoseChange,
  onFaixaChange,
  onSexoChange,
  onOpenPaciente,
  medicosVinculados,
  financial,
  afterStatusKpis,
}: Props) {
  const [isMobile, setIsMobile] = useState(false);
  const [photoByUserId, setPhotoByUserId] = useState<Record<string, string | null>>({});
  const [depoimentoSelecionado, setDepoimentoSelecionado] = useState<DashboardDepoimento | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const pacientesKpi =
    filtroBase === 'oftware' && todosPacientesOftware.length > 0 ? todosPacientesOftware : pacientesOwn;
  const loadingOrg = filtroBase === 'oftware' && loadingTodosPacientes && todosPacientesOftware.length === 0;

  const totalPacientes = pacientesKpi.length;
  const cadastroTimestamps = pacientesKpi
    .map((p) => resolvePacienteCadastroDate(p)?.getTime())
    .filter((t): t is number => typeof t === 'number');
  const pacientesPendentes = pacientesKpi.filter((p) => p.statusTratamento === 'pendente').length;
  const pacientesEmTratamento = pacientesKpi.filter((p) => p.statusTratamento === 'em_tratamento').length;
  const pacientesConcluidos = pacientesKpi.filter((p) => p.statusTratamento === 'concluido').length;
  const pacientesAbandono = pacientesKpi.filter((p) => p.statusTratamento === 'abandono').length;
  const { totalMgAplicado, totalPesoPerdido } = computeTreatmentTotals(pacientesKpi);
  const ownPatientIds = pacientesOwn.flatMap((p) => [p.id, p.userId].filter(Boolean) as string[]);

  const depoimentoUserIds = useMemo(() => collectDepoimentoAuthUserIds(pacientesOwn), [pacientesOwn]);

  useEffect(() => {
    const missing = depoimentoUserIds.filter((id) => !Object.prototype.hasOwnProperty.call(photoByUserId, id));
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/user-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds: missing }),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { photos?: Record<string, string | null> };
        if (cancelled || !data.photos) return;
        setPhotoByUserId((prev) => {
          const next = { ...prev };
          for (const id of missing) next[id] = data.photos?.[id] ?? null;
          return next;
        });
      } catch {
        if (cancelled) return;
        setPhotoByUserId((prev) => {
          const next = { ...prev };
          for (const id of missing) {
            if (!Object.prototype.hasOwnProperty.call(next, id)) next[id] = null;
          }
          return next;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depoimentoUserIds]);

  const depoimentos = useMemo(
    () => buildDashboardDepoimentosFromPacientes(pacientesOwn, photoByUserId),
    [pacientesOwn, photoByUserId]
  );

  return (
    <div className="min-w-0 w-full space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
        {typeof medicosVinculados === 'number' ? (
          <p className="text-[13px] text-[var(--text-secondary)] sm:mr-auto">
            {medicosVinculados} médico{medicosVinculados === 1 ? '' : 's'} vinculado
            {medicosVinculados === 1 ? '' : 's'}
          </p>
        ) : null}
        <DashboardBaseSegmentedControl
          value={filtroBase}
          onChange={onFiltroBaseChange}
          organizationName={organizationName}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
        <DashboardHeroKpi
          total={totalPacientes}
          cadastroTimestamps={cadastroTimestamps}
          navyColor={chrome?.secondaryColor ?? navyColor}
          chrome={chrome}
        />
        <DashboardKpiCard
          label="Pendentes"
          value={pacientesPendentes}
          description="Aguardando início"
          metodoIcon="pendente"
          total={totalPacientes}
          chrome={chrome}
        />
        <DashboardKpiCard
          label="Em tratamento"
          value={pacientesEmTratamento}
          description="Acompanhamento ativo"
          metodoIcon="em-tratamento"
          total={totalPacientes}
          chrome={chrome}
        />
        <DashboardKpiCard
          label="Concluídos"
          value={pacientesConcluidos}
          description="Tratamentos finalizados"
          metodoIcon="concluido"
          total={totalPacientes}
          chrome={chrome}
        />
        <DashboardKpiCard
          label="Abandonos"
          value={pacientesAbandono}
          description="Interrompidos"
          metodoIcon="abandono"
          total={totalPacientes}
          chrome={chrome}
        />
      </div>

      {afterStatusKpis}

      <DashboardTreatmentMetrics totalMgAplicado={totalMgAplicado} totalPesoPerdido={totalPesoPerdido} chrome={chrome} />

      <DashboardPortfolioSummary
        emTratamento={pacientesEmTratamento}
        pendentes={pacientesPendentes}
        concluidos={pacientesConcluidos}
        abandonos={pacientesAbandono}
      />

      <DemografiaSection pacientes={pacientesKpi} loading={loadingOrg} />
      <CidadesSection pacientes={pacientesOwn} />

      <DashboardWeightEvolution
        pacientes={pacientesKpi}
        ownPatientIds={ownPatientIds}
        loading={loadingOrg}
        filtroDose={filtroDose}
        filtroFaixaEtaria={filtroFaixaEtaria as WeightAgeFilter}
        filtroSexo={filtroSexo as WeightSexFilter}
        onDoseChange={onDoseChange}
        onFaixaChange={(v) => onFaixaChange(v)}
        onSexoChange={(v) => onSexoChange(v)}
        onOpenPaciente={onOpenPaciente}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(300px,420px)_minmax(0,1fr)]">
        <DashboardAbandonmentReasons
          pacientes={pacientesKpi}
          ownPatientIds={ownPatientIds}
          onOpenPaciente={onOpenPaciente}
        />
        <DashboardPatientExperience
          depoimentos={depoimentos}
          loading={false}
          onOpenDepoimento={setDepoimentoSelecionado}
        />
      </div>

      {financial ? (
        <div
          className="border bg-[var(--surface-card)]"
          style={{ borderColor: 'var(--border-default)', borderRadius: 20 }}
        >
          <div className="p-5 sm:p-6">
            <h3 className="mb-4 text-[16px] font-semibold text-[var(--text-primary)]">Estatísticas financeiras</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <p className="text-[12px] text-[var(--text-secondary)]">Receitas recebidas</p>
                <p className="mt-1 text-[22px] font-extrabold tabular-nums text-emerald-700">
                  R$ {formatMoney(financial.recebido)}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[var(--text-secondary)]">Em aberto</p>
                <p className="mt-1 text-[22px] font-extrabold tabular-nums text-amber-700">
                  R$ {formatMoney(financial.emAberto)}
                </p>
              </div>
              <div>
                <p className="text-[12px] text-[var(--text-secondary)]">Total previsto</p>
                <p className="mt-1 text-[22px] font-extrabold tabular-nums text-[var(--text-primary)]">
                  R$ {formatMoney(financial.previsto)}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {depoimentoSelecionado ? (
        <DashboardDepoimentoResultadoModal
          depoimento={depoimentoSelecionado}
          isMobile={isMobile}
          onClose={() => setDepoimentoSelecionado(null)}
        />
      ) : null}
    </div>
  );
}

function DemografiaSection({ pacientes, loading }: { pacientes: PacienteCompleto[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="border bg-[var(--surface-card)]" style={{ borderColor: 'var(--border-default)', borderRadius: 20 }}>
        <div className="p-5 sm:p-6">
          <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Demografia dos Pacientes</h3>
          <div className="flex items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
            <span className="ml-3 text-gray-600">Carregando base...</span>
          </div>
        </div>
      </div>
    );
  }

  const idades = pacientes
    .map((p) => idadeFromNasc(p.dadosIdentificacao?.dataNascimento))
    .filter((idade): idade is number => idade != null);
  const idadeMedia = idades.length > 0 ? idades.reduce((sum, idade) => sum + idade, 0) / idades.length : 0;
  const totalComIdade = idades.length;
  const faixas = {
    '18-24': idades.filter((idade) => idade >= 18 && idade <= 24).length,
    '25-40': idades.filter((idade) => idade >= 25 && idade <= 40).length,
    '41-65': idades.filter((idade) => idade >= 41 && idade <= 65).length,
    '65+': idades.filter((idade) => idade > 65).length,
  };
  const porcentagensFaixas = {
    '18-24': totalComIdade > 0 ? (faixas['18-24'] / totalComIdade) * 100 : 0,
    '25-40': totalComIdade > 0 ? (faixas['25-40'] / totalComIdade) * 100 : 0,
    '41-65': totalComIdade > 0 ? (faixas['41-65'] / totalComIdade) * 100 : 0,
    '65+': totalComIdade > 0 ? (faixas['65+'] / totalComIdade) * 100 : 0,
  };
  const homens = pacientes.filter((p) => p.dadosIdentificacao?.sexoBiologico === 'M').length;
  const mulheres = pacientes.filter((p) => p.dadosIdentificacao?.sexoBiologico === 'F').length;
  const outroSexo = pacientes.filter((p) => p.dadosIdentificacao?.sexoBiologico === 'Outro').length;
  const semInformacaoSexo = Math.max(0, pacientes.length - homens - mulheres - outroSexo);

  return (
    <div className="border bg-[var(--surface-card)]" style={{ borderColor: 'var(--border-default)', borderRadius: 20 }}>
      <div className="p-5 sm:p-6">
        <h3 className="mb-5 text-lg font-semibold text-[var(--text-primary)]">Demografia dos Pacientes</h3>
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-8">
          <div className="xl:w-[220px] xl:shrink-0">
            <DashboardAverageAge idadeMedia={idadeMedia} totalComNascimento={totalComIdade} />
          </div>
          <DashboardAgeDistribution percentages={porcentagensFaixas} hasData={totalComIdade > 0} />
          <DashboardGenderDistribution
            feminino={mulheres}
            masculino={homens}
            outro={outroSexo}
            semInformacao={semInformacaoSexo}
          />
        </div>
      </div>
    </div>
  );
}

function CidadesSection({ pacientes }: { pacientes: PacienteCompleto[] }) {
  const normalizar = (cidade: string, estado: string) => {
    const cidadeNormalizada = cidade
      .trim()
      .replace(/\s+/g, ' ')
      .split(' ')
      .map((palavra) => (palavra ? palavra.charAt(0).toUpperCase() + palavra.slice(1).toLowerCase() : ''))
      .join(' ')
      .trim();
    return `${cidadeNormalizada}, ${estado.trim().toUpperCase()}`;
  };
  const count: Record<string, number> = {};
  pacientes.forEach((p) => {
    const cidade = p.dadosIdentificacao?.endereco?.cidade;
    const estado = p.dadosIdentificacao?.endereco?.estado;
    if (!cidade?.trim() || !estado?.trim()) return;
    const key = normalizar(cidade, estado);
    count[key] = (count[key] || 0) + 1;
  });
  const top = Object.entries(count)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const totalComCidade = Object.values(count).reduce((s, n) => s + n, 0);
  const cores = ['#0A1F44', '#1e3a5f', '#334155', '#64748b', '#94a3b8'];

  return (
    <div className="border bg-[var(--surface-card)]" style={{ borderColor: 'var(--border-default)', borderRadius: 20 }}>
      <div className="p-5 sm:p-6">
        <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Top cidades</h3>
        {top.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-secondary)]">Nenhum dado de cidade disponível</p>
        ) : (
          <>
            <div className="space-y-3">
              {top.map(([cidadeEstado, n], index) => (
                <div key={cidadeEstado} className="flex min-w-0 items-center gap-2">
                  <span className="w-40 min-w-0 flex-shrink-0 truncate text-sm text-[var(--text-secondary)]">
                    {cidadeEstado}
                  </span>
                  <div
                    className="h-2 min-w-0 w-full max-w-xs rounded-full bg-gray-200"
                  >
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${totalComCidade > 0 ? (n / totalComCidade) * 100 : 0}%`,
                        backgroundColor: cores[index] || cores[cores.length - 1],
                      }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm font-semibold text-[var(--text-primary)]">
                    {totalComCidade > 0 ? ((n / totalComCidade) * 100).toFixed(1) : '0.0'}%
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-[var(--text-secondary)]">
              {totalComCidade} paciente{totalComCidade !== 1 ? 's' : ''} com cidade cadastrada
            </p>
          </>
        )}
      </div>
    </div>
  );
}
