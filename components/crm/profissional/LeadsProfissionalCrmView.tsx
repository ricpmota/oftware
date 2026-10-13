'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Kanban, Loader2, RefreshCw } from 'lucide-react';
import LeadsProfissionalCrmFilters, {
  type ProfissionalCrmFiltersState,
} from '@/components/crm/profissional/LeadsProfissionalCrmFilters';
import LeadsProfissionalCrmKpis from '@/components/crm/profissional/LeadsProfissionalCrmKpis';
import LeadsProfissionalCrmSheet from '@/components/crm/profissional/LeadsProfissionalCrmSheet';
import LeadsProfissionalKanban from '@/components/crm/profissional/LeadsProfissionalKanban';
import CrmProfissionalPipelineStageManagerModal from '@/components/crm/profissional/CrmProfissionalPipelineStageManagerModal';
import HomeKpisCollapsible from '@/components/crm/HomeKpisCollapsible';
import {
  ProfissionalCrmProvider,
  useProfissionalCrmTheme,
} from '@/components/crm/profissional/ProfissionalCrmProvider';
import { getLeadProfissionalStageKey, isDefaultProfissionalStageKey } from '@/lib/crm/leadProfissionalStageKey';
import { computeCrmPipelineKpis } from '@/lib/crm/leadProfissionalCrmUtils';
import { loadLeadsProfissionalData } from '@/lib/crm/loadLeadsProfissionalData';
import { useLeadPatientPhotos } from '@/lib/crm/useLeadPatientPhotos';
import {
  buildResolvedProfissionalPipelineStages,
  type ResolvedProfissionalPipelineStage,
} from '@/lib/crm/resolveProfissionalPipelineStages';
import { CrmTagService } from '@/services/crmTagService';
import { LeadProfissionalService } from '@/services/leadProfissionalService';
import { ProfissionalCrmPipelineStageService } from '@/services/profissionalCrmPipelineStageService';
import type { LeadProfissional, LeadProfissionalRole } from '@/types/leadProfissional';
import type { CrmTag, LeadCrmTagSnapshot } from '@/types/crmTag';
import type { Lembrete } from '@/types/lembrete';
import type { PacienteCompleto } from '@/types/obesidade';

export type PacienteCompartilhadoCrmItem = {
  vinculoId: string;
  pacienteId: string;
  paciente: PacienteCompleto;
  medicoId: string;
  medicoNome: string;
  dataCompartilhamento: Date;
};

type InnerProps = {
  role: LeadProfissionalRole;
  profissionalId: string;
  userEmail?: string | null;
  compartilhados: PacienteCompartilhadoCrmItem[];
  refreshSignal?: number;
  lembretes?: Lembrete[];
  onOpenAbaProfissional?: (pacienteId: string) => void;
  onCreateReminder?: (pacienteId: string, pacienteNome: string) => void;
};

