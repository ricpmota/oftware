import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Mensagem, MensagemResidente, MensagemResidenteParaAdmin } from '@/types/mensagem';
import { Residente } from '@/types/auth';

export class MensagemService {
  
  /**
   * Criar uma nova mensagem do admin
   */
  static async criarMensagem(mensagem: Omit<Mensagem, 'id' | 'criadoEm'>): Promise<string> {
    try {
      console.log('📝 Tentando criar mensagem:', mensagem);
      
      const mensagemData = {
        ...mensagem,
        criadoEm: new Date()
      };

      console.log('📝 Dados da mensagem:', mensagemData);

      const docRef = await addDoc(collection(db, 'mensagens'), mensagemData);
      console.log('✅ Mensagem criada com sucesso:', docRef.id);
      
      return docRef.id;
    } catch (error) {
      console.error('❌ Erro ao criar mensagem:', error);
      console.error('❌ Detalhes do erro:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Enviar mensagem para residentes
   */
  static async enviarMensagem(
    mensagemId: string, 
    residentes: Residente[], 
    adminEmail: string
  ): Promise<{ sucesso: number; falhas: number }> {
    try {
      console.log('📤 Iniciando envio de mensagem:', { mensagemId, residentes: residentes.length, adminEmail });
      
      // Buscar a mensagem original
      const mensagemDoc = await getDocs(
        query(collection(db, 'mensagens'), where('__name__', '==', mensagemId))
      );
      
      if (mensagemDoc.empty) {
        throw new Error('Mensagem não encontrada');
      }

      const mensagemData = mensagemDoc.docs[0].data();
      console.log('📤 Dados da mensagem encontrada:', mensagemData);
      
      const resultados = { sucesso: 0, falhas: 0 };

      // Criar mensagens individuais para cada residente
      for (const residente of residentes) {
        try {
          console.log(`📤 Enviando para residente: ${residente.email}`);
          
          const mensagemResidente: Omit<MensagemResidente, 'id'> = {
            mensagemId,
            residenteEmail: residente.email,
            titulo: mensagemData.titulo || '',
            mensagem: mensagemData.mensagem || '',
            lida: false,
            criadoEm: new Date()
          };

          console.log('📤 Dados da mensagem do residente:', mensagemResidente);

          await addDoc(collection(db, 'mensagens_residentes'), mensagemResidente);
          resultados.sucesso++;
          console.log(`✅ Mensagem enviada para ${residente.email}`);
          
        } catch (error) {
          console.error(`❌ Erro ao enviar mensagem para ${residente.email}:`, error);
          console.error('❌ Detalhes do erro:', {
            code: error.code,
            message: error.message
          });
          resultados.falhas++;
        }
      }

      // Atualizar status da mensagem original
      console.log('📤 Atualizando status da mensagem original...');
      await updateDoc(doc(db, 'mensagens', mensagemId), {
        enviadoEm: new Date()
      });

      console.log(`📤 Mensagem enviada: ${resultados.sucesso} sucessos, ${resultados.falhas} falhas`);
      
      return resultados;
      
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      console.error('❌ Detalhes do erro:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Buscar mensagens de um residente
   */
  static async getMensagensResidente(residenteEmail: string): Promise<MensagemResidente[]> {
    try {
      console.log('📬 Buscando mensagens para residente:', residenteEmail);
      
      // Primeiro, buscar sem orderBy para evitar problemas de índice
      const q = query(
        collection(db, 'mensagens_residentes'),
        where('residenteEmail', '==', residenteEmail)
      );

      const snapshot = await getDocs(q);
      console.log('📬 Snapshot recebido:', snapshot.docs.length, 'documentos');
      
      const mensagens = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📬 Processando documento:', doc.id, data);
        return {
          id: doc.id,
          mensagemId: data.mensagemId || '',
          residenteEmail: data.residenteEmail || '',
          titulo: data.titulo || '',
          mensagem: data.mensagem || '',
          lida: data.lida || false,
          lidaEm: data.lidaEm?.toDate(),
          criadoEm: data.criadoEm?.toDate() || new Date(),
          deletada: data.deletada || false
        } as MensagemResidente;
      })
      .filter(mensagem => !mensagem.deletada) // Filtrar mensagens deletadas
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime()); // Ordenar por data
      
      console.log('📬 Mensagens processadas:', mensagens);
      return mensagens;
      
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens do residente:', error);
      console.error('❌ Detalhes do erro:', {
        code: error.code,
        message: error.message
      });
      throw error;
    }
  }

  /**
   * Marcar mensagem como lida
   */
  static async marcarComoLida(mensagemId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'mensagens_residentes', mensagemId), {
        lida: true,
        lidaEm: new Date()
      });
      
      console.log('✅ Mensagem marcada como lida:', mensagemId);
      
    } catch (error) {
      console.error('❌ Erro ao marcar mensagem como lida:', error);
      throw error;
    }
  }

