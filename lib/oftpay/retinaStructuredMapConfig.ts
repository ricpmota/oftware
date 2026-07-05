import type { RetinaFindingType, RetinaSection } from '@/types/oftpay/retinaMap';

export interface LocalizedStructuredField {
  section: RetinaSection;
  fieldKey: string;
  label: string;
  findingType: RetinaFindingType;
  /** Permite marcar mais de um ponto no mapa para o mesmo achado. */
  allowMultiple?: boolean;
}

/** Campos estruturados que exigem localização no mapa ao serem selecionados. */
export const LOCALIZED_STRUCTURED_FIELDS: LocalizedStructuredField[] = [
  // Disco
  { section: 'disco', fieldKey: 'atrofia_peripapilar', label: 'Atrofia peripapilar', findingType: 'atrofia_epr' },
  { section: 'disco', fieldKey: 'crescente_escleral', label: 'Crescente escleral', findingType: 'outros' },

  // Mácula
  { section: 'macula', fieldKey: 'alteracoes_pigmentares', label: 'Alterações pigmentares', findingType: 'outros', allowMultiple: true },
  { section: 'macula', fieldKey: 'atrofia', label: 'Atrofia', findingType: 'atrofia_epr' },
  { section: 'macula', fieldKey: 'drusas', label: 'Drusas', findingType: 'drusa', allowMultiple: true },
  { section: 'macula', fieldKey: 'edema_intrarretiniano', label: 'Edema intrarretiniano', findingType: 'edema_macular' },
  { section: 'macula', fieldKey: 'liquido_sub_retiniano', label: 'Líquido sub-retiniano', findingType: 'edema_macular' },
  { section: 'macula', fieldKey: 'hemorragias', label: 'Hemorragias', findingType: 'hemorragia', allowMultiple: true },
  { section: 'macula', fieldKey: 'exsudatos_duros', label: 'Exsudatos duros', findingType: 'exsudato', allowMultiple: true },
  { section: 'macula', fieldKey: 'membrana_epirretiniana', label: 'Membrana epirretiniana', findingType: 'membrana_epirretiniana' },

  // Vasos
  { section: 'vasos', fieldKey: 'hemorragias', label: 'Hemorragias', findingType: 'hemorragia', allowMultiple: true },
  { section: 'vasos', fieldKey: 'exsudatos', label: 'Exsudatos', findingType: 'exsudato', allowMultiple: true },
  { section: 'vasos', fieldKey: 'neovascularizacao', label: 'Neovascularização', findingType: 'microaneurisma', allowMultiple: true },

  // Periferia
  { section: 'periferia', fieldKey: 'degeneracoes_perifericas', label: 'Degenerações periféricas', findingType: 'outros', allowMultiple: true },
  { section: 'periferia', fieldKey: 'lattice', label: 'Lattice', findingType: 'lattice', allowMultiple: true },
  { section: 'periferia', fieldKey: 'buracos_roturas', label: 'Buracos / roturas', findingType: 'rotura', allowMultiple: true },
  { section: 'periferia', fieldKey: 'descolamento_retina', label: 'Descolamento de retina', findingType: 'descolamento_retina' },
  { section: 'periferia', fieldKey: 'degeneracao_vitreorretiniana', label: 'Degeneração vitreorretiniana', findingType: 'outros', allowMultiple: true },
  { section: 'periferia', fieldKey: 'atrofia_periferica', label: 'Atrofia periférica', findingType: 'atrofia_epr', allowMultiple: true },
];

export function makeStructuredKey(section: RetinaSection, fieldKey: string): string {
  return `${section}.${fieldKey}`;
}

export function parseStructuredKey(key: string): { section: RetinaSection; fieldKey: string } | null {
  const dot = key.indexOf('.');
  if (dot <= 0) return null;
  return {
    section: key.slice(0, dot) as RetinaSection,
    fieldKey: key.slice(dot + 1),
  };
}

export function getLocalizedFieldConfig(
  section: RetinaSection,
  fieldKey: string
): LocalizedStructuredField | undefined {
  return LOCALIZED_STRUCTURED_FIELDS.find((f) => f.section === section && f.fieldKey === fieldKey);
}

export function needsMapPlacement(section: RetinaSection, fieldKey: string): boolean {
  return !!getLocalizedFieldConfig(section, fieldKey);
}

export function localizedFieldsForSection(section: RetinaSection): LocalizedStructuredField[] {
  return LOCALIZED_STRUCTURED_FIELDS.filter((f) => f.section === section);
}
