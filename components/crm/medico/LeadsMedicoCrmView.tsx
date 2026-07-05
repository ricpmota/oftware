'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HelpCircle, Loader2, RefreshCw } from 'lucide-react';
import LeadsMedicoCrmFilters, { type MedicoCrmFiltersState } from '@/components/crm/medico/LeadsMedicoCrmFilters';
import LeadsMedicoCrmKpis from '@/components/crm/medico/LeadsMedicoCrmKpis';
import LeadsMedicoReferralKpis from '@/components/crm/medico/LeadsMedicoReferralKpis';
import LeadsMedicoCrmSheet from '@/components/crm/medico/LeadsMedicoCrmSheet';
import LeadsMedicoKanban from '@/components/crm/medico/LeadsMedicoKanban';
import CrmPipelineStageManagerModal from '@/components/crm/medico/CrmPipelineStageManagerModal';
import ModalLembretesPaciente from '@/components/metaadmin/ModalLembretesPaciente';
import type { ModalNovoLembreteInitialValues } from '@/components/metaadmin/ModalNovoLembrete';
import { MedicoLeadsCrmProvider, useMedicoLeadsCrmTheme } from '@/components/crm/medico/MedicoLeadsCrmProvider';
import { computeCrmPipelineKpis, groupLeadsByStatus, resolveLeadMedicoId } from '@/lib/crm/leadMedicoCrmUtils';
import CrmHomeKpisCollapsible from '@/components/crm/medico/CrmHomeKpisCollapsible';
import { buildResolvedPipelineStages } from '@/lib/crm/resolveCrmPipelineStages';
import { computeLeadReferralKpis, matchesReferralFilter } from '@/lib/crm/resolveLeadReferral';
import { getLeadStageKey, isDefaultStageKey } from '@/lib/crm/leadStageKey';
import { getLeadPhone } from '@/lib/crm/leadContactHelpers';
import {
  buildLembretesByLeadId,
  buildPaciente360SummariesForLeads,
  buildPacienteLookupIndex,
  resolvePacienteForLead,
} from '@/lib/paciente360/buildPaciente360SummariesForLeads';
import { buildPaciente360LembreteDraft } from '@/lib/paciente360/paciente360LembreteDraft';
import type { LembretesMutation } from '@/lib/metaadmin/lembretesMutation';
import { loadLeadsMedicoData } from '@/lib/metaadmin/loadLeadsMedicoData';
import { metaadminSessionCache } from '@/lib/metaadmin/metaadminSessionCache';
import { whiteLabelCrmVariantFromMetaadminHome } from '@/lib/crm/whiteLabelCrmTheme';
import { LeadMedicoService } from '@/services/leadMedicoService';
import { CrmTagService } from '@/services/crmTagService';
import { CrmPipelineStageService } from '@/services/crmPipelineStageService';
import { MedicoService } from '@/services/medicoService';
import type { LeadMedico, LeadReferralSnapshot } from '@/types/leadMedico';
import type { CrmTag, LeadCrmTagSnapshot } from '@/types/crmTag';
import type { CrmPipelineStage } from '@/types/crmPipelineStage';
import type { Lembrete } from '@/types/lembrete';
import type { PagamentoPaciente } from '@/types/pagamento';
import type { Paciente360Summary } from '@/types/paciente360';
import type { PacienteCompleto } from '@/types/obesidade';

type InnerProps = {
  medicoId: string;
  userEmail?: string | null;
  onOpenMessages?: (lead: LeadMedico) => void;
  variant?: 'home' | 'standalone';
  onOpenManual?: () => void;
  refreshSignal?: number;
  pacientes?: PacienteCompleto[];
  pagamentosPacientes?: Record<string, PagamentoPaciente>;
  lembretes?: Lembrete[];
  onOpenProntuario?: (pacienteId: string) => void;
  onOpenPaciente?: (pacienteId: string) => void;
  onOpenFinanceiro?: (pacienteId: string) => void;
  onMutateLembretes?: (mutation: LembretesMutation) => void;
  themeHome?: 'light' | 'dark';
};

