'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  FileText,
  Handshake,
  Loader2,
  MessageCircle,
  Trash2,
  Trophy,
  X,
  XCircle,
} from 'lucide-react';
import CadastroWhiteLabelDetailPanel, {
  cadastroWhiteLabelDisplayName,
} from '@/components/crm/whiteLabel/CadastroWhiteLabelDetailPanel';
import LeadWhiteLabelQuestionnairePanel from '@/components/crm/whiteLabel/LeadWhiteLabelQuestionnairePanel';
import { useWhiteLabelCrmContext, useWhiteLabelCrmTheme } from '@/components/crm/whiteLabel/WhiteLabelCrmProvider';
import WhiteLabelManualMeetingPicker from '@/components/metaadmingeral/WhiteLabelManualMeetingPicker';
import { formatDomainPreview } from '@/lib/whiteLabel/cadastroMedicoConstants';
import { formatLeadWhiteLabelContactDisplay } from '@/lib/whiteLabel/leadWhiteLabelNormalize';
import { buildLeadWhatsappUrl } from '@/lib/whatsapp/resolveLeadPhone';
import { scoreCategoryEmoji } from '@/lib/whiteLabel/calculateWhiteLabelLeadScore';
import { whiteLabelProfissaoLabel, whiteLabelRegistroLabel } from '@/lib/whiteLabel/profissao';
import type { CadastroMedicoWhiteLabel } from '@/types/cadastroMedicoWhiteLabel';
import type { LeadWhiteLabel } from '@/types/leadWhiteLabel';
import type { WhiteLabelLeadTimelineEvent } from '@/types/leadWhiteLabelCrm';
import { WHITELABEL_CRM_STAGES, type WhiteLabelCrmStage } from '@/types/leadWhiteLabelCrm';

const ACTION_STAGE: Record<string, WhiteLabelCrmStage> = {
  qualified: 'QUALIFICADO',
  meeting_completed: 'REUNIAO_REALIZADA',
  proposal_sent: 'PROPOSTA_ENVIADA',
  negotiation_started: 'NEGOCIACAO',
  closed: 'FECHADO',
  lost: 'PERDIDO',
};

type SheetTab = 'crm' | 'respostas' | 'cadastro' | 'timeline';

type Props = {
  lead: LeadWhiteLabel;
  cadastro?: CadastroMedicoWhiteLabel | null;
  onClose: () => void;
  onUpdated: (lead: LeadWhiteLabel) => void;
  onDeleted: (leadId: string) => void;
};

function formatTimelineDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LeadsWhiteLabelCrmSheet({
  lead,
  cadastro = null,
  onClose,
  onUpdated,
  onDeleted,
}: Props) {
  const t = useWhiteLabelCrmTheme();
  const { api, authFetch } = useWhiteLabelCrmContext();
  const [tab, setTab] = useState<SheetTab>('crm');
  const [timeline, setTimeline] = useState<WhiteLabelLeadTimelineEvent[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');
  const [crmMedico, setCrmMedico] = useState(lead.crmMedico || '');
  const [especialidade, setEspecialidade] = useState(lead.especialidade || '');
  const [cidade, setCidade] = useState(lead.cidade || '');
  const [estado, setEstado] = useState(lead.estado || '');
  const [observacoes, setObservacoes] = useState(lead.observacoes || '');
  const [projectedRevenue, setProjectedRevenue] = useState(String(lead.crmMetrics?.projectedRevenue ?? ''));
  const [realizedRevenue, setRealizedRevenue] = useState(String(lead.crmMetrics?.realizedRevenue ?? ''));

  const loadTimeline = useCallback(async () => {
    setLoadingTimeline(true);
    try {
      const res = await authFetch(api.timeline(lead.id));
      const data = (await res.json()) as { events?: WhiteLabelLeadTimelineEvent[] };
      setTimeline(
        (data.events || []).map((e) => ({
          ...e,
          createdAt: e.createdAt ? new Date(e.createdAt as unknown as string) : null,
        }))
      );
    } finally {
      setLoadingTimeline(false);
    }
  }, [api, authFetch, lead.id]);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  useEffect(() => {
    setCrmMedico(lead.crmMedico || '');
    setEspecialidade(lead.especialidade || '');
    setCidade(lead.cidade || '');
    setEstado(lead.estado || '');
    setObservacoes(lead.observacoes || '');
    setProjectedRevenue(String(lead.crmMetrics?.projectedRevenue ?? ''));
    setRealizedRevenue(String(lead.crmMetrics?.realizedRevenue ?? ''));
    setTab('crm');
  }, [lead.id]); // eslint-disable-line react-hooks/exhaustive-deps -- reset form when switching leads

  const runAction = async (action: string, actionNote?: string) => {
    setSaving(true);
    try {
      const res = await authFetch(api.crmAction, {
        method: 'POST',
        body: JSON.stringify({ leadId: lead.id, action, note: actionNote }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha na ação.');
      await loadTimeline();
      const nextStage = ACTION_STAGE[action];
      if (nextStage) {
        onUpdated({
          ...lead,
          crm: { stage: nextStage, updatedAt: new Date(), owner: lead.crm?.owner },
        });
      } else {
        onUpdated(lead);
      }
      if (action === 'note') setNote('');
    } finally {
      setSaving(false);
    }
  };

  const parseRevenueInput = (value: string): number => {
    const normalized = value.replace(/\./g, '').replace(',', '.').trim();
    if (!normalized) return 0;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };

  const deleteLead = async () => {
    const confirmed = window.confirm(
      `Excluir o lead "${lead.nome}"?\n\nEsta ação não pode ser desfeita. O horário reservado, se houver, será liberado na agenda.`
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const res = await authFetch(`${api.leads}?id=${encodeURIComponent(lead.id)}`, { method: 'DELETE' });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao excluir lead.');
      onDeleted(lead.id);
    } finally {
      setSaving(false);
    }
  };

  const saveMeta = async () => {
    setSaving(true);
    try {
      const projected = parseRevenueInput(projectedRevenue);
      const realized = parseRevenueInput(realizedRevenue);
      const res = await authFetch(api.leads, {
        method: 'PATCH',
        body: JSON.stringify({
          id: lead.id,
          crmMedico,
          especialidade,
          cidade,
          estado,
          observacoes,
          projectedRevenue: projected,
          realizedRevenue: realized,
        }),
      });
      if (!res.ok) throw new Error('Falha ao salvar dados.');
      onUpdated({
        ...lead,
        crmMedico,
        especialidade,
        cidade,
        estado,
        observacoes,
        crmMetrics: { projectedRevenue: projected, realizedRevenue: realized },
      });
    } finally {
      setSaving(false);
    }
  };

  const score = lead.leadScoreDetail?.score ?? lead.leadScore;
  const category = lead.leadScoreDetail?.category ?? 'cold';
  const dominio =
    cadastro?.dominioDesejado && cadastro?.extensaoDominio
      ? formatDomainPreview(cadastro.dominioDesejado, cadastro.extensaoDominio)
      : '';

  const tabs: { id: SheetTab; label: string; badge?: string }[] = [
    { id: 'crm', label: 'CRM' },
    { id: 'respostas', label: 'Respostas /whitelabel' },
    {
      id: 'cadastro',
      label: 'Cadastro onboarding',
      badge: cadastro
        ? cadastro.status === 'concluido'
          ? 'OK'
          : 'Rascunho'
        : undefined,
    },
    { id: 'timeline', label: 'Timeline' },
  ];

  return (
    <div className={`fixed inset-0 z-50 flex justify-end ${t.sheetOverlay} backdrop-blur-sm`}>
      <div className={`w-full max-w-5xl h-full ${t.sheetBg} border-l ${t.panelBorder} flex flex-col shadow-2xl`}>
        <div className={`flex items-center justify-between px-4 py-3 border-b ${t.divider}`}>
          <div>
            <h3 className={`text-lg font-bold ${t.textPrimary}`}>{lead.nome}</h3>
            <p className={`text-xs ${t.textSubtle}`}>
              {whiteLabelProfissaoLabel(lead.profissao || 'medico')}
              {' · '}
              {WHITELABEL_CRM_STAGES.find((s) => s.value === lead.crm?.stage)?.label || '—'}
              {cadastro ? ` · ${cadastroWhiteLabelDisplayName(cadastro)}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className={`p-2 rounded-lg ${t.closeBtn}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`flex flex-wrap gap-1 px-4 py-2 border-b ${t.divider}`}>
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                tab === item.id ? t.btnPrimary : t.actionBtn
              }`}
            >
              {item.label}
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    cadastro?.status === 'concluido'
                      ? 'bg-emerald-500/20 text-emerald-200'
                      : 'bg-amber-500/20 text-amber-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'crm' && (
            <div className="space-y-4 max-w-2xl">
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 rounded-full bg-orange-500/15 text-orange-200 border border-orange-500/25">
                  {scoreCategoryEmoji(category)} Score {score}
                </span>
                {cadastro && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full border inline-flex items-center gap-1 ${
                      cadastro.status === 'concluido'
                        ? 'bg-emerald-500/15 text-emerald-200 border-emerald-500/25'
                        : 'bg-amber-500/15 text-amber-200 border-amber-500/25'
                    }`}
                  >
                    <ClipboardList className="w-3.5 h-3.5" />
                    {cadastro.status === 'concluido'
                      ? 'Cadastro concluído'
                      : `Cadastro rascunho · etapa ${(cadastro.currentStep ?? 0) + 1}`}
                    {dominio ? ` · ${dominio}` : ''}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className={`${t.infoBox} rounded-lg p-3`}>
                  <p className={`text-[10px] ${t.textSubtle}`}>WhatsApp</p>
                  {buildLeadWhatsappUrl(lead) ? (
                    <a
                      href={buildLeadWhatsappUrl(lead) || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${t.textPrimary} hover:underline`}
                    >
                      {formatLeadWhiteLabelContactDisplay(lead)}
                    </a>
                  ) : (
                    <p className={t.textPrimary}>{formatLeadWhiteLabelContactDisplay(lead)}</p>
                  )}
                </div>
                <div className={`${t.infoBox} rounded-lg p-3`}>
                  <p className={`text-[10px] ${t.textSubtle}`}>E-mail</p>
                  <p className={`${t.textPrimary} break-all text-xs`}>{lead.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  value={crmMedico}
                  onChange={(e) => setCrmMedico(e.target.value)}
                  placeholder={`${whiteLabelRegistroLabel(lead.profissao || 'medico')} (ex: ${whiteLabelRegistroLabel(lead.profissao || 'medico')}-SP 123456)`}
                  className={t.input}
                />
                <input
                  value={especialidade}
                  onChange={(e) => setEspecialidade(e.target.value)}
                  placeholder="Especialidade"
                  className={t.input}
                />
                <input value={cidade} onChange={(e) => setCidade(e.target.value)} placeholder="Cidade" className={t.input} />
                <input value={estado} onChange={(e) => setEstado(e.target.value)} placeholder="UF" className={t.input} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs ${t.label}`}>Valor projetado do negócio (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={projectedRevenue}
                    onChange={(e) => setProjectedRevenue(e.target.value)}
                    placeholder="Ex.: 12000"
                    className={`${t.input} mt-1`}
                  />
                  <p className={`text-[10px] ${t.textSubtle} mt-1`}>
                    Usado na receita projetada do pipeline e nos KPIs.
                  </p>
                </div>
                <div>
                  <label className={`text-xs ${t.label}`}>Valor realizado (R$)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={realizedRevenue}
                    onChange={(e) => setRealizedRevenue(e.target.value)}
                    placeholder="Preencher ao fechar"
                    className={`${t.input} mt-1`}
                  />
                  <p className={`text-[10px] ${t.textSubtle} mt-1`}>
                    Ao fechar a venda, copiamos o projetado se este estiver vazio.
                  </p>
                </div>
              </div>

              {lead.meeting?.date ? (
                <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 text-sm text-cyan-100">
                  📅 Reunião: {lead.meeting.date} às {lead.meeting.startTime}
                  {lead.meeting.googleMeetLink && (
                    <a
                      href={lead.meeting.googleMeetLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-cyan-300 mt-1 underline"
                    >
                      Abrir Google Meet
                    </a>
                  )}
                </div>
              ) : (
                <WhiteLabelManualMeetingPicker leadId={lead.id} onScheduled={() => loadTimeline()} />
              )}

              <div className="space-y-2">
                <p className={`text-xs font-semibold ${t.textMuted} uppercase`}>Ações rápidas</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { action: 'meeting_completed', label: 'Reunião realizada', Icon: CheckCircle2 },
                    { action: 'proposal_sent', label: 'Enviar proposta', Icon: FileText },
                    { action: 'negotiation_started', label: 'Negociação', Icon: Handshake },
                    { action: 'closed', label: 'Fechar venda', Icon: Trophy },
                    { action: 'lost', label: 'Perdido', Icon: XCircle },
                  ].map(({ action, label, Icon }) => (
                    <button
                      key={action}
                      type="button"
                      disabled={saving}
                      onClick={() => runAction(action)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs disabled:opacity-50 ${t.actionBtn}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`text-xs ${t.label}`}>Observações</label>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={3}
                  className={`${t.input} mt-1`}
                />
              </div>

              <div className="flex gap-2">
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Adicionar nota na timeline..."
                  className={t.input}
                />
                <button
                  type="button"
                  disabled={saving || !note.trim()}
                  onClick={() => runAction('note', note)}
                  className={`shrink-0 px-3 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 ${t.noteBtn}`}
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={saveMeta}
                disabled={saving}
                className={`w-full py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50 ${t.btnPrimary}`}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Salvar dados do lead'}
              </button>

              <div className={`pt-4 border-t ${t.divider}`}>
                <button
                  type="button"
                  onClick={deleteLead}
                  disabled={saving}
                  className={`w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 ${t.deleteBtn}`}
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir lead
                </button>
              </div>
            </div>
          )}

          {tab === 'respostas' && <LeadWhiteLabelQuestionnairePanel lead={lead} />}

          {tab === 'cadastro' &&
            (cadastro ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      cadastro.status === 'concluido'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {cadastro.status === 'concluido'
                      ? 'Cadastro concluído'
                      : `Rascunho · etapa ${(cadastro.currentStep ?? 0) + 1} de 7`}
                  </span>
                  <span className={`text-xs ${t.textSubtle}`}>
                    Origem: {cadastro.origem || '—'} · {whiteLabelProfissaoLabel(cadastro.profissao || 'medico')}
                  </span>
                </div>
                <CadastroWhiteLabelDetailPanel cadastro={cadastro} />
              </div>
            ) : (
              <div className={`rounded-xl border ${t.panelBorder} ${t.infoBox} p-6 text-sm ${t.textMuted}`}>
                Nenhum cadastro de onboarding encontrado para este lead (e-mail/WhatsApp).
                <p className={`mt-2 text-xs ${t.textSubtle}`}>
                  O match usa o mesmo e-mail ou WhatsApp do formulário de{' '}
                  <code className="text-[11px]">/whitelabel/cadastromedico</code>,{' '}
                  <code className="text-[11px]">/cadastronutricionista</code> ou{' '}
                  <code className="text-[11px]">/cadastropersonal</code>.
                </p>
              </div>
            ))}

          {tab === 'timeline' &&
            (loadingTimeline ? (
              <div className="flex justify-center py-10">
                <Loader2 className={`w-6 h-6 animate-spin ${t.spinner}`} />
              </div>
            ) : timeline.length === 0 ? (
              <p className={`text-sm ${t.textSubtle}`}>Nenhum evento registrado.</p>
            ) : (
              <div className="space-y-0 max-w-xl">
                {timeline.map((event, idx) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2 h-2 rounded-full ${t.timelineDot} mt-2`} />
                      {idx < timeline.length - 1 && <div className={`w-px flex-1 ${t.timelineLine} my-1`} />}
                    </div>
                    <div className="pb-5 min-w-0">
                      <p className={`text-[10px] ${t.textSubtle} tabular-nums`}>
                        {formatTimelineDate(event.createdAt as unknown as string)}
                      </p>
                      <p className={`text-sm ${t.textPrimary} mt-0.5`}>{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
