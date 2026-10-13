import { primeiroNomePaciente } from '@/lib/aplicacao/buildAplicacaoWhatsAppMessage';
import { formatHydrationMl } from '@/lib/nutri/hidratacao/hydrationMath';

export function buildHydrationCheckInWhatsAppMessage(params: {
  patientName: string;
  url: string;
  goalMl?: number | null;
  pendingCount: number;
}): string {
  const nome = primeiroNomePaciente(params.patientName);
  const link = params.url.trim();

  if (params.pendingCount === 1) {
    return [
      `💧 Olá, ${nome}!`,
      '',
      'Seu acompanhamento de hidratação está quase atualizado.',
      'Falta apenas um registro dos últimos dias.',
      '',
      `👉 ${link}`,
      '',
      'Leva menos de 20 segundos. 💙',
    ].join('\n');
  }

  const metaLine =
    params.goalMl && params.goalMl > 0
      ? `Sua meta diária é de ${formatHydrationMl(params.goalMl)}.`
      : null;

  return [
    `💧 Olá, ${nome}!`,
    '',
    'Vamos atualizar sua hidratação dos últimos dias?',
    metaLine,
    '',
    'Leva menos de 20 segundos e ajuda sua equipe a acompanhar sua evolução.',
    '',
    `👉 ${link}`,
    '',
    'Obrigado por manter seu acompanhamento em dia. 💙',
  ]
    .filter((line) => line !== null)
    .join('\n');
}
