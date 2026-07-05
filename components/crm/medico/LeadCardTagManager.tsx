'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useMedicoLeadsCrmTheme } from '@/components/crm/medico/MedicoLeadsCrmProvider';
import { leadCrmTagStyle } from '@/lib/crm/leadCrmTagUtils';
import { crmTagToSnapshot } from '@/services/crmTagService';
import type { CrmTag, LeadCrmTagSnapshot } from '@/types/crmTag';
import { CRM_TAG_PRESET_COLORS } from '@/lib/crm/crmTagPresets';

const PANEL_WIDTH = 256;
const PANEL_MAX_HEIGHT = 360;

type Props = {
  medicoId: string;
  leadId: string;
  appliedTags: LeadCrmTagSnapshot[];
  availableTags: CrmTag[];
  onAppliedChange: (tags: LeadCrmTagSnapshot[]) => void;
  onTagsCatalogChange: (tags: CrmTag[]) => void;
  onCreateTag: (data: { label: string; color: string; backgroundColor?: string }) => Promise<CrmTag>;
  onUpdateTag: (tagId: string, data: { label: string; color: string; backgroundColor?: string }) => Promise<void>;
  onArchiveTag: (tagId: string) => Promise<void>;
};

type Mode = 'list' | 'create' | 'edit';

