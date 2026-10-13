'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import { useProfissionalCrmRole, useProfissionalCrmTheme } from '@/components/crm/profissional/ProfissionalCrmProvider';
import {
  formatOrcamentoBrl,
  getLeadMedicoOrigemBadge,
  parseOrcamentoInput,
  stageLabel,
} from '@/lib/crm/leadProfissionalCrmUtils';
import { getLeadProfissionalStageKey } from '@/lib/crm/leadProfissionalStageKey';
import type { ResolvedProfissionalPipelineStage } from '@/lib/crm/resolveProfissionalPipelineStages';
import { LeadProfissionalService } from '@/services/leadProfissionalService';
import { LeadProfissionalTimelineService } from '@/services/leadProfissionalTimelineService';
import type { LeadProfissional } from '@/types/leadProfissional';
import type { LeadProfissionalTimelineEvent } from '@/types/leadProfissionalTimeline';
import type { PacienteCompleto } from '@/types/obesidade';

type Props = {
  lead: LeadProfissional;
  userEmail?: string | null;
  paciente?: PacienteCompleto | null;
  stageConfigs: ResolvedProfissionalPipelineStage[];
  onClose: () => void;
  onUpdated: (lead: LeadProfissional) => void;
  onStageChange?: (leadId: string, stageKey: string) => Promise<void>;
};