function LeadsMedicoCrmViewInner({
  medicoId,
  userEmail,
  onOpenMessages,
  variant = 'standalone',
  onOpenManual,
  refreshSignal = 0,
  pacientes = [],
  pagamentosPacientes,
  lembretes = [],
  onOpenProntuario,
  onOpenPaciente,
  onOpenFinanceiro,
  onMutateLembretes,
  themeHome = 'dark',
}: InnerProps) {
  const t = useMedicoLeadsCrmTheme();
  const isHome = variant === 'home';
  const [leads, setLeads] = useState<LeadMedico[]>([]);
  const [pacientesLeads, setPacientesLeads] = useState<PacienteCompleto[]>([]);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadMedico | null>(null);
  const [lembretesPanelOpen, setLembretesPanelOpen] = useState(false);
  const [lembretesPanelSummary, setLembretesPanelSummary] = useState<Paciente360Summary | null>(null);
  const [filters, setFilters] = useState<MedicoCrmFiltersState>({
    busca: '',
    status: '',
    estado: '',
    minEstrelas: '',
    origem: '',
  });
  const [availableTags, setAvailableTags] = useState<CrmTag[]>([]);
  const [pipelineStages, setPipelineStages] = useState<CrmPipelineStage[]>([]);
  const [showStageManagerModal, setShowStageManagerModal] = useState(false);
  const [medicoNome, setMedicoNome] = useState<string | undefined>();
  const prevRefreshSignal = useRef(refreshSignal);

  useEffect(() => {
    if (!medicoId) return;
    MedicoService.getMedicoById(medicoId)
      .then((m) => setMedicoNome(m?.nome))
      .catch(() => setMedicoNome(undefined));
  }, [medicoId]);

  const loadCrmConfig = useCallback(async () => {
    if (!medicoId) return;
    const [tags, stages] = await Promise.all([
      CrmTagService.getCrmTagsByMedico(medicoId),
      CrmPipelineStageService.getCrmPipelineStages(medicoId),
    ]);
    setAvailableTags(tags);
    setPipelineStages(stages);
  }, [medicoId]);

  const load = useCallback(
    async (force?: boolean) => {
      if (force) setRefreshing(true);
      else setMessage(null);
      try {
        const result = await loadLeadsMedicoData({ medicoId, userEmail, force });
        setLeads(result.leadsMedico);
        setPacientesLeads(result.pacientesLeads ?? []);
        setReady(true);
      } catch (e) {
        setMessage({ type: 'err', text: (e as Error).message || 'Falha ao carregar leads.' });
      } finally {
        setRefreshing(false);
      }
    },
    [medicoId, userEmail]
  );

  useEffect(() => {
    void load();
    void loadCrmConfig();
  }, [load, loadCrmConfig]);

  useEffect(() => {
    if (refreshSignal > 0 && prevRefreshSignal.current !== refreshSignal) {
      void load(true);
      void loadCrmConfig();
    }
    prevRefreshSignal.current = refreshSignal;
  }, [refreshSignal, load, loadCrmConfig]);

  const estados = useMemo(
    () => [...new Set(leads.map((l) => l.estado).filter(Boolean))] as string[],
    [leads]
  );

  const stageConfigs = useMemo(
    () => buildResolvedPipelineStages(pipelineStages),
    [pipelineStages]
  );

  const pacientesCrm = useMemo(() => {
    const byId = new Map<string, PacienteCompleto>();
    for (const p of pacientes) {
      if (p.id) byId.set(p.id, p);
    }
    for (const p of pacientesLeads) {
      if (p.id && !byId.has(p.id)) byId.set(p.id, p);
    }
    return [...byId.values()];
  }, [pacientes, pacientesLeads]);

  const pacienteIndex = useMemo(() => buildPacienteLookupIndex(pacientesCrm), [pacientesCrm]);

  const leadsFiltrados = useMemo(() => {
    const q = filters.busca.trim().toLowerCase();
    const minEstrelas = filters.minEstrelas ? Number(filters.minEstrelas) : 0;
    return leads.filter((lead) => {
      if (filters.status && getLeadStageKey(lead) !== filters.status) return false;
      if (filters.estado && lead.estado !== filters.estado) return false;
      if (!matchesReferralFilter(lead, filters.origem)) return false;
      if (minEstrelas > 0 && (lead.estrelas || 0) < minEstrelas) return false;
      if (!q) return true;
      const paciente = resolvePacienteForLead(lead, pacienteIndex);
      const phoneDigits = (getLeadPhone(lead, paciente) || '').replace(/\D/g, '');
      return (
        lead.name.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        phoneDigits.includes(q.replace(/\D/g, ''))
      );
    });
  }, [leads, filters, pacienteIndex]);

  const pacienteByLeadId = useMemo(() => {
    const map = new Map<string, PacienteCompleto>();
    for (const lead of leadsFiltrados) {
      const paciente = resolvePacienteForLead(lead, pacienteIndex);
      if (paciente) map.set(lead.id, paciente);
    }
    return map;
  }, [leadsFiltrados, pacienteIndex]);

  const pipelineKpis = useMemo(
    () => computeCrmPipelineKpis(leadsFiltrados, stageConfigs),
    [leadsFiltrados, stageConfigs]
  );
  const referralKpis = useMemo(() => computeLeadReferralKpis(leadsFiltrados), [leadsFiltrados]);

  const paciente360ByLeadId = useMemo(
    () =>
      pacientesCrm.length > 0
        ? buildPaciente360SummariesForLeads({
            leads: leadsFiltrados,
            pacientes: pacientesCrm,
            pagamentos: pagamentosPacientes,
            lembretes,
          })
        : new Map(),
    [leadsFiltrados, pacientesCrm, pagamentosPacientes, lembretes]
  );

  const lembretesByLeadId = useMemo(
    () =>
      pacientesCrm.length > 0
        ? buildLembretesByLeadId({ leads: leadsFiltrados, pacientes: pacientesCrm, lembretes })
        : new Map(),
    [leadsFiltrados, pacientesCrm, lembretes]
  );

  const applyLeadsUpdate = useCallback(
    (nextLeads: LeadMedico[]) => {
      setLeads(nextLeads);
      const cached = metaadminSessionCache.getLeads(medicoId);
      metaadminSessionCache.setLeads(medicoId, {
        leadsMedico: nextLeads,
        leadsByStatus: groupLeadsByStatus(nextLeads),
        pacientesLeads: cached?.pacientesLeads ?? pacientesLeads,
        loadedAt: Date.now(),
      });
    },
    [medicoId, pacientesLeads]
  );

  const handleStageChange = useCallback(
    async (leadId: string, stageKey: string) => {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead || getLeadStageKey(lead) === stageKey) return;

      const snapshot = leads;
      const isDefault = isDefaultStageKey(stageKey);
      const optimistic = leads.map((l) => {
        if (l.id !== leadId) return l;
        return {
          ...l,
          status: isDefault ? (stageKey as LeadMedico['status']) : l.status,
          crmStageKey: isDefault ? undefined : stageKey,
          dataStatus: new Date(),
        };
      });
      applyLeadsUpdate(optimistic);
      if (selectedLead?.id === leadId) {
        const updated = optimistic.find((l) => l.id === leadId);
        if (updated) setSelectedLead(updated);
      }

      try {
        const id = lead.id || lead.uid;
        await LeadMedicoService.updateLeadStage(id, stageKey, userEmail || undefined);
      } catch {
        applyLeadsUpdate(snapshot);
        if (selectedLead?.id === leadId) {
          setSelectedLead(lead);
        }
        setMessage({ type: 'err', text: 'Erro ao mover lead. Tente novamente.' });
      }
    },
    [leads, applyLeadsUpdate, selectedLead, userEmail]
  );

  const handleLeadUpdated = (updated: LeadMedico) => {
    const next = leads.map((l) => (l.id === updated.id ? { ...l, ...updated } : l));
    applyLeadsUpdate(next);
    setSelectedLead(updated);
  };

  const handleTagsChange = useCallback(
    async (leadId: string, tags: LeadCrmTagSnapshot[]) => {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead) return;
      const snapshot = leads;
      const optimistic = leads.map((l) => (l.id === leadId ? { ...l, crmTags: tags } : l));
      applyLeadsUpdate(optimistic);
      try {
        await LeadMedicoService.updateLeadCrmTags(resolveLeadMedicoId(lead), tags, userEmail || undefined);
      } catch {
        applyLeadsUpdate(snapshot);
        setMessage({ type: 'err', text: 'Erro ao salvar tags do lead.' });
      }
    },
    [leads, applyLeadsUpdate, userEmail]
  );

  const handleCreateTag = useCallback(
    async (data: { label: string; color: string; backgroundColor?: string }) => {
      return CrmTagService.createCrmTag(medicoId, data);
    },
    [medicoId]
  );

  const handleUpdateTag = useCallback(
    async (tagId: string, data: { label: string; color: string; backgroundColor?: string }) => {
      await CrmTagService.updateCrmTag(medicoId, tagId, data);
    },
    [medicoId]
  );

  const handleReferralSaved = useCallback(
    (leadId: string, referral: LeadReferralSnapshot) => {
      const next = leads.map((l) => (l.id === leadId ? { ...l, referral } : l));
      applyLeadsUpdate(next);
      if (selectedLead?.id === leadId) {
        setSelectedLead({ ...selectedLead, referral });
      }
    },
    [leads, applyLeadsUpdate, selectedLead]
  );

  const handleArchiveTag = useCallback(
    async (tagId: string) => {
      await CrmTagService.archiveCrmTag(medicoId, tagId);
    },
    [medicoId]
  );

  const refreshPipelineStages = useCallback(async () => {
    const stages = await CrmPipelineStageService.getCrmPipelineStages(medicoId);
    setPipelineStages(stages);
  }, [medicoId]);

  const openLembretesPanel = useCallback((summary: Paciente360Summary) => {
    if (!buildPaciente360LembreteDraft(summary)) return;
    setLembretesPanelSummary(summary);
    setLembretesPanelOpen(true);
  }, []);

  const lembretesPanelPaciente = useMemo(() => {
    if (!lembretesPanelSummary?.pacienteId) return [];
    return lembretes.filter((l) => l.pacienteId === lembretesPanelSummary.pacienteId);
  }, [lembretes, lembretesPanelSummary]);

  const lembretesPanelDraft = useMemo(() => {
    if (!lembretesPanelSummary) return undefined;
    const draft = buildPaciente360LembreteDraft(lembretesPanelSummary);
    if (!draft) return undefined;
    return {
      pacienteId: draft.pacienteId,
      pacienteNome: draft.pacienteNome,
      texto: draft.texto,
      tag: draft.tag,
    } satisfies ModalNovoLembreteInitialValues;
  }, [lembretesPanelSummary]);

  const selectedSummary = selectedLead ? paciente360ByLeadId.get(selectedLead.id) : undefined;

  const selectedPaciente = useMemo(() => {
    if (!selectedLead) return null;
    return resolvePacienteForLead(selectedLead, pacienteIndex);
  }, [selectedLead, pacienteIndex]);

  const selectedPagamento = selectedPaciente?.id
    ? pagamentosPacientes?.[selectedPaciente.id]
    : undefined;

  const selectedLembretes = useMemo(() => {
    if (!selectedPaciente?.id) return [];
    return lembretes.filter((l) => l.pacienteId === selectedPaciente.id);
  }, [selectedPaciente, lembretes]);

  const headerActions = (
    <div className="flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
      {onOpenManual && (
        <button
          type="button"
          onClick={onOpenManual}
          className={`inline-flex items-center gap-1 lg:gap-2 px-2 py-1.5 lg:px-3 lg:py-1.5 rounded-md lg:rounded-lg transition-colors text-xs lg:text-sm ${t.btnSecondary}`}
        >
          <HelpCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          <span className="hidden sm:inline">Manual</span>
        </button>
      )}
      <button
        type="button"
        onClick={() => void load(true)}
        disabled={refreshing}
        className={`inline-flex items-center gap-1 lg:gap-2 px-2 py-1.5 lg:px-3 lg:py-1.5 rounded-md lg:rounded-lg transition-colors disabled:opacity-50 text-xs lg:text-sm ${
          isHome ? `${t.btnPrimary}` : t.btnSecondary
        }`}
      >
        <RefreshCw className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${refreshing ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">Atualizar</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {isHome ? (
        <div className="flex items-center justify-between mb-2 lg:mb-4 gap-3">
          <h3 className={`text-base lg:text-lg font-semibold ${t.textPrimary}`}>Pipeline de Qualificação</h3>
          {headerActions}
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className={`text-lg font-bold ${t.textPrimary}`}>CRM de Leads</h2>
            <p className={`text-xs ${t.textMuted}`}>Pacientes que solicitaram contato com você</p>
          </div>
          {headerActions}
        </div>
      )}

      {message && (
        <div
          className={`text-sm px-3 py-2 rounded-lg border ${
            message.type === 'ok' ? t.messageOk : t.messageErr
          }`}
        >
          {message.text}
        </div>
      )}

      <CrmHomeKpisCollapsible collapsibleOnMobile={isHome}>
        <LeadsMedicoCrmKpis pipelineKpis={pipelineKpis} />
        <LeadsMedicoReferralKpis kpis={referralKpis} />
        <LeadsMedicoCrmFilters filters={filters} onChange={setFilters} estados={estados} />
      </CrmHomeKpisCollapsible>

      {!ready ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className={`w-8 h-8 animate-spin ${t.spinner}`} />
          <p className={`mt-3 text-sm ${t.textMuted}`}>Carregando leads...</p>
        </div>
      ) : (
        <LeadsMedicoKanban
          leads={leadsFiltrados}
          medicoId={medicoId}
          stageConfigs={stageConfigs}
          availableTags={availableTags}
          paciente360ByLeadId={paciente360ByLeadId}
          pacienteByLeadId={pacienteByLeadId}
          lembretesByLeadId={lembretesByLeadId}
          onOpenLead={setSelectedLead}
          onStageChange={handleStageChange}
          onTagsChange={handleTagsChange}
          onTagsCatalogChange={setAvailableTags}
          onCreateTag={handleCreateTag}
          onUpdateTag={handleUpdateTag}
          onArchiveTag={handleArchiveTag}
          onOpenProntuario={onOpenProntuario}
          onEditCrm={() => setShowStageManagerModal(true)}
          medicoNome={medicoNome}
          userEmail={userEmail}
          pacientes={pacientes}
          onReferralSaved={handleReferralSaved}
          onCreateReminder={(lead, summary) => {
            setSelectedLead(lead);
            openLembretesPanel(summary);
          }}
        />
      )}

      <CrmPipelineStageManagerModal
        open={showStageManagerModal}
        onClose={() => setShowStageManagerModal(false)}
        medicoId={medicoId}
        leads={leads}
        userEmail={userEmail}
        onRefreshStages={refreshPipelineStages}
        onLeadsUpdated={applyLeadsUpdate}
      />

      {selectedLead && (
        <LeadsMedicoCrmSheet
          lead={selectedLead}
          userEmail={userEmail}
          paciente360Summary={selectedSummary}
          paciente={selectedPaciente}
          pagamento={selectedPagamento}
          lembretesPaciente={selectedLembretes}
          onClose={() => setSelectedLead(null)}
          onUpdated={handleLeadUpdated}
          onOpenMessages={onOpenMessages}
          onOpenProntuario={
            onOpenProntuario
              ? (pacienteId) => {
                  onOpenProntuario(pacienteId);
                  setSelectedLead(null);
                }
              : undefined
          }
          onOpenPaciente={
            onOpenPaciente
              ? (pacienteId) => {
                  onOpenPaciente(pacienteId);
                  setSelectedLead(null);
                }
              : undefined
          }
          onCreateReminder={
            selectedSummary ? () => openLembretesPanel(selectedSummary) : undefined
          }
          stageConfigs={stageConfigs}
          onStageChange={handleStageChange}
          onOpenFinanceiro={onOpenFinanceiro}
        />
      )}

      {lembretesPanelOpen && lembretesPanelSummary?.pacienteId && (
        <ModalLembretesPaciente
          pacienteId={lembretesPanelSummary.pacienteId}
          pacienteNome={lembretesPanelSummary.nome}
          lembretes={lembretesPanelPaciente}
          pacientes={pacientes}
          medicoId={medicoId}
          isDark={themeHome === 'dark'}
          draftForNew={lembretesPanelDraft}
          onFechar={() => {
            setLembretesPanelOpen(false);
            setLembretesPanelSummary(null);
          }}
          onMutate={onMutateLembretes}
        />
      )}
    </div>
  );
}

type Props = InnerProps & {
  themeHome: 'light' | 'dark';
};

export default function LeadsMedicoCrmView({ themeHome, ...rest }: Props) {
  const themeVariant = whiteLabelCrmVariantFromMetaadminHome(themeHome);
  return (
    <MedicoLeadsCrmProvider themeVariant={themeVariant}>
      <LeadsMedicoCrmViewInner themeHome={themeHome} {...rest} />
    </MedicoLeadsCrmProvider>
  );
}
