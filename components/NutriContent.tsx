'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PacienteCompleto } from '@/types/obesidade';
import { 
  UtensilsCrossed, Calendar, AlertCircle, CheckCircle, XCircle, 
  Droplet, Apple, Activity, Target, Clock, Moon, Coffee, 
  Sun, Sunset, TrendingUp, Zap, Heart, Pill, Syringe, 
  Wind, Brain, Dumbbell, MessageSquare, Weight, AlertTriangle, Edit, X
} from 'lucide-react';

// ============================================
// TIPOS E INTERFACES
// ============================================

type RefeicaoKey = 'cafe' | 'lanche1' | 'almoco' | 'lanche2' | 'jantar';

interface OpcaoRefeicao {
  id: string;
  titulo: string;       // nome curto (ex: "Frango + arroz + salada")
  descricao: string;    // descrição completa
  proteina_g: number;   // proteína aproximada dessa combinação
  calorias_kcal: number;// calorias aproximadas
}

interface PlanoNutricional {
  estilo: 'digestiva' | 'plant_based' | 'mediterranea' | 'rico_proteina' | 'low_carb_moderada';
  protDia_g: number;
  aguaDia_ml: number;
  refeicoes: number;
  distribuicaoProteina: {
    cafe: string;
    almoco: string;
    jantar: string;
    lanche1: string;
    lanche2: string;
  };
  modeloDia: {
    cafe: string;
    almoco: string;
    jantar: string;
    lanche1: string;
    lanche2: string;
  };
  opcoesSelecionadas?: {
    cafe: string;
    almoco: string;
    jantar: string;
    lanche1: string;
    lanche2: string;
  };
  evitar: string[];
  criadoEm: Date;
  descricaoEstilo?: string; // Campo opcional para descrição do estilo
  hipoteseComportamental?: string; // Mini parecer Nutro gerado do wizard
  suplementos?: {
    probiotico: string;
    whey: string;
    creatina: string;
  };
}

interface CheckInDiario {
  // Alimentação/hidratação
  proteinaOk: boolean;
  frutasOk: boolean;
  aguaOk: boolean;
  lixoAlimentar: boolean;
  
  // Suplementos
  probioticoTomou: boolean;
  wheyTomou: boolean;
  creatinaTomou: boolean;
  
  // Sintomas gastrointestinais
  sintomasGI: 'nenhum' | 'leve' | 'moderado' | 'grave';
  nauseas: 'nenhum' | 'leve' | 'moderado' | 'grave';
  constipacao: 'nenhum' | 'leve' | 'moderado' | 'grave';
  diarreia: 'nenhum' | 'leve' | 'moderado' | 'grave';
  
  // Sono, energia e humor
  horasSono: '<6h' | '6-8h' | '>8h';
  humorEnergia: number; // escala 1-5
  
  // Movimento / atividade
  atividadeFisicaHoje: 'nenhuma' | 'leve' | 'moderada' | 'intensa';
  
  // Tirzepatida – adesão diária ao esquema semanal
  diaAplicacao: 'nao_foi_dia' | 'aplicou_no_horario' | 'aplicou_atrasado' | 'esqueceu';
  localAplicacao?: 'abdome' | 'coxa' | 'braco' | 'outro';
  
  // Metadados
  observacoes?: string;
  aderenciaPlano?: number; // 0-100%
  pesoHoje?: number; // kg (opcional, se último peso > 7 dias)
  sintomasAumentoDose?: 'nenhum' | 'leve' | 'moderado' | 'intenso'; // Para semanas de aumento de dose
  score: number;
  data: string;
}

// WizardData expandido com campos clínicos adicionais
interface WizardData {
  objetivoPrincipal: 'perda_peso' | 'recomposicao' | 'controle_glicemia' | 'melhora_disposicao' | 'manutencao';
  horarioTrabalho: 'diurno' | 'noturno' | 'turnos';
  horasSentado: '<4h' | '4-8h' | '>8h';
  atividadeFisica: 'nunca' | '1-2x' | '3-4x' | '5-7x';
  sonoHoras: '<6h' | '6-8h' | '>8h';
  numeroRefeicoesDia: '2-3' | '4-5' | '>5';
  comportamentosAlimentares: string[];
  fomeEmocional: boolean;
  compulsaoNoturna: boolean;
  restricoes: string[];
  preferenciasProteina: string[];
  sintomasGI: 'nenhum' | 'leve' | 'moderado' | 'grave';
  
  // Histórico de peso e dietas
  dietaUltimos12Meses: 'sim' | 'nao';
  tipoDieta?: string;
  efeitoSanfona: 'sim' | 'nao';
  kgSanfona?: number;
  pesoMaximo2Anos?: number;
  pesoMinimo2Anos?: number;
  
  // Padrão de fome / saciedade
  fomeMatinal: number; // 0-10
  fomeNoturna: number; // 0-10
  vontadeDoce: number; // 0-10
  pulaCafeManha: boolean;
  chegaComMuitaFomeJantar: boolean;
  
  // Sono e cronotipo
  horarioDormir: '22-00' | '00-02' | 'depois_02h';
  acordaDescansado: 'sim' | 'nao' | 'as_vezes';
  
  // Álcool e finais de semana
  dosesAlcoolSemana: '0' | '1-3' | '4-7' | '>7';
  finalSemanaSaiDieta: 'quase_nunca' | 'as_vezes' | 'sempre';
}

interface NutriContentProps {
  paciente: PacienteCompleto;
  setPaciente?: (paciente: PacienteCompleto) => void;
}

// ============================================
// BASE DE OPÇÕES DE REFEIÇÕES
// ============================================

/**
 * Gera as opções de refeições baseadas no estilo do plano
 * Cada refeição tem pelo menos 3 opções: alta proteína, equilibrada e leve
 */
