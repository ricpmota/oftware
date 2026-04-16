'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { VideoFile, VideoSubject, LibraryIndex, VideoProgress, ProgressMap } from '@/types/videoLibrary';
import { groupVideosBySubject, formatBytes } from '@/utils/videoLibraryUtils';
import {
  loadProgress,
  saveProgress,
  updateVideoProgress,
  calculateProgressStats,
  exportProgress,
  importProgress,
  resetProgress as resetProgressUtil,
  getVideoProgress,
} from '@/utils/videoProgress';
import { loadVideoDurations } from '@/utils/loadVideoDuration';
import LibraryConnector from './LibraryConnector';
import SearchAndFilters from './SearchAndFilters';
import SubjectAccordion from './SubjectAccordion';
import VideoPlayer from './VideoPlayer';
import StudyPlanner from './StudyPlanner';
import ScheduleCalendar from './ScheduleCalendar';
import VideoCommentsModal from './VideoCommentsModal';
import { Download, Upload, Trash2, Calendar, BarChart3, Video, CalendarDays, X, Save } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { loadPlanInput, savePlanInput } from '@/utils/plannerStorage';
import { loadSchedule, saveSchedule } from '@/utils/scheduleStorage';
import { generateSchedule } from '@/utils/scheduleGenerator';
import { buildStudyDays } from '@/utils/studyPlannerUtils';
import { Schedule, ScheduleItem, ScheduleSettings, PlannerSettings, PlanInput, VideoLibrary as VideoLibraryType } from '@/types/videoLibrary';
import { loadPlannersFromFirestore } from '@/utils/plannerFirestore';
import { loadLibrariesFromFirestore, saveLibraryToFirestore, loadLibraryFromFirestore, deleteLibraryFromFirestore } from '@/utils/libraryFirestore';
import { loadScheduleFromFirestore, saveScheduleToFirestore, deleteScheduleFromFirestore } from '@/utils/scheduleFirestore';
import { loadProgressFromFirestore, saveVideoProgressToFirestore } from '@/utils/progressFirestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface VideoLibraryProps {
  initialVideos?: VideoFile[];
}

/**
 * Componente principal da biblioteca de vídeos
 * Orquestra todos os subcomponentes
 */
