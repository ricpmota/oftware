import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  DISPAROS_CAMPAIGNS_COLLECTION,
  DISPAROS_ITEM_LEASE_MS,
  DISPAROS_ITEMS_SUBCOLLECTION,
  DISPAROS_OPT_OUT_COLLECTION,
  DISPAROS_WHATSAPP_OWNER,
  DISPAROS_WHATSAPP_SESSION_ID,
} from '@/lib/disparos/constants';
import { pendingItemId } from '@/lib/disparos/itemIds';
import { DISPAROS_GAP_MAX_MS, randomDisparoGapMs } from '@/lib/disparos/sendGap';
import { assertDisparosWhatsappSession, publicDisparosWhatsappError } from '@/lib/disparos/disparosWhatsappGuard';
import { decideExpiredLease, decideSendThrow, shouldPauseForSender } from '@/lib/disparos/workerPolicy';
import { acquireCronLock, releaseCronLock } from '@/lib/email/cronExecutionLock';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { campaignHasUnfinishedItems, materializeDisparoCampaign } from '@/lib/server/disparosStore.server';
import { readDisparosWhatsappStatus } from '@/lib/server/disparosWhatsapp.server';
import { withWhatsappProviderAuth } from '@/lib/server/whatsappSessionAuth.server';
import { sendTestMessage, WhatsappProviderError } from '@/services/whatsappProviderClient';

const TICK_BUDGET_MS = 270_000;
const SEND_RESERVE_MS = 25_000;
const CONTINUABLE = new Set(['sent', 'failed', 'needs_review', 'opt_out', 'already_sent', 'skip', 'missing']);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Depois de um envio que deu certo, espera um tempo sorteado entre 50 e 70 segundos
 * e segue. Falha não espera. Se o processo cair depois que o provedor aceitou e
 * antes de gravar `sent`, o item fica em revisão.
 */
export async function processDisparoTick(): Promise<{ ok: true; action: string }> {
  assertDisparosWhatsappSession(DISPAROS_WHATSAPP_SESSION_ID);
  const database = getFirestoreAdmin();
  const lock = await acquireCronLock(database, 'disparos-processar', 300_000);
  if (!lock.acquired) return { ok: true, action: 'locked' };
  const started = Date.now();
  try {
    let action = 'idle';
    while (Date.now() - started < TICK_BUDGET_MS) {
      const step = await runDisparoStep(database);
      action = step.action;
      if (step.action === 'idle') {
        const waitMs = await nextDueInMs(database);
        if (waitMs === null || waitMs <= 0 || !fitsInTick(started, waitMs)) break;
        await sleep(waitMs);
        continue;
      }
      if (!step.campaignId || !CONTINUABLE.has(step.action)) break;
      if (step.action !== 'sent') continue;
      const waitMs = await campaignWaitMs(step.campaignId);
      if (waitMs <= 0) continue;
      if (!fitsInTick(started, waitMs)) break;
      await sleep(waitMs);
    }
    return { ok: true, action };
  } finally {
    await releaseCronLock(database, 'disparos-processar', lock.instanceId);
  }
}

function fitsInTick(started: number, waitMs: number): boolean {
  return Date.now() + waitMs + SEND_RESERVE_MS - started < TICK_BUDGET_MS;
}

async function nextDueInMs(database: FirebaseFirestore.Firestore): Promise<number | null> {
  const running = await database
    .collection(DISPAROS_CAMPAIGNS_COLLECTION)
    .where('status', '==', 'em_andamento')
    .limit(10)
    .get();
  let soonest: number | null = null;
  for (const doc of running.docs) {
    if (doc.get('processingItemId')) continue;
    const next = doc.get('nextRunAt');
    const at = typeof next?.toDate === 'function' ? next.toDate().getTime() : 0;
    if (at <= 0) continue;
    const wait = at - Date.now();
    if (soonest === null || wait < soonest) soonest = wait;
  }
  return soonest;
}

async function campaignWaitMs(campaignId: string): Promise<number> {
  const snap = await getFirestoreAdmin().collection(DISPAROS_CAMPAIGNS_COLLECTION).doc(campaignId).get();
  const next = snap.get('nextRunAt');
  const at = typeof next?.toDate === 'function' ? next.toDate().getTime() : Date.now();
  return Math.max(0, at - Date.now());
}

