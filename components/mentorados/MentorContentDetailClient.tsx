'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, ChevronDown, MoreHorizontal } from 'lucide-react';
import MentorConfirmDialog from '@/components/mentorados/MentorConfirmDialog';
import MentoradosAccessGate from '@/components/mentorados/MentoradosAccessGate';
import MentorContentModal from '@/components/mentorados/MentorContentModal';
import MentorContentPlayer from '@/components/mentorados/MentorContentPlayer';
import MentorContentTypeBadge from '@/components/mentorados/MentorContentTypeBadge';
import MentorLessonNavigation from '@/components/mentorados/MentorLessonNavigation';
import MentorLessonSidebar from '@/components/mentorados/MentorLessonSidebar';
import MentorStatusBadge from '@/components/mentorados/MentorStatusBadge';
import MentorTrailDrawer from '@/components/mentorados/MentorTrailDrawer';
import { MentorContentDetailSkeleton, MentorLessonLayoutSkeleton } from '@/components/mentorados/MentorSkeletons';
import { auth } from '@/lib/firebase';
import { MENTOR_CATEGORY_META } from '@/lib/mentorados/categories';
import { useLessonProgress } from '@/lib/mentorados/useLessonProgress';
import { formatMentorHoursMinutes } from '@/lib/mentorados/progressMath';
import {
  deleteMentorContent,
  getMentorContentBySlug,
  updateMentorContent,
} from '@/services/mentorContentService';
import { formatDuration } from '@/utils/formatDuration';
import type { MentorContentDto } from '@/types/mentorContent';
import type { MentorProgressDto, MentorTrailContextDto } from '@/types/mentorTrail';

