import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getWhatsappMedicoContext } from '@/lib/server/whatsappMedicoContext.server';
import { isValidFirebaseAuthUid } from '@/lib/firebase/isValidAuthUid';
import { buildPacienteCadastroLinkMessage } from '@/lib/metaadmin/buildPacienteCadastroLinkMessage';
import { METODO_PACIENTE_META_URL } from '@/lib/tenant/metodoPublicOrigin';
import { isWhatsappSessionHealthFailure } from '@/lib/whatsapp/whatsappSessionHealth';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { flagWhatsappSessionBrokenFromSendFailure } from '@/services/whatsappDisconnectNotifyService';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import { tryResolvePhoneFromPacienteDoc } from '@/lib/whatsapp/resolveInternationalPhone';
import {
  WhatsappProviderError,
} from '@/services/whatsappProviderClient';
import {
  sendPatientAutomationWhatsapp,
  WhatsappPatientSendError,
} from '@/services/whatsappPatientSendRouter';

export const WHATSAPP_MEDICO_NAO_CONECTADO_MSG =
  'O médico precisa conectar o WhatsApp em Meu Perfil para enviar o link ao paciente.';

export type SendPacienteCadastroLinkInput = {
  doctorId: string;
  pacienteId: string;
};

export type SendPacienteCadastroLinkResult = {
  phone: string;
  mock?: boolean;
  message: string;
};

function extrairTelefonePaciente(data: Record<string, unknown>): string | null {
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

export async function sendPacienteCadastroLinkWhatsapp(
  input: SendPacienteCadastroLinkInput,
): Promise<SendPacienteCadastroLinkResult> {
  const doctorId = input.doctorId?.trim();
  const pacienteId = input.pacienteId?.trim();
  if (!doctorId) throw new Error('doctorId é obrigatório.');
  if (!pacienteId) throw new Error('pacienteId é obrigatório.');

  const db = getFirestoreAdmin();
  const pacSnap = await db.collection('pacientes_completos').doc(pacienteId).get();
  if (!pacSnap.exists) {
    throw new Error('Paciente não encontrado.');
  }

  const pacData = pacSnap.data() as Record<string, unknown>;
  const userId = typeof pacData.userId === 'string' ? pacData.userId : '';
  if (isValidFirebaseAuthUid(userId)) {
    throw new WhatsappProviderError(
      'Este paciente já finalizou o cadastro com o Google.',
      'INVALID_MESSAGE',
    );
  }

  const phone = extrairTelefonePaciente(pacData);
  if (!phone) {
    throw new WhatsappProviderError(
      'Informe o telefone do paciente para enviar o link pelo WhatsApp.',
      'INVALID_PHONE',
    );
  }

  const connection = await getWhatsappConnectionByDoctor(doctorId);
  if (!connection || connection.status !== 'connected') {
    throw new WhatsappProviderError(WHATSAPP_MEDICO_NAO_CONECTADO_MSG, 'SESSION_NOT_READY');
  }

  const medicoSnap = await db.collection('medicos').doc(doctorId).get();
  const medicoData = (medicoSnap.data() || {}) as Record<string, unknown>;
  const pacienteNome = extrairNomePaciente(pacData);
  const dadosIdentificacao = pacData.dadosIdentificacao as Record<string, unknown> | undefined;
  const email =
    (typeof dadosIdentificacao?.email === 'string' && dadosIdentificacao.email.trim()) ||
    (typeof pacData.email === 'string' && pacData.email.trim()) ||
    '';

  const message = buildPacienteCadastroLinkMessage({
    pacienteNome,
    medicoNome: typeof medicoData.nome === 'string' ? medicoData.nome : undefined,
    medicoGenero: typeof medicoData.genero === 'string' ? medicoData.genero : null,
    email,
    loginUrl: METODO_PACIENTE_META_URL,
  });

  const sessionId =
    connection.sessionId?.trim() || (await getWhatsappMedicoContext(doctorId)).sessionId;

  try {
    const result = await sendPatientAutomationWhatsapp({
      ownerId: doctorId,
      ownerSessionId: sessionId,
      ownerConnectedPhone: connection.phone,
      phone,
      message,
    });

    await registrarWhatsappMessageLog({
      medicoId: doctorId,
      type: 'cadastro_link',
      status: 'sent',
      phone: result.phone ?? phone,
      message,
      pacienteId,
      pacienteNome,
    });

    return {
      phone: result.phone ?? phone,
      mock: result.mock,
      message: result.mock
        ? 'Mensagem simulada (modo mock).'
        : 'Link enviado por WhatsApp para o paciente.',
    };
  } catch (error) {
    const failMessage =
      error instanceof WhatsappProviderError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Erro ao enviar o link pelo WhatsApp.';

    try {
      await registrarWhatsappMessageLog({
        medicoId: doctorId,
        type: 'cadastro_link',
        status: 'failed',
        phone,
        message,
        pacienteId,
        pacienteNome,
        errorMessage: failMessage,
      });
    } catch (logError) {
      console.warn('[whatsappPacienteCadastroLink] log failed:', logError);
    }

    if (isWhatsappSessionHealthFailure(error)) {
      const senderOwnerId =
        error instanceof WhatsappPatientSendError ? error.senderOwnerId : doctorId;
      await flagWhatsappSessionBrokenFromSendFailure({
        doctorId: senderOwnerId,
        errorMessage: failMessage,
        errorCode: error instanceof WhatsappPatientSendError ? error.code : undefined,
      }).catch((notifyError) => {
        console.warn('[whatsappPacienteCadastroLink] flag session broken:', notifyError);
      });
    }

    throw error;
  }
}
