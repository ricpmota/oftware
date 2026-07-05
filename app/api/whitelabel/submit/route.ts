import { NextRequest, NextResponse } from 'next/server';
import { clientEventsForTimeline } from '@/lib/whiteLabel/clientTrackingEvents';
import { submitWhiteLabelLeadWithMeeting } from '@/lib/whiteLabel/leadService';
import { SlotUnavailableError } from '@/lib/whiteLabel/availabilityService';
import { createMeetingForWhiteLabelLead, markLeadMeetingError } from '@/lib/whiteLabel/meetingService';
import { recordClientTrackingEvents } from '@/lib/whiteLabel/leadTimelineService';
import type { WhiteLabelClientEvent } from '@/types/whiteLabelClientEvents';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      availabilityId?: string;
      form?: Record<string, unknown>;
      clientEvents?: WhiteLabelClientEvent[];
    } | null;

    if (!body?.form || typeof body.form !== 'object') {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

    const result = await submitWhiteLabelLeadWithMeeting({
      form: body.form,
      availabilityId: body.availabilityId || '',
    });

    if (Array.isArray(body.clientEvents) && body.clientEvents.length > 0) {
      await recordClientTrackingEvents(
        result.leadId,
        clientEventsForTimeline(body.clientEvents)
      ).catch(() => undefined);
    }

    let meeting: {
      googleMeetLink?: string;
      googleCalendarEventId?: string;
      status: 'scheduled' | 'error';
      error?: string;
    } = { status: 'scheduled' };

    try {
      const created = await createMeetingForWhiteLabelLead(result.leadId, result.availabilityId);
      meeting = {
        status: 'scheduled',
        googleMeetLink: created.googleMeetLink,
        googleCalendarEventId: created.googleCalendarEventId,
      };
    } catch (calendarError) {
      const message =
        calendarError instanceof Error ? calendarError.message : 'Erro ao criar reunião no Google Calendar.';
      await markLeadMeetingError(result.leadId, result.availabilityId).catch(() => undefined);
      meeting = { status: 'error', error: message };
    }

    return NextResponse.json({
      success: true,
      id: result.leadId,
      leadScore: result.leadScore,
      leadTemperatura: result.leadTemperatura,
      meeting: {
        availabilityId: result.availabilityId,
        date: result.date,
        startTime: result.startTime,
        endTime: result.endTime,
        ...meeting,
      },
    });
  } catch (error) {
    if (error instanceof SlotUnavailableError) {
      return NextResponse.json({ error: error.message, code: 'SLOT_UNAVAILABLE' }, { status: 409 });
    }

    console.error('[API whitelabel/submit] Erro:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao enviar formulário.' },
      { status: 400 }
    );
  }
}
