'use client';

import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react';
import type { CardapioPdfContext } from '@/types/cardapioPrint';
import CardapioPrintModal from '@/components/CardapioPrintModal';
import { createPortal } from 'react-dom';
import { doc, getDoc, setDoc, Timestamp, deleteField, collection, getDocs, query, orderBy, limit, startAfter, type QueryDocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { PacienteCompleto } from '@/types/obesidade';
import { MedicoService } from '@/services/medicoService';
import { NutricionistaService } from '@/services/nutricionistaService';
import { PacienteNutricionistaService } from '@/services/pacienteNutricionistaService';
import ChatNutriPanel from '@/components/ChatNutriPanel';
import type { AnamneseIntensidadeDesejada, AnamneseNutricionalSnapshot } from '@/lib/nutri/anamneseNutricional';
import {
  INTENSIDADE_DESEJADA_PADRAO,
  criarSnapshotAnamneseNutricional,
  obterIntensidadeDesejadaDoSnapshot,
  planoTemAnamneseNutricional,
  planoTemCalculosNutricionais,
  rotuloIntensidadeDesejada,
  wizardFromAnamneseSnapshot,
} from '@/lib/nutri/anamneseNutricional';
import { montarCamposPlanoFromAnamnese } from '@/lib/nutri/gerarPlanoFromAnamnese';
import type { DadosEnergeticosPaciente } from '@/lib/nutri/dadosEnergeticosPaciente';
import {
  montarDadosEnergeticosPaciente,
  rotuloBloqueioEnergetico,
} from '@/lib/nutri/dadosEnergeticosPaciente';
import { calcularEstimativaTmb } from '@/lib/nutri/estimativaMetabolica';
import {
  calcularEstimativaGet,
  rotuloConfiancaAtividade,
  rotuloMotivoGetIndisponivel,
  rotuloNivelAtividadeEnergetica,
} from '@/lib/nutri/estimativaGastoEnergetico';
import {
  calcularEstrategiaEnergetica,
  rotuloAlertaEstrategia,
  rotuloIntensidadeAplicada,
  rotuloMotivoAjusteEstrategia,
  rotuloStatusEstrategia,
} from '@/lib/nutri/estrategiaEnergetica';
import {
  REFEICOES_NUTRI_ORDEM,
  calcularDistribuicaoMetasRefeicoes,
  rotuloAjusteDistribuicao,
  rotuloRefeicaoNutri,
  type DistribuicaoMetasRefeicoes,
} from '@/lib/nutri/distribuicaoMetasRefeicoes';
import {
  montarPratoPadraoRefeicaoV2,
  obterMetasMontagemRefeicao,
  opcaoPodeSerRegeneradaAutomaticamente,
  statusFaixaMontagem,
  rotuloTemplateMontagem,
  type GeracaoAutomaticaMeta,
  type OrigemOpcaoRefeicao,
  type ResultadoMontagemPratoAutomatico,
} from '@/lib/nutri/montagemPratoPadrao';
import { montarOpcao01DiaCompleto } from '@/lib/nutri/montarOpcao01Dia';
import {
  coletarSlotsPreenchidosParaImpressao,
  devePromoverSlotSalvoComoAtual,
  mesclarSlotsAposAnamnese,
  planoTemEdicaoDeNutricionista,
  resolverOpcaoAtualComPrecedenciaNutri,
  slotFoiEditadoPorNutricionista,
} from '@/lib/nutri/cardapioPrecedenciaNutri';
import { notifyPacienteCardapioEditadoClient } from '@/lib/nutri/cardapio/notifyPacienteCardapioClient';
import {
  buildMealImageSource,
  buildMealImageSourceHash,
  parseMealImageRecord,
  withMealImage,
  type MealImageData,
} from '@/lib/nutri/mealImageSource';
import { mealDishImageInstanceKey, shouldFetchMealDishImageUrl } from '@/lib/nutri/mealImageDisplay';
import {
  hasLinkedNutritionistFromIds,
  isMealImagePatientViewer,
  mealDishGenerateLabel,
  mealImageGenerationSlotKey,
  resolveMealDishGenerateAction,
  resolveMealDishRegenerateAction,
  resolveMealImageActorKind,
} from '@/lib/nutri/mealImageGenerateEligibility';
import { requestMealImageGeneration } from '@/lib/nutri/mealImageGenerateClient';
import { patchSlotMealImage } from '@/lib/nutri/mealImageSlotPatch';
import { isMealImageReadyAndCurrent } from '@/lib/nutri/mealImageSlot';
import { shouldRunMealImageAutoGeneration, shouldApplyMealImageClientUpdate } from '@/lib/nutri/mealImageAutoQueue';
import { useMealImageAutoGeneration } from '@/lib/nutri/useMealImageAutoGeneration';
import {
  rotuloGrupoProteina,
  type GrupoProteinaPaciente,
} from '@/lib/nutri/gruposProteicos';
import {
  CATALOGO_OPCAO_01_ATUAL,
  filtrarCatalogoOpcao01PorRestricoes,
  type ItemCatalogoOpcao01,
} from '@/lib/nutri/catalogoOpcao01';
import PlanoNutriVisaoGeral from '@/components/nutri/PlanoNutriVisaoGeral';
import MealDishImage from '@/components/nutri/MealDishImage';
import MealDishPreviewModal from '@/components/nutri/MealDishPreviewModal';
import MealMacroRing from '@/components/nutri/MealMacroRing';
import { CARDAPIO_RESUMO_TOTAL_DIA_ID } from '@/lib/nutri/mealMacroRing';
import HydrationDailyTracker from '@/components/nutri/hidratacao/HydrationDailyTracker';
import HydrationProfessionalPanel from '@/components/nutri/hidratacao/HydrationProfessionalPanel';
import { CheckInSemanalNutriView } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriView';
import { CheckInSemanalNutriOverlay } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriOverlay';
import { CheckInSemanalNutriCta } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriCta';
import { CheckInSemanalNutriWeekPicker } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriWeekPicker';
import { CheckInSemanalNutriScheduleEditor } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriScheduleEditor';
import { CheckInSemanalNutriEvolucao } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriEvolucao';
import {
  CheckInSemanalNutriHistoricoLegadoSummary,
} from '@/components/nutri/checkin-semanal/CheckInSemanalNutriHistorico';
import {
  mapCheckInSemanalNutriAuthorship,
  resolveNutritionistIdForCheckIn,
} from '@/lib/nutri/checkInSemanalNutriAuthorship';
import {
  CHECK_IN_DIARIO_NUTRI_ENABLED,
  getCheckInSemanalNutriCapabilities,
  resolveCheckInSemanalNutriViewerRole,
} from '@/lib/nutri/checkInSemanalNutriCapabilities';
import { getNutritionCheckInReferenceWeek, getNutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';
import { calcularSemanaAtualTratamento } from '@/utils/tratamentoUtils';
import type { CheckInSemanalNutriInteraction } from '@/lib/nutri/canEditWeeklyNutritionCheckIn';
import PlanoNutriAnamnesePanel from '@/components/nutri/PlanoNutriAnamnesePanel';
import NutriOrientacoesPanel from '@/components/nutri/NutriOrientacoesPanel';
import NutriPlanosTemplatesPanel, {
  ImportarRefeicaoDePlanoModal,
} from '@/components/nutri/NutriPlanosTemplatesPanel';
import EditarPorcaoItemModal, {
  type PorcaoItemEditavel,
} from '@/components/nutri/EditarPorcaoItemModal';
import {
  criarItemComPorcao,
  formatarNomeItemPorcao,
  formatarResumoMacrosItem,
  nomeBaseAlimento,
  normalizarItemComPorcao,
  type CategoriaItemPlano,
  type OrigemAlimentoPlano,
  type RefeicaoPlanoTemplate,
} from '@/lib/nutri/planosNutricionista';
import {
  itemPlanoParaItemRefeicaoSnapshot,
  itemRefeicaoSnapshotParaPlano,
} from '@/lib/nutri/itemRefeicaoSnapshot';
import {
  categoriaDaAbaBuilder,
  mapMetaNutriFoodToItemPlano,
} from '@/lib/metanutri/alimentosGlobais/mapMetaNutriFoodToItemPlano';
import type { MetaNutriFoodSearchResult } from '@/lib/metanutri/alimentosGlobais/types';
import {
  calcularNutrientePorPorcao,
  roundNutriente,
} from '@/lib/metanutri/alimentosGlobais/calcularNutrientePorPorcao';
import { ROTULO_SEGMENTO_ALIMENTO } from '@/lib/metaadmingeral/alimentosGlobais/segmentos';
import { 
  UtensilsCrossed, Calendar, AlertCircle, CheckCircle, XCircle, 
  Droplet, Apple, Activity, Target, Clock, Moon, Coffee, 
  Sun, Sunset, TrendingUp, Zap, Heart, Pill, Syringe, 
  Wind, Brain, Dumbbell, MessageSquare, Weight, AlertTriangle, Edit, X,
  ChevronLeft, ChevronRight, Printer, RotateCcw, ClipboardList, BookMarked,
  Loader2, CalendarDays, Mail, Menu
} from 'lucide-react';
import './NutriContent.shell.css';

type AddFoodModeCardapio = 'metanutri' | 'taco' | 'manual';

function formatMacroOrDashCardapio(v: number | null | undefined): string {
  if (v == null) return '—';
  return String(v);
}

function isIdItemCustomizadoCardapio(id: string): boolean {
  return (
    id.startsWith('imp_') ||
    id.startsWith('taco_') ||
    id.startsWith('manual_') ||
    id.startsWith('metanutri_')
  );
}

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
  peso_g?: number;
  quantidade?: number;
  unidade?: string;
  proteinaBase_g?: number;
  caloriasBase_kcal?: number;
  pesoBase_g?: number;
  /** ETAPA 07/08 — opcionais; undefined = desconhecido */
  carboidrato_g?: number;
  gordura_g?: number;
  fibra_g?: number;
  carboidratoBase_g?: number;
  gorduraBase_g?: number;
  fibraBase_g?: number;
  origemAlimento?: OrigemAlimentoPlano;
  alimentoGlobalId?: string;
}

/** Normaliza ItemRefeicao preservando snapshot ETAPA 07/08 (C/G/F, bases, origem). */
function viewItemRefeicao(item: ItemRefeicao): ItemRefeicao {
  const snap = itemPlanoParaItemRefeicaoSnapshot(
    itemRefeicaoSnapshotParaPlano({
      id: item.id,
      nome: item.nome,
      categoria: item.categoria,
      proteina_g: item.proteina_g,
      calorias_kcal: item.calorias_kcal,
      descricao: item.descricao,
      peso_g: item.peso_g,
      quantidade: item.quantidade,
      unidade: item.unidade,
      proteinaBase_g: item.proteinaBase_g,
      caloriasBase_kcal: item.caloriasBase_kcal,
      pesoBase_g: item.pesoBase_g,
      carboidrato_g: item.carboidrato_g,
      gordura_g: item.gordura_g,
      fibra_g: item.fibra_g,
      carboidratoBase_g: item.carboidratoBase_g,
      gorduraBase_g: item.gorduraBase_g,
      fibraBase_g: item.fibraBase_g,
      origemAlimento: item.origemAlimento,
      alimentoGlobalId: item.alimentoGlobalId,
    })
  );
  return {
    ...snap,
    categoria: item.categoria,
  };
}

function itemPlanoComoItemRefeicao(
  item: Parameters<typeof itemPlanoParaItemRefeicaoSnapshot>[0]
): ItemRefeicao {
  const snap = itemPlanoParaItemRefeicaoSnapshot(item);
  return {
    ...snap,
    categoria: snap.categoria as CategoriaItemRefeicao,
  };
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
  /** Meta calórica de referência (ETAPA 8/9 ou legado). */
  metaCalorias_kcal: number;
}

interface OpcaoRefeicao {
  id: string;
  titulo: string;       // nome curto (ex: "Frango + arroz + salada")
  descricao: string;    // descrição completa
  proteina_g: number;   // proteína aproximada dessa combinação
  calorias_kcal: number;// calorias aproximadas
  itensSelecionados?: string[]; // IDs dos itens selecionados (para opções customizadas)
  /**
   * Snapshot dos itens no momento do save — fonte da tabela do cardápio (P/C/kcal por item).
   * Evita depender só do catálogo/custom no reload.
   */
  itensDetalhe?: ItemRefeicao[];
  /** Observação do nutricionista — visível para o paciente abaixo dos itens. */
  observacao?: string;
  /** ETAPA 9 — origem da opção (automática vs edição). */
  origem?: OrigemOpcaoRefeicao;
  geracaoAutomatica?: GeracaoAutomaticaMeta;
  /** Foto IA do prato (opcional). Ausente = plano legado, sem imagem. */
  mealImage?: MealImageData;
}

interface PlanoNutricional {
  estilo: 'digestiva' | 'plant_based' | 'mediterranea' | 'rico_proteina' | 'low_carb_moderada';
  protDia_g: number;
  aguaDia_ml: number;
  /**
   * Meta calórica diária (kcal) usada na distribuição do cardápio.
   * Quando definida (geração ou edição do nutricionista), é a fonte de cálculo
   * em vez de recalcular só pela anamnese a cada leitura.
   */
  caloriasDia_kcal?: number;
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
  /** Snapshot completo da anamnese (wizard). Opcional — planos antigos não têm. */
  anamneseNutricional?: AnamneseNutricionalSnapshot;
  // Opções customizadas criadas pelo meal builder
  opcoesCustomizadas?: Record<RefeicaoKey, OpcaoRefeicao[]>;
  // 5 slots fixos (Opção 01–05) por refeição; opcoesSelecionadas aponta para a "Atual"
  opcoesSlots?: Record<RefeicaoKey, OpcaoRefeicao[]>;
  // Itens customizados adicionados via TACO por refeição
  itensCustomizadosPorRefeicao?: Record<RefeicaoKey, ItemRefeicao[]>;
  /** True depois que o nutricionista salva o cardápio — anamnese/automático não sobrescreve. */
  cardapioEditadoPorNutricionista?: boolean;
  cardapioEditadoPorNutricionistaEm?: Date;
}

const CARDAPIO_OPCAO_SLOTS = [1, 2, 3, 4, 5] as const;
type CardapioOpcaoSlot = (typeof CARDAPIO_OPCAO_SLOTS)[number];

/** Cores padrão por refeição (barra/legenda usam a cor cheia; UI usa tons claros). */
const COR_REFEICAO: Record<RefeicaoKey, string> = {
  cafe: '#F97316', // laranja
  lanche1: '#38BDF8', // azul claro
  almoco: '#22C55E', // verde
  lanche2: '#EF4444', // vermelho
  jantar: '#1E3A8A', // azul escuro
};

function hexComAlpha(hex: string, alphaHex: string): string {
  return `${hex}${alphaHex}`;
}

function slotOpcaoId(refeicaoKey: RefeicaoKey, slot: number): string {
  return `slot_${refeicaoKey}_${slot}`;
}

function parseSlotOpcaoIndex(refeicaoKey: RefeicaoKey, opcaoId: string | undefined | null): CardapioOpcaoSlot {
  if (!opcaoId) return 1;
  const match = opcaoId.match(new RegExp(`^slot_${refeicaoKey}_([1-5])$`));
  if (match) return Number(match[1]) as CardapioOpcaoSlot;
  return 1;
}

function criarSlotOpcaoVazio(refeicaoKey: RefeicaoKey, slot: number): OpcaoRefeicao {
  return {
    id: slotOpcaoId(refeicaoKey, slot),
    titulo: `Opção ${String(slot).padStart(2, '0')}`,
    descricao: '',
    proteina_g: 0,
    calorias_kcal: 0,
  };
}

function tituloPadraoOpcao(slot: number): string {
  return `Opção ${String(slot).padStart(2, '0')}`;
}

function rotuloOpcaoExibicao(opcao: OpcaoRefeicao | null | undefined, slot: number): string {
  const titulo = opcao?.titulo?.trim();
  if (titulo && titulo.length > 0) return titulo;
  return tituloPadraoOpcao(slot);
}

function observacaoDaOpcao(opcao: OpcaoRefeicao | null | undefined): string {
  const raw = opcao?.observacao;
  return typeof raw === 'string' ? raw.trim() : '';
}

function comObservacaoPreservada(
  destino: OpcaoRefeicao,
  origem: OpcaoRefeicao | null | undefined
): OpcaoRefeicao {
  const obs = observacaoDaOpcao(destino) || observacaoDaOpcao(origem);
  return obs ? { ...destino, observacao: obs } : destino;
}

function slotOpcaoEstaVazio(opcao: OpcaoRefeicao | null | undefined): boolean {
  if (!opcao) return true;
  const temDescricao = Boolean(opcao.descricao?.trim());
  const temItens = Boolean(opcao.itensSelecionados?.length);
  const temMacros = (opcao.proteina_g || 0) > 0 || (opcao.calorias_kcal || 0) > 0;
  const temObs = Boolean(observacaoDaOpcao(opcao));
  return !temDescricao && !temItens && !temMacros && !temObs;
}

function copiarConteudoOpcaoParaSlot(
  slotBase: OpcaoRefeicao,
  fonte: OpcaoRefeicao,
  slotNumero: number
): OpcaoRefeicao {
  return withMealImage(
    {
      ...slotBase,
      titulo: slotBase.titulo?.trim() && !/^Opção\s*0?[1-5]$/i.test(slotBase.titulo.trim())
        ? slotBase.titulo
        : tituloPadraoOpcao(slotNumero),
      descricao: fonte.descricao || slotBase.descricao || '',
      proteina_g: fonte.proteina_g || slotBase.proteina_g || 0,
      calorias_kcal: fonte.calorias_kcal || slotBase.calorias_kcal || 0,
      ...(fonte.itensSelecionados?.length
        ? { itensSelecionados: fonte.itensSelecionados }
        : slotBase.itensSelecionados?.length
          ? { itensSelecionados: slotBase.itensSelecionados }
          : {}),
      ...(fonte.itensDetalhe?.length
        ? { itensDetalhe: fonte.itensDetalhe.map(viewItemRefeicao) }
        : slotBase.itensDetalhe?.length
          ? { itensDetalhe: slotBase.itensDetalhe.map(viewItemRefeicao) }
          : {}),
      ...(fonte.observacao?.trim()
        ? { observacao: fonte.observacao.trim() }
        : slotBase.observacao?.trim()
          ? { observacao: slotBase.observacao.trim() }
          : {}),
    },
    fonte
  );
}

/** Snapshot dos itens selecionados (macros por item no cardápio). */
function montarItensDetalheOpcao(
  idsSelecionados: string[] | undefined,
  itensDisponiveis: ItemRefeicao[]
): ItemRefeicao[] {
  if (!idsSelecionados?.length) return [];
  const porId = new Map(itensDisponiveis.map((item) => [item.id, item]));
  return idsSelecionados
    .map((id) => porId.get(id))
    .filter(Boolean)
    .map((item) => viewItemRefeicao(item as ItemRefeicao));
}

function anexarItensDetalheOpcao(
  opcao: OpcaoRefeicao,
  itensDisponiveis: ItemRefeicao[]
): OpcaoRefeicao {
  if (opcao.itensDetalhe?.length) {
    return { ...opcao, itensDetalhe: opcao.itensDetalhe.map(viewItemRefeicao) };
  }
  const detalhe = montarItensDetalheOpcao(opcao.itensSelecionados, itensDisponiveis);
  return detalhe.length > 0 ? { ...opcao, itensDetalhe: detalhe } : opcao;
}

type LinhaResumoOpcaoCardapio = {
  id: string;
  descricao: string;
  proteinaItem: number;
  /** undefined = desconhecido (mostra —); 0 = zero informado */
  carboidratoItem: number | undefined;
  caloriasItem: number;
};

/** Monta linhas da tabela Cardápio/PDF; usa snapshot/itens quando disponíveis. */
function montarLinhasResumoOpcao(
  opcao: OpcaoRefeicao | null | undefined,
  itensPorId: ItemRefeicao[],
  descricaoFallback: string
): LinhaResumoOpcaoCardapio[] {
  const porId = new Map(itensPorId.map((item) => [item.id, item]));
  const detalheSalvo = (opcao?.itensDetalhe || []).map(viewItemRefeicao);
  const detalhePorIds = (opcao?.itensSelecionados || [])
    .map((itemId) => porId.get(itemId))
    .filter(Boolean)
    .map((item) => viewItemRefeicao(item as ItemRefeicao));

  // Preferência: snapshot salvo no slot → resolução por IDs no catálogo/custom
  const itensFonte =
    detalheSalvo.length > 0
      ? detalheSalvo
      : detalhePorIds.length > 0
        ? detalhePorIds
        : [];

  if (itensFonte.length > 0) {
    const vistos = new Set<string>();
    return itensFonte.flatMap((item, index) => {
      const norm = viewItemRefeicao(item);
      const chave = `${norm.id}::${formatarNomeItemPorcao(itemRefeicaoSnapshotParaPlano(norm))}`;
      if (vistos.has(chave)) return [];
      vistos.add(chave);
      return [
        {
          id: `${index}-${norm.id}`,
          descricao: formatarNomeItemPorcao(itemRefeicaoSnapshotParaPlano(norm)),
          proteinaItem: Number(norm.proteina_g) || 0,
          carboidratoItem: norm.carboidrato_g,
          caloriasItem: Number(norm.calorias_kcal) || 0,
        },
      ];
    });
  }

  const descricao = opcao?.descricao || descricaoFallback || '';
  const partes = descricao
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

  const linhasTexto = partes.map((texto, index) => {
    const proteinaMatches = Array.from(texto.matchAll(/(\d+(?:[.,]\d+)?)\s*g[^,.;)]{0,25}prote[ií]na/gi));
    const carbMatches = Array.from(
      texto.matchAll(/(\d+(?:[.,]\d+)?)\s*g[^,.;)]{0,25}carboidrat/gi)
    );
    const caloriasMatches = Array.from(texto.matchAll(/(\d+(?:[.,]\d+)?)\s*kcal/gi));
    const proteinaExtraida = proteinaMatches.reduce((acc, match) => acc + Number(match[1].replace(',', '.')), 0);
    const carbExtraida = carbMatches.reduce((acc, match) => acc + Number(match[1].replace(',', '.')), 0);
    const caloriasExtraida = caloriasMatches.reduce((acc, match) => acc + Number(match[1].replace(',', '.')), 0);
    return {
      id: `${index}-${texto.slice(0, 32)}`,
      descricao: texto,
      proteinaItem: proteinaExtraida,
      carboidratoItem: carbExtraida > 0 ? carbExtraida : undefined,
      caloriasItem: caloriasExtraida,
    };
  });

  const somaProt = linhasTexto.reduce((acc, l) => acc + l.proteinaItem, 0);
  const somaKcal = linhasTexto.reduce((acc, l) => acc + l.caloriasItem, 0);
  const protOpcao = opcao?.proteina_g || 0;
  const kcalOpcao = opcao?.calorias_kcal || 0;

  // Opções padrão do catálogo: descrição sem macros por item → usar totais da opção
  if (linhasTexto.length > 0 && somaProt <= 0 && somaKcal <= 0 && (protOpcao > 0 || kcalOpcao > 0)) {
    return [
      ...linhasTexto.map((l) => ({
        ...l,
        proteinaItem: 0,
        carboidratoItem: undefined as number | undefined,
        caloriasItem: 0,
      })),
      {
        id: 'total-opcao',
        descricao: 'Total estimado da opção',
        proteinaItem: protOpcao,
        carboidratoItem: undefined,
        caloriasItem: kcalOpcao,
      },
    ];
  }

  if (linhasTexto.length === 0 && (protOpcao > 0 || kcalOpcao > 0 || descricao.trim())) {
    return [
      {
        id: 'opcao-resumo',
        descricao: descricao.trim() || (opcao?.titulo || 'Opção padrão'),
        proteinaItem: protOpcao,
        carboidratoItem: undefined,
        caloriasItem: kcalOpcao,
      },
    ];
  }

  return linhasTexto;
}

/** Garante exatamente 5 slots por refeição; migra a opção atual para o slot 01 se necessário. */
function localizarSlotExistente(
  slotsExistentes: OpcaoRefeicao[] | undefined,
  refeicaoKey: RefeicaoKey,
  slot: number,
  id: string
): OpcaoRefeicao | undefined {
  const porId = slotsExistentes?.find((o) => o.id === id);
  if (porId) return porId;
  const porIndice = slotsExistentes?.[slot - 1];
  if (!porIndice) return undefined;
  const idIndice = String(porIndice.id || '');
  if (!idIndice || idIndice === id) return porIndice;
  if (!idIndice.startsWith('slot_')) return porIndice;
  if (parseSlotOpcaoIndex(refeicaoKey, idIndice) === slot) return porIndice;
  return undefined;
}

function garantirOpcoesSlotsPorRefeicao(
  refeicaoKey: RefeicaoKey,
  slotsExistentes: OpcaoRefeicao[] | undefined,
  opcaoAtual: OpcaoRefeicao | null | undefined,
  textoModeloDia: string
): OpcaoRefeicao[] {
  return CARDAPIO_OPCAO_SLOTS.map((slot) => {
    const id = slotOpcaoId(refeicaoKey, slot);
    const existente = localizarSlotExistente(slotsExistentes, refeicaoKey, slot, id);
    if (existente) {
      // Slot 01 vazio + catálogo disponível → reaproveitar macros/descrição do padrão
      if (slot === 1 && slotOpcaoEstaVazio(existente) && opcaoAtual && !slotOpcaoEstaVazio(opcaoAtual)) {
        return {
          ...copiarConteudoOpcaoParaSlot(existente, opcaoAtual, 1),
          id,
        };
      }
      // Slot 01 com descrição mas sem macros → completar com catálogo
      if (
        slot === 1 &&
        opcaoAtual &&
        (existente.proteina_g || 0) <= 0 &&
        (existente.calorias_kcal || 0) <= 0 &&
        ((opcaoAtual.proteina_g || 0) > 0 || (opcaoAtual.calorias_kcal || 0) > 0)
      ) {
        return comObservacaoPreservada(
          {
            ...existente,
            id,
            titulo: existente.titulo?.trim() || tituloPadraoOpcao(1),
            descricao: existente.descricao?.trim() || opcaoAtual.descricao || textoModeloDia || '',
            proteina_g: opcaoAtual.proteina_g || 0,
            calorias_kcal: opcaoAtual.calorias_kcal || 0,
            ...(opcaoAtual.itensSelecionados?.length
              ? { itensSelecionados: opcaoAtual.itensSelecionados }
              : {}),
            ...(opcaoAtual.itensDetalhe?.length
              ? { itensDetalhe: opcaoAtual.itensDetalhe.map(viewItemRefeicao) }
              : {}),
          },
          existente
        );
      }
      return comObservacaoPreservada(
        {
          ...existente,
          id,
          titulo: existente.titulo?.trim() || tituloPadraoOpcao(slot),
        },
        existente
      );
    }
    if (slot === 1 && opcaoAtual) {
      return {
        ...opcaoAtual,
        id,
        titulo: opcaoAtual.titulo?.trim() || tituloPadraoOpcao(1),
        descricao: opcaoAtual.descricao || textoModeloDia || '',
        ...(opcaoAtual.itensDetalhe?.length
          ? { itensDetalhe: opcaoAtual.itensDetalhe.map(viewItemRefeicao) }
          : {}),
      };
    }
    if (slot === 1 && textoModeloDia) {
      return {
        ...criarSlotOpcaoVazio(refeicaoKey, slot),
        descricao: textoModeloDia,
      };
    }
    return criarSlotOpcaoVazio(refeicaoKey, slot);
  });
}

function normalizarSlotsRefeicao(value: unknown): OpcaoRefeicao[] | undefined {
  if (Array.isArray(value)) return value as OpcaoRefeicao[];
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, OpcaoRefeicao>)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => (value as Record<string, OpcaoRefeicao>)[k])
      .filter(Boolean);
  }
  return undefined;
}

function garantirOpcoesSlotsPlano(
  plano: PlanoNutricional,
  opcoesDisponiveis: Record<RefeicaoKey, OpcaoRefeicao[]>
): Record<RefeicaoKey, OpcaoRefeicao[]> {
  const refeicoes: RefeicaoKey[] = ['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'];
  const resultado = {} as Record<RefeicaoKey, OpcaoRefeicao[]>;
  refeicoes.forEach((refeicaoKey) => {
    const opcaoId = plano.opcoesSelecionadas?.[refeicaoKey];
    const opcaoAtual =
      opcoesDisponiveis[refeicaoKey]?.find((o) => o.id === opcaoId) ||
      opcoesDisponiveis[refeicaoKey]?.[0] ||
      null;
    resultado[refeicaoKey] = garantirOpcoesSlotsPorRefeicao(
      refeicaoKey,
      normalizarSlotsRefeicao(plano.opcoesSlots?.[refeicaoKey]),
      opcaoAtual,
      plano.modeloDia?.[refeicaoKey] || ''
    );
  });
  return resultado;
}