  /**
   * Buscar mensagens do admin
   */
  static async getMensagensAdmin(adminEmail: string): Promise<Mensagem[]> {
    try {
      console.log('📋 Buscando mensagens do admin:', adminEmail);
      
      // Primeiro, buscar sem orderBy para evitar problemas de índice
      const q = query(
        collection(db, 'mensagens'),
        where('criadoPor', '==', adminEmail)
      );

      const snapshot = await getDocs(q);
      console.log('📋 Snapshot recebido:', snapshot.docs.length, 'documentos');
      
      const mensagens = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📋 Processando documento:', doc.id, data);
        return {
          id: doc.id,
          titulo: data.titulo || '',
          mensagem: data.mensagem || '',
          destinatarios: data.destinatarios || 'todos',
          residentesSelecionados: data.residentesSelecionados || [],
          criadoPor: data.criadoPor || '',
          criadoEm: data.criadoEm?.toDate() || new Date(),
          enviadoEm: data.enviadoEm?.toDate(),
          deletada: data.deletada || false,
          deletadaEm: data.deletadaEm?.toDate()
        } as Mensagem;
      })
      .filter(mensagem => !mensagem.deletada) // Filtrar mensagens deletadas
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime()); // Ordenar por data
      
      console.log('📋 Mensagens processadas:', mensagens);
      return mensagens;
      
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens do admin:', error);
      console.error('❌ Detalhes do erro:', {
        code: error.code,
        message: error.message
      });
      throw error;
    }
  }

  /**
   * Buscar todos os residentes para seleção
   */
  static async getResidentes(): Promise<Residente[]> {
    try {
      const q = query(collection(db, 'residentes'), orderBy('nome', 'asc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Residente[];
      
    } catch (error) {
      console.error('❌ Erro ao buscar residentes:', error);
      throw error;
    }
  }

  /**
   * Deletar mensagem do admin
   */
  static async deletarMensagem(mensagemId: string): Promise<void> {
    try {
      console.log('🗑️ Deletando mensagem:', mensagemId);
      
      // Deletar mensagem original
      await updateDoc(doc(db, 'mensagens', mensagemId), {
        deletada: true,
        deletadaEm: new Date()
      });

      // Deletar todas as mensagens dos residentes relacionadas
      const q = query(
        collection(db, 'mensagens_residentes'),
        where('mensagemId', '==', mensagemId)
      );
      
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          deletada: true,
          deletadaEm: new Date()
        })
      );
      
      await Promise.all(deletePromises);
      
      console.log('✅ Mensagem deletada com sucesso');
      
    } catch (error) {
      console.error('❌ Erro ao deletar mensagem:', error);
      throw error;
    }
  }

  /**
   * Criar mensagem do residente para o admin
   */
  static async criarMensagemResidenteParaAdmin(
    residenteEmail: string,
    residenteNome: string,
    titulo: string,
    mensagem: string,
    anonima: boolean
  ): Promise<string> {
    try {
      console.log('📤 Criando mensagem do residente para admin:', { residenteEmail, anonima });
      
      const mensagemData = {
        residenteEmail,
        residenteNome: anonima ? 'Anônimo' : residenteNome,
        titulo: titulo.trim(),
        mensagem: mensagem.trim(),
        anonima,
        lida: false,
        criadoEm: new Date()
      };

      console.log('📤 Dados da mensagem:', mensagemData);

      const docRef = await addDoc(collection(db, 'mensagens_residente_admin'), mensagemData);
      console.log('✅ Mensagem do residente criada com sucesso:', docRef.id);
      
      return docRef.id;
      
    } catch (error) {
      console.error('❌ Erro ao criar mensagem do residente:', error);
      console.error('❌ Detalhes do erro:', {
        code: error.code,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Buscar mensagens do residente para o admin
   */
  static async getMensagensResidenteParaAdmin(): Promise<MensagemResidenteParaAdmin[]> {
    try {
      console.log('📥 Buscando mensagens dos residentes para admin');
      
      const q = query(collection(db, 'mensagens_residente_admin'));

      const snapshot = await getDocs(q);
      console.log('📥 Snapshot recebido:', snapshot.docs.length, 'documentos');
      
      const mensagens = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📥 Processando documento:', doc.id, data);
        return {
          id: doc.id,
          residenteEmail: data.residenteEmail || '',
          residenteNome: data.residenteNome || '',
          titulo: data.titulo || '',
          mensagem: data.mensagem || '',
          anonima: data.anonima || false,
          lida: data.lida || false,
          lidaEm: data.lidaEm?.toDate(),
          criadoEm: data.criadoEm?.toDate() || new Date(),
          deletada: data.deletada || false,
          deletadaEm: data.deletadaEm?.toDate()
        } as MensagemResidenteParaAdmin;
      })
      .filter(mensagem => !mensagem.deletada) // Filtrar mensagens deletadas
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime()); // Ordenar por data
      
      console.log('📥 Mensagens processadas:', mensagens);
      return mensagens;
      
    } catch (error) {
      console.error('❌ Erro ao buscar mensagens dos residentes:', error);
      console.error('❌ Detalhes do erro:', {
        code: error.code,
        message: error.message
      });
      throw error;
    }
  }

  /**
   * Marcar mensagem do residente como lida pelo admin
   */
  static async marcarMensagemResidenteComoLida(mensagemId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'mensagens_residente_admin', mensagemId), {
        lida: true,
        lidaEm: new Date()
      });
      
      console.log('✅ Mensagem do residente marcada como lida:', mensagemId);
      
    } catch (error) {
      console.error('❌ Erro ao marcar mensagem do residente como lida:', error);
      throw error;
    }
  }

  /**
   * Deletar mensagem do residente pelo admin
   */
  static async deletarMensagemResidente(mensagemId: string): Promise<void> {
    try {
      console.log('🗑️ Deletando mensagem do residente:', mensagemId);
      
      await updateDoc(doc(db, 'mensagens_residente_admin', mensagemId), {
        deletada: true,
        deletadaEm: new Date()
      });
      
      console.log('✅ Mensagem do residente deletada com sucesso');
      
    } catch (error) {
      console.error('❌ Erro ao deletar mensagem do residente:', error);
      throw error;
    }
  }

  /**
   * Função de teste para verificar todas as mensagens
   */
  static async testarMensagens(): Promise<void> {
    try {
      console.log('🧪 Testando mensagens...');
      
      // Buscar todas as mensagens
      const snapshot = await getDocs(collection(db, 'mensagens'));
      console.log('🧪 Total de mensagens no banco:', snapshot.docs.length);
      
      snapshot.docs.forEach((doc, index) => {
        console.log(`🧪 Mensagem ${index + 1}:`, {
          id: doc.id,
          data: doc.data()
        });
      });

      // Buscar todas as mensagens dos residentes
      const snapshotResidentes = await getDocs(collection(db, 'mensagens_residentes'));
      console.log('🧪 Total de mensagens dos residentes:', snapshotResidentes.docs.length);
      
      snapshotResidentes.docs.forEach((doc, index) => {
        console.log(`🧪 Mensagem Residente ${index + 1}:`, {
          id: doc.id,
          data: doc.data()
        });
      });

      // Buscar todas as mensagens dos residentes para admin
      const snapshotResidenteAdmin = await getDocs(collection(db, 'mensagens_residente_admin'));
      console.log('🧪 Total de mensagens dos residentes para admin:', snapshotResidenteAdmin.docs.length);
      
      snapshotResidenteAdmin.docs.forEach((doc, index) => {
        console.log(`🧪 Mensagem Residente->Admin ${index + 1}:`, {
          id: doc.id,
          data: doc.data()
        });
      });
      
    } catch (error) {
      console.error('❌ Erro no teste:', error);
    }
  }
}