export default function VideoLibrary({ initialVideos = [] }: VideoLibraryProps) {
  const [videos, setVideos] = useState<VideoFile[]>(initialVideos);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [progressMap, setProgressMap] = useState<ProgressMap>({});
  const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null);
  const [selectedVideoStartTime, setSelectedVideoStartTime] = useState<number | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [activeTab, setActiveTab] = useState<'planner' | 'dashboard' | 'videos' | 'schedule'>('planner');
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>({
    intercalateSubjects: false,
    splitLongVideos: true,
  });
  const [onlyFutureSchedule, setOnlyFutureSchedule] = useState(false);
  const [onlyUncompletedSchedule, setOnlyUncompletedSchedule] = useState(false);
  const [selectedPlannerId, setSelectedPlannerId] = useState<string | null>(null);
  const [selectedPlanner, setSelectedPlanner] = useState<PlannerSettings | null>(null);
  const [allPlanners, setAllPlanners] = useState<PlannerSettings[]>([]);
  const [dashboardFilter, setDashboardFilter] = useState<'total' | string>('total');
  
  // Estados para gerenciamento de bibliotecas
  const [libraries, setLibraries] = useState<VideoLibraryType[]>([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null);
  const [selectedLibrary, setSelectedLibrary] = useState<VideoLibraryType | null>(null);
  const [isSavingLibrary, setIsSavingLibrary] = useState(false);
  const [saveLibraryProgress, setSaveLibraryProgress] = useState({ current: 0, total: 0 });
  const [showSaveLibraryModal, setShowSaveLibraryModal] = useState(false);
  const [pendingVideosToSave, setPendingVideosToSave] = useState<VideoFile[] | null>(null);
  const [libraryNameInput, setLibraryNameInput] = useState('');
  const [isCreatingNewLibrary, setIsCreatingNewLibrary] = useState(false);
  const [previousLibraryId, setPreviousLibraryId] = useState<string | null>(null);
  
  // Estados para modal de comentários
  const [commentsModal, setCommentsModal] = useState<{
    videoId: string;
    videoName: string;
    isOpen: boolean;
    isMinimized: boolean;
    position: { x: number; y: number };
    size: { width: number; height: number };
  } | null>(null);

  /**
   * Carrega biblioteca e progresso do localStorage ao montar
   */
  useEffect(() => {
    try {
      // Carregar biblioteca
      const stored = localStorage.getItem('videoLibraryIndex');
      if (stored) {
        const libraryIndex: LibraryIndex = JSON.parse(stored);
        const loadedVideos: VideoFile[] = libraryIndex.videos.map((v) => ({
          ...v,
          file: undefined,
          available: undefined,
        }));
        setVideos(loadedVideos);
      }

      // Carregar progresso
      const loadedProgress = loadProgress();
      setProgressMap(loadedProgress);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }, []);

  /**
   * Carrega bibliotecas quando usuário autentica (apenas uma vez)
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const loadedLibraries = await loadLibrariesFromFirestore();
          setLibraries(loadedLibraries);
          
          // Se há bibliotecas e nenhuma está selecionada E não há vídeos carregados, selecionar a primeira
          if (loadedLibraries.length > 0 && !selectedLibraryId && videos.length === 0) {
            const firstLibrary = loadedLibraries[0];
            setSelectedLibraryId(firstLibrary.id || null);
            setSelectedLibrary(firstLibrary);
            
            // Carregar vídeos da biblioteca
            const loadedVideos: VideoFile[] = firstLibrary.videos.map((v) => ({
              ...v,
              file: undefined,
              available: undefined,
            }));
            setVideos(loadedVideos);
            
            // Atualizar progressMap com durações salvas (preservar progresso existente)
            setProgressMap((prev) => {
              const updatedProgress: ProgressMap = { ...prev };
              firstLibrary.videos.forEach(v => {
                if (v.duration !== null && v.duration !== undefined) {
                  const existing = updatedProgress[v.videoId];
                  updatedProgress[v.videoId] = {
                    watched: existing?.watched || false,
                    lastPosition: existing?.lastPosition || 0,
                    watchedSeconds: existing?.watchedSeconds || 0,
                    duration: v.duration, // Sempre atualizar com duração do Firestore
                    updatedAt: existing?.updatedAt || Date.now(),
                  };
                }
              });
              return updatedProgress;
            });
          }
        } catch (error) {
          console.error('Erro ao carregar bibliotecas:', error);
        }
      }
    });
    return () => unsubscribe();
  }, []); // Removido selectedLibraryId da dependência
  
  /**
   * Carrega planejamentos e cronograma quando biblioteca é selecionada
   */
  useEffect(() => {
    if (!selectedLibraryId) return;
    
    const loadPlannersAndSchedule = async () => {
      try {
        const planners = await loadPlannersFromFirestore(selectedLibraryId);
        setAllPlanners(planners); // Sempre carregar lista de planejamentos, mesmo se vazia
        
        if (planners.length > 0) {
          // Pegar o último planejamento (mais recente por updatedAt)
          const sortedPlanners = [...planners].sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
            return dateB - dateA; // Mais recente primeiro
          });
          const latestPlanner = sortedPlanners[0];
          setSelectedPlannerId(latestPlanner.id || null);
          setSelectedPlanner(latestPlanner);
          
          // Carregar cronograma do Firestore
          const loadedSchedule = await loadScheduleFromFirestore(selectedLibraryId, latestPlanner.id!);
          if (loadedSchedule) {
            setSchedule(loadedSchedule);
          }
          
          // Carregar progresso do Firestore e mesclar com durações da biblioteca
          const loadedProgress = await loadProgressFromFirestore(selectedLibraryId, latestPlanner.id!);
          setProgressMap((prev) => {
            const merged: ProgressMap = { ...loadedProgress };
            // Garantir que durações da biblioteca sejam preservadas
            if (selectedLibrary) {
              selectedLibrary.videos.forEach(v => {
                if (v.duration !== null && v.duration !== undefined) {
                  const existing = merged[v.videoId];
                  merged[v.videoId] = {
                    watched: existing?.watched || false,
                    lastPosition: existing?.lastPosition || 0,
                    watchedSeconds: existing?.watchedSeconds || 0,
                    duration: v.duration, // Sempre usar duração da biblioteca (mais confiável)
                    updatedAt: existing?.updatedAt || Date.now(),
                  };
                }
              });
            }
            return merged;
          });
        }
      } catch (error) {
        console.error('Erro ao carregar planejamentos:', error);
      }
    };
    
    loadPlannersAndSchedule();
  }, [selectedLibraryId]);

  /**
   * Manipula carregamento inicial da biblioteca
   */
  const handleLibraryLoaded = useCallback(async (newVideos: VideoFile[]) => {
    console.log('Biblioteca carregada:', newVideos.length, 'vídeos');
    setVideos(newVideos);
    setIsCreatingNewLibrary(false); // Sair do modo de criação quando carregar nova biblioteca

    // Se usuário está autenticado, abrir modal para salvar
    if (auth.currentUser) {
      setPendingVideosToSave(newVideos);
      setShowSaveLibraryModal(true);
    }

    // Carregar durações dos vídeos em background
    const videosWithFiles = newVideos.filter(v => v.file);
    if (videosWithFiles.length > 0) {
      console.log('Carregando durações de', videosWithFiles.length, 'vídeos...');
      
      loadVideoDurations(
        videosWithFiles.map(v => ({ file: v.file!, videoId: v.videoId })),
        (videoId, duration) => {
          if (duration !== null) {
            setProgressMap((prev) => {
              const updated = { ...prev };
              const currentProgress = getVideoProgress(videoId, updated);
              updated[videoId] = updateVideoProgress(videoId, { duration }, updated);
              return updated;
            });
          }
        },
        5 // max 5 vídeos simultâneos
      ).then(() => {
        console.log('Durações carregadas com sucesso');
      }).catch((error) => {
        console.error('Erro ao carregar durações:', error);
      });
    }
  }, []);

  /**
   * Manipula relink de biblioteca (associar Files aos vídeos existentes)
   */
  const handleLibraryRelinked = useCallback(async (relinkedVideos: VideoFile[]) => {
    console.log('Biblioteca relinkada:', relinkedVideos.filter(v => v.available).length, 'vídeos disponíveis');
    setVideos(relinkedVideos);

    // Atualizar vídeo selecionado se ainda estiver selecionado
    setSelectedVideo(prev => {
      if (prev) {
        const updated = relinkedVideos.find(v => v.videoId === prev.videoId);
        return updated || prev;
      }
      return prev;
    });

    // Carregar durações dos vídeos recém-relinkados em background
    const videosWithFiles = relinkedVideos.filter(v => v.file && v.available);
    if (videosWithFiles.length > 0) {
      console.log('Carregando durações de', videosWithFiles.length, 'vídeos relinkados...');
      
      loadVideoDurations(
        videosWithFiles.map(v => ({ file: v.file!, videoId: v.videoId })),
        (videoId, duration) => {
          if (duration !== null) {
            setProgressMap((prev) => {
              const updated = { ...prev };
              const currentProgress = getVideoProgress(videoId, updated);
              updated[videoId] = updateVideoProgress(videoId, { duration }, updated);
              return updated;
            });
          }
        },
        5 // max 5 vídeos simultâneos
      ).then(() => {
        console.log('Durações dos vídeos relinkados carregadas com sucesso');
      }).catch((error) => {
        console.error('Erro ao carregar durações dos vídeos relinkados:', error);
      });
    }
  }, []);

  /**
   * Manipula clique em vídeo (abrir player)
   */
  const handleVideoClick = useCallback((video: VideoFile, startTime?: number | null) => {
    setSelectedVideo(video);
    setSelectedVideoStartTime(startTime || null);
  }, []);
  
  /**
   * Handler para clicar em item do cronograma
   */
  const handleScheduleItemClick = useCallback((item: ScheduleItem) => {
    const video = videos.find(v => v.videoId === item.videoId);
    if (video) {
      const startTime = item.isPart && item.part ? item.part.startSec : null;
      handleVideoClick(video, startTime);
      // Player fica visível na lateral direita, não precisa mudar de aba
    } else {
      alert('Reconecte a biblioteca para assistir a este vídeo.');
    }
  }, [videos, handleVideoClick]);
  
  /**
   * Gera cronograma a partir de um planejamento (chamado automaticamente)
   */
  const generateScheduleForPlanner = useCallback(async (planner: PlannerSettings | null) => {
    if (!planner || !selectedLibraryId) {
      setSchedule(null);
      return;
    }
    
    const studyDays = buildStudyDays(
      planner.startDateISO,
      planner.endDateISO,
      planner.allowedWeekdays,
      planner.hoursPerWeekday
    );
    
    const selectedVideos = videos.filter(v => planner.selectedSubjects.includes(v.subject));
    const selectedVideoIds = selectedVideos.map(v => v.videoId);
    
    const planInput: PlanInput = {
      studyDays,
      hoursPerWeekday: planner.hoursPerWeekday,
      selectedVideoIds,
      selectedSubjects: planner.selectedSubjects,
      subjectOrder: planner.subjectOrder || planner.selectedSubjects,
      plannerId: planner.id,
    };
    
    const newSchedule = generateSchedule(planInput, videos, progressMap, scheduleSettings);
    setSchedule(newSchedule);
    
    // Salvar no localStorage (backup)
    saveSchedule(newSchedule);
    
    // Salvar no Firestore
    try {
      await saveScheduleToFirestore(selectedLibraryId, newSchedule);
    } catch (error) {
      console.error('Erro ao salvar cronograma no Firestore:', error);
    }
  }, [videos, progressMap, scheduleSettings, selectedLibraryId]);

  /**
   * Recarrega lista de planejamentos do Firestore
   */
  const reloadPlanners = useCallback(async () => {
    if (!selectedLibraryId) return;
    try {
      const planners = await loadPlannersFromFirestore(selectedLibraryId);
      setAllPlanners(planners);
    } catch (error) {
      console.error('Erro ao recarregar planejamentos:', error);
    }
  }, [selectedLibraryId]);

  /**
   * Handler quando planejamento é selecionado/mudado
   */
  const handlePlannerChange = useCallback(async (plannerId: string | null, planner: PlannerSettings | null) => {
    setSelectedPlannerId(plannerId);
    setSelectedPlanner(planner);
    
    // Recarregar lista de planejamentos para atualizar o dropdown do Dashboard
    if (selectedLibraryId) {
      await reloadPlanners();
    }
    
    if (planner && selectedLibraryId && plannerId) {
      // Tentar carregar cronograma do Firestore primeiro
      const loadedSchedule = await loadScheduleFromFirestore(selectedLibraryId, plannerId);
      if (loadedSchedule) {
        setSchedule(loadedSchedule);
      } else {
        // Se não existe, gerar novo cronograma
        generateScheduleForPlanner(planner);
      }
      
      // Carregar progresso do Firestore e mesclar com durações da biblioteca
      const loadedProgress = await loadProgressFromFirestore(selectedLibraryId, plannerId);
      setProgressMap((prev) => {
        const merged: ProgressMap = { ...loadedProgress };
        // Garantir que durações da biblioteca sejam preservadas
        if (selectedLibrary) {
          selectedLibrary.videos.forEach(v => {
            if (v.duration !== null && v.duration !== undefined) {
              const existing = merged[v.videoId];
              merged[v.videoId] = {
                watched: existing?.watched || false,
                lastPosition: existing?.lastPosition || 0,
                watchedSeconds: existing?.watchedSeconds || 0,
                duration: v.duration, // Sempre usar duração da biblioteca (mais confiável)
                updatedAt: existing?.updatedAt || Date.now(),
              };
            }
          });
        }
        return merged;
      });
    } else {
      // Limpar schedule e manter progresso local (não resetar progresso ao deletar planner)
      setSchedule(null);
    }
  }, [generateScheduleForPlanner, selectedLibraryId, selectedLibrary, reloadPlanners]);

  // Removido: cronograma agora é carregado/gerado no handlePlannerChange

  /**
   * Gera cronograma a partir do planInput (mantido para compatibilidade)
   */
  const handleGenerateSchedule = useCallback(() => {
    const planInput = loadPlanInput();
    if (!planInput) {
      alert('Configure um planejamento primeiro na aba "Planejador"');
      return;
    }
    
    const newSchedule = generateSchedule(planInput, videos, progressMap, scheduleSettings);
    setSchedule(newSchedule);
    saveSchedule(newSchedule);
    setActiveTab('schedule'); // Mudar para aba de cronograma
  }, [videos, progressMap, scheduleSettings]);

  /**
   * Manipula marcação de vídeo como assistido
   */
  const handleMarkWatched = useCallback(async (videoId: string) => {
    setProgressMap((prev) => {
      const currentProgress = getVideoProgress(videoId, prev);
      const updatedProgress = updateVideoProgress(
        videoId,
        { watched: true, lastPosition: currentProgress.duration || 0, watchedSeconds: currentProgress.duration || 0 },
        prev
      );
      saveProgress({ ...prev, [videoId]: updatedProgress }, true);
      
      // Salvar no Firestore se houver planejamento selecionado
      if (selectedLibraryId && selectedPlannerId) {
        saveVideoProgressToFirestore(selectedLibraryId, selectedPlannerId, videoId, updatedProgress).catch(error => {
          console.error('Erro ao salvar progresso no Firestore:', error);
        });
      }
      
      return { ...prev, [videoId]: updatedProgress };
    });
  }, [selectedLibraryId, selectedPlannerId]);

  /**
   * Manipula desmarcação de vídeo (não assistido)
   */
  const handleMarkUnwatched = useCallback(async (videoId: string) => {
    setProgressMap((prev) => {
      const currentProgress = getVideoProgress(videoId, prev);
      const updatedProgress = updateVideoProgress(
        videoId,
        { watched: false },
        prev
      );
      saveProgress({ ...prev, [videoId]: updatedProgress }, true);
      
      // Salvar no Firestore se houver planejamento selecionado
      if (selectedLibraryId && selectedPlannerId) {
        saveVideoProgressToFirestore(selectedLibraryId, selectedPlannerId, videoId, updatedProgress).catch(error => {
          console.error('Erro ao salvar progresso no Firestore:', error);
        });
      }
      
      return { ...prev, [videoId]: updatedProgress };
    });
  }, [selectedLibraryId, selectedPlannerId]);

  /**
   * Manipula atualização de progresso do player
   */
  const handleProgressUpdate = useCallback(async (videoId: string, updatedProgress: VideoProgress) => {
    setProgressMap(prev => {
      const newMap = { ...prev, [videoId]: updatedProgress };
      saveProgress(newMap); // Throttled save no localStorage
      
      // Salvar no Firestore se houver planejamento selecionado
      if (selectedLibraryId && selectedPlannerId) {
        saveVideoProgressToFirestore(selectedLibraryId, selectedPlannerId, videoId, updatedProgress).catch(error => {
          console.error('Erro ao salvar progresso no Firestore:', error);
        });
      }
      
      return newMap;
    });
  }, [selectedLibraryId, selectedPlannerId]);

  /**
   * Abre modal de comentários
   */
  const handleCommentsClick = useCallback((video: VideoFile | { videoId: string; name: string }) => {
    const videoName = 'name' in video ? video.name : videos.find(v => v.videoId === video.videoId)?.name || 'Vídeo';
    setCommentsModal({
      videoId: video.videoId,
      videoName,
      isOpen: true,
      isMinimized: false,
      position: { x: window.innerWidth - 420, y: 100 },
      size: { width: 400, height: 500 },
    });
  }, [videos]);

  /**
   * Salva comentários de um vídeo
   */
  const handleSaveComments = useCallback(async (videoId: string, comments: string) => {
    const currentProgress = progressMap[videoId] || {
      watched: false,
      lastPosition: 0,
      watchedSeconds: 0,
      duration: null,
      updatedAt: Date.now(),
    };

    const updatedProgress: VideoProgress = {
      ...currentProgress,
      comments: comments.trim() || undefined,
      updatedAt: Date.now(),
    };

    await handleProgressUpdate(videoId, updatedProgress);
  }, [progressMap, handleProgressUpdate]);

  /**
   * Fecha modal de comentários
   */
  const handleCloseCommentsModal = useCallback(() => {
    setCommentsModal(null);
  }, []);

  /**
   * Alterna minimização do modal de comentários
   */
  const handleToggleMinimizeComments = useCallback(() => {
    setCommentsModal(prev => prev ? { ...prev, isMinimized: !prev.isMinimized } : null);
  }, []);

  /**
   * Atualiza posição do modal de comentários
   */
  const handleCommentsPositionChange = useCallback((position: { x: number; y: number }) => {
    setCommentsModal(prev => prev ? { ...prev, position } : null);
  }, []);

  /**
   * Atualiza tamanho do modal de comentários
   */
  const handleCommentsSizeChange = useCallback((size: { width: number; height: number }) => {
    setCommentsModal(prev => prev ? { ...prev, size } : null);
  }, []);

  /**
   * Salva biblioteca no Firestore com todas as durações carregadas
   */
  const handleSaveLibrary = useCallback(async (videosToSave: VideoFile[], libraryName?: string) => {
    if (!auth.currentUser) {
      alert('Você precisa estar autenticado para salvar bibliotecas.');
      return;
    }
    
    const nameToUse = libraryName || libraryNameInput.trim();
    if (!nameToUse) {
      alert('Digite um nome para a biblioteca.');
      return;
    }
    
    setShowSaveLibraryModal(false);
    setLibraryNameInput('');
    
    setIsSavingLibrary(true);
    setSaveLibraryProgress({ current: 0, total: videosToSave.length });
    
    try {
      // Mapa para armazenar durações carregadas
      const durationMap = new Map<string, number | null>();
      
      // Primeiro, usar durações já conhecidas do progressMap
      videosToSave.forEach(video => {
        const progress = progressMap[video.videoId];
        if (progress?.duration !== null && progress?.duration !== undefined) {
          durationMap.set(video.videoId, progress.duration);
        }
      });
      
      // Carregar durações dos vídeos com arquivo que ainda não têm duração
      const videosToLoad = videosToSave.filter(v => 
        v.file && !durationMap.has(v.videoId)
      );
      
      if (videosToLoad.length > 0) {
        let loadedCount = durationMap.size;
        setSaveLibraryProgress({ current: loadedCount, total: videosToSave.length });
        
        await loadVideoDurations(
          videosToLoad.map(v => ({ file: v.file!, videoId: v.videoId })),
          (videoId, duration) => {
            loadedCount++;
            setSaveLibraryProgress({ current: loadedCount, total: videosToSave.length });
            durationMap.set(videoId, duration);
          },
          5 // max 5 simultâneos
        );
      }
      
      // Criar array final com todas as durações (removendo file e available explicitamente)
      const videosWithDurations: Omit<VideoFile, 'file' | 'available'>[] = videosToSave.map(video => {
        // Criar objeto limpo apenas com campos serializáveis
        return {
          name: video.name,
          sizeBytes: video.sizeBytes,
          webkitRelativePath: video.webkitRelativePath,
          folderPath: video.folderPath,
          subject: video.subject,
          videoId: video.videoId,
          duration: durationMap.get(video.videoId) ?? null,
        };
      });
      
      const library: VideoLibraryType = {
        name: nameToUse,
        videos: videosWithDurations,
      };
      
      const libraryId = await saveLibraryToFirestore(library);
      
      // Atualizar lista de bibliotecas
      const updatedLibraries = await loadLibrariesFromFirestore();
      setLibraries(updatedLibraries);
      
      // Selecionar biblioteca salva
      setSelectedLibraryId(libraryId);
      const savedLibrary = await loadLibraryFromFirestore(libraryId);
      if (savedLibrary) {
        setSelectedLibrary(savedLibrary);
        // Atualizar vídeos locais com durações
        const updatedVideos: VideoFile[] = savedLibrary.videos.map((v) => ({
          ...v,
          file: videosToSave.find(orig => orig.videoId === v.videoId)?.file,
          available: videosToSave.find(orig => orig.videoId === v.videoId)?.available,
        }));
        setVideos(updatedVideos);
        
        // Atualizar progressMap com durações
        const updatedProgress: ProgressMap = { ...progressMap };
        savedLibrary.videos.forEach(v => {
          if (v.duration !== null && v.duration !== undefined) {
            const existing = updatedProgress[v.videoId];
            updatedProgress[v.videoId] = {
              watched: existing?.watched || false,
              lastPosition: existing?.lastPosition || 0,
              watchedSeconds: existing?.watchedSeconds || 0,
              duration: v.duration,
              updatedAt: existing?.updatedAt || Date.now(),
            };
          }
        });
        setProgressMap(updatedProgress);
      }
      
      alert('Biblioteca salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar biblioteca:', error);
      alert('Erro ao salvar biblioteca. Tente novamente.');
    } finally {
      setIsSavingLibrary(false);
      setSaveLibraryProgress({ current: 0, total: 0 });
    }
  }, [progressMap]);
  
  /**
   * Deleta biblioteca do Firestore
   */
  const handleDeleteLibrary = useCallback(async (libraryId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta biblioteca? Todos os planejamentos e cronogramas associados também serão excluídos.')) {
      return;
    }
    
    try {
      await deleteLibraryFromFirestore(libraryId);
      
      // Atualizar lista de bibliotecas
      const updatedLibraries = await loadLibrariesFromFirestore();
      setLibraries(updatedLibraries);
      
      // Se era a biblioteca selecionada, limpar seleção
      if (selectedLibraryId === libraryId) {
        setSelectedLibraryId(null);
        setSelectedLibrary(null);
        setVideos([]);
        setProgressMap({});
        setSelectedPlannerId(null);
        setSelectedPlanner(null);
        setSchedule(null);
      }
      
      alert('Biblioteca excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao deletar biblioteca:', error);
      alert('Erro ao deletar biblioteca. Tente novamente.');
    }
  }, [selectedLibraryId]);
  
  /**
   * Limpa seleção atual para criar nova biblioteca
   */
  const handleClearLibrary = useCallback(() => {
    // Salvar biblioteca atual antes de limpar
    const currentLibraryId = selectedLibraryId;
    setPreviousLibraryId(currentLibraryId);
    
    try {
      setSelectedLibraryId(null);
      setSelectedLibrary(null);
      setVideos([]);
      setProgressMap({});
      setSelectedPlannerId(null);
      setSelectedPlanner(null);
      setSchedule(null);
      setIsCreatingNewLibrary(true);
      localStorage.removeItem('videoLibraryIndex');
    } catch (error) {
      console.error('Erro ao limpar seleção:', error);
    }
  }, [selectedLibraryId]);

  /**
   * Cancela criação de nova biblioteca e retorna para a anterior
   */
  const handleCancelNewLibrary = useCallback(async () => {
    if (previousLibraryId) {
      // Restaurar biblioteca anterior
      const libraryToRestore = libraries.find(lib => lib.id === previousLibraryId);
      if (libraryToRestore) {
        setSelectedLibraryId(previousLibraryId);
        setSelectedLibrary(libraryToRestore);
        
        // Carregar vídeos da biblioteca
        const loadedVideos: VideoFile[] = libraryToRestore.videos.map((v) => ({
          ...v,
          file: undefined,
          available: undefined,
        }));
        setVideos(loadedVideos);
        
        // Atualizar progressMap com durações salvas
        setProgressMap((prev) => {
          const updatedProgress: ProgressMap = { ...prev };
          libraryToRestore.videos.forEach(v => {
            if (v.duration !== null && v.duration !== undefined) {
              const existing = updatedProgress[v.videoId];
              updatedProgress[v.videoId] = {
                watched: existing?.watched || false,
                lastPosition: existing?.lastPosition || 0,
                watchedSeconds: existing?.watchedSeconds || 0,
                duration: v.duration,
                updatedAt: existing?.updatedAt || Date.now(),
              };
            }
          });
          return updatedProgress;
        });
        
        // Carregar planejamentos e cronograma da biblioteca restaurada
        try {
          const planners = await loadPlannersFromFirestore(previousLibraryId);
          setAllPlanners(planners);
          
          if (planners.length > 0) {
            // Pegar o último planejamento (mais recente por updatedAt)
            const sortedPlanners = [...planners].sort((a, b) => {
              const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
              const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
              return dateB - dateA; // Mais recente primeiro
            });
            const latestPlanner = sortedPlanners[0];
            setSelectedPlannerId(latestPlanner.id || null);
            setSelectedPlanner(latestPlanner);
            
            // Carregar cronograma do Firestore
            const loadedSchedule = await loadScheduleFromFirestore(previousLibraryId, latestPlanner.id!);
            if (loadedSchedule) {
              setSchedule(loadedSchedule);
            }
            
            // Carregar progresso do Firestore e mesclar com durações da biblioteca
            const loadedProgress = await loadProgressFromFirestore(previousLibraryId, latestPlanner.id!);
            setProgressMap((prev) => {
              const merged: ProgressMap = { ...loadedProgress };
              // Garantir que durações da biblioteca sejam preservadas
              libraryToRestore.videos.forEach(v => {
                if (v.duration !== null && v.duration !== undefined) {
                  const existing = merged[v.videoId];
                  merged[v.videoId] = {
                    watched: existing?.watched || false,
                    lastPosition: existing?.lastPosition || 0,
                    watchedSeconds: existing?.watchedSeconds || 0,
                    duration: v.duration, // Sempre usar duração da biblioteca (mais confiável)
                    updatedAt: existing?.updatedAt || Date.now(),
                  };
                }
              });
              return merged;
            });
          }
        } catch (error) {
          console.error('Erro ao carregar planejamentos:', error);
        }
      }
    }
    
    setIsCreatingNewLibrary(false);
    setPreviousLibraryId(null);
  }, [previousLibraryId, libraries]);

  /**
   * Exporta progresso
   */
  const handleExportProgress = useCallback(() => {
    try {
      exportProgress(progressMap);
      alert('Progresso exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar progresso:', error);
      alert('Erro ao exportar progresso.');
    }
  }, [progressMap]);

  /**
   * Importa progresso
   */
  const handleImportProgress = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = importProgress(event.target?.result as string);
          setProgressMap(imported);
          alert('Progresso importado com sucesso!');
        } catch (error) {
          console.error('Erro ao importar progresso:', error);
          alert('Erro ao importar progresso. Verifique se o arquivo é válido.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  /**
   * Reseta progresso
   */
  const handleResetProgress = useCallback(() => {
    if (!confirm('Tem certeza que deseja resetar todo o progresso? Esta ação não pode ser desfeita.')) {
      return;
    }
    resetProgressUtil();
    setProgressMap({});
    alert('Progresso resetado com sucesso!');
  }, []);

  /**
   * Lista de assuntos disponíveis (ordenados)
   */
  const availableSubjects = useMemo(() => {
    const subjects = new Set<VideoSubject>();
    videos.forEach((v) => subjects.add(v.subject as VideoSubject));

    const sorted = Array.from(subjects).sort((a, b) => {
      return a.localeCompare(b);
    });

    return sorted;
  }, [videos]);

  /**
   * Estatísticas da biblioteca (básicas)
   */
  const basicStats = useMemo(() => {
    const totalVideos = videos.length;
    const totalBytes = videos.reduce((sum, v) => sum + v.sizeBytes, 0);
    return {
      totalVideos,
      totalGB: totalBytes / (1024 * 1024 * 1024),
    };
  }, [videos]);

  /**
   * Vídeos filtrados para dashboard (total ou por planejamento)
   * DEVE SER DEFINIDO ANTES DE filteredVideos
   */
  const dashboardVideos = useMemo(() => {
    if (dashboardFilter !== 'total') {
      // Filtrar por planejamento específico
      const planner = allPlanners.find(p => p.id === dashboardFilter);
      if (planner) {
        return videos.filter(v => planner.selectedSubjects.includes(v.subject));
      }
    }
    // Total: todos os vídeos
    return videos;
  }, [videos, dashboardFilter, allPlanners]);

  /**
   * Filtra vídeos baseado nos filtros ativos (busca e assunto)
   * SEMPRE usa todos os vídeos (videos) - para aba Videos
   */
  const filteredVideos = useMemo(() => {
    let filtered = videos; // Sempre usar todos os vídeos na aba Videos

    // Filtro: busca por nome
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((v) => v.name.toLowerCase().includes(query));
    }

    // Filtro: assunto específico
    if (selectedSubject) {
      filtered = filtered.filter((v) => v.subject === selectedSubject);
    }

    return filtered;
  }, [videos, searchQuery, selectedSubject]);

  /**
   * Vídeos filtrados para Dashboard (com filtro de planejamento se necessário)
   */
  const dashboardFilteredVideos = useMemo(() => {
    // Usar dashboardVideos como base (já filtrado por planejamento se necessário)
    return dashboardVideos;
  }, [dashboardVideos]);

  /**
   * Vídeos agrupados por assunto para Dashboard (com filtro de planejamento)
   */
  const dashboardGroupedVideos = useMemo(() => {
    return groupVideosBySubject(dashboardFilteredVideos.map(({ file, available, ...rest }) => rest));
  }, [dashboardFilteredVideos]);

  /**
   * Agrupa vídeos filtrados por assunto
   */
  const groupedVideos = useMemo(() => {
    return groupVideosBySubject(filteredVideos.map(({ file, available, ...rest }) => rest));
  }, [filteredVideos]);

  /**
   * Estatísticas básicas para dashboard (pode ser total ou por planejamento)
   */
  const dashboardBasicStats = useMemo(() => {
    const totalVideos = dashboardVideos.length;
    const totalBytes = dashboardVideos.reduce((sum, v) => sum + v.sizeBytes, 0);
    return {
      totalVideos,
      totalGB: totalBytes / (1024 * 1024 * 1024),
    };
  }, [dashboardVideos]);

  /**
   * Estatísticas de progresso (pode ser total ou por planejamento)
   */
  const progressStats = useMemo(() => {
    return calculateProgressStats(dashboardVideos, progressMap);
  }, [dashboardVideos, progressMap]);

  /**
   * Dados para gráfico Gantt de progresso Real vs Previsto
   */
  const ganttChartData = useMemo(() => {
    // Só mostra gráfico se houver um planejamento selecionado
    if (dashboardFilter === 'total' || !schedule) {
      return null;
    }

    const planner = allPlanners.find(p => p.id === dashboardFilter);
    if (!planner) return null;

    const startDate = new Date(planner.startDateISO);
    const endDate = new Date(planner.endDateISO);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calcular posição de hoje em percentual do tempo total
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsedDuration = today.getTime() - startDate.getTime();
    const todayPosition = totalDuration > 0 
      ? Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100))
      : 0;

    // Calcular total de horas de vídeo
    const totalVideoHours = dashboardVideos.reduce((sum, v) => {
      const duration = v.duration || progressMap[v.videoId]?.duration || 0;
      return sum + (duration / 3600);
    }, 0);

    // Calcular horas assistidas (Real)
    const watchedVideoHours = dashboardVideos.reduce((sum, v) => {
      const progress = progressMap[v.videoId];
      if (progress?.watched) {
        const duration = v.duration || progress.duration || 0;
        return sum + (duration / 3600);
      } else if (progress?.watchedSeconds) {
        return sum + (progress.watchedSeconds / 3600);
      }
      return sum;
    }, 0);

    // Calcular progresso real (percentual acumulado até hoje)
    const real = totalVideoHours > 0 
      ? (watchedVideoHours / totalVideoHours) * 100 
      : 0;

    // Calcular progresso previsto: sempre igual à posição de hoje no tempo
    // Se estamos em X% do tempo total, deveríamos ter assistido X% do conteúdo
    const previsto = todayPosition;

    // Retornar dados para duas barras horizontais + posição de hoje
    return {
      bars: [
        {
          tipo: 'Real',
          valor: Math.min(100, Math.max(0, real)),
        },
        {
          tipo: 'Previsto',
          valor: Math.min(100, Math.max(0, previsto)),
        },
      ],
      todayPosition: todayPosition,
    };
  }, [dashboardFilter, schedule, allPlanners, dashboardVideos, progressMap]);

  const hasLibrary = videos.length > 0;
  const selectedVideoProgress = selectedVideo ? progressMap[selectedVideo.videoId] : undefined;

  return (
    <div className="fixed inset-0 flex overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Conector de biblioteca */}
        <div className="flex-shrink-0 p-3 bg-gray-50 border-b border-gray-200 space-y-2">
          {/* Seletor de biblioteca salva */}
          {libraries.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-700 whitespace-nowrap">Biblioteca:</label>
              <select
                value={selectedLibraryId || ''}
                onChange={async (e) => {
                  const libraryId = e.target.value;
                  if (libraryId) {
                    const library = await loadLibraryFromFirestore(libraryId);
                    if (library) {
                      setSelectedLibraryId(libraryId);
                      setSelectedLibrary(library);
                      const loadedVideos: VideoFile[] = library.videos.map((v) => ({
                        ...v,
                        file: undefined,
                        available: undefined,
                      }));
                      setVideos(loadedVideos);
                      
                      // Atualizar progressMap com durações salvas
                      const updatedProgress: ProgressMap = {};
                      library.videos.forEach(v => {
                        if (v.duration !== null && v.duration !== undefined) {
                          updatedProgress[v.videoId] = {
                            watched: false,
                            lastPosition: 0,
                            watchedSeconds: 0,
                            duration: v.duration,
                            updatedAt: Date.now(),
                          };
                        }
                      });
                      setProgressMap(updatedProgress);
                      
                      // Limpar planejamento e cronograma ao trocar biblioteca
                      setSelectedPlannerId(null);
                      setSelectedPlanner(null);
                      setSchedule(null);
                    }
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs border border-gray-300 rounded bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {libraries.map((lib) => (
                  <option key={lib.id} value={lib.id}>
                    {lib.name} ({lib.videos.length} vídeos)
                  </option>
                ))}
              </select>
              {selectedLibraryId && (
                <button
                  onClick={() => handleDeleteLibrary(selectedLibraryId)}
                  className="px-2 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                  title="Excluir biblioteca"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
          
          {/* Loading ao salvar biblioteca */}
          {isSavingLibrary && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm font-medium text-blue-900">
                  Salvando biblioteca e carregando durações...
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${saveLibraryProgress.total > 0 ? (saveLibraryProgress.current / saveLibraryProgress.total) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-blue-700 mt-1">
                {saveLibraryProgress.current} de {saveLibraryProgress.total} vídeos processados
              </p>
            </div>
          )}
          
          <LibraryConnector
            onLibraryLoaded={handleLibraryLoaded}
            onLibraryRelinked={handleLibraryRelinked}
            onClearLibrary={handleClearLibrary}
            onSaveLibrary={undefined}
            hasLibrary={hasLibrary}
            existingVideos={videos}
            isCreatingNewLibrary={isCreatingNewLibrary}
            onCancelNewLibrary={handleCancelNewLibrary}
            libraries={libraries}
          />
        </div>

        {hasLibrary && (
          <>
            {/* Tabs de navegação */}
            <div className="flex-shrink-0 border-b border-gray-200 bg-white">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('planner')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === 'planner'
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
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
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
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
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Video className="w-4 h-4" />
                    <span>Vídeos</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === 'schedule'
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
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

            {/* Conteúdo das tabs */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'planner' && (
                <div className="p-4">
                        <StudyPlanner
                          videos={videos}
                          progressMap={progressMap}
                          availableSubjects={availableSubjects}
                          libraryId={selectedLibraryId}
                          scheduleSettings={scheduleSettings}
                          onScheduleSettingsChange={setScheduleSettings}
                          selectedPlannerId={selectedPlannerId}
                          onPlannerChange={handlePlannerChange}
                        />
                </div>
              )}

              {activeTab === 'dashboard' && (
                <div className="p-4 space-y-4">
                  {/* Dashboard/Resumo */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-base font-semibold text-gray-900">Dashboard</h2>
                      {/* Filtro e botões de import/export */}
                      <div className="flex items-center gap-2">
                        {/* Filtro Total/Planejamento */}
                        <select
                          value={dashboardFilter}
                          onChange={(e) => setDashboardFilter(e.target.value)}
                          className="px-2.5 py-1 text-xs bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                          <option value="total">Total</option>
                          {allPlanners.map((planner) => (
                            <option key={planner.id} value={planner.id || ''}>
                              {planner.name || `Planejamento ${planner.id?.substring(0, 8)}`}
                            </option>
                          ))}
                        </select>
                        {/* Botões de import/export */}
                        <button
                          onClick={handleExportProgress}
                          className="px-2.5 py-1 text-xs bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                          title="Exportar Progresso"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Exportar
                        </button>
                        <button
                          onClick={handleImportProgress}
                          className="px-2.5 py-1 text-xs bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 transition-colors flex items-center gap-1.5"
                          title="Importar Progresso"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Importar
                        </button>
                        <button
                          onClick={handleResetProgress}
                          className="px-2.5 py-1 text-xs bg-white text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors flex items-center gap-1.5"
                          title="Resetar Progresso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Resetar
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {/* Total de vídeos */}
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">Total de Vídeos</p>
                        <p className="text-xl font-bold text-blue-600">{dashboardBasicStats.totalVideos}</p>
                      </div>

                      {/* Vídeos assistidos */}
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">Assistidos</p>
                        <p className="text-xl font-bold text-green-600">
                          {progressStats.watched} ({progressStats.watchedPercentage.toFixed(1)}%)
                        </p>
                      </div>

                      {/* Horas totais */}
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">
                          Horas Totais {progressStats.hasPartialData && '(parcial)'}
                        </p>
                        <p className="text-xl font-bold text-indigo-600">
                          {progressStats.totalHours.toFixed(1)}h
                        </p>
                      </div>

                      {/* Horas assistidas */}
                      <div>
                        <p className="text-xs text-gray-600 mb-0.5">Horas Assistidas</p>
                        <p className="text-xl font-bold text-purple-600">
                          {progressStats.watchedHours.toFixed(1)}h
                        </p>
                      </div>
                    </div>

                    {/* Total GB */}
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-xs text-gray-600">
                        Tamanho total: <span className="font-semibold">{dashboardBasicStats.totalGB.toFixed(2)} GB</span>
                      </p>
                    </div>
                  </div>

                  {/* Gráfico Gantt - Progresso Real vs Previsto */}
                  {ganttChartData && ganttChartData.bars && ganttChartData.bars.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Progresso Real vs Previsto</h3>
                      <ResponsiveContainer width="100%" height={120}>
                        <BarChart 
                          data={ganttChartData.bars} 
                          layout="vertical"
                          margin={{ top: 10, right: 30, left: 80, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            type="number"
                            domain={[0, 100]}
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value) => `${value}%`}
                          />
                          <YAxis 
                            type="category"
                            dataKey="tipo"
                            tick={{ fontSize: 12, fontWeight: 500 }}
                            width={70}
                          />
                          <Tooltip 
                            formatter={(value: number) => `${value.toFixed(1)}%`}
                            labelStyle={{ fontSize: 11 }}
                            contentStyle={{ fontSize: 11 }}
                          />
                          <ReferenceLine 
                            x={ganttChartData.todayPosition} 
                            stroke="#f59e0b" 
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            label={{ value: "Hoje", position: "top", fontSize: 10, fill: "#f59e0b" }}
                          />
                          <Bar 
                            dataKey="valor" 
                            radius={[0, 8, 8, 0]}
                          >
                            {ganttChartData.bars.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.tipo === 'Real' ? '#ef4444' : '#3b82f6'} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Andamento por Assunto */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Andamento por Assunto</h3>
                    <div className="space-y-3">
                      {Array.from(dashboardGroupedVideos.entries()).map(([subject, subjectVideos]) => {
                        const subjectProgress = subjectVideos.reduce((acc, v) => {
                          // Priorizar duração do vídeo (salvo no Firestore), depois progressMap
                          const videoDuration = v.duration !== null && v.duration !== undefined && v.duration > 0
                            ? v.duration
                            : (progressMap[v.videoId]?.duration || 0);
                          
                          const progress = progressMap[v.videoId];
                          acc.total += videoDuration;
                          acc.watched += progress?.watched ? videoDuration : (progress?.watchedSeconds || 0);
                          return acc;
                        }, { total: 0, watched: 0 });

                        const watchedCount = subjectVideos.filter(v => {
                          const progress = progressMap[v.videoId];
                          return progress?.watched;
                        }).length;

                        const percentage = subjectVideos.length > 0 
                          ? (watchedCount / subjectVideos.length) * 100 
                          : 0;
                        
                        const hoursTotal = subjectProgress.total / 3600;
                        const hoursWatched = subjectProgress.watched / 3600;
                        const hoursPercentage = hoursTotal > 0 ? (hoursWatched / hoursTotal) * 100 : 0;

                        return (
                          <div key={subject} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-medium text-gray-900">{subject}</h4>
                              <span className="text-xs text-gray-500">{subjectVideos.length} vídeos</span>
                            </div>
                            <div className="space-y-1.5">
                              {/* Progresso por vídeos */}
                              <div>
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-gray-600">Vídeos assistidos</span>
                                  <span className="font-medium text-gray-700">
                                    {watchedCount}/{subjectVideos.length} ({percentage.toFixed(1)}%)
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className="bg-green-500 h-1.5 rounded-full transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                              {/* Progresso por tempo */}
                              {hoursTotal > 0 && (
                                <div>
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-gray-600">Tempo assistido</span>
                                    <span className="font-medium text-gray-700">
                                      {hoursWatched.toFixed(1)}h / {hoursTotal.toFixed(1)}h ({hoursPercentage.toFixed(1)}%)
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                                    <div
                                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                                      style={{ width: `${hoursPercentage}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'videos' && (
                <div className="p-4 space-y-3">
                  {/* Busca e filtros */}
                  <SearchAndFilters
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    selectedSubject={selectedSubject}
                    onSubjectChange={setSelectedSubject}
                    availableSubjects={availableSubjects}
                  />

                  {/* Lista agrupada por assunto */}
                  <div>
                    {Array.from(groupedVideos.entries()).map(([subject, subjectVideos]) => (
                      <SubjectAccordion
                        key={subject}
                        subject={subject}
                        videos={subjectVideos.map((v) => {
                          const fullVideo = videos.find((fv) => fv.videoId === v.videoId);
                          return fullVideo ? fullVideo : v;
                        })}
                        searchQuery={searchQuery}
                        progressMap={progressMap}
                        selectedVideoId={selectedVideo?.videoId || null}
                        onVideoClick={handleVideoClick}
                        onMarkWatched={handleMarkWatched}
                        onMarkUnwatched={handleMarkUnwatched}
                        onCommentsClick={handleCommentsClick}
                      />
                    ))}
                  </div>

                  {/* Mensagem quando não há resultados */}
                  {groupedVideos.size === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-500">Nenhum vídeo encontrado com os filtros aplicados.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'schedule' && (
                <div className="p-4">
                  <ScheduleCalendar
                    schedule={schedule}
                    progressMap={progressMap}
                    onItemClick={handleScheduleItemClick}
                    onlyFuture={onlyFutureSchedule}
                    onlyUncompleted={onlyUncompletedSchedule}
                    onOnlyFutureChange={setOnlyFutureSchedule}
                    onOnlyUncompletedChange={setOnlyUncompletedSchedule}
                    onCommentsClick={(videoId, videoName) => handleCommentsClick({ videoId, name: videoName })}
                    videos={videos}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Lado direito - Player fixo (apenas quando há biblioteca) */}
      {hasLibrary && (
        <div className="w-1/2 border-l border-gray-200 flex-shrink-0">
              <VideoPlayer
                video={selectedVideo}
                progress={selectedVideoProgress}
                onProgressUpdate={handleProgressUpdate}
                startTime={selectedVideoStartTime}
                onCommentsClick={selectedVideo ? () => handleCommentsClick(selectedVideo) : undefined}
              />
        </div>
      )}
      
      {/* Modal de comentários */}
      {commentsModal && commentsModal.isOpen && (
        <VideoCommentsModal
          videoId={commentsModal.videoId}
          videoName={commentsModal.videoName}
          comments={progressMap[commentsModal.videoId]?.comments}
          onSave={handleSaveComments}
          onClose={handleCloseCommentsModal}
          isMinimized={commentsModal.isMinimized}
          onToggleMinimize={handleToggleMinimizeComments}
          position={commentsModal.position}
          onPositionChange={handleCommentsPositionChange}
          size={commentsModal.size}
          onSizeChange={handleCommentsSizeChange}
        />
      )}

      {/* Modal para salvar biblioteca */}
      {showSaveLibraryModal && pendingVideosToSave && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => {
          setShowSaveLibraryModal(false);
          setPendingVideosToSave(null);
          setLibraryNameInput('');
        }}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Salvar Biblioteca</h3>
                <button
                  onClick={() => {
                    setShowSaveLibraryModal(false);
                    setPendingVideosToSave(null);
                    setLibraryNameInput('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da Biblioteca
                  </label>
                  <input
                    type="text"
                    value={libraryNameInput}
                    onChange={(e) => setLibraryNameInput(e.target.value)}
                    placeholder="Ex: Oftreview 2023, Vídeos de Catarata, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && libraryNameInput.trim()) {
                        handleSaveLibrary(pendingVideosToSave, libraryNameInput.trim());
                      }
                    }}
                  />
                </div>
                
                <p className="text-sm text-gray-500">
                  {pendingVideosToSave.length} vídeos serão salvos. As durações serão carregadas automaticamente.
                </p>
                
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowSaveLibraryModal(false);
                      setPendingVideosToSave(null);
                      setLibraryNameInput('');
                    }}
                    className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleSaveLibrary(pendingVideosToSave, libraryNameInput.trim())}
                    disabled={!libraryNameInput.trim()}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
