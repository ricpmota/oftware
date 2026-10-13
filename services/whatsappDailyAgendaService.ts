import { APLICACAO_DIA_WHATSAPP_AUTOMATION_ID } from '@/lib/whatsapp/autoAplicacaoAuthorization.server';
import { idsProtocolosInjetaveis } from '@/lib/whatsapp/injetavelFilaDecisao';
import { shouldHideWhatsappAgendaItemForRoster } from '@/lib/whatsapp/whatsappQueuePatientGuard';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { LEMBRETE_AVISO_WHATSAPP_OPTIONS } from '@/lib/lembrete/lembreteWhatsappNotify';
import { getBrasilDateTimeParts } from '@/lib/time/brasilTimezone';
import { listSettingsByDoctorId } from '@/services/automationDoctorSettingsService';
import { listarAplicacoesAutoEnvioPainel } from '@/services/whatsappAutoAplicacaoService';
import {
  deleteWhatsappQueueItemsByIds,
  listQueueItemsByDoctorScheduledDate,
} from '@/services/whatsappAutomationQueueService';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import {
  INJETAVEL_D1_WHATSAPP_AUTOMATION_ID,
  INJETAVEL_DIA_WHATSAPP_AUTOMATION_ID,
  rebuildWhatsappAutomationQueueForDoctor,
} from '@/services/whatsappRemindersService';
import type {
  LembreteAvisoWhatsApp,
  LembreteWhatsappNotifyStatus,
} from '@/types/lembrete';
import type {
  WhatsappDailyAgendaItem,
  WhatsappDailyAgendaKind,
} from '@/types/whatsappDailyAgenda';
import { whatsappDailyAgendaKindLabel } from '@/types/whatsappDailyAgenda';
import type { WhatsappAutomationQueueItem } from '@/types/whatsappAutomationQueue';

const APLICACAO_D1_AUTOMATION_ID = 'aplicacao_d1_whatsapp';
const APLICACAO_ATRASADA_AUTOMATION_ID = 'aplicacao_atrasada_whatsapp';
const ANIVERSARIO_AUTOMATION_ID = 'aniversario_paciente_whatsapp';
const CONCLUSAO_AUTOMATION_ID = 'conclusao_tratamento_whatsapp';
const CALENDARIO_LEMBRETE_AUTOMATION_ID = 'calendario_lembrete_whatsapp';

function kindFromAutomationId(automationId: string): WhatsappDailyAgendaKind | null {
  switch (automationId) {
    case APLICACAO_DIA_WHATSAPP_AUTOMATION_ID:
      return 'aplicacao_dia';
    case APLICACAO_D1_AUTOMATION_ID:
      return 'aplicacao_d1';
    case APLICACAO_ATRASADA_AUTOMATION_ID:
      return 'aplicacao_atrasada';
    case INJETAVEL_DIA_WHATSAPP_AUTOMATION_ID:
      return 'injetavel_dia';
    case INJETAVEL_D1_WHATSAPP_AUTOMATION_ID:
      return 'injetavel_d1';
    case ANIVERSARIO_AUTOMATION_ID:
      return 'aniversario';
    case CONCLUSAO_AUTOMATION_ID:
      return 'conclusao';
    default:
      return null;
  }
}

function aplicacaoDiaAgendaKey(pacienteId: string, dateKey: string, semana: number): string {
  return `${pacienteId}:${dateKey}:${semana}`;
}

function queueStatusToAgenda(
  status: WhatsappAutomationQueueItem['status'],
): WhatsappDailyAgendaItem['status'] {
  if (status === 'sent') return 'sent';
  if (status === 'failed') return 'failed';
  if (status === 'skipped') return 'skipped';
  if (status === 'processing') return 'processing';
  return 'pending';
}

function motivoFromQueueItem(item: WhatsappAutomationQueueItem): string | undefined {
  if (item.status === 'sent') return 'Mensagem enviada.';
  if (item.status === 'failed') return item.errorMessage || 'Falha no envio.';
  if (item.status === 'skipped') return item.errorMessage || 'Envio ignorado.';
  if (item.status === 'processing') return 'Em processamento pelo cron.';
  const time = item.scheduledTime || '—';
  const now = Date.now();
  if (item.scheduledFor.getTime() > now) {
    return `Agendado para ${time} (${item.scheduledDateKey}).`;
  }
  return `Na fila — aguardando envio pelo cron (${time}).`;
}

