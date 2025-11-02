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

export interface PacienteMensagem {
  id: string;
  mensagemId?: string; // ID da mensagem original (se houver)
  pacienteId: string;
  pacienteEmail: string;
  titulo: string;
  mensagem: string;
  tipo: 'clinico' | 'alerta' | 'orientacao' | 'revisao';
  lida: boolean;
  lidaEm?: Date;
  criadoEm: Date;
  criadoPor: string; // Email do médico
  deletada?: boolean;
}

export class PacienteMensagemService {
  
  /**
   * Criar uma nova mensagem do médico
   */
  static async criarMensagem(mensagem: Omit<PacienteMensagem, 'id' | 'criadoEm'>): Promise<string> {
    try {
      const mensagemData = {
        ...mensagem,
        criadoEm: new Date()
      };

      const docRef = await addDoc(collection(db, 'pacientes_mensagens'), mensagemData);
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar mensagem:', error);
      throw error;
    }
  }

  /**
   * Buscar mensagens de um paciente
   */
  static async getMensagensPaciente(pacienteEmail: string): Promise<PacienteMensagem[]> {
    try {
      const q = query(
        collection(db, 'pacientes_mensagens'),
        where('pacienteEmail', '==', pacienteEmail),
        orderBy('criadoEm', 'desc')
      );

      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          mensagemId: data.mensagemId,
          pacienteId: data.pacienteId,
          pacienteEmail: data.pacienteEmail,
          titulo: data.titulo || '',
          mensagem: data.mensagem || '',
          tipo: data.tipo || 'clinico',
          lida: data.lida || false,
          lidaEm: data.lidaEm?.toDate(),
          criadoEm: data.criadoEm?.toDate() || new Date(),
          criadoPor: data.criadoPor || '',
          deletada: data.deletada || false
        } as PacienteMensagem;
      });
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      return [];
    }
  }

  /**
   * Marcar mensagem como lida
   */
  static async marcarComoLida(mensagemId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'pacientes_mensagens', mensagemId), {
        lida: true,
        lidaEm: new Date()
      });
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error);
      throw error;
    }
  }

  /**
   * Deletar mensagem
   */
  static async deletarMensagem(mensagemId: string): Promise<void> {
    try {
      await updateDoc(doc(db, 'pacientes_mensagens', mensagemId), {
        deletada: true
      });
    } catch (error) {
      console.error('Erro ao deletar mensagem:', error);
      throw error;
    }
  }

  /**
   * Contar mensagens não lidas de um paciente
   */
  static async contarMensagensNaoLidas(pacienteEmail: string): Promise<number> {
    try {
      const q = query(
        collection(db, 'pacientes_mensagens'),
        where('pacienteEmail', '==', pacienteEmail),
        where('lida', '==', false),
        where('deletada', '==', false)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.length;
    } catch (error) {
      console.error('Erro ao contar mensagens não lidas:', error);
      return 0;
    }
  }
}

