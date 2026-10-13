import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  buildMensagemMedicoAoPaciente,
  buildMensagemProfissionalAoPaciente,
  type CompartilhamentoAceiteRole,
} from '@/lib/compartilhamento/buildCompartilhamentoAceiteWhatsappMessages';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { resolveWhatsappOwnerForProfessional } from '@/lib/server/whatsappProfessionalOwner.server';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import { tryResolvePhoneFromPacienteDoc } from '@/lib/whatsapp/resolveInternationalPhone';
import { sendPatientAutomationWhatsapp } from '@/services/whatsappPatientSendRouter';
import { formatNomeMedicoWelcome } from '@/lib/nutri/agenda/welcomeMessage';
import { COL_NUTRICIONISTAS } from '@/features/metaNutri/metaNutri.constants';
import { COL_PERSONAL_TRAINERS } from '@/features/metaPersonal/metaPersonal.constants';

const COL_SOLICITACOES_NUTRI = 'solicitacoes_nutricionista';
const COL_SOLICITACOES_PERSONAL = 'solicitacoes_personal_trainer';

type SendResult = {
  status: 'sent' | 'failed' | 'skipped';
  error?: string;
  phone?: string;
};

export type CompartilhamentoAceiteWhatsappResult = {
  ok: boolean;
  jaEnviado?: boolean;
  medico: SendResult;
  profissional: SendResult;
};

function extrairTelefonePacienteDoc(data: Record<string, unknown>): string | null {
  return tryResolvePhoneFromPacienteDoc(data);
}

async function resolvePacientePhone(pacienteId: string): Promise<string | null> {
  const id = pacienteId?.trim();
  if (!id) return null;
  const db = getFirestoreAdmin();
  const completo = await db.collection('pacientes_completos').doc(id).get();
  if (completo.exists) {
    const phone = extrairTelefonePacienteDoc(completo.data() as Record<string, unknown>);
    if (phone) return phone;
  }
  const legado = await db.collection('pacientes').doc(id).get();
  if (!legado.exists) return null;
  return extrairTelefonePacienteDoc(legado.data() as Record<string, unknown>);
}

async function resolveMedicoNome(medicoId: string, fallback?: string): Promise<string> {
  const id = medicoId?.trim();
  if (!id) return formatNomeMedicoWelcome(fallback || 'seu médico');
  const db = getFirestoreAdmin();
  let snap = await db.collection('medicos').doc(id).get();
  if (!snap.exists) {
    const byUser = await db.collection('medicos').where('userId', '==', id).limit(1).get();
    if (!byUser.empty) snap = byUser.docs[0];
  }
  if (!snap.exists) return formatNomeMedicoWelcome(fallback || 'seu médico');
  const data = snap.data() as Record<string, unknown>;
  const nome =
    (typeof data.nome === 'string' && data.nome.trim()) ||
    (typeof data.nomeCompleto === 'string' && data.nomeCompleto.trim()) ||
    fallback?.trim() ||
    'seu médico';
  const genero = data.genero === 'F' || data.genero === 'M' ? data.genero : undefined;
  return formatNomeMedicoWelcome(nome, genero);
}

async function resolveProfissionalProfile(
  role: CompartilhamentoAceiteRole,
  profissionalId: string,
  fallbackNome?: string,
): Promise<{
  nome: string;
  telefone: string;
  genero?: 'M' | 'F' | '';
  uid: string;
}> {
  const db = getFirestoreAdmin();
  const col = role === 'nutricionista' ? COL_NUTRICIONISTAS : COL_PERSONAL_TRAINERS;
  const byId = await db.collection(col).doc(profissionalId).get();
  let data = byId.exists ? (byId.data() as Record<string, unknown>) : null;
  let uid = profissionalId;

  if (data && typeof data.userId === 'string' && data.userId.trim()) {
    uid = data.userId.trim();
  }

  if (!data) {
    const byUser = await db.collection(col).where('userId', '==', profissionalId).limit(1).get();
    if (!byUser.empty) {
      data = byUser.docs[0].data() as Record<string, unknown>;
      uid = profissionalId;
    }
  }

  const nome =
    (typeof data?.nome === 'string' && data.nome.trim()) ||
    fallbackNome?.trim() ||
    (role === 'nutricionista' ? 'Nutricionista' : 'Personal trainer');
  const telefone = typeof data?.telefone === 'string' ? data.telefone.trim() : '';
  const genero =
    data?.genero === 'M' || data?.genero === 'F' || data?.genero === ''
      ? (data.genero as 'M' | 'F' | '')
      : undefined;

  return { nome, telefone, genero, uid };
}

