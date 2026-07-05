import type { LeadMedico } from '@/types/leadMedico';
import { isDefaultStageKey } from '@/lib/crm/leadStageKey';
import {
  LEAD_MEDICO_CRM_STAGES,
  type LeadMedicoCrmStageConfig,
} from '@/types/leadMedicoCrm';
import type { CrmPipelineStage } from '@/types/crmPipelineStage';

export type ResolvedCrmPipelineStage = Omit<LeadMedicoCrmStageConfig, 'value'> & {
  value: string;
  id: string;
  stageKey: string;
  backgroundColor?: string;
  textColor?: string;
  isCustomized: boolean;
  isDefault: boolean;
  order: number;
};

export function buildResolvedPipelineStages(dbStages: CrmPipelineStage[]): ResolvedCrmPipelineStage[] {
  const archivedKeys = new Set(
    dbStages.filter((s) => s.archived).map((s) => s.stageKey)
  );
  const activeDb = dbStages.filter((s) => !s.archived);
  const result: ResolvedCrmPipelineStage[] = [];

  LEAD_MEDICO_CRM_STAGES.forEach((def, defaultOrder) => {
    if (archivedKeys.has(def.value)) return;
    const override = activeDb.find((s) => s.stageKey === def.value);
    const order = override?.order ?? defaultOrder;
    const defaults = defaultStageColor(def.value);
    const color = override?.color ?? defaults.color;
    const backgroundColor = override?.backgroundColor ?? defaults.backgroundColor;
    result.push({
      ...def,
      id: override?.id || def.value,
      stageKey: def.value,
      value: def.value,
      label: override?.label || def.label,
      headerColor: '',
      backgroundColor,
      textColor: color,
      isCustomized: Boolean(override),
      isDefault: true,
      order,
    });
  });

  activeDb
    .filter((s) => !isDefaultStageKey(s.stageKey))
    .forEach((custom) => {
      result.push({
        value: custom.stageKey,
        stageKey: custom.stageKey,
        id: custom.id,
        label: custom.label,
        shortLabel: custom.label.slice(0, 14),
        headerColor: '',
        backgroundColor: custom.backgroundColor || `${custom.color}18`,
        textColor: custom.color,
        isCustomized: true,
        isDefault: false,
        order: custom.order,
      });
    });

  return result.sort((a, b) => a.order - b.order);
}

/** @deprecated use buildResolvedPipelineStages */
export function resolveCrmPipelineStages(dbStages: CrmPipelineStage[]): ResolvedCrmPipelineStage[] {
  return buildResolvedPipelineStages(dbStages);
}

export function computeStageColumnTotal(leads: LeadMedico[]): number {
  return leads.reduce((sum, lead) => {
    const value = typeof lead.orcamento === 'number' ? lead.orcamento : 0;
    return sum + value;
  }, 0);
}

export function formatStageColumnTotal(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function stageHeaderStyle(stage: ResolvedCrmPipelineStage): Record<string, string> {
  const { color, backgroundColor } = getStageResolvedColors(stage);
  return {
    backgroundColor,
    color,
    borderColor: `${color}33`,
  };
}

export function defaultStageColor(stageKey: string): { color: string; backgroundColor: string } {
  const defaults: Record<string, { color: string; backgroundColor: string }> = {
    nao_qualificado: { color: '#374151', backgroundColor: '#f3f4f6' },
    enviado_contato: { color: '#854d0e', backgroundColor: '#fef9c3' },
    contato_feito: { color: '#9a3412', backgroundColor: '#ffedd5' },
    tratamento_enviado: { color: '#5b21b6', backgroundColor: '#f3e8ff' },
    em_tratamento: { color: '#166534', backgroundColor: '#dcfce7' },
    concluido: { color: '#1e40af', backgroundColor: '#dbeafe' },
    excluido: { color: '#991b1b', backgroundColor: '#fee2e2' },
  };
  return defaults[stageKey] || { color: '#475569', backgroundColor: '#f1f5f9' };
}

/** Cor de destaque da etapa (barra lateral, badges) — mesma lógica do cabeçalho do Kanban */
export function getStageAccentColor(stage: Pick<ResolvedCrmPipelineStage, 'stageKey' | 'textColor'>): string {
  return stage.textColor || defaultStageColor(stage.stageKey).color;
}

/** Cores resolvidas para cabeçalho da coluna e preview no gestor */
export function getStageResolvedColors(
  stage: Pick<ResolvedCrmPipelineStage, 'stageKey' | 'textColor' | 'backgroundColor'>
): { color: string; backgroundColor: string } {
  if (stage.textColor) {
    return {
      color: stage.textColor,
      backgroundColor: stage.backgroundColor || `${stage.textColor}18`,
    };
  }
  return defaultStageColor(stage.stageKey);
}
