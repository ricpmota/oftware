import { collection, addDoc, getDocs, query, where, updateDoc, doc, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Indicacao } from '@/types/indicacao';

export class IndicacaoService {
  private static COLLECTION = 'indicacoes';

  /**
   * Criar uma nova indicação
   */
  static async criarIndicacao(indicacao: Omit<Indicacao, 'id' | 'criadoEm'>): Promise<string> {
    try {
      const indicacaoData: any = {
        indicadoPor: indicacao.indicadoPor,
        nomePaciente: indicacao.nomePaciente,
        telefonePaciente: indicacao.telefonePaciente,
        estado: indicacao.estado,
        cidade: indicacao.cidade,
        medicoId: indicacao.medicoId,
        medicoNome: indicacao.medicoNome,
        status: 'pendente',
        criadoEm: Timestamp.now()
      };

      if (indicacao.indicadoPorNome) {
        indicacaoData.indicadoPorNome = indicacao.indicadoPorNome;
      }

      const docRef = await addDoc(collection(db, this.COLLECTION), indicacaoData);
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar indicação:', error);
      throw error;
    }
  }

  /**
   * Buscar indicações por quem indicou (paciente)
   */
  static async getIndicacoesPorPaciente(emailPaciente: string): Promise<Indicacao[]> {
    try {
      console.log('Buscando indicações para email:', emailPaciente);
      
      // Primeiro buscar sem orderBy para evitar erro de índice
      const q = query(
        collection(db, this.COLLECTION),
        where('indicadoPor', '==', emailPaciente)
      );
      const snapshot = await getDocs(q);
      
      console.log('Documentos encontrados:', snapshot.docs.length);
      
      const indicacoes = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          indicadoPor: data.indicadoPor,
          indicadoPorNome: data.indicadoPorNome,
          nomePaciente: data.nomePaciente,
          telefonePaciente: data.telefonePaciente,
          estado: data.estado,
          cidade: data.cidade,
          medicoId: data.medicoId,
          medicoNome: data.medicoNome,
          status: data.status || 'pendente',
          criadoEm: data.criadoEm?.toDate() || new Date(),
          visualizadaEm: data.visualizadaEm?.toDate(),
          virouVendaEm: data.virouVendaEm?.toDate(),
          pagaEm: data.pagaEm?.toDate(),
          pacienteIdVenda: data.pacienteIdVenda
        } as Indicacao;
      });
      
      // Ordenar manualmente por data de criação (mais recente primeiro)
      indicacoes.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
      
      console.log('Indicações processadas:', indicacoes.length);
      return indicacoes;
    } catch (error) {
      console.error('Erro ao buscar indicações do paciente:', error);
      throw error;
    }
  }

  /**
   * Buscar indicações pendentes para um médico
   * Retorna todas as indicações do médico (pendentes, visualizadas, vendas, pagas)
   */
  static async getIndicacoesPendentesPorMedico(medicoId: string): Promise<Indicacao[]> {
    try {
      // Buscar todas as indicações do médico sem orderBy para evitar erro de índice
      const q = query(
        collection(db, this.COLLECTION),
        where('medicoId', '==', medicoId)
      );
      const snapshot = await getDocs(q);
      
      const indicacoes = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          indicadoPor: data.indicadoPor,
          indicadoPorNome: data.indicadoPorNome,
          nomePaciente: data.nomePaciente,
          telefonePaciente: data.telefonePaciente,
          estado: data.estado,
          cidade: data.cidade,
          medicoId: data.medicoId,
          medicoNome: data.medicoNome,
          status: data.status || 'pendente',
          criadoEm: data.criadoEm?.toDate() || new Date(),
          visualizadaEm: data.visualizadaEm?.toDate(),
          virouVendaEm: data.virouVendaEm?.toDate(),
          pagaEm: data.pagaEm?.toDate(),
          pacienteIdVenda: data.pacienteIdVenda
        } as Indicacao;
      });
      
      // Ordenar manualmente por data de criação (mais recente primeiro)
      indicacoes.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
      
      return indicacoes;
    } catch (error) {
      console.error('Erro ao buscar indicações pendentes do médico:', error);
      throw error;
    }
  }

  /**
   * Buscar todas as indicações de um médico (para admin)
   */
  static async getIndicacoesPorMedico(medicoId: string): Promise<Indicacao[]> {
    try {
      // Buscar sem orderBy para evitar erro de índice
      const q = query(
        collection(db, this.COLLECTION),
        where('medicoId', '==', medicoId)
      );
      const snapshot = await getDocs(q);
      
      const indicacoes = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          indicadoPor: data.indicadoPor,
          indicadoPorNome: data.indicadoPorNome,
          nomePaciente: data.nomePaciente,
          telefonePaciente: data.telefonePaciente,
          estado: data.estado,
          cidade: data.cidade,
          medicoId: data.medicoId,
          medicoNome: data.medicoNome,
          status: data.status || 'pendente',
          criadoEm: data.criadoEm?.toDate() || new Date(),
          visualizadaEm: data.visualizadaEm?.toDate(),
          virouVendaEm: data.virouVendaEm?.toDate(),
          pagaEm: data.pagaEm?.toDate(),
          pacienteIdVenda: data.pacienteIdVenda
        } as Indicacao;
      });
      
      // Ordenar manualmente por data de criação (mais recente primeiro)
      indicacoes.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
      
      return indicacoes;
    } catch (error) {
      console.error('Erro ao buscar indicações do médico:', error);
      throw error;
    }
  }

  /**
   * Marcar indicação como visualizada pelo médico
   */
  static async marcarComoVisualizada(indicacaoId: string): Promise<void> {
    try {
      const indicacaoRef = doc(db, this.COLLECTION, indicacaoId);
      await updateDoc(indicacaoRef, {
        status: 'visualizada',
        visualizadaEm: Timestamp.now()
      });
    } catch (error) {
      console.error('Erro ao marcar indicação como visualizada:', error);
      throw error;
    }
  }

  /**
   * Marcar indicação como venda (quando paciente faz login e telefone bate)
   */
  static async marcarComoVenda(indicacaoId: string, pacienteId: string): Promise<void> {
    try {
      const indicacaoRef = doc(db, this.COLLECTION, indicacaoId);
      await updateDoc(indicacaoRef, {
        status: 'venda',
        virouVendaEm: Timestamp.now(),
        pacienteIdVenda: pacienteId
      });
    } catch (error) {
      console.error('Erro ao marcar indicação como venda:', error);
      throw error;
    }
  }

  /**
   * Marcar indicação como paga pelo médico
   */
  static async marcarComoPaga(indicacaoId: string): Promise<void> {
    try {
      const indicacaoRef = doc(db, this.COLLECTION, indicacaoId);
      await updateDoc(indicacaoRef, {
        status: 'paga',
        pagaEm: Timestamp.now()
      });
    } catch (error) {
      console.error('Erro ao marcar indicação como paga:', error);
      throw error;
    }
  }

  /**
   * Buscar indicação por telefone (para matching no cadastro)
   */
  static async getIndicacaoPorTelefone(telefone: string): Promise<Indicacao | null> {
    try {
      // Normalizar telefone (remover caracteres especiais)
      const telefoneNormalizado = telefone.replace(/\D/g, '');
      
      // Buscar indicações pendentes ou visualizadas que ainda não viraram venda
      const q = query(
        collection(db, this.COLLECTION),
        where('status', 'in', ['pendente', 'visualizada'])
      );
      const snapshot = await getDocs(q);
      
      // Verificar se algum telefone bate (normalizado)
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const telefoneIndicacao = data.telefonePaciente?.replace(/\D/g, '') || '';
        
        if (telefoneNormalizado === telefoneIndicacao) {
          return {
            id: docSnap.id,
            indicadoPor: data.indicadoPor,
            indicadoPorNome: data.indicadoPorNome,
            nomePaciente: data.nomePaciente,
            telefonePaciente: data.telefonePaciente,
            estado: data.estado,
            cidade: data.cidade,
            medicoId: data.medicoId,
            medicoNome: data.medicoNome,
            status: data.status || 'pendente',
            criadoEm: data.criadoEm?.toDate() || new Date(),
            visualizadaEm: data.visualizadaEm?.toDate(),
            virouVendaEm: data.virouVendaEm?.toDate(),
            pagaEm: data.pagaEm?.toDate(),
            pacienteIdVenda: data.pacienteIdVenda
          } as Indicacao;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao buscar indicação por telefone:', error);
      return null;
    }
  }
}

