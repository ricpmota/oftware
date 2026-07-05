import { describe, expect, it } from 'vitest';
import { normalizeTopicsFromPayload } from '@/lib/oftpay/normalizeGeminiTopics';

describe('normalizeTopicsFromPayload', () => {
  it('aceita nomes de campo alternativos e capacidade em string', () => {
    const topics = normalizeTopicsFromPayload({
      topicos: [
        {
          titulo: 'Glaucoma de ângulo aberto',
          capacidade: '5',
          paginas: ['12', 13],
          assuntos: ['diagnóstico', 'tratamento'],
        },
      ],
    });

    expect(topics).toHaveLength(1);
    expect(topics[0].topicTitle).toBe('Glaucoma de ângulo aberto');
    expect(topics[0].estimatedQuestionCapacity).toBe(5);
    expect(topics[0].pages).toEqual([12, 13]);
    expect(topics[0].questionSubjects).toEqual(['diagnóstico', 'tratamento']);
  });

  it('ignora itens sem título', () => {
    const topics = normalizeTopicsFromPayload({
      topics: [{ topicSummary: 'sem título' }, { topicTitle: 'Válido' }],
    });
    expect(topics).toHaveLength(1);
    expect(topics[0].topicTitle).toBe('Válido');
  });
});
