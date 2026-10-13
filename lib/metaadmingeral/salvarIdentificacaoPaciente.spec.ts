import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createMetaChatSandboxPacienteVazio } from '@/lib/chat/metaChatSandboxPaciente';
import { mensagemLocalizacaoAdministrativa } from '@/lib/localizacao/localizacaoAdministrativa';
import { interpretPatientLocation } from '@/lib/localizacao/patientLocationField';
import { sincronizarIdentificacaoPaciente } from '@/lib/metaadmin/buildNovoPacienteCompleto';
import { aplicarLocalizacaoResidencial } from '@/lib/meta/metaChatInicial/localizacaoResidencial';
import {
  META_CHAT_STEP_LOCALIZACAO,
  META_CHAT_STEP_MEDICO_LISTA,
  META_CHAT_STEP_MEDICO_UF,
} from '@/lib/meta/metaChatInicial/constants';
import { getFirstIncompleteStep } from '@/lib/meta/metaChatInicial/resume';
import { getNextMetaPacienteWizardStep } from '@/lib/meta/metaChatInicial/validation';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  montarPacienteIdentificacaoAdmin,
  type DadosPacienteIdentificacaoEdit,
} from './salvarIdentificacaoPaciente';

const ROOT = resolve(__dirname, '../..');

function readRepo(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

const JOAO = { estado: 'PB', cidade: 'João Pessoa', codigoIbge: '2507507' };

function dados(partial: Partial<DadosPacienteIdentificacaoEdit> = {}): DadosPacienteIdentificacaoEdit {
  return {
    nomeCompleto: 'Ana Souza',
    email: 'ana@gmail.com',
    telefone: '83988887777',
    cpf: '12345678909',
    dataNascimento: '1990-01-02',
    sexoBiologico: 'F',
    rua: 'Rua das Flores',
    cep: '58000000',
    cidade: '',
    estado: '',
    codigoIbge: '',
    ...partial,
  };
}

function pacienteComEndereco(extra: Record<string, string> = {}): PacienteCompleto {
  const base = createMetaChatSandboxPacienteVazio();
  return {
    ...base,
    id: 'pac-1',
    dadosIdentificacao: {
      ...base.dadosIdentificacao,
      endereco: { rua: 'Rua antiga', cep: '11111111', complemento: 'sala 2', ...extra } as PacienteCompleto['dadosIdentificacao']['endereco'],
    },
  };
}

function complementoDe(paciente: PacienteCompleto): string | undefined {
  return (paciente.dadosIdentificacao.endereco as { complemento?: string }).complemento;
}

describe('save administrativo da identificação', () => {
  it('canônico entra no save e preserva rua, CEP e outros campos', () => {
    const salvo = montarPacienteIdentificacaoAdmin(pacienteComEndereco(), dados(JOAO));
    expect(salvo).not.toHaveProperty('erro');
    if ('erro' in salvo) return;
    expect(salvo.dadosIdentificacao.endereco).toMatchObject({
      complemento: 'sala 2',
      rua: 'Rua das Flores',
      cep: '58000000',
      ...JOAO,
    });
    expect(salvo.dadosIdentificacao.telefone).toBe('83988887777');
  });

  it('PB + JOAO PESSOA sem código resolve João Pessoa', () => {
    const interpretation = interpretPatientLocation({ estado: 'PB', cidade: 'JOAO PESSOA' });
    const salvo = montarPacienteIdentificacaoAdmin(pacienteComEndereco(), dados(), interpretation);
    expect(salvo).not.toHaveProperty('erro');
    if ('erro' in salvo) return;
    expect(salvo.dadosIdentificacao.endereco).toMatchObject(JOAO);
    expect(complementoDe(salvo)).toBe('sala 2');
  });

  it('PB + Joao Pesoa não é adivinhado', () => {
    const interpretation = interpretPatientLocation({ estado: 'PB', cidade: 'Joao Pesoa' });
    const salvo = montarPacienteIdentificacaoAdmin(pacienteComEndereco(JOAO), dados(), interpretation);
    expect(salvo).toEqual({ erro: 'Selecione um município oficial ou deixe o estado e a cidade em branco.' });
  });

  it('selecionar João Pessoa grava 2507507 e trocar o estado limpa a cidade no paciente', () => {
    const comCidade = aplicarLocalizacaoResidencial(pacienteComEndereco(), JOAO);
    expect(comCidade.dadosIdentificacao.endereco.codigoIbge).toBe('2507507');
    const limpo = aplicarLocalizacaoResidencial(comCidade, null);
    expect(limpo.dadosIdentificacao.endereco.cidade).toBeUndefined();
    expect(limpo.dadosIdentificacao.endereco.codigoIbge).toBeUndefined();
    expect(complementoDe(limpo)).toBe('sala 2');
  });

  it('desktop e mobile usam o mesmo bloqueio e o sync preserva codigoIbge', () => {
    const invalido = aplicarLocalizacaoResidencial(pacienteComEndereco(), null);
    invalido.dadosIdentificacao.endereco = {
      ...invalido.dadosIdentificacao.endereco,
      estado: 'PB',
      cidade: 'Joao Pesoa',
    };
    expect(mensagemLocalizacaoAdministrativa(invalido)).toBe(
      'Selecione um município oficial ou deixe o estado e a cidade em branco.'
    );
    expect(mensagemLocalizacaoAdministrativa(aplicarLocalizacaoResidencial(pacienteComEndereco(), JOAO))).toBeNull();
    expect(mensagemLocalizacaoAdministrativa(pacienteComEndereco())).toBeNull();
    const sincronizado = sincronizarIdentificacaoPaciente(aplicarLocalizacaoResidencial(pacienteComEndereco(), JOAO));
    expect(sincronizado.dadosIdentificacao.endereco.codigoIbge).toBe('2507507');
    expect(complementoDe(sincronizado)).toBe('sala 2');
  });
});

describe('telas administrativas e preview do passo 30', () => {
  it('Identificação do metaadmin e o modal do admin geral usam PatientLocationFields', () => {
    const identificacao = readRepo('components/metaadmin/paciente-modal/PacienteIdentificacaoTabEdit.tsx');
    const geral = readRepo('app/metaadmingeral/page.tsx');
    expect(identificacao).toContain('<PatientLocationFields');
    expect(identificacao).not.toContain('Estado (UF)');
    expect(geral).toContain('<PatientLocationFields');
    expect(geral).toContain('montarPacienteIdentificacaoAdmin');
    expect(geral).not.toContain('dadosPacienteEditando.cidade || undefined');
  });

  it('preview do chat desenha o passo 30 e segue para o nascimento', () => {
    const chat = readRepo('components/ModalDadosPacienteChat.tsx');
    expect(chat).toContain('META_CHAT_STEP_LOCALIZACAO');
    expect(chat).toContain('<PatientLocationFields');
    expect(chat).toContain('getNextMetaPacienteWizardStep');
    const base = createMetaChatSandboxPacienteVazio();
    const comTelefone: PacienteCompleto = {
      ...base,
      dadosIdentificacao: { ...base.dadosIdentificacao, telefone: '(83) 98819-2848' },
    };
    expect(getFirstIncompleteStep(comTelefone)).toBe(META_CHAT_STEP_LOCALIZACAO);
    const comLocal = aplicarLocalizacaoResidencial(comTelefone, JOAO);
    expect(getNextMetaPacienteWizardStep(META_CHAT_STEP_LOCALIZACAO, comLocal)).toBe(2);
    expect(META_CHAT_STEP_MEDICO_UF).toBe(15);
    expect(META_CHAT_STEP_MEDICO_LISTA).toBe(16);
  });
});
