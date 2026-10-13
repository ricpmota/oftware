'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Pencil, Plus, RotateCcw, Send, Trash2, X } from 'lucide-react';
import { useMedicoLeadsCrmTheme } from '@/components/crm/medico/MedicoLeadsCrmProvider';
import {
  isVirtualDefaultPresetId,
  renderWhatsAppLeadPresetBody,
  suggestWhatsAppLeadPresetDefaultKey,
  WHATSAPP_LEAD_PRESET_PLACEHOLDERS,
} from '@/lib/paciente360/whatsappLeadPresetDefaults';
import { buildPaciente360WhatsAppUrl } from '@/lib/paciente360/paciente360WhatsAppMessages';
import type { InternationalPhoneFields } from '@/lib/phone/buildWhatsappUrl';
import { WhatsAppLeadPresetService } from '@/services/whatsappLeadPresetService';
import type { LeadMedico } from '@/types/leadMedico';
import type { Paciente360Summary } from '@/types/paciente360';
import type { WhatsAppLeadPreset } from '@/types/whatsappLeadPreset';

type Props = {
  open: boolean;
  lead: LeadMedico;
  phoneRaw: string;
  ident?: InternationalPhoneFields | null;
  medicoId: string;
  organizationName?: string | null;
  paciente360Summary?: Paciente360Summary;
  onClose: () => void;
};

type EditorMode =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; preset: WhatsAppLeadPreset };

