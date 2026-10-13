import { Timestamp } from 'firebase-admin/firestore';
import { getOrganizationById } from '@/lib/organization/organizationRegistry';
import { resolveMedicoOrganizationId } from '@/lib/server/whatsappMedicoContext.server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { listDoctorAutomationGovernance } from '@/services/automationDoctorGovernanceService';
import { listarAplicacoesAutoEnvioPainel } from '@/services/whatsappAutoAplicacaoService';
import type {
  AutomationCenterDoctorActivityDto,
  AutomationCenterDoctorActivityStatus,
  AutomationCenterLogEventDto,
  AutomationCenterLogStatus,
  AutomationCenterLogsDto,
} from '@/types/automationCenterLogs';
import type { WhatsappMessageLogType } from '@/types/whatsappMessageLog';
import type { WhatsappAutomationQueueItem } from '@/types/whatsappAutomationQueue';

const SILENT_HOURS = 24;
const PENDING_WHATSAPP_QUEUE_LIMIT = 80;
const PENDING_EMAIL_QUEUE_LIMIT = 60;
const PENDING_LEGACY_DOCTOR_LIMIT = 30;

type MedicoLookup = {
  nome: string;
  organizationId?: string;
};

function toDate(value: unknown): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybe = value as { toDate?: () => Date };
    if (typeof maybe.toDate === 'function') return maybe.toDate();
  }
  return undefined;
}

function whatsappTypeLabel(type: WhatsappMessageLogType): string {
  switch (type) {
    case 'auto_aplicacao':
      return 'Aplicação (dia)';
    case 'aplicacao_d1':
      return 'Lembrete D-1';
    case 'aplicacao_atrasada':
      return 'Aplicação atrasada';
    case 'injetavel_dia':
      return 'Injetável (dia)';
    case 'injetavel_d1':
      return 'Injetável D-1';
    case 'aniversario':
      return 'Aniversário';
    case 'conclusao':
      return 'Conclusão de tratamento';
    case 'nutri_checkin':
      return 'Check-in Semanal Nutri';
    case 'financeiro_cobranca':
      return 'Cobrança financeira';
    case 'cobranca_automatica':
      return 'Cobrança automática';
    case 'boas_vindas_tratamento':
      return 'Boas-vindas ao tratamento';
    case 'solicitacao_acompanhamento':
      return 'Solicitação de acompanhamento';
    case 'prontuario_consulta_nutri':
      return 'Consulta no prontuário (nutri)';
    case 'prontuario_consulta_personal':
      return 'Consulta no prontuário (personal)';
    case 'exames_laboratoriais':
      return 'Exames laboratoriais';
    case 'exames_imagem':
      return 'Exames de imagem';
    case 'bioimpedancia':
      return 'Bioimpedância';
    case 'plano_terapeutico':
      return 'Plano terapêutico';
    case 'cardapio_nutri':
      return 'Cardápio (nutri)';
    case 'orientacoes_nutri':
      return 'Orientações (nutri)';
    case 'treino_personal':
      return 'Treino (personal)';
    case 'hidratacao_checkin':
      return 'Check-in de hidratação';
    default:
      return 'Teste manual';
  }
}

function emailTipoLabel(emailTipo: string): string {
  const labels: Record<string, string> = {
    email1: 'Campanha lead #1',
    email2: 'Campanha lead #2',
    email3: 'Campanha lead #3',
    email4: 'Campanha lead #4',
    email5: 'Campanha lead #5',
    aplicacao: 'Aplicação',
    agenda: 'Agenda diária',
    conclusao_tratamento: 'Conclusão de tratamento',
    bem_vindo: 'Boas-vindas',
    check_recomendacoes: 'Check recomendações',
  };
  return labels[emailTipo] ?? emailTipo;
}

function mapQueueStatus(status: string): AutomationCenterLogStatus | null {
  if (status === 'sent') return 'sent';
  if (status === 'failed') return 'failed';
  if (status === 'skipped') return 'skipped';
  if (status === 'pending') return 'pending';
  if (status === 'processing') return 'processing';
  return null;
}

