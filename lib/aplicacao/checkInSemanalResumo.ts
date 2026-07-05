import type { CheckInSemanal } from '@/types/obesidade';

export type CheckInSemanalExibicaoItem = {
  key: string;
  label: string;
  valor: string;
};

const CHECK_IN_LABELS: Record<string, string> = {
  fomeSemana: 'Fome na semana',
  periodoMaisFome: 'Período de mais fome',
  saciedadeAoComer: 'Saciedade ao comer',
  consumoAgua: 'Consumo de água',
  consumoProteinas: 'Consumo de proteínas',
  satisfacaoEvolucao: 'Satisfação com a evolução',
  comentarioSemana: 'Comentário do paciente',
};

export const LOCAL_APLICACAO_DISPLAY: Record<string, string> = {
  abdome: 'Abdômen',
  braco: 'Braço',
  coxa: 'Perna',
};

export function checkInSemanalParaExibicao(
  checkIn?: CheckInSemanal | null
): CheckInSemanalExibicaoItem[] {
  if (!checkIn) return [];
  const ordem: Array<keyof CheckInSemanal> = [
    'fomeSemana',
    'periodoMaisFome',
    'saciedadeAoComer',
    'consumoAgua',
    'consumoProteinas',
    'satisfacaoEvolucao',
    'comentarioSemana',
  ];
  return ordem
    .map((key) => {
      const valor = checkIn[key];
      if (typeof valor !== 'string' || !valor.trim()) return null;
      return {
        key: key as string,
        label: CHECK_IN_LABELS[key] ?? key,
        valor: valor.trim(),
      };
    })
    .filter((item): item is CheckInSemanalExibicaoItem => item != null);
}

export function resumirCheckInSemanal(checkIn?: CheckInSemanal): string[] {
  return checkInSemanalParaExibicao(checkIn).map((item) => `${item.label}: ${item.valor}`);
}

export function resumirCheckInSemanalTexto(checkIn?: CheckInSemanal): string {
  return resumirCheckInSemanal(checkIn).join(' · ');
}

export function temCheckInSemanalPreenchido(checkIn?: CheckInSemanal | null): boolean {
  return checkInSemanalParaExibicao(checkIn).length > 0;
}
