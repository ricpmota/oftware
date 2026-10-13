'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import MentorContentForm, {
  parseMentorTags,
  type MentorContentFormValue,
} from '@/components/mentorados/MentorContentForm';
import { isMentorCategory } from '@/lib/mentorados/categories';
import {
  createMentorContent,
  requestMentorUploadUrl,
  updateMentorContent,
  uploadToSignedUrl,
} from '@/services/mentorContentService';
import type { MentorContentDto } from '@/types/mentorContent';

function resolveVideoMime(file: File): string {
  if (VIDEO_MIME.has(file.type)) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.mp4') || name.endsWith('.m4v')) return 'video/mp4';
  if (name.endsWith('.mov')) return 'video/quicktime';
  if (name.endsWith('.webm')) return 'video/webm';
  return file.type;
}

function resolveImageMime(file: File): string {
  if (IMAGE_MIME.has(file.type)) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  return file.type;
}

function readVideoDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : undefined;
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(undefined);
    };
    video.src = url;
  });
}

type Phase = 'idle' | 'preparing' | 'uploading' | 'finalizing' | 'done' | 'error';

export default function MentorContentModal({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial?: MentorContentDto | null;
  onClose: () => void;
  onSaved: (content: MentorContentDto) => void;
}) {
  const formRef = useRef<MentorContentFormValue | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [videoPhase, setVideoPhase] = useState<Phase>('idle');
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoError, setVideoError] = useState('');
  const [thumbPhase, setThumbPhase] = useState<Phase>('idle');
  const [thumbProgress, setThumbProgress] = useState(0);
  const [thumbError, setThumbError] = useState('');

  const uploading = saving;

  useEffect(() => {
    if (!open) {
      setSaving(false);
      setError('');
      setSuccess('');
      setVideoPhase('idle');
      setThumbPhase('idle');
      setVideoProgress(0);
      setThumbProgress(0);
      setVideoError('');
      setThumbError('');
    }
  }, [open]);

  useEffect(() => {
    if (!uploading) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [uploading]);

  const handleFormChange = useCallback((value: MentorContentFormValue) => {
    formRef.current = value;
  }, []);

  async function uploadAsset(
    kind: 'video' | 'thumbnail',
    file: File,
    contentId?: string
  ) {
    const contentType = kind === 'video' ? resolveVideoMime(file) : resolveImageMime(file);
    const signed = await requestMentorUploadUrl({
      kind,
      filename: file.name,
      contentType,
      size: file.size,
      contentId,
    });
    await uploadToSignedUrl(signed.uploadUrl, file, signed.contentType, (percent) => {
      if (kind === 'video') setVideoProgress(percent);
      else setThumbProgress(percent);
    });
    return signed;
  }

  async function handleSubmit() {
    const value = formRef.current;
    if (!value || saving) return;
    setError('');
    setSuccess('');
    setVideoError('');
    setThumbError('');

    if (!value.title.trim()) {
      setError('Informe o título.');
      return;
    }
    if (!isMentorCategory(value.category)) {
      setError('Selecione a categoria.');
      return;
    }
    if (!initial && !value.videoFile) {
      setError('Envie o vídeo.');
      return;
    }
    if (value.videoFile && !VIDEO_MIME.has(resolveVideoMime(value.videoFile))) {
      setVideoError('Formato inválido. Use MP4, MOV ou WEBM.');
      return;
    }
    if (value.thumbnailFile && !IMAGE_MIME.has(resolveImageMime(value.thumbnailFile))) {
      setThumbError('Formato inválido. Use JPG, PNG ou WEBP.');
      return;
    }

    setSaving(true);
    try {
      let contentId = initial?.id;
      let videoStoragePath: string | undefined;
      let thumbnailStoragePath: string | undefined;
      let durationSeconds = initial?.durationSeconds;

      if (value.videoFile) {
        setVideoPhase('preparing');
        const duration = await readVideoDuration(value.videoFile);
        durationSeconds = duration;
        setVideoPhase('uploading');
        const uploaded = await uploadAsset('video', value.videoFile, contentId);
        contentId = uploaded.contentId;
        videoStoragePath = uploaded.storagePath;
        setVideoPhase('done');
      }

      if (value.thumbnailFile) {
        setThumbPhase('preparing');
        setThumbPhase('uploading');
        const uploaded = await uploadAsset('thumbnail', value.thumbnailFile, contentId);
        contentId = uploaded.contentId;
        thumbnailStoragePath = uploaded.storagePath;
        setThumbPhase('done');
      }

      setVideoPhase((prev) => (prev === 'uploading' ? 'finalizing' : prev));
      const payload = {
        id: contentId,
        title: value.title.trim(),
        description: value.description.trim() || undefined,
        category: value.category,
        tags: parseMentorTags(value.tagsText),
        videoStoragePath,
        thumbnailStoragePath,
        durationSeconds,
        order: value.order.trim() ? Number(value.order) : null,
        featured: value.featured,
        status: value.status,
      };

      const result = initial
        ? await updateMentorContent(initial.id, payload)
        : await createMentorContent(payload);

      if (!result.content) throw new Error('Resposta inválida do servidor.');
      setSuccess('Conteúdo criado com sucesso.');
      onSaved(result.content);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao salvar o conteúdo.';
      setError(message);
      if (videoPhase === 'uploading' || videoPhase === 'preparing') setVideoPhase('error');
      if (thumbPhase === 'uploading' || thumbPhase === 'preparing') setThumbPhase('error');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6">
      <div className="flex max-h-[100dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-[var(--surface-modal)] shadow-xl sm:max-h-[90vh] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border-default)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {initial ? 'Editar conteúdo' : 'Novo conteúdo'}
          </h2>
          <button
            type="button"
            onClick={() => {
              if (saving) return;
              onClose();
            }}
            className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-slate-100"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <MentorContentForm
            key={initial?.id || 'new'}
            initial={initial}
            videoPhase={videoPhase}
            videoProgress={videoProgress}
            videoError={videoError}
            thumbnailPhase={thumbPhase}
            thumbnailProgress={thumbProgress}
            thumbnailError={thumbError}
            disabled={saving}
            onChange={handleFormChange}
          />
          {error ? <p className="mt-4 text-sm text-[var(--state-danger)]">{error}</p> : null}
          {success ? <p className="mt-4 text-sm text-[var(--state-success)]">{success}</p> : null}
        </div>
        <div className="flex gap-3 border-t border-[var(--border-default)] px-5 py-4">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="min-h-11 flex-1 rounded-xl border border-[var(--border-default)] text-sm font-medium text-[var(--text-secondary)]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSubmit()}
            className="min-h-11 flex-1 rounded-xl bg-[var(--brand-primary)] text-sm font-semibold text-[var(--text-inverse)] disabled:opacity-60"
          >
            {saving ? 'Salvando...' : initial ? 'Salvar alterações' : 'Criar conteúdo'}
          </button>
        </div>
      </div>
    </div>
  );
}
