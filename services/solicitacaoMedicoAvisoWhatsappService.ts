import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  buildMetaadminPacientesUrl,
  buildSolicitacaoAcompanhamentoMedicoTexto,
} from '@/lib/metaadmin/solicitacaoMedicoAvisoWhatsapp';
import { renderAutomationTemplate } from '@/lib/metaadmingeral/renderAutomationTemplate';
import {
  CANAL_CHAT_OWNER_ID,
  CANAL_CHAT_SESSION_ID,
} from '@/lib/whatsapp/canalChatOwner';
import { SOLICITACAO_ACOMPANHAMENTO_AUTOMATION_ID } from '@/lib/whatsapp/canalChatTemplates';
import { formatMedicoBoasVindas } from '@/lib/whatsapp/boasVindasTratamentoMessage';
import {
  isMedicoEventAutomationEnabled,
  resolveMedicoAutomationTemplate,
} from '@/services/medicoAutomationTemplateResolveService';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import { normalizeWhatsappPhone } from '@/services/whatsappProviderClient';
import { sendPatientAutomationWhatsapp } from '@/services/whatsappPatientSendRouter';
import { tryResolvePhoneFromProfessionalDoc } from '@/lib/whatsapp/resolveProfessionalPhone';
import { assertCanonicalWhatsappPhone, InternationalPhoneError } from '@/lib/whatsapp/resolveInternationalPhone';

const SOLICITACOES_COLLECTION = 'solicitacoes_medico';
const MEDICOS_COLLECTION = 'medicos';

export type NotifyMedicoNovaSolicitacaoResult =
  | { status: 'sent'; phone: string }
  | { status: 'already_sent' }
  | { status: 'skipped'; reason: string };

function tryNormalizePhone(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    return assertCanonicalWhatsappPhone(raw);
  } catch (error) {
    if (!(error instanceof InternationalPhoneError)) throw error;
  }
  try {
    return normalizeWhatsappPhone(raw);
  } catch {
    return null;
  }
}

async function resolveMedicoAvisoPhone(
  medicoId: string,
  data: Record<string, unknown>,
): Promise<string | null> {
  const fromDoc = tryResolvePhoneFromProfessionalDoc(data);
  if (fromDoc) return fromDoc;
  const connection = await getWhatsappConnectionByDoctor(medicoId);
  return tryNormalizePhone(connection?.phone);
}

/**
 * Canal Chat → médico: paciente solicitou acompanhamento e aguarda aprovação.
 * Disparado na criação da solicitação, mesmo com cadastro incompleto.
 */
