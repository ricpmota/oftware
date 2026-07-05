import { LeadMedicoService } from '@/services/leadMedicoService';
import { SolicitacaoMedicoService } from '@/services/solicitacaoMedicoService';
import { IndicacaoService } from '@/services/indicacaoService';
import { MedicoService } from '@/services/medicoService';
import { metaadminSessionCache } from '@/lib/metaadmin/metaadminSessionCache';
import {
  pickTelefoneSolicitacao,
  resolvePacienteDaSolicitacao,
} from '@/lib/metaadmin/resolvePacienteSolicitacao';
import { isValidLeadPhone } from '@/lib/crm/leadContactHelpers';
import { groupLeadsByStatus, normalizeLeadStatus } from '@/lib/crm/leadMedicoCrmUtils';
import {
  buildIndicacaoByPhoneMap,
  findIndicacaoForLead,
  resolveLeadReferral,
} from '@/lib/crm/resolveLeadReferral';
import type { LeadMedico, LeadMedicoStatus } from '@/types/leadMedico';
import type { PacienteCompleto } from '@/types/obesidade';
import type { SolicitacaoMedico } from '@/types/solicitacaoMedico';
import type { Indicacao } from '@/types/indicacao';

export type LoadLeadsMedicoResult = {
  leadsMedico: LeadMedico[];
  leadsByStatus: ReturnType<typeof groupLeadsByStatus>;
  pacientesLeads: PacienteCompleto[];
};

function mergeLeadsPreservingFirestoreIds(
  fromSolicitacoes: LeadMedico[],
  fromFirestore: LeadMedico[]
): LeadMedico[] {
  const map = new Map<string, LeadMedico>();

  for (const lead of fromFirestore) {
    const key = lead.email?.toLowerCase();
    if (key) map.set(key, lead);
  }

  for (const lead of fromSolicitacoes) {
    const key = lead.email?.toLowerCase();
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...existing,
        ...lead,
        id: existing.id,
        uid: existing.uid || lead.uid,
      });
    } else {
      map.set(key, lead);
    }
  }

  return [...map.values()];
}

function uniquePacientes(pacientes: (PacienteCompleto | null | undefined)[]): PacienteCompleto[] {
  const byId = new Map<string, PacienteCompleto>();
  for (const p of pacientes) {
    if (p?.id) byId.set(p.id, p);
  }
  return [...byId.values()];
}

function registerPacienteInMap(map: Map<string, PacienteCompleto>, p: PacienteCompleto): void {
  if (p.userId) map.set(p.userId, p);
  if (p.email) map.set(p.email.toLowerCase(), p);
  if (p.id) map.set(p.id, p);
  const emailIdent = p.dadosIdentificacao?.email?.toLowerCase();
  if (emailIdent) map.set(emailIdent, p);
}

function getPacienteFromMap(
  lead: LeadMedico,
  pacientesMap: Map<string, PacienteCompleto>
): PacienteCompleto | undefined {
  const email = lead.email?.toLowerCase();
  return (
    (email ? pacientesMap.get(email) : undefined) ||
    (lead.uid ? pacientesMap.get(lead.uid) : undefined) ||
    (lead.id ? pacientesMap.get(lead.id) : undefined)
  );
}

/** Lead ainda pertence ao pipeline deste médico (evita ressurgir cadastros órfãos no Firestore). */
function isLeadRelevantForMedico(
  lead: LeadMedico,
  medicoId: string,
  solicitacaoByEmail: Map<string, SolicitacaoMedico>,
  pacientesMap: Map<string, PacienteCompleto>
): boolean {
  const email = lead.email?.toLowerCase();
  if (!email) return false;

  const paciente = getPacienteFromMap(lead, pacientesMap);
  const responsavel = paciente?.medicoResponsavelId?.trim();
  if (responsavel && responsavel !== medicoId) {
    return false;
  }

  if (solicitacaoByEmail.has(email)) return true;

  const status = normalizeLeadStatus(lead.status);
  if (status !== 'nao_qualificado') return true;

  const recomendado = paciente?.medicoRecomendadoId?.trim();
  return recomendado === medicoId || responsavel === medicoId;
}

