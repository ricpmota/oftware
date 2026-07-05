import type { DoseSemanalEditavel } from '@/lib/treatment-negotiation/types';

export function renumerarDosesSemanais(items: DoseSemanalEditavel[]): DoseSemanalEditavel[] {
  return items.map((d, i) => ({ ...d, semana: i + 1 }));
}

export function adicionarSemanaDose(
  items: DoseSemanalEditavel[],
  doseMg?: number
): DoseSemanalEditavel[] {
  const ultima = items[items.length - 1]?.doseMg ?? 2.5;
  return renumerarDosesSemanais([
    ...items,
    { semana: items.length + 1, doseMg: doseMg ?? ultima, observacao: '' },
  ]);
}

export function removerSemanaDose(
  items: DoseSemanalEditavel[],
  indice: number
): DoseSemanalEditavel[] {
  if (items.length <= 1) return items;
  const copia = items.filter((_, i) => i !== indice);
  return renumerarDosesSemanais(copia);
}

export function duplicarDoseSemana(
  items: DoseSemanalEditavel[],
  indice: number
): DoseSemanalEditavel[] {
  const ref = items[indice];
  if (!ref) return items;
  const copia = [...items];
  copia.splice(indice + 1, 0, {
    semana: indice + 2,
    doseMg: ref.doseMg,
    observacao: ref.observacao ?? '',
  });
  return renumerarDosesSemanais(copia);
}

/** Aplica dose em intervalo inclusivo (semanas 1-based). */
export function aplicarDoseEmIntervalo(
  items: DoseSemanalEditavel[],
  semanaInicio: number,
  semanaFim: number,
  doseMg: number
): DoseSemanalEditavel[] {
  const ini = Math.max(1, Math.min(semanaInicio, semanaFim));
  const fim = Math.max(ini, semanaFim);
  return items.map((d) =>
    d.semana >= ini && d.semana <= fim
      ? { ...d, doseMg: Math.max(0, Math.round(doseMg * 10) / 10) }
      : d
  );
}

export function sincronizarSemanasComDuracao(
  items: DoseSemanalEditavel[],
  semanasPrazo: number
): DoseSemanalEditavel[] {
  const alvo = Math.max(1, semanasPrazo);
  if (items.length === alvo) return renumerarDosesSemanais(items);
  if (items.length > alvo) return renumerarDosesSemanais(items.slice(0, alvo));
  const ultima = items[items.length - 1]?.doseMg ?? 2.5;
  const extras = Array.from({ length: alvo - items.length }, (_, i) => ({
    semana: items.length + i + 1,
    doseMg: ultima,
    observacao: '',
  }));
  return renumerarDosesSemanais([...items, ...extras]);
}
