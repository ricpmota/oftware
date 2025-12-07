'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, X, ChevronDown, ChevronLeft, ChevronRight, UtensilsCrossed, Stethoscope, Pill, AlertTriangle, Target, Shield, Users } from 'lucide-react';
import { FAQItem, faqPlatformClient, faqPlatformDoctor, faqMedicamento, faqEfeitosColaterais, faqResultados, faqSeguranca, nutriFaqItems } from '@/components/faqData';

// Interface para mensagens do chat
interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  text: string;
  timestamp: Date;
}

interface FAQChatProps {
  userName: string;
  position?: 'left' | 'right';
  inHeader?: boolean;
  onToggle?: (isOpen: boolean) => void;
}

type CategoryType = 'plataforma' | 'medicamento' | 'efeitos' | 'nutri' | 'resultados' | 'seguranca' | 'medico' | null;
type PlatformSubType = 'paciente' | 'medico' | null;

export default function FAQChat({ userName, position = 'left', inHeader = false, onToggle }: FAQChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showMainModal, setShowMainModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<CategoryType>(null);
  const [platformSubType, setPlatformSubType] = useState<PlatformSubType>(null);
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

  const handleCategoryClick = (category: CategoryType) => {
    setShowMainModal(false);
    
    if (category === 'plataforma') {
      // Para plataforma, primeiro mostrar modal de escolha
      setPlatformSubType(null);
      setCurrentCategory('plataforma');
      setShowCategoryModal(true);
    } else if (category === 'medico') {
      // Para médico, abrir diretamente
      setCurrentCategory('medico');
      setShowCategoryModal(true);
    } else {
      setCurrentCategory(category);
      setShowCategoryModal(true);
    }
  };

  const handlePlatformSubTypeClick = (subType: PlatformSubType) => {
    setPlatformSubType(subType);
  };

  const handleQuestionClick = (item: FAQItem) => {
    // Fechar modal
    setShowCategoryModal(false);
    setCurrentCategory(null);
    setPlatformSubType(null);
    
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

  const getCategoryItems = (): FAQItem[] => {
    if (currentCategory === 'plataforma') {
      return platformSubType === 'paciente' ? faqPlatformClient : faqPlatformDoctor;
    } else if (currentCategory === 'medicamento') {
      return faqMedicamento;
    } else if (currentCategory === 'efeitos') {
      return faqEfeitosColaterais;
    } else if (currentCategory === 'nutri') {
      return nutriFaqItems;
    } else if (currentCategory === 'resultados') {
      return faqResultados;
    } else if (currentCategory === 'seguranca') {
      return faqSeguranca;
    } else if (currentCategory === 'medico') {
      return faqPlatformDoctor;
    }
    return [];
  };

  const getCategoryTitle = (): string => {
    if (currentCategory === 'plataforma') {
      return platformSubType === 'paciente' ? 'Como funciona a plataforma (Paciente)' : 'Como funciona a plataforma (Médico)';
    } else if (currentCategory === 'medicamento') {
      return 'Medicamento';
    } else if (currentCategory === 'efeitos') {
      return 'Efeitos colaterais';
    } else if (currentCategory === 'nutri') {
      return 'Nutrição e cardápio';
    } else if (currentCategory === 'resultados') {
      return 'Resultados e metas';
    } else if (currentCategory === 'seguranca') {
      return 'Segurança e situações especiais';
    } else if (currentCategory === 'medico') {
      return 'Sou médico';
    }
    return '';
  };

  const getCategoryIcon = () => {
    if (currentCategory === 'plataforma' || currentCategory === 'medico') {
      return <Users size={20} />;
    } else if (currentCategory === 'medicamento') {
      return <Pill size={20} />;
    } else if (currentCategory === 'efeitos') {
      return <AlertTriangle size={20} />;
    } else if (currentCategory === 'nutri') {
      return <UtensilsCrossed size={20} />;
    } else if (currentCategory === 'resultados') {
      return <Target size={20} />;
    } else if (currentCategory === 'seguranca') {
      return <Shield size={20} />;
    }
    return null;
  };

  const getCategoryColor = (): string => {
    if (currentCategory === 'nutri') {
      return 'from-green-600 to-emerald-600';
    } else if (currentCategory === 'medico' || currentCategory === 'plataforma') {
      return 'from-blue-600 to-indigo-600';
    } else if (currentCategory === 'medicamento') {
      return 'from-purple-600 to-pink-600';
    } else if (currentCategory === 'efeitos') {
      return 'from-orange-600 to-red-600';
    } else if (currentCategory === 'resultados') {
      return 'from-teal-600 to-cyan-600';
    } else if (currentCategory === 'seguranca') {
      return 'from-gray-600 to-slate-600';
    }
    return 'from-purple-600 to-orange-600';
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
    setShowMainModal(false);
    setShowCategoryModal(false);
    setCurrentCategory(null);
    setPlatformSubType(null);
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
                        onClick={() => setShowMainModal(true)}
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

      {/* Modal principal de categorias */}
      {showMainModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowMainModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header do modal */}
            <div className="bg-gradient-to-r from-purple-600 to-orange-600 text-white p-4 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold">Perguntas Frequentes</h3>
              <button
                onClick={() => setShowMainModal(false)}
                className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                aria-label="Fechar modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Lista de categorias */}
            <div className="overflow-y-auto flex-1 p-4">
              <div className="space-y-2">
                <button
                  onClick={() => handleCategoryClick('plataforma')}
                  className="w-full text-left bg-gray-50 hover:bg-purple-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors flex items-center gap-3"
                >
                  <Users size={20} className="text-purple-600" />
                  <p className="text-sm font-medium text-gray-900">Como funciona a plataforma</p>
                </button>
                
                <button
                  onClick={() => handleCategoryClick('medicamento')}
                  className="w-full text-left bg-gray-50 hover:bg-purple-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors flex items-center gap-3"
                >
                  <Pill size={20} className="text-purple-600" />
                  <p className="text-sm font-medium text-gray-900">Medicamento</p>
                </button>
                
                <button
                  onClick={() => handleCategoryClick('efeitos')}
                  className="w-full text-left bg-gray-50 hover:bg-purple-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors flex items-center gap-3"
                >
                  <AlertTriangle size={20} className="text-purple-600" />
                  <p className="text-sm font-medium text-gray-900">Efeitos colaterais</p>
                </button>
                
                <button
                  onClick={() => handleCategoryClick('nutri')}
                  className="w-full text-left bg-gray-50 hover:bg-green-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors flex items-center gap-3"
                >
                  <UtensilsCrossed size={20} className="text-green-600" />
                  <p className="text-sm font-medium text-gray-900">Nutrição e cardápio</p>
                </button>
                
                <button
                  onClick={() => handleCategoryClick('resultados')}
                  className="w-full text-left bg-gray-50 hover:bg-purple-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors flex items-center gap-3"
                >
                  <Target size={20} className="text-purple-600" />
                  <p className="text-sm font-medium text-gray-900">Resultados e metas</p>
                </button>
                
                <button
                  onClick={() => handleCategoryClick('seguranca')}
                  className="w-full text-left bg-gray-50 hover:bg-purple-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors flex items-center gap-3"
                >
                  <Shield size={20} className="text-purple-600" />
                  <p className="text-sm font-medium text-gray-900">Segurança e situações especiais</p>
                </button>
                
                <button
                  onClick={() => handleCategoryClick('medico')}
                  className="w-full text-left bg-gray-50 hover:bg-blue-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors flex items-center gap-3"
                >
                  <Stethoscope size={20} className="text-blue-600" />
                  <p className="text-sm font-medium text-gray-900">Sou médico</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de escolha para Plataforma (Paciente ou Médico) */}
      {showCategoryModal && currentCategory === 'plataforma' && !platformSubType && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => { setShowCategoryModal(false); setCurrentCategory(null); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header do modal */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={20} />
                <h3 className="text-lg font-bold">Como funciona a plataforma</h3>
              </div>
              <button
                onClick={() => { setShowCategoryModal(false); setCurrentCategory(null); }}
                className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                aria-label="Fechar modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Opções */}
            <div className="overflow-y-auto flex-1 p-4">
              <div className="space-y-2">
                <button
                  onClick={() => handlePlatformSubTypeClick('paciente')}
                  className="w-full text-left bg-gray-50 hover:bg-blue-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900">Sou paciente</p>
                </button>
                <button
                  onClick={() => handlePlatformSubTypeClick('medico')}
                  className="w-full text-left bg-gray-50 hover:bg-blue-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900">Sou médico</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de perguntas específicas da categoria */}
      {showCategoryModal && currentCategory && (currentCategory !== 'plataforma' || platformSubType !== null) && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => { setShowCategoryModal(false); setCurrentCategory(null); setPlatformSubType(null); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header do modal */}
            <div className={`bg-gradient-to-r ${getCategoryColor()} text-white p-4 rounded-t-xl flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                {getCategoryIcon()}
                <h3 className="text-lg font-bold">{getCategoryTitle()}</h3>
              </div>
              <button
                onClick={() => { setShowCategoryModal(false); setCurrentCategory(null); setPlatformSubType(null); }}
                className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                aria-label="Fechar modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Lista de perguntas */}
            <div className="overflow-y-auto flex-1 p-4">
              <div className="space-y-2">
                {getCategoryItems().map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuestionClick(item)}
                    className={`w-full text-left bg-gray-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors ${
                      currentCategory === 'nutri' 
                        ? 'hover:bg-green-50' 
                        : currentCategory === 'medico' || currentCategory === 'plataforma'
                        ? 'hover:bg-blue-50'
                        : 'hover:bg-purple-50'
                    }`}
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
                      onClick={() => setShowMainModal(true)}
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

      {/* Modal principal de categorias */}
      {showMainModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowMainModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header do modal */}
            <div className="bg-gradient-to-r from-purple-600 to-orange-600 text-white p-4 rounded-t-xl flex items-center justify-between">
              <h3 className="text-lg font-bold">Perguntas Frequentes</h3>
              <button
                onClick={() => setShowMainModal(false)}
                className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                aria-label="Fechar modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Lista de categorias */}
            <div className="overflow-y-auto flex-1 p-4">
              <div className="space-y-2">
                <button
                  onClick={() => handleCategoryClick('plataforma')}
                  className="w-full text-left bg-gray-50 hover:bg-purple-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors flex items-center gap-3"
                >
                  <Users size={20} className="text-purple-600" />
                  <p className="text-sm font-medium text-gray-900">Como funciona a plataforma</p>
                </button>
                
                <button
                  onClick={() => handleCategoryClick('medicamento')}
                  className="w-full text-left bg-gray-50 hover:bg-purple-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors flex items-center gap-3"
                >
                  <Pill size={20} className="text-purple-600" />
                  <p className="text-sm font-medium text-gray-900">Medicamento</p>
                </button>
                
                <button
                  onClick={() => handleCategoryClick('efeitos')}
                  className="w-full text-left bg-gray-50 hover:bg-purple-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors flex items-center gap-3"
                >
                  <AlertTriangle size={20} className="text-purple-600" />
                  <p className="text-sm font-medium text-gray-900">Efeitos colaterais</p>
                </button>
                
                <button
                  onClick={() => handleCategoryClick('nutri')}
                  className="w-full text-left bg-gray-50 hover:bg-green-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors flex items-center gap-3"
                >
                  <UtensilsCrossed size={20} className="text-green-600" />
                  <p className="text-sm font-medium text-gray-900">Nutrição e cardápio</p>
                </button>
                
                <button
                  onClick={() => handleCategoryClick('resultados')}
                  className="w-full text-left bg-gray-50 hover:bg-purple-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors flex items-center gap-3"
                >
                  <Target size={20} className="text-purple-600" />
                  <p className="text-sm font-medium text-gray-900">Resultados e metas</p>
                </button>
                
                <button
                  onClick={() => handleCategoryClick('seguranca')}
                  className="w-full text-left bg-gray-50 hover:bg-purple-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors flex items-center gap-3"
                >
                  <Shield size={20} className="text-purple-600" />
                  <p className="text-sm font-medium text-gray-900">Segurança e situações especiais</p>
                </button>
                
                <button
                  onClick={() => handleCategoryClick('medico')}
                  className="w-full text-left bg-gray-50 hover:bg-blue-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors flex items-center gap-3"
                >
                  <Stethoscope size={20} className="text-blue-600" />
                  <p className="text-sm font-medium text-gray-900">Sou médico</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de escolha para Plataforma (Paciente ou Médico) */}
      {showCategoryModal && currentCategory === 'plataforma' && !platformSubType && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => { setShowCategoryModal(false); setCurrentCategory(null); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header do modal */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={20} />
                <h3 className="text-lg font-bold">Como funciona a plataforma</h3>
              </div>
              <button
                onClick={() => { setShowCategoryModal(false); setCurrentCategory(null); }}
                className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                aria-label="Fechar modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Opções */}
            <div className="overflow-y-auto flex-1 p-4">
              <div className="space-y-2">
                <button
                  onClick={() => handlePlatformSubTypeClick('paciente')}
                  className="w-full text-left bg-gray-50 hover:bg-blue-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900">Sou paciente</p>
                </button>
                <button
                  onClick={() => handlePlatformSubTypeClick('medico')}
                  className="w-full text-left bg-gray-50 hover:bg-blue-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors"
                >
                  <p className="text-sm font-medium text-gray-900">Sou médico</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de perguntas específicas da categoria */}
      {showCategoryModal && currentCategory && (currentCategory !== 'plataforma' || platformSubType !== null) && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={() => { setShowCategoryModal(false); setCurrentCategory(null); setPlatformSubType(null); }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header do modal */}
            <div className={`bg-gradient-to-r ${getCategoryColor()} text-white p-4 rounded-t-xl flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                {getCategoryIcon()}
                <h3 className="text-lg font-bold">{getCategoryTitle()}</h3>
              </div>
              <button
                onClick={() => { setShowCategoryModal(false); setCurrentCategory(null); setPlatformSubType(null); }}
                className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                aria-label="Fechar modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Lista de perguntas */}
            <div className="overflow-y-auto flex-1 p-4">
              <div className="space-y-2">
                {getCategoryItems().map((item, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuestionClick(item)}
                    className={`w-full text-left bg-gray-50 rounded-lg px-4 py-3 border border-gray-200 transition-colors ${
                      currentCategory === 'nutri' 
                        ? 'hover:bg-green-50' 
                        : currentCategory === 'medico' || currentCategory === 'plataforma'
                        ? 'hover:bg-blue-50'
                        : 'hover:bg-purple-50'
                    }`}
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
