export type TreinoPacienteNotifyInput = {
  pacienteNome: string;
  personalNome: string;
  treinoUrl: string;
};

function primeiroNome(nomeCompleto: string): string {
  const first = nomeCompleto.trim().split(/\s+/).find((part) => part.length > 0);
  return first || 'Paciente';
}

export function buildTreinoPacienteNotifyTexto(input: TreinoPacienteNotifyInput): string {
  const paciente = primeiroNome(input.pacienteNome);
  const personal = input.personalNome.trim() || 'Seu personal trainer';
  const url = input.treinoUrl.trim();
  return [
    `Olá, ${paciente}!`,
    '',
    `${personal} atualizou o seu treino.`,
    '',
    'Abra o treino aqui:',
    url,
  ].join('\n');
}
