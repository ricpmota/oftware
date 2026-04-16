/**
 * Superfície do POST /api/chat e componentes que reutilizam o mesmo backend.
 * Evoluir depois com orchestrator/memória sem mudar o contrato público.
 */
export type ChatApiSurface = 'general' | 'chatnutri';

export function parseChatApiSurface(raw: unknown): ChatApiSurface {
  return raw === 'chatnutri' ? 'chatnutri' : 'general';
}
