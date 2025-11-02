'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { User } from 'firebase/auth';
import { UserService } from '@/services/userService';
import { Escala, Residente, Local, Servico } from '@/types/auth';

export default function RecepcaoPage() {
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [residentes, setResidentes] = useState<Residente[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [selectedEscala, setSelectedEscala] = useState<Escala | null>(null);
  const [selectedDia, setSelectedDia] = useState<string>('segunda');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [escalasData, residentesData, locaisData, servicosData] = await Promise.all([
        UserService.getAllEscalas(),
        UserService.getAllResidentes(),
        UserService.getAllLocais(),
        UserService.getAllServicos()
      ]);
      
      setEscalas(escalasData);
      setResidentes(residentesData);
      setLocais(locaisData);
      setServicos(servicosData);
      
      // Selecionar a primeira escala por padrão
      if (escalasData.length > 0) {
        setSelectedEscala(escalasData[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setMessage('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setUserLoading(false);
      
      if (user) {
        // Verificar se é o usuário master ou tem role de recepção
        if (user.email === 'ricpmota.med@gmail.com') {
          // Usuário master tem acesso a tudo
          loadData();
        } else {
          UserService.getUserByUid(user.uid).then((userData) => {
            if (userData?.role !== 'recepcao') {
              // Redirecionar para página principal se não for recepção
              window.location.href = '/';
            } else {
              loadData();
            }
          });
        }
      } else {
        // Redirecionar para login se não estiver autenticado
        window.location.href = '/';
      }
    });

    return () => unsubscribe();
  }, [loadData]);

  const getResidenteNome = (email: string) => {
    const residente = residentes.find(r => r.email === email);
    return residente ? residente.nome : email;
  };

  const getLocalNome = (localId: string) => {
    const local = locais.find(l => l.id === localId);
    return local ? local.nome : 'Local não encontrado';
  };

  const getServicoNome = (servicoId: string) => {
    const servico = servicos.find(s => s.id === servicoId);
    return servico ? servico.nome : 'Serviço não encontrado';
  };

  const diasSemana = [
    { key: 'segunda', nome: 'Segunda-feira' },
    { key: 'terca', nome: 'Terça-feira' },
    { key: 'quarta', nome: 'Quarta-feira' },
    { key: 'quinta', nome: 'Quinta-feira' },
    { key: 'sexta', nome: 'Sexta-feira' },
    { key: 'sabado', nome: 'Sábado' },
    { key: 'domingo', nome: 'Domingo' }
  ];

  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Recepção</h1>
              <p className="text-gray-600">Visualização de Escalas por Turno</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Logado como: {user.email}
              </span>
              <button
                onClick={() => {
                  auth.signOut();
                  window.location.href = '/';
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Message */}
          {message && (
            <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
              {message}
            </div>
          )}

          {/* Seletor de Escala */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Selecionar Escala</h2>
              <button
                onClick={loadData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Carregando...' : 'Atualizar'}
              </button>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <label htmlFor="escala-select" className="block text-sm font-medium text-gray-700 mb-2">
                Escolha a escala para visualizar:
              </label>
              <select
                id="escala-select"
                value={selectedEscala?.id || ''}
                onChange={(e) => {
                  const escala = escalas.find(esc => esc.id === e.target.value);
                  setSelectedEscala(escala || null);
                }}
                className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-black"
              >
                <option value="">Selecione uma escala...</option>
                {escalas.map((escala) => (
                  <option key={escala.id} value={escala.id}>
                    Semana de {new Date(escala.dataInicio).toLocaleDateString('pt-BR')} 
                    {escala.updatedAt && ` (Atualizada em ${new Date(escala.updatedAt).toLocaleDateString('pt-BR')})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Visualização da Escala Selecionada */}
          {selectedEscala && (
            <div className="space-y-6">
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  Escala da Semana de {new Date(selectedEscala.dataInicio).toLocaleDateString('pt-BR')}
                </h3>
                
                {/* Abas por Dia da Semana */}
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8 overflow-x-auto">
                    {diasSemana.map((dia) => (
                      <button
                        key={dia.key}
                        onClick={() => setSelectedDia(dia.key)}
                        className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                          selectedDia === dia.key
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {dia.nome}
                      </button>
                    ))}
                  </nav>
                </div>

                {/* Conteúdo do Dia Selecionado */}
                <div className="mt-6">
                  {(() => {
                    const servicosDia = selectedEscala.dias[selectedDia as keyof typeof selectedEscala.dias] || [];
                    
                    if (!Array.isArray(servicosDia) || servicosDia.length === 0) {
                      return (
                        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                          <h4 className="text-lg font-semibold text-gray-800 mb-2">
                            {diasSemana.find(d => d.key === selectedDia)?.nome}
                          </h4>
                          <p>Nenhum serviço agendado para este dia</p>
                        </div>
                      );
                    }

                    // Agrupar por turno
                    const servicosManha = servicosDia.filter(s => s.turno === 'manha');
                    const servicosTarde = servicosDia.filter(s => s.turno === 'tarde');

                    return (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">
                          {diasSemana.find(d => d.key === selectedDia)?.nome}
                        </h4>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Turno da Manhã */}
                          <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center mb-3">
                              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                              <h5 className="font-semibold text-blue-800">Manhã</h5>
                            </div>
                            
                            {servicosManha.length === 0 ? (
                              <p className="text-blue-600 text-sm">Nenhum serviço agendado</p>
                            ) : (
                              <div className="space-y-3">
                                {servicosManha.map((servico, index) => (
                                  <div key={index} className="bg-white rounded-md p-3 shadow-sm">
                                    <div className="font-medium text-gray-900">
                                      {getServicoNome(servico.servicoId)}
                                    </div>
                                    <div className="text-sm text-gray-600 mb-2">
                                      {getLocalNome(servico.localId)}
                                    </div>
                                    <div className="text-sm">
                                      <span className="font-medium text-gray-700">Residentes:</span>
                                      <div className="mt-1 space-y-1">
                                        {servico.residentes.map((email, idx) => (
                                          <div key={idx} className="text-gray-600">
                                            • {getResidenteNome(email)}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Turno da Tarde */}
                          <div className="bg-orange-50 rounded-lg p-4">
                            <div className="flex items-center mb-3">
                              <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                              <h5 className="font-semibold text-orange-800">Tarde</h5>
                            </div>
                            
                            {servicosTarde.length === 0 ? (
                              <p className="text-orange-600 text-sm">Nenhum serviço agendado</p>
                            ) : (
                              <div className="space-y-3">
                                {servicosTarde.map((servico, index) => (
                                  <div key={index} className="bg-white rounded-md p-3 shadow-sm">
                                    <div className="font-medium text-gray-900">
                                      {getServicoNome(servico.servicoId)}
                                    </div>
                                    <div className="text-sm text-gray-600 mb-2">
                                      {getLocalNome(servico.localId)}
                                    </div>
                                    <div className="text-sm">
                                      <span className="font-medium text-gray-700">Residentes:</span>
                                      <div className="mt-1 space-y-1">
                                        {servico.residentes.map((email, idx) => (
                                          <div key={idx} className="text-gray-600">
                                            • {getResidenteNome(email)}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Mensagem quando nenhuma escala está selecionada */}
          {!selectedEscala && escalas.length > 0 && (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <p className="text-gray-500">Selecione uma escala acima para visualizar os turnos e residentes</p>
            </div>
          )}

          {/* Mensagem quando não há escalas */}
          {escalas.length === 0 && !loading && (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <p className="text-gray-500">Nenhuma escala encontrada</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
