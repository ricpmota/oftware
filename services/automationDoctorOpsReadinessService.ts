import { Timestamp } from 'firebase-admin/firestore';
import {
  APLICACAO_DIA_WHATSAPP_AUTOMATION_ID,
  isDoctorAutoAplicacaoDiaAuthorized,
} from '@/lib/whatsapp/autoAplicacaoAuthorization.server';
import { isMedicoEventAutomationId } from '@/lib/whatsapp/canalChatTemplates';
import { getBrasilDateTimeParts, horarioConfiguradoJaPassou } from '@/lib/time/brasilTimezone';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { diagnosticarAutoAplicacaoMedico } from '@/services/whatsappAutoAplicacaoService';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import type {
  AutomationSendMotor,
  DoctorAutomationDetailRowDto,
  DoctorAutomationOpsChecklistDto,
  DoctorAutomationOpsReadiness,
} from '@/types/automationCenter';

const QUEUE_WHATSAPP_AUTOMATION_IDS = new Set([
  'aplicacao_dia_whatsapp',
  'aplicacao_d1_whatsapp',
  'aplicacao_atrasada_whatsapp',
  'injetavel_dia_whatsapp',
  'injetavel_d1_whatsapp',
  'aniversario_paciente_whatsapp',
  'conclusao_tratamento_whatsapp',
  'parcela_vencimento_whatsapp',
]);

function motorForAutomation(automationId: string, channel: string): AutomationSendMotor {
  if (
    automationId === 'cobranca_automatica_whatsapp' ||
    automationId === 'calendario_lembrete_whatsapp' ||
    isMedicoEventAutomationId(automationId)
  ) {
    return 'canal_chat';
  }
  if (automationId === 'compartilhamento_aceite_whatsapp') return 'whatsapp_queue';
  if (QUEUE_WHATSAPP_AUTOMATION_IDS.has(automationId)) return 'whatsapp_queue';
  if (channel === 'email') return 'email_queue';
  return 'none';
}

export function motorLabel(motor: AutomationSendMotor): string {
  switch (motor) {
    case 'legacy_aplicacao_dia':
      return 'Cron legado (aplicação do dia)';
    case 'whatsapp_queue':
      return 'Fila WhatsApp + cron lembretes';
    case 'email_queue':
      return 'Fila e-mail';
    case 'canal_chat':
      return 'Canal Chat (sistema)';
    default:
      return '—';
  }
}

function resolveReadiness(
  bloqueios: string[],
  readyCount: number,
  enabledCount: number,
): DoctorAutomationOpsReadiness {
  if (bloqueios.length > 0) return 'blocked';
  if (enabledCount === 0) return 'blocked';
  if (readyCount >= enabledCount) return 'ready';
  return 'partial';
}

async function countWhatsappQueueForDoctor(doctorId: string): Promise<{ pending: number; dueNow: number }> {
  const snap = await getFirestoreAdmin()
    .collection('whatsapp_automation_queue')
    .where('doctorId', '==', doctorId)
    .get();

  const now = Date.now();
  let pending = 0;
  let dueNow = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.status !== 'pending' && data.status !== 'processing') continue;
    pending += 1;
    const scheduledFor = data.scheduledFor;
    const scheduledMs =
      scheduledFor instanceof Timestamp
        ? scheduledFor.toDate().getTime()
        : scheduledFor instanceof Date
          ? scheduledFor.getTime()
          : 0;
    if (scheduledMs > 0 && scheduledMs <= now) dueNow += 1;
  }

  return { pending, dueNow };
}

type OpsSlice = Pick<
  DoctorAutomationOpsChecklistDto,
  | 'whatsappConnected'
  | 'aplicacaoDiaAuthorized'
  | 'autoAplicacaoLegacyEnabled'
  | 'horarioJaPassouHoje'
  | 'aplicacaoDiaDoctorEnabled'
  | 'aplicacaoDiaOrgReleased'
  | 'autoAplicacaoHorario'
>;

type AutomationRowBase = Omit<DoctorAutomationDetailRowDto, 'motor' | 'readyToSend' | 'blockReason'>;

