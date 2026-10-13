import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { withWhatsappProviderAuth } from '@/lib/server/whatsappSessionAuth.server';
import { getWhatsappMedicoContext } from '@/lib/server/whatsappMedicoContext.server';
import {
  CANAL_CHAT_OWNER_ID,
  CANAL_CHAT_SESSION_ID,
} from '@/lib/whatsapp/canalChatOwner';
import { COBRANCA_AVULSA_AUTOMATION_ID } from '@/lib/whatsapp/canalChatTemplates';
import {
  renderCanalChatTemplate,
  resolveCanalChatAutomationTemplate,
} from '@/services/canalChatTemplateResolveService';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import {
  registrarFinanceiroCobrancaEnvio,
  type FinanceiroCobrancaEnvio,
} from '@/services/financeiroCobrancaEnvioService';
import { resolveMedicoTituloByDoctorId, resolveMedicoChavePixByDoctorId } from '@/lib/whatsapp/formatMedicoTitulo';
import { appendCobrancaPixInstrucao } from '@/lib/metaadmin/cobrancaPixMessage';
import { parsePendingCanalChatPaymentCharge } from '@/lib/whatsapp/canalChatPendingAction';
import { tryResolvePhoneFromPacienteDoc } from '@/lib/whatsapp/resolveInternationalPhone';
import {
  sendTestMessage,
  WhatsappProviderError,
} from '@/services/whatsappProviderClient';
import { flagWhatsappSessionBrokenFromSendFailure } from '@/services/whatsappDisconnectNotifyService';
import { isWhatsappSessionHealthFailure } from '@/lib/whatsapp/whatsappSessionHealth';

function extrairTelefonePacienteDoc(data: Record<string, unknown>): string | null {
  return tryResolvePhoneFromPacienteDoc(data);
}

function extrairNomePaciente(data: Record<string, unknown>): string {
  const dadosIdentificacao = data.dadosIdentificacao as Record<string, unknown> | undefined;
  const nome =
    (typeof dadosIdentificacao?.nomeCompleto === 'string' && dadosIdentificacao.nomeCompleto.trim()) ||
    (typeof data.nome === 'string' && data.nome.trim()) ||
    '';
  return nome || 'paciente';
}

function formatMoneyBr(valor: number): string {
  return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || 'olá';
}

function fallbackCobrancaAvulsaMessage(params: {
  pacienteNome: string;
  valorAberto?: number;
  medicoTitulo: string;
}): string {
  const linhas = [
    `Olá, ${firstName(params.pacienteNome)}!`,
    '',
    'Passando para lembrar do seu pagamento em aberto conosco.',
  ];
  if (typeof params.valorAberto === 'number' && Number.isFinite(params.valorAberto) && params.valorAberto > 0) {
    linhas.push(`Valor em aberto: ${formatMoneyBr(params.valorAberto)}.`);
  }
  linhas.push('', `Para consultar seu relatório, contate o seu médico, ${params.medicoTitulo}.`);
  return linhas.join('\n');
}

export type SendFinanceiroCobrancaInput = {
  medicoId: string;
  pacienteId: string;
  valorAberto?: number;
};

export type FinanceiroCobrancaPrepared = {
  pacienteId: string;
  medicoId: string;
  pacienteNome: string;
  phone: string;
  message: string;
  valorAberto?: number;
  valorLabel: string;
  organizationId?: string;
  sessionId: string;
  connectedPhone?: string | null;
  canalChatVerified: boolean;
  pendingPaymentCharge: boolean;
};

export type SendFinanceiroCobrancaResult = {
  phone: string;
  message: string;
  envio: FinanceiroCobrancaEnvio;
};

export type PreviewFinanceiroCobrancaResult = {
  phone: string;
  pacienteNome: string;
  message: string;
  valorAberto?: number;
  valorLabel: string;
  canalChatConnected: boolean;
  canalChatVerified: boolean;
  pendingPaymentCharge: boolean;
};

/**
 * Monta telefone, valor e texto da cobrança (sem enviar). Sem link de relatório.
 */
