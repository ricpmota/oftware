export type OrientacoesPacienteNotifyInput = {
  pacienteNome: string;
  nutriNome: string;
  mensagensUrl: string;
};

function primeiroNome(nomeCompleto: string): string {
  const first = nomeCompleto.trim().split(/\s+/).find((part) => part.length > 0);
  return first || 'Paciente';
}

export function buildOrientacoesPacienteNotifyTexto(
  input: OrientacoesPacienteNotifyInput
): string {
  const paciente = primeiroNome(input.pacienteNome);
  const nutri = input.nutriNome.trim() || 'Sua nutricionista';
  const url = input.mensagensUrl.trim();
  return [
    `Olá, ${paciente}!`,
    '',
    `${nutri} enviou uma orientação para você.`,
    '',
    'Abra suas mensagens aqui:',
    url,
  ].join('\n');
}
