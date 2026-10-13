import { describe, expect, it } from 'vitest';
import {
  buildApostilaRetrievalQuery,
  isApostilaProductQuestion,
} from './apostilaRetrievalQuery';

describe('consulta contextual do chatbot das apostilas', () => {
  it('mantém a primeira pergunta como está', () => {
    expect(buildApostilaRetrievalQuery('Quais são as principais causas de ceratite?')).toBe(
      'Quais são as principais causas de ceratite?'
    );
  });

  it('liga o tratamento à ceratite da pergunta anterior', () => {
    expect(
      buildApostilaRetrievalQuery('E o tratamento?', ['Quais são as principais causas de ceratite?'])
    ).toBe('tratamento de ceratite');
  });

  it('liga o tratamento ao glaucoma de ângulo aberto', () => {
    expect(
      buildApostilaRetrievalQuery('qual o tratamento?', ['Fale sobre glaucoma de ângulo aberto'])
    ).toBe('tratamento de glaucoma de ângulo aberto');
  });

  it('não perde o tema em um segundo follow-up', () => {
    const query = buildApostilaRetrievalQuery('e em crianças?', [
      'Quais são as causas de ceratite?',
      'E o tratamento?',
    ]);
    expect(query).toBe('tratamento de ceratite em crianças');
  });

  it('continue repete a consulta contextual anterior', () => {
    expect(
      buildApostilaRetrievalQuery('continue', [
        'Quais são as causas de ceratite?',
        'E o tratamento?',
      ])
    ).toBe('tratamento de ceratite');
  });

  it('separa pergunta de produto de pergunta clínica', () => {
    expect(isApostilaProductQuestion('Onde fica a aba do cronograma?')).toBe(true);
    expect(isApostilaProductQuestion('Quais são as causas de ceratite?')).toBe(false);
  });
});