function formatDate(d?: Date | null): string {
  if (!d) return '—';
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatConsultaLead(consulta?: LeadProfissional['consulta']): string | null {
  if (!consulta?.date || !consulta.startTime) return null;
  const [y, m, d] = consulta.date.split('-').map(Number);
  if (!y || !m || !d) return `${consulta.date} às ${consulta.startTime}`;
  const dia = new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return `${dia}, ${consulta.startTime}${consulta.endTime ? ` às ${consulta.endTime}` : ''}`;
}

export default function LeadsProfissionalCrmSheet({
  lead,
  userEmail,
  paciente,
  stageConfigs,
  onClose,
  onUpdated,
  onStageChange,
}: Props) {
  const t = useProfissionalCrmTheme();
  const role = useProfissionalCrmRole();
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timeline, setTimeline] = useState<LeadProfissionalTimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [orcamentoDraft, setOrcamentoDraft] = useState(
    lead.orcamento ? String(lead.orcamento) : ''
  );
  const [observacoesDraft, setObservacoesDraft] = useState(lead.observacoes || '');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    setOrcamentoDraft(lead.orcamento ? String(lead.orcamento) : '');
    setObservacoesDraft(lead.observacoes || '');
  }, [lead.id, lead.orcamento, lead.observacoes]);

  useEffect(() => {
    let cancelled = false;
    setLoadingTimeline(true);
    void LeadProfissionalTimelineService.listByLead(lead.id)
      .then((events) => {
        if (!cancelled) setTimeline(events);
      })
      .finally(() => {
        if (!cancelled) setLoadingTimeline(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lead.id, lead.dataStatus]);

  const badge = getLeadMedicoOrigemBadge(lead);
  const displayName =
    paciente?.dadosIdentificacao?.nomeCompleto?.trim() ||
    paciente?.nome?.trim() ||
    lead.name;
  const phone = lead.telefone || paciente?.dadosIdentificacao?.telefone || '—';
  const email = lead.email || paciente?.email || '—';
  const currentStage = getLeadProfissionalStageKey(lead);

  const handleStageSelect = async (stageKey: string) => {
    if (!onStageChange || stageKey === currentStage) return;
    setSaving(true);
    setMessage(null);
    try {
      await onStageChange(lead.id, stageKey);
      const events = await LeadProfissionalTimelineService.listByLead(lead.id);
      setTimeline(events);
    } catch {
      setMessage('Erro ao alterar estágio.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOrcamento = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const value = parseOrcamentoInput(orcamentoDraft);
      await LeadProfissionalService.updateLeadOrcamento(role, lead.id, value, userEmail || undefined);
      onUpdated({ ...lead, orcamento: value });
    } catch {
      setMessage('Erro ao salvar orçamento.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveObservacoes = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await LeadProfissionalService.updateLeadObservacoes(
        role,
        lead.id,
        observacoesDraft,
        userEmail || undefined
      );
      onUpdated({ ...lead, observacoes: observacoesDraft });
    } catch {
      setMessage('Erro ao salvar observações.');
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className={`fixed inset-0 z-[80] flex justify-end ${t.sheetOverlay}`}>
      <button type="button" className="absolute inset-0" aria-label="Fechar" onClick={onClose} />
      <aside
        className={`relative w-full max-w-md h-full ${t.sheetBg} border-l ${t.panelBorder} shadow-2xl flex flex-col`}
      >
        <div className={`flex items-start justify-between gap-3 px-4 py-4 border-b ${t.divider}`}>
          <div className="min-w-0">
            <h2 className={`text-lg font-semibold truncate ${t.textPrimary}`}>{displayName}</h2>
            <p className={`text-xs mt-1 ${t.textMuted}`}>{email}</p>
            <span
              className={`inline-flex items-center gap-1 mt-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.bgClass} ${badge.textClass}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${badge.dotClass}`} />
              {badge.label}
            </span>
          </div>
          <button type="button" onClick={onClose} className={`p-2 rounded-md ${t.closeBtn}`}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {message && (
            <div className={`text-sm px-3 py-2 rounded-lg border ${t.messageErr}`}>{message}</div>
          )}

          <div className={`${t.infoBox} rounded-xl p-3 space-y-1`}>
            <p className={`text-xs ${t.label}`}>Telefone</p>
            <p className={`text-sm ${t.textPrimary}`}>{phone}</p>
            <p className={`text-xs mt-2 ${t.label}`}>Estágio atual</p>
            <p className={`text-sm ${t.textPrimary}`}>{stageLabel(role, currentStage)}</p>
            {formatConsultaLead(lead.consulta) && (
              <>
                <p className={`text-xs mt-2 ${t.label}`}>Consulta agendada</p>
                <p className={`text-sm capitalize ${t.textPrimary}`}>{formatConsultaLead(lead.consulta)}</p>
              </>
            )}
            <p className={`text-xs mt-2 ${t.label}`}>Última atualização</p>
            <p className={`text-sm ${t.textPrimary}`}>{formatDate(lead.dataStatus)}</p>
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1.5 ${t.label}`}>Mover para estágio</label>
            <select
              value={currentStage}
              disabled={saving}
              onChange={(e) => void handleStageSelect(e.target.value)}
              className={t.input}
            >
              {stageConfigs.map((s) => (
                <option key={s.stageKey} value={s.stageKey}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1.5 ${t.label}`}>
              Orçamento {lead.orcamento ? `(${formatOrcamentoBrl(lead.orcamento)})` : ''}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                value={orcamentoDraft}
                onChange={(e) => setOrcamentoDraft(e.target.value)}
                className={t.input}
                placeholder="0"
              />
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSaveOrcamento()}
                className={`px-3 rounded-md text-sm font-medium ${t.btnPrimary}`}
              >
                Salvar
              </button>
            </div>
          </div>

          <div>
            <label className={`block text-xs font-medium mb-1.5 ${t.label}`}>Observações</label>
            <textarea
              value={observacoesDraft}
              onChange={(e) => setObservacoesDraft(e.target.value)}
              rows={4}
              className={t.input}
              placeholder="Anotações sobre o atendimento..."
            />
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSaveObservacoes()}
              className={`mt-2 px-3 py-2 rounded-md text-sm font-medium ${t.btnSecondary}`}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar observações'}
            </button>
          </div>

          <div>
            <p className={`text-xs font-medium mb-2 ${t.label}`}>Timeline</p>
            {loadingTimeline ? (
              <div className="flex justify-center py-6">
                <Loader2 className={`w-5 h-5 animate-spin ${t.spinner}`} />
              </div>
            ) : timeline.length === 0 ? (
              <p className={`text-sm ${t.textSubtle}`}>Nenhum evento registrado.</p>
            ) : (
              <div className="space-y-0">
                {timeline.map((event, idx) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full ${t.timelineDot} mt-2`} />
                      {idx < timeline.length - 1 && (
                        <div className={`w-px flex-1 ${t.timelineLine} my-1`} />
                      )}
                    </div>
                    <div className="pb-4 min-w-0">
                      <p className={`text-[10px] ${t.textSubtle} tabular-nums`}>
                        {formatDate(event.createdAt)}
                      </p>
                      <p className={`text-sm ${t.textPrimary} mt-0.5`}>{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>,
    document.body
  );
}
