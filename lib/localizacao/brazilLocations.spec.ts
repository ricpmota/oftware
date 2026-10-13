import { describe, expect, it } from 'vitest';
import { fonteLocalidadesIbge } from '@/data/localizacao/fonte';
import {
  findMunicipality,
  findMunicipalityByIbgeCode,
  getBrazilStates,
  getMunicipalitiesByState,
  normalizeLocationSearch,
  resolveBrazilState,
  searchMunicipalities,
} from '@/lib/localizacao/brazilLocations';

describe('normalizeLocationSearch', () => {
  it('remove acento, caixa e espaços sem alterar o dado oficial', () => {
    expect(normalizeLocationSearch('João Pessoa')).toBe('joao pessoa');
    expect(normalizeLocationSearch('JOAO PESSOA')).toBe('joao pessoa');
    expect(normalizeLocationSearch('  João   Pessoa ')).toBe('joao pessoa');
  });
});

describe('resolveBrazilState', () => {
  it('resolve sigla e nome oficial, com ou sem acento', () => {
    expect(resolveBrazilState('PB')).toEqual({ nome: 'Paraíba', sigla: 'PB' });
    expect(resolveBrazilState('pb')).toEqual({ nome: 'Paraíba', sigla: 'PB' });
    expect(resolveBrazilState('Paraíba')).toEqual({ nome: 'Paraíba', sigla: 'PB' });
    expect(resolveBrazilState('PARAIBA')).toEqual({ nome: 'Paraíba', sigla: 'PB' });
    expect(resolveBrazilState('Paraiba')).toEqual({ nome: 'Paraíba', sigla: 'PB' });
    expect(resolveBrazilState('  paraíba  ')).toEqual({ nome: 'Paraíba', sigla: 'PB' });
  });

  it('não resolve UF inexistente, vazio ou prefixo', () => {
    expect(resolveBrazilState('XX')).toBeNull();
    expect(resolveBrazilState('')).toBeNull();
    expect(resolveBrazilState('   ')).toBeNull();
    expect(resolveBrazilState('Rio')).toBeNull();
    expect(resolveBrazilState('P.B')).toBeNull();
  });

  it('lista as 27 UFs em ordem alfabética do nome', () => {
    const states = getBrazilStates();
    expect(states).toHaveLength(27);
    expect(states).toHaveLength(fonteLocalidadesIbge.quantidadeEstados);
    expect(states[0]).toEqual({ nome: 'Acre', sigla: 'AC' });
    expect(states.map((state) => state.sigla)).toContain('PB');
    const names = states.map((state) => state.nome);
    expect([...names].sort((a, b) => a.localeCompare(b, 'pt-BR'))).toEqual(names);
    expect(states.find((state) => state.sigla === 'PB')).toEqual({ nome: 'Paraíba', sigla: 'PB' });
  });
});

