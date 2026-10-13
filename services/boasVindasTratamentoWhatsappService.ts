import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getWhatsappMedicoContext } from '@/lib/server/whatsappMedicoContext.server';
import {
  CANAL_CHAT_OWNER_ID,
  CANAL_CHAT_SESSION_ID,
} from '@/lib/whatsapp/canalChatOwner';
import { BOAS_VINDAS_PACIENTE_AUTOMATION_ID } from '@/lib/whatsapp/canalChatTemplates';
import {
  buildBoasVindasTratamentoFallback,
  DEFAULT_BOAS_VINDAS_TRATAMENTO_BODY,
  ensureCanalChatOkConfirmation,
  formatArtigoMedicoBoasVindas,
  formatContatoMedicoBoasVindas,
  formatCrmBoasVindas,
  formatMedicoBoasVindas,
  formatSaudacaoBoasVindas,
  prepareBoasVindasTratamentoTemplate,
} from '@/lib/whatsapp/boasVindasTratamentoMessage';
import { primeiroNomePaciente } from '@/lib/aplicacao/buildAplicacaoWhatsAppMessage';
import { renderCanalChatTemplate } from '@/services/canalChatTemplateResolveService';
import {
  isMedicoEventAutomationEnabled,
  resolveMedicoAutomationTemplate,
} from '@/services/medicoAutomationTemplateResolveService';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import { sendPatientAutomationWhatsapp } from '@/services/whatsappPatientSendRouter';
import { persistCanalChatInboundKeys } from '@/services/canalChatInboundKeys';
import { tryResolvePhoneFromPacienteDoc } from '@/lib/whatsapp/resolveInternationalPhone';
import { tryResolveSolicitacaoPhone } from '@/lib/whatsapp/resolveIndicacaoSolicitacaoPhone';

const SOLICITACOES_COLLECTION = 'solicitacoes_medico';
const PACIENTES_COLLECTION = 'pacientes_completos';
const MEDICOS_COLLECTION = 'medicos';

export type SendBoasVindasTratamentoResult =
  | { status: 'sent'; phone: string; message: string }
  | { status: 'already_sent' }
  | { status: 'skipped'; reason: string };

function extrairTelefonePacienteDoc(data: Record<string, unknown>): string | null {
  return tryResolvePhoneFromPacienteDoc(data);
}

function extrairNomePaciente(data: Record<string, unknown>): string {
  const dadosIdentificacao = data.dadosIdentificacao as Record<string, unknown> | undefined;
  const nome =
    (typeof dadosIdentificacao?.nomeCompleto === 'string' && dadosIdentificacao.nomeCompleto.trim()) ||
    (typeof data.nome === 'string' && data.nome.trim()) ||
    '';
  return nome;
}

function crmFromMedicoDoc(data: Record<string, unknown>): { numero: string; uf: string } {
  const crm = data.crm as Record<string, unknown> | undefined;
  const numero =
    (typeof crm?.numero === 'string' && crm.numero.trim()) ||
    (typeof data.crmNumero === 'string' && data.crmNumero.trim()) ||
    '';
  const uf =
    (typeof crm?.estado === 'string' && crm.estado.trim()) ||
    (typeof data.crmEstado === 'string' && data.crmEstado.trim()) ||
    '';
  return { numero, uf };
}

function extrairSexoPaciente(data: Record<string, unknown>): string | null {
  const dadosIdentificacao = data.dadosIdentificacao as Record<string, unknown> | undefined;
  const candidatos = [
    dadosIdentificacao?.sexoBiologico,
    dadosIdentificacao?.sexo,
    dadosIdentificacao?.genero,
    data.sexoBiologico,
    data.sexo,
    data.genero,
  ];
  for (const raw of candidatos) {
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
  }
  return null;
}

async function resolvePacientePhone(
  pacienteId: string | undefined,
  sol: Record<string, unknown>,
): Promise<{ phone: string | null; pacienteNome: string; pacienteSexo: string | null }> {
  let pacienteNome = '';
  let pacienteSexo: string | null = null;
  if (pacienteId?.trim()) {
    const snap = await getFirestoreAdmin().collection(PACIENTES_COLLECTION).doc(pacienteId.trim()).get();
    if (snap.exists) {
      const data = snap.data() as Record<string, unknown>;
      pacienteNome = extrairNomePaciente(data);
      pacienteSexo = extrairSexoPaciente(data);
      const phone = extrairTelefonePacienteDoc(data);
      if (phone) return { phone, pacienteNome, pacienteSexo };
    }
  }
  const fromSolicitacao = tryResolveSolicitacaoPhone(sol);
  if (fromSolicitacao) {
    return { phone: fromSolicitacao, pacienteNome, pacienteSexo };
  }
  return { phone: null, pacienteNome, pacienteSexo };
}

