import { describe, expect, it } from 'vitest';
import { aplicarViaCepNoEndereco, resolverLocalizacaoViaCep } from './viaCepLocalizacao';

describe('ViaCEP + base oficial', () => {
  it('resolve João Pessoa/PB para o código 2507507', () => {
    expect(resolverLocalizacaoViaCep({ uf: 'PB', localidade: 'João Pessoa' })).toEqual({
      estado: 'PB',
      cidade: 'João Pessoa',
      codigoIbge: '2507507',
    });
  });

  it('aproveita CEP e rua e preserva outros campos do endereço', () => {
    const aplicado = aplicarViaCepNoEndereco(
      { complemento: 'ap 12', rua: 'antiga', cep: '00000000' } as { complemento: string; rua: string; cep: string },
      { cep: '58010-000', logradouro: 'Av. Epitácio Pessoa', localidade: 'João Pessoa', uf: 'PB' }
    );
    expect(aplicado.localizacaoResolvida).toBe(true);
    expect(aplicado.endereco).toMatchObject({
      complemento: 'ap 12',
      rua: 'Av. Epitácio Pessoa',
      cep: '58010000',
      estado: 'PB',
      cidade: 'João Pessoa',
      codigoIbge: '2507507',
    });
  });

  it('não inventa codigoIbge quando a localidade não existe na base', () => {
    const aplicado = aplicarViaCepNoEndereco(
      { rua: 'Rua A', cep: '58000000', estado: 'PB', cidade: 'João Pessoa', codigoIbge: '2507507' },
      { cep: '01001000', logradouro: 'Praça da Sé', localidade: 'Cidade Inexistente', uf: 'PB' }
    );
    expect(aplicado.localizacaoResolvida).toBe(false);
    expect(aplicado.endereco.rua).toBe('Praça da Sé');
    expect(aplicado.endereco.cep).toBe('01001000');
    expect(aplicado.endereco.codigoIbge).toBeUndefined();
    expect(aplicado.endereco.cidade).toBeUndefined();
    expect(aplicado.endereco.estado).toBeUndefined();
  });
});
