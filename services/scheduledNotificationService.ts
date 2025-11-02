import { collection, getDocs, query, where, orderBy, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Escala, Residente, Servico, Local, ServicoDia } from '@/types/auth';
import { NotificationService } from './notificationService';

export interface ScheduledNotification {
  id: string;
  residenteEmail: string;
  residenteNome: string;
  tipo: 'lembrete-hoje' | 'lembrete-amanha';
  data: Date;
  servicos: {
    manha?: {
      servicoNome: string;
      localNome: string;
    };
    tarde?: {
      servicoNome: string;
      localNome: string;
    };
  };
  enviado: boolean;
  tentativas: number;
  ultimaTentativa?: Date;
  erro?: string;
  createdAt: Date;
}

export class ScheduledNotificationService {
  
  /**
   * Processar notificações diárias - deve ser chamado via cron job
   */
  static async processarNotificacoesDiarias(): Promise<{
    lembreteAmanha: { success: number; failed: number };
    lembreteHoje: { success: number; failed: number };
  }> {
    console.log('🕐 Iniciando processamento de notificações diárias...');
    
    const agora = new Date();
    const hora = agora.getHours();
    
    const resultados = {
      lembreteAmanha: { success: 0, failed: 0 },
      lembreteHoje: { success: 0, failed: 0 }
    };

    try {
      // 19:00 - Enviar lembretes para amanhã
      if (hora === 19) {
        console.log('📅 Processando lembretes para amanhã (19:00)...');
        const resultado = await this.enviarLembretesAmanha();
        resultados.lembreteAmanha = resultado;
      }

      // 06:00 - Enviar lembretes para hoje
      if (hora === 6) {
        console.log('🌅 Processando lembretes para hoje (06:00)...');
        const resultado = await this.enviarLembretesHoje();
        resultados.lembreteHoje = resultado;
      }

      console.log('✅ Processamento de notificações concluído:', resultados);
      return resultados;

    } catch (error) {
      console.error('❌ Erro no processamento de notificações:', error);
      throw error;
    }
  }

  /**
   * Enviar lembretes para amanhã (19:00)
   */
  private static async enviarLembretesAmanha(): Promise<{ success: number; failed: number }> {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    
    const escalasAmanha = await this.buscarEscalasDoDia(amanha);
    const resultados = { success: 0, failed: 0 };

    for (const escala of escalasAmanha) {
      try {
        const resultado = await this.enviarLembreteParaEscala(escala, 'lembrete-amanha');
        resultados.success += resultado.success;
        resultados.failed += resultado.failed;
      } catch (error) {
        console.error('Erro ao processar escala:', escala.id, error);
        resultados.failed++;
      }
    }

    return resultados;
  }

  /**
   * Enviar lembretes para hoje (06:00)
   */
  private static async enviarLembretesHoje(): Promise<{ success: number; failed: number }> {
    const hoje = new Date();
    
    const escalasHoje = await this.buscarEscalasDoDia(hoje);
    const resultados = { success: 0, failed: 0 };

    for (const escala of escalasHoje) {
      try {
        const resultado = await this.enviarLembreteParaEscala(escala, 'lembrete-hoje');
        resultados.success += resultado.success;
        resultados.failed += resultado.failed;
      } catch (error) {
        console.error('Erro ao processar escala:', escala.id, error);
        resultados.failed++;
      }
    }

    return resultados;
  }

