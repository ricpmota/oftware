'use client';

import React from 'react';

interface AchadosAdicionaisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AchadosAdicionaisModal({ isOpen, onClose }: AchadosAdicionaisModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Achados Adicionais - Explicações</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">Alterações Maculares</h3>
              <div className="space-y-4 text-sm text-blue-700">
                <div>
                  <strong className="text-blue-800">Drusas</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Depósitos amarelados entre o EPR e a membrana de Bruch</li>
                    <li>Podem ser duras (pequenas e bem definidas) ou moles (maiores e mal definidas)</li>
                    <li>Indicam envelhecimento retiniano ou DMRI precoce</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-blue-800">Atrofia do EPR</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Perda de células do epitélio pigmentar da retina</li>
                    <li>Áreas de hipopigmentação ou despigmentação</li>
                    <li>Pode ser focal, geográfica ou difusa</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-blue-800">Descolamento de Retina Seroso</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Acúmulo de líquido entre retina e EPR</li>
                    <li>Elevação retiniana com bordas bem definidas</li>
                    <li>Pode ser idiopático ou secundário a outras patologias</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-blue-800">Hemorragia Sub-retiniana</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Sangue entre retina e EPR</li>
                    <li>Aparência escura ou vermelho-escura</li>
                    <li>Pode ser espessa ou delaminada</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-blue-800">Edema Macular</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Espessamento da retina na região macular</li>
                    <li>Pode ser cistóide, difuso ou focal</li>
                    <li>Detectado por OCT ou biomicroscopia</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-blue-800">Membrana Epirretiniana</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Tecido fibroso sobre a superfície retiniana</li>
                    <li>Pode causar pregueamento retiniano</li>
                    <li>Classificada em graus de 0 a 4 (Gass)</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-blue-800">Buraco Macular</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Defeito de espessura total na região macular</li>
                    <li>Classificado em estágios 1-4 (Gass)</li>
                    <li>Pode ser lamelar (parcial) ou de espessura total</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-3">Alterações Vasculares</h3>
              <div className="space-y-4 text-sm text-green-700">
                <div>
                  <strong className="text-green-800">Arteriosclerose</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Endurecimento e estreitamento das artérias</li>
                    <li>Reflexo arterial aumentado (cobre/prata)</li>
                    <li>Pode haver cruzamentos arteriovenosos patológicos</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-green-800">Tortuosidade Arterial</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Artérias com trajeto sinuoso</li>
                    <li>Pode ser congênita ou adquirida</li>
                    <li>Associada a hipertensão arterial</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-green-800">Tortuosidade Venosa</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Veias com trajeto sinuoso</li>
                    <li>Pode indicar obstrução venosa</li>
                    <li>Associada a retinopatia diabética</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-green-800">Dilatação Venosa</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Veias com calibre aumentado</li>
                    <li>Pode ser difusa ou segmentar</li>
                    <li>Indica congestão venosa</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-green-800">Oclusão Arterial</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Bloqueio total de artéria</li>
                    <li>Pode ser de ramo (BRAO) ou central (CRAO)</li>
                    <li>Urgência oftalmológica</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-green-800">Oclusão Venosa</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Bloqueio total de veia</li>
                    <li>Pode ser de ramo (BRVO) ou central (CRVO)</li>
                    <li>Associada a hemorragias e edema</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-green-800">Microaneurismas</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Dilatações saculares dos capilares</li>
                    <li>Primeiros sinais de retinopatia diabética</li>
                    <li>Pequenos pontos vermelhos</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-green-800">Hemangiomas</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Tumores vasculares benignos</li>
                    <li>Pode ser capilar ou cavernoso</li>
                    <li>Associado à síndrome de von Hippel-Lindau</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-green-800">Telangiectasias</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Dilatação de pequenos vasos</li>
                    <li>Pode ser idiopática ou secundária</li>
                    <li>Associada à doença de Coats</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-green-800">Neovascularização</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Formação de novos vasos anormais</li>
                    <li>Pode ser no disco (NVD) ou em outros locais (NVE)</li>
                    <li>Alto risco de hemorragia</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-green-800">Shunt Arteriovenoso</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Comunicação anormal entre artéria e veia</li>
                    <li>Pode ser congênito ou adquirido</li>
                    <li>Associado a síndromes vasculares</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-800 mb-3">Alterações Periféricas</h3>
              <div className="space-y-4 text-sm text-yellow-700">
                <div>
                  <strong className="text-yellow-800">Degeneração Lattice</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Áreas de adelgaçamento retiniano</li>
                    <li>Apresenta padrão em grade ou treliça</li>
                    <li>Fator de risco para ruptura retiniana</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-yellow-800">Buracos Atróficos</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Defeitos de espessura total por atrofia</li>
                    <li>Bordas bem definidas</li>
                    <li>Baixo risco de descolamento</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-yellow-800">Ruptura de Retina</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Descontinuidade na retina</li>
                    <li>Pode ser em ferradura ou operculada</li>
                    <li>Alto risco de descolamento</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-yellow-800">Descolamento de Retina</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Separação da retina da parede ocular</li>
                    <li>Pode ser regmatogênico, tracional ou exsudativo</li>
                    <li>Urgência cirúrgica</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-yellow-800">Retinosquise</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Separação das camadas retinianas</li>
                    <li>Pode ser congênita ou adquirida</li>
                    <li>Superfície lisa e elevada</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-yellow-800">Degeneração Paving Stone</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Áreas de atrofia coriorretiniana</li>
                    <li>Aparência de paralelepípedos</li>
                    <li>Associada à miopia alta</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-purple-800 mb-3">Alterações do Disco Óptico</h3>
              <div className="space-y-4 text-sm text-purple-700">
                <div>
                  <strong className="text-purple-800">Palidez</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Perda da coloração rósea normal</li>
                    <li>Pode ser temporal, nasal, superior, inferior ou difusa</li>
                    <li>Indica atrofia do nervo óptico</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-purple-800">Escavação</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Depressão central do disco</li>
                    <li>Medida pela relação escavação/disco (E/D)</li>
                    <li>Normal até 0.6, patológica se &gt;0.7</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-purple-800">Atrofia</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Perda de tecido nervoso</li>
                    <li>Disco pálido e escavado</li>
                    <li>Associada a glaucoma ou neuropatia óptica</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-purple-800">Inclinação</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Disco com orientação anormal</li>
                    <li>Comum em miopia alta</li>
                    <li>Pode simular glaucoma</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-purple-800">Crescente</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Área de atrofia adjacente ao disco</li>
                    <li>Pode ser temporal, nasal ou circunferencial</li>
                    <li>Associada à miopia alta</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-800 mb-3">Condições Específicas</h3>
              <div className="space-y-4 text-sm text-red-700">
                <div>
                  <strong className="text-red-800">Retinopatia Hipertensiva</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Alterações por hipertensão arterial</li>
                    <li>Classificada em graus 1-4 (Keith-Wagener)</li>
                    <li>Arteriosclerose, hemorragias, exsudatos</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-red-800">Retinopatia da Prematuridade</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Alterações em prematuros</li>
                    <li>Classificada em estágios 1-5</li>
                    <li>Neovascularização periférica</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-red-800">Retinose Pigmentar</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Doença genética degenerativa</li>
                    <li>Pigmentação em espículas ósseas</li>
                    <li>Atrofia retiniana progressiva</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-red-800">Coriorretinopatia Serosa Central</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Acúmulo de líquido sob a retina</li>
                    <li>Descolamento seroso macular</li>
                    <li>Mais comum em homens jovens</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-red-800">Uveíte</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Inflamação da úvea</li>
                    <li>Pode ser anterior, intermediária, posterior ou panuveíte</li>
                    <li>Associada a doenças sistêmicas</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-red-800">Tumores</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Massas retinianas ou coroidais</li>
                    <li>Pode ser benigno (nevo) ou maligno (melanoma)</li>
                    <li>Necessita investigação e acompanhamento</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-indigo-800 mb-3">Lesões Específicas</h3>
              <div className="space-y-4 text-sm text-indigo-700">
                <div>
                  <strong className="text-indigo-800">Nevo da Coroide</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Lesão pigmentada benigna da coroide</li>
                    <li>Geralmente plano ou levemente elevado</li>
                    <li>Pode ter drusas na superfície</li>
                    <li>Risco de transformação maligna baixo</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-indigo-800">Atrofia Coriorretiniana Periférica</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Perda de tecido retiniano e coroidal periférico</li>
                    <li>Áreas de hipopigmentação</li>
                    <li>Comum em miopia alta</li>
                    <li>Pode ser geográfica ou difusa</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-indigo-800">Coloboma</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Defeito congênito de fechamento da fissura óptica</li>
                    <li>Pode afetar íris, corpo ciliar, coroide ou disco óptico</li>
                    <li>Forma típica de pêra ou fenda</li>
                    <li>Pode ser unilateral ou bilateral</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-indigo-800">Membrana de Bruch</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Membrana entre coroide e EPR</li>
                    <li>Pode apresentar rupturas ou calcificações</li>
                    <li>Associada à miopia patológica</li>
                    <li>Fator de risco para neovascularização</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-indigo-800">Angioid Streaks</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Rupturas lineares da membrana de Bruch</li>
                    <li>Aparência de vasos sanguíneos</li>
                    <li>Associada a pseudoxantoma elástico</li>
                    <li>Risco de neovascularização</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-indigo-800">Drusen do Disco Óptico</strong>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li>Depósitos hialinos no disco óptico</li>
                    <li>Pode ser superficial ou enterrado</li>
                    <li>Pode causar edema de disco</li>
                    <li>Diferencial com papiledema</li>
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