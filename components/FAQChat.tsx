'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, X, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

// Interface para mensagens do chat
interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  text: string;
  timestamp: Date;
}

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQChatProps {
  userName: string;
  faqItems: FAQItem[];
  position?: 'left' | 'right';
  inHeader?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

export default function FAQChat({ userName, faqItems, position = 'left', inHeader = false, onToggle }: FAQChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Inicializar com mensagem de boas-vindas apenas na primeira vez
  useEffect(() => {
    if (isOpen && !hasInitialized) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'bot',
        text: `Olá, ${userName}! 👋\n\nComo posso te ajudar hoje?`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
      setHasInitialized(true);
    }
  }, [isOpen, userName, hasInitialized]);

  const handleOptionClick = (item: FAQItem) => {
    // Fechar modal
    setShowOptionsModal(false);
    
    // Adicionar mensagem do usuário
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      text: item.question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    // Mostrar indicador de "digitando..."
    setIsTyping(true);

    // Adicionar resposta do bot após um delay (simulando digitação)
    setTimeout(() => {
      setIsTyping(false);
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        type: 'bot',
        text: item.answer,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
    }, 1500 + Math.random() * 1000); // Delay variável entre 1.5s e 2.5s para parecer mais real
  };


  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const handleToggleHidden = () => {
    setIsHidden(!isHidden);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setIsHidden(false);
    if (onToggle) onToggle(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    // Não limpar mensagens para manter o histórico
    setShowOptionsModal(false);
    // Não esconder o chat ao fechar, apenas fechar o modal
    if (onToggle) onToggle(false);
  };

  const positionClasses = inHeader 
    ? '' 
    : position === 'left' 
      ? 'fixed left-0 bottom-20 md:bottom-24' 
      : 'fixed bottom-4 right-4 md:bottom-6 md:right-6';

  // Se estiver no header e escondido, mostrar apenas o botão de aparecer
  if (inHeader && isHidden) {
    return (
      <button
        onClick={handleToggleHidden}
        className="flex items-center justify-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        title="Mostrar chat"
      >
        <ChevronRight size={20} />
      </button>
    );
  }

  // Se estiver no header e visível, mostrar o chat e botão de esconder
  if (inHeader) {
    return (
      <div className="relative">
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 bg-white rounded-xl md:rounded-2xl shadow-2xl w-[calc(100vw-2rem)] md:w-[90vw] max-w-md h-[500px] md:h-[600px] flex flex-col border border-gray-200 z-50">
            {/* Header estilo WhatsApp */}
            <div className="bg-gradient-to-r from-purple-600 to-orange-600 text-white p-3 md:p-4 rounded-t-xl md:rounded-t-2xl flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle size={18} className="md:w-6 md:h-6" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold">Oftware Assistente</h3>
                  <p className="text-xs text-white/80">Online</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                aria-label="Fechar FAQ"
              >
                <X size={18} className="md:w-5 md:h-5" />
              </button>
            </div>

                {/* Área de mensagens estilo WhatsApp */}
                <div className="flex-1 overflow-y-auto bg-[#e5ddd5] p-3 md:p-4 space-y-2 md:space-y-3" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='100' height='100' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 100 0 L 0 0 0 100' fill='none' stroke='%23d4d4d4' stroke-width='0.5'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grid)' opacity='0.3'/%3E%3C/svg%3E")`
                }}>
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] md:max-w-[80%] rounded-lg px-3 md:px-4 py-2 md:py-3 shadow-sm ${
                          message.type === 'user'
                            ? 'bg-[#dcf8c6] rounded-tr-none'
                            : 'bg-white rounded-tl-none'
                        }`}
                      >
                        <p className="text-sm md:text-base text-gray-800 whitespace-pre-line break-words">
                          {message.text}
                        </p>
                        <p className={`text-xs text-gray-500 mt-1 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Indicador de "digitando..." */}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white rounded-lg rounded-tl-none px-3 md:px-4 py-2 md:py-3 shadow-sm">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                          <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Botão para abrir modal de opções */}
                  {messages.length > 0 && !isTyping && (
                    <div className="flex justify-start mt-2">
                      <button
                        onClick={() => setShowOptionsModal(true)}
                        className="bg-white hover:bg-gray-50 rounded-lg px-4 py-2 shadow-sm border border-gray-200 transition-colors flex items-center gap-2"
                      >
                        <span className="text-sm font-medium text-gray-900">Ver opções de perguntas</span>
                        <ChevronDown size={18} className="text-gray-600" />
                      </button>
                    </div>
                  )}
                </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpen}
            className="bg-gradient-to-r from-purple-600 to-orange-600 text-white p-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
            aria-label="Abrir FAQ"
          >
            <MessageCircle size={20} />
          </button>
          <button
            onClick={handleToggleHidden}
            className="flex items-center justify-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Esconder chat"
          >
            <ChevronLeft size={20} />
          </button>
        </div>

        {/* Modal de opções de perguntas */}
        {showOptionsModal && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowOptionsModal(false)}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header do modal */}
              <div className="bg-gradient-to-r from-purple-600 to-orange-600 text-white p-4 rounded-t-xl flex items-center justify-between">
                <h3 className="text-lg font-bold">Perguntas Frequentes</h3>
                <button
                  onClick={() => setShowOptionsModal(false)}
                  className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                  aria-label="Fechar modal"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Lista de perguntas */}
              <div className="overflow-y-auto flex-1 p-4">
                <div className="space-y-2">
                  {faqItems.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => handleOptionClick(item)}
                      className="w-full text-left bg-gray-50 hover:bg-purple-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors"
                    >
                      <p className="text-sm font-medium text-gray-900">
                        {item.question}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${positionClasses} z-50`}>
      {isHidden ? (
        <button
          onClick={handleToggleHidden}
          className="flex items-center justify-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors bg-white shadow-md"
          title="Mostrar chat"
        >
          <ChevronRight size={20} />
        </button>
      ) : (
        <div className="flex items-center gap-2">
          {/* Ícone do chat - sempre visível quando não está escondido */}
          {!isOpen ? (
            <button
              onClick={handleOpen}
              className="bg-gradient-to-r from-purple-600 to-orange-600 text-white p-3 md:p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group"
              aria-label="Abrir FAQ"
            >
              <MessageCircle size={24} className="md:w-7 md:h-7 group-hover:scale-110 transition-transform" />
            </button>
          ) : (
            <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl w-[calc(100vw-1rem)] md:w-[90vw] max-w-md h-[500px] md:h-[600px] flex flex-col border border-gray-200 animate-expand-in">
                {/* Header estilo WhatsApp */}
                <div className="bg-gradient-to-r from-purple-600 to-orange-600 text-white p-3 md:p-4 rounded-t-xl md:rounded-t-2xl flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 flex items-center justify-center">
                      <MessageCircle size={18} className="md:w-6 md:h-6" />
                    </div>
                    <div>
                      <h3 className="text-base md:text-lg font-bold">Oftware Assistente</h3>
                      <p className="text-xs text-white/80">Online</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                    aria-label="Fechar FAQ"
                  >
                    <X size={18} className="md:w-5 md:h-5" />
                  </button>
                </div>

              {/* Área de mensagens estilo WhatsApp */}
              <div className="flex-1 overflow-y-auto bg-[#e5ddd5] p-3 md:p-4 space-y-2 md:space-y-3" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='100' height='100' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 100 0 L 0 0 0 100' fill='none' stroke='%23d4d4d4' stroke-width='0.5'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23grid)' opacity='0.3'/%3E%3C/svg%3E")`
              }}>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] md:max-w-[80%] rounded-lg px-3 md:px-4 py-2 md:py-3 shadow-sm ${
                        message.type === 'user'
                          ? 'bg-[#dcf8c6] rounded-tr-none'
                          : 'bg-white rounded-tl-none'
                      }`}
                    >
                      <p className="text-sm md:text-base text-gray-800 whitespace-pre-line break-words">
                        {message.text}
                      </p>
                      <p className={`text-xs text-gray-500 mt-1 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Indicador de "digitando..." */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white rounded-lg rounded-tl-none px-3 md:px-4 py-2 md:py-3 shadow-sm">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Botão para abrir modal de opções */}
                {messages.length > 0 && !isTyping && (
                  <div className="flex justify-start mt-2">
                    <button
                      onClick={() => setShowOptionsModal(true)}
                      className="bg-white hover:bg-gray-50 rounded-lg px-4 py-2 shadow-sm border border-gray-200 transition-colors flex items-center gap-2"
                    >
                      <span className="text-sm font-medium text-gray-900">Ver opções de perguntas</span>
                      <ChevronDown size={18} className="text-gray-600" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Botão de esconder - sempre visível quando não está escondido */}
          <button
            onClick={handleToggleHidden}
            className="flex items-center justify-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors bg-white shadow-md"
            title="Esconder chat"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
      )}

      {/* Modal de opções de perguntas */}
      {showOptionsModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowOptionsModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header do modal */}
            <div className="bg-gradient-to-r from-purple-600 to-orange-600 text-white p-4 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold">Perguntas Frequentes</h3>
              <button
                onClick={() => setShowOptionsModal(false)}
                className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                aria-label="Fechar modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Lista de perguntas */}
            <div className="overflow-y-auto flex-1 p-4">
              <div className="space-y-2">
                {faqItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleOptionClick(item)}
                    className="w-full text-left bg-gray-50 hover:bg-purple-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {item.question}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

