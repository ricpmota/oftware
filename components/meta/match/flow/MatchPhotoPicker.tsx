'use client';

import { useRef, useState } from 'react';
import { MatchPhotoCropper } from '@/components/meta/match/flow/MatchPhotoCropper';
import { MATCH_PHOTO_MAX, type MatchPhoto } from '@/lib/match/matchProfile';
import { deleteMatchPhotoFile, uploadMatchPhoto, validateMatchPhotoFile } from '@/services/matchPhotoService';

function reindex(photos: MatchPhoto[], primaryId?: string): MatchPhoto[] {
  return photos.map((photo, index) => ({
    ...photo,
    order: index,
    isPrimary: primaryId ? photo.id === primaryId : index === 0,
  }));
}

export function MatchPhotoPicker({
  photos,
  onChange,
}: {
  photos: MatchPhoto[];
  onChange: (photos: MatchPhoto[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [cropFile, setCropFile] = useState<File | null>(null);

  function onFile(file: File | undefined) {
    if (!file) return;
    if (photos.length >= MATCH_PHOTO_MAX) {
      setError('Você pode adicionar até 6 fotos.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Escolha uma imagem.');
      return;
    }
    setError('');
    setCropFile(file);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function onCropped(file: File) {
    const validation = validateMatchPhotoFile(file, photos.length);
    if (validation) {
      setError(validation);
      setCropFile(null);
      return;
    }
    setError('');
    setCropFile(null);
    setUploading(true);
    try {
      const uploaded = await uploadMatchPhoto(file, photos.length);
      const next = reindex(
        [...photos, uploaded],
        photos.length === 0 ? uploaded.id : photos.find((photo) => photo.isPrimary)?.id
      );
      onChange(next);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Não foi possível enviar a foto.');
    } finally {
      setUploading(false);
    }
  }

  async function remove(photo: MatchPhoto) {
    setError('');
    try {
      await deleteMatchPhotoFile(photo.storagePath);
    } catch {
      setError('Não foi possível remover a foto agora.');
      return;
    }
    const remaining = photos.filter((item) => item.id !== photo.id);
    const primary = photo.isPrimary ? remaining[0]?.id : photos.find((item) => item.isPrimary)?.id;
    onChange(reindex(remaining, primary));
  }

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= photos.length) return;
    const copy = [...photos];
    const current = copy[index];
    const sibling = copy[nextIndex];
    if (!current || !sibling) return;
    copy[index] = sibling;
    copy[nextIndex] = current;
    onChange(reindex(copy, photos.find((photo) => photo.isPrimary)?.id));
  }

  function makePrimary(id: string) {
    onChange(reindex(photos, id));
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, index) => (
          <div key={photo.id}>
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#F4F6F8]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="h-full w-full object-cover" />
              {photo.isPrimary ? (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-[#4CCB7A] px-2 py-0.5 text-[10px] font-semibold text-[#0A1F44]">
                  Principal
                </span>
              ) : null}
            </div>
            <div className="mt-1 grid grid-cols-4 gap-0.5">
              <button type="button" className="h-8 rounded-lg text-[11px] font-semibold text-[#0A1F44]" onClick={() => move(index, -1)} aria-label="Mover foto para trás">
                ←
              </button>
              <button type="button" className="h-8 rounded-lg text-[11px] font-semibold text-[#0A1F44]" onClick={() => makePrimary(photo.id)}>
                Capa
              </button>
              <button type="button" className="h-8 rounded-lg text-[11px] font-semibold text-[#0A1F44]" onClick={() => move(index, 1)} aria-label="Mover foto para frente">
                →
              </button>
              <button type="button" className="h-8 rounded-lg text-[11px] font-semibold text-[#9A3B3B]" onClick={() => remove(photo)} aria-label="Remover foto">
                ✕
              </button>
            </div>
          </div>
        ))}
        {photos.length < MATCH_PHOTO_MAX ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square items-center justify-center self-start rounded-2xl border border-dashed border-[#4CCB7A] bg-[#F4FBF7] text-sm font-semibold text-[#0A1F44] disabled:opacity-60"
          >
            {uploading ? 'Enviando…' : 'Adicionar'}
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => onFile(event.target.files?.[0])}
      />
      <p className="mt-3 text-xs leading-relaxed text-[#0A1F44]/55">
        Até 6 fotos. Depois de escolher, enquadre para a tela inteira. Fotos clínicas não entram aqui.
      </p>
      {error ? <p className="mt-2 text-sm text-[#9A3B3B]">{error}</p> : null}
      {cropFile ? (
        <MatchPhotoCropper file={cropFile} onCancel={() => setCropFile(null)} onConfirm={onCropped} />
      ) : null}
    </div>
  );
}
