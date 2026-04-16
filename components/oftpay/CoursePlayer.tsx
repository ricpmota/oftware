'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Calendar,
  BarChart3,
  Video,
  BookOpen,
  CalendarDays,
  PanelLeftClose,
  PanelLeft,
  ArrowLeft,
  Folder,
  ChevronDown,
  ChevronRight,
  X,
  User as UserIcon,
  Star,
} from 'lucide-react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import { loadOftPayProgressFromFirestore, saveOftPayProgressToFirestore } from '@/utils/oftpayProgressFirestore';
import VideoPlayerUrl from './VideoPlayerUrl';
import OftPayPlanner from './OftPayPlanner';
import OftPayDashboard from './OftPayDashboard';
import ApostilaLibrary, { type ApostilaItem } from './ApostilaLibrary';
import ScheduleCalendar from '@/components/oftreview/ScheduleCalendar';
import type { Schedule, ProgressMap } from '@/types/videoLibrary';
import type { OftPayCourse } from '@/app/oftpay/coursesConfig';
import { formatDuration as formatDurationUtil } from '@/utils/formatDuration';

const PROGRESS_STORAGE_KEY_PREFIX = 'oftpay_progress_';

/** Exibe duração para a lista de vídeos: "—" se desconhecida, senão MM:SS ou HH:MM:SS. */
function formatVideoDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—';
  return formatDurationUtil(seconds);
}

/** Vídeo do curso (URL do Storage) */
export interface CourseVideoItem {
  videoId: string;
  name: string;
  subject: string;
  url: string;
  /** Caminho completo no bucket (ex.: oftreview 2023/Catarata/Aula 1.mp4) */
  storagePath?: string;
  duration?: number | null;
}

interface CoursePlayerProps {
  course: OftPayCourse;
  /** Lista de vídeos do curso (do Storage). Vazio até configurar o path. */
  videos?: CourseVideoItem[];
  /** Indica se a lista de vídeos ainda está carregando (API GCS). */
  videosLoading?: boolean;
  /** Mensagem de erro retornada pela API ao listar vídeos. */
  videosError?: string | null;
  /** Debug da API quando não há vídeos (prefix usado, total de objetos, pastas na raiz). */
  videosDebug?: { prefix?: string; bucket?: string; totalObjectsListed?: number; rootFoldersFound?: string[]; hint?: string } | null;
  /** Lista de apostilas (PDFs) do curso. */
  apostilas?: ApostilaItem[];
  apostilasLoading?: boolean;
  apostilasError?: string | null;
  apostilasDebug?: { prefix?: string; bucket?: string; totalInFolder?: number } | null;
}