function statusRank(status: WhatsappDailyAgendaItem['status']): number {
  switch (status) {
    case 'pending':
      return 0;
    case 'processing':
      return 1;
    case 'failed':
      return 2;
    case 'skipped':
      return 3;
    case 'sent':
      return 4;
    default:
      return 5;
  }
}

function kindRank(kind: WhatsappDailyAgendaKind): number {
  switch (kind) {
    case 'aplicacao_dia':
      return 0;
    case 'aplicacao_d1':
      return 1;
    case 'aplicacao_atrasada':
      return 2;
    case 'aniversario':
      return 3;
    case 'conclusao':
      return 4;
    case 'calendario_lembrete':
      return 5;
    default:
      return 6;
  }
}

function avisoWhatsAppLabel(aviso: LembreteAvisoWhatsApp | undefined): string {
  return (
    LEMBRETE_AVISO_WHATSAPP_OPTIONS.find((o) => o.value === aviso)?.label ??
    'Não notificar no WhatsApp'
  );
}

function calendarioLembreteStatus(
  status: LembreteWhatsappNotifyStatus | undefined,
  aviso: LembreteAvisoWhatsApp | undefined,
): WhatsappDailyAgendaItem['status'] {
  if (status === 'sent') return 'sent';
  if (status === 'failed') return 'failed';
  if (status === 'skipped' || !aviso || aviso === 'disabled') return 'skipped';
  if (status === 'pending') return 'pending';
  return 'skipped';
}

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === 'function') {
      try {
        return maybe.toDate();
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

async function listCalendarioLembretesAgendaItems(
  doctorId: string,
  dateKey: string,
): Promise<WhatsappDailyAgendaItem[]> {
  const snap = await getFirestoreAdmin()
    .collection('lembretes')
    .where('medicoId', '==', doctorId)
    .get();

  const items: WhatsappDailyAgendaItem[] = [];
  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const lembreteData = typeof data.data === 'string' ? data.data : '';
    if (lembreteData !== dateKey) continue;

    const aviso = data.avisoWhatsApp as LembreteAvisoWhatsApp | undefined;
    const notifyStatus = data.whatsappNotifyStatus as LembreteWhatsappNotifyStatus | undefined;
    const horario = typeof data.horario === 'string' ? data.horario : undefined;
    const texto = typeof data.texto === 'string' ? data.texto : '';
    const tag = typeof data.tag === 'string' ? data.tag : 'Consulta';
    const notificarEm = toDate(data.notificarEm);
    const notificadoEm = toDate(data.whatsappNotificadoEm);
    const errorMessage =
      typeof data.whatsappNotifyError === 'string' ? data.whatsappNotifyError : undefined;
    const status = calendarioLembreteStatus(notifyStatus, aviso);

    let motivo = texto ? `"${texto}"` : undefined;
    const avisoLabel = avisoWhatsAppLabel(aviso);
    if (status === 'sent') {
      motivo = [
        motivo,
        'Enviado no WhatsApp (telefone do aviso).',
        // Falha só na cópia ao paciente (Canal Chat já saiu) fica em whatsappNotifyError.
        errorMessage,
      ]
        .filter(Boolean)
        .join(' · ');
    } else if (status === 'failed') {
      motivo = [motivo, errorMessage || 'Falha no envio.'].filter(Boolean).join(' · ');
    } else if (status === 'pending' && notificarEm) {
      const notifyLabel = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(notificarEm);
      motivo = [motivo, `${avisoLabel} · aviso às ${notifyLabel}`].filter(Boolean).join(' · ');
    } else if (status === 'skipped') {
      motivo = [motivo, avisoLabel].filter(Boolean).join(' · ');
    }

    items.push({
      id: `calendario_lembrete:${doc.id}`,
      kind: 'calendario_lembrete',
      automationId: CALENDARIO_LEMBRETE_AUTOMATION_ID,
      automationLabel: tag ? `Lembrete · ${tag}` : whatsappDailyAgendaKindLabel('calendario_lembrete'),
      pacienteId: typeof data.pacienteId === 'string' ? data.pacienteId : '',
      pacienteNome: typeof data.pacienteNome === 'string' ? data.pacienteNome : 'Paciente',
      dateKey: lembreteData,
      scheduledDateKey: lembreteData,
      horarioConfigurado: horario || '—',
      status,
      enviadoEm: notificadoEm,
      telefone: typeof data.telefoneAviso === 'string' ? data.telefoneAviso : undefined,
      motivo,
    });
  }

  return items;
}

/**
 * Agenda ao vivo do dia para o Log do médico:
 * - Fila WhatsApp (aplicação do dia d0, D-1, atrasada, aniversário, conclusão)
 * - Fallback do calendário de aplicações do dia (enquanto a fila não tem d0)
 * - Lembretes do calendário do médico
 */
export async function listWhatsappDailyAgendaForDoctor(
  doctorId: string,
  dateKey?: string,
): Promise<{
  dateKey: string;
  brasilDateKey: string;
  brasilHhmm: string;
  whatsappConnected: boolean;
  autoAplicacaoEnabled: boolean;
  activatedKinds: WhatsappDailyAgendaKind[];
  items: WhatsappDailyAgendaItem[];
  queueRebuild?: { enqueued: number; updated: number; patientsScanned: number };
}> {
  const id = doctorId?.trim();
  const brasil = getBrasilDateTimeParts();
  const targetDate = dateKey?.trim() || brasil.dateKey;

  const [doctorSettings, connection, calendarioItems, painel, rosterSnap] = await Promise.all([
    listSettingsByDoctorId(id),
    getWhatsappConnectionByDoctor(id),
    listCalendarioLembretesAgendaItems(id, targetDate),
    listarAplicacoesAutoEnvioPainel(id, targetDate),
    getFirestoreAdmin()
      .collection('pacientes_completos')
      .where('medicoResponsavelId', '==', id)
      .get(),
  ]);
  const rosterIds = new Set(rosterSnap.docs.map((doc) => doc.id));
  const injetavelIdsPorPaciente = new Map<string, Set<string>>();
  for (const doc of rosterSnap.docs) {
    const data = doc.data() as { planoTerapeutico?: unknown };
    injetavelIdsPorPaciente.set(doc.id, idsProtocolosInjetaveis(data.planoTerapeutico));
  }

  const enabledIds = new Set(
    doctorSettings.filter((s) => s.enabled).map((s) => s.automationId),
  );
  const diaEnabled = enabledIds.has(APLICACAO_DIA_WHATSAPP_AUTOMATION_ID);

  let queueItems = await listQueueItemsByDoctorScheduledDate(id, targetDate);
  let queueRebuild: { enqueued: number; updated: number; patientsScanned: number } | undefined;

  // Cutover: se o flap do dia está on e ainda não há d0 na fila para o dia, reconstrói.
  const diaQueueCount = queueItems.filter(
    (item) => item.automationId === APLICACAO_DIA_WHATSAPP_AUTOMATION_ID,
  ).length;
  if (diaEnabled && targetDate === brasil.dateKey && diaQueueCount === 0) {
    try {
      const rebuild = await rebuildWhatsappAutomationQueueForDoctor(id);
      queueRebuild = {
        enqueued: rebuild.enqueued,
        updated: rebuild.updated,
        patientsScanned: rebuild.patientsScanned,
      };
      queueItems = await listQueueItemsByDoctorScheduledDate(id, targetDate);
    } catch (error) {
      console.warn('[whatsapp-daily-agenda] rebuild d0 falhou:', error);
    }
  }

  const activatedKinds: WhatsappDailyAgendaKind[] = [];
  for (const automationId of enabledIds) {
    const kind = kindFromAutomationId(automationId);
    if (kind && !activatedKinds.includes(kind)) activatedKinds.push(kind);
  }
  if (
    !activatedKinds.includes('aplicacao_dia') &&
    (painel.autoAplicacaoEnabled || painel.aplicacoes.length > 0)
  ) {
    activatedKinds.push('aplicacao_dia');
  }
  if (calendarioItems.length > 0 && !activatedKinds.includes('calendario_lembrete')) {
    activatedKinds.push('calendario_lembrete');
  }

  const items: WhatsappDailyAgendaItem[] = [];
  const coveredDiaKeys = new Set<string>();
  const injetaveisForaDoPlano: string[] = [];

  for (const queueItem of queueItems) {
    if (shouldHideWhatsappAgendaItemForRoster({ patientId: queueItem.patientId, rosterIds })) {
      continue;
    }
    if (
      (queueItem.automationId === INJETAVEL_DIA_WHATSAPP_AUTOMATION_ID ||
        queueItem.automationId === INJETAVEL_D1_WHATSAPP_AUTOMATION_ID) &&
      queueItem.status !== 'sent'
    ) {
      const scope = (queueItem.scopeKey || '').trim();
      const ids = injetavelIdsPorPaciente.get(queueItem.patientId);
      if (scope && !ids?.has(scope)) {
        injetaveisForaDoPlano.push(queueItem.id);
        continue;
      }
    }
    const kind = kindFromAutomationId(queueItem.automationId);
    if (!kind) continue;
    if (!enabledIds.has(queueItem.automationId) && queueItem.status === 'pending') {
      continue;
    }

    if (kind === 'aplicacao_dia') {
      coveredDiaKeys.add(
        aplicacaoDiaAgendaKey(queueItem.patientId, queueItem.dateKey, queueItem.semana),
      );
    }

    items.push({
      id: queueItem.id,
      kind,
      automationId: queueItem.automationId,
      automationLabel: whatsappDailyAgendaKindLabel(kind),
      pacienteId: queueItem.patientId,
      pacienteNome: queueItem.patientName,
      telefone: queueItem.phone,
      dateKey: queueItem.dateKey,
      scheduledDateKey: queueItem.scheduledDateKey,
      horarioConfigurado: queueItem.scheduledTime,
      status: queueStatusToAgenda(queueItem.status),
      semana: queueItem.semana || undefined,
      dose: queueItem.dose || undefined,
      enviadoEm: queueItem.sentAt,
      motivo: motivoFromQueueItem(queueItem),
    });
  }

  if (injetaveisForaDoPlano.length > 0) {
    await deleteWhatsappQueueItemsByIds(injetaveisForaDoPlano);
  }

  // Fallback: aplicações planejadas no calendário ainda sem item d0 na fila.
  if (diaEnabled || painel.aplicacoes.length > 0) {
    for (const row of painel.aplicacoes) {
      const key = aplicacaoDiaAgendaKey(row.pacienteId, row.aplicacaoData, row.semana);
      if (coveredDiaKeys.has(key)) continue;

      items.push({
        id: `aplicacao_dia_preview:${row.pacienteId}:${row.aplicacaoData}:${row.semana}`,
        kind: 'aplicacao_dia',
        automationId: APLICACAO_DIA_WHATSAPP_AUTOMATION_ID,
        automationLabel: whatsappDailyAgendaKindLabel('aplicacao_dia'),
        pacienteId: row.pacienteId,
        pacienteNome: row.pacienteNome,
        telefone: row.telefone,
        dateKey: row.aplicacaoData,
        scheduledDateKey: row.aplicacaoData,
        horarioConfigurado: row.horarioConfigurado,
        status: row.status,
        semana: row.semana,
        dose: row.dose,
        enviadoEm: row.enviadoEm,
        motivo:
          row.motivo ||
          (row.status === 'sent'
            ? 'Mensagem enviada.'
            : 'Na fila — aguardando envio automático.'),
      });
    }
  }

  const calendarioNoQuadro = calendarioItems.filter(
    (item) => !shouldHideWhatsappAgendaItemForRoster({ patientId: item.pacienteId, rosterIds }),
  );
  items.push(...calendarioNoQuadro);

  items.sort((a, b) => {
    const byStatus = statusRank(a.status) - statusRank(b.status);
    if (byStatus !== 0) return byStatus;
    const byKind = kindRank(a.kind) - kindRank(b.kind);
    if (byKind !== 0) return byKind;
    return a.pacienteNome.localeCompare(b.pacienteNome, 'pt-BR');
  });

  return {
    dateKey: targetDate,
    brasilDateKey: brasil.dateKey,
    brasilHhmm: brasil.hhmm,
    whatsappConnected: painel.whatsappConnected || connection?.status === 'connected',
    autoAplicacaoEnabled: diaEnabled || painel.autoAplicacaoEnabled,
    activatedKinds,
    items,
    queueRebuild,
  };
}
