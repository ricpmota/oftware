import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  CINQUENTA_KG_DEPOIS_ANSWERS_SUBCOLLECTION,
  CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT,
  CINQUENTA_KG_DEPOIS_GLOBAL_HERITAGE_COLLECTION,
  CINQUENTA_KG_DEPOIS_MEMORIES_SUBCOLLECTION,
  CINQUENTA_KG_DEPOIS_PARTICIPANTS_SUBCOLLECTION,
  CINQUENTA_KG_DEPOIS_PROJECT_DOC,
} from '@/lib/50kgdepois/constants';
import { CINQUENTA_KG_DEPOIS_CONSENT_VERSION } from '@/types/cinquentaKgDepois';
import {
  computeInterviewProgressPercent,
  deriveParticipantStatus,
} from '@/lib/50kgdepois/interviewProgress';
import { findQuestionById } from '@/lib/50kgdepois/interviewChapters';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type {
  CinquentaKgDepoisAnswerRecord,
  CinquentaKgDepoisMemoryRecord,
  CinquentaKgDepoisParticipant,
  CinquentaKgDepoisPhase,
  CinquentaKgDepoisSessionPayload,
  CinquentaKgDepoisStatus,
} from '@/types/cinquentaKgDepois';

function timestampToIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function participantRef(participantId: string) {
  const db = getFirestoreAdmin();
  return db
    .collection(CINQUENTA_KG_DEPOIS_GLOBAL_HERITAGE_COLLECTION)
    .doc(CINQUENTA_KG_DEPOIS_PROJECT_DOC)
    .collection(CINQUENTA_KG_DEPOIS_PARTICIPANTS_SUBCOLLECTION)
    .doc(participantId);
}

async function ensureProjectDoc() {
  const db = getFirestoreAdmin();
  const ref = db.collection(CINQUENTA_KG_DEPOIS_GLOBAL_HERITAGE_COLLECTION).doc(CINQUENTA_KG_DEPOIS_PROJECT_DOC);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      bookProject: CINQUENTA_KG_DEPOIS_PROJECT_DOC,
      title: '50 KG DEPOIS',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      editorialMeta: {},
    });
  }
}

function mapParticipantDoc(
  participantId: string,
  data: FirebaseFirestore.DocumentData
): CinquentaKgDepoisParticipant {
  return {
    participantId,
    participantName: String(data.participantName || CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT.name),
    bookProject: '50kg_depois',
    weightJourneyLabel: String(
      data.weightJourneyLabel || CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT.weightJourneyLabel
    ),
    startedAt: timestampToIso(data.startedAt),
    updatedAt: timestampToIso(data.updatedAt),
    completedAt: timestampToIso(data.completedAt),
    currentChapterIndex:
      typeof data.currentChapterIndex === 'number' ? data.currentChapterIndex : 0,
    currentPhase: (data.currentPhase as CinquentaKgDepoisPhase) || 'intro',
    progressPercent: typeof data.progressPercent === 'number' ? data.progressPercent : 0,
    status: (data.status as CinquentaKgDepoisStatus) || 'NOT_STARTED',
    consentAccepted: data.consentAccepted === true,
    consentAcceptedAt: timestampToIso(data.consentAcceptedAt),
    consentVersion: data.consentVersion ? String(data.consentVersion) : null,
    skippedQuestionIds: Array.isArray(data.skippedQuestionIds)
      ? data.skippedQuestionIds.map(String)
      : [],
    editorialMeta: {},
  };
}

function mapAnswerDoc(
  questionId: string,
  data: FirebaseFirestore.DocumentData
): CinquentaKgDepoisAnswerRecord {
  return {
    chapterId: String(data.chapterId || ''),
    questionId,
    questionText: String(data.questionText || ''),
    answer: String(data.answer || ''),
    updatedAt: timestampToIso(data.updatedAt),
    skipped: data.skipped === true,
  };
}

