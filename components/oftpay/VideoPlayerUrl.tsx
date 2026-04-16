'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { Play, RotateCcw, RotateCw } from 'lucide-react';
import { formatDuration } from '@/utils/formatDuration';

/**
 * Player de vídeo por URL (Cloud Storage).
 * Mesmo estilo visual do oftreview: fit na área, object-contain.
 * No iOS, play() só funciona se for chamado diretamente por um toque; use showPlayOverlay no mobile.
 */
interface VideoPlayerUrlProps {
  /** URL do vídeo (ex: getDownloadURL do Storage) */
  videoUrl: string | null;
  /** Nome do vídeo para exibir */
  title?: string;
  /** Tempo inicial em segundos (opcional) */
  startTime?: number | null;
  /** Chamado quando os metadados do vídeo carregam e a duração real fica disponível (segundos) */
  onDurationKnown?: (durationSeconds: number) => void;
  /** No iOS/mobile o play() precisa ser disparado por toque; mostra botão "Toque para reproduzir" */
  showPlayOverlay?: boolean;
  /** ID do vídeo (para reportar progresso) */
  videoId?: string;
  /** Chamado ao assistir: timeupdate (throttled) e ao terminar (ended) para computar 0–100% */
  onProgressUpdate?: (videoId: string, updates: { lastPosition: number; watchedSeconds: number; watched?: boolean; duration?: number }) => void;
  /** Esconder a barra de título (ex.: no mobile já tem título no overlay) */
  hideTitleBar?: boolean;
}

const PROGRESS_THROTTLE_MS = 1500;