async function runDisparoStep(database: FirebaseFirestore.Firestore): Promise<{ action: string; campaignId: string | null }> {
  const recovered = await recoverExpiredLease();
  if (recovered) return { action: recovered, campaignId: null };
  const preparing = await database
    .collection(DISPAROS_CAMPAIGNS_COLLECTION)
    .where('status', '==', 'preparando')
    .limit(1)
    .get();
  if (!preparing.empty) {
    await materializeDisparoCampaign(preparing.docs[0]!.id, { owner: 'cron' });
    return { action: 'materialize', campaignId: null };
  }
  const running = await database
    .collection(DISPAROS_CAMPAIGNS_COLLECTION)
    .where('status', '==', 'em_andamento')
    .limit(10)
    .get();
  const now = Date.now();
  const due = running.docs.find((doc) => {
    const next = doc.get('nextRunAt');
    const at = typeof next?.toDate === 'function' ? next.toDate().getTime() : 0;
    return at <= now && !doc.get('processingItemId');
  });
  if (!due) return { action: 'idle', campaignId: null };
  const action = await sendNextDisparoItem(due.id);
  return { action, campaignId: due.id };
}

async function recoverExpiredLease(): Promise<string | null> {
  const database = getFirestoreAdmin();
  const running = await database
    .collection(DISPAROS_CAMPAIGNS_COLLECTION)
    .where('status', '==', 'em_andamento')
    .limit(10)
    .get();
  const now = Date.now();
  const stuck = running.docs.find((doc) => {
    const lease = doc.get('processingLeaseExpiresAt');
    const at = typeof lease?.toDate === 'function' ? lease.toDate().getTime() : 0;
    return Boolean(doc.get('processingItemId')) && at > 0 && at <= now;
  });
  if (!stuck) return null;
  const itemId = String(stuck.get('processingItemId'));
  const phase = decideExpiredLease(typeof stuck.get('processingPhase') === 'string' ? stuck.get('processingPhase') : null);
  const itemRef = stuck.ref.collection(DISPAROS_ITEMS_SUBCOLLECTION).doc(itemId);
  if (phase === 'needs_review') {
    await database.runTransaction(async (tx) => {
      const current = await tx.get(itemRef);
      const fromProcessing = current.get('status') === 'processing';
      tx.set(
        itemRef,
        {
          status: 'needs_review',
          phase: null,
          errorCode: 'AMBIGUOUS_DELIVERY',
          errorMessage: 'O envio pode ter saído antes de a confirmação ser gravada. Revise manualmente. Não foi reenviado.',
        },
        { merge: true },
      );
      tx.update(stuck.ref, {
        processingItemId: null,
        processingPhase: null,
        processingLeaseExpiresAt: null,
        nextSequence: FieldValue.increment(1),
        ...(fromProcessing
          ? { 'totals.processing': FieldValue.increment(-1) }
          : { 'totals.pending': FieldValue.increment(-1) }),
        'totals.revisao': FieldValue.increment(1),
        nextRunAt: Timestamp.fromDate(new Date()),
      });
    });
    return 'lease_review';
  }
  await database.runTransaction(async (tx) => {
    const current = await tx.get(itemRef);
    const fromProcessing = current.get('status') === 'processing';
    tx.set(
      itemRef,
      { status: 'pending', phase: null, leaseExpiresAt: null },
      { merge: true },
    );
    tx.update(stuck.ref, {
      processingItemId: null,
      processingPhase: null,
      processingLeaseExpiresAt: null,
      ...(fromProcessing
        ? {
            'totals.processing': FieldValue.increment(-1),
            'totals.pending': FieldValue.increment(1),
          }
        : {}),
    });
  });
  return 'lease_released';
}

