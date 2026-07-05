'use client';

import { useRef, useState } from 'react';
import { ImageIcon, Loader2, Lock, Upload, X } from 'lucide-react';

const DEFAULT_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const DEFAULT_MAX_SIZE_BYTES = 2 * 1024 * 1024;

type Props = {
  currentUrl: string | null;
  onUrlChange: (url: string | null) => void;
  disabled?: boolean;
  uploadEndpoint?: string;
  uploadTipo?: string;
  allowedTypes?: string[];
  maxSizeBytes?: number;
  hint?: string;
  previewClassName?: string;
  emptyLabel?: string;
  /** Exibe só a imagem — sem upload, troca ou remoção (padrão Método). */
  readOnly?: boolean;
  readOnlyHint?: string;
};

export default function MedicoWhiteLabelImageEditor({
  currentUrl,
  onUrlChange,
  disabled,
  uploadEndpoint = '/api/upload-medico-white-label-og',
  uploadTipo,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
  hint,
  previewClassName = 'aspect-[1200/630] max-h-48',
  emptyLabel = 'Clique para enviar imagem',
  readOnly = false,
  readOnlyHint = 'Imagem definida pelo padrão Método. Apenas o administrador da plataforma pode alterá-la.',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const accept = allowedTypes.join(',');

  const handleFile = async (file: File | null) => {
    if (!file || disabled || readOnly) return;

    if (!allowedTypes.includes(file.type)) {
      setErro('Formato de imagem não permitido.');
      return;
    }

    if (file.size > maxSizeBytes) {
      setErro(`Tamanho máximo: ${Math.round(maxSizeBytes / (1024 * 1024))}MB.`);
      return;
    }

    setErro(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (uploadTipo) formData.append('tipo', uploadTipo);
      const res = await fetch(uploadEndpoint, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao enviar imagem');
      onUrlChange(json.url);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao enviar imagem');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  if (readOnly) {
    return (
      <div className="space-y-3">
        <div className="relative rounded-2xl border border-emerald-200/80 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-950/20 p-4">
          {currentUrl ? (
            <div
              className={`relative w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 ${previewClassName}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentUrl} alt="Imagem padrão Método" className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <Lock className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Imagem padrão Método
              </span>
            </div>
          )}
          <p className="mt-3 flex items-start gap-2 text-xs text-emerald-800 dark:text-emerald-300/90">
            <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{readOnlyHint}</span>
          </p>
        </div>
        {hint ? <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className={`relative rounded-2xl border-2 border-dashed transition-colors ${
          disabled
            ? 'border-gray-200 dark:border-gray-700 opacity-60'
            : 'border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-400 dark:hover:border-emerald-600'
        } bg-gray-50/50 dark:bg-gray-900/30 p-4`}
      >
        {currentUrl ? (
          <div className="space-y-3">
            <div
              className={`relative w-full overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800 ${previewClassName}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={currentUrl} alt="Preview" className="h-full w-full object-contain" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Trocar imagem
              </button>
              <button
                type="button"
                disabled={disabled || uploading}
                onClick={() => onUrlChange(null)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Remover
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 py-8 text-center disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
            ) : (
              <ImageIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            )}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {uploading ? 'Enviando...' : emptyLabel}
            </span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {erro ? <p className="text-sm text-red-600 dark:text-red-400">{erro}</p> : null}
      {hint ? <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p> : null}
    </div>
  );
}