export default function CoursePlayer({
  course,
  videos = [],
  videosLoading = false,
  videosError = null,
  videosDebug = null,
  apostilas = [],
  apostilasLoading = false,
  apostilasError = null,
  apostilasDebug = null,
}: CoursePlayerProps) {
  const [activeTab, setActiveTab] = useState<'planner' | 'dashboard' | 'videos' | 'apostila' | 'schedule'>('planner');
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<CourseVideoItem | null>(null);
  const [selectedStartTime, setSelectedStartTime] = useState<number | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [videosFilter, setVideosFilter] = useState<'todos' | 'favoritos'>('todos');
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [progressMap, setProgressMap] = useState<ProgressMap>({});
  const [user, setUser] = useState<User | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [accessEndAt, setAccessEndAt] = useState<number | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u ?? null));
    return () => unsub();
  }, []);
  useEffect(() => {
    if (!user) {
      setAccessEndAt(null);
      return;
    }
    let cancelled = false;
    user.getIdToken().then((token) => {
      return fetch('/api/oftpay/allowed-courses', { headers: { Authorization: `Bearer ${token}` } });
    }).then((res) => res.json().catch(() => ({}))).then((data) => {
      if (cancelled) return;
      setAccessEndAt(typeof data.accessEndAt === 'number' ? data.accessEndAt : null);
    }).catch(() => {
      if (!cancelled) setAccessEndAt(null);
    });
    return () => { cancelled = true; };
  }, [user]);

  const formatVigencia = useCallback((): { texto: string; dias?: number } => {
    if (accessEndAt == null) return { texto: 'Sem limite' };
    const endDate = new Date(accessEndAt);
    const texto = `Até ${endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    const dias = Math.ceil((endDate.getTime() - hoje.getTime()) / (24 * 60 * 60 * 1000));
    return { texto, dias };
  }, [accessEndAt]);

  useEffect(() => {
    if (!showUserMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showUserMenu]);

  const tabTitles: Record<typeof activeTab, string> = {
    planner: 'Planejador',
    dashboard: 'Dashboard',
    videos: 'Vídeos',
    apostila: 'Apostila',
    schedule: 'Cronograma',
  };

  /** Tema do curso: azul (Oftreview) ou roxo (Propedeutics) */
  const isPurple = course.theme === 'purple';
  const tabActive = isPurple ? 'border-purple-600 text-purple-600 bg-purple-50' : 'border-blue-600 text-blue-600 bg-blue-50';
  const navActive = isPurple ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600';
  const videoSelected = isPurple ? 'bg-purple-100 text-purple-900 font-medium' : 'bg-blue-100 text-blue-900 font-medium';
  const spinnerBorder = isPurple ? 'border-purple-500' : 'border-blue-500';

  /** Vídeos com duração mesclada: API/Firestore primeiro, depois a duração gravada quando o usuário assistiu (reprodutor). */
  const videosWithDuration = useMemo(
    () =>
      videos.map((v) => ({
        ...v,
        duration: v.duration ?? progressMap[v.videoId]?.duration ?? undefined,
      })),
    [videos, progressMap]
  );

  const lessonNumber = useCallback((name: string): number => {
    const m = name.match(/aula\s*(\d+)/i) || name.match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }, []);

  const videosByFolder = useMemo(() => {
    const map = new Map<string, CourseVideoItem[]>();
    for (const v of videosWithDuration) {
      const folder = v.subject || 'Geral';
      if (!map.has(folder)) map.set(folder, []);
      map.get(folder)!.push(v);
    }
    map.forEach((list) => {
      list.sort((a, b) => {
        const na = lessonNumber(a.name);
        const nb = lessonNumber(b.name);
        if (na !== nb) return na - nb;
        return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true });
      });
    });
    return map;
  }, [videosWithDuration, lessonNumber]);

  /** Vídeos por pasta com filtro Todos/Favoritos. Favoritos = vídeos avaliados, ordenados do maior para o menor. */
  const filteredVideosByFolder = useMemo(() => {
    const base = videosFilter === 'favoritos'
      ? videosWithDuration.filter((v) => (progressMap[v.videoId]?.rating ?? 0) >= 1)
      : videosWithDuration;
    const map = new Map<string, CourseVideoItem[]>();
    for (const v of base) {
      const folder = v.subject || 'Geral';
      if (!map.has(folder)) map.set(folder, []);
      map.get(folder)!.push(v);
    }
    map.forEach((list) => {
      list.sort((a, b) => {
        if (videosFilter === 'favoritos') {
          const ra = progressMap[a.videoId]?.rating ?? 0;
          const rb = progressMap[b.videoId]?.rating ?? 0;
          if (ra !== rb) return rb - ra;
        }
        const na = lessonNumber(a.name);
        const nb = lessonNumber(b.name);
        if (na !== nb) return na - nb;
        return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true });
      });
    });
    return map;
  }, [videosWithDuration, progressMap, videosFilter, lessonNumber]);

  /** Propedeutics: "AULA 1" + resto do nome em maiúsculas; remove datas como (01.12.2021) e extensão. */
  const videoDisplayName = useMemo(() => {
    const map: Record<string, string> = {};
    if (!isPurple) return map;
    /** Remove extensão; remove datas entre parênteses (01.12.2021) ou (1.12.2021); remove data no início; remove "Aula N" do início; retorna o resto em maiúsculas. */
    const restOfLessonName = (fileName: string): string => {
      let s = (fileName || '').replace(/\.(mp4|webm|mkv|mov|avi|m4v)$/i, '').trim();
      s = s.replace(/\s*\(\d{1,2}\.\d{1,2}\.\d{2,4}\)\s*/g, '').trim(); // (01.12.2021) ou (1.12.2021)
      s = s.replace(/\s*[-–—]\s*$/, '').replace(/^\s*[-–—]\s*/, '').trim();
      s = s.replace(/^\d{4}-\d{2}-\d{2}\s*/, '').replace(/^\d{2}[\/\-]\d{2}[\/\-]\d{2,4}\s*/, '').trim();
      s = s.replace(/^aula\s*\d+\s*[-–—]?\s*/i, '').trim();
      return s.toUpperCase();
    };
    videosByFolder.forEach((list) => {
      list.forEach((v, i) => {
        const rest = restOfLessonName(v.name ?? '');
        const full = rest ? `AULA ${i + 1} ${rest}` : `AULA ${i + 1}`;
        map[v.videoId] = full.toUpperCase();
      });
    });
    return map;
  }, [isPurple, videosByFolder]);

  const getDisplayName = (v: CourseVideoItem) => videoDisplayName[v.videoId] ?? v.name ?? '';

  /** URL do ícone do assunto (Oftreview ou Propedeutics) */
  const getSubjectIconSrc = useCallback((subject: string) => {
    if (course?.id?.toLowerCase() === 'propedeutics') {
      const normalized = (subject || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const propedeuticsIcons: Record<string, string> = {
        biometria: 'BIOMETRIA',
        cornea: 'CORNEA',
        emergencia: 'EMERGENCIA',
        glaucoma: 'GLAUCOMA',
        retina: 'RETINA',
        ultrassom: 'ULTRASSOM',
      };
      const iconName = propedeuticsIcons[normalized] ?? (subject.trim().toUpperCase());
      return `/Propedeutics%20Icones/${encodeURIComponent(iconName)}.png`;
    }
    return `/Oftreview%20Icones/${encodeURIComponent((subject || '').trim())}.png`;
  }, [course?.id]);

  useEffect(() => {
    const keys = Array.from(videosByFolder.keys());
    if (keys.length > 0) {
      setCollapsedFolders((prev) => (prev.size === 0 ? new Set(keys) : prev));
    }
  }, [videosByFolder]);

  /** Carrega progresso: se logado, do Firestore (perfil); senão do localStorage (cache do browser). */
  useEffect(() => {
    if (!course?.id) return;
    let cancelled = false;
    const key = PROGRESS_STORAGE_KEY_PREFIX + course.id;
    if (user) {
      loadOftPayProgressFromFirestore(course.id).then((firestoreMap) => {
        if (cancelled) return;
        if (Object.keys(firestoreMap).length > 0) {
          setProgressMap(firestoreMap);
          try {
            localStorage.setItem(key, JSON.stringify(firestoreMap));
          } catch (_) {}
        } else {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const parsed = JSON.parse(stored) as ProgressMap;
              if (parsed && typeof parsed === 'object') setProgressMap(parsed);
            }
          } catch (_) {}
        }
      });
    } else {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored) as ProgressMap;
          if (parsed && typeof parsed === 'object') setProgressMap(parsed);
        }
      } catch (e) {
        console.error('Erro ao carregar progresso oftpay:', e);
      }
    }
    return () => { cancelled = true; };
  }, [course?.id, user]);

  const persistProgress = useCallback(
    (map: ProgressMap) => {
      if (!course?.id) return;
      try {
        localStorage.setItem(PROGRESS_STORAGE_KEY_PREFIX + course.id, JSON.stringify(map));
      } catch (e) {
        console.error('Erro ao salvar progresso oftpay:', e);
      }
    },
    [course?.id]
  );

  useEffect(() => {
    if (!course?.id) return;
    const t = setTimeout(() => {
      persistProgress(progressMap);
      if (user && Object.keys(progressMap).length > 0) {
        saveOftPayProgressToFirestore(course.id, progressMap).catch(() => {});
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [progressMap, course?.id, user, persistProgress]);

  const handleProgressChange = useCallback((map: ProgressMap) => {
    setProgressMap(map);
    persistProgress(map);
  }, [persistProgress]);

  /** Quando o reprodutor carrega os metadados do vídeo, sabemos a duração real; gravamos no progresso para lista e planejamento. */
  const handleDurationKnown = useCallback((durationSeconds: number) => {
    if (!selectedVideo?.videoId) return;
    const sec = Math.round(durationSeconds);
    if (!Number.isFinite(sec) || sec <= 0) return;
    setProgressMap((prev) => {
      const existing = prev[selectedVideo.videoId];
      const next = {
        ...prev,
        [selectedVideo.videoId]: {
          watched: existing?.watched ?? false,
          lastPosition: existing?.lastPosition ?? 0,
          watchedSeconds: existing?.watchedSeconds ?? 0,
          duration: sec,
          comments: existing?.comments,
          rating: existing?.rating,
          updatedAt: Date.now(),
        },
      };
      persistProgress(next);
      return next;
    });
  }, [selectedVideo?.videoId, persistProgress]);

  /** Zera o tempo assistido de um vídeo (calendário). */
  const handleResetVideoProgress = useCallback((videoId: string) => {
    setProgressMap((prev) => {
      const existing = prev[videoId];
      const next = {
        ...prev,
        [videoId]: {
          watched: false,
          lastPosition: 0,
          watchedSeconds: 0,
          duration: existing?.duration ?? null,
          comments: existing?.comments,
          rating: existing?.rating,
          updatedAt: Date.now(),
        },
      };
      persistProgress(next);
      return next;
    });
  }, [persistProgress]);

  /** Atualiza a avaliação (estrelas) de um vídeo. rating 0 = desfavoritar (remover avaliação). */
  const handleRatingChange = useCallback((videoId: string, rating: number) => {
    setProgressMap((prev) => {
      const existing = prev[videoId];
      const newRating = rating === 0 ? undefined : Math.max(1, Math.min(5, Math.round(rating)));
      const next = {
        ...prev,
        [videoId]: {
          watched: existing?.watched ?? false,
          lastPosition: existing?.lastPosition ?? 0,
          watchedSeconds: existing?.watchedSeconds ?? 0,
          duration: existing?.duration ?? null,
          comments: existing?.comments,
          rating: newRating,
          updatedAt: Date.now(),
        },
      };
      persistProgress(next);
      return next;
    });
  }, [persistProgress]);

  /** Marca vídeo como 100% concluído (calendário). partEndSec: se for parte de vídeo, watchedSeconds vai pelo menos até o fim da parte. */
  const handleMarkVideoCompleted = useCallback((videoId: string, durationSec: number, partEndSec?: number) => {
    const sec = Math.max(0, Math.round(durationSec));
    const watchedSec = partEndSec != null ? Math.max(sec, Math.round(partEndSec)) : sec;
    setProgressMap((prev) => {
      const existing = prev[videoId];
      const next = {
        ...prev,
        [videoId]: {
          watched: true,
          lastPosition: watchedSec,
          watchedSeconds: Math.max(existing?.watchedSeconds ?? 0, watchedSec),
          duration: existing?.duration ?? watchedSec,
          comments: existing?.comments,
          rating: existing?.rating,
          updatedAt: Date.now(),
        },
      };
      persistProgress(next);
      return next;
    });
  }, [persistProgress]);

  /** Atualiza progresso do vídeo (0–100% assistido); chamado no timeupdate e ended do player. */
  const handleProgressUpdate = useCallback(
    (id: string, updates: { lastPosition: number; watchedSeconds: number; watched?: boolean; duration?: number }) => {
      setProgressMap((prev) => {
        const existing = prev[id];
        const watchedSeconds = Math.max(
          existing?.watchedSeconds ?? 0,
          updates.watchedSeconds ?? 0
        );
        const duration = updates.duration ?? existing?.duration ?? null;
        let watched = updates.watched ?? existing?.watched ?? false;
        if (!watched && duration != null && duration > 0 && watchedSeconds / duration >= 0.9) {
          watched = true;
        }
        const next = {
          ...prev,
          [id]: {
            watched,
            lastPosition: updates.lastPosition,
            watchedSeconds,
            duration,
            comments: existing?.comments,
            rating: existing?.rating,
            updatedAt: Date.now(),
          },
        };
        persistProgress(next);
        return next;
      });
    },
    [persistProgress]
  );

  const toggleFolder = (folder: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folder)) next.delete(folder);
      else next.add(folder);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 flex flex-col md:flex-row overflow-hidden bg-gray-50">
      {/* Painel esquerdo - full width no mobile, metade no desktop */}
      <div
        className={`flex flex-col overflow-hidden bg-white border-r border-gray-200 transition-[width] duration-200 ease-out w-full md:min-w-0 ${
          isLeftPanelCollapsed ? 'md:w-12 md:flex-shrink-0' : 'md:flex-1'
        }`}
      >
        {/* Barra superior: voltar + título (mobile = nome da aba, desktop = nome do curso) + botão recolher */}
        <div className="flex-shrink-0 flex items-center border-b border-gray-200 bg-gray-50">
          {!isLeftPanelCollapsed && (
            <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 md:py-2">
              <Link
                href="/oftpay"
                className="p-2 md:p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors touch-manipulation shrink-0"
                title="Voltar aos cursos"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-base font-semibold text-gray-900 truncate min-w-0">
                <span className="md:hidden">{tabTitles[activeTab]}</span>
                <span className="hidden md:inline">{course.name}</span>
              </h1>
              <div className="ml-auto flex items-center gap-2 shrink-0">
                <img
                  src="/logo.png"
                  alt="Oftware"
                  className="block h-7 w-auto object-contain md:h-8"
                />
                <div className="relative flex items-center" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowUserMenu((v) => !v)}
                    className="flex items-center gap-1.5 p-1.5 rounded-full hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                    title="Menu do usuário"
                  >
                    {user?.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-gray-600" />
                      </div>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 top-full mt-1.5 w-64 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                      <div className="px-3 py-2.5 border-b border-gray-100 bg-gray-50">
                        <div className="flex items-center gap-2">
                          {user?.photoURL ? (
                            <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <UserIcon className="w-5 h-5 text-gray-600" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{user?.displayName || 'Usuário'}</p>
                            <p className="text-xs text-gray-500 truncate">{user?.email ?? ''}</p>
                          </div>
                        </div>
                      </div>
                      <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Tempo de acesso</p>
                        {(() => {
                          const vig = formatVigencia();
                          return (
                            <>
                              <p className="text-sm text-gray-800 mt-0.5">{vig.texto}</p>
                              {vig.dias !== undefined && (
                                <p className={`text-xs mt-1 ${vig.dias < 0 ? 'text-red-600' : vig.dias <= 7 ? 'text-amber-600' : 'text-gray-500'}`}>
                                  {vig.dias > 0 ? `${vig.dias} ${vig.dias === 1 ? 'dia' : 'dias'} para expirar` : vig.dias === 0 ? 'Expira hoje' : 'Expirado'}
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <div className="border-t border-gray-100">
                        <Link
                          href="/oftpay"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Voltar aos cursos
                        </Link>
                        <button
                          type="button"
                          onClick={() => { setShowUserMenu(false); signOut(auth).catch(() => {}); }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sair
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsLeftPanelCollapsed((c) => !c)}
            className={`hidden md:flex flex-shrink-0 p-2 text-gray-600 hover:bg-gray-200 hover:text-gray-900 transition-colors ${
              isLeftPanelCollapsed ? 'w-full justify-center' : 'border-l border-gray-200'
            }`}
            title={isLeftPanelCollapsed ? 'Expandir painel' : 'Recolher painel'}
          >
            {isLeftPanelCollapsed ? (
              <PanelLeft className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
        </div>

        {!isLeftPanelCollapsed && (
          <>
            {/* Tabs - só no desktop; no mobile o menu fica embaixo */}
            <div className="hidden md:block flex-shrink-0 border-b border-gray-200 bg-white">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('planner')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === 'planner'
                      ? tabActive
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>Planejador</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === 'dashboard'
                      ? tabActive
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    <span>Dashboard</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('videos')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === 'videos'
                      ? tabActive
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Video className="w-4 h-4" />
                    <span>Vídeos</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('apostila')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === 'apostila'
                      ? tabActive
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>Apostila</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === 'schedule'
                      ? tabActive
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    <span>Cronograma</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Conteúdo das tabs - no mobile padding-bottom para não ficar atrás do menu fixo */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 overscroll-behavior-contain pb-20 md:pb-0">
              {activeTab === 'planner' && (
                <div className="p-4">
                  <OftPayPlanner
                    courseId={course.id}
                    videos={videosWithDuration}
                    onScheduleChange={setSchedule}
                  />
                </div>
              )}

              {activeTab === 'dashboard' && (
                <OftPayDashboard
                  courseId={course.id}
                  videos={videosWithDuration}
                  schedule={schedule}
                  progressMap={progressMap}
                  onProgressChange={handleProgressChange}
                />
              )}

              {activeTab === 'apostila' && (
                <div className="p-4">
                  <ApostilaLibrary
                    apostilas={apostilas}
                    loading={apostilasLoading}
                    error={apostilasError}
                    debug={apostilasDebug ?? undefined}
                    courseId={course.id}
                  />
                </div>
              )}

              {activeTab === 'videos' && (
                <div className="p-4">
                  {videosLoading ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-2" />
                      <p>Carregando vídeos do Cloud Storage...</p>
                    </div>
                  ) : videosError ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-800">
                      <p className="font-medium">Erro ao carregar vídeos</p>
                      <p className="text-sm mt-2 break-words">{videosError}</p>
                      <p className="text-xs mt-3 text-red-600">
                        Configure na Vercel: OFTPAY_GCS_BUCKET e GOOGLE_APPLICATION_CREDENTIALS_JSON (conteúdo do JSON da chave).
                      </p>
                    </div>
                  ) : videos.length === 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
                      <Video className="w-10 h-10 mx-auto mb-2 text-amber-500" />
                      <p className="font-medium">Nenhum vídeo encontrado</p>
                      <p className="text-sm mt-1">
                        Caminho usado: bucket <code className="bg-amber-100 px-1 rounded">{videosDebug?.bucket ?? '?'}</code> → prefix <code className="bg-amber-100 px-1 rounded">{videosDebug?.prefix ?? (course.storagePath ? `${course.storagePath}/` : '—')}</code>.
                        {videosDebug != null && (
                          <>
                            <span className="block mt-2 text-xs">Objetos listados pelo GCS: <strong>{videosDebug.totalObjectsListed ?? 0}</strong>. {videosDebug.totalObjectsListed === 0 ? 'Prefix pode estar errado ou a chave não tem permissão no bucket.' : 'Nenhum com extensão de vídeo (.mp4, .webm, etc.).'}</span>
                            {Array.isArray(videosDebug.rootFoldersFound) && videosDebug.rootFoldersFound.length > 0 && (
                              <span className="block mt-1 text-xs">Pastas na raiz do bucket: {videosDebug.rootFoldersFound.join(', ')}</span>
                            )}
                          </>
                        )}
                      </p>
                      <p className="text-xs mt-3 text-amber-700">
                        Exemplo esperado: <code>oftware/oftreview 2023/Catarata/Aula X.mp4</code>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600">Filtro:</span>
                        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setVideosFilter('todos')}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                              videosFilter === 'todos'
                                ? isPurple ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            Todos
                          </button>
                          <button
                            type="button"
                            onClick={() => setVideosFilter('favoritos')}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-200 ${
                              videosFilter === 'favoritos'
                                ? isPurple ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                                : 'bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            Favoritos
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 text-center md:hidden pb-1">
                        Toque em um vídeo para assistir
                      </p>
                      {videosFilter === 'favoritos' && filteredVideosByFolder.size === 0 ? (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-amber-800">
                          <Star className="w-10 h-10 mx-auto mb-2 text-amber-400" />
                          <p className="font-medium">Nenhum vídeo nos favoritos</p>
                          <p className="text-sm mt-1">Avalie os vídeos concluídos com estrelas na aba Cronograma para que apareçam aqui.</p>
                        </div>
                      ) : Array.from(filteredVideosByFolder.entries()).map(([folder, folderVideos]) => {
                        const isCollapsed = collapsedFolders.has(folder);
                        return (
                        <div key={folder} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => toggleFolder(folder)}
                            className="flex items-center gap-2 w-full px-3 py-2 bg-gray-100 border-b border-gray-200 text-sm font-medium text-gray-800 hover:bg-gray-200 text-left"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            )}
                            <Folder className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span>{folder}</span>
                          </button>
                          {!isCollapsed && (
                          <ul className="divide-y divide-gray-100">
                            {folderVideos.map((v) => (
                              <li key={v.videoId}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedVideo(v);
                                    const prog = progressMap[v.videoId];
                                    const acumulado = prog?.watchedSeconds ?? 0;
                                    setSelectedStartTime(acumulado > 0 ? acumulado : null);
                                  }}
                                  className={`w-full text-left px-3 py-3 md:py-2 text-sm transition-colors hover:bg-gray-50 active:bg-gray-100 touch-manipulation flex items-center gap-2 ${
                                    selectedVideo?.videoId === v.videoId
                                      ? videoSelected
                                      : 'text-gray-700'
                                  }`}
                                >
                                  <Video className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                  <span className="truncate flex-1 min-w-0">{getDisplayName(v)}</span>
                                  {(progressMap[v.videoId]?.rating ?? 0) >= 1 && (
                                    <span className="flex items-center gap-0.5 shrink-0" title={`${progressMap[v.videoId]?.rating ?? 0} estrelas`}>
                                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                                      <span className="text-xs text-amber-600 font-medium">{progressMap[v.videoId]?.rating ?? 0}</span>
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500 tabular-nums shrink-0" title="Duração usada no planejamento">
                                    {formatVideoDuration(v.duration ?? null)}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                          )}
                        </div>
                      ); })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'schedule' && (
                <div className="p-4">
                  {schedule ? (
                    <ScheduleCalendar
                      schedule={schedule}
                      progressMap={progressMap}
                      videos={videos.map((v) => ({ videoId: v.videoId, name: getDisplayName(v) }))}
                      getSubjectIconSrc={getSubjectIconSrc}
                      onItemClick={(item) => {
                        const v = videos.find((x) => x.videoId === item.videoId);
                        if (v) {
                          setSelectedVideo(v);
                          const acumulado = progressMap[v.videoId]?.watchedSeconds ?? 0;
                          setSelectedStartTime(acumulado > 0 ? acumulado : null);
                        }
                      }}
                      onResetVideoProgress={handleResetVideoProgress}
                      onMarkVideoCompleted={handleMarkVideoCompleted}
                      onRatingChange={handleRatingChange}
                    />
                  ) : (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
                      <CalendarDays className="w-10 h-10 mx-auto mb-2 text-gray-400" />
                      <p>Cronograma</p>
                      <p className="text-sm mt-1">Crie e salve um planejamento na aba Planejador para gerar o cronograma aqui.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Menu inferior fixo - só mobile, só ícones */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around py-2 px-2 bg-white border-t border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('planner')}
            className={`p-3 rounded-xl transition-colors touch-manipulation ${activeTab === 'planner' ? navActive : 'text-gray-500 hover:bg-gray-100'}`}
            title="Planejador"
            aria-label="Planejador"
          >
            <Calendar className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`p-3 rounded-xl transition-colors touch-manipulation ${activeTab === 'dashboard' ? navActive : 'text-gray-500 hover:bg-gray-100'}`}
            title="Dashboard"
            aria-label="Dashboard"
          >
            <BarChart3 className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('videos')}
            className={`p-3 rounded-xl transition-colors touch-manipulation ${activeTab === 'videos' ? navActive : 'text-gray-500 hover:bg-gray-100'}`}
            title="Vídeos"
            aria-label="Vídeos"
          >
            <Video className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('apostila')}
            className={`p-3 rounded-xl transition-colors touch-manipulation ${activeTab === 'apostila' ? navActive : 'text-gray-500 hover:bg-gray-100'}`}
            title="Apostila"
            aria-label="Apostila"
          >
            <BookOpen className="w-6 h-6" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`p-3 rounded-xl transition-colors touch-manipulation ${activeTab === 'schedule' ? navActive : 'text-gray-500 hover:bg-gray-100'}`}
            title="Cronograma"
            aria-label="Cronograma"
          >
            <CalendarDays className="w-6 h-6" />
          </button>
        </nav>
      </div>

      {/* Painel direito - vídeo (só desktop; no mobile o vídeo abre em overlay) */}
      <div
        className={`hidden md:flex border-l border-gray-200 flex-col min-h-0 h-full overflow-hidden ${
          isLeftPanelCollapsed ? 'flex-1 min-w-0' : 'w-1/2 flex-shrink-0'
        }`}
      >
        <VideoPlayerUrl
          videoUrl={selectedVideo?.url ?? null}
          title={selectedVideo ? getDisplayName(selectedVideo) : null}
          startTime={selectedStartTime ?? null}
          videoId={selectedVideo?.videoId}
          onDurationKnown={handleDurationKnown}
          onProgressUpdate={handleProgressUpdate}
        />
      </div>

      {/* Mobile: overlay com vídeo ao clicar para assistir */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black md:hidden">
          <div className="flex-shrink-0 flex items-center justify-between gap-2 px-3 py-3 bg-black border-b border-white/10">
            <span className="truncate flex-1 min-w-0 font-semibold" style={{ color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              {getDisplayName(selectedVideo)}
            </span>
            <button
              type="button"
              onClick={() => { setSelectedVideo(null); setSelectedStartTime(null); }}
              className="flex-shrink-0 p-2 -mr-1 rounded-full touch-manipulation hover:bg-white/20"
              style={{ color: '#ffffff' }}
              aria-label="Fechar vídeo"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 min-h-0 min-w-0 relative">
            <VideoPlayerUrl
              videoUrl={selectedVideo.url}
              title={getDisplayName(selectedVideo)}
              startTime={selectedStartTime ?? null}
              videoId={selectedVideo.videoId}
              onDurationKnown={handleDurationKnown}
              onProgressUpdate={handleProgressUpdate}
              showPlayOverlay
              hideTitleBar
            />
          </div>
        </div>
      )}
    </div>
  );
}
