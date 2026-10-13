'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

export type FotoProgressoCarousel = {
  id: string;
  tipo: string;
  url: string;
  semana?: number;
  dataAplicacao?: string;
};

type Props = {
  aberto: boolean;
  onFechar: () => void;
  titulo?: string;
  subtitulo?: string;
  fotos: FotoProgressoCarousel[];
  semanaFiltro?: number;
  loading?: boolean;
  /** Abre o modal BodyScan (pai controla BodyScanModal). */
  onOpenBodyScan?: () => void;
};

export function ProgressPhotosCarouselModal({
  aberto,
  onFechar,
  titulo = 'Registro fotográfico',
  subtitulo,
  fotos,
  semanaFiltro,
  loading = false,
  onOpenBodyScan,
}: Props) {
  const [tab, setTab] = useState<'frontal' | 'perfil'>('frontal');
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  const fotosFiltradas = useMemo(() => {
    if (semanaFiltro == null) return fotos;
    return fotos.filter((f) => f.semana === semanaFiltro);
  }, [fotos, semanaFiltro]);

  const fotosFrontal = useMemo(
    () => fotosFiltradas.filter((f) => f.tipo === 'frontal'),
    [fotosFiltradas]
  );
  const fotosPerfil = useMemo(
    () => fotosFiltradas.filter((f) => f.tipo === 'perfil'),
    [fotosFiltradas]
  );
  const fotosAtivas = tab === 'frontal' ? fotosFrontal : fotosPerfil;
  const fotoAtual = fotosAtivas[index] ?? null;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    setTab('frontal');
    setIndex(0);
  }, [aberto, semanaFiltro]);

  useEffect(() => {
    if (!aberto) return;
    const total = fotosAtivas.length;
    if (total === 0) {
      setIndex(0);
      return;
    }
    setIndex((i) => Math.min(Math.max(0, i), total - 1));
  }, [aberto, tab, fotosAtivas.length]);

  useEffect(() => {
    if (!aberto) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [aberto]);

  if (!aberto || !mounted) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[10050] flex flex-col bg-white dark:bg-gray-900 md:items-center md:justify-center md:bg-black/50 md:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      onClick={onFechar}
    >
      <div
        className="flex h-[100dvh] max-h-[100dvh] w-full min-h-0 flex-col overflow-hidden bg-white dark:bg-gray-900 md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-2xl md:border md:border-gray-200 dark:md:border-gray-700 md:shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {titulo}
            </p>
            {subtitulo ? (
              <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                {subtitulo}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {onOpenBodyScan ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenBodyScan();
                }}
                className="rounded-lg border border-emerald-500 bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                BodyScan
              </button>
            ) : null}
            <button
              type="button"
              onClick={onFechar}
              className="rounded-lg p-1.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
              aria-label="Fechar visualização de fotos"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              Carregando fotos…
            </div>
          ) : fotosFiltradas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">
              Nenhuma foto compartilhada nesta semana.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setTab('frontal');
                    setIndex(0);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    tab === 'frontal'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Frontal ({fotosFrontal.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('perfil');
                    setIndex(0);
                  }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    tab === 'perfil'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Perfil ({fotosPerfil.length})
                </button>
              </div>

              {fotoAtual ? (
                <>
                  <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-black/30 dark:border-gray-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fotoAtual.url}
                      alt={`Foto ${tab}`}
                      className="max-h-[65dvh] w-full object-contain md:max-h-[55vh]"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={index <= 0}
                      onClick={() => setIndex((i) => Math.max(0, i - 1))}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-40 dark:border-gray-600 dark:text-gray-200"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {index + 1} de {fotosAtivas.length}
                    </p>
                    <button
                      type="button"
                      disabled={index >= fotosAtivas.length - 1}
                      onClick={() =>
                        setIndex((i) => Math.min(fotosAtivas.length - 1, i + 1))
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 disabled:opacity-40 dark:border-gray-600 dark:text-gray-200"
                    >
                      Próxima
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  {(typeof fotoAtual.semana === 'number' || fotoAtual.dataAplicacao) && (
                    <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                      {typeof fotoAtual.semana === 'number'
                        ? `Semana ${fotoAtual.semana}`
                        : fotoAtual.dataAplicacao}
                    </p>
                  )}

                  {fotosAtivas.length > 1 ? (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {fotosAtivas.map((foto, i) => (
                        <button
                          key={foto.id}
                          type="button"
                          onClick={() => setIndex(i)}
                          className={`shrink-0 overflow-hidden rounded-lg border ${
                            i === index
                              ? 'border-blue-500 ring-2 ring-blue-300/50'
                              : 'border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={foto.url}
                            alt="Miniatura"
                            className="h-16 w-16 object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                  Nenhuma foto nesta aba.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
