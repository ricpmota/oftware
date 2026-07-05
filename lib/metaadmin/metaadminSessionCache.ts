import type { Medico } from '@/types/medico';
import type { PacienteCompleto } from '@/types/obesidade';
import type { SolicitacaoMedico } from '@/types/solicitacaoMedico';
import type { PagamentoPaciente } from '@/types/pagamento';
import type { Mensagem } from '@/types/mensagem';
import type { LeadMedico, LeadMedicoStatus } from '@/types/leadMedico';
import type { Lembrete } from '@/types/lembrete';

export type MetaadminLeadsBundle = {
  leadsMedico: LeadMedico[];
  leadsByStatus: Record<LeadMedicoStatus, LeadMedico[]>;
  /** Pacientes vinculados a solicitações (ainda não aceitos pelo médico) — contato no CRM */
  pacientesLeads?: PacienteCompleto[];
  loadedAt: number;
};

export type MetaadminPacientesBundle = {
  pacientes: PacienteCompleto[];
  mensagensNaoLidasPorPaciente: Record<string, number>;
  fotosPacientes: Record<string, string | null>;
  npsRespondidoPorPaciente: Record<string, boolean>;
  pacientesComNutricao: Record<string, boolean>;
  temPacienteSemana2: boolean;
  loadedAt: number;
};

const medicoByUserId = new Map<string, Medico>();
const pacientesByMedicoId = new Map<string, MetaadminPacientesBundle>();
const solicitacoesByMedicoId = new Map<string, SolicitacaoMedico[]>();
const pagamentosByMedicoId = new Map<string, Record<string, PagamentoPaciente>>();
const pagamentosLoadedMedicoIds = new Set<string>();
const mensagensByAdminEmail = new Map<string, Mensagem[]>();
const leadsByMedicoId = new Map<string, MetaadminLeadsBundle>();
const leadsLoadedMedicoIds = new Set<string>();
const lembretesByMedicoId = new Map<string, Lembrete[]>();
const lembretesLoadedMedicoIds = new Set<string>();

export const metaadminSessionCache = {
  getMedico(userId: string): Medico | undefined {
    return medicoByUserId.get(userId);
  },
  setMedico(userId: string, medico: Medico): void {
    medicoByUserId.set(userId, medico);
  },
  invalidateMedico(userId: string): void {
    medicoByUserId.delete(userId);
  },

  getPacientes(medicoId: string): MetaadminPacientesBundle | undefined {
    return pacientesByMedicoId.get(medicoId);
  },
  setPacientes(medicoId: string, bundle: MetaadminPacientesBundle): void {
    pacientesByMedicoId.set(medicoId, bundle);
  },
  invalidatePacientes(medicoId: string): void {
    pacientesByMedicoId.delete(medicoId);
  },
  patchPaciente(medicoId: string, pacienteId: string, paciente: PacienteCompleto): void {
    const cached = pacientesByMedicoId.get(medicoId);
    if (!cached) return;
    pacientesByMedicoId.set(medicoId, {
      ...cached,
      pacientes: cached.pacientes.map((p) => (p.id === pacienteId ? paciente : p)),
    });
  },

  getSolicitacoes(medicoId: string): SolicitacaoMedico[] | undefined {
    return solicitacoesByMedicoId.get(medicoId);
  },
  setSolicitacoes(medicoId: string, data: SolicitacaoMedico[]): void {
    solicitacoesByMedicoId.set(medicoId, data);
  },
  invalidateSolicitacoes(medicoId: string): void {
    solicitacoesByMedicoId.delete(medicoId);
  },

  getPagamentos(medicoId: string): Record<string, PagamentoPaciente> | undefined {
    return pagamentosByMedicoId.get(medicoId);
  },
  hasPagamentos(medicoId: string): boolean {
    return pagamentosLoadedMedicoIds.has(medicoId);
  },
  setPagamentos(medicoId: string, data: Record<string, PagamentoPaciente>): void {
    pagamentosByMedicoId.set(medicoId, data);
    pagamentosLoadedMedicoIds.add(medicoId);
  },
  patchPagamento(medicoId: string, pacienteId: string, pagamento: PagamentoPaciente): void {
    const current = { ...(pagamentosByMedicoId.get(medicoId) ?? {}) };
    current[pacienteId] = pagamento;
    pagamentosByMedicoId.set(medicoId, current);
    pagamentosLoadedMedicoIds.add(medicoId);
  },
  invalidatePagamentos(medicoId: string): void {
    pagamentosByMedicoId.delete(medicoId);
    pagamentosLoadedMedicoIds.delete(medicoId);
  },

  getMensagens(adminEmail: string): Mensagem[] | undefined {
    return mensagensByAdminEmail.get(adminEmail);
  },
  setMensagens(adminEmail: string, data: Mensagem[]): void {
    mensagensByAdminEmail.set(adminEmail, data);
  },
  invalidateMensagens(adminEmail: string): void {
    mensagensByAdminEmail.delete(adminEmail);
  },

  getLeads(medicoId: string): MetaadminLeadsBundle | undefined {
    return leadsByMedicoId.get(medicoId);
  },
  hasLeads(medicoId: string): boolean {
    return leadsLoadedMedicoIds.has(medicoId);
  },
  setLeads(medicoId: string, bundle: MetaadminLeadsBundle): void {
    leadsByMedicoId.set(medicoId, bundle);
    leadsLoadedMedicoIds.add(medicoId);
  },
  invalidateLeads(medicoId: string): void {
    leadsByMedicoId.delete(medicoId);
    leadsLoadedMedicoIds.delete(medicoId);
  },

  getLembretes(medicoId: string): Lembrete[] | undefined {
    return lembretesByMedicoId.get(medicoId);
  },
  hasLembretes(medicoId: string): boolean {
    return lembretesLoadedMedicoIds.has(medicoId);
  },
  setLembretes(medicoId: string, data: Lembrete[]): void {
    lembretesByMedicoId.set(medicoId, data);
    lembretesLoadedMedicoIds.add(medicoId);
  },
  invalidateLembretes(medicoId: string): void {
    lembretesByMedicoId.delete(medicoId);
    lembretesLoadedMedicoIds.delete(medicoId);
  },

  clearAll(): void {
    medicoByUserId.clear();
    pacientesByMedicoId.clear();
    solicitacoesByMedicoId.clear();
    pagamentosByMedicoId.clear();
    pagamentosLoadedMedicoIds.clear();
    mensagensByAdminEmail.clear();
    leadsByMedicoId.clear();
    leadsLoadedMedicoIds.clear();
    lembretesByMedicoId.clear();
    lembretesLoadedMedicoIds.clear();
  },
};
