'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';

type MatchPhotoCropperProps = {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function MatchPhotoCropper({ file, onCancel, onConfirm }: MatchPhotoCropperProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number; pointers: Map<number, { x: number; y: number }> } | null>(null);
  const [src, setSrc] = useState('');
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    const measure = () => setFrame({ w: node.clientWidth, h: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const base =
    natural.w > 0 && frame.w > 0 ? Math.max(frame.w / natural.w, frame.h / natural.h) : 1;
  const scale = base * zoom;
  const displayW = natural.w * scale;
  const displayH = natural.h * scale;
  const maxX = Math.max(0, (displayW - frame.w) / 2);
  const maxY = Math.max(0, (displayH - frame.h) / 2);
  const clamped = { x: clamp(offset.x, -maxX, maxX), y: clamp(offset.y, -maxY, maxY) };

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const pointers = dragRef.current?.pointers || new Map();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragRef.current = { x: event.clientX, y: event.clientY, ox: clamped.x, oy: clamped.y, pointers };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag?.pointers.has(event.pointerId)) return;
    drag.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    setOffset({
      x: drag.ox + (event.clientX - drag.x),
      y: drag.oy + (event.clientY - drag.y),
    });
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    dragRef.current?.pointers.delete(event.pointerId);
    if (!dragRef.current?.pointers.size) dragRef.current = null;
  }

  async function confirm() {
    const image = imgRef.current;
    if (!image || !frame.w || !frame.h || saving) return;
    setSaving(true);
    setError('');
    try {
      const outW = 1080;
      const outH = Math.max(1, Math.round((outW * frame.h) / frame.w));
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('crop');
      const imgX = natural.w / 2 + (0 - frame.w / 2 - clamped.x) / scale;
      const imgY = natural.h / 2 + (0 - frame.h / 2 - clamped.y) / scale;
      context.drawImage(image, imgX, imgY, frame.w / scale, frame.h / scale, 0, 0, outW, outH);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86));
      if (!blob) throw new Error('blob');
      onConfirm(new File([blob], 'match-foto.jpg', { type: 'image/jpeg' }));
    } catch {
      setError('Não foi possível preparar a foto.');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black text-white">
      <div ref={frameRef} className="absolute inset-0 touch-none overflow-hidden">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={(event) =>
              setNatural({ w: event.currentTarget.naturalWidth, h: event.currentTarget.naturalHeight })
            }
            className="absolute left-1/2 top-1/2 max-w-none select-none"
            style={{
              width: displayW || undefined,
              height: displayH || undefined,
              transform: `translate(calc(-50% + ${clamped.x}px), calc(-50% + ${clamped.y}px))`,
            }}
          />
        ) : null}
        <div
          className="absolute inset-0"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/55 to-transparent px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-10">
        <p className="pointer-events-auto text-center text-sm font-semibold">Enquadre sua foto</p>
        <p className="pointer-events-auto mt-1 text-center text-xs text-white/75">
          Arraste para posicionar. A foto ocupa a tela inteira.
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-4 pt-16 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <label className="mb-4 flex items-center gap-3 text-xs font-semibold text-white/80">
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            className="h-1 flex-1 accent-[#4CCB7A]"
          />
        </label>
        {error ? <p className="mb-2 text-center text-sm text-[#F3B4B4]">{error}</p> : null}
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="h-12 flex-1 rounded-full text-sm font-semibold text-white">
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={saving || !natural.w}
            className="h-12 flex-[1.4] rounded-full bg-gradient-to-r from-[#6CD492] to-[#4CCB7A] text-sm font-semibold text-[#0A1F44] disabled:opacity-60"
          >
            {saving ? 'Preparando…' : 'Usar esta foto'}
          </button>
        </div>
      </div>
    </div>
  );
}
