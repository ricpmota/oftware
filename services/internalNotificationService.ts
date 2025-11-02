import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc, deleteDoc, limit } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { InternalNotification, NotificationStats } from '@/types/notification';
import { Residente } from '@/types/auth';

export class InternalNotificationService {
  private static COLLECTION = 'notificacoes';

  /**
   * Enviar notificação do admin para residentes selecionados
   */
  static async enviarNotificacaoAdmin(
    residentes: Residente[],
    titulo: string,
    mensagem: string,
    criadoPor: string
  ): Promise<{ success: number; failed: number }> {
    // Verificar autenticação
    if (!auth.currentUser) {
      throw new Error('Usuário não autenticado');
    }

    console.log('🔐 Usuário autenticado:', auth.currentUser.email);
    console.log('📧 Enviando notificações para:', residentes.map(r => r.nome));

    const results = { success: 0, failed: 0 };

    for (const residente of residentes) {
      try {
        const notification = {
          residenteEmail: residente.email,
          residenteNome: residente.nome,
          titulo: titulo,
          mensagem: mensagem,
          tipo: 'admin',
          lida: false,
          criadoPor: criadoPor,
          criadoEm: new Date(),
        };

        console.log(`📝 Salvando notificação para ${residente.nome}:`, notification);
        console.log('Tentando acessar coleção "notificacoes"...');
        
        const notificationsCollection = collection(db, this.COLLECTION);
        console.log('Coleção obtida:', !!notificationsCollection);
        
        const docRef = await addDoc(notificationsCollection, notification);
        console.log('✅ Notificação criada com sucesso! ID:', docRef.id);
        results.success++;
        console.log(`✅ Notificação enviada para ${residente.nome}`);
      } catch (error) {
        console.error(`❌ Erro ao enviar para ${residente.nome}:`, error);
        results.failed++;
      }
    }

    return results;
  }

  /**
   * Notificar sobre troca aprovada
   */
  static async notificarTrocaAprovada(
    residenteEmail: string,
    residenteNome: string,
    servicoNome: string,
    localNome: string,
    data: string,
    turno: string,
    trocaId: string
  ): Promise<void> {
    try {
      const notification = {
        residenteEmail: residenteEmail,
        residenteNome: residenteNome,
        titulo: '✅ Troca Aprovada',
        mensagem: `Sua solicitação de troca foi aprovada!\n\n📋 Serviço: ${servicoNome}\n📍 Local: ${localNome}\n📅 Data: ${data}\n🕐 Turno: ${turno}`,
        tipo: 'troca_aprovada',
        lida: false,
        criadoPor: 'sistema',
        criadoEm: new Date(),
        trocaId: trocaId,
        servicoNome: servicoNome,
        localNome: localNome,
        dataServico: data
      };

      await addDoc(collection(db, this.COLLECTION), notification);
      console.log(`✅ Notificação de troca aprovada enviada para ${residenteNome}`);
    } catch (error) {
      console.error('Erro ao criar notificação de troca aprovada:', error);
    }
  }

  /**
   * Notificar sobre troca rejeitada
   */
  static async notificarTrocaRejeitada(
    residenteEmail: string,
    residenteNome: string,
    servicoNome: string,
    localNome: string,
    data: string,
    turno: string,
    trocaId: string,
    motivo?: string
  ): Promise<void> {
    try {
      let mensagem = `Sua solicitação de troca foi rejeitada.\n\n📋 Serviço: ${servicoNome}\n📍 Local: ${localNome}\n📅 Data: ${data}\n🕐 Turno: ${turno}`;
      
      if (motivo) {
        mensagem += `\n\n💬 Motivo: ${motivo}`;
      }

      const notification = {
        residenteEmail: residenteEmail,
        residenteNome: residenteNome,
        titulo: '❌ Troca Rejeitada',
        mensagem: mensagem,
        tipo: 'troca_rejeitada',
        lida: false,
        criadoPor: 'sistema',
        criadoEm: new Date(),
        trocaId: trocaId,
        servicoNome: servicoNome,
        localNome: localNome,
        dataServico: data
      };

      await addDoc(collection(db, this.COLLECTION), notification);
      console.log(`✅ Notificação de troca rejeitada enviada para ${residenteNome}`);
    } catch (error) {
      console.error('Erro ao criar notificação de troca rejeitada:', error);
    }
  }

  /**
   * Buscar notificações de um residente
   */
  static async getNotificacoesResidente(
    residenteEmail: string,
    limitCount: number = 50
  ): Promise<InternalNotification[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('residenteEmail', '==', residenteEmail),
        orderBy('criadoEm', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        criadoEm: doc.data().criadoEm.toDate(), // Converter Timestamp para Date
      })) as InternalNotification[];
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      return [];
    }
  }

  /**
   * Marcar notificação como lida
   */
  static async marcarComoLida(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.COLLECTION, notificationId), {
        lida: true
      });
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  }

  /**
   * Marcar todas as notificações de um residente como lidas
   */
  static async marcarTodasComoLidas(residenteEmail: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('residenteEmail', '==', residenteEmail),
        where('lida', '==', false)
      );

      const snapshot = await getDocs(q);
      const updatePromises = snapshot.docs.map(docSnap =>
        updateDoc(doc(db, this.COLLECTION, docSnap.id), { lida: true })
      );

      await Promise.all(updatePromises);
      console.log(`✅ Todas as notificações de ${residenteEmail} marcadas como lidas`);
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    }
  }

  /**
   * Excluir notificação
   */
  static async excluirNotificacao(notificationId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTION, notificationId));
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
    }
  }

  /**
   * Obter estatísticas de notificações de um residente
   */
  static async getEstatisticas(residenteEmail: string): Promise<NotificationStats> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('residenteEmail', '==', residenteEmail)
      );

      const snapshot = await getDocs(q);
      const notifications = snapshot.docs.map(doc => doc.data());

      const stats: NotificationStats = {
        total: notifications.length,
        naoLidas: notifications.filter(n => !n.lida).length,
        porTipo: {
          admin: notifications.filter(n => n.tipo === 'admin').length,
          troca_aprovada: notifications.filter(n => n.tipo === 'troca_aprovada').length,
          troca_rejeitada: notifications.filter(n => n.tipo === 'troca_rejeitada').length,
          escala: notifications.filter(n => n.tipo === 'escala').length,
          geral: notifications.filter(n => n.tipo === 'geral').length,
        }
      };

      return stats;
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return {
        total: 0,
        naoLidas: 0,
        porTipo: { admin: 0, troca_aprovada: 0, troca_rejeitada: 0, escala: 0, geral: 0 }
      };
    }
  }

  /**
   * Buscar todas as notificações (para admin)
   */
  static async getAllNotifications(limitCount: number = 100): Promise<InternalNotification[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        orderBy('criadoEm', 'desc'),
        limit(limitCount)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        criadoEm: doc.data().criadoEm.toDate(),
      })) as InternalNotification[];
    } catch (error) {
      console.error('Erro ao buscar todas as notificações:', error);
      return [];
    }
  }

  /**
   * Contar notificações não lidas de um residente
   */
  static async contarNaoLidas(residenteEmail: string): Promise<number> {
    try {
      const q = query(
        collection(db, this.COLLECTION),
        where('residenteEmail', '==', residenteEmail),
        where('lida', '==', false)
      );

      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      console.error('Erro ao contar notificações não lidas:', error);
      return 0;
    }
  }
}
