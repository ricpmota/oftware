import type { Firestore } from 'firebase-admin/firestore';
import { FieldPath } from 'firebase-admin/firestore';
import type { OrganizationId } from '@/lib/organization/organizationTypes';
import type { MigrationCollectionDiagnosis, OrganizationIdDocClass } from '@/lib/migrations/types';

const DEFAULT_PAGE_SIZE = 500;

/** Classifica organizationId — base idempotente para diagnose, dry-run e execute. */
export function classifyOrganizationIdField(
  data: Record<string, unknown> | undefined,
  targetOrganizationId: OrganizationId,
): OrganizationIdDocClass {
  const raw = data?.organizationId;
  if (raw == null) return 'missing';
  const value = String(raw).trim();
  if (!value) return 'empty';
  if (value === targetOrganizationId) return 'with_target';
  return 'with_other';
}

export function isOrganizationBackfillCandidate(
  data: Record<string, unknown> | undefined,
  targetOrganizationId: OrganizationId,
): boolean {
  const kind = classifyOrganizationIdField(data, targetOrganizationId);
  return kind === 'missing' || kind === 'empty';
}

function tallyClassification(
  kind: OrganizationIdDocClass,
  tallies: Pick<
    MigrationCollectionDiagnosis,
    'withOrganizationId' | 'withoutOrganizationId' | 'withTargetOrganizationId' | 'withOtherOrganizationId'
  >,
) {
  switch (kind) {
    case 'missing':
    case 'empty':
      tallies.withoutOrganizationId += 1;
      break;
    case 'with_target':
      tallies.withOrganizationId += 1;
      tallies.withTargetOrganizationId += 1;
      break;
    case 'with_other':
      tallies.withOrganizationId += 1;
      tallies.withOtherOrganizationId += 1;
      break;
  }
}

/** Varredura paginada — somente leitura. */
export async function scanCollectionOrganizationIdStats(
  db: Firestore,
  collectionName: string,
  targetOrganizationId: OrganizationId,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<MigrationCollectionDiagnosis> {
  const started = Date.now();
  let total = 0;
  const tallies = {
    withOrganizationId: 0,
    withoutOrganizationId: 0,
    withTargetOrganizationId: 0,
    withOtherOrganizationId: 0,
  };

  const col = db.collection(collectionName);
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;

  while (true) {
    let query = col.orderBy(FieldPath.documentId()).limit(pageSize);
    if (lastDoc) query = query.startAfter(lastDoc.id);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      total += 1;
      tallyClassification(classifyOrganizationIdField(doc.data(), targetOrganizationId), tallies);
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < pageSize) break;
  }

  return {
    collection: collectionName,
    total,
    ...tallies,
    durationMs: Date.now() - started,
  };
}

export type OrganizationBackfillDocRef = {
  id: string;
  ref: FirebaseFirestore.DocumentReference;
};

/** Lista candidatos ao backfill (sem gravar). */
export async function listOrganizationBackfillCandidates(
  db: Firestore,
  collectionName: string,
  targetOrganizationId: OrganizationId,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<OrganizationBackfillDocRef[]> {
  const candidates: OrganizationBackfillDocRef[] = [];
  const col = db.collection(collectionName);
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;

  while (true) {
    let query = col.orderBy(FieldPath.documentId()).limit(pageSize);
    if (lastDoc) query = query.startAfter(lastDoc.id);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      if (isOrganizationBackfillCandidate(doc.data(), targetOrganizationId)) {
        candidates.push({ id: doc.id, ref: doc.ref });
      }
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < pageSize) break;
  }

  return candidates;
}

const MAX_BATCH_WRITES = 400;

export type OrganizationBackfillCollectionExecuteStats = {
  documentsUpdated: number;
  documentsIgnored: number;
  documentsWithOtherOrganizationId: number;
  errors: Array<{ docId: string; message: string }>;
  durationMs: number;
};

/**
 * Uma única passagem paginada: classifica e grava candidatos em batch.
 * Idempotente — não altera docs com organizationId já preenchido.
 */
export async function executeOrganizationBackfillOnCollection(
  db: Firestore,
  collectionName: string,
  targetOrganizationId: OrganizationId,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<OrganizationBackfillCollectionExecuteStats> {
  const started = Date.now();
  let documentsUpdated = 0;
  let documentsIgnored = 0;
  let documentsWithOtherOrganizationId = 0;
  const errors: Array<{ docId: string; message: string }> = [];

  let batch = db.batch();
  let batchSize = 0;

  const flush = async () => {
    if (batchSize === 0) return;
    await batch.commit();
    batch = db.batch();
    batchSize = 0;
  };

  const col = db.collection(collectionName);
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;

  while (true) {
    let query = col.orderBy(FieldPath.documentId()).limit(pageSize);
    if (lastDoc) query = query.startAfter(lastDoc.id);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      const kind = classifyOrganizationIdField(doc.data(), targetOrganizationId);

      if (kind === 'with_other') {
        documentsWithOtherOrganizationId += 1;
        documentsIgnored += 1;
        continue;
      }

      if (kind === 'with_target') {
        documentsIgnored += 1;
        continue;
      }

      try {
        batch.update(doc.ref, { organizationId: targetOrganizationId });
        batchSize += 1;
        documentsUpdated += 1;

        if (batchSize >= MAX_BATCH_WRITES) {
          await flush();
        }
      } catch (error) {
        errors.push({
          docId: doc.id,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < pageSize) break;
  }

  try {
    await flush();
  } catch (error) {
    errors.push({
      docId: '*batch*',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    documentsUpdated,
    documentsIgnored,
    documentsWithOtherOrganizationId,
    errors,
    durationMs: Date.now() - started,
  };
}

/** @deprecated Prefer executeOrganizationBackfillOnCollection (single pass). */
export async function batchSetOrganizationIdOnCandidates(
  db: Firestore,
  collectionName: string,
  targetOrganizationId: OrganizationId,
  candidates: OrganizationBackfillDocRef[],
): Promise<{ updated: number; ignored: number; errors: Array<{ docId: string; message: string }> }> {
  let updated = 0;
  const errors: Array<{ docId: string; message: string }> = [];

  let batch = db.batch();
  let batchSize = 0;

  const flush = async () => {
    if (batchSize === 0) return;
    await batch.commit();
    batch = db.batch();
    batchSize = 0;
  };

  for (const candidate of candidates) {
    try {
      batch.update(candidate.ref, { organizationId: targetOrganizationId });
      batchSize += 1;
      updated += 1;

      if (batchSize >= MAX_BATCH_WRITES) {
        await flush();
      }
    } catch (error) {
      errors.push({
        docId: candidate.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  try {
    await flush();
  } catch (error) {
    errors.push({
      docId: '*batch*',
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return { updated, ignored: 0, errors };
}
