// Tipos específicos para o sistema de obesidade com tirzepatida

import type { TipoExameImagem } from '@/lib/metaadmin/exameImagemExtracao';

export interface PacienteCompleto {
  id: string;
  userId: string; // Firebase Auth UID
  email: string;
  nome: string;
  medicoResponsavelId: string | null; // ID do médico (null quando abandonou)
  
  // Pasta 1: Dados de Identificação
  dadosIdentificacao: DadosIdentificacao;
  
  // Pasta 2: Dados Clínicos da Anamnese
  dadosClinicos: DadosClinicos;
  
  // Pasta 3: Estilo de Vida
  estiloVida: EstiloVida;
  
  // Pasta 4: Exames Laboratoriais
  examesLaboratoriais: ExamesLaboratoriais[];
  /** PDFs de exames de imagem (USG, TC, RM, etc.); ausente em pacientes antigos */
  examesDeImagem?: ExameDeImagemPaciente[];

  // Pasta 5: Plano Terapêutico
  planoTerapeutico: PlanoTerapeutico;
  
  // Pasta 6: Evolução / Seguimento
  evolucaoSeguimento: SeguimentoSemanal[];
  /** Marco Zero — primeiro registro do tratamento (semana 1). */
  marcoZero?: MarcoZero;
  
  // Pasta 7: Alertas e Eventos
  alertas: Alerta[];
  
  // Pasta 8: Comunicação e Registro
  comunicacao: Comunicacao;
  
  // Pasta 9: Dados Derivados / Indicadores
  indicadores: Indicadores;
  
  dataCadastro: Date;
  status: 'ativo' | 'inativo' | 'arquivado';
  statusTratamento: 'pendente' | 'em_tratamento' | 'concluido' | 'abandono';
  motivoAbandono?: string; // Preenchido quando statusTratamento = 'abandono'
  dataAbandono?: Date; // Data em que o paciente abandonou o tratamento
  medicoResponsavelAnteriorId?: string | null; // ID do médico que estava responsável antes do abandono (para estatísticas)
  /** Médico indicado por link (/dr) ou referral — solicitação pendente, ainda não aceita */
  medicoRecomendadoId?: string | null;
  recomendacoesLidas?: boolean; // Indica se o paciente leu e compreendeu as recomendações
  dataLeituraRecomendacoes?: Date; // Data em que o paciente leu as recomendações
  /** Versão do termo aceito na leitura obrigatória (ex.: v1 com etapa Aplicação). */
  recomendacoesTermoVersao?: string;
}

// Pasta 1: Dados de Identificação
export interface DadosIdentificacao {
  nomeCompleto: string;
  email: string;
  telefone?: string;
  cpf?: string;
  dataNascimento?: Date;
  sexoBiologico?: 'M' | 'F' | 'Outro';
  endereco: {
    rua?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
  };
  dataCadastro: Date;
}

