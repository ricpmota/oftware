import { LeadProfissionalService } from '@/services/leadProfissionalService';
import type { LeadProfissional, LeadProfissionalRole } from '@/types/leadProfissional';
import { getDefaultLeadProfissionalStatus } from '@/types/leadProfissionalCrm';
import type { PacienteCompleto } from '@/types/obesidade';
import { leadPhoneWriteFieldsFromIdent } from '@/lib/whatsapp/resolveLeadPhone';

export type PacienteCompartilhadoLeadSource = {
  vinculoId: string;
  pacienteId: string;
  paciente: PacienteCompleto;
  medicoId: string;
  medicoNome: string;
  dataCompartilhamento: Date;
};

export type LoadLeadsProfissionalResult = {
  leads: LeadProfissional[];
  pacientes: PacienteCompleto[];
};

function pickPhoneFields(paciente: PacienteCompleto): {
  telefone?: string;
  telefoneDdi?: string;
  telefonePais?: string;
} {
  return leadPhoneWriteFieldsFromIdent(paciente.dadosIdentificacao);
}

function pickEmail(paciente: PacienteCompleto): string {
  return (
    paciente.email?.trim() ||
    paciente.dadosIdentificacao?.email?.trim() ||
    ''
  );
}

function pickName(paciente: PacienteCompleto): string {
  return (
    paciente.dadosIdentificacao?.nomeCompleto?.trim() ||
    paciente.nome?.trim() ||
    'Paciente'
  );
}

function pickCidade(paciente: PacienteCompleto): string | undefined {
  return paciente.dadosIdentificacao?.endereco?.cidade || undefined;
}

function pickEstado(paciente: PacienteCompleto): string | undefined {
  return paciente.dadosIdentificacao?.endereco?.estado || undefined;
}

/**
 * Sincroniza leads a partir dos pacientes compartilhados (vínculos ativos).
 * Cria leads novos em "Não atendido" e atualiza identidade/médico nos existentes.
 */
export async function loadLeadsProfissionalData(params: {
  role: LeadProfissionalRole;
  profissionalId: string;
  compartilhados: PacienteCompartilhadoLeadSource[];
}): Promise<LoadLeadsProfissionalResult> {
  const { role, profissionalId, compartilhados } = params;
  if (!profissionalId) {
    return { leads: [], pacientes: [] };
  }

  const existing = await LeadProfissionalService.getLeadsByProfissional(role, profissionalId);
  const existingByVinculo = new Map(existing.map((l) => [l.vinculoId || l.id, l]));
  const activeVinculoIds = new Set(compartilhados.map((c) => c.vinculoId));

  const synced: LeadProfissional[] = [];

  for (const item of compartilhados) {
    const current = existingByVinculo.get(item.vinculoId);
    const name = pickName(item.paciente);
    const email = pickEmail(item.paciente);
    const phoneFields = pickPhoneFields(item.paciente);
    const telefone = phoneFields.telefone;
    const cidade = pickCidade(item.paciente);
    const estado = pickEstado(item.paciente);
    const medicoNome = item.medicoNome?.trim() || 'Médico';

    if (!current) {
      const compartilhadoEm = item.dataCompartilhamento || new Date();
      const createdId = await LeadProfissionalService.createOrUpdateLead(role, {
        pacienteId: item.pacienteId,
        vinculoId: item.vinculoId,
        name,
        email,
        ...phoneFields,
        cidade,
        estado,
        status: getDefaultLeadProfissionalStatus(role),
        dataStatus: compartilhadoEm,
        dataCompartilhamento: compartilhadoEm,
        profissionalId,
        medicoId: item.medicoId,
        medicoNome,
        createdAt: compartilhadoEm,
      });
      synced.push({
        id: createdId,
        pacienteId: item.pacienteId,
        vinculoId: item.vinculoId,
        name,
        email,
        ...phoneFields,
        cidade,
        estado,
        status: getDefaultLeadProfissionalStatus(role),
        dataStatus: compartilhadoEm,
        dataCompartilhamento: compartilhadoEm,
        profissionalId,
        role,
        medicoId: item.medicoId,
        medicoNome,
        createdAt: compartilhadoEm,
      });
      continue;
    }

    const compartilhadoEm = item.dataCompartilhamento || current.dataCompartilhamento || current.createdAt;
    const needsIdentityUpdate =
      current.name !== name ||
      current.email !== email ||
      current.telefone !== telefone ||
      (current.telefoneDdi || '') !== (phoneFields.telefoneDdi || '') ||
      current.cidade !== cidade ||
      current.estado !== estado ||
      current.medicoId !== item.medicoId ||
      current.medicoNome !== medicoNome ||
      current.pacienteId !== item.pacienteId ||
      (!current.dataCompartilhamento && Boolean(compartilhadoEm));

    if (needsIdentityUpdate) {
      await LeadProfissionalService.syncLeadIdentity(role, current.id, {
        name,
        email,
        ...phoneFields,
        cidade,
        estado,
        medicoId: item.medicoId,
        medicoNome,
        pacienteId: item.pacienteId,
        dataCompartilhamento: compartilhadoEm,
      });
    }

    synced.push({
      ...current,
      name,
      email,
      ...phoneFields,
      cidade,
      estado,
      medicoId: item.medicoId,
      medicoNome,
      pacienteId: item.pacienteId,
      dataCompartilhamento: compartilhadoEm,
      role,
    });
  }

  // Mantém leads órfãos fora do pipeline ativo (só vínculos ativos)
  const activeLeads = synced.filter((l) => activeVinculoIds.has(l.vinculoId || l.id));

  return {
    leads: activeLeads,
    pacientes: compartilhados.map((c) => c.paciente).filter((p) => Boolean(p?.id)),
  };
}
