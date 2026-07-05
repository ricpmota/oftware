'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useMedicoLeadsCrmTheme } from '@/components/crm/medico/MedicoLeadsCrmProvider';
import { LEAD_CRM_TAG_SUGGESTIONS } from '@/lib/crm/leadCrmTags';

type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
};

export default function LeadCardTagsPopover({ tags, onChange }: Props) {
  const t = useMedicoLeadsCrmTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const toggle = (tag: string) => {
    if (tags.includes(tag)) {
      onChange(tags.filter((x) => x !== tag));
    } else if (tags.length < 10) {
      onChange([...tags, tag]);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold ${t.btnSecondary}`}
        aria-label="Adicionar tag"
      >
        <Plus className="w-3 h-3" />
      </button>
      {open && (
        <div
          className={`absolute left-0 top-full z-50 mt-1 w-44 rounded-lg border p-2 shadow-lg ${t.cardBg} ${t.cardBorder}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[10px] font-semibold ${t.label}`}>Tags</span>
            <button type="button" onClick={() => setOpen(false)} className={t.closeBtn} aria-label="Fechar">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
            {LEAD_CRM_TAG_SUGGESTIONS.map((tag) => {
              const active = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggle(tag)}
                  className={`rounded-full px-2 py-0.5 text-[9px] font-medium transition-colors ${
                    active ? t.btnPrimary : t.btnSecondary
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
