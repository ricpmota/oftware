'use client';

import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { EMERGENCIAS_OFTALMOLOGICAS } from '../emergencia';

// Mapeamento de IDs para títulos e descrições
const EMERGENCIA_INFO = {
  'trauma-ocular': {
    titulo: 'Trauma Ocular',
    subtitulo: 'Abrasões, perfurações, CEIO e trauma contuso',
    icone: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
    )
  },
  'hifema-microhifema': {
    titulo: 'Hifema e Microhifema',
    subtitulo: 'Sangramento na câmara anterior',
    icone: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    )
  },
  'queimaduras-oculares': {
    titulo: 'Queimaduras Oculares',
    subtitulo: 'Queimaduras químicas e térmicas',
    icone: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      </svg>
    )
  },
  'cornea-conjuntiva': {
    titulo: 'Córnea e Conjuntiva',
    subtitulo: 'Ceratites, úlceras e conjuntivites agudas',
    icone: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    )
  },
  'glaucoma-agudo-hipertensao-ocular': {
    titulo: 'Glaucoma Agudo / Hipertensão Ocular',
    subtitulo: 'Crises de glaucoma de ângulo fechado',
    icone: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  'uveite-anterior-aguda': {
    titulo: 'Uveíte Anterior Aguda',
    subtitulo: 'Inflamação aguda da úvea anterior',
    icone: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  },
  'retina-vitreo': {
    titulo: 'Retina e Vítreo',
    subtitulo: 'Descolamento de retina, hemorragias',
    icone: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    )
  },
  'neuroftalmologia': {
    titulo: 'Neuroftalmologia',
    subtitulo: 'Neuropatias ópticas, paralisias',
    icone: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    )
  },
  'orbita-plastica-ocular': {
    titulo: 'Órbita e Plástica Ocular',
    subtitulo: 'Celulite orbitária, fraturas orbitárias',
    icone: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )
  },
  'emergencias-sistemicas-associadas': {
    titulo: 'Emergências Sistêmicas Associadas',
    subtitulo: 'Complicações sistêmicas oculares',
    icone: (
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    )
  }
};

export default function EmergenciaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const emergenciaInfo = EMERGENCIA_INFO[id as keyof typeof EMERGENCIA_INFO];
  
  // Filtra emergências baseado no ID
  const emergenciasFiltradas = EMERGENCIAS_OFTALMOLOGICAS.filter(emergencia => {
    if (id === 'trauma-ocular') {
      return emergencia.id.includes('trauma-ocular');
    }
    // Para outros grupos, você pode adicionar mais lógica de filtro aqui
    return emergencia.id.includes(id);
  });

  const handleBackClick = () => {
    router.push('/emergencia');
  };

  // Se não encontrar informações para o ID, mostra página de erro
  if (!emergenciaInfo) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Emergência não encontrada</h1>
          <p className="text-gray-600 mb-8">A emergência solicitada não foi encontrada.</p>
          <button
            onClick={handleBackClick}
            className="bg-gray-800 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Voltar ao Menu de Emergências
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBackClick}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar ao Menu de Emergências
          </button>
          
          <div className="flex items-center mb-6">
            <div className="text-gray-600 mr-4">
              {emergenciaInfo.icone}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{emergenciaInfo.titulo}</h1>
              <p className="text-gray-600">{emergenciaInfo.subtitulo}</p>
            </div>
          </div>
        </div>

        {/* Lista de Emergências */}
        <div className="space-y-6">
          {emergenciasFiltradas.length > 0 ? (
            emergenciasFiltradas.map((emergencia) => (
              <div key={emergencia.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">{emergencia.titulo}</h2>
                
                {/* Sinais */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Sinais e Sintomas
                  </h3>
                  <ul className="space-y-2">
                    {emergencia.sinais.map((sinal, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-red-500 mr-2 mt-1">•</span>
                        <span className="text-gray-700">{sinal}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Conduta */}
                <div className="mb-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Conduta
                  </h3>
                  <ul className="space-y-2">
                    {emergencia.conduta.map((conduta, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-500 mr-2 mt-1">•</span>
                        <span className="text-gray-700">{conduta}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Prescrição */}
                {emergencia.prescricao && emergencia.prescricao.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-800 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Prescrição
                    </h3>
                    <ul className="space-y-2">
                      {emergencia.prescricao.map((prescricao, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-green-500 mr-2 mt-1">•</span>
                          <span className="text-gray-700">{prescricao}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Calculadora ETO (se aplicável) */}
                {emergencia.calculadora && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-800 mb-3">Calculadora ETO</h3>
                    <p className="text-gray-600 mb-3">
                      Esta emergência inclui uma calculadora para estimar o prognóstico visual.
                    </p>
                    <button className="bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                      Abrir Calculadora
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">
                Nenhuma emergência encontrada para este grupo.
              </p>
              <p className="text-sm text-gray-500">
                Em breve serão adicionadas as emergências específicas para {emergenciaInfo.titulo}.
              </p>
            </div>
          )}
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