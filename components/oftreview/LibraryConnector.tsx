'use client';

import { useRef, useState } from 'react';
import { FolderOpen, Save } from 'lucide-react';
import { VideoFile } from '@/types/videoLibrary';
import { processVideoFiles, createVideoFile } from '@/utils/videoLibraryUtils';
import { LibraryIndex } from '@/types/videoLibrary';

interface LibraryConnectorProps {
  onLibraryLoaded: (videos: VideoFile[]) => void;
  onLibraryRelinked: (videos: VideoFile[]) => void;
  onClearLibrary: () => void;
  onSaveLibrary?: (videos: VideoFile[]) => void;
  hasLibrary: boolean;
  existingVideos: VideoFile[];
  isCreatingNewLibrary?: boolean;
  onCancelNewLibrary?: () => void;
  libraries?: Array<{ id?: string; name: string }>;
}

/**
 * Componente responsável por selecionar pasta e carregar vídeos
 * Também lida com persistência no localStorage e relink de Files
 */
export default function LibraryConnector({ 
  onLibraryLoaded, 
  onLibraryRelinked,
  onClearLibrary,
  onSaveLibrary,
  hasLibrary, 
  existingVideos,
  isCreatingNewLibrary = false,
  onCancelNewLibrary,
  libraries = []
}: LibraryConnectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Carrega biblioteca do localStorage
   */
  const loadFromLocalStorage = (): LibraryIndex | null => {
    try {
      const stored = localStorage.getItem('videoLibraryIndex');
      if (!stored) return null;
      return JSON.parse(stored) as LibraryIndex;
    } catch (error) {
      console.error('Erro ao carregar biblioteca do localStorage:', error);
      return null;
    }
  };

  /**
   * Salva biblioteca no localStorage (sem objetos File)
   */
  const saveToLocalStorage = (videos: VideoFile[]) => {
    try {
      const libraryIndex: LibraryIndex = {
        videos: videos.map(({ file, ...rest }) => rest), // Remove o objeto File
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem('videoLibraryIndex', JSON.stringify(libraryIndex));
    } catch (error) {
      console.error('Erro ao salvar biblioteca no localStorage:', error);
    }
  };

  /**
   * Processa arquivos selecionados
   */
  const handleFolderSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);

    try {
      // Processar vídeos (priorizar .mp4 quando houver versão convertida de .ts)
      const videoFiles: File[] = processVideoFiles(Array.from(files));

      console.log(`Total de arquivos: ${files.length}, Vídeos processados: ${videoFiles.length}`);

      if (videoFiles.length === 0) {
        alert('Nenhum vídeo encontrado na pasta selecionada.\n\nFormatos suportados: mp4, mkv, avi, mov, webm, m4v, ts');
        setIsLoading(false);
        return;
      }

      // Se já existe biblioteca, fazer relink (associar Files aos vídeos existentes)
      if (hasLibrary && existingVideos.length > 0) {
        // Criar mapa de videoId -> File para lookup rápido
        const fileMap = new Map<string, File>();
        videoFiles.forEach((file) => {
          const videoFile = createVideoFile(file);
          fileMap.set(videoFile.videoId, file);
        });

        // Atualizar vídeos existentes com Files quando disponíveis
        const relinkedVideos: VideoFile[] = existingVideos.map((existingVideo) => {
          const file = fileMap.get(existingVideo.videoId);
          return {
            ...existingVideo,
            file,
            available: file !== undefined,
          };
        });

        // Marcar vídeos não encontrados como indisponíveis
        relinkedVideos.forEach((video) => {
          if (!video.file) {
            video.available = false;
          }
        });

        console.log(`Biblioteca relinkada: ${relinkedVideos.filter(v => v.available).length}/${relinkedVideos.length} vídeos disponíveis`);

        // Salvar no localStorage (sem objetos File)
        saveToLocalStorage(relinkedVideos);

        // Notificar componente pai
        onLibraryRelinked(relinkedVideos);
      } else {
        // Criar novos objetos VideoFile
        const videos: VideoFile[] = videoFiles.map((file) => ({
          ...createVideoFile(file),
          available: true,
        }));

        console.log(`Vídeos processados: ${videos.length}`);

        // Salvar no localStorage (sem objetos File)
        saveToLocalStorage(videos);

        // Notificar componente pai
        onLibraryLoaded(videos);
      }
    } catch (error) {
      console.error('Erro ao processar arquivos:', error);
      alert('Erro ao processar arquivos. Tente novamente.');
    } finally {
      setIsLoading(false);
      // Resetar input para permitir selecionar a mesma pasta novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };


  return (
    <div className="w-full">
      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        // @ts-ignore - webkitdirectory e directory são atributos não-padrão mas suportados pelos navegadores
        webkitdirectory=""
        // @ts-ignore
        directory=""
        multiple
        onChange={handleFolderSelect}
        className="hidden"
      />

      {hasLibrary ? (
        /* Biblioteca já carregada */
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FolderOpen className="w-4 h-4" />
            <span>Biblioteca carregada ({existingVideos.length} vídeos)</span>
            {existingVideos.some(v => !v.file) && (
              <span className="text-xs text-orange-600">(arquivos não carregados)</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Botão para relinkar arquivos se não houver files */}
            {existingVideos.some(v => !v.file) && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Selecionar pasta para carregar arquivos de vídeo"
              >
                <FolderOpen className="w-3 h-3" />
                Carregar Arquivos
              </button>
            )}
            {onSaveLibrary && (
              <button
                onClick={() => onSaveLibrary(existingVideos)}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Salvar biblioteca no Firestore"
              >
                <Save className="w-3 h-3" />
                Salvar Biblioteca
              </button>
            )}
            <button
              onClick={onClearLibrary}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Limpar seleção para criar uma nova biblioteca"
            >
              Nova Biblioteca
            </button>
          </div>
        </div>
      ) : (
        /* Sem biblioteca - mostrar botão de selecionar pasta */
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="mx-auto flex flex-col items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <FolderOpen className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">Selecionar Pasta</p>
                <p className="text-sm text-gray-500 mt-1">
                  {isLoading ? 'Processando arquivos...' : 'Selecione uma pasta com vídeos'}
                </p>
              </div>
            </button>
            
            {/* Botão de cancelar se estiver criando nova biblioteca */}
            {isCreatingNewLibrary && onCancelNewLibrary && libraries.length > 0 && (
              <button
                onClick={onCancelNewLibrary}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                Cancelar e voltar para bibliotecas existentes
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
