'use client';

import type { WeightAgeFilter, WeightDoseFilter, WeightSexFilter } from '@/lib/metaadmin/dashboard/weightEvolutionAnalysis';

type Props = {
  filtroDose: WeightDoseFilter;
  filtroFaixaEtaria: WeightAgeFilter;
  filtroSexo: WeightSexFilter;
  onDoseChange: (value: WeightDoseFilter) => void;
  onFaixaChange: (value: WeightAgeFilter) => void;
  onSexoChange: (value: WeightSexFilter) => void;
  className?: string;
};

const selectClass =
  'w-full rounded-[10px] border bg-[var(--surface-card)] px-2.5 py-2 text-[13px] text-[var(--text-primary)] outline-none';

export default function DashboardWeightFilters({
  filtroDose,
  filtroFaixaEtaria,
  filtroSexo,
  onDoseChange,
  onFaixaChange,
  onSexoChange,
  className,
}: Props) {
  return (
    <div className={className ?? 'grid grid-cols-1 gap-3 sm:grid-cols-3'}>
      <label className="block min-w-0">
        <span className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">Dose média</span>
        <select
          value={filtroDose}
          onChange={(e) => onDoseChange(e.target.value)}
          className={selectClass}
          style={{ borderColor: 'var(--border-default)' }}
        >
          <option value="todas">Todas as doses</option>
          {['2.5', '5.0', '7.5', '10', '12.5', '15'].map((dose) => (
            <option key={dose} value={dose}>
              {dose} mg
            </option>
          ))}
        </select>
      </label>
      <label className="block min-w-0">
        <span className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">Faixa etária</span>
        <select
          value={filtroFaixaEtaria}
          onChange={(e) => onFaixaChange(e.target.value as WeightAgeFilter)}
          className={selectClass}
          style={{ borderColor: 'var(--border-default)' }}
        >
          <option value="todas">Todas</option>
          <option value="18-24">18–24 anos</option>
          <option value="25-40">25–40 anos</option>
          <option value="41-65">41–65 anos</option>
          <option value="65+">&gt;65 anos</option>
        </select>
      </label>
      <label className="block min-w-0">
        <span className="mb-1 block text-[11px] font-medium text-[var(--text-secondary)]">Sexo</span>
        <select
          value={filtroSexo}
          onChange={(e) => onSexoChange(e.target.value as WeightSexFilter)}
          className={selectClass}
          style={{ borderColor: 'var(--border-default)' }}
        >
          <option value="todos">Todos</option>
          <option value="M">Masculino</option>
          <option value="F">Feminino</option>
        </select>
      </label>
    </div>
  );
}
