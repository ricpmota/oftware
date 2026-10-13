export type CardapioPacienteNotifyInput = {
  pacienteNome: string;
  nutriNome: string;
  cardapioUrl: string;
};

function primeiroNome(nomeCompleto: string): string {
  const first = nomeCompleto.trim().split(/\s+/).find((part) => part.length > 0);
  return first || 'Paciente';
}

export function buildCardapioPacienteNotifyTexto(input: CardapioPacienteNotifyInput): string {
  const paciente = primeiroNome(input.pacienteNome);
  const nutri = input.nutriNome.trim() || 'Sua nutricionista';
  const url = input.cardapioUrl.trim();
  return [
    `Olá, ${paciente}!`,
    '',
    `${nutri} atualizou o seu cardápio.`,
    '',
    'Abra o cardápio aqui:',
    url,
  ].join('\n');
}
