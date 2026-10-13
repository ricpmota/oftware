export const MENTOR_CONTENT_TYPES = [
  'video',
  'document',
  'protocol',
  'checklist',
  'article',
] as const;

export type MentorContentType = (typeof MENTOR_CONTENT_TYPES)[number];

export const MENTOR_CATEGORIES = [
  'medicacao',
  'aplicacao',
  'envio_medicacao',
  'atendimento',
  'sistema',
  'novidades',
  'configuracoes',
] as const;

export type MentorCategory = (typeof MENTOR_CATEGORIES)[number];

/** Categoria futura (Etapa 05) — não exibida nesta etapa. */
export const MENTOR_FUTURE_CATEGORY = 'protocolos_documentos' as const;

export const MENTOR_CONTENT_STATUSES = ['draft', 'published', 'archived'] as const;

export type MentorContentStatus = (typeof MENTOR_CONTENT_STATUSES)[number];

export type MentorActor = {
  uid: string;
  name?: string;
  email?: string;
};

export interface MentorContent {
  id: string;
  type: MentorContentType;
  title: string;
  slug: string;
  description?: string;
  category: MentorCategory;
  tags?: string[];
  videoUrl: string;
  videoStoragePath?: string;
  thumbnailUrl?: string;
  thumbnailStoragePath?: string;
  durationSeconds?: number;
  order?: number;
  status: MentorContentStatus;
  featured?: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: MentorActor;
  updatedBy?: MentorActor;
  version?: number;
  lastReviewedAt?: Date;
}

/** Payload serializado nas APIs (datas em ISO). */
export interface MentorContentDto {
  id: string;
  type: MentorContentType;
  title: string;
  slug: string;
  description?: string;
  category: MentorCategory;
  tags?: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  order?: number;
  status: MentorContentStatus;
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: MentorActor;
  updatedBy?: MentorActor;
  version?: number;
  lastReviewedAt?: string | null;
  isNew?: boolean;
  isUpdated?: boolean;
}

export type MentorCategoryCounts = Record<MentorCategory, number>;
