'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, CheckCircle2, PlayCircle, Circle, AlertCircle, MessageSquare } from 'lucide-react';
import { VideoFile, VideoSubject, VideoProgress, VideoProgressStatus } from '@/types/videoLibrary';
import { formatBytes } from '@/utils/videoLibraryUtils';
import { getVideoStatus, getVideoPercentage } from '@/utils/videoProgress';
import { naturalSortBy } from '@/utils/naturalSort';

/**
 * Formata duração em segundos para formato legível (HH:MM:SS ou MM:SS)
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

/**
 * Formata tempo em segundos para formato legível (HH:MM:SS ou MM:SS)
 */
function formatTime(seconds: number): string {
  return formatDuration(Math.floor(seconds));
}

interface SubjectAccordionProps {
  subject: VideoSubject;
  videos: (Omit<VideoFile, 'file'> & { file?: File; available?: boolean })[];
  searchQuery: string;
  progressMap: { [videoId: string]: VideoProgress };
  selectedVideoId: string | null;
  onVideoClick: (video: VideoFile) => void;
  onMarkWatched: (videoId: string) => void;
  onMarkUnwatched: (videoId: string) => void;
  onCommentsClick?: (video: VideoFile) => void;
}

/**
 * Componente de accordion para agrupar vídeos por assunto
 */
export default function SubjectAccordion({
  subject,
  videos,
  searchQuery,
  progressMap,
  selectedVideoId,
  onVideoClick,
  onMarkWatched,
  onMarkUnwatched,
  onCommentsClick,
}: SubjectAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  /**
   * Verifica se o vídeo corresponde à busca
   */
  const matchesSearch = (video: Omit<VideoFile, 'file'>): boolean => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      video.name.toLowerCase().includes(query) ||
      video.folderPath.toLowerCase().includes(query) ||
      video.webkitRelativePath.toLowerCase().includes(query)
    );
  };

  // Filtrar vídeos
  const filteredVideos = videos.filter(matchesSearch);

  // Ordenar vídeos usando ordenação natural (para números: 1, 2, 3, 10 ao invés de 1, 10, 2, 3)
  const sortedVideos = useMemo(() => {
    return naturalSortBy(filteredVideos, (video) => video.name);
  }, [filteredVideos]);

  if (sortedVideos.length === 0) {
    return null;
  }

  /**
   * Renderiza badge de status
   */
  const renderStatusBadge = (video: typeof videos[0]) => {
    const status: VideoProgressStatus = getVideoStatus(
      video.videoId,
      progressMap,
      video.available !== false
    );
    const percentage = getVideoPercentage(video.videoId, progressMap);
    const progress = progressMap[video.videoId];

    switch (status) {
      case 'watched':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            <CheckCircle2 size={12} />
            Assistido
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
            <PlayCircle size={12} />
            Em progresso {progress?.duration ? `(${Math.round(percentage)}%)` : ''}
          </span>
        );
      case 'not_started':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
            <Circle size={12} />
            Não iniciado
          </span>
        );
      case 'unavailable':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            <AlertCircle size={12} />
            Indisponível
          </span>
        );
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg mb-4 overflow-hidden">
      {/* Cabeçalho do accordion */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors duration-200 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
          <span className="font-medium text-sm text-gray-900">{subject}</span>
          <span className="text-xs text-gray-500">({sortedVideos.length} vídeo{sortedVideos.length !== 1 ? 's' : ''})</span>
        </div>
      </button>

      {/* Conteúdo do accordion */}
      {isExpanded && (
        <div className="bg-white border-t border-gray-200">
          <div className="divide-y divide-gray-100">
            {sortedVideos.map((video) => {
              const progress = progressMap[video.videoId];
              const status: VideoProgressStatus = getVideoStatus(
                video.videoId,
                progressMap,
                video.available !== false
              );
              // Verificar se o vídeo pode ser reproduzido
              // available pode ser undefined (quando carregado do localStorage sem reconectar)
              // ou false (quando foi marcado como indisponível após reconectar)
              const hasFile = !!video.file;
              const canPlay = video.available !== false && hasFile;
              const needsReconnect = !hasFile && video.available !== false; // undefined = precisa reconectar

              return (
                <div
                  key={video.videoId}
                  className={`px-4 py-2.5 transition-colors ${
                    (canPlay || needsReconnect) ? 'hover:bg-gray-50 cursor-pointer' : ''
                  } ${
                    selectedVideoId === video.videoId ? 'bg-blue-50 border-l-2 border-blue-600' : ''
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Clicou no vídeo:', video.name, 'hasFile:', hasFile, 'canPlay:', canPlay, 'available:', video.available);
                    onVideoClick(video as VideoFile);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {/* Nome do arquivo */}
                        <p className={`text-xs font-medium truncate ${
                          canPlay ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {video.name}
                        </p>
                      </div>
                      
                      {/* Badge de status */}
                      <div className="flex items-center gap-2 mb-1">
                        {renderStatusBadge(video)}
                      </div>

                      {/* Caminho */}
                      <p className="text-xs text-gray-400 truncate" title={video.webkitRelativePath}>
                        {video.folderPath || '(raiz)'}
                      </p>

                      {/* Comentários */}
                      {progress?.comments && (
                        <div className="mt-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded p-1.5">
                          <div className="flex items-start gap-1">
                            <MessageSquare className="w-3 h-3 mt-0.5 text-gray-400 flex-shrink-0" />
                            <span className="line-clamp-2">{progress.comments}</span>
                          </div>
                        </div>
                      )}

                      {/* Barra de progresso */}
                      {progress?.duration && progress.duration > 0 && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">
                              {formatTime(progress.watchedSeconds)} / {formatTime(progress.duration)}
                            </span>
                            <span className="text-gray-600">
                              {Math.round((progress.watchedSeconds / progress.duration) * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className="bg-blue-600 h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(100, (progress.watchedSeconds / progress.duration) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Botões de ação manual (se não estiver indisponível) */}
                      {status !== 'unavailable' && (
                        <div className="flex items-center gap-2 mt-1.5">
                          {status !== 'watched' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkWatched(video.videoId);
                              }}
                              className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              Marcar como assistido
                            </button>
                          )}
                          {status === 'watched' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkUnwatched(video.videoId);
                              }}
                              className="text-xs text-gray-600 hover:text-gray-700 hover:underline"
                            >
                              Desmarcar
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Tamanho, Duração e Botão de Comentários */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      {/* Botão de comentários */}
                      {onCommentsClick && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onCommentsClick(video as VideoFile);
                          }}
                          className={`p-1.5 rounded transition-colors mb-1 ${
                            progress?.comments
                              ? 'text-blue-600 hover:bg-blue-50'
                              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                          }`}
                          title={progress?.comments ? 'Editar comentários' : 'Adicionar comentários'}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatBytes(video.sizeBytes)}
                      </span>
                      {progress?.duration && progress.duration > 0 ? (
                        <span className="text-xs text-gray-600 font-medium">
                          {formatDuration(progress.duration)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
