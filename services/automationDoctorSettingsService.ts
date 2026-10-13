import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  automationAllowsProfessionalRole,
  getAutomationDefinitionById,
  listAutomationCenterCatalog,
  listProfessionalActivatableCatalog,
} from '@/lib/metaadmingeral/automationCenterCatalog';
import { resolveDefaultTemplateIdForAutomation } from '@/lib/metaadmingeral/automationOrganizationSettings';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { isMedicoEventAutomationId } from '@/lib/whatsapp/canalChatTemplates';
import { buildAutomationTemplatePreviewBody } from '@/lib/metaadmingeral/automationCenterTemplates';
import { listSettingsByOrganizationId } from '@/services/automationOrganizationSettingsService';
import { getAutomationTemplateById } from '@/services/automationTemplatesService';
import type {
  AutomationChannel,
  AutomationDoctorSetting,
  AutomationProfessionalRole,
  DoctorAutomationItemDto,
} from '@/types/automationCenter';

const COLLECTION = 'automationDoctorSettings';

export type ProfessionalAutomationRole = Extract<
  AutomationProfessionalRole,
  'nutricionista' | 'personal_trainer'
>;

/** Nomes amigáveis no painel MetaNutri / MetaPersonal. */
const PROFESSIONAL_DISPLAY_NAMES: Record<string, string> = {
  aniversario_paciente_whatsapp: 'Aniversário',
  nutri_checkin_semanal_whatsapp: 'Check-in Semanal Nutri',
  cobranca_automatica_whatsapp: 'Pagamento',
};

export function buildAutomationDoctorSettingId(doctorId: string, automationId: string): string {
  return `${doctorId}_${automationId}`;
}

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

function parseProfessionalRole(value: unknown): AutomationProfessionalRole | undefined {
  if (value === 'medico' || value === 'nutricionista' || value === 'personal_trainer') {
    return value;
  }
  return undefined;
}

function docToSetting(docId: string, data: Record<string, unknown>): AutomationDoctorSetting {
  const doctorId = String(data.doctorId ?? '');
  const automationId = String(data.automationId ?? '');
  const automation = getAutomationDefinitionById(automationId);

  return {
    id: docId || buildAutomationDoctorSettingId(doctorId, automationId),
    doctorId,
    organizationId: String(data.organizationId ?? ''),
    automationId,
    enabled: data.enabled === true,
    channel: (data.channel as AutomationChannel) ?? automation?.channel ?? 'whatsapp',
    templateId: typeof data.templateId === 'string' ? data.templateId : undefined,
    horario: typeof data.horario === 'string' ? data.horario : undefined,
    professionalRole: parseProfessionalRole(data.professionalRole),
    createdAt: (toDate(data.createdAt) ?? new Date()).toISOString(),
    updatedAt: (toDate(data.updatedAt) ?? new Date()).toISOString(),
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : undefined,
    templateBody: typeof data.templateBody === 'string' ? data.templateBody : undefined,
  };
}

export function resolveSettingProfessionalRole(
  setting: AutomationDoctorSetting,
): AutomationProfessionalRole {
  return setting.professionalRole ?? 'medico';
}

export async function listSettingsByDoctorId(doctorId: string): Promise<AutomationDoctorSetting[]> {
  const id = doctorId?.trim();
  if (!id) return [];

  const snap = await getFirestoreAdmin()
    .collection(COLLECTION)
    .where('doctorId', '==', id)
    .get();

  return snap.docs.map((doc) => docToSetting(doc.id, doc.data() as Record<string, unknown>));
}

export async function listAllAutomationDoctorSettings(): Promise<AutomationDoctorSetting[]> {
  const snap = await getFirestoreAdmin().collection(COLLECTION).get();
  return snap.docs.map((doc) => docToSetting(doc.id, doc.data() as Record<string, unknown>));
}

export async function getAutomationDoctorSetting(
  doctorId: string,
  automationId: string,
): Promise<AutomationDoctorSetting | undefined> {
  const docId = buildAutomationDoctorSettingId(doctorId.trim(), automationId.trim());
  const snap = await getFirestoreAdmin().collection(COLLECTION).doc(docId).get();
  if (!snap.exists) return undefined;
  return docToSetting(snap.id, snap.data() as Record<string, unknown>);
}

/**
 * True se a automação está habilitada para o profissional.
 * Sem documento: usa `defaultIfMissing` (Lembretes/Relacionamento = true).
 */
export async function isProfessionalAutomationEnabled(
  ownerId: string,
  automationId: string,
  options?: { defaultIfMissing?: boolean },
): Promise<boolean> {
  const setting = await getAutomationDoctorSetting(ownerId, automationId);
  if (!setting) return options?.defaultIfMissing === true;
  return setting.enabled === true;
}

