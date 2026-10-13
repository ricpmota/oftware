import { getNutriAgendaSettings } from '@/lib/nutri/agenda/agendaSettingsService';
import { listNutriAvailabilityRules } from '@/lib/nutri/agenda/availabilityRulesService';
import { listNutriCalendarExceptions } from '@/lib/nutri/agenda/calendarExceptionsService';
import {
  NUTRI_AVAILABILITY_COLLECTION,
  compareAvailabilityTimes,
  mapNutriAvailabilityDocApi,
} from '@/lib/nutri/agenda/availabilityFirestore';
import { nutriSlotDocId } from '@/lib/nutri/agenda/agendaDefaults';
import {
  addDaysToDateKey,
  generateSlotsInRange,
  getBrazilDateKey,
  getWeekdayFromDateKey,
  isPublicBookableSlot,
  parseDateKey,
  slotKey,
} from '@/lib/whiteLabel/availabilitySlotUtils';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type { NutriAgendaSettings, NutriAvailabilityApiRow, NutriSlotSource } from '@/types/nutriAgenda';

export type NutriComputedSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'available' | 'reserved' | 'blocked';
  source: NutriSlotSource;
};

function isGeneratedSlotWithinAdvance(
  date: string,
  startTime: string,
  settings: NutriAgendaSettings,
  now = new Date()
): boolean {
  return isPublicBookableSlot({
    date,
    startTime,
    minAdvanceHours: settings.minAdvanceHours,
    maxAdvanceDays: settings.maxAdvanceDays,
    now,
  });
}

function isPublicSlotBookable(
  slot: { date: string; startTime: string; source?: NutriSlotSource },
  settings: NutriAgendaSettings,
  now = new Date()
): boolean {
  const manual = slot.source !== 'generated' && slot.source !== 'extra';
  return isPublicBookableSlot({
    date: slot.date,
    startTime: slot.startTime,
    minAdvanceHours: manual ? 0 : settings.minAdvanceHours,
    maxAdvanceDays: settings.maxAdvanceDays,
    now,
  });
}

async function loadFirestoreSlotsInRange(
  nutricionistaId: string,
  fromDate: string,
  toDate: string
) {
  const db = getFirestoreAdmin();
  const snap = await db
    .collection(NUTRI_AVAILABILITY_COLLECTION)
    .where('nutricionistaId', '==', nutricionistaId)
    .get();
  return snap.docs
    .map((doc) => mapNutriAvailabilityDocApi(doc.id, doc.data()))
    .filter((row) => row.date >= fromDate && row.date <= toDate);
}

