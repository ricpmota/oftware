/**
 * Serviço para gerenciar solicitações de vínculo entre nutricionista e médico
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
  limit,
  addDoc, 
  updateDoc, 
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { SolicitacaoVinculoNutriMedicoDoc } from '@/features/metaNutri/metaNutri.types';
import { COL_SOLICITACOES_VINCULO_NUTRI_MEDICO, SOLICITACAO_STATUS } from '@/features/metaNutri/metaNutri.constants';
import { NutricionistaService } from './nutricionistaService';
import { MedicoService } from './medicoService';
import { AuditLogService } from './auditLogService';

export class SolicitacaoVinculoNutriMedicoService {
  /**
   * Cria uma solicitação de vínculo entre nutricionista e médico
   * Verifica duplicidade antes de criar
   * @param solicitadoPor - 'nutricionista' quando o nutricionista solicita, 'medico' quando o médico solicita
   */
  static async createVinculoRequest(
    nutricionistaId: string,
    medicoId: string,
    solicitadoPor: 'medico' | 'nutricionista',
    extraData?: {
      nutricionistaNome?: string;
      nutricionistaEmail?: string;
      medicoNome?: string;
    }
  ): Promise<string> {
    try {
      // Verificar se já existe solicitação pendente ou aceita
      const qPendente = query(
        collection(db, COL_SOLICITACOES_VINCULO_NUTRI_MEDICO),
        where('nutricionistaId', '==', nutricionistaId),
        where('medicoId', '==', medicoId),
        where('status', '==', SOLICITACAO_STATUS.PENDENTE),
        limit(1)
      );
      
      const qAceita = query(
        collection(db, COL_SOLICITACOES_VINCULO_NUTRI_MEDICO),
        where('nutricionistaId', '==', nutricionistaId),
        where('medicoId', '==', medicoId),
        where('status', '==', SOLICITACAO_STATUS.ACEITA),
        limit(1)
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

      // Buscar dados do nutricionista e médico se não fornecidos
      let nutricionistaNome = extraData?.nutricionistaNome;
      let nutricionistaEmail = extraData?.nutricionistaEmail;
      let medicoNome = extraData?.medicoNome;

      if (!nutricionistaNome || !nutricionistaEmail) {
        const nutri = await NutricionistaService.getNutricionistaByUserId(nutricionistaId);
        if (nutri) {
          nutricionistaNome = nutri.nome;
          nutricionistaEmail = nutri.email;
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
        nutricionistaId,
        medicoId,
        solicitadoPor, // Identifica quem iniciou a solicitação
        status: SOLICITACAO_STATUS.PENDENTE,
        criadoEm: Timestamp.now(),
        nutricionistaNome: nutricionistaNome || '',
        nutricionistaEmail: nutricionistaEmail || '',
        medicoNome: medicoNome || '',
      };

      const docRef = await addDoc(collection(db, COL_SOLICITACOES_VINCULO_NUTRI_MEDICO), {
        ...novaSolicitacao,
        ...shadowOrganizationFields(),
      });
      
      console.log('✅ [DEBUG] Solicitação de vínculo criada:', {
        id: docRef.id,
        nutricionistaId,
        medicoId,
        solicitadoPor,
        status: novaSolicitacao.status,
        nutricionistaNome: novaSolicitacao.nutricionistaNome,
        medicoNome: novaSolicitacao.medicoNome
      });
      
      // Verificar se a solicitação foi salva corretamente
      const savedDoc = await getDoc(docRef);
      if (savedDoc.exists()) {
        const savedData = savedDoc.data();
        console.log('✅ [DEBUG] Solicitação verificada após criação:', {
          id: savedDoc.id,
          nutricionistaId: savedData.nutricionistaId,
          medicoId: savedData.medicoId,
          solicitadoPor: savedData.solicitadoPor,
          status: savedData.status
        });
      }
      
      // Log de auditoria
      await AuditLogService.logNutriVinculoSolicitado(nutricionistaId, medicoId, nutricionistaId);
      
      return docRef.id;
    } catch (error) {
      console.error('Erro ao criar solicitação de vínculo:', error);
      throw error;
    }
  }

  /**
   * Lista solicitações pendentes RECEBIDAS por um nutricionista (que o médico solicitou)
   */
  static async listPendingVinculoRequestsByNutri(nutricionistaId: string): Promise<SolicitacaoVinculoNutriMedicoDoc[]> {
    try {
      const q = query(
        collection(db, COL_SOLICITACOES_VINCULO_NUTRI_MEDICO),
        where('nutricionistaId', '==', nutricionistaId),
        where('solicitadoPor', '==', 'medico'), // Apenas solicitações que o médico fez
        where('status', '==', SOLICITACAO_STATUS.PENDENTE)
      );

      const querySnapshot = await getDocs(q);
      
      const solicitacoes = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          nutricionistaId: data.nutricionistaId,
          medicoId: data.medicoId,
          solicitadoPor: data.solicitadoPor || 'nutricionista',
          status: data.status,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          aceitoEm: data.aceitoEm?.toDate(),
          rejeitadoEm: data.rejeitadoEm?.toDate(),
          canceladoEm: data.canceladoEm?.toDate(),
          motivoRejeicao: data.motivoRejeicao,
          motivoCancelamento: data.motivoCancelamento,
          nutricionistaNome: data.nutricionistaNome,
          nutricionistaEmail: data.nutricionistaEmail,
          medicoNome: data.medicoNome,
        };
      });

      return solicitacoes.sort((a, b) => {
        const dateA = a.criadoEm?.getTime() || 0;
        const dateB = b.criadoEm?.getTime() || 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Erro ao listar solicitações pendentes do nutricionista:', error);
      throw error;
    }
  }

  /**
   * Lista solicitações ENVIADAS por um nutricionista (que o nutricionista fez)
   */
  static async listSentVinculoRequestsByNutri(nutricionistaId: string): Promise<SolicitacaoVinculoNutriMedicoDoc[]> {
    try {
      const q = query(
        collection(db, COL_SOLICITACOES_VINCULO_NUTRI_MEDICO),
        where('nutricionistaId', '==', nutricionistaId),
        where('solicitadoPor', '==', 'nutricionista') // Apenas solicitações que o nutricionista fez
      );

      const querySnapshot = await getDocs(q);
      
      const solicitacoes = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          nutricionistaId: data.nutricionistaId,
          medicoId: data.medicoId,
          solicitadoPor: data.solicitadoPor || 'nutricionista',
          status: data.status,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          aceitoEm: data.aceitoEm?.toDate(),
          rejeitadoEm: data.rejeitadoEm?.toDate(),
          canceladoEm: data.canceladoEm?.toDate(),
          motivoRejeicao: data.motivoRejeicao,
          motivoCancelamento: data.motivoCancelamento,
          nutricionistaNome: data.nutricionistaNome,
          nutricionistaEmail: data.nutricionistaEmail,
          medicoNome: data.medicoNome,
        };
      });

      return solicitacoes.sort((a, b) => {
        const dateA = a.criadoEm?.getTime() || 0;
        const dateB = b.criadoEm?.getTime() || 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Erro ao listar solicitações enviadas do nutricionista:', error);
      throw error;
    }
  }

  /**
   * Lista todas as solicitações de vínculo de um nutricionista (enviadas e recebidas)
   */
  static async listVinculoRequestsByNutri(nutricionistaId: string): Promise<SolicitacaoVinculoNutriMedicoDoc[]> {
    try {
      const q = query(
        collection(db, COL_SOLICITACOES_VINCULO_NUTRI_MEDICO),
        where('nutricionistaId', '==', nutricionistaId)
      );

      const querySnapshot = await getDocs(q);

      const solicitacoes = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          nutricionistaId: data.nutricionistaId,
          medicoId: data.medicoId,
          solicitadoPor: data.solicitadoPor || 'nutricionista',
          status: data.status,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          aceitoEm: data.aceitoEm?.toDate(),
          rejeitadoEm: data.rejeitadoEm?.toDate(),
          canceladoEm: data.canceladoEm?.toDate(),
          motivoRejeicao: data.motivoRejeicao,
          motivoCancelamento: data.motivoCancelamento,
          nutricionistaNome: data.nutricionistaNome,
          nutricionistaEmail: data.nutricionistaEmail,
          medicoNome: data.medicoNome,
        };
      });

      return solicitacoes.sort((a, b) => {
        const dateA = a.criadoEm?.getTime() || 0;
        const dateB = b.criadoEm?.getTime() || 0;
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Erro ao listar solicitações do nutricionista:', error);
      throw error;
    }
  }

  /**
   * Lista solicitações ENVIADAS por um médico (que o médico fez)
   */
  static async listSentVinculoRequestsByMedico(medicoId: string): Promise<SolicitacaoVinculoNutriMedicoDoc[]> {
    try {
      const q = query(
        collection(db, COL_SOLICITACOES_VINCULO_NUTRI_MEDICO),
        where('medicoId', '==', medicoId),
        where('solicitadoPor', '==', 'medico') // Apenas solicitações que o médico fez
      );

      const querySnapshot = await getDocs(q);
      
      const solicitacoes = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          nutricionistaId: data.nutricionistaId,
          medicoId: data.medicoId,
          solicitadoPor: data.solicitadoPor || 'medico',
          status: data.status,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          aceitoEm: data.aceitoEm?.toDate(),
          rejeitadoEm: data.rejeitadoEm?.toDate(),
          canceladoEm: data.canceladoEm?.toDate(),
          motivoRejeicao: data.motivoRejeicao,
          motivoCancelamento: data.motivoCancelamento,
          nutricionistaNome: data.nutricionistaNome,
          nutricionistaEmail: data.nutricionistaEmail,
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
  static async listAllVinculoRequestsByMedico(medicoId: string): Promise<SolicitacaoVinculoNutriMedicoDoc[]> {
    try {
      const q = query(
        collection(db, COL_SOLICITACOES_VINCULO_NUTRI_MEDICO),
        where('medicoId', '==', medicoId)
      );

      const querySnapshot = await getDocs(q);
      
      const solicitacoes = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          nutricionistaId: data.nutricionistaId,
          medicoId: data.medicoId,
          solicitadoPor: data.solicitadoPor || 'nutricionista', // Default para compatibilidade
          status: data.status,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          aceitoEm: data.aceitoEm?.toDate(),
          rejeitadoEm: data.rejeitadoEm?.toDate(),
          canceladoEm: data.canceladoEm?.toDate(),
          motivoRejeicao: data.motivoRejeicao,
          motivoCancelamento: data.motivoCancelamento,
          nutricionistaNome: data.nutricionistaNome,
          nutricionistaEmail: data.nutricionistaEmail,
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
      console.error('Erro ao listar todas as solicitações do médico:', error);
      throw error;
    }
  }

  /**
   * Lista solicitações pendentes RECEBIDAS por um médico (que o nutricionista solicitou)
   */
  static async listPendingVinculoRequestsByMedico(medicoId: string): Promise<SolicitacaoVinculoNutriMedicoDoc[]> {
    try {
      const q = query(
        collection(db, COL_SOLICITACOES_VINCULO_NUTRI_MEDICO),
        where('medicoId', '==', medicoId),
        where('solicitadoPor', '==', 'nutricionista'), // Apenas solicitações que o nutricionista fez
        where('status', '==', SOLICITACAO_STATUS.PENDENTE)
        // Removido orderBy para evitar necessidade de índice composto
        // Ordenação será feita no cliente
      );

      const querySnapshot = await getDocs(q);
      
      const solicitacoes = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          nutricionistaId: data.nutricionistaId,
          medicoId: data.medicoId,
          solicitadoPor: data.solicitadoPor || 'nutricionista', // Default para compatibilidade
          status: data.status,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          aceitoEm: data.aceitoEm?.toDate(),
          rejeitadoEm: data.rejeitadoEm?.toDate(),
          canceladoEm: data.canceladoEm?.toDate(),
          motivoRejeicao: data.motivoRejeicao,
          motivoCancelamento: data.motivoCancelamento,
          nutricionistaNome: data.nutricionistaNome,
          nutricionistaEmail: data.nutricionistaEmail,
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
      console.error('Erro ao listar solicitações pendentes do médico:', error);
      throw error;
    }
  }

  /**
   * Aprova uma solicitação de vínculo
   * Atualiza o documento do nutricionista adicionando o médico em medicoVinculadoIds
   */
  static async approveVinculoRequest(requestId: string): Promise<void> {
    try {
      const requestRef = doc(db, COL_SOLICITACOES_VINCULO_NUTRI_MEDICO, requestId);
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

      // Atualizar documento do nutricionista adicionando o médico vinculado
      const nutriRef = doc(db, 'nutricionistas', requestData.nutricionistaId);
      const nutriSnap = await getDoc(nutriRef);

      if (nutriSnap.exists()) {
        const nutriData = nutriSnap.data();
        const medicoVinculadoIds = nutriData.medicoVinculadoIds || [];
        
        // Adicionar médico se ainda não estiver na lista
        if (!medicoVinculadoIds.includes(requestData.medicoId)) {
          await updateDoc(nutriRef, {
            medicoVinculadoIds: [...medicoVinculadoIds, requestData.medicoId],
          });
        }
      }
      
      // Atualizar documento do médico adicionando o nutricionista vinculado
      const medicoRef = doc(db, 'medicos', requestData.medicoId);
      const medicoSnap = await getDoc(medicoRef);
      
      if (medicoSnap.exists()) {
        const medicoData = medicoSnap.data();
        const nutricionistaVinculadoIds = medicoData.nutricionistaVinculadoIds || [];
        
        // Adicionar nutricionista se ainda não estiver na lista
        if (!nutricionistaVinculadoIds.includes(requestData.nutricionistaId)) {
          await updateDoc(medicoRef, {
            nutricionistaVinculadoIds: [...nutricionistaVinculadoIds, requestData.nutricionistaId],
          });
        }
      }
      
      // Log de auditoria - quem aprovou depende de quem solicitou
      if (requestData.solicitadoPor === 'nutricionista') {
        // Nutricionista solicitou, médico aprovou
        await AuditLogService.logNutriVinculoAceito(
          requestData.nutricionistaId,
          requestData.medicoId,
          requestData.medicoId
        );
      } else {
        // Médico solicitou, nutricionista aprovou
        await AuditLogService.logNutriVinculoAceito(
          requestData.nutricionistaId,
          requestData.medicoId,
          requestData.nutricionistaId
        );
      }
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
      const requestRef = doc(db, COL_SOLICITACOES_VINCULO_NUTRI_MEDICO, requestId);
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
      
      // Log de auditoria - quem rejeitou depende de quem solicitou
      if (requestData.solicitadoPor === 'nutricionista') {
        // Nutricionista solicitou, médico rejeitou
        await AuditLogService.logNutriVinculoRejeitado(
          requestData.nutricionistaId,
          requestData.medicoId,
          requestData.medicoId
        );
      } else {
        // Médico solicitou, nutricionista rejeitou
        await AuditLogService.logNutriVinculoRejeitado(
          requestData.nutricionistaId,
          requestData.medicoId,
          requestData.nutricionistaId
        );
      }
    } catch (error) {
      console.error('Erro ao rejeitar solicitação de vínculo:', error);
      throw error;
    }
  }

  /**
   * Cancela uma solicitação de vínculo (pode ser feito pelo nutricionista)
   */
  static async cancelVinculoRequest(requestId: string, motivoCancelamento?: string): Promise<void> {
    try {
      const requestRef = doc(db, COL_SOLICITACOES_VINCULO_NUTRI_MEDICO, requestId);
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
      await AuditLogService.logNutriVinculoCancelado(
        requestData.nutricionistaId,
        requestData.medicoId,
        requestData.nutricionistaId
      );
    } catch (error) {
      console.error('Erro ao cancelar solicitação de vínculo:', error);
      throw error;
    }
  }

  /**
   * Busca dados extras da solicitação (nome do nutricionista, etc)
   * Útil para exibir na UI do médico sem fazer joins pesados
   */
  static async getRequestWithExtraData(requestId: string): Promise<SolicitacaoVinculoNutriMedicoDoc & {
    nutricionistaNome?: string;
    nutricionistaEmail?: string;
    nutricionistaRegistro?: string;
    nutricionistaCidades?: { estado: string; cidade: string }[];
    medicoNome?: string;
  }> {
    try {
      const requestRef = doc(db, COL_SOLICITACOES_VINCULO_NUTRI_MEDICO, requestId);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        throw new Error('Solicitação não encontrada');
      }

      const data = requestSnap.data();
      const request: SolicitacaoVinculoNutriMedicoDoc = {
        id: requestSnap.id,
        nutricionistaId: data.nutricionistaId,
        medicoId: data.medicoId,
        solicitadoPor: data.solicitadoPor || 'nutricionista',
        status: data.status,
        criadoEm: data.criadoEm?.toDate() || new Date(),
        aceitoEm: data.aceitoEm?.toDate(),
        rejeitadoEm: data.rejeitadoEm?.toDate(),
        canceladoEm: data.canceladoEm?.toDate(),
        motivoRejeicao: data.motivoRejeicao,
        motivoCancelamento: data.motivoCancelamento,
        nutricionistaNome: data.nutricionistaNome,
        nutricionistaEmail: data.nutricionistaEmail,
        medicoNome: data.medicoNome,
      };

      // Buscar dados extras se não estiverem no documento
      let nutricionistaNome = data.nutricionistaNome;
      let nutricionistaEmail = data.nutricionistaEmail;
      let nutricionistaRegistro: string | undefined;
      let nutricionistaCidades: { estado: string; cidade: string }[] | undefined;

      if (!nutricionistaNome || !nutricionistaEmail) {
        const nutri = await NutricionistaService.getNutricionistaByUserId(data.nutricionistaId);
        if (nutri) {
          nutricionistaNome = nutri.nome;
          nutricionistaEmail = nutri.email;
          nutricionistaRegistro = nutri.registroNumero;
          nutricionistaCidades = nutri.cidades;
        }
      } else {
        // Buscar registro e cidades mesmo se nome/email já estiverem
        const nutri = await NutricionistaService.getNutricionistaByUserId(data.nutricionistaId);
        if (nutri) {
          nutricionistaRegistro = nutri.registroNumero;
          nutricionistaCidades = nutri.cidades;
        }
      }

      return {
        ...request,
        nutricionistaNome,
        nutricionistaEmail,
        nutricionistaRegistro,
        nutricionistaCidades,
        medicoNome: data.medicoNome,
      };
    } catch (error) {
      console.error('Erro ao buscar solicitação com dados extras:', error);
      throw error;
    }
  }

  /**
   * Exclui completamente uma solicitação de vínculo (remove do firestore)
   * Se a solicitação estiver aceita, também remove o vínculo dos documentos do nutricionista e médico
   * Usado para limpar solicitações enviadas ou recebidas
   */
  static async deleteVinculoRequest(requestId: string): Promise<void> {
    try {
      const requestRef = doc(db, COL_SOLICITACOES_VINCULO_NUTRI_MEDICO, requestId);
      const requestSnap = await getDoc(requestRef);
      
      if (!requestSnap.exists()) {
        throw new Error('Solicitação não encontrada');
      }

      const requestData = requestSnap.data();
      const status = requestData.status;
      const nutricionistaId = requestData.nutricionistaId;
      const medicoId = requestData.medicoId;

      console.log('🗑️ [DEBUG] Excluindo solicitação:', {
        requestId,
        status,
        nutricionistaId,
        medicoId,
        solicitadoPor: requestData.solicitadoPor
      });

      // Se a solicitação estava aceita, remover o vínculo dos documentos
      if (status === SOLICITACAO_STATUS.ACEITA) {
        console.log('🔗 [DEBUG] Removendo vínculo aceito...');
        
        // 1. Remover médicoVinculadoIds do nutricionista
        const nutriRef = doc(db, 'nutricionistas', nutricionistaId);
        const nutriSnap = await getDoc(nutriRef);

        if (nutriSnap.exists()) {
          const nutriData = nutriSnap.data();
          const medicoVinculadoIds = nutriData.medicoVinculadoIds || [];
          const novosIds = medicoVinculadoIds.filter((id: string) => id !== medicoId);
          
          await updateDoc(nutriRef, {
            medicoVinculadoIds: novosIds,
          });
          
          console.log('✅ [DEBUG] Vínculo removido do nutricionista:', {
            nutricionistaId,
            medicoId,
            antes: medicoVinculadoIds.length,
            depois: novosIds.length
          });
        }

        // 2. Remover nutricionistaVinculadoIds do médico
        const medicoRef = doc(db, 'medicos', medicoId);
        const medicoSnap = await getDoc(medicoRef);

        if (medicoSnap.exists()) {
          const medicoData = medicoSnap.data();
          const nutricionistaVinculadoIds = medicoData.nutricionistaVinculadoIds || [];
          const novosIds = nutricionistaVinculadoIds.filter((id: string) => id !== nutricionistaId);
          
          await updateDoc(medicoRef, {
            nutricionistaVinculadoIds: novosIds,
          });
          
          console.log('✅ [DEBUG] Vínculo removido do médico:', {
            medicoId,
            nutricionistaId,
            antes: nutricionistaVinculadoIds.length,
            depois: novosIds.length
          });
        }
      }
      
      // Deletar a solicitação completamente
      await deleteDoc(requestRef);
      console.log('✅ [DEBUG] Solicitação deletada com sucesso');
    } catch (error) {
      console.error('Erro ao excluir solicitação de vínculo:', error);
      throw error;
    }
  }

  /**
   * Remove completamente o vínculo entre médico e nutricionista
   * Remove de ambos os documentos e todas as solicitações relacionadas
   */
  static async removeVinculoCompleto(
    medicoId: string,
    nutricionistaId: string
  ): Promise<void> {
    try {
      // 1. Remover médicoVinculadoIds do nutricionista
      const nutriRef = doc(db, 'nutricionistas', nutricionistaId);
      const nutriSnap = await getDoc(nutriRef);
      
      if (nutriSnap.exists()) {
        const nutriData = nutriSnap.data();
        const medicoVinculadoIds = nutriData.medicoVinculadoIds || [];
        const novosIds = medicoVinculadoIds.filter((id: string) => id !== medicoId);
        
        await updateDoc(nutriRef, {
          medicoVinculadoIds: novosIds,
        });
      }
      
      // 2. Remover nutricionistaVinculadoIds do médico
      const medicoRef = doc(db, 'medicos', medicoId);
      const medicoSnap = await getDoc(medicoRef);
      
      if (medicoSnap.exists()) {
        const medicoData = medicoSnap.data();
        const nutricionistaVinculadoIds = medicoData.nutricionistaVinculadoIds || [];
        const novosIds = nutricionistaVinculadoIds.filter((id: string) => id !== nutricionistaId);
        
        await updateDoc(medicoRef, {
          nutricionistaVinculadoIds: novosIds,
        });
      }
      
      // 3. Deletar todas as solicitações de vínculo relacionadas
      const solicitacoesQuery = query(
        collection(db, COL_SOLICITACOES_VINCULO_NUTRI_MEDICO),
        where('nutricionistaId', '==', nutricionistaId),
        where('medicoId', '==', medicoId)
      );
      
      const solicitacoesSnap = await getDocs(solicitacoesQuery);
      const deletePromises = solicitacoesSnap.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);
      
      // 4. Deletar todos os vínculos de pacientes compartilhados entre este médico e nutricionista
      const vinculosPacientesQuery = query(
        collection(db, 'paciente_nutricionista'),
        where('medicoId', '==', medicoId),
        where('nutricionistaId', '==', nutricionistaId)
      );
      
      const vinculosPacientesSnap = await getDocs(vinculosPacientesQuery);
      const deleteVinculosPromises = vinculosPacientesSnap.docs.map(docSnap => deleteDoc(docSnap.ref));
      await Promise.all(deleteVinculosPromises);
      
      // 5. Deletar todas as solicitações de compartilhamento de pacientes relacionadas
      const solicitacoesPacientesQuery = query(
        collection(db, 'solicitacoes_nutricionista'),
        where('medicoId', '==', medicoId),
        where('nutricionistaId', '==', nutricionistaId)
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
