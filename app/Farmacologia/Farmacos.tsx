'use client';

import React, { useState } from 'react';

// Interfaces para tipagem
interface Droga {
  droga: string;
  mecanismo: string;
  indicacoes: string;
  efeitos: string;
  observacoes: string;
}

interface GrupoFarmacologico {
  nome: string;
  grupos: Droga[];
}

interface FarmacoModalProps {
  isOpen: boolean;
  onClose: () => void;
  grupo: GrupoFarmacologico | null;
}

// Dados farmacológicos organizados
const dadosFarmacologicos: GrupoFarmacologico[] = [
  {
    nome: "Antibióticos Tópicos",
    grupos: [
      {
        droga: "Tobramicina 0.3%",
        mecanismo: "Aminoglicosídeo que inibe a síntese proteica bacteriana",
        indicacoes: "Conjuntivite bacteriana, ceratite bacteriana, profilaxia pós-cirúrgica",
        efeitos: "Bactericida contra Gram-negativos e alguns Gram-positivos",
        observacoes: "Aplicar 4-6x/dia. Evitar uso prolongado. Monitorar resistência."
      },
      {
        droga: "Moxifloxacino 0.5%",
        mecanismo: "Fluoroquinolona que inibe DNA girase e topoisomerase IV",
        indicacoes: "Ceratite bacteriana, conjuntivite bacteriana, profilaxia",
        efeitos: "Bactericida de amplo espectro (Gram+ e Gram-)",
        observacoes: "Aplicar 3-4x/dia. Excelente penetração corneana."
      },
      {
        droga: "Ciprofloxacino 0.3%",
        mecanismo: "Fluoroquinolona que inibe DNA girase bacteriana",
        indicacoes: "Ceratite bacteriana, conjuntivite, profilaxia",
        efeitos: "Bactericida contra Gram-negativos",
        observacoes: "Aplicar 4-6x/dia. Pode causar precipitação corneana."
      }
    ]
  },
  {
    nome: "Anti-inflamatórios Não Esteroidais",
    grupos: [
      {
        droga: "Diclofenaco 0.1%",
        mecanismo: "Inibe ciclooxigenase (COX-1 e COX-2), reduzindo prostaglandinas",
        indicacoes: "Inflamação pós-cirúrgica, dor ocular, edema macular cistóide",
        efeitos: "Anti-inflamatório, analgésico, antipirético",
        observacoes: "Aplicar 4x/dia. Pode retardar cicatrização corneana."
      },
      {
        droga: "Cetorolaco 0.5%",
        mecanismo: "Inibidor seletivo de COX-2, reduzindo prostaglandinas inflamatórias",
        indicacoes: "Dor pós-cirúrgica, inflamação ocular, edema macular",
        efeitos: "Anti-inflamatório potente, analgésico",
        observacoes: "Aplicar 4x/dia. Menor risco de efeitos sistêmicos."
      },
      {
        droga: "Bromfenaco 0.09%",
        mecanismo: "Inibidor de COX-2 com alta penetração ocular",
        indicacoes: "Inflamação pós-cirúrgica, dor ocular",
        efeitos: "Anti-inflamatório de longa duração",
        observacoes: "Aplicar 2x/dia. Boa penetração e duração."
      }
    ]
  },
  {
    nome: "Corticosteroides",
    grupos: [
      {
        droga: "Dexametasona 0.1%",
        mecanismo: "Glicocorticoide que inibe fosfolipase A2 e síntese de prostaglandinas",
        indicacoes: "Uveíte anterior, inflamação pós-cirúrgica, alergia ocular",
        efeitos: "Anti-inflamatório potente, imunossupressor",
        observacoes: "Aplicar 4-6x/dia. Monitorar PIO. Risco de catarata."
      },
      {
        droga: "Prednisolona 1%",
        mecanismo: "Corticoide que inibe mediadores inflamatórios",
        indicacoes: "Inflamação ocular, uveíte, alergia",
        efeitos: "Anti-inflamatório, antialérgico",
        observacoes: "Aplicar 4-6x/dia. Suspender gradualmente."
      },
      {
        droga: "Fluorometolona 0.1%",
        mecanismo: "Corticoide com menor efeito na PIO",
        indicacoes: "Inflamação ocular em pacientes com glaucoma",
        efeitos: "Anti-inflamatório com menor risco de elevação da PIO",
        observacoes: "Aplicar 4x/dia. Menor risco de glaucoma."
      }
    ]
  },
  {
    nome: "Midriáticos e Cicloplégicos",
    grupos: [
      {
        droga: "Tropicamida 1%",
        mecanismo: "Anticolinérgico que bloqueia receptores muscarínicos",
        indicacoes: "Dilatação pupilar para exame, retinoscopia",
        efeitos: "Midríase rápida, cicloplegia leve",
        observacoes: "Aplicar 1-2 gotas. Duração 4-6 horas."
      },
      {
        droga: "Ciclopentolato 1%",
        mecanismo: "Anticolinérgico com ação cicloplégica potente",
        indicacoes: "Cicloplegia para refração, uveíte anterior",
        efeitos: "Cicloplegia completa, midríase",
        observacoes: "Aplicar 2-3x com intervalo de 5 min. Duração 24h."
      },
      {
        droga: "Atropina 1%",
        mecanismo: "Anticolinérgico de longa duração",
        indicacoes: "Cicloplegia prolongada, uveíte anterior",
        efeitos: "Cicloplegia e midríase de longa duração",
        observacoes: "Aplicar 2-3x/dia. Duração 7-14 dias."
      }
    ]
  },
  {
    nome: "Antiglaucomatosos - Betabloqueadores",
    grupos: [
      {
        droga: "Timolol 0.25% e 0.5%",
        mecanismo: "Betabloqueador não seletivo que reduz produção de humor aquoso",
        indicacoes: "Glaucoma de ângulo aberto, hipertensão ocular",
        efeitos: "Redução da PIO em 20-30%",
        observacoes: "Aplicar 2x/dia. Contraindicado em asma/DPOC."
      },
      {
        droga: "Betaxolol 0.5%",
        mecanismo: "Betabloqueador seletivo beta-1",
        indicacoes: "Glaucoma, hipertensão ocular",
        efeitos: "Redução da PIO com menor risco pulmonar",
        observacoes: "Aplicar 2x/dia. Menor efeito na PIO que timolol."
      },
      {
        droga: "Levobunolol 0.5%",
        mecanismo: "Betabloqueador não seletivo de longa duração",
        indicacoes: "Glaucoma, hipertensão ocular",
        efeitos: "Redução da PIO por 24 horas",
        observacoes: "Aplicar 1-2x/dia. Efeito prolongado."
      }
    ]
  },
  {
    nome: "Antiglaucomatosos - Prostaglandinas",
    grupos: [
      {
        droga: "Latanoprosta 0.005%",
        mecanismo: "Análogo da prostaglandina F2α que aumenta drenagem uveoescleral",
        indicacoes: "Glaucoma de ângulo aberto, hipertensão ocular",
        efeitos: "Redução da PIO em 25-35%",
        observacoes: "Aplicar 1x/noite. Pode escurecer íris e cílios."
      },
      {
        droga: "Bimatoprosta 0.03%",
        mecanismo: "Prostaglandina que aumenta drenagem uveoescleral",
        indicacoes: "Glaucoma, hipertensão ocular",
        efeitos: "Redução da PIO potente",
        observacoes: "Aplicar 1x/noite. Pode causar hiperpigmentação."
      },
      {
        droga: "Travoprosta 0.004%",
        mecanismo: "Prostaglandina F2α sintética",
        indicacoes: "Glaucoma, hipertensão ocular",
        efeitos: "Redução da PIO significativa",
        observacoes: "Aplicar 1x/noite. Pode causar hiperemia."
      }
    ]
  },
  {
    nome: "Inibidores da Anidrase Carbônica",
    grupos: [
      {
        droga: "Dorzolamida 2%",
        mecanismo: "Inibe anidrase carbônica II, reduzindo produção de humor aquoso",
        indicacoes: "Glaucoma, hipertensão ocular",
        efeitos: "Redução da PIO em 15-20%",
        observacoes: "Aplicar 3x/dia. Pode causar gosto amargo."
      },
      {
        droga: "Brinzolamida 1%",
        mecanismo: "Inibidor seletivo da anidrase carbônica II",
        indicacoes: "Glaucoma, hipertensão ocular",
        efeitos: "Redução da PIO com menor efeito sistêmico",
        observacoes: "Aplicar 3x/dia. Suspensão mais viscosa."
      }
    ]
  },
  {
    nome: "Agonistas Alfa-2",
    grupos: [
      {
        droga: "Brimonidina 0.2%",
        mecanismo: "Agonista alfa-2 adrenérgico que reduz produção de humor aquoso",
        indicacoes: "Glaucoma, hipertensão ocular",
        efeitos: "Redução da PIO em 20-25%",
        observacoes: "Aplicar 3x/dia. Pode causar sonolência sistêmica."
      },
      {
        droga: "Apraclonidina 0.5% e 1%",
        mecanismo: "Agonista alfa-2 adrenérgico",
        indicacoes: "Prevenção de pico de PIO pós-laser",
        efeitos: "Redução aguda da PIO",
        observacoes: "Aplicar 1 hora antes e após procedimento."
      }
    ]
  },
  {
    nome: "Lubrificantes Oculares",
    grupos: [
      {
        droga: "Ácido Hialurônico 0.1-0.3%",
        mecanismo: "Polissacarídeo natural que retém água na superfície ocular",
        indicacoes: "Síndrome do olho seco, lubrificação ocular",
        efeitos: "Lubrificação, proteção da superfície ocular",
        observacoes: "Aplicar conforme necessidade. Sem conservantes."
      },
      {
        droga: "Carboximetilcelulose 0.5-1%",
        mecanismo: "Polímero que forma filme protetor na superfície ocular",
        indicacoes: "Olho seco, lubrificação, proteção",
        efeitos: "Lubrificação, estabilização do filme lacrimal",
        observacoes: "Aplicar 4-6x/dia. Viscosidade variável."
      },
      {
        droga: "Polietilenoglicol 0.4%",
        mecanismo: "Polímero que estabiliza o filme lacrimal",
        indicacoes: "Síndrome do olho seco, lubrificação",
        efeitos: "Lubrificação prolongada, proteção",
        observacoes: "Aplicar conforme necessidade. Duração prolongada."
      }
    ]
  },
  {
    nome: "Antivirais",
    grupos: [
      {
        droga: "Aciclovir 3%",
        mecanismo: "Análogo de nucleosídeo que inibe DNA polimerase viral",
        indicacoes: "Ceratite herpética, conjuntivite herpética",
        efeitos: "Antiviral contra HSV-1 e HSV-2",
        observacoes: "Aplicar 5x/dia. Tratamento por 7-10 dias."
      },
      {
        droga: "Ganciclovir 0.15%",
        mecanismo: "Análogo de nucleosídeo que inibe DNA polimerase viral",
        indicacoes: "Ceratite por CMV, retinite por CMV",
        efeitos: "Antiviral contra CMV",
        observacoes: "Aplicar 5x/dia. Gel oftálmico."
      },
      {
        droga: "Trifluridina 1%",
        mecanismo: "Análogo de timidina que inibe síntese de DNA viral",
        indicacoes: "Ceratite herpética, conjuntivite herpética",
        efeitos: "Antiviral contra HSV",
        observacoes: "Aplicar 9x/dia. Solução oftálmica."
      }
    ]
  }
];

