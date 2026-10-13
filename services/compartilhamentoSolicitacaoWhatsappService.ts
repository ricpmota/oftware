import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  buildMensagemCanalChatAoProfissionalSolicitacao,
  buildMensagemMedicoAoProfissionalSolicitacao,
  type CompartilhamentoAceiteRole,
} from '@/lib/compartilhamento/buildCompartilhamentoAceiteWhatsappMessages';
import { buildOrganizacaoPublicUrl } from '@/lib/organization/organizationUrls';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { resolveWhatsappOwnerForProfessional } from '@/lib/server/whatsappProfessionalOwner.server';
import { formatNomeMedicoWelcome } from '@/lib/nutri/agenda/welcomeMessage';
import { CANAL_CHAT_OWNER_ID, CANAL_CHAT_SESSION_ID } from '@/lib/whatsapp/canalChatOwner';
import { tryResolvePhoneFromProfessionalDoc } from '@/lib/whatsapp/resolveProfessionalPhone';
import { shouldRoutePatientSendViaCanalChat } from '@/lib/whatsapp/shouldRoutePatientSendViaCanalChat';
import { getWhatsappMedicoContext } from '@/lib/server/whatsappMedicoContext.server';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { syncWhatsappConnectionWithProvider } from '@/services/whatsappConnectionSyncService';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import { sendPatientAutomationWhatsapp } from '@/services/whatsappPatientSendRouter';
import { lookupWhatsappLid } from '@/services/whatsappProviderClient';
import { withWhatsappProviderAuth } from '@/lib/server/whatsappSessionAuth.server';
import { COL_NUTRICIONISTAS } from '@/features/metaNutri/metaNutri.constants';
import { COL_PERSONAL_TRAINERS } from '@/features/metaPersonal/metaPersonal.constants';

const COL_SOLICITACOES_NUTRI = 'solicitacoes_nutricionista';
const COL_SOLICITACOES_PERSONAL = 'solicitacoes_personal_trainer';

export type CompartilhamentoSolicitacaoWhatsappResult = {
  status: 'sent' | 'failed' | 'skipped';
  /** Quem enviou: WhatsApp do médico ou Canal Chat. */
  via?: 'medico' | 'canal_chat';
  error?: string;
  phone?: string;
};

export function solicitacaoCollectionForRole(role: CompartilhamentoAceiteRole): string {
  return role === 'nutricionista' ? COL_SOLICITACOES_NUTRI : COL_SOLICITACOES_PERSONAL;
}

function pickString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

async function loadProfissional(role: CompartilhamentoAceiteRole, profissionalId: string) {
  const db = getFirestoreAdmin();
  const col = role === 'nutricionista' ? COL_NUTRICIONISTAS : COL_PERSONAL_TRAINERS;
  const byId = await db.collection(col).doc(profissionalId).get();
  if (byId.exists) return byId.data() as Record<string, unknown>;
  const byUser = await db.collection(col).where('userId', '==', profissionalId).limit(1).get();
  return byUser.empty ? null : (byUser.docs[0].data() as Record<string, unknown>);
}

async function loadMedico(
  medicoId: string,
  fallbackNome: string
): Promise<{ nome: string; phones: string[] }> {
  const db = getFirestoreAdmin();
  let snap = await db.collection('medicos').doc(medicoId).get();
  if (!snap.exists) {
    const byUser = await db.collection('medicos').where('userId', '==', medicoId).limit(1).get();
    if (!byUser.empty) snap = byUser.docs[0];
  }
  const data = (snap.exists ? snap.data() : null) as Record<string, unknown> | null;
  const genero = data?.genero === 'F' || data?.genero === 'M' ? data.genero : null;
  const nome = pickString(data?.nome) || fallbackNome;
  const phones = ['telefone', 'celular', 'phone', 'whatsapp']
    .map((key) => pickString(data?.[key]))
    .filter(Boolean);
  return { nome: nome ? formatNomeMedicoWelcome(nome, genero) : '', phones };
}

