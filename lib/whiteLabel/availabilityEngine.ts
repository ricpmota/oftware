import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getAgendaSettings } from '@/lib/whiteLabel/agendaSettingsService';
import { listAvailabilityRules } from '@/lib/whiteLabel/availabilityRulesService';
import { listCalendarExceptions } from '@/lib/whiteLabel/calendarExceptionsService';
import {
  WHITELABEL_AVAILABILITY_COLLECTION,
  compareAvailabilityTimes,
  mapAvailabilityDocApi,
} from '@/lib/whiteLabel/availabilityFirestore';
import {
  addDaysToDateKey,
  buildAvailabilityDocId,
  generateSlotsInRange,
  getWeekdayFromDateKey,
  parseDateKey,
  slotKey,
} from '@/lib/whiteLabel/availabilitySlotUtils';
import type { WhiteLabelAgendaSettings, WhiteLabelSlotSource } from '@/types/whiteLabelAgenda';
import type { WhiteLabelAvailabilityApiRow } from '@/types/whiteLabelAvailability';

export type ComputedSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'available' | 'reserved' | 'blocked';
  source: WhiteLabelSlotSource;
};

function isWeekdayAllowed(weekday: number, settings: WhiteLabelAgendaSettings): boolean {
  if (settings.allowedDaysMode === 'all') return true;
  if (settings.allowedDaysMode === 'mon_sat') return weekday >= 1 && weekday <= 6;
  return weekday >= 1 && weekday <= 5;
}

function getBrazilNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

function getTodayDateKey(): string {
  const now = getBrazilNow();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSlotWithinAdvance(
  date: string,
  startTime: string,
  settings: WhiteLabelAgendaSettings,
  now = getBrazilNow()
): boolean {
  const parsed = parseDateKey(date);
  if (!parsed) return false;

  const [sh, sm] = startTime.split(':').map(Number);
  const slotStart = new Date(parsed.year, parsed.month, parsed.day, sh, sm, 0, 0);

  const minMs = settings.minAdvanceHours * 60 * 60 * 1000;
  if (slotStart.getTime() < now.getTime() + minMs) return false;

  const today = getTodayDateKey();
  const maxDate = addDaysToDateKey(today, settings.maxAdvanceDays);
  return date <= maxDate && date >= today;
}

async function loadFirestoreSlotsInRange(fromDate: string, toDate: string) {
  const db = getFirestoreAdmin();
  const snap = await db.collection(WHITELABEL_AVAILABILITY_COLLECTION).get();
  return snap.docs
    .map((doc) => mapAvailabilityDocApi(doc.id, doc.data()))
    .filter((row) => row.date >= fromDate && row.date <= toDate);
}

export async function computeAvailabilityForRange(
  fromDate: string,
  toDate: string
): Promise<ComputedSlot[]> {
  const settings = await getAgendaSettings();
  const rules = await listAvailabilityRules();
  const exceptions = await listCalendarExceptions(fromDate);
  const firestoreSlots = await loadFirestoreSlotsInRange(fromDate, toDate);

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

  const computed = new Map<string, ComputedSlot>();
  let cursor = fromDate;

  while (cursor <= toDate) {
    const weekday = getWeekdayFromDateKey(cursor);
    const dayExceptions = exceptionsByDate.get(cursor) || [];
    const isBlockedDay = dayExceptions.some((ex) => ex.type === 'blocked');

    const periods: { startTime: string; endTime: string; source: WhiteLabelSlotSource }[] = [];

    if (!isBlockedDay && settings.slotGenerationEnabled && weekday !== null && isWeekdayAllowed(weekday, settings)) {
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
      if (!isSlotWithinAdvance(cursor, period.startTime, settings)) continue;

      const existing = firestoreByKey.get(key);
      if (existing) {
        computed.set(key, {
          id: existing.id,
          date: existing.date,
          startTime: existing.startTime,
          endTime: existing.endTime,
          status: existing.status,
          source: (existing as { source?: WhiteLabelSlotSource }).source || period.source,
        });
        continue;
      }

      computed.set(key, {
        id: buildAvailabilityDocId(cursor, period.startTime, period.endTime),
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

export async function listAvailableSlotsFromEngine(fromDate?: string): Promise<WhiteLabelAvailabilityApiRow[]> {
  const today = fromDate && parseDateKey(fromDate) ? fromDate : getTodayDateKey();
  const settings = await getAgendaSettings();
  const toDate = addDaysToDateKey(today, settings.maxAdvanceDays);

  const slots = await computeAvailabilityForRange(today, toDate);

  return slots
    .filter((s) => s.status === 'available' && isSlotWithinAdvance(s.date, s.startTime, settings))
    .map((s) => ({
      id: s.id,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      status: 'available' as const,
      createdAt: null,
      updatedAt: null,
    }));
}

export async function listAllSlotsFromEngine(fromDate: string, toDate: string) {
  const slots = await computeAvailabilityForRange(fromDate, toDate);
  const db = getFirestoreAdmin();
  const snap = await db.collection(WHITELABEL_AVAILABILITY_COLLECTION).get();
  const enriched = new Map(snap.docs.map((d) => [d.id, mapAvailabilityDocApi(d.id, d.data())]));

  return slots.map((slot) => {
    const fs = enriched.get(slot.id);
    if (fs) {
      return { ...fs, source: slot.source };
    }
    return {
      id: slot.id,
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
