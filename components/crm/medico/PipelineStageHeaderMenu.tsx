'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreVertical, Settings2 } from 'lucide-react';
import { useMedicoLeadsCrmTheme } from '@/components/crm/medico/MedicoLeadsCrmProvider';

type Props = {
  onEditCrm: () => void;
};

export default function PipelineStageHeaderMenu({ onEditCrm }: Props) {
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

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        aria-label="Opções da etapa"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className={`absolute right-0 top-full z-50 mt-1 w-44 rounded-xl border p-1 shadow-xl ${t.cardBg} ${t.cardBorder}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEditCrm();
            }}
            className={`w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 ${t.textPrimary}`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Editar CRM
          </button>
        </div>
      )}
    </div>
  );
}
