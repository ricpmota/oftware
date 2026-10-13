import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { COL_NUTRICIONISTAS } from '@/features/metaNutri/metaNutri.constants';
import { nutritionistHasActivePatientLink } from '@/lib/nutri/ensureNutriCheckInPublicLink';
import { getNutriAgendaSettings } from '@/lib/nutri/agenda/agendaSettingsService';
import { ensureNutriConsultaLink } from '@/lib/nutri/agenda/consultaLinkService';
import {
  buildWhatsappManualUrl,
  formatNomeMedicoWelcome,
  renderNutriWelcomeMessage,
} from '@/lib/nutri/agenda/welcomeMessage';
import { pacienteTemAnamneseNutricional } from '@/lib/nutri/agenda/saveAnamneseFromPublic';
import { resolveWhatsappOwnerForProfessional } from '@/lib/server/whatsappProfessionalOwner.server';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import { tryResolvePhoneFromPacienteDoc } from '@/lib/whatsapp/resolveInternationalPhone';
import { sendPatientAutomationWhatsapp } from '@/services/whatsappPatientSendRouter';

export const NUTRI_WELCOME_WHATSAPP_DESCONECTADO =
  'WhatsApp desconectado. Use o botão ao lado para enviar pelo aplicativo.';

export class NutriWelcomeWhatsappError extends Error {
  constructor(
    message: string,
    readonly code: 'not_linked' | 'no_phone' | 'disconnected' | 'send_failed'
  ) {
    super(message);
    this.name = 'NutriWelcomeWhatsappError';
  }
}

export type NutriWelcomePayload = {
  message: string;
  phone: string;
  waUrl: string;
  pacienteNome: string;
};

function extrairTelefonePacienteDoc(data: Record<string, unknown>): string | null {
  return tryResolvePhoneFromPacienteDoc(data);
}

async function resolvePacientePhone(pacienteId: string): Promise<string | null> {
  const db = getFirestoreAdmin();
  const completo = await db.collection('pacientes_completos').doc(pacienteId).get();
  if (completo.exists) {
    const phone = extrairTelefonePacienteDoc(completo.data() as Record<string, unknown>);
    if (phone) return phone;
  }
  const legado = await db.collection('pacientes').doc(pacienteId).get();
  if (!legado.exists) return null;
  return extrairTelefonePacienteDoc(legado.data() as Record<string, unknown>);
}

async function resolveMedicoNome(medicoId: string): Promise<string> {
  const id = medicoId.trim();
  if (!id) return 'seu médico';
  const db = getFirestoreAdmin();
  let snap = await db.collection('medicos').doc(id).get();
  if (!snap.exists) {
    const byUser = await db.collection('medicos').where('userId', '==', id).limit(1).get();
    if (!byUser.empty) snap = byUser.docs[0];
  }
  if (!snap.exists) return 'seu médico';
  const data = snap.data() as Record<string, unknown>;
  const nome =
    (typeof data.nome === 'string' && data.nome.trim()) ||
    (typeof data.nomeCompleto === 'string' && data.nomeCompleto.trim()) ||
    'seu médico';
  const genero = data.genero === 'F' || data.genero === 'M' ? data.genero : undefined;
  return formatNomeMedicoWelcome(nome, genero);
}

export async function buildNutriWelcomePayload(
  nutricionistaId: string,
  pacienteId: string
): Promise<NutriWelcomePayload> {
  const nutriId = nutricionistaId.trim();
  const pacId = pacienteId.trim();
  const db = getFirestoreAdmin();

  const linked = await nutritionistHasActivePatientLink(db, nutriId, pacId);
  if (!linked) {
    throw new NutriWelcomeWhatsappError('Paciente não está vinculado a esta nutricionista.', 'not_linked');
  }

  const [pacienteSnap, nutriSnap, settings, link, phone, anamnesePreenchida] = await Promise.all([
    db.collection('pacientes_completos').doc(pacId).get(),
    db.collection(COL_NUTRICIONISTAS).doc(nutriId).get(),
    getNutriAgendaSettings(nutriId),
    ensureNutriConsultaLink(db, { nutricionistaId: nutriId, pacienteId: pacId }),
    resolvePacientePhone(pacId),
    pacienteTemAnamneseNutricional(pacId),
  ]);

  if (!phone) {
    throw new NutriWelcomeWhatsappError(
      'Paciente sem telefone válido no cadastro.',
      'no_phone'
    );
  }

  const pacienteData = (pacienteSnap.exists ? pacienteSnap.data() : {}) as Record<string, unknown>;
  const ident = pacienteData.dadosIdentificacao as Record<string, unknown> | undefined;
  const pacienteNome =
    (typeof ident?.nomeCompleto === 'string' && ident.nomeCompleto.trim()) ||
    (typeof pacienteData.nome === 'string' && pacienteData.nome.trim()) ||
    'Paciente';

  const nutriData = (nutriSnap.exists ? nutriSnap.data() : {}) as Record<string, unknown>;
  const nutriNome =
    (typeof nutriData.nome === 'string' && nutriData.nome.trim()) || 'Nutricionista';

  const medicoId = String(pacienteData.medicoResponsavelId || '').trim();
  const medicoNome = await resolveMedicoNome(medicoId);

  const message = renderNutriWelcomeMessage({
    template: settings.welcomeMessageTemplate,
    pacienteNome,
    nutriNome,
    medicoNome,
    agendamentoUrl: link.url,
    anamnesePreenchida,
  });

  return {
    message,
    phone,
    waUrl: buildWhatsappManualUrl(phone, message),
    pacienteNome,
  };
}

export async function sendNutriWelcomeWhatsapp(
  nutricionistaId: string,
  pacienteId: string
): Promise<NutriWelcomePayload> {
  const payload = await buildNutriWelcomePayload(nutricionistaId, pacienteId);
  const resolved = await resolveWhatsappOwnerForProfessional(nutricionistaId, 'nutricionista');
  const ownerId = resolved?.doctorId || nutricionistaId;
  const connection = await getWhatsappConnectionByDoctor(ownerId);

  if (!connection || connection.status !== 'connected' || !connection.sessionId?.trim()) {
    throw new NutriWelcomeWhatsappError(NUTRI_WELCOME_WHATSAPP_DESCONECTADO, 'disconnected');
  }

  try {
    await sendPatientAutomationWhatsapp({
      ownerId,
      ownerSessionId: connection.sessionId,
      ownerConnectedPhone: connection.phone,
      phone: payload.phone,
      message: payload.message,
    });
    await registrarWhatsappMessageLog({
      medicoId: ownerId,
      type: 'compartilhamento_equipe',
      status: 'sent',
      phone: payload.phone,
      message: payload.message,
      pacienteId,
      pacienteNome: payload.pacienteNome,
    }).catch(() => undefined);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar WhatsApp.';
    await registrarWhatsappMessageLog({
      medicoId: ownerId,
      type: 'compartilhamento_equipe',
      status: 'failed',
      phone: payload.phone,
      message: payload.message,
      pacienteId,
      pacienteNome: payload.pacienteNome,
      errorMessage,
    }).catch(() => undefined);
    throw new NutriWelcomeWhatsappError(errorMessage, 'send_failed');
  }

  return payload;
}
