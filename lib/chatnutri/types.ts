/**
 * ChatNutri - Contrato de tipos (ETAPA 1)
 * dateKey: YYYY-MM-DD
 * type: chat | meal
 * role: user | assistant
 */

// ========== INPUTS ==========

/** POST /api/chatnutri/chat */
export interface ChatNutriInputText {
  patientId: string;
  dateKey: string; // YYYY-MM-DD
  type: 'text';
  text: string;
}

/** POST /api/chatnutri/meal (etapa 1: placeholder sem arquivo) */
export interface ChatNutriInputImage {
  patientId: string;
  dateKey: string; // YYYY-MM-DD
  type: 'image';
  imagePlaceholder?: boolean;
}

/** Tipo de refeição para análise de foto */
export type ChatNutriMealType = 'cafe' | 'lanche1' | 'almoco' | 'lanche2' | 'jantar';

// ========== OUTPUTS ==========

export type ChatNutriMessageRole = 'user' | 'assistant';
export type ChatNutriMessageType = 'chat' | 'meal';
export type ChatNutriConfidence = 'low' | 'medium' | 'high';

/** Macros de uma refeição */
export interface ChatNutriTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Mensagem base armazenada e retornada */
export interface ChatNutriMessage {
  id: string;
  role: ChatNutriMessageRole;
  type: ChatNutriMessageType;
  text: string;
  createdAt: string; // ISO
  imageUrl?: string | null;
  gcsPath?: string | null; // path no GCS para gerar signed URL ao carregar
  totals?: ChatNutriTotals;
  confidence?: ChatNutriConfidence;
  relatedMessageId?: string | null; // vincula par user+assistant em refeição (deletar um deleta ambos)
}

/** Totais diários agregados */
export interface ChatNutriDayTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Resposta do /chat */
export interface ApiChatSuccessResponse {
  ok: true;
  message: ChatNutriMessage;
}

/** Resposta do /meal (com dayTotals) */
export interface ApiMealSuccessResponse {
  ok: true;
  message: ChatNutriMessage;
  dayTotals: ChatNutriDayTotals;
}

/** Resposta de erro genérica */
export interface ApiErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiChatResponse = ApiChatSuccessResponse | ApiErrorResponse;
export type ApiMealResponse = ApiMealSuccessResponse | ApiErrorResponse;
