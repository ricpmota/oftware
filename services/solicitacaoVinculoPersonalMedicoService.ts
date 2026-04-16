/**
 * Serviço para gerenciar solicitações de vínculo entre Personal Trainer e médico
 */

import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { SolicitacaoVinculoPersonalMedicoDoc } from '@/features/metaPersonal/metaPersonal.types';
import { COL_SOLICITACOES_VINCULO_PERSONAL_MEDICO, COL_PERSONAL_TRAINERS, COL_PACIENTE_PERSONAL_TRAINER, COL_SOLICITACOES_PERSONAL_TRAINER, SOLICITACAO_STATUS } from '@/features/metaPersonal/metaPersonal.constants';
import { PersonalTrainerService } from './personalTrainerService';
import { MedicoService } from './medicoService';
import { AuditLogService } from './auditLogService';

export class SolicitacaoVinculoPersonalMedicoService {
  /**
   * Cria uma solicitação de vínculo entre Personal Trainer e médico
   * Verifica duplicidade antes de criar
   * @param solicitadoPor - 'personal_trainer' quando o personal solicita, 'medico' quando o médico solicita
   */
  static async createVinculoRequest(
    personalTrainerId: string,
    medicoId: string,
    solicitadoPor: 'medico' | 'personal_trainer',
    extraData?: {
      personalTrainerNome?: string;
      personalTrainerEmail?: string;
      medicoNome?: string;
    }
  ): Promise<string> {
    try {
      // Verificar se já existe solicitação pendente ou aceita
      const qPendente = query(
        collection(db, COL_SOLICITACOES_VINCULO_PERSONAL_MEDICO),
        where('personalTrainerId', '==', personalTrainerId),
        where('medicoId', '==', medicoId),
        where('status', '==', SOLICITACAO_STATUS.PENDENTE)
      );
      
      const qAceita = query(
        collection(db, COL_SOLICITACOES_VINCULO_PERSONAL_MEDICO),
        where('personalTrainerId', '==', personalTrainerId),
        where('medicoId', '==', medicoId),
        where('status', '==', SOLICITACAO_STATUS.ACEITA)
      );

      const [pendentesSnap, aceitasSnap] = await Promise.all([
        getDocs(qPendente),
        getDocs(qAceita)
      ]);

      if (!pendentesSnap.empty) {
        throw new Error('Já existe uma solicitação pendente para este médico');
      }

      if (!aceitasSnap.empty) {
        throw new Error('Você já está vinculado a este médico');
      }

      // Buscar dados do personal trainer e médico se não fornecidos
      let personalTrainerNome = extraData?.personalTrainerNome;
      let personalTrainerEmail = extraData?.personalTrainerEmail;
      let medicoNome = extraData?.medicoNome;

      if (!personalTrainerNome || !personalTrainerEmail) {
        const personal = await PersonalTrainerService.getPersonalTrainerByUserId(personalTrainerId);
        if (personal) {
          personalTrainerNome = personal.nome;
          personalTrainerEmail = personal.email;
        }
      }

      if (!medicoNome) {
        const medico = await MedicoService.getMedicoById(medicoId);
        if (medico) {
          medicoNome = medico.nome;
        }
      }

      // Criar solicitação
      const novaSolicitacao = {
        personalTrainerId,
        medicoId,
        solicitadoPor, // Identifica quem iniciou a solicitação
        status: SOLICITACAO_STATUS.PENDENTE,
        criadoEm: Timestamp.now(),
        personalTrainerNome: personalTrainerNome || '',
        personalTrainerEmail: personalTrainerEmail || '',
        medicoNome: medicoNome || '',
      };

      const docRef = await addDoc(collection(db, COL_SOLICITACOES_VINCULO_PERSONAL_MEDICO), novaSolicitacao);
      
      console.log('✅ [DEBUG] Solicitação de vínculo criada:', {
        id: docRef.id,
        personalTrainerId,
        medicoId,
        solicitadoPor,
        status: novaSolicitacao.status,
        personalTrainerNome: novaSolicitacao.personalTrainerNome,
        medicoNome: novaSolicitacao.medicoNome
      });
      
      // Verificar se a solicitação foi salva corretamente
      const savedDoc = await getDoc(docRef);
      if (savedDoc.exists()) {
        const savedData = savedDoc.data();
        console.log('✅ [DEBUG] Solicitação verificada após criação:', {
          id: savedDoc.id,
          personalTrainerId: savedData.personalTrainerId,
          medicoId: savedData.medicoId,
          solicitadoPor: savedData.solicitadoPor,
          status: savedData.status
        });
      }
      
      // Log de auditoria
      // TODO: Criar método específico para Personal Trainer no AuditLogService
      // await AuditLogService.logPersonalVinculoSolicitado(personalTrainerId, medicoId, personalTrainerId);
      
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar solicitação de vínculo:', error);
      throw error;
    }
  }

