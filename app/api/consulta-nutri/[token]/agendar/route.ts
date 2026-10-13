import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { loadNutriConsultaLinkByToken } from '@/lib/nutri/agenda/consultaLinkService';
import { pacienteTemAnamneseNutricional } from '@/lib/nutri/agenda/saveAnamneseFromPublic';
import { NutriSlotUnavailableError } from '@/lib/nutri/agenda/availabilityService';
import { reserveNutriConsultaSlot } from '@/lib/nutri/agenda/meetingService';
import { scheduleNutriConsultaReminder, notifyPacienteConsultaAgendada } from '@/lib/nutri/agenda/consultaReminderService';
import { syncNutriLeadOnConsultaAgendada } from '@/lib/nutri/agenda/syncNutriLeadOnConsultaAgendada';
import { isValidPublicLinkToken, normalizePublicLinkToken } from '@/lib/publicLinks/publicLinkToken';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const token = normalizePublicLinkToken((await params).token);
    if (!isValidPublicLinkToken(token)) {
      return NextResponse.json({ error: 'Este link não é válido.' }, { status: 400 });
    }
    const link = await loadNutriConsultaLinkByToken(token);
    if (!link || link.status === 'revoked') {
      return NextResponse.json({ error: 'Este link não é válido.' }, { status: 404 });
    }

    const hasAnamnese = await pacienteTemAnamneseNutricional(link.pacienteId);
    if (!hasAnamnese) {
      return NextResponse.json(
        { error: 'Preencha a anamnese nutricional antes de agendar.', code: 'NEEDS_ANAMNESE' },
        { status: 409 }
      );
    }

    const body = (await request.json().catch(() => null)) as { availabilityId?: string } | null;
    const availabilityId = typeof body?.availabilityId === 'string' ? body.availabilityId.trim() : '';
    if (!availabilityId) {
      return NextResponse.json({ error: 'Selecione um horário.' }, { status: 400 });
    }

    const db = getFirestoreAdmin();
    const pacienteSnap = await db.collection('pacientes_completos').doc(link.pacienteId).get();
    const paciente = (pacienteSnap.data() || {}) as {
      nome?: string;
      email?: string;
      dadosIdentificacao?: { nomeCompleto?: string; telefone?: string; celular?: string };
    };
    const pacienteNome =
      paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'Paciente';
    const pacientePhone =
      paciente.dadosIdentificacao?.telefone || paciente.dadosIdentificacao?.celular || '';

    const meeting = await reserveNutriConsultaSlot({
      nutricionistaId: link.nutricionistaId,
      pacienteId: link.pacienteId,
      pacienteNome,
      pacienteEmail: typeof paciente.email === 'string' ? paciente.email : '',
      pacientePhone,
      availabilityId,
    });

    try {
      await scheduleNutriConsultaReminder({
        nutricionistaId: link.nutricionistaId,
        pacienteId: link.pacienteId,
        pacienteNome,
        availabilityId: meeting.availabilityId,
        date: meeting.date,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
      });
    } catch (reminderError) {
      console.error('[consulta-nutri/agendar] alerta Canal Chat', reminderError);
    }

    try {
      await notifyPacienteConsultaAgendada({
        nutricionistaId: link.nutricionistaId,
        pacienteId: link.pacienteId,
        pacienteNome,
        pacientePhone,
        availabilityId: meeting.availabilityId,
        date: meeting.date,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
      });
    } catch (pacienteNotifyError) {
      console.error('[consulta-nutri/agendar] WhatsApp paciente', pacienteNotifyError);
    }

    try {
      await syncNutriLeadOnConsultaAgendada({
        nutricionistaId: link.nutricionistaId,
        pacienteId: link.pacienteId,
        pacienteNome,
        pacienteEmail: typeof paciente.email === 'string' ? paciente.email : '',
        pacientePhone,
        date: meeting.date,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        availabilityId: meeting.availabilityId,
      });
    } catch (leadError) {
      console.error('[consulta-nutri/agendar] lead CRM', leadError);
    }

    return NextResponse.json({ success: true, meeting });
  } catch (error) {
    if (error instanceof NutriSlotUnavailableError) {
      return NextResponse.json({ error: error.message, code: 'SLOT_UNAVAILABLE' }, { status: 409 });
    }
    console.error('[consulta-nutri/agendar]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao agendar.' },
      { status: 400 }
    );
  }
}
