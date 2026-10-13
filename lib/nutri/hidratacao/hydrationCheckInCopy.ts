import { formatHydrationCheckInDateTitle, formatHydrationHistoryDate, formatHydrationLiters } from '@/lib/nutri/hidratacao/hydrationMath';

export type HydrationCheckInSavedDay = {
  date: string;
  weekdayLabel: string;
  goalReached: boolean;
  percentage: number;
  consumedMl?: number;
  goalMl?: number;
};

export type HydrationCheckInSuccessCopy = {
  title: string;
  paragraphs: string[];
  rows: Array<{ label: string; detail: string }>;
};

function weekdayOrDate(day: HydrationCheckInSavedDay): string {
  return formatHydrationCheckInDateTitle(day.date) || day.weekdayLabel || formatHydrationHistoryDate(day.date);
}

/**
 * Feedback pós-salvamento. Sem linguagem punitiva.
 */
export function buildHydrationCheckInSuccessCopy(
  days: HydrationCheckInSavedDay[]
): HydrationCheckInSuccessCopy {
  if (days.length === 0) {
    return {
      title: 'Check-in enviado com sucesso',
      paragraphs: [
        'Seus registros de hidratação foram salvos.',
        'Continue mantendo esse cuidado no seu dia a dia.',
      ],
      rows: [],
    };
  }

  const rows = days.map((day) => {
    const liters = typeof day.consumedMl === 'number' ? formatHydrationLiters(day.consumedMl) : '';
    return {
      label: weekdayOrDate(day),
      detail: day.goalReached
        ? [liters, '✓ Meta atingida'].filter(Boolean).join(' ')
        : [liters, `${day.percentage}% da meta`].filter(Boolean).join(' · '),
    };
  });

  return {
    title: 'Check-in enviado com sucesso',
    paragraphs: [
      'Obrigado por registrar sua hidratação.',
      'Continue mantendo esse cuidado no seu dia a dia.',
    ],
    rows,
  };
}

export const HYDRATION_CHECKIN_EXPIRED_COPY = {
  title: 'Este check-in expirou',
  body: 'Por segurança, este link não está mais disponível. Você pode continuar registrando sua hidratação normalmente pelo seu acompanhamento.',
} as const;

export const HYDRATION_CHECKIN_UNAVAILABLE_COPY = {
  title: 'Não foi possível abrir este acompanhamento.',
  body: 'Solicite um novo link à sua equipe.',
} as const;
