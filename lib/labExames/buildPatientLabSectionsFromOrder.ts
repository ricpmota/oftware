import { getLabRange, type LabLimitOverrides } from '@/utils/labRangesFromJson';
import { LAB_SECTION_LABELS_PT } from '@/lib/labExames/labSectionLabels';

const PREVIEW_DOB = new Date('1980-06-15');

function displayLabelForLabKey(labKey: string, limitOverrides?: LabLimitOverrides | null): string {
  const rM = getLabRange(labKey, 'M', PREVIEW_DOB, limitOverrides ?? null);
  if (rM?.label) return rM.label;
  const rF = getLabRange(labKey, 'F', PREVIEW_DOB, limitOverrides ?? null);
  if (rF?.label) return rF.label;
  return labKey;
}

export type PatientLabField = { key: string; field: string; label: string };

export type PatientLabSection = { sectionId: string; section: string; fields: PatientLabField[] };

/**
 * Monta seções/campos da UI de exames do paciente a partir da ordem do MetaAdmin Geral
 * (`labOrderBySection`) + mapa chave laboratorial → campo no documento do exame.
 */
export function buildPatientLabSectionsFromOrder(
  labOrderBySection: Record<string, string[]>,
  keyToField: Record<string, string>,
  limitOverrides?: LabLimitOverrides | null
): PatientLabSection[] {
  const out: PatientLabSection[] = [];
  for (const sectionId of Object.keys(labOrderBySection)) {
    const keys = labOrderBySection[sectionId];
    if (!Array.isArray(keys)) continue;
    const fields: PatientLabField[] = [];
    for (const labKey of keys) {
      const field = keyToField[labKey];
      if (!field) continue;
      fields.push({
        key: labKey,
        field,
        label: displayLabelForLabKey(labKey, limitOverrides),
      });
    }
    if (fields.length === 0) continue;
    out.push({
      sectionId,
      section: LAB_SECTION_LABELS_PT[sectionId] || sectionId,
      fields,
    });
  }
  return out;
}
