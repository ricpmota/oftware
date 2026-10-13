import {
  CINQUENTA_KG_DEPOIS_BOOK_PROJECT,
  CINQUENTA_KG_DEPOIS_PARTICIPANT_ID,
} from '@/types/cinquentaKgDepois';

/** Documento raiz do projeto no Patrimônio Global. */
export const CINQUENTA_KG_DEPOIS_PROJECT_DOC = CINQUENTA_KG_DEPOIS_BOOK_PROJECT;

/** global_heritage/{projectId}/participants/{participantId} */
export const CINQUENTA_KG_DEPOIS_PARTICIPANTS_SUBCOLLECTION = 'participants';

export const CINQUENTA_KG_DEPOIS_ANSWERS_SUBCOLLECTION = 'answers';
export const CINQUENTA_KG_DEPOIS_MEMORIES_SUBCOLLECTION = 'memories';

export const CINQUENTA_KG_DEPOIS_GLOBAL_HERITAGE_COLLECTION = 'global_heritage';

export const CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT = {
  id: CINQUENTA_KG_DEPOIS_PARTICIPANT_ID,
  name: 'Antônio',
  weightJourneyLabel: '153 kg → 103 kg',
} as const;

export const CINQUENTA_KG_DEPOIS_AUTOSAVE_DEBOUNCE_MS = 900;
