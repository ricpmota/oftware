'use client';

import { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, Trash2, Video } from 'lucide-react';
import type { ExerciseGymMedia } from '@/lib/personal/exerciseGymMedia';
import { WorkoutRunBottomSheet } from '@/components/personal/run/WorkoutRunBottomSheet';
import { GymMediaLoopVideo } from '@/components/personal/run/GymMediaLoopVideo';

const badgeBtn =
  'flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#E8EDED] bg-white/[0.08] ring-1 ring-white/12 hover:bg-white/[0.12] disabled:opacity-50';

export function WorkoutRunGymMediaSheet({
  open,
  exerciseName,
  media,
  canEdit,
  uploading,
  error,
  onClose,
  onPickFile,
  onRemove,
}: {
  open: boolean;
  exerciseName: string;
  media: ExerciseGymMedia | null;
  canEdit: boolean;
  uploading: boolean;
  error: string | null;
  onClose: () => void;
  onPickFile: (file: File) => void;
  onRemove: () => void;
}) {
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [removing, setRemoving] = useState(false);

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onPickFile(file);
  };

  return (
    <WorkoutRunBottomSheet
      open={open}
      title="Seu Vídeo"
      subtitle={exerciseName}
      labelledBy="run-gym-media-title"
      onClose={onClose}
    >
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInput}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={handleInput}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleInput}
      />

      <p className="text-sm text-[#E8EDED]/70 leading-relaxed">
        Foto ou vídeo da máquina na sua academia, para reconhecer este exercício no aparelho certo.
      </p>

      {media ? (
        <div className="overflow-hidden rounded-2xl bg-black/40 ring-1 ring-white/10">
          {media.kind === 'video' ? (
            <GymMediaLoopVideo
              src={media.url}
              className="max-h-[42vh] w-full bg-black object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.url}
              alt="Máquina deste exercício na academia"
              className="max-h-[42vh] w-full object-contain"
            />
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 px-4 py-8 text-center text-sm text-[#E8EDED]/55">
          Nenhuma foto real ainda.
        </div>
      )}

      {error ? <p className="text-xs text-red-300">{error}</p> : null}

      {canEdit ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={uploading || removing}
              onClick={() => photoRef.current?.click()}
              className={badgeBtn}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              Foto
            </button>
            <button
              type="button"
              disabled={uploading || removing}
              onClick={() => videoRef.current?.click()}
              className={badgeBtn}
            >
              <Video className="w-4 h-4" />
              Vídeo
            </button>
            <button
              type="button"
              disabled={uploading || removing}
              onClick={() => galleryRef.current?.click()}
              className={badgeBtn}
            >
              <ImagePlus className="w-4 h-4" />
              Galeria
            </button>
          </div>
          {media ? (
            <button
              type="button"
              disabled={uploading || removing}
              onClick={async () => {
                setRemoving(true);
                try {
                  await onRemove();
                } finally {
                  setRemoving(false);
                }
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-300 bg-red-500/10 ring-1 ring-red-400/25 hover:bg-red-500/15 disabled:opacity-50"
            >
              {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Remover
            </button>
          ) : null}
        </div>
      ) : (
        <p className="text-[11px] text-[#E8EDED]/45">Somente o paciente ou o personal podem registrar a foto real.</p>
      )}
    </WorkoutRunBottomSheet>
  );
}
