import { Suspense } from 'react';
import MentoradosPageClient from '@/components/mentorados/MentoradosPageClient';
import { MentorCategorySkeleton } from '@/components/mentorados/MentorSkeletons';

export default function VideosMentoradosPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-8">
          <MentorCategorySkeleton />
        </div>
      }
    >
      <MentoradosPageClient />
    </Suspense>
  );
}
