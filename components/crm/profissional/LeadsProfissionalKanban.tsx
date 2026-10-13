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
import LeadsProfissionalPipelineCard from '@/components/crm/profissional/LeadsProfissionalPipelineCard';
import PipelineStageHeaderMenu from '@/components/crm/profissional/PipelineStageHeaderMenu';
import { useProfissionalCrmTheme } from '@/components/crm/profissional/ProfissionalCrmProvider';
import { getLeadProfissionalStageKey } from '@/lib/crm/leadProfissionalStageKey';
import { leadPatientPhotoUrl } from '@/lib/crm/useLeadPatientPhotos';
import { groupLeadsByStage } from '@/lib/crm/leadProfissionalCrmUtils';
import {
  formatStageColumnTotal,
  stageHeaderStyle,
  type ResolvedProfissionalPipelineStage,
} from '@/lib/crm/resolveProfissionalPipelineStages';
import type { LeadProfissional } from '@/types/leadProfissional';
import type { CrmTag, LeadCrmTagSnapshot } from '@/types/crmTag';
import type { Lembrete } from '@/types/lembrete';
import type { PacienteCompleto } from '@/types/obesidade';

function columnOrcamentoTotal(leads: LeadProfissional[]): number {
  return leads.reduce((sum, lead) => sum + (typeof lead.orcamento === 'number' ? lead.orcamento : 0), 0);
}