  /**
   * Buscar escalas de um dia específico
   */
  private static async buscarEscalasDoDia(data: Date): Promise<Array<{
    escala: Escala;
    dia: string;
    servicosDoDia: ServicoDia[];
  }>> {
    try {
      // Buscar todas as escalas
      const escalasSnapshot = await getDocs(collection(db, 'escalas'));
      const escalas = escalasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Escala[];

      const escalasEncontradas: Array<{
        escala: Escala;
        dia: string;
        servicosDoDia: ServicoDia[];
      }> = [];

      // Para cada escala, verificar se a data corresponde a algum dia da semana
      for (const escala of escalas) {
        const dataInicio = new Date(escala.dataInicio);
        
        // Calcular qual dia da semana é a data target
        const diasDaSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
        const diaDaSemana = diasDaSemana[data.getDay()];
        
        // Calcular a data deste dia na semana da escala
        const diferencaDias = data.getDay() - dataInicio.getDay();
        const dataDodia = new Date(dataInicio);
        dataDodia.setDate(dataInicio.getDate() + diferencaDias);
        
        // Verificar se é o mesmo dia (ignorando horário)
        if (
          dataDodia.getDate() === data.getDate() &&
          dataDodia.getMonth() === data.getMonth() &&
          dataDodia.getFullYear() === data.getFullYear()
        ) {
          const servicosDoDia = escala.dias[diaDaSemana as keyof typeof escala.dias];
          if (Array.isArray(servicosDoDia) && servicosDoDia.length > 0) {
            escalasEncontradas.push({
              escala,
              dia: diaDaSemana,
              servicosDoDia
            });
          }
        }
      }

      console.log(`📊 Encontradas ${escalasEncontradas.length} escalas para ${data.toLocaleDateString('pt-BR')}`);
      return escalasEncontradas;

    } catch (error) {
      console.error('Erro ao buscar escalas do dia:', error);
      return [];
    }
  }

  /**
   * Enviar lembrete para uma escala específica
   */
  private static async enviarLembreteParaEscala(
    escalaInfo: { escala: Escala; dia: string; servicosDoDia: ServicoDia[] },
    tipo: 'lembrete-hoje' | 'lembrete-amanha'
  ): Promise<{ success: number; failed: number }> {
    
    const { escala, dia, servicosDoDia } = escalaInfo;
    const resultados = { success: 0, failed: 0 };

    // Buscar dados complementares
    const [residentes, servicos, locais] = await Promise.all([
      this.buscarResidentes(),
      this.buscarServicos(),
      this.buscarLocais()
    ]);

    // Agrupar serviços por residente
    const servicosPorResidente = new Map<string, {
      residente: Residente;
      manha?: { servicoNome: string; localNome: string };
      tarde?: { servicoNome: string; localNome: string };
    }>();

    // Processar cada serviço do dia
    for (const servicoDia of servicosDoDia) {
      const servico = servicos.find(s => s.id === servicoDia.servicoId);
      const local = locais.find(l => l.id === servicoDia.localId);
      
      if (!servico || !local) continue;

      // Para cada residente no serviço
      for (const residenteEmail of servicoDia.residentes) {
        const residente = residentes.find(r => r.email === residenteEmail);
        if (!residente) continue;

        // Inicializar se não existir
        if (!servicosPorResidente.has(residenteEmail)) {
          servicosPorResidente.set(residenteEmail, { residente });
        }

        const servicoResidente = servicosPorResidente.get(residenteEmail)!;
        
        // Adicionar serviço no turno correspondente
        if (servicoDia.turno === 'manha') {
          servicoResidente.manha = {
            servicoNome: servico.nome,
            localNome: local.nome
          };
        } else {
          servicoResidente.tarde = {
            servicoNome: servico.nome,
            localNome: local.nome
          };
        }
      }
    }

    // Enviar notificação para cada residente
    for (const [email, servicoInfo] of servicosPorResidente) {
      try {
        await this.enviarLembreteParaResidente(servicoInfo, dia, tipo);
        resultados.success++;
      } catch (error) {
        console.error(`Erro ao enviar lembrete para ${email}:`, error);
        resultados.failed++;
      }
    }

    return resultados;
  }