function buildAutomationRowReadiness(
  row: AutomationRowBase,
  ops: OpsSlice,
): Pick<DoctorAutomationDetailRowDto, 'motor' | 'readyToSend' | 'blockReason'> {
  const motor = motorForAutomation(row.automationId, row.channel);
  const reasons: string[] = [];

  if (row.globalStatus !== 'active') {
    reasons.push(`Catálogo global: ${row.globalStatus}`);
  }
  if (!row.organizationReleased) {
    reasons.push('Organização não liberou');
  }
  if (!row.enabledByDoctor) {
    reasons.push('Médico não ativou');
  }

  if (row.channel === 'whatsapp' && motor !== 'canal_chat' && !ops.whatsappConnected) {
    reasons.push('WhatsApp não conectado');
  }

  if (motor === 'whatsapp_queue' && row.enabledByDoctor && ops.whatsappConnected && reasons.length === 0) {
    reasons.push('Aguardando fila (rebuild + cron de lembretes)');
  }

  if (motor === 'canal_chat' && row.enabledByDoctor && reasons.length === 0) {
    reasons.push('Envio no dia do vencimento via Canal Chat');
  }

  if (motor === 'email_queue' && row.enabledByDoctor && reasons.length === 0) {
    reasons.push('Aguardando fila de e-mail');
  }

  const readyToSend =
    row.enabledByDoctor &&
    row.organizationReleased &&
    row.globalStatus === 'active' &&
    (row.channel !== 'whatsapp' || motor === 'canal_chat' || ops.whatsappConnected);

  return {
    motor,
    readyToSend,
    blockReason: readyToSend ? undefined : reasons.join(' · ') || 'Pré-requisitos incompletos',
  };
}

export async function buildDoctorAutomationOpsReadiness(
  doctorId: string,
  organizationId: string,
  automations: AutomationRowBase[],
): Promise<{
  ops: DoctorAutomationOpsChecklistDto;
  automations: DoctorAutomationDetailRowDto[];
}> {
  const [connection, authorized, diagnostico, queueCounts] = await Promise.all([
    getWhatsappConnectionByDoctor(doctorId),
    isDoctorAutoAplicacaoDiaAuthorized(doctorId, organizationId),
    diagnosticarAutoAplicacaoMedico(doctorId).catch(() => null),
    countWhatsappQueueForDoctor(doctorId),
  ]);

  const brasil = getBrasilDateTimeParts();
  const horario = connection?.autoAplicacaoHorario ?? diagnostico?.horarioConfigurado ?? '08:00';
  const horarioJaPassouHoje = horarioConfiguradoJaPassou(brasil.hhmm, horario);

  const aplicacaoRow = automations.find((item) => item.automationId === APLICACAO_DIA_WHATSAPP_AUTOMATION_ID);
  const aplicacaoDiaDoctorEnabled = aplicacaoRow?.enabledByDoctor === true;
  const aplicacaoDiaOrgReleased = aplicacaoRow?.organizationReleased === true;
  const autoAplicacaoLegacyEnabled = connection?.autoAplicacaoEnabled === true;
  const whatsappConnected = connection?.status === 'connected';

  const bloqueios = [...(diagnostico?.bloqueios ?? [])];
  // Aplicação do dia migrou para a fila — flag legado não bloqueia mais o motor.

  const opsBase: DoctorAutomationOpsChecklistDto = {
    readiness: 'blocked',
    whatsappConnected,
    whatsappStatus: connection?.status,
    whatsappPhone: connection?.phone,
    autoAplicacaoLegacyEnabled,
    aplicacaoDiaDoctorEnabled,
    aplicacaoDiaOrgReleased,
    aplicacaoDiaAuthorized: authorized || aplicacaoDiaDoctorEnabled,
    legacyFlagInSync: true,
    autoAplicacaoHorario: horario,
    horarioJaPassouHoje,
    cronEligible: aplicacaoDiaDoctorEnabled && aplicacaoDiaOrgReleased && whatsappConnected,
    aplicacoesHoje: diagnostico?.aplicacoesHoje ?? 0,
    aplicacoesHojePendentes: diagnostico?.pendentesEnvio ?? 0,
    aplicacoesHojeIgnoradas: diagnostico?.semTelefone?.length ?? 0,
    queuePending: queueCounts.pending,
    queueDueNow: queueCounts.dueNow,
    bloqueios: [...new Set(bloqueios)],
  };

  const enrichedAutomations: DoctorAutomationDetailRowDto[] = automations.map((row) => ({
    ...row,
    ...buildAutomationRowReadiness(row, opsBase),
  }));

  const enabledRows = enrichedAutomations.filter((row) => row.enabledByDoctor);
  const readyRows = enabledRows.filter((row) => row.readyToSend);

  const criticalBloqueios = opsBase.bloqueios.filter(
    (item) =>
      !item.includes('Nenhuma aplicação') &&
      !item.includes('já foram enviadas') &&
      !item.includes('Todas as aplicações'),
  );

  opsBase.readiness = resolveReadiness(criticalBloqueios, readyRows.length, enabledRows.length);

  return { ops: opsBase, automations: enrichedAutomations };
}