async function sendNextDisparoItem(campaignId: string): Promise<string> {
  const database = getFirestoreAdmin();
  const campaignRef = database.collection(DISPAROS_CAMPAIGNS_COLLECTION).doc(campaignId);
  const snapshot = await campaignRef.get();
  if (!snapshot.exists || snapshot.get('status') !== 'em_andamento') return 'skipped';
  const sequence = typeof snapshot.get('nextSequence') === 'number' ? snapshot.get('nextSequence') : 1;
  const lastSequence = typeof snapshot.get('lastSequence') === 'number' ? snapshot.get('lastSequence') : 0;
  if (sequence > lastSequence) {
    if (snapshot.get('materializeDone') === true && !(await campaignHasUnfinishedItems(campaignRef))) {
      await campaignRef.set(
        { status: 'concluida', completedAt: FieldValue.serverTimestamp(), processingItemId: null },
        { merge: true },
      );
      return 'completed';
    }
    return 'open_items';
  }
  const itemId = pendingItemId(sequence);
  const itemRef = campaignRef.collection(DISPAROS_ITEMS_SUBCOLLECTION).doc(itemId);
  const claim = await database.runTransaction(async (tx) => {
    const campaign = await tx.get(campaignRef);
    const item = await tx.get(itemRef);
    if (campaign.get('status') !== 'em_andamento') return 'stopped';
    if (campaign.get('processingItemId')) return 'busy';
    if (!item.exists) return 'missing';
    if (item.get('status') === 'sent') return 'already_sent';
    if (item.get('status') !== 'pending') return 'skip';
    const lease = Timestamp.fromDate(new Date(Date.now() + DISPAROS_ITEM_LEASE_MS));
    tx.set(
      itemRef,
      {
        phase: 'claimed',
        processingAt: FieldValue.serverTimestamp(),
        leaseExpiresAt: lease,
        attempts: FieldValue.increment(1),
      },
      { merge: true },
    );
    tx.update(campaignRef, {
      processingItemId: itemId,
      processingPhase: 'claimed',
      processingLeaseExpiresAt: lease,
    });
    return 'claimed';
  });
  if (claim === 'missing' || claim === 'skip' || claim === 'already_sent') {
    await campaignRef.set({ nextSequence: FieldValue.increment(1) }, { merge: true });
    return claim;
  }
  if (claim !== 'claimed') return claim;

  const afterClaim = await campaignRef.get();
  if (afterClaim.get('status') !== 'em_andamento') {
    await returnClaimToPending(campaignRef, itemRef);
    return 'released';
  }

  const connection = await readDisparosWhatsappStatus();
  if (connection.status !== 'connected' || connection.connection?.sessionId !== DISPAROS_WHATSAPP_SESSION_ID) {
    await returnClaimToPending(campaignRef, itemRef);
    await pauseForSender(campaignRef);
    return 'sender_unavailable';
  }

  const item = await itemRef.get();
  const phone = typeof item.get('telefone') === 'string' ? item.get('telefone') : '';
  const message = typeof item.get('mensagemFinal') === 'string' ? item.get('mensagemFinal') : '';
  if (!phone || !message) {
    await settleItem(campaignRef, itemRef, {
      status: 'failed',
      errorCode: 'INVALID_ITEM',
      errorMessage: 'Item sem telefone ou mensagem.',
      senderPhone: connection.connection?.phone ?? null,
    });
    return 'failed';
  }
  const blocked = await database.collection(DISPAROS_OPT_OUT_COLLECTION).doc(phone).get();
  if (blocked.exists) {
    await settleItem(campaignRef, itemRef, {
      status: 'ignored',
      ignoreReason: 'opt_out',
      errorCode: 'OPT_OUT',
      errorMessage: 'Opt-out',
      senderPhone: null,
    });
    return 'opt_out';
  }

  await itemRef.set({ phase: 'sending' }, { merge: true });
  await campaignRef.set({ processingPhase: 'sending' }, { merge: true });

  try {
    const authResult = await withWhatsappProviderAuth(
      DISPAROS_WHATSAPP_OWNER,
      DISPAROS_WHATSAPP_SESSION_ID,
      (token) =>
        sendTestMessage(DISPAROS_WHATSAPP_SESSION_ID, token, phone, message, {
          phoneIsResolved: true,
          connectedPhone: connection.connection?.phone,
          skipNumberLookup: true,
        }),
    );
    if (authResult.result.mock) {
      await returnClaimToPending(campaignRef, itemRef);
      await pauseForSender(campaignRef);
      return 'sender_unavailable';
    }
    if (authResult.result.deliveryUncertain) {
      await settleItem(campaignRef, itemRef, {
        status: 'needs_review',
        errorCode: 'AMBIGUOUS_DELIVERY',
        errorMessage: 'O provedor não confirmou a entrega. O item não será reenviado automaticamente.',
        senderPhone: connection.connection?.phone ?? null,
      });
      return 'needs_review';
    }
    await settleItem(campaignRef, itemRef, {
      status: 'sent',
      senderPhone: connection.connection?.phone ?? null,
      providerMessageId: authResult.result.chatId ?? null,
    });
    return 'sent';
  } catch (error) {
    const code = error instanceof WhatsappProviderError ? error.code : 'SEND_ERROR';
    const messageText = publicDisparosWhatsappError(error, 'Não foi possível enviar esta mensagem.');
    const decision = decideSendThrow(code, messageText);
    if (decision === 'retry_later') {
      await returnClaimToPending(campaignRef, itemRef);
      await pauseForSender(campaignRef);
      return 'sender_unavailable';
    }
    if (decision === 'recipient_failed') {
      await settleItem(campaignRef, itemRef, {
        status: 'failed',
        errorCode: code,
        errorMessage: messageText,
        senderPhone: connection.connection?.phone ?? null,
      });
      return 'failed';
    }
    await settleItem(campaignRef, itemRef, {
      status: 'needs_review',
      errorCode: code,
      errorMessage: messageText,
      senderPhone: connection.connection?.phone ?? null,
    });
    if (shouldPauseForSender(decision, messageText)) await pauseForSender(campaignRef);
    return 'needs_review';
  }
}

