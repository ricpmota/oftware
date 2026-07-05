import { buildPaciente360Summary } from '@/lib/paciente360/buildPaciente360Summary';
import type { LeadMedico } from '@/types/leadMedico';
import type { Lembrete } from '@/types/lembrete';
import type { PagamentoPaciente } from '@/types/pagamento';
import type { Paciente360Summary } from '@/types/paciente360';
import type { PacienteCompleto } from '@/types/obesidade';

export type PacienteLookupIndex = {
  byUserId: Map<string, PacienteCompleto>;
  byEmail: Map<string, PacienteCompleto>;
  byId: Map<string, PacienteCompleto>;
};

export function buildPacienteLookupIndex(pacientes: PacienteCompleto[]): PacienteLookupIndex {
  const byUserId = new Map<string, PacienteCompleto>();
  const byEmail = new Map<string, PacienteCompleto>();
  const byId = new Map<string, PacienteCompleto>();

  for (const paciente of pacientes) {
    if (paciente.id) byId.set(paciente.id, paciente);
    if (paciente.userId) byUserId.set(paciente.userId, paciente);
    const email = paciente.email?.toLowerCase() || paciente.dadosIdentificacao?.email?.toLowerCase();
    if (email) byEmail.set(email, paciente);
  }

  return { byUserId, byEmail, byId };
}

/**
 * Vínculo lead → paciente: uid (Auth) → e-mail → id do documento.
 * Mesma ordem usada implicitamente em `loadLeadsMedicoData`.
 */
export function resolvePacienteForLead(
  lead: LeadMedico,
  index: PacienteLookupIndex
): PacienteCompleto | null {
  if (lead.uid && index.byUserId.get(lead.uid)) {
    return index.byUserId.get(lead.uid)!;
  }
  const email = lead.email?.toLowerCase();
  if (email && index.byEmail.get(email)) {
    return index.byEmail.get(email)!;
  }
  if (lead.id && index.byId.get(lead.id)) {
    return index.byId.get(lead.id)!;
  }
  if (lead.uid && index.byId.get(lead.uid)) {
    return index.byId.get(lead.uid)!;
  }
  return null;
}

function groupLembretesByPaciente(lembretes: Lembrete[]): Map<string, Lembrete[]> {
  const map = new Map<string, Lembrete[]>();
  for (const lembrete of lembretes) {
    const pid = lembrete.pacienteId?.trim();
    if (!pid) continue;
    const list = map.get(pid) ?? [];
    list.push(lembrete);
    map.set(pid, list);
  }
  return map;
}

export function buildLembretesByLeadId(params: {
  leads: LeadMedico[];
  pacientes: PacienteCompleto[];
  lembretes?: Lembrete[];
}): Map<string, Lembrete[]> {
  const { leads, pacientes, lembretes } = params;
  const index = buildPacienteLookupIndex(pacientes);
  const byPaciente = groupLembretesByPaciente(lembretes ?? []);
  const map = new Map<string, Lembrete[]>();

  for (const lead of leads) {
    const paciente = resolvePacienteForLead(lead, index);
    if (paciente?.id) {
      map.set(lead.id, byPaciente.get(paciente.id) ?? []);
    }
  }

  return map;
}

export function buildPaciente360SummariesForLeads(params: {
  leads: LeadMedico[];
  pacientes: PacienteCompleto[];
  pagamentos?: Record<string, PagamentoPaciente>;
  lembretes?: Lembrete[];
  now?: Date;
}): Map<string, Paciente360Summary> {
  const { leads, pacientes, pagamentos, lembretes, now = new Date() } = params;
  const index = buildPacienteLookupIndex(pacientes);
  const lembretesByPaciente = groupLembretesByPaciente(lembretes ?? []);
  const summaries = new Map<string, Paciente360Summary>();

  for (const lead of leads) {
    const paciente = resolvePacienteForLead(lead, index);
    if (!paciente?.id) continue;

    try {
      const summary = buildPaciente360Summary({
        paciente,
        pagamento: pagamentos?.[paciente.id] ?? null,
        lembretes: lembretesByPaciente.get(paciente.id),
        now,
      });
      summaries.set(lead.id, summary);
    } catch {
      // Não quebrar o card se um paciente tiver dados incompletos.
    }
  }

  return summaries;
}
