export type ExamesLaboratoriaisPacienteNotifyInput = {
  pacienteNome: string;
  medicoNome: string;
  examesUrl: string;
};

function primeiroNome(nomeCompleto: string): string {
  const first = nomeCompleto.trim().split(/\s+/).find((part) => part.length > 0);
  return first || 'Paciente';
}

export function buildExamesLaboratoriaisPacienteNotifyTexto(
  input: ExamesLaboratoriaisPacienteNotifyInput
): string {
  const paciente = primeiroNome(input.pacienteNome);
  const medico = input.medicoNome.trim() || 'seu médico';
  const url = input.examesUrl.trim();
  const linhas = [
    `Olá, ${paciente}!`,
    '',
    `${medico} inseriu no sistema o resultado dos seus exames laboratoriais.`,
    '',
    'Abra a página de exames aqui:',
    url,
  ];
  return linhas.join('\n');
}
