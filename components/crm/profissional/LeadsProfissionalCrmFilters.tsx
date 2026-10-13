'use client';

import { Search } from 'lucide-react';
import { useProfissionalCrmRole, useProfissionalCrmTheme } from '@/components/crm/profissional/ProfissionalCrmProvider';
import { getLeadProfissionalCrmStages } from '@/types/leadProfissionalCrm';

export type ProfissionalCrmFiltersState = {
  busca: string;
  status: string;
  medicoId: string;
};

type Props = {
  filters: ProfissionalCrmFiltersState;
  onChange: (next: ProfissionalCrmFiltersState) => void;
  medicos: { id: string; nome: string }[];
};

export default function LeadsProfissionalCrmFilters({ filters, onChange, medicos }: Props) {
  const t = useProfissionalCrmTheme();
  const role = useProfissionalCrmRole();
  const stages = getLeadProfissionalCrmStages(role);

  return (
    <div
      className={`${t.panelBg} border ${t.panelBorder} grid grid-cols-1 gap-2 rounded-xl p-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-2 lg:rounded-2xl`}
    >
      <div className="relative sm:col-span-2 lg:min-w-[16rem] lg:flex-1">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.inputIcon}`} />
        <input
          type="search"
          placeholder="Buscar nome, e-mail ou telefone..."
          value={filters.busca}
          onChange={(e) => onChange({ ...filters, busca: e.target.value })}
          className={`${t.input} pl-9 lg:h-10 lg:rounded-lg`}
        />
      </div>
      <select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
        className={`${t.input} lg:h-10 lg:w-52 lg:shrink-0 lg:rounded-lg`}
      >
        <option value="">Todos os estágios</option>
        {stages.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <select
        value={filters.medicoId}
        onChange={(e) => onChange({ ...filters, medicoId: e.target.value })}
        className={`${t.input} lg:h-10 lg:w-52 lg:shrink-0 lg:rounded-lg`}
      >
        <option value="">Todos os médicos</option>
        {medicos.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nome}
          </option>
        ))}
      </select>
    </div>
  );
}
