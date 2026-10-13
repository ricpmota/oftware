import { describe, expect, it } from 'vitest';
import { createMetaChatSandboxPacienteAteMetas, createMetaChatSandboxPacienteVazio } from '@/lib/chat/metaChatSandboxPaciente';
import {
  applyStateChange,
  gravacaoLocalizacaoPerfil,
  interpretPatientLocation,
} from '@/lib/localizacao/patientLocationField';
import {
  META_CHAT_STEP_DATA_NASCIMENTO,
  META_CHAT_STEP_LOCALIZACAO,
  META_CHAT_STEP_MEDICO_LISTA,
  META_CHAT_STEP_MEDICO_UF,
  META_CHAT_STEP_PERFIL_COMPLETO,
  META_CHAT_STEP_TELEFONE,
} from '@/lib/meta/metaChatInicial/constants';
import { aplicarLocalizacaoResidencial } from '@/lib/meta/metaChatInicial/localizacaoResidencial';
import { getFirstIncompleteStep } from '@/lib/meta/metaChatInicial/resume';
import {
  getNextMetaPacienteWizardStep,
  getNextStepAfter,
  getPreviousMetaPacienteWizardStep,
  validateMetaChatStep,
} from '@/lib/meta/metaChatInicial/validation';
import type { PacienteCompleto } from '@/types/obesidade';

const JOAO_PESSOA = {
  estado: 'PB',
  cidade: 'João Pessoa',
  codigoIbge: '2507507',
};

function comTelefone(p: PacienteCompleto = createMetaChatSandboxPacienteVazio()): PacienteCompleto {
  return {
    ...p,
    dadosIdentificacao: {
      ...p.dadosIdentificacao,
      telefone: '(83) 98819-2848',
    },
  };
}

describe('wizard /meta — localização depois do telefone', () => {
  it('telefone válido sem nascimento abre a localização, não o nascimento', () => {
    expect(getFirstIncompleteStep(comTelefone())).toBe(META_CHAT_STEP_LOCALIZACAO);
    expect(getNextMetaPacienteWizardStep(META_CHAT_STEP_TELEFONE, comTelefone())).toBe(
      META_CHAT_STEP_LOCALIZACAO
    );
  });

  it('localização inválida não avança', () => {
    const p = aplicarLocalizacaoResidencial(comTelefone(), null);
    expect(validateMetaChatStep(META_CHAT_STEP_LOCALIZACAO, p)).toBe(
      'Selecione o estado e uma cidade da lista.'
    );
  });

  it('PB + João Pessoa oficial avança e o save leva o endereço canônico', () => {
    const base = comTelefone();
    const p = aplicarLocalizacaoResidencial(
      {
        ...base,
        dadosIdentificacao: {
          ...base.dadosIdentificacao,
          endereco: { rua: 'Rua das Flores', cep: '58000-000' },
        },
      },
      JOAO_PESSOA
    );
    expect(validateMetaChatStep(META_CHAT_STEP_LOCALIZACAO, p)).toBeNull();
    expect(getFirstIncompleteStep(p)).toBe(META_CHAT_STEP_DATA_NASCIMENTO);
    expect(p.dadosIdentificacao.endereco).toMatchObject({
      rua: 'Rua das Flores',
      cep: '58000-000',
      estado: 'PB',
      cidade: 'João Pessoa',
      codigoIbge: '2507507',
    });
  });

  it('troca de estado não mantém a cidade anterior no objeto gravado', () => {
    const comCidade = aplicarLocalizacaoResidencial(comTelefone(), JOAO_PESSOA);
    const troca = applyStateChange(
      { estado: 'PB', cityQuery: 'João Pessoa', selected: JOAO_PESSOA },
      'PE'
    );
    expect(troca.clearedCity).toBe(true);
    expect(troca.selected).toBeNull();
    const gravado = aplicarLocalizacaoResidencial(comCidade, null);
    expect(gravado.dadosIdentificacao.endereco.cidade).toBeUndefined();
    expect(gravado.dadosIdentificacao.endereco.codigoIbge).toBeUndefined();
    expect(gravado.dadosIdentificacao.endereco.estado).toBeUndefined();
  });

  it('voltar da localização vai ao telefone e voltar do nascimento vai à localização', () => {
    const p = comTelefone();
    expect(getPreviousMetaPacienteWizardStep(META_CHAT_STEP_LOCALIZACAO, p)).toBe(
      META_CHAT_STEP_TELEFONE
    );
    expect(getPreviousMetaPacienteWizardStep(META_CHAT_STEP_DATA_NASCIMENTO, p)).toBe(
      META_CHAT_STEP_LOCALIZACAO
    );
    expect(getNextMetaPacienteWizardStep(META_CHAT_STEP_LOCALIZACAO, p)).toBe(
      META_CHAT_STEP_DATA_NASCIMENTO
    );
  });

  it('busca de médico continua nos passos 15 e 16 e não usa a cidade residencial', () => {
    const p = aplicarLocalizacaoResidencial(createMetaChatSandboxPacienteAteMetas(), JOAO_PESSOA);
    expect(META_CHAT_STEP_MEDICO_UF).toBe(15);
    expect(META_CHAT_STEP_MEDICO_LISTA).toBe(16);
    expect(getNextStepAfter(META_CHAT_STEP_TELEFONE, p)).toBe(META_CHAT_STEP_DATA_NASCIMENTO);
    expect(getNextMetaPacienteWizardStep(META_CHAT_STEP_MEDICO_UF, p)).toBe(META_CHAT_STEP_MEDICO_LISTA);
    expect(
      validateMetaChatStep(META_CHAT_STEP_MEDICO_UF, p, { medicoUi: { selectedEstado: '', selectedCidade: '' } })
    ).toBe('Selecione o estado.');
    expect(p.dadosIdentificacao.endereco.estado).toBe('PB');
  });

  it('paciente que já tem nascimento não é puxado de volta para a localização', () => {
    const p = createMetaChatSandboxPacienteAteMetas();
    expect(p.dadosIdentificacao.endereco.codigoIbge).toBeUndefined();
    expect(getFirstIncompleteStep(p)).not.toBe(META_CHAT_STEP_LOCALIZACAO);
  });

  it('paciente com médico vinculado e cadastro preenchido segue para o passo 17', () => {
    const base = createMetaChatSandboxPacienteAteMetas();
    const p: PacienteCompleto = {
      ...base,
      medicoResponsavelId: 'medico-1',
      dadosClinicos: {
        ...base.dadosClinicos,
        objetivosTratamento: { emagrecer: true },
      },
    };
    expect(getFirstIncompleteStep(p)).toBe(META_CHAT_STEP_PERFIL_COMPLETO);
  });
});

