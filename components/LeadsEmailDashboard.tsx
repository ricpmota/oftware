'use client';

import { useState, useEffect } from 'react';
import { LeadEmailStatus } from '@/types/emailConfig';
import { Mail, CheckCircle, XCircle, Clock, TrendingUp, Users, Send } from 'lucide-react';
import { EmailTipo } from '@/types/emailConfig';

export default function LeadsEmailDashboard() {
  const [status, setStatus] = useState<LeadEmailStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'todos' | 'conversao'>('todos');
  const [sendingEmails, setSendingEmails] = useState<Map<string, boolean>>(new Map());
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadStatus();
  }, []);

  // Atualizar tempo atual a cada minuto para mostrar contagem regressiva
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Atualizar a cada minuto

    return () => clearInterval(interval);
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/leads-email-status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendEmailManually = async (leadId: string, leadEmail: string, emailTipo: EmailTipo) => {
    const key = `${leadId}-${emailTipo}`;
    setSendingEmails(prev => {
      const newMap = new Map(prev);
      newMap.set(key, true);
      return newMap;
    });

    try {
      const response = await fetch('/api/send-email-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId,
          emailTipo,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert(`E-mail ${emailTipo} enviado com sucesso para ${leadEmail}!`);
        // Recarregar status para atualizar a lista
        await loadStatus();
      } else {
        alert(`Erro ao enviar e-mail: ${data.error || data.details || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
      alert('Erro ao enviar e-mail. Tente novamente.');
    } finally {
      setSendingEmails(prev => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
    }
  };

  const isSending = (leadId: string, emailTipo: EmailTipo): boolean => {
    return sendingEmails.get(`${leadId}-${emailTipo}`) || false;
  };

  const getEmailStatusIcon = (emailStatus?: { enviado: boolean; status: string }) => {
    if (!emailStatus) return <Clock size={16} className="text-gray-400" />;
    if (emailStatus.status === 'nao_enviar') {
      return <XCircle size={16} className="text-gray-500" />;
    }
    if (emailStatus.enviado && emailStatus.status === 'enviado') {
      return <CheckCircle size={16} className="text-green-500" />;
    }
    if (emailStatus.status === 'falhou') {
      return <XCircle size={16} className="text-red-500" />;
    }
    return <Clock size={16} className="text-yellow-500" />;
  };

  const getEmailStatusColor = (emailStatus?: { enviado: boolean; status: string }) => {
    if (!emailStatus) return 'bg-gray-100 text-gray-600';
    if (emailStatus.status === 'nao_enviar') {
      return 'bg-gray-200 text-gray-600';
    }
    if (emailStatus.enviado && emailStatus.status === 'enviado') {
      return 'bg-green-100 text-green-700';
    }
    if (emailStatus.status === 'falhou') {
      return 'bg-red-100 text-red-700';
    }
    return 'bg-yellow-100 text-yellow-700';
  };

  // Função para calcular tempo restante até o próximo envio
  const getTempoRestante = (proximoEnvio?: Date): string | null => {
    if (!proximoEnvio) return null;
    
    const agora = currentTime;
    const proximo = new Date(proximoEnvio);
    const diff = proximo.getTime() - agora.getTime();
    
    if (diff <= 0) {
      return 'Pronto para enviar';
    }
    
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (dias > 0) {
      return `${dias}d ${horas}h`;
    } else if (horas > 0) {
      return `${horas}h ${minutos}m`;
    } else {
      return `${minutos}m`;
    }
  };

  const leadsFiltrados = status.filter(s => {
    // Todos os leads que aparecem já são não qualificados (sem solicitação_medico e sem medicoResponsavelId)
    // O filtro aqui é apenas para visualização
    if (filtro === 'conversao') {
      // Mostrar apenas leads que converteram (têm médico responsável ou emailConversao)
      return !!s.emailConversao || !!s.temMedicoResponsavel;
    }
    return true; // Todos os leads
  });

  const estatisticas = {
    total: status.length,
    conversoes: status.filter(s => !!s.emailConversao || !!s.temMedicoResponsavel).length,
    email1Enviados: status.filter(s => s.email1?.enviado).length,
    email2Enviados: status.filter(s => s.email2?.enviado).length,
    email3Enviados: status.filter(s => s.email3?.enviado).length,
    email4Enviados: status.filter(s => s.email4?.enviado).length,
    email5Enviados: status.filter(s => s.email5?.enviado).length,
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando status de e-mails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-black">Gestão Visual de E-mails por Lead</h2>
        <button
          onClick={loadStatus}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <Mail size={18} />
          Atualizar
        </button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total de Leads</p>
              <p className="text-2xl font-bold text-black">{estatisticas.total}</p>
            </div>
            <Users className="text-blue-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Conversões</p>
              <p className="text-2xl font-bold text-black">{estatisticas.conversoes}</p>
            </div>
            <TrendingUp className="text-green-500" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Taxa de Conversão</p>
              <p className="text-2xl font-bold text-black">
                {estatisticas.total > 0 ? ((estatisticas.conversoes / estatisticas.total) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <CheckCircle className="text-purple-500" size={32} />
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-2">
          <button
            onClick={() => setFiltro('todos')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${filtro === 'todos' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Todos ({status.length})
          </button>
          <button
            onClick={() => setFiltro('conversao')}
            className={`px-4 py-2 rounded-md text-sm font-medium ${filtro === 'conversao' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Com Conversão ({estatisticas.conversoes})
          </button>
        </div>
      </div>

      {/* Tabela de Leads */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">Lead</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-black uppercase tracking-wider">E-mail 1<br/>(1h)</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-black uppercase tracking-wider">E-mail 2<br/>(24h)</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-black uppercase tracking-wider">E-mail 3<br/>(72h)</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-black uppercase tracking-wider">E-mail 4<br/>(7d)</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-black uppercase tracking-wider">E-mail 5<br/>(14d)</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-black uppercase tracking-wider">Próximo Envio</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-black uppercase tracking-wider">Médico</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-black uppercase tracking-wider">Conversão</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leadsFiltrados.map((leadStatus) => (
              <tr key={leadStatus.leadId} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-black">{leadStatus.leadNome}</div>
                    <div className="text-sm text-gray-500">{leadStatus.leadEmail}</div>
                    <div className="text-xs text-gray-400">
                      Criado: {new Date(leadStatus.dataCriacao).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${getEmailStatusColor(leadStatus.email1)}`}>
                      {getEmailStatusIcon(leadStatus.email1)}
                      <span className="text-xs">
                        {leadStatus.email1?.status === 'nao_enviar' ? 'X' : leadStatus.email1?.enviado ? 'Enviado' : 'Pendente'}
                      </span>
                    </div>
                    {leadStatus.email1?.dataEnvio && (
                      <div className="text-xs text-gray-400">
                        {new Date(leadStatus.email1.dataEnvio).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                    {leadStatus.email1?.status !== 'nao_enviar' && (
                      <button
                        onClick={() => sendEmailManually(leadStatus.leadId, leadStatus.leadEmail, 'email1')}
                        disabled={isSending(leadStatus.leadId, 'email1')}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        title="Enviar E-mail 1 manualmente"
                      >
                        <Send size={12} />
                        {isSending(leadStatus.leadId, 'email1') ? 'Enviando...' : 'Enviar'}
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${getEmailStatusColor(leadStatus.email2)}`}>
                      {getEmailStatusIcon(leadStatus.email2)}
                      <span className="text-xs">
                        {leadStatus.email2?.status === 'nao_enviar' ? 'X' : leadStatus.email2?.enviado ? 'Enviado' : 'Pendente'}
                      </span>
                    </div>
                    {leadStatus.email2?.dataEnvio && (
                      <div className="text-xs text-gray-400">
                        {new Date(leadStatus.email2.dataEnvio).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                    {leadStatus.email2?.status !== 'nao_enviar' && (
                      <button
                        onClick={() => sendEmailManually(leadStatus.leadId, leadStatus.leadEmail, 'email2')}
                        disabled={isSending(leadStatus.leadId, 'email2')}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        title="Enviar E-mail 2 manualmente"
                      >
                        <Send size={12} />
                        {isSending(leadStatus.leadId, 'email2') ? 'Enviando...' : 'Enviar'}
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${getEmailStatusColor(leadStatus.email3)}`}>
                      {getEmailStatusIcon(leadStatus.email3)}
                      <span className="text-xs">
                        {leadStatus.email3?.status === 'nao_enviar' ? 'X' : leadStatus.email3?.enviado ? 'Enviado' : 'Pendente'}
                      </span>
                    </div>
                    {leadStatus.email3?.dataEnvio && (
                      <div className="text-xs text-gray-400">
                        {new Date(leadStatus.email3.dataEnvio).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                    {leadStatus.email3?.status !== 'nao_enviar' && (
                      <button
                        onClick={() => sendEmailManually(leadStatus.leadId, leadStatus.leadEmail, 'email3')}
                        disabled={isSending(leadStatus.leadId, 'email3')}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        title="Enviar E-mail 3 manualmente"
                      >
                        <Send size={12} />
                        {isSending(leadStatus.leadId, 'email3') ? 'Enviando...' : 'Enviar'}
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${getEmailStatusColor(leadStatus.email4)}`}>
                      {getEmailStatusIcon(leadStatus.email4)}
                      <span className="text-xs">
                        {leadStatus.email4?.status === 'nao_enviar' ? 'X' : leadStatus.email4?.enviado ? 'Enviado' : 'Pendente'}
                      </span>
                    </div>
                    {leadStatus.email4?.dataEnvio && (
                      <div className="text-xs text-gray-400">
                        {new Date(leadStatus.email4.dataEnvio).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                    {leadStatus.email4?.status !== 'nao_enviar' && (
                      <button
                        onClick={() => sendEmailManually(leadStatus.leadId, leadStatus.leadEmail, 'email4')}
                        disabled={isSending(leadStatus.leadId, 'email4')}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        title="Enviar E-mail 4 manualmente"
                      >
                        <Send size={12} />
                        {isSending(leadStatus.leadId, 'email4') ? 'Enviando...' : 'Enviar'}
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${getEmailStatusColor(leadStatus.email5)}`}>
                      {getEmailStatusIcon(leadStatus.email5)}
                      <span className="text-xs">
                        {leadStatus.email5?.status === 'nao_enviar' ? 'X' : leadStatus.email5?.enviado ? 'Enviado' : 'Pendente'}
                      </span>
                    </div>
                    {leadStatus.email5?.dataEnvio && (
                      <div className="text-xs text-gray-400">
                        {new Date(leadStatus.email5.dataEnvio).toLocaleDateString('pt-BR')}
                      </div>
                    )}
                    {leadStatus.email5?.status !== 'nao_enviar' && (
                      <button
                        onClick={() => sendEmailManually(leadStatus.leadId, leadStatus.leadEmail, 'email5')}
                        disabled={isSending(leadStatus.leadId, 'email5')}
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        title="Enviar E-mail 5 manualmente"
                      >
                        <Send size={12} />
                        {isSending(leadStatus.leadId, 'email5') ? 'Enviando...' : 'Enviar'}
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  {leadStatus.proximoEnvio && leadStatus.proximoEmail ? (
                    <div className="flex flex-col items-center gap-1">
                      <div className="text-xs font-medium text-blue-600">
                        {leadStatus.proximoEmail.replace('email', 'E-mail ')}
                      </div>
                      <div className="text-xs text-gray-600">
                        {getTempoRestante(leadStatus.proximoEnvio) || '-'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(leadStatus.proximoEnvio).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  {leadStatus.medicoNome ? (
                    <div className="text-sm font-medium text-blue-600">
                      {leadStatus.medicoNome}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-center">
                  {leadStatus.emailConversao ? (
                    <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-100 text-green-700">
                      <CheckCircle size={16} />
                      <span className="text-xs font-medium">
                        E-mail {leadStatus.emailConversao.replace('email', '')}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                  {leadStatus.dataConversao && (
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(leadStatus.dataConversao).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

