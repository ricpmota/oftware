'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Trash2, UserCircle } from 'lucide-react';

const VIEWPORT = 280;
const OUTPUT = 512;
const MAX_FILE_MB = 8;

type Props = {
  currentUrl?: string | null;
  onUrlChange: (url: string | null) => void;
  disabled?: boolean;
};

function clampPan(x: number, y: number, dispW: number, dispH: number) {
  const nx = Math.min(0, Math.max(VIEWPORT - dispW, x));
  const ny = Math.min(0, Math.max(VIEWPORT - dispH, y));
  return { x: nx, y: ny };
}

export default function MedicoFotoPerfilEditor({ currentUrl, onUrlChange, disabled }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgElRef = useRef<HTMLImageElement | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editObjectUrl, setEditObjectUrl] = useState<string | null>(null);
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [uploading, setUploading] = useState(false);
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number }>({
    active: false,
    lastX: 0,
    lastY: 0,
  });

  const scale = baseScale * zoom;
  const dispW = imgNatural.w * scale;
  const dispH = imgNatural.h * scale;

  const revokeEditUrl = useCallback(() => {
    setEditObjectUrl((u) => {
      if (u) URL.revokeObjectURL(u);
      return null;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (editObjectUrl) URL.revokeObjectURL(editObjectUrl);
    };
  }, [editObjectUrl]);

  const resetEditorForImage = useCallback((w: number, h: number) => {
    const bs = Math.max(VIEWPORT / w, VIEWPORT / h);
    setBaseScale(bs);
    setZoom(1);
    const dw = w * bs;
    const dh = h * bs;
    setPan(clampPan((VIEWPORT - dw) / 2, (VIEWPORT - dh) / 2, dw, dh));
    setImgNatural({ w, h });
  }, []);

  const onImageLoaded = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const el = e.currentTarget;
      resetEditorForImage(el.naturalWidth, el.naturalHeight);
    },
    [resetEditorForImage]
  );

  const openFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem (JPG, PNG ou WEBP).');
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      alert(`Imagem muito grande. Máximo ${MAX_FILE_MB} MB.`);
      return;
    }
    revokeEditUrl();
    setEditObjectUrl(URL.createObjectURL(file));
    setModalOpen(true);
    setImgNatural({ w: 0, h: 0 });
  };

  const handleZoomChange = (z: number) => {
    setZoom(z);
    setPan((p) => {
      const newScale = baseScale * z;
      const nw = imgNatural.w * newScale;
      const nh = imgNatural.h * newScale;
      return clampPan(p.x, p.y, nw, nh);
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!imgNatural.w) return;
    e.preventDefault();
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active || !imgNatural.w) return;
    const dx = e.clientX - dragRef.current.lastX;
    const dy = e.clientY - dragRef.current.lastY;
    dragRef.current.lastX = e.clientX;
    dragRef.current.lastY = e.clientY;
    const newScale = baseScale * zoom;
    const nw = imgNatural.w * newScale;
    const nh = imgNatural.h * newScale;
    setPan((p) => clampPan(p.x + dx, p.y + dy, nw, nh));
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current.active = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const exportBlob = (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const img = imgElRef.current;
      if (!img || !imgNatural.w) {
        resolve(null);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT;
      canvas.height = OUTPUT;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.clearRect(0, 0, OUTPUT, OUTPUT);
      ctx.save();
      ctx.beginPath();
      ctx.arc(OUTPUT / 2, OUTPUT / 2, OUTPUT / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      const r = OUTPUT / VIEWPORT;
      const s = baseScale * zoom;
      const dw = imgNatural.w * s;
      const dh = imgNatural.h * s;
      ctx.drawImage(img, pan.x * r, pan.y * r, dw * r, dh * r);

      ctx.restore();

      canvas.toBlob((blob) => resolve(blob), 'image/png', 0.92);
    });
  };

  const handleConfirmar = async () => {
    const blob = await exportBlob();
    if (!blob) {
      alert('Não foi possível processar a imagem.');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', new File([blob], 'foto-perfil-medico.png', { type: 'image/png' }));
      const res = await fetch('/api/upload-medico-foto', { method: 'POST', body: fd });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha no upload');
      if (!data.url) throw new Error('Resposta sem URL');
      onUrlChange(data.url);
      setModalOpen(false);
      revokeEditUrl();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Erro ao enviar foto.');
    } finally {
      setUploading(false);
    }
  };

  const fecharModal = () => {
    setModalOpen(false);
    revokeEditUrl();
  };

  return (
    <div className="md:col-span-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Foto de perfil
      </label>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Envie uma foto tipo 3×4; ajuste o zoom e arraste para centralizar o rosto na área circular. Depois, use{' '}
        <strong className="font-medium text-gray-600 dark:text-gray-300">Salvar Perfil</strong> para gravar no cadastro.
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div
          className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-green-100 dark:border-green-900/40 bg-gray-100 dark:bg-gray-700 shadow-md shrink-0"
          style={{ aspectRatio: '1' }}
        >
          {currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <UserCircle className="w-full h-full text-gray-300 dark:text-gray-500 p-2" aria-hidden />
          )}
        </div>
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) openFile(f);
            }}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="w-4 h-4" />
            {currentUrl ? 'Trocar foto' : 'Enviar foto'}
          </button>
          {currentUrl ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onUrlChange(null)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Remover
            </button>
          ) : null}
        </div>
      </div>

      {modalOpen && editObjectUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-5 space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="medico-foto-modal-title"
          >
            <div className="flex justify-between items-start gap-2">
              <h3 id="medico-foto-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white">
                Ajustar foto (circular)
              </h3>
              <button
                type="button"
                onClick={fecharModal}
                className="p-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col items-center gap-3">
              <div
                className="relative rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 shadow-inner ring-2 ring-green-500/40 cursor-grab active:cursor-grabbing touch-none"
                style={{ width: VIEWPORT, height: VIEWPORT }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {!imgNatural.w ? (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                    Carregando…
                  </div>
                ) : null}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgElRef}
                  src={editObjectUrl}
                  alt=""
                  draggable={false}
                  onLoad={onImageLoaded}
                  className="absolute left-0 top-0 max-w-none select-none pointer-events-none"
                  style={
                    imgNatural.w
                      ? {
                          width: dispW,
                          height: dispH,
                          transform: `translate(${pan.x}px, ${pan.y}px)`,
                        }
                      : { opacity: 0, position: 'absolute', width: 1, height: 1 }
                  }
                />
              </div>
              <label className="w-full max-w-xs flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.02}
                  value={zoom}
                  onChange={(e) => handleZoomChange(Number(e.target.value))}
                  disabled={!imgNatural.w}
                  className="w-full"
                />
              </label>
              <p className="text-xs text-center text-gray-500 dark:text-gray-400">
                Arraste a foto para posicionar o rosto dentro do círculo.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={fecharModal}
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!imgNatural.w || uploading}
                onClick={() => void handleConfirmar()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {uploading ? 'Enviando…' : 'Usar esta foto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
