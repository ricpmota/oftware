'use client';

import { useState } from 'react';
import { Escala, Local, Servico, Residente, ServicoDia } from '@/types/auth';

interface EditEscalaFormProps {
  escala: Escala;
  locais: Local[];
  servicos: Servico[];
  residentes: Residente[];
  todasEscalas: Escala[]; // Adicionar todas as escalas para calcular quantitativos totais
  onSave: (escala: Escala) => void;
  onCancel: () => void;
}

export default function EditEscalaForm({ escala, locais, servicos, residentes, todasEscalas, onSave, onCancel }: EditEscalaFormProps) {
  const [formData, setFormData] = useState({
    dataInicio: escala.dataInicio.toISOString().split('T')[0],
    dias: { ...escala.dias }
  });
  const [activeTab, setActiveTab] = useState('segunda');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar se a data selecionada é uma segunda-feira
    const [ano, mes, dia] = formData.dataInicio.split('-').map(Number);
    const dataSelecionada = new Date(ano, mes - 1, dia); // mes - 1 porque Date usa 0-11
    const diaDaSemana = dataSelecionada.getDay(); // 0 = domingo, 1 = segunda, etc.
    
    if (diaDaSemana !== 1) {
      alert('A data selecionada deve ser uma segunda-feira. Por favor, selecione uma segunda-feira.');
      return;
    }
    
    onSave({
      ...escala,
      dataInicio: dataSelecionada,
      dias: formData.dias
    });
  };

  // Função para preencher automaticamente os dias da semana
  const handleDataInicioChange = (data: string) => {
    if (!data) {
      setFormData(prev => ({ ...prev, dataInicio: data }));
      return;
    }

    // Criar data no formato correto (YYYY-MM-DD)
    const [ano, mes, dia] = data.split('-').map(Number);
    const dataSelecionada = new Date(ano, mes - 1, dia); // mes - 1 porque Date usa 0-11
    const diaDaSemana = dataSelecionada.getDay();
    
    // Verificar se é segunda-feira
    if (diaDaSemana !== 1) {
      alert('A data selecionada deve ser uma segunda-feira. Por favor, selecione uma segunda-feira.');
      return;
    }

    setFormData(prev => ({ ...prev, dataInicio: data }));
  };

  const adicionarServico = (dia: string) => {
    const novoId = Date.now().toString();
    const novoServico = {
      id: novoId,
      localId: '',
      servicoId: '',
      turno: 'manha' as 'manha' | 'tarde',
      residentes: []
    };
    
    setFormData(prev => ({
      ...prev,
      dias: {
        ...prev.dias,
        [dia]: [...(prev.dias[dia as keyof typeof prev.dias] as ServicoDia[]), novoServico]
      }
    }));
  };

  const removerServico = (dia: string, servicoId: string) => {
    setFormData(prev => ({
      ...prev,
      dias: {
        ...prev.dias,
        [dia]: (prev.dias[dia as keyof typeof prev.dias] as ServicoDia[]).filter(s => s.id !== servicoId)
      }
    }));
  };

  const handleServicoChange = (dia: string, servicoId: string, campo: string, valor: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      dias: {
        ...prev.dias,
        [dia]: (prev.dias[dia as keyof typeof prev.dias] as ServicoDia[]).map(servico => 
          servico.id === servicoId 
            ? { ...servico, [campo]: valor }
            : servico
        )
      }
    }));
  };

  const handleResidenteToggle = (dia: string, servicoId: string, residenteId: string) => {
    const diaAtual = formData.dias[dia as keyof typeof formData.dias] as ServicoDia[];
    const servico = diaAtual.find(s => s.id === servicoId);
    
    if (servico) {
      const residente = residentes.find(r => r.id === residenteId);
      if (!residente) return;
      
      const residentesAtuais = servico.residentes as string[];
      
      if (residentesAtuais.includes(residente.email)) {
        handleServicoChange(dia, servicoId, 'residentes', residentesAtuais.filter(email => email !== residente.email));
      } else {
        handleServicoChange(dia, servicoId, 'residentes', [...residentesAtuais, residente.email]);
      }
    }
  };

  const getServicosDoLocal = (localId: string) => {
    return servicos.filter(servico => servico.localId === localId);
  };

  const getResidentesDoServico = (dia: string, servicoId: string) => {
    const diaAtual = formData.dias[dia as keyof typeof formData.dias] as ServicoDia[];
    const servico = diaAtual.find(s => s.id === servicoId);
    return servico ? servico.residentes as string[] : [];
  };

  const isResidenteSelecionado = (dia: string, servicoId: string, residenteId: string) => {
    const residente = residentes.find(r => r.id === residenteId);
    if (!residente) return false;
    
    const residentesDoServico = getResidentesDoServico(dia, servicoId);
    return residentesDoServico.includes(residente.email);
  };

  // Função para contar quantas vezes um residente participou de um serviço específico
  const getParticipacaoResidente = (residenteEmail: string, servicoId: string, localId: string) => {
    let contador = 0;
    
    // Contar participações em todas as escalas (total de todo o tempo)
    todasEscalas.forEach(escalaAtual => {
      Object.values(escalaAtual.dias).forEach(dia => {
        if (Array.isArray(dia)) {
          dia.forEach(servicoDia => {
            if (servicoDia.servicoId === servicoId && 
                servicoDia.localId === localId && 
                servicoDia.residentes.includes(residenteEmail)) {
              contador++;
            }
          });
        }
      });
    });
    
    // Adicionar participações da escala atual sendo editada (formData.dias)
    Object.values(formData.dias).forEach(dia => {
      if (Array.isArray(dia)) {
        dia.forEach(servicoDia => {
          if (servicoDia.servicoId === servicoId && 
              servicoDia.localId === localId && 
              servicoDia.residentes.includes(residenteEmail)) {
            contador++;
          }
        });
      }
    });
    
    return contador;
  };

  // Calcular datas da semana se dataInicio estiver definida
  const calcularDatasDaSemana = () => {
    if (!formData.dataInicio) return {};
    
    const [ano, mes, dia] = formData.dataInicio.split('-').map(Number);
    const dataSelecionada = new Date(ano, mes - 1, dia); // mes - 1 porque Date usa 0-11
    return {
      segunda: dataSelecionada,
      terca: new Date(dataSelecionada.getTime() + 24 * 60 * 60 * 1000),
      quarta: new Date(dataSelecionada.getTime() + 2 * 24 * 60 * 60 * 1000),
      quinta: new Date(dataSelecionada.getTime() + 3 * 24 * 60 * 60 * 1000),
      sexta: new Date(dataSelecionada.getTime() + 4 * 24 * 60 * 60 * 1000),
      sabado: new Date(dataSelecionada.getTime() + 5 * 24 * 60 * 60 * 1000),
      domingo: new Date(dataSelecionada.getTime() + 6 * 24 * 60 * 60 * 1000)
    };
  };

  const datasDaSemana = calcularDatasDaSemana();
  
  const diasSemana = [
    { key: 'segunda', nome: 'Segunda-feira', data: datasDaSemana.segunda },
    { key: 'terca', nome: 'Terça-feira', data: datasDaSemana.terca },
    { key: 'quarta', nome: 'Quarta-feira', data: datasDaSemana.quarta },
    { key: 'quinta', nome: 'Quinta-feira', data: datasDaSemana.quinta },
    { key: 'sexta', nome: 'Sexta-feira', data: datasDaSemana.sexta },
    { key: 'sabado', nome: 'Sábado', data: datasDaSemana.sabado },
    { key: 'domingo', nome: 'Domingo', data: datasDaSemana.domingo }
  ];


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Data de Início da Semana (Segunda-feira)
        </label>
        <input
          type="date"
          value={formData.dataInicio}
          onChange={(e) => handleDataInicioChange(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
          required
        />
      </div>

      {/* Abas dos dias da semana */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-4 justify-center">
          {diasSemana.map(({ key, nome, data }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === key
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div>{nome}</div>
                {data && (
                  <div className="text-xs font-normal opacity-75 mt-1">
                    {data.toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>
            </button>
          ))}
        </nav>
      </div>

      {/* Conteúdo da aba ativa */}
      <div className="space-y-6 max-h-[60vh] overflow-y-auto">
        {diasSemana.map(({ key, nome, data }) => (
          activeTab === key && (
            <div key={key} className="border border-gray-200 rounded-lg p-6 bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  {nome} {data && `- ${data.toLocaleDateString('pt-BR')}`}
                </h3>
              </div>

            {/* Lista de serviços do dia */}
            <div className="space-y-4">
              {(formData.dias[key as keyof typeof formData.dias] as ServicoDia[]).map((servico, index) => (
                <div key={servico.id} className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-900">
                      Serviço {index + 1}
                    </h4>
                    <button
                      type="button"
                      onClick={() => removerServico(key, servico.id)}
                      className="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                    >
                      Remover
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Coluna 1: Configurações */}
                    <div className="space-y-4">
                      {/* Local */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Local</label>
                        <select
                          value={servico.localId}
                          onChange={(e) => {
                            handleServicoChange(key, servico.id, 'localId', e.target.value);
                            handleServicoChange(key, servico.id, 'servicoId', ''); // Limpar serviço quando mudar local
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Selecione um local</option>
                          {locais
                            .sort((a, b) => a.nome.localeCompare(b.nome))
                            .map((local) => (
                            <option key={local.id} value={local.id}>
                              {local.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Serviço */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Serviço</label>
                        <select
                          value={servico.servicoId}
                          onChange={(e) => handleServicoChange(key, servico.id, 'servicoId', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-green-500 focus:border-green-500"
                          disabled={!servico.localId}
                        >
                          <option value="">Selecione um serviço</option>
                          {getServicosDoLocal(servico.localId)
                            .sort((a, b) => a.nome.localeCompare(b.nome))
                            .map((serv) => (
                            <option key={serv.id} value={serv.id}>
                              {serv.nome}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Turno */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Turno</label>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`turno-${servico.id}`}
                              value="manha"
                              checked={servico.turno === 'manha'}
                              onChange={(e) => handleServicoChange(key, servico.id, 'turno', e.target.value)}
                              className="mr-2 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-700">Manhã</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              name={`turno-${servico.id}`}
                              value="tarde"
                              checked={servico.turno === 'tarde'}
                              onChange={(e) => handleServicoChange(key, servico.id, 'turno', e.target.value)}
                              className="mr-2 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-700">Tarde</span>
                          </label>
                        </div>
                      </div>
                    </div>

                  {/* Coluna 2 e 3: Residentes por Nível */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Residentes ({getResidentesDoServico(key, servico.id).length})
                    </label>
                    <div className="h-48 overflow-y-auto border border-gray-300 rounded-md p-3 bg-gray-50">
                      {residentes.length === 0 ? (
                        <p className="text-sm text-gray-500">Nenhum residente cadastrado</p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* R1 */}
                          <div className="space-y-1">
                            <h4 className="text-xs font-semibold text-blue-600 uppercase tracking-wide border-b border-blue-200 pb-1">
                              R1 ({residentes.filter(r => r.nivel === 'R1').length})
                            </h4>
                            {residentes.filter(r => r.nivel === 'R1').map((residente) => {
                              const participacoes = servico.servicoId && servico.localId ?
                                getParticipacaoResidente(residente.email, servico.servicoId, servico.localId) : 0;

                              return (
                                <label key={residente.id} className="flex items-center space-x-1 text-xs cursor-pointer hover:bg-white p-1 rounded transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={isResidenteSelecionado(key, servico.id, residente.id)}
                                    onChange={() => handleResidenteToggle(key, servico.id, residente.id)}
                                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-1">
                                      <span className="text-gray-900 font-medium truncate text-xs">
                                        {residente.nome}
                                      </span>
                                      {participacoes > 0 && (
                                        <span className="text-xs bg-orange-100 text-orange-800 px-1 py-0.5 rounded-full flex-shrink-0">
                                          {participacoes}x
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>

                          {/* R2 */}
                          <div className="space-y-1">
                            <h4 className="text-xs font-semibold text-green-600 uppercase tracking-wide border-b border-green-200 pb-1">
                              R2 ({residentes.filter(r => r.nivel === 'R2').length})
                            </h4>
                            {residentes.filter(r => r.nivel === 'R2').map((residente) => {
                              const participacoes = servico.servicoId && servico.localId ?
                                getParticipacaoResidente(residente.email, servico.servicoId, servico.localId) : 0;

                              return (
                                <label key={residente.id} className="flex items-center space-x-1 text-xs cursor-pointer hover:bg-white p-1 rounded transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={isResidenteSelecionado(key, servico.id, residente.id)}
                                    onChange={() => handleResidenteToggle(key, servico.id, residente.id)}
                                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-1">
                                      <span className="text-gray-900 font-medium truncate text-xs">
                                        {residente.nome}
                                      </span>
                                      {participacoes > 0 && (
                                        <span className="text-xs bg-orange-100 text-orange-800 px-1 py-0.5 rounded-full flex-shrink-0">
                                          {participacoes}x
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>

                          {/* R3 */}
                          <div className="space-y-1">
                            <h4 className="text-xs font-semibold text-purple-600 uppercase tracking-wide border-b border-purple-200 pb-1">
                              R3 ({residentes.filter(r => r.nivel === 'R3').length})
                            </h4>
                            {residentes.filter(r => r.nivel === 'R3').map((residente) => {
                              const participacoes = servico.servicoId && servico.localId ?
                                getParticipacaoResidente(residente.email, servico.servicoId, servico.localId) : 0;

                              return (
                                <label key={residente.id} className="flex items-center space-x-1 text-xs cursor-pointer hover:bg-white p-1 rounded transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={isResidenteSelecionado(key, servico.id, residente.id)}
                                    onChange={() => handleResidenteToggle(key, servico.id, residente.id)}
                                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-1">
                                      <span className="text-gray-900 font-medium truncate text-xs">
                                        {residente.nome}
                                      </span>
                                      {participacoes > 0 && (
                                        <span className="text-xs bg-orange-100 text-orange-800 px-1 py-0.5 rounded-full flex-shrink-0">
                                          {participacoes}x
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                </div>
              ))}

              {(formData.dias[key as keyof typeof formData.dias] as ServicoDia[]).length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  <p>Nenhum serviço adicionado para {nome.toLowerCase()}</p>
                  <p className="text-sm">Clique em &quot;Adicionar Serviço&quot; para começar</p>
                </div>
              )}
              
              {/* Botão Adicionar Serviço sempre no final */}
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={() => adicionarServico(key)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  + Adicionar Serviço
                </button>
              </div>
            </div>
            </div>
          )
        ))}

      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
        >
          Salvar
        </button>
      </div>
    </form>
  );
}