/** Anamnese adaptativa V3 — blocos extras (modo completa), chat /meta */
export interface PerfilMetabolicoV3 {
  sono?: {
    qualidadeSono?: 'muito_bom' | 'bom' | 'regular' | 'ruim' | 'muito_ruim';
    horasSonoMedias?: 'menos_5' | '5_6' | '7_8' | 'mais_8';
    acordaCansado?: 'sim' | 'nao' | 'as_vezes';
    ronca?: 'sim' | 'nao' | 'nao_sei';
    acordaDuranteNoite?: 'sim' | 'nao' | 'as_vezes';
  };
  atividadeFisica?: {
    rotinaMovimento?: 'sedentario' | 'leve' | 'moderada' | 'intensa';
    dificuldades?: {
      faltaTempo?: boolean;
      dor?: boolean;
      desanimo?: boolean;
      nenhuma?: boolean;
    };
  };
  alimentacao?: {
    momentoMaisDificil?: 'manha' | 'tarde' | 'noite' | 'fim_de_semana';
    vontadeDoces?: 'sim' | 'nao' | 'as_vezes';
    beliscaEntreRefeicoes?: 'sim' | 'nao' | 'as_vezes';
    comeAnsiedadeEstresse?: 'sim' | 'nao' | 'as_vezes';
    perdaControleAlimentar?: 'sim' | 'nao' | 'as_vezes';
  };
  energia?: {
    nivelEnergiaDiaria?: 'alta' | 'media' | 'baixa' | 'muito_baixa';
    barreirasRotina?: {
      faltaTempo?: boolean;
      faltaMotivacao?: boolean;
      faltaPlanejamento?: boolean;
      faltaApoio?: boolean;
      nenhuma?: boolean;
    };
  };
  historicoEmagrecimento?: {
    jaTentouEmagrecer?: 'sim' | 'nao';
    recuperouPesoDepois?: 'sim' | 'nao' | 'nao_sei';
  };
  medicamentosPrevios?: {
    usouMedicacaoParaEmagrecer?: 'sim' | 'nao';
    medicacoes?: {
      semaglutida?: boolean;
      tirzepatida?: boolean;
      sibutramina?: boolean;
      orlistate?: boolean;
      outro?: boolean;
      nenhuma?: boolean;
      outroDescricao?: string;
    };
    teveEfeitosColaterais?: 'sim' | 'nao' | 'nao_aplicavel';
  };
  barreirasAdesao?: {
    faltaTempo?: boolean;
    faltaMotivacao?: boolean;
    custo?: boolean;
    efeitosColaterais?: boolean;
    rotinaCorrida?: boolean;
    faltaApoio?: boolean;
    nenhuma?: boolean;
    outro?: boolean;
    outroDescricao?: string;
  };
  expectativa?: {
    expectativaPerdaPeso?: 'ate_5kg' | '5_10kg' | '10_15kg' | 'mais_15kg' | 'nao_sei';
  };
}

export type AnamneseHighlightTipoV3 =
  | 'sono'
  | 'alimentacao'
  | 'atividade'
  | 'energia'
  | 'historico'
  | 'medicamentos'
  | 'barreiras'
  | 'expectativa'
  | 'risco';

export type AnamneseHighlightSeveridadeV3 = 'baixa' | 'moderada' | 'alta';

export type AnamneseNivelConfiancaV3 = 'baixo' | 'moderado' | 'alto';

export interface AnamneseHighlightV3 {
  tipo: AnamneseHighlightTipoV3;
  titulo: string;
  descricao: string;
  severidade: AnamneseHighlightSeveridadeV3;
}

/** Saída da análise Gemini (Etapa 5) — somente leitura no Metaadmin */
export interface AnamneseInteligenteV3 {
  resumoMedico: string;
  highlights: AnamneseHighlightV3[];
  barreirasAdesao: string[];
  pontosMedicoInvestigar: string[];
  perfilComportamental: string;
  nivelConfianca: AnamneseNivelConfiancaV3;
  geradoEm?: Date;
  modelo?: string;
}

// Pasta 2: Dados Clínicos da Anamnese
export interface DadosClinicos {
  /** Anamnese adaptativa V3: modo escolhido no início do chat /meta */
  tipoAvaliacaoInicial?: 'essencial' | 'completa';

  /** Blocos extras da anamnese completa (steps 19–26 do chat) */
  perfilMetabolicoV3?: PerfilMetabolicoV3;

  /** Resumo e highlights gerados por IA (botão manual no Metaadmin) */
  anamneseInteligenteV3?: AnamneseInteligenteV3;

  // 2.1 Medidas iniciais
  medidasIniciais?: {
    peso: number; // kg (20-400)
    altura: number; // cm (120-230)
    imc: number; // calculado automaticamente
    circunferenciaAbdominal: number; // cm (40-200)
    circunferenciaNaoInformada?: boolean;
  };

  // 2.2 Motivação em relação ao peso (entrevista V2)
  motivacao?: {
    estetica?: boolean;
    cansaco_falta_energia?: boolean;
    saude_exames_alterados?: boolean;
    autoestima?: boolean;
    dificuldade_emagrecer?: boolean;
    outro?: boolean;
  };
  motivacaoOutro?: string;

