export type CompartilhamentoAceiteRole = 'nutricionista' | 'personal_trainer';

function primeiroNome(nomeCompleto: string): string {
  const first = nomeCompleto.trim().split(/\s+/)[0];
  return first || 'olá';
}

/** Exibe telefone BR de forma legível a partir de dígitos (com ou sem 55). */
export function formatTelefoneBrDisplay(raw: string): string {
  const digits = String(raw || '').replace(/\D/g, '');
  let d = digits;
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw.trim() || '—';
}

export function buildMensagemMedicoAoPaciente(params: {
  role: CompartilhamentoAceiteRole;
  pacienteNome: string;
  profissionalNome: string;
  profissionalTelefone: string;
  profissionalGenero?: 'M' | 'F' | '';
  medicoNome: string;
}): string {
  const nome = primeiroNome(params.pacienteNome);
  const profissionalPrimeiro = primeiroNome(params.profissionalNome);
  const telefone = formatTelefoneBrDisplay(params.profissionalTelefone);
  const medico = params.medicoNome.trim() || 'seu médico';
  const genero = params.profissionalGenero === 'M' || params.profissionalGenero === 'F'
    ? params.profissionalGenero
    : undefined;

  const titulo =
    params.role === 'nutricionista'
      ? genero === 'M'
        ? 'o nutricionista'
        : genero === 'F'
          ? 'a nutricionista'
          : 'o(a) nutricionista'
      : genero === 'F'
        ? 'a personal trainer'
        : genero === 'M'
          ? 'o personal trainer'
          : 'o(a) personal trainer';

  return [
    `Olá, ${nome}!`,
    ``,
    `Quero te avisar que ${titulo} ${params.profissionalNome} agora faz parte do seu acompanhamento.`,
    ``,
    `${profissionalPrimeiro} vai caminhar junto com você nessa jornada. Se precisar falar com ${profissionalPrimeiro}, o contato é:`,
    telefone,
    ``,
    `Qualquer dúvida, pode me chamar por aqui também.`,
    medico,
  ].join('\n');
}

/** Médico → profissional, logo após criar a solicitação de compartilhamento. */
export function buildMensagemMedicoAoProfissionalSolicitacao(params: {
  role: CompartilhamentoAceiteRole;
  profissionalNome: string;
  pacienteNome: string;
  pacienteSexo?: 'M' | 'F' | null;
  medicoNome: string;
  aceiteUrl: string;
}): string {
  const profissional = primeiroNome(params.profissionalNome);
  const medico = params.medicoNome.trim() || 'Seu médico parceiro';
  const paciente = params.pacienteNome.trim() || 'Paciente';
  const pacienteMeu =
    params.pacienteSexo === 'F'
      ? `uma paciente minha, ${paciente}, para ser acompanhada`
      : params.pacienteSexo === 'M'
        ? `um paciente meu, ${paciente}, para ser acompanhado`
        : `um(a) paciente meu(minha), ${paciente}, para ser acompanhado(a)`;
  const papel =
    params.role === 'nutricionista' ? 'no acompanhamento nutricional' : 'nos treinos';

  return [
    `Olá, ${profissional}! Tudo bem?`,
    ``,
    `Aqui é ${medico}. Estou compartilhando ${pacienteMeu} por você ${papel}.`,
    ``,
    `Para aceitar o vínculo, entre no site, vá na aba Pacientes e autorize a solicitação:`,
    params.aceiteUrl,
    ``,
    `Assim que iniciar sua avaliação, me dê um feedback para que possamos acompanhar juntos a evolução do paciente.`,
    ``,
    `Obrigado!`,
    medico,
  ].join('\n');
}

/** Canal Chat → profissional (terceira pessoa), quando o WhatsApp do médico não envia. */
export function buildMensagemCanalChatAoProfissionalSolicitacao(params: {
  role: CompartilhamentoAceiteRole;
  profissionalNome: string;
  pacienteNome: string;
  pacienteSexo?: 'M' | 'F' | null;
  medicoNome: string;
  aceiteUrl: string;
}): string {
  const profissional = primeiroNome(params.profissionalNome);
  const medico = params.medicoNome.trim() || 'Seu médico parceiro';
  const paciente = params.pacienteNome.trim() || 'Paciente';
  const oPaciente =
    params.pacienteSexo === 'F'
      ? `a paciente ${paciente}, para ser acompanhada`
      : params.pacienteSexo === 'M'
        ? `o paciente ${paciente}, para ser acompanhado`
        : `o(a) paciente ${paciente}, para ser acompanhado(a)`;
  const papel =
    params.role === 'nutricionista' ? 'no acompanhamento nutricional' : 'nos treinos';

  return [
    `Olá, ${profissional}! Tudo bem?`,
    ``,
    `${medico} está compartilhando com você ${oPaciente} por você ${papel}.`,
    ``,
    `Para aceitar o vínculo, entre no site, vá na aba Pacientes e autorize a solicitação:`,
    params.aceiteUrl,
    ``,
    `Assim que iniciar sua avaliação, dê um feedback para ${medico}, para que vocês possam acompanhar juntos a evolução do paciente.`,
  ].join('\n');
}

export function buildMensagemProfissionalAoPaciente(params: {
  role: CompartilhamentoAceiteRole;
  pacienteNome: string;
  profissionalNome: string;
  medicoNome: string;
}): string {
  const nome = primeiroNome(params.pacienteNome);
  const medico = params.medicoNome.trim() || 'seu médico';
  const papel =
    params.role === 'nutricionista' ? 'acompanhamento nutricional' : 'acompanhamento de treinos';

  return [
    `Olá, ${nome}!`,
    ``,
    `Agora estamos conectados por aqui — vinculados pelo ${medico}.`,
    ``,
    `A partir de agora, cuido do seu ${papel}. Pode me chamar neste WhatsApp sempre que precisar.`,
    ``,
    `Um abraço,`,
    params.profissionalNome,
  ].join('\n');
}
