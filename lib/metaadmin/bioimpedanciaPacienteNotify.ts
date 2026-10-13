export type BioimpedanciaPacienteNotifyInput = {
  pacienteNome: string;
  medicoNome: string;
  metaUrl: string;
};

function primeiroNome(nomeCompleto: string): string {
  const first = nomeCompleto.trim().split(/\s+/).find((part) => part.length > 0);
  return first || 'Paciente';
}

export function buildBioimpedanciaPacienteNotifyTexto(
  input: BioimpedanciaPacienteNotifyInput
): string {
  const paciente = primeiroNome(input.pacienteNome);
  const medico = input.medicoNome.trim() || 'seu médico';
  const url = input.metaUrl.trim();
  return [
    `Olá, ${paciente}!`,
    '',
    `${medico} inseriu no sistema o resultado da sua bioimpedância.`,
    '',
    'Veja o resultado na página inicial:',
    url,
  ].join('\n');
}