async function returnClaimToPending(
  campaignRef: FirebaseFirestore.DocumentReference,
  itemRef: FirebaseFirestore.DocumentReference,
) {
  await getFirestoreAdmin().runTransaction(async (tx) => {
    const item = await tx.get(itemRef);
    if (item.get('status') === 'sent') return;
    const fromProcessing = item.get('status') === 'processing';
    tx.set(itemRef, { status: 'pending', phase: null, leaseExpiresAt: null }, { merge: true });
    tx.update(campaignRef, {
      processingItemId: null,
      processingPhase: null,
      processingLeaseExpiresAt: null,
      ...(fromProcessing
        ? {
            'totals.processing': FieldValue.increment(-1),
            'totals.pending': FieldValue.increment(1),
          }
        : {}),
    });
  });
}

async function pauseForSender(campaignRef: FirebaseFirestore.DocumentReference) {
  await campaignRef.set(
    {
      status: 'pausada',
      pauseReason: 'sender_unavailable',
      pausedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

async function settleItem(
  campaignRef: FirebaseFirestore.DocumentReference,
  itemRef: FirebaseFirestore.DocumentReference,
  input: {
    status: 'sent' | 'failed' | 'ignored' | 'needs_review';
    errorCode?: string;
    errorMessage?: string;
    ignoreReason?: string;
    senderPhone: string | null;
    providerMessageId?: string | null;
  },
) {
  const database = getFirestoreAdmin();
  const now = Timestamp.fromDate(new Date());
  await database.runTransaction(async (tx) => {
    const campaign = await tx.get(campaignRef);
    const currentItem = await tx.get(itemRef);
    const fromProcessing = currentItem.get('status') === 'processing';
    const configured = typeof campaign.get('intervaloMs') === 'number' ? campaign.get('intervaloMs') : 60_000;
    const interval = input.status === 'sent' ? (configured > DISPAROS_GAP_MAX_MS ? configured : randomDisparoGapMs()) : 0;
    const counter =
      input.status === 'sent'
        ? 'sent'
        : input.status === 'failed'
          ? 'failed'
          : input.status === 'needs_review'
            ? 'revisao'
            : 'ignored';
    tx.set(
      itemRef,
      {
        status: input.status,
        phase: null,
        ignoreReason: input.ignoreReason ?? null,
        errorCode: input.errorCode ?? null,
        errorMessage: input.errorMessage ?? null,
        sentAt: input.status === 'sent' ? now : null,
        failedAt: input.status === 'failed' || input.status === 'needs_review' ? now : null,
        senderSessionId: DISPAROS_WHATSAPP_SESSION_ID,
        senderPhone: input.senderPhone,
        providerMessageId: input.providerMessageId ?? null,
      },
      { merge: true },
    );
    tx.update(campaignRef, {
      processingItemId: null,
      processingPhase: null,
      processingLeaseExpiresAt: null,
      nextSequence: FieldValue.increment(1),
      ...(fromProcessing
        ? { 'totals.processing': FieldValue.increment(-1) }
        : { 'totals.pending': FieldValue.increment(-1) }),
      [`totals.${counter}`]: FieldValue.increment(1),
      nextRunAt: Timestamp.fromDate(new Date(input.status === 'sent' ? Date.now() + interval : Date.now())),
      senderPhoneSnapshot: input.senderPhone || campaign.get('senderPhoneSnapshot') || null,
    });
  });
  const fresh = await campaignRef.get();
  if (
    fresh.get('status') === 'em_andamento' &&
    fresh.get('materializeDone') === true &&
    !(await campaignHasUnfinishedItems(campaignRef))
  ) {
    await campaignRef.set({ status: 'concluida', completedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
}
