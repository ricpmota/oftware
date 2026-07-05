'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, CreditCard, Loader2, MessageCircle, Star, X } from 'lucide-react';
import { useMedicoLeadsCrmTheme } from '@/components/crm/medico/MedicoLeadsCrmProvider';
import {
  formatOrcamentoBrl,
  mergeLeadMedicoTimelineWithBaseline,
  parseOrcamentoInput,
  resolveLeadMedicoId,
} from '@/lib/crm/leadMedicoCrmUtils';
import { getLeadEmail, getLeadPhone } from '@/lib/crm/leadContactHelpers';
import { getLeadStageKey } from '@/lib/crm/leadStageKey';
import type { ResolvedCrmPipelineStage } from '@/lib/crm/resolveCrmPipelineStages';
import Paciente360QuickActions from '@/components/metaadmin/paciente360/Paciente360QuickActions';
import Paciente360SheetHeader, {
  Paciente360SheetHeaderUnavailable,
} from '@/components/metaadmin/paciente360/Paciente360SheetHeader';
import Paciente360Timeline from '@/components/metaadmin/paciente360/Paciente360Timeline';
import { buildPaciente360TimelineEvents } from '@/lib/paciente360/buildPaciente360TimelineEvents';
import { mergeCrmUnifiedTimeline } from '@/lib/paciente360/mergeCrmUnifiedTimeline';
import { LeadMedicoService } from '@/services/leadMedicoService';
import { LeadMedicoTimelineService } from '@/services/leadMedicoTimelineService';
import type { LeadMedico } from '@/types/leadMedico';
import type { Paciente360Summary } from '@/types/paciente360';
import type { LeadMedicoTimelineEvent } from '@/types/leadMedicoTimeline';
import type { Lembrete } from '@/types/lembrete';
import type { PagamentoPaciente } from '@/types/pagamento';
import type { PacienteCompleto } from '@/types/obesidade';

