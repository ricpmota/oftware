import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { renderMatchCanalChatTemplate } from '@/lib/match/matchCanalChatMessage';
import { matchPairKey } from '@/lib/match/matchPair';
import { MATCH_CONNECTIONS } from '@/lib/server/matchSocialAdmin';
import { sharedMatchLabels } from '@/lib/server/matchConnectionLabels';
import { loadCanalChatSender, resolveMatchPhone, sendMatchCanalChatMessage } from '@/lib/server/matchCanalChatSend';
import { MATCH_CANAL_CHAT_LOG, loadMatchCanalChatSettings } from '@/lib/server/matchCanalChatSettings';
import { buildMatchPublicProfile } from '@/lib/server/matchPublicProfile';

type DeliveryStatus = 'sent' | 'no_phone' | 'failed' | 'channel_offline';

async function rememberDelivery(
  db: Firestore,
  input: {
    pairKey: string;
    uid: string;
    otherUid: string;
    recipientName: string;
    otherName: string;
    message: string;
    status: DeliveryStatus;
    error?: string;
  },
): Promise<void> {
  const message = input.message.slice(0, 800);
  await Promise.allSettled([
    db.collection(MATCH_CANAL_CHAT_LOG).add({
      kind: 'connection',
      pairKey: input.pairKey,
      uid: input.uid,
      otherUid: input.otherUid,
      recipientName: input.recipientName,
      otherName: input.otherName,
      message,
      status: input.status,
      error: input.error || null,
      createdAt: FieldValue.serverTimestamp(),
    }),
    db.collection(MATCH_CONNECTIONS).doc(input.pairKey).update({
      [`canalChatByUid.${input.uid}`]: {
        status: input.status,
        message,
        atMs: Date.now(),
        ...(input.error ? { error: input.error.slice(0, 240) } : {}),
      },
    }),
  ]);
}

/** Avisa os dois pelo Canal Chat. Falha de envio não desfaz a conexão. */
export async function notifyMatchCanalChat(db: Firestore, uidA: string, uidB: string): Promise<void> {
  if (!uidA || !uidB || uidA === uidB) return;
  try {
    const [profileA, profileB, phoneA, phoneB, settings, sender] = await Promise.all([
      buildMatchPublicProfile(db, uidA),
      buildMatchPublicProfile(db, uidB),
      resolveMatchPhone(db, uidA),
      resolveMatchPhone(db, uidB),
      loadMatchCanalChatSettings(db),
      loadCanalChatSender(),
    ]);
    const draftA = profileA?.draft;
    const draftB = profileB?.draft;
    const labels = draftA && draftB ? sharedMatchLabels(draftA, draftB) : [];
    const nameA = profileA?.card.displayName || 'Alguém';
    const nameB = profileB?.card.displayName || 'Alguém';
    const pairKey = matchPairKey(uidA, uidB);
    const jobs = [
      { uid: uidA, otherUid: uidB, recipientName: nameA, otherName: nameB, phone: phoneA?.phone || '', message: renderMatchCanalChatTemplate(settings.template, nameB, labels) },
      { uid: uidB, otherUid: uidA, recipientName: nameB, otherName: nameA, phone: phoneB?.phone || '', message: renderMatchCanalChatTemplate(settings.template, nameA, labels) },
    ];
    for (const job of jobs) {
      let status: DeliveryStatus = 'no_phone';
      let error: string | undefined;
      if (!job.phone) {
        console.warn('[match-canal-chat] sem telefone de cadastro', job.uid);
      } else if (!sender) {
        status = 'channel_offline';
        console.warn('[match-canal-chat] Canal Chat desconectado.');
      } else {
        const result = await sendMatchCanalChatMessage(job.phone, job.message, sender);
        status = result.status;
        error = result.error;
        if (status !== 'sent') console.warn('[match-canal-chat]', error || status);
      }
      await rememberDelivery(db, { ...job, pairKey, status, error });
    }
  } catch (error) {
    console.warn('[match-canal-chat]', error instanceof Error ? error.message : error);
  }
}
