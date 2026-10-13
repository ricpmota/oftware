import { FieldPath, FieldValue, Timestamp, type Firestore } from 'firebase-admin/firestore';
import { planDisparoContact, resolveCampaignPhone } from '@/lib/disparos/campaign';
import {
  DISPAROS_CAMPAIGNS_COLLECTION,
  DISPAROS_CONTACTS_SUBCOLLECTION,
  DISPAROS_IMPORTS_COLLECTION,
  DISPAROS_ITEMS_SUBCOLLECTION,
  DISPAROS_OPT_OUT_COLLECTION,
  DISPAROS_PAGE_SIZE,
  DISPAROS_PHONES_SUBCOLLECTION,
  DISPAROS_WHATSAPP_SESSION_ID,
  DISPAROS_WRITE_CHUNK,
} from '@/lib/disparos/constants';
import { pendingItemId } from '@/lib/disparos/itemIds';
import { normalizeDisparoPhone } from '@/lib/disparos/normalizeDisparoPhone';
import type {
  AudienceChoice,
  CampaignPauseReason,
  CampaignStatus,
  CampaignTotals,
  DisparoCampaign,
  DisparoCampaignItem,
  DisparoColumnMapping,
  DisparoImport,
  ImportSummary,
  ImportedContact,
  ImportedContactStatus,
  ImportedPhone,
  PhoneChoice,
} from '@/lib/disparos/types';
import { formatDisparosConnectedPhone } from '@/lib/disparos/whatsappView';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

const EMPTY_TOTALS = (): CampaignTotals => ({
  total: 0,
  pending: 0,
  processing: 0,
  sent: 0,
  failed: 0,
  ignored: 0,
  revisao: 0,
});

function db(): Firestore {
  return getFirestoreAdmin();
}

function iso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && value && 'toDate' in value && typeof value.toDate === 'function') {
    return (value.toDate() as Date).toISOString();
  }
  return null;
}

function phoneFromStored(original: unknown, normalized: unknown, display: unknown): ImportedPhone {
  const canonical = typeof normalized === 'string' ? normalized : null;
  return {
    original: typeof original === 'string' ? original : '',
    normalized: canonical,
    display: typeof display === 'string' ? display : null,
    issue: null,
    usedDefaultDdd: false,
    alreadyHadDdd: false,
    alreadyHadCountry: false,
  };
}

export type IncomingDisparoContact = {
  rowNumber: number;
  nome: string;
  primeiroNome: string;
  telefone1Original: string;
  telefone2Original?: string | null;
  status: ImportedContactStatus;
  optOut?: boolean;
};

function storedStatus(input: IncomingDisparoContact, defaultDdd: string): {
  status: ImportedContactStatus;
  tel1: ReturnType<typeof normalizeDisparoPhone>;
  tel2: ReturnType<typeof normalizeDisparoPhone> | null;
} {
  const tel1 = normalizeDisparoPhone(input.telefone1Original, { defaultDdd });
  const tel2 = input.telefone2Original
    ? normalizeDisparoPhone(input.telefone2Original, { defaultDdd })
    : null;
  let status = input.status;
  const serverValid = tel1.outcome === 'valido' || tel2?.outcome === 'valido';
  if (status === 'valido' && !serverValid) {
    if (tel1.outcome === 'falta_ddd' || tel2?.outcome === 'falta_ddd') status = 'falta_ddd';
    else if (tel1.outcome === 'empty' && (!tel2 || tel2.outcome === 'empty')) status = 'sem_telefone';
    else status = 'invalido';
  }
  return { status, tel1, tel2 };
}

export async function createDisparoImport(input: {
  nome: string;
  nomeArquivo: string;
  createdBy: string;
  dddPadrao: string;
  mapping: DisparoColumnMapping;
  summary: ImportSummary;
}): Promise<DisparoImport> {
  const ref = db().collection(DISPAROS_IMPORTS_COLLECTION).doc();
  const now = new Date();
  await ref.set({
    nome: input.nome.trim() || input.nomeArquivo,
    nomeArquivo: input.nomeArquivo,
    createdAt: Timestamp.fromDate(now),
    createdBy: input.createdBy,
    totalRegistros: input.summary.total,
    totalValidos: input.summary.validos,
    totalInvalidos: input.summary.invalidos,
    totalDuplicados: input.summary.duplicados,
    totalSemTelefone: input.summary.semTelefone,
    totalFaltaDdd: input.summary.faltaDdd,
    totalOptOut: input.summary.optOut,
    telefonesComDddPadrao: input.summary.telefonesComDddPadrao,
    telefonesJaComDdd: input.summary.telefonesJaComDdd,
    telefonesJaComPais: input.summary.telefonesJaComPais,
    dddPadrao: input.dddPadrao,
    pais: 'BR',
    status: 'importando',
    mapping: input.mapping,
  });
  const saved = await ref.get();
  return importFromDoc(saved.id, saved.data() as Record<string, unknown>);
}