export async function computeNutriAvailabilityForRange(
  nutricionistaId: string,
  fromDate: string,
  toDate: string
): Promise<NutriComputedSlot[]> {
  const ownerId = nutricionistaId.trim();
  const settings = await getNutriAgendaSettings(ownerId);
  const rules = await listNutriAvailabilityRules(ownerId);
  const exceptions = await listNutriCalendarExceptions(ownerId, fromDate);
  const firestoreSlots = await loadFirestoreSlotsInRange(ownerId, fromDate, toDate);

  const rulesByWeekday = new Map(rules.map((r) => [r.weekday, r]));
  const exceptionsByDate = new Map<string, typeof exceptions>();
  for (const ex of exceptions) {
    const list = exceptionsByDate.get(ex.date) || [];
    list.push(ex);
    exceptionsByDate.set(ex.date, list);
  }

  const firestoreByKey = new Map(
    firestoreSlots.map((s) => [slotKey(s.date, s.startTime, s.endTime), s])
  );

  const computed = new Map<string, NutriComputedSlot>();
  let cursor = fromDate;

  while (cursor <= toDate) {
    const weekday = getWeekdayFromDateKey(cursor);
    const dayExceptions = exceptionsByDate.get(cursor) || [];
    const isBlockedDay = dayExceptions.some((ex) => ex.type === 'blocked');

    const periods: { startTime: string; endTime: string; source: NutriSlotSource }[] = [];

    if (!isBlockedDay && settings.slotGenerationEnabled && weekday !== null) {
      const rule = rulesByWeekday.get(weekday);
      if (rule?.enabled && rule.periods.length > 0) {
        for (const period of rule.periods) {
          const generated = generateSlotsInRange(
            period.startTime,
            period.endTime,
            settings.defaultDurationMinutes,
            settings.bufferMinutes
          );
          for (const slot of generated) {
            periods.push({ ...slot, source: 'generated' });
          }
        }
      }
    }

    for (const ex of dayExceptions) {
      if (ex.type === 'extra' && ex.startTime && ex.endTime) {
        const generated = generateSlotsInRange(
          ex.startTime,
          ex.endTime,
          settings.defaultDurationMinutes,
          settings.bufferMinutes
        );
        for (const slot of generated) {
          periods.push({ ...slot, source: 'extra' });
        }
      }
    }

    for (const period of periods) {
      const key = slotKey(cursor, period.startTime, period.endTime);
      if (!isGeneratedSlotWithinAdvance(cursor, period.startTime, settings)) continue;

      const existing = firestoreByKey.get(key);
      if (existing) {
        computed.set(key, {
          id: existing.id,
          date: existing.date,
          startTime: existing.startTime,
          endTime: existing.endTime,
          status: existing.status,
          source: existing.source || period.source,
        });
        continue;
      }

      computed.set(key, {
        id: nutriSlotDocId(ownerId, cursor, period.startTime, period.endTime),
        date: cursor,
        startTime: period.startTime,
        endTime: period.endTime,
        status: 'available',
        source: period.source,
      });
    }

    for (const fs of firestoreSlots.filter((s) => s.date === cursor)) {
      const key = slotKey(fs.date, fs.startTime, fs.endTime);
      if (!computed.has(key)) {
        computed.set(key, {
          id: fs.id,
          date: fs.date,
          startTime: fs.startTime,
          endTime: fs.endTime,
          status: fs.status,
          source: 'manual',
        });
      }
    }

    cursor = addDaysToDateKey(cursor, 1);
  }

  return [...computed.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || compareAvailabilityTimes(a.startTime, b.startTime)
  );
}

export async function listNutriAvailableSlotsFromEngine(
  nutricionistaId: string,
  fromDate?: string
): Promise<NutriAvailabilityApiRow[]> {
  const today = fromDate && parseDateKey(fromDate) ? fromDate : getBrazilDateKey();
  const settings = await getNutriAgendaSettings(nutricionistaId);
  const toDate = addDaysToDateKey(today, settings.maxAdvanceDays);
  const slots = await computeNutriAvailabilityForRange(nutricionistaId, today, toDate);

  return slots
    .filter((s) => s.status === 'available' && isPublicSlotBookable(s, settings))
    .map((s) => ({
      id: s.id,
      nutricionistaId,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      status: 'available' as const,
      source: s.source,
      createdAt: null,
      updatedAt: null,
    }));
}

export async function listAllNutriSlotsFromEngine(
  nutricionistaId: string,
  fromDate: string,
  toDate: string
): Promise<NutriAvailabilityApiRow[]> {
  const ownerId = nutricionistaId.trim();
  const slots = await computeNutriAvailabilityForRange(ownerId, fromDate, toDate);
  const db = getFirestoreAdmin();
  const snap = await db
    .collection(NUTRI_AVAILABILITY_COLLECTION)
    .where('nutricionistaId', '==', ownerId)
    .get();
  const enriched = new Map(snap.docs.map((d) => [d.id, mapNutriAvailabilityDocApi(d.id, d.data())]));

  return slots.map((slot) => {
    const fs = enriched.get(slot.id);
    if (fs) return { ...fs, source: slot.source };
    return {
      id: slot.id,
      nutricionistaId: ownerId,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      status: slot.status,
      source: slot.source,
      createdAt: null,
      updatedAt: null,
    };
  });
}
