'use client';

import MentorContentCard from '@/components/mentorados/MentorContentCard';
import type { MentorContentDto } from '@/types/mentorContent';
import type { MentorLessonPlacement } from '@/types/mentorTrail';

export default function MentorContentGrid({
  contents,
  placements,
}: {
  contents: MentorContentDto[];
  placements?: Record<string, MentorLessonPlacement>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {contents.map((content) => (
        <MentorContentCard key={content.id} content={content} placement={placements?.[content.id]} />
      ))}
    </div>
  );
}