function whatsappAutomationIdLabel(automationId: string): string {
  const labels: Record<string, string> = {
    aplicacao_dia_whatsapp: 'Aplicação (dia)',
    aplicacao_d1_whatsapp: 'Lembrete D-1',
    aplicacao_atrasada_whatsapp: 'Aplicação atrasada',
    injetavel_dia_whatsapp: 'Injetável (dia)',
    injetavel_d1_whatsapp: 'Injetável D-1',
    aniversario_paciente_whatsapp: 'Aniversário',
    conclusao_tratamento_whatsapp: 'Conclusão de tratamento',
    nutri_checkin_semanal_whatsapp: 'Check-in Semanal Nutri',
    boas_vindas_paciente_whatsapp: 'Boas-vindas',
    consulta_confirmacao_whatsapp: 'Confirmação de consulta',
    consulta_lembrete_paciente_whatsapp: 'Lembrete de consulta (paciente)',
    consulta_lembrete_medico_whatsapp: 'Lembrete de consulta (médico)',
    solicitacao_acompanhamento_whatsapp: 'Nova solicitação',
    parcela_vencimento_whatsapp: 'Parcela vencimento',
    cobranca_automatica_whatsapp: 'Cobrança automática',
    cobranca_avulsa_whatsapp: 'Cobrança avulsa',
  };
  return labels[automationId] ?? automationId;
}

function formatScheduleLabel(date: Date): string {
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function pendingWhatsappQueueReason(item: WhatsappAutomationQueueItem, now: Date): string {
  if (item.status === 'processing') return 'Em processamento pelo cron de lembretes.';
  if (item.scheduledFor.getTime() > now.getTime()) {
    const time = item.scheduledTime || formatScheduleLabel(item.scheduledFor).slice(-5);
    return `Agendado para ${time} (${item.scheduledDateKey || item.dateKey}).`;
  }
  return 'Vencido — aguardando execução do cron de lembretes.';
}

function pendingEmailQueueReason(scheduledFor: Date, now: Date, status: string): string {
  if (status === 'processing') return 'Em processamento pelo motor de e-mail.';
  if (scheduledFor.getTime() > now.getTime()) {
    return `Agendado para ${formatScheduleLabel(scheduledFor)}.`;
  }
  return 'Vencido — aguardando execução do cron de e-mail.';
}

function resolveOrganizationName(organizationId?: string): string | undefined {
  if (!organizationId) return undefined;
  return getOrganizationById(organizationId)?.name;
}

async function loadMedicoLookup(): Promise<Map<string, MedicoLookup>> {
  const snap = await getFirestoreAdmin().collection('medicos').get();
  const map = new Map<string, MedicoLookup>();

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    map.set(doc.id, {
      nome: String(data.nome ?? '').trim(),
      organizationId: resolveMedicoOrganizationId(data),
    });
  }

  return map;
}

function resolveDoctor(
  doctorId: string | undefined,
  medicoLookup: Map<string, MedicoLookup>,
): { doctorId?: string; doctorName?: string; organizationId?: string; organizationName?: string } {
  if (!doctorId?.trim()) {
    return {};
  }

  const medico = medicoLookup.get(doctorId);
  const organizationId = medico?.organizationId;
  return {
    doctorId,
    doctorName: medico?.nome || doctorId,
    organizationId,
    organizationName: resolveOrganizationName(organizationId),
  };
}