export async function appendDisparoContacts(
  importId: string,
  contacts: IncomingDisparoContact[],
): Promise<{ written: number }> {
  if (contacts.length > DISPAROS_WRITE_CHUNK) {
    throw new Error(`Envie no máximo ${DISPAROS_WRITE_CHUNK} contatos por vez.`);
  }
  const importRef = db().collection(DISPAROS_IMPORTS_COLLECTION).doc(importId);
  const snap = await importRef.get();
  if (!snap.exists) throw new Error('Base de contatos não encontrada.');
  const data = snap.data() as Record<string, unknown>;
  if (data.status === 'arquivada') throw new Error('Esta base está arquivada.');
  const defaultDdd = typeof data.dddPadrao === 'string' ? data.dddPadrao : '';
  const batch = db().batch();
  let written = 0;
  for (const contact of contacts) {
    if (!Number.isInteger(contact.rowNumber) || contact.rowNumber < 1) continue;
    const stored = storedStatus(contact, defaultDdd);
    const id = `r_${contact.rowNumber}`;
    const telefones = [stored.tel1.normalized, stored.tel2?.normalized].filter((value): value is string => Boolean(value));
    batch.set(importRef.collection(DISPAROS_CONTACTS_SUBCOLLECTION).doc(id), {
      nomeOriginal: contact.nome ?? '',
      primeiroNome: contact.primeiroNome ?? '',
      nomeLower: (contact.nome ?? '').trim().toLocaleLowerCase('pt-BR'),
      telefone1Original: stored.tel1.original,
      telefone1Normalizado: stored.tel1.normalized,
      telefone1Display: stored.tel1.display,
      telefone2Original: stored.tel2?.original ?? null,
      telefone2Normalizado: stored.tel2?.normalized ?? null,
      telefone2Display: stored.tel2?.display ?? null,
      telefones,
      status: stored.status,
      motivoInvalidacao: stored.status === 'valido' ? null : stored.status,
      optOut: stored.status === 'opt_out' || contact.optOut === true,
      rowNumber: contact.rowNumber,
      createdAt: FieldValue.serverTimestamp(),
    });
    if (stored.status === 'opt_out') {
      for (const phone of telefones) {
        batch.set(
          db().collection(DISPAROS_OPT_OUT_COLLECTION).doc(phone),
          { phone, updatedAt: FieldValue.serverTimestamp(), importacaoId: importId },
          { merge: true },
        );
      }
    }
    written += 1;
  }
  await batch.commit();
  return { written };
}

export async function finishDisparoImport(importId: string): Promise<DisparoImport> {
  const ref = db().collection(DISPAROS_IMPORTS_COLLECTION).doc(importId);
  await ref.set({ status: 'pronta' }, { merge: true });
  const saved = await ref.get();
  if (!saved.exists) throw new Error('Base de contatos não encontrada.');
  return importFromDoc(saved.id, saved.data() as Record<string, unknown>);
}

export async function listDisparoImports(): Promise<DisparoImport[]> {
  const snap = await db().collection(DISPAROS_IMPORTS_COLLECTION).orderBy('createdAt', 'desc').limit(100).get();
  return snap.docs
    .map((doc) => importFromDoc(doc.id, doc.data() as Record<string, unknown>))
    .filter((item) => item.status !== 'arquivada');
}

export async function getDisparoImport(importId: string): Promise<DisparoImport | null> {
  const snap = await db().collection(DISPAROS_IMPORTS_COLLECTION).doc(importId).get();
  if (!snap.exists) return null;
  return importFromDoc(snap.id, snap.data() as Record<string, unknown>);
}

