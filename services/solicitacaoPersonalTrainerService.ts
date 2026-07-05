/**
 * Serviço para gerenciar solicitações de compartilhamento de pacientes com Personal Trainers
 */

import { db } from '@/lib/firebase';
import { shadowOrganizationFields } from '@/lib/organization/shadowOrganizationId';
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
  Timestamp, 
  setDoc
} from 'firebase/firestore';
import { SolicitacaoPersonalTrainerDoc, PacientePersonalTrainerDoc } from '@/features/metaPersonal/metaPersonal.types';
import { COL_SOLICITACOES_PERSONAL_TRAINER, COL_PACIENTE_PERSONAL_TRAINER, COL_SOLICITACOES_VINCULO_PERSONAL_MEDICO, SOLICITACAO_STATUS } from '@/features/metaPersonal/metaPersonal.constants';
import { PersonalTrainerService } from './personalTrainerService';
import { MedicoService } from './medicoService';
import { PacienteService } from './pacienteService';
import { AuditLogService } from './auditLogService';

export class SolicitacaoPersonalTrainerService {
  /**
   * Cria uma solicitação de compartilhamento de paciente com Personal Trainer
   * Verifica duplicidade antes de criar
   * @param statusEspecial - Se 'aguardando_medico', cria com esse status (não verifica duplicidade com pendente)
   */
  static async createPacienteShareRequest(
    medicoId: string,
    personalTrainerId: string,
    pacienteId: string,
    extraData?: {
      pacienteNome?: string;
      medicoNome?: string;
      personalTrainerNome?: string;
      personalTrainerEmail?: string;
    },
    statusEspecial?: 'aguardando_medico'
  ): Promise<string> {
    try {
      // Se não for status especial, verificar duplicidades
      if (statusEspecial !== 'aguardando_medico') {
        const qPendente = query(
          collection(db, COL_SOLICITACOES_PERSONAL_TRAINER),
          where('medicoId', '==', medicoId),
          where('personalTrainerId', '==', personalTrainerId),
          where('pacienteId', '==', pacienteId),
          where('status', '==', SOLICITACAO_STATUS.PENDENTE)
        );
        
        const qAceita = query(
          collection(db, COL_SOLICITACOES_PERSONAL_TRAINER),
          where('medicoId', '==', medicoId),
          where('personalTrainerId', '==', personalTrainerId),
          where('pacienteId', '==', pacienteId),
          where('status', '==', SOLICITACAO_STATUS.ACEITA)
        );

        const [pendentesSnap, aceitasSnap] = await Promise.all([
          getDocs(qPendente),
          getDocs(qAceita)
        ]);

        if (!pendentesSnap.empty) {
          throw new Error('Já existe uma solicitação pendente para este paciente');
        }

        if (!aceitasSnap.empty) {
          throw new Error('Este paciente já está compartilhado com este personal trainer');
        }
      }

      // Buscar dados extras se não fornecidos
      let pacienteNome = extraData?.pacienteNome;
      let medicoNome = extraData?.medicoNome;
      let personalTrainerNome = extraData?.personalTrainerNome;
      let personalTrainerEmail = extraData?.personalTrainerEmail;

      if (!pacienteNome) {
        const paciente = await PacienteService.getPacienteById(pacienteId);
        if (paciente) {
          pacienteNome = paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'Paciente';
        }
      }

      if (!medicoNome) {
        const medico = await MedicoService.getMedicoById(medicoId);
        if (medico) {
          medicoNome = medico.nome;
        }
      }

      if (!personalTrainerNome || !personalTrainerEmail) {
        const personal = await PersonalTrainerService.getPersonalTrainerByUserId(personalTrainerId);
        if (personal) {
          personalTrainerNome = personal.nome;
          personalTrainerEmail = personal.email;
        }
      }

      // Criar solicitação
      const novaSolicitacao = {
        medicoId,
        personalTrainerId,
        pacienteId,
        status: statusEspecial === 'aguardando_medico' ? SOLICITACAO_STATUS.AGUARDANDO_MEDICO : SOLICITACAO_STATUS.PENDENTE,
        criadoEm: Timestamp.now(),
        pacienteNome: pacienteNome || '',
        medicoNome: medicoNome || '',
        personalTrainerNome: personalTrainerNome || '',
        personalTrainerEmail: personalTrainerEmail || '',
      };

      const docRef = await addDoc(collection(db, COL_SOLICITACOES_PERSONAL_TRAINER), {
        ...novaSolicitacao,
        ...shadowOrganizationFields(),
      });
      
      // Log de auditoria
      // TODO: Criar método específico para Personal Trainer no AuditLogService
      // await AuditLogService.logPacienteCompartilhadoComPersonal(medicoId, personalTrainerId, pacienteId, medicoId);
      
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar solicitação de compartilhamento:', error);
      throw error;
    }
  }

