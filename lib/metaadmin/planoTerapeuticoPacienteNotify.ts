export type PlanoTerapeuticoPacienteNotifyInput = {
  pacienteNome: string;
  medicoNome: string;
  aplicacoesUrl: string;
};

function primeiroNome(nomeCompleto: string): string {
  const first = nomeCompleto.trim().split(/\s+/).find((part) => part.length > 0);
  return first || 'Paciente';
}

export function buildPlanoTerapeuticoPacienteNotifyTexto(
  input: PlanoTerapeuticoPacienteNotifyInput
): string {
  const paciente = primeiroNome(input.pacienteNome);
  const medico = input.medicoNome.trim() || 'seu médico';
  const url = input.aplicacoesUrl.trim();
  return [
    `Olá, ${paciente}!`,
    '',
    `${medico} alterou o seu Plano Terapêutico.`,
    '',
    'Abra a página de Aplicações aqui:',
    url,
  ].join('\n');
}
