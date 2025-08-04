// Regras clínicas extraídas da apostila 'Cirurgia Refrativa 2023'
// Para uso no componente CirurgiaRefrativaForm.tsx

export const criteriosDesejaveis = [
  'Idade > 18 anos (ideal > 21 anos)',
  'Estabilidade refrativa por 1 ano (variação < 0.5D)',
  'Ametropia entre +4,00 e -10,00 DE e até 4,00 DC',
  'Topografia regular e simétrica',
  'Paquimetria > 460μm'
];

export const contraindicacoesRelativas = [
  'Colagenoses (AR, LES, Sjögren, etc)',
  'Ectasias corneanas',
  'Distrofias estromais e de Fuchs',
  'Retinopatia diabética',
  'Olho seco grave',
  'Monoculares',
  'Neurotrofismo corneano',
  'Gravidez ou lactação',
  'Expectativas irreais',
  'Herpes ocular prévio',
  'Oftalmopatia distireoidiana',
  'Diabetes mellitus descompensado'
];

export const criteriosRiscoEctasia = [
  'Paquimetria < 500μm',
  'PTA > 40%',
  'Elevação posterior > 15μm',
  'Padrão topográfico suspeito',
  'Idade < 21 anos',
  'Histórico familiar de ceratocone'
];

export const tecnicasRefrativas = [
  {
    tecnica: 'LASIK',
    indicacao: 'Córnea espessa, topografia regular'
  },
  {
    tecnica: 'PRK',
    indicacao: 'Córnea fina, topografia regular'
  },
  {
    tecnica: 'PTK',
    indicacao: 'Irregularidade superficial, cicatrizes'
  },
  {
    tecnica: 'LASEK / Epi-LASIK',
    indicacao: 'Alternativa à PRK com reposição epitelial'
  },
  {
    tecnica: 'Lente fáquica',
    indicacao: 'Contraindicação à cirurgia corneana'
  },
  {
    tecnica: 'Cirurgia personalizada',
    indicacao: 'Corrigir aberrações de alta ordem com aberrometria'
  }
];

export const tiposAberracaoAltaOrdem = [
  'Esférica',
  'Coma',
  'Trifoil'
];

export const complicacoesPorTecnica = {
  PRK: ['Haze', 'Regressão', 'Aberrações ópticas', 'Infiltrados', 'Defeito epitelial'],
  LASIK: ['Flap irregular', 'Deslocamento do flap', 'Ectasia'],
  RK: ['Instabilidade refrativa', 'Hipermetropização', 'Ruptura tardia']
};

export const mitomicinaC = {
  indicacoes: [
    'Ametropias altas (> -6D)',
    'Reoperações',
    'Risco de haze'
  ],
  dosagem: '0,002–0,2%',
  tempo: '12 a 120 segundos'
};
