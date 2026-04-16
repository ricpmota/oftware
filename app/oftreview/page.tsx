'use client';

import VideoLibrary from '@/components/oftreview/VideoLibrary';

/**
 * Página principal do sistema de revisão de vídeos (/oftreview)
 * 
 * Funcionalidades:
 * - Seleção de pasta com vídeos
 * - Indexação e classificação automática por assunto
 * - Busca e filtros
 * - Persistência no localStorage
 */
export default function OftReviewPage() {
  return (
    <div className="fixed inset-0 overflow-hidden bg-gray-50">
      <VideoLibrary />
    </div>
  );
}
