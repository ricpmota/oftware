import type { EstimativaPlanoInicialV1 } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import type {
  ModalidadePlanoId,
  RitmoEscalonamentoId,
} from '@/lib/planoTerapeutico/modalidadesPlano';
import type {
  ParametrosPlanoPersonalizadoEditavel,
  StatusNegociacaoTerapeutica,
  VistaPropostaNegociacao,
} from '@/lib/treatment-negotiation/types';
import type { OrcamentoTerapeuticoConfig } from '@/types/orcamentoTerapeuticoConfig';
export type CenarioPlanoTipo = 'progressivo' | 'equilibrado' | 'intensivo';

export type StatusPlanoTerapeutico =
  | 'rascunho'
  | 'compartilhado'
  | 'aceito'
  | 'cancelado';

export type PlanoPacienteSignStatus =
  | 'link_gerado'
  | 'assinado'
  | 'erro_gerar_link'
  | null;

export type PontoCurvaPeso = {
  semana: number;
  pesoKg: number;
};

export type ComposicaoPlanoComercial = {
  custoMedicacaoBruto: number;
  descontoMedicacaoVolume: number;
  descontoMedicacaoVolumePercentual: number;
  custoMedicacaoLiquido: number;
  custoKits: number;
  consultasAcompanhamento: number;
  bioimpedancia: number;
  exames: number;
  outrosCustos: number;
  subtotal: number;
  margem: number;
  descontoManual: number;
};

export type CenarioPlanoTerapeutico = {
  tipo: CenarioPlanoTipo;
  rotulo: string;
  descricaoCurta: string;
  estimativa: EstimativaPlanoInicialV1;
  perdaSemanalKg: number;
  curvaPeso: PontoCurvaPeso[];
  composicao: ComposicaoPlanoComercial;
  valorTotal: number;
  guardrailAplicado: boolean;
  mensagemGuardrail?: string;
};

export type EscolhaPlanoPaciente = {
  modalidade: ModalidadePlanoId;
  mesesPrazo?: number;
  metaKg?: number;
  doseMensalMg?: number;
  ritmoEscalonamento?: RitmoEscalonamentoId;
  valorTotal: number;
  rotuloExibicao: string;
};

export type ContextoPacientePlanoPublico = {
  /** Primeiro nome ou identificador neutro — sem PII excessiva. */
  nomeExibicao: string;
  pesoAtualKg: number | null;
  pesoInicialKg: number | null;
  metaDescricao: string;
  metaKg: number | null;
  metaPercentual: number | null;
};

/** Proposta do plano personalizado negociado entre médico e paciente. */
export type NegociacaoTerapeuticaSalva = {
  status: StatusNegociacaoTerapeutica;
  enviadaEm: string;
  nomePlano: string;
  descricaoCurta: string;
  parametros: ParametrosPlanoPersonalizadoEditavel;
  mensagemPaciente?: string;
  vistaProposta?: VistaPropostaNegociacao;
};

export type PlanoTerapeuticoInterativoDocumento = {  id: string;
  pacienteId: string;
  medicoId: string;
  organizationId?: string | null;
  status: StatusPlanoTerapeutico;
  publicAccessToken: string;
  contextoPaciente: ContextoPacientePlanoPublico;
  metaKg: number | null;
  metaPercentual: number | null;
  cenarioSelecionado: CenarioPlanoTipo;
  cenarios: Record<CenarioPlanoTipo, CenarioPlanoTerapeutico>;
  configuracaoComercialUsada: Omit<
    OrcamentoTerapeuticoConfig,
    'medicoId' | 'createdAt' | 'updatedAt'
  >;
  valorTotal: number;
  descontoManual: number;
  versaoMotor: 'plano-terapeutico-v1';
  origemEstimativaEquilibrada: 'v2_deterministica' | 'oi';
  createdAt: string;
  updatedAt: string;
  compartilhadoEm?: string | null;
  escolhaPaciente?: EscolhaPlanoPaciente | null;
  escolhaPacienteEm?: string | null;
  negociacaoTerapeutica?: NegociacaoTerapeuticaSalva | null;
  pacienteAssinaturaNome?: string | null;
  publicUrl?: string | null;
  pdfUrl?: string | null;
  pdfParaAssinaturaPacienteUrl?: string | null;
  pdfFinalAssinadoUrl?: string | null;
  pdfAssinadoMedicoUrl?: string | null;
  medicoAssinadoEm?: string | null;
  acceptedAt?: string | null;
  pacienteSignStatus?: PlanoPacienteSignStatus;
  pacienteAssinadoEm?: string | null;
  bryEasySignEnvelopeId?: string | null;
};

export type PlanoTerapeuticoPdfResumoPayload = {
  prazoMeses: number;
  perdaSemanalMinKg: number;
  perdaSemanalMaxKg: number;
  doseTotalMg: number;
  aplicacoes: number;
  consultas: number;
};

export type PlanoTerapeuticoPublicoPayload = Omit<
  PlanoTerapeuticoInterativoDocumento,
  'publicAccessToken' | 'pacienteId' | 'medicoId'
>;