function KanbanColumn({
  stage,
  leads,
  pacienteByLeadId,
  lembretesByLeadId,
  profissionalId,
  availableTags,
  onOpenLead,
  onOpenAbaProfissional,
  onCreateReminder,
  onTagsChange,
  onTagsCatalogChange,
  onCreateTag,
  onUpdateTag,
  onArchiveTag,
  onEditCrm,
  patientPhotos,
}: {
  stage: ResolvedProfissionalPipelineStage;
  leads: LeadProfissional[];
  pacienteByLeadId?: Map<string, PacienteCompleto>;
  lembretesByLeadId?: Map<string, Lembrete[]>;
  profissionalId?: string;
  availableTags?: CrmTag[];
  onOpenLead: (lead: LeadProfissional) => void;
  onOpenAbaProfissional?: (pacienteId: string) => void;
  onCreateReminder?: (pacienteId: string, pacienteNome: string) => void;
  onTagsChange?: (leadId: string, tags: LeadCrmTagSnapshot[]) => void;
  onTagsCatalogChange?: (tags: CrmTag[]) => void;
  onCreateTag?: (data: { label: string; color: string; backgroundColor?: string }) => Promise<CrmTag>;
  onUpdateTag?: (tagId: string, data: { label: string; color: string; backgroundColor?: string }) => Promise<void>;
  onArchiveTag?: (tagId: string) => Promise<void>;
  onEditCrm: () => void;
  patientPhotos?: Record<string, string | null>;
}) {
  const t = useProfissionalCrmTheme();
  const { setNodeRef, isOver } = useDroppable({ id: stage.stageKey });
  const columnTotal = columnOrcamentoTotal(leads);

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[240px] flex-shrink-0 flex-col max-h-[calc(100vh-280px)] rounded-xl border transition-colors sm:w-[280px] lg:w-[300px] lg:rounded-2xl ${
        isOver ? t.kanbanColumnOver : t.kanbanColumn
      }`}
    >
      <div
        className={`sticky top-0 z-10 rounded-t-xl border-b px-3 py-2.5 backdrop-blur-sm lg:rounded-t-2xl ${t.divider}`}
        style={stageHeaderStyle(stage)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="truncate text-xs font-semibold leading-snug lg:text-sm">{stage.label}</h4>
            <p className="mt-0.5 text-[10px] font-medium opacity-90 lg:text-xs">
              Total: {formatStageColumnTotal(columnTotal)}
            </p>
            <p className="text-[10px] opacity-75 lg:hidden">
              {leads.length} {leads.length === 1 ? 'negócio' : 'negócios'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <span className="hidden min-w-[1.25rem] items-center justify-center rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums lg:inline-flex">
              {leads.length}
            </span>
            <PipelineStageHeaderMenu onEditCrm={onEditCrm} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
        {leads.length === 0 ? (
          <p className={`text-center text-xs py-8 ${t.kanbanEmpty}`}>Nenhum lead</p>
        ) : (
          leads.map((lead) => (
            <LeadsProfissionalPipelineCard
              key={lead.id}
              lead={lead}
              paciente={pacienteByLeadId?.get(lead.id)}
              photoUrl={leadPatientPhotoUrl(pacienteByLeadId?.get(lead.id), patientPhotos)}
              lembretes={lembretesByLeadId?.get(lead.id)}
              profissionalId={profissionalId}
              availableTags={availableTags}
              onOpen={onOpenLead}
              onOpenAbaProfissional={onOpenAbaProfissional}
              onCreateReminder={onCreateReminder}
              onTagsChange={onTagsChange}
              onTagsCatalogChange={onTagsCatalogChange}
              onCreateTag={onCreateTag}
              onUpdateTag={onUpdateTag}
              onArchiveTag={onArchiveTag}
            />
          ))
        )}
      </div>
    </div>
  );
}

type Props = {
  leads: LeadProfissional[];
  stageConfigs: ResolvedProfissionalPipelineStage[];
  pacienteByLeadId?: Map<string, PacienteCompleto>;
  lembretesByLeadId?: Map<string, Lembrete[]>;
  profissionalId?: string;
  availableTags?: CrmTag[];
  onOpenLead: (lead: LeadProfissional) => void;
  onStageChange: (leadId: string, stageKey: string) => Promise<void>;
  onOpenAbaProfissional?: (pacienteId: string) => void;
  onCreateReminder?: (pacienteId: string, pacienteNome: string) => void;
  onTagsChange?: (leadId: string, tags: LeadCrmTagSnapshot[]) => void;
  onTagsCatalogChange?: (tags: CrmTag[]) => void;
  onCreateTag?: (data: { label: string; color: string; backgroundColor?: string }) => Promise<CrmTag>;
  onUpdateTag?: (tagId: string, data: { label: string; color: string; backgroundColor?: string }) => Promise<void>;
  onArchiveTag?: (tagId: string) => Promise<void>;
  onEditCrm: () => void;
  patientPhotos?: Record<string, string | null>;
};

export default function LeadsProfissionalKanban({
  leads,
  stageConfigs,
  pacienteByLeadId,
  lembretesByLeadId,
  profissionalId,
  availableTags = [],
  onOpenLead,
  onStageChange,
  onOpenAbaProfissional,
  onCreateReminder,
  onTagsChange,
  onTagsCatalogChange,
  onCreateTag,
  onUpdateTag,
  onArchiveTag,
  onEditCrm,
  patientPhotos,
}: Props) {
  const t = useProfissionalCrmTheme();
  const [activeLead, setActiveLead] = useState<LeadProfissional | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const byStage = useMemo(() => groupLeadsByStage(leads, stageConfigs), [leads, stageConfigs]);

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    setActiveLead(lead || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveLead(null);
    const leadId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : '';
    if (!overId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    const targetStage =
      stageConfigs.find((s) => s.stageKey === overId)?.stageKey ||
      (leads.find((l) => l.id === overId)
        ? getLeadProfissionalStageKey(leads.find((l) => l.id === overId)!)
        : '');

    if (!targetStage || getLeadProfissionalStageKey(lead) === targetStage) return;
    await onStageChange(leadId, targetStage);
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex gap-3 min-w-max">
          {stageConfigs.map((stage) => (
            <KanbanColumn
              key={stage.stageKey}
              stage={stage}
              leads={byStage.get(stage.stageKey) || []}
              pacienteByLeadId={pacienteByLeadId}
              lembretesByLeadId={lembretesByLeadId}
              profissionalId={profissionalId}
              availableTags={availableTags}
              onOpenLead={onOpenLead}
              onOpenAbaProfissional={onOpenAbaProfissional}
              onCreateReminder={onCreateReminder}
              onTagsChange={onTagsChange}
              onTagsCatalogChange={onTagsCatalogChange}
              onCreateTag={onCreateTag}
              onUpdateTag={onUpdateTag}
              onArchiveTag={onArchiveTag}
              onEditCrm={onEditCrm}
              patientPhotos={patientPhotos}
            />
          ))}
        </div>
      </div>
      <DragOverlay>
        {activeLead ? (
          <div className={`w-[280px] opacity-90 ${t.pipelineCard}`}>
            <p className={`text-sm font-semibold ${t.textPrimary}`}>{activeLead.name}</p>
            <p className={`text-xs mt-1 ${t.textMuted}`}>{activeLead.medicoNome}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