/** Status confirmado no provedor (o gravado no Firestore pode estar desatualizado). */
async function loadMedicoConnection(
  medicoId: string
): Promise<{ sessionId: string; phone?: string | null } | null> {
  let connection = await getWhatsappConnectionByDoctor(medicoId);
  if (!connection) return null;
  if (
    connection.status === 'qr_pending' ||
    connection.status === 'connected' ||
    connection.status === 'error'
  ) {
    try {
      connection = (await syncWhatsappConnectionWithProvider(connection)).connection;
    } catch (error) {
      console.warn('[compartilhamento-solicitacao] sync WhatsApp do médico falhou:', error);
    }
  }
  if (connection.status !== 'connected') return null;
  const sessionId =
    connection.sessionId?.trim() || (await getWhatsappMedicoContext(medicoId)).sessionId;
  return { sessionId, phone: connection.phone };
}

async function lookupLidViaCanalChat(canalSessionId: string, phone: string): Promise<string | null> {
  try {
    const { result } = await withWhatsappProviderAuth(CANAL_CHAT_OWNER_ID, canalSessionId, (token) =>
      lookupWhatsappLid(canalSessionId, token, phone)
    );
    return result;
  } catch (error) {
    console.warn('[compartilhamento-solicitacao] LID via Canal Chat falhou:', error);
    return null;
  }
}

async function sendAndLog(params: {
  ownerId: string;
  sessionId: string;
  ownerPhone?: string | null;
  medicoId: string;
  phone: string;
  message: string;
  pacienteId: string;
  pacienteNome: string;
  lidHint?: string;
}): Promise<string | null> {
  const log = {
    medicoId: params.medicoId,
    type: 'compartilhamento_equipe' as const,
    phone: params.phone,
    message: params.message,
    pacienteId: params.pacienteId,
    pacienteNome: params.pacienteNome,
  };
  try {
    await sendPatientAutomationWhatsapp({
      ownerId: params.ownerId,
      ownerSessionId: params.sessionId,
      ownerConnectedPhone: params.ownerPhone ?? undefined,
      phone: params.phone,
      message: params.message,
      lidHint: params.lidHint,
    });
    await registrarWhatsappMessageLog({ ...log, status: 'sent' }).catch(() => undefined);
    return null;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar WhatsApp.';
    await registrarWhatsappMessageLog({ ...log, status: 'failed', errorMessage }).catch(
      () => undefined
    );
    return errorMessage;
  }
}

/**
 * Avisa o nutricionista/personal que um paciente foi compartilhado e que é
 * preciso autorizar o vínculo na aba Pacientes. Sai pelo WhatsApp do médico;
 * se estiver desconectado (ou falhar), sai pelo Canal Chat em terceira pessoa.
 * Envia uma única vez por solicitação.
 */
