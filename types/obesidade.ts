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
  localizacaoGeografica?: {
    latitude: number;
    longitude: number;
  };
  dataCadastro: Date;
}

// Pasta 2: Dados Clínicos da Anamnese
export interface DadosClinicos {
  diagnosticoPrincipal?: string; // Diabetes tipo 2, Obesidade, Pré-diabetes, etc.
  imcInicial?: {
    peso: number; // kg
    altura: number; // m
    imc: number; // calculado
  };
  circunferenciaAbdominal?: number; // cm
  comorbidades: {
    hipertensaoArterial?: boolean;
    dislipidemia?: boolean;
    apneiaSono?: boolean;
    esteatoseHepatica?: boolean;
    sop?: boolean; // Síndrome dos ovários policísticos
    outras?: string[];
  };
  medicacoesUsoAtual?: string[];
  alergias?: string[];
  historicoPancreatico?: {
    pancreatitePrevia: boolean;
    observacoes?: string;
  };
  gastroparesia?: boolean;
  historicoFamiliarCMT?: boolean; // Carcinoma medular de tireoide
  historicoTireoide?: string;
  doencaRenal?: {
    tem: boolean;
    estagio?: 'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5';
  };
  gestacaoLactacao?: {
    gestacao: boolean;
    lactacao: boolean;
  };
}

// Pasta 3: Estilo de Vida
export interface EstiloVida {
  padraoAlimentar?: string;
  nivelAtividadeFisica?: {
    frequencia?: string;
    tipo?: string;
  };
  usoAlcool?: {
    frequencia?: string;
    quantidade?: string;
  };
  tabagismo?: 'nunca' | 'ex-fumante' | 'atual';
  horasMediasSono?: number;
  nivelEstresseAnsiedade?: string;
  expectativasTratamento?: string;
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
  dataInicioTratamento?: Date;
  doseAtual?: {
    quantidade: number; // mg
    frequencia: 'semanal';
    dataUltimaAjuste?: Date;
  };
  historicoDoses?: HistoricoDose[];
  proximaRevisao?: Date;
  observacoesClinicas?: string;
  metas: {
    pesoAlvo?: number;
    hba1cAlvo?: number;
    imcDesejado?: number;
    dataPrevistaReavaliacao?: Date;
  };
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

