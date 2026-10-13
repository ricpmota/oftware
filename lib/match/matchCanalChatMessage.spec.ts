import { describe, expect, it } from 'vitest';
import {
  buildMatchCanalChatMessage,
  DEFAULT_MATCH_CANAL_CHAT_TEMPLATE,
  renderMatchCanalChatTemplate,
} from '@/lib/match/matchCanalChatMessage';

describe('mensagem de conexão no Canal Chat', () => {
  it('cita a outra pessoa e o que têm em comum', () => {
    const text = buildMatchCanalChatMessage('Ana', ['Caminhada', 'Mesma cidade: João Pessoa']);
    expect(text).toContain('Ana deu match com você no Match Saudável.');
    expect(text).toContain('• Caminhada');
    expect(text).toContain('• Mesma cidade: João Pessoa');
  });

  it('avisa o match mesmo sem pontos em comum', () => {
    expect(buildMatchCanalChatMessage('Lia', [])).toBe('Lia deu match com você no Match Saudável.');
  });

  it('aplica o texto que o admin editou', () => {
    const text = renderMatchCanalChatTemplate(
      'Olá! {{nome}} quer caminhar com você.\n{{comuns}}',
      'Ana',
      ['Caminhada'],
    );
    expect(text).toBe('Olá! Ana quer caminhar com você.\n• Caminhada');
  });

  it('tira o cabeçalho de comuns quando a lista vem vazia', () => {
    expect(renderMatchCanalChatTemplate(DEFAULT_MATCH_CANAL_CHAT_TEMPLATE, 'Lia', [])).toBe(
      'Lia deu match com você no Match Saudável.',
    );
  });
});
