'use client';

import { useMemo, useState } from 'react';
import { sanitizeTrainerNote } from '@/lib/personal/workoutDraft';

const COLLAPSE_CHARS = 180;

export function ExerciseTrainerNoteCard({
  note,
}: {
  note?: string | null;
}) {
  const text = sanitizeTrainerNote(note);
  const [expanded, setExpanded] = useState(false);
  const needsCollapse = useMemo(() => {
    if (!text) return false;
    return text.length > COLLAPSE_CHARS || text.split('\n').length > 4;
  }, [text]);

  if (!text) return null;

  const visible = !needsCollapse || expanded ? text : `${text.slice(0, COLLAPSE_CHARS).trimEnd()}…`;

  return (
    <div className="rounded-2xl bg-[#4CCB7A]/10 ring-1 ring-[#4CCB7A]/25 px-3 py-2.5 space-y-1.5">
      <p className="text-[9px] uppercase tracking-wide text-[#4CCB7A]/90">
        Orientação do seu personal
      </p>
      <p className="text-sm text-[#E8EDED] leading-relaxed whitespace-pre-wrap">{visible}</p>
      {needsCollapse ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[11px] font-semibold text-[#4CCB7A] hover:underline"
        >
          {expanded ? 'Ocultar' : 'Ver orientação completa'}
        </button>
      ) : null}
    </div>
  );
}

export default ExerciseTrainerNoteCard;
