/**
 * Utilitários para biblioteca de vídeos
 */

import { VideoFile, VideoSubject } from '@/types/videoLibrary';
import { fnv1aHash } from './fnv1aHash';

/**
 * Extensões de vídeo suportadas
 */
const VIDEO_EXTENSIONS = ['mp4', 'mkv', 'avi', 'mov', 'webm', 'm4v', 'ts'];

/**
 * Verifica se um arquivo é um vídeo baseado na extensão
 */
export function isVideoFile(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension ? VIDEO_EXTENSIONS.includes(extension) : false;
}

/**
 * Extrai o caminho do diretório de um webkitRelativePath
 * Exemplo: "folder/subfolder/video.mp4" -> "folder/subfolder"
 */
export function extractFolderPath(webkitRelativePath: string): string {
  const parts = webkitRelativePath.split('/');
  parts.pop(); // Remove o nome do arquivo
  return parts.join('/');
}

/**
 * Remove a extensão de um nome de arquivo
 * Exemplo: "video.ts" -> "video"
 */
function removeExtension(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '');
}

/**
 * Verifica se um arquivo .ts tem uma versão .mp4 correspondente
 * @param tsFile Arquivo .ts
 * @param allFiles Lista de todos os arquivos disponíveis
 * @returns O arquivo .mp4 correspondente, ou null se não existir
 */
export function findMp4Version(tsFile: File, allFiles: File[]): File | null {
  const tsName = tsFile.name;
  const tsNameWithoutExt = removeExtension(tsName);
  const tsPath = (tsFile as any).webkitRelativePath || tsName;
  const tsFolder = extractFolderPath(tsPath);
  
  // Procurar arquivo .mp4 com o mesmo nome base na mesma pasta
  for (const file of allFiles) {
    const filePath = (file as any).webkitRelativePath || file.name;
    const fileFolder = extractFolderPath(filePath);
    const fileName = file.name;
    const fileNameWithoutExt = removeExtension(fileName);
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    // Verificar se é .mp4, mesmo nome base e mesma pasta
    if (extension === 'mp4' && 
        fileNameWithoutExt === tsNameWithoutExt && 
        fileFolder === tsFolder) {
      return file;
    }
  }
  
  return null;
}

/**
 * Processa arquivos de vídeo, priorizando .mp4 quando houver versão convertida de .ts
 * @param files Lista de todos os arquivos
 * @returns Lista de arquivos de vídeo, excluindo .ts que têm versão .mp4
 */
export function processVideoFiles(files: File[]): File[] {
  const videoFiles = files.filter(isVideoFile);
  const processedFiles: File[] = [];
  const tsFiles = videoFiles.filter(f => f.name.toLowerCase().endsWith('.ts'));
  const otherFiles = videoFiles.filter(f => !f.name.toLowerCase().endsWith('.ts'));
  
  // Adicionar arquivos não-.ts primeiro
  processedFiles.push(...otherFiles);
  
  // Processar arquivos .ts
  for (const tsFile of tsFiles) {
    const mp4Version = findMp4Version(tsFile, videoFiles);
    if (mp4Version) {
      // Se existe versão .mp4, usar ela (não adicionar o .ts)
      // Verificar se o .mp4 já não foi adicionado
      if (!processedFiles.find(f => f === mp4Version)) {
        processedFiles.push(mp4Version);
      }
    } else {
      // Se não existe versão .mp4, usar o .ts original
      processedFiles.push(tsFile);
    }
  }
  
  return processedFiles;
}

/**
 * Inferência de assunto baseado no caminho da pasta
 * A primeira pasta é a pasta mãe selecionada pelo usuário
 * A segunda pasta é o assunto real (ex: Catarata, Glaucoma, etc.)
 * Os assuntos são criados automaticamente a partir das pastas
 */
export function inferSubject(webkitRelativePath: string, fileName: string): VideoSubject {
  // Extrair partes do caminho (pastas)
  const pathParts = webkitRelativePath.split('/');
  // Remover o nome do arquivo (última parte)
  const folderParts = pathParts.slice(0, -1);
  
  // A primeira pasta é a pasta mãe selecionada (ex: "Oftreview 2023")
  // A segunda pasta é o assunto real (ex: "Catarata", "Glaucoma")
  // Usar a segunda pasta como assunto, se existir
  if (folderParts.length > 1 && folderParts[1].trim()) {
    const subjectFolder = folderParts[1].trim();
    // Capitalizar primeira letra de cada palavra
    const capitalized = subjectFolder
      .split(/[\s_-]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return capitalized;
  }
  
  // Se só há uma pasta (pasta mãe), usar ela como fallback
  if (folderParts.length > 0 && folderParts[0].trim()) {
    const firstFolder = folderParts[0].trim();
    const capitalized = firstFolder
      .split(/[\s_-]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return capitalized;
  }

  // Se não há pastas (vídeo na raiz - não deveria acontecer normalmente), 
  // usar o nome do arquivo (sem extensão)
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  const capitalized = nameWithoutExt
    .split(/[\s_-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
  return capitalized || 'Sem Assunto';
}

/**
 * Cria um objeto VideoFile a partir de um File
 */
export function createVideoFile(file: File): VideoFile {
  const webkitRelativePath = (file as any).webkitRelativePath || file.name;
  const folderPath = extractFolderPath(webkitRelativePath);
  const subject = inferSubject(webkitRelativePath, file.name);
  const videoId = fnv1aHash(`${webkitRelativePath}|${file.size}`);

  return {
    name: file.name,
    sizeBytes: file.size,
    webkitRelativePath,
    folderPath,
    subject,
    videoId,
    file, // Mantém referência ao File para acesso posterior
  };
}

/**
 * Formata bytes para formato legível (KB, MB, GB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Agrupa vídeos por assunto
 */
export function groupVideosBySubject(videos: Omit<VideoFile, 'file'>[]): Map<VideoSubject, Omit<VideoFile, 'file'>[]> {
  const grouped = new Map<VideoSubject, Omit<VideoFile, 'file'>[]>();

  for (const video of videos) {
    const subject = video.subject as VideoSubject;
    if (!grouped.has(subject)) {
      grouped.set(subject, []);
    }
    grouped.get(subject)!.push(video);
  }

  return grouped;
}