async function isAutomationEnabledForOrganization(
  organizationId: string,
  automationId: string,
): Promise<boolean> {
  const settings = await listSettingsByOrganizationId(organizationId);
  return settings.some((item) => item.automationId === automationId && item.enabled);
}

export async function listDoctorActivatableAutomations(
  doctorId: string,
  organizationId: string,
): Promise<DoctorAutomationItemDto[]> {
  const orgId = organizationId.trim();
  const orgSettings = await listSettingsByOrganizationId(orgId);
  const doctorSettings = await listSettingsByDoctorId(doctorId);
  const doctorByAutomation = new Map(doctorSettings.map((item) => [item.automationId, item]));

  const items: DoctorAutomationItemDto[] = [];

  for (const orgSetting of orgSettings) {
    if (!orgSetting.enabled) continue;

    const automation = getAutomationDefinitionById(orgSetting.automationId);
    if (!automation?.allowDoctorActivation) continue;

    const doctorSetting = doctorByAutomation.get(orgSetting.automationId);

    items.push({
      automationId: automation.id,
      name: automation.name,
      description: automation.description,
      channel: automation.channel,
      category: automation.category,
      enabledByDoctor: doctorSetting?.enabled === true,
      templateId: orgSetting.templateId ?? resolveDefaultTemplateIdForAutomation(automation.id),
      usesLegacyWhatsappConfig: false,
    });
  }

  return items.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/**
 * Cards da Central de Comunicação do médico.
 * Inclui automações liberadas E bloqueadas pela organização (para exibir status),
 * enriquecidas com status da plataforma, template e datas de ativação.
 * Somente leitura — não altera envio, cron ou governança.
 */
export async function listDoctorAutomationCards(
  doctorId: string,
  organizationId: string,
): Promise<DoctorAutomationItemDto[]> {
  const orgId = organizationId.trim();
  const [orgSettings, doctorSettings] = await Promise.all([
    listSettingsByOrganizationId(orgId),
    listSettingsByDoctorId(doctorId),
  ]);

  const orgByAutomation = new Map(orgSettings.map((item) => [item.automationId, item]));
  const doctorByAutomation = new Map(doctorSettings.map((item) => [item.automationId, item]));

  const catalog = listAutomationCenterCatalog().filter((item) => item.allowDoctorActivation);

  const items = await Promise.all(
    catalog.map(async (automation) => {
      const orgSetting = orgByAutomation.get(automation.id);
      const organizationReleased = orgSetting?.enabled === true;
      const doctorSetting = doctorByAutomation.get(automation.id);
      const eventDriven = isMedicoEventAutomationId(automation.id);
      const enabledByDoctor = doctorSetting
        ? doctorSetting.enabled === true
        : eventDriven;

      const templateId =
        orgSetting?.templateId ?? resolveDefaultTemplateIdForAutomation(automation.id);
      const template = templateId ? await getAutomationTemplateById(templateId) : undefined;
      const body = doctorSetting?.templateBody?.trim() || template?.body;
      const variables = template?.variables ?? [];

      const item: DoctorAutomationItemDto = {
        automationId: automation.id,
        name: automation.name,
        description: automation.description,
        channel: automation.channel,
        category: automation.category,
        enabledByDoctor,
        platformActive: automation.status === 'active',
        organizationReleased,
        template: template && body
          ? {
              name: template.name,
              description: template.description,
              version: template.version,
              body,
              previewBody: buildAutomationTemplatePreviewBody(body, variables),
              variables,
            }
          : template
          ? {
              name: template.name,
              description: template.description,
              version: template.version,
              body: template.body,
              previewBody: template.previewBody,
              variables,
            }
          : undefined,
        horario: doctorSetting?.horario,
        horarioFromEvent: eventDriven,
        createdAt: doctorSetting?.createdAt,
        updatedAt: doctorSetting?.updatedAt,
      };

      return item;
    }),
  );

  return items.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

function normalizeHorario(value: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    throw new Error('Horário inválido. Use o formato HH:mm.');
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error('Horário inválido. Use o formato HH:mm.');
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export async function upsertAutomationDoctorSetting(input: {
  doctorId: string;
  organizationId: string;
  automationId: string;
  enabled?: boolean;
  horario?: string;
  templateBody?: string;
  updatedBy: string;
  professionalRole?: AutomationProfessionalRole;
}): Promise<AutomationDoctorSetting> {
  const doctorId = input.doctorId?.trim();
  const organizationId = input.organizationId?.trim();
  const automationId = input.automationId?.trim();
  const updatedBy = input.updatedBy?.trim();
  const professionalRole = input.professionalRole ?? 'medico';

  if (!doctorId || !organizationId || !automationId) {
    throw new Error('doctorId, organizationId e automationId são obrigatórios.');
  }
  if (!updatedBy) {
    throw new Error('updatedBy é obrigatório.');
  }
  if (input.enabled === undefined && input.horario === undefined && input.templateBody === undefined) {
    throw new Error('Informe enabled, horario e/ou templateBody.');
  }

  const automation = getAutomationDefinitionById(automationId);
  if (!automation) {
    throw new Error(`Automação não encontrada: ${automationId}`);
  }

  if (professionalRole === 'medico') {
    if (!automation.allowDoctorActivation) {
      throw new Error('Esta automação não pode ser ativada pelo médico.');
    }
  } else if (!automationAllowsProfessionalRole(automation, professionalRole)) {
    throw new Error('Esta automação não pode ser ativada por este profissional.');
  }

  const orgEnabled = await isAutomationEnabledForOrganization(organizationId, automationId);
  if (!orgEnabled) {
    throw new Error('Automação não liberada para sua organização.');
  }

  const horario = input.horario !== undefined ? normalizeHorario(input.horario) : undefined;
  const templateBody =
    input.templateBody !== undefined ? input.templateBody : undefined;

  const orgSettings = await listSettingsByOrganizationId(organizationId);
  const orgSetting = orgSettings.find((item) => item.automationId === automationId);
  const templateId =
    orgSetting?.templateId ?? resolveDefaultTemplateIdForAutomation(automationId);

  const docId = buildAutomationDoctorSettingId(doctorId, automationId);
  const ref = getFirestoreAdmin().collection(COLLECTION).doc(docId);
  const existing = await ref.get();
  const now = FieldValue.serverTimestamp();
  const defaultEnabled = isMedicoEventAutomationId(automationId);

  await ref.set(
    {
      doctorId,
      organizationId,
      automationId,
      channel: automation.channel,
      templateId: templateId ?? null,
      professionalRole,
      updatedBy,
      updatedAt: now,
      ...(input.enabled !== undefined
        ? { enabled: input.enabled === true }
        : existing.exists
          ? {}
          : { enabled: defaultEnabled }),
      ...(horario !== undefined ? { horario } : {}),
      ...(templateBody !== undefined ? { templateBody } : {}),
      ...(existing.exists ? {} : { createdAt: now }),
    },
    { merge: true },
  );

  const saved = await ref.get();
  return docToSetting(saved.id, saved.data() as Record<string, unknown>);
}

/**
 * Lembretes e Relacionamento são sempre ativos (sem toggle no painel).
 * Mantido por compatibilidade — no-op.
 */
export async function ensureProfessionalAutomationDefaults(_input: {
  ownerId: string;
  organizationId: string;
  role: ProfessionalAutomationRole;
  updatedBy: string;
}): Promise<void> {
  return;
}

export async function listProfessionalAutomationCards(
  ownerId: string,
  organizationId: string,
  role: ProfessionalAutomationRole,
): Promise<DoctorAutomationItemDto[]> {
  const orgId = organizationId.trim();

  const [orgSettings, ownerSettings] = await Promise.all([
    listSettingsByOrganizationId(orgId),
    listSettingsByDoctorId(ownerId),
  ]);

  const orgByAutomation = new Map(orgSettings.map((item) => [item.automationId, item]));
  const ownerByAutomation = new Map(ownerSettings.map((item) => [item.automationId, item]));
  const catalog = listProfessionalActivatableCatalog(role);

  const items = await Promise.all(
    catalog.map(async (automation) => {
      const orgSetting = orgByAutomation.get(automation.id);
      const organizationReleased = orgSetting?.enabled === true;
      const ownerSetting = ownerByAutomation.get(automation.id);

      const templateId =
        orgSetting?.templateId ?? resolveDefaultTemplateIdForAutomation(automation.id);
      const template = templateId ? await getAutomationTemplateById(templateId) : undefined;

      const item: DoctorAutomationItemDto = {
        automationId: automation.id,
        name: PROFESSIONAL_DISPLAY_NAMES[automation.id] ?? automation.name,
        description: automation.description,
        channel: automation.channel,
        category: automation.category,
        enabledByDoctor: ownerSetting?.enabled === true,
        platformActive: automation.status === 'active',
        organizationReleased,
        template: template
          ? {
              name: template.name,
              description: template.description,
              version: template.version,
              body: template.body,
              previewBody: template.previewBody,
            }
          : undefined,
        horario: ownerSetting?.horario,
        horarioFromPatientSchedule: automation.id === 'nutri_checkin_semanal_whatsapp',
        createdAt: ownerSetting?.createdAt,
        updatedAt: ownerSetting?.updatedAt,
      };

      return item;
    }),
  );

  const order = [
    'aniversario_paciente_whatsapp',
    'nutri_checkin_semanal_whatsapp',
    'cobranca_automatica_whatsapp',
  ];
  return items.sort((a, b) => {
    const ai = order.indexOf(a.automationId);
    const bi = order.indexOf(b.automationId);
    if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}
