import type { Firestore } from 'firebase-admin/firestore';
import type { LabLimitOverrides } from '@/utils/labRangesFromJson';
import { getDefaultLabOrderBySection } from '@/lib/labExames/validateLabOrderBySection';
import {
  customExamsToLimitOverrides,
  extraSectionLabelsFromCustomExams,
  mergeEnabledCustomExamsIntoOrder,
  normalizeLabCustomExams,
  type LabCustomExam,
} from '@/lib/labExames/labCustomExams';

const COLLECTION = 'platformSettings';
const DOC_ID = 'labExames';

export type LabExamesFirestoreConfig = {
  labLimitOverrides: LabLimitOverrides;
  labOrderBySection: Record<string, string[]>;
  labCustomExams: LabCustomExam[];
  labSectionLabels: Record<string, string>;
};

/** Lê ordem + overrides do mesmo documento que `/api/lab-exames-config` (servidor). */
export async function readLabExamesConfigFromFirestore(db: Firestore): Promise<LabExamesFirestoreConfig> {
  const defaultOrder = getDefaultLabOrderBySection();
  try {
    const snap = await db.collection(COLLECTION).doc(DOC_ID).get();
    if (!snap.exists) {
      return {
        labLimitOverrides: {},
        labOrderBySection: defaultOrder,
        labCustomExams: [],
        labSectionLabels: {},
      };
    }
    const data = snap.data();
    const rawOv = data?.labLimitOverrides;
    const catalogOverrides =
      rawOv && typeof rawOv === 'object' && !Array.isArray(rawOv) ? (rawOv as LabLimitOverrides) : {};
    const order = data?.labOrderBySection;
    const catalogOrder =
      order && typeof order === 'object' && !Array.isArray(order)
        ? (order as Record<string, string[]>)
        : defaultOrder;
    const labCustomExams = normalizeLabCustomExams(data?.labCustomExams);
    const enabled = labCustomExams.filter((e) => e.enabled);
    return {
      labLimitOverrides: { ...catalogOverrides, ...customExamsToLimitOverrides(enabled) },
      labOrderBySection: mergeEnabledCustomExamsIntoOrder(catalogOrder, enabled),
      labCustomExams,
      labSectionLabels: extraSectionLabelsFromCustomExams(enabled),
    };
  } catch {
    return {
      labLimitOverrides: {},
      labOrderBySection: defaultOrder,
      labCustomExams: [],
      labSectionLabels: {},
    };
  }
}

/** Lê só `labLimitOverrides` (compatível com chamadas antigas). */
export async function readLabLimitOverridesFromFirestore(db: Firestore): Promise<LabLimitOverrides> {
  const { labLimitOverrides } = await readLabExamesConfigFromFirestore(db);
  return labLimitOverrides;
}