describe('Meu Perfil — gravação da localização', () => {
  it('canônico PB + João Pessoa + código é aceito', () => {
    const interpretation = interpretPatientLocation(JOAO_PESSOA);
    expect(gravacaoLocalizacaoPerfil(interpretation)).toEqual(JOAO_PESSOA);
  });

  it('legado PB + JOAO PESSOA resolve João Pessoa oficial', () => {
    const interpretation = interpretPatientLocation({ estado: 'PB', cidade: 'JOAO PESSOA' });
    expect(gravacaoLocalizacaoPerfil(interpretation)).toEqual(JOAO_PESSOA);
  });

  it('PB + Joao Pesoa não pode ser gravado', () => {
    const interpretation = interpretPatientLocation({ estado: 'PB', cidade: 'Joao Pesoa' });
    expect(interpretation.status).toBe('unresolved');
    expect(gravacaoLocalizacaoPerfil(interpretation)).toBeNull();
  });

  it('ausência completa limpa os três campos e preserva rua e CEP', () => {
    expect(gravacaoLocalizacaoPerfil({ status: 'empty' })).toEqual({
      estado: '',
      cidade: '',
      codigoIbge: '',
    });
    const base = createMetaChatSandboxPacienteVazio();
    const p = aplicarLocalizacaoResidencial(
      {
        ...base,
        dadosIdentificacao: {
          ...base.dadosIdentificacao,
          endereco: { rua: 'Rua das Flores', cep: '58000-000', ...JOAO_PESSOA },
        },
      },
      null
    );
    expect(p.dadosIdentificacao.endereco.rua).toBe('Rua das Flores');
    expect(p.dadosIdentificacao.endereco.cep).toBe('58000-000');
    expect(p.dadosIdentificacao.endereco.cidade).toBeUndefined();
    expect(p.dadosIdentificacao.endereco.estado).toBeUndefined();
    expect(p.dadosIdentificacao.endereco.codigoIbge).toBeUndefined();
  });
});
