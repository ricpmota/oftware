import { doc, getDoc, type DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { deserializeHydrationRecord, deserializeHydrationWriteResult } from '@/lib/nutri/hidratacao/hydrationCodec';
import { isHydrationYmd } from '@/lib/nutri/hidratacao/hydrationMath';
import { hydrationDocSegments, type HydrationRecord } from '@/lib/nutri/hidratacao/hydrationTypes';
import { metaPacienteAuthFetch } from '@/lib/meta/metaPacienteAuthFetch';

export { deserializeHydrationRecord };

export async function loadHydrationRecord(
  pacienteId: string,
  date: string
): Promise<HydrationRecord | null> {
  if (!pacienteId || !isHydrationYmd(date)) return null;
  const ref = doc(db, ...hydrationDocSegments(pacienteId, date));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return deserializeHydrationRecord(snap.data() as DocumentData as Record<string, unknown>, date);
}

export async function loadHydrationRecordsByDates(
  pacienteId: string,
  dates: string[]
): Promise<Map<string, HydrationRecord>> {
  const result = new Map<string, HydrationRecord>();
  if (!pacienteId || dates.length === 0) return result;

  const unique = Array.from(new Set(dates.filter(isHydrationYmd)));
  const snaps = await Promise.all(
    unique.map(async (date) => {
      const ref = doc(db, ...hydrationDocSegments(pacienteId, date));
      return { date, snap: await getDoc(ref) };
    })
  );

  for (const { date, snap } of snaps) {
    if (!snap.exists()) continue;
    const record = deserializeHydrationRecord(snap.data() as DocumentData as Record<string, unknown>, date);
    if (record) result.set(date, record);
  }
  return result;
}

type WriteResult = {
  record: HydrationRecord;
  justReachedGoal: boolean;
};

async function postPortalHydration(body: Record<string, unknown>): Promise<WriteResult> {
  const res = await metaPacienteAuthFetch('/api/meta/hidratacao', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => null)) as {
    error?: string;
    justReachedGoal?: boolean;
    record?: Record<string, unknown>;
  } | null;
  if (!res.ok) {
    throw new Error(payload?.error || 'Não foi possível salvar o registro.');
  }
  const parsed = payload ? deserializeHydrationWriteResult(payload) : null;
  if (!parsed) {
    throw new Error('Resposta inválida ao salvar hidratação.');
  }
  return parsed;
}

export async function addHydrationConsumption(params: {
  date: string;
  addMl: number;
}): Promise<WriteResult> {
  const addMl = Math.round(params.addMl);
  if (!Number.isFinite(addMl) || addMl <= 0) {
    throw new Error('Informe uma quantidade maior que zero.');
  }
  return postPortalHydration({ date: params.date, addMl });
}

export async function setHydrationConsumption(params: {
  date: string;
  consumedMl: number;
}): Promise<WriteResult> {
  const consumedMl = Math.round(params.consumedMl);
  if (!Number.isFinite(consumedMl) || consumedMl < 0) {
    throw new Error('Informe um consumo válido.');
  }
  return postPortalHydration({ date: params.date, consumedMl });
}
