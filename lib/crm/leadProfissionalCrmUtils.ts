import { getLeadProfissionalStageKey } from '@/lib/crm/leadProfissionalStageKey';
import type { ResolvedProfissionalPipelineStage } from '@/lib/crm/resolveProfissionalPipelineStages';
import type { LeadProfissional, LeadProfissionalRole, LeadProfissionalStatus } from '@/types/leadProfissional';
import {
  getDefaultLeadProfissionalStatus,
  getLeadProfissionalCrmStages,
  getLeadProfissionalStatusOrder,
  type CrmPipelineKpisView,
} from '@/types/leadProfissionalCrm';

export function formatOrcamentoBrl(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

export function parseOrcamentoInput(value: string): number {
  const normalized = value.replace(/\./g, '').replace(',', '.').trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function normalizeLeadProfissionalStatus(
  role: LeadProfissionalRole,
  status: string
): LeadProfissionalStatus {
  const order = getLeadProfissionalStatusOrder(role);
  if (order.includes(status as LeadProfissionalStatus)) {
    return status as LeadProfissionalStatus;
  }
  return getDefaultLeadProfissionalStatus(role);
}

export function sortLeadsInColumn(leads: LeadProfissional[]): LeadProfissional[] {
  return [...leads].sort((a, b) => {
    const ta = a.dataStatus?.getTime?.() ?? 0;
    const tb = b.dataStatus?.getTime?.() ?? 0;
    return tb - ta;
  });
}

export function groupLeadsByStage(
  leads: LeadProfissional[],
  stages: ResolvedProfissionalPipelineStage[]
): Map<string, LeadProfissional[]> {
  const map = new Map<string, LeadProfissional[]>();
  for (const stage of stages) {
    map.set(stage.stageKey, []);
  }
  for (const lead of leads) {
    const key = getLeadProfissionalStageKey(lead);
    const list = map.get(key);
    if (list) list.push(lead);
    else {
      const fallback = map.get(stages[0]?.stageKey || 'nao_atendido');
      fallback?.push(lead);
    }
  }
  for (const [key, list] of map) {
    map.set(key, sortLeadsInColumn(list));
  }
  return map;
}

export function countsForProjectedRevenue(
  role: LeadProfissionalRole,
  status: LeadProfissionalStatus
): boolean {
  const normalized = normalizeLeadProfissionalStatus(role, status);
  if (normalized === 'concluido' || normalized === 'tratamento_concluido') return false;
  if (
    normalized === 'cardapio_nao_realizado' ||
    normalized === 'treino_nao_realizado' ||
    normalized === 'acompanhamento_nao_realizado'
  ) {
    return false;
  }
  return true;
}

export function computeCrmPipelineKpis(
  leads: LeadProfissional[],
  stages: ResolvedProfissionalPipelineStage[],
  role: LeadProfissionalRole
): CrmPipelineKpisView {
  const byStage = new Map<string, number>();
  for (const stage of stages) byStage.set(stage.stageKey, 0);

  let projectedRevenue = 0;
  for (const lead of leads) {
    const key = getLeadProfissionalStageKey(lead);
    byStage.set(key, (byStage.get(key) || 0) + 1);
    if (countsForProjectedRevenue(role, lead.status) && typeof lead.orcamento === 'number') {
      projectedRevenue += lead.orcamento;
    }
  }

  return {
    totalLeads: leads.length,
    stages: stages.map((stage) => ({
      stageKey: stage.stageKey,
      label: stage.label,
      count: byStage.get(stage.stageKey) || 0,
    })),
    projectedRevenue,
  };
}

export function stageLabel(role: LeadProfissionalRole, status: string): string {
  return getLeadProfissionalCrmStages(role).find((s) => s.value === status)?.label || status;
}

export function getLeadMedicoOrigemBadge(lead: Pick<LeadProfissional, 'medicoNome' | 'medicoId'>): {
  label: string;
  shortLabel: string;
  dotClass: string;
  bgClass: string;
  textClass: string;
} {
  const name = lead.medicoNome?.trim() || 'Médico';
  const first = name.split(/\s+/).filter(Boolean)[0] || 'Médico';
  return {
    label: name,
    shortLabel: first,
    dotClass: 'bg-sky-500',
    bgClass: 'bg-sky-50 dark:bg-sky-950/40',
    textClass: 'text-sky-800 dark:text-sky-200',
  };
}
