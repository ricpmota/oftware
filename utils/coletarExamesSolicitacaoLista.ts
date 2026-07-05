import { getLabRange, type LabLimitOverrides } from '@/utils/labRangesFromJson';
import type { Sex } from '@/types/labRanges';

const CAMPOS_HEMOGRAMA = ['hgb', 'wbc', 'platelets'] as const;

/**
 * Monta os rótulos de exames para o PDF a partir das seleções do modal de solicitação.
 */
export function coletarTodosExamesParaSolicitacaoPdf(
  examesSelecionados: string[],
  examesCustomizados: string[],
  sexo: Sex | undefined,
  dataNascimento: Date | string | undefined,
  labLimitOverrides?: LabLimitOverrides | null
): string[] {
  const todosExames: string[] = [];
  const temHemogramaCompleto = CAMPOS_HEMOGRAMA.every((f) => examesSelecionados.includes(f));

  for (const field of examesSelecionados) {
    if (temHemogramaCompleto && CAMPOS_HEMOGRAMA.includes(field as (typeof CAMPOS_HEMOGRAMA)[number])) {
      if (field === 'hgb' && !todosExames.includes('Hemograma Completo')) {
        todosExames.push('Hemograma Completo');
      }
    } else if (!CAMPOS_HEMOGRAMA.includes(field as (typeof CAMPOS_HEMOGRAMA)[number])) {
      const rangeToUse = getLabRange(field, sexo as Sex, dataNascimento, labLimitOverrides);
      if (rangeToUse?.label) {
        todosExames.push(rangeToUse.label);
      }
    }
  }

  for (const exame of examesCustomizados) {
    if (exame.trim()) {
      todosExames.push(exame.trim());
    }
  }

  return todosExames;
}

/** Converte rótulos salvos no Firestore de volta para chaves do modal + exames customizados. */
export function restaurarSelecaoDeRegistroSalvo(
  examesSalvos: string[],
  sexo: Sex | undefined,
  dataNascimento: Date | string | undefined,
  labOrder: Record<string, string[]>,
  limitOverrides?: LabLimitOverrides | null
): { examesSelecionados: string[]; examesCustomizados: string[] } {
  const labelToKey = new Map<string, string>();
  for (const campos of Object.values(labOrder)) {
    if (!Array.isArray(campos)) continue;
    for (const campoKey of campos) {
      const range = getLabRange(campoKey, sexo as Sex, dataNascimento, limitOverrides);
      if (range?.label) {
        labelToKey.set(range.label.trim().toLowerCase(), campoKey);
      }
    }
  }

  const examesSelecionados: string[] = [];
  const examesCustomizados: string[] = [];

  for (const nome of examesSalvos) {
    const trimmed = nome.trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (lower === 'hemograma completo') {
      for (const k of CAMPOS_HEMOGRAMA) {
        if (!examesSelecionados.includes(k)) examesSelecionados.push(k);
      }
      continue;
    }
    const key = labelToKey.get(lower);
    if (key) {
      if (!examesSelecionados.includes(key)) examesSelecionados.push(key);
    } else {
      examesCustomizados.push(trimmed);
    }
  }

  return {
    examesSelecionados,
    examesCustomizados: examesCustomizados.length > 0 ? examesCustomizados : [''],
  };
}
