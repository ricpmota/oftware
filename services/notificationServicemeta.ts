import { collection, addDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Residente } from '@/types/auth';

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  emailTemplate: string;
  whatsappTemplate: string;
  variables: string[]; // Variáveis disponíveis como {nome}, {escala}, etc.
}

export interface NotificationLog {
  id: string;
  residenteId: string;
  residenteNome: string;
  residenteEmail: string;
  residenteTelefone?: string;
  type: 'email' | 'whatsapp' | 'both';
  template: string;
  subject?: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
  sentAt?: Date;
  createdAt: Date;
  createdBy: string;
}

export class NotificationService {
  
  // Templates pré-definidos
  static readonly TEMPLATES: NotificationTemplate[] = [
    {
      id: 'nova-escala',
      name: 'Nova Escala Criada',
      subject: 'Nova escala disponível - Semana de {dataInicio}',
      emailTemplate: `
Olá {nome},

Uma nova escala foi criada para a semana de {dataInicio}.

Por favor, acesse o sistema CENOFT para visualizar seus horários:
https://oftware-site-final.vercel.app/cenoft

Atenciosamente,
Equipe CENOFT
      `.trim(),
      whatsappTemplate: `
🏥 *CENOFT - Nova Escala*

Olá {nome}!

Uma nova escala foi criada para a semana de *{dataInicio}*.

Acesse: https://oftware-site-final.vercel.app/cenoft

_Equipe CENOFT_
      `.trim(),
      variables: ['nome', 'dataInicio']
    },
    {
      id: 'troca-aprovada',
      name: 'Troca Aprovada',
      subject: 'Troca aprovada - {servico} em {data}',
      emailTemplate: `
Olá {nome},

Sua solicitação de troca foi aprovada!

Detalhes:
- Serviço: {servico}
- Local: {local}
- Data: {data}
- Turno: {turno}

Acesse o sistema para mais detalhes:
https://oftware-site-final.vercel.app/cenoft

Atenciosamente,
Equipe CENOFT
      `.trim(),
      whatsappTemplate: `
✅ *CENOFT - Troca Aprovada*

Olá {nome}!

Sua troca foi aprovada:
📋 *{servico}*
📍 {local}
📅 {data} - {turno}

Acesse: https://oftware-site-final.vercel.app/cenoft

_Equipe CENOFT_
      `.trim(),
      variables: ['nome', 'servico', 'local', 'data', 'turno']
    },
    {
      id: 'lembrete-escala',
      name: 'Lembrete de Escala',
      subject: 'Lembrete: Você tem escala amanhã',
      emailTemplate: `
Olá {nome},

Este é um lembrete de que você tem escala amanhã:

- Serviço: {servico}
- Local: {local}
- Data: {data}
- Turno: {turno}

Não esqueça de comparecer no horário!

Atenciosamente,
Equipe CENOFT
      `.trim(),
      whatsappTemplate: `
⏰ *CENOFT - Lembrete*

Olá {nome}!

Você tem escala amanhã:
📋 *{servico}*
📍 {local}
📅 {data} - {turno}

Não esqueça! 😊

_Equipe CENOFT_
      `.trim(),
      variables: ['nome', 'servico', 'local', 'data', 'turno']
    },
    {
      id: 'custom',
      name: 'Mensagem Personalizada',
      subject: '{subject}',
      emailTemplate: '{message}',
      whatsappTemplate: '{message}',
      variables: ['subject', 'message']
    }
  ];

  /**
   * Enviar notificação para um ou mais residentes
   */
  static async sendNotification(
    residents: Residente[],
    templateId: string,
    variables: Record<string, string>,
    type: 'email' | 'whatsapp' | 'both' = 'both',
    createdBy: string
  ): Promise<{ success: number; failed: number; logs: string[] }> {
    const template = this.TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      throw new Error('Template não encontrado');
    }

    const results = { success: 0, failed: 0, logs: [] as string[] };

