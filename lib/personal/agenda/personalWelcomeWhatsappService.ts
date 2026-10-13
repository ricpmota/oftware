import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { COL_PERSONAL_TRAINERS } from '@/features/metaPersonal/metaPersonal.constants';
import { personalTrainerHasActivePatientLink } from '@/lib/personal/personalTrainerHasActivePatientLink';
import { getPersonalAgendaSettings } from '@/lib/personal/agenda/agendaSettingsService';
import { ensurePersonalConsultaLink } from '@/lib/personal/agenda/consultaLinkService';
import {
  buildWhatsappManualUrl,
  formatNomeMedicoWelcome,
  renderPersonalWelcomeMessage,
} from '@/lib/personal/agenda/welcomeMessage';
import { pacienteTemAvaliacaoTreinoCompleta } from '@/lib/personal/agenda/avaliacaoTreinoPublicService';
import { resolveWhatsappOwnerForProfessional } from '@/lib/server/whatsappProfessionalOwner.server';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import { tryResolvePhoneFromPacienteDoc } from '@/lib/whatsapp/resolveInternationalPhone';
import { sendPatientAutomationWhatsapp } from '@/services/whatsappPatientSendRouter';

export const PERSONAL_WELCOME_WHATSAPP_DESCONECTADO =
  'WhatsApp desconectado. Use o botão ao lado para enviar pelo aplicativo.';

export class PersonalWelcomeWhatsappError extends Error {
  constructor(
    message: string,
    readonly code: 'not_linked' | 'no_phone' | 'disconnected' | 'send_failed'
  ) {
    super(message);
    this.name = 'PersonalWelcomeWhatsappError';
  }
}

export type PersonalWelcomePayload = {
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

export async function buildPersonalWelcomePayload(
  personalTrainerId: string,
  pacienteId: string
): Promise<PersonalWelcomePayload> {
  const personalId = personalTrainerId.trim();
  const pacId = pacienteId.trim();
  const db = getFirestoreAdmin();

  const linked = await personalTrainerHasActivePatientLink(db, personalId, pacId);
  if (!linked) {
    throw new PersonalWelcomeWhatsappError('Paciente não está vinculado a esto personal.', 'not_linked');
  }

  const [pacienteSnap, personalSnap, settings, link, phone, anamnesePreenchida] = await Promise.all([
    db.collection('pacientes_completos').doc(pacId).get(),
    db.collection(COL_PERSONAL_TRAINERS).doc(personalId).get(),
    getPersonalAgendaSettings(personalId),
    ensurePersonalConsultaLink(db, { personalTrainerId: personalId, pacienteId: pacId }),
    resolvePacientePhone(pacId),
    pacienteTemAvaliacaoTreinoCompleta(pacId),
  ]);

  if (!phone) {
    throw new PersonalWelcomeWhatsappError(
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

  const personalData = (personalSnap.exists ? personalSnap.data() : {}) as Record<string, unknown>;
  const personalNome =
    (typeof personalData.nome === 'string' && personalData.nome.trim()) || 'Personal';

  const medicoId = String(pacienteData.medicoResponsavelId || '').trim();
  const medicoNome = await resolveMedicoNome(medicoId);

  const message = renderPersonalWelcomeMessage({
    template: settings.welcomeMessageTemplate,
    pacienteNome,
    personalNome,
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

export async function sendPersonalWelcomeWhatsapp(
  personalTrainerId: string,
  pacienteId: string
): Promise<PersonalWelcomePayload> {
  const payload = await buildPersonalWelcomePayload(personalTrainerId, pacienteId);
  const resolved = await resolveWhatsappOwnerForProfessional(personalTrainerId, 'personal_trainer');
  const ownerId = resolved?.doctorId || personalTrainerId;
  const connection = await getWhatsappConnectionByDoctor(ownerId);

  if (!connection || connection.status !== 'connected' || !connection.sessionId?.trim()) {
    throw new PersonalWelcomeWhatsappError(PERSONAL_WELCOME_WHATSAPP_DESCONECTADO, 'disconnected');
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
    throw new PersonalWelcomeWhatsappError(errorMessage, 'send_failed');
  }

  return payload;
}
