'use client';

import React from 'react';

interface PatologiasBinocularesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PatologiasBinocularesModal({ isOpen, onClose }: PatologiasBinocularesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Patologias Binoculares - Explicações</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">Retinopatias Sistêmicas</h3>
              <div className="space-y-4 text-sm text-blue-700">
                <div>
                  <strong className="text-blue-800">Retinopatia Diabética Bilateral</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Complicação microvascular do diabetes mellitus</li>
                    <li>Afeta ambos os olhos com graus variáveis</li>
                    <li>Classificada em RDNP (leve, moderada, grave) e RDP</li>
                    <li>Pode apresentar edema macular diabético</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-blue-800">Retinopatia Hipertensiva Bilateral</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Alterações retinianas por hipertensão arterial sistêmica</li>
                    <li>Classificada em graus 1-4 (Keith-Wagener)</li>
                    <li>Arteriosclerose, hemorragias, exsudatos</li>
                    <li>Pode progredir para oclusões vasculares</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-blue-800">Retinopatia da Prematuridade Bilateral</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Doença vascular retiniana em prematuros</li>
                    <li>Classificada em estágios 1-5</li>
                    <li>Neovascularização periférica</li>
                    <li>Pode causar descolamento de retina</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-3">Doenças Inflamatórias</h3>
              <div className="space-y-4 text-sm text-green-700">
                <div>
                  <strong className="text-green-800">Uveíte Posterior Bilateral</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Inflamação da úvea posterior</li>
                    <li>Pode ser idiopática ou associada a doenças sistêmicas</li>
                    <li>Manifestações: coriorretinite, vasculite, edema macular</li>
                    <li>Pode causar catarata e glaucoma</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-green-800">Vasculite Retiniana</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Inflamação dos vasos retinianos</li>
                    <li>Frequentemente bilateral</li>
                    <li>Associada a doenças autoimunes</li>
                    <li>Pode causar oclusões vasculares</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-green-800">Coriorretinite</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Inflamação da coroide e retina</li>
                    <li>Pode ser infecciosa ou não infecciosa</li>
                    <li>Manifestações: lesões coroidais, edema retiniano</li>
                    <li>Pode causar cicatrizes permanentes</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3">Doenças Degenerativas</h3>
              <div className="space-y-4 text-sm text-yellow-700">
                <div>
                  <strong className="text-yellow-800">Degeneração Macular Relacionada à Idade (DMRI) Bilateral</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Doença degenerativa da mácula</li>
                    <li>Forma seca (drusas, atrofia) ou úmida (neovascularização)</li>
                    <li>Principal causa de cegueira em idosos</li>
                    <li>Tratamento com anti-VEGF na forma úmida</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-yellow-800">Retinose Pigmentar</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Doença genética degenerativa</li>
                    <li>Pigmentação em espículas ósseas</li>
                    <li>Atrofia retiniana progressiva</li>
                    <li>Causa cegueira noturna e perda de campo visual</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-yellow-800">Doença de Stargardt</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Distrofia macular juvenil</li>
                    <li>Início na primeira década de vida</li>
                    <li>Atrofia macular bilateral</li>
                    <li>Herança autossômica recessiva</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-yellow-800">Doença de Best</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Distrofia macular viteliforme</li>
                    <li>Lesão macular em gema de ovo</li>
                    <li>Herança autossômica dominante</li>
                    <li>Pode progredir para atrofia macular</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-yellow-800">Coroideremia</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Atrofia coroidal progressiva</li>
                    <li>Herança ligada ao X</li>
                    <li>Afeta principalmente homens</li>
                    <li>Causa perda de campo visual periférico</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-purple-800 mb-3">Síndromes Genéticas</h3>
              <div className="space-y-4 text-sm text-purple-700">
                <div>
                  <strong className="text-purple-800">Amaurose Congênita de Leber</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Cegueira congênita ou de início precoce</li>
                    <li>Herança autossômica recessiva</li>
                    <li>Nistagmo e fotofobia</li>
                    <li>Pode ter manifestações sistêmicas</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-purple-800">Síndrome de Usher</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Retinose pigmentar + surdez</li>
                    <li>Três tipos clínicos (I, II, III)</li>
                    <li>Herança autossômica recessiva</li>
                    <li>Principal causa de surdocegueira</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-purple-800">Síndrome de Bardet-Biedl</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Retinose pigmentar + obesidade + polidactilia</li>
                    <li>Herança autossômica recessiva</li>
                    <li>Manifestações sistêmicas múltiplas</li>
                    <li>Pode afetar rim, coração, sistema nervoso</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-purple-800">Síndrome de Alport</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Nefrite + surdez + alterações oculares</li>
                    <li>Herança ligada ao X ou autossômica</li>
                    <li>Lenticone anterior ou posterior</li>
                    <li>Pode ter retinose pigmentar</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-purple-800">Síndrome de Stickler</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Alterações do colágeno</li>
                    <li>Miopia alta + descolamento de retina</li>
                    <li>Alterações faciais e articulares</li>
                    <li>Herança autossômica dominante</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-800 mb-3">Doenças Vasculares</h3>
              <div className="space-y-4 text-sm text-red-700">
                <div>
                  <strong className="text-red-800">Oclusões Vasculares Bilaterais</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Bloqueios arteriais ou venosos</li>
                    <li>Pode ser CRAO, CRVO, BRAO, BRVO</li>
                    <li>Associadas a doenças sistêmicas</li>
                    <li>Pode causar neovascularização</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-red-800">Doença de Coats</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Telangiectasia retiniana</li>
                    <li>Pode ser bilateral</li>
                    <li>Exsudatos lipídicos</li>
                    <li>Pode causar descolamento de retina</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-red-800">Retinopatia da Anemia Falciforme</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Complicação ocular da doença falciforme</li>
                    <li>Oclusões vasculares periféricas</li>
                    <li>Neovascularização periférica</li>
                    <li>Pode causar hemorragia vítrea</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-red-800">Retinopatia da Leucemia</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Manifestação ocular da leucemia</li>
                    <li>Hemorragias retinianas</li>
                    <li>Infiltração leucêmica</li>
                    <li>Pode ser bilateral</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-indigo-800 mb-3">Considerações Clínicas</h3>
              <div className="space-y-3 text-sm text-indigo-700">
                <div>
                  <strong className="text-indigo-800">Bilateralidade</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Patologias que afetam ambos os olhos simultaneamente</li>
                    <li>Pode ter graus diferentes de comprometimento</li>
                    <li>Importante para diagnóstico diferencial</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-indigo-800">Simetria</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Grau de similaridade entre os dois olhos</li>
                    <li>Pode ser simétrica ou assimétrica</li>
                    <li>Importante para prognóstico</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-indigo-800">Progressão</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Velocidade de evolução da doença</li>
                    <li>Pode ser lenta, moderada ou rápida</li>
                    <li>Determina frequência de acompanhamento</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-indigo-800">Tratamento</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Abordagem terapêutica para ambos os olhos</li>
                    <li>Pode ser diferente para cada olho</li>
                    <li>Considerar riscos e benefícios</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-indigo-800">Prognóstico</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Expectativa de evolução da doença</li>
                    <li>Pode variar significativamente</li>
                    <li>Importante para orientação do paciente</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors duration-200"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 