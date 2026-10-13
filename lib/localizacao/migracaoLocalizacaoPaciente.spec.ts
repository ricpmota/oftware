import { describe, expect, it } from 'vitest';
import { findMunicipality } from '@/lib/localizacao/brazilLocations';
import {
  aplicarPatchLocalizacao,
  decidirMigracaoLocalizacao,
  interpretarArgumentosMigracao,
  LOCATION_MIGRATION_UPDATE_PATHS,
  PATH_CIDADE,
  PATH_CODIGO_IBGE,
  PATH_ESTADO,
} from '@/lib/localizacao/migracaoLocalizacaoPaciente';

const joao = findMunicipality('PB', 'João Pessoa');

describe('interpretarArgumentosMigracao', () => {
  it('sem argumentos permanece em dry-run', () => {
    expect(interpretarArgumentosMigracao([]).modo).toBe('dry-run');
  });

  it('--dry-run permanece em dry-run', () => {
    expect(interpretarArgumentosMigracao(['--dry-run']).modo).toBe('dry-run');
  });

  it('--apply sozinho é recusado', () => {
    expect(() => interpretarArgumentosMigracao(['--apply'])).toThrow(/LOCALIZACAO_ETAPA_7/);
  });

  it('--apply com token errado é recusado', () => {
    expect(() => interpretarArgumentosMigracao(['--apply', '--confirm=sim'])).toThrow(/recusada/);
  });

  it('--apply com o token da etapa 7 libera escrita', () => {
    expect(interpretarArgumentosMigracao(['--apply', '--confirm=LOCALIZACAO_ETAPA_7']).modo).toBe('apply');
  });
});

