'use client';

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import GlaucomaTratamentoModal from '../app/retina/glaucoma_tratamento_modal.jsx';

interface PIORecord {
  time: string;
  pioOD: number;
  pioOE: number;
}

interface GlaucomaFormData {
  // Campos obrigatórios
  idade: number;
  raca: string;
  historicoFamiliar: boolean;
  ametropia: string;
  gonioscopiaOD: {
    superior: string;
    inferior: string;
    temporal: string;
    nasal: string;
  };
  gonioscopiaOE: {
    superior: string;
    inferior: string;
    temporal: string;
    nasal: string;
  };
  curvaTensional: PIORecord[];
  escavacaoVerticalOD: number;
  escavacaoVerticalOE: number;
  
  // Tratamento atual
  usaColirio: boolean;
  coliriosAtuais: string[];
  efeitosAdversos: boolean;
  desejaTrocar: boolean;
  
  // Contraindicações
  asma: boolean;
  bradicardia: boolean;
  
  // Análise automática
  riscoTensionalOD: string;
  riscoTensionalOE: string;
  tipoGlaucomaProvavelOD: string;
  tipoGlaucomaProvavelOE: string;
  avaliacaoEscavacaoOD: string;
  avaliacaoEscavacaoOE: string;
  interpretacaoGonioscopiaOD: string;
  interpretacaoGonioscopiaOE: string;
  condutaTerapeutica: string;
  sugestaoMedicacao: string;
}

const opcoes = {
  racas: ['Negra', 'Asiática', 'Branca', 'Outra'],
  ametropias: ['Miopia', 'Hipermetropia', 'Nenhuma'],
  angulos: ['Aberto', 'Estreito', 'Fechado'],
  gonioscopia: [
    'Grau IV - Ângulo amplo (35°-45°)',
    'Grau III - Ângulo aberto (25°-35°)',
    'Grau II - Ângulo moderadamente estreito (20°)',
    'Grau I - Ângulo muito estreito (10°)',
    'Grau 0 - Ângulo fechado'
  ],
  escavacao: ['0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7', '0.8', '0.9'],
  colirios: [
    'Latanoprosta 0,005%',
    'Travoprosta 0,004%',
    'Bimatoprosta 0,01%',
    'Timolol 0,5%',
    'Timolol 0,25%',
    'Dorzolamida 2%',
    'Brimonidina 0,2%',
    'Pilocarpina 2%',
    'Dorzolamida + Timolol',
    'Brimonidina + Timolol'
  ]
};

const classesColirios: Record<string, {
  nome: string;
  exemplos: string[];
  mecanismo: string;
  efeitosAdversos: string[];
  vantagens: string | string[];
  contraindicações: string;
  observacoes: string;
}> = {
  prostaglandinas: {
    nome: '💧 Prostaglandinas (Análogos da prostaglandina F2α)',
    exemplos: [
      'Latanoprosta 0,005% – 1 gota à noite (1x/dia)',
      'Travoprosta 0,004% – 1 gota à noite',
      'Bimatoprosta 0,01% ou 0,03% – 1 gota à noite'
    ],
    mecanismo: 'Aumenta o escoamento do humor aquoso pela via uveoscleral (principal) e em menor grau pela via trabecular.',
    efeitosAdversos: [
      'Hiperemia conjuntival (frequente)',
      'Crescimento e escurecimento de cílios',
      'Escurecimento da íris (heterocromia)',
      'Escurecimento da pele palpebral'
    ],
    vantagens: 'Maior eficácia hipotensora; uso noturno único.',
    contraindicações: 'Uveíte ativa, história de edema macular cistóide, gravidez (categoria C/D)',
    observacoes: '1ª linha de tratamento, maior eficácia hipotensora'
  },
  betabloqueadores: {
    nome: '💧 Betabloqueadores',
    exemplos: [
      'Timolol 0,5% ou 0,25% – 1 gota 2x/dia (ou 1x/dia pela manhã)'
    ],
    mecanismo: 'Reduz a produção de humor aquoso pelo corpo ciliar.',
    efeitosAdversos: [
      'Bradicardia, hipotensão',
      'Broncoespasmo, exacerbação de asma',
      'Depressão, fadiga'
    ],
    vantagens: 'Eficaz e bem tolerado em pacientes sem contraindicações cardiovasculares',
    contraindicações: 'Doença pulmonar obstrutiva crônica (DPOC), asma, bradicardia, bloqueio AV',
    observacoes: 'Menos eficaz à noite. Usar com cautela em pacientes com doenças cardiovasculares.'
  },
  inibidoresAnidrase: {
    nome: '💧 Inibidores da Anidrase Carbônica (IAC tópicos)',
    exemplos: [
      'Dorzolamida 2% – 1 gota 2x/dia',
      'Brinzolamida 1% – 1 gota 2x/dia'
    ],
    mecanismo: 'Reduz a produção do humor aquoso pela inibição da anidrase carbônica no corpo ciliar.',
    efeitosAdversos: [
      'Sabor amargo',
      'Desconforto ocular, ardor',
      'Raras reações alérgicas'
    ],
    vantagens: 'Alternativa útil para pacientes que não toleram betabloqueadores',
    contraindicações: 'Alergia a sulfas (precaução)',
    observacoes: 'Alternativa útil para pacientes que não toleram betabloqueadores.'
  },
  agonistasAlfa: {
    nome: '💧 Agonistas Alfa-2 Adrenérgicos',
    exemplos: [
      'Brimonidina 0,2% – 1 gota 2x/dia (pode ajustar para 3x/dia)'
    ],
    mecanismo: 'Duplo efeito: diminui a produção e aumenta levemente a drenagem do humor aquoso.',
    efeitosAdversos: [
      'Hiperemia, prurido, olhos secos',
      'Sonolência, hipotensão (em crianças)'
    ],
    vantagens: 'Útil como terapia adjuvante',
    contraindicações: 'Crianças < 6 anos, uso com antidepressivos tricíclicos',
    observacoes: 'Útil como terapia adjuvante.'
  },
  coliriosCombinados: {
    nome: '💧 Colírios Combinados (Associação Fixa)',
    exemplos: [
      'Dorzolamida + Timolol – 1 gota 2x/dia',
      'Brimonidina + Timolol – 1 gota 2x/dia',
      'Brinzolamida + Brimonidina – 1 gota 2x/dia',
      'Latanoprosta + Timolol – 1 gota à noite'
    ],
    mecanismo: 'Combina dois mecanismos diferentes em um só frasco.',
    efeitosAdversos: [
      'Soma dos efeitos dos componentes'
    ],
    vantagens: [
      'Reduz número de instilações diárias',
      'Melhora adesão'
    ],
    contraindicações: 'Herdadas das substâncias combinadas',
    observacoes: 'Úteis para reduzir número de instilações e melhorar adesão.'
  }
};

