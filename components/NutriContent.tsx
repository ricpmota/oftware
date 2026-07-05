'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import type { CardapioPdfContext } from '@/types/cardapioPrint';
import CardapioPrintModal from '@/components/CardapioPrintModal';
import { createPortal } from 'react-dom';
import { doc, getDoc, setDoc, Timestamp, collection, getDocs, query, orderBy, limit, startAfter, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PacienteCompleto } from '@/types/obesidade';
import ChatNutriPanel from '@/components/ChatNutriPanel';
import { 
  UtensilsCrossed, Calendar, AlertCircle, CheckCircle, XCircle, 
  Droplet, Apple, Activity, Target, Clock, Moon, Coffee, 
  Sun, Sunset, TrendingUp, Zap, Heart, Pill, Syringe, 
  Wind, Brain, Dumbbell, MessageSquare, Weight, AlertTriangle, Edit, X,
  ChevronLeft, ChevronRight, Printer
} from 'lucide-react';

/** Passos fixos do check-in no mobile (5 abas — alinhado à home Oftware) */
const CHECK_IN_MOBILE_STEPS = [
  { key: 'alimentacao', shortLabel: 'Aliment.', title: 'Alimentação e proteína', Icon: UtensilsCrossed },
  { key: 'agua', shortLabel: 'Água', title: 'Água e suplementos', Icon: Droplet },
  { key: 'corpo', shortLabel: 'Corpo', title: 'Corpo e bem-estar', Icon: Heart },
  { key: 'meta', shortLabel: 'Meta', title: 'Metas do tratamento', Icon: Target },
  { key: 'observacoes', shortLabel: 'Notas', title: 'Observações', Icon: MessageSquare },
] as const;

/** Um único painel por etapa do wizard (Aliment. → Notas): fundo e borda alinhados ao modal. */
const CHECKIN_STEP_SHELL =
  'rounded-2xl border border-white/10 bg-[#06152e]/60 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:p-5';

type SeveridadeGI = 'nenhum' | 'leve' | 'moderado' | 'grave';

const CHECKIN_SEVERIDADE_OPCOES: { value: SeveridadeGI; label: string }[] = [
  { value: 'nenhum', label: 'Nenhum' },
  { value: 'leve', label: 'Leve' },
  { value: 'moderado', label: 'Moderado' },
  { value: 'grave', label: 'Grave' },
];

const CHECKIN_SINTOMAS_AUMENTO_OPCOES: {
  value: 'nenhum' | 'leve' | 'moderado' | 'intenso';
  label: string;
}[] = [
  { value: 'nenhum', label: 'Nenhum' },
  { value: 'leve', label: 'Leve' },
  { value: 'moderado', label: 'Moderado' },
  { value: 'intenso', label: 'Intenso' },
];

const CHECKIN_DIA_APLICACAO_OPCOES: {
  value: 'aplicou_no_horario' | 'aplicou_atrasado' | 'esqueceu';
  label: string;
}[] = [
  { value: 'aplicou_no_horario', label: 'Apliquei no horário' },
  { value: 'aplicou_atrasado', label: 'Apliquei atrasado' },
  { value: 'esqueceu', label: 'Esqueci' },
];

const CHECKIN_LOCAL_APLICACAO_OPCOES: {
  value: 'abdome' | 'coxa' | 'braco' | 'outro';
  label: string;
}[] = [
  { value: 'abdome', label: 'Abdome' },
  { value: 'coxa', label: 'Coxa' },
  { value: 'braco', label: 'Braço' },
  { value: 'outro', label: 'Outro' },
];

const CHECKIN_ATIVIDADE_OPCOES: {
  value: 'nenhuma' | 'leve' | 'moderada' | 'intensa';
  label: string;
}[] = [
  { value: 'nenhuma', label: 'Nenhuma' },
  { value: 'leve', label: 'Leve (caminhada)' },
  { value: 'moderada', label: 'Moderada' },
  { value: 'intensa', label: 'Intensa' },
];