  /**
   * Lista solicitações pendentes de um Personal Trainer (exclui aguardando_medico)
   */
  static async listPendingRequestsByPersonal(personalTrainerId: string): Promise<SolicitacaoPersonalTrainerDoc[]> {
    try {
      // Buscar sem orderBy para evitar necessidade de índice composto
      // Ordenação será feita no cliente
      // Buscar apenas status PENDENTE (não incluir AGUARDANDO_MEDICO)
      const q = query(
        collection(db, COL_SOLICITACOES_PERSONAL_TRAINER),
        where('personalTrainerId', '==', personalTrainerId),
        where('status', '==', SOLICITACAO_STATUS.PENDENTE)
      );

      const querySnapshot = await getDocs(q);
      
      const solicitacoes = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          pacienteId: data.pacienteId,
          personalTrainerId: data.personalTrainerId,
          medicoId: data.medicoId,
          status: data.status,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          aceitoEm: data.aceitoEm?.toDate(),
          rejeitadoEm: data.rejeitadoEm?.toDate(),
          canceladoEm: data.canceladoEm?.toDate(),
          motivoRejeicao: data.motivoRejeicao,
          motivoCancelamento: data.motivoCancelamento,
          // Campos extras salvos no documento
          pacienteNome: data.pacienteNome,
          medicoNome: data.medicoNome,
        };
      });

      // Ordenar no cliente por data de criação (mais recente primeiro)
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
   * Lista solicitações de um paciente (para mostrar no contexto do médico)
   */
  static async listRequestsByPaciente(medicoId: string, pacienteId: string): Promise<SolicitacaoPersonalTrainerDoc[]> {
    try {
      // Buscar sem orderBy para evitar necessidade de índice composto
      // Ordenação será feita no cliente
      const q = query(
        collection(db, COL_SOLICITACOES_PERSONAL_TRAINER),
        where('medicoId', '==', medicoId),
        where('pacienteId', '==', pacienteId)
      );

      const querySnapshot = await getDocs(q);
      
      const solicitacoes = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          pacienteId: data.pacienteId,
          personalTrainerId: data.personalTrainerId,
          medicoId: data.medicoId,
          status: data.status,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          aceitoEm: data.aceitoEm?.toDate(),
          rejeitadoEm: data.rejeitadoEm?.toDate(),
          canceladoEm: data.canceladoEm?.toDate(),
          motivoRejeicao: data.motivoRejeicao,
          motivoCancelamento: data.motivoCancelamento,
        };
      });

      // Ordenar no cliente por data de criação (mais recente primeiro)
      return solicitacoes.sort((a, b) => {
        const dateA = a.criadoEm?.getTime() || 0;
        const dateB = b.criadoEm?.getTime() || 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Erro ao listar solicitações do paciente:', error);
      throw error;
    }
  }

  /**
   * Aprova uma solicitação de compartilhamento
   * Cria documento em paciente_personal_trainer
   * IMPORTANTE: Só aceita se status for PENDENTE (não AGUARDANDO_MEDICO)
   */
  static async approveShareRequest(requestId: string): Promise<void> {
    try {
      const requestRef = doc(db, COL_SOLICITACOES_PERSONAL_TRAINER, requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        throw new Error('Solicitação não encontrada');
      }

      const requestData = requestSnap.data();
      
      // Verificar se status é PENDENTE (não pode aceitar se estiver AGUARDANDO_MEDICO)
      if (requestData.status === SOLICITACAO_STATUS.AGUARDANDO_MEDICO) {
        throw new Error('Aguarde o médico aceitar a solicitação primeiro');
      }

      if (requestData.status !== SOLICITACAO_STATUS.PENDENTE) {
        throw new Error('Apenas solicitações pendentes podem ser aceitas');
      }
      
      // Verificar se personal trainer está vinculado ao médico
      const personal = await PersonalTrainerService.getPersonalTrainerByUserId(requestData.personalTrainerId);
      if (!personal || !personal.medicoVinculadoIds.includes(requestData.medicoId)) {
        throw new Error('Personal Trainer não está vinculado a este médico');
      }

      // Atualizar solicitação
      await updateDoc(requestRef, {
        status: SOLICITACAO_STATUS.ACEITA,
        aceitoEm: Timestamp.now(),
      });

      // Criar documento em paciente_personal_trainer com ID determinístico para rules
      // Padrão: pacienteId_personalTrainerId (sem medicoId para permitir validação nas rules)
      const vinculoId = `${requestData.pacienteId}_${requestData.personalTrainerId}`;
      const vinculoRef = doc(db, COL_PACIENTE_PERSONAL_TRAINER, vinculoId);
      
      await setDoc(vinculoRef, {
        pacienteId: requestData.pacienteId,
        personalTrainerId: requestData.personalTrainerId,
        medicoId: requestData.medicoId,
        status: 'ativo',
        dataCompartilhamento: Timestamp.now(),
        ...shadowOrganizationFields(),
      });
      
      // Log de auditoria
      // TODO: Criar método específico para Personal Trainer no AuditLogService
      // await AuditLogService.logPersonalAceitouCompartilhamento(...);
    } catch (error) {
      console.error('Erro ao aprovar solicitação de compartilhamento:', error);
      throw error;
    }
  }

  /**
   * Muda status de AGUARDANDO_MEDICO para PENDENTE quando médico aceita
   * Chamado automaticamente quando médico aceita solicitação
   */
  static async mudarStatusParaPendente(solicitacaoPersonalTrainerId: string): Promise<void> {
    try {
      const requestRef = doc(db, COL_SOLICITACOES_PERSONAL_TRAINER, solicitacaoPersonalTrainerId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        throw new Error('Solicitação não encontrada');
      }

      const requestData = requestSnap.data();
      
      // Só muda se estiver aguardando médico
      if (requestData.status !== SOLICITACAO_STATUS.AGUARDANDO_MEDICO) {
        console.log('Solicitação não está aguardando médico, status atual:', requestData.status);
        return; // Não é erro, apenas não precisa mudar
      }

      // Atualizar para pendente
      await updateDoc(requestRef, {
        status: SOLICITACAO_STATUS.PENDENTE,
      });

      console.log('✅ Status da solicitação do personal trainer mudado para PENDENTE');
    } catch (error) {
      console.error('Erro ao mudar status da solicitação do personal trainer:', error);
      throw error;
    }
  }

  /**
   * Rejeita uma solicitação de compartilhamento
   */
  static async rejectShareRequest(requestId: string, motivoRejeicao?: string): Promise<void> {
    try {
      const requestRef = doc(db, COL_SOLICITACOES_PERSONAL_TRAINER, requestId);
      
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
      // TODO: Criar método específico para Personal Trainer no AuditLogService
    } catch (error) {
      console.error('Erro ao rejeitar solicitação de compartilhamento:', error);
      throw error;
    }
  }

  /**
   * Cancela uma solicitação de compartilhamento (pelo médico)
   */
  static async cancelShareRequest(requestId: string, motivoCancelamento?: string): Promise<void> {
    try {
      const requestRef = doc(db, COL_SOLICITACOES_PERSONAL_TRAINER, requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        throw new Error('Solicitação não encontrada');
      }

      const requestData = requestSnap.data();
      if (requestData.status !== SOLICITACAO_STATUS.PENDENTE) {
        throw new Error('Apenas solicitações pendentes podem ser canceladas');
      }
      
      await updateDoc(requestRef, {
        status: SOLICITACAO_STATUS.CANCELADA,
        canceladoEm: Timestamp.now(),
        motivoCancelamento: motivoCancelamento || '',
      });
    } catch (error) {
      console.error('Erro ao cancelar solicitação de compartilhamento:', error);
      throw error;
    }
  }

  /**
   * Busca dados extras da solicitação (nome do paciente, etc)
   */
  static async getRequestWithExtraData(requestId: string): Promise<SolicitacaoPersonalTrainerDoc & {
    pacienteNome?: string;
    medicoNome?: string;
    personalTrainerNome?: string;
  }> {
    try {
      const requestRef = doc(db, COL_SOLICITACOES_PERSONAL_TRAINER, requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        throw new Error('Solicitação não encontrada');
      }

      const data = requestSnap.data();
      const request: SolicitacaoPersonalTrainerDoc = {
        id: requestSnap.id,
        pacienteId: data.pacienteId,
        personalTrainerId: data.personalTrainerId,
        medicoId: data.medicoId,
        status: data.status,
        criadoEm: data.criadoEm?.toDate() || new Date(),
        aceitoEm: data.aceitoEm?.toDate(),
        rejeitadoEm: data.rejeitadoEm?.toDate(),
        canceladoEm: data.canceladoEm?.toDate(),
        motivoRejeicao: data.motivoRejeicao,
        motivoCancelamento: data.motivoCancelamento,
      };

      return {
        ...request,
        pacienteNome: data.pacienteNome,
        medicoNome: data.medicoNome,
        personalTrainerNome: data.personalTrainerNome,
      };
    } catch (error) {
      console.error('Erro ao buscar solicitação com dados extras:', error);
      throw error;
    }
  }

  /**
   * Lista vínculos ativos de um Personal Trainer (pacientes compartilhados)
   */
  static async listActiveVinculosByPersonal(personalTrainerId: string): Promise<PacientePersonalTrainerDoc[]> {
    try {
      // Buscar sem orderBy para evitar necessidade de índice composto
      // Ordenação será feita no cliente
      const q = query(
        collection(db, COL_PACIENTE_PERSONAL_TRAINER),
        where('personalTrainerId', '==', personalTrainerId),
        where('status', '==', 'ativo')
      );

      const querySnapshot = await getDocs(q);
      
      const vinculos = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          pacienteId: data.pacienteId,
          personalTrainerId: data.personalTrainerId,
          medicoId: data.medicoId,
          dataCompartilhamento: data.dataCompartilhamento?.toDate() || new Date(),
          status: data.status || 'ativo',
          removidoEm: data.removidoEm?.toDate(),
          motivoRemocao: data.motivoRemocao,
        };
      });

      // Ordenar no cliente por data de compartilhamento (mais recente primeiro)
      return vinculos.sort((a, b) => {
        const dateA = a.dataCompartilhamento?.getTime() || 0;
        const dateB = b.dataCompartilhamento?.getTime() || 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Erro ao listar vínculos ativos do personal trainer:', error);
      throw error;
    }
  }

  /**
   * Encerra compartilhamento de um paciente com Personal Trainer
   */
  static async endCompartilhamento(
    pacienteId: string,
    personalTrainerId: string,
    medicoId: string
  ): Promise<void> {
    try {
      // Usar novo padrão de ID determinístico: pacienteId_personalTrainerId
      const vinculoId = `${pacienteId}_${personalTrainerId}`;
      const vinculoRef = doc(db, COL_PACIENTE_PERSONAL_TRAINER, vinculoId);
      const vinculoSnap = await getDoc(vinculoRef);

      if (!vinculoSnap.exists()) {
        // Tentar formato antigo para compatibilidade
        const vinculoIdAntigo = `${pacienteId}_${personalTrainerId}_${medicoId}`;
        const vinculoRefAntigo = doc(db, COL_PACIENTE_PERSONAL_TRAINER, vinculoIdAntigo);
        const vinculoSnapAntigo = await getDoc(vinculoRefAntigo);
        
        if (!vinculoSnapAntigo.exists()) {
          throw new Error('Vínculo não encontrado');
        }
        
        // Migrar para novo formato
        const dataAntigo = vinculoSnapAntigo.data();
        await setDoc(vinculoRef, {
          ...dataAntigo,
          status: 'inativo',
          removidoEm: Timestamp.now(),
          motivoRemocao: 'Encerrado pelo médico',
        });
        return;
      }

      await updateDoc(vinculoRef, {
        status: 'inativo',
        removidoEm: Timestamp.now(),
        motivoRemocao: 'Encerrado pelo médico',
      });
      
      // Deletar histórico do compartilhamento
      // 1. Deletar solicitações de compartilhamento de paciente
      const solicitacoesPacienteQuery = query(
        collection(db, COL_SOLICITACOES_PERSONAL_TRAINER),
        where('pacienteId', '==', pacienteId),
        where('personalTrainerId', '==', personalTrainerId),
        where('medicoId', '==', medicoId)
      );
      
      const solicitacoesPacienteSnapshot = await getDocs(solicitacoesPacienteQuery);
      const deleteSolicitacoesPaciente = solicitacoesPacienteSnapshot.docs.map(docSnap => deleteDoc(docSnap.ref));
      
      await Promise.all(deleteSolicitacoesPaciente);
      
      // Log de auditoria
      // TODO: Criar método específico para Personal Trainer no AuditLogService
    } catch (error) {
      console.error('Erro ao encerrar compartilhamento:', error);
      throw error;
    }
  }

  /**
   * Obtém status completo de compartilhamento de um paciente
   */
  static async getCompartilhamentoStatus(
    pacienteId: string,
    medicoId: string
  ): Promise<{
    solicitacoes: SolicitacaoPersonalTrainerDoc[];
    vinculosAtivos: PacientePersonalTrainerDoc[];
    vinculosInativos: PacientePersonalTrainerDoc[];
  }> {
    try {
      // Buscar solicitações
      const solicitacoes = await this.listRequestsByPaciente(medicoId, pacienteId);

      // Buscar vínculos ativos
      const qAtivos = query(
        collection(db, COL_PACIENTE_PERSONAL_TRAINER),
        where('pacienteId', '==', pacienteId),
        where('medicoId', '==', medicoId),
        where('status', '==', 'ativo')
      );
      const ativosSnap = await getDocs(qAtivos);
      const vinculosAtivos = ativosSnap.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          pacienteId: data.pacienteId,
          personalTrainerId: data.personalTrainerId,
          medicoId: data.medicoId,
          dataCompartilhamento: data.dataCompartilhamento?.toDate() || new Date(),
          status: data.status || 'ativo',
          removidoEm: data.removidoEm?.toDate(),
          motivoRemocao: data.motivoRemocao,
        };
      });

      // Buscar vínculos inativos
      const qInativos = query(
        collection(db, COL_PACIENTE_PERSONAL_TRAINER),
        where('pacienteId', '==', pacienteId),
        where('medicoId', '==', medicoId),
        where('status', '==', 'inativo')
      );
      const inativosSnap = await getDocs(qInativos);
      const vinculosInativos = inativosSnap.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          pacienteId: data.pacienteId,
          personalTrainerId: data.personalTrainerId,
          medicoId: data.medicoId,
          dataCompartilhamento: data.dataCompartilhamento?.toDate() || new Date(),
          status: data.status || 'inativo',
          removidoEm: data.removidoEm?.toDate(),
          motivoRemocao: data.motivoRemocao,
        };
      });

      return {
        solicitacoes,
        vinculosAtivos,
        vinculosInativos,
      };
    } catch (error) {
      console.error('Erro ao obter status de compartilhamento:', error);
      throw error;
    }
  }

  /**
   * Exclui completamente uma solicitação de compartilhamento de paciente (remove do firestore)
   * Usado para limpar solicitações enviadas ou recebidas
   */
  static async deleteShareRequest(requestId: string): Promise<void> {
    try {
      const requestRef = doc(db, COL_SOLICITACOES_PERSONAL_TRAINER, requestId);
      const requestSnap = await getDoc(requestRef);
      
      if (!requestSnap.exists()) {
        throw new Error('Solicitação não encontrada');
      }
      
      // Deletar a solicitação completamente
      await deleteDoc(requestRef);
    } catch (error) {
      console.error('Erro ao excluir solicitação de compartilhamento:', error);
      throw error;
    }
  }

  /**
   * Lista solicitações pendentes de um médico (para compartilhamento de pacientes)
   */
  static async listPendingRequestsByMedico(medicoId: string): Promise<SolicitacaoPersonalTrainerDoc[]> {
    try {
      const q = query(
        collection(db, COL_SOLICITACOES_PERSONAL_TRAINER),
        where('medicoId', '==', medicoId),
        where('status', '==', SOLICITACAO_STATUS.PENDENTE)
      );

      const querySnapshot = await getDocs(q);
      
      const solicitacoes = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          pacienteId: data.pacienteId,
          personalTrainerId: data.personalTrainerId,
          medicoId: data.medicoId,
          status: data.status,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          aceitoEm: data.aceitoEm?.toDate(),
          rejeitadoEm: data.rejeitadoEm?.toDate(),
          canceladoEm: data.canceladoEm?.toDate(),
          motivoRejeicao: data.motivoRejeicao,
          motivoCancelamento: data.motivoCancelamento,
          pacienteNome: data.pacienteNome,
          medicoNome: data.medicoNome,
          personalTrainerNome: data.personalTrainerNome,
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
}
