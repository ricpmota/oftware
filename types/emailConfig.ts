// Tipos para configuração de e-mails automáticos para leads

export type EmailTipo = 'email1' | 'email2' | 'email3' | 'email4' | 'email5';
export type EmailModulo = 'leads' | 'solicitado_medico' | 'em_tratamento' | 'novo_lead_medico' | 'aplicacao' | 'lead_avulso' | 'check_recomendacoes' | 'bem_vindo' | 'novidades';

export interface EmailTemplate {
  assunto: string;
  corpoHtml: string;
  corpoTexto?: string;
}

export interface EmailConfig {
  id?: string;
  // Módulo 1: Leads - 5 e-mails diferentes
  leads: {
    email1: EmailTemplate; // Imediato (10min)
    email2: EmailTemplate; // 24 horas
    email3: EmailTemplate; // 72 horas (3 dias)
    email4: EmailTemplate; // 7 dias
    email5: EmailTemplate; // 14 dias
  };
  // Módulo 2: Solicitado Médico - 1 e-mail de boas-vindas
  solicitado_medico: {
    boas_vindas: EmailTemplate; // Enviado quando solicitacao_medico status = 'aceita'
  };
  // Módulo 3: Em Tratamento - 1 e-mail quando plano de tratamento é editado
  em_tratamento: {
    plano_editado: EmailTemplate; // Enviado quando plano de tratamento é editado pelo médico
  };
  // Módulo 4: Novo Lead Médico - Avisa ao médico que chegou um novo lead
  novo_lead_medico: {
    novo_lead: EmailTemplate; // Enviado quando uma nova solicitacao_medico é criada
  };
  // Módulo 5: Aplicação - 2 e-mails sobre aplicações do tratamento
  aplicacao: {
    aplicacao_antes: EmailTemplate; // Enviado 1 dia antes da aplicação
    aplicacao_dia: EmailTemplate; // Enviado no dia da aplicação
  };
  // Módulo 6: Lead Avulso - Aviso de novo lead para o Gestor Admin geral
  lead_avulso: {
    novo_lead: EmailTemplate; // Enviado quando há um novo lead no /metaadmingeral
  };
  // Módulo 7: Check Recomendações - Avisa ao médico que o paciente leu as recomendações
  check_recomendacoes: {
    recomendacoes_lidas: EmailTemplate; // Enviado quando paciente lê recomendações
  };
  // Módulo 8: Bem-vindo - E-mails automáticos de boas-vindas
  bem_vindo: {
    bem_vindo_geral: EmailTemplate; // Enviado automaticamente quando um novo cliente se cadastra
    bem_vindo_medico: EmailTemplate; // Enviado quando um médico salva o perfil pela primeira vez
  };
  // Módulo 9: Novidades - E-mail em massa para pacientes ou médicos
  novidades: {
    novidade: EmailTemplate; // Template de e-mail para novidades
  };
  // Configuração de envio automático (apenas para leads)
  envioAutomatico: {
    ativo: boolean;
  };
  // Data de criação/atualização
  createdAt?: Date;
  updatedAt?: Date;
}

export interface EmailEnvio {
  id: string;
  leadId: string;
  leadEmail: string;
  leadNome: string;
  emailTipo: EmailTipo; // Qual dos 5 e-mails foi enviado
  assunto: string;
  enviadoEm: Date;
  status: 'enviado' | 'falhou' | 'pendente';
  erro?: string;
  tentativas: number;
  // Resposta recebida (se houver)
  respostaRecebida?: {
    data: Date;
    assunto: string;
    remetente: string;
    conteudo: string;
  };
  // Conversão (se o lead escolheu médico após este e-mail)
  conversao?: {
    data: Date;
    medicoId?: string;
  };
}

// Status de e-mails de um lead
export interface LeadEmailStatus {
  leadId: string;
  leadEmail: string;
  leadNome: string;
  statusLead: string;
  dataCriacao: Date;
  dataStatus: Date;
  // Status de cada e-mail
  email1?: {
    enviado: boolean;
    dataEnvio?: Date;
    status: 'enviado' | 'falhou' | 'pendente' | 'nao_enviar';
  };
  email2?: {
    enviado: boolean;
    dataEnvio?: Date;
    status: 'enviado' | 'falhou' | 'pendente' | 'nao_enviar';
  };
  email3?: {
    enviado: boolean;
    dataEnvio?: Date;
    status: 'enviado' | 'falhou' | 'pendente' | 'nao_enviar';
  };
  email4?: {
    enviado: boolean;
    dataEnvio?: Date;
    status: 'enviado' | 'falhou' | 'pendente' | 'nao_enviar';
  };
  email5?: {
    enviado: boolean;
    dataEnvio?: Date;
    status: 'enviado' | 'falhou' | 'pendente' | 'nao_enviar';
  };
  // Informações sobre solicitação de médico (se houver)
  temSolicitacaoMedico?: boolean;
  medicoNome?: string;
  medicoId?: string;
  statusSolicitacao?: 'pendente' | 'aceita' | 'rejeitada' | 'desistiu';
  // Informações sobre médico responsável (paciente_completo com medicoResponsavelId)
  temMedicoResponsavel?: boolean;
  // Qual e-mail causou a conversão (se houver)
  emailConversao?: EmailTipo;
  dataConversao?: Date;
  // Próximo e-mail a ser enviado
  proximoEmail?: EmailTipo;
  proximoEnvio?: Date;
}

export interface EmailInbox {
  id: string;
  uid: number; // UID do e-mail no servidor IMAP
  subject: string;
  from: string;
  to: string;
  date: Date;
  text: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
  }>;
  // Relacionado a algum lead?
  leadId?: string;
  leadEmail?: string;
}

