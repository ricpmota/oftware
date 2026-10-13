import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { requirePacienteSelf } from '@/lib/server/requirePacienteSelfGate';
import { getMedicoAgendaSettings } from '@/lib/metaadmin/agenda/agendaSettingsService';

export type PublicBookingContext = {
  pacienteId: string;
  medicoId: string;
  medicoNome: string;
  medicoEmail: string;
  pacienteNome: string;
  pacienteEmail: string;
  pacientePhone: string;
  publicBookingEnabled: boolean;
  alreadyLinked: boolean;
};

function digitsPhone(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D/g, '') : '';
}

async function pacientePodeAgendarComMedico(
  pacienteId: string,
  medicoId: string,
  data: Record<string, unknown>
): Promise<boolean> {
  if (String(data.medicoResponsavelId || '').trim() === medicoId) return true;
  if (String(data.medicoRecomendadoId || '').trim() === medicoId) return true;

  const db = getFirestoreAdmin();
  const byPaciente = await db
    .collection('solicitacoes_medico')
    .where('pacienteId', '==', pacienteId)
    .where('medicoId', '==', medicoId)
    .limit(8)
    .get();
  if (
    byPaciente.docs.some((doc) => {
      const status = String(doc.data()?.status || '');
      return status === 'pendente' || status === 'aceita';
    })
  ) {
    return true;
  }

  return false;
}

export async function requirePublicMedicoBooking(
  request: NextRequest,
  input: { pacienteId: string; medicoId: string }
): Promise<PublicBookingContext | NextResponse> {
  const pacienteId = input.pacienteId.trim();
  const medicoId = input.medicoId.trim();
  if (!pacienteId) {
    return NextResponse.json({ error: 'Paciente inválido.' }, { status: 400 });
  }
  if (!medicoId) {
    return NextResponse.json({ error: 'Médico inválido.' }, { status: 400 });
  }

  const auth = await requirePacienteSelf(request, pacienteId, {
    enablePacienteIdFallback: true,
    routeContext: 'meta/agenda',
  });
  if (!auth.ok) return auth.res;

  const resolvedPacienteId = auth.resolvedPacienteId || auth.pacienteId;
  const db = getFirestoreAdmin();
  const [pacienteSnap, medicoSnap, settings] = await Promise.all([
    db.collection('pacientes_completos').doc(resolvedPacienteId).get(),
    db.collection('medicos').doc(medicoId).get(),
    getMedicoAgendaSettings(medicoId),
  ]);

  if (!pacienteSnap.exists) {
    return NextResponse.json({ error: 'Cadastro de paciente não encontrado.' }, { status: 404 });
  }
  if (!medicoSnap.exists) {
    return NextResponse.json({ error: 'Médico não encontrado.' }, { status: 404 });
  }

  const pacienteData = (pacienteSnap.data() || {}) as Record<string, unknown>;
  const allowed = await pacientePodeAgendarComMedico(resolvedPacienteId, medicoId, pacienteData);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Este agendamento só está disponível pelo link do seu médico.' },
      { status: 403 }
    );
  }

  const ident = pacienteData.dadosIdentificacao as Record<string, unknown> | undefined;
  const pacienteNome =
    String(ident?.nomeCompleto || pacienteData.nome || '').trim() || 'Paciente';
  const pacientePhone = digitsPhone(ident?.telefone) || digitsPhone(ident?.celular);
  const medicoData = (medicoSnap.data() || {}) as Record<string, unknown>;

  return {
    pacienteId: resolvedPacienteId,
    medicoId,
    medicoNome: String(medicoData.nome || '').trim() || 'Médico',
    medicoEmail: String(medicoData.email || '').trim(),
    pacienteNome,
    pacienteEmail: String(ident?.email || pacienteData.email || '').trim(),
    pacientePhone,
    publicBookingEnabled: settings.publicBookingEnabled === true,
    alreadyLinked: String(pacienteData.medicoResponsavelId || '').trim() === medicoId,
  };
}
