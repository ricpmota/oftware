/**
 * IDs estáveis para registros de bioimpedância (CRUD seguro independente da ordenação).
 *
 * CHECKLIST DE TESTES MANUAIS:
 * 1. Criar registro manual
 * 2. Criar registro por upload IA
 * 3. Editar registro mais recente
 * 4. Editar registro antigo
 * 5. Excluir registro mais recente
 * 6. Excluir registro antigo
 * 7. Ter 3 registros em datas diferentes e editar o do meio
 * 8. Verificar se gráfico e histórico mantêm ordem correta
 * 9. Verificar /metaadmin, /meta e /metanutri
 * 10. Registros antigos sem id continuam funcionando
 */

import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import { parseBioDataRegistro } from '@/utils/bioImpedanciaDate';

/** Gera id para novo registro */
export function newBioRegistroId(dataRegistro?: Date | string | number): string {
  const t =
    dataRegistro != null
      ? parseBioDataRegistro(dataRegistro).getTime()
      : Date.now();
  const suffix = Math.random().toString(36).slice(2, 8);
  return `bio_${t}_${suffix}`;
}

/**
 * Garante id em registro legado (determinístico por data+peso até persistir no Firestore).
 * Registros que já têm id são preservados.
 */
export function ensureBioRegistroId(registro: BioImpedanciaRegistro): BioImpedanciaRegistro {
  const existing = registro.id?.trim();
  if (existing) return registro;

  const t = parseBioDataRegistro(registro.dataRegistro).getTime();
  const pesoKey = Math.round((registro.peso ?? 0) * 10);
  return { ...registro, id: `bio_${t}_${pesoKey}` };
}

export function ensureBioRegistrosIds(registros: BioImpedanciaRegistro[]): BioImpedanciaRegistro[] {
  return registros.map(ensureBioRegistroId);
}

export function findRegistroById(
  registros: BioImpedanciaRegistro[],
  id: string | null | undefined
): BioImpedanciaRegistro | null {
  if (!id?.trim()) return null;
  return registros.find((r) => r.id === id) ?? null;
}

/** Fallback para registros antigos sem id persistido */
export function registrosMatchLegacy(a: BioImpedanciaRegistro, b: BioImpedanciaRegistro): boolean {
  const ta = parseBioDataRegistro(a.dataRegistro).getTime();
  const tb = parseBioDataRegistro(b.dataRegistro).getTime();
  if (ta !== tb) return false;
  return Math.abs((a.peso ?? 0) - (b.peso ?? 0)) < 0.05;
}

export function replaceRegistroById(
  registros: BioImpedanciaRegistro[],
  id: string,
  atualizado: BioImpedanciaRegistro
): BioImpedanciaRegistro[] {
  const idx = registros.findIndex((r) => r.id === id);
  if (idx >= 0) {
    return registros.map((r, i) => (i === idx ? { ...atualizado, id } : r));
  }
  return registros;
}

export function replaceRegistroLegacy(
  registros: BioImpedanciaRegistro[],
  original: BioImpedanciaRegistro,
  atualizado: BioImpedanciaRegistro
): BioImpedanciaRegistro[] {
  const idx = registros.findIndex((r) => registrosMatchLegacy(r, original));
  if (idx < 0) return registros;
  const id = registros[idx].id ?? atualizado.id ?? newBioRegistroId(atualizado.dataRegistro);
  return registros.map((r, i) => (i === idx ? { ...atualizado, id } : r));
}

export function removeRegistroById(
  registros: BioImpedanciaRegistro[],
  id: string
): BioImpedanciaRegistro[] {
  return registros.filter((r) => r.id !== id);
}

export function removeRegistroLegacy(
  registros: BioImpedanciaRegistro[],
  original: BioImpedanciaRegistro
): BioImpedanciaRegistro[] {
  return registros.filter((r) => !registrosMatchLegacy(r, original));
}
