'use client';

import type { MentorContentType } from '@/types/mentorContent';

const LABELS: Record<MentorContentType, string> = {
  video: 'Aula',
  protocol: 'Protocolo',
  document: 'Documento',
  article: 'Atualização',
  checklist: 'Checklist',
};

export default function MentorContentTypeBadge({ type }: { type?: MentorContentType }) {
  const label = LABELS[type || 'video'] || 'Aula';
  return (
    <span className="rounded-full border border-[var(--border-default)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
      {label}
    </span>
  );
}