function hidratarOpcoesSlotsParaImagemPrato(
  plano: PlanoNutricional
): Record<RefeicaoKey, OpcaoRefeicao[]> {
  const restricoes = plano.restricoesPaciente || [];
  const preferencias = plano.preferenciasProteinaPaciente || [];
  const config = gerarConfiguracaoBuilderPorRefeicao(plano, restricoes, preferencias);
  const keys: RefeicaoKey[] = ['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'];
  const out = {} as Record<RefeicaoKey, OpcaoRefeicao[]>;
  keys.forEach((key) => {
    const slots = garantirOpcoesSlotsPorRefeicao(
      key,
      normalizarSlotsRefeicao(plano.opcoesSlots?.[key]),
      null,
      plano.modeloDia?.[key] || ''
    );
    const itensBase = config[key]?.itensDisponiveis || [];
    const custom = (plano.itensCustomizadosPorRefeicao?.[key] || []).map(viewItemRefeicao);
    const disponiveis = [
      ...itensBase.map((item) => custom.find((c) => c.id === item.id) || item),
      ...custom.filter((item) => !itensBase.some((base) => base.id === item.id)),
    ];
    out[key] = slots.map((slot) => {
      const comDetalhe = anexarItensDetalheOpcao(slot, disponiveis);
      if (buildMealImageSource(comDetalhe)) return comDetalhe;
      const descricaoModelo = String(plano.modeloDia?.[key] || '').trim();
      if (descricaoModelo && !(comDetalhe.descricao || '').trim()) {
        return { ...comDetalhe, descricao: descricaoModelo };
      }
      return comDetalhe;
    });
  });
  return out;
}

function omitUndefinedDeep<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value;
  if (Array.isArray(value)) {
    return value.map((item) => omitUndefinedDeep(item)) as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (nested === undefined) continue;
      out[key] = omitUndefinedDeep(nested);
    }
    return out as T;
  }
  return value;
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
  /** Preferência de adesão declarada pelo paciente (não define calorias nesta etapa). */
  intensidadeDesejada: AnamneseIntensidadeDesejada;
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
  /** Embed no modal do paciente (desktop): menu lateral das pastas em vez da grade. */
  embedded?: boolean;
  /** Somente o chat (ex.: aba Nutrição no MetaPersonal, modal MetaAdmin) — não exige plano carregado */
  onlyChatNutri?: boolean;
  /**
   * MetaPersonal (e similares): vê Plano/Cardápio/Histórico/ChatNutri como no MetaNutri,
   * sem editar plano/cardápio e sem preencher Check-in Semanal. ChatNutri permanece editável.
   */
  somenteVisualizacao?: boolean;
  /** MetaNutri: habilita aba Planos (templates de cardápio reutilizáveis do nutricionista) */
  habilitarPlanosTemplates?: boolean;
  /** YYYY-MM-DD — contexto do dia para o pipeline ChatNutri (totais/refeições) */
  chatNutriDataSelecionada?: string;
  onChatNutriDataChange?: (dateKey: string) => void;
  /**
   * Quem escreve no ChatNutri.
   * Default: modoNutricionista → nutritionist; senão patient.
   * MetaAdmin deve passar "doctor".
   */
  chatNutriAuthorKind?: 'patient' | 'doctor' | 'nutritionist';
  chatNutriAuthorName?: string;
  chatNutriAuthorId?: string;
  /** Abre uma aba específica ao montar (ex.: deep link /meta?menu=nutri&aba=cardapio). */
  initialTab?: 'plano' | 'cardapio' | 'planos' | 'historico' | 'chatnutri' | 'orientacoes';
  /** Semana nutricional (weekKey) para focar em Evolução Nutricional. */
  initialHistoricoWeekKey?: string;
}

// ============================================
// BASE DE OPÇÕES DE REFEIÇÕES
// ============================================

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
  const numMatch = distribuicao.match(/(\d+)/);
  return numMatch ? parseInt(numMatch[1]) : 20;
};

/**
 * Calcula valores sugeridos para uma refeição baseado no plano
 * e, quando disponível, na distribuição energética nova (ETAPA 8).
 */
function calcularValoresSugeridos(
  refeicaoKey: RefeicaoKey,
  plano: PlanoNutricional,
  distribuicaoNova?: DistribuicaoMetasRefeicoes | null
) {
  const metas = obterMetasMontagemRefeicao(refeicaoKey, distribuicaoNova, plano);
  return {
    proteinaSugerida_g: metas.proteinaAlvoG,
    caloriasSugerida_kcal: metas.caloriasAlvoKcal,
    origemMetas: metas.origem,
  };
}

/**
 * Recalcula a distribuição ETAPA 8 a partir do plano + paciente (não persistida).
 * Retorna status indisponível quando dados energéticos/estratégia não permitem.
 */
function calcularDistribuicaoMetasDoPlano(
  paciente: PacienteCompleto,
  plano: PlanoNutricional
): DistribuicaoMetasRefeicoes {
  const anamnese = plano.anamneseNutricional;
  const dadosEnergeticos = montarDadosEnergeticosPaciente(paciente, {
    atividadeFisicaDeclarada: anamnese?.atividadeFisica ?? null,
  });
  const estimativaTmb = calcularEstimativaTmb(dadosEnergeticos);
  const estimativaGet = calcularEstimativaGet(estimativaTmb, {
    atividadeFisicaDeclarada: anamnese?.atividadeFisica ?? null,
    horasSentado: anamnese?.horasSentado ?? null,
  });
  const intensidadeDesejada = obterIntensidadeDesejadaDoSnapshot(anamnese) ?? null;
  const estrategiaEnergetica = calcularEstrategiaEnergetica({
    get: estimativaGet,
    intensidadeDesejada,
    objetivoPrincipal: anamnese?.objetivoPrincipal ?? 'perda_peso',
    sexoBiologico: dadosEnergeticos.sexoBiologico,
    idadeAnos: dadosEnergeticos.idadeAnos,
    imcAtual: dadosEnergeticos.imcAtual,
    atividadeFisicaDeclarada: anamnese?.atividadeFisica ?? null,
    sintomasGI: anamnese?.sintomasGI ?? 'nenhum',
    efeitoSanfona: anamnese?.efeitoSanfona ?? 'nao',
    fomeEmocional: anamnese?.fomeEmocional ?? false,
    compulsaoNoturna: anamnese?.compulsaoNoturna ?? false,
    gestacaoConfirmada: paciente.dadosClinicos?.riscos?.gestacao === 'sim',
    lactacaoConfirmada: paciente.dadosClinicos?.riscos?.lactacao === 'sim',
  });
  const kcalManual = plano.caloriasDia_kcal;
  const estrategiaParaDistribuicao =
    typeof kcalManual === 'number' && Number.isFinite(kcalManual) && kcalManual > 0
      ? {
          ...estrategiaEnergetica,
          status:
            estrategiaEnergetica.status === 'indisponivel'
              ? ('calculada' as const)
              : estrategiaEnergetica.status,
          metaCaloricaAplicadaKcalDia: Math.round(kcalManual),
        }
      : estrategiaEnergetica;
  return calcularDistribuicaoMetasRefeicoes({
    estrategiaEnergetica: estrategiaParaDistribuicao,
    proteinaDiariaG: plano.protDia_g,
    numeroRefeicoesDia: anamnese?.numeroRefeicoesDia ?? '4-5',
    horarioTrabalho: anamnese?.horarioTrabalho ?? 'diurno',
    fomeMatinal: anamnese?.fomeMatinal ?? 5,
    fomeNoturna: anamnese?.fomeNoturna ?? 5,
    pulaCafeManha: anamnese?.pulaCafeManha ?? false,
    chegaComMuitaFomeJantar: anamnese?.chegaComMuitaFomeJantar ?? false,
    compulsaoNoturna: anamnese?.compulsaoNoturna ?? false,
    sintomasGI: anamnese?.sintomasGI ?? 'nenhum',
    atividadeFisica: anamnese?.atividadeFisica ?? 'nunca',
    objetivoPrincipal: anamnese?.objetivoPrincipal ?? 'perda_peso',
  });
}

/**
 * Gera configuração de builder por refeição com itens disponíveis e limites
 */
const gerarConfiguracaoBuilderPorRefeicao = (
  plano: PlanoNutricional,
  restricoes: string[] = [],
  preferenciasProteina: string[] = [],
  distribuicaoNova?: DistribuicaoMetasRefeicoes | null
): Record<RefeicaoKey, ConfiguracaoRefeicao> => {
  const metasCafe = obterMetasMontagemRefeicao('cafe', distribuicaoNova, plano);
  const metasAlmoco = obterMetasMontagemRefeicao('almoco', distribuicaoNova, plano);
  const metasJantar = obterMetasMontagemRefeicao('jantar', distribuicaoNova, plano);
  const metasLanche1 = obterMetasMontagemRefeicao('lanche1', distribuicaoNova, plano);
  const metasLanche2 = obterMetasMontagemRefeicao('lanche2', distribuicaoNova, plano);
  const protCafe = metasCafe.proteinaAlvoG;
  const protAlmoco = metasAlmoco.proteinaAlvoG;
  const protJantar = metasJantar.proteinaAlvoG;
  const protLanche = metasLanche1.proteinaAlvoG;

  // Catálogo V2 (ETAPA 11) — filtrado por restrições via atributos

  const filtrados = filtrarCatalogoOpcao01PorRestricoes(

    CATALOGO_OPCAO_01_ATUAL,

    restricoes

  ) as ItemCatalogoOpcao01[];

  const toItemRefeicao = (i: ItemCatalogoOpcao01): ItemRefeicao => {
    return viewItemRefeicao({
      id: i.id,
      nome: i.nome,
      categoria: i.categoria as CategoriaItemRefeicao,
      proteina_g: i.proteina_g,
      calorias_kcal: i.calorias_kcal,
      descricao: i.descricao,
      carboidrato_g: i.carboidrato_g,
      gordura_g: i.gordura_g,
    });
  };

  const normalizarItemRefeicao = (item: ItemRefeicao): ItemRefeicao => viewItemRefeicao(item);



  const proteinas = filtrados.filter((i) => i.categoria === 'proteina').map(toItemRefeicao);

  const carboidratos = filtrados.filter((i) => i.categoria === 'carboidrato').map(toItemRefeicao);

  const legumesSalada = filtrados

    .filter((i) => i.categoria === 'legumes_salada')

    .map(toItemRefeicao);

  const gordurasBoas = filtrados.filter((i) => i.categoria === 'gordura_boa').map(toItemRefeicao);

  const extras = filtrados.filter((i) => i.categoria === 'extra').map(toItemRefeicao);



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

  const lixo = lixoBase.map(normalizarItemRefeicao);



  const proteinaLanche = proteinas.filter(

    (p) =>

      p.id.includes('whey') ||

      p.id.includes('iogurte') ||

      p.id.includes('ovos') ||

      p.id.includes('claras') ||

      p.id.includes('proteina_vegetal') ||

      p.id.includes('cottage')

  );



  const config: Record<RefeicaoKey, ConfiguracaoRefeicao> = {

    cafe: {

      refeicaoKey: 'cafe',

      itensDisponiveis: [

        ...proteinas.filter((p) => !p.id.includes('feijao') && !p.id.includes('lentilha') && !p.id.includes('grao_bico')),

        ...carboidratos,

        ...legumesSalada,

        ...gordurasBoas,

        ...extras,

        ...lixo,

      ],

      maxProteinas: 1,

      maxCarboidratos: 1,

      maxLegumesSalada: 1,

      maxGordurasBoas: 1,

      maxExtras: 1,

      maxLixo: 3,

      metaProteina_g: protCafe,

      metaCalorias_kcal: metasCafe.caloriasAlvoKcal,

    },

    lanche1: {

      refeicaoKey: 'lanche1',

      itensDisponiveis: [...proteinaLanche, ...extras, ...gordurasBoas.filter((g) => g.id.includes('castanhas')), ...lixo],

      maxProteinas: 1,

      maxCarboidratos: 0,

      maxLegumesSalada: 0,

      maxGordurasBoas: 1,

      maxExtras: 1,

      maxLixo: 2,

      metaProteina_g: protLanche,

      metaCalorias_kcal: metasLanche1.caloriasAlvoKcal,

    },

    almoco: {

      refeicaoKey: 'almoco',

      itensDisponiveis: [

        ...proteinas,

        ...carboidratos,

        ...legumesSalada,

        ...gordurasBoas,

        ...lixo,

      ],

      maxProteinas: 1,

      maxCarboidratos: 2,

      maxLegumesSalada: 3,

      maxGordurasBoas: 1,

      maxExtras: 0,

      maxLixo: 3,

      metaProteina_g: protAlmoco,

      metaCalorias_kcal: metasAlmoco.caloriasAlvoKcal,

    },

    lanche2: {

      refeicaoKey: 'lanche2',

      itensDisponiveis: [...proteinaLanche, ...extras, ...gordurasBoas.filter((g) => g.id.includes('castanhas')), ...lixo],

      maxProteinas: 1,

      maxCarboidratos: 0,

      maxLegumesSalada: 0,

      maxGordurasBoas: 1,

      maxExtras: 1,

      maxLixo: 2,

      metaProteina_g: metasLanche2.proteinaAlvoG,

      metaCalorias_kcal: metasLanche2.caloriasAlvoKcal,

    },

    jantar: {

      refeicaoKey: 'jantar',

      itensDisponiveis: [

        ...proteinas,

        ...carboidratos,

        ...legumesSalada,

        ...gordurasBoas,

        ...lixo,

      ],

      maxProteinas: 1,

      maxCarboidratos: 1,

      maxLegumesSalada: 3,

      maxGordurasBoas: 1,

      maxExtras: 0,

      maxLixo: 3,

      metaProteina_g: protJantar,

      metaCalorias_kcal: metasJantar.caloriasAlvoKcal,

    }

  };



  (Object.keys(config) as RefeicaoKey[]).forEach((key) => {
    config[key] = {
      ...config[key],
      itensDisponiveis: config[key].itensDisponiveis.map(normalizarItemRefeicao),
    };
  });

  return config;
};

type FamiliaProteina =
  | 'frango'
  | 'peixe'
  | 'ovos'
  | 'whey'
  | 'tofu'
  | 'carne'
  | 'iogurte'
  | 'laticinios'
  | 'outro';

/** Família da proteína do catálogo do builder (para preferências / ordem padrão). */
function familiaProteinaItem(item: ItemRefeicao): FamiliaProteina {
  const n = `${item.id} ${item.nome}`.toLowerCase();
  if (n.includes('frango') || n.includes('peru')) return 'frango';
  if (n.includes('peixe')) return 'peixe';
  if (n.includes('ovos') || n.includes('claras')) return 'ovos';
  if (n.includes('whey')) return 'whey';
  if (n.includes('tofu')) return 'tofu';
  if (n.includes('carne') || n.includes('patinho')) return 'carne';
  if (n.includes('iogurte')) return 'iogurte';
  if (n.includes('cottage') || n.includes('queijo')) return 'laticinios';
  return 'outro';
}

function ordemFamiliasProteina(preferencias: string[]): FamiliaProteina[] {
  const padrao: FamiliaProteina[] = [
    'frango',
    'peixe',
    'ovos',
    'whey',
    'tofu',
    'carne',
    'iogurte',
    'laticinios',
  ];
  if (!preferencias.length) return padrao;
  const mapeadas: FamiliaProteina[] = [];
  for (const p of preferencias) {
    const pl = p.toLowerCase();
    let fam: FamiliaProteina | null = null;
    if (pl.includes('frango')) fam = 'frango';
    else if (pl.includes('peixe')) fam = 'peixe';
    else if (pl.includes('ovos')) fam = 'ovos';
    else if (pl.includes('carne')) fam = 'carne';
    else if (pl.includes('latic')) fam = 'iogurte';
    else if (pl.includes('legumin')) fam = 'tofu';
    if (fam && !mapeadas.includes(fam)) mapeadas.push(fam);
  }
  return [...mapeadas, ...padrao.filter((f) => !mapeadas.includes(f))];
}

/**
 * Monta a Opção 01 como prato com itens reais do builder,
 * dimensionado pela meta de proteína da refeição (±10%).
 * TACO não entra aqui — só ajuste manual no Editar.
 */
function montarPratoPadraoRefeicao(
  refeicaoKey: RefeicaoKey,
  plano: PlanoNutricional,
  restricoes: string[] = [],
  preferencias: string[] = []
): OpcaoRefeicao {
  const config = gerarConfiguracaoBuilderPorRefeicao(plano, restricoes, preferencias)[refeicaoKey];
  const valores = calcularValoresSugeridos(refeicaoKey, plano);
  const metaProt = Math.max(1, valores.proteinaSugerida_g);
  const metaKcal = Math.max(100, valores.caloriasSugerida_kcal);
  const tolerancia = metaProt * 0.1;

  const itens = config.itensDisponiveis;
  const proteinas = itens.filter((i) => i.categoria === 'proteina');
  const carbs = itens.filter((i) => i.categoria === 'carboidrato');
  const legumes = itens.filter((i) => i.categoria === 'legumes_salada');
  const gorduras = itens.filter((i) => i.categoria === 'gordura_boa');
  const extras = itens.filter((i) => i.categoria === 'extra');

  const selecionados: ItemRefeicao[] = [];
  const somaProt = () => selecionados.reduce((a, i) => a + i.proteina_g, 0);
  const somaKcal = () => selecionados.reduce((a, i) => a + i.calorias_kcal, 0);
  const jaTem = (id: string) => selecionados.some((s) => s.id === id);

  const familias = ordemFamiliasProteina(preferencias);
  let proteinaEscolhida: ItemRefeicao | null = null;
  for (const fam of familias) {
    const variants = proteinas.filter((p) => familiaProteinaItem(p) === fam);
    if (!variants.length) continue;
    variants.sort((a, b) => {
      const overA = a.proteina_g > metaProt * 1.2 ? 1 : 0;
      const overB = b.proteina_g > metaProt * 1.2 ? 1 : 0;
      if (overA !== overB) return overA - overB;
      return Math.abs(a.proteina_g - metaProt) - Math.abs(b.proteina_g - metaProt);
    });
    proteinaEscolhida = variants[0];
    break;
  }
  if (!proteinaEscolhida && proteinas.length > 0) {
    proteinaEscolhida = [...proteinas].sort(
      (a, b) => Math.abs(a.proteina_g - metaProt) - Math.abs(b.proteina_g - metaProt)
    )[0];
  }
  if (proteinaEscolhida) {
    selecionados.push(proteinaEscolhida);
    // Escalar porção da mesma família (ex.: 100g → 150g) se ainda abaixo da meta
    if (somaProt() < metaProt - tolerancia) {
      const fam = familiaProteinaItem(proteinaEscolhida);
      const maiores = proteinas
        .filter((p) => familiaProteinaItem(p) === fam && p.proteina_g > proteinaEscolhida!.proteina_g)
        .sort((a, b) => Math.abs(a.proteina_g - metaProt) - Math.abs(b.proteina_g - metaProt));
      if (maiores.length > 0) {
        selecionados[0] = maiores[0];
      }
    }
  }

  // Completar proteína com whey/iogurte/claras se ainda faltar (±10%)
  if (somaProt() < metaProt - tolerancia) {
    const complementos = [
      proteinas.find((p) => p.id.includes('whey')),
      proteinas.find((p) => p.id.includes('iogurte')),
      extras.find((e) => e.id.includes('iogurte')),
      proteinas.find((p) => p.id.includes('claras')),
      proteinas.find((p) => p.id.includes('ovos_2')),
    ].filter((x): x is ItemRefeicao => Boolean(x) && !jaTem(x!.id));

    for (const add of complementos) {
      if (somaProt() >= metaProt - tolerancia) break;
      if (somaKcal() + add.calorias_kcal > metaKcal * 1.3) continue;
      selecionados.push(add);
    }
  }

  const isLanche = refeicaoKey === 'lanche1' || refeicaoKey === 'lanche2';

  // Carboidrato (café / almoço / janta)
  if (['cafe', 'almoco', 'jantar'].includes(refeicaoKey) && carbs.length > 0) {
    let carb: ItemRefeicao | undefined;
    if (refeicaoKey === 'cafe') {
      carb = carbs.find((c) => c.id.includes('pao')) || carbs.find((c) => c.id.includes('batata')) || carbs[0];
    } else if (plano.estilo === 'low_carb_moderada') {
      carb =
        carbs.find((c) => c.id.includes('batata_doce')) ||
        carbs.find((c) => c.id.includes('quinoa')) ||
        carbs[0];
    } else {
      carb =
        carbs.find((c) => c.id.includes('arroz_integral')) ||
        carbs.find((c) => c.id.includes('arroz')) ||
        carbs[0];
    }
    if (carb && !jaTem(carb.id) && somaKcal() + carb.calorias_kcal <= metaKcal * 1.25) {
      selecionados.push(carb);
    }
  }

  // Legumes / salada (almoço / janta)
  if ((refeicaoKey === 'almoco' || refeicaoKey === 'jantar') && legumes.length > 0) {
    const leg = legumes.find((l) => l.id.includes('salada_grande')) || legumes[0];
    if (leg && !jaTem(leg.id) && somaKcal() + leg.calorias_kcal <= metaKcal * 1.3) {
      selecionados.push(leg);
    }
  }

  // Gordura boa leve se couber na meta calórica
  if (['cafe', 'almoco', 'jantar'].includes(refeicaoKey) && gorduras.length > 0) {
    const gord = gorduras.find((g) => g.id.includes('azeite')) || gorduras[0];
    if (gord && !jaTem(gord.id) && somaKcal() + gord.calorias_kcal <= metaKcal * 1.15) {
      selecionados.push(gord);
    }
  }

  // Extra: fruta no café / lanches
  if ((refeicaoKey === 'cafe' || isLanche) && extras.length > 0) {
    const fruta = extras.find((e) => e.id.includes('fruta'));
    if (fruta && !jaTem(fruta.id) && somaKcal() + fruta.calorias_kcal <= metaKcal * 1.2) {
      selecionados.push(fruta);
    }
  }

  // Fallback mínimo se catálogo veio vazio por restrições
  if (selecionados.length === 0 && itens.length > 0) {
    const qualquerProt = itens.find((i) => i.categoria === 'proteina') || itens[0];
    selecionados.push(qualquerProt);
  }

  const protTotal = Math.round(somaProt());
  const kcalTotal = Math.round(somaKcal());
  const nomes = selecionados.map((i) => i.nome);

  return {
    id: slotOpcaoId(refeicaoKey, 1),
    titulo: 'Opção 01',
    descricao: nomes.join(' + '),
    proteina_g: protTotal,
    calorias_kcal: kcalTotal,
    itensSelecionados: selecionados.map((i) => i.id),
  };
}

/** Opção 01 sem prato montado (sem itensSelecionados) → gerar padrão uma vez. */
function slotOpcao01PrecisaPratoPadrao(opcao: OpcaoRefeicao | null | undefined): boolean {
  if (!opcao) return true;
  return !(opcao.itensSelecionados && opcao.itensSelecionados.length > 0);
}

/**
 * Monta Opção 01: V2 com metas da distribuição nova, ou legado com metas fixas.
 * Preferir `montarTodasOpcoes01DoDia` na geração completa (variedade diária).
 */
function montarOpcao01ComMotor(
  refeicaoKey: RefeicaoKey,
  plano: PlanoNutricional,
  restricoes: string[],
  preferencias: string[],
  distribuicaoNova?: DistribuicaoMetasRefeicoes | null,
  sintomasGI: string = 'nenhum',
  contextoProteico?: import('@/lib/nutri/montagemPratoPadrao').ContextoProteicoRefeicao,
  distribuicaoProteicaDia?: import('@/lib/nutri/distribuicaoProteinasDia').DistribuicaoProteinasDia
): { opcao: OpcaoRefeicao; resultadoV2: ResultadoMontagemPratoAutomatico | null } {
  const metas = obterMetasMontagemRefeicao(refeicaoKey, distribuicaoNova, plano);
  const cafeReduzido = Boolean(
    distribuicaoNova?.ajustesAplicados?.includes('CAFE_REDUZIDO_POR_BAIXA_ADESAO_MATINAL')
  );

  if (metas.origem === 'distribuicao_nova') {
    const config = gerarConfiguracaoBuilderPorRefeicao(
      plano,
      restricoes,
      preferencias,
      distribuicaoNova
    )[refeicaoKey];
    const resultadoV2 = montarPratoPadraoRefeicaoV2({
      refeicao: refeicaoKey,
      metaProteinaG: metas.proteinaAlvoG,
      metaCaloriasKcal: metas.caloriasAlvoKcal,
      origemMetas: 'distribuicao_nova',
      estilo: plano.estilo,
      sintomasGI,
      restricoes,
      preferenciasProteina: preferencias,
      itensDisponiveis: config.itensDisponiveis,
      ajustesDistribuicao: distribuicaoNova?.ajustesAplicados || [],
      slotId: slotOpcaoId(refeicaoKey, 1),
      cafeReduzido: cafeReduzido && refeicaoKey === 'cafe',
      contextoProteico,
      distribuicaoProteicaDia,
    });
    if (resultadoV2.opcao) {
      const opcaoBase: OpcaoRefeicao = {
          id: slotOpcaoId(refeicaoKey, 1),
          titulo: 'Opção 01',
          descricao: resultadoV2.opcao.descricao || '',
          proteina_g: resultadoV2.opcao.proteina_g || 0,
          calorias_kcal: resultadoV2.opcao.calorias_kcal || 0,
          itensSelecionados: resultadoV2.opcao.itensSelecionados,
          origem: 'automatica',
          geracaoAutomatica: resultadoV2.opcao.geracaoAutomatica,
        };
      return {
        opcao: anexarItensDetalheOpcao(opcaoBase, config.itensDisponiveis),
        resultadoV2,
      };
    }
  }

  const legado = montarPratoPadraoRefeicao(refeicaoKey, plano, restricoes, preferencias);
  const configLegado = gerarConfiguracaoBuilderPorRefeicao(
    plano,
    restricoes,
    preferencias,
    distribuicaoNova
  )[refeicaoKey];
  return {
    opcao: anexarItensDetalheOpcao(
      {
        ...legado,
        origem: 'automatica',
        geracaoAutomatica: {
          versao: 1,
          geradaEm: new Date().toISOString(),
          metaCaloriasKcal: metas.caloriasAlvoKcal,
          metaProteinaG: metas.proteinaAlvoG,
          origemMetas: metas.origem,
          ajustesDistribuicao: distribuicaoNova?.ajustesAplicados || [],
        },
      },
      configLegado.itensDisponiveis
    ),
    resultadoV2: null,
  };
}

/** Gera as 5 Opções 01 com distribuição proteica diária (evita ovo em todas). */
function montarTodasOpcoes01DoDia(
  plano: PlanoNutricional,
  restricoes: string[],
  preferencias: string[],
  distribuicaoNova: DistribuicaoMetasRefeicoes | null | undefined,
  sintomasGI: string = 'nenhum'
): Record<RefeicaoKey, OpcaoRefeicao> {
  const cafeReduzido = Boolean(
    distribuicaoNova?.ajustesAplicados?.includes('CAFE_REDUZIDO_POR_BAIXA_ADESAO_MATINAL')
  );
  const configs = gerarConfiguracaoBuilderPorRefeicao(
    plano,
    restricoes,
    preferencias,
    distribuicaoNova
  );
  const metasPorRefeicao = {} as Record<
    RefeicaoKey,
    { proteinaAlvoG: number; caloriasAlvoKcal: number; origemMetas: 'distribuicao_nova' | 'legado' }
  >;
  const itensPorRefeicao = {} as Record<RefeicaoKey, import('@/lib/nutri/montagemPratoPadrao').ItemCatalogoMontagem[]>;
  (['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'] as RefeicaoKey[]).forEach((key) => {
    const m = obterMetasMontagemRefeicao(key, distribuicaoNova, plano);
    metasPorRefeicao[key] = {
      proteinaAlvoG: m.proteinaAlvoG,
      caloriasAlvoKcal: m.caloriasAlvoKcal,
      origemMetas: m.origem,
    };
    itensPorRefeicao[key] = configs[key].itensDisponiveis;
  });

  const dia = montarOpcao01DiaCompleto({
    estilo: plano.estilo,
    sintomasGI,
    restricoes,
    preferenciasProteina: preferencias,
    metasPorRefeicao,
    itensPorRefeicao,
    ajustesDistribuicao: distribuicaoNova?.ajustesAplicados || [],
    cafeReduzido,
  });

  const out = {} as Record<RefeicaoKey, OpcaoRefeicao>;
  (['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'] as RefeicaoKey[]).forEach((key) => {
    const r = dia.porRefeicao[key];
    if (r.opcao) {
      out[key] = anexarItensDetalheOpcao(
        {
          id: slotOpcaoId(key, 1),
          titulo: 'Opção 01',
          descricao: r.opcao.descricao || '',
          proteina_g: r.opcao.proteina_g || 0,
          calorias_kcal: r.opcao.calorias_kcal || 0,
          itensSelecionados: r.opcao.itensSelecionados,
          origem: 'automatica',
          geracaoAutomatica: r.opcao.geracaoAutomatica,
        },
        configs[key].itensDisponiveis
      );
    } else {
      out[key] = montarOpcao01ComMotor(
        key,
        plano,
        restricoes,
        preferencias,
        distribuicaoNova,
        sintomasGI
      ).opcao;
    }
  });
  return out;
}


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
  const filtradas: Record<RefeicaoKey, OpcaoRefeicao[]> = {
    cafe: ordenarPorPreferencias(filtrarOpcoes(opcoesFinais.cafe)),
    lanche1: ordenarPorPreferencias(filtrarOpcoes(opcoesFinais.lanche1)),
    almoco: ordenarPorPreferencias(filtrarOpcoes(opcoesFinais.almoco)),
    lanche2: ordenarPorPreferencias(filtrarOpcoes(opcoesFinais.lanche2)),
    jantar: ordenarPorPreferencias(filtrarOpcoes(opcoesFinais.jantar)),
  };

  // Fallbacks vegetais/ovo-lácteos para não deixar refeição sem opção após filtros
  const fallbacksProteicos: Record<RefeicaoKey, OpcaoRefeicao[]> = {
    cafe: [
      {
        id: 'cafe_fallback_ovos_aveia',
        titulo: 'Ovos + aveia',
        descricao: `2 ovos mexidos + 3 colheres de aveia + frutas. Total estimado ~${protCafe}g proteína.`,
        proteina_g: protCafe,
        calorias_kcal: 380,
      },
    ],
    lanche1: [
      {
        id: 'lanche1_fallback_iogurte',
        titulo: 'Iogurte proteico',
        descricao: `1 pote de iogurte natural/proteico (~${protLanche}g proteína).`,
        proteina_g: protLanche,
        calorias_kcal: 160,
      },
    ],
    almoco: [
      {
        id: 'almoco_fallback_ovos_leguminosas',
        titulo: 'Omelete + leguminosas + salada',
        descricao: `Omelete com 2 ovos + 2 claras + leguminosas (lentilha/feijão/grão-de-bico) + salada grande. Total ~${protAlmoco}g proteína.`,
        proteina_g: protAlmoco,
        calorias_kcal: 520,
      },
      {
        id: 'almoco_fallback_tofu_legumes',
        titulo: 'Tofu grelhado + legumes + arroz',
        descricao: `Tofu grelhado + legumes variados + 2 colheres de arroz. Total ~${protAlmoco}g proteína.`,
        proteina_g: protAlmoco,
        calorias_kcal: 480,
      },
    ],
    lanche2: [
      {
        id: 'lanche2_fallback_ovos',
        titulo: 'Ovos + legumes',
        descricao: `2 ovos cozidos + legumes crus (~${protLanche}g proteína).`,
        proteina_g: protLanche,
        calorias_kcal: 210,
      },
    ],
    jantar: [
      {
        id: 'jantar_fallback_omelete',
        titulo: 'Omelete com legumes',
        descricao: `Omelete com 2 ovos + 2 claras + legumes. Total ~${protJantar}g proteína.`,
        proteina_g: protJantar,
        calorias_kcal: 400,
      },
      {
        id: 'jantar_fallback_tofu_sopa',
        titulo: 'Sopa de legumes + tofu',
        descricao: `Sopa de legumes com tofu (~${Math.round(protJantar * 0.85)}g proteína).`,
        proteina_g: Math.round(protJantar * 0.85),
        calorias_kcal: 360,
      },
    ],
  };

  (Object.keys(filtradas) as RefeicaoKey[]).forEach((key) => {
    if (filtradas[key].length === 0) {
      filtradas[key] = ordenarPorPreferencias(filtrarOpcoes(fallbacksProteicos[key]));
      // Se filtro vegano removeu tudo de novo, usar tofu sem ovos/iogurte
      if (filtradas[key].length === 0) {
        filtradas[key] = [
          {
            id: `${key}_fallback_planta`,
            titulo: 'Prato à base de plantas',
            descricao: `Tofu/leguminosas + legumes + carboidrato leve. Meta ~${
              key === 'almoco' || key === 'jantar'
                ? key === 'almoco'
                  ? protAlmoco
                  : protJantar
                : key === 'cafe'
                  ? protCafe
                  : protLanche
            }g proteína.`,
            proteina_g:
              key === 'almoco'
                ? protAlmoco
                : key === 'jantar'
                  ? protJantar
                  : key === 'cafe'
                    ? protCafe
                    : protLanche,
            calorias_kcal: key === 'almoco' || key === 'jantar' ? 480 : 200,
          },
        ];
      }
    }
  });

  return filtradas;
};

