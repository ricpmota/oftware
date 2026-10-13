import { getMedicoAgendaSettings } from '@/lib/metaadmin/agenda/agendaSettingsService';
import { listMedicoAvailabilityRules } from '@/lib/metaadmin/agenda/availabilityRulesService';
import { listMedicoCalendarExceptions } from '@/lib/metaadmin/agenda/calendarExceptionsService';
import {
  MEDICO_AVAILABILITY_COLLECTION,
  compareAvailabilityTimes,
  mapMedicoAvailabilityDocApi,
} from '@/lib/metaadmin/agenda/availabilityFirestore';
import { medicoSlotDocId } from '@/lib/metaadmin/agenda/agendaDefaults';
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
import type { MedicoAgendaSettings, MedicoAvailabilityApiRow, MedicoSlotSource } from '@/types/medicoAgenda';

export type MedicoComputedSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'available' | 'reserved' | 'blocked';
  source: MedicoSlotSource;
};

function isGeneratedSlotWithinAdvance(
  date: string,
  startTime: string,
  settings: MedicoAgendaSettings,
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
  slot: { date: string; startTime: string; source?: MedicoSlotSource },
  settings: MedicoAgendaSettings,
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

async function loadFirestoreSlotsInRange(medicoId: string, fromDate: string, toDate: string) {
  const db = getFirestoreAdmin();
  const snap = await db.collection(MEDICO_AVAILABILITY_COLLECTION).where('medicoId', '==', medicoId).get();
  return snap.docs
    .map((doc) => mapMedicoAvailabilityDocApi(doc.id, doc.data()))
    .filter((row) => row.date >= fromDate && row.date <= toDate);
}

export async function computeMedicoAvailabilityForRange(
  medicoId: string,
  fromDate: string,
  toDate: string
): Promise<MedicoComputedSlot[]> {
  const ownerId = medicoId.trim();
  const settings = await getMedicoAgendaSettings(ownerId);
  const rules = await listMedicoAvailabilityRules(ownerId);
  const exceptions = await listMedicoCalendarExceptions(ownerId, fromDate);
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

  const computed = new Map<string, MedicoComputedSlot>();
  let cursor = fromDate;

  while (cursor <= toDate) {
    const weekday = getWeekdayFromDateKey(cursor);
    const dayExceptions = exceptionsByDate.get(cursor) || [];
    const isBlockedDay = dayExceptions.some((ex) => ex.type === 'blocked');

    const periods: { startTime: string; endTime: string; source: MedicoSlotSource }[] = [];

    if (settings.slotGenerationEnabled && weekday !== null) {
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

    if (!isBlockedDay) {
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
    }

    for (const period of periods) {
      const key = slotKey(cursor, period.startTime, period.endTime);
      if (!isBlockedDay && !isGeneratedSlotWithinAdvance(cursor, period.startTime, settings)) continue;

      const existing = firestoreByKey.get(key);
      const blocked = isBlockedDay && existing?.status !== 'reserved';
      if (existing) {
        computed.set(key, {
          id: existing.id,
          date: existing.date,
          startTime: existing.startTime,
          endTime: existing.endTime,
          status: blocked ? 'blocked' : existing.status,
          source: existing.source || period.source,
        });
        continue;
      }

      computed.set(key, {
        id: medicoSlotDocId(ownerId, cursor, period.startTime, period.endTime),
        date: cursor,
        startTime: period.startTime,
        endTime: period.endTime,
        status: isBlockedDay ? 'blocked' : 'available',
        source: period.source,
      });
    }

    for (const fs of firestoreSlots.filter((s) => s.date === cursor)) {
      const key = slotKey(fs.date, fs.startTime, fs.endTime);
      if (computed.has(key)) continue;
      computed.set(key, {
        id: fs.id,
        date: fs.date,
        startTime: fs.startTime,
        endTime: fs.endTime,
        status: isBlockedDay && fs.status !== 'reserved' ? 'blocked' : fs.status,
        source: fs.source || 'manual',
      });
    }

    cursor = addDaysToDateKey(cursor, 1);
  }

  return [...computed.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || compareAvailabilityTimes(a.startTime, b.startTime)
  );
}

export async function listMedicoAvailableSlotsFromEngine(
  medicoId: string,
  fromDate?: string
): Promise<MedicoAvailabilityApiRow[]> {
  const today = fromDate && parseDateKey(fromDate) ? fromDate : getBrazilDateKey();
  const settings = await getMedicoAgendaSettings(medicoId);
  const toDate = addDaysToDateKey(today, settings.maxAdvanceDays);
  const slots = await computeMedicoAvailabilityForRange(medicoId, today, toDate);

  return slots
    .filter((s) => s.status === 'available' && isPublicSlotBookable(s, settings))
    .map((s) => ({
      id: s.id,
      medicoId,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      status: 'available' as const,
      source: s.source,
      createdAt: null,
      updatedAt: null,
    }));
}

export async function listAllMedicoSlotsFromEngine(
  medicoId: string,
  fromDate: string,
  toDate: string
): Promise<MedicoAvailabilityApiRow[]> {
  const ownerId = medicoId.trim();
  const slots = await computeMedicoAvailabilityForRange(ownerId, fromDate, toDate);
  const db = getFirestoreAdmin();
  const snap = await db.collection(MEDICO_AVAILABILITY_COLLECTION).where('medicoId', '==', ownerId).get();
  const enriched = new Map(snap.docs.map((d) => [d.id, mapMedicoAvailabilityDocApi(d.id, d.data())]));

  return slots.map((slot) => {
    const fs = enriched.get(slot.id);
    if (fs) {
      return {
        ...fs,
        source: slot.source || fs.source,
        status: slot.status,
      };
    }
    return {
      id: slot.id,
      medicoId: ownerId,
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