export default function LeadCardTagManager({
  appliedTags,
  availableTags,
  onAppliedChange,
  onTagsCatalogChange,
  onCreateTag,
  onUpdateTag,
  onArchiveTag,
}: Props) {
  const t = useMedicoLeadsCrmTheme();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('list');
  const [search, setSearch] = useState('');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [color, setColor] = useState<string>(CRM_TAG_PRESET_COLORS[0].color);
  const [backgroundColor, setBackgroundColor] = useState<string>(CRM_TAG_PRESET_COLORS[0].backgroundColor);
  const [saving, setSaving] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    let left = rect.left;
    let top = rect.bottom + 4;

    if (left + PANEL_WIDTH > window.innerWidth - margin) {
      left = window.innerWidth - PANEL_WIDTH - margin;
    }
    if (left < margin) left = margin;

    if (top + PANEL_MAX_HEIGHT > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - PANEL_MAX_HEIGHT - 4);
    }

    setCoords({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, updatePosition, mode]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
      setMode('list');
      setEditingTagId(null);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const filteredTags = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableTags;
    return availableTags.filter((tag) => tag.label.toLowerCase().includes(q));
  }, [availableTags, search]);

  const appliedIds = useMemo(() => new Set(appliedTags.map((tag) => tag.tagId)), [appliedTags]);

  const resetForm = () => {
    setLabel('');
    setColor(CRM_TAG_PRESET_COLORS[0].color);
    setBackgroundColor(CRM_TAG_PRESET_COLORS[0].backgroundColor);
    setEditingTagId(null);
    setMode('list');
  };

  const closePanel = () => {
    setOpen(false);
    resetForm();
  };

  const toggleTag = (tag: CrmTag) => {
    const snapshot = crmTagToSnapshot(tag);
    if (appliedIds.has(tag.id)) {
      onAppliedChange(appliedTags.filter((item) => item.tagId !== tag.id));
      return;
    }
    if (appliedTags.length >= 20) return;
    onAppliedChange([...appliedTags, snapshot]);
  };

  const startEdit = (tag: CrmTag) => {
    setEditingTagId(tag.id);
    setLabel(tag.label);
    setColor(tag.color);
    setBackgroundColor(tag.backgroundColor || `${tag.color}18`);
    setMode('edit');
  };

  const handleSaveTag = async () => {
    const trimmed = label.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      if (mode === 'create') {
        const created = await onCreateTag({ label: trimmed, color, backgroundColor });
        onTagsCatalogChange([...availableTags, created].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')));
        if (appliedTags.length < 20 && !appliedIds.has(created.id)) {
          onAppliedChange([...appliedTags, crmTagToSnapshot(created)]);
        }
      } else if (mode === 'edit' && editingTagId) {
        await onUpdateTag(editingTagId, { label: trimmed, color, backgroundColor });
        const nextCatalog = availableTags
          .map((tag) =>
            tag.id === editingTagId ? { ...tag, label: trimmed, color, backgroundColor } : tag
          )
          .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
        onTagsCatalogChange(nextCatalog);
        onAppliedChange(
          appliedTags.map((tag) =>
            tag.tagId === editingTagId ? { ...tag, label: trimmed, color, backgroundColor } : tag
          )
        );
      }
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (tag: CrmTag) => {
    if (!window.confirm(`Arquivar a tag "${tag.label}"? Leads antigos manterão a etiqueta aplicada.`)) return;
    setSaving(true);
    try {
      await onArchiveTag(tag.id);
      onTagsCatalogChange(availableTags.filter((item) => item.id !== tag.id));
      if (editingTagId === tag.id) resetForm();
    } finally {
      setSaving(false);
    }
  };

  const panel = open ? (
    <div
      ref={panelRef}
      style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 10060 }}
      className={`w-64 max-h-[min(360px,calc(100vh-16px))] overflow-y-auto rounded-xl border p-3 shadow-2xl ${t.cardBg} ${t.cardBorder}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold ${t.label}`}>Tags do lead</span>
        <button type="button" onClick={closePanel} className={t.closeBtn} aria-label="Fechar">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {mode === 'list' ? (
        <>
          <div className="relative mb-2">
            <Search className={`absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${t.textSubtle}`} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar tag..."
              className={`w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border ${t.input}`}
            />
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1 mb-2">
            {filteredTags.length === 0 ? (
              <p className={`text-[11px] py-2 text-center ${t.textSubtle}`}>Nenhuma tag cadastrada.</p>
            ) : (
              filteredTags.map((tag) => {
                const active = appliedIds.has(tag.id);
                return (
                  <div key={tag.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className="flex-1 flex items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <span
                        className="inline-flex max-w-[120px] truncate rounded-full px-2 py-0.5 text-[10px] font-medium border"
                        style={leadCrmTagStyle(crmTagToSnapshot(tag))}
                      >
                        {tag.label}
                      </span>
                      {active && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(tag)}
                      className={`p-1 rounded-md ${t.btnSecondary}`}
                      aria-label={`Editar ${tag.label}`}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setMode('create');
            }}
            className={`w-full inline-flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium rounded-lg ${t.btnPrimary}`}
          >
            <Plus className="w-3.5 h-3.5" />
            Criar nova tag
          </button>
        </>
      ) : (
        <div className="space-y-2">
          <p className={`text-[11px] font-medium ${t.textMuted}`}>
            {mode === 'create' ? 'Nova tag' : 'Editar tag'}
          </p>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nome da tag"
            className={`w-full px-2 py-1.5 text-xs rounded-lg border ${t.input}`}
            maxLength={40}
          />
          <div className="flex flex-wrap gap-1.5">
            {CRM_TAG_PRESET_COLORS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                title={preset.label}
                onClick={() => {
                  setColor(preset.color);
                  setBackgroundColor(preset.backgroundColor);
                }}
                className={`h-6 w-6 rounded-full border-2 transition-transform ${
                  color === preset.color ? 'scale-110 border-slate-900 dark:border-white' : 'border-transparent'
                }`}
                style={{ backgroundColor: preset.backgroundColor }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-10 rounded border cursor-pointer"
              title="Cor personalizada"
            />
            <span
              className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium border"
              style={leadCrmTagStyle({ tagId: 'preview', label: label || 'Preview', color, backgroundColor })}
            >
              {label || 'Preview'}
            </span>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={saving || !label.trim()}
              onClick={() => void handleSaveTag()}
              className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 ${t.btnPrimary}`}
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={resetForm}
              className={`px-2 py-1.5 text-xs rounded-lg ${t.btnSecondary}`}
            >
              Voltar
            </button>
            {mode === 'edit' && editingTagId && (
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  const tag = availableTags.find((item) => item.id === editingTagId);
                  if (tag) void handleArchive(tag);
                }}
                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                aria-label="Arquivar tag"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => {
            const next = !v;
            if (next) {
              resetForm();
              requestAnimationFrame(() => updatePosition());
            }
            return next;
          });
        }}
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${t.btnSecondary}`}
        aria-label="Gerenciar tags"
        aria-expanded={open}
      >
        <Plus className="w-3 h-3" />
      </button>
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </>
  );
}
