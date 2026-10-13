import { describe, expect, it } from 'vitest';
import { findMunicipality } from '@/lib/localizacao/brazilLocations';
import { classifyPatientLocation } from '@/lib/localizacao/classifyPatientLocation';

const joao = findMunicipality('PB', 'João Pessoa');
const recife = findMunicipality('PE', 'Recife');

describe('classifyPatientLocation', () => {
  it('PB + João Pessoa + código oficial é canônico', () => {
    const result = classifyPatientLocation({
      estado: 'PB',
      cidade: 'João Pessoa',
      codigoIbge: joao?.codigoIbge,
    });
    expect(result.categoria).toBe('A_CANONICO');
    expect(result.proposta).toEqual({
      estado: 'PB',
      cidade: 'João Pessoa',
      codigoIbge: '2507507',
    });
  });

  it('PB + João Pessoa sem código é resolvível sem código', () => {
    const result = classifyPatientLocation({ estado: 'PB', cidade: 'João Pessoa' });
    expect(result.categoria).toBe('B_RESOLVIVEL_SEM_CODIGO');
    expect(result.proposta?.codigoIbge).toBe('2507507');
  });

  it('PB + JOAO PESSOA normaliza com segurança', () => {
    const result = classifyPatientLocation({ estado: 'PB', cidade: 'JOAO PESSOA' });
    expect(result.categoria).toBe('C_RESOLVIVEL_NORMALIZACAO');
    expect(result.proposta).toMatchObject({ estado: 'PB', cidade: 'João Pessoa', codigoIbge: '2507507' });
  });

  it('Paraíba + Joao Pessoa normaliza com segurança', () => {
    const result = classifyPatientLocation({ estado: 'Paraíba', cidade: 'Joao Pessoa' });
    expect(result.categoria).toBe('C_RESOLVIVEL_NORMALIZACAO');
    expect(result.proposta?.estado).toBe('PB');
    expect(result.proposta?.cidade).toBe('João Pessoa');
  });

  it('PB + Joao Pesoa não é resolvível', () => {
    expect(classifyPatientLocation({ estado: 'PB', cidade: 'Joao Pesoa' }).categoria).toBe('H_NAO_RESOLVIVEL');
  });

  it('cidade sem estado fica ausente de estado', () => {
    expect(classifyPatientLocation({ cidade: 'João Pessoa' }).categoria).toBe('E_ESTADO_AUSENTE');
  });

  it('estado sem cidade fica ausente de cidade', () => {
    expect(classifyPatientLocation({ estado: 'PB' }).categoria).toBe('F_CIDADE_AUSENTE');
  });

  it('sem estado e sem cidade é localização ausente', () => {
    expect(classifyPatientLocation({}).categoria).toBe('G_LOCALIZACAO_AUSENTE');
    expect(classifyPatientLocation(null).categoria).toBe('G_LOCALIZACAO_AUSENTE');
  });

  it('código de outro município é inconsistente e não propõe troca', () => {
    const result = classifyPatientLocation({
      estado: 'PB',
      cidade: 'João Pessoa',
      codigoIbge: recife?.codigoIbge,
    });
    expect(result.categoria).toBe('D_CODIGO_INCONSISTENTE');
    expect(result.proposta).toBeNull();
    expect(result.codigoIbge.valido).toBe(true);
    expect(result.codigoIbge.inconsistente).toBe(true);
  });

  it('estado inválido não é reconhecido', () => {
    expect(classifyPatientLocation({ estado: 'XX', cidade: 'João Pessoa' }).categoria).toBe('I_ESTADO_INVALIDO');
  });

  it('código com formato inválido junto de cidade oficial é inconsistente', () => {
    const result = classifyPatientLocation({
      estado: 'PB',
      cidade: 'João Pessoa',
      codigoIbge: '25075',
    });
    expect(result.categoria).toBe('D_CODIGO_INCONSISTENTE');
    expect(result.codigoIbge.invalido).toBe(true);
  });
});
