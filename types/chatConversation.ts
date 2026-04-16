/**
 * Modelo de dados para histórico de conversas do Chatbot Oftware (aba Apostila).
 */

export interface ChatConversationSource {
  docId?: string;
  id?: number;
  title: string;
  url?: string;
  snippet?: string;
  page?: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  sources?: ChatConversationSource[];
}

export interface ChatConversation {
  id: string;
  userId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_CONVERSATION_TITLE = 'Nova conversa';
