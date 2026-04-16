/**
 * Converte CourseVideoItem (GCS) para o formato VideoFile usado pelo planejador e gerador de cronograma.
 * Duração: usa valor real (Firestore/cliente). Sem fallback fixo; 0 quando não conhecida.
 */
import type { VideoFile } from '@/types/videoLibrary';
import type { CourseVideoItem } from './CoursePlayer';

export function courseVideosToVideoFiles(videos: CourseVideoItem[]): VideoFile[] {
  return videos.map((v) => ({
    name: v.name,
    sizeBytes: 0,
    webkitRelativePath: '',
    folderPath: v.subject,
    subject: v.subject,
    videoId: v.videoId,
    duration: v.duration != null && v.duration > 0 ? v.duration : 0,
  }));
}
