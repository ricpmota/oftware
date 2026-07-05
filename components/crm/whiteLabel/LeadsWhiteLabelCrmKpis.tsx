'use client';

import { useWhiteLabelCrmTheme } from '@/components/crm/whiteLabel/WhiteLabelCrmProvider';
import type { WhiteLabelCrmKpis } from '@/lib/whiteLabel/leadCrmService';

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

const cards: { key: keyof WhiteLabelCrmKpis; label: string; format?: 'currency' }[] = [
  { key: 'totalLeads', label: 'Total de Leads' },
  { key: 'hotLeads', label: 'Leads Quentes' },
  { key: 'meetingsScheduled', label: 'Reuniões Agendadas' },
  { key: 'meetingsCompleted', label: 'Reuniões Realizadas' },
  { key: 'proposalsSent', label: 'Propostas Enviadas' },
  { key: 'closedDeals', label: 'Fechamentos' },
  { key: 'projectedRevenue', label: 'Receita Projetada', format: 'currency' },
  { key: 'realizedRevenue', label: 'Receita Realizada', format: 'currency' },
];

export default function LeadsWhiteLabelCrmKpis({ kpis }: { kpis: WhiteLabelCrmKpis }) {
  const t = useWhiteLabelCrmTheme();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
      {cards.map(({ key, label, format }) => (
        <div key={key} className={`${t.cardBg} border ${t.cardBorder} rounded-xl px-3 py-3 min-w-0`}>
          <p className={`text-[10px] uppercase tracking-wide ${t.textSubtle} truncate`}>{label}</p>
          <p className={`text-lg font-bold ${t.textPrimary} mt-1 tabular-nums`}>
            {format === 'currency' ? formatCurrency(kpis[key]) : kpis[key]}
          </p>
        </div>
      ))}
    </div>
  );
}
