export type ExamesImagemPacienteNotifyInput = {
  pacienteNome: string;
  medicoNome: string;
  examesImagensUrl: string;
};

function primeiroNome(nomeCompleto: string): string {
  const first = nomeCompleto.trim().split(/\s+/).find((part) => part.length > 0);
  return first || 'Paciente';
}

export function buildExamesImagemPacienteNotifyTexto(
  input: ExamesImagemPacienteNotifyInput
): string {
  const paciente = primeiroNome(input.pacienteNome);
  const medico = input.medicoNome.trim() || 'seu médico';
  const url = input.examesImagensUrl.trim();
  return [
    `Olá, ${paciente}!`,
    '',
    `${medico} inseriu no sistema um exame de imagem.`,
    '',
    'Abra a página de exames (Imagens) aqui:',
    url,
  ].join('\n');
}
