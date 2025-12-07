'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, Timestamp, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PacienteCompleto } from '@/types/obesidade';
import { 
  UtensilsCrossed, Calendar, AlertCircle, CheckCircle, XCircle, 
  Droplet, Apple, Activity, Target, Clock, Moon, Coffee, 
  Sun, Sunset, TrendingUp, Zap, Heart
} from 'lucide-react';

// ============================================
// TIPOS E INTERFACES
// ============================================

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
  evitar: string[];
  criadoEm: Date;
  descricaoEstilo?: string; // Campo opcional para descrição do estilo
}

interface CheckInDiario {
  proteinaOk: boolean;
  frutasOk: boolean;
  aguaOk: boolean;
  sintomasGI: 'nenhum' | 'leve' | 'moderado' | 'grave';
  lixoAlimentar: boolean;
  humorEnergia: number;
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
}

interface NutriContentProps {
  paciente: PacienteCompleto;
  setPaciente?: (paciente: PacienteCompleto) => void;
}

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
    sintomasGI: 'nenhum'
  });
  const [peso, setPeso] = useState<number | null>(null);
  const [altura, setAltura] = useState<number | null>(null);
  const [showPesoAlturaForm, setShowPesoAlturaForm] = useState(false);
  const [plano, setPlano] = useState<PlanoNutricional | null>(null);
  const [checkInData, setCheckInData] = useState<CheckInDiario>({
    proteinaOk: false,
    frutasOk: false,
    aguaOk: false,
    sintomasGI: 'nenhum',
    lixoAlimentar: false,
    humorEnergia: 3,
    score: 0,
    data: new Date().toISOString().split('T')[0]
  });
  const [savingCheckIn, setSavingCheckIn] = useState(false);
  const [checkIns, setCheckIns] = useState<CheckInDiario[]>([]);
  const [loadingCheckIns, setLoadingCheckIns] = useState(false);

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
          setPlano({
            ...planoData,
            criadoEm: planoData.criadoEm?.toDate() || new Date()
          } as PlanoNutricional);
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
    // Wizard agora tem 6 passos
    if (wizardStep < 6) {
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
    const pesoKg = medidasIniciais?.peso || 0;
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
    
    // Geração do modelo de dia (melhorado com exemplos específicos)
    const modeloDia = gerarModeloDia(estilo);
    
    // Lista de alimentos a evitar
    const evitar: string[] = ['fritos', 'ultraprocessados'];
    if (wizardData.comportamentosAlimentares.includes('álcool frequente')) {
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
    
    const novoPlano: PlanoNutricional = {
      estilo,
      protDia_g: Math.round(protDia_g),
      aguaDia_ml: Math.round(aguaDia_ml),
      refeicoes: 5,
      distribuicaoProteina,
      modeloDia,
      evitar,
      criadoEm: new Date(),
      descricaoEstilo
    };
    
    await salvarPlanoNutricional(novoPlano);
  };

  // Função aprimorada para gerar modelo de dia com exemplos específicos
  const gerarModeloDia = (estilo: PlanoNutricional['estilo']): PlanoNutricional['modeloDia'] => {
    switch (estilo) {
      case 'digestiva':
        return {
          cafe: 'Opção 1: 2 ovos cozidos + 1 fatia de pão branco sem glúten + 1 banana prata madura. Ou: 1 pote de iogurte natural (170g) + 1/2 xícara de frutas cozidas (maçã ou pera) + 1 colher de chá de mel.',
          almoco: '120-150g de peixe grelhado (pescada, tilápia ou salmão) + 1/2 prato de legumes cozidos (abobrinha, cenoura, chuchu) + 1/4 prato de arroz branco ou batata cozida. Evitar saladas cruas e fibras insolúveis.',
          jantar: '100-120g de frango desfiado cozido + 1/2 prato de purê de abóbora ou batata doce + salada morna (espinafre refogado). Preparações cozidas e sem temperos fortes.',
          lanche1: '1 banana prata madura + 1 xícara de chá de camomila ou erva-doce. Ou: 1 pote de iogurte natural (170g) sem lactose se necessário.',
          lanche2: '1 pote de iogurte natural (170g) + 1/2 xícara de fruta cozida. Ou: 1 fatia de queijo branco + 1 fatia de pão branco sem glúten.'
        };
      
      case 'plant_based':
        return {
          cafe: 'Opção 1: 1 xícara de aveia em flocos + 1/2 xícara de frutas vermelhas + 1 colher de sopa de sementes de chia + 1 colher de sopa de amêndoas picadas. Ou: 2 fatias de pão integral + 2 colheres de sopa de pasta de amendoim + 1 banana + 1 copo de bebida vegetal (soja ou amêndoa).',
          almoco: '1 xícara de lentilha cozida (ou grão-de-bico) + 1/2 xícara de quinoa cozida + salada colorida (folhas, tomate, pepino) + 1 colher de sopa de azeite + 1/4 de abacate. Proteína vegetal completa com todos os aminoácidos essenciais.',
          jantar: '1 xícara de grão-de-bico cozido + 1/2 prato de vegetais assados (berinjela, abobrinha, pimentão) + 1/2 xícara de batata doce assada + 1 colher de sopa de tahine. Ou: 150g de tofu grelhado + legumes salteados + arroz integral.',
          lanche1: 'Hummus caseiro (3 colheres de sopa) + palitos de cenoura, pepino e pimentão. Ou: 1 punhado de oleaginosas (castanhas, nozes, amêndoas) + 1 fruta.',
          lanche2: 'Smoothie proteico: 1 copo de bebida vegetal + 1 scoop de proteína vegetal em pó (30g) + 1/2 xícara de frutas congeladas + 1 colher de sopa de sementes de linhaça. Ou: 1 pote de iogurte vegetal + granola sem glúten + frutas.'
        };
      
      case 'mediterranea':
        return {
          cafe: 'Opção 1: 1 pote de iogurte grego (170g) + 1/2 xícara de frutas frescas (morangos, mirtilos) + 1 colher de sopa de azeite extra virgem + 1 colher de sopa de nozes picadas. Ou: 2 ovos mexidos + 1 fatia de pão integral + 1/4 de abacate + tomate e azeitonas.',
          almoco: '150g de salmão grelhado + salada mediterrânea (folhas, tomate, pepino, cebola roxa, azeitonas) + 1 colher de sopa de azeite + 1/4 prato de quinoa ou arroz integral. Ou: 120g de frango grelhado + legumes assados (berinjela, pimentão, abobrinha) + azeite.',
          jantar: '100-120g de peixe (sardinha, atum ou salmão) + 1 prato de salada verde + 1 colher de sopa de azeite + 1/2 xícara de grão-de-bico. Ou: frango grelhado + ratatouille (legumes cozidos) + azeite.',
          lanche1: '1 punhado de oleaginosas (castanhas, nozes, amêndoas) + 1 fruta fresca. Ou: 1 fatia de queijo branco + azeitonas + tomate cereja.',
          lanche2: '1 pote de iogurte grego (170g) + 1 colher de sopa de mel + 1 colher de sopa de nozes. Ou: 1 fatia de pão integral + pasta de azeitona + queijo branco.'
        };
      
      case 'rico_proteina':
        return {
          cafe: 'Opção 1: 2 ovos mexidos + 1 fatia de queijo branco (30g) + 1 fatia de peito de peru + 1 fruta pequena (maçã ou pêra). Ou: 1 pote de iogurte grego (170g) + 30g de whey protein + 1 colher de sopa de chia + 1/2 xícara de frutas vermelhas.',
          almoco: '120-150g de carne magra (patinho, alcatra ou maminha) grelhada + 1/2 prato de salada verde + 1/4 prato de carboidrato complexo (arroz integral, batata doce ou quinoa). Ou: 150g de peito de frango grelhado + legumes cozidos + 1/2 xícara de batata doce assada.',
          jantar: '120-150g de peito de frango ou peixe grelhado + 1 prato de salada colorida + 1 colher de sopa de azeite. Ou: 150g de carne magra + legumes salteados + 1/4 de abacate.',
          lanche1: '1 scoop de whey protein (30g) + 1 fruta + 1 punhado de castanhas. Ou: 1 pote de iogurte grego (170g) + 1 colher de sopa de proteína em pó + frutas.',
          lanche2: '1 lata de atum em água (120g) + 1 fatia de queijo cottage (50g) + 1 fruta. Ou: 2 ovos cozidos + 1 fatia de queijo branco + 1 punhado de oleaginosas.'
        };
      
      case 'low_carb_moderada':
        return {
          cafe: 'Opção 1: 2 ovos mexidos + 1/4 de abacate + 1 xícara de vegetais (espinafre, tomate, cogumelos) + 1 colher de sopa de azeite. Ou: 1 pote de iogurte grego (170g) + 1 colher de sopa de pasta de amendoim + 1/2 xícara de frutas vermelhas + 1 colher de sopa de sementes.',
          almoco: '120-150g de proteína magra (frango, peixe ou carne) grelhada + 1 prato de salada verde variada + 1 colher de sopa de azeite + 1/4 de abacate. Carboidrato reduzido, foco em proteína e gordura saudável.',
          jantar: '100-120g de peixe grelhado + 1 prato de legumes cozidos ou salteados (brócolis, couve-flor, abobrinha) + 1 colher de sopa de azeite. Ou: frango grelhado + salada verde + 1/4 de abacate.',
          lanche1: '1 punhado de oleaginosas (castanhas, nozes, amêndoas) + 1 fatia de queijo branco. Ou: 1 pote de iogurte grego (170g) + 1 colher de sopa de pasta de amendoim.',
          lanche2: '1 pote de iogurte grego (170g) + 1/2 xícara de frutas vermelhas + 1 colher de sopa de sementes de chia. Ou: 2 ovos cozidos + 1 punhado de castanhas + 1 fruta pequena.'
        };
      
      default:
        return {
          cafe: '2 ovos mexidos + 1 fatia de pão integral + 1 fruta + 1 xícara de café ou chá.',
          almoco: '120-150g de proteína (carne, frango ou peixe) + salada verde + 1/4 prato de arroz integral ou batata doce.',
          jantar: '100-120g de proteína magra + legumes cozidos + 1 colher de sopa de azeite.',
          lanche1: '1 pote de iogurte + frutas + 1 punhado de oleaginosas.',
          lanche2: '1 fatia de queijo + 1 fruta ou smoothie proteico.'
        };
    }
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
      checkInsSnapshot.forEach((doc) => {
        const data = doc.data();
        checkInsData.push({
          proteinaOk: data.proteinaOk || false,
          frutasOk: data.frutasOk || false,
          aguaOk: data.aguaOk || false,
          sintomasGI: data.sintomasGI || 'nenhum',
          lixoAlimentar: data.lixoAlimentar || false,
          humorEnergia: data.humorEnergia || 3,
          score: data.score || 0,
          data: data.data || doc.id
        });
      });
      
      setCheckIns(checkInsData);
    } catch (error) {
      console.error('Erro ao carregar check-ins:', error);
    } finally {
      setLoadingCheckIns(false);
    }
  };

  const calcularScoreCheckIn = (data: CheckInDiario): number => {
    const valores: number[] = [];
    valores.push(data.proteinaOk ? 1 : 0);
    valores.push(data.frutasOk ? 1 : 0);
    valores.push(data.aguaOk ? 1 : 0);
    valores.push(data.lixoAlimentar ? 0 : 1);
    valores.push(data.humorEnergia / 5);
    const sintomasMap: { [key: string]: number } = {
      'nenhum': 1,
      'leve': 0.75,
      'moderado': 0.5,
      'grave': 0.25
    };
    valores.push(sintomasMap[data.sintomasGI] || 0);
    const soma = valores.reduce((acc, val) => acc + val, 0);
    return Math.round((soma / valores.length) * 100) / 100;
  };

  const salvarCheckIn = async () => {
    if (!paciente || !paciente.id) {
      alert('Erro: Paciente não encontrado. Recarregue a página.');
      return;
    }

    try {
      setSavingCheckIn(true);
      const score = calcularScoreCheckIn(checkInData);
      const dataHoje = new Date().toISOString().split('T')[0];
      
      const checkInComScore = { 
        proteinaOk: checkInData.proteinaOk,
        frutasOk: checkInData.frutasOk,
        aguaOk: checkInData.aguaOk,
        sintomasGI: checkInData.sintomasGI,
        lixoAlimentar: checkInData.lixoAlimentar,
        humorEnergia: checkInData.humorEnergia,
        score: score,
        data: dataHoje,
        timestamp: Timestamp.now()
      };
      
      const nutricaoDadosRef = doc(db, 'pacientes_completos', paciente.id, 'nutricao', 'dados');
      const checkInRef = doc(nutricaoDadosRef, 'checkins', dataHoje);
      await setDoc(checkInRef, checkInComScore);
      
      alert('Check-in salvo com sucesso!');
      await loadCheckIns();
      setView('plano');
      setCheckInData({
        proteinaOk: false,
        frutasOk: false,
        aguaOk: false,
        sintomasGI: 'nenhum',
        lixoAlimentar: false,
        humorEnergia: 3,
        score: 0,
        data: dataHoje
      });
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
    const totalSteps = 6;
    
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Anamnese Nutricional</h2>
            <p className="text-gray-600">Vamos conhecer seus hábitos e objetivos para criar o melhor plano nutricional para você.</p>
            <div className="mt-4 flex gap-2">
              {[1, 2, 3, 4, 5, 6].map((step) => (
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
          
          {/* Step 3: Padrão de Atividade Física */}
          {wizardStep === 3 && (
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
          
          {/* Step 4: Padrão Alimentar */}
          {wizardStep === 4 && (
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
          
          {/* Step 5: Preferências e Restrições */}
          {wizardStep === 5 && (
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
          )}
          
          {/* Step 6: Sintomas Gastrointestinais */}
          {wizardStep === 6 && (
            <div className="space-y-4">
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
              {wizardStep === 6 ? 'Gerar Plano Nutricional' : 'Próximo'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Tela de Check-in Diário
  if (view === 'checkin') {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Check-in Diário</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
              <div>
                <p className="font-medium text-gray-900">Proteína OK hoje?</p>
                <p className="text-sm text-gray-500">Conseguiu atingir a meta de proteína?</p>
              </div>
              <button
                onClick={() => setCheckInData({ ...checkInData, proteinaOk: !checkInData.proteinaOk })}
                className={`px-4 py-2 rounded-md ${
                  checkInData.proteinaOk
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {checkInData.proteinaOk ? 'Sim' : 'Não'}
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
              <div>
                <p className="font-medium text-gray-900">Frutas OK hoje?</p>
                <p className="text-sm text-gray-500">Consumiu frutas hoje?</p>
              </div>
              <button
                onClick={() => setCheckInData({ ...checkInData, frutasOk: !checkInData.frutasOk })}
                className={`px-4 py-2 rounded-md ${
                  checkInData.frutasOk
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {checkInData.frutasOk ? 'Sim' : 'Não'}
              </button>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
              <div>
                <p className="font-medium text-gray-900">Água OK hoje?</p>
                <p className="text-sm text-gray-500">Bebeu água suficiente?</p>
              </div>
              <button
                onClick={() => setCheckInData({ ...checkInData, aguaOk: !checkInData.aguaOk })}
                className={`px-4 py-2 rounded-md ${
                  checkInData.aguaOk
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {checkInData.aguaOk ? 'Sim' : 'Não'}
              </button>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-md">
              <label className="block font-medium text-gray-900 mb-2">Sintomas GI?</label>
              <select
                value={checkInData.sintomasGI}
                onChange={(e) => setCheckInData({ ...checkInData, sintomasGI: e.target.value as any })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900 bg-white"
              >
                <option value="nenhum">Nenhum</option>
                <option value="leve">Leve</option>
                <option value="moderado">Moderado</option>
                <option value="grave">Grave</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
              <div>
                <p className="font-medium text-gray-900">Lixo alimentar hoje?</p>
                <p className="text-sm text-gray-500">Consumiu alimentos ultraprocessados?</p>
              </div>
              <button
                onClick={() => setCheckInData({ ...checkInData, lixoAlimentar: !checkInData.lixoAlimentar })}
                className={`px-4 py-2 rounded-md ${
                  checkInData.lixoAlimentar
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {checkInData.lixoAlimentar ? 'Sim' : 'Não'}
              </button>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-md">
              <label className="block font-medium text-gray-900 mb-2">
                Humor/Energia (1-5)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((valor) => (
                  <button
                    key={valor}
                    onClick={() => setCheckInData({ ...checkInData, humorEnergia: valor })}
                    className={`flex-1 px-4 py-2 rounded-md ${
                      checkInData.humorEnergia === valor
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {valor}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => setView('plano')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={salvarCheckIn}
              disabled={savingCheckIn}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {savingCheckIn ? 'Salvando...' : 'Salvar Check-in'}
            </button>
          </div>
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
          onClick={() => setView('checkin')}
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
          <div className="flex overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab('plano')}
              className={`flex-1 md:flex-none px-4 md:px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'plano'
                  ? 'border-green-600 text-green-600 bg-green-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Plano Nutri
            </button>
            <button
              onClick={() => setActiveTab('proteinas')}
              className={`flex-1 md:flex-none px-4 md:px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'proteinas'
                  ? 'border-green-600 text-green-600 bg-green-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Proteínas
            </button>
            <button
              onClick={() => setActiveTab('cardapio')}
              className={`flex-1 md:flex-none px-4 md:px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'cardapio'
                  ? 'border-green-600 text-green-600 bg-green-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Cardápio
            </button>
            <button
              onClick={() => setActiveTab('alertas')}
              className={`flex-1 md:flex-none px-4 md:px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'alertas'
                  ? 'border-green-600 text-green-600 bg-green-50'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Alertas
            </button>
            <button
              onClick={() => setActiveTab('historico')}
              className={`flex-1 md:flex-none px-4 md:px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
                <div className="p-5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border-l-4 border-amber-500">
                  <div className="flex items-center gap-3 mb-2">
                    <Coffee className="h-5 w-5 text-amber-700" />
                    <h4 className="font-semibold text-gray-900">Café da Manhã</h4>
                  </div>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-line">{plano.modeloDia.cafe}</p>
                </div>
                
                {/* Lanche 1 */}
                <div className="p-5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-center gap-3 mb-2">
                    <Sun className="h-5 w-5 text-blue-700" />
                    <h4 className="font-semibold text-gray-900">Lanche da Manhã</h4>
                  </div>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-line">{plano.modeloDia.lanche1}</p>
                </div>
                
                {/* Almoço */}
                <div className="p-5 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border-l-4 border-orange-500">
                  <div className="flex items-center gap-3 mb-2">
                    <Sunset className="h-5 w-5 text-orange-700" />
                    <h4 className="font-semibold text-gray-900">Almoço</h4>
                  </div>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-line">{plano.modeloDia.almoco}</p>
                </div>
                
                {/* Lanche 2 */}
                <div className="p-5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-l-4 border-purple-500">
                  <div className="flex items-center gap-3 mb-2">
                    <Sun className="h-5 w-5 text-purple-700" />
                    <h4 className="font-semibold text-gray-900">Lanche da Tarde</h4>
                  </div>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-line">{plano.modeloDia.lanche2}</p>
                </div>
                
                {/* Jantar */}
                <div className="p-5 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border-l-4 border-indigo-500">
                  <div className="flex items-center gap-3 mb-2">
                    <Moon className="h-5 w-5 text-indigo-700" />
                    <h4 className="font-semibold text-gray-900">Jantar</h4>
                  </div>
                  <p className="text-gray-800 leading-relaxed whitespace-pre-line">{plano.modeloDia.jantar}</p>
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
              
              {/* Resumo dos Check-ins */}
              {resumoCheckIns && checkIns.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-green-700" />
                      <p className="text-sm font-medium text-gray-700">Média (7 dias)</p>
                    </div>
                    <p className="text-2xl font-bold text-green-700">
                      {(resumoCheckIns.mediaScore7dias * 100).toFixed(0)}%
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
                      {(resumoCheckIns.melhorDia.score * 100).toFixed(0)}%
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
                    const scoreColor = checkIn.score >= 0.8 ? 'green' : checkIn.score >= 0.6 ? 'yellow' : 'red';
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
                              checkIn.score >= 0.8 ? 'bg-green-200 text-green-800' :
                              checkIn.score >= 0.6 ? 'bg-yellow-200 text-yellow-800' :
                              'bg-red-200 text-red-800'
                            }`}>
                              Score: {(checkIn.score * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="flex items-center gap-2">
                            {checkIn.proteinaOk ? (
                              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium text-gray-900">Proteína</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {checkIn.frutasOk ? (
                              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium text-gray-900">Frutas</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {checkIn.aguaOk ? (
                              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                            )}
                            <span className="text-sm font-medium text-gray-900">Água</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">Sintomas GI:</span>
                            <span className={`text-sm font-bold px-2 py-1 rounded ${
                              checkIn.sintomasGI === 'nenhum' ? 'bg-green-100 text-green-700' :
                              checkIn.sintomasGI === 'leve' ? 'bg-yellow-100 text-yellow-700' :
                              checkIn.sintomasGI === 'moderado' ? 'bg-orange-100 text-orange-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {checkIn.sintomasGI.charAt(0).toUpperCase() + checkIn.sintomasGI.slice(1)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {checkIn.lixoAlimentar ? (
                              <>
                                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                                <span className="text-sm font-medium text-red-600">Lixo alimentar</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                                <span className="text-sm font-medium text-gray-900">Sem lixo</span>
                              </>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-900">Energia:</span>
                            <span className="text-sm font-bold text-gray-900">{checkIn.humorEnergia}/5</span>
                          </div>
                        </div>
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
