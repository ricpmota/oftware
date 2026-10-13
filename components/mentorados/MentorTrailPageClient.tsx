'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft } from 'lucide-react';
import MentoradosAccessGate from '@/components/mentorados/MentoradosAccessGate';
import MentorModuleAccordion from '@/components/mentorados/MentorModuleAccordion';
import MentorProgressBar from '@/components/mentorados/MentorProgressBar';
import MentorStatusBadge from '@/components/mentorados/MentorStatusBadge';
import { MentorTrailGridSkeleton } from '@/components/mentorados/MentorSkeletons';
import { auth } from '@/lib/firebase';
import { formatMentorHoursMinutes } from '@/lib/mentorados/progressMath';
import { getMentorTrailBySlug } from '@/services/mentorTrailService';
import type { MentorTrailDetailDto } from '@/types/mentorTrail';

export default function MentorTrailPageClient({ slug }: { slug: string }) {
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState<MentorTrailDetailDto | null>(null);

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
    try {
      setData(await getMentorTrailBySlug(slug));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar a trilha.';
      if (message.toLowerCase().includes('exclusiva') || message.toLowerCase().includes('verificado')) {
        setForbidden(true);
      } else if (message.toLowerCase().includes('não encontrada')) {
        setNotFound(true);
      } else if (message.toLowerCase().includes('login')) {
        setSignedIn(false);
      } else setError(message);
    } finally {
      setLoading(false);
    }
  }, [signedIn, slug]);

  useEffect(() => {
    if (!authReady) return;
    if (!signedIn) {
      setLoading(false);
      return;
    }
    void load();
  }, [authReady, signedIn, load]);

  if (!authReady || (signedIn && loading)) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <MentorTrailGridSkeleton />
      </div>
    );
  }
  if (!signedIn) return <MentoradosAccessGate variant="login" />;
  if (forbidden) return <MentoradosAccessGate variant="unverified" />;
  if (notFound || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-[var(--text-primary)]">Trilha não encontrada.</p>
        <Link href="/videosmentorados" className="mt-4 inline-block text-sm text-[var(--brand-primary)]">
          Voltar à Central do Mentorado
        </Link>
      </div>
    );
  }

  const { trail, modules, continueLesson } = data;
  const continueHref = continueLesson
    ? `/videosmentorados/trilhas/${encodeURIComponent(trail.slug)}/aulas/${encodeURIComponent(continueLesson.slug)}`
    : undefined;

  return (
    <div className="min-h-screen bg-[var(--surface-background)]">
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <Link
          href="/videosmentorados"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--text-secondary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Central do Mentorado
        </Link>

        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              Trilha
            </p>
            <MentorStatusBadge status={trail.status} />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{trail.title}</h1>
          {trail.shortDescription || trail.description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)] sm:text-base">
              {trail.description || trail.shortDescription}
            </p>
          ) : null}
          <p className="text-sm text-[var(--text-secondary)]">
            {trail.moduleCount} {trail.moduleCount === 1 ? 'módulo' : 'módulos'} • {trail.lessonCount}{' '}
            {trail.lessonCount === 1 ? 'aula' : 'aulas'}
            {trail.durationSeconds ? ` • ${formatMentorHoursMinutes(trail.durationSeconds)}` : ''}
          </p>
          <div className="max-w-md">
            <MentorProgressBar
              percent={trail.progressPercent}
              label={`${trail.completedLessons} de ${trail.lessonCount} aulas concluídas`}
            />
          </div>
          {continueHref ? (
            <Link
              href={continueHref}
              className="inline-flex min-h-11 items-center rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold text-[var(--text-inverse)]"
            >
              {trail.progressPercent > 0 ? 'Continuar treinamento' : 'Começar treinamento'}
            </Link>
          ) : null}
        </header>

        {error ? <p className="text-sm text-[var(--state-danger)]">{error}</p> : null}

        <section>
          <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">Módulos</h2>
          {modules.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">Esta trilha ainda não possui aulas publicadas.</p>
          ) : (
            <MentorModuleAccordion
              modules={modules}
              trailSlug={trail.slug}
              defaultOpenIds={modules[0] ? [modules[0].id] : []}
            />
          )}
        </section>
      </div>
    </div>
  );
}
