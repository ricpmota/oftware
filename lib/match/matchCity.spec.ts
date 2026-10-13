import { describe, expect, it } from 'vitest';
import { matchCityKey, sameMatchCity } from '@/lib/match/matchCity';

describe('matchCity', () => {
  it('trata a mesma cidade com acento, caixa e sufixo de estado', () => {
    expect(matchCityKey('João Pessoa')).toBe('joao pessoa');
    expect(matchCityKey('JOAO PESSOA')).toBe('joao pessoa');
    expect(matchCityKey('João Pessoa - PB')).toBe('joao pessoa');
    expect(
      sameMatchCity({ city: 'João Pessoa', state: 'PB' }, { city: 'JOAO PESSOA', state: 'pb' })
    ).toBe(true);
    expect(sameMatchCity({ city: 'João Pessoa - PB' }, { city: 'João Pessoa', state: 'PB' })).toBe(true);
  });

  it('não junta cidades diferentes nem o mesmo nome em estados diferentes', () => {
    expect(sameMatchCity({ city: 'João Pessoa', state: 'PB' }, { city: 'Recife', state: 'PE' })).toBe(false);
    expect(sameMatchCity({ city: 'Bom Jesus', state: 'PI' }, { city: 'Bom Jesus', state: 'RS' })).toBe(false);
    expect(sameMatchCity({}, { city: 'João Pessoa' })).toBe(false);
  });
});
