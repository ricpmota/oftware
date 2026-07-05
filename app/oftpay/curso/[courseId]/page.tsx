'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getCourseById } from '@/app/oftpay/coursesConfig';
import CoursePlayer from '@/components/oftpay/CoursePlayer';
import LaudoGuiadoWorkspace from '@/components/oftpay/laudos/LaudoGuiadoWorkspace';
import type { CourseVideoItem } from '@/components/oftpay/CoursePlayer';
import type { ApostilaItem } from '@/components/oftpay/ApostilaLibrary';
import { extractVideoDuration } from '@/utils/extractVideoDuration';

export default function OftPayCursoPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = typeof params.courseId === 'string' ? params.courseId : '';
  const [authChecked, setAuthChecked] = useState(false);
  const [videos, setVideos] = useState<CourseVideoItem[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [videosDebug, setVideosDebug] = useState<{ prefix?: string; bucket?: string; totalObjectsListed?: number; hint?: string } | null>(null);

  const [apostilas, setApostilas] = useState<ApostilaItem[]>([]);
  const [apostilasLoading, setApostilasLoading] = useState(false);
  const [apostilasError, setApostilasError] = useState<string | null>(null);
  const [apostilasDebug, setApostilasDebug] = useState<{ prefix?: string; bucket?: string; totalInFolder?: number } | null>(null);

  const course = getCourseById(courseId);
  const isLaudoExames = course?.id === 'laudo-exames';

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthChecked(true);
      if (!user) {
        router.replace('/oftpay');
        return;
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    if (!course) {
      router.replace('/oftpay');
    }
  }, [authChecked, course, router]);

  // Verificar se o usuário tem acesso a este curso (proprietário tem todos; demais só os liberados)
  const [accessChecked, setAccessChecked] = useState(false);

  const checkSessionAndAccess = async (): Promise<boolean> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return false;
    try {
      const token = await firebaseUser.getIdToken();
      const res = await fetch('/api/oftpay/allowed-courses', { headers: { Authorization: `Bearer ${token}` } });
      const data = (await res.json().catch(() => ({}))) as { allowedCourseIds?: string[]; error?: string };
      if (res.status === 401 && typeof data.error === 'string' && data.error.includes('outro dispositivo')) {
        await signOut(auth);
        router.replace('/oftpay?sessionEnded=1');
        return false;
      }
      if (!res.ok) return false;
      const allowed = data.allowedCourseIds ?? [];
      return allowed.includes(courseId);
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (!authChecked || !course || !courseId) return;
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;
    let cancelled = false;
    checkSessionAndAccess().then((hasAccess) => {
      if (cancelled) return;
      if (hasAccess) setAccessChecked(true);
      else router.replace('/oftpay');
    }).catch(() => {
      if (!cancelled) router.replace('/oftpay');
    });
    return () => { cancelled = true; };
  }, [authChecked, course, courseId, router]);

  // Revalidar sessão a cada 25s e quando a aba ganha foco (encerrar sessão antiga ao logar em outro dispositivo)
  useEffect(() => {
    if (!accessChecked) return;
    const recheck = async () => {
      const hasAccess = await checkSessionAndAccess();
      if (!hasAccess) router.replace('/oftpay?sessionEnded=1');
    };
    const interval = setInterval(recheck, 25000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') recheck();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [accessChecked, courseId, router]);

  // Carregar vídeos do GCS via API quando o curso estiver definido
  useEffect(() => {
    if (!courseId || !course) return;
    if (isLaudoExames) return;
    let cancelled = false;
    setVideosLoading(true);
    setVideosError(null);
    setVideosDebug(null);
    const prefix = course.storagePath ? `${course.storagePath}/` : '';
    const url = prefix
      ? `/api/oftpay/list-videos?courseId=${encodeURIComponent(courseId)}&prefix=${encodeURIComponent(prefix)}`
      : `/api/oftpay/list-videos?courseId=${encodeURIComponent(courseId)}`;
    fetch(url)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : res.statusText);
        }
        return data;
      })
      .then((data: { videos?: CourseVideoItem[]; debug?: { prefix?: string; bucket?: string; totalObjectsListed?: number; rootFoldersFound?: string[]; hint?: string } }) => {
        if (cancelled) return;
        if (Array.isArray(data.videos)) setVideos(data.videos);
        if (data.debug) setVideosDebug(data.debug);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setVideos([]);
          setVideosError(err?.message || 'Erro ao carregar vídeos');
        }
      })
      .finally(() => {
        if (!cancelled) setVideosLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, course, isLaudoExames]);

  // Carregar apostilas (PDFs) para o curso Oftreview
  useEffect(() => {
    if (!courseId || !course) return;
    if (isLaudoExames) return;
    let cancelled = false;
    setApostilasLoading(true);
    setApostilasError(null);
    setApostilasDebug(null);
    fetch(`/api/oftpay/list-apostilas?courseId=${encodeURIComponent(courseId)}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : res.statusText);
        }
        return data;
      })
      .then((data: { apostilas?: ApostilaItem[]; debug?: { prefix?: string; bucket?: string; totalInFolder?: number } }) => {
        if (cancelled) return;
        if (Array.isArray(data.apostilas)) setApostilas(data.apostilas);
        if (data.debug) setApostilasDebug(data.debug);
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setApostilas([]);
          setApostilasError(err?.message || 'Erro ao carregar apostilas');
        }
      })
      .finally(() => {
        if (!cancelled) setApostilasLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId, course, isLaudoExames]);

  // Preencher durações faltantes: extrair no cliente (HTMLVideoElement) e salvar no Firestore
  const fillingRef = useRef(false);
  useEffect(() => {
    if (isLaudoExames) return;
    if (!courseId || !course || videos.length === 0 || videosLoading || fillingRef.current) return;
    const missing = videos.filter((v) => v.duration == null || v.duration <= 0);
    if (missing.length === 0) return;
    fillingRef.current = true;
    const libraryId = `oftpay_${courseId}`;
    let index = 0;
    const runNext = () => {
      if (index >= missing.length) {
        fillingRef.current = false;
        return;
      }
      const v = missing[index++];
      extractVideoDuration(v.url)
        .then(async (durationSeconds) => {
          await fetch('/api/oftpay/save-video-duration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              libraryId,
              videoId: v.videoId,
              storagePath: v.storagePath ?? `${v.subject || 'Geral'}/${v.name}`,
              title: v.name,
              durationSeconds,
            }),
          });
          setVideos((prev) =>
            prev.map((item) => (item.videoId === v.videoId ? { ...item, duration: Math.round(durationSeconds) } : item))
          );
        })
        .catch(() => {})
        .finally(() => runNext());
    };
    runNext();
  }, [courseId, course, videos, videosLoading, isLaudoExames]);

  const isPurple = course?.theme === 'purple';
  const spinnerColor = isPurple ? 'border-purple-600' : 'border-blue-600';

  if (!authChecked || !course || !accessChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
        <div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${spinnerColor}`} />
      </div>
    );
  }

  if (isLaudoExames) {
    return <LaudoGuiadoWorkspace courseId={course.id} courseName={course.name} />;
  }

  return (
    <CoursePlayer
      course={course}
      videos={videos}
      videosLoading={videosLoading}
      videosError={videosError}
      videosDebug={videosDebug}
      apostilas={apostilas}
      apostilasLoading={apostilasLoading}
      apostilasError={apostilasError}
      apostilasDebug={apostilasDebug}
    />
  );
}
