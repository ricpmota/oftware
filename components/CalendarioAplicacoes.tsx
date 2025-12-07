'use client';

import { useState, useEffect } from 'react';
import { AplicacaoAgendada, FiltroAplicacao } from '@/types/calendario';
import { AplicacaoService } from '@/services/aplicacaoService';
import { EmailAplicacaoService } from '@/services/emailAplicacaoService';
import { Calendar, Mail, CheckCircle, XCircle, Clock, Filter, RefreshCw, Search } from 'lucide-react';
import { PacienteCompleto } from '@/types/obesidade';

interface CalendarioAplicacoesProps {
  pacientes: PacienteCompleto[];
}

export default function CalendarioAplicacoes({ pacientes }: CalendarioAplicacoesProps) {
  const [aplicacoes, setAplicacoes] = useState<AplicacaoAgendada[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState<FiltroAplicacao>({});
  const [processandoEmails, setProcessandoEmails] = useState(false);

  const loadAplicacoes = async () => {
    setLoading(true);
    try {
      const aplicacoesData = await AplicacaoService.buscarAplicacoesAgendadas(filtro);
      setAplicacoes(aplicacoesData);
    } catch (error) {
      console.error('Erro ao carregar aplicações:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAplicacoes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro.dataInicio, filtro.dataFim, filtro.pacienteId, filtro.dose, filtro.statusEmail]);

  const handleProcessarEmails = async () => {
    setProcessandoEmails(true);
    try {
      const resultado = await EmailAplicacaoService.processarEnviosAutomaticos();
      alert(`Processamento concluído!\nEnviados: ${resultado.enviados}\nErros: ${resultado.erros}`);
      await loadAplicacoes(); // Recarregar para atualizar status
    } catch (error) {
      console.error('Erro ao processar e-mails:', error);
      alert('Erro ao processar e-mails. Verifique o console.');
    } finally {
      setProcessandoEmails(false);
    }
  };

  const getStatusBadge = (status: 'enviado' | 'nao_enviado' | 'pendente') => {
    switch (status) {
      case 'enviado':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={12} className="mr-1" />
            Enviado
          </span>
        );
      case 'pendente':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock size={12} className="mr-1" />
            Pendente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle size={12} className="mr-1" />
            Não enviado
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho e Ações */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Calendar className="mr-2" size={28} />
            Calendário de Aplicações
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Gerencie as aplicações agendadas e envio de e-mails automáticos
          </p>
        </div>
        <button
          onClick={handleProcessarEmails}
          disabled={processandoEmails}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <Mail size={16} className="mr-2" />
          {processandoEmails ? 'Processando...' : 'Processar E-mails Hoje'}
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center mb-4">
          <Filter size={18} className="mr-2 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data Início</label>
            <input
              type="date"
              value={filtro.dataInicio ? filtro.dataInicio.toISOString().split('T')[0] : ''}
              onChange={(e) => setFiltro({ ...filtro, dataInicio: e.target.value ? new Date(e.target.value) : undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data Fim</label>
            <input
              type="date"
              value={filtro.dataFim ? filtro.dataFim.toISOString().split('T')[0] : ''}
              onChange={(e) => setFiltro({ ...filtro, dataFim: e.target.value ? new Date(e.target.value) : undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Paciente</label>
            <select
              value={filtro.pacienteId || ''}
              onChange={(e) => setFiltro({ ...filtro, pacienteId: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Todos</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Dose (mg)</label>
            <select
              value={filtro.dose || ''}
              onChange={(e) => setFiltro({ ...filtro, dose: e.target.value ? parseFloat(e.target.value) : undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Todas</option>
              <option value="2.5">2.5 mg</option>
              <option value="5">5 mg</option>
              <option value="7.5">7.5 mg</option>
              <option value="10">10 mg</option>
              <option value="12.5">12.5 mg</option>
              <option value="15">15 mg</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setFiltro({})}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Limpar Filtros
          </button>
          <button
            onClick={loadAplicacoes}
            disabled={loading}
            className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            <RefreshCw size={14} className={`mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Lista de Aplicações */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Aplicações Agendadas ({aplicacoes.length})
          </h3>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Carregando aplicações...</p>
          </div>
        ) : aplicacoes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Nenhuma aplicação encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paciente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dose
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aplicação
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    E-mail - Dia Anterior
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    E-mail - Dia da Aplicação
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {aplicacoes.map((aplicacao) => (
                  <tr key={aplicacao.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {aplicacao.dataAplicacao.toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {aplicacao.pacienteNome}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {aplicacao.dosePrevista} mg
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {aplicacao.numeroAplicacao}ª aplicação
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(aplicacao.statusEmailAntes)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(aplicacao.statusEmailDia)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