/** Mesma lógica da tabela da aba Cardápio, por opção salva — usada na impressão PDF. */
function montarResumoOpcaoSalvaParaImpressao(
  refeicaoKey: RefeicaoKey,
  opcaoSlot: OpcaoRefeicao,
  plano: PlanoNutricional,
  configuracaoPorRefeicao: Record<RefeicaoKey, ConfiguracaoRefeicao>,
  itensCustomizadosPorRefeicao: Record<RefeicaoKey, ItemRefeicao[]>
): { tituloOpcao: string; linhas: LinhaResumoOpcaoCardapio[]; observacao: string } {
  const itensDisponiveisBaseCardapio =
    configuracaoPorRefeicao[refeicaoKey]?.itensDisponiveis || [];
  const itensCustomResumoCardapio =
    itensCustomizadosPorRefeicao[refeicaoKey] ||
    plano.itensCustomizadosPorRefeicao?.[refeicaoKey] ||
    [];
  const customPorId = new Map(
    itensCustomResumoCardapio.map((item) => [item.id, viewItemRefeicao(item)])
  );
  const itensDisponiveisRefeicaoAtiva = [
    ...itensDisponiveisBaseCardapio.map(
      (item) => customPorId.get(item.id) || viewItemRefeicao(item)
    ),
    ...itensCustomResumoCardapio
      .filter((item) => !itensDisponiveisBaseCardapio.some((base) => base.id === item.id))
      .map((item) => viewItemRefeicao(item)),
  ];
  const opcaoComDetalhe =
    opcaoSlot &&
    !opcaoSlot.itensDetalhe?.length &&
    opcaoSlot.itensSelecionados?.length
      ? anexarItensDetalheOpcao(opcaoSlot, itensDisponiveisRefeicaoAtiva)
      : opcaoSlot;
  const descricaoRefeicaoAtiva = opcaoComDetalhe?.descricao || '';
  const linhas = montarLinhasResumoOpcao(
    opcaoComDetalhe,
    itensDisponiveisRefeicaoAtiva,
    descricaoRefeicaoAtiva
  ).map(({ descricao, proteinaItem, carboidratoItem, caloriasItem }) => ({
    descricao,
    proteinaItem,
    carboidratoItem,
    caloriasItem,
  }));
  return {
    tituloOpcao: opcaoComDetalhe?.titulo || 'Opção padrão',
    linhas,
    observacao: observacaoDaOpcao(opcaoComDetalhe),
  };
}