function mapMemoryDoc(id: string, data: FirebaseFirestore.DocumentData): CinquentaKgDepoisMemoryRecord {
  return {
    id,
    title: String(data.title || ''),
    text: String(data.text || ''),
    approxDate: String(data.approxDate || ''),
    lifePhase: String(data.lifePhase || ''),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

export async function getOrCreateParticipant(
  participantId: string = CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT.id
): Promise<CinquentaKgDepoisParticipant> {
  await ensureProjectDoc();
  const ref = participantRef(participantId);
  const snap = await ref.get();

  if (!snap.exists) {
    const payload = {
      participantId,
      participantName: CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT.name,
      bookProject: CINQUENTA_KG_DEPOIS_PROJECT_DOC,
      weightJourneyLabel: CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT.weightJourneyLabel,
      startedAt: null,
      updatedAt: FieldValue.serverTimestamp(),
      completedAt: null,
      currentChapterIndex: 0,
      currentPhase: 'intro',
      progressPercent: 0,
      status: 'NOT_STARTED',
      consentAccepted: false,
      consentAcceptedAt: null,
      consentVersion: null,
      skippedQuestionIds: [],
      editorialMeta: {},
    };
    await ref.set(payload);
    const created = await ref.get();
    return mapParticipantDoc(participantId, created.data()!);
  }

  return mapParticipantDoc(participantId, snap.data()!);
}

export async function loadParticipantSession(
  participantId: string = CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT.id
): Promise<CinquentaKgDepoisSessionPayload> {
  const participant = await getOrCreateParticipant(participantId);
  const ref = participantRef(participantId);

  const [answersSnap, memoriesSnap] = await Promise.all([
    ref.collection(CINQUENTA_KG_DEPOIS_ANSWERS_SUBCOLLECTION).get(),
    ref.collection(CINQUENTA_KG_DEPOIS_MEMORIES_SUBCOLLECTION).get(),
  ]);

  const answers: Record<string, CinquentaKgDepoisAnswerRecord> = {};
  for (const doc of answersSnap.docs) {
    answers[doc.id] = mapAnswerDoc(doc.id, doc.data());
  }

  const memories = memoriesSnap.docs
    .map((doc) => mapMemoryDoc(doc.id, doc.data()))
    .sort((a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || ''));

  return { participant, answers, memories };
}

export type SaveCinquentaKgDepoisAnswersInput = {
  participantId?: string;
  answers: Array<{
    questionId: string;
    answer: string;
    skipped?: boolean;
  }>;
  currentChapterIndex?: number;
  currentPhase?: CinquentaKgDepoisPhase;
  skippedQuestionIds?: string[];
  markCompleted?: boolean;
};

export async function saveCinquentaKgDepoisAnswers(
  input: SaveCinquentaKgDepoisAnswersInput
): Promise<CinquentaKgDepoisSessionPayload> {
  const participantId = input.participantId || CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT.id;
  const existing = await getOrCreateParticipant(participantId);
  const ref = participantRef(participantId);
  const batch = getFirestoreAdmin().batch();

  for (const item of input.answers) {
    const found = findQuestionById(item.questionId);
    if (!found) continue;

    const answerRef = ref.collection(CINQUENTA_KG_DEPOIS_ANSWERS_SUBCOLLECTION).doc(item.questionId);
    batch.set(
      answerRef,
      {
        chapterId: found.chapter.id,
        questionId: item.questionId,
        questionText: found.question.text,
        answer: item.answer,
        skipped: item.skipped === true,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  const session = await loadParticipantSession(participantId);
  const mergedAnswers = { ...session.answers };
  for (const item of input.answers) {
    const found = findQuestionById(item.questionId);
    if (!found) continue;
    mergedAnswers[item.questionId] = {
      chapterId: found.chapter.id,
      questionId: item.questionId,
      questionText: found.question.text,
      answer: item.answer,
      skipped: item.skipped === true,
      updatedAt: new Date().toISOString(),
    };
  }

  const progressPercent = computeInterviewProgressPercent(mergedAnswers);
  const currentPhase = input.markCompleted
    ? 'complete'
    : input.currentPhase || existing.currentPhase;
  const status = deriveParticipantStatus(progressPercent, currentPhase, input.markCompleted ? 'COMPLETED' : existing.status);

  const participantPatch: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    progressPercent,
    status,
    currentPhase,
  };

  if (typeof input.currentChapterIndex === 'number') {
    participantPatch.currentChapterIndex = input.currentChapterIndex;
  }

  if (input.skippedQuestionIds) {
    participantPatch.skippedQuestionIds = input.skippedQuestionIds;
  }

  if (!existing.startedAt && (progressPercent > 0 || currentPhase !== 'intro')) {
    participantPatch.startedAt = FieldValue.serverTimestamp();
  }

  if (input.markCompleted) {
    participantPatch.completedAt = FieldValue.serverTimestamp();
    participantPatch.status = 'COMPLETED';
    participantPatch.currentPhase = 'complete';
  }

  batch.set(ref, participantPatch, { merge: true });
  await batch.commit();

  return loadParticipantSession(participantId);
}

export type AcceptCinquentaKgDepoisConsentInput = {
  participantId?: string;
  consentVersion?: string;
};

export async function acceptCinquentaKgDepoisConsent(
  input: AcceptCinquentaKgDepoisConsentInput
): Promise<CinquentaKgDepoisParticipant> {
  const participantId = input.participantId || CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT.id;
  await getOrCreateParticipant(participantId);
  const ref = participantRef(participantId);

  await ref.set(
    {
      consentAccepted: true,
      consentAcceptedAt: FieldValue.serverTimestamp(),
      consentVersion: input.consentVersion || CINQUENTA_KG_DEPOIS_CONSENT_VERSION,
      currentPhase: 'interview',
      status: 'IN_PROGRESS',
      startedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const snap = await ref.get();
  return mapParticipantDoc(participantId, snap.data()!);
}

export type SaveCinquentaKgDepoisMemoriesInput = {
  participantId?: string;
  memories: Array<{
    id?: string;
    title?: string;
    text: string;
    approxDate?: string;
    lifePhase?: string;
  }>;
  currentPhase?: CinquentaKgDepoisPhase;
  markCompleted?: boolean;
};

export async function saveCinquentaKgDepoisMemories(
  input: SaveCinquentaKgDepoisMemoriesInput
): Promise<CinquentaKgDepoisSessionPayload> {
  const participantId = input.participantId || CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT.id;
  await getOrCreateParticipant(participantId);
  const ref = participantRef(participantId);
  const batch = getFirestoreAdmin().batch();

  for (const memory of input.memories) {
    const memoryRef = memory.id
      ? ref.collection(CINQUENTA_KG_DEPOIS_MEMORIES_SUBCOLLECTION).doc(memory.id)
      : ref.collection(CINQUENTA_KG_DEPOIS_MEMORIES_SUBCOLLECTION).doc();

    batch.set(
      memoryRef,
      {
        title: memory.title?.trim() || '',
        text: memory.text,
        approxDate: memory.approxDate?.trim() || '',
        lifePhase: memory.lifePhase?.trim() || '',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  const participantPatch: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    currentPhase: input.markCompleted ? 'complete' : input.currentPhase || 'memories',
  };

  if (input.markCompleted) {
    participantPatch.completedAt = FieldValue.serverTimestamp();
    participantPatch.status = 'COMPLETED';
  }

  batch.set(ref, participantPatch, { merge: true });
  await batch.commit();

  return loadParticipantSession(participantId);
}

export async function listCinquentaKgDepoisParticipants(): Promise<CinquentaKgDepoisParticipant[]> {
  await ensureProjectDoc();
  const db = getFirestoreAdmin();
  const snap = await db
    .collection(CINQUENTA_KG_DEPOIS_GLOBAL_HERITAGE_COLLECTION)
    .doc(CINQUENTA_KG_DEPOIS_PROJECT_DOC)
    .collection(CINQUENTA_KG_DEPOIS_PARTICIPANTS_SUBCOLLECTION)
    .get();

  return snap.docs.map((doc) => mapParticipantDoc(doc.id, doc.data()));
}

export async function getCinquentaKgDepoisParticipantDetail(
  participantId: string
): Promise<CinquentaKgDepoisSessionPayload | null> {
  const ref = participantRef(participantId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return loadParticipantSession(participantId);
}

export async function deleteCinquentaKgDepoisMemory(
  participantId: string,
  memoryId: string
): Promise<void> {
  await participantRef(participantId)
    .collection(CINQUENTA_KG_DEPOIS_MEMORIES_SUBCOLLECTION)
    .doc(memoryId)
    .delete();
}

/** Remove todas as respostas e memórias e restaura o participante ao estado inicial. */
export async function resetCinquentaKgDepoisParticipant(
  participantId: string = CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT.id
): Promise<void> {
  await ensureProjectDoc();
  const ref = participantRef(participantId);
  const db = getFirestoreAdmin();

  const [answersSnap, memoriesSnap] = await Promise.all([
    ref.collection(CINQUENTA_KG_DEPOIS_ANSWERS_SUBCOLLECTION).get(),
    ref.collection(CINQUENTA_KG_DEPOIS_MEMORIES_SUBCOLLECTION).get(),
  ]);

  const docsToDelete = [...answersSnap.docs, ...memoriesSnap.docs];
  for (let i = 0; i < docsToDelete.length; i += 450) {
    const batch = db.batch();
    for (const doc of docsToDelete.slice(i, i + 450)) {
      batch.delete(doc.ref);
    }
    await batch.commit();
  }

  await ref.set({
    participantId,
    participantName: CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT.name,
    bookProject: CINQUENTA_KG_DEPOIS_PROJECT_DOC,
    weightJourneyLabel: CINQUENTA_KG_DEPOIS_DEFAULT_PARTICIPANT.weightJourneyLabel,
    startedAt: null,
    updatedAt: FieldValue.serverTimestamp(),
    completedAt: null,
    currentChapterIndex: 0,
    currentPhase: 'intro',
    progressPercent: 0,
    status: 'NOT_STARTED',
    consentAccepted: false,
    consentAcceptedAt: null,
    consentVersion: null,
    skippedQuestionIds: [],
    editorialMeta: {},
  });
}
