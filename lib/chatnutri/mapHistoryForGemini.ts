import type { ChatNutriMessage } from '@/lib/chatnutri/types';
import type { ChatHistoryEntry } from '@/services/chatNutriGeminiService';

function authorLabel(msg: ChatNutriMessage): string {
  const name = typeof msg.authorName === 'string' ? msg.authorName.trim() : '';
  if (msg.role === 'professional') {
    const kind =
      msg.authorKind === 'doctor'
        ? 'Médico'
        : msg.authorKind === 'nutritionist'
          ? 'Nutricionista'
          : 'Profissional';
    return name ? `${kind} (${name})` : kind;
  }
  if (msg.authorKind === 'patient' || msg.role === 'user') {
    return name ? `Paciente (${name})` : 'Paciente';
  }
  return 'Assistente';
}

/**
 * Converte mensagens do ChatNutri para histórico Gemini (user | assistant).
 * Mensagens de profissional entram como user com prefixo, para a IA não confundir com o paciente.
 */
export function mapChatNutriMessagesToGeminiHistory(messages: ChatNutriMessage[]): ChatHistoryEntry[] {
  return messages.map((m) => {
    if (m.role === 'assistant') {
      return { role: 'assistant' as const, text: m.text };
    }
    if (m.role === 'professional') {
      return {
        role: 'user' as const,
        text: `[${authorLabel(m)} — conversa humana, sem resposta automática]: ${m.text}`,
      };
    }
    // user (paciente): se houver profissionais no thread, deixa explícito
    const hasProfessionalNearby = messages.some((x) => x.role === 'professional');
    if (hasProfessionalNearby) {
      return {
        role: 'user' as const,
        text: `[${authorLabel(m)}]: ${m.text}`,
      };
    }
    return { role: 'user' as const, text: m.text };
  });
}
