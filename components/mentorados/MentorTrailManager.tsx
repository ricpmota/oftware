'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import MentoradosAccessGate from '@/components/mentorados/MentoradosAccessGate';
import MentorConfirmDialog from '@/components/mentorados/MentorConfirmDialog';
import { MentorTrailGridSkeleton } from '@/components/mentorados/MentorSkeletons';
import { auth } from '@/lib/firebase';
import { getMentorContents } from '@/services/mentorContentService';
import {
  addLessonToModule,
  createMentorModule,
  createMentorTrail,
  deleteMentorModule,
  deleteMentorTrail,
  getMentorTrailAdmin,
  listMentorTrails,
  removeTrailLesson,
  reorderMentorTrail,
  updateMentorModule,
  updateMentorTrail,
} from '@/services/mentorTrailService';
import type { MentorContentDto } from '@/types/mentorContent';
import type { MentorModuleDto, MentorTrailCardDto, MentorTrailDetailDto } from '@/types/mentorTrail';

export default function MentorTrailManager() {
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [trails, setTrails] = useState<MentorTrailCardDto[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MentorTrailDetailDto | null>(null);
  const [lessonsCatalog, setLessonsCatalog] = useState<MentorContentDto[]>([]);
  const [pickerModuleId, setPickerModuleId] = useState<string | null>(null);
  const [pickerQuery, setPickerQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('Trilha Essencial do Mentorado');
  const [deleteTrailId, setDeleteTrailId] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setSignedIn(!!user);
      setAuthReady(true);
    });
  }, []);

  const loadList = useCallback(async () => {
    const listed = await listMentorTrails();
    if (!listed.canManage) {
      setForbidden(true);
      return;
    }
    setTrails(
      listed.trails.map((trail) => ({
        id: trail.id,
        title: trail.title,
        slug: trail.slug,
        description: trail.description,
        shortDescription: trail.shortDescription,
        status: trail.status,
        order: trail.order,
        featured: trail.featured,
        moduleCount: 0,
        lessonCount: 0,
        durationSeconds: 0,
        completedLessons: 0,
        progressPercent: 0,
        isCompleted: false,
      }))
    );
    setLessonsCatalog((await getMentorContents()).contents);
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    const next = await getMentorTrailAdmin(id);
    setDetail(next);
  }, []);

  useEffect(() => {
    if (!authReady || !signedIn) {
      if (authReady) setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        await loadList();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Falha ao carregar.';
        if (message.toLowerCase().includes('permissão') || message.toLowerCase().includes('exclusiva')) {
          setForbidden(true);
        } else setError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [authReady, signedIn, loadList]);

  async function selectTrail(id: string) {
    setActiveId(id);
    setError('');
    try {
      await loadDetail(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao abrir a trilha.');
    }
  }

  async function handleCreateTrail() {
    setCreating(true);
    setError('');
    try {
      const title = newTitle.trim() || 'Trilha Essencial do Mentorado';
      const created = await createMentorTrail({
        title,
        shortDescription: 'O treinamento fundamental para começar a utilizar o método e a plataforma Oftware.',
        description:
          'O treinamento fundamental para começar a utilizar o método e a plataforma Oftware com segurança e organização.',
        status: 'draft',
        featured: trails.length === 0,
        slug: /trilha essencial/i.test(title) ? 'trilha-essencial' : undefined,
      });
      setMessage('Trilha criada como rascunho.');
      await loadList();
      await selectTrail(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar trilha.');
    } finally {
      setCreating(false);
    }
  }

  const usedContentIds = useMemo(() => {
    const ids = new Set<string>();
    for (const mod of detail?.modules || []) {
      for (const lesson of mod.lessons) ids.add(lesson.id);
    }
    return ids;
  }, [detail]);

  const pickerResults = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return lessonsCatalog.filter((item) => {
      if (usedContentIds.has(item.id)) return false;
      if (!q) return true;
      return `${item.title} ${item.description || ''} ${(item.tags || []).join(' ')}`.toLowerCase().includes(q);
    });
  }, [lessonsCatalog, pickerQuery, usedContentIds]);

  if (!authReady || (signedIn && loading)) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <MentorTrailGridSkeleton />
      </div>
    );
  }
  if (!signedIn) return <MentoradosAccessGate variant="login" />;
  if (forbidden) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-[var(--text-primary)]">Você não tem permissão para gerenciar trilhas.</p>
        <Link href="/videosmentorados" className="mt-4 inline-block text-sm text-[var(--brand-primary)]">
          Voltar à Central
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface-background)]">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <Link href="/videosmentorados" className="inline-flex min-h-11 items-center gap-2 text-sm text-[var(--text-secondary)]">
          <ArrowLeft className="h-4 w-4" />
          Central do Mentorado
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Gerenciar trilhas</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Organize módulos e aulas existentes sem duplicar vídeos.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="min-h-11 rounded-xl border border-[var(--border-default)] px-3 text-sm"
              aria-label="Título da nova trilha"
            />
            <button
              type="button"
              disabled={creating}
              onClick={() => void handleCreateTrail()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold text-[var(--text-inverse)]"
            >
              <Plus className="h-4 w-4" />
              Criar trilha
            </button>
          </div>
        </div>
        {message ? <p className="text-sm text-[var(--state-success)]">{message}</p> : null}
        {error ? <p className="text-sm text-[var(--state-danger)]">{error}</p> : null}

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="space-y-2">
            {trails.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">Nenhuma trilha criada.</p>
            ) : (
              trails.map((trail) => (
                <button
                  key={trail.id}
                  type="button"
                  onClick={() => void selectTrail(trail.id)}
                  className={`flex min-h-11 w-full items-center justify-between rounded-xl border px-3 text-left text-sm ${
                    activeId === trail.id
                      ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/5'
                      : 'border-[var(--border-default)]'
                  }`}
                >
                  <span className="truncate font-medium">{trail.title}</span>
                  <span className="text-[10px] uppercase text-[var(--text-secondary)]">{trail.status}</span>
                </button>
              ))
            )}
          </aside>

          <div>
            {!detail ? (
              <p className="text-sm text-[var(--text-secondary)]">Selecione uma trilha para editar.</p>
            ) : (
              <TrailEditor
                detail={detail}
                onReload={async () => {
                  await loadList();
                  if (activeId) await loadDetail(activeId);
                }}
                onDelete={() => setDeleteTrailId(detail.trail.id)}
                onOpenPicker={setPickerModuleId}
              />
            )}
          </div>
        </div>
      </div>

      {pickerModuleId ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-t-2xl bg-[var(--surface-modal)] sm:rounded-2xl">
            <div className="border-b border-[var(--border-default)] px-4 py-3">
              <h2 className="font-semibold">Adicionar aula</h2>
              <input
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="Buscar aulas..."
                className="mt-3 w-full rounded-xl border border-[var(--border-default)] px-3 py-2 text-sm"
              />
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {pickerResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-slate-50"
                  onClick={async () => {
                    try {
                      await addLessonToModule(pickerModuleId, item.id);
                      setPickerModuleId(null);
                      if (activeId) await loadDetail(activeId);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Falha ao adicionar aula.');
                    }
                  }}
                >
                  {item.title}
                </button>
              ))}
              {pickerResults.length === 0 ? (
                <p className="px-3 py-6 text-sm text-[var(--text-secondary)]">Nenhuma aula disponível.</p>
              ) : null}
            </div>
            <div className="border-t border-[var(--border-default)] p-3">
              <button type="button" className="min-h-11 w-full rounded-xl border text-sm" onClick={() => setPickerModuleId(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <MentorConfirmDialog
        open={Boolean(deleteTrailId)}
        title="Excluir trilha?"
        description="Módulos e vínculos com aulas serão removidos. Os vídeos continuam na biblioteca."
        onCancel={() => setDeleteTrailId(null)}
        onConfirm={async () => {
          if (!deleteTrailId) return;
          await deleteMentorTrail(deleteTrailId);
          setDeleteTrailId(null);
          setDetail(null);
          setActiveId(null);
          await loadList();
        }}
      />
    </div>
  );
}

