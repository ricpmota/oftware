'use client';

import React, { useState } from 'react';

// Interfaces para tipagem
interface Droga {
  droga: string;
  classe?: string;
  via?: string;
  posologia?: string;
  mecanismo: string;
  indicacoes: string;
  efeitos: string;
  contraindicacoes?: string;
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

// Dados farmacológicos organizados conforme especificado
const dadosFarmacologicos: GrupoFarmacologico[] = [
  {
    nome: "Conservantes",
    grupos: [
      {
        droga: "Cloreto de Benzalcônio (BAK)",
        classe: "Conservante catiónico de amônio quaternário",
        via: "Presente em colírios",
        posologia: "Não se aplica (componente veiculado)",
        mecanismo: "Desorganiza a membrana celular microbiana, causando lise.",
        indicacoes: "Preservação antimicrobiana de colírios multiuso.",
        efeitos: "Toxicidade para o epitélio corneano, olhos secos, inflamação da superfície ocular.",
        contraindicacoes: "Pacientes com olho seco moderado a grave, uso crônico em portadores de glaucoma.",
        observacoes: "Mais tóxico entre os conservantes; contraindicado em uso contínuo. Pode desestabilizar filme lacrimal."
      },
      {
        droga: "EDTA (Ácido Etilenodiamino Tetra-acético)",
        classe: "Quelante de metais pesados",
        via: "Componente de colírios",
        posologia: "Não se aplica (componente veiculado)",
        mecanismo: "Inativa íons metálicos essenciais à atividade microbiana.",
        indicacoes: "Potencializa ação de conservantes como o BAK.",
        efeitos: "Pode causar leve toxicidade epitelial com uso prolongado.",
        contraindicacoes: "Hipersensibilidade conhecida ao componente (raro).",
        observacoes: "Frequentemente associado ao BAK. Menos tóxico isoladamente."
      },
      {
        droga: "Purite®",
        classe: "Conservante oxidativo (estabilizado com clorito de sódio)",
        via: "Colírios multiuso (ex: brimonidina com purite)",
        posologia: "Não se aplica (componente veiculado)",
        mecanismo: "Libera pequenas quantidades de oxidantes que degradam após contato ocular.",
        indicacoes: "Alternativa ao BAK para reduzir toxicidade.",
        efeitos: "Menor irritação que BAK. Possível desconforto leve inicial.",
        contraindicacoes: "Raramente necessário suspender. Melhor tolerado em geral.",
        observacoes: "Decompõe-se em água, oxigênio e sal. Boa opção em uso prolongado."
      },
      {
        droga: "Polyquad®",
        classe: "Polímero catiônico de alta massa molecular",
        via: "Colírios multiuso (ex: lubrificantes, antialérgicos)",
        posologia: "Não se aplica (componente veiculado)",
        mecanismo: "Atua na membrana bacteriana sem penetrar nas células da superfície ocular.",
        indicacoes: "Preservação com maior biocompatibilidade ocular.",
        efeitos: "Baixa incidência de reações adversas.",
        contraindicacoes: "Casos raros de intolerância individual.",
        observacoes: "Mais seguro para uso contínuo. Preferido em colírios lubrificantes."
      }
    ]
  },
  {
    nome: "Anestésicos",
    grupos: [
      {
        droga: "Proximetacaína (0,5%)",
        classe: "Anestésico local tipo éster",
        via: "Colírio",
        posologia: "1–2 gotas antes de procedimentos. Não repetir frequentemente.",
        mecanismo: "Bloqueia canais de sódio na membrana neuronal, impedindo o impulso nervoso.",
        indicacoes: "Tonometrias, remoção de corpo estranho, testes diagnósticos, pequenas cirurgias.",
        efeitos: "Queimação transitória, toxicidade epitelial com uso repetido.",
        contraindicacoes: "Uso prolongado ou frequente. Alergia a anestésicos do tipo éster.",
        observacoes: "Mais potente que tetracaína. Uso estritamente em consultório ou hospitalar."
      },
      {
        droga: "Tetracaína (0,5% a 1%)",
        classe: "Anestésico local tipo éster",
        via: "Colírio",
        posologia: "1 gota antes de procedimento. Reaplicar se necessário após 5 min.",
        mecanismo: "Bloqueio reversível dos canais de sódio neuronais.",
        indicacoes: "Procedimentos oftalmológicos de curta duração.",
        efeitos: "Ardência, hiperemia, toxicidade corneana com uso repetido.",
        contraindicacoes: "Uso domiciliar. Hipersensibilidade a anestésicos locais.",
        observacoes: "Uso muito comum em triagens, exames e pequenas intervenções."
      },
      {
        droga: "Lidocaína 2% gel",
        classe: "Anestésico local tipo amida",
        via: "Gel oftálmico",
        posologia: "Aplicar pequena quantidade na conjuntiva antes de cirurgia.",
        mecanismo: "Bloqueio dos canais de sódio nos nervos periféricos.",
        indicacoes: "Anestesia em cirurgias como catarata, pterígio, etc.",
        efeitos: "Desconforto inicial, visão embaçada transitória.",
        contraindicacoes: "Alergia a amidas. Uso em procedimentos curtos.",
        observacoes: "Menor toxicidade epitelial que os ésteres. Mais confortável ao paciente."
      }
    ]
  },
  {
    nome: "Corantes",
    grupos: [
      {
        droga: "Fluoresceína sódica",
        classe: "Corante hidrossolúvel",
        via: "Colírio ou tira impregnada",
        posologia: "1 gota ou uma tira na conjuntiva inferior. Exame imediato.",
        mecanismo: "Emite fluorescência em presença de luz azul cobalto; revela lesões epiteliais e fluxo lacrimal.",
        indicacoes: "Detecção de defeitos epiteliais, avaliação do filme lacrimal, tonometria de aplanação.",
        efeitos: "Desconforto leve, coloração temporária da pele ou lentes.",
        contraindicacoes: "Hipersensibilidade ao corante.",
        observacoes: "Usar com lâmpada de fenda com filtro azul. Interfere com lentes de contato gelatinosas."
      },
      {
        droga: "Azul de Tripano",
        classe: "Corante vital",
        via: "Uso intraoperatório (injeção intracameral ou aplicação tópica)",
        posologia: "Pequena quantidade sob orientação cirúrgica.",
        mecanismo: "Corante seletivo por células não viáveis; auxilia na visualização de estruturas como cápsula anterior.",
        indicacoes: "Facilitar capsulorrexe em cirurgia de catarata, avaliação de membranas epirretinianas.",
        efeitos: "Irritação ocular leve, toxicidade endotelial se mal utilizado.",
        contraindicacoes: "Evitar contato direto prolongado com endotélio.",
        observacoes: "Requer técnica precisa. Fundamental em cataratas brancas ou pseudoexfoliação."
      },
      {
        droga: "Verde de Lisamina",
        classe: "Corante vital",
        via: "Tira oftálmica ou colírio",
        posologia: "1 tira ou 1 gota no fundo de saco inferior.",
        mecanismo: "Corante que marca células danificadas e mucina degenerada da superfície ocular.",
        indicacoes: "Avaliação de olho seco, lesões da conjuntiva bulbar e palpebral.",
        efeitos: "Irritação discreta. Pode causar leve ardência inicial.",
        contraindicacoes: "Rara hipersensibilidade.",
        observacoes: "Excelente marcador de dano epitelial crônico. Não interfere na visão como fluoresceína."
      },
      {
        droga: "Azul de Metileno",
        classe: "Corante vital com propriedades antimicrobianas",
        via: "Tópico (uso laboratorial ou diagnóstico específico)",
        posologia: "Aplicação controlada conforme objetivo diagnóstico.",
        mecanismo: "Corante catiônico que penetra em células danificadas.",
        indicacoes: "Histologia, testes laboratoriais e microbiológicos. Raramente usado clinicamente.",
        efeitos: "Irritação ocular significativa. Coloração intensa de tecidos.",
        contraindicacoes: "Uso clínico direto em estruturas delicadas.",
        observacoes: "Uso limitado em oftalmologia moderna. Substituído por alternativas mais seguras."
      }
    ]
  },
  {
    nome: "Anti-inflamatórios",
    grupos: [
      {
        droga: "Prednisolona acetato 1%",
        classe: "Corticosteroide tópico",
        via: "Colírio",
        posologia: "1 gota 4/4h a cada 6h, ajustado conforme gravidade",
        mecanismo: "Inibe fosfolipase A2 e liberação de mediadores inflamatórios.",
        indicacoes: "Uveítes anteriores, pós-operatório, ceratites não infecciosas.",
        efeitos: "Aumento da PIO, risco de infecções oportunistas, catarata subcapsular posterior.",
        contraindicacoes: "Infecções fúngicas, virais ou tuberculose ocular ativa sem tratamento.",
        observacoes: "Potente e eficaz. Monitorar PIO em tratamentos prolongados."
      },
      {
        droga: "Dexametasona 0,1%",
        classe: "Corticosteroide tópico",
        via: "Colírio ou pomada",
        posologia: "1 gota 4x/dia ou conforme orientação",
        mecanismo: "Mesma ação anti-inflamatória da prednisolona, porém menos potente topicamente.",
        indicacoes: "Conjuntivites alérgicas graves, inflamações pós-operatórias leves.",
        efeitos: "Aumento da PIO, opacificação do cristalino, supressão da cicatrização.",
        contraindicacoes: "Ceratoepitelite herpética, micoses oculares.",
        observacoes: "Frequentemente usado em colírios combinados com antibióticos."
      },
      {
        droga: "Fluorometolona 0,1% (FML)",
        classe: "Corticosteroide de baixa penetração intraocular",
        via: "Colírio ou pomada",
        posologia: "1 gota 2–4x/dia",
        mecanismo: "Ação anti-inflamatória local com baixa absorção intraocular.",
        indicacoes: "Conjuntivites alérgicas, blefarites crônicas, pós-operatório leve.",
        efeitos: "Risco menor de aumento de PIO, desconforto leve.",
        contraindicacoes: "Infecção ocular ativa.",
        observacoes: "Preferido em pacientes com risco de resposta hipertensiva ocular."
      },
      {
        droga: "Nepafenaco 0,1%",
        classe: "AINE não seletivo",
        via: "Colírio",
        posologia: "1 gota 3x/dia",
        mecanismo: "Inibe a COX-1 e COX-2, reduzindo prostaglandinas inflamatórias.",
        indicacoes: "Controle de dor e inflamação pós-operatória, prevenção de edema macular cistoide.",
        efeitos: "Ardência, atraso na cicatrização, possível toxicidade epitelial.",
        contraindicacoes: "Ulceração corneana, hipersensibilidade a AINEs.",
        observacoes: "Boa penetração intraocular. Pode ser usado junto a corticosteroides."
      },
      {
        droga: "Cetorolaco trometamina 0,5%",
        classe: "AINE não seletivo",
        via: "Colírio",
        posologia: "1 gota 4x/dia",
        mecanismo: "Bloqueio da ciclooxigenase, reduzindo inflamação e dor.",
        indicacoes: "Controle da dor pós-operatória, conjuntivite alérgica sazonal.",
        efeitos: "Ardência, hiperemia, ceratite superficial pontuada.",
        contraindicacoes: "Úlceras corneanas, olho seco grave.",
        observacoes: "Uso comum no pré e pós-operatório de catarata."
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
                  {droga.classe && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Classe</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">{droga.classe}</p>
                    </div>
                  )}
                  
                  {droga.via && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Via</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">{droga.via}</p>
                    </div>
                  )}
                  
                  {droga.posologia && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Posologia</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">{droga.posologia}</p>
                    </div>
                  )}
                  
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
                  
                  {droga.contraindicacoes && (
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Contraindicações</h4>
                      <p className="text-gray-700 text-sm leading-relaxed">{droga.contraindicacoes}</p>
                    </div>
                  )}
                  
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
const IconConservantes = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);

const IconAnestesicos = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
  </svg>
);

const IconCorantes = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
  </svg>
);

const IconAntiInflamatorios = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

// Array com os grupos e seus ícones
const gruposComIcones = [
  { ...dadosFarmacologicos[0], icone: <IconConservantes /> },
  { ...dadosFarmacologicos[1], icone: <IconAnestesicos /> },
  { ...dadosFarmacologicos[2], icone: <IconCorantes /> },
  { ...dadosFarmacologicos[3], icone: <IconAntiInflamatorios /> }
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