  // 2.3 Diagnóstico principal
  diagnosticoPrincipal?: {
    tipo:
      | 'dm1'
      | 'dm2'
      | 'obesidade'
      | 'sobrepeso_comorbidade'
      | 'pre_diabetes'
      | 'resistencia_insulinica'
      | 'sop_ri'
      | 'ehna_sem_dm2'
      | 'outro';
    outro?: string; // obrigatório se tipo='outro'
  };
  
  // 2.3 Comorbidades associadas
  comorbidades: {
    hipertensaoArterial?: boolean;
    dislipidemia?: boolean;
    apneiaObstrutivaSono?: boolean;
    esteatoseEHNA?: boolean;
    doencaCardiovascular?: boolean;
    doencaRenalCronica?: boolean;
    sop?: boolean;
    hipotireoidismo?: boolean;
    asmaDPOC?: boolean;
    transtornoAnsiedadeDepressao?: boolean;
    nenhuma?: boolean;
    outra?: boolean;
    outraDescricao?: string;
  };
  
  // 2.4 Medicações em uso atual
  medicacoesUsoAtual?: Medicacao[];
  
  // 2.5 Alergias
  alergias?: {
    semAlergias?: boolean;
    medicamentosa?: {
      farmaco: string;
      reacao: string;
    };
    alimento?: string;
    latexAdesivo?: string;
  };
  
  // 2.6 Riscos e condições que impactam a tirzepatida
  riscos?: {
    pancreatitePrevia: 'sim' | 'nao';
    gastroparesia: 'sim' | 'nao';
    historicoCMT_MEN2: 'sim' | 'nao' | 'desconheco';
    gestacao: 'sim' | 'nao' | 'desconheco';
    lactacao: 'sim' | 'nao';
  };
  
  // 2.7 História tireoidiana
  historiaTireoidiana?: 'eutireoidismo' | 'hipotireoidismo_tratado' | 'nodulo_bocio' | 'tireoidite_previa' | 'cmt_confirmado' | 'outro';
  historiaTireoidianaOutro?: string;
  
  // 2.8 Função renal
  funcaoRenal?: {
    egfr?: number; // ml/min/1,73m²
    estagioDRC?: 'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5' | 'desconheco';
  };
  
  // 2.9 Estilo de vida (movido para Pasta 3)
  
  // 2.10 Sintomas basais relacionados ao trato GI
  sintomasGI?: {
    plenitudePosPrandial?: boolean;
    nauseaLeve?: boolean;
    constipacao?: boolean;
    refluxoPirose?: boolean;
    nenhum?: boolean;
  };
  
  // 2.11 Objetivos do tratamento
  objetivosTratamento?: {
    perdaPeso10Porcento?: boolean;
    hba1cMenor68?: boolean;
    reducaoCircunferencia10cm?: boolean;
    remissaoPreDiabetes?: boolean;
    melhoraEHNA?: boolean;
    mais_energia?: boolean;
    melhora_autoestima?: boolean;
    outro?: boolean;
    outroDescricao?: string;
  };
}

export interface Medicacao {
  categoria: 'metformina' | 'sglt2i' | 'insulina' | 'statina' | 'anti_hipertensivo' | 'antidepressivo' | 'outro';
  nomeFarmaco: string;
  dose: string;
  frequencia: string;
}

// Pasta 3: Estilo de Vida
export interface EstiloVida {
  // 3.1 Padrão alimentar
  padraoAlimentar?: 'equilibrada' | 'hipercalorico_noturno' | 'ultraprocessados' | 'baixo_proteico' | 'hiperproteico' | 'jejum_intermitente' | 'vegetariano_vegano' | 'outro';
  padraoAlimentarOutro?: string;
  
  // 3.2 Frequência alimentar
  frequenciaAlimentar?: '2_ou_menos' | '3' | '4_a_5' | '6_ou_mais';
  
  // 3.3 Ingestão de líquidos
  hidratacaoLitros?: number; // 0.5-6
  
  // 3.4 Atividade física
  atividadeFisica?: 'sedentario' | 'leve' | 'moderada' | 'intensa' | 'profissional';
  tipoAtividade?: string;
  