function TrailEditor({
  detail,
  onReload,
  onDelete,
  onOpenPicker,
}: {
  detail: MentorTrailDetailDto;
  onReload: () => Promise<void>;
  onDelete: () => void;
  onOpenPicker: (moduleId: string) => void;
}) {
  const trail = detail.trail;
  const [title, setTitle] = useState(trail.title);
  const [description, setDescription] = useState(trail.description || '');
  const [saving, setSaving] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');

  useEffect(() => {
    setTitle(trail.title);
    setDescription(trail.description || '');
  }, [trail.id, trail.title, trail.description]);

  async function moveModule(mod: MentorModuleDto, dir: -1 | 1) {
    const ordered = [...detail.modules].sort((a, b) => a.order - b.order);
    const index = ordered.findIndex((m) => m.id === mod.id);
    const target = index + dir;
    if (target < 0 || target >= ordered.length) return;
    const swapped = [...ordered];
    const tmp = swapped[index];
    swapped[index] = swapped[target];
    swapped[target] = tmp;
    await reorderMentorTrail(trail.id, {
      modules: swapped.map((item, order) => ({ id: item.id, order: order + 1 })),
    });
    await onReload();
  }

  async function moveLesson(mod: MentorModuleDto, lessonIndex: number, dir: -1 | 1) {
    const next = lessonIndex + dir;
    if (next < 0 || next >= mod.lessons.length) return;
    const lessons = [...mod.lessons];
    const tmp = lessons[lessonIndex];
    lessons[lessonIndex] = lessons[next];
    lessons[next] = tmp;
    await reorderMentorTrail(trail.id, {
      lessons: lessons.map((item, order) => ({
        id: item.trailLessonId || `${trail.id}__${item.id}`,
        moduleId: mod.id,
        order: order + 1,
      })),
    });
    await onReload();
  }

  return (
    <div className="space-y-5 rounded-2xl border border-[var(--border-default)] p-4 sm:p-5">
      <div className="grid gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="min-h-11 rounded-xl border border-[var(--border-default)] px-3 text-sm font-medium"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="rounded-xl border border-[var(--border-default)] px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await updateMentorTrail(trail.id, { title, description });
              await onReload();
              setSaving(false);
            }}
            className="min-h-11 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold text-[var(--text-inverse)]"
          >
            Salvar
          </button>
          <button
            type="button"
            onClick={async () => {
              await updateMentorTrail(trail.id, {
                status: trail.status === 'published' ? 'draft' : 'published',
              });
              await onReload();
            }}
            className="min-h-11 rounded-xl border border-[var(--border-default)] px-4 text-sm"
          >
            {trail.status === 'published' ? 'Despublicar' : 'Publicar'}
          </button>
          <button
            type="button"
            onClick={async () => {
              await updateMentorTrail(trail.id, { status: 'archived' });
              await onReload();
            }}
            className="min-h-11 rounded-xl border px-4 text-sm"
          >
            Arquivar
          </button>
          <button type="button" onClick={onDelete} className="min-h-11 rounded-xl px-4 text-sm text-[var(--state-danger)]">
            Excluir trilha
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={moduleTitle}
          onChange={(e) => setModuleTitle(e.target.value)}
          placeholder="Novo módulo"
          className="min-h-11 flex-1 rounded-xl border border-[var(--border-default)] px-3 text-sm"
        />
        <button
          type="button"
          onClick={async () => {
            if (!moduleTitle.trim()) return;
            await createMentorModule(trail.id, { title: moduleTitle.trim() });
            setModuleTitle('');
            await onReload();
          }}
          className="min-h-11 rounded-xl border px-4 text-sm font-medium"
        >
          + Módulo
        </button>
      </div>

      <div className="space-y-3">
        {detail.modules.map((mod, moduleIndex) => (
          <div key={mod.id} className="rounded-xl border border-[var(--border-default)] p-3">
            <div className="flex items-center gap-2">
              <input
                defaultValue={mod.title}
                className="min-h-11 flex-1 rounded-lg border border-[var(--border-default)] px-3 text-sm font-medium"
                onBlur={async (e) => {
                  const next = e.target.value.trim();
                  if (next && next !== mod.title) {
                    await updateMentorModule(mod.id, { title: next });
                    await onReload();
                  }
                }}
              />
              <button type="button" className="min-h-11 min-w-11" aria-label="Subir módulo" onClick={() => void moveModule(mod, -1)}>
                <ChevronUp className="mx-auto h-4 w-4" />
              </button>
              <button type="button" className="min-h-11 min-w-11" aria-label="Descer módulo" onClick={() => void moveModule(mod, 1)}>
                <ChevronDown className="mx-auto h-4 w-4" />
              </button>
              <button type="button" className="min-h-11 min-w-11 text-[var(--state-danger)]" aria-label="Excluir módulo" onClick={() => void deleteMentorModule(mod.id).then(onReload)}>
                <Trash2 className="mx-auto h-4 w-4" />
              </button>
            </div>
            <ul className="mt-2 space-y-1">
              {mod.lessons.map((lesson, lessonIndex) => (
                <li key={lesson.id} className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm">
                  <span className="flex-1 truncate">{lesson.title}</span>
                  <button type="button" aria-label="Subir aula" onClick={() => void moveLesson(mod, lessonIndex, -1)}>
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label="Descer aula" onClick={() => void moveLesson(mod, lessonIndex, 1)}>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Remover aula da trilha"
                    onClick={() =>
                      void removeTrailLesson(lesson.trailLessonId || `${trail.id}__${lesson.id}`).then(onReload)
                    }
                  >
                    <Trash2 className="h-4 w-4 text-[var(--state-danger)]" />
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onOpenPicker(mod.id)}
              className="mt-2 min-h-11 text-sm font-medium text-[var(--brand-primary)]"
            >
              + Adicionar aula
            </button>
            <p className="sr-only">Módulo {moduleIndex + 1}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
