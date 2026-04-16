'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, MessageSquare } from 'lucide-react';
import { VideoFile, VideoProgress, ProgressMap } from '@/types/videoLibrary';
import { formatBytes } from '@/utils/videoLibraryUtils';
import { updateVideoProgress, getVideoProgress } from '@/utils/videoProgress';

interface VideoPlayerProps {
  video: VideoFile | null;
  progress: VideoProgress | undefined;
  onProgressUpdate: (videoId: string, progress: VideoProgress) => void;
  startTime?: number | null; // Tempo de início em segundos (para partes de vídeo)
  onCommentsClick?: () => void; // Função para abrir modal de comentários
}

/**
 * Componente de player de vídeo
 */
export default function VideoPlayer({
  video,
  progress,
  onProgressUpdate,
  startTime = null,
  onCommentsClick,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showResumeButton, setShowResumeButton] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  /**
   * Configura o vídeo quando muda
   */
  useEffect(() => {
    console.log('VideoPlayer useEffect - video:', video?.name, 'file:', video?.file);
    setVideoError(null);
    
    if (!video || !video.file) {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);
      }
      setShowResumeButton(false);
      return;
    }

    // Limpar URL anterior
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }

    // Criar URL do objeto File
    const url = URL.createObjectURL(video.file);
    console.log('URL criada:', url, 'tipo:', video.file.type, 'nome:', video.file.name);
    setVideoUrl(url);

             // Verificar se deve mostrar botão de continuar
             if (progress && progress.duration !== null && progress.duration > 0) {
               const shouldResume =
                 progress.lastPosition > 0 &&
                 progress.lastPosition < progress.duration - 10;
               setShowResumeButton(shouldResume);
             } else {
               setShowResumeButton(false);
             }
             
             // Se startTime foi fornecido (parte de vídeo), configurar tempo inicial
             if (startTime !== null && startTime > 0 && videoRef.current) {
               videoRef.current.currentTime = startTime;
             }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [video?.videoId, progress]);

  /**
   * Handler para loadedmetadata - capturar duração real
   */
  const handleLoadedMetadata = () => {
    if (!video || !videoRef.current) return;

    const duration = videoRef.current.duration;
    if (duration && duration > 0 && duration !== progress?.duration) {
      const tempMap: ProgressMap = progress ? { [video.videoId]: progress } : {};
      const updatedProgress = updateVideoProgress(
        video.videoId,
        { duration },
        tempMap
      );
      onProgressUpdate(video.videoId, updatedProgress);
    }
  };

  /**
   * Handler para timeupdate - atualizar progresso
   */
  const handleTimeUpdate = () => {
    if (!video || !videoRef.current) return;

    const currentTime = videoRef.current.currentTime;
    const tempMap: ProgressMap = progress ? { [video.videoId]: progress } : {};
    const currentProgress = getVideoProgress(video.videoId, tempMap);
    const updatedProgress = updateVideoProgress(
      video.videoId,
      {
        lastPosition: currentTime,
        watchedSeconds: Math.max(currentProgress.watchedSeconds, currentTime),
      },
      tempMap
    );
    onProgressUpdate(video.videoId, updatedProgress);
  };

  /**
   * Handler para ended - marcar como assistido
   */
  const handleEnded = () => {
    if (!video || !videoRef.current) return;

    const duration = videoRef.current.duration || 0;
    const tempMap: ProgressMap = progress ? { [video.videoId]: progress } : {};
    const updatedProgress = updateVideoProgress(
      video.videoId,
      {
        watched: true,
        lastPosition: duration,
        watchedSeconds: duration,
      },
      tempMap
    );
    onProgressUpdate(video.videoId, updatedProgress);
    setShowResumeButton(false);
  };

  /**
   * Continuar de onde parou
   */
  const handleResume = () => {
    if (!videoRef.current || !progress) return;
    videoRef.current.currentTime = progress.lastPosition;
    setShowResumeButton(false);
  };

  /**
   * Recomeçar vídeo
   */
  const handleRestart = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    setShowResumeButton(false);
  };

  return (
    <div className="h-full bg-white flex flex-col">
      {!video ? (
        // Nenhum vídeo selecionado
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-gray-400 text-lg">Nenhum vídeo selecionado</p>
            <p className="text-sm text-gray-500 mt-2">
              Clique em um vídeo da lista para começar a assistir
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="text-lg font-semibold text-gray-900 truncate">{video.name}</h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                <span>{video.subject}</span>
                <span>•</span>
                <span>{formatBytes(video.sizeBytes)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 truncate" title={video.webkitRelativePath}>
                {video.folderPath || '(raiz)'}
              </p>
            </div>
          </div>

          {/* Vídeo indisponível */}
          {!video.file && video.available === false && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <p className="text-gray-500 text-lg mb-2">Vídeo indisponível</p>
                <p className="text-sm text-gray-500">
                  Este arquivo não foi encontrado na pasta selecionada.
                </p>
              </div>
            </div>
          )}
          
          {/* Vídeo sem arquivo mas disponível (carregado do Firestore) */}
          {!video.file && video.available !== false && (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md">
                <p className="text-gray-400 text-lg mb-2">Vídeo não disponível localmente</p>
                <p className="text-sm text-gray-400">
                  Este vídeo está salvo na biblioteca, mas o arquivo não está disponível no computador. Para assistir, você precisa selecionar a pasta novamente ou o arquivo pode ter sido movido.
                </p>
              </div>
            </div>
          )}

          {/* Player */}
          {video.file && videoUrl && (
            <div className="flex-1 flex flex-col">
              {/* Botões de retomar/recomeçar */}
              {showResumeButton && progress && (
                <div className="p-4 bg-blue-50 border-b border-blue-200 flex items-center gap-3">
                  <button
                    onClick={handleResume}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Play size={16} />
                    Continuar de onde parou ({Math.floor(progress.lastPosition / 60)}:
                    {String(Math.floor(progress.lastPosition % 60)).padStart(2, '0')})
                  </button>
                  <button
                    onClick={handleRestart}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    <RotateCcw size={16} />
                    Recomeçar
                  </button>
                </div>
              )}

              {/* Mensagem de erro */}
              {videoError && (
                <div className="p-4 bg-red-50 border-b border-red-200">
                  <p className="text-red-800 font-medium">Erro ao reproduzir vídeo</p>
                  <p className="text-sm text-red-600 mt-1">{videoError}</p>
                </div>
              )}

              {/* Player de vídeo */}
              <div className="flex-1 bg-black flex items-center justify-center relative">
                <video
                  ref={videoRef}
                  src={videoUrl || undefined}
                  controls
                  playsInline
                  preload="metadata"
                  className="max-w-full max-h-full w-full h-full"
                  onLoadedMetadata={(e) => {
                    console.log('Metadata carregado:', e.currentTarget.duration, 'segundos');
                    setVideoError(null);
                    handleLoadedMetadata();
                  }}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleEnded}
                  onPlay={() => {
                    console.log('Vídeo iniciado');
                    setIsPlaying(true);
                    setVideoError(null);
                  }}
                  onPause={() => {
                    console.log('Vídeo pausado');
                    setIsPlaying(false);
                  }}
                  onError={(e) => {
                    console.error('Erro no vídeo:', e);
                    const videoEl = e.currentTarget;
                    const error = videoEl.error;
                    let errorMessage = 'Erro desconhecido ao reproduzir vídeo';
                    
                    if (error) {
                      switch (error.code) {
                        case error.MEDIA_ERR_ABORTED:
                          errorMessage = 'Reprodução abortada';
                          break;
                        case error.MEDIA_ERR_NETWORK:
                          errorMessage = 'Erro de rede';
                          break;
                        case error.MEDIA_ERR_DECODE:
                          errorMessage = 'Erro ao decodificar vídeo. Formato não suportado pelo navegador.';
                          break;
                        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                          errorMessage = 'Formato de vídeo não suportado pelo navegador.';
                          break;
                      }
                    }
                    
                    console.error('Erro code:', error?.code, 'message:', error?.message);
                    setVideoError(errorMessage);
                  }}
                  onCanPlay={() => {
                    console.log('Vídeo pode ser reproduzido');
                    setVideoError(null);
                  }}
                />
                
                {/* Botão de comentários fixo no canto superior direito */}
                {onCommentsClick && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onCommentsClick();
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                    className={`absolute top-4 right-4 p-3 rounded-full shadow-2xl backdrop-blur-md transition-all hover:scale-110 active:scale-95 ${
                      progress?.comments
                        ? 'bg-blue-600 text-white hover:bg-blue-700 border-2 border-blue-400'
                        : 'bg-white/95 text-gray-700 hover:bg-white border-2 border-gray-300'
                    }`}
                    title={progress?.comments ? 'Ver/Editar comentários' : 'Adicionar comentários'}
                    style={{ 
                      zIndex: 2147483647, // Valor máximo de z-index para garantir que fique sempre no topo
                      position: 'absolute',
                    }}
                  >
                    <MessageSquare className="w-5 h-5" />
                    {progress?.comments && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
