'use client';

import { useRouter } from 'next/navigation';

interface EmergenciaItem {
  titulo: string;
  subtitulo: string;
  id: string;
  icone: React.ReactNode;
}

// Componentes de ícones SVG
const IconTrauma = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const IconHifema = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const IconQueimadura = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
  </svg>
);

const IconCornea = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const IconGlaucoma = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const IconUveite = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconRetina = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const IconNeuro = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const IconOrbita = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const IconSistemico = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);

const IconCorpoEstranho = () => (
  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
  </svg>
);

const emergencias: EmergenciaItem[] = [
  {
    titulo: "Trauma Ocular",
    subtitulo: "Abrasões, perfurações, CEIO e trauma contuso",
    id: "trauma-ocular",
    icone: <IconTrauma />
  },
  {
    titulo: "Hifema e Microhifema",
    subtitulo: "Sangramento na câmara anterior",
    id: "hifema-microhifema",
    icone: <IconHifema />
  },
  {
    titulo: "Queimaduras Oculares",
    subtitulo: "Queimaduras químicas e térmicas",
    id: "queimaduras-oculares",
    icone: <IconQueimadura />
  },
  {
    titulo: "Córnea e Conjuntiva",
    subtitulo: "Ceratites, úlceras e conjuntivites agudas",
    id: "cornea-conjuntiva",
    icone: <IconCornea />
  },
  {
    titulo: "Glaucoma Agudo / Hipertensão Ocular",
    subtitulo: "Crises de glaucoma de ângulo fechado",
    id: "glaucoma-agudo-hipertensao-ocular",
    icone: <IconGlaucoma />
  },
  {
    titulo: "Uveíte Anterior Aguda",
    subtitulo: "Inflamação aguda da úvea anterior",
    id: "uveite-anterior-aguda",
    icone: <IconUveite />
  },
  {
    titulo: "Retina e Vítreo",
    subtitulo: "Descolamento de retina, hemorragias",
    id: "retina-vitreo",
    icone: <IconRetina />
  },
  {
    titulo: "Neuroftalmologia",
    subtitulo: "Neuropatias ópticas, paralisias",
    id: "neuroftalmologia",
    icone: <IconNeuro />
  },
  {
    titulo: "Órbita e Plástica Ocular",
    subtitulo: "Celulite orbitária, fraturas orbitárias",
    id: "orbita-plastica-ocular",
    icone: <IconOrbita />
  },
  {
    titulo: "Emergências Sistêmicas",
    subtitulo: "Complicações sistêmicas oculares",
    id: "emergencias-sistemicas",
    icone: <IconSistemico />
  },
  {
    titulo: "Corpo Estranho",
    subtitulo: "Avaliação e condutas para corpo estranho",
    id: "corpo-estranho",
    icone: <IconCorpoEstranho />
  }
];

export default function EmergenciaMenu() {
  const router = useRouter();

  const handleEmergenciaClick = (id: string) => {
    router.push(`/emergencia/${id}`);
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Emergência Oftalmológica
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Selecione o grupo de emergência para acessar os quadros clínicos e condutas específicas
          </p>
        </div>

        {/* Grid de Emergências */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {emergencias.map((emergencia) => (
            <button
              key={emergencia.id}
              onClick={() => handleEmergenciaClick(emergencia.id)}
              className="group relative bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 hover:border-gray-400 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
              title={emergencia.subtitulo}
            >
              {/* Ícone */}
              <div className="text-gray-600 mb-3 md:mb-4 text-center group-hover:text-gray-800 group-hover:scale-110 transition-all duration-300">
                {emergencia.icone}
              </div>

              {/* Título */}
              <h3 className="text-sm md:text-lg font-semibold text-gray-900 mb-1 md:mb-2 text-center group-hover:text-gray-700 transition-colors">
                {emergencia.titulo}
              </h3>

              {/* Subtítulo */}
              <p className="text-xs md:text-sm text-gray-500 text-center leading-relaxed">
                {emergencia.subtitulo}
              </p>

              {/* Indicador de clique */}
              <div className="absolute top-2 md:top-4 right-2 md:right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <svg 
                  className="w-4 h-4 md:w-5 md:h-5 text-gray-400" 
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
              <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-gray-300 transition-all duration-300 pointer-events-none"></div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Para casos de extrema urgência, procure atendimento médico imediato
          </p>
        </div>
      </div>
    </div>
  );
} 