'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import LeadsWhiteLabelCrmFilters, { type CrmFiltersState } from '@/components/crm/whiteLabel/LeadsWhiteLabelCrmFilters';
import LeadsWhiteLabelCrmKpis from '@/components/crm/whiteLabel/LeadsWhiteLabelCrmKpis';
import LeadsWhiteLabelCrmSheet from '@/components/crm/whiteLabel/LeadsWhiteLabelCrmSheet';
import LeadsWhiteLabelKanban from '@/components/crm/whiteLabel/LeadsWhiteLabelKanban';
import {
  WhiteLabelCrmProvider,
  useWhiteLabelCrmContext,
  useWhiteLabelCrmTheme,
} from '@/components/crm/whiteLabel/WhiteLabelCrmProvider';
import type { WhiteLabelCrmApiConfig } from '@/lib/crm/whiteLabelCrmConfig';
import type { WhiteLabelCrmThemeVariant } from '@/lib/crm/whiteLabelCrmTheme';
import type { WhiteLabelCrmKpis } from '@/lib/whiteLabel/leadCrmService';
import type { LeadWhiteLabel } from '@/types/leadWhiteLabel';
import type { WhiteLabelCrmStage, WhiteLabelLeadScoreCategory } from '@/types/leadWhiteLabelCrm';

type ApiLead = LeadWhiteLabel & {
  crm?: { stage: WhiteLabelCrmStage; owner?: string | null; updatedAt: string | null };
  leadScoreDetail?: { score: number; category: WhiteLabelLeadScoreCategory; updatedAt: string | null };
};

function parseLead(raw: ApiLead): LeadWhiteLabel {
  return {
    ...raw,
    createdAt: raw.createdAt ? new Date(raw.createdAt as unknown as string) : null,
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt as unknown as string) : null,
    crm: raw.crm
      ? { ...raw.crm, updatedAt: raw.crm.updatedAt ? new Date(raw.crm.updatedAt) : null }
      : undefined,
    leadScoreDetail: raw.leadScoreDetail
      ? {
          ...raw.leadScoreDetail,
          updatedAt: raw.leadScoreDetail.updatedAt ? new Date(raw.leadScoreDetail.updatedAt) : null,
        }
      : undefined,
    meeting: raw.meeting
      ? {
          ...raw.meeting,
          createdAt: raw.meeting.createdAt ? new Date(raw.meeting.createdAt as unknown as string) : null,
        }
      : undefined,
  };
}

const EMPTY_KPIS: WhiteLabelCrmKpis = {
  totalLeads: 0,
  hotLeads: 0,
  meetingsScheduled: 0,
  meetingsCompleted: 0,
  proposalsSent: 0,
  closedDeals: 0,
  projectedRevenue: 0,
  realizedRevenue: 0,
};

function LeadsWhiteLabelCrmViewInner() {
  const t = useWhiteLabelCrmTheme();
  const { api, authFetch } = useWhiteLabelCrmContext();
  const [leads, setLeads] = useState<LeadWhiteLabel[]>([]);
  const [kpis, setKpis] = useState<WhiteLabelCrmKpis>(EMPTY_KPIS);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadWhiteLabel | null>(null);
  const [filters, setFilters] = useState<CrmFiltersState>({
    busca: '',
    stage: '',
    score: '',
    especialidade: '',
    estado: '',
    cidade: '',
    meetingDate: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await authFetch(api.leads);
      const data = (await res.json()) as { leads?: ApiLead[]; kpis?: WhiteLabelCrmKpis; error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar leads.');
      setLeads((data.leads || []).map(parseLead));
      setKpis(data.kpis || EMPTY_KPIS);
    } catch (e) {
      setMessage({ type: 'err', text: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }, [api.leads, authFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const especialidades = useMemo(
    () => [...new Set(leads.map((l) => l.especialidade).filter(Boolean))] as string[],
    [leads]
  );
  const estados = useMemo(
    () => [...new Set(leads.map((l) => l.estado).filter(Boolean))] as string[],
    [leads]
  );

  const leadsFiltrados = useMemo(() => {
    const q = filters.busca.trim().toLowerCase();
    return leads.filter((lead) => {
      if (filters.stage && lead.crm?.stage !== filters.stage) return false;
      const cat = lead.leadScoreDetail?.category;
      if (filters.score && cat !== filters.score) return false;
      if (filters.especialidade && lead.especialidade !== filters.especialidade) return false;
      if (filters.estado && lead.estado !== filters.estado) return false;
      if (filters.cidade && !(lead.cidade || '').toLowerCase().includes(filters.cidade.toLowerCase())) return false;
      if (filters.meetingDate && lead.meeting?.date !== filters.meetingDate) return false;
      if (!q) return true;
      return (
        lead.nome.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.whatsapp.includes(q.replace(/\D/g, '')) ||
        (lead.crmMedico || '').toLowerCase().includes(q)
      );
    });
  }, [leads, filters]);

  const handleStageChange = useCallback(
    async (leadId: string, stage: WhiteLabelCrmStage) => {
      try {
        const res = await authFetch(api.leads, {
          method: 'PATCH',
          body: JSON.stringify({ id: leadId, crmStage: stage }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || 'Falha ao mover lead.');
        await load();
      } catch (e) {
        setMessage({ type: 'err', text: (e as Error).message });
      }
    },
    [api.leads, authFetch, load]
  );

  const handleLeadUpdated = useCallback(
    (updated: LeadWhiteLabel) => {
      setLeads((prev) => prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l)));
      setSelectedLead((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
      load();
    },
    [load]
  );

  const handleLeadDeleted = useCallback(
    (leadId: string) => {
      setSelectedLead(null);
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      setMessage({ type: 'ok', text: 'Lead excluído com sucesso.' });
      load();
    },
    [load]
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm disabled:opacity-50 ${t.btnSecondary}`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {message && (
        <div className={`rounded-lg px-4 py-3 text-sm ${message.type === 'ok' ? t.messageOk : t.messageErr}`}>
          {message.text}
        </div>
      )}

      <LeadsWhiteLabelCrmKpis kpis={kpis} />

      <LeadsWhiteLabelCrmFilters
        filters={filters}
        onChange={(patch) => setFilters((f) => ({ ...f, ...patch }))}
        especialidades={especialidades}
        estados={estados}
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className={`w-8 h-8 animate-spin ${t.spinner}`} />
        </div>
      ) : (
        <LeadsWhiteLabelKanban
          leads={leadsFiltrados}
          onOpenLead={setSelectedLead}
          onStageChange={handleStageChange}
        />
      )}

      {selectedLead && (
        <LeadsWhiteLabelCrmSheet
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdated={handleLeadUpdated}
          onDeleted={handleLeadDeleted}
        />
      )}
    </div>
  );
}

export type LeadsWhiteLabelCrmViewProps = {
  themeVariant?: WhiteLabelCrmThemeVariant;
  apiConfig?: Partial<WhiteLabelCrmApiConfig>;
};

export default function LeadsWhiteLabelCrmView({
  themeVariant = 'metaadmingeral-dark',
  apiConfig,
}: LeadsWhiteLabelCrmViewProps) {
  return (
    <WhiteLabelCrmProvider themeVariant={themeVariant} apiConfig={apiConfig}>
      <LeadsWhiteLabelCrmViewInner />
    </WhiteLabelCrmProvider>
  );
}
