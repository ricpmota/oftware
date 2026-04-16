'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Minimize2, Maximize2 } from 'lucide-react';

interface VideoCommentsModalProps {
  videoId: string;
  videoName: string;
  comments: string | undefined;
  onSave: (videoId: string, comments: string) => void;
  onClose: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  position?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  size?: { width: number; height: number };
  onSizeChange?: (size: { width: number; height: number }) => void;
}

/**
 * Modal draggable e minimizável para comentários de vídeo
 */
export default function VideoCommentsModal({
  videoId,
  videoName,
  comments,
  onSave,
  onClose,
  isMinimized = false,
  onToggleMinimize,
  position,
  onPositionChange,
  size,
  onSizeChange,
}: VideoCommentsModalProps) {
  const [localComments, setLocalComments] = useState(comments || '');
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, left: 0, top: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  
  // Tamanhos padrão
  const defaultSize = { width: 400, height: 500 };
  const minSize = { width: 300, height: 200 };
  const currentSize = size || defaultSize;

  // Atualizar comentários locais quando prop mudar
  useEffect(() => {
    setLocalComments(comments || '');
  }, [comments]);

  // Posição padrão (canto superior direito)
  const defaultPosition = { x: window.innerWidth - 400, y: 100 };
  const currentPosition = position || defaultPosition;

  /**
   * Inicia o arrasto do modal
   */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!headerRef.current || !modalRef.current) return;
    
    const rect = modalRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  };

  /**
   * Atualiza posição durante o arrasto
   */
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!modalRef.current) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;

      // Limitar dentro da viewport
      const maxX = window.innerWidth - modalRef.current.offsetWidth;
      const maxY = window.innerHeight - modalRef.current.offsetHeight;

      const clampedX = Math.max(0, Math.min(newX, maxX));
      const clampedY = Math.max(0, Math.min(newY, maxY));

      onPositionChange?.({ x: clampedX, y: clampedY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, onPositionChange]);

  /**
   * Inicia redimensionamento
   */
  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    if (!modalRef.current) return;

    const rect = modalRef.current.getBoundingClientRect();
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top,
    });
    setResizeHandle(handle);
    setIsResizing(true);
  };

  /**
   * Atualiza tamanho durante redimensionamento
   */
  useEffect(() => {
    if (!isResizing || !resizeHandle || !modalRef.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;

      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = resizeStart.left;
      let newY = resizeStart.top;

      // Redimensionar baseado no handle
      if (resizeHandle.includes('right')) {
        newWidth = resizeStart.width + deltaX;
      }
      if (resizeHandle.includes('left')) {
        newWidth = resizeStart.width - deltaX;
        newX = resizeStart.left + deltaX;
      }
      if (resizeHandle.includes('bottom')) {
        newHeight = resizeStart.height + deltaY;
      }
      if (resizeHandle.includes('top')) {
        newHeight = resizeStart.height - deltaY;
        newY = resizeStart.top + deltaY;
      }

      // Limitar tamanhos mínimos e máximos
      const maxWidth = window.innerWidth - newX;
      const maxHeight = window.innerHeight - newY;

      newWidth = Math.max(minSize.width, Math.min(newWidth, maxWidth));
      newHeight = Math.max(minSize.height, Math.min(newHeight, maxHeight));

      // Limitar posição dentro da viewport
      if (resizeHandle.includes('left')) {
        const maxLeft = window.innerWidth - minSize.width;
        if (newX < 0) {
          newWidth += newX;
          newX = 0;
        } else if (newX > maxLeft) {
          newX = maxLeft;
          newWidth = window.innerWidth - maxLeft;
        }
      }
      if (resizeHandle.includes('top')) {
        const maxTop = window.innerHeight - minSize.height;
        if (newY < 0) {
          newHeight += newY;
          newY = 0;
        } else if (newY > maxTop) {
          newY = maxTop;
          newHeight = window.innerHeight - maxTop;
        }
      }

      onSizeChange?.({ width: newWidth, height: newHeight });
      if (resizeHandle.includes('left') || resizeHandle.includes('top')) {
        onPositionChange?.({ x: newX, y: newY });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeHandle(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeHandle, resizeStart, onSizeChange, onPositionChange]);

  /**
   * Salva comentários
   */
  const handleSave = () => {
    onSave(videoId, localComments);
  };

  if (isMinimized) {
    return (
      <div
        ref={modalRef}
        className="fixed bg-white border border-gray-300 rounded-lg shadow-lg z-[9999] cursor-move"
        style={{
          left: `${currentPosition.x}px`,
          top: `${currentPosition.y}px`,
          width: '200px',
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center justify-between p-2 bg-blue-50 border-b border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <MessageSquare className="w-4 h-4" />
            <span className="truncate flex-1">{videoName}</span>
          </div>
          <div className="flex items-center gap-1">
            {onToggleMinimize && (
              <button
                onClick={onToggleMinimize}
                className="p-1 hover:bg-blue-100 rounded transition-colors"
                title="Expandir"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-red-100 rounded transition-colors"
              title="Fechar"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Renderiza handles de redimensionamento
  const renderResizeHandles = () => {
    if (isMinimized) return null;
    
    const handles = [
      { position: 'top', className: 'top-0 left-0 right-0 h-1 cursor-ns-resize' },
      { position: 'bottom', className: 'bottom-0 left-0 right-0 h-1 cursor-ns-resize' },
      { position: 'left', className: 'top-0 bottom-0 left-0 w-1 cursor-ew-resize' },
      { position: 'right', className: 'top-0 bottom-0 right-0 w-1 cursor-ew-resize' },
      { position: 'top-left', className: 'top-0 left-0 w-3 h-3 cursor-nwse-resize' },
      { position: 'top-right', className: 'top-0 right-0 w-3 h-3 cursor-nesw-resize' },
      { position: 'bottom-left', className: 'bottom-0 left-0 w-3 h-3 cursor-nesw-resize' },
      { position: 'bottom-right', className: 'bottom-0 right-0 w-3 h-3 cursor-nwse-resize' },
    ];

    return (
      <>
        {handles.map((handle) => (
          <div
            key={handle.position}
            className={`absolute ${handle.className} hover:bg-blue-400 transition-colors z-10`}
            onMouseDown={(e) => handleResizeStart(e, handle.position)}
            style={{
              backgroundColor: isResizing && resizeHandle === handle.position ? 'rgb(96 165 250)' : 'transparent',
            }}
          />
        ))}
      </>
    );
  };

  return (
    <div
      ref={modalRef}
      className="fixed bg-white border border-gray-300 rounded-lg shadow-xl z-[9999]"
      style={{
        left: `${currentPosition.x}px`,
        top: `${currentPosition.y}px`,
        width: `${currentSize.width}px`,
        height: isMinimized ? 'auto' : `${currentSize.height}px`,
        maxHeight: isMinimized ? 'none' : `${window.innerHeight - currentPosition.y - 20}px`,
        minWidth: `${minSize.width}px`,
        minHeight: isMinimized ? 'auto' : `${minSize.height}px`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header draggable */}
      <div
        ref={headerRef}
        className="flex items-center justify-between p-3 bg-blue-50 border-b border-gray-200 cursor-move rounded-t-lg"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">Comentários</h3>
          <span className="text-xs text-gray-500 truncate max-w-[200px]">{videoName}</span>
        </div>
        <div className="flex items-center gap-1">
          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className="p-1.5 hover:bg-blue-100 rounded transition-colors"
              title="Minimizar"
            >
              <Minimize2 className="w-4 h-4 text-gray-600" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-red-100 rounded transition-colors"
            title="Fechar"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Handles de redimensionamento */}
      {renderResizeHandles()}

      {/* Conteúdo */}
      <div className="flex-1 flex flex-col p-4 overflow-hidden" style={{ minHeight: 0 }}>
        <textarea
          value={localComments}
          onChange={(e) => setLocalComments(e.target.value)}
          placeholder="Adicione seus comentários sobre este vídeo..."
          className="flex-1 w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          style={{ minHeight: '100px' }}
        />
      </div>

      {/* Footer com botões */}
      <div className="flex items-center justify-end gap-2 p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
        >
          Salvar
        </button>
      </div>
    </div>
  );
}
