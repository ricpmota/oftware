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
import LeadsMedicoPipelineCard from '@/components/crm/medico/LeadsMedicoPipelineCard';
import PipelineStageHeaderMenu from '@/components/crm/medico/PipelineStageHeaderMenu';
import { useMedicoLeadsCrmTheme } from '@/components/crm/medico/MedicoLeadsCrmProvider';
import { getLeadStageKey } from '@/lib/crm/leadStageKey';
import {
  computeStageColumnTotal,
  formatStageColumnTotal,
  stageHeaderStyle,
  type ResolvedCrmPipelineStage,
} from '@/lib/crm/resolveCrmPipelineStages';
import type { Paciente360Summary } from '@/types/paciente360';
import type { LeadMedico, LeadReferralSnapshot } from '@/types/leadMedico';
import type { Lembrete } from '@/types/lembrete';
import type { CrmTag, LeadCrmTagSnapshot } from '@/types/crmTag';
import type { PacienteCompleto } from '@/types/obesidade';

function KanbanColumn({
  stage,
  leads,
  paciente360ByLeadId,
  pacienteByLeadId,
  lembretesByLeadId,
  medicoId,
  availableTags,
  onOpenLead,
  onTagsChange,
  onTagsCatalogChange,
  onCreateTag,
  onUpdateTag,
  onArchiveTag,
  onOpenProntuario,
  onCreateReminder,
  onEditCrm,
  medicoNome,
  userEmail,
  pacientes = [],
  onReferralSaved,
}: {
  stage: ResolvedCrmPipelineStage;
  leads: LeadMedico[];
  paciente360ByLeadId?: Map<string, Paciente360Summary>;
  pacienteByLeadId?: Map<string, PacienteCompleto>;
  lembretesByLeadId?: Map<string, Lembrete[]>;
  medicoId: string;
  availableTags: CrmTag[];
  onOpenLead: (lead: LeadMedico) => void;
  onTagsChange?: (leadId: string, tags: LeadCrmTagSnapshot[]) => void;
  onTagsCatalogChange?: (tags: CrmTag[]) => void;
  onCreateTag?: (data: { label: string; color: string; backgroundColor?: string }) => Promise<CrmTag>;
  onUpdateTag?: (tagId: string, data: { label: string; color: string; backgroundColor?: string }) => Promise<void>;
  onArchiveTag?: (tagId: string) => Promise<void>;
  onOpenProntuario?: (pacienteId: string) => void;
  onCreateReminder?: (lead: LeadMedico, summary: Paciente360Summary) => void;
  onEditCrm: () => void;
  medicoNome?: string;
  userEmail?: string | null;
  pacientes?: PacienteCompleto[];
  onReferralSaved?: (leadId: string, referral: LeadReferralSnapshot) => void;
}) {
  const t = useMedicoLeadsCrmTheme();
  const { setNodeRef, isOver } = useDroppable({ id: stage.stageKey });
  const columnTotal = computeStageColumnTotal(leads);

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-[240px] sm:w-[280px] lg:w-[300px] xl:w-[320px] flex flex-col max-h-[calc(100vh-280px)] rounded-xl border transition-colors ${
        isOver ? t.kanbanColumnOver : t.kanbanColumn
      }`}
    >
      <div
        className={`px-3 py-2.5 border-b ${t.divider} sticky top-0 backdrop-blur-sm rounded-t-xl z-10`}
        style={stageHeaderStyle(stage)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold leading-snug truncate">{stage.label}</h4>
            <p className="text-[10px] font-medium mt-0.5 opacity-90">
              Total: {formatStageColumnTotal(columnTotal)}
            </p>
            <p className="text-[10px] opacity-75">
              {leads.length} {leads.length === 1 ? 'negócio' : 'negócios'}
            </p>
          </div>
          <PipelineStageHeaderMenu onEditCrm={onEditCrm} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {leads.map((lead) => {
          const summary = paciente360ByLeadId?.get(lead.id);
          const paciente = pacienteByLeadId?.get(lead.id);
          return (
            <LeadsMedicoPipelineCard
              key={lead.id}
              lead={lead}
              paciente={paciente}
              paciente360Summary={summary}
              lembretes={lembretesByLeadId?.get(lead.id)}
              medicoId={medicoId}
              availableTags={availableTags}
              onOpen={onOpenLead}
              onTagsChange={onTagsChange}
              onTagsCatalogChange={onTagsCatalogChange}
              onCreateTag={onCreateTag}
              onUpdateTag={onUpdateTag}
              onArchiveTag={onArchiveTag}
              onOpenProntuario={onOpenProntuario}
              onCreateReminder={
                summary && onCreateReminder ? () => onCreateReminder(lead, summary) : undefined
              }
              medicoNome={medicoNome}
              userEmail={userEmail}
              pacientes={pacientes}
              onReferralSaved={onReferralSaved}
            />
          );
        })}
        {leads.length === 0 && (
          <p className={`text-xs ${t.kanbanEmpty} text-center py-8 px-2`}>Nenhum lead neste estágio</p>
        )}
      </div>
    </div>
  );
}

type Props = {
  leads: LeadMedico[];
  medicoId: string;
  stageConfigs: ResolvedCrmPipelineStage[];
  availableTags: CrmTag[];
  paciente360ByLeadId?: Map<string, Paciente360Summary>;
  pacienteByLeadId?: Map<string, PacienteCompleto>;
  lembretesByLeadId?: Map<string, Lembrete[]>;
  onOpenLead: (lead: LeadMedico) => void;
  onStageChange: (leadId: string, stageKey: string) => Promise<void>;
  onTagsChange?: (leadId: string, tags: LeadCrmTagSnapshot[]) => void;
  onTagsCatalogChange?: (tags: CrmTag[]) => void;
  onCreateTag?: (data: { label: string; color: string; backgroundColor?: string }) => Promise<CrmTag>;
  onUpdateTag?: (tagId: string, data: { label: string; color: string; backgroundColor?: string }) => Promise<void>;
  onArchiveTag?: (tagId: string) => Promise<void>;
  onOpenProntuario?: (pacienteId: string) => void;
  onCreateReminder?: (lead: LeadMedico, summary: Paciente360Summary) => void;
  onEditCrm: () => void;
  medicoNome?: string;
  userEmail?: string | null;
  pacientes?: PacienteCompleto[];
  onReferralSaved?: (leadId: string, referral: LeadReferralSnapshot) => void;
};

export default function LeadsMedicoKanban({
  leads,
  medicoId,
  stageConfigs,
  availableTags,
  paciente360ByLeadId,
  pacienteByLeadId,
  lembretesByLeadId,
  onOpenLead,
  onStageChange,
  onTagsChange,
  onTagsCatalogChange,
  onCreateTag,
  onUpdateTag,
  onArchiveTag,
  onOpenProntuario,
  onCreateReminder,
  onEditCrm,
  medicoNome,
  userEmail,
  pacientes = [],
  onReferralSaved,
}: Props) {
  const [activeLead, setActiveLead] = useState<LeadMedico | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const stageKeys = useMemo(() => new Set(stageConfigs.map((s) => s.stageKey)), [stageConfigs]);

  const columns = useMemo(() => {
    const map = new Map<string, LeadMedico[]>();
    for (const stage of stageConfigs) {
      map.set(stage.stageKey, []);
    }
    for (const lead of leads) {
      const key = getLeadStageKey(lead);
      const bucket = stageKeys.has(key) ? key : stageConfigs[0]?.stageKey;
      if (!bucket) continue;
      const list = map.get(bucket) || [];
      list.push(lead);
      map.set(bucket, list);
    }
    return map;
  }, [leads, stageConfigs, stageKeys]);

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    setActiveLead(lead || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveLead(null);
    const leadId = String(event.active.id);
    const overId = event.over?.id;
    if (!overId || !stageKeys.has(String(overId))) return;

    const newStageKey = String(overId);
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || getLeadStageKey(lead) === newStageKey) return;

    void onStageChange(leadId, newStageKey);
  };

  const activeSummary = activeLead ? paciente360ByLeadId?.get(activeLead.id) : undefined;
  const activePaciente = activeLead ? pacienteByLeadId?.get(activeLead.id) : undefined;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {stageConfigs.map((col) => (
          <KanbanColumn
            key={col.stageKey}
            stage={col}
            leads={columns.get(col.stageKey) || []}
            paciente360ByLeadId={paciente360ByLeadId}
            pacienteByLeadId={pacienteByLeadId}
            lembretesByLeadId={lembretesByLeadId}
            medicoId={medicoId}
            availableTags={availableTags}
            onOpenLead={onOpenLead}
            onTagsChange={onTagsChange}
            onTagsCatalogChange={onTagsCatalogChange}
            onCreateTag={onCreateTag}
            onUpdateTag={onUpdateTag}
            onArchiveTag={onArchiveTag}
            onOpenProntuario={onOpenProntuario}
            onCreateReminder={onCreateReminder}
            onEditCrm={onEditCrm}
            medicoNome={medicoNome}
            userEmail={userEmail}
            pacientes={pacientes}
            onReferralSaved={onReferralSaved}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead ? (
          <div className="w-[240px] sm:w-[280px] lg:w-[300px] xl:w-[320px] rotate-2 opacity-95">
            <LeadsMedicoPipelineCard
              lead={activeLead}
              paciente={activePaciente}
              paciente360Summary={activeSummary}
              lembretes={lembretesByLeadId?.get(activeLead.id)}
              onOpen={() => undefined}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
