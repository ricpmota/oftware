export interface CrmPipelineStage {
  id: string;
  medicoId: string;
  stageKey: string;
  label: string;
  color: string;
  backgroundColor?: string;
  order: number;
  isDefault: boolean;
  archived: boolean;
  createdAt?: Date;
  updatedAt: Date;
}

/** @deprecated use CrmPipelineStage */
export type CrmPipelineStageCustomization = CrmPipelineStage;

export type UpsertCrmPipelineStageInput = {
  stageKey: string;
  label: string;
  color: string;
  backgroundColor?: string;
  order: number;
  isDefault?: boolean;
};

export type CreateCustomCrmPipelineStageInput = {
  label: string;
  color: string;
  backgroundColor?: string;
  order: number;
};
