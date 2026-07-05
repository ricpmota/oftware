import type { PacienteCompleto } from '@/types/obesidade';

const ADMIN_CHAT_SANDBOX_EMAIL = 'sandbox.chat@metaadmingeral.local';

/** Paciente mínimo (início do fluxo, passo 0/1). */
export function createMetaChatSandboxPacienteVazio(): PacienteCompleto {
  return {
    id: '',
    userId: 'sandbox-metaadmingeral',
    email: ADMIN_CHAT_SANDBOX_EMAIL,
    nome: 'Preview — chat inicial',
    medicoResponsavelId: null,
    dadosIdentificacao: {
      nomeCompleto: 'Preview — chat inicial',
      email: ADMIN_CHAT_SANDBOX_EMAIL,
      dataCadastro: new Date(),
      endereco: {},
    },
    dadosClinicos: { comorbidades: {}, tipoAvaliacaoInicial: 'completa' },
    estiloVida: {} as PacienteCompleto['estiloVida'],
    examesLaboratoriais: [],
    planoTerapeutico: { metas: {} },
    evolucaoSeguimento: [],
    alertas: [],
    comunicacao: {} as PacienteCompleto['comunicacao'],
    indicadores: {} as PacienteCompleto['indicadores'],
    dataCadastro: new Date(),
    status: 'ativo',
    statusTratamento: 'pendente',
  };
}

/**
 * Dados coerentes até o passo 13 (antes das metas), sexo M para menos perguntas de risco.
 * Útil para testar passo 14+ em loop.
 */
export function createMetaChatSandboxPacienteAteMetas(): PacienteCompleto {
  const base = createMetaChatSandboxPacienteVazio();
  return {
    ...base,
    dadosIdentificacao: {
      ...base.dadosIdentificacao,
      telefone: '(11) 98888-7766',
      dataNascimento: new Date(1988, 2, 20),
      sexoBiologico: 'M',
      cpf: '12345678909',
    },
    dadosClinicos: {
      ...base.dadosClinicos,
      tipoAvaliacaoInicial: 'completa',
      medidasIniciais: {
        peso: 92,
        altura: 172,
        imc: 31.1,
        circunferenciaAbdominal: 102,
      },
      motivacao: { saude_exames_alterados: true },
      diagnosticoPrincipalTipos: ['obesidade'],
      diagnosticoPrincipal: { tipo: 'obesidade' },
      comorbidades: { nenhuma: true },
      riscos: {
        pancreatitePrevia: 'nao',
        gastroparesia: 'nao',
        historicoCMT_MEN2: 'desconheco',
      },
      historiaTireoidiana: 'eutireoidismo',
      sintomasGI: { nenhum: true },
    },
  };
}
