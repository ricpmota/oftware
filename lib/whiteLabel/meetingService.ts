import { FieldValue } from 'firebase-admin/firestore';
import { createWhiteLabelMeetingEvent } from '@/lib/google/calendarService';
import {
  SlotUnavailableError,
  attachMeetingToAvailability,
  ensureAvailabilitySlot,
  getAvailabilityById,
} from '@/lib/whiteLabel/availabilityService';
import { listAvailableSlotsFromEngine } from '@/lib/whiteLabel/availabilityEngine';
import { WHITELABEL_AVAILABILITY_COLLECTION } from '@/lib/whiteLabel/availabilityFirestore';
import { updateLeadMeeting } from '@/lib/whiteLabel/leadService';
import { updateLeadCrmStage } from '@/lib/whiteLabel/leadCrmService';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

export type CreateMeetingForLeadResult = {
  googleCalendarEventId: string;
  googleMeetLink: string;
  htmlLink: string;
};

export async function createMeetingForWhiteLabelLead(
  leadId: string,
  availabilityId: string
): Promise<CreateMeetingForLeadResult> {
  const db = getFirestoreAdmin();
  const leadSnap = await db.collection('leadsWhiteLabel').doc(leadId).get();
  if (!leadSnap.exists) {
    throw new Error('Lead não encontrado.');
  }

  const lead = leadSnap.data()!;
  const availability = await getAvailabilityById(availabilityId);
  if (!availability) {
    throw new Error('Horário não encontrado.');
  }

  if (availability.leadId && availability.leadId !== leadId) {
    throw new Error('Este horário pertence a outro lead.');
  }

  const meeting = await createWhiteLabelMeetingEvent({
    doctorName: lead.nome,
    doctorEmail: lead.email,
    doctorPhone: lead.whatsapp,
    date: availability.date,
    startTime: availability.startTime,
    endTime: availability.endTime,
  });

  await updateLeadMeeting(leadId, {
    availabilityId,
    date: availability.date,
    startTime: availability.startTime,
    endTime: availability.endTime,
    googleCalendarEventId: meeting.eventId,
    googleMeetLink: meeting.meetLink,
    status: 'scheduled',
  });

  await attachMeetingToAvailability({
    availabilityId,
    googleCalendarEventId: meeting.eventId,
    googleMeetLink: meeting.meetLink,
  });

  return {
    googleCalendarEventId: meeting.eventId,
    googleMeetLink: meeting.meetLink,
    htmlLink: meeting.htmlLink,
  };
}

export async function markLeadMeetingError(leadId: string, availabilityId: string) {
  await updateLeadMeeting(leadId, {
    availabilityId,
    status: 'error',
  });
}

export type ManualScheduleMeetingResult = {
  date: string;
  startTime: string;
  endTime: string;
  availabilityId: string;
  calendarCreated: boolean;
  googleCalendarEventId?: string;
  googleMeetLink?: string;
  htmlLink?: string;
  calendarError?: string;
};

export async function manualScheduleMeetingForLead(
  leadId: string,
  availabilityId: string
): Promise<ManualScheduleMeetingResult> {
  const engineSlots = await listAvailableSlotsFromEngine();
  const engineMatch = engineSlots.find((s) => s.id === availabilityId);
  let resolvedSlotId = availabilityId;

  if (engineMatch) {
    const materialized = await ensureAvailabilitySlot({
      availabilityId,
      date: engineMatch.date,
      startTime: engineMatch.startTime,
      endTime: engineMatch.endTime,
      source: 'generated',
    });
    resolvedSlotId = materialized.id;
  }

  const db = getFirestoreAdmin();
  const leadRef = db.collection('leadsWhiteLabel').doc(leadId);
  const slotRef = db.collection(WHITELABEL_AVAILABILITY_COLLECTION).doc(resolvedSlotId);

  const slotInfo = await db.runTransaction(async (transaction) => {
    const leadSnap = await transaction.get(leadRef);
    if (!leadSnap.exists) {
      throw new Error('Lead não encontrado.');
    }

    const lead = leadSnap.data()!;
    if (lead.meeting?.availabilityId) {
      throw new Error('Este lead já possui um horário vinculado. Use "Tentar criar reunião novamente" se houve erro no Google Calendar.');
    }

    const slotSnap = await transaction.get(slotRef);
    if (!slotSnap.exists) {
      throw new SlotUnavailableError('Horário não encontrado.');
    }

    const slotData = slotSnap.data()!;
    if (slotData.status !== 'available') {
      throw new SlotUnavailableError('Este horário não está mais disponível.');
    }

    transaction.update(leadRef, {
      meeting: {
        availabilityId: resolvedSlotId,
        date: slotData.date,
        startTime: slotData.startTime,
        endTime: slotData.endTime,
        status: 'scheduled',
        createdAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    });

    transaction.update(slotRef, {
      status: 'reserved',
      leadId,
      doctorName: lead.nome || '',
      doctorEmail: lead.email || '',
      doctorPhone: lead.whatsapp || '',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      date: slotData.date as string,
      startTime: slotData.startTime as string,
      endTime: slotData.endTime as string,
    };
  });

  await updateLeadCrmStage(leadId, 'REUNIAO_AGENDADA').catch(() => undefined);

  try {
    const meeting = await createMeetingForWhiteLabelLead(leadId, resolvedSlotId);
    return {
      ...slotInfo,
      availabilityId: resolvedSlotId,
      calendarCreated: true,
      googleCalendarEventId: meeting.googleCalendarEventId,
      googleMeetLink: meeting.googleMeetLink,
      htmlLink: meeting.htmlLink,
    };
  } catch (error) {
    await markLeadMeetingError(leadId, resolvedSlotId).catch(() => undefined);
    return {
      ...slotInfo,
      availabilityId: resolvedSlotId,
      calendarCreated: false,
      calendarError: error instanceof Error ? error.message : 'Erro ao criar reunião no Google Calendar.',
    };
  }
}
