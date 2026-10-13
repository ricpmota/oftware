import { describe, expect, it } from 'vitest';
import { anexarObservacaoInjetavelNaMensagem } from './injetavelMensagemObservacao';

describe('anexarObservacaoInjetavelNaMensagem', () => {
  const base = 'Olá, Maria! Hoje é dia da sua aplicação de Testosterona.';

  it('não altera se não houver observação', () => {
    expect(anexarObservacaoInjetavelNaMensagem(base, '')).toBe(base);
    expect(anexarObservacaoInjetavelNaMensagem(base, null)).toBe(base);
  });

  it('anexa a observação da semana', () => {
    const text = anexarObservacaoInjetavelNaMensagem(base, 'Aplicar no vasto lateral');
    expect(text).toContain(base);
    expect(text).toContain('Observação: Aplicar no vasto lateral');
  });

  it('não duplica se o texto já contém a observação', () => {
    const comObs = `${base}\n\nObservação: dose reduzida`;
    expect(anexarObservacaoInjetavelNaMensagem(comObs, 'dose reduzida')).toBe(comObs);
  });
});