function buildDoctorActivity(
  doctors: Awaited<ReturnType<typeof listDoctorAutomationGovernance>>,
  events: AutomationCenterLogEventDto[],
): AutomationCenterDoctorActivityDto[] {
  const now = Date.now();
  const silentMs = SILENT_HOURS * 60 * 60 * 1000;

  const waByDoctor = new Map<string, { at: string; status: 'sent' | 'failed' }>();
  const emailByDoctor = new Map<string, { at: string; status: 'sent' | 'failed' | 'skipped' }>();
  const recentCountByDoctor = new Map<string, number>();

  for (const event of events) {
    if (!event.doctorId) continue;
    recentCountByDoctor.set(event.doctorId, (recentCountByDoctor.get(event.doctorId) ?? 0) + 1);

    if (event.channel === 'whatsapp') {
      const prev = waByDoctor.get(event.doctorId);
      if (!prev || new Date(event.at).getTime() > new Date(prev.at).getTime()) {
        if (event.status === 'sent' || event.status === 'failed') {
          waByDoctor.set(event.doctorId, { at: event.at, status: event.status });
        }
      }
    }

    if (event.channel === 'email') {
      const prev = emailByDoctor.get(event.doctorId);
      if (!prev || new Date(event.at).getTime() > new Date(prev.at).getTime()) {
        if (event.status === 'sent' || event.status === 'failed' || event.status === 'skipped') {
          emailByDoctor.set(event.doctorId, { at: event.at, status: event.status });
        }
      }
    }
  }

  return doctors
    .filter((doctor) => doctor.whatsappEnabled > 0 || doctor.emailEnabled > 0)
    .map((doctor) => {
      const lastWhatsapp = waByDoctor.get(doctor.doctorId);
      const lastEmail = emailByDoctor.get(doctor.doctorId);
      const recentEventCount = recentCountByDoctor.get(doctor.doctorId) ?? 0;

      const lastWhatsappAt = lastWhatsapp?.at;
      const lastEmailAt = lastEmail?.at;
      let activityStatus: AutomationCenterDoctorActivityStatus = 'silent';

      const primaryAt =
        doctor.whatsappEnabled > 0
          ? lastWhatsappAt
          : lastEmailAt ?? lastWhatsappAt;
      const primaryStatus =
        doctor.whatsappEnabled > 0
          ? lastWhatsapp?.status
          : lastEmail?.status ?? lastWhatsapp?.status;

      if (primaryAt) {
        const age = now - new Date(primaryAt).getTime();
        if (age <= silentMs) {
          activityStatus = primaryStatus === 'failed' ? 'failed_recent' : 'active';
        }
      }

      return {
        doctorId: doctor.doctorId,
        doctorName: doctor.doctorName,
        organizationId: doctor.organizationId,
        organizationName: doctor.organizationName,
        whatsappEnabled: doctor.whatsappEnabled,
        emailEnabled: doctor.emailEnabled,
        lastWhatsappAt,
        lastWhatsappStatus: lastWhatsapp?.status,
        lastEmailAt,
        lastEmailStatus: lastEmail?.status,
        activityStatus,
        recentEventCount,
      };
    })
    .sort((a, b) => {
      const statusOrder: Record<AutomationCenterDoctorActivityStatus, number> = {
        failed_recent: 0,
        silent: 1,
        active: 2,
      };
      const statusCmp = statusOrder[a.activityStatus] - statusOrder[b.activityStatus];
      if (statusCmp !== 0) return statusCmp;
      return a.doctorName.localeCompare(b.doctorName, 'pt-BR');
    });
}