function montarCardapioPdfContext(
  plano: PlanoNutricional,
  _opcoesRefeicoes: Record<RefeicaoKey, OpcaoRefeicao[]>,
  itensCustomizadosPorRefeicao: Record<RefeicaoKey, ItemRefeicao[]>,
  paciente: PacienteCompleto,
  profissionais?: { medicoNome?: string; nutricionistaNome?: string }
): CardapioPdfContext {
  void _opcoesRefeicoes;
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
    const slotsSalvos = coletarSlotsPreenchidosParaImpressao(plano.opcoesSlots?.[key], key);
    const slotsParaImprimir: OpcaoRefeicao[] =
      slotsSalvos.length > 0
        ? (slotsSalvos as OpcaoRefeicao[])
        : plano.modeloDia[key]
          ? [
              {
                id: slotOpcaoId(key, 1),
                titulo: 'Opção 01',
                descricao: plano.modeloDia[key],
                proteina_g: 0,
                calorias_kcal: 0,
              },
            ]
          : [];
    const opcoesPdf = slotsParaImprimir.map((slot) => {
      const r = montarResumoOpcaoSalvaParaImpressao(
        key,
        slot,
        plano,
        config,
        itensCustomizadosPorRefeicao
      );
      const mealImage = parseMealImageRecord(slot.mealImage);
      const currentSourceHash = buildMealImageSourceHash(slot);
      const slotId = typeof slot.id === 'string' ? slot.id.trim() : '';
      const mealImageRef =
        paciente.id &&
        slotId &&
        shouldFetchMealDishImageUrl({ mealImage, currentSourceHash })
          ? {
              patientId: paciente.id,
              refeicaoKey: key,
              slotId,
              sourceHash: currentSourceHash,
              ...(mealImage?.gcsPath ? { gcsPath: mealImage.gcsPath } : {}),
              ...(mealImage?.generatedAt ? { generatedAt: mealImage.generatedAt } : {}),
            }
          : undefined;
      return {
        tituloOpcao: r.tituloOpcao,
        itens: r.linhas.map((l) => ({
          descricao: l.descricao,
          proteinaG: l.proteinaItem,
          ...(typeof l.carboidratoItem === 'number' ? { carboidratoG: l.carboidratoItem } : {}),
          kcal: l.caloriasItem,
        })),
        ...(r.observacao ? { observacao: r.observacao } : {}),
        ...(mealImageRef ? { mealImageRef } : {}),
      };
    });
    const primeira = opcoesPdf[0];
    return {
      nomeRefeicao: nomePorRefeicao[key],
      tituloOpcao: primeira?.tituloOpcao || 'Opção padrão',
      itens: primeira?.itens || [],
      ...(primeira?.observacao ? { observacao: primeira.observacao } : {}),
      opcoes: opcoesPdf,
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
  const medicoNome = profissionais?.medicoNome?.trim();
  const nutricionistaNome = profissionais?.nutricionistaNome?.trim();
  return {
    pacienteNome,
    pacienteCpf,
    dataImpressao: new Date().toLocaleDateString('pt-BR'),
    ...(medicoNome ? { medicoNome } : {}),
    ...(nutricionistaNome ? { nutricionistaNome } : {}),
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

function NutrologiaPastasAside({
  open,
  onToggle,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <>
      {open ? (
        <div
          className="absolute inset-0 z-10 bg-black/20 hidden lg:block xl:hidden"
          aria-hidden="true"
          onClick={onToggle}
        />
      ) : null}
      <aside
        data-nc-pastas-open={open ? '' : undefined}
        className="nc-pastas hidden lg:flex w-16 xl:w-56 flex-shrink-0 flex-col border-r border-gray-200 bg-white relative z-20"
      >
        <div className="nc-pastas-top flex items-center justify-center h-12 px-2 border-b border-gray-200 xl:hidden">
          <button
            type="button"
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
            onClick={onToggle}
            aria-label={open ? 'Fechar seções' : 'Abrir seções'}
            title="Seções"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <nav
          className="nc-pastas-nav flex-1 py-2 xl:py-3 px-2 xl:px-2.5 space-y-1 overflow-y-auto"
          aria-label="Seções Nutrologia"
        >
          {children}
        </nav>
      </aside>
    </>
  );
}

export default function NutriContent({
  paciente,
  setPaciente,
  modoNutricionista = false,
  embedded = false,
  onlyChatNutri = false,
  somenteVisualizacao = false,
  habilitarPlanosTemplates = false,
  chatNutriDataSelecionada,
  onChatNutriDataChange,
  chatNutriAuthorKind,
  chatNutriAuthorName,
  chatNutriAuthorId,
  initialTab,
  initialHistoricoWeekKey,
}: NutriContentProps) {
  /** Edição de plano/cardápio/metas — bloqueada em somenteVisualizacao (ex.: MetaPersonal). */
  const podeEditarNutri = Boolean(modoNutricionista && !somenteVisualizacao);
  /** Paciente no /meta (e nutri/médico): pode montar opções próprias e trocar a Atual. */
  const podeAlterarCardapio = !somenteVisualizacao;
  const weeklyViewerRole = resolveCheckInSemanalNutriViewerRole({
    chatNutriAuthorKind,
    modoNutricionista,
    somenteVisualizacao,
  });
  const weeklyCaps = getCheckInSemanalNutriCapabilities(weeklyViewerRole);
  const weeklyActorForCheckIn =
    weeklyViewerRole === 'nutritionist'
      ? 'nutritionist'
      : weeklyViewerRole === 'doctor'
        ? 'doctor'
        : 'patient';
  const weeklyNutritionistId = resolveNutritionistIdForCheckIn({
    actor: weeklyActorForCheckIn,
    actorId: chatNutriAuthorId,
    nutricionistaVinculadoIds: paciente.nutricionistaVinculadoIds,
  });
  const mostrarCheckInDiario = CHECK_IN_DIARIO_NUTRI_ENABLED && podeEditarNutri;
  const mostrarCheckInSemanal = weeklyCaps.create;
  /** Quem escreve no ChatNutri: profissional no MetaNutri/MetaAdmin; paciente no /meta. */
  const resolvedChatNutriAuthorKind =
    chatNutriAuthorKind ?? (modoNutricionista ? 'nutritionist' : 'patient');
  const mealImageActorKind = resolveMealImageActorKind({
    chatNutriAuthorKind: resolvedChatNutriAuthorKind,
    modoNutricionista,
  });
  const isPatientViewer = isMealImagePatientViewer({
    modoNutricionista,
    somenteVisualizacao,
    chatNutriAuthorKind: resolvedChatNutriAuthorKind,
  });
  const chatNutriPanelAuthorProps = {
    authorKind: resolvedChatNutriAuthorKind,
    ...(chatNutriAuthorName?.trim() ? { authorName: chatNutriAuthorName.trim() } : {}),
    ...(chatNutriAuthorId?.trim() ? { authorId: chatNutriAuthorId.trim() } : {}),
  } as const;
  const [view, setView] = useState<'loading' | 'wizard' | 'plano' | 'checkin' | 'checkinSemanal'>('loading');
  /** Questionário respondido sem cálculos do plano (anamnese já conta como preenchida). */
  const [anamneseSomente, setAnamneseSomente] = useState<AnamneseNutricionalSnapshot | null>(null);
  const [checkInSemanalWeekKey, setCheckInSemanalWeekKey] = useState<string | null>(null);
  const [checkInSemanalIntent, setCheckInSemanalIntent] = useState<CheckInSemanalNutriInteraction | undefined>();
  const [checkInSemanalPickerOpen, setCheckInSemanalPickerOpen] = useState(false);
  const [historicoWeekFocus, setHistoricoWeekFocus] = useState<string | null>(
    initialHistoricoWeekKey ?? null
  );
  const [tabletPastasOpen, setTabletPastasOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'plano' | 'cardapio' | 'planos' | 'historico' | 'chatnutri' | 'orientacoes'
  >(initialTab ?? 'plano');
  const [activePlanoFolder, setActivePlanoFolder] = useState<
    'plano_nutricional' | 'anamnese' | 'hipotese' | 'meta_proteinas' | 'meta_agua' | 'orientacoes'
  >('plano_nutricional');
  const [activeCardapioMeal, setActiveCardapioMeal] = useState<RefeicaoKey>('cafe');
  const [activeOpcaoSlot, setActiveOpcaoSlot] = useState<CardapioOpcaoSlot>(1);
  const [nomeOpcaoDraft, setNomeOpcaoDraft] = useState('');
  const [salvandoNomeOpcao, setSalvandoNomeOpcao] = useState(false);
  const [cardapioPrintModalOpen, setCardapioPrintModalOpen] = useState(false);
  const [generatingMealImages, setGeneratingMealImages] = useState<Record<string, boolean>>({});
  const generatingMealImagesRef = useRef<Record<string, boolean>>({});
  const pacienteIdRef = useRef(paciente.id);
  pacienteIdRef.current = paciente.id;
  const mealImagePriorityRef = useRef<{ refeicaoKey: RefeicaoKey; slotId: string }>({
    refeicaoKey: 'cafe',
    slotId: 'slot_cafe_1',
  });
  const [mealImageToast, setMealImageToast] = useState<string | null>(null);
  const [mealDishPreviewUrl, setMealDishPreviewUrl] = useState<string | null>(null);
  const [hasLinkedNutritionist, setHasLinkedNutritionist] = useState(() =>
    hasLinkedNutritionistFromIds(paciente.nutricionistaVinculadoIds)
  );
  const [pdfProfissionais, setPdfProfissionais] = useState<{
    medicoNome?: string;
    nutricionistaNome?: string;
  }>({});
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState<WizardData>({
    objetivoPrincipal: 'perda_peso',
    intensidadeDesejada: INTENSIDADE_DESEJADA_PADRAO,
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
  const planoRef = useRef<PlanoNutricional | null>(null);
  planoRef.current = plano;
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
  /** Evita que reload do plano / reinit do builder apague importação ou edição local. */
  const refeicaoEmEdicaoRef = useRef<RefeicaoKey | null>(null);
  const builderSelecaoDirtyRef = useRef(false);
  const builderContextKeyRef = useRef('');
  refeicaoEmEdicaoRef.current = refeicaoEmEdicao;
  
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
  const [addFoodMode, setAddFoodMode] = useState<AddFoodModeCardapio>('metanutri');
  const [showImportarPlanoModal, setShowImportarPlanoModal] = useState(false);
  /** Observação da refeição em edição (importada do Plano ou já salva no slot). */
  const [observacaoRefeicaoEmEdicao, setObservacaoRefeicaoEmEdicao] = useState('');
  const [porcaoEditandoBuilder, setPorcaoEditandoBuilder] = useState<PorcaoItemEditavel | null>(null);
  const [tacoQuery, setTacoQuery] = useState('');
  const [tacoResultados, setTacoResultados] = useState<TacoSearchItem[]>([]);
  const [loadingTaco, setLoadingTaco] = useState(false);
  const [tacoSelecionado, setTacoSelecionado] = useState<TacoSearchItem | null>(null);
  const [metaQuery, setMetaQuery] = useState('');
  const [metaResultados, setMetaResultados] = useState<MetaNutriFoodSearchResult[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [metaErro, setMetaErro] = useState<string | null>(null);
  const [metaSelecionado, setMetaSelecionado] = useState<MetaNutriFoodSearchResult | null>(null);
  const [metaPorcaoId, setMetaPorcaoId] = useState('');
  const [unidadeNovoItem, setUnidadeNovoItem] = useState('');
  const [pesoNovoItem, setPesoNovoItem] = useState<number>(100);
  const [manualNome, setManualNome] = useState('');
  const [manualPeso, setManualPeso] = useState(100);
  const [manualProt, setManualProt] = useState(0);
  const [manualKcal, setManualKcal] = useState(0);
  const [manualCarb, setManualCarb] = useState('');
  const [manualGord, setManualGord] = useState('');
  const [manualFibra, setManualFibra] = useState('');
  const [addItemErro, setAddItemErro] = useState<string | null>(null);

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

  // Paciente no /meta não tem a aba de escrever orientação.
  useEffect(() => {
    if (!modoNutricionista && activeTab === 'orientacoes') {
      setActiveTab('plano');
    }
  }, [activeTab, modoNutricionista]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (initialHistoricoWeekKey) {
      setHistoricoWeekFocus(initialHistoricoWeekKey);
    }
  }, [initialHistoricoWeekKey]);

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
      const contextKey = `${refeicaoEmEdicao}:${activeOpcaoSlot}`;
      const contextChanged = builderContextKeyRef.current !== contextKey;
      if (contextChanged) {
        builderContextKeyRef.current = contextKey;
        builderSelecaoDirtyRef.current = false;
      }

      const distribuicaoNovaBuilder = calcularDistribuicaoMetasDoPlano(paciente, plano);
      const configBase = gerarConfiguracaoBuilderPorRefeicao(
        plano,
        plano.restricoesPaciente || [],
        plano.preferenciasProteinaPaciente || [],
        distribuicaoNovaBuilder
      );
      const config = { ...configBase };
      const itensCustomDaRefeicao =
        itensCustomizadosPorRefeicao[refeicaoEmEdicao] ||
        plano.itensCustomizadosPorRefeicao?.[refeicaoEmEdicao] ||
        [];
      if (itensCustomDaRefeicao.length > 0) {
        const idsExistentes = new Set(config[refeicaoEmEdicao].itensDisponiveis.map((i) => i.id));
        const novosItens = itensCustomDaRefeicao
          .filter((item) => !idsExistentes.has(item.id))
          .map((item) => viewItemRefeicao(item));
        if (novosItens.length > 0) {
          config[refeicaoEmEdicao] = {
            ...config[refeicaoEmEdicao],
            itensDisponiveis: [...config[refeicaoEmEdicao].itensDisponiveis, ...novosItens],
          };
        }
      }

      // Após import/edição local: só sincroniza o catálogo, não zera a seleção.
      if (builderSelecaoDirtyRef.current && !contextChanged) {
        setConfiguracaoBuilder((prev) => {
          if (!prev) return config;
          return {
            ...prev,
            [refeicaoEmEdicao]: {
              ...prev[refeicaoEmEdicao],
              itensDisponiveis: config[refeicaoEmEdicao].itensDisponiveis,
              metaProteina_g: config[refeicaoEmEdicao].metaProteina_g,
              metaCalorias_kcal: config[refeicaoEmEdicao].metaCalorias_kcal,
            },
          };
        });
        return;
      }

      setConfiguracaoBuilder(config);
      
      // Resetar aba para proteína ao abrir modal
      setAbaBuilderAtiva('proteina');
      
      // Inicializar itens selecionados
      const configRefeicao = config[refeicaoEmEdicao];
      const itensIniciais: Record<string, boolean> = {};
      
      // Carregar itens do slot que está sendo visualizado/editado
      const slotEmEdicaoId = slotOpcaoId(refeicaoEmEdicao, activeOpcaoSlot);
      const slotsNormEdicao = normalizarSlotsRefeicao(plano.opcoesSlots?.[refeicaoEmEdicao]);
      const opcaoDoSlot =
        slotsNormEdicao?.find((o) => o.id === slotEmEdicaoId) ||
        opcoesRefeicoes[refeicaoEmEdicao]?.find((o) => o.id === slotEmEdicaoId) ||
        null;

      setObservacaoRefeicaoEmEdicao(observacaoDaOpcao(opcaoDoSlot));

      if (opcaoDoSlot?.itensSelecionados?.length) {
        opcaoDoSlot.itensSelecionados.forEach((itemId) => {
          const itemExiste = configRefeicao.itensDisponiveis.some((i) => i.id === itemId);
          if (itemExiste) {
            itensIniciais[itemId] = true;
          }
        });
      } else if (activeOpcaoSlot === 1) {
        // Compatibilidade: opção custom antiga só na Opção 01
        const opcaoSelecionadaId = plano.opcoesSelecionadas?.[refeicaoEmEdicao];
        if (opcaoSelecionadaId?.startsWith('custom_')) {
          const opcaoCustom = opcoesRefeicoes[refeicaoEmEdicao]?.find((o) => o.id === opcaoSelecionadaId);
          opcaoCustom?.itensSelecionados?.forEach((itemId) => {
            const itemExiste = configRefeicao.itensDisponiveis.some((i) => i.id === itemId);
            if (itemExiste) {
              itensIniciais[itemId] = true;
            }
          });
        }
      }

      // Opções 02–05 começam vazias. Opção 01 sem itens: sugerir prato padrão do sistema (ainda não persiste).
      if (Object.keys(itensIniciais).length === 0 && activeOpcaoSlot === 1) {
        const pratoPadrao = montarOpcao01ComMotor(
          refeicaoEmEdicao,
          plano,
          plano.restricoesPaciente || [],
          plano.preferenciasProteinaPaciente || [],
          distribuicaoNovaBuilder,
          plano.anamneseNutricional?.sintomasGI || 'nenhum'
        ).opcao;
        (pratoPadrao.itensSelecionados || []).forEach((itemId) => {
          if (configRefeicao.itensDisponiveis.some((i) => i.id === itemId)) {
            itensIniciais[itemId] = true;
          }
        });
      }
      
      setItensSelecionadosRefeicao(itensIniciais);
      
      // Calcular macros iniciais
      const macros = calcularMacrosRefeicao(configRefeicao, itensIniciais);
      setMacrosRefeicaoAtual(macros);
    } else {
      builderContextKeyRef.current = '';
      builderSelecaoDirtyRef.current = false;
      setItensSelecionadosRefeicao({});
      setMacrosRefeicaoAtual({ proteinaTotal_g: 0, caloriasTotal_kcal: 0 });
      setAbaBuilderAtiva('proteina');
      setObservacaoRefeicaoEmEdicao('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- itensCustomizadosPorRefeicao de propósito fora: import atualiza localmente
  }, [refeicaoEmEdicao, plano, activeOpcaoSlot, opcoesRefeicoes, paciente?.id]);
  // Não depender de itensCustomizadosPorRefeicao: TACO/import atualizam o builder localmente.
  // Se este effect reagir a customizações, ele apaga a seleção recém-importada.

  // Sincronizar nome editável da opção ao trocar refeição/slot
  useEffect(() => {
    if (!plano) return;
    const slotId = slotOpcaoId(activeCardapioMeal, activeOpcaoSlot);
    const slotsNormNome = normalizarSlotsRefeicao(plano.opcoesSlots?.[activeCardapioMeal]);
    const slot =
      slotsNormNome?.find((o) => o.id === slotId) || null;
    setNomeOpcaoDraft(rotuloOpcaoExibicao(slot, activeOpcaoSlot));
  }, [plano, activeCardapioMeal, activeOpcaoSlot]);

  useEffect(() => {
    setMealDishPreviewUrl(null);
  }, [activeCardapioMeal, activeOpcaoSlot, activeTab, paciente.id]);

  useEffect(() => {
    setHasLinkedNutritionist(hasLinkedNutritionistFromIds(paciente.nutricionistaVinculadoIds));
  }, [paciente.nutricionistaVinculadoIds]);

  useEffect(() => {
    if (onlyChatNutri || activeTab !== 'cardapio' || !paciente?.id) return;
    let cancelled = false;
    PacienteNutricionistaService.listActiveVinculosByPaciente(paciente.id).then((vinculos) => {
      if (!cancelled) setHasLinkedNutritionist(vinculos.length > 0);
    });
    return () => {
      cancelled = true;
    };
  }, [onlyChatNutri, activeTab, paciente?.id]);

  generatingMealImagesRef.current = generatingMealImages;
  mealImagePriorityRef.current = {
    refeicaoKey: activeCardapioMeal,
    slotId: slotOpcaoId(activeCardapioMeal, activeOpcaoSlot),
  };

  useEffect(() => {
    setGeneratingMealImages({});
  }, [paciente.id, activeTab]);

  const persistirSlotsParaImagemPrato = async (): Promise<Record<RefeicaoKey, OpcaoRefeicao[]> | null> => {
    const atual = planoRef.current;
    if (!atual || !paciente.id) return null;
    const hidratados = hidratarOpcoesSlotsParaImagemPrato(atual);
    if (!somenteVisualizacao) {
      try {
        await setDoc(
          doc(db, 'pacientes_completos', paciente.id, 'nutricao', 'plano'),
          { opcoesSlots: omitUndefinedDeep(hidratados) },
          { merge: true }
        );
      } catch (error) {
        console.error('[mealImage] não foi possível gravar o cardápio antes de gerar a imagem', error);
      }
    }
    setPlano((prev) => (prev ? { ...prev, opcoesSlots: hidratados } : prev));
    return hidratados;
  };

  useMealImageAutoGeneration({
    enabled: shouldRunMealImageAutoGeneration({
      hasLinkedNutritionist,
      activeTab,
      onlyChatNutri,
      patientId: paciente.id,
      hasPlano: Boolean(plano),
    }),
    patientId: paciente.id,
    opcoesSlots: plano?.opcoesSlots,
    priorityRef: mealImagePriorityRef,
    generatingRef: generatingMealImagesRef,
    setGeneratingMealImages,
    prepareSlots: persistirSlotsParaImagemPrato,
    applyMealImage: (refeicaoKey, slotId, mealImage) => {
      setPlano((prev) => {
        if (!prev) return prev;
        const key = refeicaoKey as RefeicaoKey;
        const slots = normalizarSlotsRefeicao(prev.opcoesSlots?.[key]);
        if (!slots) return prev;
        return {
          ...prev,
          opcoesSlots: {
            ...prev.opcoesSlots,
            [key]: patchSlotMealImage(slots, slotId, mealImage),
          },
        };
      });
    },
  });

  const mostrarToastImagemPrato = (mensagem: string) => {
    setMealImageToast(mensagem);
    window.setTimeout(() => setMealImageToast(null), 4000);
  };

  const gerarImagemDoPrato = async (params: {
    patientId: string;
    refeicaoKey: RefeicaoKey;
    slotId: string;
    forceRegenerate?: boolean;
  }) => {
    const boundPatientId = params.patientId;
    const slotKey = mealImageGenerationSlotKey(params.refeicaoKey, params.slotId);
    let already = false;
    setGeneratingMealImages((prev) => {
      if (prev[slotKey]) {
        already = true;
        return prev;
      }
      return { ...prev, [slotKey]: true };
    });
    if (already) return;
    const stillThisPatient = () =>
      shouldApplyMealImageClientUpdate({
        boundPatientId,
        currentPatientId: pacienteIdRef.current,
      });
    try {
      await persistirSlotsParaImagemPrato();
      if (!stillThisPatient()) return;
      const result = await requestMealImageGeneration(
        {
          patientId: boundPatientId,
          refeicaoKey: params.refeicaoKey,
          slotId: params.slotId,
          trigger: 'manual',
          ...(params.forceRegenerate ? { forceRegenerate: true } : {}),
        },
        { getToken: async () => (await auth.currentUser?.getIdToken()) || null }
      );
      if (!stillThisPatient()) return;
      setPlano((prev) => {
        if (!prev || !result.mealImage) return prev;
        const slots = normalizarSlotsRefeicao(prev.opcoesSlots?.[params.refeicaoKey]);
        if (!slots) return prev;
        if (params.forceRegenerate && !result.ok) {
          const previous = slots.find(
            (item) => item && typeof item === 'object' && String(item.id || '') === params.slotId
          );
          const previousImage = parseMealImageRecord(previous?.mealImage);
          const previousHash = buildMealImageSourceHash(previous);
          if (isMealImageReadyAndCurrent(previousImage, previousHash)) {
            return prev;
          }
        }
        return {
          ...prev,
          opcoesSlots: {
            ...prev.opcoesSlots,
            [params.refeicaoKey]: patchSlotMealImage(slots, params.slotId, result.mealImage),
          },
        };
      });
      if (!result.ok) {
        mostrarToastImagemPrato(
          params.forceRegenerate
            ? 'Não foi possível gerar uma nova imagem agora. Tente novamente.'
            : 'Não foi possível gerar a imagem agora. Tente novamente.'
        );
        return;
      }
      if (result.reason === 'source_changed_during_generation') {
        mostrarToastImagemPrato('O prato foi atualizado. Gere novamente a imagem.');
      }
    } catch {
      if (!stillThisPatient()) return;
      mostrarToastImagemPrato(
        params.forceRegenerate
          ? 'Não foi possível gerar uma nova imagem agora. Tente novamente.'
          : 'Não foi possível gerar a imagem agora. Tente novamente.'
      );
    } finally {
      if (!stillThisPatient()) return;
      setGeneratingMealImages((prev) => {
        if (!prev[slotKey]) return prev;
        const next = { ...prev };
        delete next[slotKey];
        return next;
      });
    }
  };

  useEffect(() => {
    if (onlyChatNutri) return;
    if (activeTab !== 'cardapio' && !cardapioPrintModalOpen) return;
    if (!paciente?.id) return;
    let cancelled = false;
    const loadProfissionaisPdf = async () => {
      try {
        const medicoId = String(paciente.medicoResponsavelId || '').trim();
        const [medico, vinculos] = await Promise.all([
          medicoId ? MedicoService.getMedicoById(medicoId) : Promise.resolve(null),
          PacienteNutricionistaService.listActiveVinculosByPaciente(paciente.id),
        ]);
        const nutriId = String(
          vinculos[0]?.nutricionistaId ||
            (paciente.nutricionistaVinculadoIds || []).find((id) => String(id || '').trim()) ||
            ''
        ).trim();
        const nutri = nutriId
          ? await NutricionistaService.getNutricionistaByUserId(nutriId)
          : null;
        if (cancelled) return;
        const medicoNome = medico?.nome?.trim();
        const nutricionistaNome = nutri?.nome?.trim();
        setPdfProfissionais({
          ...(medicoNome ? { medicoNome } : {}),
          ...(nutricionistaNome ? { nutricionistaNome } : {}),
        });
      } catch {
        if (!cancelled) setPdfProfissionais({});
      }
    };
    void loadProfissionaisPdf();
    return () => {
      cancelled = true;
    };
  }, [
    onlyChatNutri,
    activeTab,
    cardapioPrintModalOpen,
    paciente?.id,
    paciente?.medicoResponsavelId,
    paciente?.nutricionistaVinculadoIds,
  ]);

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
    if (!paciente?.id) return;

    let cancelled = false;

    const loadPlano = async () => {
      try {
        const planoRef = doc(db, 'pacientes_completos', paciente.id, 'nutricao', 'plano');
        const planoSnap = await getDoc(planoRef);
        if (cancelled) return;
        
        if (planoSnap.exists()) {
          const planoData = planoSnap.data();
          const planoIncompleto =
            Boolean(planoData?.anamnesePendenteGeracao) ||
            !planoTemCalculosNutricionais(planoData);
          const snapshotAnamnese = planoData?.anamneseNutricional as
            | AnamneseNutricionalSnapshot
            | undefined;
          const temAnamnese =
            planoTemAnamneseNutricional(planoData) && Boolean(snapshotAnamnese);

          if (planoIncompleto) {
            if (temAnamnese && snapshotAnamnese) {
              const wizardPendente = wizardFromAnamneseSnapshot(snapshotAnamnese);
              const gerado = montarCamposPlanoFromAnamnese(paciente, wizardPendente);
              if (planoTemCalculosNutricionais(gerado)) {
                if (!somenteVisualizacao) {
                  try {
                    await setDoc(
                      planoRef,
                      {
                        ...omitUndefinedDeep(gerado),
                        anamnesePendenteGeracao: deleteField(),
                        atualizadoEm: Timestamp.now(),
                      },
                      { merge: true }
                    );
                  } catch (err) {
                    console.warn('Não foi possível persistir o plano gerado da anamnese pendente', err);
                  }
                }
                Object.assign(planoData, gerado);
                delete planoData.anamnesePendenteGeracao;
                if (cancelled) return;
              } else {
                setWizardData(wizardPendente);
                setAnamneseSomente(snapshotAnamnese);
                setPlano(null);
                setActivePlanoFolder('anamnese');
                setView('plano');
                return;
              }
            } else {
              if (somenteVisualizacao) {
                setPlano(null);
                setAnamneseSomente(null);
                setView('plano');
              } else {
                setView('wizard');
              }
              return;
            }
          }

          setAnamneseSomente(null);

          const planoCarregado: PlanoNutricional = {
            ...planoData,
            criadoEm: planoData.criadoEm?.toDate() || new Date()
          } as PlanoNutricional;
          
          // Compatibilidade com planos antigos: se não tem opcoesSelecionadas, inicializar
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
            protLanche,
            planoCarregado.restricoesPaciente || [],
            planoCarregado.preferenciasProteinaPaciente || []
          );

          if (planoCarregado.opcoesCustomizadas) {
            const refeicoesKeys: RefeicaoKey[] = ['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'];
            refeicoesKeys.forEach((refeicaoKey) => {
              const customizadas = planoCarregado.opcoesCustomizadas![refeicaoKey];
              if (customizadas && customizadas.length > 0) {
                customizadas.forEach((opcaoCustom) => {
                  if (!opcoesDisponiveis[refeicaoKey].find((o) => o.id === opcaoCustom.id)) {
                    opcoesDisponiveis[refeicaoKey].push(opcaoCustom);
                  }
                });
              }
            });
          }

          if (!planoCarregado.opcoesSelecionadas) {
            planoCarregado.opcoesSelecionadas = {
              cafe: opcoesDisponiveis.cafe[0]?.id || '',
              lanche1: opcoesDisponiveis.lanche1[0]?.id || '',
              almoco: opcoesDisponiveis.almoco[0]?.id || '',
              lanche2: opcoesDisponiveis.lanche2[0]?.id || '',
              jantar: opcoesDisponiveis.jantar[0]?.id || '',
            };
            planoCarregado.modeloDia = gerarModeloDiaFromOpcoes(
              planoCarregado.opcoesSelecionadas,
              opcoesDisponiveis
            );
          }

          // 5 opções fixas por refeição; migra conteúdo atual para Opção 01 se necessário
          const opcoesSlots = garantirOpcoesSlotsPlano(planoCarregado, opcoesDisponiveis);
          planoCarregado.opcoesSlots = opcoesSlots;

          const restricoesPlano = planoCarregado.restricoesPaciente || [];
          const preferenciasPlano = planoCarregado.preferenciasProteinaPaciente || [];
          const distribuicaoNovaLoad = calcularDistribuicaoMetasDoPlano(paciente, planoCarregado);
          const sintomasGILoad = planoCarregado.anamneseNutricional?.sintomasGI || 'nenhum';

          const refeicoesKeysSync: RefeicaoKey[] = ['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'];
          refeicoesKeysSync.forEach((refeicaoKey) => {
            const selecionadaId = planoCarregado.opcoesSelecionadas![refeicaoKey] || '';
            const jaEhSlot = /^slot_/.test(selecionadaId);
            const slot1 = opcoesSlots[refeicaoKey][0];
            const opcaoAntiga = opcoesDisponiveis[refeicaoKey].find((o) => o.id === selecionadaId);

            // Migrar seleção antiga com itens reais para o slot 01 (não sobrescrever prato já montado)
            if (!jaEhSlot) {
              if (
                opcaoAntiga?.itensSelecionados?.length &&
                (slotOpcaoEstaVazio(slot1) || slotOpcao01PrecisaPratoPadrao(slot1))
              ) {
                opcoesSlots[refeicaoKey][0] = {
                  ...copiarConteudoOpcaoParaSlot(slot1, opcaoAntiga, 1),
                  id: slotOpcaoId(refeicaoKey, 1),
                  origem: opcaoAntiga.origem || 'manual',
                };
              }
              planoCarregado.opcoesSelecionadas![refeicaoKey] = slotOpcaoId(refeicaoKey, 1);
            } else if (!selecionadaId) {
              planoCarregado.opcoesSelecionadas![refeicaoKey] = slotOpcaoId(refeicaoKey, 1);
            }
          });

          // Backfill Opção 01: se ≥1 refeição precisa regenerar, monta o dia inteiro
          // (variedade proteica) — só nos slots regeneráveis / vazios.
          // Cardápio da nutri prevalece: não regenera se ela já salvou.
          const keysQuePrecisam = refeicoesKeysSync.filter((refeicaoKey) => {
            const slotsRef = opcoesSlots[refeicaoKey];
            const nutriTravouRefeicao = slotsRef.some(
              (slot, index) =>
                slotFoiEditadoPorNutricionista(slot) || (index > 0 && !slotOpcaoEstaVazio(slot))
            );
            if (nutriTravouRefeicao) return false;
            const slotAtual = slotsRef[0];
            return (
              slotOpcao01PrecisaPratoPadrao(slotAtual) &&
              opcaoPodeSerRegeneradaAutomaticamente(slotAtual) &&
              !slotFoiEditadoPorNutricionista(slotAtual)
            );
          });
          if (keysQuePrecisam.length > 0) {
            const opcoes01Dia = montarTodasOpcoes01DoDia(
              planoCarregado,
              restricoesPlano,
              preferenciasPlano,
              distribuicaoNovaLoad,
              sintomasGILoad
            );
            keysQuePrecisam.forEach((refeicaoKey) => {
              // Não regenerar Opção 01 se a refeição já tem qualquer opção 02–05 montada
              // (evita parecer que o café “não salvou” após edição recente).
              const temOpcaoExtra = opcoesSlots[refeicaoKey]
                .slice(1)
                .some((slot) => !slotOpcaoEstaVazio(slot));
              if (temOpcaoExtra) return;
              const atual = opcoesSlots[refeicaoKey][0];
              if (atual?.origem === 'manual' || atual?.origem === 'taco' || atual?.origem === 'paciente') return;
              if (slotFoiEditadoPorNutricionista(atual)) return;
              // Nutri anotou a refeição: não substituir o prato (nem a observação) no backfill.
              if (observacaoDaOpcao(atual)) return;
              opcoesSlots[refeicaoKey][0] = opcoes01Dia[refeicaoKey];
            });
            // NÃO persistir automaticamente no load: um setDoc atrasado sobrescrevia
            // o café da manhã (1ª refeição editada) com o snapshot antigo do plano.
          }

          refeicoesKeysSync.forEach((refeicaoKey) => {
            opcoesSlots[refeicaoKey].forEach((slot) => {
              const idx = opcoesDisponiveis[refeicaoKey].findIndex((o) => o.id === slot.id);
              if (idx >= 0) opcoesDisponiveis[refeicaoKey][idx] = slot;
              else opcoesDisponiveis[refeicaoKey].push(slot);
            });
          });
          planoCarregado.opcoesSlots = opcoesSlots;
          refeicoesKeysSync.forEach((refeicaoKey) => {
            planoCarregado.opcoesSelecionadas![refeicaoKey] = resolverOpcaoAtualComPrecedenciaNutri(
              opcoesSlots[refeicaoKey],
              planoCarregado.opcoesSelecionadas?.[refeicaoKey],
              refeicaoKey
            );
          });
          // Regenerar modeloDia a partir dos slots atuais (preenche lanches/almoço/janta)
          planoCarregado.modeloDia = gerarModeloDiaFromOpcoes(
            planoCarregado.opcoesSelecionadas as { [K in RefeicaoKey]: string },
            opcoesDisponiveis
          );

          // Inicializar macrosPorRefeicao com valores sugeridos + escolhidos dos slots
          if (!planoCarregado.macrosPorRefeicao) {
            planoCarregado.macrosPorRefeicao = {};
          }
          
          const refeicoes: RefeicaoKey[] = ['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'];
          refeicoes.forEach(refeicaoKey => {
            const valoresSugeridos = calcularValoresSugeridos(
              refeicaoKey,
              planoCarregado,
              distribuicaoNovaLoad
            );
            const slotAtualId =
              planoCarregado.opcoesSelecionadas?.[refeicaoKey] || slotOpcaoId(refeicaoKey, 1);
            const opcaoAtual =
              opcoesSlots[refeicaoKey].find((o) => o.id === slotAtualId) ||
              opcoesSlots[refeicaoKey][0];
            // macros escolhidos = Opção Atual (após backfill, Opção 01 traz soma dos itens)
            planoCarregado.macrosPorRefeicao![refeicaoKey] = {
              proteinaSugerida_g: valoresSugeridos.proteinaSugerida_g,
              proteinaEscolhida_g: opcaoAtual?.proteina_g || 0,
              caloriasSugerida_kcal: valoresSugeridos.caloriasSugerida_kcal,
              caloriasEscolhida_kcal: opcaoAtual?.calorias_kcal || 0,
            };
          });

          // Não sobrescrever estado enquanto o meal builder está aberto (ex.: import no café).
          if (cancelled || refeicaoEmEdicaoRef.current) return;

          setOpcoesRefeicoes(opcoesDisponiveis);
          // Não forçar slot do café: preserva a opção que o nutri estava vendo.
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
        } else if (somenteVisualizacao) {
          if (cancelled || refeicaoEmEdicaoRef.current) return;
          setPlano(null);
          setAnamneseSomente(null);
          setView('plano');
        } else {
          if (cancelled || refeicaoEmEdicaoRef.current) return;
          setAnamneseSomente(null);
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
        if (cancelled || refeicaoEmEdicaoRef.current) return;
        if (somenteVisualizacao) {
          setPlano(null);
          setAnamneseSomente(null);
          setView('plano');
        } else {
          setView('wizard');
        }
      }
    };
    
    void loadPlano();
    return () => {
      cancelled = true;
    };
    // Depender de paciente.id (não do objeto inteiro): re-renders do parent apagavam
    // importações no café da manhã ao recarregar o plano no meio da edição.
  }, [paciente?.id, onlyChatNutri, somenteVisualizacao]);

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
                imc: imcCalculado,
                circunferenciaAbdominal:
                  paciente.dadosClinicos?.medidasIniciais?.circunferenciaAbdominal ?? 0,
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

  /** Reabre a anamnese; ao gerar, sobrescreve o plano e recalcula Opção 01 (UI do Cardápio inalterada). */
  const iniciarRefazerPlanoNutri = () => {
    if (!plano || !podeEditarNutri) return;
    const confirmado = window.confirm(
      'Refazer o Plano Nutri reabre a anamnese. Estilo, metas e hipótese serão recalculados. A Opção 01 automática só muda onde o nutricionista ainda não editou. Cardápio salvo pela nutri (incluindo opções 02–05) prevalece e não será apagado. Continuar?'
    );
    if (!confirmado) return;

    setWizardData(
      plano.anamneseNutricional
        ? wizardFromAnamneseSnapshot(plano.anamneseNutricional)
        : {
            objetivoPrincipal: 'perda_peso',
            intensidadeDesejada: INTENSIDADE_DESEJADA_PADRAO,
            horarioTrabalho: 'diurno',
            horasSentado: '4-8h',
            atividadeFisica: 'nunca',
            sonoHoras: '6-8h',
            numeroRefeicoesDia: '4-5',
            comportamentosAlimentares: [],
            fomeEmocional: false,
            compulsaoNoturna: false,
            restricoes: plano.restricoesPaciente || [],
            preferenciasProteina: plano.preferenciasProteinaPaciente || [],
            sintomasGI: 'nenhum',
            dietaUltimos12Meses: 'nao',
            tipoDieta: '',
            efeitoSanfona: 'nao',
            kgSanfona: undefined,
            pesoMaximo2Anos: undefined,
            pesoMinimo2Anos: undefined,
            fomeMatinal: 5,
            fomeNoturna: 5,
            vontadeDoce: 5,
            pulaCafeManha: false,
            chegaComMuitaFomeJantar: false,
            horarioDormir: '22-00',
            acordaDescansado: 'as_vezes',
            dosesAlcoolSemana: '0',
            finalSemanaSaiDieta: 'quase_nunca',
          }
    );
    setWizardStep(1);
    setShowPesoAlturaForm(false);
    setActiveTab('plano');
    setView('wizard');
  };

  const iniciarGeracaoPlanoPendente = () => {
    if (!podeEditarNutri || !anamneseSomente) return;
    setWizardData(wizardFromAnamneseSnapshot(anamneseSomente));
    const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
    const pesoExistente = medidasIniciais?.peso;
    const alturaExistente = medidasIniciais?.altura;
    const imc = medidasIniciais?.imc;
    if (!(imc && imc > 0) && (!pesoExistente || !alturaExistente)) {
      setShowPesoAlturaForm(true);
      setPeso(pesoExistente || null);
      setAltura(alturaExistente || null);
    } else {
      setShowPesoAlturaForm(false);
    }
    setWizardStep(1);
    setActiveTab('plano');
    setView('wizard');
  };

  const cancelarRefazerPlanoNutri = () => {
    setView('plano');
    setActiveTab('plano');
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
    // ETAPA 4–7: base + TMB + GET + estratégia (somente leitura — não altera proteína/cardápio/kcal)
    const _dadosEnergeticosPlano: DadosEnergeticosPaciente = montarDadosEnergeticosPaciente(
      paciente,
      { atividadeFisicaDeclarada: wizardData.atividadeFisica }
    );
    const _estimativaTmbPlano = calcularEstimativaTmb(_dadosEnergeticosPlano);
    const _estimativaGetPlano = calcularEstimativaGet(_estimativaTmbPlano, {
      atividadeFisicaDeclarada: wizardData.atividadeFisica,
      horasSentado: wizardData.horasSentado,
    });
    const _estrategiaEnergeticaPlano = calcularEstrategiaEnergetica({
      get: _estimativaGetPlano,
      intensidadeDesejada: wizardData.intensidadeDesejada,
      objetivoPrincipal: wizardData.objetivoPrincipal,
      sexoBiologico: _dadosEnergeticosPlano.sexoBiologico,
      idadeAnos: _dadosEnergeticosPlano.idadeAnos,
      imcAtual: _dadosEnergeticosPlano.imcAtual,
      atividadeFisicaDeclarada: wizardData.atividadeFisica,
      sintomasGI: wizardData.sintomasGI,
      efeitoSanfona: wizardData.efeitoSanfona,
      fomeEmocional: wizardData.fomeEmocional,
      compulsaoNoturna: wizardData.compulsaoNoturna,
      gestacaoConfirmada: paciente.dadosClinicos?.riscos?.gestacao === 'sim',
      lactacaoConfirmada: paciente.dadosClinicos?.riscos?.lactacao === 'sim',
    });

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

    // ETAPA 8–9: distribuição alimenta metas da Opção 01 (não persiste TMB/GET/estratégia)
    const _distribuicaoMetasPlano = calcularDistribuicaoMetasRefeicoes({
      estrategiaEnergetica: _estrategiaEnergeticaPlano,
      proteinaDiariaG: Math.round(protDia_g),
      numeroRefeicoesDia: wizardData.numeroRefeicoesDia,
      horarioTrabalho: wizardData.horarioTrabalho,
      fomeMatinal: wizardData.fomeMatinal,
      fomeNoturna: wizardData.fomeNoturna,
      pulaCafeManha: wizardData.pulaCafeManha,
      chegaComMuitaFomeJantar: wizardData.chegaComMuitaFomeJantar,
      compulsaoNoturna: wizardData.compulsaoNoturna,
      sintomasGI: wizardData.sintomasGI,
      atividadeFisica: wizardData.atividadeFisica,
      objetivoPrincipal: wizardData.objetivoPrincipal,
    });
    
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
    // Esqueleto do plano para metas / builder (Opção 01 = prato montado, não só texto do catálogo)
    const planoBaseWizard: PlanoNutricional = {
      estilo,
      protDia_g: Math.round(protDia_g),
      aguaDia_ml: Math.round(aguaDia_ml),
      refeicoes: 5,
      distribuicaoProteina,
      modeloDia: {
        cafe: '',
        lanche1: '',
        almoco: '',
        lanche2: '',
        jantar: '',
      },
      opcoesSelecionadas: {
        cafe: slotOpcaoId('cafe', 1),
        lanche1: slotOpcaoId('lanche1', 1),
        almoco: slotOpcaoId('almoco', 1),
        lanche2: slotOpcaoId('lanche2', 1),
        jantar: slotOpcaoId('jantar', 1),
      },
      evitar: [],
      criadoEm: new Date(),
      restricoesPaciente: wizardData.restricoes,
      preferenciasProteinaPaciente: wizardData.preferenciasProteina,
    };
    const opcoesSlotsGerados = garantirOpcoesSlotsPlano(planoBaseWizard, opcoesDisponiveis);
    const opcoes01Dia = montarTodasOpcoes01DoDia(
      planoBaseWizard,
      wizardData.restricoes,
      wizardData.preferenciasProteina,
      _distribuicaoMetasPlano,
      wizardData.sintomasGI
    );
    (['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'] as RefeicaoKey[]).forEach((key) => {
      opcoesSlotsGerados[key][0] = opcoes01Dia[key];
    });
    const opcoesSlots = plano
      ? mesclarSlotsAposAnamnese(opcoesSlotsGerados, plano.opcoesSlots)
      : opcoesSlotsGerados;
    const opcoesSelecionadas: { [K in RefeicaoKey]: string } = {
      cafe: resolverOpcaoAtualComPrecedenciaNutri(opcoesSlots.cafe, plano?.opcoesSelecionadas?.cafe, 'cafe'),
      lanche1: resolverOpcaoAtualComPrecedenciaNutri(opcoesSlots.lanche1, plano?.opcoesSelecionadas?.lanche1, 'lanche1'),
      almoco: resolverOpcaoAtualComPrecedenciaNutri(opcoesSlots.almoco, plano?.opcoesSelecionadas?.almoco, 'almoco'),
      lanche2: resolverOpcaoAtualComPrecedenciaNutri(opcoesSlots.lanche2, plano?.opcoesSelecionadas?.lanche2, 'lanche2'),
      jantar: resolverOpcaoAtualComPrecedenciaNutri(opcoesSlots.jantar, plano?.opcoesSelecionadas?.jantar, 'jantar'),
    };
    // Expor slots na lista de opções (Opção 01 com itens reais)
    (Object.keys(opcoesSlots) as RefeicaoKey[]).forEach((key) => {
      opcoesSlots[key].forEach((slot) => {
        const idx = opcoesDisponiveis[key].findIndex((o) => o.id === slot.id);
        if (idx >= 0) opcoesDisponiveis[key][idx] = slot;
        else opcoesDisponiveis[key].push(slot);
      });
    });
    setOpcoesRefeicoes(opcoesDisponiveis);
    
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
    
    const macrosPorRefeicao: NonNullable<PlanoNutricional['macrosPorRefeicao']> = {};
    (['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'] as RefeicaoKey[]).forEach((key) => {
      const valoresSugeridos = calcularValoresSugeridos(
        key,
        {
          estilo,
          protDia_g: Math.round(protDia_g),
          aguaDia_ml: Math.round(aguaDia_ml),
          refeicoes: 5,
          distribuicaoProteina,
          modeloDia,
          opcoesSelecionadas,
          evitar: [],
          criadoEm: new Date(),
        },
        _distribuicaoMetasPlano
      );
      const slotAtualId = opcoesSelecionadas[key];
      const slotAtual =
        opcoesSlots[key]?.find((s) => s.id === slotAtualId) || opcoesSlots[key]?.[0];
      macrosPorRefeicao[key] = {
        proteinaSugerida_g: valoresSugeridos.proteinaSugerida_g,
        proteinaEscolhida_g: slotAtual?.proteina_g || 0,
        caloriasSugerida_kcal: valoresSugeridos.caloriasSugerida_kcal,
        caloriasEscolhida_kcal: slotAtual?.calorias_kcal || 0,
      };
    });

    const novoPlano: PlanoNutricional = {
      estilo,
      protDia_g: Math.round(protDia_g),
      aguaDia_ml: Math.round(aguaDia_ml),
      ...(typeof _estrategiaEnergeticaPlano.metaCaloricaAplicadaKcalDia === 'number' &&
      Number.isFinite(_estrategiaEnergeticaPlano.metaCaloricaAplicadaKcalDia) &&
      _estrategiaEnergeticaPlano.metaCaloricaAplicadaKcalDia > 0
        ? { caloriasDia_kcal: Math.round(_estrategiaEnergeticaPlano.metaCaloricaAplicadaKcalDia) }
        : {}),
      refeicoes: 5,
      distribuicaoProteina,
      modeloDia,
      opcoesSelecionadas,
      opcoesSlots,
      macrosPorRefeicao,
      evitar,
      criadoEm: new Date(),
      descricaoEstilo,
      hipoteseComportamental,
      suplementos,
      restricoesPaciente: wizardData.restricoes || [],
      preferenciasProteinaPaciente: wizardData.preferenciasProteina || [],
      anamneseNutricional: criarSnapshotAnamneseNutricional(wizardData),
      ...(plano?.itensCustomizadosPorRefeicao
        ? { itensCustomizadosPorRefeicao: plano.itensCustomizadosPorRefeicao }
        : {}),
      ...(plano?.opcoesCustomizadas ? { opcoesCustomizadas: plano.opcoesCustomizadas } : {}),
      ...(planoTemEdicaoDeNutricionista({
            cardapioEditadoPorNutricionista: plano?.cardapioEditadoPorNutricionista,
            opcoesSlots,
            itensCustomizadosPorRefeicao: plano?.itensCustomizadosPorRefeicao,
          })
        ? {
            cardapioEditadoPorNutricionista: true,
            ...(plano?.cardapioEditadoPorNutricionistaEm
              ? { cardapioEditadoPorNutricionistaEm: plano.cardapioEditadoPorNutricionistaEm }
              : {}),
          }
        : {}),
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
          proteinaTotal_g += Number(item.proteina_g) || 0;
          caloriasTotal_kcal += Number(item.calorias_kcal) || 0;
        }
      }
    });

    return {
      proteinaTotal_g: Math.round(proteinaTotal_g * 10) / 10,
      caloriasTotal_kcal: Math.round(caloriasTotal_kcal),
    };
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

    // Tentar ajustar lanche1 primeiro (priorizar whey) — sem sair do modelo de slots
    const lanche1Whey = opcoesDisponiveis.lanche1.find(o => o.id.includes('whey') || o.titulo.toLowerCase().includes('whey'));
    if (
      lanche1Whey &&
      opcoesAjustadas.lanche1 !== lanche1Whey.id &&
      !String(opcoesAjustadas.lanche1 || '').startsWith('slot_')
    ) {
      opcoesAjustadas.lanche1 = lanche1Whey.id;
      const macrosAposAjuste = estimarMacrosDia(opcoesAjustadas, opcoesDisponiveis);
      if (macrosAposAjuste.proteinaTotal_g >= metaMinima) {
        mensagemAjuste = 'Ajustamos seu lanche da manhã para manter sua meta mínima de proteína diária.';
        return { opcoesAjustadas, mensagemAjuste };
      }
    }

    // Tentar ajustar lanche2
    const lanche2Whey = opcoesDisponiveis.lanche2.find(o => o.id.includes('whey') || o.titulo.toLowerCase().includes('whey'));
    if (
      lanche2Whey &&
      opcoesAjustadas.lanche2 !== lanche2Whey.id &&
      !String(opcoesAjustadas.lanche2 || '').startsWith('slot_')
    ) {
      opcoesAjustadas.lanche2 = lanche2Whey.id;
      const macrosAposAjuste = estimarMacrosDia(opcoesAjustadas, opcoesDisponiveis);
      if (macrosAposAjuste.proteinaTotal_g >= metaMinima) {
        mensagemAjuste = 'Ajustamos seu lanche da tarde para manter sua meta mínima de proteína diária.';
        return { opcoesAjustadas, mensagemAjuste };
      }
    }

    // Se ainda não atingiu, tentar ajustar ambos os lanches (somente se não forem slots)
    if (
      lanche1Whey &&
      lanche2Whey &&
      !String(opcoesAjustadas.lanche1 || '').startsWith('slot_') &&
      !String(opcoesAjustadas.lanche2 || '').startsWith('slot_')
    ) {
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

  const salvarPlanoNutricional = async (
    planoData: PlanoNutricional,
    options?: { avisarPacienteCardapio?: boolean }
  ) => {
    try {
      const planoRef = doc(db, 'pacientes_completos', paciente.id, 'nutricao', 'plano');
      const criadoEmTs =
        planoData.criadoEm instanceof Date
          ? Timestamp.fromDate(planoData.criadoEm)
          : Timestamp.now();
      const payload = omitUndefinedDeep({
        ...planoData,
        criadoEm: criadoEmTs,
      });
      await setDoc(planoRef, payload);

      if (
        options?.avisarPacienteCardapio &&
        resolvedChatNutriAuthorKind === 'nutritionist' &&
        paciente.id
      ) {
        notifyPacienteCardapioEditadoClient(paciente.id);
      }
      
      setPlano({
        ...planoData,
        criadoEm: planoData.criadoEm instanceof Date ? planoData.criadoEm : new Date(),
      });
      setAnamneseSomente(null);
      setView('plano');
      await loadCheckIns();
    } catch (error) {
      console.error('Erro ao salvar plano nutricional:', error);
      alert('Erro ao salvar plano. Tente novamente.');
      throw error;
    }
  };

  /** Atualiza metas diárias (proteína / água / energia) — fonte dos cálculos do cardápio. */
  const atualizarMetasDiariasPlano = async (metas: {
    protDia_g: number;
    aguaDia_ml: number;
    caloriasDia_kcal: number | null;
  }) => {
    if (!plano || !podeEditarNutri) return;
    const protDia_g = Math.max(1, Math.round(metas.protDia_g));
    const aguaDia_ml = Math.max(1, Math.round(metas.aguaDia_ml));
    const caloriasDia_kcal =
      metas.caloriasDia_kcal != null &&
      Number.isFinite(metas.caloriasDia_kcal) &&
      metas.caloriasDia_kcal > 0
        ? Math.round(metas.caloriasDia_kcal)
        : undefined;

    const protPorRefeicao = protDia_g / 5;
    const distribuicaoProteina = {
      cafe: `${Math.round(protPorRefeicao * 1.2)}-${Math.round(protPorRefeicao * 1.4)} g`,
      almoco: `${Math.round(protPorRefeicao * 1.2)}-${Math.round(protPorRefeicao * 1.4)} g`,
      jantar: `${Math.round(protPorRefeicao * 1.2)}-${Math.round(protPorRefeicao * 1.4)} g`,
      lanche1: `${Math.round(protPorRefeicao * 0.7)}-${Math.round(protPorRefeicao * 0.9)} g`,
      lanche2: `${Math.round(protPorRefeicao * 0.7)}-${Math.round(protPorRefeicao * 0.9)} g`,
    };

    const planoComMetas: PlanoNutricional = {
      ...plano,
      protDia_g,
      aguaDia_ml,
      distribuicaoProteina,
      ...(caloriasDia_kcal != null
        ? { caloriasDia_kcal }
        : plano.caloriasDia_kcal != null
          ? { caloriasDia_kcal: plano.caloriasDia_kcal }
          : {}),
    };

    const dist = calcularDistribuicaoMetasDoPlano(paciente, planoComMetas);
    const macrosPorRefeicao: NonNullable<PlanoNutricional['macrosPorRefeicao']> = {
      ...(plano.macrosPorRefeicao || {}),
    };
    (['cafe', 'lanche1', 'almoco', 'lanche2', 'jantar'] as RefeicaoKey[]).forEach((key) => {
      const valores = calcularValoresSugeridos(key, planoComMetas, dist);
      const prev = macrosPorRefeicao[key];
      macrosPorRefeicao[key] = {
        proteinaSugerida_g: valores.proteinaSugerida_g,
        proteinaEscolhida_g: prev?.proteinaEscolhida_g ?? 0,
        caloriasSugerida_kcal: valores.caloriasSugerida_kcal,
        caloriasEscolhida_kcal: prev?.caloriasEscolhida_kcal ?? 0,
      };
    });

    const planoAtualizado: PlanoNutricional = {
      ...planoComMetas,
      macrosPorRefeicao,
    };

    try {
      const planoRef = doc(db, 'pacientes_completos', paciente.id, 'nutricao', 'plano');
      const criadoEmTs =
        plano.criadoEm instanceof Date ? Timestamp.fromDate(plano.criadoEm) : Timestamp.now();
      await setDoc(
        planoRef,
        omitUndefinedDeep({
          ...planoAtualizado,
          criadoEm: criadoEmTs,
        })
      );
      setPlano(planoAtualizado);
    } catch (error) {
      console.error('Erro ao atualizar metas do plano:', error);
      alert('Erro ao salvar metas. Tente novamente.');
      throw error;
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
    builderSelecaoDirtyRef.current = true;
  };

  const atualizarPorcaoItemBuilder = (
    itemId: string,
    patch: Partial<Pick<ItemRefeicao, 'peso_g' | 'quantidade' | 'unidade'>>
  ) => {
    if (!refeicaoEmEdicao || !configuracaoBuilder) return;
    const config = configuracaoBuilder[refeicaoEmEdicao];
    const atual = config.itensDisponiveis.find((i) => i.id === itemId);
    if (!atual) return;

    const nextItem = viewItemRefeicao({ ...atual, ...patch });

    setConfiguracaoBuilder({
      ...configuracaoBuilder,
      [refeicaoEmEdicao]: {
        ...config,
        itensDisponiveis: config.itensDisponiveis.map((i) =>
          i.id === itemId ? nextItem : i
        ),
      },
    });

    setItensCustomizadosPorRefeicao((prev) => {
      const lista = prev[refeicaoEmEdicao] || [];
      const idx = lista.findIndex((i) => i.id === itemId);
      if (idx >= 0) {
        const copia = [...lista];
        copia[idx] = nextItem;
        return { ...prev, [refeicaoEmEdicao]: copia };
      }
      return { ...prev, [refeicaoEmEdicao]: [...lista, nextItem] };
    });

    setItensSelecionadosRefeicao((prev) =>
      prev[itemId] ? prev : { ...prev, [itemId]: true }
    );
    builderSelecaoDirtyRef.current = true;
  };

  const resetAddItemModalState = () => {
    setAddFoodMode('metanutri');
    setTacoQuery('');
    setTacoResultados([]);
    setTacoSelecionado(null);
    setMetaQuery('');
    setMetaResultados([]);
    setMetaSelecionado(null);
    setMetaPorcaoId('');
    setMetaErro(null);
    setUnidadeNovoItem('');
    setPesoNovoItem(100);
    setManualNome('');
    setManualPeso(100);
    setManualProt(0);
    setManualKcal(0);
    setManualCarb('');
    setManualGord('');
    setManualFibra('');
    setAddItemErro(null);
  };

  const abrirModalAdicionarItem = () => {
    resetAddItemModalState();
    setShowAddItemModal(true);
  };

  const appendCustomItemNaRefeicao = (novoItem: ItemRefeicao) => {
    if (!refeicaoEmEdicao || !configuracaoBuilder) return;
    const item = viewItemRefeicao(novoItem);

    const proximaListaCustom = {
      ...itensCustomizadosPorRefeicao,
      [refeicaoEmEdicao]: [...(itensCustomizadosPorRefeicao[refeicaoEmEdicao] || []), item],
    };
    setItensCustomizadosPorRefeicao(proximaListaCustom);

    const configAtual = configuracaoBuilder[refeicaoEmEdicao];
    setConfiguracaoBuilder({
      ...configuracaoBuilder,
      [refeicaoEmEdicao]: {
        ...configAtual,
        itensDisponiveis: [...configAtual.itensDisponiveis, item],
      },
    });

    setItensSelecionadosRefeicao((anterior) => ({
      ...anterior,
      [item.id]: true,
    }));
    builderSelecaoDirtyRef.current = true;
    setShowAddItemModal(false);
    resetAddItemModalState();
  };

  const adicionarItemMetaNutriNaRefeicao = () => {
    if (!refeicaoEmEdicao || !metaSelecionado) return;
    const peso = Math.max(1, pesoNovoItem);
    const itemPlano = mapMetaNutriFoodToItemPlano({
      food: metaSelecionado,
      categoria: categoriaDaAbaBuilder(abaBuilderAtiva),
      quantidadeG: peso,
      unidade: unidadeNovoItem,
      refeicaoKey: refeicaoEmEdicao,
    });
    setAddItemErro(null);
    appendCustomItemNaRefeicao(itemPlanoComoItemRefeicao(itemPlano));
  };

  const adicionarItemTacoNaRefeicao = () => {
    if (!refeicaoEmEdicao || !tacoSelecionado) return;
    const peso = Math.max(1, pesoNovoItem);
    const itemPlano = criarItemComPorcao({
      id: `taco_${refeicaoEmEdicao}_${Date.now()}`,
      nome: tacoSelecionado.nome,
      categoria: categoriaDaAbaBuilder(abaBuilderAtiva),
      proteinaBase_g: tacoSelecionado.proteinas,
      caloriasBase_kcal: tacoSelecionado.calorias,
      carboidratoBase_g: tacoSelecionado.carboidratos,
      gorduraBase_g: tacoSelecionado.gorduras,
      pesoBase_g: 100,
      peso_g: Math.round(peso),
      quantidade: 1,
      unidade: '',
      descricao: `Base TACO • ${Math.round(peso)}g`,
      origemAlimento: 'taco',
    });
    setAddItemErro(null);
    appendCustomItemNaRefeicao(itemPlanoComoItemRefeicao(itemPlano));
  };

  const adicionarItemManualNaRefeicao = () => {
    if (!refeicaoEmEdicao) return;
    const nome = manualNome.trim();
    if (!nome) {
      setAddItemErro('Informe o nome do alimento.');
      return;
    }
    const peso = Math.max(1, manualPeso);
    const prot = Math.max(0, manualProt);
    const kcal = Math.max(0, manualKcal);
    if (prot <= 0 && kcal <= 0) {
      setAddItemErro('Informe proteína e/ou calorias do alimento.');
      return;
    }
    const parseOpcional = (raw: string): number | undefined => {
      const t = raw.trim();
      if (!t) return undefined;
      const n = Number(t.replace(',', '.'));
      return Number.isFinite(n) ? Math.max(0, n) : undefined;
    };
    const itemPlano = criarItemComPorcao({
      id: `manual_${refeicaoEmEdicao}_${Date.now()}`,
      nome,
      categoria: categoriaDaAbaBuilder(abaBuilderAtiva),
      proteinaBase_g: prot,
      caloriasBase_kcal: kcal,
      carboidratoBase_g: parseOpcional(manualCarb),
      gorduraBase_g: parseOpcional(manualGord),
      fibraBase_g: parseOpcional(manualFibra),
      pesoBase_g: Math.round(peso),
      peso_g: Math.round(peso),
      quantidade: 1,
      unidade: '',
      descricao: `Alimento próprio • ${Math.round(peso)}g`,
      origemAlimento: 'manual',
    });
    setAddItemErro(null);
    appendCustomItemNaRefeicao(itemPlanoComoItemRefeicao(itemPlano));
  };

  const importarRefeicaoDePlanoTemplate = (refeicaoImportada: RefeicaoPlanoTemplate) => {
    if (!refeicaoEmEdicao || !configuracaoBuilder) return;

    const idsSelecionados =
      refeicaoImportada.itensSelecionados.length > 0
        ? refeicaoImportada.itensSelecionados
        : refeicaoImportada.itens.map((i) => i.id);

    const itensPorId = new Map(refeicaoImportada.itens.map((item) => [item.id, item]));
    const itensImportados: ItemRefeicao[] = idsSelecionados
      .map((id) => itensPorId.get(id))
      .filter((item): item is NonNullable<typeof item> => !!item)
      .map((item) => itemPlanoComoItemRefeicao(item));

    if (itensImportados.length === 0) return;

    const selecionados: Record<string, boolean> = {};
    for (const item of itensImportados) {
      selecionados[item.id] = true;
    }

    // Substitui a lista custom desta refeição pelos itens do plano (upload/replace)
    const proximaListaCustom = {
      ...itensCustomizadosPorRefeicao,
      [refeicaoEmEdicao]: itensImportados,
    };
    setItensCustomizadosPorRefeicao(proximaListaCustom);

    const configAtual = configuracaoBuilder[refeicaoEmEdicao];
    const baseSemImportsAnterigos = configAtual.itensDisponiveis.filter(
      (i) => !isIdItemCustomizadoCardapio(i.id)
    );
    const idsBase = new Set(baseSemImportsAnterigos.map((i) => i.id));
    const novosNoCatalogo = itensImportados.filter((i) => !idsBase.has(i.id));

    setConfiguracaoBuilder({
      ...configuracaoBuilder,
      [refeicaoEmEdicao]: {
        ...configAtual,
        itensDisponiveis: [...baseSemImportsAnterigos, ...novosNoCatalogo],
      },
    });

    builderSelecaoDirtyRef.current = true;
    setItensSelecionadosRefeicao(selecionados);

    const obs = refeicaoImportada.observacao?.trim() || '';
    setObservacaoRefeicaoEmEdicao(obs);

    // Abre a aba da categoria do primeiro item para o nutricionista ver o resultado
    const primeiraCategoria = itensImportados[0]?.categoria;
    if (primeiraCategoria === 'proteina') setAbaBuilderAtiva('proteina');
    else if (primeiraCategoria === 'carboidrato') setAbaBuilderAtiva('carboidrato');
    else if (primeiraCategoria === 'gordura_boa') setAbaBuilderAtiva('gordura');
    else setAbaBuilderAtiva('reguladores');
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
    if (!showAddItemModal || addFoodMode !== 'taco') return;
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
  }, [tacoQuery, showAddItemModal, addFoodMode]);

  useEffect(() => {
    if (!showAddItemModal || addFoodMode !== 'metanutri') return;
    const q = metaQuery.trim();
    if (q.length < 2) {
      setMetaResultados([]);
      setMetaErro(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoadingMeta(true);
      setMetaErro(null);
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('Não autenticado.');
        const res = await fetch(
          `/api/metanutri/alimentos-globais?q=${encodeURIComponent(q)}&limit=30`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Falha na busca MetaNutri.');
        if (!cancelled) {
          setMetaResultados(Array.isArray(json?.alimentos) ? json.alimentos : []);
        }
      } catch (e) {
        if (!cancelled) {
          setMetaResultados([]);
          setMetaErro(e instanceof Error ? e.message : 'Erro na busca.');
        }
      } finally {
        if (!cancelled) setLoadingMeta(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [showAddItemModal, addFoodMode, metaQuery]);

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

    const rotulo = (item: ItemRefeicao) => {
      return formatarNomeItemPorcao(itemRefeicaoSnapshotParaPlano(viewItemRefeicao(item)));
    };
    
    proteinas.forEach(p => partes.push(rotulo(p)));
    carboidratos.forEach(c => partes.push(rotulo(c)));
    legumes.forEach(l => partes.push(rotulo(l)));
    gorduras.forEach(g => partes.push(rotulo(g)));
    extras.forEach(e => partes.push(rotulo(e)));
    if (lixo.length > 0) {
      partes.push(`+ Lixo: ${lixo.map(l => rotulo(l)).join(', ')}`);
    }
    
    return partes.join(' + ') || 'Refeição personalizada';
  };

  /**
   * Salva alterações do cardápio usando meal builder no slot (Opção 01–05) ativo
   */
  const salvarAlteracoesCardapio = async () => {
    if (!plano || !refeicaoEmEdicao || !configuracaoBuilder || !podeAlterarCardapio) return;
    const refeicaoKey = refeicaoEmEdicao;
    const slotAtivo = activeOpcaoSlot;
    
    try {
      const config = configuracaoBuilder[refeicaoKey];
      
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

      const slotId = slotOpcaoId(refeicaoKey, slotAtivo);
      const tituloExistente =
        plano.opcoesSlots?.[refeicaoKey]?.find((o) => o.id === slotId)?.titulo?.trim() ||
        tituloPadraoOpcao(slotAtivo);
      const temTaco = idsItensSelecionados.some(
        (id) =>
          id.startsWith('taco_') ||
          id.startsWith('metanutri_') ||
          id.startsWith('manual_') ||
          id.startsWith('imp_') ||
          id.includes('custom')
      );
      const proteinaSalva = Number(macrosRefeicaoAtual.proteinaTotal_g);
      const caloriasSalvas = Number(macrosRefeicaoAtual.caloriasTotal_kcal);
      const itensDetalhe = montarItensDetalheOpcao(idsItensSelecionados, config.itensDisponiveis);
      const slotAnterior = plano.opcoesSlots?.[refeicaoKey]?.find((o) => o.id === slotId);
      if (!podeEditarNutri && slotFoiEditadoPorNutricionista(slotAnterior)) {
        alert('Esta opção foi elaborada pela nutricionista e não pode ser alterada.');
        return;
      }
      const opcaoSlot: OpcaoRefeicao = withMealImage(
        {
          id: slotId,
          titulo: tituloExistente,
          descricao: textoRefeicao,
          proteina_g: Number.isFinite(proteinaSalva) ? proteinaSalva : 0,
          calorias_kcal: Number.isFinite(caloriasSalvas) ? caloriasSalvas : 0,
          itensSelecionados: idsItensSelecionados,
          ...(itensDetalhe.length > 0 ? { itensDetalhe } : {}),
          origem: podeEditarNutri ? (temTaco ? 'taco' : 'manual') : 'paciente',
          ...(observacaoRefeicaoEmEdicao.trim()
            ? { observacao: observacaoRefeicaoEmEdicao.trim() }
            : {}),
        },
        slotAnterior
      );

      const slotsDaRefeicao = (key: RefeicaoKey) =>
        garantirOpcoesSlotsPorRefeicao(
          key,
          normalizarSlotsRefeicao(plano.opcoesSlots?.[key]),
          null,
          plano.modeloDia[key] || ''
        );

      const slotsAtuais = slotsDaRefeicao(refeicaoKey);
      const slotsRefeicaoAtualizados = slotsAtuais.map((slot) =>
        slot.id === slotId ? opcaoSlot : slot
      );
      // Se por algum motivo o slot não existia na lista normalizada, anexa.
      const slotsFinais = slotsRefeicaoAtualizados.some((s) => s.id === slotId)
        ? slotsRefeicaoAtualizados
        : [...slotsRefeicaoAtualizados, opcaoSlot];

      const opcoesSlotsAtualizadas: Record<RefeicaoKey, OpcaoRefeicao[]> = {
        cafe: slotsDaRefeicao('cafe'),
        lanche1: slotsDaRefeicao('lanche1'),
        almoco: slotsDaRefeicao('almoco'),
        lanche2: slotsDaRefeicao('lanche2'),
        jantar: slotsDaRefeicao('jantar'),
      };
      opcoesSlotsAtualizadas[refeicaoKey] = slotsFinais;
      
      // Manter lista de opções em memória alinhada aos slots (sem mutar arrays do state)
      const opcoesAtualizadas: Record<RefeicaoKey, OpcaoRefeicao[]> = {
        cafe: [...(opcoesRefeicoes.cafe || [])],
        lanche1: [...(opcoesRefeicoes.lanche1 || [])],
        almoco: [...(opcoesRefeicoes.almoco || [])],
        lanche2: [...(opcoesRefeicoes.lanche2 || [])],
        jantar: [...(opcoesRefeicoes.jantar || [])],
      };
      const idxSlot = opcoesAtualizadas[refeicaoKey].findIndex((o) => o.id === slotId);
      if (idxSlot >= 0) {
        opcoesAtualizadas[refeicaoKey] = opcoesAtualizadas[refeicaoKey].map((o, i) =>
          i === idxSlot ? opcaoSlot : o
        );
      } else {
        opcoesAtualizadas[refeicaoKey] = [...opcoesAtualizadas[refeicaoKey], opcaoSlot];
      }
      
      const opcaoAtualId =
        plano.opcoesSelecionadas?.[refeicaoKey] || slotOpcaoId(refeicaoKey, 1);
      const slotAtualExistente =
        slotsFinais.find((s) => s.id === opcaoAtualId) ||
        slotsAtuais.find((s) => s.id === opcaoAtualId) ||
        null;
      const promoverSalvo =
        podeEditarNutri &&
        devePromoverSlotSalvoComoAtual({
          slotSalvoId: slotId,
          opcaoAtualId,
          slotAtual: slotAtualExistente,
        });
      const editandoOpcaoAtual =
        promoverSalvo ||
        opcaoAtualId === slotId ||
        parseSlotOpcaoIndex(refeicaoKey, opcaoAtualId) === slotAtivo;

      const baseOpcoesSelecionadas: { [K in RefeicaoKey]: string } = {
        cafe: plano.opcoesSelecionadas?.cafe || slotOpcaoId('cafe', 1),
        lanche1: plano.opcoesSelecionadas?.lanche1 || slotOpcaoId('lanche1', 1),
        almoco: plano.opcoesSelecionadas?.almoco || slotOpcaoId('almoco', 1),
        lanche2: plano.opcoesSelecionadas?.lanche2 || slotOpcaoId('lanche2', 1),
        jantar: plano.opcoesSelecionadas?.jantar || slotOpcaoId('jantar', 1),
      };

      // Se estiver editando a opção Atual (ou ainda sem slots migrados), atualiza macros do dia
      let opcoesSelecionadasAtualizadas: { [K in RefeicaoKey]: string } = {
        ...baseOpcoesSelecionadas,
        [refeicaoKey]: editandoOpcaoAtual
          ? slotId
          : opcaoAtualId.startsWith('slot_')
            ? opcaoAtualId
            : slotId,
      };
      // Primeira edição de um slot: se a seleção antiga não era slot, promove este slot a Atual
      if (!opcaoAtualId.startsWith('slot_')) {
        opcoesSelecionadasAtualizadas = {
          ...opcoesSelecionadasAtualizadas,
          [refeicaoKey]: slotId,
        };
      }

      const deveAtualizarMacrosDia =
        opcoesSelecionadasAtualizadas[refeicaoKey] === slotId;
      
      // Aplicar ajuste automático se necessário (só quando a opção Atual mudou)
      const { opcoesAjustadas, mensagemAjuste } = deveAtualizarMacrosDia
        ? ajustarProteinaAutomaticamente(
            opcoesSelecionadasAtualizadas,
            opcoesAtualizadas,
            plano.protDia_g
          )
        : { opcoesAjustadas: opcoesSelecionadasAtualizadas, mensagemAjuste: null };
      
      // Regenerar modeloDia a partir das opções Atuais
      const modeloDiaAtualizado = gerarModeloDiaFromOpcoes(opcoesAjustadas, {
        ...opcoesAtualizadas,
        [refeicaoKey]: [
          ...opcoesAtualizadas[refeicaoKey].filter((o) => o.id !== slotId),
          opcaoSlot,
        ],
      });
      
      // Calcular macros sugeridas para esta refeição usando a função helper
      const distribuicaoNovaSave = calcularDistribuicaoMetasDoPlano(paciente, plano);
      const valoresSugeridos = calcularValoresSugeridos(
        refeicaoKey,
        plano,
        distribuicaoNovaSave
      );
      
      // Atualizar macros por refeição só se a opção salva for a Atual
      const macrosPorRefeicaoAtualizado = {
        ...(plano.macrosPorRefeicao || {}),
        ...(deveAtualizarMacrosDia
          ? {
              [refeicaoKey]: {
                proteinaSugerida_g: valoresSugeridos.proteinaSugerida_g,
                proteinaEscolhida_g: opcaoSlot.proteina_g,
                caloriasSugerida_kcal: valoresSugeridos.caloriasSugerida_kcal,
                caloriasEscolhida_kcal: opcaoSlot.calorias_kcal
              }
            }
          : {}),
      };
      
      // Atualizar plano mantendo outros campos
      const planoAtualizado: PlanoNutricional = {
        ...plano,
        opcoesSelecionadas: opcoesAjustadas,
        modeloDia: modeloDiaAtualizado,
        macrosPorRefeicao: macrosPorRefeicaoAtualizado,
        opcoesSlots: opcoesSlotsAtualizadas,
        itensCustomizadosPorRefeicao,
        ...(podeEditarNutri
          ? {
              cardapioEditadoPorNutricionista: true,
              cardapioEditadoPorNutricionistaEm: new Date(),
            }
          : {}),
      };
      if (plano.opcoesCustomizadas) {
        planoAtualizado.opcoesCustomizadas = plano.opcoesCustomizadas;
      }

      // Persistir primeiro; só fecha o builder se o Firestore aceitar.
      await salvarPlanoNutricional(planoAtualizado, { avisarPacienteCardapio: podeEditarNutri });
      setOpcoesRefeicoes(opcoesAtualizadas);
      setPlano(planoAtualizado);

      builderSelecaoDirtyRef.current = false;
      refeicaoEmEdicaoRef.current = null;
      setRefeicaoEmEdicao(null);
      setOpcaoSelecionadaTemp('');
      setItensSelecionadosRefeicao({});
      setMacrosRefeicaoAtual({ proteinaTotal_g: 0, caloriasTotal_kcal: 0 });
      setAbaBuilderAtiva('proteina');
      setObservacaoRefeicaoEmEdicao('');
      
      if (mensagemAjuste) {
        alert(mensagemAjuste);
      }
    } catch (error) {
      console.error('Erro ao salvar alterações do cardápio:', error);
    }
  };

  /** Define a opção (slot 01–05) visualizada como a Atual da refeição. */
  const definirOpcaoComoAtual = async (refeicaoKey: RefeicaoKey, slot: CardapioOpcaoSlot) => {
    if (!plano || !podeAlterarCardapio) return;
    const slotId = slotOpcaoId(refeicaoKey, slot);
    const slots = garantirOpcoesSlotsPorRefeicao(
      refeicaoKey,
      normalizarSlotsRefeicao(plano.opcoesSlots?.[refeicaoKey]),
      null,
      plano.modeloDia[refeicaoKey] || ''
    );
    const opcaoSlot = slots.find((o) => o.id === slotId);
    if (!opcaoSlot || (!opcaoSlot.descricao && !(opcaoSlot.itensSelecionados?.length))) {
      alert('Monte esta opção antes de defini-la como atual.');
      return;
    }

    const opcoesSelecionadasAtualizadas = {
      ...(plano.opcoesSelecionadas || {
        cafe: slotOpcaoId('cafe', 1),
        lanche1: slotOpcaoId('lanche1', 1),
        almoco: slotOpcaoId('almoco', 1),
        lanche2: slotOpcaoId('lanche2', 1),
        jantar: slotOpcaoId('jantar', 1),
      }),
      [refeicaoKey]: slotId,
    };

    const opcoesParaModelo = { ...opcoesRefeicoes };
    slots.forEach((slotItem) => {
      const idx = opcoesParaModelo[refeicaoKey].findIndex((o) => o.id === slotItem.id);
      if (idx >= 0) opcoesParaModelo[refeicaoKey][idx] = slotItem;
      else opcoesParaModelo[refeicaoKey].push(slotItem);
    });

    const modeloDiaAtualizado = gerarModeloDiaFromOpcoes(opcoesSelecionadasAtualizadas, opcoesParaModelo);
    const distribuicaoNovaAtual = calcularDistribuicaoMetasDoPlano(paciente, plano);
    const valoresSugeridos = calcularValoresSugeridos(refeicaoKey, plano, distribuicaoNovaAtual);
    const macrosPorRefeicaoAtualizado = {
      ...(plano.macrosPorRefeicao || {}),
      [refeicaoKey]: {
        proteinaSugerida_g: valoresSugeridos.proteinaSugerida_g,
        proteinaEscolhida_g: opcaoSlot.proteina_g || 0,
        caloriasSugerida_kcal: valoresSugeridos.caloriasSugerida_kcal,
        caloriasEscolhida_kcal: opcaoSlot.calorias_kcal || 0,
      },
    };

    const slotsNorm = (key: RefeicaoKey) =>
      garantirOpcoesSlotsPorRefeicao(
        key,
        normalizarSlotsRefeicao(plano.opcoesSlots?.[key]),
        null,
        plano.modeloDia[key] || ''
      );
    const opcoesSlotsAtualizadas: Record<RefeicaoKey, OpcaoRefeicao[]> = {
      cafe: slotsNorm('cafe'),
      lanche1: slotsNorm('lanche1'),
      almoco: slotsNorm('almoco'),
      lanche2: slotsNorm('lanche2'),
      jantar: slotsNorm('jantar'),
    };
    opcoesSlotsAtualizadas[refeicaoKey] = slots;

    const planoAtualizado: PlanoNutricional = {
      ...plano,
      opcoesSelecionadas: opcoesSelecionadasAtualizadas,
      modeloDia: modeloDiaAtualizado,
      macrosPorRefeicao: macrosPorRefeicaoAtualizado,
      opcoesSlots: opcoesSlotsAtualizadas,
      itensCustomizadosPorRefeicao,
      ...(podeEditarNutri
        ? {
            cardapioEditadoPorNutricionista: true,
            cardapioEditadoPorNutricionistaEm: new Date(),
          }
        : {}),
    };

    await salvarPlanoNutricional(planoAtualizado, { avisarPacienteCardapio: podeEditarNutri });
    setPlano(planoAtualizado);
    setActiveOpcaoSlot(slot);
  };

  /** Renomeia a opção (slot) visualizada — ex.: dieta da nutricionista. */
  const renomearOpcaoSlot = async (
    refeicaoKey: RefeicaoKey,
    slot: CardapioOpcaoSlot,
    novoNome: string
  ) => {
    if (!plano) return;
    const nomeLimpo = novoNome.trim() || tituloPadraoOpcao(slot);
    const slotId = slotOpcaoId(refeicaoKey, slot);
    const slotsBase = garantirOpcoesSlotsPorRefeicao(
      refeicaoKey,
      normalizarSlotsRefeicao(plano.opcoesSlots?.[refeicaoKey]),
      null,
      plano.modeloDia[refeicaoKey] || ''
    );
    const atual = slotsBase.find((o) => o.id === slotId);
    if (atual?.titulo?.trim() === nomeLimpo) {
      setNomeOpcaoDraft(nomeLimpo);
      return;
    }

    setSalvandoNomeOpcao(true);
    try {
      const slotsAtualizados = slotsBase.map((o) =>
        o.id === slotId ? { ...o, titulo: nomeLimpo } : o
      );
      const slotsNorm = (key: RefeicaoKey) =>
        garantirOpcoesSlotsPorRefeicao(
          key,
          normalizarSlotsRefeicao(plano.opcoesSlots?.[key]),
          null,
          plano.modeloDia[key] || ''
        );
      const opcoesSlotsAtualizadas: Record<RefeicaoKey, OpcaoRefeicao[]> = {
        cafe: slotsNorm('cafe'),
        lanche1: slotsNorm('lanche1'),
        almoco: slotsNorm('almoco'),
        lanche2: slotsNorm('lanche2'),
        jantar: slotsNorm('jantar'),
      };
      opcoesSlotsAtualizadas[refeicaoKey] = slotsAtualizados;

      const opcoesAtualizadas: Record<RefeicaoKey, OpcaoRefeicao[]> = {
        cafe: [...(opcoesRefeicoes.cafe || [])],
        lanche1: [...(opcoesRefeicoes.lanche1 || [])],
        almoco: [...(opcoesRefeicoes.almoco || [])],
        lanche2: [...(opcoesRefeicoes.lanche2 || [])],
        jantar: [...(opcoesRefeicoes.jantar || [])],
      };
      const idx = opcoesAtualizadas[refeicaoKey].findIndex((o) => o.id === slotId);
      const slotAtualizado = slotsAtualizados.find((o) => o.id === slotId)!;
      if (idx >= 0) {
        opcoesAtualizadas[refeicaoKey] = opcoesAtualizadas[refeicaoKey].map((o, i) =>
          i === idx ? slotAtualizado : o
        );
      } else {
        opcoesAtualizadas[refeicaoKey] = [...opcoesAtualizadas[refeicaoKey], slotAtualizado];
      }
      setOpcoesRefeicoes(opcoesAtualizadas);

      const planoAtualizado: PlanoNutricional = {
        ...plano,
        opcoesSlots: opcoesSlotsAtualizadas,
        itensCustomizadosPorRefeicao,
        cardapioEditadoPorNutricionista: true,
        cardapioEditadoPorNutricionistaEm: plano.cardapioEditadoPorNutricionistaEm || new Date(),
      };
      await salvarPlanoNutricional(planoAtualizado);
      setPlano(planoAtualizado);
      setNomeOpcaoDraft(nomeLimpo);
    } catch (error) {
      console.error('Erro ao renomear opção:', error);
      alert('Erro ao salvar o nome da opção. Tente novamente.');
    } finally {
      setSalvandoNomeOpcao(false);
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
    if (view !== 'checkin' && view !== 'checkinSemanal') return;
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
    if (!CHECK_IN_DIARIO_NUTRI_ENABLED || somenteVisualizacao) return;
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

  const abrirCheckInSemanal = (weekKey?: string, intent?: CheckInSemanalNutriInteraction) => {
    setCheckInSemanalPickerOpen(false);
    setCheckInSemanalWeekKey(weekKey ?? getNutritionCheckInReferenceWeek().weekKey);
    setCheckInSemanalIntent(intent);
    setView('checkinSemanal');
  };

  const abrirSeletorOuCheckInSemanal = () => {
    if (weeklyCaps.fillOnBehalf) {
      setCheckInSemanalPickerOpen(true);
      return;
    }
    abrirCheckInSemanal();
  };

  const fecharCheckInSemanal = () => {
    setView('plano');
    setCheckInSemanalWeekKey(null);
    setCheckInSemanalIntent(undefined);
  };

  const irParaHistoricoSemanal = (weekKey: string) => {
    setView('plano');
    setActiveTab('historico');
    setHistoricoWeekFocus(weekKey);
    setCheckInSemanalWeekKey(null);
    setCheckInSemanalIntent(undefined);
  };

  if (onlyChatNutri && paciente?.id) {
    return (
      <div className="flex flex-col gap-2 w-full max-w-full min-w-0 h-full min-h-0 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0 shrink-0">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">ChatNutri</span>
        </div>
        <ChatNutriPanel
          key={`chatnutri-only-${paciente.id}`}
          patientId={paciente.id}
          dateKey={chatNutriDateKey}
          onDateKeyChange={handleChatNutriDateInput}
          className="w-full max-w-full min-w-0 flex-1 min-h-0"
          {...chatNutriPanelAuthorProps}
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
      <div className="h-full min-h-0 overflow-y-auto overscroll-y-contain">
        <div className="space-y-4 pb-8 lg:p-2">
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
      </div>
    );
  }

  // Wizard de anamnese nutricional (melhorado)
  if (view === 'wizard') {
    if (somenteVisualizacao) {
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <UtensilsCrossed className="mx-auto h-12 w-12 text-gray-300 mb-3" aria-hidden />
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Nutrologia</h2>
            <p className="text-sm text-gray-600">
              Este paciente ainda não possui plano nutricional. Apenas visualização — o ChatNutri fica
              disponível quando houver plano ou histórico de conversas.
            </p>
            {paciente?.id ? (
              <div className="mt-6 text-left">
                <ChatNutriPanel
                  patientId={paciente.id}
                  dateKey={chatNutriDateKey}
                  onDateKeyChange={handleChatNutriDateInput}
                  className="min-h-[min(50vh,28rem)]"
                  {...chatNutriPanelAuthorProps}
                />
              </div>
            ) : null}
          </div>
        </div>
      );
    }
    const totalSteps = 9;
    
    return (
      <div className="h-full min-h-0 overflow-y-auto overscroll-y-contain">
        <div className="space-y-4 pb-8 lg:p-2">
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
          
          {/* Step 1: Objetivo Principal + Intensidade desejada */}
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

              <div className="pt-4 border-t border-gray-200 space-y-3">
                <p className="text-gray-700 font-medium">
                  Qual intensidade de mudança você acredita conseguir manter neste momento?
                </p>
                <div className="space-y-2">
                  {([
                    {
                      value: 'leve' as const,
                      label: 'Leve',
                      desc: 'Mudanças graduais, maior flexibilidade e adaptação progressiva à nova rotina.',
                    },
                    {
                      value: 'moderada' as const,
                      label: 'Moderada',
                      desc: 'Mudanças mais consistentes, com equilíbrio entre resultado, flexibilidade e adesão.',
                      badge: 'Mais comum',
                    },
                    {
                      value: 'intensiva' as const,
                      label: 'Intensiva',
                      desc: 'Mudanças mais rigorosas, que exigem maior organização, acompanhamento e capacidade de adesão.',
                    },
                  ]).map((opcao) => (
                    <button
                      key={opcao.value}
                      type="button"
                      onClick={() =>
                        setWizardData({ ...wizardData, intensidadeDesejada: opcao.value })
                      }
                      className={`w-full text-left px-4 py-3 rounded-md border-2 transition-colors ${
                        wizardData.intensidadeDesejada === opcao.value
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900">{opcao.label}</p>
                        {'badge' in opcao && opcao.badge ? (
                          <span className="text-[11px] font-medium text-gray-500 border border-gray-200 rounded px-1.5 py-0.5">
                            {opcao.badge}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{opcao.desc}</p>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  A intensidade final poderá ser ajustada pela equipe conforme seu perfil clínico.
                </p>
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
          
          <div className="mt-6 flex flex-wrap gap-3">
            {plano && (
              <button
                type="button"
                onClick={cancelarRefazerPlanoNutri}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancelar e voltar ao plano
              </button>
            )}
            {!plano && anamneseSomente && (
              <button
                type="button"
                onClick={cancelarRefazerPlanoNutri}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancelar e voltar à anamnese
              </button>
            )}
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
              className="flex-1 min-w-[10rem] px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              {wizardStep === 9 ? 'Gerar Plano Nutricional' : 'Próximo'}
            </button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  // Tela de Check-in Diário (legado — desativado na ETAPA 03)
  const weekPickerEl =
    checkInSemanalPickerOpen && paciente?.id ? (
      <CheckInSemanalNutriWeekPicker
        pacienteId={paciente.id}
        nutritionistId={weeklyNutritionistId}
        patient={paciente}
        onClose={() => setCheckInSemanalPickerOpen(false)}
        onSelectWeek={(weekKey, answered) =>
          abrirCheckInSemanal(weekKey, answered ? 'view' : 'create')
        }
      />
    ) : null;

  if (view === 'checkin') {
    if (!CHECK_IN_DIARIO_NUTRI_ENABLED || somenteVisualizacao) {
      return (
        <div className="space-y-4">
          {weekPickerEl}
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-800 font-medium">O Check-in Diário foi substituído pelo Check-in Semanal.</p>
            <p className="text-gray-600 text-sm mt-2">Registros antigos continuam no Histórico anterior.</p>
            <button
              type="button"
              onClick={() => abrirSeletorOuCheckInSemanal()}
              className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold"
            >
              Abrir Check-in Semanal
            </button>
            <button
              type="button"
              onClick={() => setView('plano')}
              className="mt-2 px-4 py-2 rounded-lg text-sm font-semibold text-gray-700"
            >
              Voltar à Nutrologia
            </button>
          </div>
        </div>
      );
    }
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
      <div
        className={`flex w-full flex-col overflow-hidden bg-gradient-to-b from-[#06152e] via-[#0A1F44] to-[#0d2a5a] text-[#E8EDED] dark ${
          embedded
            ? 'h-full min-h-0 rounded-xl border border-white/10'
            : 'h-[100dvh] max-h-[100dvh]'
        }`}
      >
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
                const distCheckIn = calcularDistribuicaoMetasDoPlano(paciente, plano);
                
                refeicoes.forEach(refeicaoKey => {
                  const macrosSalvas = plano.macrosPorRefeicao?.[refeicaoKey];
                  if (macrosSalvas && macrosSalvas.caloriasEscolhida_kcal > 0) {
                    caloriasTotal += macrosSalvas.caloriasEscolhida_kcal;
                  } else {
                    const valoresSugeridos = calcularValoresSugeridos(refeicaoKey, plano, distCheckIn);
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

    const checkInSalvoOverlay = showCheckInSalvoModal ? (
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
    ) : null;

    // Embed no modal do paciente: check-in preenche a área de conteúdo (como uma página).
    if (embedded) {
      const abasCheckInNav = [
        { id: 'plano' as const, label: 'Plano Nutri', Icon: UtensilsCrossed },
        { id: 'cardapio' as const, label: 'Cardápio', Icon: Apple },
        ...(habilitarPlanosTemplates
          ? [{ id: 'planos' as const, label: 'Planos Alimentares', Icon: BookMarked }]
          : []),
        { id: 'historico' as const, label: 'Evolução Nutricional', Icon: TrendingUp },
        { id: 'chatnutri' as const, label: 'ChatNutri', Icon: MessageSquare },
        ...(modoNutricionista
          ? [{ id: 'orientacoes' as const, label: 'Orientações', Icon: Mail }]
          : []),
      ];

      return (
        <div className="flex flex-col lg:flex-row min-h-0 h-full w-full relative">
          <NutrologiaPastasAside
            open={tabletPastasOpen}
            onToggle={() => setTabletPastasOpen((v) => !v)}
          >
              {mostrarCheckInDiario ? (
              <button
                type="button"
                title="Check-in Diário"
                onClick={() => {
                  const dataHoje = new Date().toISOString().split('T')[0];
                  setCheckInDate(dataHoje);
                  setView('checkin');
                  setTabletPastasOpen(false);
                }}
                className="nc-pastas-item w-full flex items-center justify-center xl:justify-start min-h-11 gap-0 xl:gap-3 px-0 xl:px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors bg-green-100 text-green-700 border-r-2 border-green-500 mb-1"
              >
                <CheckCircle className="nc-pastas-item-icon w-[18px] h-[18px] flex-shrink-0 text-green-600" strokeWidth={2} aria-hidden />
                <span className="nc-pastas-label hidden xl:block truncate text-left">Check-in Diário</span>
              </button>
              ) : null}
              {mostrarCheckInSemanal ? (
              <button
                type="button"
                title="Check-in Semanal"
                onClick={() => {
                  abrirSeletorOuCheckInSemanal();
                  setTabletPastasOpen(false);
                }}
                className="nc-pastas-item w-full flex items-center justify-center xl:justify-start min-h-11 gap-0 xl:gap-3 px-0 xl:px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors bg-teal-50 text-teal-800 ring-1 ring-teal-200 hover:bg-teal-100 mb-1"
              >
                <CalendarDays className="nc-pastas-item-icon w-[18px] h-[18px] flex-shrink-0 text-teal-700" strokeWidth={2} aria-hidden />
                <span className="nc-pastas-label hidden xl:block truncate text-left">Check-in Semanal</span>
              </button>
              ) : null}
              {abasCheckInNav.map((aba) => {
                const TabIcon = aba.Icon;
                return (
                  <button
                    key={aba.id}
                    type="button"
                    title={aba.label}
                    onClick={() => {
                      setView('plano');
                      setActiveTab(aba.id);
                      setTabletPastasOpen(false);
                    }}
                    className="nc-pastas-item w-full flex items-center justify-center xl:justify-start min-h-11 gap-0 xl:gap-3 px-0 xl:px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  >
                    <TabIcon className="nc-pastas-item-icon w-[18px] h-[18px] flex-shrink-0 text-gray-400" strokeWidth={2} aria-hidden />
                    <span className="nc-pastas-label hidden xl:block truncate text-left">{aba.label}</span>
                  </button>
                );
              })}
          </NutrologiaPastasAside>

          <div className="flex-1 min-h-0 flex flex-col overflow-hidden min-w-0 lg:p-4">
            <div className="lg:hidden shrink-0 px-0 pb-3">
              <button
                type="button"
                onClick={fecharCheckInModal}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Voltar
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">{checkInModalPainel}</div>
          </div>
          {isClient ? createPortal(checkInSalvoOverlay, document.body) : checkInSalvoOverlay}
        </div>
      );
    }

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
        {checkInSalvoOverlay}
      </div>
    );

    if (!isClient) return null;
    return createPortal(checkInModalOverlay, document.body);
  }

  if (view === 'checkinSemanal') {
    const weeklyActor =
      weeklyViewerRole === 'nutritionist'
        ? 'nutritionist'
        : weeklyViewerRole === 'doctor'
          ? 'doctor'
          : 'patient';
    const authorship = mapCheckInSemanalNutriAuthorship(weeklyActor);
    const nutritionistId = resolveNutritionistIdForCheckIn({
      actor: weeklyActor,
      actorId: chatNutriAuthorId,
      nutricionistaVinculadoIds: paciente.nutricionistaVinculadoIds,
    });
    const answeredById =
      authorship.answeredBy === 'patient'
        ? chatNutriAuthorId?.trim() || paciente.userId
        : chatNutriAuthorId?.trim() || undefined;
    const weekAberta = getNutritionWeek(checkInSemanalWeekKey || getNutritionCheckInReferenceWeek().weekStart);
    const wizardEl = (
      <CheckInSemanalNutriView
        pacienteId={paciente.id}
        pacienteNome={paciente.dadosIdentificacao?.nomeCompleto || paciente.nome}
        nutricionistaNome={pdfProfissionais.nutricionistaNome || chatNutriAuthorName}
        nutritionistId={nutritionistId}
        metaAguaMl={plano?.aguaDia_ml}
        mode={authorship.mode}
        answeredBy={authorship.answeredBy}
        source={authorship.source}
        answeredById={answeredById}
        week={weekAberta}
        intent={checkInSemanalIntent}
        readOnly={somenteVisualizacao}
        viewerRole={weeklyViewerRole}
        onClose={fecharCheckInSemanal}
        onGoToHistory={irParaHistoricoSemanal}
      />
    );

    if (!isClient) return null;
    return (
      <CheckInSemanalNutriOverlay onClose={fecharCheckInSemanal}>
        {wizardEl}
      </CheckInSemanalNutriOverlay>
    );
  }

  // Tela principal do plano (melhorada)
  if (!plano && anamneseSomente) {
    return (
      <div className="h-full min-h-0 overflow-y-auto overscroll-y-contain">
        <div className="space-y-4 pb-8 lg:p-2">
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-emerald-700" aria-hidden />
                  <h2 className="text-lg font-semibold text-gray-900">Anamnese preenchida</h2>
                </div>
                <p className="text-sm text-gray-600 max-w-xl">
                  O paciente já respondeu o questionário. Os cálculos do plano alimentar ainda não
                  foram gerados.
                </p>
                {anamneseSomente.preenchidaEm ? (
                  <p className="mt-2 text-xs text-gray-500">
                    Preenchida em{' '}
                    {new Date(anamneseSomente.preenchidaEm).toLocaleDateString('pt-BR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                ) : null}
              </div>
              {podeEditarNutri ? (
                <button
                  type="button"
                  onClick={iniciarGeracaoPlanoPendente}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                >
                  Gerar cálculos do plano
                </button>
              ) : null}
            </div>
          </div>
          <PlanoNutriAnamnesePanel
            paciente={paciente}
            plano={{ anamneseNutricional: anamneseSomente }}
            modoNutricionista={modoNutricionista}
          />
        </div>
      </div>
    );
  }

  // Tela principal do plano (melhorada)
  if (!plano) {
    if (somenteVisualizacao) {
      return (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <UtensilsCrossed className="mx-auto h-12 w-12 text-gray-300 mb-3" aria-hidden />
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Sem plano nutricional</h2>
            <p className="text-sm text-gray-600 mb-6">
              O paciente ainda não possui plano cadastrado. Você pode usar o ChatNutri abaixo.
            </p>
            {paciente?.id ? (
              <ChatNutriPanel
                patientId={paciente.id}
                dateKey={chatNutriDateKey}
                onDateKeyChange={handleChatNutriDateInput}
                className="min-h-[min(50vh,28rem)] text-left"
                {...chatNutriPanelAuthorProps}
              />
            ) : null}
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <p className="text-gray-600">Carregando plano...</p>
        </div>
      </div>
    );
  }

  const abasPrincipais = [
    { id: 'plano' as const, label: 'Plano Nutri', shortLabel: 'Plano Nutri', Icon: UtensilsCrossed },
    { id: 'cardapio' as const, label: 'Cardápio', shortLabel: 'Cardápio', Icon: Apple },
    ...(habilitarPlanosTemplates
      ? [{ id: 'planos' as const, label: 'Planos Alimentares', shortLabel: 'Planos', Icon: BookMarked }]
      : []),
    { id: 'historico' as const, label: 'Evolução Nutricional', shortLabel: 'Evolução', Icon: TrendingUp },
    { id: 'chatnutri' as const, label: 'ChatNutri', shortLabel: 'ChatNutri', Icon: MessageSquare },
    ...(modoNutricionista
      ? [{ id: 'orientacoes' as const, label: 'Orientações', shortLabel: 'Orientações', Icon: Mail }]
      : []),
  ];
  /** Embed no modal do paciente (desktop): menu lateral em vez da grade mobile. */
  const useEmbedDesktopNav = embedded;
  const pastasPlano = [
    { id: 'plano_nutricional', label: 'Plano Nutricional', shortLabel: 'Plano', Icon: UtensilsCrossed },
    { id: 'anamnese', label: 'Anamnese', shortLabel: 'Anamnese', Icon: ClipboardList },
    { id: 'hipotese', label: 'Hipótese', shortLabel: 'Hipótese', Icon: Brain },
    { id: 'meta_proteinas', label: 'Proteínas', shortLabel: 'Proteínas', Icon: Activity },
    { id: 'meta_agua', label: 'Água e extras', shortLabel: 'Água', Icon: Droplet },
    { id: 'orientacoes', label: 'Orientações', shortLabel: 'Orientações', Icon: Mail },
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
  const distribuicaoMetasPlanoAtual = calcularDistribuicaoMetasDoPlano(paciente, plano);
  const valoresSugeridosRefeicaoAtiva = calcularValoresSugeridos(
    refeicaoCardapioAtiva.key,
    plano,
    distribuicaoMetasPlanoAtual
  );
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
  const slotsSalvosRefeicao = normalizarSlotsRefeicao(plano.opcoesSlots?.[refeicaoCardapioAtiva.key]);
  const slotsRefeicaoAtiva =
    slotsSalvosRefeicao && slotsSalvosRefeicao.length > 0
      ? garantirOpcoesSlotsPorRefeicao(
          refeicaoCardapioAtiva.key,
          slotsSalvosRefeicao,
          null,
          plano.modeloDia[refeicaoCardapioAtiva.key] || ''
        )
      : garantirOpcoesSlotsPorRefeicao(
          refeicaoCardapioAtiva.key,
          undefined,
          opcoesRefeicaoAtiva.find((o) => o.id === plano.opcoesSelecionadas?.[refeicaoCardapioAtiva.key]) ||
            opcoesRefeicaoAtiva[0] ||
            null,
          plano.modeloDia[refeicaoCardapioAtiva.key] || ''
        );
  const opcaoAtualSlotIndex = parseSlotOpcaoIndex(
    refeicaoCardapioAtiva.key,
    plano.opcoesSelecionadas?.[refeicaoCardapioAtiva.key]
  );
  const opcaoVisualizadaId = slotOpcaoId(refeicaoCardapioAtiva.key, activeOpcaoSlot);
  const opcaoVisualizada =
    slotsRefeicaoAtiva.find((opcao) => opcao.id === opcaoVisualizadaId) ||
    slotsRefeicaoAtiva[activeOpcaoSlot - 1] ||
    null;
  const currentMealImage = parseMealImageRecord(opcaoVisualizada?.mealImage);
  const mealImageSlotKey = mealImageGenerationSlotKey(
    refeicaoCardapioAtiva.key,
    opcaoVisualizadaId
  );
  const isGeneratingMealImage = Boolean(generatingMealImages[mealImageSlotKey]);
  const opcaoBloqueadaParaPaciente =
    !podeEditarNutri && slotFoiEditadoPorNutricionista(opcaoVisualizada);
  const podeEditarOpcaoVisualizada = podeAlterarCardapio && !opcaoBloqueadaParaPaciente;
  const opcaoEhAtual = activeOpcaoSlot === opcaoAtualSlotIndex;
  const opcaoTemConteudo = Boolean(
    opcaoVisualizada &&
      !slotOpcaoEstaVazio(opcaoVisualizada)
  );
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
  const customPorIdCardapio = new Map(
    itensCustomResumoCardapio.map((item) => [item.id, viewItemRefeicao(item)])
  );
  const itensDisponiveisRefeicaoAtiva = [
    ...itensDisponiveisBaseCardapio.map(
      (item) => customPorIdCardapio.get(item.id) || viewItemRefeicao(item)
    ),
    ...itensCustomResumoCardapio
      .filter((item) => !itensDisponiveisBaseCardapio.some((base) => base.id === item.id))
      .map((item) => viewItemRefeicao(item)),
  ];
  // Se o slot tem IDs mas ainda não tem snapshot, materializa na hora da leitura
  const opcaoVisualizadaComDetalhe =
    opcaoVisualizada &&
    !opcaoVisualizada.itensDetalhe?.length &&
    opcaoVisualizada.itensSelecionados?.length
      ? anexarItensDetalheOpcao(opcaoVisualizada, itensDisponiveisRefeicaoAtiva)
      : opcaoVisualizada;
  const currentMealImageHash = buildMealImageSourceHash(
    opcaoVisualizadaComDetalhe &&
      !(opcaoVisualizadaComDetalhe.descricao || '').trim() &&
      opcaoEhAtual &&
      plano.modeloDia[refeicaoCardapioAtiva.key]
      ? { ...opcaoVisualizadaComDetalhe, descricao: plano.modeloDia[refeicaoCardapioAtiva.key] }
      : opcaoVisualizadaComDetalhe
  );
  const mealDishGenerateKind = resolveMealDishGenerateAction({
    isPatientViewer,
    hasLinkedNutritionist,
    slotExists: Boolean(opcaoVisualizada),
    currentSourceHash: currentMealImageHash,
    mealImage: currentMealImage,
    isGenerating: isGeneratingMealImage,
  });
  const mealDishCanRegenerate = resolveMealDishRegenerateAction({
    actorKind: mealImageActorKind,
    somenteVisualizacao,
    slotExists: Boolean(opcaoVisualizada),
    currentSourceHash: currentMealImageHash,
    mealImage: currentMealImage,
    isGenerating: isGeneratingMealImage,
  });
  const descricaoRefeicaoAtiva =
    opcaoVisualizadaComDetalhe?.descricao ||
    (opcaoEhAtual ? plano.modeloDia[refeicaoCardapioAtiva.key] : '') ||
    '';
  const observacaoRefeicaoAtiva = observacaoDaOpcao(opcaoVisualizadaComDetalhe);
  const itensResumoRefeicaoAtiva = montarLinhasResumoOpcao(
    opcaoVisualizadaComDetalhe,
    itensDisponiveisRefeicaoAtiva,
    descricaoRefeicaoAtiva
  );
  const totalProteinaPorItens = itensResumoRefeicaoAtiva.reduce((acc, item) => acc + item.proteinaItem, 0);
  const totalCarboidratoPorItens = itensResumoRefeicaoAtiva.reduce(
    (acc, item) => acc + (typeof item.carboidratoItem === 'number' ? item.carboidratoItem : 0),
    0
  );
  const temCarboidratoPorItens = itensResumoRefeicaoAtiva.some(
    (item) => typeof item.carboidratoItem === 'number'
  );
  const totalCaloriasPorItens = itensResumoRefeicaoAtiva.reduce((acc, item) => acc + item.caloriasItem, 0);

  return (
    <div
      className={
        useEmbedDesktopNav
          ? 'flex flex-col lg:flex-row min-h-0 h-full w-full relative'
          : 'space-y-3 sm:space-y-4'
      }
    >
      {weekPickerEl}
      {/* Menu lateral — desktop no embed do modal do paciente */}
      {useEmbedDesktopNav && (
        <NutrologiaPastasAside
          open={tabletPastasOpen}
          onToggle={() => setTabletPastasOpen((v) => !v)}
        >
              {mostrarCheckInDiario ? (
                <button
                  type="button"
                  title="Check-in Diário"
                  onClick={() => {
                    const dataHoje = new Date().toISOString().split('T')[0];
                    setCheckInDate(dataHoje);
                    setView('checkin');
                    setTabletPastasOpen(false);
                  }}
                  className="nc-pastas-item w-full flex items-center justify-center xl:justify-start min-h-11 gap-0 xl:gap-3 px-0 xl:px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors bg-[#4CCB7A]/15 text-[#0A1F44] ring-1 ring-[#4CCB7A]/35 hover:bg-[#4CCB7A]/25 mb-1"
                >
                  <CheckCircle className="nc-pastas-item-icon w-[18px] h-[18px] flex-shrink-0 text-[#4CCB7A]" strokeWidth={2} aria-hidden />
                  <span className="nc-pastas-label hidden xl:block truncate text-left">Check-in Diário</span>
                </button>
              ) : null}
              {mostrarCheckInSemanal ? (
                <CheckInSemanalNutriCta
                  pacienteId={paciente.id}
                  layout="sidebar"
                  viewerRole={weeklyViewerRole}
                  onOpen={() => {
                    abrirSeletorOuCheckInSemanal();
                    setTabletPastasOpen(false);
                  }}
                />
              ) : null}
              {abasPrincipais.map((aba) => {
              const ativo = activeTab === aba.id;
              const TabIcon = aba.Icon;
              return (
                <button
                  key={aba.id}
                  type="button"
                  title={aba.label}
                  onClick={() => {
                    setView('plano');
                    setActiveTab(aba.id);
                    setTabletPastasOpen(false);
                  }}
                  className={`nc-pastas-item w-full flex items-center justify-center xl:justify-start min-h-11 gap-0 xl:gap-3 px-0 xl:px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    ativo
                      ? 'bg-green-100 text-green-700 border-r-2 border-green-500'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <TabIcon
                    className={`nc-pastas-item-icon w-[18px] h-[18px] flex-shrink-0 ${
                      ativo ? 'text-green-600' : 'text-gray-400'
                    }`}
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span className="nc-pastas-label hidden xl:block truncate text-left">{aba.label}</span>
                </button>
              );
            })}
        </NutrologiaPastasAside>
      )}

      <div
        className={
          useEmbedDesktopNav
            ? 'flex-1 min-h-0 flex flex-col overflow-hidden min-w-0 space-y-3 sm:space-y-4 lg:p-4'
            : undefined
        }
      >
      {/* Check-in — mobile / fora do embed; no desktop embed fica no menu lateral */}
      {(mostrarCheckInDiario || mostrarCheckInSemanal) ? (
      <div className={`px-0 shrink-0 flex flex-col sm:flex-row gap-2 ${useEmbedDesktopNav ? 'lg:hidden' : ''}`}>
        {mostrarCheckInDiario ? (
        <button
          type="button"
          onClick={() => {
            const dataHoje = new Date().toISOString().split('T')[0];
            setCheckInDate(dataHoje);
            setView('checkin');
          }}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-[#0A1F44] bg-white border-2 border-gray-300 hover:bg-gray-50 transition-all"
        >
          <Calendar className="h-5 w-5 shrink-0" aria-hidden />
          <span>Check-in Diário</span>
        </button>
        ) : null}
        {mostrarCheckInSemanal ? (
          <CheckInSemanalNutriCta
            pacienteId={paciente.id}
            layout="banner"
            viewerRole={weeklyViewerRole}
            onOpen={() => abrirSeletorOuCheckInSemanal()}
          />
        ) : null}
      </div>
      ) : null}
      {weeklyCaps.configureSchedule && chatNutriAuthorId ? (
        <div className="px-0 shrink-0">
          <CheckInSemanalNutriScheduleEditor
            patientId={paciente.id}
            nutritionistId={chatNutriAuthorId}
            canConfigure
          />
        </div>
      ) : null}

      {/* Abas — sem card branco envolvente; conteúdo na base cinza da página.
          No embed desktop, a grade fica só no mobile (menu lateral no lg+). */}
      <div className={`min-w-0 ${useEmbedDesktopNav ? 'flex-1 min-h-0 flex flex-col overflow-hidden' : ''}`}>
        <div
          className={`rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/70 dark:bg-[#0A1F44]/55 backdrop-blur-sm overflow-hidden shrink-0 ${
            useEmbedDesktopNav ? 'lg:hidden' : ''
          }`}
        >
          <div
            role="tablist"
            aria-label="Seções Nutri"
            className={`grid gap-1.5 p-2 sm:flex sm:gap-3 sm:overflow-x-auto sm:p-3 sm:pb-2 scrollbar-hide snap-x snap-mandatory min-w-0 ${
              abasPrincipais.length >= 5 ? 'grid-cols-3' : 'grid-cols-4'
            }`}
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
                      : 'border-gray-200/90 dark:border-white/10 bg-white dark:bg-white/[0.04] hover:border-[#4CCB7A]/40 hover:bg-[#4CCB7A]/5'
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
          <div className="px-3 py-2.5 bg-gray-50/80 dark:bg-[#06152e]/70 border-t border-gray-200/80 dark:border-white/10">
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

        {/* Conteúdo das Abas — na base cinza, sem card branco full-bleed */}
        <div
          className={`mt-3 min-w-0 max-w-full overflow-x-hidden px-0 ${
            useEmbedDesktopNav
              ? activeTab === 'chatnutri'
                ? 'flex-1 min-h-0 overflow-hidden flex flex-col lg:mt-0'
                : 'flex-1 min-h-0 overflow-y-auto lg:mt-0'
              : activeTab === 'chatnutri'
                ? 'min-h-[min(70vh,40rem)] flex flex-col'
                : ''
          }`}
        >
          {/* Aba: Plano Nutri */}
          {activeTab === 'plano' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-200/90 dark:border-white/10 bg-gradient-to-br from-white via-[#E8EDED]/40 to-[#4CCB7A]/10 dark:from-[#0A1F44]/70 dark:via-[#0A1F44]/55 dark:to-[#2F8FA3]/20 p-2 sm:p-3 shadow-[0_8px_24px_-12px_rgba(76,203,122,0.2)]">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {pastasPlano.map((pasta) => {
                    const PastaIcon = pasta.Icon;
                    const ativo = activePlanoFolder === pasta.id;
                    return (
                      <button
                        key={pasta.id}
                        type="button"
                        onClick={() => setActivePlanoFolder(pasta.id)}
                        className={`rounded-xl border px-2 py-3 text-center transition-all ${
                          ativo
                            ? 'border-[#4CCB7A] bg-[#4CCB7A]/15 dark:bg-[#4CCB7A]/20 text-[#0A1F44] dark:text-[#E8EDED] shadow-[0_6px_20px_-8px_rgba(76,203,122,0.4)] ring-2 ring-[#4CCB7A]/35'
                            : 'border-gray-200/90 dark:border-white/10 bg-white/90 dark:bg-white/[0.04] text-gray-600 dark:text-[#E8EDED]/75 hover:border-[#4CCB7A]/40 hover:bg-[#4CCB7A]/5'
                        }`}
                        aria-current={ativo ? 'true' : undefined}
                      >
                        <PastaIcon
                          className={`mx-auto mb-1.5 h-4 w-4 ${
                            ativo ? 'text-[#4CCB7A]' : 'text-[#2F8FA3]/80 dark:text-[#4CCB7A]/70'
                          }`}
                          aria-hidden
                        />
                        <span className="block text-[11px] sm:text-sm font-semibold leading-tight">
                          <span className="sm:hidden">{pasta.shortLabel}</span>
                          <span className="hidden sm:inline">{pasta.label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {activePlanoFolder === 'plano_nutricional' && (
                <PlanoNutriVisaoGeral
                  estilo={plano.estilo}
                  descricaoEstilo={plano.descricaoEstilo}
                  criadoEm={plano.criadoEm}
                  protDia_g={plano.protDia_g}
                  aguaDia_ml={plano.aguaDia_ml}
                  caloriasDia_kcal={plano.caloriasDia_kcal}
                  refeicoes={plano.refeicoes}
                  anamneseNutricional={plano.anamneseNutricional}
                  restricoesPaciente={plano.restricoesPaciente}
                  preferenciasProteinaPaciente={plano.preferenciasProteinaPaciente}
                  distribuicaoMetas={distribuicaoMetasPlanoAtual}
                  onRefazer={podeEditarNutri ? iniciarRefazerPlanoNutri : undefined}
                  modoNutricionista={podeEditarNutri}
                  onSalvarMetas={podeEditarNutri ? atualizarMetasDiariasPlano : undefined}
                />
              )}

              {activePlanoFolder === 'anamnese' && (
                <PlanoNutriAnamnesePanel
                  paciente={paciente}
                  plano={plano}
                  modoNutricionista={modoNutricionista}
                />
              )}

              {activePlanoFolder === 'hipotese' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#4CCB7A]/40 bg-gradient-to-br from-[#4CCB7A]/12 via-[#E8EDED]/70 to-[#2F8FA3]/12 dark:from-[#4CCB7A]/15 dark:via-[#0A1F44]/65 dark:to-[#2F8FA3]/20 p-5 shadow-[0_10px_26px_-14px_rgba(76,203,122,0.45)]">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <UtensilsCrossed className="h-5 w-5 text-[#2F8FA3] dark:text-[#4CCB7A]" />
                        <h3 className="text-sm font-medium text-[#0A1F44] dark:text-[#E8EDED]">Estilo Alimentar</h3>
                      </div>
                      <span className="rounded-full border border-[#4CCB7A]/40 bg-[#4CCB7A]/15 px-2 py-0.5 text-[10px] font-semibold text-[#0A1F44] dark:text-[#B8F0CC]">
                        Do seu perfil
                      </span>
                    </div>
                    <p className="text-xl font-bold text-[#0A1F44] dark:text-[#E8EDED] capitalize mb-2">
                      {plano.estilo.replace('_', ' ')}
                    </p>
                    {plano.descricaoEstilo && (
                      <p className="text-xs text-[#0A1F44]/80 dark:text-[#E8EDED]/80 leading-relaxed">
                        {plano.descricaoEstilo}
                      </p>
                    )}
                    {(() => {
                      const intensidade = obterIntensidadeDesejadaDoSnapshot(
                        plano.anamneseNutricional
                      );
                      if (!intensidade) return null;
                      return (
                        <p className="mt-3 text-xs text-[#0A1F44]/75 dark:text-[#E8EDED]/75">
                          Intensidade desejada:{' '}
                          <span className="font-semibold text-[#0A1F44] dark:text-[#E8EDED]">
                            {rotuloIntensidadeDesejada(intensidade)}
                          </span>
                        </p>
                      );
                    })()}
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
                  {paciente?.id ? (
                    modoNutricionista ? (
                      <HydrationProfessionalPanel
                        pacienteId={paciente.id}
                        currentGoalMl={plano.aguaDia_ml}
                      />
                    ) : (
                      <HydrationDailyTracker
                        pacienteId={paciente.id}
                        pacienteUserId={paciente.userId || ''}
                        currentGoalMl={plano.aguaDia_ml}
                        canEdit={!somenteVisualizacao}
                      />
                    )
                  ) : null}
                </div>
              )}

              {activePlanoFolder === 'orientacoes' && (
                <NutriOrientacoesPanel
                  pacienteId={paciente.id}
                  pacienteNome={paciente.dadosIdentificacao?.nomeCompleto || paciente.nome}
                  pacienteEmail={paciente.email}
                  pacienteUserId={paciente.userId}
                  canCompose={false}
                />
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
              {mealImageToast ? (
                <div
                  className="rounded-lg border border-gray-200 bg-gray-900 px-3 py-2 text-sm font-medium text-white"
                  role="status"
                >
                  {mealImageToast}
                </div>
              ) : null}
              <div className="space-y-5">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <span className="text-xs sm:text-sm font-semibold text-gray-700">Refeições:</span>
                  <div className="mt-2 grid grid-cols-5 gap-1.5 sm:gap-2">
                    {cardapioRefeicoes.map((refeicao) => {
                      const selecionado = activeCardapioMeal === refeicao.key;
                      const cor = COR_REFEICAO[refeicao.key];
                      const Icon = refeicao.icon;
                      return (
                        <button
                          key={refeicao.key}
                          type="button"
                          onClick={() => {
                            setActiveCardapioMeal(refeicao.key);
                            setActiveOpcaoSlot(
                              parseSlotOpcaoIndex(refeicao.key, plano.opcoesSelecionadas?.[refeicao.key])
                            );
                          }}
                          className={`flex w-full min-w-0 flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[11px] font-semibold transition-all sm:text-sm lg:px-1.5 lg:py-2.5 lg:text-[11px] lg:leading-tight ${
                            selecionado ? 'shadow-sm' : 'bg-white hover:bg-gray-50'
                          }`}
                          style={
                            selecionado
                              ? {
                                  color: cor,
                                  borderColor: hexComAlpha(cor, '55'),
                                  backgroundColor: hexComAlpha(cor, '14'),
                                  boxShadow: `inset 0 0 0 1px ${hexComAlpha(cor, '22')}`,
                                }
                              : {
                                  borderColor: '#E5E7EB',
                                  color: '#4B5563',
                                }
                          }
                          aria-current={selecionado ? 'true' : undefined}
                          aria-label={refeicao.nome}
                        >
                          <span
                            className="flex h-7 w-7 items-center justify-center rounded-lg"
                            style={{
                              backgroundColor: hexComAlpha(cor, selecionado ? '22' : '14'),
                              color: cor,
                            }}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="lg:hidden">{refeicao.numero}</span>
                          <span className="hidden text-center lg:block">{refeicao.nome}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  className="space-y-4 rounded-lg border bg-white p-3"
                  style={{
                    borderColor: hexComAlpha(COR_REFEICAO[refeicaoCardapioAtiva.key], '40'),
                    boxShadow: `inset 3px 0 0 ${COR_REFEICAO[refeicaoCardapioAtiva.key]}`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <MealDishImage
                        key={mealDishImageInstanceKey({
                          patientId: paciente.id,
                          refeicaoKey: refeicaoCardapioAtiva.key,
                          slotId: opcaoVisualizadaId,
                        })}
                        patientId={paciente.id}
                        refeicaoKey={refeicaoCardapioAtiva.key}
                        slotId={opcaoVisualizadaId}
                        mealName={refeicaoCardapioAtiva.nome}
                        mealImage={currentMealImage}
                        currentSourceHash={currentMealImageHash}
                        accentColor={COR_REFEICAO[refeicaoCardapioAtiva.key]}
                        PlaceholderIcon={refeicaoCardapioAtiva.icon}
                        canGenerate={mealDishGenerateKind != null}
                        isGenerating={isGeneratingMealImage}
                        generateKind={mealDishGenerateKind}
                        generateLabel={mealDishGenerateLabel(mealDishGenerateKind)}
                        onGenerate={
                          mealDishGenerateKind
                            ? () => {
                                void gerarImagemDoPrato({
                                  patientId: paciente.id,
                                  refeicaoKey: refeicaoCardapioAtiva.key,
                                  slotId: opcaoVisualizadaId,
                                });
                              }
                            : undefined
                        }
                        canRegenerate={mealDishCanRegenerate}
                        isRegenerating={mealDishCanRegenerate && isGeneratingMealImage}
                        onRegenerate={
                          mealDishCanRegenerate
                            ? () => {
                                void gerarImagemDoPrato({
                                  patientId: paciente.id,
                                  refeicaoKey: refeicaoCardapioAtiva.key,
                                  slotId: opcaoVisualizadaId,
                                  forceRegenerate: true,
                                });
                              }
                            : undefined
                        }
                        onPreview={(imageUrl) => setMealDishPreviewUrl(imageUrl)}
                      />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                          Refeição {refeicaoCardapioAtiva.numero}
                        </p>
                        <h4 className="truncate text-base font-bold text-gray-900 sm:text-lg">
                          {refeicaoCardapioAtiva.nome}
                        </h4>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="md:hidden">
                        <MealMacroRing
                          caloriasAtual={caloriasEscolhidaRefeicaoAtiva}
                          caloriasPrevisto={valoresSugeridosRefeicaoAtiva.caloriasSugerida_kcal}
                          proteinaAtual={proteinaEscolhidaRefeicaoAtiva}
                          proteinaPrevisto={valoresSugeridosRefeicaoAtiva.proteinaSugerida_g}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-700">Opções:</span>
                      <div className="flex items-center gap-1.5">
                        {opcaoEhAtual ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700">
                            Atual
                          </span>
                        ) : podeAlterarCardapio ? (
                          <button
                            type="button"
                            onClick={() => definirOpcaoComoAtual(refeicaoCardapioAtiva.key, activeOpcaoSlot)}
                            disabled={!opcaoTemConteudo}
                            className="rounded-full border border-green-300 bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green-700 hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Usar como atual
                          </button>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                            Opção {String(activeOpcaoSlot).padStart(2, '0')}
                          </span>
                        )}
                        {podeAlterarCardapio ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (!podeEditarOpcaoVisualizada) return;
                              setOpcaoSelecionadaTemp(opcaoVisualizadaId);
                              setRefeicaoEmEdicao(refeicaoCardapioAtiva.key);
                            }}
                            disabled={!podeEditarOpcaoVisualizada}
                            title={
                              opcaoBloqueadaParaPaciente
                                ? 'Esta opção foi elaborada pela nutricionista e não pode ser alterada'
                                : 'Editar esta opção'
                            }
                            className="rounded-full border border-gray-300 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:opacity-60"
                          >
                            Editar
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-5 gap-1.5 sm:gap-2">
                      {CARDAPIO_OPCAO_SLOTS.map((slot) => {
                        const slotAtual = slot === opcaoAtualSlotIndex;
                        const selecionado = slot === activeOpcaoSlot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setActiveOpcaoSlot(slot)}
                            className={`relative w-full min-w-0 rounded-md border px-1 py-1.5 text-[11px] sm:text-sm font-semibold transition-colors ${
                              selecionado
                                ? 'border-orange-400 bg-orange-50 text-orange-800'
                                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                            }`}
                            aria-current={selecionado ? 'true' : undefined}
                            aria-label={`Opção ${String(slot).padStart(2, '0')}${slotAtual ? ' (atual)' : ''}`}
                          >
                            {String(slot).padStart(2, '0')}
                            {slotAtual && (
                              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-green-500" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <label
                        htmlFor="nome-opcao-cardapio"
                        className="text-xs font-semibold uppercase tracking-wide text-gray-600"
                      >
                        Nome da opção
                        {opcaoEhAtual ? ' · Atual' : ''}
                      </label>
                      <span className="text-[10px] text-gray-400">
                        {String(activeOpcaoSlot).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        id="nome-opcao-cardapio"
                        type="text"
                        value={nomeOpcaoDraft}
                        readOnly={!podeEditarNutri}
                        onChange={(e) => {
                          if (!podeEditarNutri) return;
                          setNomeOpcaoDraft(e.target.value);
                        }}
                        onBlur={() => {
                          if (!podeEditarNutri) return;
                          renomearOpcaoSlot(
                            refeicaoCardapioAtiva.key,
                            activeOpcaoSlot,
                            nomeOpcaoDraft
                          );
                        }}
                        onKeyDown={(e) => {
                          if (!podeEditarNutri) return;
                          if (e.key === 'Enter') {
                            e.currentTarget.blur();
                          }
                        }}
                        placeholder={`Ex.: Dieta da nutri · ${tituloPadraoOpcao(activeOpcaoSlot)}`}
                        maxLength={48}
                        disabled={salvandoNomeOpcao}
                        className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:border-orange-400 focus:outline-none focus:ring-1 focus:ring-orange-300 disabled:opacity-60"
                      />
                    </div>
                    {!opcaoTemConteudo ? (
                      <p className="mt-2 text-sm text-gray-500">
                        {podeEditarOpcaoVisualizada
                          ? 'Opção vazia — toque em Editar para montar.'
                          : opcaoBloqueadaParaPaciente
                            ? 'Esta opção foi elaborada pela nutricionista.'
                            : 'Opção vazia.'}
                      </p>
                    ) : null}
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full table-fixed text-[11px] sm:text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="w-[46%] px-2 py-2 text-left font-semibold">Item</th>
                          <th className="w-[18%] px-2 py-2 text-right font-semibold">Proteínas</th>
                          <th className="w-[18%] px-2 py-2 text-right font-semibold">Carboidratos</th>
                          <th className="w-[18%] px-2 py-2 text-right font-semibold">Calorias</th>
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
                              {typeof itemResumo.carboidratoItem === 'number'
                                ? `${itemResumo.carboidratoItem.toFixed(1)} g`
                                : '-'}
                            </td>
                            <td className="px-2 py-2 text-right font-medium text-gray-900 whitespace-nowrap">
                              {itemResumo.caloriasItem > 0 ? `${Math.round(itemResumo.caloriasItem)} kcal` : '-'}
                            </td>
                          </tr>
                        ))}
                        {itensResumoRefeicaoAtiva.length === 0 && (
                          <tr className="border-t border-gray-100">
                            <td colSpan={4} className="px-2 py-3 text-sm text-gray-700">
                              {descricaoRefeicaoAtiva || 'Nenhum item nesta opção ainda.'}
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
                            {temCarboidratoPorItens ? `${totalCarboidratoPorItens.toFixed(1)} g` : '-'}
                          </td>
                          <td className="px-2 py-2 text-right font-bold text-gray-900 whitespace-nowrap">
                            {totalCaloriasPorItens > 0 ? `${Math.round(totalCaloriasPorItens)} kcal` : '-'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {observacaoRefeicaoAtiva ? (
                    <div className="mt-3 rounded-xl border border-[#2F8FA3]/30 bg-[#2F8FA3]/10 px-3.5 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#2F8FA3] mb-1">
                        Observação da nutri
                      </p>
                      <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                        {observacaoRefeicaoAtiva}
                      </p>
                    </div>
                  ) : null}
                </div>

                {/* Resumo do dia por refeição */}
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
                    const valoresSugeridos = calcularValoresSugeridos(
                      refeicaoKey,
                      plano,
                      distribuicaoMetasPlanoAtual
                    );
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

                  const deltaProteinaTotal = proteinaEscolhidaTotal - proteinaSugeridaTotal;
                  const deltaCaloriasTotal = caloriasEscolhidaTotal - caloriasSugeridaTotal;

                  const barTone = (atual: number, previsto: number) => {
                    if (previsto <= 0) return 'neutral' as const;
                    const ratio = atual / previsto;
                    if (Math.abs(ratio - 1) < 0.02) return 'ok' as const;
                    if (ratio > 1) return 'over' as const;
                    return 'under' as const;
                  };

                  const barFillClass = (tone: 'ok' | 'over' | 'under' | 'neutral') =>
                    tone === 'ok'
                      ? 'bg-emerald-500'
                      : tone === 'over'
                        ? 'bg-amber-500'
                        : tone === 'under'
                          ? 'bg-sky-500'
                          : 'bg-gray-300';

                  const renderMacroBar = (
                    label: string,
                    atual: number,
                    previsto: number,
                    formatAtual: string,
                    formatPrevisto: string,
                    formatDelta: string
                  ) => {
                    const tone = barTone(atual, previsto);
                    const fillPct = previsto > 0 ? Math.min((atual / previsto) * 100, 100) : 0;
                    const overflowPct =
                      previsto > 0 && atual > previsto
                        ? Math.min(((atual - previsto) / previsto) * 100, 40)
                        : 0;
                    return (
                      <div className="min-w-0">
                        <div className="mb-1 flex items-baseline justify-between gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                            {label}
                          </span>
                          <span className="text-[11px] font-semibold tabular-nums text-gray-800 sm:text-xs">
                            {formatAtual}
                            <span className="font-normal text-gray-400"> / {formatPrevisto}</span>
                          </span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full ${barFillClass(tone)}`}
                            style={{ width: `${fillPct}%` }}
                          />
                          {overflowPct > 0 && (
                            <div
                              className="absolute inset-y-0 right-0 bg-amber-300/80"
                              style={{ width: `${overflowPct}%` }}
                            />
                          )}
                        </div>
                        <p
                          className={`mt-0.5 text-right text-[10px] font-medium tabular-nums ${
                            tone === 'ok'
                              ? 'text-emerald-700'
                              : tone === 'over'
                                ? 'text-amber-700'
                                : tone === 'under'
                                  ? 'text-sky-700'
                                  : 'text-gray-500'
                          }`}
                        >
                          {formatDelta}
                        </p>
                      </div>
                    );
                  };

                  const corPorRefeicao = COR_REFEICAO;

                  const renderTotalGauge = (
                    title: string,
                    atual: number,
                    previsto: number,
                    unitLabel: string,
                    formatAtual: string,
                    formatPrevisto: string,
                    deltaLabel: string,
                    segmentos: Array<{ key: RefeicaoKey; label: string; value: number; color: string }>
                  ) => {
                    const tone = barTone(atual, previsto);
                    const escala = Math.max(previsto, atual, 1);
                    const statusLabel =
                      tone === 'ok'
                        ? 'No previsto'
                        : tone === 'over'
                          ? 'Acima do previsto'
                          : tone === 'under'
                            ? 'Abaixo do previsto'
                            : '—';
                    return (
                      <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
                        <div className="mb-3 flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {title}
                            </p>
                            <p className="mt-1 text-lg font-bold tabular-nums text-gray-900 sm:text-xl">
                              {formatAtual}
                              <span className="ml-1 text-sm font-medium text-gray-400">{unitLabel}</span>
                            </p>
                            <p className="text-xs text-gray-500">
                              Previsto: <span className="font-semibold text-gray-700">{formatPrevisto}</span>
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                              tone === 'ok'
                                ? 'bg-emerald-50 text-emerald-700'
                                : tone === 'over'
                                  ? 'bg-amber-50 text-amber-800'
                                  : 'bg-sky-50 text-sky-800'
                            }`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <div className="relative h-4 w-full overflow-hidden rounded-full bg-gray-100">
                          <div className="absolute inset-0 flex">
                            {segmentos.map((seg, index) => {
                              const widthPct = (Math.max(0, seg.value) / escala) * 100;
                              if (widthPct <= 0) return null;
                              const isFirst = index === 0 || segmentos.slice(0, index).every((s) => s.value <= 0);
                              const remaining = segmentos.slice(index + 1).every((s) => s.value <= 0);
                              return (
                                <div
                                  key={seg.key}
                                  title={`${seg.label}: ${unitLabel === 'g' ? `${seg.value.toFixed(1)}g` : `${Math.round(seg.value)} kcal`}`}
                                  className={`h-full ${isFirst ? 'rounded-l-full' : ''} ${remaining ? 'rounded-r-full' : ''}`}
                                  style={{
                                    width: `${widthPct}%`,
                                    backgroundColor: seg.color,
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                          <span>0</span>
                          <span
                            className={`font-semibold tabular-nums ${
                              tone === 'ok'
                                ? 'text-emerald-700'
                                : tone === 'over'
                                  ? 'text-amber-700'
                                  : 'text-sky-700'
                            }`}
                          >
                            {deltaLabel}
                          </span>
                          <span className="tabular-nums">{formatPrevisto}</span>
                        </div>
                      </div>
                    );
                  };

                  const nomeCurtoPorRefeicao: Record<RefeicaoKey, string> = {
                    cafe: 'Café',
                    lanche1: 'L.Manhã',
                    almoco: 'Almoço',
                    lanche2: 'L.Tarde',
                    jantar: 'Janta',
                  };

                  const rotuloOpcaoAtualPorRefeicao = (refeicaoKey: RefeicaoKey) => {
                    const slotIdx = parseSlotOpcaoIndex(
                      refeicaoKey,
                      plano.opcoesSelecionadas?.[refeicaoKey]
                    );
                    const slots =
                      normalizarSlotsRefeicao(plano.opcoesSlots?.[refeicaoKey]) ||
                      garantirOpcoesSlotsPorRefeicao(
                        refeicaoKey,
                        undefined,
                        null,
                        plano.modeloDia[refeicaoKey] || ''
                      );
                    const opcao =
                      slots.find((o) => o.id === slotOpcaoId(refeicaoKey, slotIdx)) ||
                      slots[slotIdx - 1] ||
                      null;
                    return rotuloOpcaoExibicao(opcao, slotIdx);
                  };

                  const itemResumoAtivo =
                    resumoPorRefeicao.find((item) => item.key === activeCardapioMeal) ||
                    resumoPorRefeicao[0];
                  const dProtAtivo = itemResumoAtivo.proteinaAtual - itemResumoAtivo.proteinaSugerida;
                  const dKcalAtivo = itemResumoAtivo.caloriasAtual - itemResumoAtivo.caloriasSugerida;
                  const nomeOpcaoAtivaResumo = rotuloOpcaoAtualPorRefeicao(itemResumoAtivo.key);

                  const segmentosProteina = resumoPorRefeicao.map((item) => ({
                    key: item.key,
                    label: nomeCurtoPorRefeicao[item.key],
                    value: item.proteinaAtual,
                    color: corPorRefeicao[item.key],
                  }));
                  const segmentosCalorias = resumoPorRefeicao.map((item) => ({
                    key: item.key,
                    label: nomeCurtoPorRefeicao[item.key],
                    value: item.caloriasAtual,
                    color: corPorRefeicao[item.key],
                  }));

                  return (
                    <div className="mt-4 rounded-2xl border border-gray-200/90 bg-white p-3 shadow-[0_8px_24px_-12px_rgba(76,203,122,0.12)] sm:p-4">
                      <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900 sm:text-lg">
                        <Activity className="h-5 w-5 text-blue-600" />
                        Resumo do dia
                      </h3>

                      <div className="rounded-2xl border border-gray-200/90 bg-gray-50/90 p-2 sm:p-3">
                        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                          {resumoPorRefeicao.map((item) => {
                            const selecionado = item.key === activeCardapioMeal;
                            const cor = COR_REFEICAO[item.key];
                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => {
                                  setActiveCardapioMeal(item.key);
                                  setActiveOpcaoSlot(
                                    parseSlotOpcaoIndex(item.key, plano.opcoesSelecionadas?.[item.key])
                                  );
                                }}
                                className={`min-w-0 rounded-xl border px-1 py-2.5 text-center text-[10px] font-semibold leading-tight transition-all sm:px-2 sm:text-xs ${
                                  selecionado ? 'shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                                style={
                                  selecionado
                                    ? {
                                        color: cor,
                                        borderColor: hexComAlpha(cor, '55'),
                                        backgroundColor: hexComAlpha(cor, '14'),
                                      }
                                    : {
                                        borderColor: '#E5E7EB',
                                      }
                                }
                                aria-current={selecionado ? 'true' : undefined}
                              >
                                <span
                                  className="mx-auto mb-1 block h-1 w-5 rounded-full"
                                  style={{ backgroundColor: hexComAlpha(cor, selecionado ? 'FF' : '66') }}
                                  aria-hidden
                                />
                                {nomeCurtoPorRefeicao[item.key]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-3 space-y-4">
                        <div>
                          <p className="mb-3 text-sm font-semibold text-gray-900">
                            {itemResumoAtivo.nome}{' '}
                            <span
                              className="font-medium"
                              style={{ color: COR_REFEICAO[itemResumoAtivo.key] }}
                            >
                              ({nomeOpcaoAtivaResumo})
                            </span>
                          </p>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {renderMacroBar(
                              'Proteína',
                              itemResumoAtivo.proteinaAtual,
                              itemResumoAtivo.proteinaSugerida,
                              `${itemResumoAtivo.proteinaAtual.toFixed(1)}g`,
                              `${itemResumoAtivo.proteinaSugerida.toFixed(1)}g`,
                              `${dProtAtivo >= 0 ? '+' : ''}${dProtAtivo.toFixed(1)}g`
                            )}
                            {renderMacroBar(
                              'Calorias',
                              itemResumoAtivo.caloriasAtual,
                              itemResumoAtivo.caloriasSugerida,
                              `${Math.round(itemResumoAtivo.caloriasAtual)} kcal`,
                              `${Math.round(itemResumoAtivo.caloriasSugerida)} kcal`,
                              `${dKcalAtivo >= 0 ? '+' : ''}${Math.round(dKcalAtivo)} kcal`
                            )}
                          </div>
                        </div>

                        <div
                          id={CARDAPIO_RESUMO_TOTAL_DIA_ID}
                          className="scroll-mt-20 border-t border-gray-200 pt-3"
                        >
                          <h4 className="mb-3 text-sm font-bold text-gray-900 sm:text-base">
                            Resumo total do dia
                          </h4>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {renderTotalGauge(
                              'Proteína total',
                              proteinaEscolhidaTotal,
                              proteinaSugeridaTotal,
                              'g',
                              proteinaEscolhidaTotal.toFixed(1),
                              `${proteinaSugeridaTotal.toFixed(1)}g`,
                              `${deltaProteinaTotal >= 0 ? '+' : ''}${deltaProteinaTotal.toFixed(1)}g`,
                              segmentosProteina
                            )}
                            {renderTotalGauge(
                              'Calorias totais',
                              caloriasEscolhidaTotal,
                              caloriasSugeridaTotal,
                              'kcal',
                              `${Math.round(caloriasEscolhidaTotal)}`,
                              `${Math.round(caloriasSugeridaTotal)} kcal`,
                              `${deltaCaloriasTotal >= 0 ? '+' : ''}${Math.round(deltaCaloriasTotal)} kcal`,
                              segmentosCalorias
                            )}
                          </div>
                          <div className="mt-3 space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                              Legenda das refeições
                            </p>
                            <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] text-gray-600">
                              {resumoPorRefeicao.map((item) => (
                                <span key={item.key} className="inline-flex items-center gap-1.5">
                                  <span
                                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                                    style={{ backgroundColor: corPorRefeicao[item.key] }}
                                  />
                                  {nomeCurtoPorRefeicao[item.key]}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
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
                <div className="sticky top-0 h-16 sm:h-20 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between z-20 gap-3">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 min-w-0 truncate">
                    Montar {refeicaoEmEdicao === 'cafe' ? 'Café da Manhã' : 
                            refeicaoEmEdicao === 'lanche1' ? 'Lanche da Manhã' :
                            refeicaoEmEdicao === 'almoco' ? 'Almoço' :
                            refeicaoEmEdicao === 'lanche2' ? 'Lanche da Tarde' : 'Jantar'}
                    {' '}· Opção {String(activeOpcaoSlot).padStart(2, '0')}
                  </h2>
                  <div className="flex items-center gap-2 shrink-0">
                    {habilitarPlanosTemplates ? (
                      <button
                        type="button"
                        onClick={() => setShowImportarPlanoModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-green-800 hover:bg-green-100"
                        title="Puxar refeição de um plano salvo"
                      >
                        <BookMarked className="h-4 w-4" />
                        <span className="hidden sm:inline">Puxar de um Plano</span>
                        <span className="sm:hidden">Planos</span>
                      </button>
                    ) : null}
                    <button
                      onClick={() => {
                        setRefeicaoEmEdicao(null);
                        setOpcaoSelecionadaTemp('');
                        setItensSelecionadosRefeicao({});
                        setMacrosRefeicaoAtual({ proteinaTotal_g: 0, caloriasTotal_kcal: 0 });
                        setAbaBuilderAtiva('proteina');
                        setObservacaoRefeicaoEmEdicao('');
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
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
                              
                              {/* Mobile: lista compacta + modal de porção */}
                              <div className="md:hidden rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100">
                                {itensDaAbaAtiva.map((item) => {
                                  const estaSelecionado = itensSelecionadosRefeicao[item.id] || false;
                                  const itemView = viewItemRefeicao(item);
                                  return (
                                    <div
                                      key={item.id}
                                      className={`flex items-start gap-2 px-2.5 py-2.5 ${
                                        estaSelecionado ? 'bg-green-50' : 'bg-white'
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => handleSelecionarItem(item.id, item.categoria)}
                                        className="min-w-0 flex-1 text-left"
                                      >
                                        <span
                                          className={`block text-sm leading-snug ${
                                            estaSelecionado
                                              ? 'text-green-900 font-semibold'
                                              : 'text-gray-800'
                                          }`}
                                        >
                                          {nomeBaseAlimento(itemView.nome)}
                                        </span>
                                        <span className="mt-0.5 block text-[11px] text-gray-500 tabular-nums">
                                          {itemView.peso_g ?? 100}g
                                          {itemView.quantidade && itemView.quantidade !== 1
                                            ? ` · ×${itemView.quantidade}`
                                            : ''}
                                          {itemView.unidade ? ` · ${itemView.unidade}` : ''}
                                          {' · '}
                                          {formatarResumoMacrosItem(
                                            itemRefeicaoSnapshotParaPlano(itemView)
                                          )}
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setPorcaoEditandoBuilder(itemView)}
                                        className="shrink-0 rounded-lg border border-green-200 bg-green-50 p-2 text-green-800 hover:bg-green-100"
                                        title="Editar porção"
                                        aria-label={`Editar porção de ${nomeBaseAlimento(itemView.nome)}`}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </button>
                                    </div>
                                  );
                                })}
                                {itensDaAbaAtiva.length === 0 ? (
                                  <p className="px-3 py-4 text-center text-sm text-gray-500">
                                    Nenhum item nesta categoria.
                                  </p>
                                ) : null}
                              </div>

                              {/* Desktop: colunas editáveis */}
                              <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-50 text-gray-600">
                                    <tr>
                                      <th className="px-2 py-2 text-left font-semibold min-w-[160px]">Item</th>
                                      <th className="px-1.5 py-2 text-center font-semibold w-[72px]">Peso</th>
                                      <th className="px-1.5 py-2 text-center font-semibold w-[56px]">Qtd</th>
                                      <th className="px-1.5 py-2 text-left font-semibold w-[88px]">Unidade</th>
                                      <th className="px-1.5 py-2 text-right font-semibold w-[64px]">Prot.</th>
                                      <th className="px-1.5 py-2 text-right font-semibold w-[72px]">Kcal</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                {itensDaAbaAtiva.map(item => {
                                  const estaSelecionado = itensSelecionadosRefeicao[item.id] || false;
                                  const itemView = viewItemRefeicao(item);
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
                                      <td className={`px-2 py-2 text-left align-middle ${estaSelecionado ? 'text-green-900 font-semibold' : 'text-gray-800'}`}>
                                        <span className="block leading-snug">{nomeBaseAlimento(itemView.nome)}</span>
                                        {(itemView.carboidrato_g !== undefined ||
                                          itemView.gordura_g !== undefined ||
                                          itemView.fibra_g !== undefined) && (
                                          <span className="mt-0.5 block text-[10px] font-normal text-gray-500 tabular-nums">
                                            {formatarResumoMacrosItem(
                                              itemRefeicaoSnapshotParaPlano(itemView)
                                            )}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-1.5 py-1.5 align-middle" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-0.5">
                                          <input
                                            type="number"
                                            min={1}
                                            step={1}
                                            value={itemView.peso_g ?? 100}
                                            onChange={(e) => {
                                              const v = Number(e.target.value);
                                              if (!Number.isFinite(v)) return;
                                              atualizarPorcaoItemBuilder(item.id, { peso_g: Math.max(1, v) });
                                            }}
                                            className="w-14 rounded border border-gray-300 px-1 py-1 text-center tabular-nums text-xs bg-white"
                                          />
                                          <span className="text-[10px] text-gray-500">g</span>
                                        </div>
                                      </td>
                                      <td className="px-1.5 py-1.5 align-middle" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          type="number"
                                          min={0.01}
                                          step={1}
                                          value={itemView.quantidade ?? 1}
                                          onChange={(e) => {
                                            const v = Number(e.target.value);
                                            if (!Number.isFinite(v)) return;
                                            atualizarPorcaoItemBuilder(item.id, { quantidade: Math.max(0.01, v) });
                                          }}
                                          className="w-12 mx-auto block rounded border border-gray-300 px-1 py-1 text-center tabular-nums text-xs bg-white"
                                        />
                                      </td>
                                      <td className="px-1.5 py-1.5 align-middle" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          type="text"
                                          value={itemView.unidade || ''}
                                          placeholder="ex. Unidade"
                                          maxLength={40}
                                          onChange={(e) =>
                                            atualizarPorcaoItemBuilder(item.id, { unidade: e.target.value })
                                          }
                                          className="w-full min-w-[72px] rounded border border-gray-300 px-1.5 py-1 text-xs bg-white"
                                        />
                                      </td>
                                      <td className={`px-1.5 py-2 text-right whitespace-nowrap align-middle tabular-nums ${estaSelecionado ? 'text-green-900 font-semibold' : 'text-gray-900'}`}>
                                        {itemView.proteina_g} g
                                      </td>
                                      <td className={`px-1.5 py-2 text-right whitespace-nowrap align-middle tabular-nums ${estaSelecionado ? 'text-green-900 font-semibold' : 'text-gray-900'}`}>
                                        {itemView.calorias_kcal}
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
                    
                    // Calcular calorias sugeridas (metas ETAPA 8 ou legado)
                    const caloriasSugerida = config.metaCalorias_kcal;
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
                                    <td className="px-2 py-2 font-medium text-gray-800">
                                      {nomeBaseAlimento(item.nome)}
                                    </td>
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
                            {(() => {
                              let carb: number | undefined;
                              let gord: number | undefined;
                              let fibra: number | undefined;
                              for (const it of itensSelecionadosResumo) {
                                if (it.carboidrato_g !== undefined) carb = (carb ?? 0) + it.carboidrato_g;
                                if (it.gordura_g !== undefined) gord = (gord ?? 0) + it.gordura_g;
                                if (it.fibra_g !== undefined) fibra = (fibra ?? 0) + it.fibra_g;
                              }
                              if (carb === undefined && gord === undefined && fibra === undefined) {
                                return null;
                              }
                              const parts = [
                                `${Math.round(macrosRefeicaoAtual.caloriasTotal_kcal)} kcal`,
                                `P ${macrosRefeicaoAtual.proteinaTotal_g.toFixed(1)}g`,
                              ];
                              if (carb !== undefined) parts.push(`C ${Math.round(carb * 10) / 10}g`);
                              if (gord !== undefined) parts.push(`G ${Math.round(gord * 10) / 10}g`);
                              if (fibra !== undefined) parts.push(`F ${Math.round(fibra * 10) / 10}g`);
                              return <p className="text-gray-500 tabular-nums">{parts.join(' • ')}</p>;
                            })()}
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

                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 space-y-2">
                    <label
                      htmlFor="obs-meal-builder"
                      className="block text-sm font-semibold text-gray-900"
                    >
                      Observação do{' '}
                      {refeicaoEmEdicao === 'cafe'
                        ? 'Café da Manhã'
                        : refeicaoEmEdicao === 'lanche1'
                          ? 'Lanche da Manhã'
                          : refeicaoEmEdicao === 'almoco'
                            ? 'Almoço'
                            : refeicaoEmEdicao === 'lanche2'
                              ? 'Lanche da Tarde'
                              : 'Jantar'}
                    </label>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      Única para esta refeição (não muda entre Proteína, Carboidrato, Gordura ou
                      Reguladores). Aparece no cardápio do paciente abaixo dos itens.
                    </p>
                    <textarea
                      id="obs-meal-builder"
                      value={observacaoRefeicaoEmEdicao}
                      onChange={(e) => setObservacaoRefeicaoEmEdicao(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="Ex.: Preferir preparo grelhado; se não tiver iogurte, pode trocar por coalhada."
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-400"
                    />
                  </div>
                </div>

                {showAddItemModal && (
                  <div className="fixed inset-0 z-30 bg-black/40 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900">Adicionar alimento</h3>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddItemModal(false);
                            resetAddItemModalState();
                          }}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setAddFoodMode('metanutri');
                              setAddItemErro(null);
                            }}
                            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                              addFoodMode === 'metanutri'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            METANUTRI
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAddFoodMode('taco');
                              setAddItemErro(null);
                            }}
                            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                              addFoodMode === 'taco'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            TACO
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAddFoodMode('manual');
                              setAddItemErro(null);
                            }}
                            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                              addFoodMode === 'manual'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            MANUAL
                          </button>
                        </div>

                        {addItemErro ? (
                          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                            {addItemErro}
                          </p>
                        ) : null}

                        {addFoodMode === 'metanutri' ? (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                  Buscar alimento
                                </label>
                                <input
                                  type="text"
                                  value={metaQuery}
                                  onChange={(e) => {
                                    setMetaQuery(e.target.value);
                                    setMetaSelecionado(null);
                                  }}
                                  placeholder="Buscar alimento..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                  Quantidade (g)
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  value={pesoNovoItem}
                                  onChange={(e) => {
                                    setPesoNovoItem(Number(e.target.value) || 1);
                                    setMetaPorcaoId('');
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>
                            </div>
                            {metaSelecionado && (metaSelecionado.porcoes?.length || 0) > 0 ? (
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                  Porção (opcional)
                                </label>
                                <select
                                  value={metaPorcaoId}
                                  onChange={(e) => {
                                    const id = e.target.value;
                                    setMetaPorcaoId(id);
                                    const p = metaSelecionado.porcoes.find((x) => x.id === id);
                                    if (p) {
                                      setPesoNovoItem(p.quantidadeG);
                                      setUnidadeNovoItem(p.nome);
                                    } else {
                                      setUnidadeNovoItem('');
                                    }
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                >
                                  <option value="">Personalizado (g)</option>
                                  {metaSelecionado.porcoes.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.nome} ({p.quantidadeG} g)
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : null}
                            <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200">
                              {loadingMeta ? (
                                <p className="p-3 text-sm text-gray-600 flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" /> Buscando...
                                </p>
                              ) : metaErro ? (
                                <p className="p-3 text-sm text-red-600">{metaErro}</p>
                              ) : metaQuery.trim().length < 2 ? (
                                <p className="p-3 text-sm text-gray-600">
                                  Digite ao menos 2 letras para buscar no METANUTRI.
                                </p>
                              ) : metaResultados.length === 0 ? (
                                <div className="p-3 space-y-2 text-sm text-gray-600">
                                  <p>Nenhum alimento encontrado no METANUTRI.</p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setAddFoodMode('taco');
                                      setTacoQuery(metaQuery);
                                    }}
                                    className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                  >
                                    Pesquisar na TACO
                                  </button>
                                </div>
                              ) : (
                                <ul className="divide-y divide-gray-100">
                                  {metaResultados.map((item) => (
                                    <li key={item.id}>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setMetaSelecionado(item);
                                          setMetaPorcaoId('');
                                          setUnidadeNovoItem('');
                                          setPesoNovoItem(item.baseQuantidade || 100);
                                        }}
                                        className={`w-full text-left px-3 py-2.5 text-sm ${
                                          metaSelecionado?.id === item.id
                                            ? 'bg-green-50 text-green-800'
                                            : 'hover:bg-gray-50'
                                        }`}
                                      >
                                        <p className="font-semibold text-gray-900">{item.nome}</p>
                                        <p className="text-[11px] text-gray-500">
                                          {ROTULO_SEGMENTO_ALIMENTO[item.segmento] || item.segmento}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-gray-600 tabular-nums">
                                          {formatMacroOrDashCardapio(item.energiaKcal)} kcal · P{' '}
                                          {formatMacroOrDashCardapio(item.proteinasG)} g · C{' '}
                                          {formatMacroOrDashCardapio(item.carboidratosG)} g · G{' '}
                                          {formatMacroOrDashCardapio(item.gordurasTotaisG)} g · F{' '}
                                          {formatMacroOrDashCardapio(item.fibrasG)} g
                                          <span className="text-gray-400">
                                            {' '}
                                            · por {item.baseQuantidade}
                                            {item.baseUnidade}
                                          </span>
                                        </p>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            {metaSelecionado ? (
                              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm space-y-1">
                                <p>
                                  <strong>{metaSelecionado.nome}</strong>
                                </p>
                                <p className="text-xs text-gray-600">
                                  Na porção de {Math.max(1, pesoNovoItem)} g:{' '}
                                  {formatMacroOrDashCardapio(
                                    roundNutriente(
                                      calcularNutrientePorPorcao(
                                        metaSelecionado.energiaKcal,
                                        Math.max(1, pesoNovoItem)
                                      ),
                                      0
                                    )
                                  )}{' '}
                                  kcal · P{' '}
                                  {formatMacroOrDashCardapio(
                                    roundNutriente(
                                      calcularNutrientePorPorcao(
                                        metaSelecionado.proteinasG,
                                        Math.max(1, pesoNovoItem)
                                      )
                                    )
                                  )}{' '}
                                  g · C{' '}
                                  {formatMacroOrDashCardapio(
                                    roundNutriente(
                                      calcularNutrientePorPorcao(
                                        metaSelecionado.carboidratosG,
                                        Math.max(1, pesoNovoItem)
                                      )
                                    )
                                  )}{' '}
                                  g · G{' '}
                                  {formatMacroOrDashCardapio(
                                    roundNutriente(
                                      calcularNutrientePorPorcao(
                                        metaSelecionado.gordurasTotaisG,
                                        Math.max(1, pesoNovoItem)
                                      )
                                    )
                                  )}{' '}
                                  g · F{' '}
                                  {formatMacroOrDashCardapio(
                                    roundNutriente(
                                      calcularNutrientePorPorcao(
                                        metaSelecionado.fibrasG,
                                        Math.max(1, pesoNovoItem)
                                      )
                                    )
                                  )}{' '}
                                  g
                                </p>
                                <p className="text-[11px] text-gray-500">
                                  Categoria no cardápio: aba atual (
                                  {abaBuilderAtiva === 'proteina'
                                    ? 'Proteína'
                                    : abaBuilderAtiva === 'carboidrato'
                                      ? 'Carboidrato'
                                      : abaBuilderAtiva === 'gordura'
                                        ? 'Gordura'
                                        : 'Reguladores'}
                                  ) — segmento nutricional não altera a categoria.
                                </p>
                              </div>
                            ) : null}
                          </>
                        ) : addFoodMode === 'taco' ? (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                  Buscar alimento
                                </label>
                                <input
                                  type="text"
                                  value={tacoQuery}
                                  onChange={(e) => setTacoQuery(e.target.value)}
                                  placeholder="Ex.: arroz, frango, aveia"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                  Peso (g)
                                </label>
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
                                <p className="p-3 text-sm text-gray-600">
                                  Digite ao menos 2 letras para buscar na TACO.
                                </p>
                              ) : (
                                <ul className="divide-y divide-gray-100">
                                  {tacoResultados.map((item) => (
                                    <li key={`${item.id ?? item.nome}-${item.nome}`}>
                                      <button
                                        type="button"
                                        onClick={() => setTacoSelecionado(item)}
                                        className={`w-full text-left px-3 py-2 text-sm ${
                                          tacoSelecionado?.nome === item.nome
                                            ? 'bg-green-50 text-green-800'
                                            : 'hover:bg-gray-50 text-gray-800'
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
                                  const prot =
                                    Math.round(tacoSelecionado.proteinas * fator * 10) / 10;
                                  const carb =
                                    Math.round(tacoSelecionado.carboidratos * fator * 10) / 10;
                                  const gord =
                                    Math.round(tacoSelecionado.gorduras * fator * 10) / 10;
                                  const kcal = Math.round(tacoSelecionado.calorias * fator);
                                  return (
                                    <div className="space-y-1">
                                      <p className="font-semibold text-gray-900">
                                        {tacoSelecionado.nome} (
                                        {Math.round(Math.max(1, pesoNovoItem))}g)
                                      </p>
                                      <p>
                                        {kcal} kcal · P {prot}g · C {carb}g · G {gord}g
                                      </p>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                  Nome do alimento
                                </label>
                                <input
                                  type="text"
                                  value={manualNome}
                                  onChange={(e) => setManualNome(e.target.value)}
                                  placeholder="Ex.: Panqueca proteica caseira"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                  Peso (g)
                                </label>
                                <input
                                  type="number"
                                  min={1}
                                  value={manualPeso}
                                  onChange={(e) => setManualPeso(Number(e.target.value) || 1)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                  Proteínas (g)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  step={0.1}
                                  value={manualProt}
                                  onChange={(e) => setManualProt(Number(e.target.value) || 0)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                  Calorias (kcal)
                                </label>
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  value={manualKcal}
                                  onChange={(e) => setManualKcal(Number(e.target.value) || 0)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                  Carboidrato (g) — opcional
                                </label>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={manualCarb}
                                  onChange={(e) => setManualCarb(e.target.value)}
                                  placeholder="—"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                  Gordura (g) — opcional
                                </label>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={manualGord}
                                  onChange={(e) => setManualGord(e.target.value)}
                                  placeholder="—"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                  Fibra (g) — opcional
                                </label>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={manualFibra}
                                  onChange={(e) => setManualFibra(e.target.value)}
                                  placeholder="—"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                />
                              </div>
                            </div>
                            <p className="text-xs text-gray-500">
                              O alimento será adicionado na categoria da aba atual (
                              {abaBuilderAtiva === 'proteina'
                                ? 'Proteína'
                                : abaBuilderAtiva === 'carboidrato'
                                  ? 'Carboidrato'
                                  : abaBuilderAtiva === 'gordura'
                                    ? 'Gordura'
                                    : 'Reguladores'}
                              ).
                            </p>
                          </>
                        )}
                      </div>
                      <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddItemModal(false);
                            resetAddItemModalState();
                          }}
                          className="px-4 py-2 rounded-md border border-gray-300 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (addFoodMode === 'metanutri') adicionarItemMetaNutriNaRefeicao();
                            else if (addFoodMode === 'taco') adicionarItemTacoNaRefeicao();
                            else adicionarItemManualNaRefeicao();
                          }}
                          disabled={
                            addFoodMode === 'metanutri'
                              ? !metaSelecionado
                              : addFoodMode === 'taco'
                                ? !tacoSelecionado
                                : false
                          }
                          className="px-4 py-2 rounded-md text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {addFoodMode === 'manual' ? 'Criar e adicionar' : 'Adicionar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {habilitarPlanosTemplates ? (
                  <ImportarRefeicaoDePlanoModal
                    aberto={showImportarPlanoModal}
                    refeicaoKey={refeicaoEmEdicao}
                    temSelecaoAtual={Object.values(itensSelecionadosRefeicao).some(Boolean)}
                    onFechar={() => setShowImportarPlanoModal(false)}
                    onImportar={importarRefeicaoDePlanoTemplate}
                  />
                ) : null}

                <EditarPorcaoItemModal
                  aberto={Boolean(porcaoEditandoBuilder)}
                  item={porcaoEditandoBuilder}
                  onFechar={() => setPorcaoEditandoBuilder(null)}
                  onConfirmar={(patch) => {
                    if (!porcaoEditandoBuilder) return;
                    atualizarPorcaoItemBuilder(porcaoEditandoBuilder.id, patch);
                    setPorcaoEditandoBuilder(null);
                  }}
                />
                
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
                      builderSelecaoDirtyRef.current = true;
                      
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
                      setObservacaoRefeicaoEmEdicao('');
                      setPorcaoEditandoBuilder(null);
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

          {/* Aba: Planos (somente MetaNutri) */}
          {activeTab === 'planos' && habilitarPlanosTemplates && (
            <div className="w-full max-w-full min-w-0">
              <NutriPlanosTemplatesPanel />
            </div>
          )}

          {/* Aba: ChatNutri */}
          {activeTab === 'chatnutri' && (
            <div className="flex flex-col gap-2 w-full max-w-full min-w-0 h-full min-h-0 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 shrink-0 min-w-0">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 min-w-0">
                  <MessageSquare className="h-5 w-5 text-green-600 shrink-0" />
                  ChatNutri
                </h2>
              </div>
              <ChatNutriPanel
                key={`chatnutri-${paciente.id}`}
                patientId={paciente.id}
                dateKey={chatNutriDateKey}
                onDateKeyChange={handleChatNutriDateInput}
                className="flex-1 min-h-0 w-full"
                {...chatNutriPanelAuthorProps}
              />
            </div>
          )}

          {activeTab === 'orientacoes' && modoNutricionista && (
            <NutriOrientacoesPanel
              pacienteId={paciente.id}
              pacienteNome={paciente.dadosIdentificacao?.nomeCompleto || paciente.nome}
              pacienteEmail={paciente.email}
              pacienteUserId={paciente.userId}
              canCompose={podeEditarNutri}
              authorName={chatNutriAuthorName}
              authorId={chatNutriAuthorId}
              authorRole={resolvedChatNutriAuthorKind === 'doctor' ? 'doctor' : 'nutritionist'}
            />
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
              <div className="min-w-0 overflow-hidden flex flex-col gap-6">
                <CheckInSemanalNutriEvolucao
                  pacienteId={paciente.id}
                  pacienteNome={paciente.dadosIdentificacao?.nomeCompleto || paciente.nome}
                  tratamentoSemana={calcularSemanaAtualTratamento(paciente)}
                  canFill={weeklyCaps.create}
                  viewerRole={weeklyViewerRole}
                  nutritionistId={resolveNutritionistIdForCheckIn({
                    actor:
                      weeklyViewerRole === 'nutritionist'
                        ? 'nutritionist'
                        : weeklyViewerRole === 'doctor'
                          ? 'doctor'
                          : 'patient',
                    actorId: chatNutriAuthorId,
                    nutricionistaVinculadoIds: paciente.nutricionistaVinculadoIds,
                  })}
                  hasLegacyDaily={checkIns.length > 0 || temMaisCheckIns}
                  focusWeekKey={historicoWeekFocus}
                  onStartCheckIn={() => abrirCheckInSemanal(getNutritionCheckInReferenceWeek().weekKey, 'create')}
                  onOpenWeek={(weekKey) =>
                    abrirCheckInSemanal(weekKey, weeklyCaps.edit ? 'edit' : 'view')
                  }
                  canDelete={weeklyCaps.delete}
                  onAdjustMenu={podeEditarNutri ? () => setActiveTab('cardapio') : undefined}
                />
                {(checkIns.length > 0 || temMaisCheckIns) ? (
                <details className="group">
                  <CheckInSemanalNutriHistoricoLegadoSummary />
                  <div className="mt-4 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                      <Calendar className="h-5 w-5" />
                    </span>
                    Check-ins diários anteriores
                  </h2>
                  {temMaisCheckIns && (
                    <button
                      type="button"
                      onClick={() => void loadMoreCheckIns()}
                      disabled={loadingMaisCheckIns}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-60"
                    >
                      {loadingMaisCheckIns ? 'Carregando...' : 'Carregar check-ins antigos'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5 lg:items-start min-w-0">
                  {/* Metade: calendário */}
                  <div className="min-w-0 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <div className="flex items-center gap-2 border-b border-gray-200 bg-gradient-to-r from-violet-50/70 via-white to-emerald-50/40 px-3 py-3">
                      <button
                        type="button"
                        onClick={() => mudarMes('anterior')}
                        className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                        aria-label="Mês anterior"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                      </button>
                      <span className="text-sm font-semibold text-gray-900 flex-1 text-center min-w-0 truncate">
                        {meses[mes]} {ano}
                      </span>
                      <button
                        type="button"
                        onClick={() => mudarMes('proximo')}
                        className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm"
                        aria-label="Próximo mês"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHistoricoMesCalendario(new Date());
                          setHistoricoDiaSelecionado(null);
                        }}
                        className="px-3 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors whitespace-nowrap shadow-sm"
                      >
                        Hoje
                      </button>
                    </div>

                    <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-100/80">
                      {diasSemana.map((diaSemana) => (
                        <div key={diaSemana} className="p-2 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wide text-gray-600">
                          {diaSemana}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 bg-white">
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
                            className={`min-h-[52px] sm:min-h-[64px] border border-gray-100 p-1 sm:p-1.5 transition-colors ${
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
                                    className={`inline-flex min-w-[1.9rem] items-center justify-center rounded-md px-1 py-0.5 text-[11px] sm:text-xs font-bold tabular-nums shadow-sm ${corBadge}`}
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

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-3 border-t border-gray-100 text-[11px] sm:text-xs text-gray-600 bg-gray-50/50">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        ≥ 80%
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-amber-400" />
                        60–79%
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        {'< 60%'}
                      </span>
                    </div>
                  </div>

                  {/* Metade: detalhes do dia selecionado */}
                  <div className="min-w-0 rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm lg:min-h-[28rem] flex flex-col">
                    <div className="shrink-0 border-b border-gray-200 bg-gradient-to-r from-emerald-50/50 via-white to-violet-50/40 px-4 py-3">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                        Detalhes do dia
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {historicoDiaSelecionado
                          ? historicoDiaSelecionado.toLocaleDateString('pt-BR', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })
                          : 'Selecione uma data no calendário'}
                      </p>
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5">
                      {loadingCheckIns ? (
                        <div className="text-center py-10">
                          <div className="animate-spin rounded-full h-9 w-9 border-2 border-emerald-600 border-t-transparent mx-auto mb-3" />
                          <p className="text-gray-600 text-sm">Carregando check-ins…</p>
                        </div>
                      ) : checkIns.length === 0 ? (
                        <div className="text-center py-10 rounded-xl border border-dashed border-gray-200 bg-gray-50/80">
                          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                          <p className="text-gray-700 font-medium">Nenhum check-in registrado ainda.</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {somenteVisualizacao || !CHECK_IN_DIARIO_NUTRI_ENABLED
                              ? 'Nenhum check-in diário neste dia. O acompanhamento atual é o Check-in Semanal.'
                              : 'Use o botão "Check-in Diário" para começar.'}
                          </p>
                        </div>
                      ) : !historicoDiaSelecionado ? (
                        <div className="h-full min-h-[12rem] flex items-center justify-center rounded-xl border border-dashed border-violet-200/80 bg-violet-50/40 p-6 text-center">
                          <p className="text-sm text-gray-700">
                            Clique em uma data no calendário para ver o detalhamento daquele dia.
                          </p>
                        </div>
                      ) : !checkInSelecionado ? (
                        <div className="h-full min-h-[12rem] flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/80 p-6 text-center">
                          <p className="text-sm text-gray-700">
                            Não há check-in neste dia.
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
                            className={`border-l-4 ${borderL} pl-3 sm:pl-4 space-y-5`}
                          >
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                                  Dia selecionado
                                </p>
                                <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight capitalize">
                                  {formatarDataCheckInCompleta(ci.data)}
                                </h3>
                              </div>
                              <div className="flex flex-wrap items-center gap-3">
                                <div
                                  className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white shadow-inner ring-4 ring-gray-100"
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
                                  <span className="relative text-sm font-extrabold tabular-nums text-gray-900">
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

                            <div className="grid gap-3 sm:grid-cols-2">
                              <MiniBar label="Aderência ao plano (autopercebida)" valuePct={aderenciaPlano} />
                              <MiniBar label="Alimentação & hidratação (4 metas)" valuePct={pctAlimentacao} />
                              <MiniBar label="Suplementos (3 itens)" valuePct={pctSuplementos} />
                              <MiniBar label="Energia / humor (escala 1–5)" valuePct={pctEnergia} />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
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

                              <div className="rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm">
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                  <Heart className="h-4 w-4 text-rose-500" />
                                  <h4 className="text-sm font-bold text-gray-900">Bem-estar & rotina</h4>
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                              <div className="space-y-3 rounded-lg bg-gray-50/80 p-4 ring-1 ring-gray-100/80">
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
                  </div>
                </details>
                ) : null}
              </div>
            );
          })()}
        </div>
      </div>
      </div>

      <MealDishPreviewModal
        open={Boolean(mealDishPreviewUrl)}
        onClose={() => setMealDishPreviewUrl(null)}
        mealName={refeicaoCardapioAtiva.nome}
        optionLabel={nomeOpcaoDraft.trim() || rotuloOpcaoExibicao(opcaoVisualizada, activeOpcaoSlot)}
        imageUrl={mealDishPreviewUrl || ''}
        accentColor={COR_REFEICAO[refeicaoCardapioAtiva.key]}
        items={itensResumoRefeicaoAtiva}
        observacao={observacaoRefeicaoAtiva}
        emptyItemsLabel={descricaoRefeicaoAtiva || 'Nenhum item nesta opção ainda.'}
      />

      <CardapioPrintModal
        open={cardapioPrintModalOpen}
        onClose={() => setCardapioPrintModalOpen(false)}
        contexto={
          cardapioPrintModalOpen && plano
            ? montarCardapioPdfContext(
                plano,
                opcoesRefeicoes,
                itensCustomizadosPorRefeicao,
                paciente,
                {
                  medicoNome:
                    pdfProfissionais.medicoNome ||
                    (resolvedChatNutriAuthorKind === 'doctor'
                      ? chatNutriAuthorName
                      : undefined),
                  nutricionistaNome:
                    pdfProfissionais.nutricionistaNome ||
                    (resolvedChatNutriAuthorKind === 'nutritionist'
                      ? chatNutriAuthorName
                      : undefined),
                }
              )
            : null
        }
      />
    </div>
  );
}
