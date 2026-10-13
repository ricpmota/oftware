'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, X } from 'lucide-react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.25;

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/worker';
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isCancelled(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: string }).name === 'RenderingCancelledException'
  );
}

export default function ApostilaPdfViewer({
  url,
  title,
  sourcePage = null,
  sourceLabel,
  onBackToSources,
  onClose,
}: {
  url: string;
  title: string;
  /** Página pedida pela fonte. 1-based. Não acompanha a navegação manual. */
  sourcePage?: number | null;
  sourceLabel?: string | null;
  onBackToSources?: () => void;
  onClose?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const renderGen = useRef(0);
  const appliedSource = useRef('');
  const loadedUrl = useRef('');

  const [numPages, setNumPages] = useState(0);
  const [docVersion, setDocVersion] = useState(0);
  const [docLoading, setDocLoading] = useState(true);
  const [docError, setDocError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageReady, setPageReady] = useState(false);
  const [draft, setDraft] = useState('1');
  const [zoomFactor, setZoomFactor] = useState(1);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pageBusy, setPageBusy] = useState(false);

  const sourceKey = `${url}|${sourcePage ?? ''}`;
  const externalHref =
    currentPage > 0 ? `${url}#page=${currentPage}` : url;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = Math.floor(entries[0]?.contentRect.width ?? 0);
      setContainerWidth((prev) => (prev === width ? prev : width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: { destroy: () => Promise<void> } | null = null;
    setDocLoading(true);
    setDocError(false);
    setNumPages(0);
    setPageReady(false);
    setZoomFactor(1);
    appliedSource.current = '';
    loadedUrl.current = '';

    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        if (cancelled) return;
        const task = pdfjs.getDocument({
          url,
          cMapUrl: '/pdfjs/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: '/pdfjs/standard_fonts/',
        });
        loadingTask = task;
        const doc = await task.promise;
        if (cancelled) {
          await doc.destroy();
          return;
        }
        docRef.current = doc;
        loadedUrl.current = url;
        setNumPages(doc.numPages);
        setDocVersion((value) => value + 1);
      } catch (error) {
        if (!cancelled) {
          console.error('[ApostilaPdfViewer] falha ao carregar PDF', error);
          setDocError(true);
        }
      } finally {
        if (!cancelled) setDocLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      renderGen.current += 1;
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      const doc = docRef.current;
      docRef.current = null;
      if (doc) void doc.destroy();
      else void loadingTask?.destroy();
    };
  }, [url]);

  useEffect(() => {
    if (!numPages || loadedUrl.current !== url) return;
    if (appliedSource.current === sourceKey) return;
    appliedSource.current = sourceKey;
    const requested = sourcePage != null && sourcePage > 0 ? Math.round(sourcePage) : 1;
    const next = clamp(requested, 1, numPages);
    setCurrentPage(next);
    setPageReady(true);
  }, [numPages, sourceKey, sourcePage, url, docVersion]);

  useEffect(() => {
    setDraft(String(currentPage));
  }, [currentPage]);

  useEffect(() => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || !pageReady || !containerWidth || currentPage < 1) return;

    const gen = ++renderGen.current;
    let cancelled = false;
    setPageBusy(true);

    (async () => {
      const previous = renderTaskRef.current;
      if (previous) {
        previous.cancel();
        try {
          await previous.promise;
        } catch {
          /* render anterior cancelado */
        }
      }
      if (cancelled || gen !== renderGen.current) return;

      try {
        const pdfPage = await doc.getPage(currentPage);
        if (cancelled || gen !== renderGen.current) return;
        const base = pdfPage.getViewport({ scale: 1 });
        const fit = Math.max(containerWidth - 24, 1) / base.width;
        const cssScale = fit * zoomFactor;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = pdfPage.getViewport({ scale: cssScale * pixelRatio });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / pixelRatio)}px`;
        canvas.style.height = `${Math.floor(viewport.height / pixelRatio)}px`;
        const task = pdfPage.render({ canvas, viewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch (error) {
        if (!isCancelled(error) && !cancelled) {
          console.error('[ApostilaPdfViewer] falha ao renderizar página', error);
        }
      } finally {
        if (!cancelled && gen === renderGen.current) setPageBusy(false);
      }
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [currentPage, zoomFactor, containerWidth, pageReady, docVersion]);

  function goTo(next: number) {
    if (!numPages) return;
    setCurrentPage(clamp(Math.round(next), 1, numPages));
  }

  function commitDraft() {
    const parsed = parseInt(draft, 10);
    if (!Number.isFinite(parsed)) {
      setDraft(String(currentPage));
      return;
    }
    goTo(parsed);
  }

  const zoomLabel = zoomFactor === 1 ? 'Ajustar' : `${Math.round(zoomFactor * 100)}%`;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 bg-white px-3 py-2">
        <div className="min-w-0">
          {onBackToSources ? (
            <button
              type="button"
              onClick={onBackToSources}
              className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <ChevronLeft className="h-4 w-4" />
              Fontes da resposta
            </button>
          ) : null}
          <p className={`truncate text-sm text-gray-900 ${onBackToSources ? 'mt-1 font-medium' : 'font-medium'}`}>
            {sourceLabel || title}
            {onBackToSources
              ? sourcePage != null && sourcePage > 0
                ? ` · Fonte: página ${sourcePage}`
                : ' · Página não identificada'
              : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={externalHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            Abrir em nova aba
          </a>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              aria-label="Fechar apostila"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goTo(currentPage - 1)}
            disabled={!numPages || currentPage <= 1}
            className="rounded-lg px-2 py-1 text-sm text-gray-700 hover:bg-white disabled:opacity-40"
            aria-label="Página anterior"
          >
            ‹
          </button>
          <label className="flex items-center gap-1 text-sm text-gray-600">
            <span className="hidden sm:inline">Página</span>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={commitDraft}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur();
                }
              }}
              inputMode="numeric"
              className="w-14 rounded-md border border-gray-200 bg-white px-2 py-1 text-center text-sm text-gray-900"
              aria-label="Número da página"
            />
            <span>/ {numPages || '—'}</span>
          </label>
          <button
            type="button"
            onClick={() => goTo(currentPage + 1)}
            disabled={!numPages || currentPage >= numPages}
            className="rounded-lg px-2 py-1 text-sm text-gray-700 hover:bg-white disabled:opacity-40"
            aria-label="Próxima página"
          >
            ›
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoomFactor((value) => clamp(Math.round((value - ZOOM_STEP) * 100) / 100, MIN_ZOOM, MAX_ZOOM))}
            disabled={zoomFactor <= MIN_ZOOM}
            className="rounded-lg px-2 py-1 text-sm text-gray-700 hover:bg-white disabled:opacity-40"
            aria-label="Diminuir zoom"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setZoomFactor(1)}
            className="rounded-lg px-2 py-1 text-sm font-medium text-blue-700 hover:bg-white"
          >
            {zoomLabel}
          </button>
          <button
            type="button"
            onClick={() => setZoomFactor((value) => clamp(Math.round((value + ZOOM_STEP) * 100) / 100, MIN_ZOOM, MAX_ZOOM))}
            disabled={zoomFactor >= MAX_ZOOM}
            className="rounded-lg px-2 py-1 text-sm text-gray-700 hover:bg-white disabled:opacity-40"
            aria-label="Aumentar zoom"
          >
            +
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-auto bg-gray-100 [scrollbar-gutter:stable]">
        {docLoading ? (
          <div className="flex h-full flex-col items-center justify-center text-gray-600">
            <div className="mb-3 h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            <p className="text-sm font-medium">Carregando apostila...</p>
          </div>
        ) : docError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm text-gray-700">Não foi possível carregar esta apostila.</p>
            <a
              href={externalHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              Abrir em nova aba
            </a>
          </div>
        ) : (
          <div className="flex min-h-full justify-center p-3">
            <canvas ref={canvasRef} className="bg-white shadow-sm" />
            {pageBusy ? (
              <div className="pointer-events-none absolute right-3 top-3 h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