  /**
   * Enviar lembrete para um residente específico
   */
  private static async enviarLembreteParaResidente(
    servicoInfo: {
      residente: Residente;
      manha?: { servicoNome: string; localNome: string };
      tarde?: { servicoNome: string; localNome: string };
    },
    dia: string,
    tipo: 'lembrete-hoje' | 'lembrete-amanha'
  ): Promise<void> {
    
    const { residente, manha, tarde } = servicoInfo;
    
    // Verificar se tem algum serviço
    if (!manha && !tarde) {
      console.log(`⚠️ ${residente.nome}: Nenhum serviço encontrado para ${dia}`);
      return;
    }

    // Preparar dados da data
    const agora = new Date();
    const dataTarget = tipo === 'lembrete-amanha' 
      ? new Date(agora.getTime() + 24 * 60 * 60 * 1000)
      : agora;
    
    const dataFormatada = dataTarget.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Montar mensagem dos serviços
    const servicos: string[] = [];
    if (manha) {
      servicos.push(`🌅 **Manhã**: ${manha.servicoNome} - ${manha.localNome}`);
    }
    if (tarde) {
      servicos.push(`🌇 **Tarde**: ${tarde.servicoNome} - ${tarde.localNome}`);
    }

    // Preparar variáveis para o template
    const variables = {
      nome: residente.nome,
      data: dataFormatada,
      servicos: servicos.join('\n'),
      periodo: tipo === 'lembrete-amanha' ? 'amanhã' : 'hoje'
    };

    // Usar template personalizado para lembrete
    const templateId = tipo === 'lembrete-amanha' ? 'lembrete-amanha' : 'lembrete-hoje';
    
    try {
      await NotificationService.sendNotification(
        [residente],
        'custom', // Usar template customizado
        {
          subject: `Lembrete: Escala de ${variables.periodo} - ${dataTarget.toLocaleDateString('pt-BR')}`,
          message: this.gerarMensagemLembrete(variables)
        },
        'both', // Enviar por e-mail e WhatsApp
        'sistema-automatico'
      );

      console.log(`✅ Lembrete enviado para ${residente.nome} (${tipo})`);

    } catch (error) {
      console.error(`❌ Erro ao enviar lembrete para ${residente.nome}:`, error);
      throw error;
    }
  }

  /**
   * Gerar mensagem de lembrete
   */
  private static gerarMensagemLembrete(variables: {
    nome: string;
    data: string;
    servicos: string;
    periodo: string;
  }): string {
    
    const emoji = variables.periodo === 'amanhã' ? '📅' : '🌅';
    
    return `
${emoji} **CENOFT - Lembrete de Escala**

Olá ${variables.nome}!

Você tem escala **${variables.periodo}** (${variables.data}):

${variables.servicos}

${variables.periodo === 'amanhã' 
  ? '⏰ Prepare-se para amanhã!' 
  : '🏥 Tenha um excelente dia de trabalho!'
}

_Sistema Automático CENOFT_
    `.trim();
  }

  /**
   * Métodos auxiliares para buscar dados
   */
  private static async buscarResidentes(): Promise<Residente[]> {
    const snapshot = await getDocs(collection(db, 'residentes'));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Residente[];
  }

  private static async buscarServicos(): Promise<Servico[]> {
    const snapshot = await getDocs(collection(db, 'servicos'));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Servico[];
  }

  private static async buscarLocais(): Promise<Local[]> {
    const snapshot = await getDocs(collection(db, 'locais'));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Local[];
  }

  /**
   * Função para testar o sistema (desenvolvimento)
   */
  static async testarNotificacoes(
    tipo: 'lembrete-hoje' | 'lembrete-amanha' = 'lembrete-hoje'
  ): Promise<void> {
    console.log(`🧪 Testando notificações automáticas (${tipo})...`);
    
    try {
      const data = tipo === 'lembrete-amanha' 
        ? new Date(Date.now() + 24 * 60 * 60 * 1000)
        : new Date();
        
      const escalas = await this.buscarEscalasDoDia(data);
      
      if (escalas.length === 0) {
        console.log('⚠️ Nenhuma escala encontrada para testar');
        return;
      }

      console.log(`📊 Testando com ${escalas.length} escala(s)`);
      
      for (const escala of escalas) {
        const resultado = await this.enviarLembreteParaEscala(escala, tipo);
        console.log(`✅ Teste concluído - Sucesso: ${resultado.success}, Falhas: ${resultado.failed}`);
      }

    } catch (error) {
      console.error('❌ Erro no teste:', error);
      throw error;
    }
  }
}