function inferLeadStatusFromSolicitacao(
  solicitacao: SolicitacaoMedico,
  paciente: PacienteCompleto | null,
  medicoId: string
): LeadMedicoStatus {
  if (paciente?.medicoResponsavelId === medicoId) return 'em_tratamento';
  if (solicitacao.status === 'aceita') return 'em_tratamento';
  if (solicitacao.status === 'rejeitada' || solicitacao.status === 'desistiu') return 'excluido';
  return 'nao_qualificado';
}

function filterRelevantLeads(
  leads: LeadMedico[],
  medicoId: string,
  solicitacaoByEmail: Map<string, SolicitacaoMedico>,
  pacientesMap: Map<string, PacienteCompleto>
): LeadMedico[] {
  return leads.filter((lead) =>
    isLeadRelevantForMedico(lead, medicoId, solicitacaoByEmail, pacientesMap)
  );
}

async function backfillLeadsTelefone(params: {
  leads: LeadMedico[];
  solicitacaoByEmail: Map<string, SolicitacaoMedico>;
  pacientesMap: Map<string, PacienteCompleto>;
}): Promise<{ leads: LeadMedico[]; pacientesExtras: PacienteCompleto[] }> {
  const { leads, solicitacaoByEmail, pacientesMap } = params;
  const pacientesExtras: PacienteCompleto[] = [];

  const updated = await Promise.all(
    leads.map(async (lead) => {
      const emailKey = lead.email.toLowerCase();
      const solicitacao = solicitacaoByEmail.get(emailKey);
      let paciente =
        pacientesMap.get(emailKey) ||
        pacientesMap.get(lead.uid) ||
        (lead.id ? pacientesMap.get(lead.id) : undefined) ||
        null;

      if (!paciente && solicitacao) {
        paciente = await resolvePacienteDaSolicitacao(solicitacao);
      }
      if (!paciente && lead.email) {
        paciente = await resolvePacienteDaSolicitacao({ pacienteEmail: lead.email });
      }

      if (paciente) {
        pacientesExtras.push(paciente);
        registerPacienteInMap(pacientesMap, paciente);
      }

      if (isValidLeadPhone(lead, paciente)) return lead;

      const telefone = pickTelefoneSolicitacao(solicitacao ?? { pacienteTelefone: undefined }, paciente);
      if (!telefone) return lead;

      const leadAtualizado: LeadMedico = { ...lead, telefone };
      try {
        await LeadMedicoService.createOrUpdateLead(leadAtualizado);
      } catch (e) {
        console.error('Erro ao persistir telefone do lead:', e);
      }
      return leadAtualizado;
    })
  );

  return { leads: updated, pacientesExtras };
}

async function enrichLeadsReferral(params: {
  leads: LeadMedico[];
  medicoId: string;
  medicoNome?: string;
  pacientesMap: Map<string, PacienteCompleto>;
  solicitacaoByEmail: Map<string, SolicitacaoMedico>;
  indicacoes: Indicacao[];
  userEmail?: string | null;
}): Promise<LeadMedico[]> {
  const { leads, medicoId, medicoNome, pacientesMap, solicitacaoByEmail, indicacoes, userEmail } =
    params;
  const indicacaoByPhone = buildIndicacaoByPhoneMap(indicacoes);

  const enriched = await Promise.all(
    leads.map(async (lead) => {
      if (lead.referral?.updatedManually) return lead;
      if (lead.referral?.type) return lead;

      const emailKey = lead.email.toLowerCase();
      const paciente =
        pacientesMap.get(emailKey) ||
        pacientesMap.get(lead.uid) ||
        (lead.id ? pacientesMap.get(lead.id) : undefined) ||
        null;
      const solicitacao = solicitacaoByEmail.get(emailKey) || null;
      const indicacao = findIndicacaoForLead(lead, indicacaoByPhone);

      const resolved = resolveLeadReferral(lead, {
        medicoId,
        medicoNome,
        paciente,
        solicitacao,
        indicacao,
      });

      const withReferral: LeadMedico = { ...lead, referral: resolved };
      try {
        await LeadMedicoService.createOrUpdateLead(withReferral);
      } catch (e) {
        console.error('Erro ao persistir referral do lead:', e);
      }
      return withReferral;
    })
  );

  return enriched;
}

