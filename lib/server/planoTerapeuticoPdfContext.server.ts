import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getOrganizationBranding } from '@/lib/organization/getOrganizationBranding.server';
import { METODO_ORGANIZATION_ID } from '@/lib/organization/organizationRegistry';
import type { OrganizationId } from '@/lib/organization/organizationTypes';
import type { Medico } from '@/types/medico';
import type { OrganizationBrandingStored } from '@/lib/organization/organizationBrandingTypes';

export type PlanoTerapeuticoPdfContextServer = {
  pacienteNome: string;
  pacienteCpf?: string;
  pacienteDataNascimento?: string;
  pacienteSexo?: string;
  metaDescricao?: string;
  medico: Medico | null;
  organizationBranding: OrganizationBrandingStored | null;
};

function formatCpf(cpf: string | undefined): string | undefined {
  const t = (cpf || '').replace(/\D/g, '');
  if (t.length !== 11) return cpf?.trim() || undefined;
  return t.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatDataNasc(value: unknown): string | undefined {
  if (!value) return undefined;
  let d: Date | null = null;
  if (value instanceof Date) d = value;
  else if (typeof value === 'object' && value && 'toDate' in value) {
    d = (value as { toDate: () => Date }).toDate();
  } else if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    d = Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (!d || Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleDateString('pt-BR');
}

export async function carregarPlanoTerapeuticoPdfContext(args: {
  pacienteId: string;
  medicoId: string;
  organizationId?: string | null;
  metaDescricao?: string;
}): Promise<PlanoTerapeuticoPdfContextServer> {
  const db = getFirestoreAdmin();
  const pacSnap = await db.collection('pacientes_completos').doc(args.pacienteId).get();
  const pacData = pacSnap.exists ? (pacSnap.data() as Record<string, unknown>) : {};

  const ident = pacData.dadosIdentificacao as Record<string, unknown> | undefined;
  const pacienteNome =
    String(ident?.nomeCompleto ?? ident?.nome ?? pacData.nome ?? 'Paciente').trim() || 'Paciente';

  let medico: Medico | null = null;
  const medicoId = args.medicoId?.trim();
  if (medicoId) {
    const medSnap = await db.collection('medicos').doc(medicoId).get();
    if (medSnap.exists) {
      medico = { id: medSnap.id, ...(medSnap.data() as object) } as Medico;
    }
  }

  const organizationId = (args.organizationId ?? METODO_ORGANIZATION_ID) as OrganizationId;
  let organizationBranding: OrganizationBrandingStored | null = null;
  try {
    organizationBranding = await getOrganizationBranding(organizationId);
  } catch {
    organizationBranding = null;
  }

  return {
    pacienteNome,
    pacienteCpf: formatCpf(String(ident?.cpf ?? '')),
    pacienteDataNascimento: formatDataNasc(ident?.dataNascimento),
    pacienteSexo: String(ident?.sexo ?? '').trim() || undefined,
    metaDescricao: args.metaDescricao,
    medico,
    organizationBranding,
  };
}
