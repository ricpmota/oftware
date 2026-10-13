function primeiroNome(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || 'olá';
}

function tituloMedico(genero?: string | null, nome?: string): string {
  const nomeLimpo = (nome || '').trim() || 'seu médico';
  if (genero === 'F') return `Dra. ${nomeLimpo}`;
  return `Dr. ${nomeLimpo}`;
}

export function buildPacienteCadastroLinkMessage(params: {
  pacienteNome: string;
  medicoNome?: string;
  medicoGenero?: string | null;
  email?: string;
  loginUrl: string;
}): string {
  const medico = tituloMedico(params.medicoGenero, params.medicoNome);
  const emailLinha = params.email?.trim()
    ? ` Use o mesmo e-mail cadastrado (${params.email.trim()}).`
    : ' Use o mesmo e-mail cadastrado.';
  return [
    `Olá, ${primeiroNome(params.pacienteNome)}! ${medico} cadastrou você no Método Emagrecer.`,
    '',
    `Para finalizar seu cadastro, acesse o link e entre com o Google.${emailLinha}`,
    '',
    params.loginUrl,
  ].join('\n');
}
