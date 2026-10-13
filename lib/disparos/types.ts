import type { DISPAROS_SESSION_ID } from '@/lib/disparos/constants';

export type DisparosWhatsappStatus =
  | 'disconnected'
  | 'connecting'
  | 'qr_pending'
  | 'connected'
  | 'error'
  | 'unavailable';

/** Conexão independente da campanha. O número conectado não é a identidade do disparo. */
export type DisparosWhatsappView = {
  status: DisparosWhatsappStatus;
  phone: string | null;
  profileName: string | null;
  sessionId: typeof DISPAROS_SESSION_ID;
  qrCode: string | null;
  updatedAt: string | null;
  errorMessage: string | null;
};

export type DisparoColumnMapping = {
  nome: string;
  telefone1: string;
  telefone2: string;
};

export type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

export type ImportedPhone = {
  original: string;
  normalized: string | null;
  display: string | null;
  issue: 'empty' | 'falta_ddd' | 'invalido' | null;
  usedDefaultDdd: boolean;
  alreadyHadDdd: boolean;
  alreadyHadCountry: boolean;
};

export type ImportedContactStatus =
  | 'valido'
  | 'falta_ddd'
  | 'invalido'
  | 'sem_telefone'
  | 'duplicado'
  | 'opt_out';

export type ImportedContact = {
  id: string;
  importId: string;
  rowNumber: number;
  nome: string;
  primeiroNome: string;
  telefone1: ImportedPhone;
  telefone2: ImportedPhone | null;
  status: ImportedContactStatus;
  optOut: boolean;
};

export type ImportSummary = {
  total: number;
  validos: number;
  invalidos: number;
  duplicados: number;
  semTelefone: number;
  faltaDdd: number;
  optOut: number;
  /** Telefones que receberam o DDD padrão. */
  telefonesComDddPadrao: number;
  /** Telefones nacionais que já traziam DDD; só entrou o 55. */
  telefonesJaComDdd: number;
  /** Telefones que já vinham com 55. */
  telefonesJaComPais: number;
};

export type DisparoImport = {
  id: string;
  name: string;
  fileName: string;
  importedAt: string;
  mapping: DisparoColumnMapping;
  summary: ImportSummary;
  status: 'importando' | 'pronta' | 'arquivada';
  defaultDdd: string;
};

export type PhoneChoice = 'telefone1' | 'telefone2' | 'telefone1_ou_telefone2';

export type AudienceChoice = 'validos' | 'selecionados';

export type CampaignStatus =
  | 'preparando'
  | 'agendada'
  | 'em_andamento'
  | 'pausada'
  | 'concluida'
  | 'cancelada'
  | 'erro';

export type CampaignItemStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'ignored' | 'needs_review';

export type CampaignPauseReason = 'manual' | 'sender_unavailable' | null;

export type CampaignIgnoreReason = 'opt_out' | 'sem_telefone' | 'invalido' | 'duplicado' | 'falta_ddd';

export type DisparoCampaignItem = {
  id: string;
  contactId: string;
  nome: string;
  primeiroNome: string;
  telefone: string | null;
  status: CampaignItemStatus;
  ignoreReason: CampaignIgnoreReason | null;
  updatedAt: string | null;
  remetenteLabel: string | null;
};

export type CampaignTotals = {
  total: number;
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  ignored: number;
  revisao: number;
};

/** Remetente observado no momento do disparo. Trocar a conexão não reescreve itens já enviados. */
export type DisparoRemetenteSnapshot = {
  sessionId: typeof DISPAROS_SESSION_ID;
  phone: string | null;
  profileName: string | null;
  connectionStatus: DisparosWhatsappStatus;
};

export type DisparoCampaign = {
  id: string;
  importId: string;
  name: string;
  createdAt: string;
  status: CampaignStatus;
  messageTemplate: string;
  intervalMinutes: number;
  phoneChoice: PhoneChoice;
  audience: AudienceChoice;
  totals: CampaignTotals;
  remetente: DisparoRemetenteSnapshot;
  items: DisparoCampaignItem[];
  nextRunAt: string | null;
  pauseReason: CampaignPauseReason;
  intervaloMs: number;
};

export type NewDisparoDraft = {
  name: string;
  audience: AudienceChoice;
  phoneChoice: PhoneChoice;
  messageTemplate: string;
  intervalMinutes: number;
};
