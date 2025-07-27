'use client';

import React from 'react';

interface RetinopatiaDiabeticaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RetinopatiaDiabeticaModal({ isOpen, onClose }: RetinopatiaDiabeticaModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Retinopatia Diabética - Classificações</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">Retinopatia Diabética Não Proliferativa (RDNP)</h3>
              <div className="space-y-4 text-sm text-blue-700">
                <div>
                  <strong className="text-blue-800">RDNP Leve</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Presença exclusiva de microaneurismas</li>
                    <li>Sem evidência de hemorragias ou sinais de isquemia retiniana</li>
                    <li><strong>Conduta:</strong> Controle glicêmico rigoroso. Reavaliar em 6–12 meses</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-blue-800">RDNP Moderada</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Microaneurismas + hemorragias intrarretinianas (em ponto ou mancha)</li>
                    <li>Pode haver exsudatos duros, indicando extravasamento crônico</li>
                    <li>Sem sinais de isquemia extensa ou IRMA</li>
                    <li><strong>Conduta:</strong> Acompanhamento a cada 3–6 meses. Controle metabólico intensivo</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-blue-800">RDNP Grave (Critérios de 4:2:1 da ETDRS)</strong>
                  <p className="mt-1 mb-2">É considerada RDNP Grave se qualquer dos seguintes estiver presente:</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>≥20 hemorragias intrarretinianas em 4 quadrantes</li>
                    <li>Presença de IRMA em pelo menos 1 quadrante</li>
                    <li>Tortuosidade venosa proeminente em 2 quadrantes</li>
                    <li><strong>Conduta:</strong> Avaliação para fotocoagulação panretiniana e seguimento a cada 2–4 meses. Alto risco de progressão para RDP em 1 ano</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-800 mb-3">Retinopatia Diabética Proliferativa (RDP)</h3>
              <div className="space-y-4 text-sm text-red-700">
                <div>
                  <strong className="text-red-800">RDP Inicial</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Presença de neovascularização no disco (NVD) ou em outro local (NVE)</li>
                    <li>Pode ocorrer hemorragia vítrea leve</li>
                    <li><strong>Conduta:</strong> Início precoce de panfotocoagulação retiniana (PRP)</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-red-800">RDP de Alto Risco</strong>
                  <p className="mt-1 mb-2">Critérios (conforme ETDRS):</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>NVD ≥ 1/4 a 1/3 da área do disco óptico</li>
                    <li>Qualquer NVD associada a hemorragia vítrea ou pré-retiniana</li>
                    <li>NVE extensa (&gt;1/2 da área do disco) associada a hemorragia vítrea</li>
                    <li><strong>Conduta:</strong> Fotocoagulação panretiniana imediata. Considerar anti-VEGF se mácula comprometida</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3">Edema Macular Diabético (EMD)</h3>
              <div className="space-y-4 text-sm text-yellow-700">
                <div>
                  <strong className="text-yellow-800">EMD Clínico Significativo (EMCS)</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Espessamento retiniano ou exsudatos duros localizados:</li>
                    <ul className="ml-4 mt-1 space-y-1 list-disc">
                      <li>≤500μm do centro da fóvea</li>
                      <li>≥1 área de espessamento ≥1 DD de diâmetro, com parte situada ≤1 DD do centro</li>
                    </ul>
                    <li>Detectado à biomicroscopia ou <span className="medical-term notranslate" translate="no" lang="en">OCT</span></li>
                    <li><strong>Conduta:</strong> Anti-VEGF intravítreo (1ª linha), fotocoagulação focal em casos não centrais</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-yellow-800">EMD com Comprometimento Central (CCEMD)</strong>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Espessamento retiniano envolvendo a fóvea no <span className="medical-term notranslate" translate="no" lang="en">OCT</span></li>
                    <li>Causa redução da acuidade visual</li>
                    <li><strong>Conduta:</strong> Tratamento intensivo com anti-VEGF (3–6 doses de carga), posterior avaliação para manter/alternar</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-3">Critérios de Avaliação Anatomopatológica</h3>
              <div className="space-y-3 text-sm text-green-700">
                <div>
                  <strong className="text-green-800">Microaneurismas</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Pequenas dilatações saculares capilares, geralmente 20–200 µm, primeiros sinais visíveis</li>
                    <li>Localizam-se na camada nuclear interna da retina</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-green-800">Hemorragias Intrarretinianas</strong>
                                     <ul className="mt-1 space-y-1 list-disc list-inside">
                     <li>&quot;Em ponto ou mancha&quot; (camadas profundas)</li>
                     <li>&quot;Em chama de vela&quot; (camadas superficiais – camada de fibras nervosas)</li>
                   </ul>
                </div>
                <div>
                  <strong className="text-green-800">Exsudatos Duros</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Depósitos lipídicos amarelos brilhantes</li>
                    <li>Circundam áreas de espessamento e indicam extravasamento crônico</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-green-800">IRMA (Anormalidades Microvasculares Intrarretinianas)</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Vasos dilatados e tortuosos que conectam arteríolas e vênulas adjacentes</li>
                    <li>Indicam áreas de isquemia significativa</li>
                    <li>Não ultrapassam a membrana limitante interna</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-green-800">Neovascularização</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Vasos frágeis que proliferam sobre o disco ou retina</li>
                    <li>Rompem a membrana limitante interna</li>
                    <li>Elevado risco de hemorragia vítrea e descolamento tracional</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-purple-800 mb-3">Considerações Adicionais</h3>
              <div className="space-y-3 text-sm text-purple-700">
                <div>
                  <strong className="text-purple-800"><span className="medical-term notranslate" translate="no" lang="en">OCT</span>:</strong> Ferramenta essencial para quantificar espessura macular e detectar edema oculto
                </div>
                <div>
                  <strong className="text-purple-800">Angiofluoresceinografia:</strong> Indicada para planejamento de fotocoagulação
                </div>
                <div>
                  <strong className="text-purple-800">Controle sistêmico:</strong> Fundamental (glicemia, HAS, dislipidemia, função renal)
                </div>
                <div>
                  <strong className="text-purple-800">Classificações complementares:</strong> ETDRS, DRCR.net, International Clinical Diabetic Retinopathy Severity Scale
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