export async function loadLeadsMedicoData(options: {
  medicoId: string;
  userEmail?: string | null;
  force?: boolean;
}): Promise<LoadLeadsMedicoResult> {
  const { medicoId, userEmail, force } = options;

  if (force) {
    metaadminSessionCache.invalidateLeads(medicoId);
  }

  if (!force && metaadminSessionCache.hasLeads(medicoId)) {
    const cached = metaadminSessionCache.getLeads(medicoId)!;
    return {
      leadsMedico: cached.leadsMedico,
      leadsByStatus: cached.leadsByStatus,
      pacientesLeads: cached.pacientesLeads ?? [],
    };
  }

  const [leadsExistentes, todasSolicitacoes, indicacoes, medico] = await Promise.all([
    LeadMedicoService.getLeadsByMedico(medicoId),
    SolicitacaoMedicoService.getSolicitacoesPorMedico(medicoId),
    IndicacaoService.getIndicacoesPorMedico(medicoId).catch(() => [] as Indicacao[]),
    MedicoService.getMedicoById(medicoId).catch(() => null),
  ]);

  const medicoNome = medico?.nome;
  const leadsExistentesMap = new Map(leadsExistentes.map((l) => [l.email.toLowerCase(), l]));
  const solicitacaoByEmail = new Map(
    todasSolicitacoes.map((s) => [s.pacienteEmail.toLowerCase(), s])
  );

  const leadsComMigracao = leadsExistentes.map((lead) => {
    const status = normalizeLeadStatus(lead.status);
    if (lead.status !== status) {
      LeadMedicoService.updateLeadStatus(lead.id, status, userEmail || undefined).catch(console.error);
      return { ...lead, status, dataStatus: new Date() };
    }
    return { ...lead, status };
  });

  const pacientesMap = new Map<string, PacienteCompleto>();
  const pacientesResolvidos = await Promise.all(
    todasSolicitacoes.map((s) => resolvePacienteDaSolicitacao(s))
  );
  pacientesResolvidos.forEach((p) => {
    if (p) registerPacienteInMap(pacientesMap, p);
  });

  let leadsFinais: LeadMedico[];

  let leadsFromSolicitacoes: LeadMedico[] = [];

  if (todasSolicitacoes.length === 0) {
    leadsFinais = leadsComMigracao;
  } else {
    const leadsAtualizacoes = todasSolicitacoes.map(async (solicitacao, index) => {
      const email = solicitacao.pacienteEmail.toLowerCase();
      const paciente =
        pacientesResolvidos[index] ||
        pacientesMap.get(solicitacao.pacienteId || '') ||
        pacientesMap.get(email) ||
        null;
      const telefone = pickTelefoneSolicitacao(solicitacao, paciente);
      const leadExistente = leadsExistentesMap.get(email);
      const referralFromSolicitacao = solicitacao.referral;

      if (leadExistente) {
        const leadAtualizado: LeadMedico = {
          ...leadExistente,
          name: solicitacao.pacienteNome,
          telefone,
          cidade: paciente?.dadosIdentificacao?.endereco?.cidade,
          estado: paciente?.dadosIdentificacao?.endereco?.estado,
          solicitacaoId: solicitacao.id,
          status: normalizeLeadStatus(leadExistente.status),
          dataStatus: leadExistente.dataStatus,
          referral: leadExistente.referral ?? referralFromSolicitacao,
        };
        await LeadMedicoService.createOrUpdateLead(leadAtualizado);
        return leadAtualizado;
      }

      const statusInicial = inferLeadStatusFromSolicitacao(solicitacao, paciente, medicoId);
      const novoLead: Omit<LeadMedico, 'id'> = {
        uid: paciente?.userId || solicitacao.pacienteId || email,
        email: solicitacao.pacienteEmail,
        name: solicitacao.pacienteNome,
        telefone,
        cidade: paciente?.dadosIdentificacao?.endereco?.cidade,
        estado: paciente?.dadosIdentificacao?.endereco?.estado,
        createdAt: solicitacao.criadoEm,
        emailVerified: true,
        status: statusInicial,
        dataStatus: new Date(),
        medicoId,
        solicitacaoId: solicitacao.id,
        referral: referralFromSolicitacao,
      };
      const leadId = await LeadMedicoService.createOrUpdateLead(novoLead);
      return { ...novoLead, id: leadId } as LeadMedico;
    });

    const leadsProcessados = await Promise.allSettled(leadsAtualizacoes);

    leadsFromSolicitacoes = leadsProcessados
      .map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        }
        const email = todasSolicitacoes[index].pacienteEmail.toLowerCase();
        return leadsExistentesMap.get(email) || null;
      })
      .filter((lead): lead is LeadMedico => lead !== null);

    const emailsFromSolicitacoes = new Set(leadsFromSolicitacoes.map((l) => l.email.toLowerCase()));
    const orphanLeads = leadsComMigracao.filter(
      (lead) =>
        !emailsFromSolicitacoes.has(lead.email.toLowerCase()) &&
        isLeadRelevantForMedico(lead, medicoId, solicitacaoByEmail, pacientesMap)
    );
    leadsFinais = mergeLeadsPreservingFirestoreIds(leadsFromSolicitacoes, orphanLeads);
  }

  const emailsComLead = new Set(leadsFinais.map((l) => l.email.toLowerCase()));
  const solicitacoesPendentesSemLead = todasSolicitacoes.filter(
    (s) => s.status === 'pendente' && !emailsComLead.has(s.pacienteEmail.toLowerCase())
  );

  if (solicitacoesPendentesSemLead.length > 0) {
    const extras = await Promise.all(
      solicitacoesPendentesSemLead.map(async (solicitacao) => {
        const email = solicitacao.pacienteEmail.toLowerCase();
        const paciente = await resolvePacienteDaSolicitacao(solicitacao);
        const telefone = pickTelefoneSolicitacao(solicitacao, paciente);
        const statusInicial = inferLeadStatusFromSolicitacao(solicitacao, paciente, medicoId);
        const novoLead: Omit<LeadMedico, 'id'> = {
          uid: paciente?.userId || solicitacao.pacienteId || email,
          email: solicitacao.pacienteEmail,
          name: solicitacao.pacienteNome,
          telefone,
          cidade: paciente?.dadosIdentificacao?.endereco?.cidade,
          estado: paciente?.dadosIdentificacao?.endereco?.estado,
          createdAt: solicitacao.criadoEm,
          emailVerified: true,
          status: statusInicial,
          dataStatus: new Date(),
          medicoId,
          solicitacaoId: solicitacao.id,
          referral: solicitacao.referral,
        };
        try {
          const leadId = await LeadMedicoService.createOrUpdateLead(novoLead);
          if (paciente) registerPacienteInMap(pacientesMap, paciente);
          return { ...novoLead, id: leadId } as LeadMedico;
        } catch (e) {
          console.error('Erro ao garantir lead para solicitação pendente:', e);
          return null;
        }
      })
    );
    const criados = extras.filter((l): l is LeadMedico => l !== null);
    if (criados.length > 0) {
      leadsFinais = mergeLeadsPreservingFirestoreIds(criados, leadsFinais);
    }
  }

  leadsFinais = await enrichLeadsReferral({
    leads: leadsFinais,
    medicoId,
    medicoNome,
    pacientesMap,
    solicitacaoByEmail,
    indicacoes,
    userEmail,
  });

  const backfill = await backfillLeadsTelefone({
    leads: leadsFinais,
    solicitacaoByEmail,
    pacientesMap,
  });
  leadsFinais = backfill.leads;
  leadsFinais = filterRelevantLeads(leadsFinais, medicoId, solicitacaoByEmail, pacientesMap);

  const pacientesLeads = uniquePacientes([...pacientesResolvidos, ...backfill.pacientesExtras]);

  const leadsByStatus = groupLeadsByStatus(leadsFinais);

  metaadminSessionCache.setLeads(medicoId, {
    leadsMedico: leadsFinais,
    leadsByStatus,
    pacientesLeads,
    loadedAt: Date.now(),
  });

  return { leadsMedico: leadsFinais, leadsByStatus, pacientesLeads };
}