async function resolveMedicoPerfil(medicoId: string): Promise<{
  nome: string;
  genero: string | null;
  crmNumero: string;
  crmUf: string;
}> {
  const snap = await getFirestoreAdmin().collection(MEDICOS_COLLECTION).doc(medicoId).get();
  if (!snap.exists) {
    return { nome: '', genero: null, crmNumero: '', crmUf: '' };
  }
  const data = snap.data() as Record<string, unknown>;
  const nome = typeof data.nome === 'string' ? data.nome.trim() : '';
  const genero = typeof data.genero === 'string' ? data.genero : null;
  const crm = crmFromMedicoDoc(data);
  return { nome, genero, crmNumero: crm.numero, crmUf: crm.uf };
}

async function markSolicitacaoWhatsapp(
  solicitacaoId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await getFirestoreAdmin()
    .collection(SOLICITACOES_COLLECTION)
    .doc(solicitacaoId)
    .set(
      {
        ...payload,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

/**
 * Envia boas-vindas ao tratamento pelo Canal Chat quando o médico aceita a solicitação.
 * Não lança em falhas de envio — o aceite do vínculo não deve ser bloqueado.
 */
export async function sendBoasVindasTratamentoWhatsapp(params: {
  solicitacaoId: string;
  medicoId: string;
}): Promise<SendBoasVindasTratamentoResult> {
  const solicitacaoId = params.solicitacaoId?.trim();
  const medicoId = params.medicoId?.trim();
  if (!solicitacaoId) return { status: 'skipped', reason: 'solicitacaoId é obrigatório.' };
  if (!medicoId) return { status: 'skipped', reason: 'medicoId é obrigatório.' };

  const solRef = getFirestoreAdmin().collection(SOLICITACOES_COLLECTION).doc(solicitacaoId);
  const solSnap = await solRef.get();
  if (!solSnap.exists) return { status: 'skipped', reason: 'Solicitação não encontrada.' };

  const sol = solSnap.data() as Record<string, unknown>;
  if (String(sol.medicoId || '') !== medicoId) {
    return { status: 'skipped', reason: 'Solicitação não pertence a este médico.' };
  }
  const status = String(sol.status || '');
  if (status === 'rejeitada' || status === 'desistiu') {
    return { status: 'skipped', reason: 'Solicitação não está ativa.' };
  }
  if (sol.whatsappBoasVindasStatus === 'sent') {
    return { status: 'already_sent' };
  }

  const allowed = await isMedicoEventAutomationEnabled({
    medicoId,
    automationId: BOAS_VINDAS_PACIENTE_AUTOMATION_ID,
  });
  if (!allowed) {
    return { status: 'skipped', reason: 'Automação de boas-vindas desativada pelo médico.' };
  }

  const pacienteId = typeof sol.pacienteId === 'string' ? sol.pacienteId : undefined;
  const fallbackNome = typeof sol.pacienteNome === 'string' ? sol.pacienteNome : '';

  const [{ phone, pacienteNome, pacienteSexo }, medico, canalChat] = await Promise.all([
    resolvePacientePhone(pacienteId, sol),
    resolveMedicoPerfil(medicoId),
    getWhatsappConnectionByDoctor(CANAL_CHAT_OWNER_ID),
  ]);

  const nomeCompleto = pacienteNome || fallbackNome || 'Paciente';
  if (!phone) {
    await markSolicitacaoWhatsapp(solicitacaoId, {
      whatsappBoasVindasStatus: 'skipped',
      whatsappBoasVindasErro: 'Paciente sem telefone válido no cadastro.',
      whatsappBoasVindasTentadoEm: Timestamp.now(),
    });
    return { status: 'skipped', reason: 'Paciente sem telefone válido no cadastro.' };
  }

  const sessionId = canalChat?.sessionId?.trim() || CANAL_CHAT_SESSION_ID;
  if (!canalChat || canalChat.status !== 'connected' || !sessionId) {
    await markSolicitacaoWhatsapp(solicitacaoId, {
      whatsappBoasVindasStatus: 'skipped',
      whatsappBoasVindasErro: 'Canal Chat desconectado.',
      whatsappBoasVindasTentadoEm: Timestamp.now(),
    });
    return { status: 'skipped', reason: 'Canal Chat desconectado.' };
  }

  const medicoNome = formatMedicoBoasVindas(medico.nome, medico.genero);
  const crm = formatCrmBoasVindas(medico.crmNumero, medico.crmUf);
  const primeiroNome = primeiroNomePaciente(nomeCompleto);
  const saudacao = formatSaudacaoBoasVindas(pacienteSexo);
  const artigo = formatArtigoMedicoBoasVindas(medico.genero);
  const contatoMedico = formatContatoMedicoBoasVindas(medico.genero);
  const templateVars = {
    nome: primeiroNome,
    saudacao,
    artigo,
    medico: medicoNome,
    crm,
    contato_medico: contatoMedico,
  };

  let message = buildBoasVindasTratamentoFallback({
    pacienteNome: nomeCompleto,
    pacienteSexo,
    medicoNome: medico.nome,
    medicoGenero: medico.genero,
    crmNumero: medico.crmNumero,
    crmUf: medico.crmUf,
  });

  try {
    const ctx = await getWhatsappMedicoContext(medicoId).catch(() => null);
    const resolved = await resolveMedicoAutomationTemplate({
      automationId: BOAS_VINDAS_PACIENTE_AUTOMATION_ID,
      medicoId,
      organizationId: ctx?.organizationId,
    });
    if (resolved?.body?.trim()) {
      const body = prepareBoasVindasTratamentoTemplate(resolved.body, crm);
      message = renderCanalChatTemplate(body, templateVars);
    } else {
      const body = prepareBoasVindasTratamentoTemplate(DEFAULT_BOAS_VINDAS_TRATAMENTO_BODY, crm);
      message = renderCanalChatTemplate(body, templateVars);
    }
  } catch (error) {
    console.warn(
      '[boas-vindas-tratamento] falha ao resolver template, usando fallback:',
      error instanceof Error ? error.message : error,
    );
  }

  message = ensureCanalChatOkConfirmation(message);

  try {
    const sent = await sendPatientAutomationWhatsapp({
      ownerId: CANAL_CHAT_OWNER_ID,
      ownerSessionId: sessionId,
      ownerConnectedPhone: canalChat.phone ?? undefined,
      phone,
      message,
    });

    try {
      await registrarWhatsappMessageLog({
        medicoId,
        type: 'boas_vindas_tratamento',
        status: 'sent',
        phone,
        message,
        pacienteId,
        pacienteNome: nomeCompleto,
      });
    } catch (logError) {
      console.warn('[boas-vindas-tratamento] log failed:', logError);
    }

    await markSolicitacaoWhatsapp(solicitacaoId, {
      whatsappBoasVindasStatus: 'sent',
      whatsappBoasVindasErro: FieldValue.delete(),
      whatsappBoasVindasEnviadoEm: Timestamp.now(),
    });

    if (pacienteId) {
      await persistCanalChatInboundKeys(pacienteId, { phone, chatId: sent.chatId }).catch((error) => {
        console.warn('[boas-vindas-tratamento] canalChatPhoneKey:', error);
      });
    }

    return { status: 'sent', phone, message };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erro ao enviar WhatsApp de boas-vindas.';

    try {
      await registrarWhatsappMessageLog({
        medicoId,
        type: 'boas_vindas_tratamento',
        status: 'failed',
        phone,
        message,
        pacienteId,
        pacienteNome: nomeCompleto,
        errorMessage,
      });
    } catch (logError) {
      console.warn('[boas-vindas-tratamento] log failed:', logError);
    }

    await markSolicitacaoWhatsapp(solicitacaoId, {
      whatsappBoasVindasStatus: 'failed',
      whatsappBoasVindasErro: errorMessage,
      whatsappBoasVindasTentadoEm: Timestamp.now(),
    }).catch(() => undefined);

    console.error('[boas-vindas-tratamento] envio falhou', { solicitacaoId, error: errorMessage });
    return { status: 'skipped', reason: errorMessage };
  }
}
