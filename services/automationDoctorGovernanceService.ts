import { getOrganizationById } from '@/lib/organization/organizationRegistry';
import { listProfessionalActivatableCatalog } from '@/lib/metaadmingeral/automationCenterCatalog';
import {
  buildDoctorAutomationSummary,
  listDoctorAutomationDetailRows,
  listProfessionalAutomationDetailRows,
  mergeDoctorSettingsByDoctorId,
  mergeOrganizationSettingsForGovernance,
} from '@/lib/metaadmingeral/automationDoctorGovernance';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  listAllAutomationDoctorSettings,
  resolveSettingProfessionalRole,
  type ProfessionalAutomationRole,
} from '@/services/automationDoctorSettingsService';
import { listAutomationOrganizationSettings } from '@/services/automationOrganizationSettingsService';
import type {
  AutomationDoctorSetting,
  DoctorAutomationGovernanceDto,
} from '@/types/automationCenter';
import { buildDoctorAutomationOpsReadiness } from '@/services/automationDoctorOpsReadinessService';

type PersonBasic = {
  id: string;
  nome: string;
  email: string;
};

function resolveOrganizationIdForDoctor(settingsForDoctor: AutomationDoctorSetting[]): string {
  const fromEnabled = settingsForDoctor.find((item) => item.enabled)?.organizationId;
  if (fromEnabled) return fromEnabled;
  return settingsForDoctor[0]?.organizationId ?? 'metodo';
}

async function listGovernanceForRole(
  role: 'medico' | ProfessionalAutomationRole,
): Promise<DoctorAutomationGovernanceDto[]> {
  const collectionName =
    role === 'medico'
      ? 'medicos'
      : role === 'nutricionista'
        ? 'nutricionistas'
        : 'personal_trainers';

  const [allSettings, organizationSettings] = await Promise.all([
    listAllAutomationDoctorSettings(),
    listAutomationOrganizationSettings(),
  ]);

  const roleSettings = allSettings.filter((item) => {
    const itemRole = resolveSettingProfessionalRole(item);
    if (role === 'medico') return itemRole === 'medico';
    return itemRole === role;
  });

  const personById = new Map<string, PersonBasic>();
  const peopleSnap = await getFirestoreAdmin().collection(collectionName).get();
  for (const doc of peopleSnap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const basic = {
      id: doc.id,
      nome: String(data.nome ?? data.nomeCompleto ?? '').trim(),
      email: String(data.email ?? '').trim(),
    };
    personById.set(doc.id, basic);
    if (typeof data.userId === 'string' && data.userId.trim()) {
      personById.set(data.userId.trim(), basic);
    }
  }

  const settingsByOwner = mergeDoctorSettingsByDoctorId(roleSettings);
  const mergedOrgSettings = mergeOrganizationSettingsForGovernance(organizationSettings);
  const rows: DoctorAutomationGovernanceDto[] = [];

  for (const [ownerId, settingsForOwner] of settingsByOwner) {
    const relevantSettings =
      role === 'medico'
        ? settingsForOwner
        : settingsForOwner.filter((item) =>
            listProfessionalActivatableCatalog(role).some((a) => a.id === item.automationId),
          );
    const enabledCount = relevantSettings.filter((item) => item.enabled).length;
    if (enabledCount === 0) continue;

    const organizationId = resolveOrganizationIdForDoctor(relevantSettings);
    const person = personById.get(ownerId);
    const organization = getOrganizationById(organizationId);
    const summary =
      role === 'medico'
        ? buildDoctorAutomationSummary(
            ownerId,
            organizationId,
            relevantSettings,
            mergedOrgSettings,
          )
        : buildDoctorAutomationSummary(
            ownerId,
            organizationId,
            relevantSettings,
            mergedOrgSettings,
            { role },
          );
    const automations =
      role === 'medico'
        ? listDoctorAutomationDetailRows(organizationId, relevantSettings, mergedOrgSettings)
        : listProfessionalAutomationDetailRows(
            organizationId,
            relevantSettings,
            mergedOrgSettings,
            role,
          );

    rows.push({
      doctorId: ownerId,
      doctorName: person?.nome || ownerId,
      doctorEmail: person?.email || undefined,
      organizationId,
      organizationName: organization?.name,
      ...summary,
      automations,
    });
  }

  return rows.sort((a, b) => {
    const nameCmp = a.doctorName.localeCompare(b.doctorName, 'pt-BR');
    if (nameCmp !== 0) return nameCmp;
    return b.enabledCount - a.enabledCount;
  });
}

export async function listDoctorAutomationGovernance(): Promise<DoctorAutomationGovernanceDto[]> {
  return listGovernanceForRole('medico');
}

export async function listNutricionistaAutomationGovernance(): Promise<
  DoctorAutomationGovernanceDto[]
> {
  return listGovernanceForRole('nutricionista');
}

export async function listPersonalAutomationGovernance(): Promise<DoctorAutomationGovernanceDto[]> {
  return listGovernanceForRole('personal_trainer');
}

async function getGovernanceDetail(
  ownerId: string,
  listFn: () => Promise<DoctorAutomationGovernanceDto[]>,
): Promise<DoctorAutomationGovernanceDto | null> {
  const all = await listFn();
  const row = all.find((item) => item.doctorId === ownerId);
  if (!row) return null;

  const baseAutomations = row.automations.map((item) => ({
    automationId: item.automationId,
    automationName: item.automationName,
    channel: item.channel,
    globalStatus: item.globalStatus,
    organizationReleased: item.organizationReleased,
    enabledByDoctor: item.enabledByDoctor,
    horario: item.horario,
    updatedAt: item.updatedAt,
  }));
  const { ops, automations } = await buildDoctorAutomationOpsReadiness(
    row.doctorId,
    row.organizationId,
    baseAutomations,
  );

  return {
    ...row,
    automations,
    ops,
  };
}

export async function getDoctorAutomationGovernanceDetail(
  doctorId: string,
): Promise<DoctorAutomationGovernanceDto | null> {
  return getGovernanceDetail(doctorId, listDoctorAutomationGovernance);
}

export async function getNutricionistaAutomationGovernanceDetail(
  ownerId: string,
): Promise<DoctorAutomationGovernanceDto | null> {
  return getGovernanceDetail(ownerId, listNutricionistaAutomationGovernance);
}

export async function getPersonalAutomationGovernanceDetail(
  ownerId: string,
): Promise<DoctorAutomationGovernanceDto | null> {
  return getGovernanceDetail(ownerId, listPersonalAutomationGovernance);
}
