import type { Firestore } from 'firebase-admin/firestore';
import { FieldPath } from 'firebase-admin/firestore';

const DEFAULT_PAGE_SIZE = 500;

export async function paginateCollection<T>(
  db: Firestore,
  collectionName: string,
  onDocument: (doc: FirebaseFirestore.QueryDocumentSnapshot) => T | void,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<void> {
  const col = db.collection(collectionName);
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;

  while (true) {
    let query = col.orderBy(FieldPath.documentId()).limit(pageSize);
    if (lastDoc) query = query.startAfter(lastDoc.id);

    const snapshot = await query.get();
    if (snapshot.empty) break;

    for (const doc of snapshot.docs) {
      onDocument(doc);
    }

    lastDoc = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < pageSize) break;
  }
}

export async function loadDocumentIdSet(db: Firestore, collectionName: string): Promise<Set<string>> {
  const ids = new Set<string>();
  await paginateCollection(db, collectionName, (doc) => {
    ids.add(doc.id);
  });
  return ids;
}

export async function countDocumentsWhereFieldEquals(
  db: Firestore,
  collectionName: string,
  field: string,
  value: string,
): Promise<number> {
  const snapshot = await db.collection(collectionName).where(field, '==', value).count().get();
  return snapshot.data().count;
}
