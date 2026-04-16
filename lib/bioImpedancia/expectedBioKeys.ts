import limitesBio from '@/data/limites_bioimpedancia.json';

const SECTION_ORDER = [
  'composicao_corporal',
  'musculo_gordura',
  'obesidade',
  'massa_magra_segmentar',
  'gordura_segmentar',
] as const;

export type BioJsonSectionId = (typeof SECTION_ORDER)[number];

export const BIO_JSON_SECTION_ORDER: readonly BioJsonSectionId[] = SECTION_ORDER;

export function getBioJsonSectionEntries(): Array<{ sectionId: BioJsonSectionId; keys: string[] }> {
  const root = limitesBio as Record<string, Record<string, unknown>>;
  return SECTION_ORDER.map((sectionId) => ({
    sectionId,
    keys: Object.keys(root[sectionId] || {}),
  }));
}

/** Chaves planas únicas na ordem das seções (para validação Firestore) */
export function getExpectedBioKeys(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { keys } of getBioJsonSectionEntries()) {
    for (const k of keys) {
      if (!seen.has(k)) {
        seen.add(k);
        out.push(k);
      }
    }
  }
  return out;
}