export default function LeadWhatsAppPresetModal({
  open,
  lead,
  phoneRaw,
  ident,
  medicoId,
  organizationName,
  paciente360Summary,
  onClose,
}: Props) {
  const t = useMedicoLeadsCrmTheme();
  const [presets, setPresets] = useState<WhatsAppLeadPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorMode>({ kind: 'closed' });
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');

  const suggestedKey = useMemo(
    () =>
      suggestWhatsAppLeadPresetDefaultKey({
        proximaAcaoTipo: paciente360Summary?.proximaAcao?.tipo,
        statusComposto: paciente360Summary?.statusComposto,
        proximaAcaoLabel: paciente360Summary?.proximaAcao?.label,
        leadStatus: lead.status,
      }),
    [paciente360Summary, lead.status]
  );

  const leadNome = lead.name || paciente360Summary?.nome || '';
  const orgLabel = (organizationName || '').trim() || 'nossa clínica';
  const renderVars = {
    nome: leadNome,
    organizacao: orgLabel,
    referral: lead.referral,
  };

  useEffect(() => {
    if (!open || !medicoId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setEditor({ kind: 'closed' });
    void (async () => {
      try {
        const list = await WhatsAppLeadPresetService.listEffective(medicoId);
        if (!cancelled) setPresets(list);
      } catch (e) {
        if (!cancelled) setError((e as Error).message || 'Erro ao carregar mensagens.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, medicoId]);

  const reloadPresets = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await WhatsAppLeadPresetService.listEffective(medicoId);
      setPresets(list);
    } catch (e) {
      setError((e as Error).message || 'Erro ao carregar mensagens.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editor.kind !== 'closed') setEditor({ kind: 'closed' });
        else onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, editor.kind, onClose]);

  const openCreate = () => {
    setDraftTitle('');
    setDraftBody('Olá, {nome}. Tudo bem? ');
    setEditor({ kind: 'create' });
    setError(null);
  };

  const openEdit = (preset: WhatsAppLeadPreset) => {
    setDraftTitle(preset.title);
    setDraftBody(preset.body);
    setEditor({ kind: 'edit', preset });
    setError(null);
  };

  const handleSaveEditor = async () => {
    const title = draftTitle.trim();
    const body = draftBody.trim();
    if (!title || !body) {
      setError('Preencha título e mensagem.');
      return;
    }

    setBusyId('save');
    setError(null);
    try {
      if (editor.kind === 'create') {
        await WhatsAppLeadPresetService.createCustom(medicoId, { title, body });
      } else if (editor.kind === 'edit') {
        const { preset } = editor;
        if (preset.defaultKey || isVirtualDefaultPresetId(preset.id)) {
          await WhatsAppLeadPresetService.upsert(medicoId, preset.defaultKey || preset.id, {
            title,
            body,
            defaultKey: preset.defaultKey,
            isDefault: true,
            order: preset.order,
            archived: false,
          });
        } else {
          await WhatsAppLeadPresetService.updateCustom(medicoId, preset.id, { title, body });
        }
      }
      setEditor({ kind: 'closed' });
      await reloadPresets();
    } catch (e) {
      setError((e as Error).message || 'Erro ao salvar.');
    } finally {
      setBusyId(null);
    }
  };

  const handleResetDefault = async (preset: WhatsAppLeadPreset) => {
    if (!preset.defaultKey) return;
    setBusyId(preset.id);
    setError(null);
    try {
      await WhatsAppLeadPresetService.resetDefault(medicoId, preset.defaultKey);
      await reloadPresets();
    } catch (e) {
      setError((e as Error).message || 'Erro ao restaurar padrão.');
    } finally {
      setBusyId(null);
    }
  };

  const handleArchiveCustom = async (preset: WhatsAppLeadPreset) => {
    if (preset.isDefault || preset.defaultKey) return;
    setBusyId(preset.id);
    setError(null);
    try {
      await WhatsAppLeadPresetService.archive(medicoId, preset.id);
      await reloadPresets();
    } catch (e) {
      setError((e as Error).message || 'Erro ao excluir.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSend = (preset: WhatsAppLeadPreset) => {
    const message = renderWhatsAppLeadPresetBody(preset.body, renderVars);
    const url = buildPaciente360WhatsAppUrl(phoneRaw, message, ident);
    if (!url) {
      setError('Telefone inválido para WhatsApp.');
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  if (!open || typeof document === 'undefined') return null;

  const previewBody =
    editor.kind !== 'closed'
      ? renderWhatsAppLeadPresetBody(draftBody || '', renderVars)
      : '';

  const content = (
    <div
      className="fixed inset-0 z-[10080] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg max-h-[min(90vh,640px)] flex flex-col rounded-2xl border shadow-2xl ${t.cardBg} ${t.cardBorder}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${t.divider}`}>
          <div className="min-w-0">
            <h2 className={`text-base font-semibold ${t.textPrimary}`}>Mensagens WhatsApp</h2>
            <p className={`text-xs mt-0.5 truncate ${t.textMuted}`}>
              {lead.name}
              {organizationName?.trim() ? ` · ${organizationName.trim()}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className={t.closeBtn} aria-label="Fechar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0 space-y-3">
          {error && <p className={`text-sm px-3 py-2 rounded-lg border ${t.messageErr}`}>{error}</p>}

          {editor.kind !== 'closed' ? (
            <div className="space-y-3">
              <p className={`text-sm font-medium ${t.textPrimary}`}>
                {editor.kind === 'create' ? 'Nova mensagem' : 'Editar mensagem'}
              </p>
              <div>
                <label className={`block text-xs font-medium mb-1 ${t.label}`}>Título</label>
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className={`w-full px-3 py-2 text-sm rounded-lg border ${t.input}`}
                  placeholder="Ex.: Boas-vindas"
                  maxLength={80}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1 ${t.label}`}>Mensagem</label>
                <textarea
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  rows={5}
                  className={`w-full px-3 py-2 text-sm rounded-lg border resize-y min-h-[120px] ${t.input}`}
                  placeholder="Olá, {nome}. ..."
                  maxLength={1500}
                />
                <p className={`mt-1.5 text-[11px] ${t.textSubtle}`}>
                  Placeholders:{' '}
                  {WHATSAPP_LEAD_PRESET_PLACEHOLDERS.map((p) => p.token).join(' · ')}
                </p>
              </div>
              {previewBody.trim() && (
                <div className={`rounded-lg border px-3 py-2 ${t.cardBorder}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${t.textSubtle}`}>
                    Prévia
                  </p>
                  <p className={`text-sm whitespace-pre-wrap ${t.textPrimary}`}>{previewBody}</p>
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditor({ kind: 'closed' })}
                  className={`px-3 py-1.5 text-sm rounded-lg ${t.btnSecondary}`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={busyId === 'save'}
                  onClick={() => void handleSaveEditor()}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium ${t.btnPrimary}`}
                >
                  {busyId === 'save' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Salvar
                </button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className={`w-7 h-7 animate-spin ${t.spinner}`} />
              <p className={`mt-2 text-sm ${t.textMuted}`}>Carregando mensagens...</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className={`text-xs ${t.textMuted}`}>
                  Escolha uma mensagem para abrir o WhatsApp com o lead.
                </p>
                <button
                  type="button"
                  onClick={openCreate}
                  className={`inline-flex shrink-0 items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg ${t.btnSecondary}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova
                </button>
              </div>

              <ul className="space-y-2">
                {presets.map((preset) => {
                  const rendered = renderWhatsAppLeadPresetBody(preset.body, renderVars);
                  const suggested = preset.defaultKey === suggestedKey;
                  const isBusy = busyId === preset.id;
                  const isCustomizedDefault =
                    Boolean(preset.defaultKey) && !isVirtualDefaultPresetId(preset.id);

                  return (
                    <li
                      key={preset.id}
                      className={`rounded-xl border p-3 transition-colors ${t.cardBorder} ${
                        suggested ? 'ring-1 ring-emerald-500/40' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className={`text-sm font-semibold truncate ${t.textPrimary}`}>
                              {preset.title}
                            </p>
                            {preset.isDefault ? (
                              <span
                                className={`text-[9px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded ${t.textSubtle} bg-black/5 dark:bg-white/10`}
                              >
                                Padrão
                              </span>
                            ) : (
                              <span
                                className={`text-[9px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded ${t.textSubtle} bg-black/5 dark:bg-white/10`}
                              >
                                Sua
                              </span>
                            )}
                            {suggested && (
                              <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                                Sugerida
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            title="Editar"
                            onClick={() => openEdit(preset)}
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${t.btnSecondary}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {isCustomizedDefault && (
                            <button
                              type="button"
                              title="Restaurar texto padrão"
                              disabled={isBusy}
                              onClick={() => void handleResetDefault(preset)}
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${t.btnSecondary}`}
                            >
                              {isBusy ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          {!preset.isDefault && !preset.defaultKey && (
                            <button
                              type="button"
                              title="Excluir"
                              disabled={isBusy}
                              onClick={() => void handleArchiveCustom(preset)}
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${t.btnSecondary}`}
                            >
                              {isBusy ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                      <p className={`text-xs leading-relaxed line-clamp-3 mb-2.5 ${t.textMuted}`}>
                        {rendered}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSend(preset)}
                        className={`inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg ${t.btnPrimary}`}
                      >
                        <Send className="w-3.5 h-3.5" />
                        Enviar no WhatsApp
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