describe('municípios IBGE', () => {
  it('encontra João Pessoa pela grafia oficial, caixa e falta de acento', () => {
    const official = {
      nome: 'João Pessoa',
      uf: 'PB',
      codigoIbge: '2507507',
    };
    expect(findMunicipality('PB', 'João Pessoa')).toEqual(official);
    expect(findMunicipality('PB', 'JOAO PESSOA')).toEqual(official);
    expect(findMunicipality('PB', 'Joao Pessoa')).toEqual(official);
    expect(findMunicipality('pb', '  João   Pessoa ')).toEqual(official);
    expect(findMunicipality('Paraíba', 'joao pessoa')).toEqual(official);
    expect(findMunicipalityByIbgeCode('2507507')).toEqual(official);
    expect(typeof official.codigoIbge).toBe('string');
  });

  it('aceita o par localidade/uf no formato devolvido pelo ViaCEP', () => {
    const viaCep = { localidade: 'João Pessoa', uf: 'PB' };
    expect(findMunicipality(viaCep.uf, viaCep.localidade)).toEqual({
      nome: 'João Pessoa',
      uf: 'PB',
      codigoIbge: '2507507',
    });
  });

  it('não aproxima erro de digitação nem mistura estados com o mesmo nome', () => {
    expect(findMunicipality('PB', 'Joao Pesoa')).toBeNull();
    expect(findMunicipality('PB', 'Cidade Que Nao Existe')).toBeNull();
    expect(findMunicipality('XX', 'João Pessoa')).toBeNull();
    expect(findMunicipality('PB', '   ')).toBeNull();
    expect(findMunicipalityByIbgeCode('0000000')).toBeNull();
    expect(findMunicipalityByIbgeCode('250750')).toBeNull();

    const paraiba = findMunicipality('PB', 'Bom Jesus');
    const piaui = findMunicipality('PI', 'Bom Jesus');
    expect(paraiba?.codigoIbge).toBe('2502201');
    expect(piaui?.codigoIbge).toBe('2201903');
    expect(paraiba?.codigoIbge).not.toBe(piaui?.codigoIbge);
  });

  it('busca só na UF e coloca quem começa com o texto antes de quem apenas contém', () => {
    const results = searchMunicipalities('PB', 'joao');
    const names = results.map((municipality) => municipality.nome);

    expect(results.every((municipality) => municipality.uf === 'PB')).toBe(true);
    expect(names).toContain('João Pessoa');
    expect(names).toContain('São João do Cariri');
    expect(names).toContain('São João do Tigre');
    expect(names).toContain('São João do Rio do Peixe');
    expect(names.indexOf('João Pessoa')).toBeLessThan(names.indexOf('São João do Cariri'));

    let seenContains = false;
    for (const municipality of results) {
      const key = normalizeLocationSearch(municipality.nome);
      const starts = key.startsWith('joao');
      if (!starts) seenContains = true;
      expect(starts && seenContains).toBe(false);
    }

    expect(searchMunicipalities('PB', '')).toEqual([]);
    expect(searchMunicipalities('PB', '   ')).toEqual([]);
    expect(searchMunicipalities('XX', 'joao')).toEqual([]);
    expect(searchMunicipalities('SP', 'joao pessoa')).toEqual([]);
  });

  it('preserva apóstrofo e hífen oficiais na comparação exata', () => {
    expect(findMunicipality('AL', "Olho d'Agua das Flores")).toEqual({
      nome: "Olho d'Água das Flores",
      uf: 'AL',
      codigoIbge: '2705705',
    });
    expect(findMunicipality('BA', 'xique-xique')).toEqual({
      nome: 'Xique-Xique',
      uf: 'BA',
      codigoIbge: '2933604',
    });
    expect(findMunicipality('BA', 'xique xique')).toBeNull();
  });

  it('valida a base inteira sem duplicidade nem registro incompleto', () => {
    const states = getBrazilStates();
    const codes = new Set<string>();
    const keys = new Set<string>();
    const prefixByState = new Map<string, string>();
    let total = 0;

    for (const state of states) {
      const municipalities = getMunicipalitiesByState(state.sigla);
      expect(municipalities.length).toBeGreaterThan(0);
      const names = municipalities.map((municipality) => municipality.nome);
      expect([...names].sort((a, b) => a.localeCompare(b, 'pt-BR'))).toEqual(names);

      for (const municipality of municipalities) {
        expect(municipality.nome.trim()).not.toBe('');
        expect(municipality.uf).toBe(state.sigla);
        expect(municipality.codigoIbge).toMatch(/^\d{7}$/);
        expect(codes.has(municipality.codigoIbge)).toBe(false);
        codes.add(municipality.codigoIbge);

        const key = `${municipality.uf}|${normalizeLocationSearch(municipality.nome)}`;
        expect(keys.has(key)).toBe(false);
        keys.add(key);

        const prefix = municipality.codigoIbge.slice(0, 2);
        const seen = prefixByState.get(state.sigla);
        if (seen) expect(seen).toBe(prefix);
        else prefixByState.set(state.sigla, prefix);
        total += 1;
      }
    }

    expect(total).toBe(fonteLocalidadesIbge.quantidadeMunicipios);
    expect(total).toBe(5571);
    expect(getMunicipalitiesByState('DF')).toEqual([
      { nome: 'Brasília', uf: 'DF', codigoIbge: '5300108' },
    ]);
    expect(getMunicipalitiesByState('ZZ')).toEqual([]);
    expect(new Set(prefixByState.values()).size).toBe(27);
  });
});