describe('decidirMigracaoLocalizacao', () => {
  it('B é elegível e grava o código oficial', () => {
    const decisao = decidirMigracaoLocalizacao({ estado: 'PB', cidade: 'João Pessoa' });
    expect(decisao.acao).toBe('atualizar');
    if (decisao.acao !== 'atualizar') return;
    expect(decisao.categoria).toBe('B_RESOLVIVEL_SEM_CODIGO');
    expect(decisao.update).toEqual({
      [PATH_ESTADO]: 'PB',
      [PATH_CIDADE]: 'João Pessoa',
      [PATH_CODIGO_IBGE]: '2507507',
    });
    expect(joao?.codigoIbge).toBe('2507507');
  });

  it('C é elegível e usa a grafia oficial', () => {
    const decisao = decidirMigracaoLocalizacao({ estado: 'PB', cidade: 'Joao Pessoa' });
    expect(decisao.acao).toBe('atualizar');
    if (decisao.acao !== 'atualizar') return;
    expect(decisao.categoria).toBe('C_RESOLVIVEL_NORMALIZACAO');
    expect(decisao.update[PATH_CIDADE]).toBe('João Pessoa');
    expect(decisao.update[PATH_ESTADO]).toBe('PB');
    expect(decisao.update[PATH_CODIGO_IBGE]).toBe('2507507');
  });

  it('Paraíba + JOAO PESSOA também sai da base oficial', () => {
    const decisao = decidirMigracaoLocalizacao({ estado: 'Paraíba', cidade: 'JOAO PESSOA' });
    expect(decisao.acao).toBe('atualizar');
    if (decisao.acao !== 'atualizar') return;
    expect(decisao.update[PATH_ESTADO]).toBe('PB');
    expect(decisao.update[PATH_CIDADE]).toBe('João Pessoa');
  });

  it('A é ignorado', () => {
    const decisao = decidirMigracaoLocalizacao({
      estado: 'PB',
      cidade: 'João Pessoa',
      codigoIbge: '2507507',
    });
    expect(decisao).toEqual({ acao: 'ignorar', categoria: 'A_CANONICO', motivo: 'A_CANONICO' });
  });

  it.each([
    [{ estado: 'PB', cidade: 'João Pessoa', codigoIbge: '2611606' }, 'D_CODIGO_INCONSISTENTE'],
    [{ cidade: 'GOIANA' }, 'E_ESTADO_AUSENTE'],
    [{ cidade: 'CONDADO' }, 'E_ESTADO_AUSENTE'],
    [{ estado: 'PB' }, 'F_CIDADE_AUSENTE'],
    [{}, 'G_LOCALIZACAO_AUSENTE'],
    [{ estado: 'PB', cidade: 'Joao Pesso' }, 'H_NAO_RESOLVIVEL'],
    [{ estado: 'PB', cidade: 'São José da Mata' }, 'H_NAO_RESOLVIVEL'],
    [{ estado: 'PB', cidade: 'Salema' }, 'H_NAO_RESOLVIVEL'],
    [{ estado: 'PB', cidade: 'Joao Pesoa' }, 'H_NAO_RESOLVIVEL'],
    [{ estado: 'TX', cidade: 'Houston' }, 'I_ESTADO_INVALIDO'],
  ] as const)('categoria proibida %j fica ignorada', (input, categoria) => {
    const decisao = decidirMigracaoLocalizacao(input);
    expect(decisao.acao).toBe('ignorar');
    expect(decisao.categoria).toBe(categoria);
    expect(decisao).not.toHaveProperty('update');
  });

  it('B que mudou para H antes da transaction é ignorado', () => {
    const leituraInicial = decidirMigracaoLocalizacao({ estado: 'PB', cidade: 'João Pessoa' });
    expect(leituraInicial.acao).toBe('atualizar');

    const naTransacao = decidirMigracaoLocalizacao({ estado: 'PB', cidade: 'Joao Pesoa' });
    expect(naTransacao.acao).toBe('ignorar');
    expect(naTransacao.categoria).toBe('H_NAO_RESOLVIVEL');
    expect(naTransacao).not.toHaveProperty('update');
  });

  it('C que já virou A antes da transaction não gera write', () => {
    const leituraInicial = decidirMigracaoLocalizacao({ estado: 'PB', cidade: 'Joao Pessoa' });
    expect(leituraInicial.acao).toBe('atualizar');
    if (leituraInicial.acao !== 'atualizar') return;

    const naTransacao = decidirMigracaoLocalizacao({
      estado: leituraInicial.proposta.estado,
      cidade: leituraInicial.proposta.cidade,
      codigoIbge: leituraInicial.proposta.codigoIbge,
    });
    expect(naTransacao.acao).toBe('ignorar');
    expect(naTransacao.categoria).toBe('A_CANONICO');
    expect(naTransacao).not.toHaveProperty('update');
  });

  it('o update contém somente os três paths de localização', () => {
    const decisao = decidirMigracaoLocalizacao({ estado: 'pb', cidade: 'joão pessoa' });
    expect(decisao.acao).toBe('atualizar');
    if (decisao.acao !== 'atualizar') return;
    expect(Object.keys(decisao.update).sort()).toEqual([...LOCATION_MIGRATION_UPDATE_PATHS].sort());
  });

  it('rua, cep, extras e o restante do documento permanecem iguais', () => {
    const documento = {
      nome: 'não entra no patch',
      cidade: 'raiz legada',
      dadosIdentificacao: {
        cpf: 'não entra no patch',
        telefone: 'não entra no patch',
        endereco: {
          rua: 'Rua das Flores',
          cep: '58000-000',
          complemento: 'apto 2',
          bairro: 'Centro',
          numero: '10',
          estado: 'PB',
          cidade: 'Joao Pessoa',
        },
      },
      plano: { ativo: true },
    };
    const decisao = decidirMigracaoLocalizacao(documento.dadosIdentificacao.endereco);
    expect(decisao.acao).toBe('atualizar');
    if (decisao.acao !== 'atualizar') return;

    const depois = aplicarPatchLocalizacao(documento, decisao.update);
    expect(depois.dadosIdentificacao.endereco.estado).toBe('PB');
    expect(depois.dadosIdentificacao.endereco.cidade).toBe('João Pessoa');
    expect(depois.dadosIdentificacao.endereco.codigoIbge).toBe('2507507');
    expect(depois.dadosIdentificacao.endereco.rua).toBe('Rua das Flores');
    expect(depois.dadosIdentificacao.endereco.cep).toBe('58000-000');
    expect(depois.dadosIdentificacao.endereco.complemento).toBe('apto 2');
    expect(depois.dadosIdentificacao.endereco.bairro).toBe('Centro');
    expect(depois.dadosIdentificacao.endereco.numero).toBe('10');
    expect(depois.dadosIdentificacao.cpf).toBe(documento.dadosIdentificacao.cpf);
    expect(depois.dadosIdentificacao.telefone).toBe(documento.dadosIdentificacao.telefone);
    expect(depois.nome).toBe(documento.nome);
    expect(depois.cidade).toBe('raiz legada');
    expect(depois.plano).toEqual({ ativo: true });
  });
});
