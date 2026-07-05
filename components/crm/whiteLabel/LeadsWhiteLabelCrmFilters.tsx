'use client';

import { Search } from 'lucide-react';
import { useWhiteLabelCrmTheme } from '@/components/crm/whiteLabel/WhiteLabelCrmProvider';
import {
  WHITELABEL_CRM_STAGES,
  type WhiteLabelCrmStage,
  type WhiteLabelLeadScoreCategory,
} from '@/types/leadWhiteLabelCrm';

export type CrmFiltersState = {
  busca: string;
  stage: WhiteLabelCrmStage | '';
  score: WhiteLabelLeadScoreCategory | '';
  especialidade: string;
  estado: string;
  cidade: string;
  meetingDate: string;
};

type Props = {
  filters: CrmFiltersState;
  onChange: (patch: Partial<CrmFiltersState>) => void;
  especialidades: string[];
  estados: string[];
};

export default function LeadsWhiteLabelCrmFilters({ filters, onChange, especialidades, estados }: Props) {
  const t = useWhiteLabelCrmTheme();

  return (
    <div className={`${t.panelBg} border ${t.panelBorder} rounded-2xl p-4 space-y-3`}>
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${t.inputIcon}`} />
        <input
          type="text"
          value={filters.busca}
          onChange={(e) => onChange({ busca: e.target.value })}
          placeholder="Buscar por nome, CRM, WhatsApp ou e-mail..."
          className={`${t.input} pl-9`}
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <select
          value={filters.stage}
          onChange={(e) => onChange({ stage: e.target.value as WhiteLabelCrmStage | '' })}
          className={t.input}
        >
          <option value="" style={{ backgroundColor: t.selectOptionBg }}>
            Todos os estágios
          </option>
          {WHITELABEL_CRM_STAGES.map((s) => (
            <option key={s.value} value={s.value} style={{ backgroundColor: t.selectOptionBg }}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={filters.score}
          onChange={(e) => onChange({ score: e.target.value as WhiteLabelLeadScoreCategory | '' })}
          className={t.input}
        >
          <option value="" style={{ backgroundColor: t.selectOptionBg }}>
            Todos os scores
          </option>
          <option value="hot" style={{ backgroundColor: t.selectOptionBg }}>
            🔥 Quente
          </option>
          <option value="warm" style={{ backgroundColor: t.selectOptionBg }}>
            🌤 Morno
          </option>
          <option value="cold" style={{ backgroundColor: t.selectOptionBg }}>
            🥶 Frio
          </option>
        </select>
        <select
          value={filters.especialidade}
          onChange={(e) => onChange({ especialidade: e.target.value })}
          className={t.input}
        >
          <option value="" style={{ backgroundColor: t.selectOptionBg }}>
            Especialidade
          </option>
          {especialidades.map((e) => (
            <option key={e} value={e} style={{ backgroundColor: t.selectOptionBg }}>
              {e}
            </option>
          ))}
        </select>
        <select
          value={filters.estado}
          onChange={(e) => onChange({ estado: e.target.value })}
          className={t.input}
        >
          <option value="" style={{ backgroundColor: t.selectOptionBg }}>
            Estado
          </option>
          {estados.map((e) => (
            <option key={e} value={e} style={{ backgroundColor: t.selectOptionBg }}>
              {e}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={filters.cidade}
          onChange={(e) => onChange({ cidade: e.target.value })}
          placeholder="Cidade"
          className={t.input}
        />
        <input
          type="date"
          value={filters.meetingDate}
          onChange={(e) => onChange({ meetingDate: e.target.value })}
          className={t.input}
          title="Data da reunião"
        />
      </div>
    </div>
  );
}
