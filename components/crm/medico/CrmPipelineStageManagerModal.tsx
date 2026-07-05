'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { useMedicoLeadsCrmTheme } from '@/components/crm/medico/MedicoLeadsCrmProvider';
import { isDefaultStageKey, getLeadStageKey } from '@/lib/crm/leadStageKey';
import {
  buildResolvedPipelineStages,
  computeStageColumnTotal,
  formatStageColumnTotal,
  getStageAccentColor,
  getStageResolvedColors,
  type ResolvedCrmPipelineStage,
} from '@/lib/crm/resolveCrmPipelineStages';
import { CRM_TAG_PRESET_COLORS } from '@/lib/crm/crmTagPresets';
import { CrmPipelineStageService } from '@/services/crmPipelineStageService';
import type { LeadMedico } from '@/types/leadMedico';

type Props = {
  open: boolean;
  onClose: () => void;
  medicoId: string;
  leads: LeadMedico[];
  userEmail?: string | null;
  onRefreshStages: () => Promise<void>;
  onLeadsUpdated: (leads: LeadMedico[]) => void;
};

type StageRow = ResolvedCrmPipelineStage & {
  leadCount: number;
  leadTotal: number;
};

type EditDraft = {
  label: string;
  color: string;
  backgroundColor: string;
};

