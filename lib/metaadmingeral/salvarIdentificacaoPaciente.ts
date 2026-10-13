import type { PacienteCompleto } from '@/types/obesidade';
import {
  gravacaoLocalizacaoPerfil,
  interpretPatientLocation,
  type PatientLocationInterpretation,
} from '@/lib/localizacao/patientLocationField';
import { LOCALIZACAO_ADMIN_INVALIDA } from '@/lib/localizacao/localizacaoAdministrativa';

export type DadosPacienteIdentificacaoEdit = {
  nomeCompleto: string;
  email: string;
  telefone: string;
  cpf: string;
  dataNascimento: string;
  sexoBiologico: '' | 'M' | 'F' | 'Outro';
  rua: string;
  cidade: string;
  estado: string;
  cep: string;
  codigoIbge: string;
};

export function montarPacienteIdentificacaoAdmin(
  paciente: PacienteCompleto,
  dados: DadosPacienteIdentificacaoEdit,
  rascunho?: PatientLocationInterpretation | null
): PacienteCompleto | { erro: string } {
  const interpretation =
    rascunho ??
    interpretPatientLocation({
      estado: dados.estado,
      cidade: dados.cidade,
      codigoIbge: dados.codigoIbge,
    });
  const gravacao = gravacaoLocalizacaoPerfil(interpretation);
  if (!gravacao) return { erro: LOCALIZACAO_ADMIN_INVALIDA };
  const limpa = !gravacao.estado && !gravacao.cidade && !gravacao.codigoIbge;
  return {
    ...paciente,
    nome: dados.nomeCompleto,
    email: dados.email,
    dadosIdentificacao: {
      ...paciente.dadosIdentificacao,
      nomeCompleto: dados.nomeCompleto,
      email: dados.email,
      telefone: dados.telefone || undefined,
      cpf: dados.cpf || undefined,
      dataNascimento: dados.dataNascimento ? new Date(dados.dataNascimento) : undefined,
      sexoBiologico: dados.sexoBiologico || undefined,
      endereco: {
        ...paciente.dadosIdentificacao?.endereco,
        rua: dados.rua || undefined,
        cep: dados.cep || undefined,
        estado: limpa ? undefined : gravacao.estado,
        cidade: limpa ? undefined : gravacao.cidade,
        codigoIbge: limpa ? undefined : gravacao.codigoIbge,
      },
      dataCadastro: paciente.dadosIdentificacao?.dataCadastro || paciente.dataCadastro || new Date(),
    },
  };
}
