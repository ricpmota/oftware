'use client';

import React, { useState } from 'react';

const tratamentosGlaucoma = {
  // Protocolos de Tratamento por Classificação
  protocolos: {
    gpaa: {
      titulo: 'Protocolo GPAA - Glaucoma Primário de Ângulo Aberto',
      descricao: 'Tratamento escalonado baseado na gravidade e fatores de risco',
      etapas: [
        {
          fase: 'Fase 1 - Monoterapia',
          medicamentos: ['Latanoprosta 0,005% 1x/noite', 'Timolol 0,5% 2x/dia'],
          duracao: '3-6 meses',
          objetivo: 'Redução de 20-30% da PIO'
        },
        {
          fase: 'Fase 2 - Associação',
          medicamentos: ['Latanoprosta + Timolol', 'Dorzolamida + Timolol'],
          duracao: '3-6 meses',
          objetivo: 'Redução adicional de 15-20% da PIO'
        },
        {
          fase: 'Fase 3 - Terapia Tripla',
          medicamentos: ['Prostaglandina + Betabloqueador + IAC'],
          duracao: 'Contínua',
          objetivo: 'Controle da PIO < 18 mmHg'
        },
        {
          fase: 'Fase 4 - Cirúrgica',
          opcoes: ['Trabeculoplastia a laser (SLT)', 'Cirurgia filtrante'],
          indicacao: 'Falha do tratamento clínico'
        }
      ],
      monitoramento: [
        'PIO: mensal nos primeiros 3 meses, depois trimestral',
        'Campimetria: semestral',
        'OCT do nervo óptico: anual',
        'Gonioscopia: anual'
      ]
    },
    anguloEstreito: {
      titulo: 'Protocolo GAE - Glaucoma de Ângulo Estreito',
      descricao: 'Tratamento urgente para prevenir crises agudas',
      etapas: [
        {
          fase: 'Emergência - Crise Aguda',
          medicamentos: ['Pilocarpina 2% 1 gota a cada 15 min', 'Timolol 0,5% 1 gota', 'Dorzolamida 2% 1 gota'],
          duracao: '1-2 horas',
          objetivo: 'Quebra da crise aguda'
        },
        {
          fase: 'Estabilização',
          medicamentos: ['Pilocarpina 2% 4x/dia', 'Timolol 0,5% 2x/dia'],
          duracao: '24-48 horas',
          objetivo: 'Controle da PIO'
        },
        {
          fase: 'Definitivo - Iridotomia',
          procedimento: 'Iridotomia a laser (YAG)',
          duracao: 'Imediata',
          objetivo: 'Prevenção de novas crises'
        },
        {
          fase: 'Manutenção',
          medicamentos: ['Prostaglandinas ou Betabloqueadores'],
          duracao: 'Contínua',
          objetivo: 'Controle da PIO'
        }
      ],
      monitoramento: [
        'PIO: diária na crise, depois semanal',
        'Gonioscopia: após iridotomia',
        'Biomicroscopia: para avaliar câmara anterior'
      ]
    },
    secundario: {
      titulo: 'Protocolo Glaucoma Secundário',
      descricao: 'Tratamento da causa base + controle da PIO',
      tipos: {
        uveitico: {
          causa: 'Uveíte',
          tratamento: ['Corticoides tópicos', 'Ciclopléticos', 'Prostaglandinas'],
          observacoes: 'Evitar prostaglandinas em uveíte ativa'
        },
        neovascular: {
          causa: 'Diabetes/Oclusão venosa',
          tratamento: ['Panfotocoagulação', 'Anti-VEGF', 'Implantes de drenagem'],
          observacoes: 'Tratar a causa vascular primeiro'
        },
        'pos-trauma': {
          causa: 'Trauma ocular',
          tratamento: ['Ciclodestruição', 'Implantes de drenagem'],
          observacoes: 'Avaliar integridade da câmara anterior'
        }
      }
    },
    congenito: {
      titulo: 'Protocolo Glaucoma Congênito',
      descricao: 'Tratamento cirúrgico precoce é fundamental',
      etapas: [
        {
          fase: 'Diagnóstico',
          exames: ['Exame sob anestesia', 'Biomicroscopia', 'Gonioscopia'],
          objetivo: 'Confirmação diagnóstica'
        },
        {
          fase: 'Cirurgia Primária',
          opcoes: ['Goniotomia', 'Trabeculotomia'],
          duracao: 'Imediata',
          objetivo: 'Abertura do ângulo'
        },
        {
          fase: 'Pós-operatório',
          medicamentos: ['Atropina 1%', 'Corticoides tópicos'],
          duracao: '1-2 semanas',
          objetivo: 'Controle da inflamação'
        },
        {
          fase: 'Monitoramento',
          frequencia: 'Semanal inicial, depois mensal',
          objetivo: 'Avaliar sucesso cirúrgico'
        }
      ]
    },
    normotensivo: {
      titulo: 'Protocolo GNT - Glaucoma Normotensivo',
      descricao: 'Redução de 30% da PIO + tratamento de fatores vasculares',
      etapas: [
        {
          fase: 'Redução da PIO',
          medicamentos: ['Prostaglandinas (1ª linha)', 'Betabloqueadores'],
          objetivo: 'Redução de 30% da PIO'
        },
        {
          fase: 'Avaliação Vascular',
          exames: ['Doppler carotídeo', 'Polissonografia', 'Monitorização PA'],
          objetivo: 'Identificar fatores vasculares'
        },
        {
          fase: 'Tratamento Vascular',
          opcoes: ['Controle da PA', 'Tratamento da apneia', 'Vasodilatadores'],
          objetivo: 'Melhorar perfusão ocular'
        },
        {
          fase: 'Monitoramento',
          frequencia: 'Trimestral',
          objetivo: 'Avaliar progressão'
        }
      ]
    }
  },

  // Alternativas de Medicamentos
  alternativas: {
    prostaglandinas: {
      titulo: 'Alternativas às Prostaglandinas',
      opcoes: [
        {
          classe: 'Betabloqueadores',
          exemplos: ['Timolol 0,5% 2x/dia', 'Timolol 0,25% 2x/dia'],
          vantagens: 'Eficaz, bem tolerado',
          desvantagens: 'Contraindicado em asma/DPOC'
        },
        {
          classe: 'Inibidores da Anidrase Carbônica',
          exemplos: ['Dorzolamida 2% 2x/dia', 'Brinzolamida 1% 2x/dia'],
          vantagens: 'Alternativa para intolerantes a betabloqueadores',
          desvantagens: 'Sabor amargo, ardor'
        },
        {
          classe: 'Agonistas Alfa-2',
          exemplos: ['Brimonidina 0,2% 2x/dia'],
          vantagens: 'Duplo mecanismo',
          desvantagens: 'Hiperemia, sonolência'
        }
      ]
    },
    betabloqueadores: {
      titulo: 'Alternativas aos Betabloqueadores',
      opcoes: [
        {
          classe: 'Prostaglandinas',
          exemplos: ['Latanoprosta 0,005% 1x/noite', 'Travoprosta 0,004% 1x/noite'],
          vantagens: 'Maior eficácia, uso noturno',
          desvantagens: 'Hiperemia, crescimento de cílios'
        },
        {
          classe: 'Inibidores da Anidrase Carbônica',
          exemplos: ['Dorzolamida 2% 2x/dia'],
          vantagens: 'Sem contraindicações cardiovasculares',
          desvantagens: 'Sabor amargo'
        },
        {
          classe: 'Agonistas Alfa-2',
          exemplos: ['Brimonidina 0,2% 2x/dia'],
          vantagens: 'Útil como adjuvante',
          desvantagens: 'Efeitos sistêmicos'
        }
      ]
    },
    inibidoresAnidrase: {
      titulo: 'Alternativas aos Inibidores da Anidrase Carbônica',
      opcoes: [
        {
          classe: 'Prostaglandinas',
          exemplos: ['Latanoprosta 0,005% 1x/noite', 'Travoprosta 0,004% 1x/noite'],
          vantagens: 'Maior eficácia, uso noturno',
          desvantagens: 'Hiperemia, crescimento de cílios'
        },
        {
          classe: 'Betabloqueadores',
          exemplos: ['Timolol 0,5% 2x/dia', 'Timolol 0,25% 2x/dia'],
          vantagens: 'Eficaz, bem tolerado',
          desvantagens: 'Contraindicado em asma/DPOC'
        },
        {
          classe: 'Agonistas Alfa-2',
          exemplos: ['Brimonidina 0,2% 2x/dia'],
          vantagens: 'Duplo mecanismo',
          desvantagens: 'Hiperemia, sonolência'
        }
      ]
    },
    agonistasAlfa: {
      titulo: 'Alternativas aos Agonistas Alfa-2',
      opcoes: [
        {
          classe: 'Prostaglandinas',
          exemplos: ['Latanoprosta 0,005% 1x/noite', 'Travoprosta 0,004% 1x/noite'],
          vantagens: 'Maior eficácia, uso noturno',
          desvantagens: 'Hiperemia, crescimento de cílios'
        },
        {
          classe: 'Betabloqueadores',
          exemplos: ['Timolol 0,5% 2x/dia', 'Timolol 0,25% 2x/dia'],
          vantagens: 'Eficaz, bem tolerado',
          desvantagens: 'Contraindicado em asma/DPOC'
        },
        {
          classe: 'Inibidores da Anidrase Carbônica',
          exemplos: ['Dorzolamida 2% 2x/dia', 'Brinzolamida 1% 2x/dia'],
          vantagens: 'Alternativa para intolerantes a betabloqueadores',
          desvantagens: 'Sabor amargo, ardor'
        }
      ]
    },
    coliriosCombinados: {
      titulo: 'Alternativas aos Colírios Combinados',
      opcoes: [
        {
          classe: 'Monoterapia com Prostaglandinas',
          exemplos: ['Latanoprosta 0,005% 1x/noite'],
          vantagens: 'Simplicidade, menor custo',
          desvantagens: 'Pode ser menos eficaz'
        },
        {
          classe: 'Associação de Medicamentos Separados',
          exemplos: ['Prostaglandina + Betabloqueador em frascos separados'],
          vantagens: 'Flexibilidade de posologia',
          desvantagens: 'Mais instilações, menor adesão'
        },
        {
          classe: 'Terapia Tripla',
          exemplos: ['Prostaglandina + Betabloqueador + IAC'],
          vantagens: 'Máxima eficácia',
          desvantagens: 'Múltiplas instilações, maior custo'
        }
      ]
    }
  },

  // Planos de Investigação
  planosInvestigacao: {
    gpaa: {
      titulo: 'Plano de Investigação - GPAA',
      exames: [
        'Campimetria computadorizada (24-2 ou 30-2)',
        'OCT do nervo óptico e camada de fibras nervosas',
        'Gonioscopia (ângulo aberto)',
        'Curva tensional diária (pelo menos 3 medidas)',
        'Retinografia colorida',
        'Biomicroscopia do disco óptico',
        'Pachimetria corneana'
      ],
      frequencia: 'Semestral para estágios iniciais, trimestral para avançados',
      criterios: 'PIO > 21 mmHg, escavação > 0.6, assimetria > 0.2'
    },
    anguloEstreito: {
      titulo: 'Plano de Investigação - GAE',
      exames: [
        'Gonioscopia (ângulo estreito/fechado)',
        'Biomicroscopia (câmara anterior rasa)',
        'Curva tensional (picos elevados)',
        'Ultrassom biomicroscópico',
        'AS-OCT (Tomografia de coerência óptica anterior)',
        'Biometria (comprimento axial)'
      ],
      frequencia: 'Mensal inicial, depois trimestral',
      criterios: 'Hipermetropia > +3.00D, câmara anterior rasa'
    },
    secundario: {
      titulo: 'Plano de Investigação - Glaucoma Secundário',
      exames: [
        'Biomicroscopia detalhada',
        'Gonioscopia (achados específicos)',
        'Angiofluoresceinografia (se neovascular)',
        'Ultrassom (se tumores)',
        'Exames laboratoriais (se inflamatório)',
        'Tomografia computadorizada (se trauma)'
      ],
      frequencia: 'Conforme causa base',
      criterios: 'História de trauma, uveíte, diabetes'
    }
  }
};

