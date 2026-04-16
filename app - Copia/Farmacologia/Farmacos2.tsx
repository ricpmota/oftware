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

// Dados farmacológicos organizados conforme especificado
const dadosFarmacologicos: GrupoFarmacologico[] = [
  {
    nome: "Conservantes",
    grupos: [
      {
        droga: "Benzalcônio (BAK)",
        mecanismo: "Catiônico que destrói a membrana celular bacteriana",
        indicacoes: "Conservante em colírios e soluções oftálmicas",
        efeitos: "Bactericida, fungicida, virucida",
        observacoes: "Pode causar toxicidade corneana com uso prolongado. Evitar em olho seco."
      },
      {
        droga: "Cloreto de Benzalcônio",
        mecanismo: "Surfactante catiônico que desestabiliza membranas",
        indicacoes: "Conservante em preparações oftálmicas",
        efeitos: "Antimicrobiano de amplo espectro",
        observacoes: "Pode causar irritação e toxicidade epitelial."
      },
      {
        droga: "EDTA",
        mecanismo: "Quelante de íons metálicos essenciais para bactérias",
        indicacoes: "Conservante sinérgico em colírios",
        efeitos: "Potencializa ação de outros conservantes",
        observacoes: "Usado em associação com outros conservantes."
      }
    ]
  },
  {
    nome: "Anestésicos",
    grupos: [
      {
        droga: "Proparacaína 0.5%",
        mecanismo: "Anestésico local que bloqueia canais de sódio",
        indicacoes: "Anestesia tópica para procedimentos oftálmicos",
        efeitos: "Anestesia rápida e de curta duração",
        observacoes: "Aplicar 1-2 gotas. Duração 10-20 minutos. Não usar para dor crônica."
      },
      {
        droga: "Tetracaína 0.5%",
        mecanismo: "Anestésico local que inibe condução nervosa",
        indicacoes: "Anestesia tópica, tonometria, procedimentos",
        efeitos: "Anestesia mais prolongada que proparacaína",
        observacoes: "Aplicar 1-2 gotas. Duração 15-30 minutos. Pode causar toxicidade."
      },
      {
        droga: "Lidocaína 2%",
        mecanismo: "Anestésico local que bloqueia canais de sódio",
        indicacoes: "Anestesia local para procedimentos",
        efeitos: "Anestesia de duração intermediária",
        observacoes: "Usado principalmente para anestesia local, não tópica."
      }
    ]
  },
  {
    nome: "Corantes",
    grupos: [
      {
        droga: "Fluoresceína 2%",
        mecanismo: "Corante que se liga ao epitélio corneano danificado",
        indicacoes: "Detecção de defeitos epiteliais, tonometria",
        efeitos: "Coloração verde-amarelada de áreas danificadas",
        observacoes: "Aplicar 1 gota. Usar lâmpada de cobalto azul. Pode causar reação alérgica."
      },
      {
        droga: "Rosa Bengala 1%",
        mecanismo: "Corante que se liga a células epiteliais mortas",
        indicacoes: "Avaliação de olho seco, ceratite",
        efeitos: "Coloração rosa de células epiteliais danificadas",
        observacoes: "Pode causar irritação. Usar com anestésico tópico."
      },
      {
        droga: "Azul de Metileno 1%",
        mecanismo: "Corante que marca tecidos necróticos",
        indicacoes: "Identificação de tecidos necróticos",
        efeitos: "Coloração azul de áreas necróticas",
        observacoes: "Usado em procedimentos cirúrgicos específicos."
      }
    ]
  },
  {
    nome: "Anti-inflamatórios",
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
      }
    ]
  },
  {
    nome: "Antialérgicos",
    grupos: [
      {
        droga: "Olopatadina 0.1%",
        mecanismo: "Antagonista H1 e estabilizador de mastócitos",
        indicacoes: "Conjuntivite alérgica, prurido ocular",
        efeitos: "Antialérgico, antipruriginoso",
        observacoes: "Aplicar 2x/dia. Efeito duradouro. Poucos efeitos colaterais."
      },
      {
        droga: "Cromoglicato de Sódio 4%",
        mecanismo: "Estabilizador de mastócitos, inibe liberação de histamina",
        indicacoes: "Conjuntivite alérgica, ceratoconjuntivite vernal",
        efeitos: "Preventivo de reações alérgicas",
        observacoes: "Aplicar 4x/dia. Efeito preventivo, não trata crise aguda."
      },
      {
        droga: "Azelastina 0.05%",
        mecanismo: "Antagonista H1 e inibidor de liberação de histamina",
        indicacoes: "Conjuntivite alérgica",
        efeitos: "Antialérgico, antipruriginoso",
        observacoes: "Aplicar 2x/dia. Pode causar sonolência sistêmica."
      }
    ]
  },
  {
    nome: "Lubrificantes e Superfície Ocular",
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
      },
      {
        droga: "Ciclosporina 0.05%",
        mecanismo: "Imunossupressor que reduz inflamação da superfície ocular",
        indicacoes: "Olho seco moderado a grave, ceratite",
        efeitos: "Anti-inflamatório, melhora produção lacrimal",
        observacoes: "Aplicar 2x/dia. Pode causar ardor inicial."
      }
    ]
  },
  {
    nome: "Drogas Colinérgicas e Anticolinérgicas",
    grupos: [
      {
        droga: "Pilocarpina 1-4%",
        mecanismo: "Agonista muscarínico que contrai músculo ciliar",
        indicacoes: "Glaucoma de ângulo fechado, miose",
        efeitos: "Miótico, redução da PIO",
        observacoes: "Aplicar 4x/dia. Pode causar miopia e cefaleia."
      },
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
    nome: "Antimicrobianos",
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
      },
      {
        droga: "Aciclovir 3%",
        mecanismo: "Análogo de nucleosídeo que inibe DNA polimerase viral",
        indicacoes: "Ceratite herpética, conjuntivite herpética",
        efeitos: "Antiviral contra HSV-1 e HSV-2",
        observacoes: "Aplicar 5x/dia. Tratamento por 7-10 dias."
      },
      {
        droga: "Natamicina 5%",
        mecanismo: "Antifúngico que inibe síntese de ergosterol",
        indicacoes: "Ceratite fúngica",
        efeitos: "Fungicida contra Candida e Aspergillus",
        observacoes: "Aplicar a cada hora inicialmente. Suspensão viscosa."
      }
    ]
  },
  {
    nome: "Outras Drogas Diversas",
    grupos: [
      {
        droga: "Vitamina A (Retinol)",
        mecanismo: "Essencial para diferenciação epitelial e função visual",
        indicacoes: "Deficiência de vitamina A, xeroftalmia",
        efeitos: "Melhora diferenciação epitelial, função visual",
        observacoes: "Suplementação sistêmica. Monitorar níveis séricos."
      },
      {
        droga: "Vitamina C",
        mecanismo: "Antioxidante que protege contra radicais livres",
        indicacoes: "Proteção contra catarata, degeneração macular",
        efeitos: "Antioxidante, proteção celular",
        observacoes: "Suplementação sistêmica. Dose diária recomendada."
      },
      {
        droga: "Vitamina E",
        mecanismo: "Antioxidante lipossolúvel",
        indicacoes: "Proteção contra degeneração macular",
        efeitos: "Antioxidante, proteção celular",
        observacoes: "Suplementação sistêmica. Interage com anticoagulantes."
      },
      {
        droga: "Luteína e Zeaxantina",
        mecanismo: "Carotenoides que filtram luz azul e protegem retina",
        indicacoes: "Proteção contra degeneração macular",
        efeitos: "Filtro de luz azul, antioxidante",
        observacoes: "Suplementação sistêmica. Dose diária recomendada."
      }
    ]
  },
  {
    nome: "Glaucoma",
    grupos: [
      {
        droga: "Timolol 0.25% e 0.5%",
        mecanismo: "Betabloqueador não seletivo que reduz produção de humor aquoso",
        indicacoes: "Glaucoma de ângulo aberto, hipertensão ocular",
        efeitos: "Redução da PIO em 20-30%",
        observacoes: "Aplicar 2x/dia. Contraindicado em asma/DPOC."
      },
      {
        droga: "Latanoprosta 0.005%",
        mecanismo: "Análogo da prostaglandina F2α que aumenta drenagem uveoescleral",
        indicacoes: "Glaucoma de ângulo aberto, hipertensão ocular",
        efeitos: "Redução da PIO em 25-35%",
        observacoes: "Aplicar 1x/noite. Pode escurecer íris e cílios."
      },
      {
        droga: "Dorzolamida 2%",
        mecanismo: "Inibe anidrase carbônica II, reduzindo produção de humor aquoso",
        indicacoes: "Glaucoma, hipertensão ocular",
        efeitos: "Redução da PIO em 15-20%",
        observacoes: "Aplicar 3x/dia. Pode causar gosto amargo."
      },
      {
        droga: "Brimonidina 0.2%",
        mecanismo: "Agonista alfa-2 adrenérgico que reduz produção de humor aquoso",
        indicacoes: "Glaucoma, hipertensão ocular",
        efeitos: "Redução da PIO em 20-25%",
        observacoes: "Aplicar 3x/dia. Pode causar sonolência sistêmica."
      },
      {
        droga: "Pilocarpina 1-4%",
        mecanismo: "Agonista muscarínico que contrai músculo ciliar",
        indicacoes: "Glaucoma de ângulo fechado, miose",
        efeitos: "Miótico, redução da PIO",
        observacoes: "Aplicar 4x/dia. Pode causar miopia e cefaleia."
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

const IconAntialergicos = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const IconLubrificantes = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const IconColinergicos = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const IconAntimicrobianos = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);

const IconOutrasDrogas = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
  </svg>
);

const IconGlaucoma = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

// Array com os grupos e seus ícones
const gruposComIcones = [
  { ...dadosFarmacologicos[0], icone: <IconConservantes /> },
  { ...dadosFarmacologicos[1], icone: <IconAnestesicos /> },
  { ...dadosFarmacologicos[2], icone: <IconCorantes /> },
  { ...dadosFarmacologicos[3], icone: <IconAntiInflamatorios /> },
  { ...dadosFarmacologicos[4], icone: <IconAntialergicos /> },
  { ...dadosFarmacologicos[5], icone: <IconLubrificantes /> },
  { ...dadosFarmacologicos[6], icone: <IconColinergicos /> },
  { ...dadosFarmacologicos[7], icone: <IconAntimicrobianos /> },
  { ...dadosFarmacologicos[8], icone: <IconOutrasDrogas /> },
  { ...dadosFarmacologicos[9], icone: <IconGlaucoma /> }
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