async function loadPendingWhatsappQueueEvents(
  medicoLookup: Map<string, MedicoLookup>,
  now: Date,
): Promise<AutomationCenterLogEventDto[]> {
  const db = getFirestoreAdmin();
  const col = db.collection('whatsapp_automation_queue');

  const [pendingSnap, processingSnap] = await Promise.all([
    col.where('status', '==', 'pending').orderBy('scheduledFor', 'asc').limit(PENDING_WHATSAPP_QUEUE_LIMIT).get(),
    col.where('status', '==', 'processing').limit(20).get().catch(() => null),
  ]);

  const events: AutomationCenterLogEventDto[] = [];

  const pushItem = (docId: string, data: Record<string, unknown>) => {
    const status = mapQueueStatus(String(data.status ?? ''));
    if (status !== 'pending' && status !== 'processing') return;

    const scheduledFor = toDate(data.scheduledFor) ?? now;
    const doctorId = String(data.doctorId ?? '').trim() || undefined;
    const organizationId = String(data.organizationId ?? '').trim() || undefined;
    const doctor = resolveDoctor(doctorId, medicoLookup);
    const patientName = typeof data.patientName === 'string' ? data.patientName.trim() : '';
    const phone = typeof data.phone === 'string' ? data.phone.trim() : '';
    const automationId = String(data.automationId ?? '');

    const item: WhatsappAutomationQueueItem = {
      id: docId,
      automationId,
      organizationId: organizationId ?? '',
      doctorId: doctorId ?? '',
      patientId: String(data.patientId ?? ''),
      patientName,
      phone,
      dateKey: String(data.dateKey ?? ''),
      scheduledFor,
      scheduledDateKey: String(data.scheduledDateKey ?? ''),
      scheduledTime: String(data.scheduledTime ?? ''),
      milestone: (data.milestone as WhatsappAutomationQueueItem['milestone']) ?? 'd1',
      status: status as WhatsappAutomationQueueItem['status'],
      templateId: String(data.templateId ?? ''),
      semana: typeof data.semana === 'number' ? data.semana : Number(data.semana ?? 0),
      dose: typeof data.dose === 'number' ? data.dose : Number(data.dose ?? 0),
      createdAt: toDate(data.createdAt) ?? now,
      updatedAt: toDate(data.updatedAt) ?? now,
    };

    events.push({
      id: `wa-q-${docId}`,
      at: scheduledFor.toISOString(),
      channel: 'whatsapp',
      organizationId: organizationId ?? doctor.organizationId,
      organizationName: resolveOrganizationName(organizationId ?? doctor.organizationId),
      doctorId: doctor.doctorId,
      doctorName: doctor.doctorName,
      eventType: whatsappAutomationIdLabel(automationId),
      status,
      detail: patientName || undefined,
      errorMessage: pendingWhatsappQueueReason(item, now),
      recipient: phone || undefined,
      scheduledFor: scheduledFor.toISOString(),
    });
  };

  for (const doc of pendingSnap.docs) {
    pushItem(doc.id, doc.data() as Record<string, unknown>);
  }

  if (processingSnap) {
    for (const doc of processingSnap.docs) {
      pushItem(doc.id, doc.data() as Record<string, unknown>);
    }
  }

  return events;
}

async function loadPendingEmailQueueEvents(
  medicoLookup: Map<string, MedicoLookup>,
  now: Date,
): Promise<AutomationCenterLogEventDto[]> {
  const snap = await getFirestoreAdmin()
    .collection('email_automation_queue')
    .where('status', 'in', ['pending', 'processing'])
    .orderBy('scheduledFor', 'asc')
    .limit(PENDING_EMAIL_QUEUE_LIMIT)
    .get()
    .catch(async () => {
      const [pendingSnap, processingSnap] = await Promise.all([
        getFirestoreAdmin()
          .collection('email_automation_queue')
          .where('status', '==', 'pending')
          .orderBy('scheduledFor', 'asc')
          .limit(PENDING_EMAIL_QUEUE_LIMIT)
          .get(),
        getFirestoreAdmin()
          .collection('email_automation_queue')
          .where('status', '==', 'processing')
          .limit(20)
          .get(),
      ]);
      return { docs: [...pendingSnap.docs, ...processingSnap.docs] };
    });

  const events: AutomationCenterLogEventDto[] = [];

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const status = mapQueueStatus(String(data.status ?? ''));
    if (status !== 'pending' && status !== 'processing') continue;

    const scheduledFor = toDate(data.scheduledFor) ?? now;
    const organizationId = String(data.organizationId ?? '').trim() || undefined;
    const doctorId = String(data.doctorId ?? '').trim() || undefined;
    const doctor = resolveDoctor(doctorId, medicoLookup);

    events.push({
      id: `email-q-${doc.id}`,
      at: scheduledFor.toISOString(),
      channel: 'email',
      organizationId: organizationId ?? doctor.organizationId,
      organizationName: resolveOrganizationName(organizationId ?? doctor.organizationId),
      doctorId: doctor.doctorId,
      doctorName: doctor.doctorName,
      eventType: emailTipoLabel(String(data.emailTipo ?? 'email')),
      status,
      detail: typeof data.leadNome === 'string' ? data.leadNome.trim() : undefined,
      errorMessage: pendingEmailQueueReason(scheduledFor, now, String(data.status ?? '')),
      recipient: typeof data.leadEmail === 'string' ? data.leadEmail.trim() : undefined,
      scheduledFor: scheduledFor.toISOString(),
    });
  }

  return events;
}

