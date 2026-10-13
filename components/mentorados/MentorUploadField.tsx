'use client';

type UploadPhase = 'idle' | 'preparing' | 'uploading' | 'finalizing' | 'done' | 'error';

export default function MentorUploadField({
  label,
  accept,
  required,
  fileName,
  progress,
  phase,
  error,
  onFile,
  disabled,
}: {
  label: string;
  accept: string;
  required?: boolean;
  fileName?: string;
  progress?: number;
  phase: UploadPhase;
  error?: string;
  onFile: (file: File | null) => void;
  disabled?: boolean;
}) {
  const busy = phase === 'preparing' || phase === 'uploading' || phase === 'finalizing';
  const phaseLabel =
    phase === 'preparing'
      ? 'Preparando upload...'
      : phase === 'uploading'
        ? 'Enviando...'
        : phase === 'finalizing'
          ? 'Finalizando...'
          : phase === 'done'
            ? 'Arquivo enviado.'
            : null;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--text-primary)]">
        {label}
        {required ? <span className="text-[var(--state-danger)]"> *</span> : null}
      </label>
      <input
        type="file"
        accept={accept}
        disabled={disabled || busy}
        onChange={(e) => onFile(e.target.files?.[0] || null)}
        className="block w-full text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--brand-primary)]/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-[var(--brand-primary)]"
      />
      {fileName ? (
        <p className="truncate text-xs text-[var(--text-secondary)]">{fileName}</p>
      ) : null}
      {busy || phase === 'done' ? (
        <div className="space-y-1">
          {phaseLabel ? (
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              {phase === 'uploading' && typeof progress === 'number'
                ? `Enviando vídeo... ${progress}%`
                : phaseLabel}
            </p>
          ) : null}
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[var(--brand-primary)] transition-[width]"
              style={{
                width: `${phase === 'done' ? 100 : Math.max(phase === 'preparing' ? 8 : 0, progress || 0)}%`,
              }}
            />
          </div>
        </div>
      ) : null}
      {error ? <p className="text-xs text-[var(--state-danger)]">{error}</p> : null}
    </div>
  );
}