    for (const resident of residents) {
      try {
        // Substituir variáveis no template
        const processedVariables = {
          nome: resident.nome,
          ...variables
        };

        const subject = this.replaceVariables(template.subject, processedVariables);
        const emailMessage = this.replaceVariables(template.emailTemplate, processedVariables);
        const whatsappMessage = this.replaceVariables(template.whatsappTemplate, processedVariables);

        // Criar log da notificação
        const logData: Omit<NotificationLog, 'id'> = {
          residenteId: resident.id,
          residenteNome: resident.nome,
          residenteEmail: resident.email,
          residenteTelefone: resident.telefone || null, // Evitar undefined
          type,
          template: templateId,
          subject,
          message: type === 'email' ? emailMessage : whatsappMessage,
          status: 'pending',
          createdAt: new Date(),
          createdBy
        };

        // Salvar log no Firestore
        const logRef = await addDoc(collection(db, 'notification_logs'), logData);

        // Enviar notificações baseado no tipo
        if (type === 'email' || type === 'both') {
          await this.sendEmail(resident.email, subject, emailMessage, logRef.id);
        }

        if (type === 'whatsapp' || type === 'both') {
          if (resident.telefone) {
            await this.sendWhatsApp(resident.telefone, whatsappMessage, logRef.id);
          } else {
            results.logs.push(`⚠️ ${resident.nome}: WhatsApp não enviado (telefone não cadastrado)`);
          }
        }

        results.success++;
        results.logs.push(`✅ ${resident.nome}: Notificação enviada com sucesso`);

      } catch (error) {
        results.failed++;
        results.logs.push(`❌ ${resident.nome}: Erro ao enviar - ${(error as Error).message}`);
        console.error(`Erro ao enviar notificação para ${resident.nome}:`, error);
      }
    }

    return results;
  }

  /**
   * Substituir variáveis no template
   */
  private static replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, value || '');
    });
    return result;
  }

  /**
   * Enviar e-mail usando Firebase Functions
   */
  private static async sendEmail(email: string, subject: string, message: string, logId: string): Promise<void> {
    try {
      // Chamar Firebase Function para envio de e-mail
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject,
          html: message.replace(/\n/g, '<br>'),
          logId
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      console.log(`✅ E-mail enviado para ${email}`);
    } catch (error) {
      console.error(`❌ Erro ao enviar e-mail para ${email}:`, error);
      throw error;
    }
  }

  /**
   * Enviar WhatsApp usando Twilio
   */
  private static async sendWhatsApp(phone: string, message: string, logId: string): Promise<void> {
    try {
      // Chamar Firebase Function para envio de WhatsApp
      const response = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phone,
          message,
          logId
        }),
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      console.log(`✅ WhatsApp enviado para ${phone}`);
    } catch (error) {
      console.error(`❌ Erro ao enviar WhatsApp para ${phone}:`, error);
      throw error;
    }
  }

  /**
   * Buscar logs de notificações
   */
  static async getNotificationLogs(limit: number = 50): Promise<NotificationLog[]> {
    try {
      const q = query(
        collection(db, 'notification_logs'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NotificationLog[];
    } catch (error) {
      console.error('Erro ao buscar logs de notificações:', error);
      throw error;
    }
  }

  /**
   * Buscar logs por residente
   */
  static async getNotificationLogsByResident(residenteId: string): Promise<NotificationLog[]> {
    try {
      const q = query(
        collection(db, 'notification_logs'),
        where('residenteId', '==', residenteId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NotificationLog[];
    } catch (error) {
      console.error('Erro ao buscar logs por residente:', error);
      throw error;
    }
  }

  /**
   * Validar número de telefone
   */
  static validatePhoneNumber(phone: string): boolean {
    // Formato esperado: +5511999999999
    const phoneRegex = /^\+55\d{2}\d{8,9}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Formatar número de telefone
   */
  static formatPhoneNumber(phone: string): string {
    // Remove todos os caracteres não numéricos
    const numbers = phone.replace(/\D/g, '');
    
    // Se começar com 55 (código do Brasil), adiciona +
    if (numbers.startsWith('55') && numbers.length >= 12) {
      return `+${numbers}`;
    }
    
    // Se não tiver código do país, adiciona +55
    if (numbers.length >= 10) {
      return `+55${numbers}`;
    }
    
    return phone; // Retorna original se não conseguir formatar
  }
}
