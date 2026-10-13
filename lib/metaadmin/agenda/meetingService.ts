import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  MedicoSlotUnavailableError,
  ensureMedicoAvailabilitySlot,
  listMedicoReservedMeetings,
} from '@/lib/metaadmin/agenda/availabilityService';
import { listMedicoAvailableSlotsFromEngine } from '@/lib/metaadmin/agenda/availabilityEngine';
import {
  MEDICO_AVAILABILITY_COLLECTION,
  isValidAvailabilityDate,
  isValidAvailabilityRange,
  isValidAvailabilityTime,
  mapMedicoAvailabilityDocApi,
} from '@/lib/metaadmin/agenda/availabilityFirestore';
import { medicoSlotDocId } from '@/lib/metaadmin/agenda/agendaDefaults';
import { getBrazilDateKey } from '@/lib/whiteLabel/availabilitySlotUtils';
import type { MedicoAvailabilityApiRow } from '@/types/medicoAgenda';

export async function reserveMedicoConsultaSlot(input: {
  medicoId: string;
  pacienteId: string;
  pacienteNome: string;
  pacienteEmail?: string;
  pacientePhone?: string;
  availabilityId: string;
}): Promise<{
  availabilityId: string;
  date: string;
  startTime: string;
  endTime: string;
}> {
  const engineSlots = await listMedicoAvailableSlotsFromEngine(input.medicoId);
  const engineMatch = engineSlots.find((s) => s.id === input.availabilityId);
  if (!engineMatch) {
    throw new MedicoSlotUnavailableError();
  }

  const materialized = await ensureMedicoAvailabilitySlot({
    medicoId: input.medicoId,
    availabilityId: input.availabilityId,
    date: engineMatch.date,
    startTime: engineMatch.startTime,
    endTime: engineMatch.endTime,
    source: 'generated',
  });
  const resolvedSlotId = materialized.id;

  const db = getFirestoreAdmin();
  const slotRef = db.collection(MEDICO_AVAILABILITY_COLLECTION).doc(resolvedSlotId);

  return db.runTransaction(async (transaction) => {
    const slotSnap = await transaction.get(slotRef);
    if (!slotSnap.exists) {
      throw new MedicoSlotUnavailableError('Horário não encontrado.');
    }
    const slotData = slotSnap.data()!;
    if (String(slotData.medicoId || '') !== input.medicoId) {
      throw new MedicoSlotUnavailableError('Horário não encontrado.');
    }
    if (slotData.status !== 'available') {
      throw new MedicoSlotUnavailableError();
    }

    transaction.update(slotRef, {
      status: 'reserved',
      pacienteId: input.pacienteId,
      pacienteNome: input.pacienteNome,
      pacienteEmail: input.pacienteEmail || '',
      pacientePhone: input.pacientePhone || '',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      availabilityId: resolvedSlotId,
      date: slotData.date as string,
      startTime: slotData.startTime as string,
      endTime: slotData.endTime as string,
    };
  });
}

export async function findUpcomingMedicoConsultaForPaciente(
  medicoId: string,
  pacienteId: string,
  opts?: { pacienteEmail?: string }
): Promise<{
  availabilityId: string;
  date: string;
  startTime: string;
  endTime: string;
  pacientePhone?: string;
  pacienteId?: string;
} | null> {
  const ownerId = medicoId.trim();
  const pid = pacienteId.trim();
  const email = opts?.pacienteEmail?.trim().toLowerCase() || '';
  if (!ownerId || (!pid && !email)) return null;

  const today = getBrazilDateKey();
  const rows = await listMedicoReservedMeetings(ownerId, today);
  const upcoming = rows.find((row) => {
    if (pid && String(row.pacienteId || '') === pid) return true;
    if (email && String(row.pacienteEmail || '').trim().toLowerCase() === email) return true;
    return false;
  });
  if (!upcoming) return null;
  return {
    availabilityId: upcoming.id,
    date: upcoming.date,
    startTime: upcoming.startTime,
    endTime: upcoming.endTime,
    pacientePhone: upcoming.pacientePhone,
    pacienteId: upcoming.pacienteId,
  };
}

export async function updateMedicoConsultaMeeting(input: {
  medicoId: string;
  availabilityId: string;
  date: string;
  startTime: string;
  endTime: string;
  observacoes?: string;
}): Promise<MedicoAvailabilityApiRow> {
  const ownerId = input.medicoId.trim();
  const date = input.date.trim();
  const startTime = input.startTime.trim();
  const endTime = input.endTime.trim();
  const observacoes = input.observacoes?.trim() || '';

  if (!isValidAvailabilityDate(date)) throw new Error('Data inválida.');
  if (!isValidAvailabilityTime(startTime) || !isValidAvailabilityTime(endTime)) {
    throw new Error('Horário inválido.');
  }
  if (!isValidAvailabilityRange(startTime, endTime)) {
    throw new Error('O término deve ser depois do início.');
  }

  const db = getFirestoreAdmin();
  const oldRef = db.collection(MEDICO_AVAILABILITY_COLLECTION).doc(input.availabilityId);
  const oldSnap = await oldRef.get();
  if (!oldSnap.exists) throw new Error('Consulta não encontrada.');
  const oldData = oldSnap.data()!;
  if (String(oldData.medicoId || '') !== ownerId) {
    throw new Error('Consulta não encontrada.');
  }
  if (oldData.status !== 'reserved') {
    throw new Error('Só é possível editar uma consulta já agendada.');
  }

  const pacienteId = String(oldData.pacienteId || '');
  const pacienteNome = String(oldData.pacienteNome || 'Paciente');
  const newId = medicoSlotDocId(ownerId, date, startTime, endTime);
  const timeChanged =
    String(oldData.date || '') !== date ||
    String(oldData.startTime || '') !== startTime ||
    String(oldData.endTime || '') !== endTime;

  const reservedPayload = {
    medicoId: ownerId,
    date,
    startTime,
    endTime,
    status: 'reserved' as const,
    source: oldData.source || 'manual',
    pacienteId,
    pacienteNome,
    pacienteEmail: oldData.pacienteEmail || '',
    pacientePhone: oldData.pacientePhone || '',
    observacoes,
    reminderLembreteId: oldData.reminderLembreteId || null,
    patientReminderLembreteId: oldData.patientReminderLembreteId || null,
    ...(oldData.realizada === true ? { realizada: true } : {}),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (!timeChanged) {
    await oldRef.set({ observacoes, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  } else {
    const newRef = db.collection(MEDICO_AVAILABILITY_COLLECTION).doc(newId);
    const newSnap = await newRef.get();
    if (newSnap.exists && newSnap.data()?.status === 'reserved') {
      const otherPaciente = String(newSnap.data()?.pacienteId || '');
      if (otherPaciente && otherPaciente !== pacienteId) {
        throw new Error('Já existe uma consulta reservada neste horário.');
      }
    }

    const batch = db.batch();
    batch.set(
      newRef,
      {
        ...reservedPayload,
        createdAt: oldData.createdAt || FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    if (newId !== oldSnap.id) {
      batch.set(
        oldRef,
        {
          status: 'available',
          pacienteId: FieldValue.delete(),
          pacienteNome: FieldValue.delete(),
          pacienteEmail: FieldValue.delete(),
          pacientePhone: FieldValue.delete(),
          observacoes: FieldValue.delete(),
          reminderLembreteId: FieldValue.delete(),
          realizada: FieldValue.delete(),
          realizadaAt: FieldValue.delete(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
    await batch.commit();
  }

  const finalId = timeChanged ? newId : oldSnap.id;
  const finalSnap = await db.collection(MEDICO_AVAILABILITY_COLLECTION).doc(finalId).get();
  return mapMedicoAvailabilityDocApi(finalSnap.id, finalSnap.data()!);
}

export async function markMedicoConsultaRealizada(input: {
  medicoId: string;
  availabilityId: string;
  realizada: boolean;
}): Promise<MedicoAvailabilityApiRow> {
  const ownerId = input.medicoId.trim();
  const db = getFirestoreAdmin();
  const ref = db.collection(MEDICO_AVAILABILITY_COLLECTION).doc(input.availabilityId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Consulta não encontrada.');
  const data = snap.data()!;
  if (String(data.medicoId || '') !== ownerId) {
    throw new Error('Consulta não encontrada.');
  }
  if (data.status !== 'reserved') {
    throw new Error('Só é possível marcar uma consulta já agendada.');
  }

  await ref.set(
    {
      realizada: input.realizada,
      realizadaAt: input.realizada ? FieldValue.serverTimestamp() : FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const refreshed = await ref.get();
  return mapMedicoAvailabilityDocApi(refreshed.id, refreshed.data()!);
}

export async function cancelMedicoConsultaMeeting(input: {
  medicoId: string;
  availabilityId: string;
}): Promise<{ deleted: true; id: string }> {
  const ownerId = input.medicoId.trim();
  const db = getFirestoreAdmin();
  const ref = db.collection(MEDICO_AVAILABILITY_COLLECTION).doc(input.availabilityId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Consulta não encontrada.');
  const data = snap.data()!;
  if (String(data.medicoId || '') !== ownerId) {
    throw new Error('Consulta não encontrada.');
  }
  if (data.status !== 'reserved') {
    throw new Error('Só é possível apagar uma consulta já agendada.');
  }

  const reminderIds = [data.reminderLembreteId, data.patientReminderLembreteId]
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter(Boolean);

  for (const id of reminderIds) {
    try {
      await db.collection('lembretes').doc(id).delete();
    } catch (error) {
      console.error('[medico consulta] falha ao remover lembrete da consulta', id, error);
    }
  }

  await ref.delete();
  return { deleted: true, id: input.availabilityId };
}
