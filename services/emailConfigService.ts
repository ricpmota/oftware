import { collection, doc, getDoc, setDoc, updateDoc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { EmailConfig, EmailEnvio, EmailTipo, LeadEmailStatus } from '@/types/emailConfig';
import { Lead } from '@/types/lead';

/**
 * Remove valores undefined recursivamente de um objeto (Firestore não aceita undefined)
 */
function removeUndefined(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item));
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned;
  }
  
  return obj;
}

export class EmailConfigService {
  private static readonly EMAILS_COLLECTION = 'emails';
  private static readonly ENVIOS_COLLECTION = 'email_envios';
  private static readonly CONFIG_DOC_ID = 'config'; // Documento para envioAutomatico
  private static readonly LEADS_SNAPSHOT_COLLECTION = 'leads_snapshot_diario'; // Snapshot diário de leads para rastrear conversões

  /**
   * Obter configuração atual de e-mails
   * Busca os 5 documentos da coleção 'emails'
   */
  static async getConfig(): Promise<EmailConfig | null> {
    try {
      // Buscar os 5 documentos de e-mail
      const emailTypes: EmailTipo[] = ['email1', 'email2', 'email3', 'email4', 'email5'];
      const emails: Record<EmailTipo, EmailTemplate> = {
        email1: { assunto: '', corpoHtml: '' },
        email2: { assunto: '', corpoHtml: '' },
        email3: { assunto: '', corpoHtml: '' },
        email4: { assunto: '', corpoHtml: '' },
        email5: { assunto: '', corpoHtml: '' },
      };

      for (const emailTipo of emailTypes) {
        try {
          const docRef = doc(db, this.EMAILS_COLLECTION, emailTipo);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data();
            emails[emailTipo] = {
              assunto: data.assunto || '',
              corpoHtml: data.corpoHtml || '',
              corpoTexto: data.corpoTexto || '',
            };
          }
        } catch (error) {
          console.error(`Erro ao buscar ${emailTipo}:`, error);
        }
      }

      // Buscar configuração de envio automático
      let envioAutomatico = { ativo: false };
      try {
        const configRef = doc(db, this.EMAILS_COLLECTION, this.CONFIG_DOC_ID);
        const configSnap = await getDoc(configRef);
        if (configSnap.exists()) {
          const configData = configSnap.data();
          envioAutomatico = configData.envioAutomatico || { ativo: false };
        }
      } catch (error) {
        console.error('Erro ao buscar configuração de envio automático:', error);
      }

      return {
        emails,
        envioAutomatico,
      } as EmailConfig;
    } catch (error) {
      console.error('Erro ao buscar configuração de e-mail:', error);
      return null;
    }
  }

  /**
   * Salvar/atualizar configuração de e-mails
   * Salva cada e-mail em um documento separado na coleção 'emails'
   */
  static async saveConfig(config: EmailConfig): Promise<void> {
    try {
      // Validar estrutura
      if (!config.emails) {
        throw new Error('Estrutura de e-mails não encontrada');
      }

      const requiredEmails: EmailTipo[] = ['email1', 'email2', 'email3', 'email4', 'email5'];
      for (const emailTipo of requiredEmails) {
        if (!config.emails[emailTipo]) {
          throw new Error(`E-mail ${emailTipo} não encontrado na configuração`);
        }
        if (!config.emails[emailTipo].assunto || !config.emails[emailTipo].corpoHtml) {
          throw new Error(`E-mail ${emailTipo} está incompleto (assunto ou corpoHtml faltando)`);
        }
      }

      const agora = new Date();

      console.log('💾 Salvando configuração de e-mails no Firestore...');
      console.log('📋 Coleção: emails');
      console.log('📋 Criando/atualizando 5 documentos: email1, email2, email3, email4, email5');

      // Salvar cada e-mail em um documento separado (usando padrão do metaadmin)
      for (const emailTipo of requiredEmails) {
        const emailData = config.emails[emailTipo];
        const docRef = doc(db, this.EMAILS_COLLECTION, emailTipo);
        
        // Verificar se documento já existe
        const existingDoc = await getDoc(docRef);
        
        const emailDoc: any = {
          assunto: String(emailData.assunto || '').trim(),
          corpoHtml: String(emailData.corpoHtml || '').trim(),
          updatedAt: agora,
        };

        // Adicionar corpoTexto apenas se existir
        if (emailData.corpoTexto && emailData.corpoTexto.trim()) {
          emailDoc.corpoTexto = String(emailData.corpoTexto).trim();
        }

        // Adicionar createdAt apenas se for um novo documento
        if (!existingDoc.exists()) {
          emailDoc.createdAt = agora;
        }

        try {
          // Remover undefined e salvar (padrão do metaadmin)
          const cleanedData = removeUndefined(emailDoc);
          await setDoc(docRef, cleanedData);
          console.log(`✅ ${emailTipo} salvo com sucesso`);
        } catch (error) {
          console.error(`❌ Erro ao salvar ${emailTipo}:`, error);
          console.error(`❌ Detalhes:`, {
            code: (error as any)?.code,
            message: (error as any)?.message,
            stack: (error as any)?.stack
          });
          throw new Error(`Erro ao salvar ${emailTipo}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      }

      // Salvar configuração de envio automático em documento separado
      const configRef = doc(db, this.EMAILS_COLLECTION, this.CONFIG_DOC_ID);
      const existingConfig = await getDoc(configRef);
      
      const configData: any = {
        envioAutomatico: {
          ativo: Boolean(config.envioAutomatico?.ativo || false),
        },
        updatedAt: agora,
      };

      if (!existingConfig.exists()) {
        configData.createdAt = agora;
      }

      // Remover undefined e salvar (padrão do metaadmin)
      const cleanedConfigData = removeUndefined(configData);
      await setDoc(configRef, cleanedConfigData);
      console.log('✅ Configuração de envio automático salva com sucesso');
      console.log('✅ Todas as configurações salvas com sucesso no Firestore');
    } catch (error) {
      console.error('❌ Erro ao salvar configuração de e-mail:', error);
      throw error;
    }
  }

  /**
   * Registrar envio de e-mail
   */
  static async registrarEnvio(envio: Omit<EmailEnvio, 'id'>): Promise<string> {
    try {
      const docRef = doc(collection(db, this.ENVIOS_COLLECTION));
      const envioData = {
        ...envio,
        id: docRef.id,
        enviadoEm: new Date(),
      };

      await setDoc(docRef, envioData);
      return docRef.id;
    } catch (error) {
      console.error('Erro ao registrar envio:', error);
      throw error;
    }
  }

  /**
   * Buscar status de e-mails de todos os leads
   * Agora inclui leads com e sem solicitação_medico
   */
  static async getLeadsEmailStatus(
    leads: Lead[], 
    solicitacaoPorEmail?: Map<string, any>,
    pacientesComMedico?: Map<string, { medicoId: string; medicoNome?: string }>
  ): Promise<LeadEmailStatus[]> {
    try {
      // Buscar todos os envios
      const envios = await this.getAllEnvios();
      
      // Criar mapa de envios por lead
      const enviosPorLead = new Map<string, EmailEnvio[]>();
      envios.forEach(envio => {
        if (!enviosPorLead.has(envio.leadId)) {
          enviosPorLead.set(envio.leadId, []);
        }
        enviosPorLead.get(envio.leadId)!.push(envio);
      });

      // Criar status para cada lead
      return leads.map(lead => {
        const enviosDoLead = enviosPorLead.get(lead.id) || [];
        const leadEmail = lead.email?.toLowerCase().trim();
        const solicitacao = leadEmail && solicitacaoPorEmail ? solicitacaoPorEmail.get(leadEmail) : undefined;
        const temSolicitacao = !!solicitacao;
        
        // Verificar se tem médico responsável (paciente_completo com medicoResponsavelId)
        const pacienteComMedico = leadEmail && pacientesComMedico ? pacientesComMedico.get(leadEmail) : undefined;
        const temMedicoResponsavel = !!pacienteComMedico;
        
        const status: LeadEmailStatus = {
          leadId: lead.id,
          leadEmail: lead.email,
          leadNome: lead.name,
          statusLead: lead.status,
          dataCriacao: lead.createdAt || new Date(),
          dataStatus: lead.dataStatus || new Date(),
          // Informações da solicitação
          temSolicitacaoMedico: temSolicitacao,
          medicoNome: solicitacao?.medicoNome || pacienteComMedico?.medicoNome,
          medicoId: solicitacao?.medicoId || pacienteComMedico?.medicoId,
          statusSolicitacao: solicitacao?.status,
          // Informação se tem médico responsável (conversão)
          temMedicoResponsavel: temMedicoResponsavel,
        };

        // Verificar cada e-mail
        (['email1', 'email2', 'email3', 'email4', 'email5'] as EmailTipo[]).forEach(emailTipo => {
          // Se o lead tem solicitação, marcar todos os e-mails como 'nao_enviar'
          if (temSolicitacao) {
            status[emailTipo] = {
              enviado: false,
              status: 'nao_enviar',
            };
          } else {
            // Se não tem solicitação, verificar se foi enviado
            const envio = enviosDoLead.find(e => e.emailTipo === emailTipo);
            if (envio) {
              status[emailTipo] = {
                enviado: true,
                dataEnvio: envio.enviadoEm,
                status: envio.status,
              };
            } else {
              status[emailTipo] = {
                enviado: false,
                status: 'pendente',
              };
            }
          }
        });

        // Verificar conversão: se tem médico responsável, é conversão
        // Determinar qual e-mail causou a conversão (último e-mail enviado antes da conversão)
        if (temMedicoResponsavel) {
          const enviosEnviados = enviosDoLead
            .filter(e => e.status === 'enviado')
            .sort((a, b) => a.enviadoEm.getTime() - b.enviadoEm.getTime());
          
          if (enviosEnviados.length > 0) {
            const ultimoEnvio = enviosEnviados[enviosEnviados.length - 1];
            status.emailConversao = ultimoEnvio.emailTipo;
            status.dataConversao = new Date(); // Data aproximada (quando detectamos)
          }
        } else {
          // Verificar conversão antiga (se houver registro)
          const envioConversao = enviosDoLead.find(e => e.conversao);
          if (envioConversao) {
            status.emailConversao = envioConversao.emailTipo;
            status.dataConversao = envioConversao.conversao?.data;
          }
        }

        // Calcular próximo e-mail
        const dataCriacao = lead.createdAt || new Date();
        const agora = new Date();
        const horasDesdeCriacao = (agora.getTime() - dataCriacao.getTime()) / (1000 * 60 * 60);
        const minutosDesdeCriacao = (agora.getTime() - dataCriacao.getTime()) / (1000 * 60);

        // Sempre calcular o próximo envio, mesmo que ainda não tenha passado o tempo
        if (!status.email1?.enviado) {
          status.proximoEmail = 'email1';
          status.proximoEnvio = new Date(dataCriacao.getTime() + 60 * 60 * 1000); // 1 hora
        } else if (!status.email2?.enviado) {
          status.proximoEmail = 'email2';
          status.proximoEnvio = new Date(dataCriacao.getTime() + 24 * 60 * 60 * 1000);
        } else if (!status.email3?.enviado) {
          status.proximoEmail = 'email3';
          status.proximoEnvio = new Date(dataCriacao.getTime() + 72 * 60 * 60 * 1000);
        } else if (!status.email4?.enviado) { // 7 dias
          status.proximoEmail = 'email4';
          status.proximoEnvio = new Date(dataCriacao.getTime() + 168 * 60 * 60 * 1000);
        } else if (!status.email5?.enviado) { // 14 dias
          status.proximoEmail = 'email5';
          status.proximoEnvio = new Date(dataCriacao.getTime() + 336 * 60 * 60 * 1000);
        }

        return status;
      });
    } catch (error) {
      console.error('Erro ao buscar status de e-mails:', error);
      return [];
    }
  }

  /**
   * Criar snapshot diário de leads (para rastrear conversões)
   * Deve ser chamado diariamente para salvar o estado atual dos leads
   */
  static async criarSnapshotDiario(leads: Lead[]): Promise<void> {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dataSnapshot = hoje.toISOString().split('T')[0]; // YYYY-MM-DD
      
      const snapshotData = {
        data: dataSnapshot,
        leads: leads.map(lead => ({
          leadId: lead.id,
          leadEmail: lead.email,
          leadNome: lead.name,
          createdAt: lead.createdAt || new Date(),
        })),
        totalLeads: leads.length,
        criadoEm: new Date(),
      };

      const docRef = doc(db, this.LEADS_SNAPSHOT_COLLECTION, dataSnapshot);
      await setDoc(docRef, snapshotData);
      console.log(`✅ Snapshot diário criado para ${dataSnapshot}: ${leads.length} leads`);
    } catch (error) {
      console.error('Erro ao criar snapshot diário:', error);
      throw error;
    }
  }

  /**
   * Verificar conversões comparando snapshot anterior com estado atual
   */
  static async verificarConversoes(leadsAtuais: Lead[]): Promise<Map<string, { emailTipo: EmailTipo; data: Date }>> {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const dataOntem = new Date(hoje);
      dataOntem.setDate(dataOntem.getDate() - 1);
      const dataSnapshotOntem = dataOntem.toISOString().split('T')[0];

      // Buscar snapshot de ontem
      const snapshotRef = doc(db, this.LEADS_SNAPSHOT_COLLECTION, dataSnapshotOntem);
      const snapshotSnap = await getDoc(snapshotRef);

      if (!snapshotSnap.exists()) {
        console.log('⚠️ Nenhum snapshot anterior encontrado');
        return new Map();
      }

      const snapshotOntem = snapshotSnap.data();
      const leadsOntem = new Set((snapshotOntem.leads || []).map((l: any) => l.leadId));
      const leadsAtuaisIds = new Set(leadsAtuais.map(l => l.id));

      // Leads que estavam ontem mas não estão hoje = conversões
      const conversoes = new Map<string, { emailTipo: EmailTipo; data: Date }>();
      
      for (const leadId of leadsOntem) {
        if (!leadsAtuaisIds.has(leadId)) {
          // Lead converteu (saiu da lista)
          // Buscar último e-mail enviado para este lead
          const envios = await this.getEnviosPorLead(leadId);
          const ultimoEnvio = envios
            .filter(e => e.status === 'enviado')
            .sort((a, b) => b.enviadoEm.getTime() - a.enviadoEm.getTime())[0];
          
          if (ultimoEnvio) {
            conversoes.set(leadId, {
              emailTipo: ultimoEnvio.emailTipo,
              data: new Date(),
            });
          }
        }
      }

      console.log(`✅ ${conversoes.size} conversões detectadas comparando com snapshot de ${dataSnapshotOntem}`);
      return conversoes;
    } catch (error) {
      console.error('Erro ao verificar conversões:', error);
      return new Map();
    }
  }

  /**
   * Buscar histórico de envios para um lead
   */
  static async getEnviosPorLead(leadId: string): Promise<EmailEnvio[]> {
    try {
      const q = query(
        collection(db, this.ENVIOS_COLLECTION),
        orderBy('enviadoEm', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map(doc => {
          const data = doc.data();
          if (data.leadId === leadId) {
            return {
              id: doc.id,
              leadId: data.leadId,
              leadEmail: data.leadEmail,
              leadNome: data.leadNome,
              emailTipo: data.emailTipo,
              assunto: data.assunto,
              enviadoEm: data.enviadoEm?.toDate() || new Date(),
              status: data.status,
              erro: data.erro,
              tentativas: data.tentativas || 1,
              respostaRecebida: data.respostaRecebida ? {
                data: data.respostaRecebida.data?.toDate() || new Date(),
                assunto: data.respostaRecebida.assunto,
                remetente: data.respostaRecebida.remetente,
                conteudo: data.respostaRecebida.conteudo,
              } : undefined,
              conversao: data.conversao ? {
                data: data.conversao.data?.toDate() || new Date(),
                medicoId: data.conversao.medicoId,
              } : undefined,
            } as EmailEnvio;
          }
          return null;
        })
        .filter((envio): envio is EmailEnvio => envio !== null);
    } catch (error) {
      console.error('Erro ao buscar envios por lead:', error);
      return [];
    }
  }

  /**
   * Buscar todos os envios
   */
  static async getAllEnvios(): Promise<EmailEnvio[]> {
    try {
      const q = query(
        collection(db, this.ENVIOS_COLLECTION),
        orderBy('enviadoEm', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          leadId: data.leadId,
          leadEmail: data.leadEmail,
          leadNome: data.leadNome,
          emailTipo: data.emailTipo,
          assunto: data.assunto,
          enviadoEm: data.enviadoEm?.toDate() || new Date(),
          status: data.status,
          erro: data.erro,
          tentativas: data.tentativas || 1,
          respostaRecebida: data.respostaRecebida ? {
            data: data.respostaRecebida.data?.toDate() || new Date(),
            assunto: data.respostaRecebida.assunto,
            remetente: data.respostaRecebida.remetente,
            conteudo: data.respostaRecebida.conteudo,
          } : undefined,
          conversao: data.conversao ? {
            data: data.conversao.data?.toDate() || new Date(),
            medicoId: data.conversao.medicoId,
          } : undefined,
        } as EmailEnvio;
      });
    } catch (error) {
      console.error('Erro ao buscar todos os envios:', error);
      return [];
    }
  }

  /**
   * Atualizar status de um envio
   */
  static async atualizarStatusEnvio(envioId: string, status: 'enviado' | 'falhou' | 'pendente', erro?: string): Promise<void> {
    try {
      const docRef = doc(db, this.ENVIOS_COLLECTION, envioId);
      const docSnap = await getDoc(docRef);
      const tentativasAtuais = docSnap.data()?.tentativas || 0;
      await updateDoc(docRef, {
        status,
        erro,
        tentativas: tentativasAtuais + 1,
      });
    } catch (error) {
      console.error('Erro ao atualizar status do envio:', error);
      throw error;
    }
  }
}