  // 3.5 Uso de álcool
  usoAlcool?: 'nao_consome' | 'social' | 'frequente' | 'abuso';
  
  // 3.6 Tabagismo
  tabagismo?: 'nunca' | 'ex_fumante_menos_5' | 'ex_fumante_mais_5' | 'atual_ate_10' | 'atual_mais_10';
  
  // 3.7 Sono
  horasSono?: number; // 3-12
  
  // 3.8 Estresse e bem-estar
  nivelEstresse?: 'baixo' | 'moderado' | 'elevado' | 'muito_elevado';
  observacoesEstresse?: string;
  
  // 3.9 Suporte multiprofissional
  suporte?: {
    nutricionista?: boolean;
    psicologo?: boolean;
    educadorFisico?: boolean;
    semAcompanhamento?: boolean;
  };
  
  // 3.10 Expectativas do tratamento
  expectativasTratamento?: {
    reduzirPeso10porcento?: boolean;
    controlarGlicemia?: boolean;
    melhorarDisposicao?: boolean;
    reduzirCircunf10cm?: boolean;
    reverterPreDiabetes?: boolean;
    melhorarAutoestima?: boolean;
    outro?: boolean;
    outroDescricao?: string;
  };
  
  // 3.11 Observações clínicas
  observacoesClinicas?: string;
}

// Pasta 4: Exames Laboratoriais
export interface ExamesLaboratoriais {
  id: string;
  dataColeta: Date;
  glicemiaJejum?: number; // mg/dL
  hemoglobinaGlicada?: number; // %
  ureia?: number; // mg/dL
  creatinina?: number; // mg/dL
  taxaFiltracaoGlomerular?: number; // TFG
  tgo?: number; // AST
  tgp?: number; // ALT
  ggt?: number;
  fosfataseAlcalina?: number;
  amilase?: number;
  lipase?: number;
  colesterolTotal?: number;
  hdl?: number;
  ldl?: number;
  triglicerides?: number;
  tsh?: number;
  t4Livre?: number;
  calcitonina?: number;
  ferritina?: number; // ng/mL
  ferroSerico?: number; // µg/dL
  vitaminaB12?: number; // pg/mL
  vitaminaD?: number; // ng/mL (25-OH vitamina D)
  hemogramaCompleto?: {
    hemoglobina?: number;
    hematocrito?: number;
    leucocitos?: number;
    plaquetas?: number;
  };
}

/** Metadados + ficheiro no Storage (privado via storagePath ou URL pública legada). */
export interface ExameDeImagemPaciente {
  id: string;
  nomeArquivo: string;
  /** MIME guardado no upload (ex.: image/jpeg) — usado na pré-visualização */
  mimeArquivo?: string | null;
  tipoExame: TipoExameImagem;
  dataExame: string | null;
  nomePacienteDocumento: string | null;
  resumoEquipamentoOuRegiao?: string | null;
  /** Caminho no bucket (objeto privado); visualização via URL assinada */
  storagePath?: string;
  /** Upload antigo com makePublic — ainda exibido direto no iframe */
  pdfUrl?: string | null;
  criadoEm?: string;
}

// Pasta 5: Plano Terapêutico
export interface PlanoTerapeutico {
  // 5.1 Metadados do plano
  startDate?: Date;
  injectionDayOfWeek?: 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';
  responsibleDoctorId?: string;
  consentSigned?: boolean;
  numeroSemanasTratamento?: number; // Número de semanas do tratamento (padrão: 18, pode ser ampliado)
  
  // 5.2 Dose e titulação
  currentDoseMg?: 1.25 | 2.5 | 5 | 7.5 | 10 | 12.5 | 15;
  lastDoseChangeAt?: Date;
  nextReviewDate?: Date;
  titrationStatus?: 'INICIADO' | 'EM_TITULACAO' | 'MANUTENCAO' | 'PAUSADO' | 'ENCERRADO';
  titrationNotes?: string;
  // Esquema de doses customizado por semana (semana: dose em mg)
  // Se presente, sobrescreve o cálculo automático para as semanas especificadas
  esquemaDosesCustomizado?: { [semana: number]: number };
  // Semanas canceladas/puladas (array de números das semanas)
  semanasCanceladas?: number[];
  
