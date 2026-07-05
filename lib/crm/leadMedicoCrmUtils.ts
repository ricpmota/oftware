import type { LeadMedico, LeadMedicoStatus } from '@/types/leadMedico';
import { LEAD_MEDICO_CRM_STAGES, LEAD_MEDICO_STATUS_ORDER, type CrmPipelineKpisView, type LeadMedicoCrmKpis } from '@/types/leadMedicoCrm';
import type { ResolvedCrmPipelineStage } from '@/lib/crm/resolveCrmPipelineStages';
import { getLeadStageKey } from '@/lib/crm/leadStageKey';
import type { LeadMedicoTimelineEvent, LeadMedicoTimelineEventType } from '@/types/leadMedicoTimeline';

export function resolveLeadMedicoId(lead: Pick<LeadMedico, 'id' | 'uid'>): string {
  return lead.id || lead.uid;
}

function leadMedicoStageLabel(status: LeadMedicoStatus): string {
  return LEAD_MEDICO_CRM_STAGES.find((s) => s.value === status)?.label || status;
}

/** Mescla eventos Firestore com baseline sintético (só preenche tipos ausentes). */
export function mergeLeadMedicoTimelineWithBaseline(
  events: LeadMedicoTimelineEvent[],
  lead: LeadMedico
): LeadMedicoTimelineEvent[] {
  const merged = [...events];
  const hasType = (type: LeadMedicoTimelineEventType) => merged.some((e) => e.type === type);
  const leadId = resolveLeadMedicoId(lead);

  if (!hasType('lead_created') && lead.createdAt) {
    merged.push({
      id: 'synthetic-created',
      leadId,
      medicoId: lead.medicoId,
      type: 'lead_created',
      description: `Lead captado — ${lead.name}`,
      createdAt: lead.createdAt,
    });
  }

  if (!hasType('stage_changed') && lead.dataStatus) {
    merged.push({
      id: 'synthetic-status',
      leadId,
      medicoId: lead.medicoId,
      type: 'stage_changed',
      description: `Estágio atual: ${leadMedicoStageLabel(lead.status)}`,
      createdAt: lead.dataStatus,
      createdBy: lead.atualizadoPor,
    });
  }

  merged.sort((a, b) => {
    const ta = a.createdAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const tb = b.createdAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return tb - ta;
  });

  return merged;
}

export function parseOrcamentoInput(value: string): number {
  const normalized = value.replace(/\./g, '').replace(',', '.').trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function formatOrcamentoBrl(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

export function countsForProjectedRevenue(status: LeadMedicoStatus): boolean {
  const normalized = normalizeLeadStatus(status);
  return normalized !== 'concluido' && normalized !== 'excluido';
}

export function emptyLeadsByStatus(): Record<LeadMedicoStatus, LeadMedico[]> {
  return {
    nao_qualificado: [],
    enviado_contato: [],
    contato_feito: [],
    tratamento_enviado: [],
    em_tratamento: [],
    concluido: [],
    excluido: [],
  };
}

export function normalizeLeadStatus(status: string): LeadMedicoStatus {
  if (status === 'aprovado') return 'enviado_contato';
  if (LEAD_MEDICO_STATUS_ORDER.includes(status as LeadMedicoStatus)) {
    return status as LeadMedicoStatus;
  }
  return 'nao_qualificado';
}

export function sortLeadsInColumn(leads: LeadMedico[]): LeadMedico[] {
  return [...leads].sort((a, b) => {
    const estrelasA = a.estrelas || 0;
    const estrelasB = b.estrelas || 0;
    if (estrelasB !== estrelasA) return estrelasB - estrelasA;
    const dateA = a.dataStatus?.getTime() || 0;
    const dateB = b.dataStatus?.getTime() || 0;
    return dateB - dateA;
  });
}

export function groupLeadsByStatus(leads: LeadMedico[]): Record<LeadMedicoStatus, LeadMedico[]> {
  const grouped = emptyLeadsByStatus();
  for (const lead of leads) {
    const status = normalizeLeadStatus(lead.status);
    grouped[status].push({ ...lead, status });
  }
  for (const status of LEAD_MEDICO_STATUS_ORDER) {
    grouped[status] = sortLeadsInColumn(grouped[status]);
  }
  return grouped;
}

export function countsForProjectedRevenueByStageKey(stageKey: string): boolean {
  return stageKey !== 'concluido' && stageKey !== 'excluido';
}

export function computeCrmPipelineKpis(
  leads: LeadMedico[],
  stageConfigs: ResolvedCrmPipelineStage[]
): CrmPipelineKpisView {
  const counts = new Map<string, number>();
  for (const stage of stageConfigs) {
    counts.set(stage.stageKey, 0);
  }

  let projectedRevenue = 0;

  for (const lead of leads) {
    const stageKey = getLeadStageKey(lead);
    if (counts.has(stageKey)) {
      counts.set(stageKey, (counts.get(stageKey) || 0) + 1);
    }
    if (countsForProjectedRevenueByStageKey(stageKey)) {
      projectedRevenue += typeof lead.orcamento === 'number' ? lead.orcamento : 0;
    }
  }

  return {
    totalLeads: leads.length,
    stages: stageConfigs.map((stage) => ({
      stageKey: stage.stageKey,
      label: stage.label,
      count: counts.get(stage.stageKey) || 0,
    })),
    projectedRevenue,
  };
}

export function computeLeadMedicoCrmKpis(leads: LeadMedico[]): LeadMedicoCrmKpis {
  let projectedRevenue = 0;

  for (const lead of leads) {
    const status = normalizeLeadStatus(lead.status);
    if (countsForProjectedRevenue(status)) {
      projectedRevenue += typeof lead.orcamento === 'number' ? lead.orcamento : 0;
    }
  }

  return {
    totalLeads: leads.length,
    consultasAgendadas: leads.filter((l) => normalizeLeadStatus(l.status) === 'enviado_contato').length,
    consultasRealizadas: leads.filter((l) => normalizeLeadStatus(l.status) === 'contato_feito').length,
    tratamentoEnviado: leads.filter((l) => normalizeLeadStatus(l.status) === 'tratamento_enviado').length,
    tratamento: leads.filter((l) => normalizeLeadStatus(l.status) === 'em_tratamento').length,
    concluido: leads.filter((l) => normalizeLeadStatus(l.status) === 'concluido').length,
    excluido: leads.filter((l) => normalizeLeadStatus(l.status) === 'excluido').length,
    projectedRevenue,
  };
}

export function moveLeadStatusInOrder(
  currentStatus: LeadMedicoStatus,
  direction: 'left' | 'right'
): LeadMedicoStatus | null {
  const index = LEAD_MEDICO_STATUS_ORDER.indexOf(currentStatus);
  if (index < 0) return null;
  if (direction === 'right' && index < LEAD_MEDICO_STATUS_ORDER.length - 1) {
    return LEAD_MEDICO_STATUS_ORDER[index + 1];
  }
  if (direction === 'left' && index > 0) {
    return LEAD_MEDICO_STATUS_ORDER[index - 1];
  }
  return null;
}
