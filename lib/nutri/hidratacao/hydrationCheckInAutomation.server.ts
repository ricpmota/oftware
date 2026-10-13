import { FieldPath, FieldValue, type Firestore } from 'firebase-admin/firestore';
import {
  HYDRATION_CHECKIN_BATCH_SIZE,
  HYDRATION_CHECKIN_CRON_STATE_COLLECTION,
  HYDRATION_CHECKIN_SYSTEM_ACTOR_ID,
  HYDRATION_TREATMENT_STATUS,
  hydrationCheckInCyclePeriod,
  runHydrationCheckInPatient,
  type HydrationDeliverySkipReason,
} from '@/lib/nutri/hidratacao/hydrationCheckInAutomation';
import { createHydrationCheckInLink } from '@/lib/nutri/hidratacao/hydrationCheckInLink.server';
import {
  loadHydrationCheckInDelivery,
  upsertHydrationCheckInDelivery,
} from '@/lib/nutri/hidratacao/hydrationCheckInDelivery.server';
import { notifyPacienteHydrationCheckInLink } from '@/lib/nutri/hidratacao/hydrationCheckInNotify.server';
import {
  loadHydrationPlanGoalMl,
  loadHydrationRecordAdmin,
} from '@/lib/nutri/hidratacao/hydrationPersist.server';
import {
  parseHydrationCheckInReminderSettings,
  resolveHydrationCheckInReminderTime,
} from '@/lib/nutri/hidratacao/hydrationCheckInSettings';
import {
  getBrasilDateTimeParts,
  horarioConfiguradoJaPassou,
} from '@/lib/time/brasilTimezone';

const TIME_BUDGET_MS = 45_000;
const REMINDER_ENABLED_FIELD = 'hydrationCheckInReminderEnabled';

export type HydrationCheckInCronMetrics = {
  eligibleCount: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  skipReasons: Record<string, number>;
  processedCount: number;
  truncated: boolean;
  done: boolean;
  dateKey: string;
  allowedDates: string[];
  allowedDatesKey: string;
  sendDay: boolean;
};

function bumpSkip(metrics: HydrationCheckInCronMetrics, reason: HydrationDeliverySkipReason | string) {
  metrics.skippedCount += 1;
  metrics.skipReasons[reason] = (metrics.skipReasons[reason] ?? 0) + 1;
}

function classifyCanalChatFailure(reason: string): { errorCode: string; errorMessage: string } {
  const lower = reason.toLowerCase();
  if (lower.includes('telefone')) {
    return { errorCode: 'no_phone', errorMessage: reason };
  }
  if (lower.includes('desconectado')) {
    return { errorCode: 'canal_disconnected', errorMessage: reason };
  }
  return { errorCode: 'canal_chat_error', errorMessage: reason };
}

async function countPendingDates(
  db: Firestore,
  patientId: string,
  allowedDates: string[]
): Promise<number> {
  let pending = 0;
  for (const date of allowedDates) {
    const record = await loadHydrationRecordAdmin(db, patientId, date);
    if (!record) pending += 1;
  }
  return pending;
}

function cronStateRef(db: Firestore, dateKey: string) {
  return db.collection(HYDRATION_CHECKIN_CRON_STATE_COLLECTION).doc(dateKey);
}

export async function runHydrationCheckInAutomationJob(
  db: Firestore,
  now: Date = new Date()
): Promise<HydrationCheckInCronMetrics> {
  const brasil = getBrasilDateTimeParts(now);
  const cycle = hydrationCheckInCyclePeriod(brasil.dateKey);

  const metrics: HydrationCheckInCronMetrics = {
    eligibleCount: 0,
    sentCount: 0,
    skippedCount: 0,
    failedCount: 0,
    skipReasons: {},
    processedCount: 0,
    truncated: false,
    done: false,
    dateKey: brasil.dateKey,
    allowedDates: cycle.allowedDates,
    allowedDatesKey: cycle.allowedDatesKey,
    sendDay: cycle.sendDay,
  };

  const stateSnap = await cronStateRef(db, brasil.dateKey).get();
  const stateData = (stateSnap.data() || {}) as Record<string, unknown>;
  let cursor =
    typeof stateData.cursorPatientId === 'string' && stateData.cursorPatientId
      ? stateData.cursorPatientId
      : null;

  const started = Date.now();
  let lastId: string | null = cursor;

  while (Date.now() - started < TIME_BUDGET_MS) {
    let query = db
      .collection('pacientes_completos')
      .where('statusTratamento', '==', HYDRATION_TREATMENT_STATUS)
      .where(REMINDER_ENABLED_FIELD, '==', true)
      .orderBy(FieldPath.documentId())
      .limit(HYDRATION_CHECKIN_BATCH_SIZE);
    if (cursor) query = query.startAfter(cursor);

    const snap = await query.get();
    if (snap.empty) {
      metrics.done = true;
      lastId = null;
      break;
    }

    for (const docSnap of snap.docs) {
      if (Date.now() - started >= TIME_BUDGET_MS) {
        metrics.truncated = true;
        break;
      }

      lastId = docSnap.id;
      metrics.eligibleCount += 1;
      metrics.processedCount += 1;

      const data = (docSnap.data() || {}) as Record<string, unknown>;
      const settings = parseHydrationCheckInReminderSettings(data);
      try {
        const result = await processOnePatient(db, {
          patientId: docSnap.id,
          statusTratamento: data.statusTratamento,
          reminderEnabled: settings.enabled,
          reminderTime: settings.time,
          nowHhmm: brasil.hhmm,
          patientName:
            String((data.dadosIdentificacao as { nomeCompleto?: string } | undefined)?.nomeCompleto ?? '').trim() ||
            String(data.nome ?? '').trim(),
          medicoResponsavelId: String(data.medicoResponsavelId ?? '').trim() || null,
          allowedDates: cycle.allowedDates,
          allowedDatesKey: cycle.allowedDatesKey,
        });
        if (result.outcome === 'sent') metrics.sentCount += 1;
        else if (result.outcome === 'failed') metrics.failedCount += 1;
        else if (result.skipReason) bumpSkip(metrics, result.skipReason);
        else bumpSkip(metrics, 'skipped');
      } catch (error) {
        metrics.failedCount += 1;
        const errorMessage = error instanceof Error ? error.message : 'erro';
        console.error('[cron/hidratacao-checkin] patient_error', {
          patientId: docSnap.id,
          errorCode: 'unhandled',
          errorMessage,
        });
      }
    }

    cursor = lastId;
    if (metrics.truncated) break;
    if (snap.size < HYDRATION_CHECKIN_BATCH_SIZE) {
      metrics.done = true;
      lastId = null;
      break;
    }
  }

  if (!metrics.done && !metrics.truncated) {
    metrics.truncated = true;
  }

  await persistCronState(db, brasil.dateKey, cycle.allowedDatesKey, metrics.done ? null : lastId, metrics);
  console.info('[cron/hidratacao-checkin] batch', {
    dateKey: brasil.dateKey,
    allowedDatesKey: cycle.allowedDatesKey,
    eligibleCount: metrics.eligibleCount,
    sentCount: metrics.sentCount,
    skippedCount: metrics.skippedCount,
    failedCount: metrics.failedCount,
    truncated: metrics.truncated,
    done: metrics.done,
  });
  return metrics;
}

