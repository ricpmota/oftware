'use client';

import type { LucideIcon } from 'lucide-react';
import { Activity, Dumbbell, Info, Stethoscope, Users } from 'lucide-react';

type Tone = 'amber' | 'blue' | 'green';

const TONE: Record<Tone, string> = {
  amber: 'bg-amber-50 text-amber-600',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-emerald-50 text-emerald-600',
};

function CompactKpi({
  label,
  value,
  description,
  icon: Icon,
  tone,
  loading,
  info,
}: {
  label: string;
  value: number;
  description: string;
  icon: LucideIcon;
  tone: Tone;
  loading?: boolean;
  info?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${TONE[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[13px] font-semibold text-gray-800">
              {label}
              {info ? (
                <span className="group relative inline-flex">
                  <Info className="h-3.5 w-3.5 text-gray-400" aria-label={info} />
                  <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 hidden w-56 -translate-x-1/2 rounded-lg bg-gray-900 px-2.5 py-1.5 text-[11px] font-normal leading-snug text-white shadow-lg group-hover:block">
                    {info}
                  </span>
                </span>
              ) : null}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-gray-500">{description}</p>
          </div>
          <p className="shrink-0 text-[26px] font-extrabold leading-none text-gray-900">
            {loading ? '—' : value}
          </p>
        </div>
      </div>
    </div>
  );
}

type Props = {
  totalPacientes: number;
  comTreino: number;
  semTreino: number;
  medicos: number;
  loadingCoverage: boolean;
};

export function TreinosKpiRow({
  totalPacientes,
  comTreino,
  semTreino,
  medicos,
  loadingCoverage,
}: Props) {
  const coverageInfo = 'Com treino = possui sessão ativa recente ou futura nesta janela.';

  return (
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <CompactKpi
        label="Pacientes"
        value={totalPacientes}
        description="Compartilhados ativos"
        icon={Users}
        tone="blue"
      />
      <CompactKpi
        label="Com treino"
        value={comTreino}
        description="Sessão ativa na janela"
        icon={Dumbbell}
        tone="green"
        loading={loadingCoverage}
        info={coverageInfo}
      />
      <CompactKpi
        label="Sem treino"
        value={semTreino}
        description="Sem sessão ativa na janela"
        icon={Activity}
        tone="amber"
        loading={loadingCoverage}
        info={coverageInfo}
      />
      <CompactKpi
        label="Médicos"
        value={medicos}
        description="Médicos vinculados"
        icon={Stethoscope}
        tone="blue"
      />
    </section>
  );
}
