'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, Calendar, RefreshCw, User } from 'lucide-react';
import { UserService } from '@/services/userService';
import { InternalNotification } from '@/types/notification';

interface NotificationCenterProps {
  residenteEmail: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenter({ residenteEmail, isOpen, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<InternalNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'todas' | 'nao_lidas' | 'admin' | 'trocas'>('todas');

  useEffect(() => {
    if (isOpen && residenteEmail) {
      loadNotifications();
    }
  }, [isOpen, residenteEmail]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await UserService.buscarNotificacoesResidente(residenteEmail);
      setNotifications(data);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await UserService.marcarNotificacaoComoLida(notificationId);
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, lida: true } : n)
      );
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      // Marcar todas como lidas individualmente
      const unreadNotifications = notifications.filter(n => !n.lida);
      for (const notification of unreadNotifications) {
        await UserService.marcarNotificacaoComoLida(notification.id);
      }
      setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta notificação?')) return;
    
    try {
      await UserService.excluirNotificacao(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
    }
  };

  const getFilteredNotifications = () => {
    switch (filter) {
      case 'nao_lidas':
        return notifications.filter(n => !n.lida);
      case 'admin':
        return notifications.filter(n => n.tipo === 'admin');
      case 'trocas':
        return notifications.filter(n => n.tipo === 'troca_aprovada' || n.tipo === 'troca_rejeitada');
      default:
        return notifications;
    }
  };

  const getTypeIcon = (tipo: string) => {
    switch (tipo) {
      case 'admin':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'troca_aprovada':
        return <Check className="w-4 h-4 text-green-600" />;
      case 'troca_rejeitada':
        return <X className="w-4 h-4 text-red-600" />;
      case 'escala':
        return <Calendar className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeBadge = (tipo: string) => {
    const configs = {
      admin: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Admin' },
      troca_aprovada: { bg: 'bg-green-100', text: 'text-green-800', label: 'Aprovada' },
      troca_rejeitada: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejeitada' },
      escala: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Escala' },
      geral: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Geral' },
    };

    const config = configs[tipo as keyof typeof configs] || configs.geral;
    
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {getTypeIcon(tipo)}
        <span className="ml-1">{config.label}</span>
      </span>
    );
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter(n => !n.lida).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Bell className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Central de Notificações</h2>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('todas')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                filter === 'todas'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('nao_lidas')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                filter === 'nao_lidas'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Não Lidas ({unreadCount})
            </button>
            <button
              onClick={() => setFilter('admin')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                filter === 'admin'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => setFilter('trocas')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                filter === 'trocas'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Trocas
            </button>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={loadNotifications}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
              title="Atualizar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-3 py-1 text-sm font-medium text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors"
                title="Marcar todas como lidas"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'nao_lidas' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
              </h3>
              <p className="text-gray-500">
                {filter === 'nao_lidas' 
                  ? 'Você está em dia com suas notificações!' 
                  : 'Suas notificações aparecerão aqui.'
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    !notification.lida ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        {getTypeBadge(notification.tipo)}
                        {!notification.lida && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                        <span className="text-xs text-gray-500">
                          {notification.criadoEm.toLocaleString('pt-BR')}
                        </span>
                      </div>
                      
                      <h4 className="font-medium text-gray-900 mb-1">
                        {notification.titulo}
                      </h4>
                      
                      <p className="text-sm text-gray-700 whitespace-pre-line">
                        {notification.mensagem}
                      </p>
                      
                      <div className="text-xs text-gray-500 mt-2">
                        Por: {notification.criadoPor === 'sistema' ? 'Sistema' : notification.criadoPor}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 ml-4">
                      {!notification.lida && (
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
                          title="Marcar como lida"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(notification.id)}
                        className="p-1 text-red-600 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              {filteredNotifications.length} de {notifications.length} notificações
            </span>
            <span>
              {unreadCount} não lida{unreadCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
