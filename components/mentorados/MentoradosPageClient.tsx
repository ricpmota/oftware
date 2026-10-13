'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import MentoradosAccessGate from '@/components/mentorados/MentoradosAccessGate';
import MentoradosHeader from '@/components/mentorados/MentoradosHeader';
import MentorCategoryGrid from '@/components/mentorados/MentorCategoryGrid';
import MentorContentGrid from '@/components/mentorados/MentorContentGrid';
import MentorContentModal from '@/components/mentorados/MentorContentModal';
import MentorContinueCard from '@/components/mentorados/MentorContinueCard';
import MentorEmptyState from '@/components/mentorados/MentorEmptyState';
import MentorJourneyCard from '@/components/mentorados/MentorJourneyCard';
import MentorSearch from '@/components/mentorados/MentorSearch';
import MentorTrailGrid from '@/components/mentorados/MentorTrailGrid';
import {
  MentorCategorySkeleton,
  MentorContentGridSkeleton,
  MentorContinueSkeleton,
  MentorTrailGridSkeleton,
} from '@/components/mentorados/MentorSkeletons';
import { auth } from '@/lib/firebase';
import { emptyMentorCategoryCounts, isMentorCategory, MENTOR_CATEGORY_META } from '@/lib/mentorados/categories';
import { getMentorHome } from '@/services/mentorTrailService';
import type { MentorCategory, MentorContentDto } from '@/types/mentorContent';
import type { MentorHomeResponse } from '@/types/mentorTrail';

function matchesQuery(content: MentorContentDto, query: string, placementLabel?: string): boolean {
  if (!query) return true;
  const hay = [content.title, content.description || '', ...(content.tags || []), placementLabel || '']
    .join(' ')
    .toLowerCase();
  return hay.includes(query);
}

export default function MentoradosPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoriaParam = searchParams.get('categoria');
  const selectedCategory = isMentorCategory(categoriaParam) ? categoriaParam : null;

  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<MentorHomeResponse | null>(null);
  const [query, setQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setSignedIn(!!user);
      setAuthReady(true);
    });
  }, []);

  const load = useCallback(async () => {
    if (!signedIn) return;
    setLoading(true);
    setError('');
    setForbidden(false);
    try {
      setData(await getMentorHome());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar a Central.';
      if (message.toLowerCase().includes('exclusiva') || message.toLowerCase().includes('verificado')) {
        setForbidden(true);
      } else if (message.toLowerCase().includes('login')) {
        setSignedIn(false);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [signedIn]);

  useEffect(() => {
    if (!authReady) return;
    if (!signedIn) {
      setLoading(false);
      return;
    }
    void load();
  }, [authReady, signedIn, load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = (data?.contents || []).filter((item) => {
      if (selectedCategory && item.category !== selectedCategory) return false;
      const placement = data?.placementsByContentId[item.id];
      const label = placement ? `${placement.trailTitle} ${placement.moduleTitle}` : '';
      return matchesQuery(item, q, label);
    });
    if (selectedCategory || q) return rows;
    return [...rows].sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
  }, [data, query, selectedCategory]);

  function setCategory(category: MentorCategory | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (category) params.set('categoria', category);
    else params.delete('categoria');
    const qs = params.toString();
    router.replace(qs ? `/videosmentorados?${qs}` : '/videosmentorados', { scroll: false });
  }

  if (!authReady) {
    return (
      <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-8">
        <MentorContinueSkeleton />
        <MentorTrailGridSkeleton />
      </div>
    );
  }
  if (!signedIn) return <MentoradosAccessGate variant="login" />;
  if (forbidden) return <MentoradosAccessGate variant="unverified" />;

  const canManage = data?.viewer.canManage === true;
  const counts = data?.countsByCategory || emptyMentorCategoryCounts();
  const searching = Boolean(query.trim() || selectedCategory);
  const heading = selectedCategory
    ? MENTOR_CATEGORY_META[selectedCategory].name
    : query.trim()
      ? 'Resultados da busca'
      : 'Novas aulas';
  const firstAccess = !data?.continueWatching && (data?.journey?.progressPercent || 0) === 0;

  return (
    <div className="min-h-screen bg-[var(--surface-background)]">
      <div className="mx-auto max-w-[1280px] space-y-10 px-4 py-8 sm:py-10">
        <MentoradosHeader
          canManage={canManage}
          firstName={data?.viewer.firstName}
          onNewContent={() => setModalOpen(true)}
        />
        <MentorSearch value={query} onChange={setQuery} />
        {error ? <p className="text-sm text-[var(--state-danger)]">{error}</p> : null}

        {loading ? (
          <>
            <MentorContinueSkeleton />
            <MentorTrailGridSkeleton />
            <MentorCategorySkeleton />
            <MentorContentGridSkeleton />
          </>
        ) : (
          <>
            {!searching && data?.continueWatching ? (
              <MentorContinueCard item={data.continueWatching} />
            ) : null}
            {!searching && !data?.continueWatching && data?.journey ? (
              <MentorJourneyCard trail={data.journey} firstAccess />
            ) : null}
            {!searching && data?.journey && !firstAccess ? (
              <MentorJourneyCard trail={data.journey} firstAccess={false} />
            ) : null}
            {!searching ? (
              <MentorTrailGrid
                trails={data?.trails || []}
                canManage={canManage}
                onCreate={() => router.push('/videosmentorados/gerenciar')}
              />
            ) : null}

            <MentorCategoryGrid
              counts={counts}
              selected={selectedCategory}
              onSelect={setCategory}
            />

            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">{heading}</h2>
              {filtered.length === 0 ? (
                <MentorEmptyState canManage={canManage} onAdd={() => setModalOpen(true)} />
              ) : (
                <MentorContentGrid
                  contents={filtered}
                  placements={data?.placementsByContentId}
                />
              )}
            </section>
          </>
        )}
      </div>

      <MentorContentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          void load();
        }}
      />
    </div>
  );
}
