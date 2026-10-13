/**
 * ChatNutri - Contrato de tipos
 * dateKey: YYYY-MM-DD
 * type: chat | meal
 * role: user | assistant | professional
 *
 * Texto humano (paciente/profissional) não dispara Gemini.
 * Foto de refeição e "Analisar com IA" disparam Gemini.
 */

// ========== INPUTS ==========

/** POST /api/chatnutri/message — mensagem humana sem Gemini */
export type ChatNutriHumanAuthorKind = 'patient' | 'doctor' | 'nutritionist';

/** POST /api/chatnutri/chat — Analisar com IA (texto → Gemini) */
export interface ChatNutriInputText {
  patientId: string;
  dateKey: string; // YYYY-MM-DD
  type: 'text';
  text: string;
  /** Quem pediu a análise (default patient) */
  authorKind?: ChatNutriHumanAuthorKind;
  authorName?: string;
  authorId?: string;
}

export interface ChatNutriInputHumanMessage {
  patientId: string;
  dateKey: string; // YYYY-MM-DD
  text: string;
  authorKind: ChatNutriHumanAuthorKind;
  authorName?: string;
  authorId?: string;
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

export type ChatNutriMessageRole = 'user' | 'assistant' | 'professional';
export type ChatNutriMessageType = 'chat' | 'meal';
export type ChatNutriConfidence = 'low' | 'medium' | 'high';
export type ChatNutriAuthorKind = ChatNutriHumanAuthorKind;

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
  /** Quem escreveu (humano). Ausente em mensagens antigas / assistente. */
  authorKind?: ChatNutriAuthorKind | null;
  authorName?: string | null;
  authorId?: string | null;
}

/** Totais diários agregados */
export interface ChatNutriDayTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Resposta do /chat (Analisar com IA) */
export interface ApiChatSuccessResponse {
  ok: true;
  message: ChatNutriMessage;
}

/** Resposta do /message (humano, sem IA) */
export interface ApiHumanMessageSuccessResponse {
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
export type ApiHumanMessageResponse = ApiHumanMessageSuccessResponse | ApiErrorResponse;
export type ApiMealResponse = ApiMealSuccessResponse | ApiErrorResponse;
