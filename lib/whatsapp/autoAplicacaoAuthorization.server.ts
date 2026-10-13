import { getAutomationDoctorSetting } from '@/services/automationDoctorSettingsService';
import { listSettingsByOrganizationId } from '@/services/automationOrganizationSettingsService';
import {
  getWhatsappConnectionByDoctor,
  updateWhatsappAutoAplicacaoSettings,
} from '@/services/whatsappConnectionService';
import type { WhatsappConnection } from '@/types/whatsappConnection';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

export const APLICACAO_DIA_WHATSAPP_AUTOMATION_ID = 'aplicacao_dia_whatsapp';

async function isAutomationReleasedByOrganization(
  organizationId: string,
  automationId: string,
): Promise<boolean> {
  const orgId = organizationId?.trim();
  if (!orgId) return false;

  const settings = await listSettingsByOrganizationId(orgId);
  return settings.some((item) => item.automationId === automationId && item.enabled);
}

/**
 * Médico autorizado a envio automático de aplicação no dia quando:
 * - organização liberou a automação E médico ativou no flap, ou
 * - flag legado autoAplicacaoEnabled na conexão (retrocompat).
 */
export async function isDoctorAutoAplicacaoDiaAuthorized(
  doctorId: string,
  organizationId?: string,
): Promise<boolean> {
  const id = doctorId?.trim();
  if (!id) return false;

  const setting = await getAutomationDoctorSetting(id, APLICACAO_DIA_WHATSAPP_AUTOMATION_ID);
  if (setting?.enabled === true) {
    const orgId = setting.organizationId?.trim() || organizationId?.trim();
    if (orgId && (await isAutomationReleasedByOrganization(orgId, APLICACAO_DIA_WHATSAPP_AUTOMATION_ID))) {
      return true;
    }
  }

  const connection = await getWhatsappConnectionByDoctor(id);
  return connection?.autoAplicacaoEnabled === true;
}

/** Espelha o flap da automação no flag legado usado pelo cron e pelo painel de logs. */
export async function syncLegacyAutoAplicacaoFromDoctorSettings(doctorId: string): Promise<void> {
  const id = doctorId?.trim();
  if (!id) return;

  const setting = await getAutomationDoctorSetting(id, APLICACAO_DIA_WHATSAPP_AUTOMATION_ID);
  const authorized = await isDoctorAutoAplicacaoDiaAuthorized(id, setting?.organizationId);

  await updateWhatsappAutoAplicacaoSettings(id, {
    autoAplicacaoEnabled: authorized,
    ...(setting?.horario ? { autoAplicacaoHorario: setting.horario } : {}),
  });
}

function docToConnection(docId: string, data: Record<string, unknown>): WhatsappConnection {
  const toDate = (value: unknown): Date | undefined => {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    if (typeof value === 'object' && value !== null && 'toDate' in value) {
      const maybe = value as { toDate?: () => Date };
      if (typeof maybe.toDate === 'function') return maybe.toDate();
    }
    return undefined;
  };

  return {
    doctorId: docId,
    organizationId: typeof data.organizationId === 'string' ? data.organizationId : undefined,
    status: (data.status as WhatsappConnection['status']) ?? 'disconnected',
    provider: 'wppconnect',
    sessionId: String(data.sessionId ?? ''),
    phone: typeof data.phone === 'string' ? data.phone : undefined,
    profileName: typeof data.profileName === 'string' ? data.profileName : undefined,
    qrCode: typeof data.qrCode === 'string' ? data.qrCode : undefined,
    connectedAt: toDate(data.connectedAt),
    lastCheckAt: toDate(data.lastCheckAt),
    errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : undefined,
    autoAplicacaoEnabled: data.autoAplicacaoEnabled === true,
    autoAplicacaoHorario: typeof data.autoAplicacaoHorario === 'string' ? data.autoAplicacaoHorario : undefined,
    autoAplicacaoUltimoEnvioEm: toDate(data.autoAplicacaoUltimoEnvioEm),
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
  };
}

/** Médicos com WhatsApp conectado e autorização efetiva para o cron de aplicação do dia. */
export async function listDoctorsEligibleForAutoAplicacaoCron(): Promise<WhatsappConnection[]> {
  const snap = await getFirestoreAdmin()
    .collection('whatsapp_connections')
    .where('status', '==', 'connected')
    .get();

  const eligible: WhatsappConnection[] = [];

  for (const doc of snap.docs) {
    const connection = docToConnection(doc.id, doc.data() as Record<string, unknown>);
    const authorized = await isDoctorAutoAplicacaoDiaAuthorized(
      connection.doctorId,
      connection.organizationId,
    );
    if (!authorized) continue;

    if (!connection.autoAplicacaoEnabled) {
      await syncLegacyAutoAplicacaoFromDoctorSettings(connection.doctorId);
      connection.autoAplicacaoEnabled = true;
    }

    eligible.push(connection);
  }

  return eligible;
}
