'use client';

import { X, MessageSquare } from 'lucide-react';
import { useState } from 'react';

interface NPSNotificationProps {
  onResponder: () => void;
  onClose?: () => void;
}

export default function NPSNotification({ onResponder, onClose }: NPSNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleFechar = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    // Limpar localStorage de fechamento se existir (para que apareça novamente ao atualizar)
    if (typeof window !== 'undefined') {
      localStorage.removeItem('nps_notificacao_fechada');
    }
    if (onClose) {
      onClose();
    }
  };

  const handleResponder = () => {
    onResponder();
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-3 md:p-4 shadow-lg z-50 relative">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start md:items-center justify-between gap-3">
          {/* Conteúdo principal - ocupa espaço disponível */}
          <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0 pr-2">
            <MessageSquare className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0 mt-0.5 md:mt-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm md:text-base leading-tight">
                Sua opinião é muito importante para nós!
              </p>
              <p className="text-xs md:text-sm opacity-90 mt-0.5 md:mt-1 leading-snug">
                Ajude-nos a melhorar respondendo nossa pesquisa de satisfação.
              </p>
            </div>
          </div>
          
          {/* Botões - alinhados à direita */}
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <button
              onClick={handleResponder}
              className="px-3 md:px-4 py-1.5 md:py-2 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors text-xs md:text-sm whitespace-nowrap"
            >
              Responder
            </button>
            <button
              onClick={handleFechar}
              className="p-1.5 md:p-2 hover:bg-white/20 active:bg-white/30 rounded-lg transition-colors flex-shrink-0"
              aria-label="Fechar"
            >
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
