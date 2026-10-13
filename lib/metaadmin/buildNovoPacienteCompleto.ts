import type { PacienteCompleto } from '@/types/obesidade';
import { tryResolveInternationalPhone } from '@/lib/whatsapp/resolveInternationalPhone';

export function buildNovoPacienteCompleto(params: {
  medicoId: string;
  medicoUserId: string;
}): PacienteCompleto {
  const now = new Date();
  return {
    id: '',
    userId: `${params.medicoUserId}_${Date.now()}`,
    email: '',
    nome: '',
    medicoResponsavelId: params.medicoId,
    dadosIdentificacao: {
      nomeCompleto: '',
      email: '',
      telefone: '',
      telefoneDdi: '55',
      telefonePais: 'BR',
      dataCadastro: now,
      endereco: {},
    },
    dadosClinicos: {
      comorbidades: {},
    },
    estiloVida: {},
    examesLaboratoriais: [],
    examesDeImagem: [],
    planoTerapeutico: {
      metas: {},
    },
    evolucaoSeguimento: [],
    alertas: [],
    comunicacao: {
      mensagens: [],
      anexos: [],
      logsAuditoria: [],
    },
    indicadores: {
      tempoEmTratamento: {
        dias: 0,
        semanas: 0,
      },
      adesaoMedia: 0,
      incidenciaEfeitosAdversos: {
        total: 0,
        grave: 0,
        moderado: 0,
        leve: 0,
      },
    },
    dataCadastro: now,
    status: 'ativo',
    statusTratamento: 'pendente',
  };
}

export function sincronizarIdentificacaoPaciente(paciente: PacienteCompleto): PacienteCompleto {
  const nome = (paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || '').trim();
  const email = (paciente.dadosIdentificacao?.email || paciente.email || '').trim().toLowerCase();
  return {
    ...paciente,
    nome,
    email,
    dadosIdentificacao: {
      ...paciente.dadosIdentificacao,
      nomeCompleto: nome || paciente.dadosIdentificacao?.nomeCompleto || '',
      email: email || paciente.dadosIdentificacao?.email || '',
      endereco: paciente.dadosIdentificacao?.endereco || {},
      dataCadastro: paciente.dadosIdentificacao?.dataCadastro || paciente.dataCadastro || new Date(),
    },
  };
}

export function pacienteTemTelefoneParaWhatsapp(
  paciente: Pick<PacienteCompleto, 'dadosIdentificacao'> | null | undefined,
): boolean {
  const ident = paciente?.dadosIdentificacao;
  try {
    return Boolean(
      tryResolveInternationalPhone({
        telefone: ident?.telefone,
        telefoneDdi: ident?.telefoneDdi,
        telefoneE164: ident?.telefoneE164,
      }),
    );
  } catch {
    return false;
  }
}

export function validarEmailGmailPaciente(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return 'Informe o e-mail do paciente.';
  if (!trimmed.endsWith('@gmail.com')) return 'Apenas e-mails @gmail.com são permitidos.';
  return null;
}
