import { notifyPacienteViaCanalChat, resolveMedicoNomeForCanalChat } from '@/lib/metaadmin/pacienteCanalChatNotifyCore';
import { COL_NUTRICIONISTAS } from '@/features/metaNutri/metaNutri.constants';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type { HydrationCheckInCreatedByType } from '@/lib/nutri/hidratacao/hydrationCheckInLink';
import { HYDRATION_CHECKIN_SYSTEM_ACTOR_ID } from '@/lib/nutri/hidratacao/hydrationCheckInAutomation';
import { buildHydrationCheckInWhatsAppMessage } from '@/lib/nutri/hidratacao/hydrationCheckInMessage';

async function resolveNutriNome(nutricionistaId: string): Promise<string> {
  const snap = await getFirestoreAdmin().collection(COL_NUTRICIONISTAS).doc(nutricionistaId).get();
  const nome = String(snap.data()?.nome || '').trim() || 'Nutricionista';
  return nome;
}

async function resolveSystemSenderNome(): Promise<string> {
  return 'Sua equipe';
}

/**
 * Canal Chat → paciente (manual ETAPA 03 ou automático ETAPA 04).
 */
export async function notifyPacienteHydrationCheckInLink(params: {
  patientId: string;
  url: string;
  createdByType: HydrationCheckInCreatedByType;
  createdByUserId: string;
  logOwnerId?: string;
  goalMl?: number | null;
  pendingCount?: number;
  patientName?: string;
}) {
  const logOwnerId =
    (params.logOwnerId || params.createdByUserId || HYDRATION_CHECKIN_SYSTEM_ACTOR_ID).trim();

  return notifyPacienteViaCanalChat({
    logOwnerId,
    pacienteId: params.patientId,
    logType: 'hidratacao_checkin',
    logTag: 'hidratacao-checkin-link',
    resolveSenderNome:
      params.createdByType === 'system'
        ? resolveSystemSenderNome
        : params.createdByType === 'nutritionist'
          ? resolveNutriNome
          : resolveMedicoNomeForCanalChat,
    buildMessage: ({ pacienteNome }) =>
      buildHydrationCheckInWhatsAppMessage({
        patientName: params.patientName || pacienteNome,
        url: params.url,
        goalMl: params.goalMl,
        pendingCount: params.pendingCount ?? 2,
      }),
  });
}
