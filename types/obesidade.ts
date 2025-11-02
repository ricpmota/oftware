// Tipos específicos para o sistema de obesidade com tirzepatida

export interface PacienteCompleto {
  id: string;
  userId: string; // Firebase Auth UID
  email: string;
  nome: string;
  medicoResponsavelId: string; // ID do médico
  
  // Pasta 1: Dados de Identificação
  dadosIdentificacao: DadosIdentificacao;
  
  // Pasta 2: Dados Clínicos da Anamnese
  dadosClinicos: DadosClinicos;
  
  // Pasta 3: Estilo de Vida
  estiloVida: EstiloVida;
  
  // Pasta 4: Exames Laboratoriais
  examesLaboratoriais: ExamesLaboratoriais[];
  
  // Pasta 5: Plano Terapêutico
  planoTerapeutico: PlanoTerapeutico;
  
  // Pasta 6: Evolução / Seguimento
  evolucaoSeguimento: SeguimentoSemanal[];
  
  // Pasta 7: Alertas e Eventos
  alertas: Alerta[];
  
  // Pasta 8: Comunicação e Registro
  comunicacao: Comunicacao;
  
  // Pasta 9: Dados Derivados / Indicadores
  indicadores: Indicadores;
  
  dataCadastro: Date;
  status: 'ativo' | 'inativo' | 'arquivado';
  statusTratamento: 'pendente' | 'em_tratamento' | 'concluido';
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

// Pasta 2: Dados Clínicos da Anamnese
export interface DadosClinicos {
  // 2.1 Medidas iniciais
  medidasIniciais?: {
    peso: number; // kg (20-400)
    altura: number; // cm (120-230)
    imc: number; // calculado automaticamente
    circunferenciaAbdominal: number; // cm (40-200)
  };
  
  // 2.2 Diagnóstico principal
  diagnosticoPrincipal?: {
    tipo: 'dm2' | 'obesidade' | 'sobrepeso_comorbidade' | 'pre_diabetes' | 'resistencia_insulinica' | 'sop_ri' | 'ehna_sem_dm2' | 'outro';
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
  hemogramaCompleto?: {
    hemoglobina?: number;
    hematocrito?: number;
    leucocitos?: number;
    plaquetas?: number;
  };
}

// Pasta 5: Plano Terapêutico
export interface PlanoTerapeutico {
  // 5.1 Metadados do plano
  startDate?: Date;
  injectionDayOfWeek?: 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom';
  responsibleDoctorId?: string;
  consentSigned?: boolean;
  
  // 5.2 Dose e titulação
  currentDoseMg?: 2.5 | 5 | 7.5 | 10 | 12.5 | 15;
  lastDoseChangeAt?: Date;
  nextReviewDate?: Date;
  titrationStatus?: 'INICIADO' | 'EM_TITULACAO' | 'MANUTENCAO' | 'PAUSADO' | 'ENCERRADO';
  titrationNotes?: string;
  
  // Histórico (mantido compatibilidade)
  historicoDoses?: HistoricoDose[];
  
  // 5.3 Metas do tratamento
  metas: {
    weightLossTargetType?: 'PERCENTUAL' | 'PESO_ABSOLUTO';
    weightLossTargetValue?: number;
    targetWeightKg?: number;
    hba1cTargetType?: '≤7.0' | '≤6.8' | '≤6.5';
    waistReductionTargetCm?: 5 | 10 | 15;
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
}

export interface HistoricoDose {
  data: Date;
  dose: number; // mg
  observacoes?: string;
}

// Pasta 6: Evolução / Seguimento Semanal
export interface SeguimentoSemanal {
  id: string;
  dataRegistro: Date;
  peso?: number; // kg
  circunferenciaAbdominal?: number; // cm
  pressaoArterial?: {
    sistolica: number;
    diastolica: number;
  };
  frequenciaCardiaca?: number;
  doseAplicada?: {
    quantidade: number; // mg
    data: Date;
    horario: string;
  };
  adesao?: 'pontual' | 'atrasada' | 'esquecida';
  efeitosColaterais?: EfeitoColateral[];
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
  tipo: AlertaTipo;
  prioridade: 'baixa' | 'media' | 'alta' | 'critica';
  data: Date;
  mensagem: string;
  lido: boolean;
  resolvido: boolean;
}

export type AlertaTipo = 
  | 'dose_nao_aplicada'
  | 'nausea_grave'
  | 'gestacao_detectada'
  | 'drg_grave'
  | 'historico_men2_cmt'
  | 'pancreatite_suspeita'
  | 'outro';

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

