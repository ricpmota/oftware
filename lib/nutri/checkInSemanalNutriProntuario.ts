import {
  rotuloDiasSemana,
  rotuloPrincipalConquista,
  rotuloPrincipalDificuldade,
  rotuloSessoesAtividade,
} from '@/lib/nutri/checkInSemanalNutriLabels';
import type { CheckInSemanalNutri } from '@/lib/nutri/checkInSemanalNutriTypes';
import { origemProntuarioDeAutoria } from '@/lib/nutri/checkInSemanalNutriAutoria';
import { getWeeklyNutritionCheckInFlags } from '@/lib/nutri/checkInSemanalNutriFlags';
import { formatNutritionWeekShortLabel, getNutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';
import type { EventoTimelineMock } from '@/app/metaadmin/components/paciente-modal/prontuario/prontuarioTypes';

export const TITULO_CHECKIN_NUTRI_SEMANAL = 'Check-in nutricional semanal';
export const TITULO_CHECKIN_NUTRI_DIARIO_LEGADO = 'Check-in nutricional — histórico anterior';

export function resumirCheckInSemanalNutriProntuario(record: CheckInSemanalNutri): string {
  const partes = [
    record.score != null ? `Score ${Math.round(record.score)}` : '',
    `Aderência ${record.aderenciaPlano}%`,
    `Proteína: ${rotuloDiasSemana(record.diasProteinaMeta)}`,
    `Frutas/vegetais: ${rotuloDiasSemana(record.diasFrutasVegetais)}`,
    `Água: ${rotuloDiasSemana(record.diasMetaAgua)}`,
    `Atividade: ${rotuloSessoesAtividade(record.sessoesAtividadeFisica)}`,
  ].filter(Boolean);

  const dificuldade = rotuloPrincipalDificuldade(record);
  if (dificuldade !== '—') partes.push(`Dificuldade: ${dificuldade}`);
  const conquista = rotuloPrincipalConquista(record);
  if (conquista !== '—') partes.push(`Conquista: ${conquista}`);
  if (record.observacoes?.trim()) partes.push(record.observacoes.trim().slice(0, 120));

  const flags = getWeeklyNutritionCheckInFlags(record);
  if (flags.length) partes.push(`Atenção: ${flags.map((f) => f.label).join('; ')}`);

  return partes.join(' · ');
}

export function checkInsSemanaisNutricaoParaEventos(records: CheckInSemanalNutri[]): EventoTimelineMock[] {
  return records.map((record) => {
    const week = getNutritionWeek(record.weekStart || record.weekKey);
    const [y, m, d] = week.weekEnd.split('-').map(Number);
    const dataRef =
      y && m && d
        ? new Date(y, m - 1, d)
        : record.createdAt && !Number.isNaN(record.createdAt.getTime())
          ? record.createdAt
          : new Date();
    const dd = String(dataRef.getDate()).padStart(2, '0');
    const mm = String(dataRef.getMonth() + 1).padStart(2, '0');
    return {
      id: `nutricao-checkin-semanal-${record.weekKey}`,
      tipo: 'nutricao' as const,
      titulo: TITULO_CHECKIN_NUTRI_SEMANAL,
      descricao: resumirCheckInSemanalNutriProntuario(record),
      data: `${dd}/${mm}/${dataRef.getFullYear()}`,
      origem: origemProntuarioDeAutoria(record.answeredBy),
      destaque: record.score != null ? `Score ${Math.round(record.score)}` : `Semana ${formatNutritionWeekShortLabel(week)}`,
      dados: {
        status: `Semana ${formatNutritionWeekShortLabel(week)}`,
      },
    };
  });
}