type Props = {
  lead: LeadMedico;
  userEmail?: string | null;
  paciente360Summary?: Paciente360Summary;
  paciente?: PacienteCompleto | null;
  pagamento?: PagamentoPaciente | null;
  lembretesPaciente?: Lembrete[];
  onClose: () => void;
  onUpdated: (lead: LeadMedico) => void;
  onOpenMessages?: (lead: LeadMedico) => void;
  onOpenProntuario?: (pacienteId: string) => void;
  onOpenPaciente?: (pacienteId: string) => void;
  onOpenFinanceiro?: (pacienteId: string) => void;
  onCreateReminder?: () => void;
  stageConfigs?: ResolvedCrmPipelineStage[];
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

export default function LeadsMedicoCrmSheet({
  lead,
  userEmail,
  paciente360Summary,
  paciente,
  pagamento,
  lembretesPaciente,
  onClose,
  onUpdated,
  onOpenMessages,
  onOpenProntuario,
  onOpenPaciente,
  onOpenFinanceiro,
  onCreateReminder,
  stageConfigs = [],
  onStageChange,
}: Props) {
  const t = useMedicoLeadsCrmTheme();
  const [saving, setSaving] = useState(false);
  const [stageKey, setStageKey] = useState(() => getLeadStageKey(lead));
  const [observacoes, setObservacoes] = useState('');
  const [estrelas, setEstrelas] = useState(lead.estrelas || 0);
  const [orcamentoInput, setOrcamentoInput] = useState(
    lead.orcamento ? String(lead.orcamento) : ''
  );
  const [timeline, setTimeline] = useState<LeadMedicoTimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(true);

  const pacienteId = paciente360Summary?.pacienteId;

  const leadId = resolveLeadMedicoId(lead);
  const contactPhone = getLeadPhone(lead, paciente);
  const contactEmail = getLeadEmail(lead, paciente);
  const currentStageIndex = stageConfigs.findIndex((s) => s.stageKey === stageKey);
  const currentStageLabel =
    stageConfigs.find((s) => s.stageKey === stageKey)?.label ?? stageKey;

  const loadTimeline = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) setLoadingTimeline(true);
      try {
        const events = await LeadMedicoTimelineService.listByLead(leadId);
        setTimeline(events);
      } finally {
        if (!options?.silent) setLoadingTimeline(false);
      }
    },
    [leadId]
  );

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

  useEffect(() => {
    setStageKey(getLeadStageKey(lead));
    setEstrelas(lead.estrelas || 0);
    setOrcamentoInput(lead.orcamento ? String(lead.orcamento) : '');
  }, [lead]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const displayTimeline = useMemo(
    () => mergeLeadMedicoTimelineWithBaseline(timeline, lead),
    [timeline, lead]
  );

  const unifiedTimeline = useMemo(() => {
    const p360Timeline = paciente360Summary
      ? buildPaciente360TimelineEvents({
          summary: paciente360Summary,
          lead,
          paciente,
          pagamento,
          lembretes: lembretesPaciente,
          includeCrmBasics: false,
        })
      : { events: [] };
    return mergeCrmUnifiedTimeline(displayTimeline, p360Timeline);
  }, [displayTimeline, paciente360Summary, lead, paciente, pagamento, lembretesPaciente]);

  const saveStage = async (nextStageKey: string) => {
    if (nextStageKey === stageKey) return;
    const previousStageKey = stageKey;
    setStageKey(nextStageKey);
    setSaving(true);
    try {
      if (onStageChange) {
        await onStageChange(leadId, nextStageKey);
      } else {
        await LeadMedicoService.updateLeadStage(leadId, nextStageKey, userEmail || undefined);
      }
      await loadTimeline({ silent: true });
    } catch {
      setStageKey(previousStageKey);
    } finally {
      setSaving(false);
    }
  };

  const moveStage = async (direction: 'left' | 'right') => {
    if (currentStageIndex < 0 || stageConfigs.length === 0) return;
    const nextIndex = direction === 'right' ? currentStageIndex + 1 : currentStageIndex - 1;
    const next = stageConfigs[nextIndex];
    if (!next) return;
    await saveStage(next.stageKey);
  };

  const saveOrcamento = async () => {
    const parsed = parseOrcamentoInput(orcamentoInput);
    if (parsed === (lead.orcamento || 0)) return;
    setSaving(true);
    try {
      await LeadMedicoService.updateLeadOrcamento(leadId, parsed, userEmail || undefined);
      onUpdated({ ...lead, orcamento: parsed, atualizadoPor: userEmail || undefined });
      if (parsed > 0) {
        const description = `Orçamento definido: ${formatOrcamentoBrl(parsed)}`;
        const optimisticId = `optimistic-orcamento-${Date.now()}`;
        setTimeline((prev) => [
          {
            id: optimisticId,
            leadId,
            medicoId: lead.medicoId,
            type: 'note',
            description,
            createdBy: userEmail || undefined,
            createdAt: new Date(),
          },
          ...prev,
        ]);
        await LeadMedicoTimelineService.recordNote(
          leadId,
          lead.medicoId,
          description,
          userEmail || undefined
        );
        await loadTimeline({ silent: true });
      }
    } finally {
      setSaving(false);
    }
  };

  const saveObservacoes = async () => {
    const trimmed = observacoes.trim();
    if (!trimmed) return;

    setSaving(true);
    const optimisticId = `optimistic-note-${Date.now()}`;
    setTimeline((prev) => [
      {
        id: optimisticId,
        leadId,
        medicoId: lead.medicoId,
        type: 'note',
        description: trimmed,
        createdBy: userEmail || undefined,
        createdAt: new Date(),
      },
      ...prev,
    ]);
    setObservacoes('');
    try {
      await LeadMedicoTimelineService.recordNote(
        leadId,
        lead.medicoId,
        trimmed,
        userEmail || undefined
      );
      await loadTimeline({ silent: true });
    } catch {
      setTimeline((prev) => prev.filter((event) => event.id !== optimisticId));
      setObservacoes(trimmed);
    } finally {
      setSaving(false);
    }
  };

  const saveEstrelas = async (value: number) => {
    const next = lead.estrelas === value ? 0 : value;
    setSaving(true);
    try {
      await LeadMedicoService.updateLeadEstrelas(leadId, next, userEmail || undefined);
      setEstrelas(next);
      onUpdated({ ...lead, estrelas: next });
      await loadTimeline({ silent: true });
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div
      className="fixed inset-0 z-[99996] flex lg:justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lead-medico-crm-sheet-title"
      onClick={onClose}
    >
      <div className={`hidden lg:block absolute inset-0 ${t.sheetOverlay} backdrop-blur-sm`} aria-hidden />
      <div
        className={`relative w-full lg:max-w-5xl h-[100dvh] lg:h-full flex flex-col min-h-0 ${t.sheetBg} lg:border-l ${t.panelBorder} lg:shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex-shrink-0 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b ${t.divider} ${t.sheetBg} space-y-2`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 id="lead-medico-crm-sheet-title" className={`text-lg font-bold truncate ${t.textPrimary}`}>
                {lead.name}
              </h3>
              <span
                className={`inline-flex mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${t.badgeCount}`}
              >
                {currentStageLabel}
              </span>
            </div>
            <button type="button" onClick={onClose} className={`p-2 rounded-lg shrink-0 ${t.closeBtn}`} aria-label="Fechar">
              <X className="w-5 h-5" />
            </button>
          </div>

          {(contactEmail || contactPhone) && (
            <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] ${t.textMuted}`}>
              {contactEmail && <span className="break-all">{contactEmail}</span>}
              {contactEmail && contactPhone && <span aria-hidden>·</span>}
              {contactPhone && <span>{contactPhone}</span>}
            </div>
          )}

          <Paciente360QuickActions
            variant="compact"
            summary={paciente360Summary}
            lead={lead}
            paciente={paciente}
            onOpenProntuario={
              pacienteId && onOpenProntuario ? () => onOpenProntuario(pacienteId) : undefined
            }
            onOpenPaciente={
              pacienteId && onOpenPaciente ? () => onOpenPaciente(pacienteId) : undefined
            }
            onCreateReminder={onCreateReminder}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain lg:overflow-hidden lg:grid lg:grid-cols-2">
          <div
            className={`p-4 space-y-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:overflow-y-auto lg:min-h-0 lg:pb-4 border-b lg:border-b-0 lg:border-r ${t.divider}`}
          >
            <div className={`rounded-xl p-3 ${t.infoBox} space-y-2`}>
              {(lead.cidade || lead.estado) && (
                <p className={`text-sm ${t.textMuted}`}>
                  {[lead.cidade, lead.estado].filter(Boolean).join(' / ')}
                </p>
              )}
              <p className={`text-xs ${t.textSubtle}`}>Cadastro: {formatDate(lead.createdAt)}</p>
              <p className={`text-xs ${t.textSubtle}`}>Última movimentação: {formatDate(lead.dataStatus)}</p>
            </div>

            <div>
              <p className={`text-xs font-medium mb-2 ${t.label}`}>Classificação</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    disabled={saving}
                    onClick={() => void saveEstrelas(star)}
                    className="p-0.5 hover:scale-110 transition-transform disabled:opacity-50"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= estrelas ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={`text-xs font-medium mb-1 block ${t.label}`}>Orçamento (R$)</label>
              <input
                type="text"
                inputMode="decimal"
                value={orcamentoInput}
                onChange={(e) => setOrcamentoInput(e.target.value)}
                placeholder="Ex.: 12000"
                className={t.input}
              />
              <p className={`text-[10px] ${t.textSubtle} mt-1`}>
                Usado na receita projetada do pipeline (leads ativos, exceto concluídos e excluídos).
              </p>
              <div className="mt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveOrcamento()}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium ${t.btnPrimary} disabled:opacity-50`}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Salvar orçamento'}
                </button>
                <button
                  type="button"
                  disabled={!pacienteId || !onOpenFinanceiro}
                  title={
                    pacienteId && onOpenFinanceiro
                      ? 'Abrir controle financeiro do paciente'
                      : 'Controle financeiro disponível após vínculo com paciente.'
                  }
                  onClick={() => {
                    if (!pacienteId || !onOpenFinanceiro) return;
                    onOpenFinanceiro(pacienteId);
                    onClose();
                  }}
                  className={`flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border ${t.btnSecondary} disabled:opacity-50`}
                >
                  <CreditCard className="w-4 h-4 shrink-0" />
                  Controle financeiro
                </button>
              </div>
            </div>

            <div>
              <label className={`text-xs font-medium mb-2 block ${t.label}`}>Estágio do pipeline</label>
              <div className={`flex items-center gap-2 mb-2 ${t.infoBox} rounded-xl p-2`}>
                <button
                  type="button"
                  disabled={saving || currentStageIndex <= 0}
                  onClick={() => void moveStage('left')}
                  className={`p-2 rounded-lg disabled:opacity-40 ${t.btnSecondary}`}
                  title="Estágio anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <select
                  value={stageKey}
                  disabled={saving || stageConfigs.length === 0}
                  onChange={(e) => {
                    const next = e.target.value;
                    setStageKey(next);
                    void saveStage(next);
                  }}
                  className={`${t.input} flex-1 min-w-0`}
                >
                  {stageConfigs.map((s) => (
                    <option key={s.stageKey} value={s.stageKey}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={saving || currentStageIndex < 0 || currentStageIndex >= stageConfigs.length - 1}
                  onClick={() => void moveStage('right')}
                  className={`p-2 rounded-lg disabled:opacity-40 ${t.btnSecondary}`}
                  title="Próximo estágio"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className={`text-xs font-medium mb-1 block ${t.label}`}>Observações</label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
                className={t.input}
                placeholder="Escreva uma observação — ao salvar, ela vai para a timeline..."
              />
              <button
                type="button"
                disabled={saving || !observacoes.trim()}
                onClick={() => void saveObservacoes()}
                className={`mt-2 w-full py-2 rounded-lg text-sm font-medium ${t.btnPrimary} disabled:opacity-50`}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Salvar observação'}
              </button>
            </div>

            {onOpenMessages && (
              <button
                type="button"
                onClick={() => onOpenMessages(lead)}
                className={`inline-flex w-full items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium ${t.btnSecondary}`}
              >
                <MessageCircle className="w-4 h-4" />
                Mensagens do paciente
              </button>
            )}
          </div>

          <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:overflow-y-auto lg:min-h-0 lg:pb-4 space-y-4">
            {paciente360Summary ? (
              <Paciente360SheetHeader
                summary={paciente360Summary}
                lead={lead}
                paciente={paciente}
                onOpenProntuario={
                  pacienteId && onOpenProntuario ? () => onOpenProntuario(pacienteId) : undefined
                }
                onCreateReminder={onCreateReminder}
              />
            ) : (
              <Paciente360SheetHeaderUnavailable />
            )}

            <div>
              <h4 className={`text-sm font-bold ${t.textPrimary} mb-3`}>Histórico</h4>
              {loadingTimeline ? (
                <div className="flex justify-center py-10">
                  <Loader2 className={`w-6 h-6 animate-spin ${t.spinner}`} />
                </div>
              ) : (
                <Paciente360Timeline events={unifiedTimeline} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
