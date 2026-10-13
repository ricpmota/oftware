export type WhatsAppLeadPresetDefaultKey =
  | 'bem_vindo'
  | 'continuidade'
  | 'pagamento'
  | 'aplicacao'
  | 'evolucao';

export type WhatsAppLeadPreset = {
  id: string;
  medicoId: string;
  title: string;
  /** Corpo com placeholders `{nome}`, `{organizacao}` e `{indicacao}` */
  body: string;
  /** true quando veio (ou sobrescreve) um preset padrão da plataforma */
  isDefault: boolean;
  defaultKey?: WhatsAppLeadPresetDefaultKey;
  order: number;
  archived?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateWhatsAppLeadPresetInput = {
  title: string;
  body: string;
  order?: number;
};

export type UpdateWhatsAppLeadPresetInput = {
  title?: string;
  body?: string;
  order?: number;
  archived?: boolean;
};

export type WhatsAppLeadPresetDefaultSeed = {
  defaultKey: WhatsAppLeadPresetDefaultKey;
  title: string;
  body: string;
  order: number;
};