export async function prepareFinanceiroCobrancaWhatsapp(
  input: SendFinanceiroCobrancaInput,
  options?: { requireCanalChatConnected?: boolean },
): Promise<FinanceiroCobrancaPrepared> {
  const pacienteId = input.pacienteId?.trim();
  const medicoId = input.medicoId?.trim();
  if (!pacienteId) throw new Error('pacienteId é obrigatório.');
  if (!medicoId) throw new Error('medicoId é obrigatório.');

  const requireConnected = options?.requireCanalChatConnected !== false;
  const canalChat = await getWhatsappConnectionByDoctor(CANAL_CHAT_OWNER_ID);
  const canalConnected = Boolean(canalChat && canalChat.status === 'connected');
  if (requireConnected && !canalConnected) {
    throw new WhatsappProviderError(
      'Canal Chat desconectado. Conecte o WhatsApp do sistema em Automações → Canal Chat.',
      'SESSION_NOT_READY',
    );
  }

  const sessionId = canalChat?.sessionId?.trim() || CANAL_CHAT_SESSION_ID;

  const pacSnap = await getFirestoreAdmin().collection('pacientes_completos').doc(pacienteId).get();
  if (!pacSnap.exists) {
    throw new Error('Paciente não encontrado.');
  }

  const pacData = pacSnap.data() as Record<string, unknown>;
  const phone = extrairTelefonePacienteDoc(pacData);
  if (!phone) {
    throw new WhatsappProviderError(
      'Paciente sem telefone válido no cadastro.',
      'INVALID_PHONE',
    );
  }

  const pacienteNome = extrairNomePaciente(pacData);
  const medicoTitulo = await resolveMedicoTituloByDoctorId(medicoId);
  const chavePix = await resolveMedicoChavePixByDoctorId(medicoId);

  const ctx = await getWhatsappMedicoContext(medicoId).catch(() => null);
  const resolved = await resolveCanalChatAutomationTemplate({
    automationId: COBRANCA_AVULSA_AUTOMATION_ID,
    organizationId: ctx?.organizationId,
  });

  const valorLabel =
    typeof input.valorAberto === 'number' && Number.isFinite(input.valorAberto) && input.valorAberto > 0
      ? formatMoneyBr(input.valorAberto)
      : '';

  const message = appendCobrancaPixInstrucao(
    resolved
      ? renderCanalChatTemplate(resolved.body, {
          nome: firstName(pacienteNome),
          valor: valorLabel || 'em aberto',
          medico: medicoTitulo,
        })
      : fallbackCobrancaAvulsaMessage({
          pacienteNome,
          valorAberto: input.valorAberto,
          medicoTitulo,
        }),
    chavePix,
  );

  return {
    pacienteId,
    medicoId,
    pacienteNome,
    phone,
    message,
    valorAberto: input.valorAberto,
    valorLabel: valorLabel || 'em aberto',
    organizationId: ctx?.organizationId || undefined,
    sessionId,
    connectedPhone: canalChat?.phone ?? null,
    canalChatVerified: pacData.canalChatVerified === true,
    pendingPaymentCharge: Boolean(parsePendingCanalChatPaymentCharge(pacData.pendingCanalChatAction)),
  };
}

/** Preview da cobrança (texto real do Canal Chat) sem enviar. */
export async function previewFinanceiroCobrancaWhatsapp(
  input: SendFinanceiroCobrancaInput,
): Promise<PreviewFinanceiroCobrancaResult> {
  const canalChat = await getWhatsappConnectionByDoctor(CANAL_CHAT_OWNER_ID);
  const prepared = await prepareFinanceiroCobrancaWhatsapp(input, {
    requireCanalChatConnected: false,
  });
  return {
    phone: prepared.phone,
    pacienteNome: prepared.pacienteNome,
    message: prepared.message,
    valorAberto: prepared.valorAberto,
    valorLabel: prepared.valorLabel,
    canalChatConnected: Boolean(canalChat && canalChat.status === 'connected'),
    canalChatVerified: prepared.canalChatVerified,
    pendingPaymentCharge: prepared.pendingPaymentCharge,
  };
}

/**
 * Envia cobrança avulsa ao paciente via Canal Chat (template cobranca_avulsa_whatsapp).
 */
export async function sendFinanceiroCobrancaWhatsapp(
  input: SendFinanceiroCobrancaInput,
): Promise<SendFinanceiroCobrancaResult> {
  const prepared = await prepareFinanceiroCobrancaWhatsapp(input, {
    requireCanalChatConnected: true,
  });
  const {
    pacienteId,
    medicoId,
    pacienteNome,
    phone,
    message,
    sessionId,
    connectedPhone,
    organizationId,
  } = prepared;

  try {
    await withWhatsappProviderAuth(CANAL_CHAT_OWNER_ID, sessionId, (token) =>
      sendTestMessage(sessionId, token, phone, message, {
        connectedPhone: connectedPhone ?? undefined,
        phoneIsResolved: true,
      }),
    );

    try {
      await registrarWhatsappMessageLog({
        medicoId,
        type: 'financeiro_cobranca',
        status: 'sent',
        phone,
        message,
        pacienteId,
        pacienteNome,
      });
    } catch (logError) {
      console.warn('[financeiro-cobranca] log failed:', logError);
    }

    const envio = await registrarFinanceiroCobrancaEnvio({
      medicoId,
      pacienteId,
      pacienteNome,
      phone,
      valorAberto: input.valorAberto,
      organizationId,
      tipo: 'avulsa',
      status: 'sent',
    });

    return { phone, message, envio };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erro ao enviar cobrança WhatsApp.';

    try {
      await registrarWhatsappMessageLog({
        medicoId,
        type: 'financeiro_cobranca',
        status: 'failed',
        phone,
        message,
        pacienteId,
        pacienteNome,
        errorMessage,
      });
    } catch (logError) {
      console.warn('[financeiro-cobranca] log failed:', logError);
    }

    try {
      await registrarFinanceiroCobrancaEnvio({
        medicoId,
        pacienteId,
        pacienteNome,
        phone,
        valorAberto: input.valorAberto,
        organizationId,
        tipo: 'avulsa',
        status: 'failed',
        errorMessage,
      });
    } catch (envioError) {
      console.warn('[financeiro-cobranca] envio record failed:', envioError);
    }

    if (isWhatsappSessionHealthFailure(error)) {
      try {
        await flagWhatsappSessionBrokenFromSendFailure({
          doctorId: CANAL_CHAT_OWNER_ID,
          sessionId,
          errorMessage,
          errorCode: error instanceof WhatsappProviderError ? error.code : undefined,
        });
      } catch (notifyError) {
        console.warn('[financeiro-cobranca] flag session broken:', notifyError);
      }
    }

    throw error instanceof WhatsappProviderError
      ? error
      : new WhatsappProviderError(errorMessage, 'SEND_FAILED');
  }
}
