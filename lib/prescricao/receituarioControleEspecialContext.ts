import type { PacienteCompleto } from '@/types/obesidade';
import type { Medico } from '@/types/medico';

export type ReceituarioControleEspecialPacienteContext = {
  pacienteNome: string;
  pacienteCpf?: string;
  enderecoCompleto: string;
  sexo: string;
  idade: string;
  uf: string;
};

function calcIdade(dataNascimento?: Date | string | null): number | null {
  if (!dataNascimento) return null;
  try {
    const nasc = new Date(dataNascimento);
    if (Number.isNaN(nasc.getTime())) return null;
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade >= 0 ? idade : null;
  } catch {
    return null;
  }
}

function labelSexo(sexo?: string): string {
  if (sexo === 'M') return 'Masculino';
  if (sexo === 'F') return 'Feminino';
  if (sexo === 'Outro') return 'Outro';
  return 'Não informado';
}

export function formatEnderecoPaciente(paciente: PacienteCompleto): string {
  const end = paciente.dadosIdentificacao?.endereco;
  if (!end) return 'Não informado';
  const partes = [end.rua, end.cidade, end.estado, end.cep ? `CEP ${end.cep}` : ''].filter(Boolean);
  return partes.length ? partes.join(', ') : 'Não informado';
}

export function formatMedicoEnderecoCompleto(medico: Medico | null): string {
  if (!medico?.localizacao?.endereco?.trim()) return 'Não informado';
  const base = medico.localizacao.endereco.trim();
  const numero = medico.localizacao.numero?.trim();
  const nomeLocal = medico.localizacao.nomeLocal?.trim();
  const partes = [base];
  if (numero) partes.push(`nº ${numero}`);
  if (nomeLocal) partes.push(nomeLocal);
  if (medico.localizacao.cep?.trim()) partes.push(`CEP ${medico.localizacao.cep.trim()}`);
  return partes.join(', ');
}

export function formatMedicoCidade(medico: Medico | null): string {
  const cidade = medico?.cidades?.[0]?.cidade?.trim();
  if (cidade) return cidade;
  return medico?.localizacao?.endereco?.trim() ? '—' : 'Não informado';
}

export function formatMedicoTelefone(medico: Medico | null): string {
  return medico?.telefone?.trim() || 'Não informado';
}

export function buildReceituarioControleEspecialPacienteContext(
  paciente: PacienteCompleto,
  pacienteNome: string,
  pacienteCpf?: string
): ReceituarioControleEspecialPacienteContext {
  const idadeNum = calcIdade(paciente.dadosIdentificacao?.dataNascimento);
  const uf = paciente.dadosIdentificacao?.endereco?.estado?.trim() || '—';
  return {
    pacienteNome,
    pacienteCpf,
    enderecoCompleto: formatEnderecoPaciente(paciente),
    sexo: labelSexo(paciente.dadosIdentificacao?.sexoBiologico),
    idade: idadeNum != null ? String(idadeNum) : 'Não informado',
    uf,
  };
}