async function sendViaOwner(params: {
  ownerId: string;
  phone: string;
  message: string;
  pacienteId?: string;
  pacienteNome?: string;
  label: string;
}): Promise<SendResult> {
  const ownerId = params.ownerId?.trim();
  if (!ownerId) {
    return { status: 'skipped', error: `${params.label}: id do remetente ausente.` };
  }

  const connection = await getWhatsappConnectionByDoctor(ownerId);
  if (!connection || connection.status !== 'connected' || !connection.sessionId?.trim()) {
    console.warn(
      `[compartilhamento-aceite] ${params.label}: WhatsApp desconectado`,
      { ownerId, status: connection?.status ?? null },
    );
    return {
      status: 'skipped',
      error: `${params.label}: WhatsApp desconectado ou sem sessão.`,
    };
  }

  try {
    await sendPatientAutomationWhatsapp({
      ownerId,
      ownerSessionId: connection.sessionId,
      ownerConnectedPhone: connection.phone,
      phone: params.phone,
      message: params.message,
    });

    await registrarWhatsappMessageLog({
      medicoId: ownerId,
      type: 'compartilhamento_equipe',
      status: 'sent',
      phone: params.phone,
      message: params.message,
      pacienteId: params.pacienteId,
      pacienteNome: params.pacienteNome,
    }).catch(() => undefined);

    console.log(`[compartilhamento-aceite] ${params.label}: enviado`, {
      ownerId,
      phone: params.phone,
    });
    return { status: 'sent', phone: params.phone };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erro ao enviar WhatsApp.';

    await registrarWhatsappMessageLog({
      medicoId: ownerId,
      type: 'compartilhamento_equipe',
      status: 'failed',
      phone: params.phone,
      message: params.message,
      pacienteId: params.pacienteId,
      pacienteNome: params.pacienteNome,
      errorMessage,
    }).catch(() => undefined);

    console.error(`[compartilhamento-aceite] ${params.label}: falhou`, {
      ownerId,
      error: errorMessage,
    });
    return { status: 'failed', error: errorMessage, phone: params.phone };
  }
}