  /**
   * Lista solicitações pendentes RECEBIDAS por um Personal Trainer (que o médico solicitou)
   */
  static async listPendingVinculoRequestsByPersonal(personalTrainerId: string): Promise<SolicitacaoVinculoPersonalMedicoDoc[]> {
    try {
      const q = query(
        collection(db, COL_SOLICITACOES_VINCULO_PERSONAL_MEDICO),
        where('personalTrainerId', '==', personalTrainerId),
        where('solicitadoPor', '==', 'medico'), // Apenas solicitações que o médico fez
        where('status', '==', SOLICITACAO_STATUS.PENDENTE)
      );

      const querySnapshot = await getDocs(q);
      
      const solicitacoes = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          personalTrainerId: data.personalTrainerId,
          medicoId: data.medicoId,
          solicitadoPor: data.solicitadoPor || 'personal_trainer',
          status: data.status,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          aceitoEm: data.aceitoEm?.toDate(),
          rejeitadoEm: data.rejeitadoEm?.toDate(),
          canceladoEm: data.canceladoEm?.toDate(),
          motivoRejeicao: data.motivoRejeicao,
          motivoCancelamento: data.motivoCancelamento,
          personalTrainerNome: data.personalTrainerNome,
          personalTrainerEmail: data.personalTrainerEmail,
          medicoNome: data.medicoNome,
        };
      });

      return solicitacoes.sort((a, b) => {
        const dateA = a.criadoEm?.getTime() || 0;
        const dateB = b.criadoEm?.getTime() || 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Erro ao listar solicitações pendentes do personal trainer:', error);
      throw error;
    }
  }

  /**
   * Lista solicitações ENVIADAS por um Personal Trainer (que o personal fez)
   */
  static async listSentVinculoRequestsByPersonal(personalTrainerId: string): Promise<SolicitacaoVinculoPersonalMedicoDoc[]> {
    try {
      const q = query(
        collection(db, COL_SOLICITACOES_VINCULO_PERSONAL_MEDICO),
        where('personalTrainerId', '==', personalTrainerId),
        where('solicitadoPor', '==', 'personal_trainer') // Apenas solicitações que o personal fez
      );

      const querySnapshot = await getDocs(q);
      
      const solicitacoes = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          personalTrainerId: data.personalTrainerId,
          medicoId: data.medicoId,
          solicitadoPor: data.solicitadoPor || 'personal_trainer',
          status: data.status,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          aceitoEm: data.aceitoEm?.toDate(),
          rejeitadoEm: data.rejeitadoEm?.toDate(),
          canceladoEm: data.canceladoEm?.toDate(),
          motivoRejeicao: data.motivoRejeicao,
          motivoCancelamento: data.motivoCancelamento,
          personalTrainerNome: data.personalTrainerNome,
          personalTrainerEmail: data.personalTrainerEmail,
          medicoNome: data.medicoNome,
        };
      });

      return solicitacoes.sort((a, b) => {
        const dateA = a.criadoEm?.getTime() || 0;
        const dateB = b.criadoEm?.getTime() || 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Erro ao listar solicitações enviadas do personal trainer:', error);
      throw error;
    }
  }

  /**
   * Lista todas as solicitações de vínculo de um Personal Trainer (enviadas e recebidas)
   */
  static async listVinculoRequestsByPersonal(personalTrainerId: string): Promise<SolicitacaoVinculoPersonalMedicoDoc[]> {
    try {
      const q = query(
        collection(db, COL_SOLICITACOES_VINCULO_PERSONAL_MEDICO),
        where('personalTrainerId', '==', personalTrainerId)
      );

      const querySnapshot = await getDocs(q);
      
      const solicitacoes = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          personalTrainerId: data.personalTrainerId,
          medicoId: data.medicoId,
          solicitadoPor: data.solicitadoPor || 'personal_trainer',
          status: data.status,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          aceitoEm: data.aceitoEm?.toDate(),
          rejeitadoEm: data.rejeitadoEm?.toDate(),
          canceladoEm: data.canceladoEm?.toDate(),
          motivoRejeicao: data.motivoRejeicao,
          motivoCancelamento: data.motivoCancelamento,
          personalTrainerNome: data.personalTrainerNome,
          personalTrainerEmail: data.personalTrainerEmail,
          medicoNome: data.medicoNome,
        };
      });

      return solicitacoes.sort((a, b) => {
        const dateA = a.criadoEm?.getTime() || 0;
        const dateB = b.criadoEm?.getTime() || 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Erro ao listar solicitações do personal trainer:', error);
      throw error;
    }
  }

  /**
   * Lista solicitações ENVIADAS por um médico (que o médico fez)
   */
  static async listSentVinculoRequestsByMedico(medicoId: string): Promise<SolicitacaoVinculoPersonalMedicoDoc[]> {
    try {
      const q = query(
        collection(db, COL_SOLICITACOES_VINCULO_PERSONAL_MEDICO),
        where('medicoId', '==', medicoId),
        where('solicitadoPor', '==', 'medico') // Apenas solicitações que o médico fez
      );

      const querySnapshot = await getDocs(q);
      
      const solicitacoes = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          personalTrainerId: data.personalTrainerId,
          medicoId: data.medicoId,
          solicitadoPor: data.solicitadoPor || 'medico',
          status: data.status,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          aceitoEm: data.aceitoEm?.toDate(),
          rejeitadoEm: data.rejeitadoEm?.toDate(),
          canceladoEm: data.canceladoEm?.toDate(),
          motivoRejeicao: data.motivoRejeicao,
          motivoCancelamento: data.motivoCancelamento,
          personalTrainerNome: data.personalTrainerNome,
          personalTrainerEmail: data.personalTrainerEmail,
          medicoNome: data.medicoNome,
        };
      });

      return solicitacoes.sort((a, b) => {
        const dateA = a.criadoEm?.getTime() || 0;
        const dateB = b.criadoEm?.getTime() || 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Erro ao listar solicitações enviadas do médico:', error);
      throw error;
    }
  }

  /**
   * Lista todas as solicitações de vínculo de um médico (enviadas e recebidas)
   */
  static async listAllVinculoRequestsByMedico(medicoId: string): Promise<SolicitacaoVinculoPersonalMedicoDoc[]> {
    try {
      const q = query(
        collection(db, COL_SOLICITACOES_VINCULO_PERSONAL_MEDICO),
        where('medicoId', '==', medicoId)
      );

      const querySnapshot = await getDocs(q);
      
      const solicitacoes = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          personalTrainerId: data.personalTrainerId,
          medicoId: data.medicoId,
          solicitadoPor: data.solicitadoPor || 'personal_trainer',
          status: data.status,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          aceitoEm: data.aceitoEm?.toDate(),
          rejeitadoEm: data.rejeitadoEm?.toDate(),
          canceladoEm: data.canceladoEm?.toDate(),
          motivoRejeicao: data.motivoRejeicao,
          motivoCancelamento: data.motivoCancelamento,
          personalTrainerNome: data.personalTrainerNome,
          personalTrainerEmail: data.personalTrainerEmail,
          medicoNome: data.medicoNome,
        };
      });

      return solicitacoes.sort((a, b) => {
        const dateA = a.criadoEm?.getTime() || 0;
        const dateB = b.criadoEm?.getTime() || 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Erro ao listar todas as solicitações do médico:', error);
      throw error;
    }
  }

  /**
   * Lista solicitações pendentes RECEBIDAS por um médico (que o personal trainer solicitou)
   */
  static async listPendingVinculoRequestsByMedico(medicoId: string): Promise<SolicitacaoVinculoPersonalMedicoDoc[]> {
    try {
      const q = query(
        collection(db, COL_SOLICITACOES_VINCULO_PERSONAL_MEDICO),
        where('medicoId', '==', medicoId),
        where('solicitadoPor', '==', 'personal_trainer'), // Apenas solicitações que o personal fez
        where('status', '==', SOLICITACAO_STATUS.PENDENTE)
      );

      const querySnapshot = await getDocs(q);
      
      const solicitacoes = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          personalTrainerId: data.personalTrainerId,
          medicoId: data.medicoId,
          solicitadoPor: data.solicitadoPor || 'personal_trainer',
          status: data.status,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          aceitoEm: data.aceitoEm?.toDate(),
          rejeitadoEm: data.rejeitadoEm?.toDate(),
          canceladoEm: data.canceladoEm?.toDate(),
          motivoRejeicao: data.motivoRejeicao,
          motivoCancelamento: data.motivoCancelamento,
          personalTrainerNome: data.personalTrainerNome,
          personalTrainerEmail: data.personalTrainerEmail,
          medicoNome: data.medicoNome,
        };
      });

      return solicitacoes.sort((a, b) => {
        const dateA = a.criadoEm?.getTime() || 0;
        const dateB = b.criadoEm?.getTime() || 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Erro ao listar solicitações pendentes do médico:', error);
      throw error;
    }
  }

  /**
   * Aprova uma solicitação de vínculo
   * Atualiza o documento do Personal Trainer adicionando o médico em medicoVinculadoIds
   */
  static async approveVinculoRequest(requestId: string): Promise<void> {
    try {
      const requestRef = doc(db, COL_SOLICITACOES_VINCULO_PERSONAL_MEDICO, requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        throw new Error('Solicitação não encontrada');
      }

      const requestData = requestSnap.data();
      
      // Atualizar solicitação
      await updateDoc(requestRef, {
        status: SOLICITACAO_STATUS.ACEITA,
        aceitoEm: Timestamp.now(),
      });

      // Atualizar documento do personal trainer adicionando o médico vinculado
      const personalRef = doc(db, COL_PERSONAL_TRAINERS, requestData.personalTrainerId);
      const personalSnap = await getDoc(personalRef);

      if (personalSnap.exists()) {
        const personalData = personalSnap.data();
        const medicoVinculadoIds = personalData.medicoVinculadoIds || [];
        
        // Adicionar médico se ainda não estiver na lista
        if (!medicoVinculadoIds.includes(requestData.medicoId)) {
          await updateDoc(personalRef, {
            medicoVinculadoIds: [...medicoVinculadoIds, requestData.medicoId],
          });
        }
      }
      
      // Atualizar documento do médico adicionando o personal trainer vinculado
      const medicoRef = doc(db, 'medicos', requestData.medicoId);
      const medicoSnap = await getDoc(medicoRef);
      
      if (medicoSnap.exists()) {
        const medicoData = medicoSnap.data();
        const personalTrainerVinculadoIds = medicoData.personalTrainerVinculadoIds || [];
        
        // Adicionar personal trainer se ainda não estiver na lista
        if (!personalTrainerVinculadoIds.includes(requestData.personalTrainerId)) {
          await updateDoc(medicoRef, {
            personalTrainerVinculadoIds: [...personalTrainerVinculadoIds, requestData.personalTrainerId],
          });
        }
      }
      
      // Log de auditoria - quem aprovou depende de quem solicitou
      // TODO: Criar métodos específicos para Personal Trainer no AuditLogService
      // if (requestData.solicitadoPor === 'personal_trainer') {
      //   await AuditLogService.logPersonalVinculoAceito(...);
      // } else {
      //   await AuditLogService.logPersonalVinculoAceito(...);
      // }
    } catch (error) {
      console.error('Erro ao aprovar solicitação de vínculo:', error);
      throw error;
    }
  }

  /**
   * Rejeita uma solicitação de vínculo
   */
  static async rejectVinculoRequest(requestId: string, motivoRejeicao?: string): Promise<void> {
    try {
      const requestRef = doc(db, COL_SOLICITACOES_VINCULO_PERSONAL_MEDICO, requestId);
      const requestSnap = await getDoc(requestRef);
      
      if (!requestSnap.exists()) {
        throw new Error('Solicitação não encontrada');
      }
      
      const requestData = requestSnap.data();
      
      await updateDoc(requestRef, {
        status: SOLICITACAO_STATUS.REJEITADA,
        rejeitadoEm: Timestamp.now(),
        motivoRejeicao: motivoRejeicao || '',
      });
      
      // Log de auditoria
      // TODO: Criar métodos específicos para Personal Trainer no AuditLogService
    } catch (error) {
      console.error('Erro ao rejeitar solicitação de vínculo:', error);
      throw error;
    }
  }

  /**
   * Cancela uma solicitação de vínculo (pode ser feito pelo personal trainer)
   */
  static async cancelVinculoRequest(requestId: string, motivoCancelamento?: string): Promise<void> {
    try {
      const requestRef = doc(db, COL_SOLICITACOES_VINCULO_PERSONAL_MEDICO, requestId);
      const requestSnap = await getDoc(requestRef);
      
      if (!requestSnap.exists()) {
        throw new Error('Solicitação não encontrada');
      }
      
      const requestData = requestSnap.data();
      
      // Só pode cancelar se estiver pendente
      if (requestData.status !== SOLICITACAO_STATUS.PENDENTE) {
        throw new Error('Apenas solicitações pendentes podem ser canceladas');
      }
      
      await updateDoc(requestRef, {
        status: SOLICITACAO_STATUS.CANCELADA,
        canceladoEm: Timestamp.now(),
        motivoCancelamento: motivoCancelamento || '',
      });
      
      // Log de auditoria
      // TODO: Criar métodos específicos para Personal Trainer no AuditLogService
    } catch (error) {
      console.error('Erro ao cancelar solicitação de vínculo:', error);
      throw error;
    }
  }

  /**
   * Busca dados extras da solicitação (nome do personal trainer, etc)
   * Útil para exibir na UI do médico sem fazer joins pesados
   */
  static async getRequestWithExtraData(requestId: string): Promise<SolicitacaoVinculoPersonalMedicoDoc & {
    personalTrainerNome?: string;
    personalTrainerEmail?: string;
    personalTrainerRegistro?: string;
    personalTrainerCidades?: { estado: string; cidade: string }[];
    medicoNome?: string;
  }> {
    try {
      const requestRef = doc(db, COL_SOLICITACOES_VINCULO_PERSONAL_MEDICO, requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        throw new Error('Solicitação não encontrada');
      }

      const data = requestSnap.data();
      const request: SolicitacaoVinculoPersonalMedicoDoc = {
        id: requestSnap.id,
        personalTrainerId: data.personalTrainerId,
        medicoId: data.medicoId,
        solicitadoPor: data.solicitadoPor || 'personal_trainer',
        status: data.status,
        criadoEm: data.criadoEm?.toDate() || new Date(),
        aceitoEm: data.aceitoEm?.toDate(),
        rejeitadoEm: data.rejeitadoEm?.toDate(),
        canceladoEm: data.canceladoEm?.toDate(),
        motivoRejeicao: data.motivoRejeicao,
        motivoCancelamento: data.motivoCancelamento,
        personalTrainerNome: data.personalTrainerNome,
        personalTrainerEmail: data.personalTrainerEmail,
        medicoNome: data.medicoNome,
      };

      // Buscar dados extras se não estiverem no documento
      let personalTrainerNome = data.personalTrainerNome;
      let personalTrainerEmail = data.personalTrainerEmail;
      let personalTrainerRegistro: string | undefined;
      let personalTrainerCidades: { estado: string; cidade: string }[] | undefined;

      if (!personalTrainerNome || !personalTrainerEmail) {
        const personal = await PersonalTrainerService.getPersonalTrainerByUserId(data.personalTrainerId);
        if (personal) {
          personalTrainerNome = personal.nome;
          personalTrainerEmail = personal.email;
          personalTrainerRegistro = personal.registroNumero;
          personalTrainerCidades = personal.cidades;
        }
      } else {
        // Buscar registro e cidades mesmo se nome/email já estiverem
        const personal = await PersonalTrainerService.getPersonalTrainerByUserId(data.personalTrainerId);
        if (personal) {
          personalTrainerRegistro = personal.registroNumero;
          personalTrainerCidades = personal.cidades;
        }
      }

      return {
        ...request,
        personalTrainerNome,
        personalTrainerEmail,
        personalTrainerRegistro,
        personalTrainerCidades,
        medicoNome: data.medicoNome,
      };
    } catch (error) {
      console.error('Erro ao buscar solicitação com dados extras:', error);
      throw error;
    }
  }

  /**
   * Exclui completamente uma solicitação de vínculo (remove do firestore)
   * Se a solicitação estiver aceita, também remove o vínculo dos documentos do personal trainer e médico
   */
  static async deleteVinculoRequest(requestId: string): Promise<void> {
    try {
      const requestRef = doc(db, COL_SOLICITACOES_VINCULO_PERSONAL_MEDICO, requestId);
      const requestSnap = await getDoc(requestRef);
      
      if (!requestSnap.exists()) {
        throw new Error('Solicitação não encontrada');
      }

      const requestData = requestSnap.data();
      const status = requestData.status;
      const personalTrainerId = requestData.personalTrainerId;
      const medicoId = requestData.medicoId;

      // Se a solicitação estava aceita, remover o vínculo dos documentos
      if (status === SOLICITACAO_STATUS.ACEITA) {
        // 1. Remover medicoVinculadoIds do personal trainer
        const personalRef = doc(db, COL_PERSONAL_TRAINERS, personalTrainerId);
        const personalSnap = await getDoc(personalRef);

        if (personalSnap.exists()) {
          const personalData = personalSnap.data();
          const medicoVinculadoIds = personalData.medicoVinculadoIds || [];
          const novosIds = medicoVinculadoIds.filter((id: string) => id !== medicoId);
          
          await updateDoc(personalRef, {
            medicoVinculadoIds: novosIds,
          });
        }

        // 2. Remover personalTrainerVinculadoIds do médico
        const medicoRef = doc(db, 'medicos', medicoId);
        const medicoSnap = await getDoc(medicoRef);

        if (medicoSnap.exists()) {
          const medicoData = medicoSnap.data();
          const personalTrainerVinculadoIds = medicoData.personalTrainerVinculadoIds || [];
          const novosIds = personalTrainerVinculadoIds.filter((id: string) => id !== personalTrainerId);
          
          await updateDoc(medicoRef, {
            personalTrainerVinculadoIds: novosIds,
          });
        }
      }
      
      // Deletar a solicitação completamente
      await deleteDoc(requestRef);
    } catch (error) {
      console.error('Erro ao excluir solicitação de vínculo:', error);
      throw error;
    }
  }

  /**
   * Remove completamente o vínculo entre médico e personal trainer
   * Remove de ambos os documentos e todas as solicitações relacionadas
   */
  static async removeVinculoCompleto(
    medicoId: string,
    personalTrainerId: string
  ): Promise<void> {
    try {
      // 1. Remover medicoVinculadoIds do personal trainer
      const personalRef = doc(db, COL_PERSONAL_TRAINERS, personalTrainerId);
      const personalSnap = await getDoc(personalRef);
      
      if (personalSnap.exists()) {
        const personalData = personalSnap.data();
        const medicoVinculadoIds = personalData.medicoVinculadoIds || [];
        const novosIds = medicoVinculadoIds.filter((id: string) => id !== medicoId);
        
        await updateDoc(personalRef, {
          medicoVinculadoIds: novosIds,
        });
      }
      
      // 2. Remover personalTrainerVinculadoIds do médico
      const medicoRef = doc(db, 'medicos', medicoId);
      const medicoSnap = await getDoc(medicoRef);
      
      if (medicoSnap.exists()) {
        const medicoData = medicoSnap.data();
        const personalTrainerVinculadoIds = medicoData.personalTrainerVinculadoIds || [];
        const novosIds = personalTrainerVinculadoIds.filter((id: string) => id !== personalTrainerId);
        
        await updateDoc(medicoRef, {
          personalTrainerVinculadoIds: novosIds,
        });
      }
      
      // 3. Deletar todas as solicitações de vínculo relacionadas
      const solicitacoesQuery = query(
        collection(db, COL_SOLICITACOES_VINCULO_PERSONAL_MEDICO),
        where('personalTrainerId', '==', personalTrainerId),
        where('medicoId', '==', medicoId)
      );
      
      const solicitacoesSnap = await getDocs(solicitacoesQuery);
      const deletePromises = solicitacoesSnap.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);
      
      // 4. Deletar todos os vínculos de pacientes compartilhados entre este médico e personal trainer
      const vinculosPacientesQuery = query(
        collection(db, COL_PACIENTE_PERSONAL_TRAINER),
        where('medicoId', '==', medicoId),
        where('personalTrainerId', '==', personalTrainerId)
      );
      
      const vinculosPacientesSnap = await getDocs(vinculosPacientesQuery);
      const deleteVinculosPromises = vinculosPacientesSnap.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deleteVinculosPromises);
      
      // 5. Deletar todas as solicitações de compartilhamento de pacientes relacionadas
      const solicitacoesPacientesQuery = query(
        collection(db, COL_SOLICITACOES_PERSONAL_TRAINER),
        where('medicoId', '==', medicoId),
        where('personalTrainerId', '==', personalTrainerId)
      );
      
      const solicitacoesPacientesSnap = await getDocs(solicitacoesPacientesQuery);
      const deleteSolicitacoesPacientesPromises = solicitacoesPacientesSnap.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deleteSolicitacoesPacientesPromises);
    } catch (error) {
      console.error('Erro ao remover vínculo completo:', error);
      throw error;
    }
  }
}
