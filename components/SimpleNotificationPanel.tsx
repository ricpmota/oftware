'use client';

import { useState, useEffect } from 'react';
import { Send, Users, CheckCircle, XCircle, Eye, MessageCircle } from 'lucide-react';
// import { InternalNotificationService } from '@/services/internalNotificationService';
import { UserService } from '@/services/userService';
import { Residente } from '@/types/auth';
import { InternalNotification } from '@/types/notification';
import { auth } from '@/lib/firebase';

export default function SimpleNotificationPanel() {
  const [activeTab, setActiveTab] = useState<'send' | 'history'>('send');
  const [residentes, setResidentes] = useState<Residente[]>([]);
  const [selectedResidentes, setSelectedResidentes] = useState<string[]>([]);
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [notifications, setNotifications] = useState<InternalNotification[]>([]);

  // Carregar residentes
  useEffect(() => {
    const loadResidentes = async () => {
      try {
        const residentesData = await UserService.getAllResidentes();
        setResidentes(residentesData);
      } catch (error) {
        console.error('Erro ao carregar residentes:', error);
      }
    };
    loadResidentes();
  }, []);

  // Carregar histórico quando mudar para aba history
  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const loadHistory = async () => {
    try {
      // Por enquanto, não vamos carregar histórico até resolver o problema principal
      console.log('📊 Carregamento de histórico temporariamente desabilitado');
      setNotifications([]);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  };

  const handleSelectAllResidentes = () => {
    if (selectedResidentes.length === residentes.length) {
      setSelectedResidentes([]);
    } else {
      setSelectedResidentes(residentes.map(r => r.id));
    }
  };

  const handleResidenteToggle = (residenteId: string) => {
    setSelectedResidentes(prev => {
      if (prev.includes(residenteId)) {
        return prev.filter(id => id !== residenteId);
      } else {
        return [...prev, residenteId];
      }
    });
  };

  const handleSendNotification = async () => {
    console.log('🚀 INICIANDO ENVIO DE NOTIFICAÇÃO');
    console.log('Auth current user:', auth.currentUser);
    console.log('Auth current user email:', auth.currentUser?.email);
    console.log('Auth current user uid:', auth.currentUser?.uid);
    
    if (!titulo.trim() || !mensagem.trim() || selectedResidentes.length === 0) {
      alert('Preencha título, mensagem e selecione pelo menos um residente.');
      return;
    }

    if (!auth.currentUser?.email) {
      console.error('❌ Usuário não autenticado no momento do envio');
      alert('Usuário não autenticado. Faça logout e login novamente.');
      return;
    }

    console.log('✅ Usuário autenticado:', auth.currentUser.email);
    console.log('📊 Residentes selecionados:', selectedResidentes);
    console.log('📝 Título:', titulo);
    console.log('📝 Mensagem:', mensagem.substring(0, 50) + '...');

    setIsLoading(true);
    try {
      const selectedResidentesData = residentes.filter(r => selectedResidentes.includes(r.id));
      console.log('👥 Dados dos residentes selecionados:', selectedResidentesData.map(r => ({ nome: r.nome, email: r.email })));
      
      // Enviar notificação para cada residente selecionado via API
      const results = { success: 0, failed: 0 };
      
      for (const residente of selectedResidentesData) {
        try {
          console.log(`🚀 Enviando via API para ${residente.nome}...`);
          
          const response = await fetch('/api/notificacoes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              residenteEmail: residente.email,
              residenteNome: residente.nome,
              titulo: titulo.trim(),
              mensagem: mensagem.trim(),
              tipo: 'admin',
              criadoPor: auth.currentUser.email
            }),
          });
          
          const data = await response.json();
          console.log(`📊 Resposta da API para ${residente.nome}:`, data);
          
          if (response.ok && data.success) {
            results.success++;
            console.log(`✅ Sucesso para ${residente.nome}`);
          } else {
            results.failed++;
            console.error(`❌ Falha para ${residente.nome}:`, data.error || 'Erro desconhecido');
          }
        } catch (error) {
          console.error(`❌ Erro de rede para ${residente.nome}:`, error);
          results.failed++;
        }
      }
      
      const result = results;

      console.log('📊 Resultado do envio:', result);
      alert(`Notificações enviadas!\n✅ Sucesso: ${result.success}\n❌ Falhas: ${result.failed}`);
      
      // Limpar formulário
      setTitulo('');
      setMensagem('');
      setSelectedResidentes([]);
      
      // Recarregar histórico se estiver na aba history
      if (activeTab === 'history') {
        await loadHistory();
      }

    } catch (error) {
      console.error('❌ ERRO COMPLETO ao enviar notificações:', error);
      console.error('❌ Stack trace:', (error as Error).stack);
      alert(`Erro ao enviar notificações: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (tipo: string) => {
    switch (tipo) {
      case 'troca_aprovada':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'troca_rejeitada':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <MessageCircle className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Notificações Internas</h2>
        
        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('send')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'send'
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Send className="w-4 h-4 inline mr-2" />
            Enviar
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'history'
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Eye className="w-4 h-4 inline mr-2" />
            Histórico
          </button>
        </div>
      </div>

      {activeTab === 'send' ? (
        /* Aba de Envio */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário de Notificação */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Enviar Notificação</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título
                </label>
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                  placeholder="Digite o título da notificação..."
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {titulo.length}/100 caracteres
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem
                </label>
                <textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                  placeholder="Digite sua mensagem..."
                  maxLength={1000}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {mensagem.length}/1000 caracteres
                </p>
              </div>

              <button
                onClick={handleSendNotification}
                disabled={isLoading || !titulo.trim() || !mensagem.trim() || selectedResidentes.length === 0}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 inline mr-2" />
                    Enviar para {selectedResidentes.length} residente(s)
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Seleção de Residentes */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Residentes</h3>
              <button
                onClick={handleSelectAllResidentes}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                {selectedResidentes.length === residentes.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {residentes.map(residente => (
                <div
                  key={residente.id}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedResidentes.includes(residente.id)}
                    onChange={() => handleResidenteToggle(residente.id)}
                    className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{residente.nome}</p>
                    <p className="text-sm text-gray-500">{residente.nivel} • {residente.email}</p>
                  </div>
                </div>
              ))}
            </div>

            {selectedResidentes.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700">
                  <Users className="w-4 h-4 inline mr-1" />
                  {selectedResidentes.length} residente(s) selecionado(s)
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Aba de Histórico */
        <div className="bg-white shadow rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Histórico de Notificações</h3>
            <p className="text-sm text-gray-600">Últimas 100 notificações enviadas</p>
          </div>
          
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma notificação enviada</h3>
                <p className="text-gray-500">
                  As notificações enviadas aparecerão aqui.
                </p>
              </div>
            ) : (
              notifications.map(notification => (
                <div key={notification.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start space-x-3">
                    {getTypeIcon(notification.tipo)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900 truncate">
                          {notification.titulo}
                        </h4>
                        <span className="text-xs text-gray-500 ml-2">
                          {notification.criadoEm.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Para: {notification.residenteNome}
                      </p>
                      <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                        {notification.mensagem}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          Por: {notification.criadoPor === 'sistema' ? 'Sistema' : notification.criadoPor}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                          notification.lida 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {notification.lida ? 'Lida' : 'Não lida'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