export async function notifyCompartilhamentoAceiteWhatsapp(params: {
  solicitacaoId: string;
  role: CompartilhamentoAceiteRole;
  /** Reenvia mesmo se já houver status sent anterior. */
  force?: boolean;
}): Promise<CompartilhamentoAceiteWhatsappResult> {
  const solicitacaoId = params.solicitacaoId?.trim();
  if (!solicitacaoId) {
    return {
      ok: false,
      medico: { status: 'failed', error: 'solicitacaoId obrigatório.' },
      profissional: { status: 'skipped' },
    };
  }

  const col =
    params.role === 'nutricionista' ? COL_SOLICITACOES_NUTRI : COL_SOLICITACOES_PERSONAL;
  const ref = getFirestoreAdmin().collection(col).doc(solicitacaoId);
  const snap = await ref.get();
  if (!snap.exists) {
    return {
      ok: false,
      medico: { status: 'failed', error: 'Solicitação não encontrada.' },
      profissional: { status: 'skipped' },
    };
  }

  const sol = snap.data() as Record<string, unknown>;
  if (sol.status !== 'aceita') {
    return {
      ok: false,
      medico: { status: 'failed', error: 'Solicitação não está aceita.' },
      profissional: { status: 'skipped' },
    };
  }

  const medicoJaEnviado = !params.force && sol.whatsappAceiteMedicoStatus === 'sent';
  const profissionalJaEnviado =
    !params.force && sol.whatsappAceiteProfissionalStatus === 'sent';

  if (medicoJaEnviado && profissionalJaEnviado) {
    return {
      ok: true,
      jaEnviado: true,
      medico: { status: 'skipped', error: 'Já enviado.' },
      profissional: { status: 'skipped', error: 'Já enviado.' },
    };
  }

  const pacienteId = typeof sol.pacienteId === 'string' ? sol.pacienteId : '';
  const medicoId = typeof sol.medicoId === 'string' ? sol.medicoId : '';
  const profissionalId =
    params.role === 'nutricionista'
      ? typeof sol.nutricionistaId === 'string'
        ? sol.nutricionistaId
        : ''
      : typeof sol.personalTrainerId === 'string'
        ? sol.personalTrainerId
        : '';

  const pacienteNome =
    (typeof sol.pacienteNome === 'string' && sol.pacienteNome.trim()) || 'Paciente';
  const medicoNomeFallback =
    typeof sol.medicoNome === 'string' ? sol.medicoNome : undefined;
  const profissionalNomeFallback =
    params.role === 'nutricionista'
      ? typeof sol.nutricionistaNome === 'string'
        ? sol.nutricionistaNome
        : undefined
      : typeof sol.personalTrainerNome === 'string'
        ? sol.personalTrainerNome
        : undefined;

  const [pacientePhone, medicoNome, profissional] = await Promise.all([
    resolvePacientePhone(pacienteId),
    resolveMedicoNome(medicoId, medicoNomeFallback),
    resolveProfissionalProfile(params.role, profissionalId, profissionalNomeFallback),
  ]);

  if (!pacientePhone) {
    await ref.set(
      {
        whatsappAceiteErro: 'Paciente sem telefone válido no cadastro.',
        whatsappAceiteTentadoEm: Timestamp.now(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return {
      ok: false,
      medico: { status: 'failed', error: 'Paciente sem telefone válido no cadastro.' },
      profissional: { status: 'skipped' },
    };
  }

  let profissionalTelefone = profissional.telefone;
  let profissionalOwnerId = profissional.uid;
  const resolved = await resolveWhatsappOwnerForProfessional(profissional.uid, params.role);
  if (resolved?.doctorId) profissionalOwnerId = resolved.doctorId;

  // Se o cadastro não tem telefone, usa o número conectado no WhatsApp do profissional.
  if (!profissionalTelefone) {
    const profConn = await getWhatsappConnectionByDoctor(profissionalOwnerId);
    if (profConn?.phone?.trim()) profissionalTelefone = profConn.phone.trim();
  }

  const msgMedico = buildMensagemMedicoAoPaciente({
    role: params.role,
    pacienteNome,
    profissionalNome: profissional.nome,
    profissionalTelefone: profissionalTelefone || 'a confirmar com a equipe',
    profissionalGenero: profissional.genero,
    medicoNome,
  });

  let msgProfissional = buildMensagemProfissionalAoPaciente({
    role: params.role,
    pacienteNome,
    profissionalNome: profissional.nome,
    medicoNome,
  });

  if (params.role === 'nutricionista' && profissional.uid && pacienteId) {
    try {
      const { getNutriAgendaSettings } = await import('@/lib/nutri/agenda/agendaSettingsService');
      const { ensureNutriConsultaLink } = await import('@/lib/nutri/agenda/consultaLinkService');
      const { renderNutriWelcomeMessage } = await import('@/lib/nutri/agenda/welcomeMessage');
      const { pacienteTemAnamneseNutricional } = await import(
        '@/lib/nutri/agenda/saveAnamneseFromPublic'
      );
      const [settings, link, anamnesePreenchida] = await Promise.all([
        getNutriAgendaSettings(profissional.uid),
        ensureNutriConsultaLink(getFirestoreAdmin(), {
          nutricionistaId: profissional.uid,
          pacienteId,
        }),
        pacienteTemAnamneseNutricional(pacienteId),
      ]);
      msgProfissional = renderNutriWelcomeMessage({
        template: settings.welcomeMessageTemplate,
        pacienteNome,
        nutriNome: profissional.nome,
        medicoNome,
        agendamentoUrl: link.url,
        anamnesePreenchida,
      });
    } catch (err) {
      console.warn('[compartilhamento-aceite] fallback mensagem nutri (link de agenda):', err);
    }
  }

  if (params.role === 'personal_trainer' && profissional.uid && pacienteId) {
    try {
      const { getPersonalAgendaSettings } = await import('@/lib/personal/agenda/agendaSettingsService');
      const { ensurePersonalConsultaLink } = await import('@/lib/personal/agenda/consultaLinkService');
      const { renderPersonalWelcomeMessage } = await import('@/lib/personal/agenda/welcomeMessage');
      const { pacienteTemAvaliacaoTreinoCompleta } = await import(
        '@/lib/personal/agenda/avaliacaoTreinoPublicService'
      );
      const [settings, link, anamnesePreenchida] = await Promise.all([
        getPersonalAgendaSettings(profissional.uid),
        ensurePersonalConsultaLink(getFirestoreAdmin(), {
          personalTrainerId: profissional.uid,
          pacienteId,
        }),
        pacienteTemAvaliacaoTreinoCompleta(pacienteId),
      ]);
      msgProfissional = renderPersonalWelcomeMessage({
        template: settings.welcomeMessageTemplate,
        pacienteNome,
        personalNome: profissional.nome,
        medicoNome,
        agendamentoUrl: link.url,
        anamnesePreenchida,
      });
    } catch (err) {
      console.warn('[compartilhamento-aceite] fallback mensagem personal (link de agenda):', err);
    }
  }

  const medicoSend = medicoJaEnviado
    ? ({ status: 'skipped', error: 'Já enviado.' } as SendResult)
    : await sendViaOwner({
        ownerId: medicoId,
        phone: pacientePhone,
        message: msgMedico,
        pacienteId,
        pacienteNome,
        label: 'medico→paciente',
      });

  const profissionalSend = profissionalJaEnviado
    ? ({ status: 'skipped', error: 'Já enviado.' } as SendResult)
    : await sendViaOwner({
        ownerId: profissionalOwnerId,
        phone: pacientePhone,
        message: msgProfissional,
        pacienteId,
        pacienteNome,
        label: 'profissional→paciente',
      });

  const medicoStatusFinal =
    medicoSend.status === 'sent' || medicoJaEnviado
      ? 'sent'
      : medicoSend.status;
  const profissionalStatusFinal =
    profissionalSend.status === 'sent' || profissionalJaEnviado
      ? 'sent'
      : profissionalSend.status;

  const ok = medicoStatusFinal === 'sent' || profissionalStatusFinal === 'sent';
  const errors = [medicoSend.error, profissionalSend.error].filter(Boolean);

  await ref.set(
    {
      whatsappAceiteTentadoEm: Timestamp.now(),
      ...(ok ? { whatsappAceiteNotificadoEm: Timestamp.now() } : {}),
      whatsappAceiteMedicoStatus: medicoStatusFinal,
      whatsappAceiteProfissionalStatus: profissionalStatusFinal,
      whatsappAceiteErro: errors.length ? errors.join(' | ') : FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { ok, medico: medicoSend, profissional: profissionalSend };
}
