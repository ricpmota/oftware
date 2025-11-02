'use client';

import { useState, useEffect } from 'react';
import { Mail, MessageCircle, Send, Users, Clock, CheckCircle, XCircle, Eye, Calendar } from 'lucide-react';
import { NotificationService, NotificationLog } from '@/services/notificationService';
import { UserService } from '@/services/userService';
import { Residente } from '@/types/auth';
import { auth } from '@/lib/firebase';
import NotificationScheduler from './NotificationScheduler';

export default function NotificationPanel() {
  const [activeTab, setActiveTab] = useState<'send' | 'logs' | 'scheduler'>('send');
  const [residentes, setResidentes] = useState<Residente[]>([]);
  const [selectedResidentes, setSelectedResidentes] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [notificationType, setNotificationType] = useState<'email' | 'whatsapp' | 'both'>('both');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);

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

  // Carregar logs quando mudar para aba logs
  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs();
    }
  }, [activeTab]);

  const loadLogs = async () => {
    try {
      const logsData = await NotificationService.getNotificationLogs(100);
      setLogs(logsData);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = NotificationService.TEMPLATES.find(t => t.id === templateId);
    if (template) {
      // Limpar variáveis anteriores
      const newVariables: Record<string, string> = {};
      template.variables.forEach(variable => {
        if (variable !== 'nome') { // nome é preenchido automaticamente
          newVariables[variable] = '';
        }
      });
      setVariables(newVariables);
      
      // Para template customizado
      if (templateId === 'custom') {
        setCustomSubject('');
        setCustomMessage('');
      }
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
    if (!selectedTemplate || selectedResidentes.length === 0) {
      alert('Selecione um template e pelo menos um residente');
      return;
    }

    if (!auth.currentUser?.email) {
      alert('Usuário não autenticado');
      return;
    }

    setIsLoading(true);
    try {
      const selectedResidentesData = residentes.filter(r => selectedResidentes.includes(r.id));
      
      // Preparar variáveis
      let finalVariables = { ...variables };
      if (selectedTemplate === 'custom') {
        finalVariables = {
          subject: customSubject,
          message: customMessage
        };
      }

      const result = await NotificationService.sendNotification(
        selectedResidentesData,
        selectedTemplate,
        finalVariables,
        notificationType,
        auth.currentUser.email
      );

      alert(`Notificações enviadas!\n✅ Sucesso: ${result.success}\n❌ Falhas: ${result.failed}\n\nDetalhes:\n${result.logs.join('\n')}`);
      
      // Limpar formulário
      setSelectedResidentes([]);
      setSelectedTemplate('');
      setVariables({});
      setCustomSubject('');
      setCustomMessage('');
      
      // Recarregar logs se estiver na aba logs
      if (activeTab === 'logs') {
        await loadLogs();
      }

    } catch (error) {
      console.error('Erro ao enviar notificações:', error);
      alert(`Erro ao enviar notificações: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Enviado';
      case 'failed':
        return 'Falhou';
      default:
        return 'Pendente';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4 text-blue-600" />;
      case 'whatsapp':
        return <MessageCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Users className="w-4 h-4 text-purple-600" />;
    }
  };

  const selectedTemplateObj = NotificationService.TEMPLATES.find(t => t.id === selectedTemplate);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Notificações</h2>
        
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
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'logs'
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Eye className="w-4 h-4 inline mr-2" />
            Histórico
          </button>
          <button
            onClick={() => setActiveTab('scheduler')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'scheduler'
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Automáticas
          </button>
        </div>
      </div>

      {activeTab === 'send' && (
        /* Aba de Envio */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuração da Notificação */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurar Notificação</h3>
            
            {/* Template */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
              >
                <option value="">Selecione um template...</option>
                {NotificationService.TEMPLATES.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo de Notificação */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Envio
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="email"
                    checked={notificationType === 'email'}
                    onChange={(e) => setNotificationType(e.target.value as 'email')}
                    className="mr-2"
                  />
                  <Mail className="w-4 h-4 mr-1 text-blue-600" />
                  E-mail
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="whatsapp"
                    checked={notificationType === 'whatsapp'}
                    onChange={(e) => setNotificationType(e.target.value as 'whatsapp')}
                    className="mr-2"
                  />
                  <MessageCircle className="w-4 h-4 mr-1 text-green-600" />
                  WhatsApp
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="both"
                    checked={notificationType === 'both'}
                    onChange={(e) => setNotificationType(e.target.value as 'both')}
                    className="mr-2"
                  />
                  <Users className="w-4 h-4 mr-1 text-purple-600" />
                  Ambos
                </label>
              </div>
            </div>

            {/* Variáveis do Template */}
            {selectedTemplateObj && selectedTemplate !== 'custom' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variáveis
                </label>
                <div className="space-y-2">
                  {selectedTemplateObj.variables
                    .filter(variable => variable !== 'nome')
                    .map(variable => (
                    <div key={variable}>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        {variable}
                      </label>
                      <input
                        type="text"
                        value={variables[variable] || ''}
                        onChange={(e) => setVariables({
                          ...variables,
                          [variable]: e.target.value
                        })}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500 text-gray-900"
                        placeholder={`Digite ${variable}...`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Template Customizado */}
            {selectedTemplate === 'custom' && (
              <div className="space-y-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assunto (E-mail)
                  </label>
                  <input
                    type="text"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                    placeholder="Digite o assunto..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mensagem
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                    placeholder="Digite sua mensagem personalizada..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use {'{nome}'} para incluir o nome do residente
                  </p>
                </div>
              </div>
            )}

            {/* Botão de Envio */}
            <button
              onClick={handleSendNotification}
              disabled={isLoading || !selectedTemplate || selectedResidentes.length === 0}
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
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedResidentes.includes(residente.id)}
                      onChange={() => handleResidenteToggle(residente.id)}
                      className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{residente.nome}</p>
                      <p className="text-sm text-gray-500">{residente.nivel} • {residente.email}</p>
                      {residente.telefone && (
                        <p className="text-xs text-green-600">{residente.telefone}</p>
                      )}
                      {!residente.telefone && notificationType !== 'email' && (
                        <p className="text-xs text-red-500">⚠️ Telefone não cadastrado</p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <Mail className={`w-4 h-4 ${residente.email ? 'text-blue-600' : 'text-gray-400'}`} />
                    <MessageCircle className={`w-4 h-4 ${residente.telefone ? 'text-green-600' : 'text-gray-400'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'scheduler' && (
        /* Aba de Notificações Automáticas */
        <NotificationScheduler />
      )}

      {activeTab === 'logs' && (
        /* Aba de Logs */
        <div className="bg-white shadow rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Histórico de Notificações</h3>
            <p className="text-sm text-gray-600">Últimas 100 notificações enviadas</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Residente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enviado em
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{log.residenteNome}</div>
                        <div className="text-sm text-gray-500">{log.residenteEmail}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getTypeIcon(log.type)}
                        <span className="ml-2 text-sm text-gray-900 capitalize">{log.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {NotificationService.TEMPLATES.find(t => t.id === log.template)?.name || log.template}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(log.status)}
                        <span className="ml-2 text-sm text-gray-900">{getStatusText(log.status)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.sentAt ? new Date(log.sentAt).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-green-600 hover:text-green-700"
                      >
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {logs.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">Nenhuma notificação encontrada</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Log */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-semibold text-gray-900">Detalhes da Notificação</h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Residente</label>
                  <p className="text-sm text-gray-900">{selectedLog.residenteNome}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="flex items-center">
                    {getStatusIcon(selectedLog.status)}
                    <span className="ml-2 text-sm text-gray-900">{getStatusText(selectedLog.status)}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo</label>
                  <div className="flex items-center">
                    {getTypeIcon(selectedLog.type)}
                    <span className="ml-2 text-sm text-gray-900 capitalize">{selectedLog.type}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Enviado em</label>
                  <p className="text-sm text-gray-900">
                    {selectedLog.sentAt ? new Date(selectedLog.sentAt).toLocaleString('pt-BR') : 'Não enviado'}
                  </p>
                </div>
              </div>
              
              {selectedLog.subject && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assunto</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedLog.subject}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
                <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                  {selectedLog.message}
                </div>
              </div>
              
              {selectedLog.error && (
                <div>
                  <label className="block text-sm font-medium text-red-700 mb-1">Erro</label>
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{selectedLog.error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
