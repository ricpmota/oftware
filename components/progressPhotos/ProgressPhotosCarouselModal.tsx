'use client';

import { useEffect, useMemo, useState } from 'react';
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
};

export function ProgressPhotosCarouselModal({
  aberto,
  onFechar,
  titulo = 'Registro fotográfico',
  subtitulo,
  fotos,
  semanaFiltro,
  loading = false,
}: Props) {
  const [tab, setTab] = useState<'frontal' | 'perfil'>('frontal');
  const [index, setIndex] = useState(0);

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

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] bg-black/70 flex items-center justify-center p-4"
      onClick={onFechar}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {titulo}
            </p>
            {subtitulo ? (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitulo}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg p-1.5 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
            aria-label="Fechar visualização de fotos"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {loading ? (
            <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
              Carregando fotos…
            </div>
          ) : fotosFiltradas.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-6 text-center text-sm text-gray-600 dark:text-gray-300">
              Nenhuma foto compartilhada nesta semana.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 dark:bg-gray-800/80 p-1">
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
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-black/30">
                    <img
                      src={fotoAtual.url}
                      alt={`Foto ${tab}`}
                      className="w-full max-h-[55vh] object-contain"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={index <= 0}
                      onClick={() => setIndex((i) => Math.max(0, i - 1))}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
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
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-200 disabled:opacity-40"
                    >
                      Próxima
                      <ChevronRight className="w-4 h-4" />
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
                          className={`shrink-0 rounded-lg overflow-hidden border ${
                            i === index
                              ? 'border-blue-500 ring-2 ring-blue-300/50'
                              : 'border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <img
                            src={foto.url}
                            alt="Miniatura"
                            className="w-16 h-16 object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  Nenhuma foto nesta aba.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