export default function CrmPipelineStageManagerModal({
  open,
  onClose,
  medicoId,
  leads,
  userEmail,
  onRefreshStages,
  onLeadsUpdated,
}: Props) {
  const t = useMedicoLeadsCrmTheme();
  const [rows, setRows] = useState<StageRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditDraft>({ label: '', color: '#475569', backgroundColor: '#f1f5f9' });
  const [showCreate, setShowCreate] = useState(false);
  const [createDraft, setCreateDraft] = useState<EditDraft>({ label: '', color: '#166534', backgroundColor: '#dcfce7' });
  const [deleteTarget, setDeleteTarget] = useState<StageRow | null>(null);
  const [reallocateTo, setReallocateTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rebuildRows = useCallback(async () => {
    const docs = await CrmPipelineStageService.getCrmPipelineStages(medicoId);
    const resolved = buildResolvedPipelineStages(docs);
    const next: StageRow[] = resolved.map((stage) => {
      const stageLeads = leads.filter((l) => getLeadStageKey(l) === stage.stageKey);
      return {
        ...stage,
        leadCount: stageLeads.length,
        leadTotal: computeStageColumnTotal(stageLeads),
      };
    });
    setRows(next);
  }, [medicoId, leads]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setEditingId(null);
    setShowCreate(false);
    setDeleteTarget(null);
    void rebuildRows();
  }, [open, rebuildRows]);

  const otherStagesForReallocate = useMemo(() => {
    if (!deleteTarget) return [];
    return rows.filter((r) => r.stageKey !== deleteTarget.stageKey);
  }, [rows, deleteTarget]);

  const startEdit = (row: StageRow) => {
    const colors = getStageResolvedColors(row);
    setDraft({
      label: row.label,
      color: colors.color,
      backgroundColor: colors.backgroundColor,
    });
    setEditingId(row.id);
    setShowCreate(false);
  };

  const saveEdit = async () => {
    if (!editingId || !draft.label.trim()) return;
    const row = rows.find((r) => r.id === editingId);
    if (!row) return;
    setBusy(true);
    setError(null);
    try {
      await CrmPipelineStageService.upsertStage(medicoId, {
        stageKey: row.stageKey,
        label: draft.label.trim(),
        color: draft.color,
        backgroundColor: draft.backgroundColor,
        order: row.order,
        isDefault: row.isDefault,
      });
      setEditingId(null);
      await onRefreshStages();
      await rebuildRows();
    } catch (e) {
      setError((e as Error).message || 'Erro ao salvar etapa.');
    } finally {
      setBusy(false);
    }
  };

  const createStage = async () => {
    if (!createDraft.label.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await CrmPipelineStageService.createCustomCrmPipelineStage(medicoId, {
        label: createDraft.label.trim(),
        color: createDraft.color,
        backgroundColor: createDraft.backgroundColor,
        order: rows.length,
      });
      setShowCreate(false);
      setCreateDraft({ label: '', color: '#166534', backgroundColor: '#dcfce7' });
      await onRefreshStages();
      await rebuildRows();
    } catch (e) {
      setError((e as Error).message || 'Erro ao criar etapa.');
    } finally {
      setBusy(false);
    }
  };

  const moveStage = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const reordered = [...rows];
    const [item] = reordered.splice(index, 1);
    reordered.splice(target, 0, item);
    setRows(reordered);
    setBusy(true);
    try {
      await CrmPipelineStageService.reorderCrmPipelineStages(
        medicoId,
        reordered.map((r) => ({ id: r.id, stageKey: r.stageKey, isDefault: r.isDefault }))
      );
      await onRefreshStages();
    } catch (e) {
      setError((e as Error).message || 'Erro ao reordenar.');
      await rebuildRows();
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (otherStagesForReallocate.length === 0) {
      setError('Não é possível apagar a única etapa ativa.');
      return;
    }
    const targetKey = reallocateTo || otherStagesForReallocate[0]?.stageKey;
    if (!targetKey) return;
    setBusy(true);
    setError(null);
    try {
      await CrmPipelineStageService.archiveCrmPipelineStageAndReallocateLeads({
        medicoId,
        stageKeyToArchive: deleteTarget.stageKey,
        stageIdToArchive: deleteTarget.id,
        targetStageKey: targetKey,
        leads,
        atualizadoPor: userEmail || undefined,
      });
      const updatedLeads = leads.map((lead) => {
        if (getLeadStageKey(lead) !== deleteTarget.stageKey) return lead;
        const isDefault = isDefaultStageKey(targetKey);
        return {
          ...lead,
          crmStageKey: isDefault ? undefined : targetKey,
          status: isDefault ? (targetKey as LeadMedico['status']) : lead.status,
          dataStatus: new Date(),
        };
      });
      onLeadsUpdated(updatedLeads);
      setDeleteTarget(null);
      setReallocateTo('');
      await onRefreshStages();
      await rebuildRows();
    } catch (e) {
      setError((e as Error).message || 'Erro ao apagar etapa.');
    } finally {
      setBusy(false);
    }
  };

  const restoreDefaults = async () => {
    if (!window.confirm('Restaurar nome, cor e ordem das etapas padrão? Etapas customizadas serão mantidas.')) return;
    setBusy(true);
    setError(null);
    try {
      await CrmPipelineStageService.restoreDefaultCrmPipelineStages(medicoId);
      await onRefreshStages();
      await rebuildRows();
    } catch (e) {
      setError((e as Error).message || 'Erro ao restaurar padrão.');
    } finally {
      setBusy(false);
    }
  };

  if (!open || typeof document === 'undefined') return null;

  const content = (
    <div className="fixed inset-0 z-[10070] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl ${t.cardBg} ${t.cardBorder}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex-shrink-0 px-5 py-4 border-b ${t.divider}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className={`text-lg font-semibold ${t.textPrimary}`}>Gestor de Etapas do CRM</h2>
              <p className={`text-sm mt-0.5 ${t.textMuted}`}>
                Personalize o funil de acompanhamento dos seus pacientes.
              </p>
            </div>
            <button type="button" onClick={onClose} className={t.closeBtn} aria-label="Fechar">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {error && (
            <p className={`text-sm px-3 py-2 rounded-lg border ${t.messageErr}`}>{error}</p>
          )}

          {rows.map((row, index) => (
            <div
              key={row.id}
              className={`rounded-xl border p-3 ${t.cardBorder} ${editingId === row.id ? 'ring-2 ring-emerald-500/40' : ''}`}
            >
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 h-8 w-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: getStageAccentColor(row) }}
                />
                <div className="flex-1 min-w-0">
                  {editingId === row.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={draft.label}
                        onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                        className={`w-full px-3 py-2 text-sm rounded-lg border ${t.input}`}
                        maxLength={60}
                      />
                      <div className="flex flex-wrap gap-1">
                        {CRM_TAG_PRESET_COLORS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            title={preset.label}
                            onClick={() =>
                              setDraft({ ...draft, color: preset.color, backgroundColor: preset.backgroundColor })
                            }
                            className={`h-6 w-6 rounded-full border ${
                              draft.color === preset.color ? 'border-slate-900 dark:border-white' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: preset.backgroundColor }}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void saveEdit()}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg ${t.btnPrimary}`}
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className={`px-3 py-1.5 text-xs rounded-lg ${t.btnSecondary}`}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <p className={`font-semibold text-sm ${t.textPrimary}`}>{row.label}</p>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={busy || index === 0}
                            onClick={() => void moveStage(index, -1)}
                            className={`p-1 rounded ${t.btnSecondary} disabled:opacity-30`}
                            aria-label="Subir"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={busy || index === rows.length - 1}
                            onClick={() => void moveStage(index, 1)}
                            className={`p-1 rounded ${t.btnSecondary} disabled:opacity-30`}
                            aria-label="Descer"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => startEdit(row)}
                            className={`p-1 rounded ${t.btnSecondary}`}
                            aria-label="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            disabled={busy || rows.length <= 1}
                            onClick={() => {
                              setDeleteTarget(row);
                              setReallocateTo(otherStagesForReallocate[0]?.stageKey || '');
                            }}
                            className="p-1 rounded text-red-600 hover:bg-red-50 disabled:opacity-30"
                            aria-label="Apagar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className={`text-xs mt-1 ${t.textMuted}`}>
                        {row.leadCount} {row.leadCount === 1 ? 'negócio' : 'negócios'} · Total{' '}
                        {formatStageColumnTotal(row.leadTotal)}
                        {row.isDefault && (
                          <span className="ml-2 opacity-70">· padrão ({row.stageKey})</span>
                        )}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}

          {showCreate ? (
            <div className={`rounded-xl border p-4 space-y-2 ${t.cardBorder}`}>
              <p className={`text-sm font-medium ${t.textPrimary}`}>Nova etapa</p>
              <input
                type="text"
                value={createDraft.label}
                onChange={(e) => setCreateDraft((d) => ({ ...d, label: e.target.value }))}
                placeholder="Nome da etapa"
                className={`w-full px-3 py-2 text-sm rounded-lg border ${t.input}`}
                maxLength={60}
              />
              <div className="flex flex-wrap gap-1">
                {CRM_TAG_PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      setCreateDraft({
                        ...createDraft,
                        color: preset.color,
                        backgroundColor: preset.backgroundColor,
                      })
                    }
                    className={`h-6 w-6 rounded-full border ${
                      createDraft.color === preset.color ? 'border-slate-900' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: preset.backgroundColor }}
                  />
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={busy || !createDraft.label.trim()}
                  onClick={() => void createStage()}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg ${t.btnPrimary}`}
                >
                  Criar etapa
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className={`px-3 py-1.5 text-xs rounded-lg ${t.btnSecondary}`}
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setShowCreate(true);
                setEditingId(null);
              }}
              className={`w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-xl border border-dashed ${t.btnSecondary}`}
            >
              <Plus className="w-4 h-4" />
              Nova etapa
            </button>
          )}
        </div>

        <div className={`flex-shrink-0 px-5 py-4 border-t flex flex-wrap items-center justify-between gap-2 ${t.divider}`}>
          <button
            type="button"
            disabled={busy}
            onClick={() => void restoreDefaults()}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg ${t.btnSecondary}`}
          >
            <RotateCcw className="w-4 h-4" />
            Restaurar padrão
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${t.btnPrimary}`}
          >
            Fechar
          </button>
        </div>

        {deleteTarget && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-2xl p-4">
            <div className={`w-full max-w-md rounded-xl border p-4 shadow-xl ${t.cardBg} ${t.cardBorder}`}>
              <h3 className={`text-sm font-semibold ${t.textPrimary}`}>Apagar etapa</h3>
              <p className={`text-sm mt-2 ${t.textMuted}`}>
                {deleteTarget.leadCount > 0
                  ? `Essa etapa possui ${deleteTarget.leadCount} lead(s). Para apagar, escolha para qual etapa os leads serão realocados.`
                  : `Apagar a etapa "${deleteTarget.label}"?`}
              </p>
              {deleteTarget.leadCount > 0 && (
                <div className="mt-3">
                  <label className={`block text-xs font-medium mb-1 ${t.label}`}>
                    Realocar leads para:
                  </label>
                  <select
                    value={reallocateTo}
                    onChange={(e) => setReallocateTo(e.target.value)}
                    className={`w-full px-3 py-2 text-sm rounded-lg border ${t.input}`}
                  >
                    {otherStagesForReallocate.map((s) => (
                      <option key={s.stageKey} value={s.stageKey}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-2 mt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className={`px-3 py-1.5 text-sm rounded-lg ${t.btnSecondary}`}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void confirmDelete()}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteTarget.leadCount > 0 ? 'Apagar e realocar' : 'Apagar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-2xl">
            <Loader2 className={`w-8 h-8 animate-spin ${t.spinner}`} />
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