export async function listDisparoContacts(input: {
  importId: string;
  status?: ImportedContactStatus | 'todos';
  q?: string;
  cursor?: string | null;
  limit?: number;
}): Promise<{ contacts: ImportedContact[]; nextCursor: string | null }> {
  const limit = Math.min(input.limit ?? DISPAROS_PAGE_SIZE, 50);
  const base = db().collection(DISPAROS_IMPORTS_COLLECTION).doc(input.importId).collection(DISPAROS_CONTACTS_SUBCOLLECTION);
  const term = input.q?.trim() ?? '';
  const digits = term.replace(/\D/g, '');
  const phoneKey = digits.startsWith('55') || digits.length > 11 ? digits : digits.length >= 10 ? `55${digits}` : digits;
  let query = base.orderBy('rowNumber');
  if (digits.length >= 8) {
    query = base.where('telefones', 'array-contains', phoneKey.length > 13 ? phoneKey.slice(0, 13) : phoneKey).orderBy('rowNumber');
  } else if (term) {
    const prefix = term.toLocaleLowerCase('pt-BR');
    query = base.orderBy('nomeLower').startAt(prefix).endAt(`${prefix}\uf8ff`);
  } else if (input.status && input.status !== 'todos') {
    query = base.where('status', '==', input.status).orderBy('rowNumber');
  }
  if (input.cursor && !term) {
    const cursor = Number(input.cursor);
    if (Number.isInteger(cursor)) query = query.startAfter(cursor);
  }
  const snap = await query.limit(limit).get();
  const contacts = snap.docs.map((doc) => contactFromDoc(input.importId, doc.id, doc.data() as Record<string, unknown>));
  const last = snap.docs.at(-1)?.data() as Record<string, unknown> | undefined;
  const nextCursor =
    !term && snap.size === limit && typeof last?.rowNumber === 'number' ? String(last.rowNumber) : null;
  return { contacts, nextCursor };
}

