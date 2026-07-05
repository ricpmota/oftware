'use client';

import { useMedicoLeadsCrmTheme } from '@/components/crm/medico/MedicoLeadsCrmProvider';
import type { LeadReferralKpis } from '@/lib/crm/resolveLeadReferral';

const ROW: { key: keyof LeadReferralKpis; label: string; dot: string }[] = [
  { key: 'nutricionista', label: 'Nutricionistas', dot: 'bg-violet-500' },
  { key: 'personal', label: 'Personais', dot: 'bg-emerald-500' },
  { key: 'paciente', label: 'Pacientes', dot: 'bg-amber-400' },
  { key: 'medico', label: 'Direto', dot: 'bg-sky-500' },
  { key: 'manual', label: 'Manual', dot: 'bg-slate-700' },
  { key: 'desconhecido', label: 'Desconhecido', dot: 'bg-slate-300 dark:bg-slate-600' },
];

export default function LeadsMedicoReferralKpis({ kpis }: { kpis: LeadReferralKpis }) {
  const t = useMedicoLeadsCrmTheme();

  return (
    <div className={`${t.panelBg} border ${t.panelBorder} rounded-xl p-3`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${t.textSubtle}`}>
        Pacientes por origem
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {ROW.map(({ key, label, dot }) => (
          <div key={key} className={`${t.cardBg} border ${t.cardBorder} rounded-lg px-3 py-2 min-w-0`}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />
              <p className={`text-[10px] truncate ${t.textMuted}`}>{label}</p>
            </div>
            <p className={`text-base font-bold tabular-nums ${t.textPrimary}`}>{kpis[key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
