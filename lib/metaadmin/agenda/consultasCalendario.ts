import type { ConsultaCalendarioItem } from '@/components/profissional/ProfissionalCalendarioSection';

export function dateKeyFromLocalDate(dia: Date): string {
  const y = dia.getFullYear();
  const m = String(dia.getMonth() + 1).padStart(2, '0');
  const d = String(dia.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function consultasOnDate(
  consultas: ConsultaCalendarioItem[],
  dia: Date
): ConsultaCalendarioItem[] {
  const key = dateKeyFromLocalDate(dia);
  return consultas
    .filter((c) => c.date === key)
    .slice()
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}
