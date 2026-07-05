'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, GripVertical } from 'lucide-react';
import { useWhiteLabelCrmTheme } from '@/components/crm/whiteLabel/WhiteLabelCrmProvider';
import { formatLeadWhiteLabelWhatsAppDisplay } from '@/lib/whiteLabel/leadWhiteLabelNormalize';
import { scoreCategoryEmoji } from '@/lib/whiteLabel/calculateWhiteLabelLeadScore';
import type { LeadWhiteLabel } from '@/types/leadWhiteLabel';

type Props = {
  lead: LeadWhiteLabel;
  onOpen: (lead: LeadWhiteLabel) => void;
};

function formatMeeting(lead: LeadWhiteLabel): string | null {
  if (!lead.meeting?.date) return null;
  const d = new Date(`${lead.meeting.date}T12:00:00`);
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${date} ${lead.meeting.startTime}`;
}

export default function LeadsWhiteLabelPipelineCard({ lead, onOpen }: Props) {
  const t = useWhiteLabelCrmTheme();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead, stage: lead.crm?.stage },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const score = lead.leadScoreDetail?.score ?? lead.leadScore;
  const category =
    lead.leadScoreDetail?.category ??
    (lead.leadTemperatura === 'quente' ? 'hot' : lead.leadTemperatura === 'morno' ? 'warm' : 'cold');
  const revenue = lead.crmMetrics?.projectedRevenue ?? 0;
  const meeting = formatMeeting(lead);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${t.pipelineCard} transition-colors cursor-pointer group`}
      onClick={() => onOpen(lead)}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className={`mt-0.5 ${t.pipelineCardGrip} cursor-grab active:cursor-grabbing`}
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
          aria-label="Arrastar card"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className={`font-semibold text-sm ${t.textPrimary} truncate`}>{lead.nome}</p>
          {lead.crmMedico && <p className={`text-xs ${t.textMuted} truncate`}>{lead.crmMedico}</p>}
          {lead.especialidade && <p className={`text-xs ${t.textSubtle} truncate`}>{lead.especialidade}</p>}
          {(lead.cidade || lead.estado) && (
            <p className={`text-xs ${t.textSubtle} truncate`}>
              {[lead.cidade, lead.estado].filter(Boolean).join(' / ')}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-200 border border-orange-500/25">
              {scoreCategoryEmoji(category)} Score {score}
            </span>
            {meeting && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-200 border border-cyan-500/25 inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {meeting}
              </span>
            )}
          </div>
          <p className={`text-[10px] ${t.textSubtle} truncate`}>
            {formatLeadWhiteLabelWhatsAppDisplay(lead.whatsapp)} · {lead.email}
          </p>
          {lead.crm?.stage !== 'FECHADO' && lead.crm?.stage !== 'PERDIDO' && revenue > 0 && (
            <p className="text-xs text-emerald-300/90 font-medium">
              💰{' '}
              {revenue.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                maximumFractionDigits: 0,
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
