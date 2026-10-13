'use client';

import { useEffect, useMemo, useState } from 'react';
import MentorUploadField from '@/components/mentorados/MentorUploadField';
import { MENTOR_CATEGORY_LIST } from '@/lib/mentorados/categories';
import type { MentorCategory, MentorContentDto } from '@/types/mentorContent';

export type MentorContentFormValue = {
  title: string;
  description: string;
  category: MentorCategory | '';
  tagsText: string;
  order: string;
  featured: boolean;
  status: 'draft' | 'published';
  videoFile: File | null;
  thumbnailFile: File | null;
};

const EMPTY: MentorContentFormValue = {
  title: '',
  description: '',
  category: '',
  tagsText: '',
  order: '',
  featured: false,
  status: 'draft',
  videoFile: null,
  thumbnailFile: null,
};

export function parseMentorTags(text: string): string[] {
  return text
    .split(/[,\n]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

export default function MentorContentForm({
  initial,
  videoPhase,
  videoProgress,
  videoError,
  thumbnailPhase,
  thumbnailProgress,
  thumbnailError,
  disabled,
  onChange,
}: {
  initial?: MentorContentDto | null;
  videoPhase: 'idle' | 'preparing' | 'uploading' | 'finalizing' | 'done' | 'error';
  videoProgress: number;
  videoError?: string;
  thumbnailPhase: 'idle' | 'preparing' | 'uploading' | 'finalizing' | 'done' | 'error';
  thumbnailProgress: number;
  thumbnailError?: string;
  disabled?: boolean;
  onChange: (value: MentorContentFormValue) => void;
}) {
  const [value, setValue] = useState<MentorContentFormValue>(() =>
    initial
      ? {
          title: initial.title,
          description: initial.description || '',
          category: initial.category,
          tagsText: (initial.tags || []).join(', '),
          order: typeof initial.order === 'number' ? String(initial.order) : '',
          featured: initial.featured === true,
          status: initial.status === 'published' ? 'published' : 'draft',
          videoFile: null,
          thumbnailFile: null,
        }
      : EMPTY
  );

  useEffect(() => {
    onChange(value);
  }, [onChange, value]);

  const createdByLabel = useMemo(() => {
    if (!initial?.createdBy?.name && !initial?.createdBy?.email) return null;
    const date = initial.createdAt
      ? new Date(initial.createdAt).toLocaleDateString('pt-BR')
      : '';
    return `Criado por ${initial.createdBy?.name || initial.createdBy?.email}${date ? ` · ${date}` : ''}`;
  }, [initial]);

  function patch(partial: Partial<MentorContentFormValue>) {
    setValue((prev) => ({ ...prev, ...partial }));
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Informações</h3>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
            Título <span className="text-[var(--state-danger)]">*</span>
          </label>
          <input
            value={value.title}
            disabled={disabled}
            onChange={(e) => patch({ title: e.target.value })}
            className="w-full rounded-xl border border-[var(--border-default)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
            Descrição
          </label>
          <textarea
            value={value.description}
            disabled={disabled}
            rows={3}
            onChange={(e) => patch({ description: e.target.value })}
            className="w-full resize-y rounded-xl border border-[var(--border-default)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
            Categoria <span className="text-[var(--state-danger)]">*</span>
          </label>
          <select
            value={value.category}
            disabled={disabled}
            onChange={(e) => patch({ category: e.target.value as MentorCategory | '' })}
            className="w-full rounded-xl border border-[var(--border-default)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
          >
            <option value="">Selecione</option>
            {MENTOR_CATEGORY_LIST.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.emoji} {cat.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
            Tags
          </label>
          <input
            value={value.tagsText}
            disabled={disabled}
            onChange={(e) => patch({ tagsText: e.target.value })}
            placeholder="tirzepatida, armazenamento, geladeira"
            className="w-full rounded-xl border border-[var(--border-default)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
          />
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Separe as tags por vírgula.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Vídeo</h3>
        <MentorUploadField
          label={initial ? 'Substituir vídeo' : 'Upload do vídeo'}
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
          required={!initial}
          fileName={value.videoFile?.name}
          phase={videoPhase}
          progress={videoProgress}
          error={videoError}
          disabled={disabled}
          onFile={(file) => patch({ videoFile: file })}
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Thumbnail</h3>
        <MentorUploadField
          label="Imagem de capa"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          fileName={value.thumbnailFile?.name}
          phase={thumbnailPhase}
          progress={thumbnailProgress}
          error={thumbnailError}
          disabled={disabled}
          onFile={(file) => patch({ thumbnailFile: file })}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">
            Ordem
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={value.order}
            disabled={disabled}
            onChange={(e) => patch({ order: e.target.value })}
            className="w-full rounded-xl border border-[var(--border-default)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--border-focus)]"
          />
        </div>
        <div className="flex items-end">
          <label className="flex min-h-11 items-center gap-3 text-sm text-[var(--text-primary)]">
            <button
              type="button"
              role="switch"
              aria-checked={value.featured}
              disabled={disabled}
              onClick={() => patch({ featured: !value.featured })}
              className={`relative h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors ${
                value.featured ? 'bg-[var(--brand-primary)]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  value.featured ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            Destaque
          </label>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Publicação</h3>
        <div className="flex gap-2">
          {(['draft', 'published'] as const).map((status) => (
            <button
              key={status}
              type="button"
              disabled={disabled}
              onClick={() => patch({ status })}
              className={`min-h-11 rounded-xl px-4 text-sm font-medium ${
                value.status === status
                  ? 'bg-[var(--brand-primary)] text-[var(--text-inverse)]'
                  : 'border border-[var(--border-default)] text-[var(--text-secondary)]'
              }`}
            >
              {status === 'draft' ? 'Rascunho' : 'Publicado'}
            </button>
          ))}
        </div>
      </section>

      {createdByLabel ? (
        <p className="text-xs text-[var(--text-secondary)]">{createdByLabel}</p>
      ) : null}
    </div>
  );
}
