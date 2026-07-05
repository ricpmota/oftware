/**
 * Tipos públicos da OI (Oftware Intelligence).
 * Telas e APIs devem consumir apenas OIService — não importar benchmarks diretamente.
 */

/** Versão semântica do modelo estatístico (ver lib/oi/OIVersion.ts). */
export type OIModelVersion = string;

/** Nível de confiança da análise — regra substituível em lib/oi/OIHelpers.ts. */
export enum OIConfiabilidade {
  Baixa = 'baixa',
  Media = 'media',
  Alta = 'alta',
  MuitoAlta = 'muito_alta',
}

/** Faixa de IMC inicial para segmentação. */
export enum FaixaIMC {
  Abaixo27 = 'abaixo_27',
  Imc27_30 = 'imc_27_30',
  Imc30_35 = 'imc_30_35',
  Imc35_40 = 'imc_35_40',
  ImcAcima40 = 'imc_acima_40',
  NaoInformado = 'nao_informado',
}

/** Faixa de peso inicial (kg). */
export enum FaixaPeso {
  Ate80 = 'peso_ate_80',
  Entre80_100 = 'peso_80_100',
  Acima100 = 'peso_acima_100',
  NaoInformado = 'nao_informado',
}

/** Faixa de meta de perda percentual — alinhada à exportação Etapa 2. */
export enum FaixaMeta {
  Ate5 = 'ate_5',
  Entre5_10 = '5_a_10',
  Entre10_15 = '10_a_15',
  Entre15_20 = '15_a_20',
  Acima20 = 'acima_20',
  NaoInformado = 'nao_informado',
}

/** Faixa etária. */
export enum FaixaEtaria {
  Faixa18_29 = 'faixa_18_29',
  Faixa30_39 = 'faixa_30_39',
  Faixa40_49 = 'faixa_40_49',
  Faixa50_59 = 'faixa_50_59',
  Faixa60Mais = 'faixa_60_mais',
  NaoInformado = 'nao_informado',
}

/** Perfil clínico extraído de PacienteCompleto para consulta OI. */
export type OIPerfilPaciente = {
  pesoInicialKg: number | null;
  pesoAtualKg: number | null;
  imcInicial: number | null;
  idade: number | null;
  sexo: 'M' | 'F' | 'Outro' | 'NaoInformado';
  metaKg: number | null;
  metaPercentual: number | null;
  faixaIMC: FaixaIMC;
  faixaPeso: FaixaPeso;
  faixaMeta: FaixaMeta;
  faixaEtaria: FaixaEtaria;
};

/** Resultado da análise estatística OI para um paciente. */
export interface OIAnalysis {
  versaoModelo: OIModelVersion;
  pacientesSemelhantes: number;
  confiabilidade: OIConfiabilidade;
  faixaMeta: FaixaMeta;
  faixaIMC: FaixaIMC;
  faixaPeso: FaixaPeso;
  faixaEtaria: FaixaEtaria;
  tempoEstimadoSemanas: number | null;
  tempoMinimoSemanas: number | null;
  tempoMaximoSemanas: number | null;
  mgEstimado: number | null;
  mgMinimo: number | null;
  mgMaximo: number | null;
  aplicacoesEstimadas: number | null;
  aplicacoesMinimas: number | null;
  aplicacoesMaximas: number | null;
  perdaMediaKg: number | null;
  perdaMediaPercentual: number | null;
  probabilidadeAtingirMeta: number | null;
  benchmarkUtilizado: string | null;
  observacoes: string[];
}