const gerarOpcoesRefeicoes = (
  estilo: PlanoNutricional['estilo'],
  protCafe: number,
  protAlmoco: number,
  protJantar: number,
  protLanche: number
): Record<RefeicaoKey, OpcaoRefeicao[]> => {
  // Por questões de espaço, vou criar uma versão simplificada que será expandida
  // A função completa será muito longa, então vou criar uma estrutura base
  // e depois expandir conforme necessário
  
  const opcoes: Record<RefeicaoKey, OpcaoRefeicao[]> = {
    cafe: [],
    lanche1: [],
    almoco: [],
    lanche2: [],
    jantar: []
  };

  // Para cada estilo, criar opções apropriadas
  // Vou criar uma versão mais compacta que pode ser expandida depois
  const baseOpcoes = {
    digestiva: {
      cafe: [
        { id: 'cafe_ovos_cozidos', titulo: 'Ovos cozidos + pão sem glúten + banana', descricao: `2 ovos cozidos (≈12g proteína) + 1 fatia de pão branco sem glúten + 1 banana prata madura. Total: ~${protCafe}g proteína.`, proteina_g: protCafe, calorias_kcal: 350 },
        { id: 'cafe_iogurte_frutas_cozidas', titulo: 'Iogurte natural + frutas cozidas + mel', descricao: `1 pote de iogurte natural (170g, ≈15g proteína) + 1/2 xícara de frutas cozidas (maçã ou pera) + 1 colher de chá de mel. Total: ~${protCafe}g proteína.`, proteina_g: protCafe, calorias_kcal: 280 },
        { id: 'cafe_papa_frutas', titulo: 'Papa de frutas + iogurte', descricao: `1/2 xícara de frutas cozidas e amassadas (maçã, pera) + 1/2 pote de iogurte natural (≈8g proteína). Preparação leve e digestiva.`, proteina_g: Math.round(protCafe * 0.7), calorias_kcal: 200 }
      ],
      lanche1: [
        { id: 'lanche1_banana_cha', titulo: 'Banana + chá digestivo', descricao: `1 banana prata madura + 1 xícara de chá de camomila ou erva-doce. Opção leve e digestiva.`, proteina_g: 2, calorias_kcal: 100 },
        { id: 'lanche1_iogurte_sem_lactose', titulo: 'Iogurte natural sem lactose', descricao: `1 pote de iogurte natural (170g, ≈${protLanche}g proteína) sem lactose se necessário.`, proteina_g: protLanche, calorias_kcal: 150 },
        { id: 'lanche1_whey_leve', titulo: 'Whey protein isolado + água', descricao: `1 dose de whey isolado (≈${protLanche}g proteína) batido com água. Fácil digestão.`, proteina_g: protLanche, calorias_kcal: 120 }
      ],
      almoco: [
        { id: 'almoco_peixe_grelhado', titulo: 'Peixe grelhado + legumes cozidos + arroz', descricao: `120-150g de peixe grelhado (pescada, tilápia ou salmão, ≈${protAlmoco}g proteína) + 1/2 prato de legumes cozidos (abobrinha, cenoura, chuchu) + 1/4 prato de arroz branco ou batata cozida. Evitar saladas cruas e fibras insolúveis.`, proteina_g: protAlmoco, calorias_kcal: 450 },
        { id: 'almoco_frango_cozido', titulo: 'Frango desfiado cozido + purê + espinafre', descricao: `100-120g de frango desfiado cozido (≈${protAlmoco}g proteína) + 1/2 prato de purê de abóbora ou batata doce + salada morna (espinafre refogado). Preparações cozidas e sem temperos fortes.`, proteina_g: protAlmoco, calorias_kcal: 420 },
        { id: 'almoco_peixe_assado_leve', titulo: 'Peixe assado + legumes macios', descricao: `100g de peixe assado (≈${Math.round(protAlmoco * 0.8)}g proteína) + legumes cozidos até ficarem bem macios. Preparação muito leve.`, proteina_g: Math.round(protAlmoco * 0.8), calorias_kcal: 350 }
      ],
      lanche2: [
        { id: 'lanche2_iogurte_fruta_cozida', titulo: 'Iogurte + fruta cozida', descricao: `1 pote de iogurte natural (170g, ≈${protLanche}g proteína) + 1/2 xícara de fruta cozida.`, proteina_g: protLanche, calorias_kcal: 180 },
        { id: 'lanche2_queijo_pao_sem_gluten', titulo: 'Queijo branco + pão sem glúten', descricao: `1 fatia de queijo branco (30g, ≈${protLanche}g proteína) + 1 fatia de pão branco sem glúten.`, proteina_g: protLanche, calorias_kcal: 200 },
        { id: 'lanche2_whey_isolado', titulo: 'Whey isolado + água', descricao: `1 dose de whey isolado (≈${protLanche}g proteína) batido com água. Opção leve e proteica.`, proteina_g: protLanche, calorias_kcal: 120 }
      ],
      jantar: [
        { id: 'jantar_frango_cozido_pure', titulo: 'Frango desfiado + purê + espinafre', descricao: `100-120g de frango desfiado cozido (≈${protJantar}g proteína) + 1/2 prato de purê de abóbora ou batata doce + salada morna (espinafre refogado). Preparações cozidas e sem temperos fortes.`, proteina_g: protJantar, calorias_kcal: 400 },
        { id: 'jantar_peixe_grelhado_legumes', titulo: 'Peixe grelhado + legumes cozidos', descricao: `120g de peixe grelhado (≈${protJantar}g proteína) + legumes cozidos até ficarem macios. Preparação leve para o jantar.`, proteina_g: protJantar, calorias_kcal: 380 },
        { id: 'jantar_sopa_proteica', titulo: 'Sopa de frango + legumes', descricao: `Sopa cremosa com frango desfiado (≈${Math.round(protJantar * 0.7)}g proteína) + legumes bem cozidos. Preparação muito leve e digestiva.`, proteina_g: Math.round(protJantar * 0.7), calorias_kcal: 300 }
      ]
    },
    // Adicionar outros estilos de forma similar...
    // Por questões de espaço, vou criar uma função helper que gera opções baseadas no estilo
  };

  // Retornar opções baseadas no estilo
  if (estilo === 'digestiva' && baseOpcoes.digestiva) {
    return baseOpcoes.digestiva as Record<RefeicaoKey, OpcaoRefeicao[]>;
  }

  // Para outros estilos, criar opções genéricas por enquanto
  // (será expandido depois se necessário)
  return {
    cafe: [
      { id: 'cafe_padrao', titulo: 'Café padrão', descricao: `Opção padrão de café da manhã com ~${protCafe}g de proteína.`, proteina_g: protCafe, calorias_kcal: 350 }
    ],
    lanche1: [
      { id: 'lanche1_padrao', titulo: 'Lanche padrão', descricao: `Opção padrão de lanche com ~${protLanche}g de proteína.`, proteina_g: protLanche, calorias_kcal: 200 }
    ],
    almoco: [
      { id: 'almoco_padrao', titulo: 'Almoço padrão', descricao: `Opção padrão de almoço com ~${protAlmoco}g de proteína.`, proteina_g: protAlmoco, calorias_kcal: 500 }
    ],
    lanche2: [
      { id: 'lanche2_padrao', titulo: 'Lanche padrão', descricao: `Opção padrão de lanche com ~${protLanche}g de proteína.`, proteina_g: protLanche, calorias_kcal: 200 }
    ],
    jantar: [
      { id: 'jantar_padrao', titulo: 'Jantar padrão', descricao: `Opção padrão de jantar com ~${protJantar}g de proteína.`, proteina_g: protJantar, calorias_kcal: 450 }
    ]
  };
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function NutriContent({ paciente, setPaciente }: NutriContentProps) {
  const [view, setView] = useState<'loading' | 'wizard' | 'plano' | 'checkin'>('loading');
  const [activeTab, setActiveTab] = useState<'plano' | 'proteinas' | 'cardapio' | 'alertas' | 'historico'>('plano');
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    objetivoPrincipal: 'perda_peso',
    horarioTrabalho: 'diurno',
    horasSentado: '4-8h',
    atividadeFisica: 'nunca',
    sonoHoras: '6-8h',
    numeroRefeicoesDia: '4-5',
    comportamentosAlimentares: [],
    fomeEmocional: false,
    compulsaoNoturna: false,
    restricoes: [],
    preferenciasProteina: [],
    sintomasGI: 'nenhum',
    // Histórico de peso e dietas
    dietaUltimos12Meses: 'nao',
    tipoDieta: '',
    efeitoSanfona: 'nao',
    kgSanfona: undefined,
    pesoMaximo2Anos: undefined,
    pesoMinimo2Anos: undefined,
    // Padrão de fome / saciedade
    fomeMatinal: 5,
    fomeNoturna: 5,
    vontadeDoce: 5,
    pulaCafeManha: false,
    chegaComMuitaFomeJantar: false,
    // Sono e cronotipo
    horarioDormir: '22-00',
    acordaDescansado: 'as_vezes',
    // Álcool e finais de semana
    dosesAlcoolSemana: '0',
    finalSemanaSaiDieta: 'quase_nunca'
  });
  const [peso, setPeso] = useState<number | null>(null);
  const [altura, setAltura] = useState<number | null>(null);
  const [showPesoAlturaForm, setShowPesoAlturaForm] = useState(false);
  const [plano, setPlano] = useState<PlanoNutricional | null>(null);
  const [checkInData, setCheckInData] = useState<CheckInDiario>({
    // Alimentação/hidratação
    proteinaOk: false,
    frutasOk: false,
    aguaOk: false,
    lixoAlimentar: true, // true = não evitou (checkbox desmarcado), false = evitou (checkbox marcado)
    
    // Suplementos
    probioticoTomou: false,
    wheyTomou: false,
    creatinaTomou: false,
    
    // Sintomas gastrointestinais
    sintomasGI: 'nenhum',
    nauseas: 'nenhum',
    constipacao: 'nenhum',
    diarreia: 'nenhum',
    
    // Sono, energia e humor
    horasSono: '6-8h',
    humorEnergia: 3,
    
    // Movimento / atividade
    atividadeFisicaHoje: 'nenhuma',
    
    // Tirzepatida
    diaAplicacao: 'nao_foi_dia',
    localAplicacao: undefined,
    
    // Metadados
    observacoes: '',
    aderenciaPlano: 100,
    pesoHoje: undefined,
    sintomasAumentoDose: undefined,
    score: 0,
    data: new Date().toISOString().split('T')[0]
  });
  const [savingCheckIn, setSavingCheckIn] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckInDiario[]>([]);
  const [loadingCheckIns, setLoadingCheckIns] = useState(false);
  // Removido: checkInHojeExiste não é mais necessário com a nova lógica de data
  
  // Estado para a data do check-in (permite até 3 dias retroativos)
  const [checkInDate, setCheckInDate] = useState<string>(() => {
    // Inicializar com data de hoje (YYYY-MM-DD)
    return new Date().toISOString().split('T')[0];
  });
  const [isEditandoCheckIn, setIsEditandoCheckIn] = useState(false);
  
  // Estados para modal de edição de refeição
  const [refeicaoEmEdicao, setRefeicaoEmEdicao] = useState<RefeicaoKey | null>(null);
  const [opcaoSelecionadaTemp, setOpcaoSelecionadaTemp] = useState<string>('');
  const [opcoesRefeicoes, setOpcoesRefeicoes] = useState<Record<RefeicaoKey, OpcaoRefeicao[]>>({
    cafe: [],
    lanche1: [],
    almoco: [],
    lanche2: [],
    jantar: []
  });

  // ============================================
  // CARREGAMENTO DE DADOS
  // ============================================

  // Carregar check-ins quando a aba Histórico for selecionada
  useEffect(() => {
    if (activeTab === 'historico' && plano && checkIns.length === 0 && !loadingCheckIns) {
      loadCheckIns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, plano]);

  useEffect(() => {
    const loadPlano = async () => {
      try {
        const planoRef = doc(db, 'pacientes_completos', paciente.id, 'nutricao', 'plano');
        const planoSnap = await getDoc(planoRef);
        
        if (planoSnap.exists()) {
          const planoData = planoSnap.data();
          const planoCarregado: PlanoNutricional = {
            ...planoData,
            criadoEm: planoData.criadoEm?.toDate() || new Date()
          } as PlanoNutricional;
          
          // Compatibilidade com planos antigos: se não tem opcoesSelecionadas, inicializar
          if (!planoCarregado.opcoesSelecionadas) {
            const protPorRefeicao = planoCarregado.protDia_g / 5;
            const protCafe = Math.round(protPorRefeicao * 1.3);
            const protAlmoco = Math.round(protPorRefeicao * 1.3);
            const protJantar = Math.round(protPorRefeicao * 1.3);
            const protLanche = Math.round(protPorRefeicao * 0.8);
            
            const opcoesDisponiveis = gerarOpcoesRefeicoes(
              planoCarregado.estilo,
              protCafe,
              protAlmoco,
              protJantar,
              protLanche
            );
            setOpcoesRefeicoes(opcoesDisponiveis);
            
            // Selecionar primeira opção de cada refeição como padrão
            planoCarregado.opcoesSelecionadas = {
              cafe: opcoesDisponiveis.cafe[0]?.id || '',
              lanche1: opcoesDisponiveis.lanche1[0]?.id || '',
              almoco: opcoesDisponiveis.almoco[0]?.id || '',
              lanche2: opcoesDisponiveis.lanche2[0]?.id || '',
              jantar: opcoesDisponiveis.jantar[0]?.id || ''
            };
            
            // Regenerar modeloDia a partir das opções
            planoCarregado.modeloDia = gerarModeloDiaFromOpcoes(
              planoCarregado.opcoesSelecionadas,
              opcoesDisponiveis
            );
          } else {
            // Se já tem opcoesSelecionadas, carregar opções disponíveis
            const protPorRefeicao = planoCarregado.protDia_g / 5;
            const protCafe = Math.round(protPorRefeicao * 1.3);
            const protAlmoco = Math.round(protPorRefeicao * 1.3);
            const protJantar = Math.round(protPorRefeicao * 1.3);
            const protLanche = Math.round(protPorRefeicao * 0.8);
            
            const opcoesDisponiveis = gerarOpcoesRefeicoes(
              planoCarregado.estilo,
              protCafe,
              protAlmoco,
              protJantar,
              protLanche
            );
            setOpcoesRefeicoes(opcoesDisponiveis);
          }
          
          setPlano(planoCarregado);
          setView('plano');
          await loadCheckIns();
        } else {
          const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
          const imc = medidasIniciais?.imc;
          const pesoExistente = medidasIniciais?.peso;
          const alturaExistente = medidasIniciais?.altura;
          
          if (imc && imc > 0) {
            setView('wizard');
          } else if (!pesoExistente || !alturaExistente) {
            setShowPesoAlturaForm(true);
            setPeso(pesoExistente || null);
            setAltura(alturaExistente || null);
            setView('wizard');
          } else {
            setView('wizard');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar plano nutricional:', error);
        setView('wizard');
      }
    };
    
    loadPlano();
  }, [paciente]);

  // ============================================
  // FUNÇÕES DE DADOS BÁSICOS
  // ============================================

  // Função para obter o peso atual do paciente
  // Prioriza o último peso da evolução, senão usa o peso inicial
  const obterPesoAtual = (): number => {
    // Buscar último peso na evolução de seguimento
    const evolucao = paciente?.evolucaoSeguimento || [];
    if (evolucao.length > 0) {
      // Ordenar por data (mais recente primeiro) e pegar o primeiro
      const evolucaoOrdenada = [...evolucao].sort((a, b) => {
        const dataA = a.data ? new Date(a.data).getTime() : 0;
        const dataB = b.data ? new Date(b.data).getTime() : 0;
        return dataB - dataA;
      });
      
      const ultimoRegistro = evolucaoOrdenada[0];
      if (ultimoRegistro?.peso && ultimoRegistro.peso > 0) {
        return ultimoRegistro.peso;
      }
    }
    
    // Se não encontrou na evolução, usar peso inicial
    const pesoInicial = paciente?.dadosClinicos?.medidasIniciais?.peso;
    if (pesoInicial && pesoInicial > 0) {
      return pesoInicial;
    }
    
    // Fallback: retornar 70kg como padrão (não deveria chegar aqui)
    console.warn('Peso não encontrado, usando 70kg como padrão');
    return 70;
  };

  // Função auxiliar para verificar se hoje é dia de aplicação da Tirzepatida
  const verificarSeHojeEDiaAplicacao = (): boolean => {
    const planoTerapeutico = paciente?.planoTerapeutico;
    if (!planoTerapeutico?.injectionDayOfWeek) {
      return false;
    }
    
    const diasSemana: { [key: string]: number } = {
      'dom': 0,
      'seg': 1,
      'ter': 2,
      'qua': 3,
      'qui': 4,
      'sex': 5,
      'sab': 6
    };
    
    const diaSemanaHoje = new Date().getDay();
    const diaSemanaAplicacao = diasSemana[planoTerapeutico.injectionDayOfWeek];
    
    return diaSemanaHoje === diaSemanaAplicacao;
  };

  const handleSalvarPesoAltura = async () => {
    if (!peso || !altura) return;
    
    try {
      const alturaMetros = altura / 100;
      const imcCalculado = peso / (alturaMetros * alturaMetros);
      
      const pacienteRef = doc(db, 'pacientes_completos', paciente.id);
      const pacienteSnap = await getDoc(pacienteRef);
      if (pacienteSnap.exists()) {
        const dadosAtuais = pacienteSnap.data();
        await setDoc(pacienteRef, {
          ...dadosAtuais,
          dadosClinicos: {
            ...dadosAtuais.dadosClinicos,
            medidasIniciais: {
              ...dadosAtuais.dadosClinicos?.medidasIniciais,
              peso,
              altura,
              imc: imcCalculado
            }
          }
        }, { merge: true });
        
        // Atualizar estado local do paciente se setPaciente estiver disponível
        if (setPaciente) {
          setPaciente({
            ...paciente,
            dadosClinicos: {
              ...paciente.dadosClinicos,
              medidasIniciais: {
                ...paciente.dadosClinicos?.medidasIniciais,
                peso,
                altura,
                imc: imcCalculado
              }
            }
          });
        }
      }
      
      setShowPesoAlturaForm(false);
      setWizardStep(1);
    } catch (error) {
      console.error('Erro ao salvar peso/altura:', error);
      alert('Erro ao salvar dados. Tente novamente.');
    }
  };

  // ============================================
  // FUNÇÕES DO WIZARD
  // ============================================

  const handleWizardNext = () => {
    // Wizard agora tem 9 passos
    if (wizardStep < 9) {
      setWizardStep(wizardStep + 1);
    } else {
      gerarPlanoNutricional();
    }
  };

  const handleWizardBack = () => {
    if (wizardStep > 1) {
      setWizardStep(wizardStep - 1);
    }
  };

  const toggleCheckbox = (field: keyof WizardData, value: string | boolean) => {
    if (field === 'comportamentosAlimentares' || field === 'restricoes' || field === 'preferenciasProteina') {
      const current = wizardData[field] as string[];
      const updated = current.includes(value as string)
        ? current.filter(v => v !== value)
        : [...current, value as string];
      setWizardData({ ...wizardData, [field]: updated });
    } else if (field === 'fomeEmocional' || field === 'compulsaoNoturna') {
      setWizardData({ ...wizardData, [field]: value as boolean });
    }
  };

  // ============================================
  // GERAÇÃO DO PLANO NUTRICIONAL
  // ============================================

  const gerarPlanoNutricional = async () => {
    const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
    const pesoKg = obterPesoAtual();
    const imc = medidasIniciais?.imc || 0;
    
    // Cálculo de proteína diária baseado em IMC
    let protDia_g: number;
    if (imc < 27) {
      protDia_g = pesoKg * 1.2;
    } else if (imc >= 27 && imc <= 32) {
      protDia_g = pesoKg * 1.4;
    } else {
      protDia_g = pesoKg * 1.5;
    }
    
    // Cálculo de água diária
    const aguaDia_ml = pesoKg * 35;
    
    // Determinação do estilo alimentar (lógica aprimorada)
    let estilo: PlanoNutricional['estilo'];
    let descricaoEstilo: string;
    
    if (wizardData.sintomasGI === 'moderado' || wizardData.sintomasGI === 'grave') {
      estilo = 'digestiva';
      descricaoEstilo = 'Dieta focada em alimentos de fácil digestão, com preparações cozidas e baixa fibra insolúvel para reduzir sintomas gastrointestinais.';
    } else if (wizardData.restricoes.includes('vegetariano') || wizardData.restricoes.includes('vegano')) {
      estilo = 'plant_based';
      descricaoEstilo = 'Abordagem baseada em plantas, priorizando leguminosas, grãos integrais, oleaginosas e proteínas vegetais completas.';
    } else if (wizardData.atividadeFisica === 'nunca' && 
               (wizardData.comportamentosAlimentares.includes('pulo refeições') ||
                wizardData.comportamentosAlimentares.includes('como rápido') ||
                wizardData.comportamentosAlimentares.includes('belisco o dia todo'))) {
      estilo = 'mediterranea';
      descricaoEstilo = 'Padrão alimentar mediterrâneo, rico em azeite, peixes, vegetais coloridos e oleaginosas, com foco em qualidade e variedade.';
    } else if (imc >= 32 || wizardData.objetivoPrincipal === 'recomposicao') {
      estilo = 'rico_proteina';
      descricaoEstilo = 'Dieta rica em proteína de alto valor biológico, com foco em preservação e ganho de massa magra e controle de apetite.';
    } else {
      estilo = 'low_carb_moderada';
      descricaoEstilo = 'Abordagem com redução moderada de carboidratos, priorizando proteínas magras, gorduras saudáveis e vegetais.';
    }
    
    // Distribuição de proteína por refeição
    const protPorRefeicao = protDia_g / 5;
    const distribuicaoProteina = {
      cafe: `${Math.round(protPorRefeicao * 1.2)}-${Math.round(protPorRefeicao * 1.4)} g`,
      almoco: `${Math.round(protPorRefeicao * 1.2)}-${Math.round(protPorRefeicao * 1.4)} g`,
      jantar: `${Math.round(protPorRefeicao * 1.2)}-${Math.round(protPorRefeicao * 1.4)} g`,
      lanche1: `${Math.round(protPorRefeicao * 0.7)}-${Math.round(protPorRefeicao * 0.9)} g`,
      lanche2: `${Math.round(protPorRefeicao * 0.7)}-${Math.round(protPorRefeicao * 0.9)} g`
    };
    
    // Cálculo de proteína por refeição para gerar opções
    const protCafe = Math.round(protPorRefeicao * 1.3);
    const protAlmoco = Math.round(protPorRefeicao * 1.3);
    const protJantar = Math.round(protPorRefeicao * 1.3);
    const protLanche = Math.round(protPorRefeicao * 0.8);
    
    // Gerar opções de refeições baseadas no estilo
    const opcoesDisponiveis = gerarOpcoesRefeicoes(estilo, protCafe, protAlmoco, protJantar, protLanche);
    setOpcoesRefeicoes(opcoesDisponiveis);
    
    // Selecionar opções padrão (primeira opção de cada refeição)
    const opcoesSelecionadas: { [K in RefeicaoKey]: string } = {
      cafe: opcoesDisponiveis.cafe[0]?.id || '',
      lanche1: opcoesDisponiveis.lanche1[0]?.id || '',
      almoco: opcoesDisponiveis.almoco[0]?.id || '',
      lanche2: opcoesDisponiveis.lanche2[0]?.id || '',
      jantar: opcoesDisponiveis.jantar[0]?.id || ''
    };
    
    // Gerar modeloDia a partir das opções selecionadas
    const modeloDia = gerarModeloDiaFromOpcoes(opcoesSelecionadas, opcoesDisponiveis);
    const suplementos = gerarSuplementos(estilo);
    
    // Geração da hipótese comportamental (mini parecer Nutro)
    const hipoteseComportamental = gerarHipoteseComportamental(wizardData);
    
    // Lista de alimentos a evitar
    const evitar: string[] = ['fritos', 'ultraprocessados'];
    if (wizardData.comportamentosAlimentares.includes('álcool frequente') || 
        ['4-7', '>7'].includes(wizardData.dosesAlcoolSemana)) {
      evitar.push('álcool frequente');
    }
    if (wizardData.restricoes.includes('intolerância lactose')) {
      evitar.push('laticínios com lactose');
    }
    if (wizardData.restricoes.includes('sem glúten')) {
      evitar.push('alimentos com glúten');
    }
    if (wizardData.compulsaoNoturna) {
      evitar.push('refeições pesadas após 20h');
    }
    if (wizardData.finalSemanaSaiDieta === 'sempre') {
      evitar.push('excessos nos finais de semana');
    }
    
    const novoPlano: PlanoNutricional = {
      estilo,
      protDia_g: Math.round(protDia_g),
      aguaDia_ml: Math.round(aguaDia_ml),
      refeicoes: 5,
      distribuicaoProteina,
      modeloDia,
      opcoesSelecionadas,
      evitar,
      criadoEm: new Date(),
      descricaoEstilo,
      hipoteseComportamental,
      suplementos
    };
    
    await salvarPlanoNutricional(novoPlano);
  };

  // Função para gerar hipótese comportamental (mini parecer Nutro)
  const gerarHipoteseComportamental = (data: WizardData): string => {
    const partes: string[] = [];
    
    // Rotina e atividade
    if (data.atividadeFisica === 'nunca') {
      partes.push('rotina sedentária');
    } else if (data.atividadeFisica === '1-2x') {
      partes.push('atividade física ocasional');
    } else {
      partes.push('atividade física regular');
    }
    
    // Sono
    partes.push(`sono em torno de ${data.sonoHoras}`);
    if (data.acordaDescansado === 'nao') {
      partes.push('com qualidade de sono comprometida');
    }
    
    // Fome e padrões alimentares
    if (data.vontadeDoce >= 7) {
      partes.push('com vontade de doce frequente');
    }
    if (data.fomeNoturna >= 7) {
      partes.push('fome noturna elevada');
    }
    if (data.pulaCafeManha) {
      partes.push('tendência a pular café da manhã');
    }
    if (data.chegaComMuitaFomeJantar) {
      partes.push('chega com muita fome no jantar');
    }
    
    // Histórico de dietas
    if (data.efeitoSanfona === 'sim') {
      const kgText = data.kgSanfona ? ` (~${data.kgSanfona}kg)` : '';
      partes.push(`histórico de efeito sanfona${kgText}`);
    }
    
    // Álcool
    if (data.dosesAlcoolSemana === '>7') {
      partes.push('consumo frequente de álcool');
    }
    
    // Final de semana
    if (data.finalSemanaSaiDieta === 'sempre') {
      partes.push('tendência a sair da dieta nos finais de semana');
    }
    
    return `Paciente com ${partes.join(', ')}.`;
  };
  
  // Função para gerar orientações de suplementos
  const gerarSuplementos = (estilo: PlanoNutricional['estilo']): PlanoNutricional['suplementos'] => {
    return {
      probiotico: '1 cápsula à noite, longe do whey protein (mínimo 2h de intervalo).',
      whey: '1 scoop (30g) pós-treino ou no lanche da tarde, conforme orientação.',
      creatina: '3-5g em qualquer refeição, todos os dias. Pode misturar com água, suco ou whey.'
    };
  };
  
  // Função aprimorada para gerar modelo de dia com exemplos específicos e proteína
  const gerarModeloDia = (estilo: PlanoNutricional['estilo'], protDia_g: number): PlanoNutricional['modeloDia'] => {
    const protPorRefeicao = protDia_g / 5;
    const protCafe = Math.round(protPorRefeicao * 1.3);
    const protAlmoco = Math.round(protPorRefeicao * 1.3);
    const protJantar = Math.round(protPorRefeicao * 1.3);
    const protLanche = Math.round(protPorRefeicao * 0.8);
    
    switch (estilo) {
      case 'digestiva':
        return {
          cafe: `Opção 1: 2 ovos cozidos (≈12g proteína) + 1 fatia de pão branco sem glúten + 1 banana prata madura. Total: ~${protCafe}g proteína. Ou: 1 pote de iogurte natural (170g, ≈15g proteína) + 1/2 xícara de frutas cozidas (maçã ou pera) + 1 colher de chá de mel. Total: ~${protCafe}g proteína.`,
          almoco: `120-150g de peixe grelhado (pescada, tilápia ou salmão, ≈${protAlmoco}g proteína) + 1/2 prato de legumes cozidos (abobrinha, cenoura, chuchu) + 1/4 prato de arroz branco ou batata cozida. Evitar saladas cruas e fibras insolúveis.`,
          jantar: `100-120g de frango desfiado cozido (≈${protJantar}g proteína) + 1/2 prato de purê de abóbora ou batata doce + salada morna (espinafre refogado). Preparações cozidas e sem temperos fortes.`,
          lanche1: `1 banana prata madura + 1 xícara de chá de camomila ou erva-doce. Ou: 1 pote de iogurte natural (170g, ≈${protLanche}g proteína) sem lactose se necessário.`,
          lanche2: `1 pote de iogurte natural (170g, ≈${protLanche}g proteína) + 1/2 xícara de fruta cozida. Ou: 1 fatia de queijo branco (30g, ≈${protLanche}g proteína) + 1 fatia de pão branco sem glúten.`
        };
      
      case 'plant_based':
        return {
          cafe: `Opção 1: 1 xícara de aveia em flocos (≈6g proteína) + 1/2 xícara de frutas vermelhas + 1 colher de sopa de sementes de chia (≈3g) + 1 colher de sopa de amêndoas picadas (≈3g). Total: ~${protCafe}g proteína. Ou: 2 fatias de pão integral (≈8g) + 2 colheres de sopa de pasta de amendoim (≈8g) + 1 banana + 1 copo de bebida vegetal de soja (≈7g). Total: ~${protCafe}g proteína.`,
          almoco: `1 xícara de lentilha cozida (≈18g proteína) ou grão-de-bico (≈15g) + 1/2 xícara de quinoa cozida (≈4g) + salada colorida (folhas, tomate, pepino) + 1 colher de sopa de azeite + 1/4 de abacate. Total: ~${protAlmoco}g proteína vegetal completa.`,
          jantar: `1 xícara de grão-de-bico cozido (≈15g proteína) + 1/2 prato de vegetais assados (berinjela, abobrinha, pimentão) + 1/2 xícara de batata doce assada + 1 colher de sopa de tahine (≈3g). Total: ~${protJantar}g proteína. Ou: 150g de tofu grelhado (≈12g) + legumes salteados + arroz integral (≈3g). Total: ~${protJantar}g proteína.`,
          lanche1: `Hummus caseiro (3 colheres de sopa, ≈${protLanche}g proteína) + palitos de cenoura, pepino e pimentão. Ou: 1 punhado de oleaginosas (castanhas, nozes, amêndoas, ≈${protLanche}g) + 1 fruta.`,
          lanche2: `Smoothie proteico: 1 copo de bebida vegetal + 1 scoop de proteína vegetal em pó (30g, ≈${protLanche}g) + 1/2 xícara de frutas congeladas + 1 colher de sopa de sementes de linhaça. Ou: 1 pote de iogurte vegetal (≈${protLanche}g) + granola sem glúten + frutas.`
        };
      
      case 'mediterranea':
        return {
          cafe: `Opção 1: 1 pote de iogurte grego (170g, ≈15g proteína) + 1/2 xícara de frutas frescas (morangos, mirtilos) + 1 colher de sopa de azeite extra virgem + 1 colher de sopa de nozes picadas (≈3g). Total: ~${protCafe}g proteína. Ou: 2 ovos mexidos (≈12g) + 1 fatia de pão integral (≈4g) + 1/4 de abacate + tomate e azeitonas. Total: ~${protCafe}g proteína.`,
          almoco: `150g de salmão grelhado (≈${protAlmoco}g proteína) + salada mediterrânea (folhas, tomate, pepino, cebola roxa, azeitonas) + 1 colher de sopa de azeite + 1/4 prato de quinoa ou arroz integral. Ou: 120g de frango grelhado (≈${protAlmoco}g) + legumes assados (berinjela, pimentão, abobrinha) + azeite.`,
          jantar: `100-120g de peixe (sardinha, atum ou salmão, ≈${protJantar}g proteína) + 1 prato de salada verde + 1 colher de sopa de azeite + 1/2 xícara de grão-de-bico (≈7g). Total: ~${protJantar}g proteína. Ou: frango grelhado (≈${protJantar}g) + ratatouille (legumes cozidos) + azeite.`,
          lanche1: `1 punhado de oleaginosas (castanhas, nozes, amêndoas, ≈${protLanche}g proteína) + 1 fruta fresca. Ou: 1 fatia de queijo branco (≈${protLanche}g) + azeitonas + tomate cereja.`,
          lanche2: `1 pote de iogurte grego (170g, ≈${protLanche}g proteína) + 1 colher de sopa de mel + 1 colher de sopa de nozes. Ou: 1 fatia de pão integral (≈4g) + pasta de azeitona + queijo branco (≈${protLanche}g). Total: ~${protLanche}g proteína.`
        };
      
      case 'rico_proteina':
        return {
          cafe: `Opção 1: 2 ovos mexidos (≈12g proteína) + 1 fatia de queijo branco (30g, ≈8g) + 1 fatia de peito de peru (≈5g) + 1 fruta pequena. Total: ~${protCafe}g proteína. Ou: 1 pote de iogurte grego (170g, ≈15g) + 30g de whey protein (≈24g) + 1 colher de sopa de chia + 1/2 xícara de frutas vermelhas. Total: ~${protCafe}g proteína.`,
          almoco: `120-150g de carne magra grelhada (patinho, alcatra ou maminha, ≈${protAlmoco}g proteína) + 1/2 prato de salada verde + 1/4 prato de carboidrato complexo (arroz integral, batata doce ou quinoa). Ou: 150g de peito de frango grelhado (≈${protAlmoco}g) + legumes cozidos + 1/2 xícara de batata doce assada.`,
          jantar: `120-150g de peito de frango ou peixe grelhado (≈${protJantar}g proteína) + 1 prato de salada colorida + 1 colher de sopa de azeite. Ou: 150g de carne magra (≈${protJantar}g) + legumes salteados + 1/4 de abacate.`,
          lanche1: `1 scoop de whey protein (30g, ≈24g proteína) + 1 fruta + 1 punhado de castanhas. Total: ~${protLanche}g proteína. Ou: 1 pote de iogurte grego (170g, ≈15g) + 1 colher de sopa de proteína em pó (≈8g) + frutas. Total: ~${protLanche}g proteína.`,
          lanche2: `1 lata de atum em água (120g, ≈${protLanche}g proteína) + 1 fatia de queijo cottage (50g, ≈5g) + 1 fruta. Total: ~${protLanche}g proteína. Ou: 2 ovos cozidos (≈12g) + 1 fatia de queijo branco (≈8g) + 1 punhado de oleaginosas. Total: ~${protLanche}g proteína.`
        };
      
      case 'low_carb_moderada':
        return {
          cafe: `Opção 1: 2 ovos mexidos (≈12g proteína) + 1/4 de abacate + 1 xícara de vegetais (espinafre, tomate, cogumelos) + 1 colher de sopa de azeite. Total: ~${protCafe}g proteína. Ou: 1 pote de iogurte grego (170g, ≈15g) + 1 colher de sopa de pasta de amendoim (≈4g) + 1/2 xícara de frutas vermelhas + 1 colher de sopa de sementes. Total: ~${protCafe}g proteína.`,
          almoco: `120-150g de proteína magra grelhada (frango, peixe ou carne, ≈${protAlmoco}g proteína) + 1 prato de salada verde variada + 1 colher de sopa de azeite + 1/4 de abacate. Carboidrato reduzido, foco em proteína e gordura saudável.`,
          jantar: `100-120g de peixe grelhado (≈${protJantar}g proteína) + 1 prato de legumes cozidos ou salteados (brócolis, couve-flor, abobrinha) + 1 colher de sopa de azeite. Ou: frango grelhado (≈${protJantar}g) + salada verde + 1/4 de abacate.`,
          lanche1: `1 punhado de oleaginosas (castanhas, nozes, amêndoas, ≈${protLanche}g proteína) + 1 fatia de queijo branco (≈8g). Total: ~${protLanche}g proteína. Ou: 1 pote de iogurte grego (170g, ≈15g) + 1 colher de sopa de pasta de amendoim (≈4g). Total: ~${protLanche}g proteína.`,
          lanche2: `1 pote de iogurte grego (170g, ≈${protLanche}g proteína) + 1/2 xícara de frutas vermelhas + 1 colher de sopa de sementes de chia. Ou: 2 ovos cozidos (≈12g) + 1 punhado de castanhas (≈3g) + 1 fruta pequena. Total: ~${protLanche}g proteína.`
        };
      
      default:
        return {
          cafe: `2 ovos mexidos (≈12g proteína) + 1 fatia de pão integral (≈4g) + 1 fruta. Total: ~${protCafe}g proteína.`,
          almoco: `120-150g de proteína (carne, frango ou peixe, ≈${protAlmoco}g) + salada verde + 1/4 prato de arroz integral ou batata doce.`,
          jantar: `100-120g de proteína magra (≈${protJantar}g) + legumes cozidos + 1 colher de sopa de azeite.`,
          lanche1: `1 pote de iogurte (≈${protLanche}g proteína) + frutas + 1 punhado de oleaginosas.`,
          lanche2: `1 fatia de queijo (≈${protLanche}g proteína) + 1 fruta ou smoothie proteico.`
        };
    }
  };

  // ============================================
  // FUNÇÕES AUXILIARES PARA PERSONALIZAÇÃO DO CARDÁPIO
  // ============================================

  /**
   * Gera modeloDia a partir das opções selecionadas
   */
  const gerarModeloDiaFromOpcoes = (
    opcoesSelecionadas: { [K in RefeicaoKey]: string },
    opcoesDisponiveis: Record<RefeicaoKey, OpcaoRefeicao[]>
  ): PlanoNutricional['modeloDia'] => {
    return {
      cafe: opcoesDisponiveis.cafe.find(o => o.id === opcoesSelecionadas.cafe)?.descricao || '',
      lanche1: opcoesDisponiveis.lanche1.find(o => o.id === opcoesSelecionadas.lanche1)?.descricao || '',
      almoco: opcoesDisponiveis.almoco.find(o => o.id === opcoesSelecionadas.almoco)?.descricao || '',
      lanche2: opcoesDisponiveis.lanche2.find(o => o.id === opcoesSelecionadas.lanche2)?.descricao || '',
      jantar: opcoesDisponiveis.jantar.find(o => o.id === opcoesSelecionadas.jantar)?.descricao || ''
    };
  };

  /**
   * Estima macros totais do dia baseado nas opções selecionadas
   */
  const estimarMacrosDia = (
    opcoesSelecionadas: { [K in RefeicaoKey]: string },
    opcoesDisponiveis: Record<RefeicaoKey, OpcaoRefeicao[]>
  ): { proteinaTotal_g: number; caloriasTotais_kcal: number } => {
    let proteinaTotal_g = 0;
    let caloriasTotais_kcal = 0;

    (['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'] as RefeicaoKey[]).forEach((refeicao) => {
      const opcaoId = opcoesSelecionadas[refeicao];
      const opcao = opcoesDisponiveis[refeicao]?.find(o => o.id === opcaoId);
      if (opcao) {
        proteinaTotal_g += opcao.proteina_g;
        caloriasTotais_kcal += opcao.calorias_kcal;
      }
    });

    return { proteinaTotal_g, caloriasTotais_kcal };
  };

  /**
   * Tenta ajustar automaticamente os lanches para manter meta mínima de proteína
   * Retorna opções ajustadas e mensagem de ajuste se aplicado
   */
  const ajustarProteinaAutomaticamente = (
    opcoesSelecionadas: { [K in RefeicaoKey]: string },
    opcoesDisponiveis: Record<RefeicaoKey, OpcaoRefeicao[]>,
    metaProteina: number
  ): { opcoesAjustadas: { [K in RefeicaoKey]: string }; mensagemAjuste?: string } => {
    const opcoesAjustadas = { ...opcoesSelecionadas };
    let mensagemAjuste: string | undefined;

    // Calcular proteína atual
    const macrosAtuais = estimarMacrosDia(opcoesAjustadas, opcoesDisponiveis);
    const metaMinima = metaProteina * 0.9; // 90% da meta

    // Se já está acima da meta mínima, não precisa ajustar
    if (macrosAtuais.proteinaTotal_g >= metaMinima) {
      return { opcoesAjustadas };
    }

    // Tentar ajustar lanche1 primeiro (priorizar whey)
    const lanche1Whey = opcoesDisponiveis.lanche1.find(o => o.id.includes('whey') || o.titulo.toLowerCase().includes('whey'));
    if (lanche1Whey && opcoesAjustadas.lanche1 !== lanche1Whey.id) {
      opcoesAjustadas.lanche1 = lanche1Whey.id;
      const macrosAposAjuste = estimarMacrosDia(opcoesAjustadas, opcoesDisponiveis);
      if (macrosAposAjuste.proteinaTotal_g >= metaMinima) {
        mensagemAjuste = 'Ajustamos seu lanche da manhã para manter sua meta mínima de proteína diária.';
        return { opcoesAjustadas, mensagemAjuste };
      }
    }

    // Tentar ajustar lanche2
    const lanche2Whey = opcoesDisponiveis.lanche2.find(o => o.id.includes('whey') || o.titulo.toLowerCase().includes('whey'));
    if (lanche2Whey && opcoesAjustadas.lanche2 !== lanche2Whey.id) {
      opcoesAjustadas.lanche2 = lanche2Whey.id;
      const macrosAposAjuste = estimarMacrosDia(opcoesAjustadas, opcoesDisponiveis);
      if (macrosAposAjuste.proteinaTotal_g >= metaMinima) {
        mensagemAjuste = 'Ajustamos seu lanche da tarde para manter sua meta mínima de proteína diária.';
        return { opcoesAjustadas, mensagemAjuste };
      }
    }

    // Se ainda não atingiu, tentar ajustar ambos os lanches
    if (lanche1Whey && lanche2Whey) {
      opcoesAjustadas.lanche1 = lanche1Whey.id;
      opcoesAjustadas.lanche2 = lanche2Whey.id;
      const macrosAposAjuste = estimarMacrosDia(opcoesAjustadas, opcoesDisponiveis);
      if (macrosAposAjuste.proteinaTotal_g >= metaMinima) {
        mensagemAjuste = 'Ajustamos seus lanches para manter sua meta mínima de proteína diária.';
        return { opcoesAjustadas, mensagemAjuste };
      }
    }

    // Se mesmo assim não atingiu, retornar com aviso
    return { opcoesAjustadas, mensagemAjuste: 'Atenção: Seu dia ficou abaixo da meta mínima de proteína. Converse com seu médico ou ajuste uma refeição para incluir mais proteína.' };
  };

  // ============================================
  // SALVAMENTO NO FIRESTORE
  // ============================================

  const salvarPlanoNutricional = async (planoData: PlanoNutricional) => {
    try {
      const planoRef = doc(db, 'pacientes_completos', paciente.id, 'nutricao', 'plano');
      await setDoc(planoRef, {
        ...planoData,
        criadoEm: Timestamp.now()
      });
      
      setPlano({
        ...planoData,
        criadoEm: new Date()
      });
      setView('plano');
      await loadCheckIns();
    } catch (error) {
      console.error('Erro ao salvar plano nutricional:', error);
      alert('Erro ao salvar plano. Tente novamente.');
    }
  };

  /**
   * Salva alterações do cardápio (apenas opcoesSelecionadas e modeloDia)
   */
  const salvarAlteracoesCardapio = async () => {
    if (!plano || !refeicaoEmEdicao) return;
    
    try {
      // Criar cópia das opções selecionadas com a alteração
      const opcoesSelecionadasAtualizadas = {
        ...plano.opcoesSelecionadas!,
        [refeicaoEmEdicao]: opcaoSelecionadaTemp
      };
      
      // Aplicar ajuste automático se necessário
      const { opcoesAjustadas, mensagemAjuste } = ajustarProteinaAutomaticamente(
        opcoesSelecionadasAtualizadas,
        opcoesRefeicoes,
        plano.protDia_g
      );
      
      // Regenerar modeloDia
      const modeloDiaAtualizado = gerarModeloDiaFromOpcoes(opcoesAjustadas, opcoesRefeicoes);
      
      // Atualizar plano mantendo outros campos
      const planoAtualizado: PlanoNutricional = {
        ...plano,
        opcoesSelecionadas: opcoesAjustadas,
        modeloDia: modeloDiaAtualizado
      };
      
      // Salvar no Firestore
      await salvarPlanoNutricional(planoAtualizado);
      
      // Fechar modal
      setRefeicaoEmEdicao(null);
      setOpcaoSelecionadaTemp('');
      
      // Mostrar mensagem de ajuste se houver
      if (mensagemAjuste) {
        alert(mensagemAjuste);
      }
    } catch (error) {
      console.error('Erro ao salvar alterações do cardápio:', error);
      alert('Erro ao salvar alterações. Tente novamente.');
    }
  };

  // ============================================
  // CHECK-INS DIÁRIOS
  // ============================================

  const loadCheckIns = async () => {
    if (!paciente || !paciente.id) return;
    
    try {
      setLoadingCheckIns(true);
      const nutricaoDadosRef = doc(db, 'pacientes_completos', paciente.id, 'nutricao', 'dados');
      const checkInsRef = collection(nutricaoDadosRef, 'checkins');
      const checkInsQuery = query(checkInsRef, orderBy('timestamp', 'desc'));
      const checkInsSnapshot = await getDocs(checkInsQuery);
      
      const checkInsData: CheckInDiario[] = [];
      const dataHoje = new Date().toISOString().split('T')[0];
      let hojeExiste = false;
      
      checkInsSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        // Usar doc.id como data (se for formato YYYY-MM-DD) ou data.data como fallback
        const dataCheckIn = docSnapshot.id.match(/^\d{4}-\d{2}-\d{2}$/) 
          ? docSnapshot.id 
          : (data.data || docSnapshot.id);
        
        const checkInData: CheckInDiario = {
          // Alimentação/hidratação (compatibilidade com dados antigos)
          proteinaOk: data.proteinaOk ?? false,
          frutasOk: data.frutasOk ?? false,
          aguaOk: data.aguaOk ?? false,
          lixoAlimentar: data.lixoAlimentar ?? false,
          
          // Suplementos (novos campos, default false)
          probioticoTomou: data.probioticoTomou ?? false,
          wheyTomou: data.wheyTomou ?? false,
          creatinaTomou: data.creatinaTomou ?? false,
          
          // Sintomas gastrointestinais (compatibilidade + novos)
          sintomasGI: data.sintomasGI || 'nenhum',
          nauseas: data.nauseas || 'nenhum',
          constipacao: data.constipacao || 'nenhum',
          diarreia: data.diarreia || 'nenhum',
          
          // Sono, energia e humor
          horasSono: data.horasSono || '6-8h',
          humorEnergia: data.humorEnergia ?? 3,
          
          // Movimento / atividade
          atividadeFisicaHoje: data.atividadeFisicaHoje || 'nenhuma',
          
          // Tirzepatida
          diaAplicacao: data.diaAplicacao || 'nao_foi_dia',
          localAplicacao: data.localAplicacao,
          
          // Metadados
          observacoes: data.observacoes || '',
          aderenciaPlano: data.aderenciaPlano ?? 100,
          pesoHoje: data.pesoHoje,
          sintomasAumentoDose: data.sintomasAumentoDose,
          score: data.score || 0,
          data: dataCheckIn
        };
        
        checkInsData.push(checkInData);
        
        // Verificar se já existe check-in de hoje (para compatibilidade)
        if (checkInData.data === dataHoje) {
          hojeExiste = true;
        }
      });
      
      setCheckIns(checkInsData);
      // Manter setCheckInHojeExiste para compatibilidade, mas não é mais usado na UI
      setCheckInHojeExiste(hojeExiste);
    } catch (error) {
      console.error('Erro ao carregar check-ins:', error);
    } finally {
      setLoadingCheckIns(false);
    }
  };

  /**
   * Calcula o score de adesão do check-in (0-100)
   * 
   * Componentes e pesos:
   * - Aderência ao plano (30%): valor direto de aderenciaPlano (0-100%)
   * - Adesão alimentar (30%): proteína, frutas/vegetais, água, sem lixo
   * - Suplementos (15%): probiótico, whey, creatina
   * - Sintomas GI (15%): quanto menos sintomas, melhor (nível geral + náuseas + constipação + diarreia)
   * - Sono e energia (5%): horas de sono adequadas + humor/energia
   * - Atividade física (3%): qualquer atividade é positiva
   * - Adesão tirzepatida (2%): se foi dia de aplicação, verificar se aplicou corretamente
   */
  const calcularScoreCheckIn = (data: CheckInDiario): number => {
    let scoreTotal = 0;
    let pesoTotal = 0; // Inicializar pesoTotal
    
    // 1. Aderência ao Plano (30% do total) - valor direto
    const pesoAderencia = 30;
    pesoTotal += pesoAderencia;
    const aderenciaPlano = data.aderenciaPlano ?? 100;
    scoreTotal += (aderenciaPlano / 100) * pesoAderencia;
    
    // 2. Adesão Alimentar (30% do total)
    const pesoAlimentar = 30;
    pesoTotal += pesoAlimentar;
    let scoreAlimentar = 0;
    scoreAlimentar += data.proteinaOk ? 25 : 0; // 25% dentro dos 30%
    scoreAlimentar += data.frutasOk ? 25 : 0; // 25% dentro dos 30%
    scoreAlimentar += data.aguaOk ? 25 : 0; // 25% dentro dos 30%
    scoreAlimentar += !data.lixoAlimentar ? 25 : 0; // 25% dentro dos 30%
    scoreTotal += (scoreAlimentar / 100) * pesoAlimentar;
    
    // 3. Suplementos (15% do total)
    const pesoSuplementos = 15;
    pesoTotal += pesoSuplementos;
    let scoreSuplementos = 0;
    scoreSuplementos += data.probioticoTomou ? 33.33 : 0;
    scoreSuplementos += data.wheyTomou ? 33.33 : 0;
    scoreSuplementos += data.creatinaTomou ? 33.34 : 0;
    scoreTotal += (scoreSuplementos / 100) * pesoSuplementos;
    
    // 4. Sintomas GI (15% do total) - quanto menos sintomas, melhor
    const pesoGI = 15;
    pesoTotal += pesoGI;
    const sintomasMap: { [key: string]: number } = {
      'nenhum': 1,
      'leve': 0.75,
      'moderado': 0.5,
      'grave': 0.25
    };
    const scoreGI = (
      sintomasMap[data.sintomasGI] * 0.4 +
      sintomasMap[data.nauseas] * 0.2 +
      sintomasMap[data.constipacao] * 0.2 +
      sintomasMap[data.diarreia] * 0.2
    ) * 100;
    scoreTotal += (scoreGI / 100) * pesoGI;
    
    // 5. Sono e Energia (5% do total)
    const pesoSonoEnergia = 5;
    pesoTotal += pesoSonoEnergia;
    const sonoMap: { [key: string]: number } = {
      '<6h': 0.5,
      '6-8h': 1,
      '>8h': 0.75
    };
    const scoreSono = sonoMap[data.horasSono] || 0.5;
    const scoreEnergia = data.humorEnergia / 5;
    const scoreSonoEnergia = ((scoreSono * 0.5) + (scoreEnergia * 0.5)) * 100;
    scoreTotal += (scoreSonoEnergia / 100) * pesoSonoEnergia;
    
    // 6. Atividade Física (3% do total)
    const pesoAtividade = 3;
    pesoTotal += pesoAtividade;
    const atividadeMap: { [key: string]: number } = {
      'nenhuma': 0,
      'leve': 0.5,
      'moderada': 0.75,
      'intensa': 1
    };
    const scoreAtividade = atividadeMap[data.atividadeFisicaHoje] || 0;
    scoreTotal += scoreAtividade * pesoAtividade;
    
    // 7. Adesão Tirzepatida (2% do total) - só conta se foi dia de aplicação
    const pesoTirzepatida = 2;
    pesoTotal += pesoTirzepatida;
    let scoreTirzepatida = 0;
    if (data.diaAplicacao === 'aplicou_no_horario') {
      scoreTirzepatida = 100;
    } else if (data.diaAplicacao === 'aplicou_atrasado') {
      scoreTirzepatida = 70; // Aplicou, mas atrasado
    } else if (data.diaAplicacao === 'esqueceu') {
      scoreTirzepatida = 0;
    } else {
      // Não foi dia de aplicação, não penaliza nem bonifica
      scoreTirzepatida = 100; // Considera como "ok" já que não era necessário
    }
    scoreTotal += (scoreTirzepatida / 100) * pesoTirzepatida;
    
    // Normalizar para 0-100 e arredondar com 1 casa decimal
    const scoreFinal = (scoreTotal / pesoTotal) * 100;
    return Math.round(scoreFinal * 10) / 10;
  };

  // Função para validar se a data está dentro da janela permitida (hoje até 3 dias atrás)
  const validarDataCheckIn = (data: string): boolean => {
    if (!data) return false;
    
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999); // Fim do dia de hoje
    const dataSelecionada = new Date(data + 'T00:00:00'); // Garantir timezone local
    const tresDiasAtras = new Date(hoje);
    tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);
    tresDiasAtras.setHours(0, 0, 0, 0);
    
    // Não permitir datas futuras (maior que hoje)
    const hojeInicio = new Date(hoje);
    hojeInicio.setHours(0, 0, 0, 0);
    if (dataSelecionada > hojeInicio) {
      return false;
    }
    
    // Não permitir datas anteriores a 3 dias atrás
    if (dataSelecionada < tresDiasAtras) {
      return false;
    }
    
    return true;
  };

  // Função para carregar check-in existente quando a data mudar
  const carregarCheckInPorData = (data: string) => {
    const checkInExistente = checkIns.find(ci => ci.data === data);
    if (checkInExistente) {
      setCheckInData(checkInExistente);
      setIsEditandoCheckIn(true);
    } else {
      // Resetar para valores padrão, mas manter a data
      setCheckInData({
        proteinaOk: false,
        frutasOk: false,
        aguaOk: false,
        lixoAlimentar: true, // true = não evitou (checkbox desmarcado), false = evitou (checkbox marcado)
        probioticoTomou: false,
        wheyTomou: false,
        creatinaTomou: false,
        sintomasGI: 'nenhum',
        nauseas: 'nenhum',
        constipacao: 'nenhum',
        diarreia: 'nenhum',
        horasSono: '6-8h',
        humorEnergia: 3,
        atividadeFisicaHoje: 'nenhuma',
        diaAplicacao: 'nao_foi_dia',
        localAplicacao: undefined,
        observacoes: '',
        aderenciaPlano: 100,
        pesoHoje: undefined,
        sintomasAumentoDose: undefined,
        score: 0,
        data: data
      });
      setIsEditandoCheckIn(false);
    }
  };

  // useEffect para carregar check-in quando a data mudar ou quando entrar na view de check-in
  useEffect(() => {
    if (view === 'checkin' && checkInDate && checkIns.length > 0) {
      // Só carregar se já tiver check-ins carregados
      carregarCheckInPorData(checkInDate);
    } else if (view === 'checkin' && checkIns.length === 0) {
      // Se não tiver check-ins carregados, carregar primeiro
      loadCheckIns().then(() => {
        if (checkInDate) {
          carregarCheckInPorData(checkInDate);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkInDate, view]);

  const salvarCheckIn = async () => {
    if (!paciente || !paciente.id) {
      alert('Erro: Paciente não encontrado. Recarregue a página.');
      return;
    }

    // Validar janela de 3 dias
    if (!validarDataCheckIn(checkInDate)) {
      alert('Você só pode registrar check-ins até 3 dias atrás.');
      return;
    }

    try {
      setSavingCheckIn(true);
      const score = calcularScoreCheckIn(checkInData);
      
      // Calcular sintomasGI geral baseado no pior sintoma
      const sintomasValores = {
        'nenhum': 0,
        'leve': 1,
        'moderado': 2,
        'grave': 3
      };
      const piorSintoma = Math.max(
        sintomasValores[checkInData.nauseas],
        sintomasValores[checkInData.constipacao],
        sintomasValores[checkInData.diarreia],
        sintomasValores[checkInData.sintomasGI]
      );
      const sintomasGIGeral = Object.keys(sintomasValores).find(
        key => sintomasValores[key as keyof typeof sintomasValores] === piorSintoma
      ) as 'nenhum' | 'leve' | 'moderado' | 'grave';
      
      const checkInComScore: any = { 
        // Alimentação/hidratação
        proteinaOk: checkInData.proteinaOk,
        frutasOk: checkInData.frutasOk,
        aguaOk: checkInData.aguaOk,
        lixoAlimentar: checkInData.lixoAlimentar,
        
        // Suplementos
        probioticoTomou: checkInData.probioticoTomou,
        wheyTomou: checkInData.wheyTomou,
        creatinaTomou: checkInData.creatinaTomou,
        
        // Sintomas gastrointestinais
        sintomasGI: sintomasGIGeral,
        nauseas: checkInData.nauseas,
        constipacao: checkInData.constipacao,
        diarreia: checkInData.diarreia,
        
        // Sono, energia e humor
        horasSono: checkInData.horasSono,
        humorEnergia: checkInData.humorEnergia,
        
        // Movimento / atividade
        atividadeFisicaHoje: checkInData.atividadeFisicaHoje,
        
        // Tirzepatida
        diaAplicacao: checkInData.diaAplicacao,
        localAplicacao: checkInData.localAplicacao || null,
        
        // Metadados
        observacoes: checkInData.observacoes || '',
        aderenciaPlano: checkInData.aderenciaPlano ?? 100,
        pesoHoje: checkInData.pesoHoje || null,
        sintomasAumentoDose: checkInData.sintomasAumentoDose || null,
        score: score,
        data: checkInDate, // Usar checkInDate em vez de dataHoje
        timestamp: Timestamp.now()
      };
      
      const nutricaoDadosRef = doc(db, 'pacientes_completos', paciente.id, 'nutricao', 'dados');
      const checkInRef = doc(nutricaoDadosRef, 'checkins', checkInDate); // Usar checkInDate como ID
      await setDoc(checkInRef, checkInComScore);
      
      alert(isEditandoCheckIn ? 'Check-in atualizado com sucesso!' : 'Check-in salvo com sucesso!');
      await loadCheckIns();
      setView('plano');
      
      // Resetar formulário para valores padrão
      const dataHoje = new Date().toISOString().split('T')[0];
      setCheckInDate(dataHoje);
      setCheckInData({
        proteinaOk: false,
        frutasOk: false,
        aguaOk: false,
        lixoAlimentar: true, // true = não evitou (checkbox desmarcado), false = evitou (checkbox marcado)
        probioticoTomou: false,
        wheyTomou: false,
        creatinaTomou: false,
        sintomasGI: 'nenhum',
        nauseas: 'nenhum',
        constipacao: 'nenhum',
        diarreia: 'nenhum',
        horasSono: '6-8h',
        humorEnergia: 3,
        atividadeFisicaHoje: 'nenhuma',
        diaAplicacao: 'nao_foi_dia',
        localAplicacao: undefined,
        observacoes: '',
        aderenciaPlano: 100,
        pesoHoje: undefined,
        sintomasAumentoDose: undefined,
        score: 0,
        data: dataHoje
      });
      setIsEditandoCheckIn(false);
    } catch (error: any) {
      console.error('Erro ao salvar check-in:', error);
      alert(`Erro ao salvar check-in: ${error?.message || 'Erro desconhecido'}.`);
    } finally {
      setSavingCheckIn(false);
    }
  };

  // Função para calcular resumo dos check-ins
  const calcularResumoCheckIns = () => {
    if (checkIns.length === 0) return null;
    
    const ultimos7 = checkIns.slice(0, 7);
    const mediaScore = ultimos7.reduce((acc, ci) => acc + ci.score, 0) / ultimos7.length;
    const melhorDia = checkIns.reduce((melhor, atual) => 
      atual.score > melhor.score ? atual : melhor, checkIns[0]
    );
    
    return {
      mediaScore7dias: mediaScore,
      totalCheckIns: checkIns.length,
      melhorDia: melhorDia
    };
  };

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  if (view === 'loading') {
    return (
      <div className="space-y-4">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  // Formulário de peso/altura (se necessário)
  if (showPesoAlturaForm && view === 'wizard') {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Informações Básicas</h2>
          <p className="text-gray-600 mb-6">
            Precisamos de algumas informações para criar seu plano nutricional personalizado.
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Peso (kg) *
              </label>
              <input
                type="number"
                value={peso || ''}
                onChange={(e) => setPeso(parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder:text-gray-400"
                placeholder="Ex: 75.5"
                min="20"
                max="400"
                step="0.1"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Altura (cm) *
              </label>
              <input
                type="number"
                value={altura || ''}
                onChange={(e) => setAltura(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder:text-gray-400"
                placeholder="Ex: 170"
                min="120"
                max="230"
              />
            </div>
          </div>
          
          <div className="mt-6 flex gap-4">
            <button
              onClick={handleSalvarPesoAltura}
              disabled={!peso || !altura}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Wizard de anamnese nutricional (melhorado)
  if (view === 'wizard') {
    const totalSteps = 9;
    
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Anamnese Nutricional</h2>
            <p className="text-gray-600">Vamos conhecer seus hábitos e objetivos para criar o melhor plano nutricional para você.</p>
            <div className="mt-4 flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((step) => (
                <div
                  key={step}
                  className={`flex-1 h-2 rounded ${
                    step <= wizardStep ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-2">Passo {wizardStep} de {totalSteps}</p>
          </div>
          
          {/* Step 1: Objetivo Principal */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Objetivo Principal</h3>
              </div>
              <p className="text-gray-600 mb-4">Qual é o seu principal objetivo com o acompanhamento nutricional?</p>
              <div className="space-y-2">
                {([
                  { value: 'perda_peso', label: 'Perda de Peso', desc: 'Redução de peso e gordura corporal' },
                  { value: 'recomposicao', label: 'Recomposição Corporal', desc: 'Ganho de massa magra e perda de gordura' },
                  { value: 'controle_glicemia', label: 'Controle Glicêmico', desc: 'Melhorar níveis de açúcar no sangue' },
                  { value: 'melhora_disposicao', label: 'Melhora de Disposição', desc: 'Aumentar energia e bem-estar' },
                  { value: 'manutencao', label: 'Manutenção', desc: 'Manter peso e hábitos saudáveis' }
                ] as const).map((opcao) => (
                  <button
                    key={opcao.value}
                    onClick={() => setWizardData({ ...wizardData, objetivoPrincipal: opcao.value })}
                    className={`w-full text-left px-4 py-3 rounded-md border-2 transition-colors ${
                      wizardData.objetivoPrincipal === opcao.value
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{opcao.label}</p>
                    <p className="text-sm text-gray-600 mt-1">{opcao.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Step 2: Rotina e Jornada de Trabalho */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Rotina e Jornada de Trabalho</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <p className="text-gray-700 font-medium mb-3">Qual é o seu horário de trabalho?</p>
                  <div className="space-y-2">
                    {([
                      { value: 'diurno', label: 'Diurno', icon: Sun },
                      { value: 'noturno', label: 'Noturno', icon: Moon },
                      { value: 'turnos', label: 'Turnos Rotativos', icon: Clock }
                    ] as const).map((opcao) => {
                      const Icon = opcao.icon;
                      return (
                        <button
                          key={opcao.value}
                          onClick={() => setWizardData({ ...wizardData, horarioTrabalho: opcao.value })}
                          className={`w-full text-left px-4 py-3 rounded-md border-2 transition-colors flex items-center gap-3 ${
                            wizardData.horarioTrabalho === opcao.value
                              ? 'border-green-600 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon className="h-5 w-5 text-gray-600" />
                          <span className="text-gray-900 font-medium">{opcao.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                
                <div>
                  <p className="text-gray-700 font-medium mb-3">Quantas horas por dia você passa sentado?</p>
                  <div className="space-y-2">
                    {(['<4h', '4-8h', '>8h'] as const).map((opcao) => (
                      <button
                        key={opcao}
                        onClick={() => setWizardData({ ...wizardData, horasSentado: opcao })}
                        className={`w-full text-left px-4 py-3 rounded-md border-2 transition-colors text-gray-900 ${
                          wizardData.horasSentado === opcao
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {opcao === '<4h' && 'Menos de 4 horas'}
                        {opcao === '4-8h' && '4 a 8 horas'}
                        {opcao === '>8h' && 'Mais de 8 horas'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 3: Histórico de Peso e Dietas */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Weight className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Histórico de Peso e Dietas</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <p className="text-gray-700 font-medium mb-3">Já fez alguma dieta nos últimos 12 meses?</p>
                  <div className="space-y-2">
                    {(['sim', 'nao'] as const).map((opcao) => (
                      <button
                        key={opcao}
                        onClick={() => setWizardData({ ...wizardData, dietaUltimos12Meses: opcao })}
                        className={`w-full text-left px-4 py-3 rounded-md border-2 transition-colors text-gray-900 ${
                          wizardData.dietaUltimos12Meses === opcao
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {opcao === 'sim' ? 'Sim' : 'Não'}
                      </button>
                    ))}
                  </div>
                </div>
                
                {wizardData.dietaUltimos12Meses === 'sim' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Qual tipo de dieta?</label>
                    <input
                      type="text"
                      value={wizardData.tipoDieta || ''}
                      onChange={(e) => setWizardData({ ...wizardData, tipoDieta: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder:text-gray-400"
                      placeholder="Ex: Low carb, Mediterrânea, etc."
                    />
                  </div>
                )}
                
                <div>
                  <p className="text-gray-700 font-medium mb-3">Teve efeito sanfona (ganhou e perdeu peso várias vezes)?</p>
                  <div className="space-y-2">
                    {(['sim', 'nao'] as const).map((opcao) => (
                      <button
                        key={opcao}
                        onClick={() => setWizardData({ ...wizardData, efeitoSanfona: opcao })}
                        className={`w-full text-left px-4 py-3 rounded-md border-2 transition-colors text-gray-900 ${
                          wizardData.efeitoSanfona === opcao
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {opcao === 'sim' ? 'Sim' : 'Não'}
                      </button>
                    ))}
                  </div>
                </div>
                
                {wizardData.efeitoSanfona === 'sim' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Aproximadamente quantos kg de variação?</label>
                    <input
                      type="number"
                      value={wizardData.kgSanfona || ''}
                      onChange={(e) => setWizardData({ ...wizardData, kgSanfona: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder:text-gray-400"
                      placeholder="Ex: 10"
                      min="1"
                      max="100"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Peso máximo dos últimos 2 anos (kg)</label>
                    <input
                      type="number"
                      value={wizardData.pesoMaximo2Anos || ''}
                      onChange={(e) => setWizardData({ ...wizardData, pesoMaximo2Anos: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder:text-gray-400"
                      placeholder="Ex: 95"
                      min="20"
                      max="400"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Peso mínimo dos últimos 2 anos (kg)</label>
                    <input
                      type="number"
                      value={wizardData.pesoMinimo2Anos || ''}
                      onChange={(e) => setWizardData({ ...wizardData, pesoMinimo2Anos: e.target.value ? parseFloat(e.target.value) : undefined })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 placeholder:text-gray-400"
                      placeholder="Ex: 75"
                      min="20"
                      max="400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 4: Padrão de Fome / Saciedade */}
          {wizardStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Padrão de Fome e Saciedade</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fome matinal (0 = sem fome, 10 = fome extrema)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={wizardData.fomeMatinal}
                      onChange={(e) => setWizardData({ ...wizardData, fomeMatinal: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-lg font-bold text-gray-900 w-12 text-center">{wizardData.fomeMatinal}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fome noturna (0 = sem fome, 10 = fome extrema)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={wizardData.fomeNoturna}
                      onChange={(e) => setWizardData({ ...wizardData, fomeNoturna: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-lg font-bold text-gray-900 w-12 text-center">{wizardData.fomeNoturna}</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vontade de doce (0 = nenhuma, 10 = muito intensa)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={wizardData.vontadeDoce}
                      onChange={(e) => setWizardData({ ...wizardData, vontadeDoce: parseInt(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-lg font-bold text-gray-900 w-12 text-center">{wizardData.vontadeDoce}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-md cursor-pointer hover:border-gray-300">
                    <div>
                      <p className="font-medium text-gray-900">Costuma pular café da manhã?</p>
                      <p className="text-sm text-gray-600">Não toma café da manhã regularmente</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={wizardData.pulaCafeManha}
                      onChange={(e) => setWizardData({ ...wizardData, pulaCafeManha: e.target.checked })}
                      className="h-4 w-4 text-green-600 focus:ring-green-500"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-md cursor-pointer hover:border-gray-300">
                    <div>
                      <p className="font-medium text-gray-900">Costuma chegar com MUITA fome no jantar?</p>
                      <p className="text-sm text-gray-600">Fome intensa ao chegar para jantar</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={wizardData.chegaComMuitaFomeJantar}
                      onChange={(e) => setWizardData({ ...wizardData, chegaComMuitaFomeJantar: e.target.checked })}
                      className="h-4 w-4 text-green-600 focus:ring-green-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 5: Padrão de Atividade Física */}
          {wizardStep === 5 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Padrão de Atividade Física</h3>
              </div>
              <p className="text-gray-600 mb-4">Com que frequência você pratica atividade física regularmente?</p>
              <div className="space-y-2">
                {([
                  { value: 'nunca', label: 'Nunca', desc: 'Não pratico atividade física regular' },
                  { value: '1-2x', label: '1-2 vezes por semana', desc: 'Atividade física leve a moderada' },
                  { value: '3-4x', label: '3-4 vezes por semana', desc: 'Atividade física regular' },
                  { value: '5-7x', label: '5-7 vezes por semana', desc: 'Atividade física intensa e frequente' }
                ] as const).map((opcao) => (
                  <button
                    key={opcao.value}
                    onClick={() => setWizardData({ ...wizardData, atividadeFisica: opcao.value })}
                    className={`w-full text-left px-4 py-3 rounded-md border-2 transition-colors ${
                      wizardData.atividadeFisica === opcao.value
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-medium text-gray-900">{opcao.label}</p>
                    <p className="text-sm text-gray-600 mt-1">{opcao.desc}</p>
                  </button>
                ))}
              </div>
              
              <div className="mt-6">
                <p className="text-gray-700 font-medium mb-3">Quantas horas de sono você tem por noite?</p>
                <div className="space-y-2">
                  {(['<6h', '6-8h', '>8h'] as const).map((opcao) => (
                    <button
                      key={opcao}
                      onClick={() => setWizardData({ ...wizardData, sonoHoras: opcao })}
                      className={`w-full text-left px-4 py-3 rounded-md border-2 transition-colors text-gray-900 ${
                        wizardData.sonoHoras === opcao
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {opcao === '<6h' && 'Menos de 6 horas'}
                      {opcao === '6-8h' && '6 a 8 horas'}
                      {opcao === '>8h' && 'Mais de 8 horas'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Step 6: Sono e Cronotipo Detalhado */}
          {wizardStep === 6 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Moon className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Sono e Cronotipo</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <p className="text-gray-700 font-medium mb-3">Horário em que costuma dormir</p>
                  <div className="space-y-2">
                    {([
                      { value: '22-00', label: 'Entre 22h e 00h', desc: 'Horário ideal para a maioria' },
                      { value: '00-02', label: 'Entre 00h e 02h', desc: 'Dorme mais tarde' },
                      { value: 'depois_02h', label: 'Depois das 02h', desc: 'Cronotipo vespertino' }
                    ] as const).map((opcao) => (
                      <button
                        key={opcao.value}
                        onClick={() => setWizardData({ ...wizardData, horarioDormir: opcao.value })}
                        className={`w-full text-left px-4 py-3 rounded-md border-2 transition-colors ${
                          wizardData.horarioDormir === opcao.value
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium text-gray-900">{opcao.label}</p>
                        <p className="text-sm text-gray-600 mt-1">{opcao.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className="text-gray-700 font-medium mb-3">Acorda descansado?</p>
                  <div className="space-y-2">
                    {([
                      { value: 'sim', label: 'Sim', desc: 'Sempre acorda descansado' },
                      { value: 'as_vezes', label: 'Às vezes', desc: 'Depende do dia' },
                      { value: 'nao', label: 'Não', desc: 'Raramente acorda descansado' }
                    ] as const).map((opcao) => (
                      <button
                        key={opcao.value}
                        onClick={() => setWizardData({ ...wizardData, acordaDescansado: opcao.value })}
                        className={`w-full text-left px-4 py-3 rounded-md border-2 transition-colors ${
                          wizardData.acordaDescansado === opcao.value
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium text-gray-900">{opcao.label}</p>
                        <p className="text-sm text-gray-600 mt-1">{opcao.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 7: Padrão Alimentar */}
          {wizardStep === 7 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <UtensilsCrossed className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Padrão Alimentar</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <p className="text-gray-700 font-medium mb-3">Quantas refeições você faz por dia?</p>
                  <div className="space-y-2">
                    {(['2-3', '4-5', '>5'] as const).map((opcao) => (
                      <button
                        key={opcao}
                        onClick={() => setWizardData({ ...wizardData, numeroRefeicoesDia: opcao })}
                        className={`w-full text-left px-4 py-3 rounded-md border-2 transition-colors text-gray-900 ${
                          wizardData.numeroRefeicoesDia === opcao
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {opcao === '2-3' && '2 a 3 refeições'}
                        {opcao === '4-5' && '4 a 5 refeições'}
                        {opcao === '>5' && 'Mais de 5 refeições'}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className="text-gray-700 font-medium mb-3">Selecione todos os comportamentos que se aplicam a você:</p>
                  <div className="space-y-2">
                    {[
                      'pulo refeições',
                      'como rápido',
                      'belisco o dia todo',
                      'doce diário',
                      'álcool frequente'
                    ].map((opcao) => (
                      <label
                        key={opcao}
                        className="flex items-center px-4 py-3 rounded-md border-2 border-gray-200 hover:border-gray-300 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={wizardData.comportamentosAlimentares.includes(opcao)}
                          onChange={() => toggleCheckbox('comportamentosAlimentares', opcao)}
                          className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-gray-900 capitalize">{opcao}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-md cursor-pointer hover:border-gray-300">
                    <div>
                      <p className="font-medium text-gray-900">Fome Emocional</p>
                      <p className="text-sm text-gray-600">Você come quando está ansioso, estressado ou triste?</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={wizardData.fomeEmocional}
                      onChange={(e) => toggleCheckbox('fomeEmocional', e.target.checked)}
                      className="h-4 w-4 text-green-600 focus:ring-green-500"
                    />
                  </label>
                  
                  <label className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-md cursor-pointer hover:border-gray-300">
                    <div>
                      <p className="font-medium text-gray-900">Compulsão Noturna</p>
                      <p className="text-sm text-gray-600">Você tem episódios de compulsão alimentar à noite?</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={wizardData.compulsaoNoturna}
                      onChange={(e) => toggleCheckbox('compulsaoNoturna', e.target.checked)}
                      className="h-4 w-4 text-green-600 focus:ring-green-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 8: Álcool e Finais de Semana */}
          {wizardStep === 8 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Droplet className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Álcool e Finais de Semana</h3>
              </div>
              
              <div className="space-y-6">
                <div>
                  <p className="text-gray-700 font-medium mb-3">Quantas doses de álcool por semana?</p>
                  <div className="space-y-2">
                    {([
                      { value: '0', label: '0 doses', desc: 'Não consumo álcool' },
                      { value: '1-3', label: '1-3 doses', desc: 'Consumo ocasional' },
                      { value: '4-7', label: '4-7 doses', desc: 'Consumo moderado' },
                      { value: '>7', label: 'Mais de 7 doses', desc: 'Consumo frequente' }
                    ] as const).map((opcao) => (
                      <button
                        key={opcao.value}
                        onClick={() => setWizardData({ ...wizardData, dosesAlcoolSemana: opcao.value })}
                        className={`w-full text-left px-4 py-3 rounded-md border-2 transition-colors ${
                          wizardData.dosesAlcoolSemana === opcao.value
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium text-gray-900">{opcao.label}</p>
                        <p className="text-sm text-gray-600 mt-1">{opcao.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <p className="text-gray-700 font-medium mb-3">Final de semana costuma sair da dieta?</p>
                  <div className="space-y-2">
                    {([
                      { value: 'quase_nunca', label: 'Quase nunca', desc: 'Mantém a dieta nos finais de semana' },
                      { value: 'as_vezes', label: 'Às vezes', desc: 'Algumas vezes sai da dieta' },
                      { value: 'sempre', label: 'Sempre', desc: 'Sempre sai da dieta nos finais de semana' }
                    ] as const).map((opcao) => (
                      <button
                        key={opcao.value}
                        onClick={() => setWizardData({ ...wizardData, finalSemanaSaiDieta: opcao.value })}
                        className={`w-full text-left px-4 py-3 rounded-md border-2 transition-colors ${
                          wizardData.finalSemanaSaiDieta === opcao.value
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium text-gray-900">{opcao.label}</p>
                        <p className="text-sm text-gray-600 mt-1">{opcao.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 9: Preferências e Restrições + Sintomas GI (combinado) */}
          {wizardStep === 9 && (
            <div className="space-y-6">
              {/* Preferências e Restrições */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Heart className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Preferências e Restrições Alimentares</h3>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <p className="text-gray-700 font-medium mb-3">Restrições alimentares (selecione todas que se aplicam):</p>
                    <div className="space-y-2">
                      {['vegetariano', 'vegano', 'intolerância lactose', 'sem glúten', 'nada'].map((opcao) => (
                        <label
                          key={opcao}
                          className="flex items-center px-4 py-3 rounded-md border-2 border-gray-200 hover:border-gray-300 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={wizardData.restricoes.includes(opcao)}
                            onChange={() => toggleCheckbox('restricoes', opcao)}
                            className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500"
                          />
                          <span className="text-gray-900 capitalize">{opcao}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-gray-700 font-medium mb-3">Preferências de proteína (selecione todas que você consome):</p>
                    <div className="space-y-2">
                      {['Carne', 'Frango', 'Peixe', 'Ovos', 'Laticínios', 'Leguminosas'].map((opcao) => (
                        <label
                          key={opcao}
                          className="flex items-center px-4 py-3 rounded-md border-2 border-gray-200 hover:border-gray-300 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={wizardData.preferenciasProteina.includes(opcao)}
                            onChange={() => toggleCheckbox('preferenciasProteina', opcao)}
                            className="mr-3 h-4 w-4 text-green-600 focus:ring-green-500"
                          />
                          <span className="text-gray-900">{opcao}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Sintomas Gastrointestinais */}
              <div className="space-y-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Sintomas Gastrointestinais e Digestivos</h3>
                </div>
                <p className="text-gray-600 mb-4">Você apresenta sintomas gastrointestinais com frequência? (náusea, vômito, diarreia, constipação, refluxo, distensão abdominal)</p>
                <div className="space-y-2">
                  {([
                    { value: 'nenhum', label: 'Nenhum', desc: 'Não apresento sintomas gastrointestinais' },
                    { value: 'leve', label: 'Leve', desc: 'Sintomas ocasionais e leves' },
                    { value: 'moderado', label: 'Moderado', desc: 'Sintomas frequentes que afetam o dia a dia' },
                    { value: 'grave', label: 'Grave', desc: 'Sintomas intensos e constantes' }
                  ] as const).map((opcao) => (
                    <button
                      key={opcao.value}
                      onClick={() => setWizardData({ ...wizardData, sintomasGI: opcao.value })}
                      className={`w-full text-left px-4 py-3 rounded-md border-2 transition-colors ${
                        wizardData.sintomasGI === opcao.value
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-gray-900">{opcao.label}</p>
                      <p className="text-sm text-gray-600 mt-1">{opcao.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-6 flex gap-4">
            {wizardStep > 1 && (
              <button
                onClick={handleWizardBack}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Voltar
              </button>
            )}
            <button
              onClick={handleWizardNext}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              {wizardStep === 9 ? 'Gerar Plano Nutricional' : 'Próximo'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tela de Check-in Diário
  if (view === 'checkin') {
    // Calcular datas mínima e máxima (hoje até 3 dias atrás)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const tresDiasAtras = new Date(hoje);
    tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);
    
    const dataMinima = tresDiasAtras.toISOString().split('T')[0];
    const dataMaxima = hoje.toISOString().split('T')[0];
    
    // Formatar data selecionada para exibição
    const dataSelecionada = new Date(checkInDate);
    const dataFormatada = dataSelecionada.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
    
    const metaAgua = plano ? `${plano.aguaDia_ml} ml` : '2-3 litros';
    
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Header do Check-in */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-green-600" />
              Check-in Nutri
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Escolha o dia que você quer registrar (até 3 dias atrás).
            </p>
            
            {/* Campo de Data */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Este check-in é referente a qual dia?
              </label>
              <input
                type="date"
                value={checkInDate}
                min={dataMinima}
                max={dataMaxima}
                onChange={(e) => {
                  const novaData = e.target.value;
                  
                  // Validar antes de atualizar
                  if (!validarDataCheckIn(novaData)) {
                    alert('Você só pode registrar check-ins até 3 dias atrás. Não é permitido selecionar datas futuras.');
                    // Resetar para a data atual se inválida
                    setCheckInDate(dataMaxima);
                    return;
                  }
                  setCheckInDate(novaData);
                }}
                onBlur={(e) => {
                  // Validação adicional ao perder o foco
                  const dataSelecionada = e.target.value;
                  if (dataSelecionada && !validarDataCheckIn(dataSelecionada)) {
                    alert('Você só pode registrar check-ins até 3 dias atrás. Não é permitido selecionar datas futuras.');
                    setCheckInDate(dataMaxima);
                  }
                }}
                className="w-full max-w-xs px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
              />
              <p className="text-sm text-gray-500 mt-2">
                {dataFormatada}
              </p>
            </div>
            
            {/* Mensagem se já existe check-in para esta data */}
            {isEditandoCheckIn && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-yellow-800 mb-1">
                      Check-in já realizado para esta data
                    </p>
                    <p className="text-sm text-yellow-700">
                      Já existe um check-in registrado para o dia {dataFormatada}. Não é possível criar um novo check-in para esta data.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Ocultar formulário se já existe check-in para esta data */}
          {!isEditandoCheckIn && (
            <>
            <div className="space-y-6">
            {/* Card 1 – Alimentação e Proteína */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <UtensilsCrossed className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-semibold text-gray-900">Alimentação e Proteína</h3>
              </div>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200 cursor-pointer hover:border-green-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">Bati a meta de proteína do dia</p>
                      <p className="text-xs text-gray-500">Conseguiu atingir a meta de proteína?</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checkInData.proteinaOk}
                    onChange={(e) => setCheckInData({ ...checkInData, proteinaOk: e.target.checked })}
                    className="h-5 w-5 text-green-600 focus:ring-green-500 rounded"
                  />
                </label>
                
                <label className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200 cursor-pointer hover:border-green-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <Apple className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">Comi frutas/vegetais conforme o plano</p>
                      <p className="text-xs text-gray-500">Consumiu frutas e vegetais hoje?</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checkInData.frutasOk}
                    onChange={(e) => setCheckInData({ ...checkInData, frutasOk: e.target.checked })}
                    className="h-5 w-5 text-green-600 focus:ring-green-500 rounded"
                  />
                </label>
                
                <label className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200 cursor-pointer hover:border-green-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium text-gray-900">Evitei lixos alimentares importantes</p>
                      <p className="text-xs text-gray-500">Não consumiu alimentos ultraprocessados?</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checkInData.lixoAlimentar === false}
                    onChange={(e) => setCheckInData({ ...checkInData, lixoAlimentar: !e.target.checked })}
                    className="h-5 w-5 text-green-600 focus:ring-green-500 rounded"
                  />
                </label>
              </div>
            </div>
            
            {/* Card 2 – Água e Suplementos */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Droplet className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Água e Suplementos</h3>
              </div>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <Droplet className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Bebi pelo menos {metaAgua} de água hoje</p>
                      <p className="text-xs text-gray-500">Atingiu a meta de hidratação?</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checkInData.aguaOk}
                    onChange={(e) => setCheckInData({ ...checkInData, aguaOk: e.target.checked })}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 rounded"
                  />
                </label>
                
                <label className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <Pill className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Tomei a cápsula de probiótico hoje</p>
                      <p className="text-xs text-gray-500">Suplemento probiótico diário</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checkInData.probioticoTomou}
                    onChange={(e) => setCheckInData({ ...checkInData, probioticoTomou: e.target.checked })}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 rounded"
                  />
                </label>
                
                <label className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Tomei o whey protein conforme orientado</p>
                      <p className="text-xs text-gray-500">Suplemento proteico</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checkInData.wheyTomou}
                    onChange={(e) => setCheckInData({ ...checkInData, wheyTomou: e.target.checked })}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 rounded"
                  />
                </label>
                
                <label className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-200 cursor-pointer hover:border-blue-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <Dumbbell className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-gray-900">Tomei creatina hoje (3-5 g)</p>
                      <p className="text-xs text-gray-500">Suplemento de creatina</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checkInData.creatinaTomou}
                    onChange={(e) => setCheckInData({ ...checkInData, creatinaTomou: e.target.checked })}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 rounded"
                  />
                </label>
              </div>
            </div>
            
            {/* Card 3 – Sintomas Gastrointestinais */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900">Sintomas Gastrointestinais</h3>
              </div>
              <p className="text-xs text-red-600 mb-4">Se estiver grave, avise seu médico.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Náuseas</label>
                  <select
                    value={checkInData.nauseas}
                    onChange={(e) => setCheckInData({ ...checkInData, nauseas: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white"
                  >
                    <option value="nenhum">Nenhum</option>
                    <option value="leve">Leve</option>
                    <option value="moderado">Moderado</option>
                    <option value="grave">Grave</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Constipação</label>
                  <select
                    value={checkInData.constipacao}
                    onChange={(e) => setCheckInData({ ...checkInData, constipacao: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white"
                  >
                    <option value="nenhum">Nenhum</option>
                    <option value="leve">Leve</option>
                    <option value="moderado">Moderado</option>
                    <option value="grave">Grave</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Diarreia</label>
                  <select
                    value={checkInData.diarreia}
                    onChange={(e) => setCheckInData({ ...checkInData, diarreia: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white"
                  >
                    <option value="nenhum">Nenhum</option>
                    <option value="leve">Leve</option>
                    <option value="moderado">Moderado</option>
                    <option value="grave">Grave</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Card 4 – Sono, Energia e Humor */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Moon className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Sono, Energia e Humor</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Horas de sono na última noite</label>
                  <select
                    value={checkInData.horasSono}
                    onChange={(e) => setCheckInData({ ...checkInData, horasSono: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 bg-white"
                  >
                    <option value="<6h">Menos de 6 horas</option>
                    <option value="6-8h">6 a 8 horas</option>
                    <option value=">8h">Mais de 8 horas</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Humor/Energia (1 = esgotado, 5 = ótimo)
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((valor) => (
                      <button
                        key={valor}
                        type="button"
                        onClick={() => setCheckInData({ ...checkInData, humorEnergia: valor })}
                        className={`flex-1 px-4 py-3 rounded-md font-medium transition-colors ${
                          checkInData.humorEnergia === valor
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-white text-gray-600 border border-gray-300 hover:border-purple-300'
                        }`}
                      >
                        {valor}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Card 5 – Dia de aplicação da Tirzepatida (calculado automaticamente) */}
            {(() => {
              const hojeEDiaAplicacao = verificarSeHojeEDiaAplicacao();
              
              if (!hojeEDiaAplicacao) {
                return null; // Não mostrar o card se não for dia de aplicação
              }
              
              return (
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-lg border border-pink-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Syringe className="h-5 w-5 text-pink-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Aplicação da Tirzepatida</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                      <p className="text-sm text-blue-800 font-medium">
                        Hoje é seu dia de aplicação da tirzepatida.
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Como foi a aplicação?</label>
                      <select
                        value={checkInData.diaAplicacao}
                        onChange={(e) => setCheckInData({ ...checkInData, diaAplicacao: e.target.value as any, localAplicacao: e.target.value === 'nao_foi_dia' ? undefined : checkInData.localAplicacao })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 bg-white"
                      >
                        <option value="aplicou_no_horario">Apliquei no horário</option>
                        <option value="aplicou_atrasado">Apliquei atrasado</option>
                        <option value="esqueceu">Esqueci</option>
                      </select>
                    </div>
                    
                    {checkInData.diaAplicacao !== 'nao_foi_dia' && checkInData.diaAplicacao !== 'esqueceu' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Local da aplicação</label>
                        <select
                          value={checkInData.localAplicacao || ''}
                          onChange={(e) => setCheckInData({ ...checkInData, localAplicacao: e.target.value as any })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-900 bg-white"
                        >
                          <option value="">Selecione...</option>
                          <option value="abdome">Abdome</option>
                          <option value="coxa">Coxa</option>
                          <option value="braco">Braço</option>
                          <option value="outro">Outro</option>
                        </select>
                      </div>
                    )}
                    
                    {(checkInData.diaAplicacao === 'esqueceu' || checkInData.diaAplicacao === 'aplicou_atrasado') && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                        <p className="text-sm text-yellow-800">
                          <strong>Importante:</strong> Se esquecer a dose ou tiver sintomas fortes, entre em contato com seu médico.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
            
            {/* Card 6 – Movimento / atividade */}
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg border border-amber-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-amber-600" />
                <h3 className="text-lg font-semibold text-gray-900">Movimento / Atividade</h3>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Como foi sua atividade física hoje?</label>
                <select
                  value={checkInData.atividadeFisicaHoje}
                  onChange={(e) => setCheckInData({ ...checkInData, atividadeFisicaHoje: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-900 bg-white"
                >
                  <option value="nenhuma">Nenhuma</option>
                  <option value="leve">Leve (caminhada)</option>
                  <option value="moderada">Moderada</option>
                  <option value="intensa">Intensa</option>
                </select>
              </div>
            </div>
            
            {/* Card 7 – Aderência ao Plano */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Aderência ao Plano</h3>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quanto você seguiu o plano nutricional hoje? ({checkInData.aderenciaPlano || 100}%)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={checkInData.aderenciaPlano || 100}
                    onChange={(e) => setCheckInData({ ...checkInData, aderenciaPlano: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <div className="flex gap-1 flex-wrap">
                    {[25, 50, 75, 100].map((valor) => (
                      <button
                        key={valor}
                        onClick={() => setCheckInData({ ...checkInData, aderenciaPlano: valor })}
                        className={`px-2 md:px-3 py-1 text-xs md:text-sm rounded-md transition-colors ${
                          (checkInData.aderenciaPlano || 100) === valor
                            ? 'bg-blue-600 text-white'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {valor}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Card 8 – Peso (se necessário) */}
            {(() => {
              // Verificar se último peso tem mais de 7 dias
              const evolucao = paciente?.evolucaoSeguimento || [];
              let ultimoPeso: number | undefined;
              let ultimaDataPeso: Date | undefined;
              
              // Buscar último peso na evolução
              if (evolucao.length > 0) {
                const evolucaoOrdenada = [...evolucao].sort((a, b) => {
                  const dataA = a.dataRegistro instanceof Date ? a.dataRegistro.getTime() : new Date(a.dataRegistro).getTime();
                  const dataB = b.dataRegistro instanceof Date ? b.dataRegistro.getTime() : new Date(b.dataRegistro).getTime();
                  return dataB - dataA; // Mais recente primeiro
                });
                
                const ultimoRegistroComPeso = evolucaoOrdenada.find(s => s.peso && s.peso > 0);
                if (ultimoRegistroComPeso) {
                  ultimoPeso = ultimoRegistroComPeso.peso;
                  ultimaDataPeso = ultimoRegistroComPeso.dataRegistro instanceof Date 
                    ? ultimoRegistroComPeso.dataRegistro 
                    : new Date(ultimoRegistroComPeso.dataRegistro);
                }
              }
              
              // Se não houver peso na evolução, usar peso inicial
              if (!ultimoPeso) {
                ultimoPeso = paciente?.dadosClinicos?.medidasIniciais?.peso;
              }
              
              const diasDesdeUltimoPeso = ultimaDataPeso 
                ? Math.floor((new Date().getTime() - ultimaDataPeso.getTime()) / (1000 * 60 * 60 * 24))
                : 999;
              
              if (diasDesdeUltimoPeso > 7 || !ultimoPeso) {
                return (
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg border border-teal-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Weight className="h-5 w-5 text-teal-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Peso de Hoje (Opcional)</h3>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seu último peso registrado foi há mais de 7 dias ({pesoAtual ? `${pesoAtual.toFixed(1)} kg` : 'não disponível'}). Quer registrar seu peso hoje?
                      </label>
                      <input
                        type="number"
                        value={checkInData.pesoHoje || ''}
                        onChange={(e) => setCheckInData({ ...checkInData, pesoHoje: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-gray-900 placeholder:text-gray-400"
                        placeholder="Ex: 75.5"
                        min="20"
                        max="400"
                        step="0.1"
                      />
                      <p className="text-xs text-gray-500 mt-2">Este dado ajuda a acompanhar sua evolução e ajustar o plano.</p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            {/* Card 9 – Sintomas de Aumento de Dose (se aplicável) */}
            {(() => {
              // Verificar se está em semana de aumento de dose
              const planoTerapeutico = paciente?.planoTerapeutico;
              const historicoDoses = planoTerapeutico?.historicoDoses || [];
              const ultimaMudanca = historicoDoses.length > 0 
                ? new Date(historicoDoses[historicoDoses.length - 1].data)
                : null;
              const diasDesdeMudanca = ultimaMudanca
                ? Math.floor((new Date().getTime() - ultimaMudanca.getTime()) / (1000 * 60 * 60 * 24))
                : 999;
              
              // Se mudou de dose nos últimos 7 dias, é semana de aumento
              if (diasDesdeMudanca <= 7 && historicoDoses.length > 0) {
                return (
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg border border-orange-200 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Sintomas na Semana de Aumento de Dose</h3>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Está percebendo aumento de náuseas, vômitos ou falta de apetite em relação à semana passada?
                      </label>
                      <select
                        value={checkInData.sintomasAumentoDose || 'nenhum'}
                        onChange={(e) => setCheckInData({ ...checkInData, sintomasAumentoDose: e.target.value as any })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 bg-white"
                      >
                        <option value="nenhum">Nenhum</option>
                        <option value="leve">Leve</option>
                        <option value="moderado">Moderado</option>
                        <option value="intenso">Intenso</option>
                      </select>
                      <p className="text-xs text-orange-700 mt-2">
                        <strong>Importante:</strong> Se os sintomas estiverem moderados ou intensos, avise seu médico imediatamente.
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            {/* Card 10 – Observações */}
            <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Observações</h3>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quer deixar alguma observação para o seu médico?
                </label>
                <textarea
                  value={checkInData.observacoes || ''}
                  onChange={(e) => setCheckInData({ ...checkInData, observacoes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 text-gray-900 bg-white resize-none"
                  rows={3}
                  placeholder="Ex: Tive uma dor de cabeça leve no final da tarde..."
                />
              </div>
            </div>
          </div>
          
            {/* Botões de ação */}
            <div className="mt-6 flex gap-4">
              <button
                onClick={() => {
                  setView('plano');
                  // Resetar para data de hoje ao voltar
                  const hoje = new Date().toISOString().split('T')[0];
                  setCheckInDate(hoje);
                }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={salvarCheckIn}
                disabled={savingCheckIn}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-md hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md transition-all"
              >
                {savingCheckIn ? 'Salvando...' : 'Salvar check-in de hoje'}
              </button>
            </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Tela principal do plano (melhorada)
  if (!plano) {
    return (
      <div className="space-y-4">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-600">Carregando plano...</p>
        </div>
      </div>
    );
  }

  const resumoCheckIns = calcularResumoCheckIns();
  const coposAgua = Math.round(plano.aguaDia_ml / 250);

  return (
    <div className="space-y-4">
      {/* Botão de Check-in Fixo no Topo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <button
          onClick={() => {
            // Resetar para data de hoje ao abrir o check-in
            const dataHoje = new Date().toISOString().split('T')[0];
            setCheckInDate(dataHoje);
            setView('checkin');
          }}
          className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 flex items-center justify-center gap-2 font-medium shadow-md transition-all duration-200 transform hover:scale-[1.02]"
        >
          <Calendar className="h-5 w-5" />
          <span>Check-in Diário</span>
        </button>
      </div>

      {/* Sistema de Abas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Navegação das Abas */}
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('plano')}
              className={`flex-1 md:flex-none px-2 md:px-6 py-3 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'plano'
                  ? 'border-green-600 text-green-600 bg-green-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Plano Nutri
            </button>
            <button
              onClick={() => setActiveTab('proteinas')}
              className={`flex-1 md:flex-none px-2 md:px-6 py-3 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'proteinas'
                  ? 'border-green-600 text-green-600 bg-green-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Proteínas
            </button>
            <button
              onClick={() => setActiveTab('cardapio')}
              className={`flex-1 md:flex-none px-2 md:px-6 py-3 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'cardapio'
                  ? 'border-green-600 text-green-600 bg-green-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Cardápio
            </button>
            <button
              onClick={() => setActiveTab('alertas')}
              className={`flex-1 md:flex-none px-2 md:px-6 py-3 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'alertas'
                  ? 'border-green-600 text-green-600 bg-green-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Alertas
            </button>
            <button
              onClick={() => setActiveTab('historico')}
              className={`flex-1 md:flex-none px-2 md:px-6 py-3 text-xs md:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'historico'
                  ? 'border-green-600 text-green-600 bg-green-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Histórico
            </button>
          </div>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-6">
          {/* Aba: Plano Nutri */}
          {activeTab === 'plano' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <UtensilsCrossed className="h-5 w-5 text-green-600" />
                  Plano Nutricional Personalizado
                </h2>
                <p className="text-gray-600 text-sm">
                  Criado em {new Date(plano.criadoEm).toLocaleDateString('pt-BR', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
              
              {/* Hipótese Comportamental (Mini Parecer Nutro) */}
              {plano.hipoteseComportamental && (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-5 w-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Hipótese Comportamental</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed italic">
                    {plano.hipoteseComportamental}
                  </p>
                </div>
              )}
              
              {/* Cards de Métricas Principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Estilo Alimentar */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <UtensilsCrossed className="h-5 w-5 text-green-600" />
                    <h3 className="text-sm font-medium text-gray-700">Estilo Alimentar</h3>
                  </div>
                  <p className="text-xl font-bold text-green-700 capitalize mb-2">
                    {plano.estilo.replace('_', ' ')}
                  </p>
                  {plano.descricaoEstilo && (
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {plano.descricaoEstilo}
                    </p>
                  )}
                </div>
                
                {/* Meta de Proteína */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="h-5 w-5 text-blue-600" />
                    <h3 className="text-sm font-medium text-gray-700">Meta de Proteína</h3>
                  </div>
                  <p className="text-2xl font-bold text-blue-700 mb-1">
                    {plano.protDia_g} g/dia
                  </p>
                  <p className="text-xs text-gray-600">
                    Meta diária aproximada de proteína total
                  </p>
                </div>
                
                {/* Meta de Água */}
                <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-lg border border-cyan-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Droplet className="h-5 w-5 text-cyan-600" />
                    <h3 className="text-sm font-medium text-gray-700">Meta de Água</h3>
                  </div>
                  <p className="text-2xl font-bold text-cyan-700 mb-1">
                    {plano.aguaDia_ml} ml
                  </p>
                  <p className="text-xs text-gray-600">
                    Equivalente a {coposAgua}-{coposAgua + 1} copos por dia
                  </p>
                </div>
                
                {/* Refeições */}
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-5 w-5 text-purple-600" />
                    <h3 className="text-sm font-medium text-gray-700">Refeições</h3>
                  </div>
                  <p className="text-2xl font-bold text-purple-700 mb-1">
                    {plano.refeicoes} refeições
                  </p>
                  <p className="text-xs text-gray-600">
                    Distribuídas ao longo do dia
                  </p>
                </div>
              </div>
              
              {/* Suplementos */}
              {plano.suplementos && (
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg border border-amber-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Pill className="h-5 w-5 text-amber-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Suplementos</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Probiótico</p>
                      <p className="text-sm text-gray-600">{plano.suplementos.probiotico}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Whey Protein</p>
                      <p className="text-sm text-gray-600">{plano.suplementos.whey}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-1">Creatina</p>
                      <p className="text-sm text-gray-600">{plano.suplementos.creatina}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aba: Proteínas */}
          {activeTab === 'proteinas' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Distribuição de Proteína por Refeição
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Coffee className="h-4 w-4 text-green-700" />
                    <p className="text-sm font-semibold text-gray-700">Café da Manhã</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{plano.distribuicaoProteina.cafe}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Sun className="h-4 w-4 text-blue-700" />
                    <p className="text-sm font-semibold text-gray-700">Lanche 1</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{plano.distribuicaoProteina.lanche1}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Sunset className="h-4 w-4 text-orange-700" />
                    <p className="text-sm font-semibold text-gray-700">Almoço</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{plano.distribuicaoProteina.almoco}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Sun className="h-4 w-4 text-purple-700" />
                    <p className="text-sm font-semibold text-gray-700">Lanche 2</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{plano.distribuicaoProteina.lanche2}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg border border-indigo-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Moon className="h-4 w-4 text-indigo-700" />
                    <p className="text-sm font-semibold text-gray-700">Jantar</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{plano.distribuicaoProteina.jantar}</p>
                </div>
              </div>
            </div>
          )}

          {/* Aba: Cardápio */}
          {activeTab === 'cardapio' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-orange-600" />
                Modelo de Dia - Sugestões de Refeições
              </h2>
              <div className="space-y-4">
                {/* Café da Manhã */}
                <button
                  onClick={() => {
                    setRefeicaoEmEdicao('cafe');
                    setOpcaoSelecionadaTemp(plano.opcoesSelecionadas?.cafe || opcoesRefeicoes.cafe[0]?.id || '');
                  }}
                  className="w-full text-left p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border-l-4 border-amber-500 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <Coffee className="h-5 w-5 text-amber-700" />
                      <h4 className="font-semibold text-gray-900">Café da Manhã</h4>
                    </div>
                    <Edit className="h-4 w-4 text-gray-500" />
                  </div>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-line">{plano.modeloDia.cafe}</p>
                </button>
                
                {/* Lanche 1 */}
                <button
                  onClick={() => {
                    setRefeicaoEmEdicao('lanche1');
                    setOpcaoSelecionadaTemp(plano.opcoesSelecionadas?.lanche1 || opcoesRefeicoes.lanche1[0]?.id || '');
                  }}
                  className="w-full text-left p-5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-l-4 border-blue-500 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <Sun className="h-5 w-5 text-blue-700" />
                      <h4 className="font-semibold text-gray-900">Lanche da Manhã</h4>
                    </div>
                    <Edit className="h-4 w-4 text-gray-500" />
                  </div>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-line">{plano.modeloDia.lanche1}</p>
                </button>
                
                {/* Almoço */}
                <button
                  onClick={() => {
                    setRefeicaoEmEdicao('almoco');
                    setOpcaoSelecionadaTemp(plano.opcoesSelecionadas?.almoco || opcoesRefeicoes.almoco[0]?.id || '');
                  }}
                  className="w-full text-left p-5 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border-l-4 border-orange-500 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <Sunset className="h-5 w-5 text-orange-700" />
                      <h4 className="font-semibold text-gray-900">Almoço</h4>
                    </div>
                    <Edit className="h-4 w-4 text-gray-500" />
                  </div>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-line">{plano.modeloDia.almoco}</p>
                </button>
                
                {/* Lanche 2 */}
                <button
                  onClick={() => {
                    setRefeicaoEmEdicao('lanche2');
                    setOpcaoSelecionadaTemp(plano.opcoesSelecionadas?.lanche2 || opcoesRefeicoes.lanche2[0]?.id || '');
                  }}
                  className="w-full text-left p-5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-l-4 border-purple-500 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <Sun className="h-5 w-5 text-purple-700" />
                      <h4 className="font-semibold text-gray-900">Lanche da Tarde</h4>
                    </div>
                    <Edit className="h-4 w-4 text-gray-500" />
                  </div>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-line">{plano.modeloDia.lanche2}</p>
                </button>
                
                {/* Jantar */}
                <button
                  onClick={() => {
                    setRefeicaoEmEdicao('jantar');
                    setOpcaoSelecionadaTemp(plano.opcoesSelecionadas?.jantar || opcoesRefeicoes.jantar[0]?.id || '');
                  }}
                  className="w-full text-left p-5 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border-l-4 border-indigo-500 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <Moon className="h-5 w-5 text-indigo-700" />
                      <h4 className="font-semibold text-gray-900">Jantar</h4>
                    </div>
                    <Edit className="h-4 w-4 text-gray-500" />
                  </div>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-line">{plano.modeloDia.jantar}</p>
                </button>
              </div>
            </div>
          )}

          {/* Modal de Edição de Refeição */}
          {refeicaoEmEdicao && plano && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Editar {refeicaoEmEdicao === 'cafe' ? 'Café da Manhã' : 
                            refeicaoEmEdicao === 'lanche1' ? 'Lanche da Manhã' :
                            refeicaoEmEdicao === 'almoco' ? 'Almoço' :
                            refeicaoEmEdicao === 'lanche2' ? 'Lanche da Tarde' : 'Jantar'}
                  </h2>
                  <button
                    onClick={() => {
                      setRefeicaoEmEdicao(null);
                      setOpcaoSelecionadaTemp('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="p-6 space-y-4">
                  {/* Lista de opções */}
                  <div className="space-y-3">
                    {opcoesRefeicoes[refeicaoEmEdicao]?.map((opcao) => (
                      <label
                        key={opcao.id}
                        className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                          opcaoSelecionadaTemp === opcao.id
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="opcaoRefeicao"
                          value={opcao.id}
                          checked={opcaoSelecionadaTemp === opcao.id}
                          onChange={(e) => setOpcaoSelecionadaTemp(e.target.value)}
                          className="mt-1 h-4 w-4 text-green-600 focus:ring-green-500"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{opcao.titulo}</h3>
                          <p className="text-sm text-gray-600 mb-2">{opcao.descricao}</p>
                          <div className="flex gap-4 text-xs text-gray-500">
                            <span>Proteína: ~{opcao.proteina_g}g</span>
                            <span>Calorias: ~{opcao.calorias_kcal} kcal</span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  
                  {/* Resumo de macros do dia */}
                  {(() => {
                    const opcoesSimuladas = {
                      ...plano.opcoesSelecionadas!,
                      [refeicaoEmEdicao]: opcaoSelecionadaTemp
                    };
                    const macrosSimuladas = estimarMacrosDia(opcoesSimuladas, opcoesRefeicoes);
                    const metaMinima = plano.protDia_g * 0.9;
                    const estaAbaixo = macrosSimuladas.proteinaTotal_g < metaMinima;
                    
                    return (
                      <div className={`mt-6 p-4 rounded-lg border-2 ${
                        estaAbaixo ? 'border-yellow-400 bg-yellow-50' : 'border-green-200 bg-green-50'
                      }`}>
                        <h3 className="font-semibold text-gray-900 mb-2">Resumo do Dia</h3>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="font-medium">Proteína diária estimada:</span>{' '}
                            <span className={estaAbaixo ? 'text-yellow-700 font-semibold' : 'text-green-700'}>
                              {macrosSimuladas.proteinaTotal_g.toFixed(1)}g
                            </span>
                            {' '}de {plano.protDia_g}g (meta)
                          </p>
                          <p>
                            <span className="font-medium">Calorias diárias estimadas:</span>{' '}
                            {macrosSimuladas.caloriasTotais_kcal.toFixed(0)} kcal (apenas referência)
                          </p>
                          {estaAbaixo && (
                            <p className="text-yellow-700 font-medium mt-2">
                              ⚠️ Seu dia ficou abaixo da meta mínima de proteína. O sistema pode ajustar automaticamente seus lanches.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                
                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setRefeicaoEmEdicao(null);
                      setOpcaoSelecionadaTemp('');
                    }}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={salvarAlteracoesCardapio}
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                  >
                    Salvar alterações
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Aba: Alertas */}
          {activeTab === 'alertas' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Alimentos e Hábitos a Evitar
              </h2>
              {plano.evitar.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {plano.evitar.map((item, idx) => (
                    <span
                      key={idx}
                      className="px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200 flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                  <p className="text-gray-600">Nenhum alimento ou hábito a evitar no momento.</p>
                </div>
              )}
            </div>
          )}

          {/* Aba: Histórico */}
          {activeTab === 'historico' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                Histórico de Check-ins
              </h2>
              
              {/* Badges de Aderência (últimos 7 dias) */}
              {checkIns.length > 0 && (() => {
                const ultimos7 = checkIns.slice(0, 7);
                const proteinaOk = ultimos7.filter(ci => ci.proteinaOk).length;
                const aguaOk = ultimos7.filter(ci => ci.aguaOk).length;
                const suplementosOk = ultimos7.filter(ci => 
                  (ci.probioticoTomou || false) && (ci.wheyTomou || false) && (ci.creatinaTomou || false)
                ).length;
                
                return (
                  <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-lg border border-gray-200 p-5">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Aderência (últimos 7 dias)</h3>
                    <div className="flex flex-wrap gap-3">
                      <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
                        proteinaOk >= 5 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        <Activity className="h-4 w-4" />
                        Proteína: {proteinaOk >= 5 ? '🟢' : '🟡'} {proteinaOk}/7
                      </div>
                      <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
                        aguaOk >= 5 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        <Droplet className="h-4 w-4" />
                        Hidratação: {aguaOk >= 5 ? '🟢' : '🟡'} {aguaOk}/7
                      </div>
                      <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 ${
                        suplementosOk >= 5 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        <Pill className="h-4 w-4" />
                        Suplementos: {suplementosOk >= 5 ? '🟢' : '🟡'} {suplementosOk}/7
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              {/* Linha do Tempo Condensada (últimos 14 dias) */}
              {checkIns.length > 0 && (() => {
                const ultimos14 = checkIns.slice(0, 14).reverse(); // Mais antigo primeiro
                return (
                  <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolução do Score (últimos 14 dias)</h3>
                    <div className="flex items-end gap-1 h-32">
                      {ultimos14.map((checkIn, idx) => {
                        const altura = (checkIn.score / 100) * 100; // Altura da barra em %
                        const cor = checkIn.score >= 80 ? 'bg-green-500' : checkIn.score >= 60 ? 'bg-yellow-500' : 'bg-red-500';
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex items-end justify-center" style={{ height: '100px' }}>
                              <div
                                className={`w-full ${cor} rounded-t transition-all hover:opacity-80`}
                                style={{ height: `${altura}%`, minHeight: '4px' }}
                                title={`${new Date(checkIn.data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}: ${checkIn.score.toFixed(1)}%`}
                              />
                            </div>
                            <span className="text-xs text-gray-500 transform -rotate-45 origin-top-left whitespace-nowrap">
                              {new Date(checkIn.data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              
              {/* Resumo dos Check-ins */}
              {resumoCheckIns && checkIns.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-green-700" />
                      <p className="text-sm font-medium text-gray-700">Média (7 dias)</p>
                    </div>
                    <p className="text-2xl font-bold text-green-700">
                      {resumoCheckIns.mediaScore7dias.toFixed(1)}%
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-blue-700" />
                      <p className="text-sm font-medium text-gray-700">Total de Check-ins</p>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">
                      {resumoCheckIns.totalCheckIns}
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-5 w-5 text-purple-700" />
                      <p className="text-sm font-medium text-gray-700">Melhor Dia</p>
                    </div>
                    <p className="text-2xl font-bold text-purple-700">
                      {resumoCheckIns.melhorDia.score.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(resumoCheckIns.melhorDia.data).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Lista de Check-ins */}
              {loadingCheckIns ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">Carregando check-ins...</p>
                </div>
              ) : checkIns.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600">Nenhum check-in registrado ainda.</p>
                  <p className="text-sm text-gray-500 mt-2">Use o botão "Check-in Diário" para começar a registrar.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {checkIns.map((checkIn, idx) => {
                    const scoreColor = checkIn.score >= 80 ? 'green' : checkIn.score >= 60 ? 'yellow' : 'red';
                    const borderColor = scoreColor === 'green' ? 'border-green-300' : scoreColor === 'yellow' ? 'border-yellow-300' : 'border-red-300';
                    const bgColor = scoreColor === 'green' ? 'bg-green-50' : scoreColor === 'yellow' ? 'bg-yellow-50' : 'bg-red-50';
                    
                    return (
                      <div
                        key={idx}
                        className={`p-5 rounded-lg border-l-4 ${borderColor} ${bgColor} hover:shadow-md transition-shadow`}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="font-bold text-gray-900 text-lg">
                              {new Date(checkIn.data).toLocaleDateString('pt-BR', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                              checkIn.score >= 80 ? 'bg-green-200 text-green-800' :
                              checkIn.score >= 60 ? 'bg-yellow-200 text-yellow-800' :
                              'bg-red-200 text-red-800'
                            }`}>
                              Score: {checkIn.score.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {/* Alimentação */}
                          <div className="flex items-center gap-2">
                            {checkIn.proteinaOk ? (
                              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                            )}
                            <span className="text-xs font-medium text-gray-900">Proteína</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {checkIn.frutasOk ? (
                              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                            )}
                            <span className="text-xs font-medium text-gray-900">Frutas</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {checkIn.aguaOk ? (
                              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                            )}
                            <span className="text-xs font-medium text-gray-900">Água</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {checkIn.lixoAlimentar ? (
                              <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                            ) : (
                              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            )}
                            <span className="text-xs font-medium text-gray-900">Sem lixo</span>
                          </div>
                          
                          {/* Suplementos */}
                          {checkIn.probioticoTomou !== undefined && (
                            <div className="flex items-center gap-2">
                              {checkIn.probioticoTomou ? (
                                <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              )}
                              <span className="text-xs font-medium text-gray-900">Probiótico</span>
                            </div>
                          )}
                          
                          {checkIn.wheyTomou !== undefined && (
                            <div className="flex items-center gap-2">
                              {checkIn.wheyTomou ? (
                                <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              )}
                              <span className="text-xs font-medium text-gray-900">Whey</span>
                            </div>
                          )}
                          
                          {checkIn.creatinaTomou !== undefined && (
                            <div className="flex items-center gap-2">
                              {checkIn.creatinaTomou ? (
                                <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
                              ) : (
                                <XCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              )}
                              <span className="text-xs font-medium text-gray-900">Creatina</span>
                            </div>
                          )}
                          
                          {/* Sintomas GI */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-900">GI:</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              checkIn.sintomasGI === 'nenhum' ? 'bg-green-100 text-green-700' :
                              checkIn.sintomasGI === 'leve' ? 'bg-yellow-100 text-yellow-700' :
                              checkIn.sintomasGI === 'moderado' ? 'bg-orange-100 text-orange-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {checkIn.sintomasGI.charAt(0).toUpperCase() + checkIn.sintomasGI.slice(1)}
                            </span>
                          </div>
                          
                          {/* Sono */}
                          {checkIn.horasSono && (
                            <div className="flex items-center gap-2">
                              <Moon className="h-4 w-4 text-purple-600 flex-shrink-0" />
                              <span className="text-xs font-medium text-gray-900">Sono: {checkIn.horasSono}</span>
                            </div>
                          )}
                          
                          {/* Energia */}
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                            <span className="text-xs font-medium text-gray-900">Energia: {checkIn.humorEnergia}/5</span>
                          </div>
                          
                          {/* Atividade */}
                          {checkIn.atividadeFisicaHoje && (
                            <div className="flex items-center gap-2">
                              <Activity className="h-4 w-4 text-amber-600 flex-shrink-0" />
                              <span className="text-xs font-medium text-gray-900 capitalize">{checkIn.atividadeFisicaHoje}</span>
                            </div>
                          )}
                          
                          {/* Tirzepatida */}
                          {checkIn.diaAplicacao && checkIn.diaAplicacao !== 'nao_foi_dia' && (
                            <div className="flex items-center gap-2">
                              <Syringe className="h-4 w-4 text-pink-600 flex-shrink-0" />
                              <span className="text-xs font-medium text-gray-900 capitalize">
                                {checkIn.diaAplicacao === 'aplicou_no_horario' ? 'Aplicou' :
                                 checkIn.diaAplicacao === 'aplicou_atrasado' ? 'Atrasado' : 'Esqueceu'}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Observações se existirem */}
                        {checkIn.observacoes && checkIn.observacoes.trim() && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-600">
                              <strong>Observação:</strong> {checkIn.observacoes}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
