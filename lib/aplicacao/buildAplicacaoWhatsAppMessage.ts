/**
 * Texto WhatsApp para lembrete de aplicação (mesmo conteúdo do calendário Metaadmin).
 */
export function buildAplicacaoWhatsAppMessage(params: {
  primeiroNome: string;
  url: string;
  ehHoje: boolean;
}): string {
  const nome = params.primeiroNome.trim() || 'Paciente';
  const url = params.url.trim();

  if (params.ehHoje) {
    return `Olá, ${nome}! Hoje é dia da sua aplicação. 💉\n\nDepois de aplicar, é só registrar os dados no link abaixo (leva menos de 1 minuto). Assim consigo acompanhar seu tratamento de perto:\n\n${url}\n\nE se estiver gostando do acompanhamento, ao final você pode indicar o tratamento para alguém que também precise. 💙`;
  }

  return `Olá, ${nome}! Segue o link para você registrar os dados da sua aplicação e mantermos seu tratamento em dia:\n\n${url}\n\nSe quiser, ao final você também pode indicar o tratamento para outras pessoas. 💙`;
}

export function primeiroNomePaciente(nomeCompleto?: string | null): string {
  const nome = nomeCompleto?.trim();
  if (!nome) return 'Paciente';
  return nome.split(/\s+/)[0] || 'Paciente';
}
