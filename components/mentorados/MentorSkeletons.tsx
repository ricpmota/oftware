'use client';

export function MentorCategorySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="h-36 animate-pulse rounded-2xl border border-[var(--border-default)] bg-slate-100"
        />
      ))}
    </div>
  );
}

export function MentorContentGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-[var(--border-default)]"
        >
          <div className="aspect-video animate-pulse bg-slate-100" />
          <div className="space-y-2 p-4">
            <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MentorContentDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
      <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
      <div className="h-8 w-3/4 animate-pulse rounded bg-slate-100" />
      <div className="aspect-video animate-pulse rounded-2xl bg-slate-100" />
      <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

export function MentorContinueSkeleton() {
  return <div className="h-48 animate-pulse rounded-2xl border border-[var(--border-default)] bg-slate-100" />;
}

export function MentorTrailGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-72 animate-pulse rounded-2xl border border-[var(--border-default)] bg-slate-100" />
      ))}
    </div>
  );
}

export function MentorLessonLayoutSkeleton() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6">
      <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="aspect-video animate-pulse rounded-2xl bg-slate-100" />
        <div className="hidden h-96 animate-pulse rounded-2xl bg-slate-100 lg:block" />
      </div>
    </div>
  );
}