async function deleteQueryPages(collection: ReturnType<Firestore['collection']>): Promise<void> {
  for (;;) {
    const page = await collection.limit(200).get();
    if (page.empty) break;
    const batch = db().batch();
    page.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

export async function deleteDisparoCampaign(campaignId: string): Promise<void> {
  const ref = db().collection(DISPAROS_CAMPAIGNS_COLLECTION).doc(campaignId);
  const snap = await ref.get();
  if (!snap.exists) return;
  await ref.set(
    { status: 'cancelada', nextRunAt: null, cancelledAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  await deleteQueryPages(ref.collection(DISPAROS_ITEMS_SUBCOLLECTION));
  await deleteQueryPages(ref.collection(DISPAROS_PHONES_SUBCOLLECTION));
  await ref.delete();
}

export async function deleteDisparoImport(importId: string): Promise<{ mode: 'deleted' | 'archived' }> {
  const linked = await db()
    .collection(DISPAROS_CAMPAIGNS_COLLECTION)
    .where('importacaoId', '==', importId)
    .limit(1)
    .get();
  const ref = db().collection(DISPAROS_IMPORTS_COLLECTION).doc(importId);
  if (!linked.empty) {
    await ref.set({ status: 'arquivada', arquivadaEm: FieldValue.serverTimestamp() }, { merge: true });
    return { mode: 'archived' };
  }
  const contacts = ref.collection(DISPAROS_CONTACTS_SUBCOLLECTION);
  for (;;) {
    const page = await contacts.limit(200).get();
    if (page.empty) break;
    const batch = db().batch();
    page.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  await ref.delete();
  return { mode: 'deleted' };
}

export async function createDisparoCampaignRecord(input: {
  nome: string;
  importacaoId: string;
  messageTemplate: string;
  phoneChoice: PhoneChoice;
  audience: AudienceChoice;
  intervalMinutes: number;
  selectedIds: string[];
  createdBy: string;
  senderPhone: string | null;
  senderProfileName: string | null;
}): Promise<DisparoCampaign> {
  const source = await getDisparoImport(input.importacaoId);
  if (!source || source.status !== 'pronta') throw new Error('A base precisa estar pronta para virar campanha.');
  const ref = db().collection(DISPAROS_CAMPAIGNS_COLLECTION).doc();
  const now = new Date();
  await ref.set({
    nome: input.nome.trim(),
    importacaoId: input.importacaoId,
    mensagemTemplate: input.messageTemplate.trim(),
    telefoneStrategy: input.phoneChoice,
    audience: input.audience,
    intervaloValor: input.intervalMinutes,
    intervaloUnidade: 'minutos',
    intervaloMs: input.intervalMinutes * 60_000,
    status: 'preparando',
    pauseReason: null,
    totals: EMPTY_TOTALS(),
    createdAt: Timestamp.fromDate(now),
    startedAt: null,
    pausedAt: null,
    completedAt: null,
    cancelledAt: null,
    nextRunAt: null,
    senderSessionId: DISPAROS_WHATSAPP_SESSION_ID,
    senderPhoneSnapshot: input.senderPhone,
    senderProfileName: input.senderProfileName,
    createdBy: input.createdBy,
    materializeAfterRow: 0,
    materializeDone: false,
    nextSequence: 1,
    lastSequence: 0,
    processingItemId: null,
    processingPhase: null,
    processingLeaseExpiresAt: null,
    selectedIds: input.audience === 'selecionados' ? input.selectedIds : [],
  });
  await materializeDisparoCampaign(ref.id, { owner: 'request' });
  const saved = await ref.get();
  return campaignFromDoc(saved.id, saved.data() as Record<string, unknown>);
}

export async function materializeDisparoCampaign(
  campaignId: string,
  options?: { maxChunks?: number; owner?: string },
): Promise<{ done: boolean }> {
  const maxChunks = options?.maxChunks;
  const owner = options?.owner ?? 'request';
  const ref = db().collection(DISPAROS_CAMPAIGNS_COLLECTION).doc(campaignId);
  const locked = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.get('status') !== 'preparando') return false;
    const until = snap.get('materializeLockUntil');
    const holder = snap.get('materializeOwner');
    const expires = typeof until?.toDate === 'function' ? until.toDate().getTime() : 0;
    if (expires > Date.now() && holder && holder !== owner) return false;
    tx.set(
      ref,
      {
        materializeOwner: owner,
        materializeLockUntil: Timestamp.fromDate(new Date(Date.now() + 180_000)),
      },
      { merge: true },
    );
    return true;
  });
  if (!locked) return { done: false };
  for (let chunk = 0; maxChunks === undefined || chunk < maxChunks; chunk += 1) {
    await ref.set(
      {
        materializeOwner: owner,
        materializeLockUntil: Timestamp.fromDate(new Date(Date.now() + 180_000)),
      },
      { merge: true },
    );
    const snap = await ref.get();
    if (!snap.exists) return { done: true };
    const data = snap.data() as Record<string, unknown>;
    if (data.status !== 'preparando' || data.materializeDone === true) return { done: true };
    const importId = String(data.importacaoId || '');
    const after = typeof data.materializeAfterRow === 'number' ? data.materializeAfterRow : 0;
    const contactsSnap = await db()
      .collection(DISPAROS_IMPORTS_COLLECTION)
      .doc(importId)
      .collection(DISPAROS_CONTACTS_SUBCOLLECTION)
      .orderBy('rowNumber')
      .startAfter(after)
      .limit(DISPAROS_WRITE_CHUNK)
      .get();
    if (contactsSnap.empty) {
      await finishMaterialize(ref, data);
      return { done: true };
    }
    const selected = new Set(Array.isArray(data.selectedIds) ? data.selectedIds.map(String) : []);
    const audience = data.audience === 'selecionados' ? 'selecionados' : 'validos';
    const phoneChoice = (data.telefoneStrategy as PhoneChoice) || 'telefone1';
    const template = String(data.mensagemTemplate || '');
    const used = new Set<string>();
    const batch = db().batch();
    let lastRow = after;
    let sequence = typeof data.lastSequence === 'number' ? data.lastSequence : 0;
    const delta = EMPTY_TOTALS();
    const eligible = contactsSnap.docs.flatMap((doc) => {
      const row = doc.data() as Record<string, unknown>;
      const rowNumber = typeof row.rowNumber === 'number' ? row.rowNumber : lastRow;
      const contact = contactFromDoc(importId, doc.id, row);
      if (audience === 'selecionados' && !selected.has(doc.id)) return [];
      if (audience === 'validos' && contact.status !== 'valido' && contact.status !== 'opt_out') return [];
      return [{ doc, rowNumber, contact }];
    });
    const phoneRefs = eligible.flatMap((entry) => {
      const chosen = resolveCampaignPhone(entry.contact, phoneChoice);
      return chosen.phone ? [ref.collection(DISPAROS_PHONES_SUBCOLLECTION).doc(chosen.phone)] : [];
    });
    if (phoneRefs.length > 0) {
      const existingPhones = await Promise.all(phoneRefs.map((phoneRef) => phoneRef.get()));
      for (const phoneSnap of existingPhones) {
        if (phoneSnap.exists) used.add(phoneSnap.id);
      }
    }
    const pageLast = contactsSnap.docs.at(-1)?.data() as Record<string, unknown> | undefined;
    if (typeof pageLast?.rowNumber === 'number') lastRow = pageLast.rowNumber;
    for (const entry of eligible) {
      const planned = planDisparoContact(
        entry.contact,
        { audience, phoneChoice, messageTemplate: template },
        used,
      );
      delta.total += 1;
      if (planned.status === 'ignored') {
        delta.ignored += 1;
        batch.set(ref.collection(DISPAROS_ITEMS_SUBCOLLECTION).doc(`i_${entry.doc.id}`), itemPayload(planned, {
          campaignId,
          importacaoId: importId,
          sequence: null,
        }));
      } else {
        sequence += 1;
        delta.pending += 1;
        batch.set(ref.collection(DISPAROS_ITEMS_SUBCOLLECTION).doc(pendingItemId(sequence)), itemPayload(planned, {
          campaignId,
          importacaoId: importId,
          sequence,
        }));
        if (planned.telefone) {
          batch.set(ref.collection(DISPAROS_PHONES_SUBCOLLECTION).doc(planned.telefone), {
            itemId: pendingItemId(sequence),
            createdAt: FieldValue.serverTimestamp(),
          });
        }
      }
    }
    // update() entra no mapa totals. set()+merge gravaria um campo com ponto no nome e o contador ficaria 0.
    batch.update(ref, {
      materializeAfterRow: lastRow,
      lastSequence: sequence,
      'totals.total': FieldValue.increment(delta.total),
      'totals.pending': FieldValue.increment(delta.pending),
      'totals.ignored': FieldValue.increment(delta.ignored),
    });
    await batch.commit();
    if (lastRow <= after) return { done: false };
    if (contactsSnap.size < DISPAROS_WRITE_CHUNK) {
      const fresh = await ref.get();
      await finishMaterialize(ref, fresh.data() as Record<string, unknown>);
      return { done: true };
    }
  }
  await ref.set({ materializeLockUntil: Timestamp.fromDate(new Date(0)) }, { merge: true });
  return { done: false };
}

function itemPayload(
  planned: ReturnType<typeof planDisparoContact>,
  meta: { campaignId: string; importacaoId: string; sequence: number | null },
) {
  return {
    campaignId: meta.campaignId,
    importacaoId: meta.importacaoId,
    contatoId: planned.contactId,
    nome: planned.nome,
    primeiroNome: planned.primeiroNome,
    nomeLower: planned.nome.trim().toLocaleLowerCase('pt-BR'),
    telefone: planned.telefone,
    mensagemFinal: planned.mensagemFinal,
    status: planned.status,
    ignoreReason: planned.ignoreReason,
    sequence: meta.sequence,
    attempts: 0,
    phase: null,
    createdAt: FieldValue.serverTimestamp(),
    processingAt: null,
    sentAt: null,
    failedAt: null,
    errorCode: null,
    errorMessage: null,
    senderSessionId: null,
    senderPhone: null,
    providerMessageId: null,
  };
}

export async function campaignHasUnfinishedItems(ref: FirebaseFirestore.DocumentReference): Promise<boolean> {
  const open = await ref
    .collection(DISPAROS_ITEMS_SUBCOLLECTION)
    .where('status', 'in', ['pending', 'processing', 'needs_review'])
    .limit(1)
    .get();
  return !open.empty;
}

async function finishMaterialize(
  ref: FirebaseFirestore.DocumentReference,
  data: Record<string, unknown>,
) {
  const now = Timestamp.fromDate(new Date());
  const unfinished = await campaignHasUnfinishedItems(ref);
  if (!unfinished) {
    await ref.set(
      { materializeDone: true, materializeLockUntil: Timestamp.fromDate(new Date(0)), status: 'concluida', completedAt: now, nextRunAt: null },
      { merge: true },
    );
    return;
  }
  await ref.set(
    {
      materializeDone: true,
      materializeLockUntil: Timestamp.fromDate(new Date(0)),
      status: 'em_andamento',
      startedAt: data.startedAt ?? now,
      nextRunAt: now,
    },
    { merge: true },
  );
}

export async function listDisparoCampaigns(): Promise<DisparoCampaign[]> {
  const snap = await db().collection(DISPAROS_CAMPAIGNS_COLLECTION).orderBy('createdAt', 'desc').limit(50).get();
  return snap.docs.map((doc) => campaignFromDoc(doc.id, doc.data() as Record<string, unknown>));
}

export async function getDisparoCampaign(campaignId: string): Promise<DisparoCampaign | null> {
  const snap = await db().collection(DISPAROS_CAMPAIGNS_COLLECTION).doc(campaignId).get();
  if (!snap.exists) return null;
  return campaignFromDoc(snap.id, snap.data() as Record<string, unknown>);
}

export async function listDisparoCampaignItems(input: {
  campaignId: string;
  status?: string;
  q?: string;
  cursor?: string | null;
}): Promise<{ items: DisparoCampaignItem[]; nextCursor: string | null }> {
  const base = db().collection(DISPAROS_CAMPAIGNS_COLLECTION).doc(input.campaignId).collection(DISPAROS_ITEMS_SUBCOLLECTION);
  const term = input.q?.trim() ?? '';
  const digits = term.replace(/\D/g, '');
  const phoneKey = digits.startsWith('55') || digits.length > 11 ? digits : digits.length >= 10 ? `55${digits}` : digits;
  let query = base.orderBy('createdAt');
  if (digits.length >= 8) query = base.where('telefone', '==', phoneKey);
  else if (term) {
    const prefix = term.toLocaleLowerCase('pt-BR');
    query = base.orderBy('nomeLower').startAt(prefix).endAt(`${prefix}\uf8ff`);
  } else if (input.status && input.status !== 'todos') {
    query = base.where('status', '==', input.status).orderBy('createdAt');
  }
  if (input.cursor && !digits && !term) {
    const cursorDoc = await base.doc(input.cursor).get();
    if (cursorDoc.exists) query = query.startAfter(cursorDoc);
  }
  const snap = await query.limit(DISPAROS_PAGE_SIZE).get();
  return {
    items: snap.docs.map((doc) => itemFromDoc(doc.id, doc.data() as Record<string, unknown>)),
    nextCursor: snap.size === DISPAROS_PAGE_SIZE ? snap.docs.at(-1)?.id ?? null : null,
  };
}

export async function pauseDisparoCampaignRecord(campaignId: string): Promise<DisparoCampaign> {
  const ref = db().collection(DISPAROS_CAMPAIGNS_COLLECTION).doc(campaignId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Campanha não encontrada.');
  const status = snap.get('status');
  if (status !== 'em_andamento' && status !== 'preparando') {
    throw new Error('Esta campanha não pode ser pausada.');
  }
  await ref.set(
    { status: 'pausada', pauseReason: 'manual', pausedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  const saved = await ref.get();
  return campaignFromDoc(saved.id, saved.data() as Record<string, unknown>);
}

async function requeueFailedDisparoItems(ref: FirebaseFirestore.DocumentReference): Promise<void> {
  let requeued = 0;
  let minSequence: number | null = null;
  for (;;) {
    const page = await ref.collection(DISPAROS_ITEMS_SUBCOLLECTION).where('status', '==', 'failed').limit(400).get();
    if (page.empty) break;
    const batch = db().batch();
    for (const item of page.docs) {
      const sequence = item.get('sequence');
      if (typeof sequence === 'number' && (minSequence === null || sequence < minSequence)) minSequence = sequence;
      batch.update(item.ref, {
        status: 'pending',
        phase: null,
        errorCode: null,
        errorMessage: null,
        failedAt: null,
        leaseExpiresAt: null,
      });
      requeued += 1;
    }
    await batch.commit();
  }
  if (requeued === 0) return;
  await ref.update({
    'totals.failed': FieldValue.increment(-requeued),
    'totals.pending': FieldValue.increment(requeued),
    ...(minSequence === null ? {} : { nextSequence: minSequence }),
    nextRunAt: Timestamp.fromDate(new Date()),
  });
}

export async function resumeDisparoCampaignRecord(
  campaignId: string,
  options?: { retryFailed?: boolean },
): Promise<DisparoCampaign> {
  const ref = db().collection(DISPAROS_CAMPAIGNS_COLLECTION).doc(campaignId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Campanha não encontrada.');
  if (snap.get('status') === 'cancelada') throw new Error('Campanha cancelada não pode ser retomada.');
  if (snap.get('status') !== 'pausada') throw new Error('Esta campanha não está pausada.');
  if (options?.retryFailed) await requeueFailedDisparoItems(ref);
  const fresh = await ref.get();
  const next = fresh.get('nextRunAt');
  const due = !next || (typeof next?.toDate === 'function' && next.toDate().getTime() <= Date.now());
  await ref.set(
    {
      status: 'em_andamento',
      pauseReason: null,
      nextRunAt: due ? Timestamp.fromDate(new Date()) : next,
    },
    { merge: true },
  );
  const saved = await ref.get();
  return campaignFromDoc(saved.id, saved.data() as Record<string, unknown>);
}

export async function cancelDisparoCampaignRecord(campaignId: string): Promise<DisparoCampaign> {
  const ref = db().collection(DISPAROS_CAMPAIGNS_COLLECTION).doc(campaignId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Campanha não encontrada.');
  if (snap.get('status') === 'cancelada' || snap.get('status') === 'concluida') {
    throw new Error('Esta campanha já foi encerrada.');
  }
  await ref.set(
    {
      status: 'cancelada',
      pauseReason: null,
      cancelledAt: FieldValue.serverTimestamp(),
      processingItemId: null,
      processingPhase: null,
    },
    { merge: true },
  );
  const saved = await ref.get();
  return campaignFromDoc(saved.id, saved.data() as Record<string, unknown>);
}

export async function keepSuccessfullySentContacts(campaignId: string): Promise<{ kept: number; removed: number }> {
  const campaignRef = db().collection(DISPAROS_CAMPAIGNS_COLLECTION).doc(campaignId);
  const campaign = await campaignRef.get();
  if (!campaign.exists) throw new Error('Campanha não encontrada.');
  if (campaign.get('status') !== 'concluida') {
    throw new Error('A lista só pode ser atualizada quando a campanha terminar.');
  }
  const importRef = db().collection(DISPAROS_IMPORTS_COLLECTION).doc(String(campaign.get('importacaoId') || ''));
  if (!(await importRef.get()).exists) throw new Error('Base de contatos não encontrada.');

  const sentIds = new Set<string>();
  const sentPhones = new Set<string>();
  let lastItem: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  for (;;) {
    let query = campaignRef.collection(DISPAROS_ITEMS_SUBCOLLECTION).orderBy(FieldPath.documentId()).limit(400);
    if (lastItem) query = query.startAfter(lastItem);
    const page = await query.get();
    if (page.empty) break;
    for (const item of page.docs) {
      if (item.get('status') !== 'sent') continue;
      const contactId = String(item.get('contatoId') || '');
      const phone = String(item.get('telefone') || '');
      if (contactId) sentIds.add(contactId);
      if (phone) sentPhones.add(phone);
    }
    lastItem = page.docs.at(-1) ?? null;
    if (page.size < 400) break;
  }

  let removed = 0;
  let lastContact: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  const contacts = importRef.collection(DISPAROS_CONTACTS_SUBCOLLECTION);
  for (;;) {
    let query = contacts.orderBy(FieldPath.documentId()).limit(400);
    if (lastContact) query = query.startAfter(lastContact);
    const page = await query.get();
    if (page.empty) break;
    const batch = db().batch();
    let deletes = 0;
    for (const contact of page.docs) {
      const phones = [
        ...(Array.isArray(contact.get('telefones')) ? contact.get('telefones') : []),
        contact.get('telefone1Normalizado'),
        contact.get('telefone2Normalizado'),
      ]
        .map((value) => String(value || ''))
        .filter(Boolean);
      const kept = sentIds.has(contact.id) || phones.some((phone) => sentPhones.has(phone));
      if (!kept) {
        batch.delete(contact.ref);
        deletes += 1;
        removed += 1;
      }
    }
    if (deletes > 0) await batch.commit();
    lastContact = page.docs.at(-1) ?? null;
    if (page.size < 400) break;
  }

  const statusKeys = ['valido', 'opt_out', 'duplicado', 'invalido', 'sem_telefone', 'falta_ddd'] as const;
  const counts: Record<(typeof statusKeys)[number], number> = {
    valido: 0,
    opt_out: 0,
    duplicado: 0,
    invalido: 0,
    sem_telefone: 0,
    falta_ddd: 0,
  };
  for (const status of statusKeys) {
    const snap = await contacts.where('status', '==', status).count().get();
    counts[status] = snap.data().count;
  }
  const total = statusKeys.reduce((sum, status) => sum + counts[status], 0);
  await importRef.update({
    totalRegistros: total,
    totalValidos: counts.valido,
    totalInvalidos: counts.invalido,
    totalDuplicados: counts.duplicado,
    totalSemTelefone: counts.sem_telefone,
    totalFaltaDdd: counts.falta_ddd,
    totalOptOut: counts.opt_out,
  });
  await campaignRef.set(
    { listaAtualizadaEm: FieldValue.serverTimestamp(), listaMantidos: sentIds.size, listaRemovidos: removed },
    { merge: true },
  );
  return { kept: sentIds.size, removed };
}

export function importFromDoc(id: string, data: Record<string, unknown>): DisparoImport {
  const summary: ImportSummary = {
    total: numberField(data.totalRegistros),
    validos: numberField(data.totalValidos),
    invalidos: numberField(data.totalInvalidos),
    duplicados: numberField(data.totalDuplicados),
    semTelefone: numberField(data.totalSemTelefone),
    faltaDdd: numberField(data.totalFaltaDdd),
    optOut: numberField(data.totalOptOut),
    telefonesComDddPadrao: numberField(data.telefonesComDddPadrao),
    telefonesJaComDdd: numberField(data.telefonesJaComDdd),
    telefonesJaComPais: numberField(data.telefonesJaComPais),
  };
  const mapping = (data.mapping ?? {}) as DisparoColumnMapping;
  const status = data.status === 'pronta' || data.status === 'arquivada' ? data.status : 'importando';
  return {
    id,
    name: String(data.nome || data.nomeArquivo || 'Base'),
    fileName: String(data.nomeArquivo || ''),
    importedAt: iso(data.createdAt) || new Date(0).toISOString(),
    mapping: {
      nome: mapping.nome || '',
      telefone1: mapping.telefone1 || '',
      telefone2: mapping.telefone2 || '',
    },
    summary,
    status,
    defaultDdd: typeof data.dddPadrao === 'string' ? data.dddPadrao : '',
  };
}

function contactFromDoc(importId: string, id: string, data: Record<string, unknown>): ImportedContact {
  const status = (data.status as ImportedContactStatus) || 'invalido';
  const tel1 = phoneFromStored(data.telefone1Original, data.telefone1Normalizado, data.telefone1Display);
  if (status === 'falta_ddd') tel1.issue = 'falta_ddd';
  else if (status === 'invalido') tel1.issue = 'invalido';
  else if (status === 'sem_telefone') tel1.issue = 'empty';
  const hasSecond = typeof data.telefone2Original === 'string';
  return {
    id,
    importId,
    rowNumber: numberField(data.rowNumber),
    nome: String(data.nomeOriginal || ''),
    primeiroNome: String(data.primeiroNome || ''),
    telefone1: tel1,
    telefone2: hasSecond
      ? phoneFromStored(data.telefone2Original, data.telefone2Normalizado, data.telefone2Display)
      : null,
    status,
    optOut: data.optOut === true || status === 'opt_out',
  };
}

function campaignCounter(data: Record<string, unknown>, key: keyof CampaignTotals): number {
  const totalsRaw = (data.totals ?? {}) as Partial<CampaignTotals>;
  const nested = numberField(totalsRaw[key]);
  const literal = numberField(data[`totals.${key}`]);
  if (nested === 0 && literal > 0) return literal;
  return nested;
}

export function campaignFromDoc(id: string, data: Record<string, unknown>): DisparoCampaign {
  const totals: CampaignTotals = {
    total: campaignCounter(data, 'total'),
    pending: campaignCounter(data, 'pending'),
    processing: campaignCounter(data, 'processing'),
    sent: campaignCounter(data, 'sent'),
    failed: campaignCounter(data, 'failed'),
    ignored: campaignCounter(data, 'ignored'),
    revisao: campaignCounter(data, 'revisao'),
  };
  const status = (data.status as CampaignStatus) || 'erro';
  return {
    id,
    importId: String(data.importacaoId || ''),
    name: String(data.nome || 'Disparo'),
    createdAt: iso(data.createdAt) || new Date(0).toISOString(),
    status,
    messageTemplate: String(data.mensagemTemplate || ''),
    intervalMinutes: numberField(data.intervaloValor),
    phoneChoice: (data.telefoneStrategy as PhoneChoice) || 'telefone1',
    audience: data.audience === 'selecionados' ? 'selecionados' : 'validos',
    totals,
    remetente: {
      sessionId: DISPAROS_WHATSAPP_SESSION_ID,
      phone: formatDisparosConnectedPhone(typeof data.senderPhoneSnapshot === 'string' ? data.senderPhoneSnapshot : null),
      profileName: typeof data.senderProfileName === 'string' ? data.senderProfileName : null,
      connectionStatus: 'disconnected',
    },
    items: [],
    nextRunAt: iso(data.nextRunAt),
    pauseReason: (data.pauseReason as CampaignPauseReason) ?? null,
    intervaloMs: numberField(data.intervaloMs) || numberField(data.intervaloValor) * 60_000,
  };
}

function itemFromDoc(id: string, data: Record<string, unknown>): DisparoCampaignItem {
  const when = iso(data.sentAt) || iso(data.failedAt) || iso(data.processingAt) || iso(data.createdAt);
  return {
    id,
    contactId: String(data.contatoId || ''),
    nome: String(data.nome || ''),
    primeiroNome: String(data.primeiroNome || ''),
    telefone: typeof data.telefone === 'string' ? data.telefone : null,
    status: (data.status as DisparoCampaignItem['status']) || 'ignored',
    ignoreReason: (data.ignoreReason as DisparoCampaignItem['ignoreReason']) ?? null,
    updatedAt: when,
    remetenteLabel: typeof data.senderPhone === 'string' ? data.senderPhone : null,
  };
}

function numberField(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
