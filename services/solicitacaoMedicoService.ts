import { collection, addDoc, getDocs, query, where, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SolicitacaoMedico } from '@/types/solicitacaoMedico';

export class SolicitacaoMedicoService {
  /**
   * Criar uma nova solicitação de médico
   * @param solicitacao - Dados da solicitação
   * @param emailIndicador - Email do paciente que indicou (opcional, para indicação por link)
   */
  static async criarSolicitacao(
    solicitacao: Omit<SolicitacaoMedico, 'id' | 'criadoEm'>,
    emailIndicador?: string
  ): Promise<string> {
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
      
      // Se houver emailIndicador, criar indicação automaticamente
      if (emailIndicador && solicitacao.pacienteTelefone) {
        try {
          const { IndicacaoService } = await import('@/services/indicacaoService');
          const { MedicoService } = await import('@/services/medicoService');
          
          // Buscar dados do médico para obter cidade/estado
          const medico = await MedicoService.getMedicoById(solicitacao.medicoId);
          if (medico && medico.cidades.length > 0) {
            const primeiraCidade = medico.cidades[0];
            
            // Buscar dados do indicador (paciente que indicou)
            const { PacienteService } = await import('@/services/pacienteService');
            // Buscar paciente por userId (email)
            const pacientesQuery = query(
              collection(db, 'pacientes_completos'),
              where('userId', '==', emailIndicador)
            );
            const pacientesSnapshot = await getDocs(pacientesQuery);
            const pacienteIndicador = pacientesSnapshot.empty ? null : {
              nome: pacientesSnapshot.docs[0].data().nome || emailIndicador.split('@')[0],
              dadosIdentificacao: pacientesSnapshot.docs[0].data().dadosIdentificacao || {}
            };
            
            await IndicacaoService.criarIndicacao({
              indicadoPor: emailIndicador,
              indicadoPorNome: pacienteIndicador?.nome || emailIndicador.split('@')[0],
              indicadoPorTelefone: pacienteIndicador?.dadosIdentificacao?.telefone?.replace(/\D/g, '') || '',
              nomePaciente: solicitacao.pacienteNome,
              telefonePaciente: solicitacao.pacienteTelefone.replace(/\D/g, ''),
              estado: primeiraCidade.estado,
              cidade: primeiraCidade.cidade,
              medicoId: solicitacao.medicoId,
              medicoNome: solicitacao.medicoNome
            });
            
            console.log('✅ Indicação criada automaticamente via link para:', emailIndicador);
          }
        } catch (indicacaoError) {
          console.error('❌ Erro ao criar indicação automática:', indicacaoError);
          // Não bloquear o fluxo se a indicação falhar
        }
      }
      
      // Enviar e-mail para o médico sobre o novo lead
      try {
        console.log('📧 Tentando enviar e-mail de novo lead médico...', {
          solicitacaoId: docRef.id,
          medicoId: solicitacao.medicoId,
          pacienteNome: solicitacao.pacienteNome
        });
        
        const emailResponse = await fetch('/api/send-email-novo-lead-medico', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ solicitacaoId: docRef.id }),
        });

        const emailResult = await emailResponse.json();
        
        if (!emailResponse.ok) {
          console.error('❌ Erro ao enviar e-mail de novo lead médico:', emailResult);
        } else {
          console.log('✅ E-mail de novo lead médico enviado com sucesso:', emailResult);
        }
      } catch (emailError) {
        console.error('❌ Erro ao enviar e-mail de novo lead médico:', emailError);
        // Não bloquear o fluxo se o e-mail falhar
      }
      
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
   * Rejeitar solicitação - deleta o documento da coleção
   */
  static async rejeitarSolicitacao(solicitacaoId: string, observacoes?: string): Promise<void> {
    try {
      // Deletar o documento da coleção solicitacoes_medico
      await deleteDoc(doc(db, 'solicitacoes_medico', solicitacaoId));
      console.log('✅ Solicitação deletada com sucesso');
    } catch (error) {
      console.error('Erro ao rejeitar/deletar solicitação:', error);
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

  /**
   * Deletar todas as solicitações de um paciente (usado quando paciente abandona tratamento)
   */
  static async deletarSolicitacoesPaciente(pacienteEmail: string): Promise<void> {
    try {
      const solicitacoes = await this.getSolicitacoesPorPaciente(pacienteEmail);
      
      for (const solicitacao of solicitacoes) {
        await deleteDoc(doc(db, 'solicitacoes_medico', solicitacao.id));
      }
    } catch (error) {
      console.error('Erro ao deletar solicitações do paciente:', error);
      throw error;
    }
  }

  /**
   * Deletar solicitações de vínculo entre um médico e um paciente específico.
   */
  static async deletarSolicitacoesPorMedicoEPaciente(medicoId: string, pacienteId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'solicitacoes_medico'),
        where('medicoId', '==', medicoId),
        where('pacienteId', '==', pacienteId)
      );

      const snapshot = await getDocs(q);
      for (const solicitacaoDoc of snapshot.docs) {
        await deleteDoc(doc(db, 'solicitacoes_medico', solicitacaoDoc.id));
      }
    } catch (error) {
      console.error('Erro ao deletar solicitações por médico e paciente:', error);
      throw error;
    }
  }

  /**
   * Buscar todas as solicitações pendentes
   */
  static async getAllSolicitacoesPendentes(): Promise<SolicitacaoMedico[]> {
    try {
      const q = query(
        collection(db, 'solicitacoes_medico'),
        where('status', '==', 'pendente')
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

      return solicitacoes;
    } catch (error) {
      console.error('Erro ao buscar solicitações pendentes:', error);
      return [];
    }
  }

  /**
   * Buscar todas as solicitações (qualquer status)
   */
  static async getAllSolicitacoes(): Promise<SolicitacaoMedico[]> {
    try {
      const snapshot = await getDocs(collection(db, 'solicitacoes_medico'));

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

      return solicitacoes.sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
    } catch (error) {
      console.error('Erro ao buscar todas as solicitações:', error);
      return [];
    }
  }
}