/** Botões em grade — mesmo padrão visual do check-in (borda clara, ativo em verde Oftware). */
function CheckInOptionPills<T extends string>({
  label,
  value,
  onChange,
  options,
  className = '',
  gridClassName = 'grid grid-cols-2 gap-2 sm:grid-cols-4',
}: {
  label: string;
  value: T | null | undefined;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
  gridClassName?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-2 text-sm font-medium text-[#E8EDED]">{label}</p>
      <div className={gridClassName}>
        {options.map((o) => {
          const active = value != null && value === o.value;
          return (
            <button
              key={String(o.value)}
              type="button"
              onClick={() => onChange(o.value)}
              className={`rounded-xl border px-2 py-2.5 text-center text-sm font-semibold transition-all active:scale-[0.98] sm:px-3 ${
                active
                  ? 'border-[#4CCB7A]/55 bg-[#4CCB7A]/18 text-[#4CCB7A] shadow-[inset_0_0_0_1px_rgba(76,203,122,0.35)]'
                  : 'border-white/12 bg-[#0A1F44]/55 text-[#E8EDED]/90 hover:border-[#4CCB7A]/35'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// TIPOS E INTERFACES
// ============================================

type RefeicaoKey = 'cafe' | 'lanche1' | 'almoco' | 'lanche2' | 'jantar';

type CategoriaItemRefeicao = 'proteina' | 'carboidrato' | 'legumes_salada' | 'gordura_boa' | 'extra' | 'lixo';
type ModalBuilderTab = 'proteina' | 'carboidrato' | 'gordura' | 'reguladores';

const MODAL_TAB_CATEGORIES: Record<ModalBuilderTab, CategoriaItemRefeicao[]> = {
  proteina: ['proteina'],
  carboidrato: ['carboidrato'],
  gordura: ['gordura_boa'],
  reguladores: ['legumes_salada', 'extra'],
};

const MODAL_TAB_LIMITS: Record<ModalBuilderTab, number> = {
  proteina: 6,
  carboidrato: 6,
  gordura: 4,
  reguladores: 8,
};

interface ItemRefeicao {
  id: string;
  nome: string;
  categoria: CategoriaItemRefeicao;
  proteina_g: number;
  calorias_kcal: number;
  descricao?: string;
}

interface ConfiguracaoRefeicao {
  refeicaoKey: RefeicaoKey;
  itensDisponiveis: ItemRefeicao[];
  maxProteinas: number;
  maxCarboidratos: number;
  maxLegumesSalada: number;
  maxGordurasBoas: number;
  maxExtras: number;
  maxLixo: number;
  metaProteina_g: number; // Meta de proteína para esta refeição
}

interface OpcaoRefeicao {
  id: string;
  titulo: string;       // nome curto (ex: "Frango + arroz + salada")
  descricao: string;    // descrição completa
  proteina_g: number;   // proteína aproximada dessa combinação
  calorias_kcal: number;// calorias aproximadas
  itensSelecionados?: string[]; // IDs dos itens selecionados (para opções customizadas)
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
  macrosPorRefeicao?: {
    cafe?: { proteinaSugerida_g: number; proteinaEscolhida_g: number; caloriasSugerida_kcal: number; caloriasEscolhida_kcal: number };
    lanche1?: { proteinaSugerida_g: number; proteinaEscolhida_g: number; caloriasSugerida_kcal: number; caloriasEscolhida_kcal: number };
    almoco?: { proteinaSugerida_g: number; proteinaEscolhida_g: number; caloriasSugerida_kcal: number; caloriasEscolhida_kcal: number };
    lanche2?: { proteinaSugerida_g: number; proteinaEscolhida_g: number; caloriasSugerida_kcal: number; caloriasEscolhida_kcal: number };
    jantar?: { proteinaSugerida_g: number; proteinaEscolhida_g: number; caloriasSugerida_kcal: number; caloriasEscolhida_kcal: number };
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
  // Restrições e preferências do paciente (para filtrar opções de cardápio)
  restricoesPaciente?: string[];
  preferenciasProteinaPaciente?: string[];
  // Opções customizadas criadas pelo meal builder
  opcoesCustomizadas?: Record<RefeicaoKey, OpcaoRefeicao[]>;
  // Itens customizados adicionados via TACO por refeição
  itensCustomizadosPorRefeicao?: Record<RefeicaoKey, ItemRefeicao[]>;
}

type TacoSearchItem = {
  id?: number;
  nome: string;
  categoria?: string;
  calorias: number;
  proteinas: number;
  carboidratos: number;
  gorduras: number;
  por_100g?: boolean;
};

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
  caloriasDiarias_kcal?: number; // Calorias totais do cardápio selecionado
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
  /** Painel Nutri (MetaNutri / meta modo nutricionista): exibe todas as abas incluindo ChatNutri */
  modoNutricionista?: boolean;
  /** Somente o chat (ex.: aba Nutrição no MetaPersonal, modal MetaAdmin) — não exige plano carregado */
  onlyChatNutri?: boolean;
  /** YYYY-MM-DD — contexto do dia para o pipeline ChatNutri (totais/refeições) */
  chatNutriDataSelecionada?: string;
  onChatNutriDataChange?: (dateKey: string) => void;
}

// ============================================
// BASE DE OPÇÕES DE REFEIÇÕES
// ============================================

/**
 * Gera as opções de refeições baseadas no estilo do plano
 * Cada refeição tem pelo menos 3 opções: alta proteína, equilibrada e leve
 */
  /**
   * Converte a distribuição de proteína (string) em gramas-alvo por refeição
   * Ex: "25-30 g" -> 27.5g (média)
   */
  const converterDistribuicaoProteina = (distribuicao: string): number => {
    const match = distribuicao.match(/(\d+)-(\d+)/);
    if (match) {
      const min = parseInt(match[1]);
      const max = parseInt(match[2]);
      return Math.round((min + max) / 2);
    }
    // Se não encontrar padrão, tenta extrair número único
    const numMatch = distribuicao.match(/(\d+)/);
    return numMatch ? parseInt(numMatch[1]) : 20; // default
  };

  /**
   * Calcula valores sugeridos para uma refeição baseado no plano
   */
  const calcularValoresSugeridos = (refeicaoKey: RefeicaoKey, plano: PlanoNutricional) => {
    const proteinaSugerida = converterDistribuicaoProteina(plano.distribuicaoProteina[refeicaoKey]);
    const caloriasSugerida = refeicaoKey === 'cafe' ? 400 :
                             refeicaoKey === 'lanche1' ? 250 :
                             refeicaoKey === 'almoco' ? 550 :
                             refeicaoKey === 'lanche2' ? 200 : 450;
    return { proteinaSugerida_g: proteinaSugerida, caloriasSugerida_kcal: caloriasSugerida };
  };

/**
 * Gera configuração de builder por refeição com itens disponíveis e limites
 */
const gerarConfiguracaoBuilderPorRefeicao = (
  plano: PlanoNutricional,
  restricoes: string[] = [],
  preferenciasProteina: string[] = []
): Record<RefeicaoKey, ConfiguracaoRefeicao> => {
  // Calcular meta de proteína por refeição
  const protCafe = converterDistribuicaoProteina(plano.distribuicaoProteina.cafe);
  const protAlmoco = converterDistribuicaoProteina(plano.distribuicaoProteina.almoco);
  const protJantar = converterDistribuicaoProteina(plano.distribuicaoProteina.jantar);
  const protLanche = converterDistribuicaoProteina(plano.distribuicaoProteina.lanche1);

  // Itens base disponíveis (serão filtrados por restrições depois)
  const proteinasBase: ItemRefeicao[] = [
    { id: 'prot_frango_100g', nome: 'Peito de frango grelhado (100g)', categoria: 'proteina', proteina_g: 31, calorias_kcal: 165, descricao: 'Peito de frango sem pele' },
    { id: 'prot_frango_150g', nome: 'Peito de frango grelhado (150g)', categoria: 'proteina', proteina_g: 46, calorias_kcal: 248 },
    { id: 'prot_carne_magra_100g', nome: 'Carne magra/patinho (100g)', categoria: 'proteina', proteina_g: 26, calorias_kcal: 200 },
    { id: 'prot_peixe_100g', nome: 'Peixe grelhado (100g)', categoria: 'proteina', proteina_g: 25, calorias_kcal: 150 },
    { id: 'prot_ovos_2un', nome: '2 ovos inteiros', categoria: 'proteina', proteina_g: 12, calorias_kcal: 140 },
    { id: 'prot_ovos_3un', nome: '3 ovos inteiros', categoria: 'proteina', proteina_g: 18, calorias_kcal: 210 },
    { id: 'prot_claras_4un', nome: '4 claras de ovo', categoria: 'proteina', proteina_g: 14, calorias_kcal: 68 },
    { id: 'prot_whey_1dose', nome: 'Whey protein (1 dose)', categoria: 'proteina', proteina_g: 25, calorias_kcal: 120 },
    { id: 'prot_iogurte_proteico', nome: 'Iogurte proteico (170g)', categoria: 'proteina', proteina_g: 20, calorias_kcal: 150 },
    { id: 'prot_queijo_cottage', nome: 'Queijo cottage (100g)', categoria: 'proteina', proteina_g: 11, calorias_kcal: 98 },
    { id: 'prot_tofu_100g', nome: 'Tofu (100g)', categoria: 'proteina', proteina_g: 8, calorias_kcal: 76 },
    { id: 'prot_peito_peru', nome: 'Peito de peru (100g)', categoria: 'proteina', proteina_g: 30, calorias_kcal: 120 }
  ];

  const carboidratosBase: ItemRefeicao[] = [
    { id: 'carb_arroz_integral_3col', nome: 'Arroz integral (3 colheres)', categoria: 'carboidrato', proteina_g: 3, calorias_kcal: 150 },
    { id: 'carb_arroz_branco_3col', nome: 'Arroz branco (3 colheres)', categoria: 'carboidrato', proteina_g: 2, calorias_kcal: 140 },
    { id: 'carb_batata_doce_1un', nome: 'Batata doce (1 unidade média)', categoria: 'carboidrato', proteina_g: 2, calorias_kcal: 180 },
    { id: 'carb_mandioca_100g', nome: 'Mandioca (100g)', categoria: 'carboidrato', proteina_g: 1, calorias_kcal: 160 },
    { id: 'carb_pao_integral_1fat', nome: 'Pão integral (1 fatia)', categoria: 'carboidrato', proteina_g: 3, calorias_kcal: 80 },
    { id: 'carb_quinoa_3col', nome: 'Quinoa (3 colheres)', categoria: 'carboidrato', proteina_g: 4, calorias_kcal: 120 }
  ];

  const legumesSaladaBase: ItemRefeicao[] = [
    { id: 'leg_salada_grande', nome: 'Prato cheio de salada e legumes', categoria: 'legumes_salada', proteina_g: 2, calorias_kcal: 50 },
    { id: 'leg_salada_media', nome: 'Meia porção de salada', categoria: 'legumes_salada', proteina_g: 1, calorias_kcal: 25 },
    { id: 'leg_legumes_cozidos', nome: 'Legumes cozidos variados', categoria: 'legumes_salada', proteina_g: 2, calorias_kcal: 60 }
  ];

  const gordurasBoasBase: ItemRefeicao[] = [
    { id: 'gord_azeite_1col', nome: 'Azeite (1 colher de sopa)', categoria: 'gordura_boa', proteina_g: 0, calorias_kcal: 120 },
    { id: 'gord_castanhas_porcao', nome: 'Castanhas (porção pequena)', categoria: 'gordura_boa', proteina_g: 3, calorias_kcal: 100 }
  ];

  const extrasBase: ItemRefeicao[] = [
    { id: 'extra_fruta_pequena', nome: 'Fruta pequena', categoria: 'extra', proteina_g: 0, calorias_kcal: 60 },
    { id: 'extra_iogurte_extra', nome: 'Iogurte natural extra', categoria: 'extra', proteina_g: 5, calorias_kcal: 80 }
  ];

  const lixoBase: ItemRefeicao[] = [
    { id: 'lixo_batata_frita_media', nome: 'Batata frita porção média (130 g)', categoria: 'lixo', proteina_g: 4, calorias_kcal: 400, descricao: 'Porção de batata frita de fast-food, crocante e bem gordurosa.' },
    { id: 'lixo_hamburguer_sanduiche', nome: 'Hambúrguer tipo fast-food', categoria: 'lixo', proteina_g: 15, calorias_kcal: 500, descricao: 'Sanduíche com carne bovina, queijo e molho.' },
    { id: 'lixo_pizza_calabresa_fatia', nome: 'Pizza de calabresa (1 fatia grande)', categoria: 'lixo', proteina_g: 12, calorias_kcal: 350, descricao: 'Fatia grande de pizza com queijo e calabresa.' },
    { id: 'lixo_pizza_queijo_fatia', nome: 'Pizza de queijo (1 fatia média)', categoria: 'lixo', proteina_g: 10, calorias_kcal: 280, descricao: 'Fatia média de pizza de muçarela.' },
    { id: 'lixo_refrigerante_lata', nome: 'Refrigerante comum (1 lata 350 ml)', categoria: 'lixo', proteina_g: 0, calorias_kcal: 140, descricao: 'Refrigerante açucarado, sem valor proteico.' },
    { id: 'lixo_salgadinho_pacote_pequeno', nome: 'Salgadinho de pacote (1 pacote pequeno ~30 g)', categoria: 'lixo', proteina_g: 2, calorias_kcal: 160, descricao: 'Salgadinho crocante industrializado (chips).' },
    { id: 'lixo_chocolate_barra_30g', nome: 'Chocolate ao leite (30 g)', categoria: 'lixo', proteina_g: 2, calorias_kcal: 160, descricao: 'Quadradinhos de chocolate ao leite (~3 quadrados).' },
    { id: 'lixo_brigadeiro_2_unid', nome: 'Brigadeiro (2 unidades médias)', categoria: 'lixo', proteina_g: 2, calorias_kcal: 200, descricao: 'Docinho de leite condensado, chocolate e manteiga.' },
    { id: 'lixo_sorvete_2_bolas', nome: 'Sorvete cremoso (2 bolas)', categoria: 'lixo', proteina_g: 4, calorias_kcal: 250, descricao: 'Sorvete de massa cremoso, sabor creme ou chocolate.' },
    { id: 'lixo_milkshake_300ml', nome: 'Milkshake (300 ml)', categoria: 'lixo', proteina_g: 6, calorias_kcal: 450, descricao: 'Milkshake de sorvete com leite e calda.' },
    { id: 'lixo_cerveja_lata', nome: 'Cerveja (1 lata 350 ml)', categoria: 'lixo', proteina_g: 1, calorias_kcal: 150, descricao: 'Cerveja comum, consumo recreativo.' },
    { id: 'lixo_drink_destilado_doce', nome: 'Drink com destilado e açúcar (1 dose ~200 ml)', categoria: 'lixo', proteina_g: 0, calorias_kcal: 200, descricao: 'Drink alcoólico com destilado, refrigerante ou suco e açúcar.' },
    { id: 'lixo_biscoito_recheado_3_unid', nome: 'Biscoito recheado (3 unidades)', categoria: 'lixo', proteina_g: 2, calorias_kcal: 180, descricao: 'Biscoitos recheados doces, industrializados.' },
    { id: 'lixo_donut', nome: 'Donut (1 unidade média)', categoria: 'lixo', proteina_g: 3, calorias_kcal: 300, descricao: 'Rosquinha frita com cobertura açucarada.' },
    { id: 'lixo_coxinha_media', nome: 'Coxinha média (1 unidade)', categoria: 'lixo', proteina_g: 7, calorias_kcal: 250, descricao: 'Salgado frito recheado com frango.' },
    { id: 'lixo_pastel_frito', nome: 'Pastel frito (1 unidade média)', categoria: 'lixo', proteina_g: 6, calorias_kcal: 300, descricao: 'Pastel de feira, frito por imersão em óleo.' }
  ];

  // Filtrar por restrições
  const filtrarItens = (itens: ItemRefeicao[]): ItemRefeicao[] => {
    return itens.filter(item => {
      const nomeLower = item.nome.toLowerCase();
      const descLower = item.descricao?.toLowerCase() || '';
      
      if (restricoes.includes('vegetariano') || restricoes.includes('vegano')) {
        if (restricoes.includes('vegano')) {
          if (nomeLower.includes('frango') || nomeLower.includes('carne') || nomeLower.includes('peixe') || 
              nomeLower.includes('ovos') || nomeLower.includes('queijo') || nomeLower.includes('iogurte') ||
              nomeLower.includes('whey') || nomeLower.includes('peru')) {
            return false;
          }
        } else if (restricoes.includes('vegetariano')) {
          if (nomeLower.includes('frango') || nomeLower.includes('carne') || nomeLower.includes('peixe') ||
              nomeLower.includes('peru')) {
            return false;
          }
        }
      }
      
      if (restricoes.includes('intolerância lactose')) {
        if ((nomeLower.includes('queijo') || nomeLower.includes('iogurte')) && 
            !nomeLower.includes('sem lactose') && !nomeLower.includes('vegetal')) {
          return false;
        }
      }
      
      if (restricoes.includes('sem glúten')) {
        if ((nomeLower.includes('pão') || nomeLower.includes('trigo')) && 
            !nomeLower.includes('sem glúten') && !nomeLower.includes('sem gluten')) {
          return false;
        }
      }
      
      return true;
    });
  };

  const proteinas = filtrarItens(proteinasBase);
  const carboidratos = filtrarItens(carboidratosBase);
  const legumesSalada = filtrarItens(legumesSaladaBase);
  const gordurasBoas = filtrarItens(gordurasBoasBase);
  const extras = filtrarItens(extrasBase);
  const lixo = lixoBase; // Lixo não precisa filtrar por restrições

  // Configuração por refeição
  const config: Record<RefeicaoKey, ConfiguracaoRefeicao> = {
    cafe: {
      refeicaoKey: 'cafe',
      itensDisponiveis: [...proteinas, ...carboidratos, ...legumesSalada, ...gordurasBoas, ...extras, ...lixo],
      maxProteinas: 1,
      maxCarboidratos: 1,
      maxLegumesSalada: 1,
      maxGordurasBoas: 1,
      maxExtras: 1,
      maxLixo: 3,
      metaProteina_g: protCafe
    },
    lanche1: {
      refeicaoKey: 'lanche1',
      itensDisponiveis: [...proteinas.filter(p => p.id.includes('whey') || p.id.includes('iogurte') || p.id.includes('ovos')), ...extras, ...lixo],
      maxProteinas: 1,
      maxCarboidratos: 0,
      maxLegumesSalada: 0,
      maxGordurasBoas: 0,
      maxExtras: 1,
      maxLixo: 2,
      metaProteina_g: protLanche
    },
    almoco: {
      refeicaoKey: 'almoco',
      itensDisponiveis: [...proteinas, ...carboidratos, ...legumesSalada, ...gordurasBoas, ...lixo],
      maxProteinas: 1,
      maxCarboidratos: 2,
      maxLegumesSalada: 3,
      maxGordurasBoas: 1,
      maxExtras: 0,
      maxLixo: 3,
      metaProteina_g: protAlmoco
    },
    lanche2: {
      refeicaoKey: 'lanche2',
      itensDisponiveis: [...proteinas.filter(p => p.id.includes('whey') || p.id.includes('iogurte') || p.id.includes('ovos')), ...extras, ...lixo],
      maxProteinas: 1,
      maxCarboidratos: 0,
      maxLegumesSalada: 0,
      maxGordurasBoas: 0,
      maxExtras: 1,
      maxLixo: 2,
      metaProteina_g: protLanche
    },
    jantar: {
      refeicaoKey: 'jantar',
      itensDisponiveis: [...proteinas, ...carboidratos, ...legumesSalada, ...gordurasBoas, ...lixo],
      maxProteinas: 1,
      maxCarboidratos: 1,
      maxLegumesSalada: 3,
      maxGordurasBoas: 1,
      maxExtras: 0,
      maxLixo: 3,
      metaProteina_g: protJantar
    }
  };

  return config;
};

const gerarOpcoesRefeicoes = (
  estilo: PlanoNutricional['estilo'],
  protCafe: number,
  protAlmoco: number,
  protJantar: number,
  protLanche: number,
  restricoes: string[] = [],
  preferenciasProteina: string[] = []
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

  // Função auxiliar para filtrar opções baseadas em restrições e preferências
  const filtrarOpcoes = (opcoes: OpcaoRefeicao[]): OpcaoRefeicao[] => {
    return opcoes.filter(opcao => {
      const descricaoLower = opcao.descricao.toLowerCase();
      const tituloLower = opcao.titulo.toLowerCase();
      
      // Verificar restrições
      if (restricoes.includes('vegetariano') || restricoes.includes('vegano')) {
        // Remover opções com carne, frango, peixe, ovos (exceto se for vegano, aí pode ter ovos)
        if (restricoes.includes('vegano')) {
          if (descricaoLower.includes('carne') || descricaoLower.includes('frango') || 
              descricaoLower.includes('peixe') || descricaoLower.includes('ovos') ||
              descricaoLower.includes('atum') || descricaoLower.includes('salmão') ||
              descricaoLower.includes('queijo') || descricaoLower.includes('iogurte') ||
              descricaoLower.includes('laticínios') || descricaoLower.includes('whey')) {
            return false;
          }
        } else if (restricoes.includes('vegetariano')) {
          // Vegetariano pode ter ovos e laticínios, mas não carne/peixe/frango
          if (descricaoLower.includes('carne') || descricaoLower.includes('frango') || 
              descricaoLower.includes('peixe') || descricaoLower.includes('atum') ||
              descricaoLower.includes('salmão') || descricaoLower.includes('patinho') ||
              descricaoLower.includes('alcatra') || descricaoLower.includes('maminha')) {
            return false;
          }
        }
      }
      
      // Verificar intolerância à lactose
      if (restricoes.includes('intolerância lactose')) {
        if (descricaoLower.includes('iogurte') && !descricaoLower.includes('sem lactose') &&
            !descricaoLower.includes('vegetal')) {
          return false;
        }
        if (descricaoLower.includes('queijo') && !descricaoLower.includes('sem lactose')) {
          return false;
        }
        if (descricaoLower.includes('laticínios') && !descricaoLower.includes('sem lactose')) {
          return false;
        }
      }
      
      // Verificar sem glúten
      if (restricoes.includes('sem glúten')) {
        if ((descricaoLower.includes('pão') || descricaoLower.includes('trigo') || 
             descricaoLower.includes('farinha')) && !descricaoLower.includes('sem glúten') &&
            !descricaoLower.includes('sem gluten')) {
          return false;
        }
      }
      
      return true;
    });
  };
  
  // Função auxiliar para ordenar opções por preferências
  const ordenarPorPreferencias = (opcoes: OpcaoRefeicao[]): OpcaoRefeicao[] => {
    if (preferenciasProteina.length === 0) return opcoes;
    
    return opcoes.sort((a, b) => {
      const descA = a.descricao.toLowerCase();
      const descB = b.descricao.toLowerCase();
      
      // Verificar quantas preferências cada opção atende
      let scoreA = 0;
      let scoreB = 0;
      
      preferenciasProteina.forEach(pref => {
        const prefLower = pref.toLowerCase();
        if (prefLower.includes('carne') && (descA.includes('carne') || descA.includes('patinho') || descA.includes('alcatra'))) scoreA++;
        if (prefLower.includes('carne') && (descB.includes('carne') || descB.includes('patinho') || descB.includes('alcatra'))) scoreB++;
        if (prefLower.includes('frango') && descA.includes('frango')) scoreA++;
        if (prefLower.includes('frango') && descB.includes('frango')) scoreB++;
        if (prefLower.includes('peixe') && (descA.includes('peixe') || descA.includes('salmão') || descA.includes('atum'))) scoreA++;
        if (prefLower.includes('peixe') && (descB.includes('peixe') || descB.includes('salmão') || descB.includes('atum'))) scoreB++;
        if (prefLower.includes('ovos') && descA.includes('ovos')) scoreA++;
        if (prefLower.includes('ovos') && descB.includes('ovos')) scoreB++;
        if (prefLower.includes('laticínios') && (descA.includes('queijo') || descA.includes('iogurte'))) scoreA++;
        if (prefLower.includes('laticínios') && (descB.includes('queijo') || descB.includes('iogurte'))) scoreB++;
        if (prefLower.includes('leguminosas') && (descA.includes('lentilha') || descA.includes('grão') || descA.includes('feijão') || descA.includes('tofu'))) scoreA++;
        if (prefLower.includes('leguminosas') && (descB.includes('lentilha') || descB.includes('grão') || descB.includes('feijão') || descB.includes('tofu'))) scoreB++;
      });
      
      return scoreB - scoreA; // Ordenar do maior para o menor score
    });
  };

  // Retornar opções baseadas no estilo
  let opcoesFinais: Record<RefeicaoKey, OpcaoRefeicao[]>;
  
  if (estilo === 'digestiva' && baseOpcoes.digestiva) {
    opcoesFinais = baseOpcoes.digestiva as Record<RefeicaoKey, OpcaoRefeicao[]>;
  } else {
    // Para todos os estilos, criar opções completas e adequadas para pacientes com Tirzepatida
    opcoesFinais = {
      cafe: [
        {
          id: 'cafe_ovos_whey',
          titulo: 'Ovos mexidos + whey + fruta',
          descricao: '2 ovos mexidos + 1 dose de whey com água ou leite desnatado + 1 fruta (maçã ou banana pequena).',
          proteina_g: protCafe,
          calorias_kcal: 400
        },
        {
          id: 'cafe_omelete_cottage',
          titulo: 'Omelete de claras com cottage',
          descricao: 'Omelete com 2 claras e 1 ovo inteiro + 2 colheres de sopa de cottage + 1 fatia de pão integral.',
          proteina_g: protCafe,
          calorias_kcal: 380
        },
        {
          id: 'cafe_iogurte_whey',
          titulo: 'Iogurte + whey + chia',
          descricao: 'Iogurte proteico ou desnatado + 1/2 dose de whey misturada + 1 colher de sopa de chia + 1 fruta.',
          proteina_g: protCafe,
          calorias_kcal: 350
        }
      ],
      lanche1: [
        {
          id: 'lanche1_whey_fruta',
          titulo: 'Whey + fruta',
          descricao: '1 dose de whey com água + 1 fruta de baixo índice glicêmico (maçã, pera ou morango).',
          proteina_g: protLanche,
          calorias_kcal: 250
        },
        {
          id: 'lanche1_iogurte_castanhas',
          titulo: 'Iogurte com castanhas',
          descricao: '1 pote de iogurte proteico ou natural desnatado + 1 punhado pequeno de castanhas (nozes, amêndoas).',
          proteina_g: protLanche,
          calorias_kcal: 230
        },
        {
          id: 'lanche1_queijo_peito_peru',
          titulo: 'Queijo branco + peito de peru',
          descricao: '2 fatias de queijo branco + 2 fatias de peito de peru + 1 fatia de pão integral.',
          proteina_g: protLanche,
          calorias_kcal: 260
        }
      ],
      almoco: [
        {
          id: 'almoco_frango_legumes',
          titulo: 'Frango grelhado + salada + legumes',
          descricao: 'Filé de frango grelhado + grande volume de salada (folhas, tomate, cenoura) + legumes cozidos + 2 colheres de arroz integral.',
          proteina_g: protAlmoco,
          calorias_kcal: 550
        },
        {
          id: 'almoco_carne_magras',
          titulo: 'Carne magra + salada + feijão',
          descricao: 'Carne bovina magra ou patinho moído + salada variada + 2 colheres de arroz + 1 concha pequena de feijão.',
          proteina_g: protAlmoco,
          calorias_kcal: 570
        },
        {
          id: 'almoco_peixe_legumes',
          titulo: 'Peixe grelhado + legumes',
          descricao: 'Filé de peixe grelhado + legumes cozidos ou assados + salada crua variada + pequena porção de carboidrato (batata, mandioca ou arroz).',
          proteina_g: protAlmoco,
          calorias_kcal: 520
        }
      ],
      lanche2: [
        {
          id: 'lanche2_whey_agua',
          titulo: 'Whey com água',
          descricao: '1 dose de whey com água, para reforçar a meta de proteína diária com poucas calorias.',
          proteina_g: protLanche,
          calorias_kcal: 180
        },
        {
          id: 'lanche2_iogurte_fruta',
          titulo: 'Iogurte + fruta',
          descricao: 'Iogurte natural ou proteico + 1 fruta pequena (maçã, pera, kiwi).',
          proteina_g: protLanche,
          calorias_kcal: 200
        },
        {
          id: 'lanche2_ovo_cozido',
          titulo: 'Ovos cozidos + legumes crus',
          descricao: '2 ovos cozidos + palitos de cenoura ou pepino.',
          proteina_g: protLanche,
          calorias_kcal: 210
        }
      ],
      jantar: [
        {
          id: 'jantar_frango_salada',
          titulo: 'Prato leve com frango e salada',
          descricao: 'Filé de frango grelhado ou desfiado + grande volume de salada e legumes, com pouco ou nenhum carboidrato.',
          proteina_g: protJantar,
          calorias_kcal: 450
        },
        {
          id: 'jantar_omelete_legumes',
          titulo: 'Omelete proteica com legumes',
          descricao: 'Omelete com 2 ovos + 2 claras + legumes variados (tomate, espinafre, cebola).',
          proteina_g: protJantar,
          calorias_kcal: 420
        },
        {
          id: 'jantar_sopa_proteica',
          titulo: 'Sopa proteica',
          descricao: 'Sopa de legumes com frango desfiado ou carne magra, com pouco carboidrato.',
          proteina_g: protJantar,
          calorias_kcal: 430
        }
      ]
    };
  }
  
  // Filtrar e ordenar opções de cada refeição
  return {
    cafe: ordenarPorPreferencias(filtrarOpcoes(opcoesFinais.cafe)),
    lanche1: ordenarPorPreferencias(filtrarOpcoes(opcoesFinais.lanche1)),
    almoco: ordenarPorPreferencias(filtrarOpcoes(opcoesFinais.almoco)),
    lanche2: ordenarPorPreferencias(filtrarOpcoes(opcoesFinais.lanche2)),
    jantar: ordenarPorPreferencias(filtrarOpcoes(opcoesFinais.jantar))
  };
};

/** Mesma lógica da tabela da aba Cardápio, por refeição — usada na impressão PDF. */
function montarResumoRefeicaoCardapioParaImpressao(
  refeicaoKey: RefeicaoKey,
  plano: PlanoNutricional,
  opcoesRefeicoes: Record<RefeicaoKey, OpcaoRefeicao[]>,
  configuracaoPorRefeicao: Record<RefeicaoKey, ConfiguracaoRefeicao>,
  itensCustomizadosPorRefeicao: Record<RefeicaoKey, ItemRefeicao[]>
): { tituloOpcao: string; linhas: { descricao: string; proteinaItem: number; caloriasItem: number }[] } {
  const opcoesRefeicao = opcoesRefeicoes[refeicaoKey] || [];
  const opcaoAtualRefeicaoAtivaId =
    plano.opcoesSelecionadas?.[refeicaoKey] || opcoesRefeicao[0]?.id || '';
  const opcaoAtualRefeicaoAtiva =
    opcoesRefeicao.find((opcao) => opcao.id === opcaoAtualRefeicaoAtivaId) || null;
  const itensDisponiveisBaseCardapio =
    configuracaoPorRefeicao[refeicaoKey]?.itensDisponiveis || [];
  const itensCustomResumoCardapio =
    itensCustomizadosPorRefeicao[refeicaoKey] ||
    plano.itensCustomizadosPorRefeicao?.[refeicaoKey] ||
    [];
  const idsItensBaseCardapio = new Set(itensDisponiveisBaseCardapio.map((i) => i.id));
  const itensDisponiveisRefeicaoAtiva = [
    ...itensDisponiveisBaseCardapio,
    ...itensCustomResumoCardapio.filter((item) => !idsItensBaseCardapio.has(item.id)),
  ];
  const itensSelecionadosDaOpcaoAtiva = (opcaoAtualRefeicaoAtiva?.itensSelecionados || [])
    .map((itemId) => itensDisponiveisRefeicaoAtiva.find((item) => item.id === itemId))
    .filter(Boolean) as ItemRefeicao[];
  const descricaoRefeicaoAtiva = opcaoAtualRefeicaoAtiva?.descricao || plano.modeloDia[refeicaoKey];
  const itensDescricaoRefeicaoAtiva = descricaoRefeicaoAtiva
    .replace(/\r?\n/g, ' + ')
    .replace(/\s+[Oo]u:\s+/g, ' + ')
    .split('+')
    .map((item) =>
      item
        .replace(/^(Opção|Opcao)\s*\d*:\s*/i, '')
        .replace(/^ou:\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter((item) => item.length > 0 && !/^total[:\s]/i.test(item));
  const itensResumoExtraidosTexto = itensDescricaoRefeicaoAtiva.map((descricao, index) => {
    const proteinaMatches = Array.from(descricao.matchAll(/(\d+(?:[.,]\d+)?)\s*g[^,.;)]{0,25}prote[ií]na/gi));
    const caloriasMatches = Array.from(descricao.matchAll(/(\d+(?:[.,]\d+)?)\s*kcal/gi));
    const proteinaExtraida = proteinaMatches.reduce((acc, match) => acc + Number(match[1].replace(',', '.')), 0);
    const caloriasExtraida = caloriasMatches.reduce((acc, match) => acc + Number(match[1].replace(',', '.')), 0);
    return {
      id: `${index}-${descricao.slice(0, 32)}`,
      descricao,
      proteinaExtraida,
      caloriasExtraida,
    };
  });
  const linhas =
    itensSelecionadosDaOpcaoAtiva.length > 0
      ? itensSelecionadosDaOpcaoAtiva.map((item) => ({
          descricao: item.nome,
          proteinaItem: item.proteina_g,
          caloriasItem: item.calorias_kcal,
        }))
      : itensResumoExtraidosTexto.map((item) => ({
          descricao: item.descricao,
          proteinaItem: item.proteinaExtraida,
          caloriasItem: item.caloriasExtraida,
        }));
  return {
    tituloOpcao: opcaoAtualRefeicaoAtiva?.titulo || 'Opção padrão',
    linhas,
  };
}

function montarCardapioPdfContext(
  plano: PlanoNutricional,
  opcoesRefeicoes: Record<RefeicaoKey, OpcaoRefeicao[]>,
  itensCustomizadosPorRefeicao: Record<RefeicaoKey, ItemRefeicao[]>,
  paciente: PacienteCompleto
): CardapioPdfContext {
  const nomePorRefeicao: Record<RefeicaoKey, string> = {
    cafe: 'Café da Manhã',
    lanche1: 'Lanche da Manhã',
    almoco: 'Almoço',
    lanche2: 'Lanche da Tarde',
    jantar: 'Janta',
  };
  const ordem: RefeicaoKey[] = ['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'];
  const config = gerarConfiguracaoBuilderPorRefeicao(
    plano,
    plano.restricoesPaciente || [],
    plano.preferenciasProteinaPaciente || []
  );
  const refeicoes = ordem.map((key) => {
    const r = montarResumoRefeicaoCardapioParaImpressao(
      key,
      plano,
      opcoesRefeicoes,
      config,
      itensCustomizadosPorRefeicao
    );
    return {
      nomeRefeicao: nomePorRefeicao[key],
      tituloOpcao: r.tituloOpcao,
      itens: r.linhas.map((l) => ({
        descricao: l.descricao,
        proteinaG: l.proteinaItem,
        kcal: l.caloriasItem,
      })),
    };
  });
  const resumoDia: CardapioPdfContext['resumoDia'] = [];
  let proteinaSugeridaTotal = 0;
  let proteinaEscolhidaTotal = 0;
  let caloriasSugeridaTotal = 0;
  let caloriasEscolhidaTotal = 0;
  ordem.forEach((refeicaoKey) => {
    const valoresSugeridos = calcularValoresSugeridos(refeicaoKey, plano);
    const macrosSalvas = plano.macrosPorRefeicao?.[refeicaoKey];
    const proteinaAtual =
      macrosSalvas && macrosSalvas.proteinaEscolhida_g > 0
        ? macrosSalvas.proteinaEscolhida_g
        : valoresSugeridos.proteinaSugerida_g;
    const caloriasAtual =
      macrosSalvas && macrosSalvas.caloriasEscolhida_kcal > 0
        ? macrosSalvas.caloriasEscolhida_kcal
        : valoresSugeridos.caloriasSugerida_kcal;
    proteinaSugeridaTotal += valoresSugeridos.proteinaSugerida_g;
    caloriasSugeridaTotal += valoresSugeridos.caloriasSugerida_kcal;
    proteinaEscolhidaTotal += proteinaAtual;
    caloriasEscolhidaTotal += caloriasAtual;
    resumoDia.push({
      nome: nomePorRefeicao[refeicaoKey],
      protAtual: proteinaAtual,
      protPrev: valoresSugeridos.proteinaSugerida_g,
      kcalAtual: caloriasAtual,
      kcalPrev: valoresSugeridos.caloriasSugerida_kcal,
    });
  });
  const pacienteNome =
    paciente?.dadosIdentificacao?.nomeCompleto?.trim() || paciente?.nome?.trim() || 'Paciente';
  const pacienteCpf = paciente?.dadosIdentificacao?.cpf?.trim();
  return {
    pacienteNome,
    pacienteCpf,
    dataImpressao: new Date().toLocaleDateString('pt-BR'),
    refeicoes,
    resumoDia,
    totais: {
      protAtual: proteinaEscolhidaTotal,
      protPrev: proteinaSugeridaTotal,
      kcalAtual: caloriasEscolhidaTotal,
      kcalPrev: caloriasSugeridaTotal,
    },
  };
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function NutriContent({
  paciente,
  setPaciente,
  onlyChatNutri = false,
  chatNutriDataSelecionada,
  onChatNutriDataChange,
}: NutriContentProps) {
  const [view, setView] = useState<'loading' | 'wizard' | 'plano' | 'checkin'>('loading');
  const [activeTab, setActiveTab] = useState<
    'plano' | 'cardapio' | 'historico' | 'chatnutri'
  >('plano');
  const [activePlanoFolder, setActivePlanoFolder] = useState<
    'hipotese' | 'meta_proteinas' | 'meta_agua'
  >('hipotese');
  const [activeCardapioMeal, setActiveCardapioMeal] = useState<RefeicaoKey>('cafe');
  const [cardapioPrintModalOpen, setCardapioPrintModalOpen] = useState(false);
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
  const [loadingMaisCheckIns, setLoadingMaisCheckIns] = useState(false);
  const [checkInsCursor, setCheckInsCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [temMaisCheckIns, setTemMaisCheckIns] = useState(false);
  const [historicoMesCalendario, setHistoricoMesCalendario] = useState<Date>(new Date());
  const [historicoDiaSelecionado, setHistoricoDiaSelecionado] = useState<Date | null>(null);
  const [historicoFocusDate, setHistoricoFocusDate] = useState<string | null>(null);
  const [historicoDatePendenteAbertura, setHistoricoDatePendenteAbertura] = useState<string | null>(null);
  const historicoResultadoRef = useRef<HTMLDivElement | null>(null);
  const [showCheckInSalvoModal, setShowCheckInSalvoModal] = useState(false);
  const [checkInSalvoMensagem, setCheckInSalvoMensagem] = useState('Check-in salvo com sucesso!');
  // Removido: checkInHojeExiste não é mais necessário com a nova lógica de data
  
  // Estado para a data do check-in (permite até 3 dias retroativos)
  const [checkInDate, setCheckInDate] = useState<string>(() => {
    // Inicializar com data de hoje (YYYY-MM-DD)
    return new Date().toISOString().split('T')[0];
  });
  const [internalChatNutriDate, setInternalChatNutriDate] = useState<string>(() => {
    const fromProp = chatNutriDataSelecionada?.trim();
    if (fromProp) return fromProp;
    return new Date().toISOString().split('T')[0];
  });
  const [isClient, setIsClient] = useState(false);
  const [isEditandoCheckIn, setIsEditandoCheckIn] = useState(false);
  const [checkInWizardStep, setCheckInWizardStep] = useState(0);

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
  
  // Estados para meal builder
  const [itensSelecionadosRefeicao, setItensSelecionadosRefeicao] = useState<Record<string, boolean>>({});
  const [macrosRefeicaoAtual, setMacrosRefeicaoAtual] = useState<{ proteinaTotal_g: number; caloriasTotal_kcal: number }>({ 
    proteinaTotal_g: 0, 
    caloriasTotal_kcal: 0 
  });
  const [configuracaoBuilder, setConfiguracaoBuilder] = useState<Record<RefeicaoKey, ConfiguracaoRefeicao> | null>(null);
  const [abaBuilderAtiva, setAbaBuilderAtiva] = useState<ModalBuilderTab>('proteina');
  const [itensCustomizadosPorRefeicao, setItensCustomizadosPorRefeicao] = useState<Record<RefeicaoKey, ItemRefeicao[]>>({
    cafe: [],
    lanche1: [],
    almoco: [],
    lanche2: [],
    jantar: [],
  });
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [tacoQuery, setTacoQuery] = useState('');
  const [tacoResultados, setTacoResultados] = useState<TacoSearchItem[]>([]);
  const [loadingTaco, setLoadingTaco] = useState(false);
  const [tacoSelecionado, setTacoSelecionado] = useState<TacoSearchItem | null>(null);
  const [pesoNovoItem, setPesoNovoItem] = useState<number>(100);

  // ============================================
  // CARREGAMENTO DE DADOS
  // ============================================

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (chatNutriDataSelecionada?.trim()) {
      setInternalChatNutriDate(chatNutriDataSelecionada.trim());
    }
  }, [chatNutriDataSelecionada]);

  const chatNutriDateKey =
    chatNutriDataSelecionada?.trim() || internalChatNutriDate;

  const handleChatNutriDateInput = (dateKey: string) => {
    setInternalChatNutriDate(dateKey);
    onChatNutriDataChange?.(dateKey);
  };

  // Carregar check-ins quando a aba Histórico for selecionada
  useEffect(() => {
    if (activeTab === 'historico' && plano && checkIns.length === 0 && !loadingCheckIns) {
      loadCheckIns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, plano]);

  // Inicializar builder quando modal abrir
  useEffect(() => {
    if (refeicaoEmEdicao && plano) {
      const configBase = gerarConfiguracaoBuilderPorRefeicao(
        plano,
        plano.restricoesPaciente || [],
        plano.preferenciasProteinaPaciente || []
      );
      const config = { ...configBase };
      const itensCustomDaRefeicao =
        itensCustomizadosPorRefeicao[refeicaoEmEdicao] ||
        plano.itensCustomizadosPorRefeicao?.[refeicaoEmEdicao] ||
        [];
      if (itensCustomDaRefeicao.length > 0) {
        const idsExistentes = new Set(config[refeicaoEmEdicao].itensDisponiveis.map((i) => i.id));
        const novosItens = itensCustomDaRefeicao.filter((item) => !idsExistentes.has(item.id));
        if (novosItens.length > 0) {
          config[refeicaoEmEdicao] = {
            ...config[refeicaoEmEdicao],
            itensDisponiveis: [...config[refeicaoEmEdicao].itensDisponiveis, ...novosItens],
          };
        }
      }
      setConfiguracaoBuilder(config);
      
      // Resetar aba para proteína ao abrir modal
      setAbaBuilderAtiva('proteina');
      
      // Inicializar itens selecionados
      const configRefeicao = config[refeicaoEmEdicao];
      const itensIniciais: Record<string, boolean> = {};
      
      // Verificar se já existe uma opção selecionada para esta refeição
      const opcaoSelecionadaId = plano.opcoesSelecionadas?.[refeicaoEmEdicao];
      
      if (opcaoSelecionadaId && opcaoSelecionadaId.startsWith('custom_')) {
        // Se é uma opção customizada, tentar carregar os itens salvos
        const opcaoCustom = opcoesRefeicoes[refeicaoEmEdicao]?.find(o => o.id === opcaoSelecionadaId);
        
        if (opcaoCustom && opcaoCustom.itensSelecionados) {
          // Restaurar itens selecionados da opção customizada
          opcaoCustom.itensSelecionados.forEach(itemId => {
            // Verificar se o item ainda existe na lista de disponíveis
            const itemExiste = configRefeicao.itensDisponiveis.some(i => i.id === itemId);
            if (itemExiste) {
              itensIniciais[itemId] = true;
            }
          });
        }
      }
      
      // Se não encontrou itens salvos ou não é customizada, usar sugestão padrão
      if (Object.keys(itensIniciais).length === 0) {
        // Sugerir uma proteína padrão
        const proteinaPadrao = configRefeicao.itensDisponiveis.find(i => 
          i.categoria === 'proteina' && 
          (i.id.includes('frango_100g') || i.id.includes('ovos_2un') || i.id.includes('whey'))
        );
        if (proteinaPadrao) {
          itensIniciais[proteinaPadrao.id] = true;
        }
        
        // Para almoço e jantar, sugerir salada
        if (refeicaoEmEdicao === 'almoco' || refeicaoEmEdicao === 'jantar') {
          const saladaPadrao = configRefeicao.itensDisponiveis.find(i => 
            i.categoria === 'legumes_salada' && i.id.includes('salada_grande')
          );
          if (saladaPadrao) {
            itensIniciais[saladaPadrao.id] = true;
          }
        }
      }
      
      setItensSelecionadosRefeicao(itensIniciais);
      
      // Calcular macros iniciais
      const macros = calcularMacrosRefeicao(configRefeicao, itensIniciais);
      setMacrosRefeicaoAtual(macros);
    } else {
      setItensSelecionadosRefeicao({});
      setMacrosRefeicaoAtual({ proteinaTotal_g: 0, caloriasTotal_kcal: 0 });
      setAbaBuilderAtiva('proteina');
    }
  }, [refeicaoEmEdicao, plano, itensCustomizadosPorRefeicao]);

  // Recalcular macros quando itens selecionados mudarem
  useEffect(() => {
    if (refeicaoEmEdicao && configuracaoBuilder) {
      const configRefeicao = configuracaoBuilder[refeicaoEmEdicao];
      const macros = calcularMacrosRefeicao(configRefeicao, itensSelecionadosRefeicao);
      setMacrosRefeicaoAtual(macros);
    }
  }, [itensSelecionadosRefeicao, refeicaoEmEdicao, configuracaoBuilder]);

  useEffect(() => {
    if (onlyChatNutri) return;

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
            
            // Carregar restrições e preferências do plano (se salvos) ou usar arrays vazios
            const opcoesDisponiveis = gerarOpcoesRefeicoes(
              planoCarregado.estilo,
              protCafe,
              protAlmoco,
              protJantar,
              protLanche,
              planoCarregado.restricoesPaciente || [],
              planoCarregado.preferenciasProteinaPaciente || []
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
            
            // Carregar restrições e preferências do plano (se salvos) ou usar arrays vazios
            const opcoesDisponiveis = gerarOpcoesRefeicoes(
              planoCarregado.estilo,
              protCafe,
              protAlmoco,
              protJantar,
              protLanche,
              planoCarregado.restricoesPaciente || [],
              planoCarregado.preferenciasProteinaPaciente || []
            );
            
            // Adicionar opções customizadas salvas ao opcoesDisponiveis
            if (planoCarregado.opcoesCustomizadas) {
              const refeicoes: RefeicaoKey[] = ['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'];
              refeicoes.forEach(refeicaoKey => {
                const customizadas = planoCarregado.opcoesCustomizadas![refeicaoKey];
                if (customizadas && customizadas.length > 0) {
                  // Adicionar apenas se não existir já
                  customizadas.forEach(opcaoCustom => {
                    if (!opcoesDisponiveis[refeicaoKey].find(o => o.id === opcaoCustom.id)) {
                      opcoesDisponiveis[refeicaoKey].push(opcaoCustom);
                    }
                  });
                }
              });
            }
            
            setOpcoesRefeicoes(opcoesDisponiveis);
          }
          
          // Inicializar macrosPorRefeicao com valores sugeridos para todas as refeições
          // (mesmo que não tenham sido modificadas)
          if (!planoCarregado.macrosPorRefeicao) {
            planoCarregado.macrosPorRefeicao = {};
          }
          
          const refeicoes: RefeicaoKey[] = ['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'];
          refeicoes.forEach(refeicaoKey => {
            if (!planoCarregado.macrosPorRefeicao![refeicaoKey]) {
              const valoresSugeridos = calcularValoresSugeridos(refeicaoKey, planoCarregado);
              planoCarregado.macrosPorRefeicao![refeicaoKey] = {
                proteinaSugerida_g: valoresSugeridos.proteinaSugerida_g,
                proteinaEscolhida_g: 0, // Ainda não foi modificado
                caloriasSugeridas_kcal: valoresSugeridos.caloriasSugerida_kcal,
                caloriasEscolhidas_kcal: 0 // Ainda não foi modificado
              };
            }
          });
          
          setPlano(planoCarregado);
          setItensCustomizadosPorRefeicao({
            cafe: planoCarregado.itensCustomizadosPorRefeicao?.cafe || [],
            lanche1: planoCarregado.itensCustomizadosPorRefeicao?.lanche1 || [],
            almoco: planoCarregado.itensCustomizadosPorRefeicao?.almoco || [],
            lanche2: planoCarregado.itensCustomizadosPorRefeicao?.lanche2 || [],
            jantar: planoCarregado.itensCustomizadosPorRefeicao?.jantar || [],
          });
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
  }, [paciente, onlyChatNutri]);

  // ============================================
  // FUNÇÕES DE DADOS BÁSICOS
  // ============================================

  // Função para obter o peso atual do paciente
  // Usa a mesma lógica do Home: último registro de evolucaoSeguimento (sem ordenar por data)
  const obterPesoAtual = (): number => {
    // Buscar último peso na evolução de seguimento (mesma lógica do Home)
    const evolucao = paciente?.evolucaoSeguimento || [];
    if (evolucao.length > 0) {
      // Pegar o último registro (mesma lógica do Home: evolucao[evolucao.length - 1])
      const ultimoRegistro = evolucao[evolucao.length - 1];
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
    
    // Gerar opções de refeições baseadas no estilo, restrições e preferências
    const opcoesDisponiveis = gerarOpcoesRefeicoes(
      estilo, 
      protCafe, 
      protAlmoco, 
      protJantar, 
      protLanche,
      wizardData.restricoes,
      wizardData.preferenciasProteina
    );
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
   * Calcula macros da refeição atual baseado nos itens selecionados
   */
  const calcularMacrosRefeicao = (
    config: ConfiguracaoRefeicao,
    itensSelecionados: Record<string, boolean>
  ): { proteinaTotal_g: number; caloriasTotal_kcal: number } => {
    let proteinaTotal_g = 0;
    let caloriasTotal_kcal = 0;

    Object.entries(itensSelecionados).forEach(([itemId, selecionado]) => {
      if (selecionado) {
        const item = config.itensDisponiveis.find(i => i.id === itemId);
        if (item) {
          proteinaTotal_g += item.proteina_g;
          caloriasTotal_kcal += item.calorias_kcal;
        }
      }
    });

    return { proteinaTotal_g, caloriasTotal_kcal };
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
   * Lida com a seleção de um item no builder, respeitando limites por categoria
   */
  const handleSelecionarItem = (itemId: string, categoria: CategoriaItemRefeicao) => {
    if (!refeicaoEmEdicao || !configuracaoBuilder) return;
    
    const config = configuracaoBuilder[refeicaoEmEdicao];
    const item = config.itensDisponiveis.find(i => i.id === itemId);
    if (!item) return;

    const tabDaCategoria: ModalBuilderTab =
      categoria === 'proteina'
        ? 'proteina'
        : categoria === 'carboidrato'
          ? 'carboidrato'
          : categoria === 'gordura_boa'
            ? 'gordura'
            : 'reguladores';
    
    const novosItens = { ...itensSelecionadosRefeicao };
    const categoriasDoTab = MODAL_TAB_CATEGORIES[tabDaCategoria];
    const itensDoMesmoTab = config.itensDisponiveis.filter(i => categoriasDoTab.includes(i.categoria));
    const itensSelecionadosDoMesmoTab = itensDoMesmoTab.filter(i => novosItens[i.id]);
    const maxItens = MODAL_TAB_LIMITS[tabDaCategoria];

    if (novosItens[itemId]) {
      delete novosItens[itemId];
    } else {
      if (itensSelecionadosDoMesmoTab.length >= maxItens) {
        return;
      }
      novosItens[itemId] = true;
    }
    
    setItensSelecionadosRefeicao(novosItens);
  };

  const abrirModalAdicionarItem = () => {
    setTacoQuery('');
    setTacoResultados([]);
    setTacoSelecionado(null);
    setPesoNovoItem(100);
    setShowAddItemModal(true);
  };

  const adicionarItemTacoNaRefeicao = () => {
    if (!refeicaoEmEdicao || !configuracaoBuilder || !tacoSelecionado) return;
    const fator = Math.max(1, pesoNovoItem) / 100;
    const categoriaDestino: CategoriaItemRefeicao =
      abaBuilderAtiva === 'proteina'
        ? 'proteina'
        : abaBuilderAtiva === 'carboidrato'
          ? 'carboidrato'
          : abaBuilderAtiva === 'gordura'
            ? 'gordura_boa'
            : 'legumes_salada';

    const novoItem: ItemRefeicao = {
      id: `taco_${refeicaoEmEdicao}_${Date.now()}`,
      nome: `${tacoSelecionado.nome} (${Math.round(Math.max(1, pesoNovoItem))}g)`,
      categoria: categoriaDestino,
      proteina_g: Math.round((tacoSelecionado.proteinas * fator) * 10) / 10,
      calorias_kcal: Math.round(tacoSelecionado.calorias * fator),
      descricao: `Base TACO • ${Math.round(Math.max(1, pesoNovoItem))}g`,
    };

    const proximaListaCustom = {
      ...itensCustomizadosPorRefeicao,
      [refeicaoEmEdicao]: [...(itensCustomizadosPorRefeicao[refeicaoEmEdicao] || []), novoItem],
    };
    setItensCustomizadosPorRefeicao(proximaListaCustom);

    const configAtual = configuracaoBuilder[refeicaoEmEdicao];
    const proximoConfig = {
      ...configuracaoBuilder,
      [refeicaoEmEdicao]: {
        ...configAtual,
        itensDisponiveis: [...configAtual.itensDisponiveis, novoItem],
      },
    };
    setConfiguracaoBuilder(proximoConfig);

    setItensSelecionadosRefeicao((anterior) => ({
      ...anterior,
      [novoItem.id]: true,
    }));
    setShowAddItemModal(false);
  };

  const checkInWizardMeta = useMemo(() => {
    const planoTerapeutico = paciente?.planoTerapeutico;
    const diaAplicacao = verificarSeHojeEDiaAplicacao();

    const evolucao = paciente?.evolucaoSeguimento || [];
    let ultimoPeso: number | undefined;
    let ultimaDataPeso: Date | undefined;
    if (evolucao.length > 0) {
      const evolucaoOrdenada = [...evolucao].sort((a, b) => {
        const dataA = a.dataRegistro instanceof Date ? a.dataRegistro.getTime() : new Date(a.dataRegistro).getTime();
        const dataB = b.dataRegistro instanceof Date ? b.dataRegistro.getTime() : new Date(b.dataRegistro).getTime();
        return dataB - dataA;
      });
      const ultimoRegistroComPeso = evolucaoOrdenada.find((s) => s.peso && s.peso > 0);
      if (ultimoRegistroComPeso) {
        ultimoPeso = ultimoRegistroComPeso.peso;
        ultimaDataPeso =
          ultimoRegistroComPeso.dataRegistro instanceof Date
            ? ultimoRegistroComPeso.dataRegistro
            : new Date(ultimoRegistroComPeso.dataRegistro);
      }
    }
    if (!ultimoPeso) {
      ultimoPeso = paciente?.dadosClinicos?.medidasIniciais?.peso;
    }
    const diasDesdeUltimoPeso = ultimaDataPeso
      ? Math.floor((new Date().getTime() - ultimaDataPeso.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const showPeso = diasDesdeUltimoPeso > 7 || !ultimoPeso;

    const historicoDoses = planoTerapeutico?.historicoDoses || [];
    const ultimaMudanca =
      historicoDoses.length > 0 ? new Date(historicoDoses[historicoDoses.length - 1].data) : null;
    const diasDesdeMudanca = ultimaMudanca
      ? Math.floor((new Date().getTime() - ultimaMudanca.getTime()) / (1000 * 60 * 60 * 24))
      : 999;
    const showSintomas = diasDesdeMudanca <= 7 && historicoDoses.length > 0;

    return { diaAplicacao, showPeso, showSintomas };
  }, [paciente]);

  useEffect(() => {
    if (!showAddItemModal) return;
    const termo = tacoQuery.trim();
    if (termo.length < 2) {
      setTacoResultados([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoadingTaco(true);
        const res = await fetch(`/api/taco-buscar?q=${encodeURIComponent(termo)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setTacoResultados((data?.alimentos || []) as TacoSearchItem[]);
      } catch (_error) {
        setTacoResultados([]);
      } finally {
        setLoadingTaco(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [tacoQuery, showAddItemModal]);

  /**
   * Gera texto legível da refeição montada
   */
  const gerarTextoRefeicao = (itensSelecionados: Record<string, boolean>, config: ConfiguracaoRefeicao): string => {
    const itens = config.itensDisponiveis.filter(i => itensSelecionados[i.id]);
    const partes: string[] = [];
    
    // Ordenar por categoria
    const proteinas = itens.filter(i => i.categoria === 'proteina');
    const carboidratos = itens.filter(i => i.categoria === 'carboidrato');
    const legumes = itens.filter(i => i.categoria === 'legumes_salada');
    const gorduras = itens.filter(i => i.categoria === 'gordura_boa');
    const extras = itens.filter(i => i.categoria === 'extra');
    const lixo = itens.filter(i => i.categoria === 'lixo');
    
    proteinas.forEach(p => partes.push(p.nome));
    carboidratos.forEach(c => partes.push(c.nome));
    legumes.forEach(l => partes.push(l.nome));
    gorduras.forEach(g => partes.push(g.nome));
    extras.forEach(e => partes.push(e.nome));
    if (lixo.length > 0) {
      partes.push(`+ Lixo: ${lixo.map(l => l.nome).join(', ')}`);
    }
    
    return partes.join(' + ') || 'Refeição personalizada';
  };

  /**
   * Salva alterações do cardápio usando meal builder
   */
  const salvarAlteracoesCardapio = async () => {
    if (!plano || !refeicaoEmEdicao || !configuracaoBuilder) return;
    
    try {
      const config = configuracaoBuilder[refeicaoEmEdicao];
      
      // Verificar se há pelo menos uma proteína selecionada
      const temProteina = config.itensDisponiveis.some(i => 
        i.categoria === 'proteina' && itensSelecionadosRefeicao[i.id]
      );
      
      if (!temProteina) {
        alert('Por favor, selecione pelo menos uma fonte de proteína.');
        return;
      }
      
      // Gerar texto da refeição
      const textoRefeicao = gerarTextoRefeicao(itensSelecionadosRefeicao, config);
      
      // Extrair IDs dos itens selecionados
      const idsItensSelecionados = Object.keys(itensSelecionadosRefeicao).filter(
        id => itensSelecionadosRefeicao[id]
      );
      
      // Criar opção customizada
      const opcaoCustom: OpcaoRefeicao = {
        id: `custom_${refeicaoEmEdicao}_${Date.now()}`,
        titulo: 'Refeição personalizada',
        descricao: textoRefeicao,
        proteina_g: macrosRefeicaoAtual.proteinaTotal_g,
        calorias_kcal: macrosRefeicaoAtual.caloriasTotal_kcal,
        itensSelecionados: idsItensSelecionados // Salvar IDs para reconstruir depois
      };
      
      // Adicionar opção customizada ao opcoesRefeicoes se não existir
      const opcoesAtualizadas = { ...opcoesRefeicoes };
      if (!opcoesAtualizadas[refeicaoEmEdicao].find(o => o.id === opcaoCustom.id)) {
        opcoesAtualizadas[refeicaoEmEdicao] = [...opcoesAtualizadas[refeicaoEmEdicao], opcaoCustom];
        setOpcoesRefeicoes(opcoesAtualizadas);
      }
      
      // Atualizar opções customizadas no plano
      const opcoesCustomizadasAtualizadas = {
        ...(plano.opcoesCustomizadas || {}),
        [refeicaoEmEdicao]: opcoesAtualizadas[refeicaoEmEdicao].filter(o => o.id.startsWith('custom_'))
      };
      
      // Criar cópia das opções selecionadas com a alteração
      const opcoesSelecionadasAtualizadas = {
        ...(plano.opcoesSelecionadas || {}),
        [refeicaoEmEdicao]: opcaoCustom.id
      };
      
      // Aplicar ajuste automático se necessário
      const { opcoesAjustadas, mensagemAjuste } = ajustarProteinaAutomaticamente(
        opcoesSelecionadasAtualizadas,
        opcoesAtualizadas,
        plano.protDia_g
      );
      
      // Regenerar modeloDia
      const modeloDiaAtualizado = gerarModeloDiaFromOpcoes(opcoesAjustadas, opcoesAtualizadas);
      
      // Calcular macros sugeridas para esta refeição usando a função helper
      const valoresSugeridos = calcularValoresSugeridos(refeicaoEmEdicao, plano);
      
      // Atualizar macros por refeição
      const macrosPorRefeicaoAtualizado = {
        ...(plano.macrosPorRefeicao || {}),
        [refeicaoEmEdicao]: {
          proteinaSugerida_g: valoresSugeridos.proteinaSugerida_g,
          proteinaEscolhida_g: macrosRefeicaoAtual.proteinaTotal_g,
          caloriasSugerida_kcal: valoresSugeridos.caloriasSugerida_kcal,
          caloriasEscolhida_kcal: macrosRefeicaoAtual.caloriasTotal_kcal
        }
      };
      
      // Atualizar plano mantendo outros campos
      const planoAtualizado: PlanoNutricional = {
        ...plano,
        opcoesSelecionadas: opcoesAjustadas,
        modeloDia: modeloDiaAtualizado,
        macrosPorRefeicao: macrosPorRefeicaoAtualizado,
        opcoesCustomizadas: opcoesCustomizadasAtualizadas,
        itensCustomizadosPorRefeicao
      };
      
      // Salvar no Firestore e atualizar estado
      await salvarPlanoNutricional(planoAtualizado);
      
      // Atualizar estado local imediatamente para refletir mudanças
      setPlano(planoAtualizado);
      
      // Fechar modal e limpar estados
      setRefeicaoEmEdicao(null);
      setOpcaoSelecionadaTemp('');
      setItensSelecionadosRefeicao({});
      setMacrosRefeicaoAtual({ proteinaTotal_g: 0, caloriasTotal_kcal: 0 });
      setAbaBuilderAtiva('proteina');
      
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
      const pageSize = 60;
      const checkInsQuery = query(checkInsRef, orderBy('timestamp', 'desc'), limit(pageSize));
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
      setCheckInsCursor(
        checkInsSnapshot.docs.length === pageSize
          ? (checkInsSnapshot.docs[checkInsSnapshot.docs.length - 1] as QueryDocumentSnapshot<DocumentData>)
          : null
      );
      setTemMaisCheckIns(checkInsSnapshot.docs.length === pageSize);
      // checkInHojeExiste não é mais necessário com a nova lógica de data
    } catch (error) {
      console.error('Erro ao carregar check-ins:', error);
    } finally {
      setLoadingCheckIns(false);
    }
  };

  const loadMoreCheckIns = async () => {
    if (!paciente?.id || !checkInsCursor || loadingMaisCheckIns) return;
    try {
      setLoadingMaisCheckIns(true);
      const pageSize = 60;
      const nutricaoDadosRef = doc(db, 'pacientes_completos', paciente.id, 'nutricao', 'dados');
      const checkInsRef = collection(nutricaoDadosRef, 'checkins');
      const checkInsQuery = query(
        checkInsRef,
        orderBy('timestamp', 'desc'),
        startAfter(checkInsCursor),
        limit(pageSize)
      );
      const checkInsSnapshot = await getDocs(checkInsQuery);
      const checkInsData: CheckInDiario[] = [];
      checkInsSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const dataCheckIn = docSnapshot.id.match(/^\d{4}-\d{2}-\d{2}$/)
          ? docSnapshot.id
          : (data.data || docSnapshot.id);
        checkInsData.push({
          proteinaOk: data.proteinaOk ?? false,
          frutasOk: data.frutasOk ?? false,
          aguaOk: data.aguaOk ?? false,
          lixoAlimentar: data.lixoAlimentar ?? false,
          probioticoTomou: data.probioticoTomou ?? false,
          wheyTomou: data.wheyTomou ?? false,
          creatinaTomou: data.creatinaTomou ?? false,
          sintomasGI: data.sintomasGI || 'nenhum',
          nauseas: data.nauseas || 'nenhum',
          constipacao: data.constipacao || 'nenhum',
          diarreia: data.diarreia || 'nenhum',
          horasSono: data.horasSono || '6-8h',
          humorEnergia: data.humorEnergia ?? 3,
          atividadeFisicaHoje: data.atividadeFisicaHoje || 'nenhuma',
          diaAplicacao: data.diaAplicacao || 'nao_foi_dia',
          localAplicacao: data.localAplicacao,
          observacoes: data.observacoes || '',
          aderenciaPlano: data.aderenciaPlano ?? 100,
          pesoHoje: data.pesoHoje,
          sintomasAumentoDose: data.sintomasAumentoDose,
          score: data.score || 0,
          data: dataCheckIn
        });
      });
      setCheckIns((prev) => {
        const ids = new Set(prev.map((c) => c.data));
        const merged = [...prev];
        checkInsData.forEach((ci) => {
          if (!ids.has(ci.data)) merged.push(ci);
        });
        return merged;
      });
      setCheckInsCursor(
        checkInsSnapshot.docs.length === pageSize
          ? (checkInsSnapshot.docs[checkInsSnapshot.docs.length - 1] as QueryDocumentSnapshot<DocumentData>)
          : null
      );
      setTemMaisCheckIns(checkInsSnapshot.docs.length === pageSize);
    } catch (error) {
      console.error('Erro ao carregar mais check-ins:', error);
    } finally {
      setLoadingMaisCheckIns(false);
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

  /**
   * Formata data do check-in (formato 'YYYY-MM-DD') para exibição curta
   * Evita problemas de timezone criando a data localmente
   */
  const formatarDataCheckIn = (dataStr: string): string => {
    if (!dataStr || !dataStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dataStr;
    }
    const [ano, mes, dia] = dataStr.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia);
    return data.toLocaleDateString('pt-BR', { 
      day: 'numeric', 
      month: 'short'
    });
  };

  /**
   * Formata data do check-in para exibição completa
   */
  const formatarDataCheckInCompleta = (dataStr: string): string => {
    if (!dataStr || !dataStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dataStr;
    }
    const [ano, mes, dia] = dataStr.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia);
    return data.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  useEffect(() => {
    if (view === 'checkin') setCheckInWizardStep(0);
  }, [view, checkInDate]);

  useEffect(() => {
    if (view !== 'checkin') return;
    const n = CHECK_IN_MOBILE_STEPS.length;
    setCheckInWizardStep((s) => Math.min(s, n - 1));
  }, [view]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (view !== 'checkin') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [view]);

  useEffect(() => {
    if (activeTab !== 'historico' || !historicoFocusDate || !historicoDiaSelecionado) return;
    const alvo = historicoFocusDate;
    const [y, m, d] = alvo.split('-').map(Number);
    if (!y || !m || !d) return;
    const selecionadoConfere =
      historicoDiaSelecionado.getFullYear() === y &&
      historicoDiaSelecionado.getMonth() === m - 1 &&
      historicoDiaSelecionado.getDate() === d;
    if (!selecionadoConfere) return;
    const t = setTimeout(() => {
      historicoResultadoRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      setHistoricoFocusDate(null);
    }, 140);
    return () => clearTimeout(t);
  }, [activeTab, historicoFocusDate, historicoDiaSelecionado, checkIns.length]);

  useEffect(() => {
    if (view !== 'plano' || activeTab !== 'historico' || !historicoDatePendenteAbertura) return;
    const [anoRef, mesRef, diaRef] = historicoDatePendenteAbertura.split('-').map(Number);
    if (!anoRef || !mesRef || !diaRef) {
      setHistoricoDatePendenteAbertura(null);
      return;
    }
    const dataSelecionada = new Date(anoRef, mesRef - 1, diaRef, 0, 0, 0, 0);
    setHistoricoMesCalendario(new Date(anoRef, mesRef - 1, 1, 0, 0, 0, 0));
    setHistoricoDiaSelecionado(dataSelecionada);
    setHistoricoFocusDate(historicoDatePendenteAbertura);
    setHistoricoDatePendenteAbertura(null);
  }, [view, activeTab, historicoDatePendenteAbertura]);

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
        caloriasDiarias_kcal: checkInData.caloriasDiarias_kcal || null,
        score: score,
        data: checkInDate, // Usar checkInDate em vez de dataHoje
        timestamp: Timestamp.now()
      };
      
      const nutricaoDadosRef = doc(db, 'pacientes_completos', paciente.id, 'nutricao', 'dados');
      const checkInRef = doc(nutricaoDadosRef, 'checkins', checkInDate); // Usar checkInDate como ID
      await setDoc(checkInRef, checkInComScore);
      
      setCheckInSalvoMensagem(isEditandoCheckIn ? 'Check-in atualizado com sucesso!' : 'Check-in salvo com sucesso!');
      await loadCheckIns();
      setHistoricoDatePendenteAbertura(checkInDate);
      setShowCheckInSalvoModal(true);
      
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

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  if (onlyChatNutri && paciente?.id) {
    return (
      <div className="flex flex-col gap-3 w-full max-w-full min-w-0 overflow-x-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">ChatNutri</span>
          <div className="flex items-center gap-2 shrink-0 max-w-full">
            <label
              htmlFor="nutri-only-chat-date"
              className="text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap"
            >
              Data
            </label>
            <input
              id="nutri-only-chat-date"
              type="date"
              value={chatNutriDateKey}
              onChange={(e) => handleChatNutriDateInput(e.target.value)}
              className="h-9 w-[10.25rem] max-w-[min(100%,10.25rem)] shrink-0 rounded-lg border border-gray-300 bg-white dark:bg-gray-900 dark:border-gray-600 px-2 text-sm text-gray-900 dark:text-white"
            />
          </div>
        </div>
        <ChatNutriPanel
          key={`chatnutri-only-${paciente.id}-${chatNutriDateKey}`}
          patientId={paciente.id}
          dateKey={chatNutriDateKey}
          className="w-full max-w-full min-w-0 flex-1"
        />
      </div>
    );
  }

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
    
    // Formatar data selecionada para exibição usando função auxiliar
    const dataFormatada = formatarDataCheckInCompleta(checkInDate);
    
    const metaAgua = plano ? `${plano.aguaDia_ml} ml` : '2-3 litros';

    const checkInWizMax = Math.max(0, CHECK_IN_MOBILE_STEPS.length - 1);
    const checkInWizIdx = Math.min(Math.max(0, checkInWizardStep), checkInWizMax);
    const checkInWizAtivo = CHECK_IN_MOBILE_STEPS[checkInWizIdx];
    const CheckInWizHeaderIcon = checkInWizAtivo?.Icon ?? UtensilsCrossed;
    const checkInWizPanelClass = (key: string) => {
      const i = CHECK_IN_MOBILE_STEPS.findIndex((s) => s.key === key);
      if (i < 0) return 'hidden';
      return checkInWizIdx === i ? 'block' : 'hidden sm:block';
    };

    const fecharCheckInModal = () => {
      setView('plano');
      setCheckInDate(new Date().toISOString().split('T')[0]);
    };

    const confirmarCheckInSalvo = () => {
      setShowCheckInSalvoModal(false);
      setView('plano');
      setActiveTab('historico');
    };

    const checkInModalPainel = (
      <div className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-gradient-to-b from-[#06152e] via-[#0A1F44] to-[#0d2a5a] text-[#E8EDED] dark">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 bg-[#0A1F44]/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#4CCB7A]/40 bg-[#4CCB7A]/10 text-[#4CCB7A]">
              <Calendar className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 id="checkin-nutri-modal-title" className="text-lg font-bold leading-tight sm:text-xl">Check-in Nutri</h2>
              <p className="mt-0.5 text-xs text-[#E8EDED]/65">Escolha o dia (até 3 dias atrás).</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fecharCheckInModal}
            className="shrink-0 rounded-xl border border-white/15 p-2.5 text-[#E8EDED] transition-colors hover:bg-white/10"
            aria-label="Fechar check-in"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4 pb-6 sm:px-6">
          {/* Data e avisos — contraste explícito no modal escuro (evita texto preto no fundo escuro) */}
          <div className="mb-6 rounded-2xl border border-white/12 bg-[#06152e]/85 p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] sm:p-5">
            <div className="mb-1">
              <label
                htmlFor="checkin-data-ref"
                className="mb-2 block text-sm font-medium text-[#E8EDED]"
              >
                Este check-in é referente a qual dia?
              </label>
              <input
                id="checkin-data-ref"
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
                className="w-full max-w-[16rem] rounded-xl border border-white/18 bg-[#0A1F44]/90 px-3 py-2.5 text-sm text-[#E8EDED] [color-scheme:dark] placeholder:text-[#E8EDED]/45 focus:border-[#4CCB7A]/50 focus:outline-none focus:ring-2 focus:ring-[#4CCB7A]/35 md:px-4 md:text-base [&::-webkit-calendar-picker-indicator]:opacity-90 [&::-webkit-calendar-picker-indicator]:invert"
              />
              <p className="mt-2 text-sm text-[#E8EDED]/70">{dataFormatada}</p>
            </div>
            
            {isEditandoCheckIn && (
              <div className="rounded-xl border border-[#4CCB7A]/35 bg-[#4CCB7A]/10 dark:bg-[#4CCB7A]/15 p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-[#2F8FA3] dark:text-[#4CCB7A] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED] mb-1">
                      Check-in já realizado para esta data
                    </p>
                    <p className="text-sm text-[#0A1F44]/80 dark:text-[#E8EDED]/80">
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
            {/* Mobile: mesmo padrão da home — "O que oferecemos" (abas + progresso + contexto) */}
            <div className="sm:hidden mb-4 -mx-1">
              <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/80 overflow-hidden shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)]">
                <div className="grid grid-cols-5 border-b border-white/10 bg-white/5">
                  {CHECK_IN_MOBILE_STEPS.map((step, index) => {
                    const active = index === checkInWizIdx;
                    const StepIcon = step.Icon;
                    return (
                      <button
                        key={step.key}
                        type="button"
                        onClick={() => setCheckInWizardStep(index)}
                        className={`flex flex-col items-center justify-center gap-1 py-2 border-r border-white/10 last:border-r-0 transition-all ${
                          active ? 'bg-[#4CCB7A]/12 text-[#4CCB7A]' : 'text-[#E8EDED]/65'
                        }`}
                        aria-current={active ? 'step' : undefined}
                        aria-label={step.title}
                      >
                        <StepIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" aria-hidden />
                        <span className="text-[9px] font-semibold leading-tight text-center px-0">{step.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="p-4 transition-all">
                  <div className="mb-3 flex items-center justify-between gap-2 text-xs text-[#E8EDED]/65">
                    <span>
                      Item <span className="font-semibold text-[#4CCB7A]">{checkInWizIdx + 1}</span> / {CHECK_IN_MOBILE_STEPS.length}
                    </span>
                    <span className="text-[#E8EDED]/50 truncate text-right">{checkInWizAtivo?.title}</span>
                  </div>
                  <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#2F8FA3] to-[#4CCB7A] transition-all duration-300"
                      style={{
                        width: `${((checkInWizIdx + 1) / Math.max(1, CHECK_IN_MOBILE_STEPS.length)) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-[#4CCB7A] to-[#2F8FA3] flex items-center justify-center">
                      <CheckInWizHeaderIcon className="w-5 h-5 text-white" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-[#E8EDED] leading-snug">{checkInWizAtivo?.title}</h3>
                      <p className="text-[#E8EDED]/70 text-xs leading-relaxed mt-1">
                        {checkInWizIdx >= checkInWizMax ? (
                          <>
                            Última etapa: use <strong className="font-semibold text-[#E8EDED]/85">Anterior</strong>,{' '}
                            <strong className="font-semibold text-[#4CCB7A]">Salvar check-in</strong> ou{' '}
                            <strong className="font-semibold text-[#E8EDED]/85">Cancelar</strong> na barra abaixo.
                          </>
                        ) : (
                          <>
                            Na barra ao final: <strong className="font-semibold text-[#E8EDED]/85">Anterior</strong> e{' '}
                            <strong className="font-semibold text-[#E8EDED]/85">Próximo</strong> para preencher todas as etapas antes de salvar.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
            {/* Etapa 1 – Alimentação e Proteína (um único card; linhas com divisores, sem cards internos) */}
            <div className={`${CHECKIN_STEP_SHELL} ${checkInWizPanelClass('alimentacao')}`}>
              <div className="mb-3 flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-[#4CCB7A]" />
                <h3 className="text-lg font-semibold text-[#E8EDED]">Alimentação e Proteína</h3>
              </div>
              <div className="divide-y divide-white/10">
                <label className="flex cursor-pointer items-center justify-between gap-3 py-3.5 first:pt-0 transition-colors hover:bg-white/[0.03]">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Activity className="h-5 w-5 shrink-0 text-[#4CCB7A]" />
                    <div className="min-w-0">
                      <p className="font-medium text-[#E8EDED]">Bati a meta de proteína do dia</p>
                      <p className="text-xs text-[#E8EDED]/60">Conseguiu atingir a meta de proteína?</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checkInData.proteinaOk}
                    onChange={(e) => setCheckInData({ ...checkInData, proteinaOk: e.target.checked })}
                    className="h-5 w-5 shrink-0 rounded border-white/25 bg-[#0A1F44]/80 text-[#4CCB7A] accent-[#4CCB7A] focus:ring-2 focus:ring-[#4CCB7A]/40"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between gap-3 py-3.5 transition-colors hover:bg-white/[0.03]">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Apple className="h-5 w-5 shrink-0 text-[#4CCB7A]" />
                    <div className="min-w-0">
                      <p className="font-medium text-[#E8EDED]">Comi frutas/vegetais conforme o plano</p>
                      <p className="text-xs text-[#E8EDED]/60">Consumiu frutas e vegetais hoje?</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checkInData.frutasOk}
                    onChange={(e) => setCheckInData({ ...checkInData, frutasOk: e.target.checked })}
                    className="h-5 w-5 shrink-0 rounded border-white/25 bg-[#0A1F44]/80 text-[#4CCB7A] accent-[#4CCB7A] focus:ring-2 focus:ring-[#4CCB7A]/40"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between gap-3 py-3.5 transition-colors hover:bg-white/[0.03]">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <XCircle className="h-5 w-5 shrink-0 text-[#4CCB7A]" />
                    <div className="min-w-0">
                      <p className="font-medium text-[#E8EDED]">Evitei lixos alimentares importantes</p>
                      <p className="text-xs text-[#E8EDED]/60">Não consumiu alimentos ultraprocessados?</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checkInData.lixoAlimentar === false}
                    onChange={(e) => setCheckInData({ ...checkInData, lixoAlimentar: !e.target.checked })}
                    className="h-5 w-5 shrink-0 rounded border-white/25 bg-[#0A1F44]/80 text-[#4CCB7A] accent-[#4CCB7A] focus:ring-2 focus:ring-[#4CCB7A]/40"
                  />
                </label>
              </div>
              
              {/* Calorias do Cardápio — mesma etapa, bloco separado só por divisória */}
              {plano && (() => {
                const refeicoes: RefeicaoKey[] = ['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'];
                let caloriasTotal = 0;
                
                refeicoes.forEach(refeicaoKey => {
                  const macrosSalvas = plano.macrosPorRefeicao?.[refeicaoKey];
                  if (macrosSalvas && macrosSalvas.caloriasEscolhida_kcal > 0) {
                    caloriasTotal += macrosSalvas.caloriasEscolhida_kcal;
                  } else {
                    const valoresSugeridos = calcularValoresSugeridos(refeicaoKey, plano);
                    caloriasTotal += valoresSugeridos.caloriasSugerida_kcal;
                  }
                });
                
                // Calcular meta de calorias (estimativa baseada no peso e estilo)
                const pesoAtual = obterPesoAtual();
                // Meta aproximada: 20-25 kcal/kg para perda de peso com Tirzepatida
                const metaCaloriasMin = Math.round(pesoAtual * 20);
                const metaCaloriasMax = Math.round(pesoAtual * 25);
                const estaDentroDaMeta = caloriasTotal >= metaCaloriasMin && caloriasTotal <= metaCaloriasMax * 1.2;
                
                // Atualizar checkInData com calorias
                if (checkInData.caloriasDiarias_kcal !== caloriasTotal) {
                  setCheckInData({ ...checkInData, caloriasDiarias_kcal: caloriasTotal });
                }
                
                return (
                  <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 shrink-0 text-[#4CCB7A]" />
                        <p className="text-sm font-medium text-[#E8EDED]">Calorias do cardápio de hoje</p>
                      </div>
                      <p className="text-lg font-bold text-[#4CCB7A]">{caloriasTotal} kcal</p>
                    </div>
                    <p className="mb-2 text-xs text-[#E8EDED]/60">
                      Meta sugerida: {metaCaloriasMin}-{metaCaloriasMax} kcal/dia
                    </p>
                    {!estaDentroDaMeta && (
                      <div className="mt-2 rounded-lg border border-[#2F8FA3]/35 bg-[#2F8FA3]/12 p-3">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#4CCB7A]" />
                          <div>
                            <p className="mb-1 text-xs font-semibold text-[#E8EDED]">
                              Calorias fora da meta recomendada
                            </p>
                            <p className="text-xs text-[#E8EDED]/75">
                              Isso será notificado ao seu médico e pode comprometer o bom andamento do tratamento.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            
            {/* Etapa 2 – Água e Suplementos */}
            <div className={`${CHECKIN_STEP_SHELL} ${checkInWizPanelClass('agua')}`}>
              <div className="mb-3 flex items-center gap-2">
                <Droplet className="h-5 w-5 text-[#4CCB7A]" />
                <h3 className="text-lg font-semibold text-[#E8EDED]">Água e Suplementos</h3>
              </div>
              <div className="divide-y divide-white/10">
                <label className="flex cursor-pointer items-center justify-between gap-3 py-3.5 first:pt-0 transition-colors hover:bg-white/[0.03]">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Droplet className="h-5 w-5 shrink-0 text-[#4CCB7A]" />
                    <div className="min-w-0">
                      <p className="font-medium text-[#E8EDED]">Bebi pelo menos {metaAgua} de água hoje</p>
                      <p className="text-xs text-[#E8EDED]/60">Atingiu a meta de hidratação?</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checkInData.aguaOk}
                    onChange={(e) => setCheckInData({ ...checkInData, aguaOk: e.target.checked })}
                    className="h-5 w-5 shrink-0 rounded border-white/25 bg-[#0A1F44]/80 text-[#4CCB7A] accent-[#4CCB7A] focus:ring-2 focus:ring-[#4CCB7A]/40"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between gap-3 py-3.5 transition-colors hover:bg-white/[0.03]">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Pill className="h-5 w-5 shrink-0 text-[#4CCB7A]" />
                    <div className="min-w-0">
                      <p className="font-medium text-[#E8EDED]">Tomei a cápsula de probiótico hoje</p>
                      <p className="text-xs text-[#E8EDED]/60">Suplemento probiótico diário</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checkInData.probioticoTomou}
                    onChange={(e) => setCheckInData({ ...checkInData, probioticoTomou: e.target.checked })}
                    className="h-5 w-5 shrink-0 rounded border-white/25 bg-[#0A1F44]/80 text-[#4CCB7A] accent-[#4CCB7A] focus:ring-2 focus:ring-[#4CCB7A]/40"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between gap-3 py-3.5 transition-colors hover:bg-white/[0.03]">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Activity className="h-5 w-5 shrink-0 text-[#4CCB7A]" />
                    <div className="min-w-0">
                      <p className="font-medium text-[#E8EDED]">Tomei o whey protein conforme orientado</p>
                      <p className="text-xs text-[#E8EDED]/60">Suplemento proteico</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checkInData.wheyTomou}
                    onChange={(e) => setCheckInData({ ...checkInData, wheyTomou: e.target.checked })}
                    className="h-5 w-5 shrink-0 rounded border-white/25 bg-[#0A1F44]/80 text-[#4CCB7A] accent-[#4CCB7A] focus:ring-2 focus:ring-[#4CCB7A]/40"
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between gap-3 py-3.5 transition-colors hover:bg-white/[0.03]">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Dumbbell className="h-5 w-5 shrink-0 text-[#4CCB7A]" />
                    <div className="min-w-0">
                      <p className="font-medium text-[#E8EDED]">Tomei creatina hoje (3-5 g)</p>
                      <p className="text-xs text-[#E8EDED]/60">Suplemento de creatina</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={checkInData.creatinaTomou}
                    onChange={(e) => setCheckInData({ ...checkInData, creatinaTomou: e.target.checked })}
                    className="h-5 w-5 shrink-0 rounded border-white/25 bg-[#0A1F44]/80 text-[#4CCB7A] accent-[#4CCB7A] focus:ring-2 focus:ring-[#4CCB7A]/40"
                  />
                </label>
              </div>
            </div>

            {/* Etapa 3 — Corpo e bem-estar */}
            <div className={`${CHECKIN_STEP_SHELL} ${checkInWizPanelClass('corpo')}`}>
              <div className="mb-1 flex items-center gap-2">
                <Heart className="h-5 w-5 text-[#4CCB7A]" />
                <h3 className="text-lg font-semibold text-[#E8EDED]">Corpo e bem-estar</h3>
              </div>
              <p className="mb-5 text-xs text-[#E8EDED]/65">Sintomas digestivos, sono e humor no mesmo passo.</p>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-[#4CCB7A]" />
                  <h4 className="text-sm font-semibold text-[#E8EDED]">Sintomas gastrointestinais</h4>
                </div>
                <p className="text-xs text-[#E8EDED]/60">Se estiver grave, avise seu médico.</p>
                <div className="space-y-4">
                  <CheckInOptionPills
                    label="Náuseas"
                    value={checkInData.nauseas}
                    onChange={(v) => setCheckInData({ ...checkInData, nauseas: v })}
                    options={CHECKIN_SEVERIDADE_OPCOES}
                  />
                  <CheckInOptionPills
                    label="Constipação"
                    value={checkInData.constipacao}
                    onChange={(v) => setCheckInData({ ...checkInData, constipacao: v })}
                    options={CHECKIN_SEVERIDADE_OPCOES}
                  />
                  <CheckInOptionPills
                    label="Diarreia"
                    value={checkInData.diarreia}
                    onChange={(v) => setCheckInData({ ...checkInData, diarreia: v })}
                    options={CHECKIN_SEVERIDADE_OPCOES}
                  />
                </div>
              </div>

              <div className="mt-6 border-t border-white/10 pt-5">
                <div className="mb-4 flex items-center gap-2">
                  <Moon className="h-4 w-4 text-[#4CCB7A]" />
                  <h4 className="text-sm font-semibold text-[#E8EDED]">Sono, energia e humor</h4>
                </div>
                <div className="space-y-5">
                  <CheckInOptionPills
                    label="Horas de sono na última noite"
                    value={checkInData.horasSono}
                    onChange={(v) => setCheckInData({ ...checkInData, horasSono: v as typeof checkInData.horasSono })}
                    gridClassName="grid grid-cols-1 gap-2 sm:grid-cols-3"
                    options={[
                      { value: '<6h', label: 'Menos de 6 h' },
                      { value: '6-8h', label: '6 a 8 h' },
                      { value: '>8h', label: 'Mais de 8 h' },
                    ]}
                  />
                  <div>
                    <p className="mb-2 text-sm font-medium text-[#E8EDED]">
                      Humor / energia (1 = esgotado, 5 = ótimo)
                    </p>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((valor) => {
                        const active = checkInData.humorEnergia === valor;
                        return (
                          <button
                            key={valor}
                            type="button"
                            onClick={() => setCheckInData({ ...checkInData, humorEnergia: valor })}
                            className={`min-h-[44px] flex-1 rounded-xl border px-2 py-2.5 text-center text-sm font-semibold transition-all active:scale-[0.98] ${
                              active
                                ? 'border-[#4CCB7A]/55 bg-[#4CCB7A]/18 text-[#4CCB7A] shadow-[inset_0_0_0_1px_rgba(76,203,122,0.35)]'
                                : 'border-white/12 bg-[#0A1F44]/50 text-[#E8EDED]/90 hover:border-[#4CCB7A]/35'
                            }`}
                          >
                            {valor}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Etapa 4 — Metas do tratamento */}
            <div className={`${CHECKIN_STEP_SHELL} ${checkInWizPanelClass('meta')}`}>
              <div className="mb-3 flex items-center gap-2">
                <Target className="h-5 w-5 text-[#4CCB7A]" />
                <h3 className="text-lg font-semibold text-[#E8EDED]">Metas do tratamento</h3>
              </div>
              <p className="mb-5 text-xs text-[#E8EDED]/65">
                Medicamento, atividade, aderência e registros opcionais no mesmo passo.
              </p>

            {checkInWizardMeta.diaAplicacao && (
                  <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Syringe className="h-4 w-4 text-[#4CCB7A]" />
                    <h4 className="text-sm font-semibold text-[#E8EDED]">Aplicação da Tirzepatida</h4>
                  </div>
                    <div className="rounded-lg border border-[#4CCB7A]/35 bg-[#4CCB7A]/12 p-3">
                      <p className="text-sm font-medium text-[#E8EDED]">
                        Hoje é seu dia de aplicação da tirzepatida.
                      </p>
                    </div>
                    
                    <CheckInOptionPills
                      label="Como foi a aplicação?"
                      value={
                        checkInData.diaAplicacao === 'aplicou_no_horario' ||
                        checkInData.diaAplicacao === 'aplicou_atrasado' ||
                        checkInData.diaAplicacao === 'esqueceu'
                          ? checkInData.diaAplicacao
                          : undefined
                      }
                      onChange={(v) =>
                        setCheckInData({
                          ...checkInData,
                          diaAplicacao: v,
                          localAplicacao: v === 'esqueceu' ? undefined : checkInData.localAplicacao,
                        })
                      }
                      options={CHECKIN_DIA_APLICACAO_OPCOES}
                      gridClassName="grid grid-cols-1 gap-2 sm:grid-cols-3"
                    />
                    
                    {checkInData.diaAplicacao !== 'nao_foi_dia' && checkInData.diaAplicacao !== 'esqueceu' && (
                      <CheckInOptionPills
                        label="Local da aplicação"
                        value={checkInData.localAplicacao}
                        onChange={(v) => setCheckInData({ ...checkInData, localAplicacao: v })}
                        options={CHECKIN_LOCAL_APLICACAO_OPCOES}
                      />
                    )}
                    
                    {(checkInData.diaAplicacao === 'esqueceu' || checkInData.diaAplicacao === 'aplicou_atrasado') && (
                      <div className="rounded-lg border border-[#4CCB7A]/35 bg-[#4CCB7A]/12 p-3">
                        <p className="text-sm text-[#E8EDED]">
                          <strong>Importante:</strong> Se esquecer a dose ou tiver sintomas fortes, entre em contato com seu médico.
                        </p>
                      </div>
                    )}
                  </div>
            )}

            <div className={`space-y-6 ${checkInWizardMeta.diaAplicacao ? 'mt-6 border-t border-white/10 pt-6' : ''}`}>
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#4CCB7A]" />
                  <h4 className="text-sm font-semibold text-[#E8EDED]">Movimento / atividade</h4>
                </div>
                <CheckInOptionPills
                  label="Como foi sua atividade física hoje?"
                  value={checkInData.atividadeFisicaHoje}
                  onChange={(v) => setCheckInData({ ...checkInData, atividadeFisicaHoje: v })}
                  options={CHECKIN_ATIVIDADE_OPCOES}
                />
              </div>

              <div className="border-t border-white/10 pt-6">
                <div className="mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4 text-[#4CCB7A]" />
                  <h4 className="text-sm font-semibold text-[#E8EDED]">Aderência ao plano</h4>
                </div>
                <label className="mb-2 block text-sm font-medium text-[#E8EDED]">
                  Quanto você seguiu o plano nutricional hoje? ({checkInData.aderenciaPlano || 100}%)
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={checkInData.aderenciaPlano || 100}
                    onChange={(e) => setCheckInData({ ...checkInData, aderenciaPlano: parseInt(e.target.value) })}
                    className="w-full flex-1 accent-[#4CCB7A]"
                  />
                  <div className="flex flex-wrap justify-center gap-1 sm:justify-end">
                    {[25, 50, 75, 100].map((valor) => (
                      <button
                        key={valor}
                        type="button"
                        onClick={() => setCheckInData({ ...checkInData, aderenciaPlano: valor })}
                        className={`min-h-[40px] rounded-xl border px-2 py-1.5 text-xs font-semibold transition-all active:scale-[0.98] md:px-3 md:text-sm ${
                          (checkInData.aderenciaPlano || 100) === valor
                            ? 'border-[#4CCB7A]/55 bg-[#4CCB7A]/18 text-[#4CCB7A] shadow-[inset_0_0_0_1px_rgba(76,203,122,0.35)]'
                            : 'border-white/12 bg-[#0A1F44]/50 text-[#E8EDED]/90 hover:border-[#4CCB7A]/35'
                        }`}
                      >
                        {valor}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {(checkInWizardMeta.showPeso || checkInWizardMeta.showSintomas) && (
                <div className="space-y-6 border-t border-white/10 pt-6">
                  {checkInWizardMeta.showPeso && (
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        <Weight className="h-4 w-4 text-[#4CCB7A]" />
                        <h4 className="text-sm font-semibold text-[#E8EDED]">Peso de hoje (opcional)</h4>
                      </div>
                      <label className="mb-2 block text-sm font-medium text-[#E8EDED]">
                        Seu último peso registrado foi há mais de 7 dias ({(() => {
                          const pesoAtual = obterPesoAtual();
                          return pesoAtual ? `${pesoAtual.toFixed(1)} kg` : 'não disponível';
                        })()}). Quer registrar seu peso hoje?
                      </label>
                      <input
                        type="number"
                        value={checkInData.pesoHoje || ''}
                        onChange={(e) => setCheckInData({ ...checkInData, pesoHoje: e.target.value ? parseFloat(e.target.value) : undefined })}
                        className="w-full rounded-xl border border-white/18 bg-[#0A1F44]/90 px-4 py-2.5 text-[#E8EDED] placeholder:text-[#E8EDED]/40 focus:border-[#4CCB7A]/50 focus:outline-none focus:ring-2 focus:ring-[#4CCB7A]/35 [color-scheme:dark]"
                        placeholder="Ex: 75.5"
                        min="20"
                        max="400"
                        step="0.1"
                      />
                      <p className="mt-2 text-xs text-[#E8EDED]/65">Este dado ajuda a acompanhar sua evolução e ajustar o plano.</p>
                    </div>
                  )}
                  {checkInWizardMeta.showSintomas && (
                    <div className={checkInWizardMeta.showPeso ? 'border-t border-white/10 pt-6' : ''}>
                      <div className="mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-[#4CCB7A]" />
                        <h4 className="text-sm font-semibold text-[#E8EDED]">Semana de aumento de dose</h4>
                      </div>
                      <CheckInOptionPills
                        label="Está percebendo aumento de náuseas, vômitos ou falta de apetite em relação à semana passada?"
                        value={checkInData.sintomasAumentoDose || 'nenhum'}
                        onChange={(v) => setCheckInData({ ...checkInData, sintomasAumentoDose: v })}
                        options={CHECKIN_SINTOMAS_AUMENTO_OPCOES}
                      />
                      <p className="mt-3 text-xs text-[#E8EDED]/75">
                        <strong className="text-[#E8EDED]">Importante:</strong> Se os sintomas estiverem moderados ou intensos, avise seu médico imediatamente.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            </div>
            
            {/* Etapa 5 – Observações */}
            <div className={`${CHECKIN_STEP_SHELL} ${checkInWizPanelClass('observacoes')}`}>
              <div className="mb-3 flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-[#4CCB7A]" />
                <h3 className="text-lg font-semibold text-[#E8EDED]">Observações</h3>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-[#E8EDED]">
                  Quer deixar alguma observação para o seu médico?
                </label>
                <textarea
                  value={checkInData.observacoes || ''}
                  onChange={(e) => setCheckInData({ ...checkInData, observacoes: e.target.value })}
                  className="w-full resize-none rounded-xl border border-white/18 bg-[#06152e]/80 px-4 py-2.5 text-[#E8EDED] placeholder:text-[#E8EDED]/40 focus:border-[#4CCB7A]/50 focus:outline-none focus:ring-2 focus:ring-[#4CCB7A]/35 [color-scheme:dark]"
                  rows={3}
                  placeholder="Ex: Tive uma dor de cabeça leve no final da tarde..."
                />
              </div>
            </div>
          </div>

            {/* Cancelar + Salvar: só no desktop (sm+). No mobile a barra fixa do modal cobre isso na última etapa. */}
            <div className="mt-6 max-sm:hidden flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
              <button
                type="button"
                onClick={fecharCheckInModal}
                className="rounded-xl border-2 border-white/25 px-6 py-3 font-semibold text-[#E8EDED] transition-colors hover:border-[#4CCB7A] hover:text-[#4CCB7A]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarCheckIn}
                disabled={savingCheckIn}
                className="min-h-[48px] flex-1 rounded-xl bg-[#4CCB7A] px-8 py-3 font-semibold text-[#0A1F44] shadow-lg transition-all hover:bg-[#45b86d] hover:shadow-[#4CCB7A]/30 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
              >
                {savingCheckIn ? 'Salvando...' : 'Salvar check-in de hoje'}
              </button>
            </div>
            </>
          )}
        </div>

        {!isEditandoCheckIn && (
          <div
            className="shrink-0 border-t border-white/10 bg-[#0A1F44]/98 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden"
            role="navigation"
            aria-label="Navegação entre etapas do check-in"
          >
            {checkInWizIdx < checkInWizMax ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCheckInWizardStep((s) => Math.max(0, s - 1))}
                  disabled={checkInWizIdx === 0}
                  className="min-h-[44px] rounded-xl border border-white/15 text-sm font-semibold text-[#E8EDED] disabled:opacity-40 active:scale-[0.98]"
                >
                  <span className="inline-flex items-center justify-center gap-1">
                    <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                    Anterior
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setCheckInWizardStep((s) => Math.min(checkInWizMax, s + 1))}
                  className="min-h-[44px] rounded-xl border border-[#4CCB7A]/45 bg-[#4CCB7A]/15 text-sm font-semibold text-[#4CCB7A] active:scale-[0.98]"
                >
                  <span className="inline-flex items-center justify-center gap-1">
                    Próximo
                    <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
                  </span>
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCheckInWizardStep((s) => Math.max(0, s - 1))}
                    disabled={checkInWizIdx === 0}
                    className="min-h-[44px] rounded-xl border border-white/15 text-sm font-semibold text-[#E8EDED] disabled:opacity-40 active:scale-[0.98]"
                  >
                    <span className="inline-flex items-center justify-center gap-1">
                      <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                      Anterior
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={salvarCheckIn}
                    disabled={savingCheckIn}
                    className="min-h-[44px] rounded-xl bg-[#4CCB7A] text-sm font-semibold text-[#0A1F44] shadow-md transition-colors hover:bg-[#45b86d] disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
                  >
                    {savingCheckIn ? 'Salvando...' : 'Salvar check-in'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={fecharCheckInModal}
                  className="min-h-[40px] w-full rounded-xl border border-white/20 py-2 text-sm font-semibold text-[#E8EDED]/90 hover:border-[#4CCB7A]/50 hover:text-[#4CCB7A] active:scale-[0.99]"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );

    const checkInModalOverlay = (
      <div
        className="fixed inset-0 z-[100] flex items-stretch justify-center bg-black/60 backdrop-blur-[1px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkin-nutri-modal-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) fecharCheckInModal();
        }}
      >
        <div
          className="flex h-full w-full max-w-2xl flex-col shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {checkInModalPainel}
        </div>
        {showCheckInSalvoModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 p-4">
            <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-[#4CCB7A]/40 bg-[#0A1F44] p-6 text-[#E8EDED] shadow-[0_18px_45px_-14px_rgba(76,203,122,0.35)]">
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                {Array.from({ length: 24 }).map((_, i) => {
                  const angle = (i * 360) / 24;
                  const spread = 36 + (i % 5) * 11;
                  const x = Math.cos((angle * Math.PI) / 180) * spread;
                  const y = Math.sin((angle * Math.PI) / 180) * spread;
                  const fallY = 40 + (i % 4) * 14;
                  const delay = (i % 8) * 0.1;
                  const duration = 1.35 + (i % 3) * 0.25;
                  const color = i % 2 === 0 ? '#4CCB7A' : '#2F8FA3';
                  const animName = `checkin-firework-${i}`;
                  return (
                    <div key={`fogo-checkin-${i}`}>
                      <span
                        className="absolute left-1/2 top-1/2 h-2 w-2 rounded-full opacity-0"
                        style={{
                          backgroundColor: color,
                          boxShadow: `0 0 8px ${color}`,
                          animation: `${animName} ${duration}s ease-out ${delay}s infinite`,
                        }}
                      />
                      <style>{`@keyframes ${animName} {
                        0% { opacity: 0; transform: translate(-50%, -50%) translate(0, 0) scale(0); }
                        15% { opacity: 1; transform: translate(-50%, -50%) translate(${x * 0.35}px, ${y * 0.35}px) scale(1); }
                        65% { opacity: 0.95; transform: translate(-50%, -50%) translate(${x}px, ${y}px) scale(1); }
                        100% { opacity: 0; transform: translate(-50%, -50%) translate(${x}px, ${y + fallY}px) scale(0.45); }
                      }`}</style>
                    </div>
                  );
                })}
              </div>

              <div className="relative z-10">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#4CCB7A]/20 ring-2 ring-[#4CCB7A]/50">
                  <CheckCircle className="h-8 w-8 text-[#4CCB7A]" />
                </div>
                <h3 className="text-center text-lg font-bold">Perfeito!</h3>
                <p className="mt-2 text-center text-sm text-[#E8EDED]/85">{checkInSalvoMensagem}</p>
                <p className="mt-1 text-center text-xs text-[#E8EDED]/65">Vamos abrir seu Histórico no dia deste check-in.</p>
                <button
                  type="button"
                  onClick={confirmarCheckInSalvo}
                  className="mt-5 w-full rounded-xl bg-[#4CCB7A] py-2.5 text-sm font-semibold text-[#0A1F44] transition-colors hover:bg-[#45b86d]"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );

    if (!isClient) return null;
    return createPortal(checkInModalOverlay, document.body);
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

  const coposAgua = Math.round(plano.aguaDia_ml / 250);
  const abasPrincipais = [
    { id: 'plano', label: 'Plano Nutri', shortLabel: 'Plano Nutri', Icon: UtensilsCrossed },
    { id: 'cardapio', label: 'Cardápio', shortLabel: 'Cardápio', Icon: Apple },
    { id: 'historico', label: 'Histórico', shortLabel: 'Histórico', Icon: Calendar },
    { id: 'chatnutri', label: 'ChatNutri', shortLabel: 'ChatNutri', Icon: MessageSquare },
  ] as const;
  const pastasPlano = [
    { id: 'hipotese', label: 'Hipótese Comportamental' },
    { id: 'meta_proteinas', label: 'Meta de Proteínas' },
    { id: 'meta_agua', label: 'Meta de Água' },
  ] as const;
  const activeTabIndex = Math.max(0, abasPrincipais.findIndex((aba) => aba.id === activeTab));
  const cardapioRefeicoes = [
    { key: 'cafe' as RefeicaoKey, numero: '01', nome: 'Café da Manhã', icon: Coffee },
    { key: 'lanche1' as RefeicaoKey, numero: '02', nome: 'Lanche da Manhã', icon: Sun },
    { key: 'almoco' as RefeicaoKey, numero: '03', nome: 'Almoço', icon: Sunset },
    { key: 'lanche2' as RefeicaoKey, numero: '04', nome: 'Lanche da Tarde', icon: Sun },
    { key: 'jantar' as RefeicaoKey, numero: '05', nome: 'Janta', icon: Moon },
  ] as const;
  const refeicaoCardapioAtiva = cardapioRefeicoes.find((item) => item.key === activeCardapioMeal) || cardapioRefeicoes[0];
  const valoresSugeridosRefeicaoAtiva = calcularValoresSugeridos(refeicaoCardapioAtiva.key, plano);
  const macrosRefeicaoAtiva = plano.macrosPorRefeicao?.[refeicaoCardapioAtiva.key];
  const proteinaEscolhidaRefeicaoAtiva =
    macrosRefeicaoAtiva && macrosRefeicaoAtiva.proteinaEscolhida_g > 0
      ? macrosRefeicaoAtiva.proteinaEscolhida_g
      : valoresSugeridosRefeicaoAtiva.proteinaSugerida_g;
  const caloriasEscolhidaRefeicaoAtiva =
    macrosRefeicaoAtiva && macrosRefeicaoAtiva.caloriasEscolhida_kcal > 0
      ? macrosRefeicaoAtiva.caloriasEscolhida_kcal
      : valoresSugeridosRefeicaoAtiva.caloriasSugerida_kcal;
  const opcoesRefeicaoAtiva = opcoesRefeicoes[refeicaoCardapioAtiva.key] || [];
  const opcaoAtualRefeicaoAtivaId =
    plano.opcoesSelecionadas?.[refeicaoCardapioAtiva.key] || opcoesRefeicaoAtiva[0]?.id || '';
  const opcaoAtualRefeicaoAtiva =
    opcoesRefeicaoAtiva.find((opcao) => opcao.id === opcaoAtualRefeicaoAtivaId) || null;
  const configuracaoParaResumoCardapio = gerarConfiguracaoBuilderPorRefeicao(
    plano,
    plano.restricoesPaciente || [],
    plano.preferenciasProteinaPaciente || []
  );
  const keyCardapioAtivo = refeicaoCardapioAtiva.key;
  const itensDisponiveisBaseCardapio =
    configuracaoParaResumoCardapio[keyCardapioAtivo]?.itensDisponiveis || [];
  const itensCustomResumoCardapio =
    itensCustomizadosPorRefeicao[keyCardapioAtivo] ||
    plano.itensCustomizadosPorRefeicao?.[keyCardapioAtivo] ||
    [];
  const idsItensBaseCardapio = new Set(itensDisponiveisBaseCardapio.map((i) => i.id));
  const itensDisponiveisRefeicaoAtiva = [
    ...itensDisponiveisBaseCardapio,
    ...itensCustomResumoCardapio.filter((item) => !idsItensBaseCardapio.has(item.id)),
  ];
  const itensSelecionadosDaOpcaoAtiva = (opcaoAtualRefeicaoAtiva?.itensSelecionados || [])
    .map((itemId) => itensDisponiveisRefeicaoAtiva.find((item) => item.id === itemId))
    .filter(Boolean) as ItemRefeicao[];
  const descricaoRefeicaoAtiva = opcaoAtualRefeicaoAtiva?.descricao || plano.modeloDia[refeicaoCardapioAtiva.key];
  const itensDescricaoRefeicaoAtiva = descricaoRefeicaoAtiva
    .replace(/\r?\n/g, ' + ')
    .replace(/\s+[Oo]u:\s+/g, ' + ')
    .split('+')
    .map((item) =>
      item
        .replace(/^(Opção|Opcao)\s*\d*:\s*/i, '')
        .replace(/^ou:\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter((item) => item.length > 0 && !/^total[:\s]/i.test(item));
  const itensResumoExtraidosTexto = itensDescricaoRefeicaoAtiva.map((descricao, index) => {
    const proteinaMatches = Array.from(descricao.matchAll(/(\d+(?:[.,]\d+)?)\s*g[^,.;)]{0,25}prote[ií]na/gi));
    const caloriasMatches = Array.from(descricao.matchAll(/(\d+(?:[.,]\d+)?)\s*kcal/gi));
    const proteinaExtraida = proteinaMatches.reduce((acc, match) => acc + Number(match[1].replace(',', '.')), 0);
    const caloriasExtraida = caloriasMatches.reduce((acc, match) => acc + Number(match[1].replace(',', '.')), 0);
    return {
      id: `${index}-${descricao.slice(0, 32)}`,
      descricao,
      proteinaExtraida,
      caloriasExtraida,
    };
  });
  const itensResumoRefeicaoAtiva =
    itensSelecionadosDaOpcaoAtiva.length > 0
      ? itensSelecionadosDaOpcaoAtiva.map((item, index) => ({
          id: `${index}-${item.id}`,
          descricao: item.nome,
          proteinaItem: item.proteina_g,
          caloriasItem: item.calorias_kcal,
        }))
      : itensResumoExtraidosTexto.map((item) => ({
          id: item.id,
          descricao: item.descricao,
          proteinaItem: item.proteinaExtraida,
          caloriasItem: item.caloriasExtraida,
        }));
  const totalProteinaPorItens = itensResumoRefeicaoAtiva.reduce((acc, item) => acc + item.proteinaItem, 0);
  const totalCaloriasPorItens = itensResumoRefeicaoAtiva.reduce((acc, item) => acc + item.caloriasItem, 0);

  return (
    <div className="space-y-4">
      {/* Botão de Check-in — padrão oftware.com.br (home) */}
      <div className="rounded-2xl border border-gray-200/90 dark:border-white/10 bg-white dark:bg-[#0A1F44]/80 p-4 shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)]">
        <button
          type="button"
          onClick={() => {
            const dataHoje = new Date().toISOString().split('T')[0];
            setCheckInDate(dataHoje);
            setView('checkin');
          }}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] transition-all shadow-lg hover:shadow-[#4CCB7A]/30"
        >
          <Calendar className="h-5 w-5 shrink-0" aria-hidden />
          <span>Check-in Diário</span>
        </button>
      </div>

      {/* Sistema de Abas — mesmo padrão visual do carrossel horizontal de Aplicações (/meta) */}
      <div className="rounded-2xl border border-gray-200/90 dark:border-white/10 bg-white dark:bg-[#0A1F44]/80 shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)] overflow-hidden">
        <div className="border-b border-gray-200/80 dark:border-white/10">
          <div
            role="tablist"
            aria-label="Seções Nutri"
            className="grid grid-cols-4 gap-1.5 p-2 sm:flex sm:gap-3 sm:overflow-x-auto sm:p-4 sm:pb-2 scrollbar-hide snap-x snap-mandatory min-w-0"
          >
            {abasPrincipais.map((aba, i) => {
              const n = i + 1;
              const totalAbas = abasPrincipais.length;
              const ativo = activeTab === aba.id;
              const TabIcon = aba.Icon;
              return (
                <button
                  key={aba.id}
                  type="button"
                  role="tab"
                  aria-selected={ativo}
                  onClick={() => setActiveTab(aba.id)}
                  className={`snap-start min-w-0 w-full sm:shrink-0 sm:w-auto flex flex-col items-stretch sm:min-w-[6.25rem] rounded-xl border text-left transition-all ${
                    ativo
                      ? 'border-[#4CCB7A] bg-[#4CCB7A]/12 dark:bg-[#4CCB7A]/20 shadow-[0_8px_24px_-8px_rgba(76,203,122,0.45)] ring-2 ring-[#4CCB7A]/35'
                      : 'border-gray-200/90 dark:border-white/10 bg-gray-50/90 dark:bg-white/[0.04] hover:border-[#4CCB7A]/40 hover:bg-[#4CCB7A]/5'
                  }`}
                >
                  <div
                    className={`flex items-center justify-center gap-1.5 px-2 py-2 border-b ${
                      ativo ? 'border-[#4CCB7A]/30' : 'border-gray-200/80 dark:border-white/10'
                    }`}
                  >
                    <TabIcon
                      className={`w-4 h-4 shrink-0 ${ativo ? 'text-[#4CCB7A]' : 'text-gray-400 dark:text-white/35'}`}
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span
                      className={`text-lg font-bold tabular-nums leading-none ${
                        ativo ? 'text-[#0A1F44] dark:text-[#E8EDED]' : 'text-gray-700 dark:text-[#E8EDED]/80'
                      }`}
                    >
                      {n}
                    </span>
                    <span className="text-[10px] font-medium text-gray-500 dark:text-[#E8EDED]/50">/{totalAbas}</span>
                  </div>
                  <div className="px-2 py-2 space-y-0.5">
                    <p
                      className={`text-[9px] sm:text-[11px] font-semibold leading-tight text-center line-clamp-2 ${
                        ativo ? 'text-[#0A1F44] dark:text-[#E8EDED]' : 'text-gray-600 dark:text-[#E8EDED]/70'
                      }`}
                    >
                      {aba.shortLabel}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="px-4 py-3 bg-gray-50/90 dark:bg-[#06152e]/80 border-t border-gray-200/80 dark:border-white/10">
            <div className="mb-2 flex items-center justify-between text-xs text-gray-600 dark:text-[#E8EDED]/70">
              <span>
                Pasta{' '}
                <span className="font-semibold text-[#4CCB7A]">{activeTabIndex + 1}</span> / {abasPrincipais.length}
              </span>
              <span className="font-medium text-[#0A1F44] dark:text-[#E8EDED]">{abasPrincipais[activeTabIndex].label}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200/90 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2F8FA3] to-[#4CCB7A] opacity-95 transition-all duration-300"
                style={{ width: `${((activeTabIndex + 1) / abasPrincipais.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-4 sm:p-6 min-w-0 max-w-full overflow-x-hidden">
          {/* Aba: Plano Nutri */}
          {activeTab === 'plano' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <UtensilsCrossed className="h-5 w-5 text-green-600" />
                  Plano Nutricional
                </h2>
                <p className="text-gray-600 text-sm">
                  Criado em {new Date(plano.criadoEm).toLocaleDateString('pt-BR', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200/90 dark:border-white/10 bg-gray-50/90 dark:bg-[#0A1F44]/50 p-2 sm:p-3 shadow-[0_8px_24px_-12px_rgba(76,203,122,0.15)]">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {pastasPlano.map((pasta) => (
                    <button
                      key={pasta.id}
                      type="button"
                      onClick={() => setActivePlanoFolder(pasta.id)}
                      className={`rounded-xl border px-3 py-3 text-xs sm:text-sm font-semibold transition-all text-center ${
                        activePlanoFolder === pasta.id
                          ? 'border-[#4CCB7A] bg-[#4CCB7A]/12 dark:bg-[#4CCB7A]/20 text-[#0A1F44] dark:text-[#E8EDED] shadow-[0_6px_20px_-8px_rgba(76,203,122,0.4)] ring-2 ring-[#4CCB7A]/35'
                          : 'border-gray-200/90 dark:border-white/10 bg-white dark:bg-white/[0.04] text-gray-600 dark:text-[#E8EDED]/75 hover:border-[#4CCB7A]/40 hover:bg-[#4CCB7A]/5'
                      }`}
                      aria-current={activePlanoFolder === pasta.id ? 'true' : undefined}
                    >
                      {pasta.label}
                    </button>
                  ))}
                </div>
              </div>

              {activePlanoFolder === 'hipotese' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#4CCB7A]/40 bg-gradient-to-br from-[#4CCB7A]/12 via-[#E8EDED]/70 to-[#2F8FA3]/12 dark:from-[#4CCB7A]/15 dark:via-[#0A1F44]/65 dark:to-[#2F8FA3]/20 p-5 shadow-[0_10px_26px_-14px_rgba(76,203,122,0.45)]">
                    <div className="flex items-center gap-2 mb-3">
                      <UtensilsCrossed className="h-5 w-5 text-[#2F8FA3] dark:text-[#4CCB7A]" />
                      <h3 className="text-sm font-medium text-[#0A1F44] dark:text-[#E8EDED]">Estilo Alimentar</h3>
                    </div>
                    <p className="text-xl font-bold text-[#0A1F44] dark:text-[#E8EDED] capitalize mb-2">
                      {plano.estilo.replace('_', ' ')}
                    </p>
                    {plano.descricaoEstilo && (
                      <p className="text-xs text-[#0A1F44]/80 dark:text-[#E8EDED]/80 leading-relaxed">
                        {plano.descricaoEstilo}
                      </p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-[#2F8FA3]/35 bg-gradient-to-br from-[#2F8FA3]/12 via-white to-[#0A1F44]/10 dark:from-[#2F8FA3]/20 dark:via-[#0A1F44]/70 dark:to-[#0A1F44]/85 p-5 shadow-[0_10px_26px_-14px_rgba(47,143,163,0.45)]">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="h-5 w-5 text-[#2F8FA3] dark:text-[#4CCB7A]" />
                      <h3 className="text-lg font-semibold text-[#0A1F44] dark:text-[#E8EDED]">Hipótese Comportamental</h3>
                    </div>
                    <p className="text-[#0A1F44]/85 dark:text-[#E8EDED]/85 leading-relaxed italic">
                      {plano.hipoteseComportamental || 'Hipótese comportamental em construção com base no seu check-in e no padrão de refeições.'}
                    </p>
                  </div>

                  {plano.evitar.length > 0 && (
                    <div className="rounded-2xl border border-[#0A1F44]/20 bg-gradient-to-br from-[#0A1F44]/8 via-[#E8EDED]/75 to-[#2F8FA3]/10 dark:from-[#0A1F44]/75 dark:via-[#0A1F44]/80 dark:to-[#2F8FA3]/20 p-5 shadow-[0_10px_26px_-14px_rgba(10,31,68,0.45)]">
                      <h3 className="text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED] mb-3">Pontos de atenção</h3>
                      <div className="flex flex-wrap gap-3">
                        {plano.evitar.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-4 py-2 bg-white/95 dark:bg-[#0A1F44]/65 text-[#0A1F44] dark:text-[#E8EDED] rounded-lg text-sm font-medium border border-[#2F8FA3]/25 dark:border-[#4CCB7A]/30 flex items-center gap-2"
                          >
                            <XCircle className="h-4 w-4 text-[#2F8FA3] dark:text-[#4CCB7A]" />
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activePlanoFolder === 'meta_proteinas' && (
                <div className="space-y-4">
                  {(() => {
                    const pesoAtual = obterPesoAtual();
                    const protMin = plano.protDia_g;
                    const protMax = Math.round(plano.protDia_g * 1.3);

                    let semanaTratamento = 1;
                    if (paciente?.planoTerapeutico?.startDate) {
                      const dataInicio = new Date(paciente.planoTerapeutico.startDate);
                      const hoje = new Date();
                      const diffTime = hoje.getTime() - dataInicio.getTime();
                      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                      semanaTratamento = Math.max(1, Math.floor(diffDays / 7) + 1);
                    }

                    return (
                      <div className="rounded-2xl border border-[#2F8FA3]/35 bg-gradient-to-br from-[#2F8FA3]/12 via-white to-[#0A1F44]/10 dark:from-[#2F8FA3]/20 dark:via-[#0A1F44]/70 dark:to-[#0A1F44]/85 p-5 shadow-[0_10px_26px_-14px_rgba(47,143,163,0.45)]">
                        <div className="flex items-center gap-2 mb-3">
                          <Activity className="h-5 w-5 text-[#2F8FA3] dark:text-[#4CCB7A]" />
                          <h3 className="text-sm font-medium text-[#0A1F44] dark:text-[#E8EDED]">Meta de Proteína</h3>
                        </div>
                        <p className="text-2xl font-bold text-[#0A1F44] dark:text-[#E8EDED] mb-1">
                          {protMin}-{protMax} g/dia
                        </p>
                        <p className="text-xs text-[#0A1F44]/80 dark:text-[#E8EDED]/80 mb-1">
                          Meta diária aproximada de proteína total
                        </p>
                        <p className="text-xs text-[#0A1F44]/65 dark:text-[#E8EDED]/65 italic">
                          Calculado em relação ao Peso {pesoAtual.toFixed(1)}kg e Semana {semanaTratamento} do tratamento
                        </p>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className="p-4 rounded-xl border border-[#2F8FA3]/25 bg-gradient-to-br from-[#E8EDED]/80 to-[#2F8FA3]/10 dark:from-[#0A1F44]/70 dark:to-[#2F8FA3]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Coffee className="h-4 w-4 text-[#2F8FA3] dark:text-[#4CCB7A]" />
                        <p className="text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED]">Café da Manhã</p>
                      </div>
                      <p className="text-lg font-bold text-[#0A1F44] dark:text-[#E8EDED]">{plano.distribuicaoProteina.cafe}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[#2F8FA3]/25 bg-gradient-to-br from-[#E8EDED]/80 to-[#2F8FA3]/10 dark:from-[#0A1F44]/70 dark:to-[#2F8FA3]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Sun className="h-4 w-4 text-[#2F8FA3] dark:text-[#4CCB7A]" />
                        <p className="text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED]">Lanche 1</p>
                      </div>
                      <p className="text-lg font-bold text-[#0A1F44] dark:text-[#E8EDED]">{plano.distribuicaoProteina.lanche1}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[#2F8FA3]/25 bg-gradient-to-br from-[#E8EDED]/80 to-[#2F8FA3]/10 dark:from-[#0A1F44]/70 dark:to-[#2F8FA3]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Sunset className="h-4 w-4 text-[#2F8FA3] dark:text-[#4CCB7A]" />
                        <p className="text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED]">Almoço</p>
                      </div>
                      <p className="text-lg font-bold text-[#0A1F44] dark:text-[#E8EDED]">{plano.distribuicaoProteina.almoco}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[#2F8FA3]/25 bg-gradient-to-br from-[#E8EDED]/80 to-[#2F8FA3]/10 dark:from-[#0A1F44]/70 dark:to-[#2F8FA3]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Sun className="h-4 w-4 text-[#2F8FA3] dark:text-[#4CCB7A]" />
                        <p className="text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED]">Lanche 2</p>
                      </div>
                      <p className="text-lg font-bold text-[#0A1F44] dark:text-[#E8EDED]">{plano.distribuicaoProteina.lanche2}</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[#2F8FA3]/25 bg-gradient-to-br from-[#E8EDED]/80 to-[#2F8FA3]/10 dark:from-[#0A1F44]/70 dark:to-[#2F8FA3]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Moon className="h-4 w-4 text-[#2F8FA3] dark:text-[#4CCB7A]" />
                        <p className="text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED]">Jantar</p>
                      </div>
                      <p className="text-lg font-bold text-[#0A1F44] dark:text-[#E8EDED]">{plano.distribuicaoProteina.jantar}</p>
                    </div>
                  </div>

                  {(() => {
                    const refeicoes: RefeicaoKey[] = ['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'];
                    let proteinaTotalDistribuida = 0;

                    refeicoes.forEach((refeicaoKey) => {
                      proteinaTotalDistribuida += converterDistribuicaoProteina(plano.distribuicaoProteina[refeicaoKey]);
                    });

                    return (
                      <div className="mt-6 p-5 rounded-2xl border border-[#4CCB7A]/40 bg-gradient-to-br from-[#4CCB7A]/12 via-[#E8EDED]/70 to-[#2F8FA3]/12 dark:from-[#4CCB7A]/15 dark:via-[#0A1F44]/65 dark:to-[#2F8FA3]/20 shadow-[0_10px_26px_-14px_rgba(76,203,122,0.45)]">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-[#0A1F44]/75 dark:text-[#E8EDED]/75 uppercase tracking-wide mb-1">Total Distribuído</p>
                            <p className="text-2xl font-bold text-[#0A1F44] dark:text-[#E8EDED]">{proteinaTotalDistribuida.toFixed(1)}g</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-[#0A1F44]/75 dark:text-[#E8EDED]/75 uppercase tracking-wide mb-1">Meta Diária</p>
                            <p className="text-2xl font-bold text-[#0A1F44] dark:text-[#E8EDED]">{plano.protDia_g}g</p>
                          </div>
                        </div>
                        {Math.abs(proteinaTotalDistribuida - plano.protDia_g) > 5 && (
                          <p className="text-xs text-[#2F8FA3] dark:text-[#4CCB7A] mt-2">
                            ⚠️ A soma das distribuições ({proteinaTotalDistribuida.toFixed(1)}g) difere da meta ({plano.protDia_g}g)
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {activePlanoFolder === 'meta_agua' && (
                <div className="space-y-4">
                  {(() => {
                    const pesoAtual = obterPesoAtual();
                    const aguaMin = plano.aguaDia_ml;
                    const aguaMax = Math.round(plano.aguaDia_ml * 1.3);

                    let semanaTratamento = 1;
                    if (paciente?.planoTerapeutico?.startDate) {
                      const dataInicio = new Date(paciente.planoTerapeutico.startDate);
                      const hoje = new Date();
                      const diffTime = hoje.getTime() - dataInicio.getTime();
                      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                      semanaTratamento = Math.max(1, Math.floor(diffDays / 7) + 1);
                    }

                    return (
                      <div className="rounded-2xl border border-[#4CCB7A]/40 bg-gradient-to-br from-[#4CCB7A]/12 via-[#E8EDED]/70 to-[#2F8FA3]/12 dark:from-[#4CCB7A]/15 dark:via-[#0A1F44]/65 dark:to-[#2F8FA3]/20 p-5 shadow-[0_10px_26px_-14px_rgba(76,203,122,0.45)]">
                        <div className="flex items-center gap-2 mb-3">
                          <Droplet className="h-5 w-5 text-[#2F8FA3] dark:text-[#4CCB7A]" />
                          <h3 className="text-sm font-medium text-[#0A1F44] dark:text-[#E8EDED]">Meta de Água</h3>
                        </div>
                        <p className="text-2xl font-bold text-[#0A1F44] dark:text-[#E8EDED] mb-1">
                          {aguaMin}-{aguaMax} ml
                        </p>
                        <p className="text-xs text-[#0A1F44]/80 dark:text-[#E8EDED]/80 mb-1">
                          Equivalente a {coposAgua}-{coposAgua + 1} copos por dia
                        </p>
                        <p className="text-xs text-[#0A1F44]/65 dark:text-[#E8EDED]/65 italic">
                          Calculado em relação ao Peso {pesoAtual.toFixed(1)}kg e Semana {semanaTratamento} do tratamento
                        </p>
                      </div>
                    );
                  })()}

                  <div className="rounded-2xl border border-[#2F8FA3]/35 bg-gradient-to-br from-[#2F8FA3]/12 via-white to-[#0A1F44]/10 dark:from-[#2F8FA3]/20 dark:via-[#0A1F44]/70 dark:to-[#0A1F44]/85 p-5 shadow-[0_10px_26px_-14px_rgba(47,143,163,0.45)]">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-5 w-5 text-[#2F8FA3] dark:text-[#4CCB7A]" />
                      <h3 className="text-sm font-medium text-[#0A1F44] dark:text-[#E8EDED]">Refeições</h3>
                    </div>
                    <p className="text-2xl font-bold text-[#0A1F44] dark:text-[#E8EDED] mb-1">
                      {plano.refeicoes} refeições
                    </p>
                    <p className="text-xs text-[#0A1F44]/80 dark:text-[#E8EDED]/80">
                      Distribuídas ao longo do dia
                    </p>
                  </div>

                  {plano.suplementos && (
                    <div className="rounded-2xl border border-[#0A1F44]/20 bg-gradient-to-br from-[#0A1F44]/8 via-[#E8EDED]/75 to-[#2F8FA3]/10 dark:from-[#0A1F44]/75 dark:via-[#0A1F44]/80 dark:to-[#2F8FA3]/20 p-5 shadow-[0_10px_26px_-14px_rgba(10,31,68,0.45)]">
                      <div className="flex items-center gap-2 mb-4">
                        <Pill className="h-5 w-5 text-[#2F8FA3] dark:text-[#4CCB7A]" />
                        <h3 className="text-lg font-semibold text-[#0A1F44] dark:text-[#E8EDED]">Suplementos</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-[#0A1F44] dark:text-[#E8EDED] mb-1">Probiótico</p>
                          <p className="text-sm text-[#0A1F44]/80 dark:text-[#E8EDED]/80">{plano.suplementos.probiotico}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#0A1F44] dark:text-[#E8EDED] mb-1">Whey Protein</p>
                          <p className="text-sm text-[#0A1F44]/80 dark:text-[#E8EDED]/80">{plano.suplementos.whey}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#0A1F44] dark:text-[#E8EDED] mb-1">Creatina</p>
                          <p className="text-sm text-[#0A1F44]/80 dark:text-[#E8EDED]/80">{plano.suplementos.creatina}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Aba: Cardápio */}
          {activeTab === 'cardapio' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-orange-600" />
                Monte o Seu
              </h2>
              <div className="space-y-5">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <span className="text-xs sm:text-sm font-semibold text-gray-700">Refeições:</span>
                  <div className="mt-2 grid grid-cols-5 gap-2">
                    {cardapioRefeicoes.map((refeicao) => (
                      <button
                        key={refeicao.key}
                        type="button"
                        onClick={() => setActiveCardapioMeal(refeicao.key)}
                        className={`w-full rounded-md border px-2 py-1.5 text-xs sm:text-sm font-semibold transition-colors ${
                          activeCardapioMeal === refeicao.key
                            ? 'border-green-400 bg-green-100 text-green-700'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                        aria-current={activeCardapioMeal === refeicao.key ? 'true' : undefined}
                        aria-label={refeicao.nome}
                      >
                        {refeicao.numero}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                        <refeicaoCardapioAtiva.icon className="h-5 w-5 text-gray-700" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                          Refeição {refeicaoCardapioAtiva.numero}
                        </p>
                        <h4 className="text-lg font-bold text-gray-900">{refeicaoCardapioAtiva.nome}</h4>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setRefeicaoEmEdicao(refeicaoCardapioAtiva.key);
                        setOpcaoSelecionadaTemp(
                          plano.opcoesSelecionadas?.[refeicaoCardapioAtiva.key] ||
                          opcoesRefeicoes[refeicaoCardapioAtiva.key][0]?.id ||
                          ''
                        );
                      }}
                      className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Edit className="h-4 w-4" />
                      Editar
                    </button>
                  </div>

                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-600">Escolha atual</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {opcaoAtualRefeicaoAtiva?.titulo || 'Opção padrão'}
                  </p>

                  <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full table-fixed text-[11px] sm:text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="w-[56%] px-2 py-2 text-left font-semibold">Item</th>
                          <th className="w-[22%] px-2 py-2 text-right font-semibold">Proteínas</th>
                          <th className="w-[22%] px-2 py-2 text-right font-semibold">Calorias</th>
                        </tr>
                      </thead>
                      <tbody>
                        {itensResumoRefeicaoAtiva.map((itemResumo) => (
                          <tr key={itemResumo.id} className="border-t border-gray-100">
                            <td className="px-2 py-2 align-top text-gray-700">{itemResumo.descricao}</td>
                            <td className="px-2 py-2 text-right font-medium text-gray-900 whitespace-nowrap">
                              {itemResumo.proteinaItem > 0 ? `${itemResumo.proteinaItem.toFixed(1)} g` : '-'}
                            </td>
                            <td className="px-2 py-2 text-right font-medium text-gray-900 whitespace-nowrap">
                              {itemResumo.caloriasItem > 0 ? `${Math.round(itemResumo.caloriasItem)} kcal` : '-'}
                            </td>
                          </tr>
                        ))}
                        {itensResumoRefeicaoAtiva.length === 0 && (
                          <tr className="border-t border-gray-100">
                            <td colSpan={3} className="px-2 py-3 text-sm text-gray-700">
                              {descricaoRefeicaoAtiva}
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                        <tr>
                          <td className="px-2 py-2 font-semibold text-gray-800">Somatório total</td>
                          <td className="px-2 py-2 text-right font-bold text-gray-900 whitespace-nowrap">
                            {totalProteinaPorItens > 0 ? `${totalProteinaPorItens.toFixed(1)} g` : '-'}
                          </td>
                          <td className="px-2 py-2 text-right font-bold text-gray-900 whitespace-nowrap">
                            {totalCaloriasPorItens > 0 ? `${Math.round(totalCaloriasPorItens)} kcal` : '-'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Resumo Total - Proteína e Calorias */}
                {(() => {
                  const refeicoes: RefeicaoKey[] = ['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'];
                  const nomePorRefeicao: Record<RefeicaoKey, string> = {
                    cafe: 'Café da Manhã',
                    lanche1: 'Lanche da Manhã',
                    almoco: 'Almoço',
                    lanche2: 'Lanche da Tarde',
                    jantar: 'Janta',
                  };
                  let proteinaSugeridaTotal = 0;
                  let proteinaEscolhidaTotal = 0;
                  let caloriasSugeridaTotal = 0;
                  let caloriasEscolhidaTotal = 0;
                  const resumoPorRefeicao: Array<{
                    key: RefeicaoKey;
                    nome: string;
                    proteinaSugerida: number;
                    proteinaAtual: number;
                    caloriasSugerida: number;
                    caloriasAtual: number;
                  }> = [];

                  refeicoes.forEach((refeicaoKey) => {
                    const valoresSugeridos = calcularValoresSugeridos(refeicaoKey, plano);
                    const macrosSalvas = plano.macrosPorRefeicao?.[refeicaoKey];
                    const proteinaAtual =
                      macrosSalvas && macrosSalvas.proteinaEscolhida_g > 0
                        ? macrosSalvas.proteinaEscolhida_g
                        : valoresSugeridos.proteinaSugerida_g;
                    const caloriasAtual =
                      macrosSalvas && macrosSalvas.caloriasEscolhida_kcal > 0
                        ? macrosSalvas.caloriasEscolhida_kcal
                        : valoresSugeridos.caloriasSugerida_kcal;

                    proteinaSugeridaTotal += valoresSugeridos.proteinaSugerida_g;
                    caloriasSugeridaTotal += valoresSugeridos.caloriasSugerida_kcal;
                    proteinaEscolhidaTotal += proteinaAtual;
                    caloriasEscolhidaTotal += caloriasAtual;

                    resumoPorRefeicao.push({
                      key: refeicaoKey,
                      nome: nomePorRefeicao[refeicaoKey],
                      proteinaSugerida: valoresSugeridos.proteinaSugerida_g,
                      proteinaAtual,
                      caloriasSugerida: valoresSugeridos.caloriasSugerida_kcal,
                      caloriasAtual,
                    });
                  });
                  const statusProteinaTotal =
                    Math.abs(proteinaEscolhidaTotal - proteinaSugeridaTotal) < 0.1
                      ? 'igual ao previsto'
                      : proteinaEscolhidaTotal > proteinaSugeridaTotal
                        ? 'maior que o previsto'
                        : 'menor que o previsto';
                  const statusCaloriasTotal =
                    Math.abs(caloriasEscolhidaTotal - caloriasSugeridaTotal) < 1
                      ? 'igual ao previsto'
                      : caloriasEscolhidaTotal > caloriasSugeridaTotal
                        ? 'maior que o previsto'
                        : 'menor que o previsto';
                  const deltaProteinaTotal = proteinaEscolhidaTotal - proteinaSugeridaTotal;
                  const deltaCaloriasTotal = caloriasEscolhidaTotal - caloriasSugeridaTotal;
                  const deltaProteinaFormatado = `${deltaProteinaTotal >= 0 ? '+' : ''}${deltaProteinaTotal.toFixed(1)}g`;
                  const deltaCaloriasFormatado = `${deltaCaloriasTotal >= 0 ? '+' : ''}${Math.round(deltaCaloriasTotal)} kcal`;

                  return (
                    <div className="mt-4">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-600" />
                        Resumo Total do Dia
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full table-fixed text-[11px] sm:text-sm">
                          <thead className="bg-gray-50 text-gray-600">
                            <tr>
                              <th className="w-[42%] px-2 py-2 text-left font-semibold">Refeição</th>
                              <th className="w-[29%] px-2 py-2 text-right font-semibold">Prot. Atual/Prev.</th>
                              <th className="w-[29%] px-2 py-2 text-right font-semibold">Kcal Atual/Prev.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resumoPorRefeicao.map((item) => (
                              <tr
                                key={item.key}
                                className={`border-t border-gray-100 ${
                                  item.key === activeCardapioMeal ? 'bg-green-50/80' : ''
                                }`}
                              >
                                <td className={`px-2 py-2 font-medium ${item.key === activeCardapioMeal ? 'text-green-800' : 'text-gray-800'}`}>
                                  {item.nome}
                                </td>
                                <td className={`px-2 py-2 text-right whitespace-nowrap ${item.key === activeCardapioMeal ? 'text-green-900 font-semibold' : 'text-gray-900'}`}>
                                  {item.proteinaAtual.toFixed(1)}/{item.proteinaSugerida.toFixed(1)}g
                                </td>
                                <td className={`px-2 py-2 text-right whitespace-nowrap ${item.key === activeCardapioMeal ? 'text-green-900 font-semibold' : 'text-gray-900'}`}>
                                  {Math.round(item.caloriasAtual)}/{item.caloriasSugerida} kcal
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                            <tr>
                              <td className="px-2 py-2 font-bold text-gray-900">Resumo total do dia</td>
                              <td className="px-2 py-2 text-right font-bold text-gray-900 whitespace-nowrap">
                                {proteinaEscolhidaTotal.toFixed(1)}/{proteinaSugeridaTotal.toFixed(1)}g
                              </td>
                              <td className="px-2 py-2 text-right font-bold text-gray-900 whitespace-nowrap">
                                {Math.round(caloriasEscolhidaTotal)}/{caloriasSugeridaTotal} kcal
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                      <div className="mt-2 space-y-1 text-xs text-gray-600">
                        <p>Proteína total: {statusProteinaTotal} ({deltaProteinaFormatado}).</p>
                        <p>Calorias totais: {statusCaloriasTotal} ({deltaCaloriasFormatado}).</p>
                      </div>
                    </div>
                  );
                })()}
                <div className="mt-8 flex flex-col items-center justify-center gap-2 border-t border-gray-200 pt-6">
                  <button
                    type="button"
                    onClick={() => setCardapioPrintModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-green-700"
                  >
                    <Printer className="h-4 w-4 shrink-0" />
                    Imprimir cardápio
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de Edição de Refeição - Meal Builder */}
          {isClient && refeicaoEmEdicao && plano && configuracaoBuilder && createPortal(
            <div className="fixed inset-0 z-[2147483647] bg-black/55 isolate">
              <div className="h-[100dvh] w-[100dvw] bg-white overflow-y-auto">
                <div className="sticky top-0 h-16 sm:h-20 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between z-20">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                    Montar {refeicaoEmEdicao === 'cafe' ? 'Café da Manhã' : 
                            refeicaoEmEdicao === 'lanche1' ? 'Lanche da Manhã' :
                            refeicaoEmEdicao === 'almoco' ? 'Almoço' :
                            refeicaoEmEdicao === 'lanche2' ? 'Lanche da Tarde' : 'Jantar'}
                  </h2>
                  <button
                    onClick={() => {
                      setRefeicaoEmEdicao(null);
                      setOpcaoSelecionadaTemp('');
                      setItensSelecionadosRefeicao({});
                      setMacrosRefeicaoAtual({ proteinaTotal_g: 0, caloriasTotal_kcal: 0 });
                      setAbaBuilderAtiva('proteina');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="p-4 sm:p-6">
                  {(() => {
                    const config = configuracaoBuilder[refeicaoEmEdicao];
                    const abasBuilder: Array<{ id: ModalBuilderTab; label: string }> = [
                      { id: 'proteina', label: 'Proteína' },
                      { id: 'carboidrato', label: 'Carboidrato' },
                      { id: 'gordura', label: 'Gordura' },
                      { id: 'reguladores', label: 'Reguladores' },
                    ];

                    const getItensDaAba = (aba: ModalBuilderTab) =>
                      config.itensDisponiveis.filter((item) =>
                        MODAL_TAB_CATEGORIES[aba].includes(item.categoria)
                      );

                    const getLimiteDaAba = (aba: ModalBuilderTab) => MODAL_TAB_LIMITS[aba];
                    
                    // Abas de navegação
                    return (
                      <div className="space-y-4">
                        {/* Navegação por abas */}
                        <div className="sticky top-16 sm:top-20 z-10 -mx-4 sm:-mx-6 border-b border-gray-200 bg-white">
                          <div className="grid grid-cols-4 w-full">
                          {abasBuilder.map((aba) => {
                            const itensDaAba = getItensDaAba(aba.id);
                            if (itensDaAba.length === 0) return null;
                            
                            return (
                              <button
                                key={aba.id}
                                onClick={() => setAbaBuilderAtiva(aba.id)}
                                className={`w-full px-2 py-3 text-xs md:text-sm font-semibold border-r border-gray-200 last:border-r-0 border-b-2 transition-colors text-center ${
                                  abaBuilderAtiva === aba.id
                                    ? 'border-green-600 text-green-700 bg-green-50 shadow-sm'
                                    : 'border-transparent text-gray-700 bg-white hover:bg-gray-50'
                                }`}
                              >
                                <span>{aba.label}</span>
                              </button>
                            );
                          })}
                          </div>
                        </div>
                        
                        {/* Conteúdo da aba ativa */}
                        {(() => {
                          const abaAtiva = abaBuilderAtiva;
                          const itensDaAbaAtiva = getItensDaAba(abaAtiva);
                          const itensSelecionadosDaAba = itensDaAbaAtiva.filter((i) => itensSelecionadosRefeicao[i.id]);
                          const maxItens = getLimiteDaAba(abaAtiva);
                          const labelAbaAtiva = abasBuilder.find((aba) => aba.id === abaAtiva)?.label ?? 'Itens';
                          
                          return (
                            <div className="space-y-4">
                              <div className="flex items-center gap-2 mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {labelAbaAtiva}
                                </h3>
                                {abaAtiva === 'proteina' && (
                                  <span className="text-xs font-normal text-red-600">(obrigatório)</span>
                                )}
                                {maxItens > 0 && (
                                  <span className="text-xs font-normal text-gray-500">
                                    {itensSelecionadosDaAba.length}/{maxItens} selecionados
                                  </span>
                                )}
                              </div>
                              
                              <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="w-full table-fixed text-xs sm:text-sm">
                                  <thead className="bg-gray-50 text-gray-600">
                                    <tr>
                                      <th className="w-[56%] px-2 py-2 text-left font-semibold">Item</th>
                                      <th className="w-[22%] px-2 py-2 text-right font-semibold">Proteína</th>
                                      <th className="w-[22%] px-2 py-2 text-right font-semibold">Calorias</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                {itensDaAbaAtiva.map(item => {
                                  const estaSelecionado = itensSelecionadosRefeicao[item.id] || false;
                                  return (
                                    <tr
                                      key={item.id}
                                      onClick={() => handleSelecionarItem(item.id, item.categoria)}
                                      className={`border-t border-gray-100 cursor-pointer transition-colors ${
                                        estaSelecionado
                                          ? 'bg-green-50'
                                          : 'bg-white hover:bg-gray-50'
                                      }`}
                                    >
                                      <td className={`px-2 py-2 text-left ${estaSelecionado ? 'text-green-900 font-semibold' : 'text-gray-800'}`}>
                                        {item.nome}
                                      </td>
                                      <td className={`px-2 py-2 text-right whitespace-nowrap ${estaSelecionado ? 'text-green-900 font-semibold' : 'text-gray-900'}`}>
                                        {item.proteina_g} g
                                      </td>
                                      <td className={`px-2 py-2 text-right whitespace-nowrap ${estaSelecionado ? 'text-green-900 font-semibold' : 'text-gray-900'}`}>
                                        {item.calorias_kcal} kcal
                                      </td>
                                    </tr>
                                  );
                                })}
                                  </tbody>
                                </table>
                              </div>
                              <div className="pt-1">
                                <button
                                  type="button"
                                  onClick={abrirModalAdicionarItem}
                                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
                                >
                                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-blue-300 text-blue-700">+</span>
                                  Adicionar Item
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
                  
                  {/* Resumo de macros da refeição - Comparação Sugerida vs Escolhida */}
                  {(() => {
                    const config = configuracaoBuilder[refeicaoEmEdicao];
                    const temProteina = config.itensDisponiveis.some(i => 
                      i.categoria === 'proteina' && itensSelecionadosRefeicao[i.id]
                    );
                    
                    // Calcular calorias sugeridas (estimativa baseada no tipo de refeição)
                    const caloriasSugerida = refeicaoEmEdicao === 'cafe' ? 400 :
                                            refeicaoEmEdicao === 'lanche1' ? 250 :
                                            refeicaoEmEdicao === 'almoco' ? 550 :
                                            refeicaoEmEdicao === 'lanche2' ? 200 : 450;
                    const itensSelecionadosResumo = config.itensDisponiveis.filter((item) => itensSelecionadosRefeicao[item.id]);
                    const previstoProteinaPorItem =
                      itensSelecionadosResumo.length > 0 ? config.metaProteina_g / itensSelecionadosResumo.length : 0;
                    const previstoCaloriasPorItem =
                      itensSelecionadosResumo.length > 0 ? caloriasSugerida / itensSelecionadosResumo.length : 0;
                    const deltaProteina = macrosRefeicaoAtual.proteinaTotal_g - config.metaProteina_g;
                    const deltaCalorias = macrosRefeicaoAtual.caloriasTotal_kcal - caloriasSugerida;
                    const statusProteina =
                      Math.abs(deltaProteina) < 0.1 ? 'igual ao previsto' : deltaProteina > 0 ? 'maior que o previsto' : 'menor que o previsto';
                    const statusCalorias =
                      Math.abs(deltaCalorias) < 1 ? 'igual ao previsto' : deltaCalorias > 0 ? 'maior que o previsto' : 'menor que o previsto';
                    
                    return (
                      <div className="mt-6 space-y-3">
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Resumo da Refeição</h3>
                          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                            <table className="w-full table-fixed text-[11px] sm:text-sm">
                              <thead className="bg-gray-50 text-gray-600">
                                <tr>
                                  <th className="w-[42%] px-2 py-2 text-left font-semibold">Item selecionado</th>
                                  <th className="w-[29%] px-2 py-2 text-right font-semibold">Prot. Atual/Prev.</th>
                                  <th className="w-[29%] px-2 py-2 text-right font-semibold">Kcal Atual/Prev.</th>
                                </tr>
                              </thead>
                              <tbody>
                                {itensSelecionadosResumo.map((item) => (
                                  <tr key={item.id} className="border-t border-gray-100">
                                    <td className="px-2 py-2 font-medium text-gray-800">{item.nome}</td>
                                    <td className="px-2 py-2 text-right text-gray-900 whitespace-nowrap">
                                      {item.proteina_g.toFixed(1)}/{previstoProteinaPorItem.toFixed(1)}g
                                    </td>
                                    <td className="px-2 py-2 text-right text-gray-900 whitespace-nowrap">
                                      {Math.round(item.calorias_kcal)}/{Math.round(previstoCaloriasPorItem)} kcal
                                    </td>
                                  </tr>
                                ))}
                                {itensSelecionadosResumo.length === 0 && (
                                  <tr className="border-t border-gray-100">
                                    <td colSpan={3} className="px-2 py-3 text-sm text-gray-600 text-center">
                                      Nenhum item selecionado.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                              <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                                <tr>
                                  <td className="px-2 py-2 font-bold text-gray-900">Resumo total da refeição</td>
                                  <td className="px-2 py-2 text-right font-bold text-gray-900 whitespace-nowrap">
                                    {macrosRefeicaoAtual.proteinaTotal_g.toFixed(1)}/{config.metaProteina_g.toFixed(1)}g
                                  </td>
                                  <td className="px-2 py-2 text-right font-bold text-gray-900 whitespace-nowrap">
                                    {Math.round(macrosRefeicaoAtual.caloriasTotal_kcal)}/{caloriasSugerida} kcal
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                          <div className="mt-2 space-y-1 text-xs text-gray-600">
                            <p>Proteína: {statusProteina} ({deltaProteina >= 0 ? '+' : ''}{deltaProteina.toFixed(1)}g).</p>
                            <p>Calorias: {statusCalorias} ({deltaCalorias >= 0 ? '+' : ''}{Math.round(deltaCalorias)} kcal).</p>
                          </div>
                        </div>
                        
                        {!temProteina && (
                          <p className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded">
                            ⚠️ Selecione pelo menos uma fonte de proteína.
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {showAddItemModal && (
                  <div className="fixed inset-0 z-30 bg-black/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900">Adicionar item da tabela TACO</h3>
                        <button
                          type="button"
                          onClick={() => setShowAddItemModal(false)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Buscar alimento</label>
                            <input
                              type="text"
                              value={tacoQuery}
                              onChange={(e) => setTacoQuery(e.target.value)}
                              placeholder="Ex.: arroz, frango, aveia"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Peso (g)</label>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              value={pesoNovoItem}
                              onChange={(e) => setPesoNovoItem(Number(e.target.value) || 1)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                        </div>

                        <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200">
                          {loadingTaco ? (
                            <p className="p-3 text-sm text-gray-600">Buscando alimentos...</p>
                          ) : tacoResultados.length === 0 ? (
                            <p className="p-3 text-sm text-gray-600">Digite ao menos 2 letras para buscar na TACO.</p>
                          ) : (
                            <ul className="divide-y divide-gray-100">
                              {tacoResultados.map((item) => (
                                <li key={`${item.id ?? item.nome}-${item.nome}`}>
                                  <button
                                    type="button"
                                    onClick={() => setTacoSelecionado(item)}
                                    className={`w-full text-left px-3 py-2 text-sm ${
                                      tacoSelecionado?.nome === item.nome ? 'bg-green-50 text-green-800' : 'hover:bg-gray-50 text-gray-800'
                                    }`}
                                  >
                                    {item.nome}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        {tacoSelecionado && (
                          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                            {(() => {
                              const fator = Math.max(1, pesoNovoItem) / 100;
                              const prot = Math.round(tacoSelecionado.proteinas * fator * 10) / 10;
                              const carb = Math.round(tacoSelecionado.carboidratos * fator * 10) / 10;
                              const kcal = Math.round(tacoSelecionado.calorias * fator);
                              return (
                                <div className="space-y-1">
                                  <p className="font-semibold text-gray-900">{tacoSelecionado.nome} ({Math.round(Math.max(1, pesoNovoItem))}g)</p>
                                  <p>Proteína: {prot}g • Carboidrato: {carb}g • Calorias: {kcal} kcal</p>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                      <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddItemModal(false)}
                          className="px-4 py-2 rounded-md border border-gray-300 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={adicionarItemTacoNaRefeicao}
                          disabled={!tacoSelecionado}
                          className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Adicionar
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-3 sm:p-4 flex items-center justify-end gap-2 flex-nowrap overflow-x-auto">
                  <button
                    onClick={() => {
                      // Ajustar conforme sugerido: selecionar primeira opção de cada categoria
                      const itensSugeridos: Record<string, boolean> = {};
                      const config = configuracaoBuilder[refeicaoEmEdicao];
                      
                      // Proteína: primeira opção disponível
                      const primeiraProteina = config.itensDisponiveis.find(i => i.categoria === 'proteina');
                      if (primeiraProteina) {
                        itensSugeridos[primeiraProteina.id] = true;
                      }
                      
                      // Carboidrato: primeira opção se permitido
                      if (config.maxCarboidratos > 0) {
                        const primeiroCarboidrato = config.itensDisponiveis.find(i => i.categoria === 'carboidrato');
                        if (primeiroCarboidrato) {
                          itensSugeridos[primeiroCarboidrato.id] = true;
                        }
                      }
                      
                      // Legumes/Salada: primeira opção se permitido
                      if (config.maxLegumesSalada > 0) {
                        const primeiroLegume = config.itensDisponiveis.find(i => i.categoria === 'legumes_salada');
                        if (primeiroLegume) {
                          itensSugeridos[primeiroLegume.id] = true;
                        }
                      }
                      
                      setItensSelecionadosRefeicao(itensSugeridos);
                      
                      // Recalcular macros
                      const macros = calcularMacrosRefeicao(config, itensSugeridos);
                      setMacrosRefeicaoAtual(macros);
                    }}
                    className="px-4 py-2 rounded-md border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 font-semibold text-sm whitespace-nowrap shrink-0"
                  >
                    Reset
                  </button>
                  <button
                    onClick={salvarAlteracoesCardapio}
                    disabled={!configuracaoBuilder[refeicaoEmEdicao].itensDisponiveis.some(i => 
                      i.categoria === 'proteina' && itensSelecionadosRefeicao[i.id]
                    )}
                    className="px-5 py-2 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-sm whitespace-nowrap shrink-0"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => {
                      setRefeicaoEmEdicao(null);
                      setOpcaoSelecionadaTemp('');
                      setItensSelecionadosRefeicao({});
                      setMacrosRefeicaoAtual({ proteinaTotal_g: 0, caloriasTotal_kcal: 0 });
                      setAbaBuilderAtiva('proteina');
                    }}
                    className="px-5 py-2 rounded-md border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 font-semibold text-sm whitespace-nowrap shrink-0"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Aba: ChatNutri */}
          {activeTab === 'chatnutri' && (
            <div className="flex flex-col gap-3 w-full max-w-full min-w-0 min-h-[min(85vh,52rem)] overflow-x-hidden">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 shrink-0 min-w-0">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 min-w-0">
                  <MessageSquare className="h-5 w-5 text-green-600 shrink-0" />
                  ChatNutri
                </h2>
                <div className="flex items-center gap-2 shrink-0 max-w-full">
                  <label
                    htmlFor="nutri-aba-chat-date"
                    className="text-xs sm:text-sm font-medium text-gray-600 whitespace-nowrap"
                  >
                    Data
                  </label>
                  <input
                    id="nutri-aba-chat-date"
                    type="date"
                    value={chatNutriDateKey}
                    onChange={(e) => handleChatNutriDateInput(e.target.value)}
                    className="h-9 w-[10.25rem] max-w-[min(100%,10.25rem)] shrink-0 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900"
                  />
                </div>
              </div>
              <ChatNutriPanel
                key={`chatnutri-${paciente.id}-${chatNutriDateKey}`}
                patientId={paciente.id}
                dateKey={chatNutriDateKey}
                className="flex-1 min-h-0 w-full"
              />
            </div>
          )}

          {/* Aba: Histórico */}
          {activeTab === 'historico' && (() => {
            const parseCheckInDateLocal = (dataStr: string): Date | null => {
              if (!dataStr || !dataStr.match(/^\d{4}-\d{2}-\d{2}$/)) return null;
              const [ano, mes, dia] = dataStr.split('-').map(Number);
              return new Date(ano, mes - 1, dia, 0, 0, 0, 0);
            };

            const isMesmoDia = (a: Date, b: Date) =>
              a.getDate() === b.getDate() &&
              a.getMonth() === b.getMonth() &&
              a.getFullYear() === b.getFullYear();

            const checkInsComData = checkIns
              .map((checkIn) => {
                const dataObj = parseCheckInDateLocal(checkIn.data);
                return dataObj ? { checkIn, dataObj } : null;
              })
              .filter((item): item is { checkIn: CheckInDiario; dataObj: Date } => item !== null);

            const ano = historicoMesCalendario.getFullYear();
            const mes = historicoMesCalendario.getMonth();
            const primeiroDiaMes = new Date(ano, mes, 1);
            const ultimoDiaMes = new Date(ano, mes + 1, 0);
            const diasNoMes = ultimoDiaMes.getDate();
            const diaSemanaPrimeiro = primeiroDiaMes.getDay();

            const dias: (Date | null)[] = [];
            for (let i = 0; i < diaSemanaPrimeiro; i++) dias.push(null);
            for (let dia = 1; dia <= diasNoMes; dia++) dias.push(new Date(ano, mes, dia));

            const checkInsNoMes = checkInsComData.filter(
              ({ dataObj }) => dataObj.getMonth() === mes && dataObj.getFullYear() === ano
            );

            const checkInSelecionado =
              historicoDiaSelecionado
                ? checkInsComData.find(({ dataObj }) => isMesmoDia(dataObj, historicoDiaSelecionado))?.checkIn || null
                : null;

            const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
            const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

            const mudarMes = (direcao: 'anterior' | 'proximo') => {
              const novoMes = new Date(historicoMesCalendario);
              novoMes.setMonth(mes + (direcao === 'anterior' ? -1 : 1));
              setHistoricoMesCalendario(novoMes);
              setHistoricoDiaSelecionado(null);
            };

            const formatarDiaAplicacao = (diaAplicacao: CheckInDiario['diaAplicacao']) => {
              if (diaAplicacao === 'aplicou_no_horario') return 'Aplicou no horario';
              if (diaAplicacao === 'aplicou_atrasado') return 'Aplicou atrasado';
              if (diaAplicacao === 'esqueceu') return 'Esqueceu';
              return 'Nao foi dia';
            };

            const hoje = new Date();

            const MiniBar = ({ label, valuePct }: { label: string; valuePct: number }) => (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] sm:text-xs">
                  <span className="font-medium text-gray-600">{label}</span>
                  <span className="tabular-nums font-semibold text-gray-900">{valuePct.toFixed(0)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, valuePct))}%` }}
                  />
                </div>
              </div>
            );

            return (
              <div className="min-w-0 overflow-hidden">
                <div className="border-b border-gray-200 bg-gradient-to-r from-violet-50/60 via-white to-emerald-50/40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 sm:py-5">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                        <Calendar className="h-5 w-5" />
                      </span>
                      Histórico de check-ins
                    </h2>
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => mudarMes('anterior')}
                        className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                        aria-label="Mês anterior"
                      >
                        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                      </button>
                      <span className="text-sm sm:text-base font-semibold text-gray-900 flex-1 text-center sm:flex-none min-w-[150px]">
                        {meses[mes]} {ano}
                      </span>
                      <button
                        type="button"
                        onClick={() => mudarMes('proximo')}
                        className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                        aria-label="Próximo mês"
                      >
                        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHistoricoMesCalendario(new Date());
                          setHistoricoDiaSelecionado(null);
                        }}
                        className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap shadow-sm"
                      >
                        Hoje
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-0">
                  {temMaisCheckIns && (
                    <div className="pt-4 pb-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void loadMoreCheckIns()}
                        disabled={loadingMaisCheckIns}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60"
                      >
                        {loadingMaisCheckIns ? 'Carregando...' : 'Carregar check-ins antigos'}
                      </button>
                    </div>
                  )}
                  <div className="border-t border-gray-200 sm:-mx-6">
                    <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-100/80">
                      {diasSemana.map((diaSemana) => (
                        <div key={diaSemana} className="p-2 sm:p-3 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wide text-gray-600">
                          {diaSemana}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 bg-white border-b border-gray-200">
                      {dias.map((dia, index) => {
                        const checkInDoDia = dia
                          ? checkInsNoMes.find(({ dataObj }) => isMesmoDia(dataObj, dia))?.checkIn || null
                          : null;

                        const eHoje =
                          !!dia &&
                          isMesmoDia(dia, new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()));

                        const isDiaSelecionado =
                          !!dia &&
                          !!historicoDiaSelecionado &&
                          isMesmoDia(dia, historicoDiaSelecionado);

                        let corFundo = 'hover:bg-gray-50/80';
                        let corBadge = '';
                        if (checkInDoDia) {
                          if (checkInDoDia.score >= 80) {
                            corFundo = 'bg-emerald-50/90 hover:bg-emerald-100/90';
                            corBadge = 'bg-emerald-600 text-white';
                          } else if (checkInDoDia.score >= 60) {
                            corFundo = 'bg-amber-50/90 hover:bg-amber-100/90';
                            corBadge = 'bg-amber-500 text-white';
                          } else {
                            corFundo = 'bg-red-50/90 hover:bg-red-100/90';
                            corBadge = 'bg-red-600 text-white';
                          }
                        } else if (!dia) {
                          corFundo = 'bg-gray-50/60';
                        }

                        return (
                          <div
                            key={index}
                            role={dia ? 'button' : undefined}
                            tabIndex={dia ? 0 : undefined}
                            onClick={() => dia && setHistoricoDiaSelecionado(dia)}
                            onKeyDown={(e) => {
                              if (dia && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault();
                                setHistoricoDiaSelecionado(dia);
                              }
                            }}
                            className={`min-h-[58px] sm:min-h-[76px] md:min-h-[88px] border border-gray-100 p-1 sm:p-2 transition-colors ${
                              dia ? 'cursor-pointer' : 'cursor-default'
                            } ${corFundo} ${isDiaSelecionado ? 'ring-2 ring-inset ring-violet-500 z-[1]' : ''}`}
                          >
                            {dia && (
                              <>
                                <div
                                  className={`text-xs sm:text-sm font-semibold mb-0.5 ${
                                    eHoje ? 'text-violet-600' : 'text-gray-800'
                                  }`}
                                >
                                  {dia.getDate()}
                                </div>
                                {checkInDoDia && (
                                  <div
                                    className={`inline-flex min-w-[2.1rem] items-center justify-center rounded-md px-1.5 py-0.5 text-xs sm:text-sm font-bold tabular-nums shadow-sm ${corBadge}`}
                                    title={`Score: ${Math.round(checkInDoDia.score)}`}
                                  >
                                    {Math.round(checkInDoDia.score)}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-5 pb-1 sm:pb-2 space-y-5">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs sm:text-sm text-gray-600">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-sm ring-2 ring-emerald-200" />
                      {'Verde: score ≥ 80%'}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-sm ring-2 ring-amber-100" />
                      {'Amarelo: 60% – 79,9%'}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm ring-2 ring-red-100" />
                      {'Vermelho: < 60%'}
                    </span>
                  </div>

                  {loadingCheckIns ? (
                    <div className="text-center py-10">
                      <div className="animate-spin rounded-full h-9 w-9 border-2 border-emerald-600 border-t-transparent mx-auto mb-3" />
                      <p className="text-gray-600 text-sm">Carregando check-ins…</p>
                    </div>
                  ) : checkIns.length === 0 ? (
                    <div className="text-center py-10 rounded-xl border border-dashed border-gray-200 bg-gray-50/80">
                      <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                      <p className="text-gray-700 font-medium">Nenhum check-in registrado ainda.</p>
                      <p className="text-sm text-gray-500 mt-1">{'Use o botão "Check-in diário" para começar.'}</p>
                    </div>
                  ) : !historicoDiaSelecionado ? (
                    <div className="rounded-xl border border-dashed border-violet-200/80 bg-violet-50/40 p-6 text-center">
                      <p className="text-sm text-gray-700">
                        Selecione uma data no calendário para ver o detalhamento daquele dia.
                      </p>
                    </div>
                  ) : !checkInSelecionado ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-6 text-center">
                      <p className="text-sm text-gray-700">
                        Não há check-in em{' '}
                        <span className="font-semibold text-gray-900">
                          {historicoDiaSelecionado.toLocaleDateString('pt-BR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        .
                      </p>
                    </div>
                  ) : (() => {
                    const ci = checkInSelecionado;
                    const tier =
                      ci.score >= 80 ? 'green' : ci.score >= 60 ? 'yellow' : 'red';
                    const borderL =
                      tier === 'green'
                        ? 'border-l-emerald-500'
                        : tier === 'yellow'
                          ? 'border-l-amber-400'
                          : 'border-l-red-500';
                    const aderenciaPlano = ci.aderenciaPlano ?? 100;
                    const pctAlimentacao =
                      ((ci.proteinaOk ? 1 : 0) +
                        (ci.frutasOk ? 1 : 0) +
                        (ci.aguaOk ? 1 : 0) +
                        (!ci.lixoAlimentar ? 1 : 0)) *
                      25;
                    const pctSuplementos =
                      (((ci.probioticoTomou ? 1 : 0) + (ci.wheyTomou ? 1 : 0) + (ci.creatinaTomou ? 1 : 0)) / 3) *
                      100;
                    const pctEnergia = (ci.humorEnergia / 5) * 100;

                    return (
                      <div
                        ref={historicoResultadoRef}
                        className={`mt-2 border-t border-gray-200 pt-6 border-l-4 ${borderL} pl-4 sm:pl-5`}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                              Dia selecionado
                            </p>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight capitalize">
                              {formatarDataCheckInCompleta(ci.data)}
                            </h3>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <div
                              className="relative flex h-16 w-16 sm:h-[72px] sm:w-[72px] shrink-0 items-center justify-center rounded-full bg-white shadow-inner ring-4 ring-gray-100"
                              title="Score geral do dia"
                            >
                              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
                                <path
                                  className="text-gray-100"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                />
                                <path
                                  className={
                                    tier === 'green'
                                      ? 'text-emerald-500'
                                      : tier === 'yellow'
                                        ? 'text-amber-500'
                                        : 'text-red-500'
                                  }
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeDasharray={`${ci.score}, 100`}
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                />
                              </svg>
                              <span className="relative text-sm sm:text-base font-extrabold tabular-nums text-gray-900">
                                {ci.score.toFixed(0)}
                                <span className="text-[10px] font-bold text-gray-500">%</span>
                              </span>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Score do dia</p>
                              <p className="text-sm text-gray-700 mt-0.5">
                                {tier === 'green' && 'Ótima adesão geral.'}
                                {tier === 'yellow' && 'Adesão moderada — há espaço para ajustes.'}
                                {tier === 'red' && 'Adesão abaixo do ideal neste dia.'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <MiniBar label="Aderência ao plano (autopercebida)" valuePct={aderenciaPlano} />
                          <MiniBar label="Alimentação & hidratação (4 metas)" valuePct={pctAlimentacao} />
                          <MiniBar label="Suplementos (3 itens)" valuePct={pctSuplementos} />
                          <MiniBar label="Energia / humor (escala 1–5)" valuePct={pctEnergia} />
                        </div>

                        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
                          <div className="rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm">
                            <div className="mb-3 flex items-center gap-2">
                              <Apple className="h-4 w-4 text-emerald-600" />
                              <h4 className="text-sm font-bold text-gray-900">Alimentação</h4>
                              <span className="ml-auto text-xs font-bold tabular-nums text-emerald-700">
                                {pctAlimentacao.toFixed(0)}%
                              </span>
                            </div>
                            <div className="space-y-2">
                              {[
                                { ok: ci.proteinaOk, label: 'Proteína no alvo' },
                                { ok: ci.frutasOk, label: 'Frutas / vegetais' },
                                { ok: ci.aguaOk, label: 'Hidratação' },
                                { ok: !ci.lixoAlimentar, label: 'Evitou ultraprocessados' },
                              ].map((row) => (
                                <div
                                  key={row.label}
                                  className="flex items-center justify-between gap-3 rounded-lg bg-gray-50/90 px-3 py-2 ring-1 ring-gray-100/80"
                                >
                                  <span className="text-sm font-medium text-gray-800">{row.label}</span>
                                  {row.ok ? (
                                    <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                                  ) : (
                                    <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm">
                            <div className="mb-3 flex items-center gap-2">
                              <Pill className="h-4 w-4 text-indigo-600" />
                              <h4 className="text-sm font-bold text-gray-900">Suplementos</h4>
                              <span className="ml-auto text-xs font-bold tabular-nums text-indigo-700">
                                {pctSuplementos.toFixed(0)}%
                              </span>
                            </div>
                            <div className="space-y-2">
                              {[
                                { ok: ci.probioticoTomou, label: 'Probiótico' },
                                { ok: ci.wheyTomou, label: 'Whey' },
                                { ok: ci.creatinaTomou, label: 'Creatina' },
                              ].map((row) => (
                                <div
                                  key={row.label}
                                  className="flex items-center justify-between gap-3 rounded-lg bg-gray-50/90 px-3 py-2 ring-1 ring-gray-100/80"
                                >
                                  <span className="text-sm font-medium text-gray-800">{row.label}</span>
                                  {row.ok ? (
                                    <CheckCircle className="h-4 w-4 shrink-0 text-indigo-600" />
                                  ) : (
                                    <XCircle className="h-4 w-4 shrink-0 text-gray-400" />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm lg:col-span-2">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <Heart className="h-4 w-4 text-rose-500" />
                              <h4 className="text-sm font-bold text-gray-900">Bem-estar & rotina</h4>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                              <div className="rounded-lg bg-gray-50/90 px-3 py-2 ring-1 ring-gray-100">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Sintomas GI</p>
                                <span
                                  className={`mt-1 inline-flex text-xs font-bold px-2 py-0.5 rounded-md ${
                                    ci.sintomasGI === 'nenhum'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : ci.sintomasGI === 'leve'
                                        ? 'bg-amber-100 text-amber-800'
                                        : ci.sintomasGI === 'moderado'
                                          ? 'bg-orange-100 text-orange-800'
                                          : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {ci.sintomasGI.charAt(0).toUpperCase() + ci.sintomasGI.slice(1)}
                                </span>
                              </div>
                              <div className="rounded-lg bg-gray-50/90 px-3 py-2 ring-1 ring-gray-100">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Sono</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                                  <Moon className="h-3.5 w-3.5 text-violet-600" />
                                  {ci.horasSono}
                                </p>
                              </div>
                              <div className="rounded-lg bg-gray-50/90 px-3 py-2 ring-1 ring-gray-100">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Energia</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                                  {ci.humorEnergia}/5
                                  <span className="text-xs font-normal text-gray-500 tabular-nums">
                                    ({pctEnergia.toFixed(0)}%)
                                  </span>
                                </p>
                              </div>
                              <div className="rounded-lg bg-gray-50/90 px-3 py-2 ring-1 ring-gray-100">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Atividade</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900 capitalize flex items-center gap-1.5">
                                  <Activity className="h-3.5 w-3.5 text-sky-600" />
                                  {ci.atividadeFisicaHoje}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {(ci.diaAplicacao !== 'nao_foi_dia' ||
                          (ci.observacoes && ci.observacoes.trim()) ||
                          ci.pesoHoje != null ||
                          ci.caloriasDiarias_kcal != null) && (
                          <div className="mt-5 space-y-3 rounded-lg bg-gray-50/80 p-4 ring-1 ring-gray-100/80">
                            {(ci.pesoHoje != null || ci.caloriasDiarias_kcal != null) && (
                              <div className="flex flex-wrap gap-3 text-sm">
                                {ci.pesoHoje != null && (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-800">
                                    <Weight className="h-3.5 w-3.5" />
                                    Peso: {ci.pesoHoje} kg
                                  </span>
                                )}
                                {ci.caloriasDiarias_kcal != null && (
                                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 font-semibold text-orange-900 ring-1 ring-orange-100">
                                    <Target className="h-3.5 w-3.5" />
                                    {ci.caloriasDiarias_kcal.toLocaleString('pt-BR')} kcal (cardápio)
                                  </span>
                                )}
                              </div>
                            )}
                            {ci.diaAplicacao !== 'nao_foi_dia' && (
                              <div className="flex items-start gap-2 text-sm">
                                <Syringe className="h-4 w-4 shrink-0 text-pink-600 mt-0.5" />
                                <div>
                                  <span className="font-semibold text-gray-900">Tirzepatida: </span>
                                  <span className="text-gray-800">{formatarDiaAplicacao(ci.diaAplicacao)}</span>
                                  {ci.localAplicacao ? (
                                    <span className="text-gray-600"> · {ci.localAplicacao}</span>
                                  ) : null}
                                </div>
                              </div>
                            )}
                            {ci.observacoes && ci.observacoes.trim() && (
                              <p className="text-sm text-gray-700 leading-relaxed border-t border-gray-100 pt-3">
                                <span className="font-semibold text-gray-900">Observação: </span>
                                {ci.observacoes}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <CardapioPrintModal
        open={cardapioPrintModalOpen}
        onClose={() => setCardapioPrintModalOpen(false)}
        contexto={
          cardapioPrintModalOpen && plano
            ? montarCardapioPdfContext(plano, opcoesRefeicoes, itensCustomizadosPorRefeicao, paciente)
            : null
        }
      />
    </div>
  );
}