async function persistCronState(
  db: Firestore,
  dateKey: string,
  allowedDatesKey: string,
  cursorPatientId: string | null,
  metrics: HydrationCheckInCronMetrics
) {
  await cronStateRef(db, dateKey).set(
    {
      dateKey,
      allowedDatesKey,
      cursorPatientId,
      done: metrics.done,
      eligibleCount: metrics.eligibleCount,
      sentCount: metrics.sentCount,
      skippedCount: metrics.skippedCount,
      failedCount: metrics.failedCount,
      processedCount: metrics.processedCount,
      skipReasons: metrics.skipReasons,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function processOnePatient(
  db: Firestore,
  input: {
    patientId: string;
    statusTratamento: unknown;
    reminderEnabled: unknown;
    reminderTime: string;
    nowHhmm: string;
    patientName: string;
    medicoResponsavelId: string | null;
    allowedDates: string[];
    allowedDatesKey: string;
  }
) {
  const delivery = await loadHydrationCheckInDelivery(db, input.patientId, input.allowedDatesKey);
  const pendingCount = await countPendingDates(db, input.patientId, input.allowedDates);
  const scheduledTimeReached = horarioConfiguradoJaPassou(
    input.nowHhmm,
    resolveHydrationCheckInReminderTime(input.reminderTime)
  );

  return runHydrationCheckInPatient(
    {
      statusTratamento: input.statusTratamento,
      reminderEnabled: input.reminderEnabled,
      pendingCount,
      scheduledTimeReached,
      delivery: delivery
        ? {
            status: delivery.status,
            source: delivery.source,
            attemptCount: delivery.attemptCount,
            skipReason: delivery.skipReason,
          }
        : null,
    },
    {
      revalidate: async () => {
        const snap = await db.collection('pacientes_completos').doc(input.patientId).get();
        const live = (snap.data() || {}) as Record<string, unknown>;
        const liveSettings = parseHydrationCheckInReminderSettings(live);
        return {
          statusTratamento: live.statusTratamento,
          pendingCount: await countPendingDates(db, input.patientId, input.allowedDates),
          reminderEnabled: liveSettings.enabled,
          scheduledTimeReached: horarioConfiguradoJaPassou(
            input.nowHhmm,
            liveSettings.time
          ),
        };
      },
      recordDelivery: async (patch) => {
        await upsertHydrationCheckInDelivery(db, {
          patientId: input.patientId,
          allowedDates: input.allowedDates,
          allowedDatesKey: input.allowedDatesKey,
          source: patch.status === 'sent' ? 'automatic' : delivery?.source === 'manual' ? 'manual' : 'automatic',
          status: patch.status,
          linkId: patch.linkId,
          skipReason: patch.skipReason,
          errorCode: patch.errorCode,
          errorMessage: patch.errorMessage,
          incrementAttempt: patch.incrementAttempt,
          markSent: patch.markSent,
        });
      },
      createLink: async () => {
        const created = await createHydrationCheckInLink(db, {
          patientId: input.patientId,
          createdByType: 'system',
          createdByUserId: HYDRATION_CHECKIN_SYSTEM_ACTOR_ID,
          allowedDates: input.allowedDates,
        });
        return { linkId: created.link.id, url: created.url };
      },
      notify: async (created) => {
        const goalMl = await loadHydrationPlanGoalMl(db, input.patientId);
        const livePending = await countPendingDates(db, input.patientId, input.allowedDates);
        const result = await notifyPacienteHydrationCheckInLink({
          patientId: input.patientId,
          url: created.url,
          createdByType: 'system',
          createdByUserId: HYDRATION_CHECKIN_SYSTEM_ACTOR_ID,
          logOwnerId: input.medicoResponsavelId || HYDRATION_CHECKIN_SYSTEM_ACTOR_ID,
          goalMl,
          pendingCount: livePending,
          patientName: input.patientName,
        });
        if (result.status === 'sent') return { ok: true as const };
        const classified = classifyCanalChatFailure(result.reason || 'Falha no Canal Chat.');
        return { ok: false as const, ...classified };
      },
    }
  );
}