// Componente do Modal
function FarmacoModal({ isOpen, onClose, grupo }: FarmacoModalProps) {
  if (!isOpen || !grupo) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-2xl font-bold text-gray-900">{grupo.nome}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl font-light"
          >
            ×
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6">
          <div className="space-y-6">
            {grupo.grupos.map((droga, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-blue-600 mb-4">{droga.droga}</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Mecanismo de Ação</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">{droga.mecanismo}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Indicações</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">{droga.indicacoes}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Efeitos</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">{droga.efeitos}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">Observações</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">{droga.observacoes}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Ícones SVG para cada grupo farmacológico
const IconAntibioticos = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);

const IconAntiInflamatorios = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const IconCorticosteroides = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const IconMidriaticos = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const IconBetabloqueadores = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const IconProstaglandinas = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const IconInibidores = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 100 19.5 9.75 9.75 0 000-19.5z" />
  </svg>
);

const IconAgonistas = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
  </svg>
);

const IconLubrificantes = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const IconAntivirais = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

// Array com os grupos e seus ícones
const gruposComIcones = [
  { ...dadosFarmacologicos[0], icone: <IconAntibioticos /> },
  { ...dadosFarmacologicos[1], icone: <IconAntiInflamatorios /> },
  { ...dadosFarmacologicos[2], icone: <IconCorticosteroides /> },
  { ...dadosFarmacologicos[3], icone: <IconMidriaticos /> },
  { ...dadosFarmacologicos[4], icone: <IconBetabloqueadores /> },
  { ...dadosFarmacologicos[5], icone: <IconProstaglandinas /> },
  { ...dadosFarmacologicos[6], icone: <IconInibidores /> },
  { ...dadosFarmacologicos[7], icone: <IconAgonistas /> },
  { ...dadosFarmacologicos[8], icone: <IconLubrificantes /> },
  { ...dadosFarmacologicos[9], icone: <IconAntivirais /> }
];

// Componente principal
export default function Farmacos() {
  const [modalOpen, setModalOpen] = useState(false);
  const [grupoSelecionado, setGrupoSelecionado] = useState<GrupoFarmacologico | null>(null);

  const handleGrupoClick = (grupo: GrupoFarmacologico) => {
    setGrupoSelecionado(grupo);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setGrupoSelecionado(null);
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Botão Voltar */}
        <div className="mb-6">
          <button
            onClick={() => window.history.back()}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar ao Menu Principal
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Farmacologia Oftalmológica
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Selecione o grupo farmacológico para acessar informações detalhadas sobre mecanismos de ação, indicações e observações
          </p>
        </div>

        {/* Grid de Grupos Farmacológicos */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {gruposComIcones.map((grupo, index) => (
            <button
              key={index}
              onClick={() => handleGrupoClick(grupo)}
              className="group relative bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 hover:border-blue-400 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2"
              title={`Clique para ver detalhes sobre ${grupo.nome}`}
            >
              {/* Ícone */}
              <div className="text-blue-600 mb-3 md:mb-4 text-center group-hover:text-blue-700 group-hover:scale-110 transition-all duration-300">
                {grupo.icone}
              </div>

              {/* Título */}
              <h3 className="text-sm md:text-lg font-semibold text-gray-900 mb-1 md:mb-2 text-center group-hover:text-gray-700 transition-colors">
                {grupo.nome}
              </h3>

              {/* Contador de medicamentos */}
              <p className="text-xs md:text-sm text-gray-500 text-center">
                {grupo.grupos.length} medicamento{grupo.grupos.length !== 1 ? 's' : ''}
              </p>

              {/* Indicador de clique */}
              <div className="absolute top-2 md:top-4 right-2 md:right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <svg 
                  className="w-4 h-4 md:w-5 md:h-5 text-blue-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 5l7 7-7 7" 
                  />
                </svg>
              </div>

              {/* Efeito de hover */}
              <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-blue-300 transition-all duration-300 pointer-events-none"></div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Informações farmacológicas para uso clínico oftalmológico
          </p>
        </div>
      </div>

      {/* Modal */}
      <FarmacoModal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        grupo={grupoSelecionado}
      />
    </div>
  );
}