export default function VideoPlayerUrl({
  videoUrl,
  title = 'Vídeo',
  startTime = null,
  onDurationKnown,
  showPlayOverlay = false,
  videoId,
  onProgressUpdate,
  hideTitleBar = false,
}: VideoPlayerUrlProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDurationKnownRef = useRef(onDurationKnown);
  onDurationKnownRef.current = onDurationKnown;
  const onProgressUpdateRef = useRef(onProgressUpdate);
  onProgressUpdateRef.current = onProgressUpdate;
  const startTimeRef = useRef(startTime);
  startTimeRef.current = startTime;
  const lastProgressAtRef = useRef(0);
  const [playOverlayVisible, setPlayOverlayVisible] = useState(showPlayOverlay);
  const [resumeOverlayVisible, setResumeOverlayVisible] = useState(false);
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  /** Posição mostrada no overlay = da barra do vídeo (currentTime), não do storage */
  const [resumePositionSec, setResumePositionSec] = useState(0);
  /** Perguntar "Continuar de onde parou?" só uma vez por abertura do vídeo. */
  const resumeChoiceMadeRef = useRef(false);
  /** Seek para startTime só uma vez por vídeo; senão canplay dispara de novo ao dar play e trava o vídeo no desktop. */
  const hasSeekedToStartRef = useRef(false);

  useEffect(() => {
    setDurationSec(null);
    setResumePositionSec(0);
    setResumeOverlayVisible(false);
    setVideoError(null);
    resumeChoiceMadeRef.current = false;
    hasSeekedToStartRef.current = false;
  }, [videoUrl, videoId]);

  /* Mostrar overlay "Continuar de onde parou?" uma vez quando há progresso acumulado (startTime > 0). */
  useEffect(() => {
    if (startTime == null || startTime <= 0) return;
    if (resumeChoiceMadeRef.current) return;
    setResumePositionSec(startTime);
    setResumeOverlayVisible(true);
  }, [startTime]);

  /* Posicionar a barra em startTime UMA VEZ quando o vídeo estiver pronto. Não ficar ouvindo canplay/loadedmetadata
   * depois disso, senão no desktop o vídeo fica travado (canplay dispara de novo ao dar play e força seek de novo). */
  useEffect(() => {
    if (startTime == null || startTime <= 0) return;
    const el = videoRef.current;
    if (!el) return;
    const pos = startTime;
    const seekOnce = () => {
      if (hasSeekedToStartRef.current) return;
      if (!Number.isFinite(pos)) return;
      el.currentTime = pos;
      hasSeekedToStartRef.current = true;
    };
    el.addEventListener('loadedmetadata', seekOnce);
    el.addEventListener('canplay', seekOnce);
    if (el.readyState >= 1) seekOnce();
    return () => {
      el.removeEventListener('loadedmetadata', seekOnce);
      el.removeEventListener('canplay', seekOnce);
    };
  }, [videoUrl, videoId, startTime]);

  const handleResumeSim = useCallback(() => {
    const el = videoRef.current;
    /* No desktop o play() precisa ser chamado logo no clique (gesto do usuário), antes de setState. */
    if (el) {
      el.play().catch(() => {});
    }
    resumeChoiceMadeRef.current = true;
    setResumeOverlayVisible(false);
  }, []);

  const handleResumeNao = useCallback(() => {
    const id = videoId;
    const el = videoRef.current;
    if (el) {
      el.currentTime = 0;
      if (id && onProgressUpdateRef.current) {
        onProgressUpdateRef.current(id, { lastPosition: 0, watchedSeconds: 0 });
      }
      el.play().catch(() => {});
    }
    resumeChoiceMadeRef.current = true;
    setResumeOverlayVisible(false);
  }, [videoId]);

  useEffect(() => {
    if (showPlayOverlay && videoUrl) setPlayOverlayVisible(true);
  }, [showPlayOverlay, videoUrl]);

  const handlePlayTap = useCallback(() => {
    const el = videoRef.current;
    if (el) {
      el.play().then(() => setPlayOverlayVisible(false)).catch(() => {});
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const el = videoRef.current;
    if (el?.duration != null && Number.isFinite(el.duration) && el.duration > 0) {
      const d = el.duration;
      onDurationKnownRef.current?.(d);
      setDurationSec(d);
    }
  }, []);

  const handleTimeUpdate = useCallback(() => {
    const id = videoId;
    const el = videoRef.current;
    if (!id || !el || !onProgressUpdateRef.current) return;
    const now = Date.now();
    if (now - lastProgressAtRef.current < PROGRESS_THROTTLE_MS) return;
    lastProgressAtRef.current = now;
    const currentTime = el.currentTime;
    if (!Number.isFinite(currentTime) || currentTime < 0) return;
    onProgressUpdateRef.current(id, {
      lastPosition: currentTime,
      watchedSeconds: currentTime,
    });
  }, [videoId]);

  const handleEnded = useCallback(() => {
    const id = videoId;
    const el = videoRef.current;
    if (!id || !el || !onProgressUpdateRef.current) return;
    const duration = el.duration;
    const sec = Number.isFinite(duration) && duration > 0 ? duration : 0;
    onProgressUpdateRef.current(id, {
      lastPosition: sec,
      watchedSeconds: sec,
      watched: true,
      duration: sec,
    });
  }, [videoId]);

  const handleSkipBack = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, el.currentTime - 10);
  }, []);

  const handleSkipForward = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    const duration = el.duration;
    const max = Number.isFinite(duration) && duration > 0 ? duration : Infinity;
    el.currentTime = Math.min(max, el.currentTime + 10);
  }, []);

  const [isHoveringVideo, setIsHoveringVideo] = useState(false);
  /** No mobile o player nativo já tem +10s/-10s; não duplicar os botões. */
  const showSkipButtons =
    !showPlayOverlay &&
    videoUrl &&
    !resumeOverlayVisible &&
    !(showPlayOverlay && playOverlayVisible) &&
    !videoError &&
    isHoveringVideo;

  return (
    <div className="h-full min-h-0 min-w-0 bg-white flex flex-col overflow-hidden">
      {!videoUrl ? (
        <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
          <div className="text-center">
            <p className="text-gray-400 text-lg">Nenhum vídeo selecionado</p>
            <p className="text-sm text-gray-500 mt-2">
              Escolha um vídeo na lista ao lado para assistir
            </p>
          </div>
        </div>
      ) : (
        <>
          {!hideTitleBar && (
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900 truncate pr-4">{title}</h2>
            </div>
          )}
          <div
            className="flex-1 min-h-0 min-w-0 relative bg-black"
            onMouseEnter={() => setIsHoveringVideo(true)}
            onMouseLeave={() => setIsHoveringVideo(false)}
          >
            <video
              ref={videoRef}
              key={videoUrl}
              src={videoUrl}
              controls
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-contain"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleEnded}
              onPlay={() => { setPlayOverlayVisible(false); setVideoError(null); }}
              onError={(e) => {
                const err = e.currentTarget.error;
                let msg = 'Não foi possível carregar o vídeo.';
                if (err) {
                  if (err.code === 4) msg = 'Formato não suportado. Use MP4 (H.264).';
                  else if (err.code === 2) msg = 'Erro de rede. Tente novamente.';
                }
                setVideoError(msg);
              }}
            />
            {!showPlayOverlay && videoUrl && !resumeOverlayVisible && !(showPlayOverlay && playOverlayVisible) && !videoError && (
              <div
                className={`absolute inset-0 flex items-center justify-center z-[9999] transition-opacity duration-200 pointer-events-none ${
                  showSkipButtons ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div className={`flex items-center gap-4 ${showSkipButtons ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                  <button
                    type="button"
                    onClick={handleSkipBack}
                    className="w-14 h-14 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center transition-colors touch-manipulation"
                    aria-label="Retroceder 10 segundos"
                    title="Retroceder 10 segundos"
                  >
                    <RotateCcw className="w-7 h-7 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={handleSkipForward}
                    className="w-14 h-14 rounded-full bg-white/25 hover:bg-white/40 backdrop-blur-sm flex items-center justify-center transition-colors touch-manipulation"
                    aria-label="Avançar 10 segundos"
                    title="Avançar 10 segundos"
                  >
                    <RotateCw className="w-7 h-7 text-white" />
                  </button>
                </div>
              </div>
            )}
            {videoError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 z-20">
                <p className="text-white text-center text-sm">{videoError}</p>
              </div>
            )}
            {resumeOverlayVisible && resumePositionSec > 0 && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
                <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
                  <p className="text-gray-800 font-medium mb-1">Continuar de onde parou?</p>
                  <p className="text-gray-600 text-sm mb-5 tabular-nums">
                    {formatDuration(resumePositionSec)}
                    {durationSec != null && durationSec > 0 && ` / ${formatDuration(durationSec)}`}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      type="button"
                      onClick={handleResumeSim}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm touch-manipulation hover:bg-blue-700"
                    >
                      Sim
                    </button>
                    <button
                      type="button"
                      onClick={handleResumeNao}
                      className="px-5 py-2.5 rounded-xl bg-gray-200 text-gray-800 font-medium text-sm touch-manipulation hover:bg-gray-300"
                    >
                      Não
                    </button>
                  </div>
                </div>
              </div>
            )}
            {showPlayOverlay && playOverlayVisible && (
              <button
                type="button"
                onClick={handlePlayTap}
                className="absolute inset-0 flex items-center justify-center bg-black/60 touch-manipulation"
                aria-label="Reproduzir vídeo"
              >
                <span className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                  <Play className="w-10 h-10 text-gray-900 fill-gray-900 ml-1" />
                </span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
