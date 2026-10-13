import { describe, expect, it } from 'vitest';
import { findMunicipality } from '@/lib/localizacao/brazilLocations';
import {
  PATIENT_LOCATION_SUGGESTION_LIMIT,
  applyStateChange,
  formatBrazilStateOption,
  interpretPatientLocation,
  isPatientLocationAcceptable,
  locationSuggestions,
  patientLocationKeyAction,
  patientLocationMessage,
  retainSelectionForQuery,
} from '@/lib/localizacao/patientLocationField';

const joaoPessoa = {
  estado: 'PB',
  cidade: 'João Pessoa',
  codigoIbge: '2507507',
};

describe('PatientLocationFields — estado e autocomplete', () => {
  it('exibe a UF como nome e sigla, e habilita a cidade só com estado reconhecido', () => {
    expect(formatBrazilStateOption({ nome: 'Paraíba', sigla: 'PB' })).toBe('Paraíba (PB)');
    expect(interpretPatientLocation(null)).toEqual({ status: 'empty' });
    expect(interpretPatientLocation({ estado: 'PB' })).toEqual({ status: 'state-only', estado: 'PB' });
    expect(interpretPatientLocation({ estado: 'Paraíba' })).toEqual({ status: 'state-only', estado: 'PB' });
  });

  it('busca sem acento e só dentro da UF, com limite visual', () => {
    const paraiba = locationSuggestions('PB', 'joao');
    expect(paraiba.items.map((item) => item.nome)).toContain('João Pessoa');
    expect(paraiba.items.every((item) => item.uf === 'PB')).toBe(true);
    expect(paraiba.items.some((item) => item.nome === 'São Paulo')).toBe(false);
    expect(paraiba.items[0]?.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().startsWith('joao')).toBe(
      true
    );

    const saoPaulo = locationSuggestions('SP', 'sao paulo');
    expect(saoPaulo.items.map((item) => item.nome)).toContain('São Paulo');
    expect(saoPaulo.items.every((item) => item.uf === 'SP')).toBe(true);
    expect(locationSuggestions('SP', 'sao').items.every((item) => item.uf === 'SP')).toBe(true);

    const broad = locationSuggestions('MG', 'a');
    expect(broad.items).toHaveLength(PATIENT_LOCATION_SUGGESTION_LIMIT);
    expect(broad.truncated).toBe(true);
    expect(locationSuggestions('PB', '   ').items).toEqual([]);
  });

  it('só devolve localização válida quando a cidade oficial é reconhecida', () => {
    expect(interpretPatientLocation({ estado: 'PB', cidade: 'João Pessoa' })).toEqual({
      status: 'valid',
      value: joaoPessoa,
    });
  });

  it('invalida a seleção se o texto deixar de ser exatamente o nome oficial', () => {
    expect(retainSelectionForQuery(joaoPessoa, 'João Pessoa')).toEqual(joaoPessoa);
    expect(retainSelectionForQuery(joaoPessoa, 'Joao Pessoa')).toBeNull();
    expect(retainSelectionForQuery(joaoPessoa, 'Joao Pesoa')).toBeNull();
    expect(retainSelectionForQuery(joaoPessoa, 'João Pessoa ')).toBeNull();
  });

  it('limpa cidade e código ao trocar a UF', () => {
    const cleared = applyStateChange(
      { estado: 'PB', cityQuery: 'João Pessoa', selected: joaoPessoa },
      'PE'
    );
    expect(cleared).toEqual({ estado: 'PE', cityQuery: '', selected: null, clearedCity: true });
    expect(
      applyStateChange({ estado: 'PB', cityQuery: 'João Pessoa', selected: joaoPessoa }, 'PB').clearedCity
    ).toBe(false);
  });
});

