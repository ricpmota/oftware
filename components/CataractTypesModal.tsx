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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white p-6 rounded-t-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
          <div className="relative flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold mb-1">Tipos de Catarata</h2>
              <p className="text-blue-100 text-sm">Guia Clínico Completo</p>
            </div>
            <button 
              onClick={onClose} 
              className="text-white hover:text-gray-200 text-3xl font-light hover:bg-white/10 p-2 rounded-full transition-all duration-200"
            >
              ×
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 border-b border-gray-200">
          <div className="flex space-x-3">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-100 hover:shadow-md border border-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {currentCataract ? (
            <>
              {/* Navigation and Image */}
              <div className="p-6 border-b border-gray-200 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
                <div className="flex items-center justify-between mb-6">
                  <button 
                    onClick={prevCataract} 
                    className="p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-gray-50 transform hover:scale-110"
                  >
                    <span className="text-2xl text-gray-600 font-bold">‹</span>
                  </button>
                  <div className="text-center flex-1 mx-6">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{currentCataract.name}</h3>
                    <p className="text-sm text-gray-600 bg-white/70 px-3 py-1 rounded-full inline-block">
                      {selectedCategory}
                    </p>
                  </div>
                  <button 
                    onClick={nextCataract} 
                    className="p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-gray-50 transform hover:scale-110"
                  >
                    <span className="text-2xl text-gray-600 font-bold">›</span>
                  </button>
                </div>
                
                {/* Image */}
                <div className="text-center mb-6">
                  <div className="bg-white rounded-2xl p-6 shadow-lg inline-block">
                    <img
                      src={`/icones/${currentCataract.id}.png`}
                      onError={(e) => { (e.target as HTMLImageElement).src = '/icones/catarata.png'; }}
                      alt={currentCataract.name}
                      className="w-40 h-40 mx-auto rounded-xl shadow-md object-cover"
                    />
                  </div>
                </div>

                {/* Carousel Dots */}
                <div className="flex justify-center space-x-3">
                  {filteredCataracts.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToCataract(index)}
                      className={`w-4 h-4 rounded-full transition-all duration-300 transform hover:scale-125 ${
                        index === currentIndex 
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg scale-125' 
                          : 'bg-gray-300 hover:bg-gray-400'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Clinical Information - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <div className="space-y-6 max-w-4xl mx-auto">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-200 shadow-sm">
                    <h4 className="font-bold text-blue-800 mb-3 flex items-center text-lg">
                      <span className="w-3 h-3 bg-blue-500 rounded-full mr-3"></span>
                      Definição
                    </h4>
                    <p className="text-gray-700 leading-relaxed">{currentCataract.definition}</p>
                  </div>

                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200 shadow-sm">
                    <h4 className="font-bold text-green-800 mb-3 flex items-center text-lg">
                      <span className="w-3 h-3 bg-green-500 rounded-full mr-3"></span>
                      Fisiopatologia
                    </h4>
                    <p className="text-gray-700 leading-relaxed">{currentCataract.pathophysiology}</p>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-6 rounded-2xl border border-yellow-200 shadow-sm">
                    <h4 className="font-bold text-yellow-800 mb-3 flex items-center text-lg">
                      <span className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></span>
                      Lâmpada de Fenda
                    </h4>
                    <p className="text-gray-700 leading-relaxed">{currentCataract.slitLamp}</p>
                  </div>

                  <div className="bg-gradient-to-r from-red-50 to-pink-50 p-6 rounded-2xl border border-red-200 shadow-sm">
                    <h4 className="font-bold text-red-800 mb-3 flex items-center text-lg">
                      <span className="w-3 h-3 bg-red-500 rounded-full mr-3"></span>
                      Sintomas Principais
                    </h4>
                    <ul className="space-y-2">
                      {currentCataract.symptoms.map((symptom, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-red-500 mr-3 mt-1">•</span>
                          <span className="text-gray-700">{symptom}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-6 rounded-2xl border border-purple-200 shadow-sm">
                    <h4 className="font-bold text-purple-800 mb-3 flex items-center text-lg">
                      <span className="w-3 h-3 bg-purple-500 rounded-full mr-3"></span>
                      Achados ao Exame
                    </h4>
                    <ul className="space-y-2">
                      {currentCataract.findings.map((finding, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-purple-500 mr-3 mt-1">•</span>
                          <span className="text-gray-700">{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-2xl border border-orange-200 shadow-sm">
                    <h4 className="font-bold text-orange-800 mb-3 flex items-center text-lg">
                      <span className="w-3 h-3 bg-orange-500 rounded-full mr-3"></span>
                      Etiologia
                    </h4>
                    <ul className="space-y-2">
                      {currentCataract.etiology.map((cause, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-orange-500 mr-3 mt-1">•</span>
                          <span className="text-gray-700">{cause}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50 p-6 rounded-2xl border border-teal-200 shadow-sm">
                    <h4 className="font-bold text-teal-800 mb-3 flex items-center text-lg">
                      <span className="w-3 h-3 bg-teal-500 rounded-full mr-3"></span>
                      Conduta Clínica
                    </h4>
                    <ul className="space-y-2">
                      {currentCataract.management.map((action, index) => (
                        <li key={index} className="flex items-start">
                          <span className="text-teal-500 mr-3 mt-1">•</span>
                          <span className="text-gray-700">{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-gray-500 text-lg">Nenhuma catarata encontrada para esta categoria.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 p-6 rounded-b-2xl border-t border-gray-300">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Fechar Modal
          </button>
        </div>
      </div>
    </div>
  );
};

export default CataractTypesModal; 