export default function GlaucomaTratamentoModal({ 
  isOpen, 
  onClose, 
  tipo, 
  modo = 'protocolo' // 'protocolo', 'alternativas', 'investigacao'
}) {
  const [selectedTipo, setSelectedTipo] = useState(tipo || 'gpaa');

  if (!isOpen) return null;

  const renderProtocolo = () => {
    const protocolo = tratamentosGlaucoma.protocolos[selectedTipo];
    if (!protocolo) return <div>Protocolo não encontrado</div>;

    return (
      <div className="space-y-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="text-xl font-semibold text-blue-900 mb-2">{protocolo.titulo}</h3>
          <p className="text-blue-800">{protocolo.descricao}</p>
        </div>

        <div className="space-y-4">
          {protocolo.etapas?.map((etapa, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">{etapa.fase}</h4>
              <div className="space-y-2">
                {etapa.medicamentos && (
                  <div>
                    <span className="font-medium text-gray-700">Medicamentos: </span>
                    <span className="text-gray-600">{etapa.medicamentos.join(', ')}</span>
                  </div>
                )}
                {etapa.procedimento && (
                  <div>
                    <span className="font-medium text-gray-700">Procedimento: </span>
                    <span className="text-gray-600">{etapa.procedimento}</span>
                  </div>
                )}
                {etapa.opcoes && (
                  <div>
                    <span className="font-medium text-gray-700">Opções: </span>
                    <span className="text-gray-600">{etapa.opcoes.join(', ')}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-700">Duração: </span>
                  <span className="text-gray-600">{etapa.duracao}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Objetivo: </span>
                  <span className="text-gray-600">{etapa.objetivo}</span>
                </div>
              </div>
            </div>
          ))}

          {protocolo.monitoramento && (
            <div className="bg-green-50 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 mb-3">Monitoramento</h4>
              <ul className="space-y-1">
                {protocolo.monitoramento.map((item, index) => (
                  <li key={index} className="text-green-800 text-sm flex items-start">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAlternativas = () => {
    const alternativas = tratamentosGlaucoma.alternativas[selectedTipo];
    if (!alternativas) return <div>Alternativas não encontradas</div>;

    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 rounded-lg p-4">
          <h3 className="text-xl font-semibold text-yellow-900 mb-2">{alternativas.titulo}</h3>
        </div>

        <div className="space-y-4">
          {alternativas.opcoes.map((opcao, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">{opcao.classe}</h4>
              <div className="space-y-2">
                <div>
                  <span className="font-medium text-gray-700">Exemplos: </span>
                  <span className="text-gray-600">{opcao.exemplos.join(', ')}</span>
                </div>
                <div>
                  <span className="font-medium text-green-700">Vantagens: </span>
                  <span className="text-green-600">{opcao.vantagens}</span>
                </div>
                <div>
                  <span className="font-medium text-red-700">Desvantagens: </span>
                  <span className="text-red-600">{opcao.desvantagens}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderInvestigacao = () => {
    const plano = tratamentosGlaucoma.planosInvestigacao[selectedTipo];
    if (!plano) return <div>Plano de investigação não encontrado</div>;

    return (
      <div className="space-y-6">
        <div className="bg-purple-50 rounded-lg p-4">
          <h3 className="text-xl font-semibold text-purple-900 mb-2">{plano.titulo}</h3>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Exames Necessários</h4>
            <ul className="space-y-2">
              {plano.exames.map((exame, index) => (
                <li key={index} className="text-gray-700 text-sm flex items-start">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  {exame}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-3">Frequência de Monitoramento</h4>
            <p className="text-blue-800">{plano.frequencia}</p>
          </div>

          <div className="bg-orange-50 rounded-lg p-4">
            <h4 className="font-semibold text-orange-900 mb-3">Critérios de Suspeição</h4>
            <p className="text-orange-800">{plano.criterios}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-light text-gray-800 mb-2">
              {modo === 'protocolo' && 'Protocolo de Tratamento'}
              {modo === 'alternativas' && 'Alternativas Terapêuticas'}
              {modo === 'investigacao' && 'Plano de Investigação'}
            </h2>
            <p className="text-gray-600 text-sm">Informações detalhadas para conduta clínica</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-light transition-colors duration-200"
          >
            ×
          </button>
        </div>

        {/* Seletor de Tipo (apenas para alternativas) */}
        {modo === 'alternativas' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Selecione a Classe:</label>
            <select
              value={selectedTipo}
              onChange={(e) => setSelectedTipo(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            >
              <option value="prostaglandinas">Prostaglandinas (Análogos da prostaglandina F2α)</option>
              <option value="betabloqueadores">Betabloqueadores</option>
              <option value="inibidoresAnidrase">Inibidores da Anidrase Carbônica (IAC tópicos)</option>
              <option value="agonistasAlfa">Agonistas Alfa-2 Adrenérgicos</option>
              <option value="coliriosCombinados">Colírios Combinados (Associação Fixa)</option>
            </select>
          </div>
        )}

        {/* Conteúdo Dinâmico */}
        <div className="bg-gray-50 rounded-xl p-6">
          {modo === 'protocolo' && renderProtocolo()}
          {modo === 'alternativas' && renderAlternativas()}
          {modo === 'investigacao' && renderInvestigacao()}
        </div>
      </div>
    </div>
  );
}
