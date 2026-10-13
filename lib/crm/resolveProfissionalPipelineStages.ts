import type { LeadProfissionalCrmStageConfig } from '@/types/leadProfissionalCrm';
import { getLeadProfissionalCrmStages } from '@/types/leadProfissionalCrm';
import type { LeadProfissionalRole } from '@/types/leadProfissional';
import type { CrmPipelineStage } from '@/types/crmPipelineStage';
import { isDefaultProfissionalStageKey } from '@/lib/crm/leadProfissionalStageKey';

export type ResolvedProfissionalPipelineStage = LeadProfissionalCrmStageConfig & {
  id: string;
  stageKey: string;
  backgroundColor?: string;
  textColor?: string;
  isCustomized: boolean;
  isDefault: boolean;
  order: number;
  headerColor: string;
};

const PROFISSIONAL_STAGE_COLORS: Record<string, { color: string; backgroundColor: string }> = {
  nao_atendido: { color: '#374151', backgroundColor: '#f3f4f6' },
  consultas_agendadas: { color: '#854d0e', backgroundColor: '#fef9c3' },
  cardapio_em_execucao: { color: '#166534', backgroundColor: '#dcfce7' },
  treino_em_execucao: { color: '#166534', backgroundColor: '#dcfce7' },
  acompanhamento_em_curso: { color: '#166534', backgroundColor: '#dcfce7' },
  concluido: { color: '#1e40af', backgroundColor: '#dbeafe' },
  tratamento_concluido: { color: '#5b21b6', backgroundColor: '#ede9fe' },
  cardapio_nao_realizado: { color: '#991b1b', backgroundColor: '#fee2e2' },
  treino_nao_realizado: { color: '#991b1b', backgroundColor: '#fee2e2' },
  acompanhamento_nao_realizado: { color: '#991b1b', backgroundColor: '#fee2e2' },
};

export function profissionalStageColor(stageKey: string): { color: string; backgroundColor: string } {
  return PROFISSIONAL_STAGE_COLORS[stageKey] || { color: '#475569', backgroundColor: '#f1f5f9' };
}

/** Etapas padrão (código) sem personalização no Firestore. */
export function buildProfissionalPipelineStages(
  role: LeadProfissionalRole
): ResolvedProfissionalPipelineStage[] {
  return buildResolvedProfissionalPipelineStages(role, []);
}

/** Mescla etapas padrão do papel com overrides/custom do Firestore. */
export function buildResolvedProfissionalPipelineStages(
  role: LeadProfissionalRole,
  dbStages: CrmPipelineStage[]
): ResolvedProfissionalPipelineStage[] {
  const defaults = getLeadProfissionalCrmStages(role);
  const archivedKeys = new Set(dbStages.filter((s) => s.archived).map((s) => s.stageKey));
  const activeDb = dbStages.filter((s) => !s.archived);
  const result: ResolvedProfissionalPipelineStage[] = [];

  defaults.forEach((def, defaultOrder) => {
    if (archivedKeys.has(def.value)) return;
    const override = activeDb.find((s) => s.stageKey === def.value);
    const colors = profissionalStageColor(def.value);
    const color = override?.color ?? colors.color;
    const backgroundColor = override?.backgroundColor ?? colors.backgroundColor;
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
      order: override?.order ?? defaultOrder,
    });
  });

  activeDb
    .filter((s) => !isDefaultProfissionalStageKey(role, s.stageKey))
    .forEach((custom) => {
      result.push({
        value: custom.stageKey as ResolvedProfissionalPipelineStage['value'],
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

export function stageHeaderStyle(stage: ResolvedProfissionalPipelineStage): Record<string, string> {
  const color = stage.textColor || profissionalStageColor(stage.stageKey).color;
  const backgroundColor =
    stage.backgroundColor || profissionalStageColor(stage.stageKey).backgroundColor;
  return {
    backgroundColor,
    color,
    borderColor: `${color}33`,
  };
}

export function formatStageColumnTotal(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getProfissionalStageAccentColor(
  stage: Pick<ResolvedProfissionalPipelineStage, 'stageKey' | 'textColor'>
): string {
  return stage.textColor || profissionalStageColor(stage.stageKey).color;
}

export function getProfissionalStageResolvedColors(
  stage: Pick<ResolvedProfissionalPipelineStage, 'stageKey' | 'textColor' | 'backgroundColor'>
): { color: string; backgroundColor: string } {
  const defaults = profissionalStageColor(stage.stageKey);
  return {
    color: stage.textColor || defaults.color,
    backgroundColor: stage.backgroundColor || defaults.backgroundColor,
  };
}
