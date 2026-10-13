import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { COL_NUTRICIONISTAS } from '@/features/metaNutri/metaNutri.constants';
import { nutritionistHasActivePatientLink } from '@/lib/nutri/ensureNutriCheckInPublicLink';
import { buildCardapioPacienteNotifyTexto } from '@/lib/nutri/cardapio/cardapioPacienteNotify';
import { METODO_PACIENTE_META_NUTRI_CARDAPIO_URL } from '@/lib/tenant/metodoPublicOrigin';
import {
  CANAL_CHAT_OWNER_ID,
  CANAL_CHAT_SESSION_ID,
} from '@/lib/whatsapp/canalChatOwner';
import { persistCanalChatInboundKeys } from '@/services/canalChatInboundKeys';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import { tryResolvePhoneFromPacienteDoc } from '@/lib/whatsapp/resolveInternationalPhone';
import { sendPatientAutomationWhatsapp } from '@/services/whatsappPatientSendRouter';

export type NotifyPacienteCardapioResult =
  | { status: 'sent'; phone: string; via: 'canal_chat' }
  | { status: 'skipped'; reason: string };

function nomePacienteFromDoc(data: Record<string, unknown>): string {
  const ident = data.dadosIdentificacao as Record<string, unknown> | undefined;
  return (
    (typeof ident?.nomeCompleto === 'string' && ident.nomeCompleto.trim()) ||
    (typeof data.nome === 'string' && data.nome.trim()) ||
    'Paciente'
  );
}

async function resolvePacientePhone(pacienteId: string): Promise<{
  phone: string | null;
  pacienteNome: string;
}> {
  const snap = await getFirestoreAdmin().collection('pacientes_completos').doc(pacienteId).get();
  if (!snap.exists) return { phone: null, pacienteNome: 'Paciente' };
  const data = snap.data() as Record<string, unknown>;
  const pacienteNome = nomePacienteFromDoc(data);
  return { phone: tryResolvePhoneFromPacienteDoc(data), pacienteNome };
}

async function resolveNutriNome(nutricionistaId: string): Promise<string> {
  const snap = await getFirestoreAdmin().collection(COL_NUTRICIONISTAS).doc(nutricionistaId).get();
  const data = (snap.exists ? snap.data() : {}) as Record<string, unknown>;
  const nome = (typeof data.nome === 'string' && data.nome.trim()) || 'Nutricionista';
  const genero = data.genero === 'M' || data.genero === 'F' ? data.genero : undefined;
  const artigo = genero === 'M' ? 'O nutricionista' : 'A nutricionista';
  return `${artigo} ${nome}`;
}

/**
 * Canal Chat → paciente: a nutricionista atualizou o cardápio.
 * Não lança em falhas de envio — o salvamento do cardápio não deve ser bloqueado.
 */
export async function notifyPacienteCardapioEditado(params: {
  nutricionistaId: string;
  pacienteId: string;
}): Promise<NotifyPacienteCardapioResult> {
  const nutriId = params.nutricionistaId.trim();
  const pacienteId = params.pacienteId.trim();
  if (!nutriId || !pacienteId) {
    return { status: 'skipped', reason: 'Nutricionista ou paciente inválido.' };
  }

  const db = getFirestoreAdmin();
  const linked = await nutritionistHasActivePatientLink(db, nutriId, pacienteId);
  if (!linked) {
    return { status: 'skipped', reason: 'Paciente não está vinculado a esta nutricionista.' };
  }

  const [{ phone, pacienteNome }, nutriNome, canalChat] = await Promise.all([
    resolvePacientePhone(pacienteId),
    resolveNutriNome(nutriId),
    getWhatsappConnectionByDoctor(CANAL_CHAT_OWNER_ID),
  ]);

  if (!phone) {
    return { status: 'skipped', reason: 'Paciente sem telefone válido no cadastro.' };
  }

  const sessionId = canalChat?.sessionId?.trim() || CANAL_CHAT_SESSION_ID;
  if (!canalChat || canalChat.status !== 'connected' || !sessionId) {
    return { status: 'skipped', reason: 'Canal Chat desconectado.' };
  }

  const message = buildCardapioPacienteNotifyTexto({
    pacienteNome,
    nutriNome,
    cardapioUrl: METODO_PACIENTE_META_NUTRI_CARDAPIO_URL,
  });

  try {
    const sent = await sendPatientAutomationWhatsapp({
      ownerId: CANAL_CHAT_OWNER_ID,
      ownerSessionId: sessionId,
      ownerConnectedPhone: canalChat.phone ?? undefined,
      phone,
      message,
    });

    await registrarWhatsappMessageLog({
      medicoId: nutriId,
      type: 'cardapio_nutri',
      status: 'sent',
      phone,
      message,
      pacienteId,
      pacienteNome,
    }).catch(() => undefined);

    await persistCanalChatInboundKeys(pacienteId, { phone, chatId: sent.chatId }).catch((error) => {
      console.warn('[cardapio-notify] canalChatPhoneKey:', error);
    });

    return { status: 'sent', phone, via: 'canal_chat' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar WhatsApp.';
    await registrarWhatsappMessageLog({
      medicoId: nutriId,
      type: 'cardapio_nutri',
      status: 'failed',
      phone,
      message,
      pacienteId,
      pacienteNome,
      errorMessage,
    }).catch(() => undefined);
    console.error('[cardapio-notify] falha Canal Chat:', errorMessage);
    return { status: 'skipped', reason: errorMessage };
  }
}
