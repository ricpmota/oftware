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
  medicoId?: string; // ID do médico responsável
  medicoEmail?: string; // Email do médico responsável
  titulo: string;
  mensagem: string;
  tipo: 'clinico' | 'alerta' | 'orientacao' | 'revisao';
  lida: boolean;
  lidaEm?: Date;
  criadoEm: Date;
  criadoPor: string; // Email de quem criou (médico ou paciente)
  direcao: 'medico_para_paciente' | 'paciente_para_medico'; // Direção da mensagem
  deletada?: boolean;
  pacienteNome?: string; // Nome do paciente (para exibição no médico)
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
   * Buscar mensagens de um paciente (do médico para o paciente)
   */
  static async getMensagensPaciente(pacienteEmail: string): Promise<PacienteMensagem[]> {
    try {
      // Buscar todas as mensagens do paciente (sem filtrar por direcao para compatibilidade com dados antigos)
      const q = query(
        collection(db, 'pacientes_mensagens'),
        where('pacienteEmail', '==', pacienteEmail)
      );

      const snapshot = await getDocs(q);
      
      const mensagens = snapshot.docs.map(doc => {
        const data = doc.data();
        const direcao = data.direcao || 'medico_para_paciente'; // Default para compatibilidade
        
        return {
          id: doc.id,
          mensagemId: data.mensagemId,
          pacienteId: data.pacienteId,
          pacienteEmail: data.pacienteEmail,
          medicoId: data.medicoId,
          medicoEmail: data.medicoEmail,
          titulo: data.titulo || '',
          mensagem: data.mensagem || '',
          tipo: data.tipo || 'clinico',
          lida: data.lida || false,
          lidaEm: data.lidaEm?.toDate(),
          criadoEm: data.criadoEm?.toDate() || new Date(),
          criadoPor: data.criadoPor || '',
          direcao: direcao,
          deletada: data.deletada || false,
          pacienteNome: data.pacienteNome
        } as PacienteMensagem;
      });

      // Retornar TODAS as mensagens (recebidas e enviadas) - o filtro será feito no componente
      // Filtrar apenas mensagens não deletadas
      const mensagensFiltradas = mensagens.filter(m => !m.deletada);

      // Ordenar no cliente (mais recente primeiro)
      return mensagensFiltradas.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
    } catch (error) {
      console.error('Erro ao buscar mensagens:', error);
      return [];
    }
  }

  /**
   * Buscar mensagens do paciente para o médico
   */
  static async getMensagensPacienteParaMedico(medicoId: string, pacienteEmail?: string): Promise<PacienteMensagem[]> {
    try {
      let q;
      if (pacienteEmail) {
        // Buscar todas as mensagens do paciente para este médico
        q = query(
          collection(db, 'pacientes_mensagens'),
          where('medicoId', '==', medicoId),
          where('pacienteEmail', '==', pacienteEmail)
        );
      } else {
        q = query(
          collection(db, 'pacientes_mensagens'),
          where('medicoId', '==', medicoId)
        );
      }

      const snapshot = await getDocs(q);
      
      const mensagens = snapshot.docs.map(doc => {
        const data = doc.data();
        const direcao = data.direcao || 'medico_para_paciente'; // Default para compatibilidade
        
        return {
          id: doc.id,
          mensagemId: data.mensagemId,
          pacienteId: data.pacienteId,
          pacienteEmail: data.pacienteEmail,
          medicoId: data.medicoId,
          medicoEmail: data.medicoEmail,
          titulo: data.titulo || '',
          mensagem: data.mensagem || '',
          tipo: data.tipo || 'clinico',
          lida: data.lida || false,
          lidaEm: data.lidaEm?.toDate(),
          criadoEm: data.criadoEm?.toDate() || new Date(),
          criadoPor: data.criadoPor || '',
          direcao: direcao,
          deletada: data.deletada || false,
          pacienteNome: data.pacienteNome
        } as PacienteMensagem;
      });

      // Filtrar apenas mensagens do paciente para o médico
      const mensagensFiltradas = mensagens.filter(m => 
        m.direcao === 'paciente_para_medico'
      );

      // Ordenar no cliente (mais recente primeiro)
      return mensagensFiltradas.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
    } catch (error) {
      console.error('Erro ao buscar mensagens do paciente para o médico:', error);
      return [];
    }
  }

  /**
   * Contar mensagens não lidas do paciente para o médico
   */
  static async contarMensagensNaoLidasPacienteParaMedico(medicoId: string, pacienteEmail?: string): Promise<number> {
    try {
      let q;
      if (pacienteEmail) {
        q = query(
          collection(db, 'pacientes_mensagens'),
          where('medicoId', '==', medicoId),
          where('pacienteEmail', '==', pacienteEmail),
          where('direcao', '==', 'paciente_para_medico'),
          where('lida', '==', false),
          where('deletada', '==', false)
        );
      } else {
        q = query(
          collection(db, 'pacientes_mensagens'),
          where('medicoId', '==', medicoId),
          where('direcao', '==', 'paciente_para_medico'),
          where('lida', '==', false),
          where('deletada', '==', false)
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.length;
    } catch (error) {
      console.error('Erro ao contar mensagens não lidas:', error);
      return 0;
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

