import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  NutriSlotUnavailableError,
  ensureNutriAvailabilitySlot,
} from '@/lib/nutri/agenda/availabilityService';
import { listNutriAvailableSlotsFromEngine } from '@/lib/nutri/agenda/availabilityEngine';
import {
  NUTRI_AVAILABILITY_COLLECTION,
  isValidAvailabilityDate,
  isValidAvailabilityRange,
  isValidAvailabilityTime,
  mapNutriAvailabilityDocApi,
} from '@/lib/nutri/agenda/availabilityFirestore';
import { nutriSlotDocId } from '@/lib/nutri/agenda/agendaDefaults';
import { scheduleNutriConsultaReminder, updateNutriConsultaReminder, scheduleNutriConsultaPatientReminder, updateNutriConsultaPatientReminder, notifyPacienteConsultaAlterada, notifyPacienteConsultaCancelada } from '@/lib/nutri/agenda/consultaReminderService';
import { syncNutriLeadOnConsultaAlterada } from '@/lib/nutri/agenda/syncNutriLeadOnConsultaAgendada';
import type { NutriAvailabilityApiRow } from '@/types/nutriAgenda';

export async function reserveNutriConsultaSlot(input: {
  nutricionistaId: string;
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
  const engineSlots = await listNutriAvailableSlotsFromEngine(input.nutricionistaId);
  const engineMatch = engineSlots.find((s) => s.id === input.availabilityId);
  let resolvedSlotId = input.availabilityId;

  if (engineMatch) {
    const materialized = await ensureNutriAvailabilitySlot({
      nutricionistaId: input.nutricionistaId,
      availabilityId: input.availabilityId,
      date: engineMatch.date,
      startTime: engineMatch.startTime,
      endTime: engineMatch.endTime,
      source: 'generated',
    });
    resolvedSlotId = materialized.id;
  }

  const db = getFirestoreAdmin();
  const slotRef = db.collection(NUTRI_AVAILABILITY_COLLECTION).doc(resolvedSlotId);

  return db.runTransaction(async (transaction) => {
    const slotSnap = await transaction.get(slotRef);
    if (!slotSnap.exists) {
      throw new NutriSlotUnavailableError('Horário não encontrado.');
    }
    const slotData = slotSnap.data()!;
    if (String(slotData.nutricionistaId || '') !== input.nutricionistaId) {
      throw new NutriSlotUnavailableError('Horário não encontrado.');
    }
    if (slotData.status !== 'available') {
      throw new NutriSlotUnavailableError();
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

export async function updateNutriConsultaMeeting(input: {
  nutricionistaId: string;
  availabilityId: string;
  date: string;
  startTime: string;
  endTime: string;
  observacoes?: string;
}): Promise<NutriAvailabilityApiRow> {
  const ownerId = input.nutricionistaId.trim();
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
  const oldRef = db.collection(NUTRI_AVAILABILITY_COLLECTION).doc(input.availabilityId);
  const oldSnap = await oldRef.get();
  if (!oldSnap.exists) throw new Error('Consulta não encontrada.');
  const oldData = oldSnap.data()!;
  if (String(oldData.nutricionistaId || '') !== ownerId) {
    throw new Error('Consulta não encontrada.');
  }
  if (oldData.status !== 'reserved') {
    throw new Error('Só é possível editar uma consulta já agendada.');
  }

  const pacienteId = String(oldData.pacienteId || '');
  const pacienteNome = String(oldData.pacienteNome || 'Paciente');
  const pacientePhone = String(oldData.pacientePhone || '');
  const oldDate = String(oldData.date || '');
  const oldStartTime = String(oldData.startTime || '');
  const oldEndTime = String(oldData.endTime || '');
  const newId = nutriSlotDocId(ownerId, date, startTime, endTime);
  const timeChanged =
    String(oldData.date || '') !== date ||
    String(oldData.startTime || '') !== startTime ||
    String(oldData.endTime || '') !== endTime;

  const reservedPayload = {
    nutricionistaId: ownerId,
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
    const newRef = db.collection(NUTRI_AVAILABILITY_COLLECTION).doc(newId);
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
  const finalSnap = await db.collection(NUTRI_AVAILABILITY_COLLECTION).doc(finalId).get();
  const row = mapNutriAvailabilityDocApi(finalSnap.id, finalSnap.data()!);

  const reminderId =
    typeof row.reminderLembreteId === 'string' ? row.reminderLembreteId : '';
  const patientReminderId =
    typeof row.patientReminderLembreteId === 'string' ? row.patientReminderLembreteId : '';
  try {
    if (reminderId && timeChanged) {
      await updateNutriConsultaReminder({
        lembreteId: reminderId,
        nutricionistaId: ownerId,
        pacienteId,
        pacienteNome,
        date,
        startTime,
        endTime,
      });
    } else if (!reminderId && pacienteId) {
      await scheduleNutriConsultaReminder({
        nutricionistaId: ownerId,
        pacienteId,
        pacienteNome,
        availabilityId: finalId,
        date,
        startTime,
        endTime,
      });
    }

    if (patientReminderId && timeChanged) {
      await updateNutriConsultaPatientReminder({
        lembreteId: patientReminderId,
        nutricionistaId: ownerId,
        pacienteId,
        pacienteNome,
        date,
        startTime,
      });
    } else if (!patientReminderId && pacienteId) {
      await scheduleNutriConsultaPatientReminder({
        nutricionistaId: ownerId,
        pacienteId,
        pacienteNome,
        availabilityId: finalId,
        date,
        startTime,
        endTime,
      });
    }
  } catch (error) {
    console.error('[nutri consulta] lembrete após edição', error);
  }

  if (pacienteId) {
    try {
      await syncNutriLeadOnConsultaAlterada({
        nutricionistaId: ownerId,
        pacienteId,
        date,
        startTime,
        endTime,
        observacoes,
        timeChanged,
      });
    } catch (error) {
      console.error('[nutri consulta] lead após edição', error);
    }
  }

  if (timeChanged && pacienteId) {
    await notifyPacienteConsultaAlterada({
      nutricionistaId: ownerId,
      pacienteId,
      pacienteNome,
      pacientePhone,
      oldDate,
      oldStartTime,
      oldEndTime,
      date,
      startTime,
      endTime,
    });
  }

  const refreshed = await db.collection(NUTRI_AVAILABILITY_COLLECTION).doc(finalId).get();
  return mapNutriAvailabilityDocApi(refreshed.id, refreshed.data()!);
}

export async function markNutriConsultaRealizada(input: {
  nutricionistaId: string;
  availabilityId: string;
  realizada: boolean;
}): Promise<NutriAvailabilityApiRow> {
  const ownerId = input.nutricionistaId.trim();
  const db = getFirestoreAdmin();
  const ref = db.collection(NUTRI_AVAILABILITY_COLLECTION).doc(input.availabilityId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Consulta não encontrada.');
  const data = snap.data()!;
  if (String(data.nutricionistaId || '') !== ownerId) {
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
  return mapNutriAvailabilityDocApi(refreshed.id, refreshed.data()!);
}

export async function cancelNutriConsultaMeeting(input: {
  nutricionistaId: string;
  availabilityId: string;
}): Promise<{ deleted: true; id: string }> {
  const ownerId = input.nutricionistaId.trim();
  const db = getFirestoreAdmin();
  const ref = db.collection(NUTRI_AVAILABILITY_COLLECTION).doc(input.availabilityId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Consulta não encontrada.');
  const data = snap.data()!;
  if (String(data.nutricionistaId || '') !== ownerId) {
    throw new Error('Consulta não encontrada.');
  }
  if (data.status !== 'reserved') {
    throw new Error('Só é possível apagar uma consulta já agendada.');
  }

  const pacienteId = String(data.pacienteId || '');
  const pacienteNome = String(data.pacienteNome || 'Paciente');
  const pacientePhone = String(data.pacientePhone || '');
  const date = String(data.date || '');
  const startTime = String(data.startTime || '');
  const endTime = String(data.endTime || '');

  const reminderIds = [data.reminderLembreteId, data.patientReminderLembreteId]
    .map((id) => (typeof id === 'string' ? id.trim() : ''))
    .filter(Boolean);

  for (const id of reminderIds) {
    try {
      await db.collection('lembretes').doc(id).delete();
    } catch (error) {
      console.error('[nutri consulta] falha ao remover lembrete da consulta', id, error);
    }
  }

  await ref.delete();

  if (pacienteId) {
    await notifyPacienteConsultaCancelada({
      nutricionistaId: ownerId,
      pacienteId,
      pacienteNome,
      pacientePhone,
      date,
      startTime,
      endTime,
    });
  }

  return { deleted: true, id: input.availabilityId };
}
