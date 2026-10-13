import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { buildExamesLaboratoriaisPacienteNotifyTexto } from '@/lib/metaadmin/examesLaboratoriaisPacienteNotify';
import { METODO_PACIENTE_META_EXAMES_URL } from '@/lib/tenant/metodoPublicOrigin';
import {
  formatArtigoMedicoBoasVindas,
  formatMedicoBoasVindas,
} from '@/lib/whatsapp/boasVindasTratamentoMessage';
import {
  CANAL_CHAT_OWNER_ID,
  CANAL_CHAT_SESSION_ID,
} from '@/lib/whatsapp/canalChatOwner';
import { persistCanalChatInboundKeys } from '@/services/canalChatInboundKeys';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import { tryResolvePhoneFromPacienteDoc } from '@/lib/whatsapp/resolveInternationalPhone';
import { sendPatientAutomationWhatsapp } from '@/services/whatsappPatientSendRouter';

export type NotifyPacienteExamesLaboratoriaisResult =
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

async function resolveMedicoNome(medicoId: string): Promise<string> {
  const snap = await getFirestoreAdmin().collection('medicos').doc(medicoId).get();
  if (!snap.exists) return formatMedicoBoasVindas('seu médico');
  const data = snap.data() as Record<string, unknown>;
  const nome =
    (typeof data.nome === 'string' && data.nome.trim()) ||
    (typeof data.nomeCompleto === 'string' && data.nomeCompleto.trim()) ||
    '';
  if (!nome || /^seu médico$/i.test(nome)) return 'Seu médico';
  const genero = typeof data.genero === 'string' ? data.genero : null;
  const titulo = formatMedicoBoasVindas(nome, genero);
  const artigo = formatArtigoMedicoBoasVindas(genero);
  const artigoCap = artigo === 'a' ? 'A' : 'O';
  return `${artigoCap} ${titulo}`;
}

/**
 * Canal Chat → paciente: o médico inseriu exames laboratoriais no sistema.
 * Não lança em falhas de envio — o salvamento do exame não deve ser bloqueado.
 */
export async function notifyPacienteExamesLaboratoriais(params: {
  medicoId: string;
  pacienteId: string;
}): Promise<NotifyPacienteExamesLaboratoriaisResult> {
  const medicoId = params.medicoId.trim();
  const pacienteId = params.pacienteId.trim();
  if (!medicoId || !pacienteId) {
    return { status: 'skipped', reason: 'Médico ou paciente inválido.' };
  }

  const [{ phone, pacienteNome }, medicoNome, canalChat] = await Promise.all([
    resolvePacientePhone(pacienteId),
    resolveMedicoNome(medicoId),
    getWhatsappConnectionByDoctor(CANAL_CHAT_OWNER_ID),
  ]);

  if (!phone) {
    return { status: 'skipped', reason: 'Paciente sem telefone válido no cadastro.' };
  }

  const sessionId = canalChat?.sessionId?.trim() || CANAL_CHAT_SESSION_ID;
  if (!canalChat || canalChat.status !== 'connected' || !sessionId) {
    return { status: 'skipped', reason: 'Canal Chat desconectado.' };
  }

  const message = buildExamesLaboratoriaisPacienteNotifyTexto({
    pacienteNome,
    medicoNome,
    examesUrl: METODO_PACIENTE_META_EXAMES_URL,
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
      medicoId,
      type: 'exames_laboratoriais',
      status: 'sent',
      phone,
      message,
      pacienteId,
      pacienteNome,
    }).catch(() => undefined);

    await persistCanalChatInboundKeys(pacienteId, { phone, chatId: sent.chatId }).catch((error) => {
      console.warn('[exames-laboratoriais-notify] canalChatPhoneKey:', error);
    });

    return { status: 'sent', phone, via: 'canal_chat' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar WhatsApp.';
    await registrarWhatsappMessageLog({
      medicoId,
      type: 'exames_laboratoriais',
      status: 'failed',
      phone,
      message,
      pacienteId,
      pacienteNome,
      errorMessage,
    }).catch(() => undefined);
    console.error('[exames-laboratoriais-notify] falha Canal Chat:', errorMessage);
    return { status: 'skipped', reason: errorMessage };
  }
}
