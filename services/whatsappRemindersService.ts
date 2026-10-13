import { Timestamp } from 'firebase-admin/firestore';
import { primeiroNomePaciente } from '@/lib/aplicacao/buildAplicacaoWhatsAppMessage';
import { ensureAplicacaoPublicUrl } from '@/lib/aplicacao/ensureAplicacaoPublicLink';
import { ensureConclusaoPublicUrl } from '@/lib/conclusao/ensureConclusaoPublicLink';
import { dataConclusaoPrevisaoPaciente } from '@/lib/conclusao/dataConclusaoPrevisaoPlano';
import { resolveDefaultTemplateIdForAutomation } from '@/lib/metaadmingeral/automationOrganizationSettings';
import { renderAutomationTemplate } from '@/lib/metaadmingeral/renderAutomationTemplate';
import { normalizePacienteDocument } from '@/lib/oi/normalizePacienteFirestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  DEFAULT_AUTO_APLICACAO_HORARIO,
  getBrasilDateTimeParts,
  parseHorarioBrasil,
} from '@/lib/time/brasilTimezone';
import { NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID, isNutriCheckInWhatsappAutomation } from '@/lib/nutri/checkInSemanalNutriWhatsApp';
import { buildNutriCheckInWhatsAppMessage } from '@/lib/nutri/buildNutriCheckInWhatsAppMessage';
import {
  enqueueNutriCheckInWhatsAppQueue,
  revalidateNutriCheckInWhatsAppQueueItem,
} from '@/services/whatsappNutriCheckInQueue';
import {
  getAutomationDoctorSetting,
  listSettingsByDoctorId,
  listAllAutomationDoctorSettings,
  resolveSettingProfessionalRole,
} from '@/services/automationDoctorSettingsService';
import { listSettingsByOrganizationId } from '@/services/automationOrganizationSettingsService';
import { getAutomationTemplateById } from '@/services/automationTemplatesService';
import {
  enqueueWhatsappAutomationItem,
  listDueWhatsappAutomationItems,
  listQueueItemsByPatient,
  markQueueItemFailed,
  markQueueItemSent,
  markQueueItemSkipped,
  skipWhatsappQueueItemsNotOnRoster,
  deleteWhatsappQueueItemsNotOnRoster,
  deleteWhatsappQueueItemsForPatient,
  deleteWhatsappQueueItem,
  deleteWhatsappQueueItemsByIds,
} from '@/services/whatsappAutomationQueueService';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import { flagWhatsappSessionBrokenFromSendFailure } from '@/services/whatsappDisconnectNotifyService';
import { registrarWhatsappMessageLog } from '@/services/whatsappMessageLogService';
import { tryResolvePhoneFromPacienteDoc } from '@/lib/whatsapp/resolveInternationalPhone';
import {
  sendPatientAutomationWhatsapp,
  WhatsappPatientSendError,
} from '@/services/whatsappPatientSendRouter';
import { isWhatsappSessionHealthFailure } from '@/lib/whatsapp/whatsappSessionHealth';
import {
  WHATSAPP_QUEUE_SKIP_PACIENTE_FORA_DO_QUADRO,
  WHATSAPP_QUEUE_SKIP_PACIENTE_NAO_ENCONTRADO,
} from '@/lib/whatsapp/whatsappQueuePatientGuard';
import { decisaoLembreteAplicacaoWhatsapp } from '@/lib/whatsapp/aplicacaoFilaDecisao';
import {
  decisaoLembreteInjetavelWhatsapp,
  idsProtocolosInjetaveis,
} from '@/lib/whatsapp/injetavelFilaDecisao';
import { buildSemanasEsquemaDoses } from '@/utils/esquemaDosesSemana';
import { listarInjetaveisPlanejadosNoPeriodo } from '@/utils/injetaveisCalendario';
import { parseDataNascimentoDiaMesLocal } from '@/utils/dataNascimentoLocal';
import { primeiraDoseDoPlano } from '@/utils/datasAplicacaoSemanaPlano';
import type { PacienteCompleto } from '@/types/obesidade';
import type {
  WhatsappAutomationMilestone,
  WhatsappAutomationQueueItem,
} from '@/types/whatsappAutomationQueue';
import { buildWhatsappAutoAplicacaoEnvioId } from '@/types/whatsappAutoAplicacao';
import type { WhatsappMessageLogType } from '@/types/whatsappMessageLog';

export const APLICACAO_DIA_WHATSAPP_AUTOMATION_ID = 'aplicacao_dia_whatsapp';
export const APLICACAO_D1_AUTOMATION_ID = 'aplicacao_d1_whatsapp';
export const APLICACAO_ATRASADA_AUTOMATION_ID = 'aplicacao_atrasada_whatsapp';
export const INJETAVEL_DIA_WHATSAPP_AUTOMATION_ID = 'injetavel_dia_whatsapp';
export const INJETAVEL_D1_WHATSAPP_AUTOMATION_ID = 'injetavel_d1_whatsapp';
export const ANIVERSARIO_AUTOMATION_ID = 'aniversario_paciente_whatsapp';
export const CONCLUSAO_AUTOMATION_ID = 'conclusao_tratamento_whatsapp';

const REMINDER_AUTOMATION_IDS = [
  APLICACAO_DIA_WHATSAPP_AUTOMATION_ID,
  APLICACAO_D1_AUTOMATION_ID,
  APLICACAO_ATRASADA_AUTOMATION_ID,
] as const;

const INJETAVEL_AUTOMATION_IDS = [
  INJETAVEL_DIA_WHATSAPP_AUTOMATION_ID,
  INJETAVEL_D1_WHATSAPP_AUTOMATION_ID,
] as const;

const QUEUE_AUTOMATION_IDS = [
  ...REMINDER_AUTOMATION_IDS,
  ...INJETAVEL_AUTOMATION_IDS,
  ANIVERSARIO_AUTOMATION_ID,
  CONCLUSAO_AUTOMATION_ID,
  NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID,
] as const;

function isReminderAutomation(automationId: string): boolean {
  return (REMINDER_AUTOMATION_IDS as readonly string[]).includes(automationId);
}

function isInjetavelAutomation(automationId: string): boolean {
  return (INJETAVEL_AUTOMATION_IDS as readonly string[]).includes(automationId);
}

function isQueueAutomation(automationId: string): boolean {
  return (QUEUE_AUTOMATION_IDS as readonly string[]).includes(automationId);
}

/** Aplicação / injetável / conclusão: o dono da fila é o médico responsável. */
function isMedicoPacienteOwnedAutomation(automationId: string): boolean {
  if (isNutriCheckInWhatsappAutomation(automationId)) return false;
  if (automationId === ANIVERSARIO_AUTOMATION_ID) return false;
  return isQueueAutomation(automationId);
}

/** Janela máxima (dias) para pré-agendar itens na fila a partir de hoje. */
const QUEUE_HORIZON_DAYS = 45;

/** Dedup legado mantido por segurança (item #6). */
const LEGACY_DEDUP_COLLECTION = 'whatsapp_reminders_envios';

const BRASILIA_UTC_OFFSET_HOURS = 3; // Brasil sem horário de verão (UTC-3 fixo).

// ── Helpers de data ────────────────────────────────────────────────────────

function dateKeyFromLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysToDateKey(dateKey: string, deltaDias: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  date.setUTCDate(date.getUTCDate() + deltaDias);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function parseDateKeyLocal(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
}

/** Converte "dia + horário" (parede de Brasília) no instante UTC correspondente. */
function brasiliaWallTimeToInstant(dateKey: string, hhmm: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  return new Date(
    Date.UTC(y, (m ?? 1) - 1, d ?? 1, (hh ?? 0) + BRASILIA_UTC_OFFSET_HOURS, mm ?? 0, 0, 0),
  );
}

function normalizeHorario(value?: string): string {
  if (!value) return DEFAULT_AUTO_APLICACAO_HORARIO;
  return parseHorarioBrasil(value) ?? DEFAULT_AUTO_APLICACAO_HORARIO;
}

// ── Helpers de paciente ─────────────────────────────────────────────────────

function pacienteEmTratamento(status: unknown): boolean {
  return status === 'em_tratamento';
}

function pacienteElegivelAniversario(status: unknown): boolean {
  return status === 'em_tratamento' || status === 'concluido';
}

function pacienteElegivelConclusao(status: unknown): boolean {
  return status === 'em_tratamento' || status === 'concluido';
}

function pacienteFromFirestore(docId: string, raw: Record<string, unknown>): PacienteCompleto {
  return normalizePacienteDocument(docId, raw) as unknown as PacienteCompleto;
}

function extrairTelefonePaciente(data: Record<string, unknown>): string | null {
  return tryResolvePhoneFromPacienteDoc(data);
}

function nomePaciente(paciente: PacienteCompleto): string {
  return paciente.nome ?? paciente.dadosIdentificacao?.nomeCompleto ?? 'Paciente';
}

/** Aniversários (dia/mês) que caem entre hoje e o horizonte da fila. */
function upcomingBirthdayDateKeys(
  dataNascimento: unknown,
  todayKey: string,
  horizonKey: string,
): string[] {
  const birth = parseDataNascimentoDiaMesLocal(dataNascimento);
  if (!birth) return [];

  const month = birth.getMonth();
  const day = birth.getDate();
  const [startYear] = todayKey.split('-').map(Number);
  const [endYear] = horizonKey.split('-').map(Number);
  const keys: string[] = [];

  for (let year = startYear; year <= endYear + 1; year += 1) {
    const candidate = new Date(year, month, day);
    const key = dateKeyFromLocalDate(candidate);
    if (key >= todayKey && key <= horizonKey) keys.push(key);
  }

  return keys;
}

/** Data prevista de conclusão (YYYY-MM-DD) se cair no horizonte e ainda não registrada. */
function upcomingConclusaoDateKey(
  paciente: PacienteCompleto,
  todayKey: string,
  horizonKey: string,
): string | null {
  const plano = paciente.planoTerapeutico;
  if (!plano || !primeiraDoseDoPlano(plano)) return null;
  if ((plano.numeroSemanasTratamento ?? 0) <= 0) return null;

  const ct = plano.conclusaoTratamento as { pesoFinalKg?: number } | undefined;
  if (typeof ct?.pesoFinalKg === 'number') return null;

  const dataConclusao = dataConclusaoPrevisaoPaciente(plano, paciente.evolucaoSeguimento || []);
  if (!dataConclusao) return null;

  const key = dateKeyFromLocalDate(dataConclusao);
  if (key < todayKey || key > horizonKey) return null;
  return key;
}

type MedicoTemplateVars = { medico: string; crm: string };

async function resolveMedicoTemplateVars(doctorId: string): Promise<MedicoTemplateVars> {
  const snap = await getFirestoreAdmin().collection('medicos').doc(doctorId).get();
  const data = snap.data() ?? {};
  const nome = String(data.nome ?? '').trim();
  const genero = data.genero === 'F' ? 'F' : 'M';
  const titulo = genero === 'F' ? 'Dra.' : 'Dr.';
  const crm = data.crm as { numero?: string } | undefined;
  return {
    medico: nome ? `${titulo} ${nome}` : '',
    crm: String(crm?.numero ?? '').trim(),
  };
}

// ── Configuração de marcos ──────────────────────────────────────────────────

type MilestoneConfig = {
  offset: number;
  milestone: WhatsappAutomationMilestone;
  usaLink: boolean;
  checarRegistro: boolean;
  marcoLegado: string;
};

function milestonesForAutomation(automationId: string): MilestoneConfig[] {
  if (automationId === APLICACAO_DIA_WHATSAPP_AUTOMATION_ID) {
    return [
      {
        offset: 0,
        milestone: 'd0',
        usaLink: true,
        checarRegistro: true,
        marcoLegado: 'aplicacao_dia',
      },
    ];
  }
  if (automationId === APLICACAO_D1_AUTOMATION_ID) {
    return [{ offset: -1, milestone: 'd1', usaLink: false, checarRegistro: false, marcoLegado: 'd1' }];
  }
  if (automationId === APLICACAO_ATRASADA_AUTOMATION_ID) {
    return [
      { offset: 1, milestone: 'dplus1', usaLink: true, checarRegistro: true, marcoLegado: 'atraso_d1' },
      { offset: 3, milestone: 'dplus3', usaLink: true, checarRegistro: true, marcoLegado: 'atraso_d3' },
    ];
  }
  if (automationId === INJETAVEL_DIA_WHATSAPP_AUTOMATION_ID) {
    return [
      {
        offset: 0,
        milestone: 'd0',
        usaLink: false,
        checarRegistro: true,
        marcoLegado: 'injetavel_dia',
      },
    ];
  }
  if (automationId === INJETAVEL_D1_WHATSAPP_AUTOMATION_ID) {
    return [
      {
        offset: -1,
        milestone: 'd1',
        usaLink: false,
        checarRegistro: false,
        marcoLegado: 'injetavel_d1',
      },
    ];
  }
  if (isNutriCheckInWhatsappAutomation(automationId)) {
    return [
      {
        offset: 0,
        milestone: 'd0',
        usaLink: true,
        checarRegistro: true,
        marcoLegado: 'nutri_checkin_d0',
      },
      {
        offset: 1,
        milestone: 'dplus1',
        usaLink: true,
        checarRegistro: true,
        marcoLegado: 'nutri_checkin_atrasado',
      },
    ];
  }
  return [];
}

function milestoneMeta(
  milestone: WhatsappAutomationMilestone,
  automationId?: string,
): {
  usaLink: boolean;
  checarRegistro: boolean;
  marcoLegado: string;
} {
  if (automationId && isNutriCheckInWhatsappAutomation(automationId)) {
    if (milestone === 'dplus1') {
      return { usaLink: true, checarRegistro: true, marcoLegado: 'nutri_checkin_atrasado' };
    }
    return { usaLink: true, checarRegistro: true, marcoLegado: 'nutri_checkin_d0' };
  }
  if (automationId && isInjetavelAutomation(automationId)) {
    if (milestone === 'd0') {
      return { usaLink: false, checarRegistro: true, marcoLegado: 'injetavel_dia' };
    }
    if (milestone === 'd1') {
      return { usaLink: false, checarRegistro: false, marcoLegado: 'injetavel_d1' };
    }
  }
  if (milestone === 'd0') {
    return { usaLink: true, checarRegistro: true, marcoLegado: 'aplicacao_dia' };
  }
  if (milestone === 'd1') return { usaLink: false, checarRegistro: false, marcoLegado: 'd1' };
  if (milestone === 'dplus1') return { usaLink: true, checarRegistro: true, marcoLegado: 'atraso_d1' };
  if (milestone === 'birthday') return { usaLink: false, checarRegistro: false, marcoLegado: 'birthday' };
  if (milestone === 'conclusao') return { usaLink: true, checarRegistro: true, marcoLegado: 'conclusao' };
  return { usaLink: true, checarRegistro: true, marcoLegado: 'atraso_d3' };
}

function logTypeParaAutomacao(automationId: string): WhatsappMessageLogType {
  if (automationId === APLICACAO_DIA_WHATSAPP_AUTOMATION_ID) return 'auto_aplicacao';
  if (automationId === APLICACAO_D1_AUTOMATION_ID) return 'aplicacao_d1';
  if (automationId === APLICACAO_ATRASADA_AUTOMATION_ID) return 'aplicacao_atrasada';
  if (automationId === INJETAVEL_DIA_WHATSAPP_AUTOMATION_ID) return 'injetavel_dia';
  if (automationId === INJETAVEL_D1_WHATSAPP_AUTOMATION_ID) return 'injetavel_d1';
  if (automationId === ANIVERSARIO_AUTOMATION_ID) return 'aniversario';
  if (automationId === CONCLUSAO_AUTOMATION_ID) return 'conclusao';
  if (isNutriCheckInWhatsappAutomation(automationId)) return 'nutri_checkin';
  return 'auto_aplicacao';
}

// ═══════════════════════════════════════════════════════════════════════════
// 1) RECONSTRUÇÃO DA FILA (sob demanda / evento — NUNCA no cron de 1 min)
// ═══════════════════════════════════════════════════════════════════════════

export type RebuildQueueResult = {
  doctorId: string;
  automations: number;
  patientsScanned: number;
  enqueued: number;
  updated: number;
  skippedStale?: number;
};

type ReminderSetting = Awaited<ReturnType<typeof listSettingsByDoctorId>>[number];
type OrgAutomationCache = Map<string, Map<string, { enabled: boolean; templateId?: string }>>;

/** Automações da fila otimizada que o médico ativou (lembretes + aniversário + conclusão). */
async function resolveQueueSettingsForDoctor(doctorId: string): Promise<ReminderSetting[]> {
  return (await listSettingsByDoctorId(doctorId)).filter(
    (setting) => isQueueAutomation(setting.automationId) && setting.enabled,
  );
}

/**
 * Núcleo compartilhado: enfileira os lembretes de um conjunto de pacientes já
 * resolvidos (com telefone), para as automações de lembrete ativas do médico.
 * Usado tanto pelo rebuild por médico quanto pelo rebuild por paciente — assim
 * a lógica de marcos (D-1 / D+1 / D+3) vive num só lugar.
 */
async function enqueueRemindersForPatients(params: {
  doctorId: string;
  settings: ReminderSetting[];
  pacientes: Array<{ paciente: PacienteCompleto; telefone: string }>;
  todayKey: string;
  horizonKey: string;
  orgCache?: OrgAutomationCache;
}): Promise<{ enqueued: number; updated: number }> {
  const { doctorId, settings, pacientes, todayKey, horizonKey } = params;
  const orgCache: OrgAutomationCache = params.orgCache ?? new Map();
  let enqueued = 0;
  let updated = 0;

  for (const setting of settings) {
    const orgId = setting.organizationId?.trim();
    if (!orgId) continue;

    let orgMap = orgCache.get(orgId);
    if (!orgMap) {
      const orgSettings = await listSettingsByOrganizationId(orgId);
      orgMap = new Map(orgSettings.map((o) => [o.automationId, { enabled: o.enabled, templateId: o.templateId }]));
      orgCache.set(orgId, orgMap);
    }
    const orgSetting = orgMap.get(setting.automationId);
    if (!orgSetting?.enabled) continue; // organização não liberou

    const templateId = orgSetting.templateId ?? resolveDefaultTemplateIdForAutomation(setting.automationId);
    if (!templateId) continue;

    const horario = normalizeHorario(setting.horario);
    const marcos = milestonesForAutomation(setting.automationId);

    for (const { paciente, telefone } of pacientes) {
      const built = buildSemanasEsquemaDoses(paciente);
      if (!built) continue;

      for (const semana of built.semanas) {
        if (semana.isConclusao || semana.isCancelada || semana.temDoseAplicada) continue;

        const plannedDateKey = dateKeyFromLocalDate(semana.dataExibicao);

        for (const marco of marcos) {
          const scheduledDateKey = addDaysToDateKey(plannedDateKey, marco.offset);
          // Só o dia de hoje em diante e dentro do horizonte (não reenvia passado).
          if (scheduledDateKey < todayKey || scheduledDateKey > horizonKey) continue;

          const result = await enqueueWhatsappAutomationItem({
            automationId: setting.automationId,
            organizationId: orgId,
            doctorId,
            patientId: paciente.id,
            patientName: nomePaciente(paciente),
            phone: telefone,
            dateKey: plannedDateKey,
            scheduledFor: brasiliaWallTimeToInstant(scheduledDateKey, horario),
            scheduledDateKey,
            scheduledTime: horario,
            milestone: marco.milestone,
            templateId,
            semana: semana.semana,
            dose: semana.doseAtual,
          });

          if (result.created) enqueued += 1;
          else if (result.updated) updated += 1;
        }
      }
    }
  }

  return { enqueued, updated };
}

/**
 * Enfileira lembretes de protocolos injetáveis (dia e D-1) a partir de
 * planoTerapeutico.injetaveisAplicacoes.
 */
async function enqueueInjetaveisForPatients(params: {
  doctorId: string;
  settings: ReminderSetting[];
  pacientes: Array<{ paciente: PacienteCompleto; telefone: string }>;
  todayKey: string;
  horizonKey: string;
  orgCache?: OrgAutomationCache;
}): Promise<{ enqueued: number; updated: number }> {
  const { doctorId, settings, pacientes, todayKey, horizonKey } = params;
  const orgCache: OrgAutomationCache = params.orgCache ?? new Map();
  let enqueued = 0;
  let updated = 0;

  const injetavelSettings = settings.filter((s) => isInjetavelAutomation(s.automationId));
  if (injetavelSettings.length === 0) return { enqueued, updated };

  const inicio = parseDateKeyLocal(todayKey);
  // Horizonte + 1 dia para cobrir D-1 de aplicações no último dia da janela.
  const fim = parseDateKeyLocal(addDaysToDateKey(horizonKey, 1));
  fim.setHours(23, 59, 59, 999);

  for (const setting of injetavelSettings) {
    const orgId = setting.organizationId?.trim();
    if (!orgId) continue;

    let orgMap = orgCache.get(orgId);
    if (!orgMap) {
      const orgSettings = await listSettingsByOrganizationId(orgId);
      orgMap = new Map(orgSettings.map((o) => [o.automationId, { enabled: o.enabled, templateId: o.templateId }]));
      orgCache.set(orgId, orgMap);
    }
    const orgSetting = orgMap.get(setting.automationId);
    if (!orgSetting?.enabled) continue;

    const templateId = orgSetting.templateId ?? resolveDefaultTemplateIdForAutomation(setting.automationId);
    if (!templateId) continue;

    const horario = normalizeHorario(setting.horario);
    const marcos = milestonesForAutomation(setting.automationId);

    for (const { paciente, telefone } of pacientes) {
      const apps = listarInjetaveisPlanejadosNoPeriodo(paciente, inicio, fim);
      for (const app of apps) {
        if (app.realizado) continue;

        const plannedDateKey = dateKeyFromLocalDate(app.data);

        for (const marco of marcos) {
          const scheduledDateKey = addDaysToDateKey(plannedDateKey, marco.offset);
          if (scheduledDateKey < todayKey || scheduledDateKey > horizonKey) continue;

          const result = await enqueueWhatsappAutomationItem({
            automationId: setting.automationId,
            organizationId: orgId,
            doctorId,
            patientId: paciente.id,
            patientName: nomePaciente(paciente),
            phone: telefone,
            dateKey: plannedDateKey,
            scheduledFor: brasiliaWallTimeToInstant(scheduledDateKey, horario),
            scheduledDateKey,
            scheduledTime: horario,
            milestone: marco.milestone,
            templateId,
            semana: app.semana,
            dose: 0,
            scopeKey: app.aplicacaoId,
            protocoloNome: app.protocoloNome,
          });

          if (result.created) enqueued += 1;
          else if (result.updated) updated += 1;
        }
      }
    }
  }

  return { enqueued, updated };
}

/**
 * Enfileira mensagens de aniversário para pacientes com data de nascimento
 * dentro do horizonte da fila (próximos 45 dias).
 */
async function enqueueBirthdaysForPatients(params: {
  doctorId: string;
  settings: ReminderSetting[];
  pacientes: Array<{ paciente: PacienteCompleto; telefone: string }>;
  todayKey: string;
  horizonKey: string;
  orgCache?: OrgAutomationCache;
}): Promise<{ enqueued: number; updated: number }> {
  const { doctorId, settings, pacientes, todayKey, horizonKey } = params;
  const orgCache: OrgAutomationCache = params.orgCache ?? new Map();
  let enqueued = 0;
  let updated = 0;

  const birthdaySettings = settings.filter((s) => s.automationId === ANIVERSARIO_AUTOMATION_ID);
  if (birthdaySettings.length === 0) return { enqueued, updated };

  for (const setting of birthdaySettings) {
    const orgId = setting.organizationId?.trim();
    if (!orgId) continue;

    let orgMap = orgCache.get(orgId);
    if (!orgMap) {
      const orgSettings = await listSettingsByOrganizationId(orgId);
      orgMap = new Map(orgSettings.map((o) => [o.automationId, { enabled: o.enabled, templateId: o.templateId }]));
      orgCache.set(orgId, orgMap);
    }
    const orgSetting = orgMap.get(setting.automationId);
    if (!orgSetting?.enabled) continue;

    const templateId = orgSetting.templateId ?? resolveDefaultTemplateIdForAutomation(setting.automationId);
    if (!templateId) continue;

    const horario = normalizeHorario(setting.horario);

    for (const { paciente, telefone } of pacientes) {
      const birthdayKeys = upcomingBirthdayDateKeys(
        paciente.dadosIdentificacao?.dataNascimento,
        todayKey,
        horizonKey,
      );
      if (birthdayKeys.length === 0) continue;

      for (const birthdayKey of birthdayKeys) {
        const result = await enqueueWhatsappAutomationItem({
          automationId: ANIVERSARIO_AUTOMATION_ID,
          organizationId: orgId,
          doctorId,
          patientId: paciente.id,
          patientName: nomePaciente(paciente),
          phone: telefone,
          dateKey: birthdayKey,
          scheduledFor: brasiliaWallTimeToInstant(birthdayKey, horario),
          scheduledDateKey: birthdayKey,
          scheduledTime: horario,
          milestone: 'birthday',
          templateId,
          semana: 0,
          dose: 0,
        });

        if (result.created) enqueued += 1;
        else if (result.updated) updated += 1;
      }
    }
  }

  return { enqueued, updated };
}

/**
 * Enfileira mensagens de conclusão de tratamento para pacientes com data prevista
 * de conclusão dentro do horizonte da fila (mesma regra do calendário).
 */
async function enqueueConclusoesForPatients(params: {
  doctorId: string;
  settings: ReminderSetting[];
  pacientes: Array<{ paciente: PacienteCompleto; telefone: string }>;
  todayKey: string;
  horizonKey: string;
  orgCache?: OrgAutomationCache;
}): Promise<{ enqueued: number; updated: number }> {
  const { doctorId, settings, pacientes, todayKey, horizonKey } = params;
  const orgCache: OrgAutomationCache = params.orgCache ?? new Map();
  let enqueued = 0;
  let updated = 0;

  const conclusaoSettings = settings.filter((s) => s.automationId === CONCLUSAO_AUTOMATION_ID);
  if (conclusaoSettings.length === 0) return { enqueued, updated };

  for (const setting of conclusaoSettings) {
    const orgId = setting.organizationId?.trim();
    if (!orgId) continue;

    let orgMap = orgCache.get(orgId);
    if (!orgMap) {
      const orgSettings = await listSettingsByOrganizationId(orgId);
      orgMap = new Map(orgSettings.map((o) => [o.automationId, { enabled: o.enabled, templateId: o.templateId }]));
      orgCache.set(orgId, orgMap);
    }
    const orgSetting = orgMap.get(setting.automationId);
    if (!orgSetting?.enabled) continue;

    const templateId = orgSetting.templateId ?? resolveDefaultTemplateIdForAutomation(setting.automationId);
    if (!templateId) continue;

    const horario = normalizeHorario(setting.horario);

    for (const { paciente, telefone } of pacientes) {
      const conclusaoKey = upcomingConclusaoDateKey(paciente, todayKey, horizonKey);
      if (!conclusaoKey) continue;

      const result = await enqueueWhatsappAutomationItem({
        automationId: CONCLUSAO_AUTOMATION_ID,
        organizationId: orgId,
        doctorId,
        patientId: paciente.id,
        patientName: nomePaciente(paciente),
        phone: telefone,
        dateKey: conclusaoKey,
        scheduledFor: brasiliaWallTimeToInstant(conclusaoKey, horario),
        scheduledDateKey: conclusaoKey,
        scheduledTime: horario,
        milestone: 'conclusao',
        templateId,
        semana: 0,
        dose: 0,
      });

      if (result.created) enqueued += 1;
      else if (result.updated) updated += 1;
    }
  }

  return { enqueued, updated };
}

async function enqueueAllQueueItemsForPatients(params: {
  doctorId: string;
  settings: ReminderSetting[];
  pacientesReminders: Array<{ paciente: PacienteCompleto; telefone: string }>;
  pacientesBirthday: Array<{ paciente: PacienteCompleto; telefone: string }>;
  pacientesConclusao: Array<{ paciente: PacienteCompleto; telefone: string }>;
  todayKey: string;
  horizonKey: string;
}): Promise<{ enqueued: number; updated: number }> {
  const orgCache: OrgAutomationCache = new Map();
  const reminderSettings = params.settings.filter((s) => isReminderAutomation(s.automationId));
  const injetavelSettings = params.settings.filter((s) => isInjetavelAutomation(s.automationId));
  const birthdaySettings = params.settings.filter((s) => s.automationId === ANIVERSARIO_AUTOMATION_ID);
  const conclusaoSettings = params.settings.filter((s) => s.automationId === CONCLUSAO_AUTOMATION_ID);

  let enqueued = 0;
  let updated = 0;

  if (reminderSettings.length > 0) {
    const reminders = await enqueueRemindersForPatients({
      doctorId: params.doctorId,
      settings: reminderSettings,
      pacientes: params.pacientesReminders,
      todayKey: params.todayKey,
      horizonKey: params.horizonKey,
      orgCache,
    });
    enqueued += reminders.enqueued;
    updated += reminders.updated;
  }

  if (injetavelSettings.length > 0) {
    const injetaveis = await enqueueInjetaveisForPatients({
      doctorId: params.doctorId,
      settings: injetavelSettings,
      pacientes: params.pacientesReminders,
      todayKey: params.todayKey,
      horizonKey: params.horizonKey,
      orgCache,
    });
    enqueued += injetaveis.enqueued;
    updated += injetaveis.updated;
  }

  if (birthdaySettings.length > 0) {
    const birthdays = await enqueueBirthdaysForPatients({
      doctorId: params.doctorId,
      settings: birthdaySettings,
      pacientes: params.pacientesBirthday,
      todayKey: params.todayKey,
      horizonKey: params.horizonKey,
      orgCache,
    });
    enqueued += birthdays.enqueued;
    updated += birthdays.updated;
  }

  if (conclusaoSettings.length > 0) {
    const conclusoes = await enqueueConclusoesForPatients({
      doctorId: params.doctorId,
      settings: conclusaoSettings,
      pacientes: params.pacientesConclusao,
      todayKey: params.todayKey,
      horizonKey: params.horizonKey,
      orgCache,
    });
    enqueued += conclusoes.enqueued;
    updated += conclusoes.updated;
  }

  return { enqueued, updated };
}

/**
 * Remove da fila ativa (pending/processing/failed) quem não está mais em
 * pacientes_completos com este médico responsável — pacientes deletados ou desvinculados.
 */
export async function pruneWhatsappQueueForDoctorUnlinkedPatients(doctorId: string): Promise<{
  skipped: number;
  deleted: number;
  patientIds: string[];
}> {
  const id = doctorId.trim();
  if (!id) return { skipped: 0, deleted: 0, patientIds: [] };
  const snap = await getFirestoreAdmin()
    .collection('pacientes_completos')
    .where('medicoResponsavelId', '==', id)
    .get();
  const rosterIds = new Set(snap.docs.map((d) => d.id));
  const deleted = await deleteWhatsappQueueItemsNotOnRoster(id, rosterIds);
  return {
    skipped: 0,
    deleted: deleted.deleted,
    patientIds: deleted.patientIds,
  };
}

/**
 * Reconstrói a fila de lembretes de um médico (ou nutri/personal) olhando o esquema de doses.
 * Este é o ÚNICO ponto que varre os pacientes — e só roda sob demanda
 * (rota admin ou cron diário leve), não a cada minuto.
 *
 * Para nutri/personal, varre pacientes compartilhados e só enfileira aniversário
 * (demais automações da fila médica não se aplicam).
 */
export async function rebuildWhatsappAutomationQueueForDoctor(
  doctorId: string,
  options?: { professionalRole?: 'nutricionista' | 'personal_trainer' },
): Promise<RebuildQueueResult> {
  const id = doctorId?.trim();
  if (!id) return { doctorId: '', automations: 0, patientsScanned: 0, enqueued: 0, updated: 0 };

  const professionalRole = options?.professionalRole;
  let settings = await resolveQueueSettingsForDoctor(id);
  if (professionalRole === 'personal_trainer') {
    settings = settings.filter((s) => s.automationId === ANIVERSARIO_AUTOMATION_ID);
  } else if (professionalRole === 'nutricionista') {
    settings = settings.filter(
      (s) =>
        s.automationId === ANIVERSARIO_AUTOMATION_ID ||
        s.automationId === NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID,
    );
  }
  if (settings.length === 0) {
    const stale = await pruneWhatsappQueueForDoctorUnlinkedPatients(id);
    return {
      doctorId: id,
      automations: 0,
      patientsScanned: 0,
      enqueued: 0,
      updated: 0,
      skippedStale: stale.deleted || stale.skipped,
    };
  }

  const brasil = getBrasilDateTimeParts();
  const todayKey = brasil.dateKey;
  const horizonKey = addDaysToDateKey(todayKey, QUEUE_HORIZON_DAYS);

  let docs: Array<{ raw: Record<string, unknown>; id: string }> = [];

  if (professionalRole === 'nutricionista' || professionalRole === 'personal_trainer') {
    const vinculoCol =
      professionalRole === 'nutricionista' ? 'paciente_nutricionista' : 'paciente_personal_trainer';
    const ownerField =
      professionalRole === 'nutricionista' ? 'nutricionistaId' : 'personalTrainerId';
    const vinculosSnap = await getFirestoreAdmin()
      .collection(vinculoCol)
      .where(ownerField, '==', id)
      .where('status', '==', 'ativo')
      .get();

    const pacienteIds = [
      ...new Set(
        vinculosSnap.docs
          .map((doc) => {
            const data = doc.data() as Record<string, unknown>;
            return typeof data.pacienteId === 'string' ? data.pacienteId.trim() : '';
          })
          .filter(Boolean),
      ),
    ];

    const db = getFirestoreAdmin();
    for (let i = 0; i < pacienteIds.length; i += 25) {
      const chunk = pacienteIds.slice(i, i + 25);
      await Promise.all(
        chunk.map(async (pacienteId) => {
          const snap = await db.collection('pacientes_completos').doc(pacienteId).get();
          if (!snap.exists) return;
          docs.push({ id: snap.id, raw: snap.data() as Record<string, unknown> });
        }),
      );
    }
  } else {
    const pacientesSnap = await getFirestoreAdmin()
      .collection('pacientes_completos')
      .where('medicoResponsavelId', '==', id)
      .get();

    docs = pacientesSnap.docs.map((doc) => ({
      raw: doc.data() as Record<string, unknown>,
      id: doc.id,
    }));
  }

  const pacientesReminders = professionalRole
    ? []
    : (docs
        .filter((p) => pacienteEmTratamento(p.raw.statusTratamento))
        .map((p) => ({
          paciente: pacienteFromFirestore(p.id, p.raw),
          telefone: extrairTelefonePaciente(p.raw),
        }))
        .filter((p) => !!p.telefone) as Array<{ paciente: PacienteCompleto; telefone: string }>);

  const pacientesBirthday = docs
    .filter((p) => pacienteElegivelAniversario(p.raw.statusTratamento))
    .map((p) => ({
      paciente: pacienteFromFirestore(p.id, p.raw),
      telefone: extrairTelefonePaciente(p.raw),
    }))
    .filter((p) => !!p.telefone) as Array<{ paciente: PacienteCompleto; telefone: string }>;

  const pacientesConclusao = professionalRole
    ? []
    : (docs
        .filter((p) => pacienteElegivelConclusao(p.raw.statusTratamento))
        .map((p) => ({
          paciente: pacienteFromFirestore(p.id, p.raw),
          telefone: extrairTelefonePaciente(p.raw),
        }))
        .filter((p) => !!p.telefone) as Array<{ paciente: PacienteCompleto; telefone: string }>);

  const { enqueued, updated } = await enqueueAllQueueItemsForPatients({
    doctorId: id,
    settings,
    pacientesReminders,
    pacientesBirthday,
    pacientesConclusao,
    todayKey,
    horizonKey,
  });

  let nutriEnqueued = 0;
  let nutriUpdated = 0;
  if (professionalRole === 'nutricionista') {
    const nutriSetting = settings.find((s) => s.automationId === NUTRI_CHECKIN_WHATSAPP_AUTOMATION_ID);
    if (nutriSetting) {
      const nutriPatients = docs.map((p) => ({
        paciente: pacienteFromFirestore(p.id, p.raw),
        telefone: extrairTelefonePaciente(p.raw),
      }));
      const nutri = await enqueueNutriCheckInWhatsAppQueue({
        nutritionistId: id,
        setting: {
          organizationId: nutriSetting.organizationId,
          automationId: nutriSetting.automationId,
        },
        patients: nutriPatients,
        todayKey,
        horizonKey,
      });
      nutriEnqueued = nutri.enqueued;
      nutriUpdated = nutri.updated;
    }
  }

  const scannedIds = new Set(
    [...pacientesReminders, ...pacientesBirthday, ...pacientesConclusao].map((p) => p.paciente.id),
  );
  if (professionalRole === 'nutricionista') {
    for (const doc of docs) scannedIds.add(doc.id);
  }

  const rosterIds = new Set(docs.map((d) => d.id));
  const stale = await skipWhatsappQueueItemsNotOnRoster(id, rosterIds);

  return {
    doctorId: id,
    automations: settings.length,
    patientsScanned: scannedIds.size,
    enqueued: enqueued + nutriEnqueued,
    updated: updated + nutriUpdated,
    skippedStale: stale.skipped,
  };
}

export type RebuildPatientQueueResult = {
  patientId: string;
  doctorId: string;
  eligible: boolean;
  enqueued: number;
  updated: number;
  /** Pendentes órfãos (data antiga) marcados skipped após reconciliar o plano. */
  skippedOrphans?: number;
  reason?: string;
};

function scheduleBoundQueueFingerprint(
  automationId: string,
  dateKey: string,
  milestone: string,
  scopeKey?: string,
): string {
  const scope = (scopeKey || '').trim();
  return scope
    ? `${automationId}|${dateKey}|${milestone}|${scope}`
    : `${automationId}|${dateKey}|${milestone}`;
}

/**
 * Conjunto de fingerprints (automação + data prevista + marco [+ escopo]) que a fila
 * DEVERIA ter para este paciente com o plano atual — D-1/atrasada/injetável/conclusão.
 * Aniversário não entra (não depende das datas de aplicação).
 */
function collectExpectedScheduleBoundFingerprints(params: {
  paciente: PacienteCompleto;
  settings: ReminderSetting[];
  todayKey: string;
  horizonKey: string;
}): Set<string> {
  const { paciente, settings, todayKey, horizonKey } = params;
  const expected = new Set<string>();

  const reminderSettings = settings.filter((s) => isReminderAutomation(s.automationId));
  if (reminderSettings.length > 0 && pacienteEmTratamento(paciente.statusTratamento)) {
    const built = buildSemanasEsquemaDoses(paciente);
    if (built) {
      for (const setting of reminderSettings) {
        const marcos = milestonesForAutomation(setting.automationId);
        for (const semana of built.semanas) {
          if (semana.isConclusao || semana.isCancelada || semana.temDoseAplicada) continue;
          const plannedDateKey = dateKeyFromLocalDate(semana.dataExibicao);
          for (const marco of marcos) {
            const scheduledDateKey = addDaysToDateKey(plannedDateKey, marco.offset);
            if (scheduledDateKey < todayKey || scheduledDateKey > horizonKey) continue;
            expected.add(
              scheduleBoundQueueFingerprint(setting.automationId, plannedDateKey, marco.milestone),
            );
          }
        }
      }
    }
  }

  const injetavelSettings = settings.filter((s) => isInjetavelAutomation(s.automationId));
  if (injetavelSettings.length > 0 && pacienteEmTratamento(paciente.statusTratamento)) {
    const inicio = parseDateKeyLocal(todayKey);
    const fim = parseDateKeyLocal(addDaysToDateKey(horizonKey, 1));
    fim.setHours(23, 59, 59, 999);
    const apps = listarInjetaveisPlanejadosNoPeriodo(paciente, inicio, fim);
    for (const setting of injetavelSettings) {
      const marcos = milestonesForAutomation(setting.automationId);
      for (const app of apps) {
        if (app.realizado) continue;
        const plannedDateKey = dateKeyFromLocalDate(app.data);
        for (const marco of marcos) {
          const scheduledDateKey = addDaysToDateKey(plannedDateKey, marco.offset);
          if (scheduledDateKey < todayKey || scheduledDateKey > horizonKey) continue;
          expected.add(
            scheduleBoundQueueFingerprint(
              setting.automationId,
              plannedDateKey,
              marco.milestone,
              app.aplicacaoId,
            ),
          );
        }
      }
    }
  }

  const conclusaoSettings = settings.filter((s) => s.automationId === CONCLUSAO_AUTOMATION_ID);
  if (conclusaoSettings.length > 0 && pacienteElegivelConclusao(paciente.statusTratamento)) {
    const conclusaoKey = upcomingConclusaoDateKey(paciente, todayKey, horizonKey);
    if (conclusaoKey) {
      for (const setting of conclusaoSettings) {
        expected.add(scheduleBoundQueueFingerprint(setting.automationId, conclusaoKey, 'conclusao'));
      }
    }
  }

  return expected;
}

/**
 * Marca como skipped pendentes de D-1/atrasada/conclusão cuja data prevista
 * não existe mais no plano atual (ex.: médico moveu a aplicação de X para Y).
 */
async function skipOrphanPendingScheduleItemsForPatient(params: {
  patientId: string;
  paciente: PacienteCompleto;
  settings: ReminderSetting[];
  todayKey: string;
  horizonKey: string;
}): Promise<number> {
  const expected = collectExpectedScheduleBoundFingerprints(params);
  const items = await listQueueItemsByPatient(params.patientId);
  let skipped = 0;

  for (const item of items) {
    if (item.status !== 'pending') continue;
    if (item.automationId === ANIVERSARIO_AUTOMATION_ID) continue;
    if (isNutriCheckInWhatsappAutomation(item.automationId)) continue;
    if (isInjetavelAutomation(item.automationId)) continue;
    if (!isQueueAutomation(item.automationId)) continue;

    const fingerprint = scheduleBoundQueueFingerprint(
      item.automationId,
      item.dateKey,
      item.milestone,
      item.scopeKey,
    );
    if (expected.has(fingerprint)) continue;

    await markQueueItemSkipped(
      item.id,
      'Data de aplicação alterada no plano terapêutico.',
    );
    skipped += 1;
  }

  return skipped;
}

/**
 * Tira da fila os lembretes de injetável que não existem mais no plano
 * (protocolo apagado, semana cancelada ou data antiga). Enviados permanecem.
 */
async function apagarInjetaveisOrfaosDaFila(params: {
  patientId: string;
  paciente: PacienteCompleto;
  expected?: Set<string>;
}): Promise<number> {
  const ids = idsProtocolosInjetaveis(params.paciente.planoTerapeutico);
  const items = await listQueueItemsByPatient(params.patientId);
  const toDelete = items
    .filter((item) => {
      if (item.status === 'sent') return false;
      if (!isInjetavelAutomation(item.automationId)) return false;
      const scope = (item.scopeKey || '').trim();
      if (!scope || !ids.has(scope)) return true;
      if (!params.expected) return false;
      const fingerprint = scheduleBoundQueueFingerprint(
        item.automationId,
        item.dateKey,
        item.milestone,
        item.scopeKey,
      );
      return !params.expected.has(fingerprint);
    })
    .map((item) => item.id);
  if (toDelete.length === 0) return 0;
  return deleteWhatsappQueueItemsByIds(toDelete);
}

/**
 * Reconstrói a fila de UM paciente (gatilho leve: salvar plano / registrar aplicação).
 * Lê só o doc do paciente + os settings do médico — NÃO varre os demais pacientes.
 * Reconcilia órfãos: pendentes de aplicação com data antiga saem da fila (skipped).
 * Injetáveis cujo protocolo foi apagado são removidos da fila.
 */
export async function rebuildWhatsappAutomationQueueForPatient(
  patientId: string,
  options: { expectedDoctorId?: string } = {},
): Promise<RebuildPatientQueueResult> {
  const pid = patientId?.trim();
  if (!pid) {
    return { patientId: '', doctorId: '', eligible: false, enqueued: 0, updated: 0, reason: 'patientId vazio' };
  }

  const snap = await getFirestoreAdmin().collection('pacientes_completos').doc(pid).get();
  if (!snap.exists) {
    return { patientId: pid, doctorId: '', eligible: false, enqueued: 0, updated: 0, reason: 'Paciente não encontrado.' };
  }

  const raw = snap.data() as Record<string, unknown>;
  const doctorId = String(raw.medicoResponsavelId ?? '').trim();
  if (!doctorId) {
    return { patientId: pid, doctorId: '', eligible: false, enqueued: 0, updated: 0, reason: 'Paciente sem médico responsável.' };
  }
  const expectedDoctor = options.expectedDoctorId?.trim();
  if (expectedDoctor && expectedDoctor !== doctorId) {
    return { patientId: pid, doctorId, eligible: false, enqueued: 0, updated: 0, reason: 'Paciente não pertence a este médico.' };
  }

  const paciente = pacienteFromFirestore(pid, raw);
  const encerrar = async (result: {
    eligible: boolean;
    enqueued: number;
    updated: number;
    skippedOrphans?: number;
    reason?: string;
    expected?: Set<string>;
  }): Promise<RebuildPatientQueueResult> => {
    const removed = await apagarInjetaveisOrfaosDaFila({
      patientId: pid,
      paciente,
      expected: result.expected,
    });
    return {
      patientId: pid,
      doctorId,
      eligible: result.eligible,
      enqueued: result.enqueued,
      updated: result.updated,
      skippedOrphans: (result.skippedOrphans ?? 0) + removed,
      reason: result.reason,
    };
  };

  if (
    !pacienteEmTratamento(raw.statusTratamento) &&
    !pacienteElegivelAniversario(raw.statusTratamento) &&
    !pacienteElegivelConclusao(raw.statusTratamento)
  ) {
    return encerrar({
      eligible: false,
      enqueued: 0,
      updated: 0,
      reason: 'Paciente não elegível para automações.',
    });
  }
  const telefone = extrairTelefonePaciente(raw);
  if (!telefone) {
    return encerrar({
      eligible: false,
      enqueued: 0,
      updated: 0,
      reason: 'Paciente sem telefone válido.',
    });
  }

  const settings = await resolveQueueSettingsForDoctor(doctorId);
  if (settings.length === 0) {
    return encerrar({
      eligible: true,
      enqueued: 0,
      updated: 0,
      reason: 'Médico sem automações ativas na fila.',
    });
  }

  const brasil = getBrasilDateTimeParts();
  const todayKey = brasil.dateKey;
  const horizonKey = addDaysToDateKey(todayKey, QUEUE_HORIZON_DAYS);

  const entry = { paciente, telefone };
  const pacientesReminders = pacienteEmTratamento(raw.statusTratamento) ? [entry] : [];
  const pacientesBirthday = pacienteElegivelAniversario(raw.statusTratamento) ? [entry] : [];
  const pacientesConclusao = pacienteElegivelConclusao(raw.statusTratamento) ? [entry] : [];

  const { enqueued, updated } = await enqueueAllQueueItemsForPatients({
    doctorId,
    settings,
    pacientesReminders,
    pacientesBirthday,
    pacientesConclusao,
    todayKey,
    horizonKey,
  });

  const skippedOrphans = await skipOrphanPendingScheduleItemsForPatient({
    patientId: pid,
    paciente,
    settings,
    todayKey,
    horizonKey,
  });

  return encerrar({
    eligible: true,
    enqueued,
    updated,
    skippedOrphans,
    expected: collectExpectedScheduleBoundFingerprints({
      paciente,
      settings,
      todayKey,
      horizonKey,
    }),
  });
}

/**
 * Gatilho ao alterar datas de aplicação no plano: reconstrói a fila do paciente
 * e remove pendentes órfãos. Tolerante a falha — NUNCA lança.
 */
export async function onPlanoScheduleChangedMaintainQueue(
  patientId: string,
  options: { expectedDoctorId?: string } = {},
): Promise<{ rebuild?: RebuildPatientQueueResult }> {
  try {
    const rebuild = await rebuildWhatsappAutomationQueueForPatient(patientId, options);
    return { rebuild };
  } catch (error) {
    console.error('[whatsapp-queue][onPlanoScheduleChanged]', error);
    return {};
  }
}

/**
 * Marca como 'skipped' os itens PENDENTES da semana registrada — evita enviar
 * D-1 / atrasada de uma aplicação que o paciente já fez. Barato: lê só a fila
 * daquele paciente (índice de campo único patientId) e filtra em memória.
 */
export async function skipPendingRemindersForApplication(
  patientId: string,
  semana: number,
): Promise<{ skipped: number }> {
  const pid = patientId?.trim();
  if (!pid || !Number.isFinite(semana)) return { skipped: 0 };

  const items = await listQueueItemsByPatient(pid);
  let skipped = 0;
  for (const item of items) {
    if (item.status !== 'pending' || item.semana !== semana) continue;
    // Só lembretes de tirzepatida/atrasada — injetáveis têm escopo próprio.
    if (!isReminderAutomation(item.automationId)) continue;
    await markQueueItemSkipped(item.id, 'Aplicação registrada pelo paciente.');
    skipped += 1;
  }
  return { skipped };
}

/**
 * Gatilho ao registrar aplicação: pula itens pendentes da semana e reconstrói a
 * fila só daquele paciente. Tolerante a falha — NUNCA lança (não pode quebrar o
 * fluxo de registro do paciente).
 */
export async function onAplicacaoRegistradaMaintainQueue(
  patientId: string,
  semana: number,
): Promise<{ skipped: number; rebuild?: RebuildPatientQueueResult }> {
  try {
    const { skipped } = await skipPendingRemindersForApplication(patientId, semana);
    const rebuild = await rebuildWhatsappAutomationQueueForPatient(patientId);
    return { skipped, rebuild };
  } catch (error) {
    console.error('[whatsapp-queue][onAplicacaoRegistrada]', error);
    return { skipped: 0 };
  }
}

/** Reconstrói a fila para todos os médicos com lembrete ativo (uso manual/controlado). */
export async function rebuildWhatsappAutomationQueueForOrganization(
  organizationId?: string,
): Promise<{ doctors: number; enqueued: number; updated: number; results: RebuildQueueResult[] }> {
  const all = await listAllAutomationDoctorSettings();
  const byDoctor = new Map<string, (typeof all)[number]>();
  for (const setting of all) {
    if (
      !isQueueAutomation(setting.automationId) ||
      !setting.enabled ||
      (organizationId && setting.organizationId !== organizationId)
    ) {
      continue;
    }
    if (!byDoctor.has(setting.doctorId)) byDoctor.set(setting.doctorId, setting);
  }

  const results: RebuildQueueResult[] = [];
  let enqueued = 0;
  let updated = 0;
  for (const [doctorId, sample] of byDoctor) {
    const role = resolveSettingProfessionalRole(sample);
    const result = await rebuildWhatsappAutomationQueueForDoctor(
      doctorId,
      role === 'nutricionista' || role === 'personal_trainer' ? { professionalRole: role } : undefined,
    );
    results.push(result);
    enqueued += result.enqueued;
    updated += result.updated;
  }

  return { doctors: byDoctor.size, enqueued, updated, results };
}

// ═══════════════════════════════════════════════════════════════════════════
// 2) CONSUMO DA FILA (cron de 1 min — só itens vencidos, sem scan)
// ═══════════════════════════════════════════════════════════════════════════

function legacyDedupId(item: WhatsappAutomationQueueItem, marcoLegado: string): string {
  return `${item.doctorId}_${item.patientId}_${item.automationId}_${item.semana}_${marcoLegado}`;
}

async function jaEnviadoLegado(dedupId: string): Promise<boolean> {
  const snap = await getFirestoreAdmin().collection(LEGACY_DEDUP_COLLECTION).doc(dedupId).get();
  return snap.exists && snap.data()?.status === 'sent';
}

/** Dedup de cutover: envios já feitos pelo cron legado aplicação do dia. */
async function jaEnviadoAutoAplicacaoDiaLegado(item: WhatsappAutomationQueueItem): Promise<boolean> {
  if (item.automationId !== APLICACAO_DIA_WHATSAPP_AUTOMATION_ID) {
    return false;
  }
  const id = buildWhatsappAutoAplicacaoEnvioId(
    item.doctorId,
    item.patientId,
    item.dateKey,
    item.semana,
  );
  const snap = await getFirestoreAdmin().collection('whatsapp_auto_aplicacao_envios').doc(id).get();
  return snap.exists && snap.data()?.status === 'sent';
}

async function registrarDedupLegado(
  dedupId: string,
  item: WhatsappAutomationQueueItem,
  status: 'sent' | 'failed',
  errorMessage?: string,
): Promise<void> {
  await getFirestoreAdmin()
    .collection(LEGACY_DEDUP_COLLECTION)
    .doc(dedupId)
    .set(
      {
        medicoId: item.doctorId,
        automationId: item.automationId,
        pacienteId: item.patientId,
        semana: item.semana,
        dose: item.dose,
        aplicacaoData: item.dateKey,
        status,
        sentAt: Timestamp.now(),
        errorMessage: errorMessage ?? null,
      },
      { merge: true },
    );
}

/** Lê o paciente e decide se o lembrete de aplicação ainda deve sair. */
async function lerDecisaoLembreteAplicacao(
  patientId: string,
  semana: number,
): Promise<ReturnType<typeof decisaoLembreteAplicacaoWhatsapp> | null> {
  const snap = await getFirestoreAdmin().collection('pacientes_completos').doc(patientId).get();
  if (!snap.exists) return null;
  const paciente = pacienteFromFirestore(snap.id, snap.data() as Record<string, unknown>);
  return decisaoLembreteAplicacaoWhatsapp(paciente, semana);
}

/**
 * Tira da fila os lembretes de aplicação (dia, véspera e atraso) ainda não enviados.
 * Aniversário, injetáveis e itens já enviados permanecem.
 */
export async function apagarFilaWhatsappAplicacaoDoPaciente(
  patientId: string,
  options: { expectedDoctorId?: string } = {},
): Promise<{ deleted: number }> {
  const pid = patientId?.trim();
  if (!pid) return { deleted: 0 };

  const snap = await getFirestoreAdmin().collection('pacientes_completos').doc(pid).get();
  if (!snap.exists) return { deleted: 0 };

  const doctorId = String(snap.data()?.medicoResponsavelId ?? '').trim();
  const expected = options.expectedDoctorId?.trim();
  if (expected && expected !== doctorId) {
    throw new Error('Paciente não pertence a este médico.');
  }

  return deleteWhatsappQueueItemsForPatient({
    patientId: pid,
    automationIds: REMINDER_AUTOMATION_IDS,
    keepSent: true,
  });
}

async function lerDecisaoLembreteInjetavel(
  patientId: string,
  aplicacaoId: string | undefined,
  semana: number,
): Promise<ReturnType<typeof decisaoLembreteInjetavelWhatsapp> | null> {
  const snap = await getFirestoreAdmin().collection('pacientes_completos').doc(patientId).get();
  if (!snap.exists) return null;
  const paciente = pacienteFromFirestore(snap.id, snap.data() as Record<string, unknown>);
  return decisaoLembreteInjetavelWhatsapp(paciente, aplicacaoId, semana);
}

/** Paciente já preencheu a conclusão do tratamento (peso final registrado). */
async function conclusaoJaRegistrada(patientId: string): Promise<boolean | null> {
  const snap = await getFirestoreAdmin().collection('pacientes_completos').doc(patientId).get();
  if (!snap.exists) return null;
  const plano = (snap.data() as Record<string, unknown>)?.planoTerapeutico as
    | { conclusaoTratamento?: { pesoFinalKg?: number } }
    | undefined;
  const peso = plano?.conclusaoTratamento?.pesoFinalKg;
  return typeof peso === 'number' && peso > 0;
}

/**
 * Double-check: verifica se a data prevista de conclusão do paciente ainda é
 * a mesma que foi enfileirada. Se o médico alterou o plano e a data mudou,
 * o item deve ser pulado — um novo item será enfileirado no próximo rebuild.
 * Retorna null se o paciente não foi encontrado.
 */
async function dataConclusaoAindaCorresponde(
  patientId: string,
  enqueuedDateKey: string,
): Promise<boolean | null> {
  const snap = await getFirestoreAdmin().collection('pacientes_completos').doc(patientId).get();
  if (!snap.exists) return null;
  const paciente = pacienteFromFirestore(snap.id, snap.data() as Record<string, unknown>);
  const dataPrevista = upcomingConclusaoDateKey(paciente, '0000-00-00', '9999-99-99');
  if (!dataPrevista) {
    // Plano sem data prevista de conclusão — data enfileirada não é mais válida.
    return false;
  }
  return dataPrevista === enqueuedDateKey;
}

async function resolvePacienteVinculoWhatsappQueue(
  patientId: string,
  doctorId: string,
): Promise<'ok' | 'missing' | 'unlinked'> {
  const pid = patientId.trim();
  if (!pid) return 'missing';
  const snap = await getFirestoreAdmin().collection('pacientes_completos').doc(pid).get();
  if (!snap.exists) return 'missing';
  const rid = String(snap.data()?.medicoResponsavelId ?? '').trim();
  if (rid !== doctorId.trim()) return 'unlinked';
  return 'ok';
}

async function registrarLog(
  item: WhatsappAutomationQueueItem,
  status: 'sent' | 'failed',
  message: string,
  errorMessage?: string,
): Promise<void> {
  await registrarWhatsappMessageLog({
    medicoId: item.doctorId,
    type: logTypeParaAutomacao(item.automationId),
    status,
    phone: item.phone,
    message,
    pacienteId: item.patientId,
    pacienteNome: item.patientName,
    aplicacaoData: item.dateKey,
    semana: item.semana,
    dose: item.dose,
    errorMessage,
    docId: `queue_${item.id}`,
  });
}

export type ProcessQueueResult = {
  queueItemsRead: number;
  sentCount: number;
  skippedCount: number;
  failedCount: number;
  firestoreReadsEstimated: number;
  durationMs: number;
};

/**
 * Consome a fila: lê só itens vencidos (status pending, scheduledFor <= now),
 * revalida governança/conexão/template, envia e marca o resultado.
 * NÃO varre pacientes_completos nem automationDoctorSettings inteiros.
 */
export async function processDueWhatsappAutomationQueue(options: {
  now?: Date;
  limit?: number;
} = {}): Promise<ProcessQueueResult> {
  const start = Date.now();
  const now = options.now ?? new Date();
  const limit = options.limit ?? 10;

  const items = await listDueWhatsappAutomationItems(now, limit);

  // Proteção de custo: fila vazia → encerra IMEDIATAMENTE.
  // Não carrega templates, médicos, organizações nem pacientes.
  if (items.length === 0) {
    const empty: ProcessQueueResult = {
      queueItemsRead: 0,
      sentCount: 0,
      skippedCount: 0,
      failedCount: 0,
      firestoreReadsEstimated: 1, // apenas a query da fila
      durationMs: Date.now() - start,
    };
    console.log('[whatsapp-lembretes][audit]', JSON.stringify(empty));
    return empty;
  }

  let sentCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let reads = Math.max(1, items.length); // custo aproximado da query da fila

  // Caches por execução para não reler os mesmos docs.
  const orgCache = new Map<string, Map<string, { enabled: boolean; templateId?: string }>>();
  const connCache = new Map<string, Awaited<ReturnType<typeof getWhatsappConnectionByDoctor>>>();
  const templateCache = new Map<string, Awaited<ReturnType<typeof getAutomationTemplateById>>>();
  const medicoCache = new Map<string, MedicoTemplateVars>();
  const profilePhoneCache = new Map<string, string[]>();
  const canalChatCache: { value?: Awaited<ReturnType<typeof getWhatsappConnectionByDoctor>> | null } =
    {};
  /** Médicos cuja sessão quebrou nesta execução — evita martelar o WPP e marca o restante. */
  const brokenSessionDoctors = new Set<string>();

  for (const item of items) {
    const meta = milestoneMeta(item.milestone, item.automationId);
    try {
      if (brokenSessionDoctors.has(item.doctorId)) {
        await markQueueItemFailed(
          item.id,
          'WhatsApp precisa reconectar (sessão detectada como instável nesta execução).',
        );
        failedCount += 1;
        continue;
      }

      const vinculo = await resolvePacienteVinculoWhatsappQueue(item.patientId, item.doctorId);
      reads += 1;
      if (vinculo === 'missing') {
        await markQueueItemSkipped(item.id, WHATSAPP_QUEUE_SKIP_PACIENTE_NAO_ENCONTRADO);
        skippedCount += 1;
        continue;
      }
      if (vinculo === 'unlinked' && isMedicoPacienteOwnedAutomation(item.automationId)) {
        await markQueueItemSkipped(item.id, WHATSAPP_QUEUE_SKIP_PACIENTE_FORA_DO_QUADRO);
        skippedCount += 1;
        continue;
      }

      // (a) organização ainda liberada
      let orgMap = orgCache.get(item.organizationId);
      if (!orgMap) {
        const orgSettings = await listSettingsByOrganizationId(item.organizationId);
        reads += 1;
        orgMap = new Map(orgSettings.map((o) => [o.automationId, { enabled: o.enabled, templateId: o.templateId }]));
        orgCache.set(item.organizationId, orgMap);
      }
      if (!orgMap.get(item.automationId)?.enabled) {
        await markQueueItemSkipped(item.id, 'Organização não libera mais esta automação.');
        skippedCount += 1;
        continue;
      }

      // (b) médico ainda ativou
      const doctorSetting = await getAutomationDoctorSetting(item.doctorId, item.automationId);
      reads += 1;
      if (!doctorSetting?.enabled) {
        await markQueueItemSkipped(item.id, 'Médico desativou esta automação.');
        skippedCount += 1;
        continue;
      }

      // (c) WhatsApp conectado
      let connection = connCache.get(item.doctorId);
      if (connection === undefined) {
        connection = await getWhatsappConnectionByDoctor(item.doctorId);
        reads += 1;
        connCache.set(item.doctorId, connection);
      }
      if (!connection || connection.status !== 'connected') {
        await markQueueItemSkipped(item.id, 'WhatsApp não está conectado.');
        skippedCount += 1;
        continue;
      }

      // (d) template publicado
      let template = templateCache.get(item.templateId);
      if (template === undefined) {
        template = await getAutomationTemplateById(item.templateId);
        reads += 1;
        templateCache.set(item.templateId, template);
      }
      if (!template?.body || template.status !== 'published') {
        await markQueueItemSkipped(item.id, 'Template não está publicado.');
        skippedCount += 1;
        continue;
      }

      // (e) pular se o paciente já registrou (aplicação, conclusão ou check-in nutri)
      let nutriLink: string | undefined;
      if (meta.checarRegistro) {
        if (isNutriCheckInWhatsappAutomation(item.automationId)) {
          const decision = await revalidateNutriCheckInWhatsAppQueueItem(item);
          reads += decision.reads;
          if (!decision.send) {
            await markQueueItemSkipped(item.id, decision.skipReason || 'Check-in Semanal não elegível.');
            skippedCount += 1;
            continue;
          }
          nutriLink = decision.linkUrl;
        } else if (item.automationId === CONCLUSAO_AUTOMATION_ID) {
          const registrada = await conclusaoJaRegistrada(item.patientId);
          reads += 1;
          if (registrada === null) {
            await markQueueItemSkipped(item.id, 'Paciente não encontrado.');
            skippedCount += 1;
            continue;
          }
          if (registrada) {
            await markQueueItemSkipped(item.id, 'Conclusão já registrada pelo paciente.');
            skippedCount += 1;
            continue;
          }

          // (e2) double-check: data prevista de conclusão mudou após enfileiramento.
          const dataCorresponde = await dataConclusaoAindaCorresponde(item.patientId, item.dateKey);
          reads += 1;
          if (dataCorresponde === null) {
            await markQueueItemSkipped(item.id, 'Paciente não encontrado (double-check data).');
            skippedCount += 1;
            continue;
          }
          if (!dataCorresponde) {
            await markQueueItemSkipped(
              item.id,
              'Data prevista de conclusão foi alterada no plano. Um novo envio será reagendado automaticamente.',
            );
            skippedCount += 1;
            continue;
          }
        }
      }

      if (isInjetavelAutomation(item.automationId)) {
        const decisaoInjetavel = await lerDecisaoLembreteInjetavel(
          item.patientId,
          item.scopeKey,
          item.semana,
        );
        reads += 1;
        if (decisaoInjetavel === null) {
          await markQueueItemSkipped(item.id, 'Paciente não encontrado.');
          skippedCount += 1;
          continue;
        }
        if (decisaoInjetavel.pular) {
          if (decisaoInjetavel.sairDaFila) {
            await deleteWhatsappQueueItem(item.id);
          } else {
            await markQueueItemSkipped(item.id, decisaoInjetavel.motivo);
          }
          skippedCount += 1;
          continue;
        }
        if (meta.checarRegistro && decisaoInjetavel.realizada) {
          await markQueueItemSkipped(item.id, 'Injetável já marcado como aplicado pelo médico.');
          skippedCount += 1;
          continue;
        }
      }

      if (isReminderAutomation(item.automationId)) {
        const decisao = await lerDecisaoLembreteAplicacao(item.patientId, item.semana);
        reads += 1;
        if (decisao === null) {
          await markQueueItemSkipped(item.id, 'Paciente não encontrado.');
          skippedCount += 1;
          continue;
        }
        if (decisao.pular) {
          await markQueueItemSkipped(item.id, decisao.motivo);
          skippedCount += 1;
          continue;
        }
        if (meta.checarRegistro && decisao.registrada) {
          await markQueueItemSkipped(item.id, 'Aplicação já registrada pelo paciente.');
          skippedCount += 1;
          continue;
        }
      }

      // (f) dedup legado (segurança)
      const dedupId = legacyDedupId(item, meta.marcoLegado);
      if (await jaEnviadoLegado(dedupId)) {
        reads += 1;
        await markQueueItemSkipped(item.id, 'Já enviado (dedup legado).');
        skippedCount += 1;
        continue;
      }
      reads += 1;

      // (f2) cutover: já enviado pelo motor legado aplicação do dia
      if (await jaEnviadoAutoAplicacaoDiaLegado(item)) {
        reads += 1;
        await markQueueItemSkipped(item.id, 'Já enviado (motor legado aplicação do dia).');
        skippedCount += 1;
        continue;
      }
      if (item.automationId === APLICACAO_DIA_WHATSAPP_AUTOMATION_ID || item.milestone === 'd0') {
        reads += 1;
      }

      // (g) montar e enviar
      const vars: Record<string, string> = { nome: primeiroNomePaciente(item.patientName) };
      if (isInjetavelAutomation(item.automationId)) {
        vars.protocolo = (item.protocoloNome || '').trim() || 'seu protocolo injetável';
      }
      if (item.automationId === ANIVERSARIO_AUTOMATION_ID) {
        let medicoVars = medicoCache.get(item.doctorId);
        if (!medicoVars) {
          medicoVars = await resolveMedicoTemplateVars(item.doctorId);
          reads += 1;
          medicoCache.set(item.doctorId, medicoVars);
        }
        vars.medico = medicoVars.medico;
        vars.crm = medicoVars.crm;
      }
      let link: string | undefined;
      if (meta.usaLink) {
        if (nutriLink) {
          link = nutriLink;
        } else if (item.automationId === CONCLUSAO_AUTOMATION_ID) {
          link = await ensureConclusaoPublicUrl(getFirestoreAdmin(), {
            pacienteId: item.patientId,
            data: parseDateKeyLocal(item.dateKey),
            medicoId: item.doctorId,
          });
        } else if (!isNutriCheckInWhatsappAutomation(item.automationId)) {
          link = await ensureAplicacaoPublicUrl(getFirestoreAdmin(), {
            pacienteId: item.patientId,
            data: parseDateKeyLocal(item.dateKey),
            semana: item.semana,
            dose: item.dose,
          });
        }
        if (link) vars.link = link;
      }
      const message =
        isNutriCheckInWhatsappAutomation(item.automationId) && link
          ? buildNutriCheckInWhatsAppMessage({
              pacienteNome: item.patientName,
              url: link,
              kind: item.milestone === 'dplus1' ? 'atrasado' : 'd0',
            })
          : renderAutomationTemplate(template.body, vars);

      await sendPatientAutomationWhatsapp({
        ownerId: item.doctorId,
        ownerSessionId: connection.sessionId,
        ownerConnectedPhone: connection.phone,
        phone: item.phone,
        message,
        profilePhoneCache,
        canalChatCache,
      });

      await markQueueItemSent(item.id, link);
      await registrarDedupLegado(dedupId, item, 'sent');
      await registrarLog(item, 'sent', message);
      sentCount += 1;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao enviar lembrete automático.';
      await markQueueItemFailed(item.id, errorMessage);
      await registrarLog(item, 'failed', '', errorMessage).catch(() => undefined);
      failedCount += 1;

      // Sessão “fantasma”: Firestore diz connected, mas o envio falhou por saúde da sessão.
      if (isWhatsappSessionHealthFailure(error)) {
        const routedViaCanalChat =
          error instanceof WhatsappPatientSendError && error.routedViaCanalChat;
        const senderOwnerId =
          error instanceof WhatsappPatientSendError ? error.senderOwnerId : item.doctorId;
        if (!routedViaCanalChat) {
          brokenSessionDoctors.add(item.doctorId);
          connCache.set(item.doctorId, null);
        }
        await flagWhatsappSessionBrokenFromSendFailure({
          doctorId: senderOwnerId,
          errorMessage,
          errorCode: error instanceof WhatsappPatientSendError ? error.code : undefined,
        }).catch((notifyError) => {
          console.warn('[whatsapp-lembretes] flag session broken:', notifyError);
        });
      }
    }
  }

  const result: ProcessQueueResult = {
    queueItemsRead: items.length,
    sentCount,
    skippedCount,
    failedCount,
    firestoreReadsEstimated: reads,
    durationMs: Date.now() - start,
  };

  console.log('[whatsapp-lembretes][audit]', JSON.stringify(result));
  return result;
}