const classificacoesGlaucoma: Record<string, {
  nome: string;
  caracteristicas: string[];
  fatoresRisco: string[];
  sintomas: string[];
  diagnostico: string[];
  tratamento: string[];
  criteriosSuspeicao: string[];
}> = {
  gpaa: {
    nome: 'Glaucoma Primário de Ângulo Aberto (GPAA)',
    caracteristicas: [
      'Assintomático na maioria dos casos iniciais ("ladrão silencioso da visão")',
      'Bilateral e geralmente assimétrico',
      'Progressão lenta e insidiosa',
      'Aumento progressivo da escavação do disco óptico',
      'Perda de campo visual periférico em fases avançadas',
      'PIO frequentemente elevada (>21 mmHg), mas pode estar normal'
    ],
    fatoresRisco: [
      'Idade avançada (>40 anos)',
      'Raça negra',
      'História familiar positiva',
      'Miopia moderada a alta',
      'Pressão intraocular limítrofe ou elevada'
    ],
    sintomas: [
      'Assintomático até estágios avançados',
      'Perda gradual da visão periférica',
      'Dificuldade de adaptação ao escuro',
      'Redução da acuidade visual em fases tardias'
    ],
    diagnostico: [
      'Campimetria computadorizada',
      'OCT do nervo óptico',
      'Gonioscopia (ângulo aberto)',
      'Curva tensional diária',
      'Biomicroscopia do disco óptico',
      'Retinografia'
    ],
    tratamento: [
      'Prostaglandinas como 1ª linha',
      'Betabloqueadores como alternativa',
      'Associação de medicamentos conforme necessário',
      'Trabeculoplastia a laser (SLT)',
      'Cirurgia filtrante em casos avançados'
    ],
    criteriosSuspeicao: [
      'PIO > 21 mmHg',
      'Escavação > 0.6',
      'Assimetria de escavação > 0.2',
      'História familiar positiva',
      'Raça negra > 40 anos'
    ]
  },
  anguloEstreito: {
    nome: 'Glaucoma de Ângulo Estreito / Fechado (GAE / GAAF)',
    caracteristicas: [
      'Episódios intermitentes ou crises agudas com sintomas dramáticos',
      'Dor ocular intensa, cefaleia, náuseas, vômitos',
      'Midríase fixa, córnea opaca, hiperemia ciliar',
      'Halos coloridos ao redor das luzes',
      'Pressão intraocular muito elevada (>40 mmHg nas crises)'
    ],
    fatoresRisco: [
      'Hipermetropia axial',
      'Câmaras anteriores rasas',
      'Idade > 60 anos',
      'Gênero feminino',
      'Catarata intumescente',
      'Raça asiática ou inuit'
    ],
    sintomas: [
      'Dor ocular intensa e súbita',
      'Cefaleia frontal ou temporal',
      'Náuseas e vômitos',
      'Visão embaçada',
      'Halos coloridos ao redor das luzes',
      'Fotofobia'
    ],
    diagnostico: [
      'Gonioscopia (ângulo estreito/fechado)',
      'Biomicroscopia (câmara anterior rasa)',
      'Curva tensional (picos elevados)',
      'Ultrassom biomicroscópico',
      'Tomografia de coerência óptica (AS-OCT)'
    ],
    tratamento: [
      'Iridotomia a laser (YAG)',
      'Pilocarpina 2% (crises agudas)',
      'Medicamentos hipotensores',
      'Cirurgia de catarata (se presente)',
      'Cirurgia filtrante em casos refratários'
    ],
    criteriosSuspeicao: [
      'Hipermetropia > +3.00D',
      'Câmara anterior rasa',
      'Ângulo estreito na gonioscopia',
      'História de crises intermitentes',
      'Idade > 60 anos'
    ]
  },
  secundario: {
    nome: 'Glaucomas Secundários',
    caracteristicas: [
      'Quadro variável dependendo da causa subjacente',
      'Pode se manifestar com inflamação, hemorragia, neovascularização',
      'Pode ser uni ou bilateral',
      'Comum em jovens com causas inflamatórias',
      'Após cirurgia intraocular ou trauma'
    ],
    fatoresRisco: [
      'Uveíte crônica (glaucoma inflamatório)',
      'Trauma ocular (hipema, dispersão pigmentária)',
      'Glaucoma neovascular (DM, oclusão venosa)',
      'Uso prolongado de corticoides',
      'Tumores intraoculares',
      'Cirurgias oculares prévias'
    ],
    sintomas: [
      'Variáveis conforme causa base',
      'Dor ocular (inflamatório)',
      'Visão embaçada',
      'Fotofobia (uveítico)',
      'Assintomático (neovascular)'
    ],
    diagnostico: [
      'Biomicroscopia detalhada',
      'Gonioscopia (achados específicos)',
      'Exames complementares conforme causa',
      'Angiofluoresceinografia (neovascular)',
      'Ultrassom (tumores)',
      'Exames laboratoriais (inflamatório)'
    ],
    tratamento: [
      'Tratamento da causa base',
      'Controle da PIO com medicamentos',
      'Cirurgia específica conforme etiologia',
      'Ciclodestruição em casos avançados',
      'Implantes de drenagem'
    ],
    criteriosSuspeicao: [
      'História de trauma ocular',
      'Uso prolongado de corticoides',
      'Diabetes mellitus descompensado',
      'História de uveíte',
      'Cirurgia ocular prévia'
    ]
  },
  congenito: {
    nome: 'Glaucoma Congênito (ou Infantil Primário)',
    caracteristicas: [
      'Triade clássica: Buftalmo, Lacrimejamento, Fotofobia',
      'Hábito de manter os olhos fechados',
      'Heterocromia, opacidade corneana, estrias de Haab',
      'Pressão intraocular geralmente > 21 mmHg',
      'Diagnóstico em menores de 3 anos'
    ],
    fatoresRisco: [
      'História familiar de glaucoma infantil',
      'Diagnóstico em menores de 3 anos',
      'Mais comum em meninos',
      'Maior incidência em casamentos consanguíneos',
      'Formas autossômicas recessivas'
    ],
    sintomas: [
      'Buftalmo (globo ocular aumentado)',
      'Lacrimejamento excessivo (epífora)',
      'Fotofobia intensa',
      'Blefarospasmo',
      'Irritabilidade'
    ],
    diagnostico: [
      'Exame sob anestesia',
      'Biomicroscopia (córnea, câmara anterior)',
      'Gonioscopia (malformações)',
      'Tonometria (PIO elevada)',
      'Ultrassom (comprimento axial)',
      'Exame genético (se disponível)'
    ],
    tratamento: [
      'Cirurgia: Trabeculotomia',
      'Cirurgia: Goniotomia',
      'Medicamentos hipotensores (adjuvante)',
      'Ciclodestruição em casos refratários',
      'Implantes de drenagem'
    ],
    criteriosSuspeicao: [
      'Buftalmo em lactente',
      'Lacrimejamento excessivo',
      'Fotofobia',
      'História familiar positiva',
      'Córnea opaca ou aumentada'
    ]
  },
  normotensivo: {
    nome: 'Glaucoma Normotensivo (GNT)',
    caracteristicas: [
      'Pressão intraocular normal ou baixa (<21 mmHg)',
      'Achados típicos de glaucoma: escavação aumentada do nervo óptico',
      'Perda progressiva de campo visual',
      'Frequentemente subdiagnosticado',
      'Mais comum em idosos, asiáticos e mulheres'
    ],
    fatoresRisco: [
      'Vasoespasmo periférico (ex: fenômeno de Raynaud)',
      'Hipotensão arterial noturna',
      'Apneia obstrutiva do sono',
      'História familiar de GNT',
      'Doenças do colágeno ou disautonomias'
    ],
    sintomas: [
      'Assintomático inicialmente',
      'Perda de campo visual',
      'Redução da acuidade visual tardia',
      'Dificuldade de adaptação ao escuro'
    ],
    diagnostico: [
      'Campimetria computadorizada',
      'OCT do nervo óptico',
      'Curva tensional (PIO normal)',
      'Avaliação vascular (Doppler)',
      'Monitorização da pressão arterial',
      'Polissonografia (apneia)'
    ],
    tratamento: [
      'Redução de 30% da PIO',
      'Tratamento de fatores vasculares',
      'Prostaglandinas (1ª linha)',
      'Betabloqueadores',
      'Controle da pressão arterial',
      'Tratamento da apneia do sono'
    ],
    criteriosSuspeicao: [
      'Escavação aumentada com PIO normal',
      'Perda de campo visual típica',
      'História familiar de GNT',
      'Fenômeno de Raynaud',
      'Hipotensão noturna'
    ]
  }
};