function LeadsProfissionalCrmViewInner({
  role,
  profissionalId,
  userEmail,
  compartilhados,
  refreshSignal = 0,
  lembretes = [],
  onOpenAbaProfissional,
  onCreateReminder,
}: InnerProps) {
  const t = useProfissionalCrmTheme();
  const [leads, setLeads] = useState<LeadProfissional[]>([]);
  const [pacientes, setPacientes] = useState<PacienteCompleto[]>([]);
  const [ready, setReady] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadProfissional | null>(null);
  const [availableTags, setAvailableTags] = useState<CrmTag[]>([]);
  const [stageConfigs, setStageConfigs] = useState<ResolvedProfissionalPipelineStage[]>(() =>
    buildResolvedProfissionalPipelineStages(role, [])
  );
  const [showStageManagerModal, setShowStageManagerModal] = useState(false);
  const [filters, setFilters] = useState<ProfissionalCrmFiltersState>({
    busca: '',
    status: '',
    medicoId: '',
  });
  const compartilhadosRef = useRef(compartilhados);
  compartilhadosRef.current = compartilhados;

  const compartilhadosKey = useMemo(
    () =>
      compartilhados
        .map((c) => `${c.vinculoId}:${c.medicoId}:${c.pacienteId}`)
        .sort()
        .join('|'),
    [compartilhados]
  );

  const refreshPipelineStages = useCallback(async () => {
    if (!profissionalId) return;
    const docs = await ProfissionalCrmPipelineStageService.getCrmPipelineStages(role, profissionalId);
    setStageConfigs(buildResolvedProfissionalPipelineStages(role, docs));
  }, [role, profissionalId]);

  const loadCrmConfig = useCallback(async () => {
    if (!profissionalId) return;
    const [tags] = await Promise.all([
      CrmTagService.getCrmTagsByProfissional(role, profissionalId),
      refreshPipelineStages(),
    ]);
    setAvailableTags(tags);
  }, [role, profissionalId, refreshPipelineStages]);

  const load = useCallback(
    async (force?: boolean) => {
      if (!profissionalId) return;
      if (force) setRefreshing(true);
      else setMessage(null);
      try {
        const result = await loadLeadsProfissionalData({
          role,
          profissionalId,
          compartilhados: compartilhadosRef.current,
        });
        setLeads(result.leads);
        setPacientes(result.pacientes);
        setReady(true);
      } catch (e) {
        setMessage({ type: 'err', text: (e as Error).message || 'Falha ao carregar leads.' });
      } finally {
        setRefreshing(false);
      }
    },
    [role, profissionalId, compartilhadosKey]
  );

  useEffect(() => {
    void load();
    void loadCrmConfig();
  }, [load, loadCrmConfig, refreshSignal]);

  const medicos = useMemo(() => {
    const map = new Map<string, string>();
    for (const lead of leads) {
      if (lead.medicoId && !map.has(lead.medicoId)) {
        map.set(lead.medicoId, lead.medicoNome || 'Médico');
      }
    }
    return [...map.entries()]
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [leads]);

  const patientUserIds = useMemo(
    () => pacientes.map((p) => p.userId).filter((id): id is string => typeof id === 'string' && id.length > 0),
    [pacientes]
  );
  const patientPhotos = useLeadPatientPhotos(patientUserIds);

  const pacienteById = useMemo(() => {
    const map = new Map<string, PacienteCompleto>();
    for (const p of pacientes) {
      if (p.id) map.set(p.id, p);
    }
    return map;
  }, [pacientes]);

  const leadsFiltrados = useMemo(() => {
    const q = filters.busca.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return leads.filter((lead) => {
      if (filters.status && getLeadProfissionalStageKey(lead) !== filters.status) return false;
      if (filters.medicoId && lead.medicoId !== filters.medicoId) return false;
      if (!q) return true;
      const phoneDigits = (lead.telefone || '').replace(/\D/g, '');
      return (
        lead.name.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.medicoNome.toLowerCase().includes(q) ||
        (qDigits.length > 0 && phoneDigits.includes(qDigits))
      );
    });
  }, [leads, filters]);

  const pacienteByLeadId = useMemo(() => {
    const map = new Map<string, PacienteCompleto>();
    for (const lead of leadsFiltrados) {
      const paciente = pacienteById.get(lead.pacienteId);
      if (paciente) map.set(lead.id, paciente);
    }
    return map;
  }, [leadsFiltrados, pacienteById]);

  const lembretesByLeadId = useMemo(() => {
    const map = new Map<string, Lembrete[]>();
    for (const lead of leadsFiltrados) {
      const pacienteId = lead.pacienteId;
      if (!pacienteId) continue;
      const list = lembretes.filter((l) => l.pacienteId === pacienteId);
      if (list.length > 0) map.set(lead.id, list);
    }
    return map;
  }, [leadsFiltrados, lembretes]);

  const pipelineKpis = useMemo(
    () => computeCrmPipelineKpis(leadsFiltrados, stageConfigs, role),
    [leadsFiltrados, stageConfigs, role]
  );

  const handleStageChange = useCallback(
    async (leadId: string, stageKey: string) => {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead || getLeadProfissionalStageKey(lead) === stageKey) return;

      const snapshot = leads;
      const isDefault = isDefaultProfissionalStageKey(role, stageKey);
      const optimistic = leads.map((l) => {
        if (l.id !== leadId) return l;
        return {
          ...l,
          status: isDefault ? (stageKey as LeadProfissional['status']) : l.status,
          crmStageKey: isDefault ? undefined : stageKey,
          dataStatus: new Date(),
        };
      });
      setLeads(optimistic);
      if (selectedLead?.id === leadId) {
        const updated = optimistic.find((l) => l.id === leadId);
        if (updated) setSelectedLead(updated);
      }

      try {
        await LeadProfissionalService.updateLeadStage(role, leadId, stageKey, userEmail || undefined);
      } catch {
        setLeads(snapshot);
        if (selectedLead?.id === leadId) setSelectedLead(lead);
        setMessage({ type: 'err', text: 'Erro ao mover lead. Tente novamente.' });
      }
    },
    [leads, role, selectedLead, userEmail]
  );

  const handleLeadUpdated = (updated: LeadProfissional) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
    setSelectedLead(updated);
  };

  const handleTagsChange = useCallback(
    async (leadId: string, tags: LeadCrmTagSnapshot[]) => {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead) return;
      const snapshot = leads;
      const optimistic = leads.map((l) => (l.id === leadId ? { ...l, crmTags: tags } : l));
      setLeads(optimistic);
      try {
        await LeadProfissionalService.updateLeadCrmTags(role, leadId, tags, userEmail || undefined);
      } catch {
        setLeads(snapshot);
        setMessage({ type: 'err', text: 'Erro ao salvar tags do lead.' });
      }
    },
    [leads, role, userEmail]
  );

  const handleCreateTag = useCallback(
    async (data: { label: string; color: string; backgroundColor?: string }) => {
      return CrmTagService.createCrmTagForProfissional(role, profissionalId, data);
    },
    [role, profissionalId]
  );

  const handleUpdateTag = useCallback(
    async (tagId: string, data: { label: string; color: string; backgroundColor?: string }) => {
      await CrmTagService.updateCrmTagForProfissional(role, profissionalId, tagId, data);
    },
    [role, profissionalId]
  );

  const handleArchiveTag = useCallback(
    async (tagId: string) => {
      await CrmTagService.archiveCrmTagForProfissional(role, profissionalId, tagId);
    },
    [role, profissionalId]
  );

  const subtitle =
    role === 'nutri'
      ? 'Pacientes compartilhados pelos médicos'
      : 'Pacientes compartilhados pelos médicos';

  return (
    <div className="space-y-4">
      <div className="mb-2 flex items-center justify-between gap-3 lg:mb-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 lg:flex">
            <Kanban className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className={`text-base font-semibold lg:text-xl lg:tracking-tight ${t.textPrimary}`}>
              <span className="lg:hidden">Pipeline de Qualificação</span>
              <span className="hidden lg:inline">Leads</span>
            </h3>
            <p className={`text-xs lg:text-sm ${t.textMuted}`}>{subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            void load(true);
            void loadCrmConfig();
          }}
          disabled={refreshing}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 text-xs lg:text-sm ${t.btnPrimary}`}
        >
          <RefreshCw className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Atualizar</span>
        </button>
      </div>

      {message && (
        <div
          className={`text-sm px-3 py-2 rounded-lg border ${
            message.type === 'ok' ? t.messageOk : t.messageErr
          }`}
        >
          {message.text}
        </div>
      )}

      <HomeKpisCollapsible collapsibleOnMobile theme={t}>
        <LeadsProfissionalCrmKpis pipelineKpis={pipelineKpis} />
        <LeadsProfissionalCrmFilters filters={filters} onChange={setFilters} medicos={medicos} />
      </HomeKpisCollapsible>
      {!ready ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className={`w-8 h-8 animate-spin ${t.spinner}`} />
          <p className={`mt-3 text-sm ${t.textMuted}`}>Carregando leads...</p>
        </div>
      ) : (
        <LeadsProfissionalKanban
          leads={leadsFiltrados}
          stageConfigs={stageConfigs}
          pacienteByLeadId={pacienteByLeadId}
          lembretesByLeadId={lembretesByLeadId}
          profissionalId={profissionalId}
          availableTags={availableTags}
          onOpenLead={setSelectedLead}
          onStageChange={handleStageChange}
          onOpenAbaProfissional={onOpenAbaProfissional}
          onCreateReminder={onCreateReminder}
          onTagsChange={handleTagsChange}
          onTagsCatalogChange={setAvailableTags}
          onCreateTag={handleCreateTag}
          onUpdateTag={handleUpdateTag}
          onArchiveTag={handleArchiveTag}
          onEditCrm={() => setShowStageManagerModal(true)}
          patientPhotos={patientPhotos}
        />
      )}

      <CrmProfissionalPipelineStageManagerModal
        open={showStageManagerModal}
        onClose={() => setShowStageManagerModal(false)}
        role={role}
        profissionalId={profissionalId}
        leads={leads}
        userEmail={userEmail}
        onRefreshStages={refreshPipelineStages}
        onLeadsUpdated={setLeads}
      />

      {selectedLead && (
        <LeadsProfissionalCrmSheet
          lead={selectedLead}
          userEmail={userEmail}
          paciente={pacienteById.get(selectedLead.pacienteId)}
          stageConfigs={stageConfigs}
          onClose={() => setSelectedLead(null)}
          onUpdated={handleLeadUpdated}
          onStageChange={handleStageChange}
        />
      )}
    </div>
  );
}

export type LeadsProfissionalCrmViewProps = InnerProps & {
  themeVariant?: 'metaadmin-light' | 'metaadmin-dark';
};

export default function LeadsProfissionalCrmView({
  themeVariant = 'metaadmin-light',
  ...props
}: LeadsProfissionalCrmViewProps) {
  return (
    <ProfissionalCrmProvider role={props.role} themeVariant={themeVariant}>
      <LeadsProfissionalCrmViewInner {...props} />
    </ProfissionalCrmProvider>
  );
}