async function loadPendingLegacyAplicacaoDiaEvents(
  doctors: Awaited<ReturnType<typeof listDoctorAutomationGovernance>>,
  medicoLookup: Map<string, MedicoLookup>,
  now: Date,
): Promise<AutomationCenterLogEventDto[]> {
  const candidates = doctors
    .filter((doctor) => doctor.whatsappEnabled > 0)
    .slice(0, PENDING_LEGACY_DOCTOR_LIMIT);

  const events: AutomationCenterLogEventDto[] = [];

  await Promise.all(
    candidates.map(async (doctor) => {
      try {
        const painel = await listarAplicacoesAutoEnvioPainel(doctor.doctorId);
        const doctorResolved = resolveDoctor(doctor.doctorId, medicoLookup);

        for (const item of painel.aplicacoes) {
          if (item.status !== 'pending' && item.status !== 'skipped') continue;

          const horario = item.horarioConfigurado || painel.horarioConfigurado || '08:00';
          const [hh, mm] = horario.split(':').map(Number);
          const scheduled = new Date(now);
          scheduled.setHours(hh ?? 8, mm ?? 0, 0, 0);

          events.push({
            id: `wa-legacy-${doctor.doctorId}-${item.pacienteId}-${item.semana}`,
            at: scheduled.toISOString(),
            channel: 'whatsapp',
            organizationId: doctor.organizationId ?? doctorResolved.organizationId,
            organizationName: doctor.organizationName ?? doctorResolved.organizationName,
            doctorId: doctor.doctorId,
            doctorName: doctor.doctorName,
            eventType: 'Aplicação (dia)',
            status: item.status === 'skipped' ? 'skipped' : 'pending',
            detail: item.pacienteNome,
            errorMessage:
              item.motivo ??
              (item.status === 'skipped'
                ? 'Ignorado — sem telefone ou bloqueio global.'
                : 'Na fila — aguardando envio pelo cron.'),
            recipient: item.telefone,
            scheduledFor: scheduled.toISOString(),
          });
        }
      } catch (error) {
        console.error('[automationCenterLogs] legacy aplicacao dia', doctor.doctorId, error);
      }
    }),
  );

  return events;
}

async function loadRecentWhatsappQueueSkippedEvents(
  medicoLookup: Map<string, MedicoLookup>,
): Promise<AutomationCenterLogEventDto[]> {
  const snap = await getFirestoreAdmin()
    .collection('whatsapp_automation_queue')
    .where('status', '==', 'skipped')
    .orderBy('updatedAt', 'desc')
    .limit(30)
    .get()
    .catch(() => null);

  if (!snap) return [];

  const events: AutomationCenterLogEventDto[] = [];

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const reason = typeof data.errorMessage === 'string' ? data.errorMessage.trim() : '';
    if (!reason) continue;

    const at = toDate(data.updatedAt) ?? new Date();
    const doctorId = String(data.doctorId ?? '').trim() || undefined;
    const organizationId = String(data.organizationId ?? '').trim() || undefined;
    const doctor = resolveDoctor(doctorId, medicoLookup);
    const patientName = typeof data.patientName === 'string' ? data.patientName.trim() : '';

    events.push({
      id: `wa-q-skip-${doc.id}`,
      at: at.toISOString(),
      channel: 'whatsapp',
      organizationId: organizationId ?? doctor.organizationId,
      organizationName: resolveOrganizationName(organizationId ?? doctor.organizationId),
      doctorId: doctor.doctorId,
      doctorName: doctor.doctorName,
      eventType: whatsappAutomationIdLabel(String(data.automationId ?? '')),
      status: 'skipped',
      detail: patientName || undefined,
      errorMessage: reason,
      recipient: typeof data.phone === 'string' ? data.phone.trim() : undefined,
    });
  }

  return events;
}

function sortLogEvents(events: AutomationCenterLogEventDto[]): AutomationCenterLogEventDto[] {
  const statusOrder: Record<AutomationCenterLogStatus, number> = {
    pending: 0,
    processing: 1,
    failed: 2,
    skipped: 3,
    sent: 4,
  };

  return [...events].sort((a, b) => {
    const statusCmp = statusOrder[a.status] - statusOrder[b.status];
    if (statusCmp !== 0) return statusCmp;

    const aTime = new Date(a.scheduledFor ?? a.at).getTime();
    const bTime = new Date(b.scheduledFor ?? b.at).getTime();
    if (a.status === 'pending' || a.status === 'processing') {
      return aTime - bTime;
    }
    return bTime - aTime;
  });
}

