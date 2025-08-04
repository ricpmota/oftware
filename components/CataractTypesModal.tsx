import React, { useState } from 'react';

interface CataractType {
  id: string;
  name: string;
  category: string;
  definition: string;
  pathophysiology: string;
  slitLamp: string;
  symptoms: string[];
  findings: string[];
  etiology: string[];
  management: string[];
}

const cataractTypes: CataractType[] = [
  // POR LOCALIZAÇÃO
  {
    id: 'nuclear',
    name: 'Catarata Nuclear',
    category: 'Por Localização',
    definition: 'Opacificação do núcleo do cristalino, geralmente bilateral, de progressão lenta.',
    pathophysiology: 'Aglutinação e pigmentação das fibras nucleares causam brunescência e endurecimento do núcleo.',
    slitLamp: 'Reflexo amarelado ou acastanhado centrado no núcleo; melhor visualizado com retroiluminação.',
    symptoms: ['Miopização', 'Visão borrada', 'Perda de contraste'],
    findings: ['Núcleo amarelado ou marrom', 'Perda de transparência central'],
    etiology: ['Envelhecimento natural', 'Exposição UV', 'Fatores genéticos'],
    management: ['Cirurgia conforme limitação visual'],
  },
  {
    id: 'cortical',
    name: 'Catarata Cortical',
    category: 'Por Localização',
    definition: 'Opacidades no córtex do cristalino que irradiam da periferia para o centro em forma de cunha.',
    pathophysiology: 'Desequilíbrio osmótico leva à hidratação das fibras corticais e formação de fendas.',
    slitLamp: 'Estrias brancas radiais que surgem na periferia cortical e podem confluir para a zona visual.',
    symptoms: ['Glare', 'Visão borrada com luz difusa'],
    findings: ['Opacidades esbranquiçadas radiais na córtex'],
    etiology: ['Envelhecimento', 'Diabetes', 'Exposição UV', 'Trauma'],
    management: ['Cirurgia se houver prejuízo funcional'],
  },
  {
    id: 'subcapsular-anterior',
    name: 'Catarata Subcapsular Anterior',
    category: 'Por Localização',
    definition: 'Opacidade localizada logo abaixo da cápsula anterior do cristalino.',
    pathophysiology: 'Alteracoes epiteliais causam acúmulo de proteínas e vacúbolos subcapsulares.',
    slitLamp: 'Mancha opaca achatada, superficial, facilmente observada sem dilatação.',
    symptoms: ['Leve prejuízo visual', 'Às vezes assintomática'],
    findings: ['Opacidade subcapsular anterior achatada'],
    etiology: ['Trauma', 'Inflamação', 'Corticoides', 'Radiação'],
    management: ['Cirurgia se sintomática'],
  },
  {
    id: 'subcapsular-posterior',
    name: 'Catarata Subcapsular Posterior',
    category: 'Por Localização',
    definition: 'Opacificação bem central junto à cápsula posterior, afetando precocemente a visão.',
    pathophysiology: 'Proliferação anormal de células epiteliais do cristalino na região posterior.',
    slitLamp: 'Placa granular ou em "teia", centrada na zona pupilar, visível mesmo sem dilatação.',
    symptoms: ['Piora da visão para perto', 'Glare', 'Evolução rápida'],
    findings: ['Opacidade próxima à cápsula posterior'],
    etiology: ['Corticoides', 'Diabetes', 'Radiação', 'Inflamação'],
    management: ['Cirurgia precoce indicada'],
  },
  {
    id: 'polar-anterior',
    name: 'Catarata Polar Anterior',
    category: 'Por Localização',
    definition: 'Opacidade discoide central na superfície anterior do cristalino.',
    pathophysiology: 'Remanescente da membrana pupilar embrionária ou sequela inflamatória intrauterina.',
    slitLamp: 'Pequena opacidade circular localizada na região anterior central.',
    symptoms: ['Geralmente assintomática', 'Possível baixa visual central'],
    findings: ['Lesão bem definida, central'],
    etiology: ['Congênita', 'Trauma', 'Inflamação', 'Radiação'],
    management: ['Acompanhamento ou cirurgia se sintomática'],
  },
  {
    id: 'polar-posterior',
    name: 'Catarata Polar Posterior',
    category: 'Por Localização',
    definition: 'Opacidade central na região posterior do cristalino, com envolvimento capsular.',
    pathophysiology: 'Alteracão congênita do desenvolvimento do cristalino ou persistência da hialoide primitiva.',
    slitLamp: 'Opacidade densa e brilhante centrada na região posterior, muitas vezes com halo circundante.',
    symptoms: ['Baixa acuidade visual precoce'],
    findings: ['Opacidade central na cápsula posterior'],
    etiology: ['Congênita', 'Trauma', 'Inflamação', 'Radiação'],
    management: ['Cirurgia com cuidado, risco aumentado de ruptura capsular'],
  },
  // POR CAUSA
  {
    id: 'senil',
    name: 'Catarata Senil',
    category: 'Por Causa',
    definition: 'Forma mais comum de catarata, relacionada ao envelhecimento fisiológico do cristalino.',
    pathophysiology: 'Oxidação proteica, degradação enzimática e perda da transparência lenticular.',
    slitLamp: 'Pode envolver diferentes regiões do cristalino (nuclear, cortical, subcapsular).',
    symptoms: ['Baixa visual lenta', 'Glare', 'Miopização'],
    findings: ['Nuclear, cortical ou subcapsular posterior'],
    etiology: ['Envelhecimento', 'Exposição UV', 'Fatores genéticos'],
    management: ['Cirurgia quando houver limitação funcional'],
  },
  {
    id: 'congenita',
    name: 'Catarata Congênita',
    category: 'Por Causa',
    definition: 'Presente ao nascimento ou nos primeiros meses de vida, geralmente bilateral.',
    pathophysiology: 'Alteracões no desenvolvimento embrionário do cristalino, por causas genéticas ou infecciosas.',
    slitLamp: 'Opacidades variadas (lamelar, nuclear, polar), algumas com pigmentação azulada (cerúlea).',
    symptoms: ['Leucocoria', 'Nistagmo', 'Estrabismo'],
    findings: ['Lamelar', 'polar', 'total', 'cerúlea'],
    etiology: ['Genética', 'Infecções intrauterinas', 'Síndromes'],
    management: ['Cirurgia precoce e oclusão para evitar ambliopia'],
  },
  {
    id: 'traumatica',
    name: 'Catarata Traumática',
    category: 'Por Causa',
    definition: 'Secundária a trauma contuso ou penetrante ocular.',
    pathophysiology: 'Ruptura capsular ou dano direto às fibras do cristalino.',
    slitLamp: 'Opacidade em roseta, subcapsular anterior ou posterior, frequentemente com outros sinais traumáticos.',
    symptoms: ['Perda visual após trauma', 'Diplopia'],
    findings: ['Em roseta', 'Outras lesões oculares'],
    etiology: ['Trauma contuso', 'Trauma penetrante'],
    management: ['Avaliar segmento anterior e posterior', 'Cirurgia se indicado'],
  },
  {
    id: 'metabolica',
    name: 'Catarata Metabólica',
    category: 'Por Causa',
    definition: 'Relacionada a doenças sistêmicas como diabetes, galactosemia ou hipocalcemia.',
    pathophysiology: 'Acúmulo de substâncias osmoticamente ativas nas fibras lenticulares.',
    slitLamp: 'Opacidades bilaterais e simétricas, frequentemente com padrões peculiares ("em óleo e água").',
    symptoms: ['Visão embaçada', 'Bilateral'],
    findings: ['Pode simular formas senis'],
    etiology: ['Diabetes', 'Galactosemia'],
    management: ['Controle da doença de base + cirurgia'],
  },
  {
    id: 'toxica',
    name: 'Catarata Tóxica',
    category: 'Por Causa',
    definition: 'Decorrente do uso prolongado de medicações como corticoides, clorpromazina ou amiodarona.',
    pathophysiology: 'Depósito de substâncias cristalinas ou alteração oxidativa das proteínas do cristalino.',
    slitLamp: 'Opacidade subcapsular posterior bilateral, em estágios variáveis.',
    symptoms: ['Visão borrada', 'Glare'],
    findings: ['Subcapsular posterior comum'],
    etiology: ['Corticoides', 'Clorpromazina'],
    management: ['Suspensão do agente se possível', 'Cirurgia'],
  },
  {
    id: 'radiacional',
    name: 'Catarata Radiacional',
    category: 'Por Causa',
    definition: 'Induzida por exposição a radiação ionizante ou UV em excesso.',
    pathophysiology: 'Danos ao DNA das células epiteliais lenticulares.',
    slitLamp: 'Lesões subcapsulares densas, semelhantes às tóxicas.',
    symptoms: ['Baixa visual progressiva'],
    findings: ['Subcapsular posterior bilateral'],
    etiology: ['Exposição UV', 'Radiação ionizante'],
    management: ['Cirurgia se indicado'],
  },
  {
    id: 'complicada',
    name: 'Catarata Complicada',
    category: 'Por Causa',
    definition: 'Decorrente de doenças oculares como uveítes crônicas, glaucoma ou descolamento de retina.',
    pathophysiology: 'Inflamação crônica ou hipóxia causam alterações nas células do cristalino.',
    slitLamp: 'Opacidades irregulares, muitas vezes associadas a sinequias, pigmentação capsular ou pseudofacocromia.',
    symptoms: ['Baixa visual', 'Fotofobia', 'Dor ocular'],
    findings: ['Subcapsular posterior', 'Sinéquias', 'Alterações pupilares'],
    etiology: ['Uveíte', 'Glaucoma', 'Descolamento de retina'],
    management: ['Controle da doença de base + cirurgia quando estabilizado'],
  },
  // POR FORMA
  {
    id: 'roseta',
    name: 'Catarata em Roseta',
    category: 'Por Forma',
    definition: 'Opacidade estrelada em forma de flor, típica de trauma contuso.',
    pathophysiology: 'Fratura das fibras lenticulares centrais por onda de choque.',
    slitLamp: 'Desenho rosetado subcapsular anterior ou posterior, altamente característico.',
    symptoms: ['Visão turva ou diplopia após trauma'],
    findings: ['Padrão estelar no cristalino'],
    etiology: ['Trauma contuso'],
    management: ['Cirurgia conforme severidade'],
  },
  {
    id: 'cerulea',
    name: 'Catarata Cerúlea',
    category: 'Por Forma',
    definition: 'Pequenas opacidades azuladas no cristalino.',
    pathophysiology: 'Alteracão congênita no metabolismo de pigmentos lenticulares.',
    slitLamp: 'Pontos azulados dispersos, geralmente não afetam a visão.',
    symptoms: ['Pode ser assintomática', 'Ambliopia se bilateral'],
    findings: ['Opacidades azuladas pequenas'],
    etiology: ['Genética', 'Hereditária'],
    management: ['Cirurgia se houver interferência na visão'],
  },
  {
    id: 'lamelar',
    name: 'Catarata Lamelar',
    category: 'Por Forma',
    definition: 'Opacificação em camadas concêntricas dentro do cristalino.',
    pathophysiology: 'Defeitos no desenvolvimento fetal do cristalino com fibras anormais entre zonas claras.',
    slitLamp: 'Anéis opacos concéntricos ao redor de um núcleo claro.',
    symptoms: ['Baixa acuidade visual variável'],
    findings: ['Camadas concêntricas de opacidade'],
    etiology: ['Congênita', 'Hereditária'],
    management: ['Avaliar impacto visual e operar se necessário'],
  },
  {
    id: 'maturada',
    name: 'Catarata Total / Maturada / Hipermadura',
    category: 'Por Forma',
    definition: 'Cristalino completamente opaco, com ou sem degeneração líquida do córtex.',
    pathophysiology: 'Degeneração proteica extrema com extravasamento cortical e instabilidade capsular.',
    slitLamp: 'Reflexo branco intenso, ausência de detalhe lenticular, possível mobilidade do núcleo ("cristalino morgagniano").',
    symptoms: ['Perda visual severa', 'Reflexo pupilar ausente'],
    findings: ['Reflexo branco (leucocoria)', 'Liquefação cortical'],
    etiology: ['Evolução natural da catarata senil', 'Falta de acesso à cirurgia'],
    management: ['Cirurgia com técnica avançada'],
  },
];