export default function MentorContentDetailClient({
  slug,
  trailSlug,
}: {
  slug: string;
  trailSlug?: string;
}) {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [content, setContent] = useState<MentorContentDto | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [progress, setProgress] = useState<MentorProgressDto | null>(null);
  const [resumeAt, setResumeAt] = useState(0);
  const [trailContext, setTrailContext] = useState<MentorTrailContextDto | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [completedFlash, setCompletedFlash] = useState(false);

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
    setNotFound(false);
    try {
      const result = await getMentorContentBySlug(slug, trailSlug);
      setContent(result.content);
      setCanManage(result.canManage);
      setProgress(result.progress || null);
      setResumeAt(result.resumeAtSeconds || 0);
      setTrailContext(result.trailContext || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar a aula.';
      if (message.toLowerCase().includes('exclusiva') || message.toLowerCase().includes('verificado')) {
        setForbidden(true);
      } else if (message.toLowerCase().includes('não encontrada') || message.toLowerCase().includes('não encontrado')) {
        setNotFound(true);
      } else if (message.toLowerCase().includes('login')) {
        setSignedIn(false);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [signedIn, slug, trailSlug]);

  useEffect(() => {
    if (!authReady) return;
    if (!signedIn) {
      setLoading(false);
      return;
    }
    void load();
  }, [authReady, signedIn, load]);

  const { handlePlayerProgress, handlePause, markComplete, markUncomplete } = useLessonProgress({
    contentId: content?.id,
    trailId: trailContext?.trail.id,
    moduleId: trailContext?.current.moduleId,
    durationSeconds: content?.durationSeconds,
    initial: progress,
    onSynced: (next) => {
      setProgress(next);
      if (next.status === 'completed') {
        setCompletedFlash(true);
        void load();
      }
    },
  });

  async function handleStatus(status: 'draft' | 'archived') {
    if (!content) return;
    try {
      const result = await updateMentorContent(content.id, { status });
      if (result.content) setContent(result.content);
      setMenuOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar a aula.');
    }
  }

  async function handleDelete() {
    if (!content) return;
    setDeleting(true);
    try {
      await deleteMentorContent(content.id);
      router.replace('/videosmentorados');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir a aula.');
      setDeleting(false);
    }
  }

  if (!authReady || (signedIn && loading)) {
    return trailSlug ? <MentorLessonLayoutSkeleton /> : <MentorContentDetailSkeleton />;
  }
  if (!signedIn) return <MentoradosAccessGate variant="login" />;
  if (forbidden) return <MentoradosAccessGate variant="unverified" />;
  if (notFound || !content) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-[var(--text-primary)]">Aula não encontrada.</p>
        <Link href="/videosmentorados" className="mt-4 inline-block text-sm text-[var(--brand-primary)]">
          Voltar à Central do Mentorado
        </Link>
      </div>
    );
  }

  const category = MENTOR_CATEGORY_META[content.category];
  const duration =
    typeof content.durationSeconds === 'number' && content.durationSeconds > 0
      ? formatMentorHoursMinutes(content.durationSeconds)
      : null;
  const isCompleted = progress?.status === 'completed';
  const trail = trailContext?.trail;

  return (
    <div className="min-h-screen bg-[var(--surface-background)]">
      <div className={`mx-auto ${trail ? 'max-w-[1280px]' : 'max-w-4xl'} px-4 py-6 sm:py-8`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          {trail ? (
            <>
              <Link
                href={`/videosmentorados/trilhas/${encodeURIComponent(trail.slug)}`}
                className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--text-secondary)] lg:hidden"
              >
                <ArrowLeft className="h-4 w-4" />
                {trail.title}
              </Link>
              <nav className="hidden min-h-11 items-center gap-1 text-sm text-[var(--text-secondary)] lg:flex" aria-label="Navegação">
                <Link href="/videosmentorados" className="hover:text-[var(--text-primary)]">
                  Central do Mentorado
                </Link>
                <span>/</span>
                <Link href={`/videosmentorados/trilhas/${encodeURIComponent(trail.slug)}`} className="hover:text-[var(--text-primary)]">
                  {trail.title}
                </Link>
                <span>/</span>
                <span className="text-[var(--text-primary)]">{trailContext?.current.moduleTitle}</span>
              </nav>
            </>
          ) : (
            <Link
              href="/videosmentorados"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--text-secondary)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Central do Mentorado
            </Link>
          )}
          {canManage ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--border-default)]"
                aria-label="Ações da aula"
              >
                <MoreHorizontal className="h-5 w-5 text-[var(--text-secondary)]" />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 z-10 mt-2 w-52 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-lg">
                  <button type="button" className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50" onClick={() => { setMenuOpen(false); setEditOpen(true); }}>
                    Editar
                  </button>
                  {isCompleted ? (
                    <button type="button" className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50" onClick={() => { setMenuOpen(false); void markUncomplete(); }}>
                      Marcar como não concluída
                    </button>
                  ) : null}
                  {content.status === 'published' ? (
                    <button type="button" className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50" onClick={() => void handleStatus('draft')}>
                      Despublicar
                    </button>
                  ) : null}
                  {content.status !== 'archived' ? (
                    <button type="button" className="block w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50" onClick={() => void handleStatus('archived')}>
                      Arquivar
                    </button>
                  ) : null}
                  <button type="button" className="block w-full px-4 py-2.5 text-left text-sm text-[var(--state-danger)] hover:bg-slate-50" onClick={() => { setMenuOpen(false); setDeleteOpen(true); }}>
                    Excluir
                  </button>
                </div>
              ) : null}
            </div>
          ) : isCompleted ? (
            <button
              type="button"
              onClick={() => void markUncomplete()}
              className="text-xs text-[var(--text-secondary)] underline-offset-2 hover:underline"
            >
              Marcar como não concluída
            </button>
          ) : null}
        </div>

        <div className={trail ? 'lg:flex lg:items-start' : ''}>
          <div className="min-w-0 flex-1">
            <MentorContentPlayer
              videoUrl={content.videoUrl}
              title={content.title}
              videoId={content.id}
              startTime={resumeAt}
              onProgressUpdate={(_id, updates) => handlePlayerProgress(updates)}
              onPause={handlePause}
            />

            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <MentorContentTypeBadge type={content.type} />
                <MentorStatusBadge status={content.status} isNew={content.isNew} isUpdated={content.isUpdated} />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                {content.title}
              </h1>
              <p className="text-sm text-[var(--text-secondary)]">
                {trailContext
                  ? `${trailContext.current.moduleTitle} • ${duration || 'Aula'}`
                  : `${category?.name || ''}${duration ? ` • ${duration}` : ''}`}
              </p>

              {completedFlash || isCompleted ? (
                <p className="text-sm font-medium text-[var(--state-success)]">✓ Aula concluída</p>
              ) : (
                <button
                  type="button"
                  onClick={() => void markComplete()}
                  className="inline-flex min-h-11 items-center rounded-xl border border-[var(--border-default)] px-4 text-sm font-semibold text-[var(--text-primary)]"
                >
                  ✓ Marcar como concluída
                </button>
              )}

              {error ? <p className="text-sm text-[var(--state-danger)]">{error}</p> : null}

              {content.description ? (
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{content.description}</p>
              ) : null}

              {trailContext ? (
                <>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(true)}
                    className="inline-flex min-h-11 w-full items-center justify-between rounded-xl border border-[var(--border-default)] px-4 text-sm font-medium lg:hidden"
                  >
                    Conteúdo da trilha
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <MentorLessonNavigation
                    previous={trailContext.previous}
                    next={trailContext.next}
                    trailSlug={trailContext.trail.slug}
                    moduleJustCompleted={isCompleted && trailContext.currentModuleCompleted}
                    nextModuleTitle={trailContext.nextModuleTitle}
                    trailJustCompleted={isCompleted && trailContext.trailJustCompleted}
                    trailTitle={trailContext.trail.title}
                  />
                </>
              ) : trailContext === null && progress ? (
                <p className="text-xs text-[var(--text-secondary)]">
                  {progress.lastPositionSeconds
                    ? `Você parou em ${formatDuration(progress.lastPositionSeconds)}`
                    : null}
                </p>
              ) : null}

              {content.updatedAt ? (
                <p className="text-xs text-[var(--text-secondary)]">
                  Atualizado em {new Date(content.updatedAt).toLocaleDateString('pt-BR')}
                  {typeof content.version === 'number' ? ` • Versão ${content.version}.0` : ''}
                </p>
              ) : null}
            </div>
          </div>
          {trailContext ? (
            <MentorLessonSidebar
              trail={trailContext.trail}
              modules={trailContext.modules}
              currentLessonId={content.id}
            />
          ) : null}
        </div>
      </div>

      {trailContext ? (
        <MentorTrailDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          trail={trailContext.trail}
          modules={trailContext.modules}
          currentLessonId={content.id}
        />
      ) : null}

      <MentorContentModal
        open={editOpen}
        initial={content}
        onClose={() => setEditOpen(false)}
        onSaved={(next) => {
          setEditOpen(false);
          setContent(next);
          if (next.slug !== slug) {
            const dest = trailSlug
              ? `/videosmentorados/trilhas/${encodeURIComponent(trailSlug)}/aulas/${encodeURIComponent(next.slug)}`
              : `/videosmentorados/${encodeURIComponent(next.slug)}`;
            router.replace(dest);
          }
        }}
      />

      <MentorConfirmDialog
        open={deleteOpen}
        title="Excluir aula?"
        description={`O vídeo "${content.title}" será removido da Central do Mentorado.`}
        confirmLabel="Excluir"
        loading={deleting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
