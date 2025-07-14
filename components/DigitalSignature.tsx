'use client';

import React, { useRef, useEffect, useState } from 'react';

interface DigitalSignatureProps {
  onSignatureChange: (signature: string) => void;
  initialSignature?: string;
}

export default function DigitalSignature({ onSignatureChange, initialSignature }: DigitalSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (initialSignature) {
      setHasSignature(true);
    }
  }, [initialSignature]);

  useEffect(() => {
    // Configurar canvas quando componente montar ou assinatura inicial mudar
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = Math.min(canvas.offsetWidth, 400);
        canvas.height = Math.min(canvas.offsetHeight, 120);
        // Sempre preencher fundo branco ao montar
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Carregar assinatura inicial se existir
        if (initialSignature) {
          const img = new Image();
          img.onload = () => {
            const canvasAspect = canvas.width / canvas.height;
            const imgAspect = img.width / img.height;
            let drawWidth, drawHeight, offsetX, offsetY;
            if (imgAspect > canvasAspect) {
              drawWidth = canvas.width * 0.8;
              drawHeight = drawWidth / imgAspect;
              offsetX = (canvas.width - drawWidth) / 2;
              offsetY = (canvas.height - drawHeight) / 2;
            } else {
              drawHeight = canvas.height * 0.8;
              drawWidth = drawHeight * imgAspect;
              offsetX = (canvas.width - drawWidth) / 2;
              offsetY = (canvas.height - drawHeight) / 2;
            }
            // Preencher fundo branco antes de desenhar imagem
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
          };
          img.src = initialSignature;
        }
      }
    }
  }, [initialSignature]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    draw(e);
  };

  const compressSignature = (dataUrl: string): Promise<string> => {
    // Função para comprimir a assinatura
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    return new Promise((resolve) => {
      img.onload = () => {
        // Reduzir ainda mais o tamanho
        const maxWidth = 300;
        const maxHeight = 80;
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
        
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        if (ctx) {
          // Manter fundo transparente
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          // Usar PNG para manter transparência
          const compressed = canvas.toDataURL('image/png', 0.8);
          resolve(compressed);
        }
      };
      img.src = dataUrl;
    });
  };

  const stopDrawing = async () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const originalSignature = canvas.toDataURL('image/png', 0.8);
      const compressedSignature = await compressSignature(originalSignature);
      
      // Log do tamanho da assinatura para debug
      console.log('📏 Tamanho da assinatura original:', originalSignature.length, 'caracteres');
      console.log('📏 Tamanho da assinatura comprimida:', compressedSignature.length, 'caracteres');
      console.log('📊 Redução:', Math.round((1 - compressedSignature.length / originalSignature.length) * 100), '%');
      
      setHasSignature(true);
      onSignatureChange(compressedSignature);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    // Preencher fundo branco ao limpar
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setIsDrawing(false);
    onSignatureChange('');
  };

  return (
    <div className="space-y-3">
      {/* Canvas Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-3">
        <canvas
          ref={canvasRef}
          className="w-full h-32 border border-gray-200 rounded bg-white cursor-crosshair touch-none shadow-sm"
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* Instructions */}
      <div className="text-xs text-gray-600 text-center">
        <p>Assine na área acima usando mouse ou toque</p>
        <p className="mt-1">Mantenha o dispositivo na horizontal para melhor precisão</p>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <p className="text-sm text-gray-600">
            {hasSignature ? 'Assinatura capturada' : 'Assine na área acima'}
          </p>
          
          {hasSignature && (
            <div className="flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Válida</span>
            </div>
          )}
        </div>
        
        {hasSignature && (
          <button
            type="button"
            onClick={clearSignature}
            className="flex items-center space-x-1 text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Apagar</span>
          </button>
        )}
      </div>
    </div>
  );
} 