describe('PatientLocationFields — dados legados', () => {
  it('resolve PB + JOAO PESSOA sem código para o município oficial', () => {
    expect(interpretPatientLocation({ estado: 'PB', cidade: 'JOAO PESSOA' })).toEqual({
      status: 'valid',
      value: joaoPessoa,
    });
    expect(interpretPatientLocation({ estado: 'pb', cidade: 'Joao Pessoa' })).toEqual({
      status: 'valid',
      value: joaoPessoa,
    });
  });

  it('não aproxima PB + Joao Pesoa', () => {
    expect(interpretPatientLocation({ estado: 'PB', cidade: 'Joao Pesoa' })).toEqual({
      status: 'unresolved',
      estado: 'PB',
      cidade: 'Joao Pesoa',
    });
  });

  it('aceita código, UF e nome coerentes e rejeita código de outra cidade', () => {
    expect(
      interpretPatientLocation({ estado: 'PB', cidade: 'João Pessoa', codigoIbge: '2507507' })
    ).toEqual({ status: 'valid', value: joaoPessoa });

    const recife = findMunicipality('PE', 'Recife');
    expect(recife).not.toBeNull();
    const conflict = interpretPatientLocation({
      estado: 'PB',
      cidade: 'João Pessoa',
      codigoIbge: recife?.codigoIbge,
    });
    expect(conflict.status).toBe('inconsistent');
    if (conflict.status === 'inconsistent') {
      expect(conflict.cidade).toBe('João Pessoa');
      expect(conflict.estado).toBe('PB');
      expect(conflict.codigoIbge).not.toBe('2507507');
    }
  });

  it('não trata texto livre ou estado sozinho como localização opcional válida', () => {
    const unresolved = interpretPatientLocation({ estado: 'PB', cidade: 'Joao Pesoa' });
    const stateOnly = interpretPatientLocation({ estado: 'PB' });
    expect(isPatientLocationAcceptable({ status: 'empty' }, false)).toBe(true);
    expect(isPatientLocationAcceptable({ status: 'empty' }, true)).toBe(false);
    expect(isPatientLocationAcceptable({ status: 'valid', value: joaoPessoa }, true)).toBe(true);
    expect(isPatientLocationAcceptable(unresolved, false)).toBe(false);
    expect(isPatientLocationAcceptable(stateOnly, false)).toBe(false);
  });
});

describe('PatientLocationFields — teclado e mensagens', () => {
  it('move, seleciona e fecha a lista sem submeter o formulário no Enter', () => {
    expect(
      patientLocationKeyAction({ key: 'ArrowDown', open: false, activeIndex: 0, suggestionCount: 3 })
    ).toMatchObject({ open: true, activeIndex: 0, select: false, preventDefault: true });
    expect(
      patientLocationKeyAction({ key: 'ArrowDown', open: true, activeIndex: 0, suggestionCount: 3 })
    ).toMatchObject({ activeIndex: 1 });
    expect(
      patientLocationKeyAction({ key: 'ArrowDown', open: true, activeIndex: 2, suggestionCount: 3 })
    ).toMatchObject({ activeIndex: 2 });
    expect(
      patientLocationKeyAction({ key: 'ArrowUp', open: true, activeIndex: 0, suggestionCount: 3 })
    ).toMatchObject({ activeIndex: 0, preventDefault: true });
    expect(
      patientLocationKeyAction({ key: 'Enter', open: true, activeIndex: 1, suggestionCount: 3 })
    ).toMatchObject({ select: true, preventDefault: true });
    expect(
      patientLocationKeyAction({ key: 'Enter', open: false, activeIndex: 0, suggestionCount: 3 })
    ).toMatchObject({ select: false, preventDefault: true });
    expect(
      patientLocationKeyAction({ key: 'Escape', open: true, activeIndex: 1, suggestionCount: 3 })
    ).toMatchObject({ open: false, select: false, preventDefault: true });
  });

  it('explica legado não resolvido e código conflitante sem apagar o texto', () => {
    expect(
      patientLocationMessage({
        required: false,
        touched: false,
        cityBlurred: false,
        estado: 'PB',
        cityQuery: 'Joao Pesoa',
        selected: null,
        notice: 'unresolved',
      })
    ).toMatch(/lista/i);
    expect(
      patientLocationMessage({
        required: false,
        touched: false,
        cityBlurred: false,
        estado: 'PB',
        cityQuery: 'João Pessoa',
        selected: null,
        notice: 'inconsistent',
      })
    ).toMatch(/não confere/i);
    expect(
      patientLocationMessage({
        required: true,
        touched: true,
        cityBlurred: false,
        estado: 'PB',
        cityQuery: 'João Pessoa',
        selected: joaoPessoa,
        notice: null,
      })
    ).toBeNull();
  });
});
