export const CINQUENTA_KG_DEPOIS_BOOK_PROJECT = '50kg_depois' as const;

export const CINQUENTA_KG_DEPOIS_PARTICIPANT_ID = 'antonio' as const;

export const CINQUENTA_KG_DEPOIS_CONSENT_VERSION = '2026-07-12-v1' as const;

export type CinquentaKgDepoisStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type CinquentaKgDepoisPhase =
  | 'intro'
  | 'consent'
  | 'interview'
  | 'memories'
  | 'complete'
  | 'review';

export type CinquentaKgDepoisAnswerRecord = {
  chapterId: string;
  questionId: string;
  questionText: string;
  answer: string;
  updatedAt: string | null;
  skipped?: boolean;
};

export type CinquentaKgDepoisMemoryRecord = {
  id: string;
  title: string;
  text: string;
  approxDate: string;
  lifePhase: string;
  updatedAt: string | null;
};

/** Espaço reservado para camada editorial futura (IA, cenas, timeline, etc.). */
export type CinquentaKgDepoisEditorialMeta = Record<string, never>;

export type CinquentaKgDepoisParticipant = {
  participantId: string;
  participantName: string;
  bookProject: typeof CINQUENTA_KG_DEPOIS_BOOK_PROJECT;
  weightJourneyLabel: string;
  startedAt: string | null;
  updatedAt: string | null;
  completedAt: string | null;
  currentChapterIndex: number;
  currentPhase: CinquentaKgDepoisPhase;
  progressPercent: number;
  status: CinquentaKgDepoisStatus;
  consentAccepted: boolean;
  consentAcceptedAt: string | null;
  consentVersion: string | null;
  skippedQuestionIds: string[];
  editorialMeta?: CinquentaKgDepoisEditorialMeta;
};

export type CinquentaKgDepoisSessionPayload = {
  participant: CinquentaKgDepoisParticipant;
  answers: Record<string, CinquentaKgDepoisAnswerRecord>;
  memories: CinquentaKgDepoisMemoryRecord[];
};
