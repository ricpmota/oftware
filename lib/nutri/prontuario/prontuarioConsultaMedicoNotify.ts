export type ProntuarioConsultaPapel = 'nutricionista' | 'personal';

export type ProntuarioConsultaMedicoNotifyInput = {
  medicoNome: string;
  /** Nome de quem registrou (nutricionista ou educador físico). */
  profissionalNome: string;
  pacienteNome: string;
  data: string;
  hora: string;
  titulo?: string;
  papel?: ProntuarioConsultaPapel;
  genero?: 'M' | 'F';
};

function primeiroNome(nomeCompleto: string): string {
  const first = nomeCompleto.trim().split(/\s+/).find((part) => part.length > 0);
  return first || '';
}

function sujeitoRegistro(input: ProntuarioConsultaMedicoNotifyInput): string {
  const nome = input.profissionalNome.trim();
  const papel = input.papel === 'personal' ? 'personal' : 'nutricionista';
  if (papel === 'personal') {
    if (input.genero === 'F') {
      return nome ? `A educadora física ${nome}` : 'A educadora física';
    }
    return nome ? `O educador físico ${nome}` : 'O educador físico';
  }
  if (input.genero === 'M') {
    return nome ? `O nutricionista ${nome}` : 'O nutricionista';
  }
  return nome ? `A nutricionista ${nome}` : 'A nutricionista';
}

export function buildProntuarioConsultaMedicoNotifyTexto(
  input: ProntuarioConsultaMedicoNotifyInput
): string {
  const medico = input.medicoNome.trim() || 'Doutor(a)';
  const paciente = input.pacienteNome.trim() || 'Paciente';
  const data = input.data.trim() || '—';
  const hora = input.hora.trim() || '—';
  const saudacao = primeiroNome(medico) ? `Olá, ${medico}!` : 'Olá!';
  const titulo = input.titulo?.trim();

  const linhas = [
    saudacao,
    '',
    `${sujeitoRegistro(input)} registrou uma consulta no prontuário de ${paciente}.`,
    'Confira no prontuário o que foi escrito.',
  ];
  if (titulo) {
    linhas.push(`Tipo: ${titulo}`);
  }
  linhas.push('', `📅 ${data}`, `🕐 ${hora}`);
  return linhas.join('\n');
}