export default function GlaucomaForm() {
  const [formData, setFormData] = useState<GlaucomaFormData>({
    idade: 0,
    raca: '',
    historicoFamiliar: false,
    ametropia: '',
    gonioscopiaOD: {
      superior: '',
      inferior: '',
      temporal: '',
      nasal: ''
    },
    gonioscopiaOE: {
      superior: '',
      inferior: '',
      temporal: '',
      nasal: ''
    },
    curvaTensional: [],
    escavacaoVerticalOD: 0,
    escavacaoVerticalOE: 0,
    usaColirio: false,
    coliriosAtuais: [],
    efeitosAdversos: false,
    desejaTrocar: false,
    
    // Contraindicações
    asma: false,
    bradicardia: false,
    riscoTensionalOD: '',
    riscoTensionalOE: '',
    tipoGlaucomaProvavelOD: '',
    tipoGlaucomaProvavelOE: '',
    avaliacaoEscavacaoOD: '',
    avaliacaoEscavacaoOE: '',
    interpretacaoGonioscopiaOD: '',
    interpretacaoGonioscopiaOE: '',
    condutaTerapeutica: '',
    sugestaoMedicacao: ''
  });

  const [showModalColirios, setShowModalColirios] = useState(false);
  const [showModalClassificacoes, setShowModalClassificacoes] = useState(false);
  const [newPIO, setNewPIO] = useState({ time: '', pioOD: '', pioOE: '' });
  const [selectedColirioClass, setSelectedColirioClass] = useState<string>('prostaglandinas');
  const [selectedGlaucomaType, setSelectedGlaucomaType] = useState<string>('gpaa');
  const [showTratamentoModal, setShowTratamentoModal] = useState(false);
  const [tratamentoModalConfig, setTratamentoModalConfig] = useState({
    tipo: 'gpaa',
    modo: 'protocolo'
  });

  // Adicionar novo valor de PIO
  const addPIO = () => {
    if (newPIO.time && newPIO.pioOD && newPIO.pioOE) {
      setFormData(prev => ({
        ...prev,
        curvaTensional: [...prev.curvaTensional, {
          time: newPIO.time,
          pioOD: parseFloat(newPIO.pioOD),
          pioOE: parseFloat(newPIO.pioOE)
        }]
      }));
      setNewPIO({ time: '', pioOD: '', pioOE: '' });
    }
  };

  // Remover valor de PIO
  const removePIO = (index: number) => {
    setFormData(prev => ({
      ...prev,
      curvaTensional: prev.curvaTensional.filter((_, i) => i !== index)
    }));
  };

  // Toggle de colírio
  const toggleColirio = (colirio: string) => {
    setFormData(prev => ({
      ...prev,
      coliriosAtuais: prev.coliriosAtuais.includes(colirio)
        ? prev.coliriosAtuais.filter(c => c !== colirio)
        : [...prev.coliriosAtuais, colirio]
    }));
  };



  // Abrir modal de tratamento
  const abrirModalTratamento = (tipo: string, modo: 'protocolo' | 'alternativas' | 'investigacao') => {
    setTratamentoModalConfig({ tipo, modo });
    setShowTratamentoModal(true);
  };

  // Interpretação da gonioscopia baseada na Escala de Shaffer

  // Interface para o resultado da avaliação da gonioscopia
  interface AvaliacaoGonioscopia {
    grauMinimo: number;
    interpretacaoAngulo: string;
    tipoGlaucoma: string;
    fraseLaudo: string;
  }

  // Função para avaliar gonioscopia baseada na Escala de Shaffer
  const avaliarGonioscopia = (olho: 'OD' | 'OE', valoresQuadrantes: { superior: string; inferior: string; temporal: string; nasal: string }): AvaliacaoGonioscopia => {
    // Converter strings para números baseado na Escala de Shaffer
    const converterGrau = (valor: string): number => {
      if (valor.includes('Grau IV')) return 4;
      if (valor.includes('Grau III')) return 3;
      if (valor.includes('Grau II')) return 2;
      if (valor.includes('Grau I')) return 1;
      if (valor.includes('Grau 0')) return 0;
      return -1; // Valor inválido
    };

    const graus = [
      converterGrau(valoresQuadrantes.superior),
      converterGrau(valoresQuadrantes.inferior),
      converterGrau(valoresQuadrantes.temporal),
      converterGrau(valoresQuadrantes.nasal)
    ].filter(g => g !== -1);

    // Se não há graus válidos
    if (graus.length === 0) {
      return {
        grauMinimo: -1,
        interpretacaoAngulo: 'Não avaliado',
        tipoGlaucoma: 'Não determinado',
        fraseLaudo: `Gonioscopia ${olho}: Dados insuficientes para avaliação.`
      };
    }

    // Grau mínimo entre os 4 quadrantes define o risco angular
    const grauMinimo = Math.min(...graus);

    // Interpretação do ângulo baseada no grau mínimo
    let interpretacaoAngulo: string;
    let tipoGlaucoma: string;

    if (grauMinimo >= 4) {
      interpretacaoAngulo = 'amplamente aberto';
      tipoGlaucoma = 'Glaucoma Primário de Ângulo Aberto (GPAA)';
    } else if (grauMinimo === 3) {
      interpretacaoAngulo = 'aberto';
      tipoGlaucoma = 'Glaucoma Primário de Ângulo Aberto (GPAA)';
    } else if (grauMinimo === 2) {
      interpretacaoAngulo = 'potencialmente ocluível (estreito)';
      tipoGlaucoma = 'Glaucoma de Ângulo Estreito';
    } else if (grauMinimo === 1) {
      interpretacaoAngulo = 'estreito';
      tipoGlaucoma = 'Glaucoma de Ângulo Estreito';
    } else if (grauMinimo === 0) {
      interpretacaoAngulo = 'fechado';
      tipoGlaucoma = 'Glaucoma de Ângulo Fechado';
    } else {
      interpretacaoAngulo = 'não determinado';
      tipoGlaucoma = 'Não determinado';
    }

    // Gerar frase para o laudo clínico
    const fraseLaudo = `Gonioscopia ${olho} com grau mínimo de ${grauMinimo} (Escala de Shaffer) nos quadrantes examinados, caracterizando ângulo ${interpretacaoAngulo}. Sugestivo de ${tipoGlaucoma}.`;

    return {
      grauMinimo,
      interpretacaoAngulo,
      tipoGlaucoma,
      fraseLaudo
    };
  };



  // Análise automática
  const analisarDados = () => {
    // Validar campos obrigatórios
    const gonioscopiaCompletaOD = formData.gonioscopiaOD.superior && formData.gonioscopiaOD.inferior && 
                                  formData.gonioscopiaOD.temporal && formData.gonioscopiaOD.nasal;
    const gonioscopiaCompletaOE = formData.gonioscopiaOE.superior && formData.gonioscopiaOE.inferior && 
                                  formData.gonioscopiaOE.temporal && formData.gonioscopiaOE.nasal;
    
    if (!formData.idade || !formData.raca || formData.historicoFamiliar === undefined || 
        !formData.ametropia || !gonioscopiaCompletaOD || !gonioscopiaCompletaOE || 
        formData.curvaTensional.length === 0 || !formData.escavacaoVerticalOD || !formData.escavacaoVerticalOE) {
      alert('Por favor, preencha todos os campos obrigatórios antes de gerar o laudo.');
      return;
    }

    // Análise individual por olho
    const pioOD = formData.curvaTensional.map(record => record.pioOD);
    const pioOE = formData.curvaTensional.map(record => record.pioOE);
    
    // Análise do risco tensional OD
    let riscoTensionalOD = '';
    if (pioOD.length > 0) {
      const maxPIOOD = Math.max(...pioOD);
      const minPIOOD = Math.min(...pioOD);
      const variacaoOD = maxPIOOD - minPIOOD;
      
      if (maxPIOOD > 21 || variacaoOD > 5) {
        riscoTensionalOD = `Risco aumentado: PIO máxima ${maxPIOOD} mmHg, variação ${variacaoOD.toFixed(1)} mmHg`;
      } else {
        riscoTensionalOD = `Risco normal: PIO máxima ${maxPIOOD} mmHg, variação ${variacaoOD.toFixed(1)} mmHg`;
      }
    }

    // Análise do risco tensional OE
    let riscoTensionalOE = '';
    if (pioOE.length > 0) {
      const maxPIOOE = Math.max(...pioOE);
      const minPIOOE = Math.min(...pioOE);
      const variacaoOE = maxPIOOE - minPIOOE;
      
      if (maxPIOOE > 21 || variacaoOE > 5) {
        riscoTensionalOE = `Risco aumentado: PIO máxima ${maxPIOOE} mmHg, variação ${variacaoOE.toFixed(1)} mmHg`;
      } else {
        riscoTensionalOE = `Risco normal: PIO máxima ${maxPIOOE} mmHg, variação ${variacaoOE.toFixed(1)} mmHg`;
      }
    }

    // Análise da escavação OD
    let avaliacaoEscavacaoOD = '';
    if (formData.escavacaoVerticalOD > 0.6) {
      avaliacaoEscavacaoOD = 'Escavação aumentada (>0.6) - sugestivo de dano glaucomatoso';
    } else if (formData.escavacaoVerticalOD > 0.3) {
      avaliacaoEscavacaoOD = 'Escavação moderada (0.3-0.6) - monitorar';
    } else {
      avaliacaoEscavacaoOD = 'Escavação normal (<0.3)';
    }

    // Análise da escavação OE
    let avaliacaoEscavacaoOE = '';
    if (formData.escavacaoVerticalOE > 0.6) {
      avaliacaoEscavacaoOE = 'Escavação aumentada (>0.6) - sugestivo de dano glaucomatoso';
    } else if (formData.escavacaoVerticalOE > 0.3) {
      avaliacaoEscavacaoOE = 'Escavação moderada (0.3-0.6) - monitorar';
    } else {
      avaliacaoEscavacaoOE = 'Escavação normal (<0.3)';
    }

    // Análise da gonioscopia usando a nova função baseada na Escala de Shaffer
    const avaliacaoGonioscopiaOD = avaliarGonioscopia('OD', formData.gonioscopiaOD);
    const avaliacaoGonioscopiaOE = avaliarGonioscopia('OE', formData.gonioscopiaOE);
    
    // Usar as frases geradas automaticamente para o laudo
    const interpretacaoGonioscopiaOD = avaliacaoGonioscopiaOD.fraseLaudo;
    const interpretacaoGonioscopiaOE = avaliacaoGonioscopiaOE.fraseLaudo;
    
    // Classificação do tipo de glaucoma por olho baseada na análise da gonioscopia
    let tipoGlaucomaProvavelOD = avaliacaoGonioscopiaOD.tipoGlaucoma;
    let tipoGlaucomaProvavelOE = avaliacaoGonioscopiaOE.tipoGlaucoma;
    
    // Ajustar para casos especiais baseados na idade
    if (formData.idade <= 40) {
      if (avaliacaoGonioscopiaOD.grauMinimo >= 0) {
      tipoGlaucomaProvavelOD = 'Glaucoma Congênito ou Secundário';
      }
      if (avaliacaoGonioscopiaOE.grauMinimo >= 0) {
      tipoGlaucomaProvavelOE = 'Glaucoma Congênito ou Secundário';
      }
    }

      // 🎯 Nova lógica de prescrição medicamentosa melhorada
  interface TratamentoGlaucoma {
    conduta: string;
    sugestao: string;
    observacoes: string[];
  }

  const definirTratamentoGlaucoma = (formData: GlaucomaFormData): TratamentoGlaucoma => {
    const maxPIO = Math.max(...pioOD, ...pioOE);
    const tratamento: TratamentoGlaucoma = {
      conduta: '',
      sugestao: '',
      observacoes: []
    };

    // 🔍 1. Caso paciente não use colírio
    if (!formData.usaColirio) {
      if (tipoGlaucomaProvavelOD.includes('Ângulo Estreito') || tipoGlaucomaProvavelOE.includes('Ângulo Estreito')) {
        tratamento.conduta = 'Iniciar tratamento específico para ângulo estreito';
        tratamento.sugestao = 'Pilocarpina 2% 4x/dia + Agendar Iridotomia YAG';
      } else {
        tratamento.conduta = 'Iniciar monoterapia';
        tratamento.sugestao = 'Latanoprosta 0,005% 1x/noite (Prostaglandina)';
      }
    }

    // 🔍 2. Caso use 1 colírio e PIO ainda elevada
    else if (formData.coliriosAtuais.length === 1) {
      if (maxPIO > 18) {
        tratamento.conduta = 'Associação terapêutica';
        // Verificar contraindicações antes de sugerir Timolol
        if (formData.asma || formData.bradicardia) {
          tratamento.sugestao = 'Adicionar Dorzolamida 2% 2x/dia (Timolol contraindicado)';
          tratamento.observacoes.push('Timolol contraindicado devido a contraindicações cardiopulmonares');
        } else {
          tratamento.sugestao = 'Adicionar Timolol 0,5% 2x/dia OU Dorzolamida 2% 2x/dia';
        }
      } else {
        tratamento.conduta = 'Manter monoterapia';
        tratamento.sugestao = 'PIO controlada - manter medicação atual';
      }
    }

    // 🔍 3. Caso use 2 ou mais colírios
    else if (formData.coliriosAtuais.length >= 2) {
      if (maxPIO > 21) {
        tratamento.conduta = 'PIO elevada sob politerapia';
        tratamento.sugestao = 'Considerar trabeculoplastia OU cirurgia filtrante';
      } else {
        tratamento.conduta = 'Manter tratamento e monitorar';
        tratamento.sugestao = 'Acompanhamento rigoroso com curva tensional e OCT papilar';
      }
    }

    // ⚠️ 4. Considerar efeitos adversos ou desejo de trocar
    if (formData.efeitosAdversos || formData.desejaTrocar) {
      tratamento.observacoes.push('Paciente relatou efeitos adversos ou deseja trocar medicação');
      tratamento.conduta += ' + Reavaliar classe medicamentosa';
    }

    // ❌ 5. Contraindicações absolutas
    if (formData.asma || formData.bradicardia) {
      // Se já usa Timolol, suspender
      if (formData.coliriosAtuais.includes('Timolol')) {
        tratamento.sugestao = 'Suspender Timolol - contraindicado em asma e bradicardia';
        tratamento.observacoes.push('Evitar betabloqueadores');
      }
      // Se não usa Timolol mas tem contraindicações, evitar prescrever
      else if (!formData.usaColirio || formData.coliriosAtuais.length === 0) {
        tratamento.observacoes.push('Contraindicações cardiopulmonares - evitar betabloqueadores');
      }
    }

    // 📉 6. PIO muito elevada
    if (maxPIO >= 30) {
      tratamento.conduta = 'PIO crítica';
      tratamento.sugestao = 'Encaminhar para cirurgia urgente';
    }

    // 🧬 7. Fatores de risco
    if (formData.historicoFamiliar) {
      tratamento.observacoes.push('Atenção: histórico familiar positivo aumenta agressividade');
    }

    // 🌀 8. Integração com gonioscopia
    const avaliacaoGonioscopiaOD = avaliarGonioscopia('OD', formData.gonioscopiaOD);
    const avaliacaoGonioscopiaOE = avaliarGonioscopia('OE', formData.gonioscopiaOE);
    const menorGrau = Math.min(avaliacaoGonioscopiaOD.grauMinimo, avaliacaoGonioscopiaOE.grauMinimo);
    
    if (menorGrau <= 2 && (tipoGlaucomaProvavelOD.includes('GPAA') || tipoGlaucomaProvavelOE.includes('GPAA'))) {
      tratamento.conduta += ' | Rever diagnóstico: possível ângulo estreito';
      tratamento.observacoes.push('Gonioscopia sugere ângulo fechado');
    }

    // 📊 9. Considerar idade e fatores específicos
    if (formData.idade > 60) {
      tratamento.observacoes.push('Paciente idoso - monitorar efeitos sistêmicos');
    }

    if (formData.raca === 'Negra') {
      tratamento.observacoes.push('Paciente negro - maior risco de progressão');
    }

    return tratamento;
  };

  const tratamento = definirTratamentoGlaucoma(formData);
  const condutaTerapeutica = tratamento.conduta;
  const sugestaoMedicacao = tratamento.sugestao + (tratamento.observacoes.length > 0 ? '\n\nObservações:\n' + tratamento.observacoes.join('\n') : '');

    setFormData(prev => ({
      ...prev,
      riscoTensionalOD,
      riscoTensionalOE,
      tipoGlaucomaProvavelOD,
      tipoGlaucomaProvavelOE,
      avaliacaoEscavacaoOD,
      avaliacaoEscavacaoOE,
      interpretacaoGonioscopiaOD,
      interpretacaoGonioscopiaOE,
      condutaTerapeutica,
      sugestaoMedicacao
    }));
  };

  // Dados para o gráfico
  const chartData = formData.curvaTensional.map((record, index) => ({
    name: `T${index + 1}`,
    'OD': record.pioOD,
    'OE': record.pioOE,
    'Limite Normal': 21
  }));

  return (
    <div className="max-w-7xl mx-auto p-1 sm:p-2 md:p-4 bg-white min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-2 sm:p-3 md:p-4 mb-3 sm:mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6 text-center">
          Formulário de Avaliação de Glaucoma
        </h1>

        {/* Campos Obrigatórios */}
        <div className="bg-white border border-gray-200 p-3 sm:p-4 md:p-6 rounded-lg mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
            Dados Clínicos Essenciais
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Idade *
              </label>
              <input
                type="number"
                value={formData.idade || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, idade: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                placeholder="Ex: 65"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Raça *
              </label>
              <select
                value={formData.raca}
                onChange={(e) => setFormData(prev => ({ ...prev, raca: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                required
              >
                <option value="">Selecione</option>
                {opcoes.racas.map(raca => (
                  <option key={raca} value={raca}>{raca}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Histórico Familiar *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center text-black">
                  <input
                    type="radio"
                    checked={formData.historicoFamiliar === true}
                    onChange={() => setFormData(prev => ({ ...prev, historicoFamiliar: true }))}
                    className="mr-2"
                    required
                  />
                  Sim
                </label>
                <label className="flex items-center text-black">
                  <input
                    type="radio"
                    checked={formData.historicoFamiliar === false}
                    onChange={() => setFormData(prev => ({ ...prev, historicoFamiliar: false }))}
                    className="mr-2"
                    required
                  />
                  Não
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ametropia *
              </label>
              <select
                value={formData.ametropia}
                onChange={(e) => setFormData(prev => ({ ...prev, ametropia: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                required
              >
                <option value="">Selecione</option>
                {opcoes.ametropias.map(ametropia => (
                  <option key={ametropia} value={ametropia}>{ametropia}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {/* Gonioscopia - Seção Separada */}
        <div className="bg-white border border-gray-200 p-2 sm:p-3 md:p-4 rounded-lg mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">Gonioscopia (Classificação de Shaffer)</h2>
              
              {/* Legenda */}
              <div className="mb-3 sm:mb-4 bg-gray-50 rounded-lg p-2 sm:p-3">
                <h3 className="font-semibold text-black mb-2 sm:mb-3 text-sm sm:text-base">Legenda dos Graus:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm text-black">
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                    <span><strong>Grau IV:</strong> Ângulo amplo (35°-45°) - Sem risco</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-blue-500 rounded mr-3"></div>
                    <span><strong>Grau III:</strong> Ângulo aberto (25°-35°) - Baixo risco</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                    <span><strong>Grau II:</strong> Ângulo estreito (20°) - Risco moderado</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-500 rounded mr-3"></div>
                    <span><strong>Grau I:</strong> Ângulo muito estreito (10°) - Alto risco</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 bg-gray-800 rounded mr-3"></div>
                    <span><strong>Grau 0:</strong> Ângulo fechado - Urgência</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                {/* Olho Direito */}
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-blue-800 mb-2 sm:mb-3 border-b border-blue-200 pb-2">Olho Direito (OD)</h3>
                  <div className="relative">
                    {/* Quadro Visual */}
                    <div className="grid grid-cols-2 gap-1 sm:gap-2 mb-2 sm:mb-3">
                      <div className="border-2 border-gray-300 rounded-lg p-2 sm:p-3 bg-gray-50">
                        <label className="block text-xs font-medium text-gray-700 mb-1 sm:mb-2 text-center">Superior</label>
                        <div className="flex gap-0.5 sm:gap-1">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOD: { ...prev.gonioscopiaOD, superior: "Grau IV - Ângulo amplo (35°-45°)" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOD.superior === "Grau IV - Ângulo amplo (35°-45°)" 
                                ? "bg-green-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            IV
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOD: { ...prev.gonioscopiaOD, superior: "Grau III - Ângulo aberto (25°-35°)" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOD.superior === "Grau III - Ângulo aberto (25°-35°)" 
                                ? "bg-blue-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            III
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOD: { ...prev.gonioscopiaOD, superior: "Grau II - Ângulo moderadamente estreito (20°)" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOD.superior === "Grau II - Ângulo moderadamente estreito (20°)" 
                                ? "bg-yellow-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            II
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOD: { ...prev.gonioscopiaOD, superior: "Grau I - Ângulo muito estreito (10°)" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOD.superior === "Grau I - Ângulo muito estreito (10°)" 
                                ? "bg-red-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            I
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOD: { ...prev.gonioscopiaOD, superior: "Grau 0 - Ângulo fechado" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOD.superior === "Grau 0 - Ângulo fechado" 
                                ? "bg-gray-800 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            0
                          </button>
                        </div>
                      </div>
                      <div className="border-2 border-gray-300 rounded-lg p-2 sm:p-3 bg-gray-50">
                        <label className="block text-xs font-medium text-gray-700 mb-1 sm:mb-2 text-center">Temporal</label>
                        <div className="flex gap-0.5 sm:gap-1">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOD: { ...prev.gonioscopiaOD, temporal: "Grau IV - Ângulo amplo (35°-45°)" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOD.temporal === "Grau IV - Ângulo amplo (35°-45°)" 
                                ? "bg-green-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            IV
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOD: { ...prev.gonioscopiaOD, temporal: "Grau III - Ângulo aberto (25°-35°)" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOD.temporal === "Grau III - Ângulo aberto (25°-35°)" 
                                ? "bg-blue-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            III
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOD: { ...prev.gonioscopiaOD, temporal: "Grau II - Ângulo moderadamente estreito (20°)" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOD.temporal === "Grau II - Ângulo moderadamente estreito (20°)" 
                                ? "bg-yellow-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            II
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOD: { ...prev.gonioscopiaOD, temporal: "Grau I - Ângulo muito estreito (10°)" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOD.temporal === "Grau I - Ângulo muito estreito (10°)" 
                                ? "bg-red-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            I
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOD: { ...prev.gonioscopiaOD, temporal: "Grau 0 - Ângulo fechado" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOD.temporal === "Grau 0 - Ângulo fechado" 
                                ? "bg-gray-800 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            0
                          </button>
                        </div>
                      </div>
                      <div className="border-2 border-gray-300 rounded-lg p-2 sm:p-3 bg-gray-50">
                        <label className="block text-xs font-medium text-gray-700 mb-1 sm:mb-2 text-center">Nasal</label>
                        <div className="flex gap-0.5 sm:gap-1">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOD: { ...prev.gonioscopiaOD, nasal: "Grau IV - Ângulo amplo (35°-45°)" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOD.nasal === "Grau IV - Ângulo amplo (35°-45°)" 
                                ? "bg-green-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            IV
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOD: { ...prev.gonioscopiaOD, nasal: "Grau III - Ângulo aberto (25°-35°)" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOD.nasal === "Grau III - Ângulo aberto (25°-35°)" 
                                ? "bg-blue-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            III
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOD: { ...prev.gonioscopiaOD, nasal: "Grau II - Ângulo moderadamente estreito (20°)" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOD.nasal === "Grau II - Ângulo moderadamente estreito (20°)" 
                                ? "bg-yellow-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            II
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOD: { ...prev.gonioscopiaOD, nasal: "Grau I - Ângulo muito estreito (10°)" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOD.nasal === "Grau I - Ângulo muito estreito (10°)" 
                                ? "bg-red-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            I
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOD: { ...prev.gonioscopiaOD, nasal: "Grau 0 - Ângulo fechado" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOD.nasal === "Grau 0 - Ângulo fechado" 
                                ? "bg-gray-800 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            0
                          </button>
                        </div>
                      </div>
                      <div className="border-2 border-gray-300 rounded-lg p-2 sm:p-3 bg-gray-50">
                        <label className="block text-xs font-medium text-gray-700 mb-1 sm:mb-2 text-center">Inferior</label>
                        <div className="flex gap-0.5 sm:gap-1">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOD: { ...prev.gonioscopiaOD, inferior: "Grau IV - Ângulo amplo (35°-45°)" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOD.inferior === "Grau IV - Ângulo amplo (35°-45°)" 
                                ? "bg-green-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            IV
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOD: { ...prev.gonioscopiaOD, inferior: "Grau III - Ângulo aberto (25°-35°)" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOD.inferior === "Grau III - Ângulo aberto (25°-35°)" 
                                ? "bg-blue-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            III
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOD: { ...prev.gonioscopiaOD, inferior: "Grau II - Ângulo moderadamente estreito (20°)" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOD.inferior === "Grau II - Ângulo moderadamente estreito (20°)" 
                                ? "bg-yellow-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            II
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOD: { ...prev.gonioscopiaOD, inferior: "Grau I - Ângulo muito estreito (10°)" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOD.inferior === "Grau I - Ângulo muito estreito (10°)" 
                                ? "bg-red-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            I
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOD: { ...prev.gonioscopiaOD, inferior: "Grau 0 - Ângulo fechado" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOD.inferior === "Grau 0 - Ângulo fechado" 
                                ? "bg-gray-800 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            0
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Olho Esquerdo */}
                <div>
                  <h3 className="text-base sm:text-lg font-medium text-green-800 mb-2 sm:mb-3 border-b border-green-200 pb-2">Olho Esquerdo (OE)</h3>
                  <div className="relative">
                    {/* Quadro Visual */}
                    <div className="grid grid-cols-2 gap-1 sm:gap-2 mb-2 sm:mb-3">
                      <div className="border-2 border-gray-300 rounded-lg p-2 sm:p-3 bg-gray-50">
                        <label className="block text-xs font-medium text-gray-700 mb-1 sm:mb-2 text-center">Superior</label>
                        <div className="flex gap-0.5 sm:gap-1">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOE: { ...prev.gonioscopiaOE, superior: "Grau IV - Ângulo amplo (35°-45°)" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOE.superior === "Grau IV - Ângulo amplo (35°-45°)" 
                                ? "bg-green-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            IV
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOE: { ...prev.gonioscopiaOE, superior: "Grau III - Ângulo aberto (25°-35°)" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOE.superior === "Grau III - Ângulo aberto (25°-35°)" 
                                ? "bg-blue-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            III
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOE: { ...prev.gonioscopiaOE, superior: "Grau II - Ângulo moderadamente estreito (20°)" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOE.superior === "Grau II - Ângulo moderadamente estreito (20°)" 
                                ? "bg-yellow-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            II
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOE: { ...prev.gonioscopiaOE, superior: "Grau I - Ângulo muito estreito (10°)" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOE.superior === "Grau I - Ângulo muito estreito (10°)" 
                                ? "bg-red-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            I
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOE: { ...prev.gonioscopiaOE, superior: "Grau 0 - Ângulo fechado" }
                            }))}
                            className={`flex-1 py-1 px-1 sm:px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOE.superior === "Grau 0 - Ângulo fechado" 
                                ? "bg-gray-800 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            0
                          </button>
                        </div>
                      </div>
                      <div className="border-2 border-gray-300 rounded-lg p-3 bg-gray-50">
                        <label className="block text-xs font-medium text-gray-700 mb-2 text-center">Temporal</label>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOE: { ...prev.gonioscopiaOE, temporal: "Grau IV - Ângulo amplo (35°-45°)" }
                            }))}
                            className={`flex-1 py-1 px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOE.temporal === "Grau IV - Ângulo amplo (35°-45°)" 
                                ? "bg-green-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            IV
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOE: { ...prev.gonioscopiaOE, temporal: "Grau III - Ângulo aberto (25°-35°)" }
                            }))}
                            className={`flex-1 py-1 px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOE.temporal === "Grau III - Ângulo aberto (25°-35°)" 
                                ? "bg-blue-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            III
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOE: { ...prev.gonioscopiaOE, temporal: "Grau II - Ângulo moderadamente estreito (20°)" }
                            }))}
                            className={`flex-1 py-1 px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOE.temporal === "Grau II - Ângulo moderadamente estreito (20°)" 
                                ? "bg-yellow-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            II
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOE: { ...prev.gonioscopiaOE, temporal: "Grau I - Ângulo muito estreito (10°)" }
                            }))}
                            className={`flex-1 py-1 px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOE.temporal === "Grau I - Ângulo muito estreito (10°)" 
                                ? "bg-red-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            I
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOE: { ...prev.gonioscopiaOE, temporal: "Grau 0 - Ângulo fechado" }
                            }))}
                            className={`flex-1 py-1 px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOE.temporal === "Grau 0 - Ângulo fechado" 
                                ? "bg-gray-800 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            0
                          </button>
                        </div>
                      </div>
                      <div className="border-2 border-gray-300 rounded-lg p-3 bg-gray-50">
                        <label className="block text-xs font-medium text-gray-700 mb-2 text-center">Nasal</label>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOE: { ...prev.gonioscopiaOE, nasal: "Grau IV - Ângulo amplo (35°-45°)" }
                            }))}
                            className={`flex-1 py-1 px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOE.nasal === "Grau IV - Ângulo amplo (35°-45°)" 
                                ? "bg-green-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            IV
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOE: { ...prev.gonioscopiaOE, nasal: "Grau III - Ângulo aberto (25°-35°)" }
                            }))}
                            className={`flex-1 py-1 px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOE.nasal === "Grau III - Ângulo aberto (25°-35°)" 
                                ? "bg-blue-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            III
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOE: { ...prev.gonioscopiaOE, nasal: "Grau II - Ângulo moderadamente estreito (20°)" }
                            }))}
                            className={`flex-1 py-1 px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOE.nasal === "Grau II - Ângulo moderadamente estreito (20°)" 
                                ? "bg-yellow-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            II
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOE: { ...prev.gonioscopiaOE, nasal: "Grau I - Ângulo muito estreito (10°)" }
                            }))}
                            className={`flex-1 py-1 px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOE.nasal === "Grau I - Ângulo muito estreito (10°)" 
                                ? "bg-red-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            I
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOE: { ...prev.gonioscopiaOE, nasal: "Grau 0 - Ângulo fechado" }
                            }))}
                            className={`flex-1 py-1 px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOE.nasal === "Grau 0 - Ângulo fechado" 
                                ? "bg-gray-800 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            0
                          </button>
                        </div>
                      </div>
                      <div className="border-2 border-gray-300 rounded-lg p-3 bg-gray-50">
                        <label className="block text-xs font-medium text-gray-700 mb-2 text-center">Inferior</label>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOE: { ...prev.gonioscopiaOE, inferior: "Grau IV - Ângulo amplo (35°-45°)" }
                            }))}
                            className={`flex-1 py-1 px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOE.inferior === "Grau IV - Ângulo amplo (35°-45°)" 
                                ? "bg-green-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            IV
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOE: { ...prev.gonioscopiaOE, inferior: "Grau III - Ângulo aberto (25°-35°)" }
                            }))}
                            className={`flex-1 py-1 px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOE.inferior === "Grau III - Ângulo aberto (25°-35°)" 
                                ? "bg-blue-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            III
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOE: { ...prev.gonioscopiaOE, inferior: "Grau II - Ângulo moderadamente estreito (20°)" }
                            }))}
                            className={`flex-1 py-1 px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOE.inferior === "Grau II - Ângulo moderadamente estreito (20°)" 
                                ? "bg-yellow-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            II
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOE: { ...prev.gonioscopiaOE, inferior: "Grau I - Ângulo muito estreito (10°)" }
                            }))}
                            className={`flex-1 py-1 px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOE.inferior === "Grau I - Ângulo muito estreito (10°)" 
                                ? "bg-red-500 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            I
                          </button>
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ 
                              ...prev, 
                              gonioscopiaOE: { ...prev.gonioscopiaOE, inferior: "Grau 0 - Ângulo fechado" }
                            }))}
                            className={`flex-1 py-1 px-2 text-xs rounded font-medium ${
                              formData.gonioscopiaOE.inferior === "Grau 0 - Ângulo fechado" 
                                ? "bg-gray-800 text-white" 
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                          >
                            0
                          </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Escavação Vertical */}
        <div className="bg-white border border-gray-200 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Escavação Vertical
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Escavação Vertical OD *
              </label>
              <select
                value={formData.escavacaoVerticalOD || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, escavacaoVerticalOD: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                required
              >
                <option value="">Selecione</option>
                {opcoes.escavacao.map(escavacao => (
                  <option key={escavacao} value={escavacao}>{escavacao}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Escavação Vertical OE *
              </label>
              <select
                value={formData.escavacaoVerticalOE || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, escavacaoVerticalOE: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                required
              >
                <option value="">Selecione</option>
                {opcoes.escavacao.map(escavacao => (
                  <option key={escavacao} value={escavacao}>{escavacao}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Curva Tensional */}
        <div className="bg-white border border-gray-200 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Curva Tensional (PIO em mmHg)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Horário
              </label>
              <input
                type="text"
                value={newPIO.time}
                onChange={(e) => setNewPIO(prev => ({ ...prev, time: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                placeholder="Ex: 8:40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIO OD (mmHg)
              </label>
              <input
                type="number"
                step="0.1"
                value={newPIO.pioOD}
                onChange={(e) => setNewPIO(prev => ({ ...prev, pioOD: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                placeholder="Ex: 15"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PIO OE (mmHg)
              </label>
              <input
                type="number"
                step="0.1"
                value={newPIO.pioOE}
                onChange={(e) => setNewPIO(prev => ({ ...prev, pioOE: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
                placeholder="Ex: 15"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={addPIO}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Adicionar
              </button>
            </div>
          </div>

          {/* Gráfico da Curva Tensional */}
          {formData.curvaTensional.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Gráfico da Curva Tensional</h3>
              <div className="h-64 bg-white rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 'dataMax + 5']} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="OD" 
                      stroke="#2563eb" 
                      strokeWidth={3}
                      dot={{ fill: '#2563eb', strokeWidth: 2, r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="OE" 
                      stroke="#dc2626" 
                      strokeWidth={3}
                      dot={{ fill: '#dc2626', strokeWidth: 2, r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Limite Normal" 
                      stroke="#6b7280" 
                      strokeDasharray="5 5"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Lista de valores de PIO */}
          {formData.curvaTensional.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Valores Registrados</h3>
              <div className="bg-white rounded-lg border">
                {formData.curvaTensional.map((record, index) => (
                  <div key={index} className="flex justify-between items-center p-3 border-b last:border-b-0">
                    <span className="text-gray-700 font-medium">
                      T{index + 1} ({record.time}): OD {record.pioOD} mmHg | OE {record.pioOE} mmHg
                    </span>
                    <button
                      onClick={() => removePIO(index)}
                      className="text-red-600 hover:text-red-800 text-sm bg-red-50 px-2 py-1 rounded"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tratamento Atual */}
        <div className="bg-white border border-gray-200 p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Tratamento Atual
          </h2>
          
          {/* Contraindicações - MOVIDO PARA ANTES do uso de colírio */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraindicações (para betabloqueadores) *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-black">
                  <input
                    type="checkbox"
                    checked={formData.asma}
                    onChange={(e) => setFormData(prev => ({ ...prev, asma: e.target.checked }))}
                    className="mr-2"
                  />
                  Asma/Broncoespasmo
                </label>
              </div>
              <div>
                <label className="flex items-center text-black">
                  <input
                    type="checkbox"
                    checked={formData.bradicardia}
                    onChange={(e) => setFormData(prev => ({ ...prev, bradicardia: e.target.checked }))}
                    className="mr-2"
                  />
                  Bradicardia/Doença Cardíaca
                </label>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paciente já usa colírio? *
            </label>
            <div className="flex gap-4">
              <label className="flex items-center text-black">
                <input
                  type="radio"
                  checked={formData.usaColirio === true}
                  onChange={() => setFormData(prev => ({ ...prev, usaColirio: true }))}
                  className="mr-2"
                  required
                />
                Sim
              </label>
              <label className="flex items-center text-black">
                <input
                  type="radio"
                  checked={formData.usaColirio === false}
                  onChange={() => setFormData(prev => ({ ...prev, usaColirio: false }))}
                  className="mr-2"
                  required
                />
                Não
              </label>
            </div>
          </div>

          {formData.usaColirio && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quais colírios utiliza atualmente?
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {opcoes.colirios.map(colirio => (
                    <label key={colirio} className="flex items-center p-2 rounded-md transition-colors duration-200 hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.coliriosAtuais.includes(colirio)}
                        onChange={() => toggleColirio(colirio)}
                        className="mr-2"
                      />
                      <span className={`text-sm ${formData.coliriosAtuais.includes(colirio) ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                        {colirio}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teve efeitos adversos?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center text-black">
                    <input
                      type="radio"
                      checked={formData.efeitosAdversos === true}
                      onChange={() => setFormData(prev => ({ ...prev, efeitosAdversos: true }))}
                      className="mr-2"
                    />
                    Sim
                  </label>
                  <label className="flex items-center text-black">
                    <input
                      type="radio"
                      checked={formData.efeitosAdversos === false}
                      onChange={() => setFormData(prev => ({ ...prev, efeitosAdversos: false }))}
                      className="mr-2"
                    />
                    Não
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deseja trocar o colírio?
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center text-black">
                    <input
                      type="radio"
                      checked={formData.desejaTrocar === true}
                      onChange={() => setFormData(prev => ({ ...prev, desejaTrocar: true }))}
                      className="mr-2"
                    />
                    Sim
                  </label>
                  <label className="flex items-center text-black">
                    <input
                      type="radio"
                      checked={formData.desejaTrocar === false}
                      onChange={() => setFormData(prev => ({ ...prev, desejaTrocar: false }))}
                      className="mr-2"
                    />
                    Não
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={analisarDados}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Gerar Análise
          </button>
          
          <button
            onClick={() => setShowModalColirios(true)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors duration-200"
          >
            Classes de Colírios
          </button>
          
          <button
            onClick={() => setShowModalClassificacoes(true)}
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors duration-200"
          >
            Classificações de Glaucoma
          </button>
        </div>

        {/* Resultados da Análise */}
        {(formData.riscoTensionalOD || formData.riscoTensionalOE || formData.tipoGlaucomaProvavelOD || formData.tipoGlaucomaProvavelOE) && (
          <div className="bg-white border border-gray-200 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Resultados da Análise
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Olho Direito */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-blue-800 border-b border-blue-200 pb-2">Olho Direito (OD)</h3>
                
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Risco Tensional</h4>
                  <p className="text-gray-700">{formData.riscoTensionalOD}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Tipo de Glaucoma Provável</h4>
                  <p className="text-gray-700">{formData.tipoGlaucomaProvavelOD}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Avaliação da Escavação</h4>
                  <p className="text-gray-700">{formData.avaliacaoEscavacaoOD}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Interpretação da Gonioscopia</h4>
                  <p className="text-gray-700">{formData.interpretacaoGonioscopiaOD}</p>
                </div>
              </div>

              {/* Olho Esquerdo */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-800 border-b border-green-200 pb-2">Olho Esquerdo (OE)</h3>
                
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Risco Tensional</h4>
                  <p className="text-gray-700">{formData.riscoTensionalOE}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Tipo de Glaucoma Provável</h4>
                  <p className="text-gray-700">{formData.tipoGlaucomaProvavelOE}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Avaliação da Escavação</h4>
                  <p className="text-gray-700">{formData.avaliacaoEscavacaoOE}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Interpretação da Gonioscopia</h4>
                  <p className="text-gray-700">{formData.interpretacaoGonioscopiaOE}</p>
                </div>
              </div>
            </div>

            {/* Conduta Terapêutica (única para ambos os olhos) */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div>
                <h3 className="font-medium text-gray-800 mb-2">Conduta Terapêutica</h3>
                <p className="text-gray-700">{formData.condutaTerapeutica}</p>
              </div>

              <div className="mt-4 bg-gray-50 border border-gray-200 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">Sugestão de Medicação</h3>
                <p className="text-gray-700">{formData.sugestaoMedicacao}</p>
              </div>
            </div>
          </div>
        )}

        {/* Modal Classes de Colírios */}
        {showModalColirios && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-3xl font-light text-gray-800 mb-2">Classes de Colírios</h2>
                  <p className="text-gray-600 text-sm">Informações detalhadas sobre medicamentos para glaucoma</p>
                </div>
                <button
                  onClick={() => setShowModalColirios(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-light transition-colors duration-200"
                >
                  ×
                </button>
              </div>
              
              {/* Seletor de Classe */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Selecione a Classe de Colírio:</label>
                <select
                  value={selectedColirioClass}
                  onChange={(e) => setSelectedColirioClass(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="prostaglandinas">Prostaglandinas (Análogos da prostaglandina F2α)</option>
                  <option value="betabloqueadores">Betabloqueadores</option>
                  <option value="inibidoresAnidrase">Inibidores da Anidrase Carbônica (IAC tópicos)</option>
                  <option value="agonistasAlfa">Agonistas Alfa-2 Adrenérgicos</option>
                  <option value="coliriosCombinados">Colírios Combinados (Associação Fixa)</option>
                </select>
              </div>
              
              {/* Conteúdo Dinâmico */}
              {(() => {
                const classe = classesColirios[selectedColirioClass];
                return (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-2xl font-medium text-gray-900 mb-6 border-b border-gray-200 pb-3">
                      {classe.nome}
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Coluna Esquerda */}
                      <div className="space-y-4">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="font-semibold text-blue-900 mb-3 text-sm uppercase tracking-wide">Exemplos e Posologia</h4>
                          <ul className="space-y-2">
                            {classe.exemplos.map((exemplo, index) => (
                              <li key={index} className="text-blue-800 text-sm flex items-start">
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                {exemplo}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-green-50 rounded-lg p-4">
                          <h4 className="font-semibold text-green-900 mb-3 text-sm uppercase tracking-wide">Mecanismo de Ação</h4>
                          <p className="text-green-800 text-sm">{classe.mecanismo}</p>
                        </div>

                        <div className="bg-yellow-50 rounded-lg p-4">
                          <h4 className="font-semibold text-yellow-900 mb-3 text-sm uppercase tracking-wide">Vantagens</h4>
                          <p className="text-yellow-800 text-sm">
                            {Array.isArray(classe.vantagens) ? classe.vantagens.join(', ') : classe.vantagens}
                          </p>
                        </div>
                      </div>

                      {/* Coluna Direita */}
                      <div className="space-y-4">
                        <div className="bg-red-50 rounded-lg p-4">
                          <h4 className="font-semibold text-red-900 mb-3 text-sm uppercase tracking-wide">Efeitos Adversos</h4>
                          <ul className="space-y-2">
                            {classe.efeitosAdversos.map((efeito, index) => (
                              <li key={index} className="text-red-800 text-sm flex items-start">
                                <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                {efeito}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-orange-50 rounded-lg p-4">
                          <h4 className="font-semibold text-orange-900 mb-3 text-sm uppercase tracking-wide">Contraindicações</h4>
                          <p className="text-orange-800 text-sm">{classe.contraindicações}</p>
                        </div>

                        <div className="bg-purple-50 rounded-lg p-4">
                          <h4 className="font-semibold text-purple-900 mb-3 text-sm uppercase tracking-wide">Observações Clínicas</h4>
                          <p className="text-purple-800 text-sm">{classe.observacoes}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <button 
                        onClick={() => abrirModalTratamento(selectedColirioClass, 'alternativas')}
                        className="w-full bg-blue-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-blue-700 transition-all duration-200"
                      >
                        Ver Alternativas
                      </button>
                          </div>
    </div>
  );
})()}
            </div>
          </div>
        )}

                {/* Modal Classificações de Glaucoma */}
        {showModalClassificacoes && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-3xl font-light text-gray-800 mb-2">Classificações de Glaucoma</h2>
                  <p className="text-gray-600 text-sm">Detalhamento clínico e critérios diagnósticos</p>
                </div>
                <button
                  onClick={() => setShowModalClassificacoes(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-light transition-colors duration-200"
                >
                  ×
                </button>
              </div>
              
              {/* Seletor de Classificação */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Selecione o Tipo de Glaucoma:</label>
                <select
                  value={selectedGlaucomaType}
                  onChange={(e) => setSelectedGlaucomaType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 bg-white"
                >
                  <option value="gpaa">Glaucoma Primário de Ângulo Aberto (GPAA)</option>
                  <option value="anguloEstreito">Glaucoma de Ângulo Estreito / Fechado (GAE / GAAF)</option>
                  <option value="secundario">Glaucomas Secundários</option>
                  <option value="congenito">Glaucoma Congênito (ou Infantil Primário)</option>
                  <option value="normotensivo">Glaucoma Normotensivo (GNT)</option>
                </select>
              </div>
              
              {/* Conteúdo Dinâmico */}
              {(() => {
                const classificacao = classificacoesGlaucoma[selectedGlaucomaType];
                return (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-2xl font-medium text-gray-900 mb-2">
                          {classificacao.nome}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          {classificacao.caracteristicas[0]}
                        </p>
                      </div>

                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Coluna Esquerda */}
                      <div className="space-y-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wide">Características Clínicas</h4>
                          <ul className="space-y-2">
                            {classificacao.caracteristicas.map((caracteristica, index) => (
                              <li key={index} className="text-gray-700 text-sm flex items-start">
                                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                {caracteristica}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-red-50 rounded-lg p-4">
                          <h4 className="font-semibold text-red-900 mb-3 text-sm uppercase tracking-wide">Fatores de Risco</h4>
                          <ul className="space-y-2">
                            {classificacao.fatoresRisco.map((fator, index) => (
                              <li key={index} className="text-red-800 text-sm flex items-start">
                                <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                {fator}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="font-semibold text-blue-900 mb-3 text-sm uppercase tracking-wide">Sintomas</h4>
                          <ul className="space-y-2">
                            {classificacao.sintomas.map((sintoma, index) => (
                              <li key={index} className="text-blue-800 text-sm flex items-start">
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                {sintoma}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Coluna Direita */}
                      <div className="space-y-4">
                        <div className="bg-green-50 rounded-lg p-4">
                          <h4 className="font-semibold text-green-900 mb-3 text-sm uppercase tracking-wide">Diagnóstico</h4>
                          <ul className="space-y-2">
                            {classificacao.diagnostico.map((exame, index) => (
                              <li key={index} className="text-green-800 text-sm flex items-start">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                {exame}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-yellow-50 rounded-lg p-4">
                          <h4 className="font-semibold text-yellow-900 mb-3 text-sm uppercase tracking-wide">Tratamento</h4>
                          <ul className="space-y-2">
                            {classificacao.tratamento.map((opcao, index) => (
                              <li key={index} className="text-yellow-800 text-sm flex items-start">
                                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                {opcao}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-orange-50 rounded-lg p-4">
                          <h4 className="font-semibold text-orange-900 mb-3 text-sm uppercase tracking-wide">Critérios de Suspeição</h4>
                          <ul className="space-y-2">
                            {classificacao.criteriosSuspeicao.map((criterio, index) => (
                              <li key={index} className="text-orange-800 text-sm flex items-start">
                                <span className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                                {criterio}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex gap-4 pt-6 border-t border-gray-200">
                                                <button 
                            onClick={() => abrirModalTratamento(selectedGlaucomaType, 'protocolo')}
                            className="flex-1 bg-gray-900 text-white font-medium py-3 px-6 rounded-lg hover:bg-gray-800 transition-all duration-200"
                          >
                            Ver Protocolo Completo
                          </button>
                          <button 
                            onClick={() => abrirModalTratamento(selectedGlaucomaType, 'investigacao')}
                            className="flex-1 bg-blue-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-blue-700 transition-all duration-200"
                          >
                            Gerar Plano de Investigação
                          </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Modal de Tratamento de Glaucoma */}
        <GlaucomaTratamentoModal
          isOpen={showTratamentoModal}
          onClose={() => setShowTratamentoModal(false)}
          tipo={tratamentoModalConfig.tipo}
          modo={tratamentoModalConfig.modo}
        />
      </div>
    </div>
  );
}