  // Histórico (mantido compatibilidade)
  historicoDoses?: HistoricoDose[];
  
  // 5.3 Metas do tratamento
  metas: {
    /** true quando o paciente definiu metas pelo chat /meta ou o médico ativou no metaadmin */
    metasTratamentoModuloAtivo?: boolean;
    /** Switch: usar meta de perda de peso (barras / gráficos). */
    metaPerdaPesoAtiva?: boolean;
    /** Switch: usar meta de redução de circunferência abdominal (requer medida inicial). */
    metaReducaoCinturaAtiva?: boolean;
    weightLossTargetType?: 'PERCENTUAL' | 'PESO_ABSOLUTO';
    weightLossTargetValue?: number;
    targetWeightKg?: number;
    hba1cTargetType?: '≤7.0' | '≤6.8' | '≤6.5';
    waistReductionTargetCm?: number;
    secondaryGoals?: {
      remissaoPreDiabetes?: boolean;
      melhoraEHNA?: boolean;
      reducaoTG?: boolean;
      reducaoPA?: boolean;
      outro?: boolean;
      outroDescricao?: string;
    };
  };
  
  // 5.4 Plano comportamental
  nutritionPlan?: 'Hipocalórico balanceado' | 'Low-carb moderado' | 'Mediterrâneo' | 'Proteína priorizada' | 'Personalizado';
  nutritionNotes?: string;
  activityPlan?: 'Iniciante' | 'Moderado' | 'Vigoroso' | 'Personalizado';
  activityNotes?: string;
  supportPlan?: {
    nutricionista?: boolean;
    psicologia?: boolean;
    educacaoFisica?: boolean;
    grupoApoio?: boolean;
  };
  
  // 5.8 Campos auxiliares de auditoria
  educationDelivered?: boolean;
  informedRisksDiscussed?: boolean;
  carePlanPdfUrl?: string;
  auditNotes?: string;
  
  // Deprecated (mantido para compatibilidade)
  dataInicioTratamento?: Date;
  doseAtual?: {
    quantidade: number;
    frequencia: 'semanal';
    dataUltimaAjuste?: Date;
  };
  proximaRevisao?: Date;
  observacoesClinicas?: string;

  /** Conclusão do ciclo atual (peso final, depoimento, etc.) */
  conclusaoTratamento?: Record<string, unknown>;
  /** Conclusões anteriores preservadas ao reabrir tratamento (ver utils/conclusaoTratamentoHistorico) */
  historicoConclusoesTratamento?: Record<string, unknown>[];
}

export interface HistoricoDose {
  data: Date;
  dose: number; // mg
  observacoes?: string;
}

// Pasta 6: Evolução / Seguimento Semanal
export interface MarcoZero {
  pesoInicial: number;
  circunferenciaInicial?: number;
  motivacaoPrincipal: string;
  satisfacaoAtual: string;
  objetivoPaciente: string;
  confiancaNoObjetivo: string;
  possuiFotosIniciais: boolean;
  createdAt?: Date;
}

export interface CheckInSemanal {
  fomeSemana?: string;
  periodoMaisFome?: string;
  saciedadeAoComer?: string;
  consumoAgua?: string;
  consumoProteinas?: string;
  satisfacaoEvolucao?: string;
  comentarioSemana?: string;
  preenchidoEm?: Date;
}

export interface CheckInSemanalScore {
  score: number;
  categoria: 'excelente' | 'boa' | 'moderada' | 'atencao' | 'necessita_acompanhamento';
  medalha: 'ouro' | 'prata' | 'bronze' | 'sem_medalha';
  titulo: string;
  mensagemPaciente: string;
  fatoresPositivos: string[];
  pontosDeAtencao: string[];
  pontos: {
    peso?: number;
    circunferencia?: number;
    fomeSemana?: number;
    saciedadeAoComer?: number;
    satisfacaoEvolucao?: number;
  };
  createdAt?: Date;
  semana?: number;
  applicationId?: string;
}

