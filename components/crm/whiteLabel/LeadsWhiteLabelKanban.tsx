'use client';

import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import LeadsWhiteLabelPipelineCard from '@/components/crm/whiteLabel/LeadsWhiteLabelPipelineCard';
import { useWhiteLabelCrmTheme } from '@/components/crm/whiteLabel/WhiteLabelCrmProvider';
import type { LeadWhiteLabel } from '@/types/leadWhiteLabel';
import { WHITELABEL_CRM_STAGES, type WhiteLabelCrmStage } from '@/types/leadWhiteLabelCrm';

function KanbanColumn({
  stage,
  label,
  leads,
  onOpenLead,
}: {
  stage: WhiteLabelCrmStage;
  label: string;
  leads: LeadWhiteLabel[];
  onOpenLead: (lead: LeadWhiteLabel) => void;
}) {
  const t = useWhiteLabelCrmTheme();
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[280px] sm:w-[300px] flex flex-col max-h-[calc(100vh-280px)] rounded-xl border transition-colors ${
        isOver ? t.kanbanColumnOver : t.kanbanColumn
      }`}
    >
      <div
        className={`px-3 py-2.5 border-b ${t.divider} flex items-center justify-between sticky top-0 ${t.columnHeaderBg} backdrop-blur-sm rounded-t-xl z-10`}
      >
        <h4 className={`text-xs font-bold ${t.textPrimary} uppercase tracking-wide`}>{label}</h4>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${t.badgeCount}`}>{leads.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {leads.map((lead) => (
          <LeadsWhiteLabelPipelineCard key={lead.id} lead={lead} onOpen={onOpenLead} />
        ))}
        {leads.length === 0 && (
          <p className={`text-xs ${t.kanbanEmpty} text-center py-8 px-2`}>Nenhum lead neste estágio</p>
        )}
      </div>
    </div>
  );
}

type Props = {
  leads: LeadWhiteLabel[];
  onOpenLead: (lead: LeadWhiteLabel) => void;
  onStageChange: (leadId: string, stage: WhiteLabelCrmStage) => Promise<void>;
};

export default function LeadsWhiteLabelKanban({ leads, onOpenLead, onStageChange }: Props) {
  const [activeLead, setActiveLead] = useState<LeadWhiteLabel | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const columns = useMemo(() => {
    const map = new Map<WhiteLabelCrmStage, LeadWhiteLabel[]>();
    for (const stage of WHITELABEL_CRM_STAGES) {
      map.set(stage.value, []);
    }
    for (const lead of leads) {
      const stage = lead.crm?.stage || 'NOVO_LEAD';
      const list = map.get(stage) || [];
      list.push(lead);
      map.set(stage, list);
    }
    return map;
  }, [leads]);

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    setActiveLead(lead || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveLead(null);
    const leadId = String(event.active.id);
    const overId = event.over?.id;
    if (!overId || !WHITELABEL_CRM_STAGES.some((s) => s.value === overId)) return;

    const newStage = overId as WhiteLabelCrmStage;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.crm?.stage === newStage) return;

    await onStageChange(leadId, newStage);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {WHITELABEL_CRM_STAGES.map((col) => (
          <KanbanColumn
            key={col.value}
            stage={col.value}
            label={col.shortLabel}
            leads={columns.get(col.value) || []}
            onOpenLead={onOpenLead}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead ? (
          <div className="w-[280px] rotate-2 opacity-95">
            <LeadsWhiteLabelPipelineCard lead={activeLead} onOpen={() => undefined} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
