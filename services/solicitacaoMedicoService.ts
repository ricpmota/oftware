import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SolicitacaoMedico } from '@/types/solicitacaoMedico';

export class SolicitacaoMedicoService {
  /**
   * Criar uma nova solicitação de médico
   */
  static async criarSolicitacao(solicitacao: Omit<SolicitacaoMedico, 'id' | 'criadoEm'>): Promise<string> {
    try {
      // Remove campos undefined antes de salvar
      const solicitacaoData: any = {
        pacienteEmail: solicitacao.pacienteEmail,
        pacienteNome: solicitacao.pacienteNome,
        medicoId: solicitacao.medicoId,
        medicoNome: solicitacao.medicoNome,
        status: solicitacao.status,
        criadoEm: new Date()
      };

      if (solicitacao.pacienteId) {
        solicitacaoData.pacienteId = solicitacao.pacienteId;
      }

      if (solicitacao.pacienteTelefone) {
        solicitacaoData.pacienteTelefone = solicitacao.pacienteTelefone;
      }

      const docRef = await addDoc(collection(db, 'solicitacoes_medico'), solicitacaoData);
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      throw error;
    }
  }

  /**
   * Buscar solicitações de um médico
   */
  static async getSolicitacoesPorMedico(medicoId: string): Promise<SolicitacaoMedico[]> {
    try {
      const q = query(
        collection(db, 'solicitacoes_medico'),
        where('medicoId', '==', medicoId)
      );

      const snapshot = await getDocs(q);
      
      const solicitacoes = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          pacienteId: data.pacienteId,
          pacienteEmail: data.pacienteEmail || '',
          pacienteNome: data.pacienteNome || '',
          pacienteTelefone: data.pacienteTelefone,
          medicoId: data.medicoId || '',
          medicoNome: data.medicoNome || '',
          status: data.status || 'pendente',
          criadoEm: data.criadoEm?.toDate() || new Date(),
          aceitaEm: data.aceitaEm?.toDate(),
          rejeitadaEm: data.rejeitadaEm?.toDate(),
          desistiuEm: data.desistiuEm?.toDate(),
          observacoes: data.observacoes,
          motivoDesistencia: data.motivoDesistencia
        } as SolicitacaoMedico;
      });

      // Ordenar no cliente (mais recente primeiro)
      return solicitacoes.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
      return [];
    }
  }

  /**
   * Buscar solicitações de um paciente
   */
  static async getSolicitacoesPorPaciente(pacienteEmail: string): Promise<SolicitacaoMedico[]> {
    try {
      const q = query(
        collection(db, 'solicitacoes_medico'),
        where('pacienteEmail', '==', pacienteEmail)
      );

      const snapshot = await getDocs(q);
      
      const solicitacoes = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          pacienteId: data.pacienteId,
          pacienteEmail: data.pacienteEmail || '',
          pacienteNome: data.pacienteNome || '',
          pacienteTelefone: data.pacienteTelefone,
          medicoId: data.medicoId || '',
          medicoNome: data.medicoNome || '',
          status: data.status || 'pendente',
          criadoEm: data.criadoEm?.toDate() || new Date(),
          aceitaEm: data.aceitaEm?.toDate(),
          rejeitadaEm: data.rejeitadaEm?.toDate(),
          desistiuEm: data.desistiuEm?.toDate(),
          observacoes: data.observacoes,
          motivoDesistencia: data.motivoDesistencia
        } as SolicitacaoMedico;
      });

      // Ordenar no cliente (mais recente primeiro)
      return solicitacoes.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
    } catch (error) {
      console.error('Erro ao buscar solicitações:', error);
      return [];
    }
  }

  /**
   * Aceitar solicitação
   */
  static async aceitarSolicitacao(solicitacaoId: string, observacoes?: string): Promise<void> {
    try {
      const updateData: any = {
        status: 'aceita',
        aceitaEm: new Date()
      };

      if (observacoes) {
        updateData.observacoes = observacoes;
      }

      await updateDoc(doc(db, 'solicitacoes_medico', solicitacaoId), updateData);
    } catch (error) {
      console.error('Erro ao aceitar solicitação:', error);
      throw error;
    }
  }

  /**
   * Rejeitar solicitação
   */
  static async rejeitarSolicitacao(solicitacaoId: string, observacoes?: string): Promise<void> {
    try {
      const updateData: any = {
        status: 'rejeitada',
        rejeitadaEm: new Date()
      };

      if (observacoes) {
        updateData.observacoes = observacoes;
      }

      await updateDoc(doc(db, 'solicitacoes_medico', solicitacaoId), updateData);
    } catch (error) {
      console.error('Erro ao rejeitar solicitação:', error);
      throw error;
    }
  }

  /**
   * Marcar como desistiu (paciente desistiu)
   */
  static async desistirSolicitacao(solicitacaoId: string, motivoDesistencia?: string): Promise<void> {
    try {
      const updateData: any = {
        status: 'desistiu',
        desistiuEm: new Date()
      };

      if (motivoDesistencia) {
        updateData.motivoDesistencia = motivoDesistencia;
      }

      await updateDoc(doc(db, 'solicitacoes_medico', solicitacaoId), updateData);
    } catch (error) {
      console.error('Erro ao marcar como desistiu:', error);
      throw error;
    }
  }

  /**
   * Cancelar todas as solicitações pendentes de um paciente
   */
  static async cancelarSolicitacoesPendentesPaciente(pacienteEmail: string): Promise<void> {
    try {
      const solicitacoes = await this.getSolicitacoesPorPaciente(pacienteEmail);
      const pendentes = solicitacoes.filter(s => s.status === 'pendente');
      
      for (const solicitacao of pendentes) {
        await updateDoc(doc(db, 'solicitacoes_medico', solicitacao.id), {
          status: 'desistiu',
          desistiuEm: new Date()
        });
      }
    } catch (error) {
      console.error('Erro ao cancelar solicitações pendentes:', error);
      throw error;
    }
  }
}

