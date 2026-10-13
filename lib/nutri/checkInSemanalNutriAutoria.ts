import type { CheckInSemanalNutri, CheckInSemanalNutriAnsweredBy } from '@/lib/nutri/checkInSemanalNutriTypes';

export function rotuloAutoriaCheckInSemanalNutri(answeredBy?: CheckInSemanalNutriAnsweredBy): string {
  if (answeredBy === 'nutritionist') return 'Preenchido pelo nutricionista';
  if (answeredBy === 'doctor') return 'Preenchido pelo médico';
  return 'Respondido pelo paciente';
}

export function formatarDataHoraCheckInSemanalNutri(value?: Date | null): string {
  if (!value || Number.isNaN(value.getTime())) return '';
  return value.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function origemProntuarioDeAutoria(
  answeredBy?: CheckInSemanalNutriAnsweredBy
): 'paciente' | 'nutri' | 'medico' {
  if (answeredBy === 'nutritionist') return 'nutri';
  if (answeredBy === 'doctor') return 'medico';
  return 'paciente';
}

export function linhaAutoriaCheckInSemanalNutri(record: Pick<CheckInSemanalNutri, 'answeredBy' | 'createdAt' | 'lastEditedBy' | 'lastEditedAt'>): {
  principal: string;
  edicao?: string;
} {
  const quando = formatarDataHoraCheckInSemanalNutri(record.createdAt);
  const principal = quando
    ? `${rotuloAutoriaCheckInSemanalNutri(record.answeredBy)}\n${quando}`
    : rotuloAutoriaCheckInSemanalNutri(record.answeredBy);
  if (!record.lastEditedBy || record.lastEditedBy === record.answeredBy) {
    return { principal };
  }
  const editQuando = formatarDataHoraCheckInSemanalNutri(record.lastEditedAt);
  return {
    principal,
    edicao: editQuando
      ? `Editado pelo ${record.lastEditedBy === 'nutritionist' ? 'nutricionista' : record.lastEditedBy === 'doctor' ? 'médico' : 'paciente'} em ${editQuando}`
      : undefined,
  };
}