export async function getAutomationCenterLogs(limit = 100): Promise<AutomationCenterLogsDto> {
  const safeLimit = Math.min(Math.max(limit, 1), 300);
  const perSource = Math.min(safeLimit, 120);
  const now = new Date();
  const db = getFirestoreAdmin();

  const [waLogsSnap, emailQueueSnap, medicoLookup, doctors] = await Promise.all([
    db.collection('whatsapp_message_logs').orderBy('sentAt', 'desc').limit(perSource).get(),
    db.collection('email_automation_queue').orderBy('updatedAt', 'desc').limit(perSource).get(),
    loadMedicoLookup(),
    listDoctorAutomationGovernance(),
  ]);

  const [pendingWhatsapp, pendingEmail, pendingLegacy, skippedWhatsapp] = await Promise.all([
    loadPendingWhatsappQueueEvents(medicoLookup, now),
    loadPendingEmailQueueEvents(medicoLookup, now),
    loadPendingLegacyAplicacaoDiaEvents(doctors, medicoLookup, now),
    loadRecentWhatsappQueueSkippedEvents(medicoLookup),
  ]);

  const events: AutomationCenterLogEventDto[] = [];

  for (const doc of waLogsSnap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const medicoId = String(data.medicoId ?? '').trim();
    if (!medicoId) continue;

    const status = data.status === 'sent' ? 'sent' : 'failed';
    const sentAt = toDate(data.sentAt) ?? new Date();
    const doctor = resolveDoctor(medicoId, medicoLookup);
    const pacienteNome = typeof data.pacienteNome === 'string' ? data.pacienteNome.trim() : '';
    const phone = typeof data.phone === 'string' ? data.phone.trim() : '';

    events.push({
      id: `wa-${doc.id}`,
      at: sentAt.toISOString(),
      channel: 'whatsapp',
      ...doctor,
      eventType: whatsappTypeLabel((data.type as WhatsappMessageLogType) ?? 'test'),
      status,
      detail: pacienteNome || undefined,
      errorMessage: typeof data.errorMessage === 'string' ? data.errorMessage : undefined,
      recipient: phone || undefined,
    });
  }

  for (const doc of emailQueueSnap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const status = mapQueueStatus(String(data.status ?? ''));
    if (!status || status === 'pending' || status === 'processing') continue;

    const at = toDate(data.sentAt) ?? toDate(data.updatedAt) ?? new Date();
    const organizationId = String(data.organizationId ?? '').trim() || undefined;
    const doctorId = String(data.doctorId ?? '').trim() || undefined;
    const doctor = resolveDoctor(doctorId, medicoLookup);

    events.push({
      id: `email-${doc.id}`,
      at: at.toISOString(),
      channel: 'email',
      organizationId: organizationId ?? doctor.organizationId,
      organizationName: resolveOrganizationName(organizationId ?? doctor.organizationId),
      doctorId: doctor.doctorId,
      doctorName: doctor.doctorName,
      eventType: emailTipoLabel(String(data.emailTipo ?? 'email')),
      status,
      detail: typeof data.leadNome === 'string' ? data.leadNome.trim() : undefined,
      errorMessage:
        typeof data.errorMessage === 'string' && data.errorMessage.trim()
          ? data.errorMessage.trim()
          : status === 'skipped'
            ? 'Ignorado pelo motor de e-mail.'
            : undefined,
      recipient: typeof data.leadEmail === 'string' ? data.leadEmail.trim() : undefined,
    });
  }

  events.push(...pendingWhatsapp, ...pendingEmail, ...pendingLegacy, ...skippedWhatsapp);

  const sortedEvents = sortLogEvents(events);
  const slicedEvents = sortedEvents.slice(0, safeLimit);
  const doctorActivity = buildDoctorActivity(doctors, sortedEvents);

  return {
    generatedAt: new Date().toISOString(),
    events: slicedEvents,
    doctorActivity,
  };
}