export async function notifyCompartilhamentoSolicitacaoWhatsapp(params: {
  solicitacaoId: string;
  role: CompartilhamentoAceiteRole;
}): Promise<CompartilhamentoSolicitacaoWhatsappResult> {
  const db = getFirestoreAdmin();
  const ref = db.collection(solicitacaoCollectionForRole(params.role)).doc(params.solicitacaoId);
  const snap = await ref.get();
  if (!snap.exists) return { status: 'failed', error: 'Solicitação não encontrada.' };

  const sol = snap.data() as Record<string, unknown>;
  if (sol.status !== 'pendente') {
    return { status: 'skipped', error: 'Solicitação não está pendente.' };
  }
  if (sol.whatsappSolicitacaoStatus === 'sent') {
    return { status: 'skipped', error: 'Já enviado.' };
  }

  const medicoId = pickString(sol.medicoId);
  const pacienteId = pickString(sol.pacienteId);
  const profissionalId = pickString(
    params.role === 'nutricionista' ? sol.nutricionistaId : sol.personalTrainerId
  );
  const pacienteNome = pickString(sol.pacienteNome) || 'Paciente';

  const markResult = async (result: CompartilhamentoSolicitacaoWhatsappResult) => {
    await ref.set(
      {
        whatsappSolicitacaoStatus: result.status,
        whatsappSolicitacaoVia: result.via ?? null,
        whatsappSolicitacaoErro: result.error ?? null,
        whatsappSolicitacaoTentadoEm: Timestamp.now(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return result;
  };

  if (!medicoId || !profissionalId) {
    return markResult({ status: 'failed', error: 'Solicitação sem médico ou profissional.' });
  }

  const [profissional, medico, pacienteSnap] = await Promise.all([
    loadProfissional(params.role, profissionalId),
    loadMedico(medicoId, pickString(sol.medicoNome)),
    pacienteId ? db.collection('pacientes_completos').doc(pacienteId).get() : null,
  ]);

  let phone = tryResolvePhoneFromProfessionalDoc(profissional);
  if (!phone) {
    const owner = await resolveWhatsappOwnerForProfessional(profissionalId, params.role);
    const profConn = await getWhatsappConnectionByDoctor(owner?.doctorId || profissionalId);
    phone = profConn?.phone?.trim() || null;
  }
  if (!phone) {
    return markResult({ status: 'failed', error: 'Profissional sem telefone cadastrado.' });
  }

  const sexo = pacienteSnap?.data()?.dadosIdentificacao?.sexoBiologico;
  const messageParams = {
    role: params.role,
    profissionalNome:
      pickString(profissional?.nome) ||
      pickString(params.role === 'nutricionista' ? sol.nutricionistaNome : sol.personalTrainerNome),
    pacienteNome,
    pacienteSexo: sexo === 'M' || sexo === 'F' ? (sexo as 'M' | 'F') : null,
    medicoNome: medico.nome,
    aceiteUrl: buildOrganizacaoPublicUrl(
      params.role === 'nutricionista' ? '/metanutri?menu=pacientes' : '/metapersonal?menu=pacientes'
    ),
  };
  const sendBase = { medicoId, phone, pacienteId, pacienteNome };

  const canalChat = await getWhatsappConnectionByDoctor(CANAL_CHAT_OWNER_ID);
  const canalSessionId = canalChat?.sessionId?.trim() || CANAL_CHAT_SESSION_ID;
  const canalConectado = Boolean(canalChat && canalChat.status === 'connected' && canalSessionId);

  let medicoError = 'WhatsApp do médico desconectado.';
  const medicoConn = await loadMedicoConnection(medicoId);
  // Telefone do profissional igual ao do médico: o roteador desviaria a mensagem em
  // primeira pessoa para o Canal Chat, então já vai direto pelo Canal Chat em terceira pessoa.
  const mesmoTelefoneDoMedico =
    medicoConn !== null &&
    shouldRoutePatientSendViaCanalChat({
      ownerId: medicoId,
      patientPhone: phone,
      ownerPhones: [medicoConn.phone, ...medico.phones],
    });
  if (mesmoTelefoneDoMedico) medicoError = 'Telefone do profissional é o mesmo do médico.';
  if (medicoConn && !mesmoTelefoneDoMedico) {
    const sendViaMedico = (lidHint?: string) =>
      sendAndLog({
        ...sendBase,
        ownerId: medicoId,
        sessionId: medicoConn.sessionId,
        ownerPhone: medicoConn.phone,
        message: buildMensagemMedicoAoProfissionalSolicitacao(messageParams),
        lidHint,
      });

    let error = await sendViaMedico();
    // Contato “frio” para o médico: a sessão dele só resolve @c.us e o envio falha.
    // O Canal Chat costuma conhecer o LID, que vale para qualquer conta.
    if (error && canalConectado) {
      const lid = await lookupLidViaCanalChat(canalSessionId, phone);
      if (lid) error = await sendViaMedico(lid);
    }
    if (!error) return markResult({ status: 'sent', via: 'medico', phone });
    medicoError = error;
  }

  if (!canalChat || !canalConectado) {
    return markResult({
      status: 'skipped',
      error: `${medicoError} Canal Chat também está desconectado.`,
    });
  }

  const canalError = await sendAndLog({
    ...sendBase,
    ownerId: CANAL_CHAT_OWNER_ID,
    sessionId: canalSessionId,
    ownerPhone: canalChat.phone,
    message: buildMensagemCanalChatAoProfissionalSolicitacao(messageParams),
  });
  if (!canalError) return markResult({ status: 'sent', via: 'canal_chat', phone });
  return markResult({ status: 'failed', via: 'canal_chat', error: canalError, phone });
}