const categories = ['Por Localização', 'Por Causa', 'Por Forma'];

interface CataractTypesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CataractTypesModal: React.FC<CataractTypesModalProps> = ({ isOpen, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState('Por Localização');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);

  const filteredCataracts = cataractTypes.filter(cataract => cataract.category === selectedCategory);
  const currentCataract = filteredCataracts[currentIndex];

  const nextCataract = () => {
    setCurrentIndex((prev) => prev === filteredCataracts.length - 1 ? 0 : prev + 1);
  };

  const prevCataract = () => {
    setCurrentIndex((prev) => prev === 0 ? filteredCataracts.length - 1 : prev - 1);
  };

  const goToCataract = (index: number) => {
    setCurrentIndex(index);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentIndex(0);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Tipos de Catarata</h2>
              <p className="text-blue-100 text-sm">Guia Clínico Completo</p>
            </div>
            <button 
              onClick={onClose} 
              className="text-white hover:text-gray-200 text-3xl font-light hover:bg-white/10 p-2 rounded-full transition-all duration-200"
            >
              ×
            </button>
          </div>

          {/* Category Tabs */}
          <div className="bg-gray-50 p-4 border-b">
            <div className="flex justify-center space-x-2 lg:space-x-3 overflow-x-auto">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => handleCategoryChange(category)}
                  className={`px-2 py-1 lg:px-6 lg:py-3 rounded-lg lg:rounded-xl font-semibold transition-all duration-300 whitespace-nowrap text-xs lg:text-base ${
                    selectedCategory === category
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {currentCataract ? (
              <div className="h-full flex flex-col lg:flex-row">
                {/* Left Side - Navigation and Image (Desktop) */}
                <div className="hidden lg:block lg:w-1/3 bg-gray-50 p-6 border-r">
                  {/* Navigation */}
                  <div className="flex items-center justify-between mb-6">
                    <button 
                      onClick={prevCataract} 
                      className="p-2 bg-white rounded-full shadow hover:shadow-md transition-all"
                    >
                      ‹
                    </button>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-gray-800">{currentCataract.name}</h3>
                      <p className="text-sm text-gray-600">{selectedCategory}</p>
                    </div>
                    <button 
                      onClick={nextCataract} 
                      className="p-2 bg-white rounded-full shadow hover:shadow-md transition-all"
                    >
                      ›
                    </button>
                  </div>
                  
                  {/* Image */}
                  <div className="text-center mb-6">
                    <div className="bg-white rounded-xl p-4 shadow">
                      <img
                        src={`/icones/${currentCataract.id}.png`}
                        onError={(e) => { (e.target as HTMLImageElement).src = '/icones/catarata.png'; }}
                        alt={currentCataract.name}
                        className="w-32 h-32 mx-auto rounded-lg object-cover"
                      />
                    </div>
                  </div>

                  {/* Carousel Dots */}
                  <div className="flex justify-center space-x-2">
                    {filteredCataracts.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => goToCataract(index)}
                        className={`w-3 h-3 rounded-full transition-all ${
                          index === currentIndex 
                            ? 'bg-blue-600' 
                            : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Mobile Header with Navigation and Image Button */}
                <div className="lg:hidden bg-gray-50 p-4 border-b">
                  <div className="flex items-center justify-between mb-4">
                    <button 
                      onClick={prevCataract} 
                      className="p-2 bg-white rounded-full shadow hover:shadow-md transition-all"
                    >
                      ‹
                    </button>
                    <div className="text-center flex-1 mx-4">
                      <h3 className="text-lg font-bold text-gray-800">{currentCataract.name}</h3>
                      <p className="text-sm text-gray-600">{selectedCategory}</p>
                    </div>
                    <button 
                      onClick={nextCataract} 
                      className="p-2 bg-white rounded-full shadow hover:shadow-md transition-all"
                    >
                      ›
                    </button>
                  </div>
                  
                  {/* Image Button for Mobile */}
                  <div className="text-center mb-4">
                    <button
                      onClick={() => setShowImageModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all"
                    >
                      Imagem
                    </button>
                  </div>

                  {/* Carousel Dots for Mobile */}
                  <div className="flex justify-center space-x-2">
                    {filteredCataracts.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => goToCataract(index)}
                        className={`w-3 h-3 rounded-full transition-all ${
                          index === currentIndex 
                            ? 'bg-blue-600' 
                            : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Right Side - Clinical Information */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <h4 className="font-bold text-blue-800 mb-2">Definição</h4>
                      <p className="text-gray-700">{currentCataract.definition}</p>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h4 className="font-bold text-green-800 mb-2">Fisiopatologia</h4>
                      <p className="text-gray-700">{currentCataract.pathophysiology}</p>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <h4 className="font-bold text-yellow-800 mb-2">Lâmpada de Fenda</h4>
                      <p className="text-gray-700">{currentCataract.slitLamp}</p>
                    </div>

                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                      <h4 className="font-bold text-red-800 mb-2">Sintomas Principais</h4>
                      <ul className="space-y-1">
                        {currentCataract.symptoms.map((symptom, index) => (
                          <li key={index} className="text-gray-700">• {symptom}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                      <h4 className="font-bold text-purple-800 mb-2">Achados ao Exame</h4>
                      <ul className="space-y-1">
                        {currentCataract.findings.map((finding, index) => (
                          <li key={index} className="text-gray-700">• {finding}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                      <h4 className="font-bold text-orange-800 mb-2">Etiologia</h4>
                      <ul className="space-y-1">
                        {currentCataract.etiology.map((cause, index) => (
                          <li key={index} className="text-gray-700">• {cause}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                      <h4 className="font-bold text-teal-800 mb-2">Conduta Clínica</h4>
                      <ul className="space-y-1">
                        {currentCataract.management.map((action, index) => (
                          <li key={index} className="text-gray-700">• {action}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-6xl mb-4">🔍</div>
                  <p className="text-gray-500 text-lg">Nenhuma catarata encontrada para esta categoria.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal for Mobile */}
      {showImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">{currentCataract?.name}</h3>
              <button 
                onClick={() => setShowImageModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="text-center">
              <img
                src={`/icones/${currentCataract?.id}.png`}
                onError={(e) => { (e.target as HTMLImageElement).src = '/icones/catarata.png'; }}
                alt={currentCataract?.name}
                className="w-full max-w-xs mx-auto rounded-lg shadow-lg"
              />
            </div>
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowImageModal(false)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CataractTypesModal; 