export interface SeguimentoSemanal {
  id: string;
  weekIndex: number; // número da semana desde o início
  dataRegistro: Date;
  peso?: number; // kg
  circunferenciaAbdominal?: number; // cm
  pressaoArterial?: {
    sistolica: number;
    diastolica: number;
  };
  frequenciaCardiaca?: number;
  hba1c?: number; // %
  doseAplicada?: {
    quantidade: number; // mg
    data: Date;
    horario: string;
  };
  adesao?: 'pontual' | 'atrasada' | 'esquecida' | 'ON_TIME' | 'LATE_<96H' | 'MISSED';
  adherence?: 'ON_TIME' | 'LATE_<96H' | 'MISSED'; // novo campo
  giSeverity?: 'LEVE' | 'MODERADO' | 'GRAVE';
  efeitosColaterais?: EfeitoColateral[];
  /** Tipos alinhados ao `alertEngine` e `AlertaType` (Pasta 7). */
  alerts?: AlertaType[];
  localAplicacao?: 'abdome' | 'coxa' | 'braco';
  marcoZero?: MarcoZero;
  checkInSemanal?: CheckInSemanal;
  checkInSemanalScore?: CheckInSemanalScore;
  observacoesPaciente?: string;
  comentarioMedico?: string;
}

export interface EfeitoColateral {
  tipo: string;
  grau: 'leve' | 'moderado' | 'grave';
  observacoes?: string;
}

// Pasta 7: Alertas e Eventos Importantes
export interface Alerta {
  id: string;
  type: AlertaType;
  description: string;
  severity: 'INFO' | 'MODERATE' | 'CRITICAL';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  generatedAt: Date;
  resolvedAt?: Date;
  linkedWeek?: number;
  followUpRequired: boolean;
}

export type AlertaType = 
  | 'MISSED_DOSE'
  | 'GI_MILD'
  | 'GI_SEVERE'
  | 'PREGNANCY_FLAG'
  | 'MEN2_RISK'
  | 'PANCREATITIS_SUSPECTED'
  | 'RENAL_DECLINE'
  | 'HYPOGLYCEMIA_RISK'
  | 'LAB_ABNORMAL'
  | 'EDEMA_SEVERE'
  | 'TECHNICAL_EVENT';

// Pasta 8: Comunicação e Registro
export interface Comunicacao {
  mensagens: MensagemClinica[];
  anexos: Anexo[];
  termoConsentimento?: {
    assinado: boolean;
    dataAssinatura?: Date;
    tipo: 'digital' | 'upload';
    arquivoUrl?: string;
  };
  logsAuditoria: LogAuditoria[];
}

export interface MensagemClinica {
  id: string;
  data: Date;
  remetente: 'medico' | 'paciente';
  mensagem: string;
  lida: boolean;
}

export interface Anexo {
  id: string;
  nome: string;
  tipo: 'exame' | 'receita' | 'relatorio' | 'outro';
  url: string;
  dataUpload: Date;
}

export interface LogAuditoria {
  id: string;
  data: Date;
  usuario: string;
  acao: string;
  detalhes?: string;
}

// Pasta 9: Dados Derivados / Indicadores
export interface Indicadores {
  evolucaoPonderal?: {
    percentualPerdaPeso: number;
    pesoInicial: number;
    pesoAtual: number;
  };
  tempoEmTratamento: {
    dias: number;
    semanas: number;
  };
  tendenciaHba1c?: {
    ultimoValor: number;
    penultimoValor?: number;
    tendencia: 'melhorando' | 'piorando' | 'estavel';
  };
  tendenciaTfg?: {
    ultimoValor: number;
    penultimoValor?: number;
    tendencia: 'melhorando' | 'piorando' | 'estavel';
  };
  adesaoMedia: number; // %
  incidenciaEfeitosAdversos: {
    total: number;
    grave: number;
    moderado: number;
    leve: number;
  };
}