export async function notifyMedicoNovaSolicitacaoAcompanhamento(params: {
  solicitacaoId: string;
}): Promise<NotifyMedicoNovaSolicitacaoResult> {
  const solicitacaoId = params.solicitacaoId?.trim();
  if (!solicitacaoId) return { status: 'skipped', reason: 'solicitacaoId é obrigatório.' };

  const solRef = getFirestoreAdmin().collection(SOLICITACOES_COLLECTION).doc(solicitacaoId);
  const solSnap = await solRef.get();
  if (!solSnap.exists) return { status: 'skipped', reason: 'Solicitação não encontrada.' };

  const sol = solSnap.data() as Record<string, unknown>;
  if (sol.whatsappAvisoMedicoStatus === 'sent') {
    return { status: 'already_sent' };
  }

  const medicoId = typeof sol.medicoId === 'string' ? sol.medicoId.trim() : '';
  if (!medicoId) {
    return { status: 'skipped', reason: 'Solicitação sem médico.' };
  }

  const allowed = await isMedicoEventAutomationEnabled({
    medicoId,
    automationId: SOLICITACAO_ACOMPANHAMENTO_AUTOMATION_ID,
  });
  if (!allowed) {
    return { status: 'skipped', reason: 'Automação de nova solicitação desativada pelo médico.' };
  }

  const medicoSnap = await getFirestoreAdmin().collection(MEDICOS_COLLECTION).doc(medicoId).get();
  if (!medicoSnap.exists) {
    return { status: 'skipped', reason: 'Médico não encontrado.' };
  }

  const medicoData = medicoSnap.data() as Record<string, unknown>;
  const phone = await resolveMedicoAvisoPhone(medicoId, medicoData);
  if (!phone) {
    await solRef.set(
      {
        whatsappAvisoMedicoStatus: 'skipped',
        whatsappAvisoMedicoErro: 'Médico sem telefone cadastrado.',
        whatsappAvisoMedicoTentadoEm: Timestamp.now(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return { status: 'skipped', reason: 'Médico sem telefone cadastrado.' };
  }

  const canalChat = await getWhatsappConnectionByDoctor(CANAL_CHAT_OWNER_ID);
  const sessionId = canalChat?.sessionId?.trim() || CANAL_CHAT_SESSION_ID;
  if (!canalChat || canalChat.status !== 'connected' || !sessionId) {
    await solRef.set(
      {
        whatsappAvisoMedicoStatus: 'skipped',
        whatsappAvisoMedicoErro: 'Canal Chat desconectado.',
        whatsappAvisoMedicoTentadoEm: Timestamp.now(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return { status: 'skipped', reason: 'Canal Chat desconectado.' };
  }

  const medicoNome =
    (typeof medicoData.nome === 'string' && medicoData.nome.trim()) ||
    (typeof medicoData.nomeCompleto === 'string' && medicoData.nomeCompleto.trim()) ||
    'Médico';
  const medicoGenero = typeof medicoData.genero === 'string' ? medicoData.genero : null;
  const pacienteNome =
    (typeof sol.pacienteNome === 'string' && sol.pacienteNome.trim()) || 'Paciente';
  const pacienteId = typeof sol.pacienteId === 'string' ? sol.pacienteId : undefined;
  const medicoFmt = formatMedicoBoasVindas(medicoNome, medicoGenero);
  const templateVars = {
    medico: medicoFmt,
    paciente: pacienteNome,
    link: buildMetaadminPacientesUrl(),
  };
  let message = buildSolicitacaoAcompanhamentoMedicoTexto({
    medicoNome,
    medicoGenero,
    pacienteNome,
  });
  const resolved = await resolveMedicoAutomationTemplate({
    automationId: SOLICITACAO_ACOMPANHAMENTO_AUTOMATION_ID,
    medicoId,
  });
  if (resolved?.body?.trim()) {
    message = renderAutomationTemplate(resolved.body, templateVars).trim();
  }

  try {
    await sendPatientAutomationWhatsapp({
      ownerId: CANAL_CHAT_OWNER_ID,
      ownerSessionId: sessionId,
      ownerConnectedPhone: canalChat.phone ?? undefined,
      phone,
      message,
    });

    await registrarWhatsappMessageLog({
      medicoId,
      type: 'solicitacao_acompanhamento',
      status: 'sent',
      phone,
      message,
      pacienteId,
      pacienteNome,
    }).catch(() => undefined);

    await solRef.set(
      {
        whatsappAvisoMedicoStatus: 'sent',
        whatsappAvisoMedicoErro: FieldValue.delete(),
        whatsappAvisoMedicoEnviadoEm: Timestamp.now(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { status: 'sent', phone };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erro ao avisar o médico pelo Canal Chat.';

    await registrarWhatsappMessageLog({
      medicoId,
      type: 'solicitacao_acompanhamento',
      status: 'failed',
      phone,
      message,
      pacienteId,
      pacienteNome,
      errorMessage,
    }).catch(() => undefined);

    await solRef
      .set(
        {
          whatsappAvisoMedicoStatus: 'failed',
          whatsappAvisoMedicoErro: errorMessage,
          whatsappAvisoMedicoTentadoEm: Timestamp.now(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      .catch(() => undefined);

    console.error('[aviso-medico-solicitacao] envio falhou', { solicitacaoId, error: errorMessage });
    return { status: 'skipped', reason: errorMessage };
  }
}
