'use client';

import { Search } from 'lucide-react';
import { useMedicoLeadsCrmTheme } from '@/components/crm/medico/MedicoLeadsCrmProvider';
import type { LeadMedicoStatus, LeadReferralType } from '@/types/leadMedico';
import { LEAD_MEDICO_CRM_STAGES } from '@/types/leadMedicoCrm';

export type MedicoCrmFiltersState = {
  busca: string;
  status: LeadMedicoStatus | '';
  estado: string;
  minEstrelas: string;
  origem: LeadReferralType | 'desconhecido' | '';
};

const ORIGEM_OPTIONS: { value: MedicoCrmFiltersState['origem']; label: string }[] = [
  { value: '', label: 'Todas as origens' },
  { value: 'nutricionista', label: 'Nutricionista' },
  { value: 'personal', label: 'Personal' },
  { value: 'paciente', label: 'Paciente' },
  { value: 'medico', label: 'Médico' },
  { value: 'manual', label: 'Manual' },
  { value: 'desconhecido', label: 'Desconhecida' },
];

type Props = {
  filters: MedicoCrmFiltersState;
  onChange: (next: MedicoCrmFiltersState) => void;
  estados: string[];
};

export default function LeadsMedicoCrmFilters({ filters, onChange, estados }: Props) {
  const t = useMedicoLeadsCrmTheme();

  return (
    <div className={`${t.panelBg} border ${t.panelBorder} grid grid-cols-1 gap-2 rounded-xl p-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-2 lg:rounded-2xl`}>
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
        onChange={(e) => onChange({ ...filters, status: e.target.value as LeadMedicoStatus | '' })}
        className={`${t.input} lg:h-10 lg:w-44 lg:shrink-0 lg:rounded-lg`}
      >
        <option value="">Todos os estágios</option>
        {LEAD_MEDICO_CRM_STAGES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <select
        value={filters.origem}
        onChange={(e) =>
          onChange({ ...filters, origem: e.target.value as MedicoCrmFiltersState['origem'] })
        }
        className={`${t.input} lg:h-10 lg:w-40 lg:shrink-0 lg:rounded-lg`}
      >
        {ORIGEM_OPTIONS.map((o) => (
          <option key={o.value || 'all'} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <select
        value={filters.estado}
        onChange={(e) => onChange({ ...filters, estado: e.target.value })}
        className={`${t.input} lg:h-10 lg:w-40 lg:shrink-0 lg:rounded-lg`}
      >
        <option value="">Todos os estados</option>
        {estados.map((uf) => (
          <option key={uf} value={uf}>
            {uf}
          </option>
        ))}
      </select>
      <select
        value={filters.minEstrelas}
        onChange={(e) => onChange({ ...filters, minEstrelas: e.target.value })}
        className={`${t.input} lg:h-10 lg:w-48 lg:shrink-0 lg:rounded-lg`}
      >
        <option value="">Qualquer classificação</option>
        <option value="1">1+ estrelas</option>
        <option value="2">2+ estrelas</option>
        <option value="3">3+ estrelas</option>
        <option value="4">4+ estrelas</option>
        <option value="5">5 estrelas</option>
      </select>
    </div>
  );
}
