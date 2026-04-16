'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export type ExameIaFeedback = { type: 'idle' | 'success' | 'error'; text?: string };

type Props = {
  disabled?: boolean;
  loading: boolean;
  feedback: ExameIaFeedback;
  onSelectFiles: (files: File[]) => void;
  /** Classes extras no container (ex.: mobile mais compacto) */
  className?: string;
};

const ACCEPT = 'application/pdf,image/jpeg,image/jpg,image/png,image/webp';

export default function ExameLaboratorialIaUploadBlock({
  disabled,
  loading,
  feedback,
  onSelectFiles,
  className = '',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showUploadHint, setShowUploadHint] = useState(false);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length > 0) onSelectFiles(files);
  };

  const openFilePickerAfterHint = () => {
    setShowUploadHint(false);
    window.setTimeout(() => inputRef.current?.click(), 0);
  };

  return (
    <div
      className={`rounded-lg border border-dashed border-gray-300 bg-gray-50/80 p-3 text-sm text-gray-700 ${className}`}
    >
      {showUploadHint && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exame-ia-upload-hint-title"
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
            <h3 id="exame-ia-upload-hint-title" className="text-base font-semibold text-gray-900 mb-3">
              Antes de enviar o arquivo
            </h3>
            <p className="text-sm text-gray-600 leading-snug mb-2">
              Opcional: envie PDF ou imagem do laudo para a IA sugerir valores nos campos abaixo. Nada é salvo
              automaticamente — revise e use <span className="font-medium">Salvar Exame</span> quando quiser gravar.
            </p>
            <p className="text-xs text-gray-500 leading-snug mb-5">
              Dica: use arquivo nítido, bem iluminado e, se for foto, enquadre só a tabela de resultados. Laudos com
              muitas colunas ou letra muito pequena reduzem a precisão.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={() => setShowUploadHint(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                onClick={openFilePickerAfterHint}
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={onChange} disabled={disabled || loading} />
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => setShowUploadHint(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {loading ? 'Lendo arquivo(s)…' : 'Escolher arquivo(s)'}
        </button>
        {feedback.type === 'success' && feedback.text && (
          <span className="inline-flex items-center gap-1 text-xs text-green-800">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            {feedback.text}
          </span>
        )}
        {feedback.type === 'error' && feedback.text && (
          <span className="inline-flex items-center gap-1 text-xs text-red-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {feedback.text}
          </span>
        )}
      </div>
    </div>
  );
}
